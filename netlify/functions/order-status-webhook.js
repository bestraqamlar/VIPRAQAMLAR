// TELEGRAM XABARIDAGI TUGMALARNI BOSISH ORQALI BUYURTMA STATUSINI O'ZGARTIRISH
// ---------------------------------------------------------------------------
// Bu funksiya "Yangi buyurtma" xabari ostidagi tugmalar (Bog'lanildi/
// Yakunlandi/Bekor qilindi) bosilganda ishga tushadi va admin paneldagi
// bilan AYNAN BIR XIL ta'sir qiladi:
//   - Bekor qilindi → raqam yana sotuvga qaytadi (reserved: false)
//   - Yakunlandi    → raqam bazadan butunlay o'chiriladi
//   - Bog'lanildi   → faqat status yangilanadi, raqam hamon band qolaveradi
//
// O'RNATISH (bir martalik): asl (buyurtma xabarlari yuboradigan) botga
// shu webhook'ni ulash kerak — TELEGRAM_BOT_TOKEN bilan, BOT_ADD_TOKEN
// bilan emas! Brauzerda shu havolani oching:
//   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://SAYTINGIZ.netlify.app/.netlify/functions/order-status-webhook

const crypto = require('crypto');

const STATUS_MAP = {
  'B': "Bog'lanildi",
  'Y': 'Yakunlandi',
  'C': 'Bekor qilindi'
};

async function getGoogleAccessToken(){
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: process.env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claimSet)}`;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if(!data.access_token) throw new Error('Google token olinmadi: ' + JSON.stringify(data));
  return data.access_token;
}

function firestoreBaseUrl(){
  return `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

async function getDoc(accessToken, path){
  const res = await fetch(`${firestoreBaseUrl()}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if(!res.ok) return null;
  return res.json();
}

async function patchStatus(accessToken, orderId, status){
  const url = `${firestoreBaseUrl()}/orders/${orderId}?updateMask.fieldPaths=status`;
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { status: { stringValue: status } } })
  });
}

async function setReserved(accessToken, numberId, reserved){
  const url = `${firestoreBaseUrl()}/numbers/${numberId}?updateMask.fieldPaths=reserved`;
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { reserved: { booleanValue: reserved } } })
  });
}

async function deleteNumber(accessToken, numberId){
  await fetch(`${firestoreBaseUrl()}/numbers/${numberId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function answerCallback(callbackQueryId, text){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

async function replaceKeyboardWithConfirmation(chatId, messageId, statusLabel){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: {
        inline_keyboard: [[ { text: `✅ ${statusLabel}`, callback_data: 'noop' } ]]
      }
    })
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const callback = update.callback_query;
  if(!callback || !callback.data){
    return { statusCode: 200, body: 'ok' };
  }

  // Faqat siz (admin) bosgan tugmalarga javob beriladi
  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  if(String(callback.message.chat.id) !== String(allowedChatId)){
    return { statusCode: 200, body: 'ignored' };
  }

  if(callback.data === 'noop'){
    return { statusCode: 200, body: 'ok' };
  }

  const parts = callback.data.split('|'); // st|{orderId}|{B/Y/C}
  if(parts[0] !== 'st' || parts.length < 3){
    return { statusCode: 200, body: 'ok' };
  }
  const orderId = parts[1];
  const statusCode = parts[2];
  const statusLabel = STATUS_MAP[statusCode];
  if(!statusLabel){
    return { statusCode: 200, body: 'ok' };
  }

  try{
    const accessToken = await getGoogleAccessToken();

    // Avval buyurtmani o'qib, unga bog'langan raqam ID sini va mijoz chat ID sini olamiz
    const orderDoc = await getDoc(accessToken, `orders/${orderId}`);
    const numberId = orderDoc && orderDoc.fields && orderDoc.fields.numberId
      ? orderDoc.fields.numberId.stringValue
      : null;
    const customerChatId = orderDoc && orderDoc.fields && orderDoc.fields.customerChatId
      ? orderDoc.fields.customerChatId.stringValue
      : null;
    const orderNumber = orderDoc && orderDoc.fields && orderDoc.fields.number
      ? orderDoc.fields.number.stringValue
      : '';

    await patchStatus(accessToken, orderId, statusLabel);

    if(numberId){
      if(statusCode === 'C'){
        await setReserved(accessToken, numberId, false); // Bekor qilindi -> raqam qaytadi
      }else if(statusCode === 'Y'){
        await deleteNumber(accessToken, numberId); // Yakunlandi -> raqam o'chiriladi
      }
      // "B" (Bog'lanildi) holatida raqam hamon band bo'lib qoladi
    }

    // Agar bu buyurtma Telegram bot orqali kelgan bo'lsa, mijozga ham xabar boradi
    if(customerChatId){
      const customerBotToken = process.env.CUSTOMER_BOT_TOKEN;
      if(customerBotToken){
        const STATUS_EMOJI = { "Bog'lanildi": '📞', 'Yakunlandi': '✅', 'Bekor qilindi': '❌' };
        await fetch(`https://api.telegram.org/bot${customerBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: customerChatId,
            text: `${STATUS_EMOJI[statusLabel] || 'ℹ️'} Buyurtmangiz holati yangilandi:\n\n📱 ${orderNumber}\n📌 Yangi holat: ${statusLabel}`
          })
        });
      }
    }

    await answerCallback(callback.id, `Holat yangilandi: ${statusLabel}`);
    await replaceKeyboardWithConfirmation(callback.message.chat.id, callback.message.message_id, statusLabel);
  }catch(err){
    await answerCallback(callback.id, `Xato: ${err.message}`);
  }

  return { statusCode: 200, body: 'ok' };
};
