// TELEGRAM XABARIDAGI TUGMALARNI BOSISH ORQALI BUYURTMA STATUSINI O'ZGARTIRISH
// (firebase-admin bilan, ishonchli)

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();
db.settings({ preferRest: true }); // Netlify Functions'da gRPC ulanish muammosini oldini oladi

async function withRetry(fn, retries = 3, delayMs = 1500){
  for(let i = 0; i <= retries; i++){
    try{ return await fn(); }
    catch(err){
      const msg = String(err && err.message || err);
      if(i === retries || !msg.includes('Quota exceeded')) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

const STATUS_MAP = { 'B': "Bog'lanildi", 'Y': 'Yakunlandi', 'C': 'Bekor qilindi' };

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
      reply_markup: { inline_keyboard: [[{ text: `✅ ${statusLabel}`, callback_data: 'noop' }]] }
    })
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const callback = update.callback_query;
  if(!callback || !callback.data) return { statusCode: 200, body: 'ok' };

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  if(String(callback.message.chat.id) !== String(allowedChatId)){
    return { statusCode: 200, body: 'ignored' };
  }
  if(callback.data === 'noop') return { statusCode: 200, body: 'ok' };

  const parts = callback.data.split('|'); // st|{orderId}|{B/Y/C}
  if(parts[0] !== 'st' || parts.length < 3) return { statusCode: 200, body: 'ok' };
  const orderId = parts[1];
  const statusCode = parts[2];
  const statusLabel = STATUS_MAP[statusCode];
  if(!statusLabel) return { statusCode: 200, body: 'ok' };

  try{
    const orderDoc = await withRetry(() => db.collection('orders').doc(orderId).get());
    const orderData = orderDoc.exists ? orderDoc.data() : {};
    const numberId = orderData.numberId || null;
    const customerChatId = orderData.customerChatId || null;
    const orderNumber = orderData.number || '';

    await withRetry(() => db.collection('orders').doc(orderId).update({ status: statusLabel }));

    if(numberId){
      if(statusCode === 'C'){
        await withRetry(() => db.collection('numbers').doc(numberId).update({ reserved: false }));
      }else if(statusCode === 'Y'){
        await withRetry(() => db.collection('numbers').doc(numberId).delete());
      }
    }

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
    console.error('ORDER-STATUS XATOSI:', err);
    await answerCallback(callback.id, `Xato: ${err.message}`);
  }

  return { statusCode: 200, body: 'ok' };
};
