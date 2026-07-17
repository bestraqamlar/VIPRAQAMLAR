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

/* ==================================================================
   BOT BOSHQARUV PANELI — admin shu botga "/panel" yozganda chiqadi.
   Bu yerdan botlarni butunlay to'xtatish/ishga tushirish va AI
   avtomatik javoblarini yoqish/o'chirish mumkin. Holat Firestore'da
   (site_settings/bot_control) saqlanadi, barcha botlar shundan o'qiydi.
   ================================================================== */
async function getControlState(){
  try{
    const doc = await withRetry(() => db.collection('site_settings').doc('bot_control').get());
    const data = doc.exists ? doc.data() : {};
    return {
      botEnabled: data.botEnabled !== false,
      autoReplyEnabled: data.autoReplyEnabled !== false,
      newUserAutoReplyEnabled: data.newUserAutoReplyEnabled !== false
    };
  }catch(e){ return { botEnabled: true, autoReplyEnabled: true, newUserAutoReplyEnabled: true }; }
}
async function setControlState(patch){
  await withRetry(() => db.collection('site_settings').doc('bot_control').set(patch, { merge: true }));
}

function controlPanelText(state){
  return `⚙️ Bot boshqaruv paneli

Umumiy holat: ${state.botEnabled ? '🟢 Ishlayapti' : "🔴 To'xtatilgan"}
Avtobot (AI javoblar): ${state.autoReplyEnabled ? '🟢 Yoqilgan' : "🔴 O'chirilgan"}
Yangi mijozlarga avto javob: ${state.newUserAutoReplyEnabled ? '🟢 Yoqilgan' : "🔴 O'chirilgan (o'zingiz javob berasiz)"}`;
}
function controlPanelKeyboard(state){
  return {
    inline_keyboard: [
      [{ text: state.botEnabled ? '✅ Bot ishlamoqda' : '▶️ Botni ishga tushirish', callback_data: 'bc|start' }],
      [{ text: !state.botEnabled ? "⏹ Bot to'xtatilgan" : "⏸ Botni to'xtatish", callback_data: 'bc|stop' }],
      [{ text: `🤖 Avtobot: ${state.autoReplyEnabled ? 'Yoqilgan ✅' : "O'chirilgan ❌"}`, callback_data: 'bc|auto' }],
      [{ text: `🆕 Yangi mijozlarga avto javob: ${state.newUserAutoReplyEnabled ? 'Yoqilgan ✅' : "O'chirilgan ❌"}`, callback_data: 'bc|newuser' }]
    ]
  };
}
// Har qanday ikkilik (yoqish/o'chirish) sozlama uchun umumiy tasdiqlash tugmalari
function confirmKeyboard(fieldKey, nextVal, onLabel, offLabel){
  return {
    inline_keyboard: [
      [{ text: nextVal ? `✅ Ha, ${onLabel}` : `✅ Ha, ${offLabel}`, callback_data: `bc|${fieldKey}_confirm|` + (nextVal ? '1' : '0') }],
      [{ text: '◀️ Orqaga', callback_data: 'bc|back' }]
    ]
  };
}
async function sendTelegram(method, payload){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });
}
async function sendControlPanel(chatId){
  const state = await getControlState();
  await sendTelegram('sendMessage', { chat_id: chatId, text: controlPanelText(state), reply_markup: controlPanelKeyboard(state) });
}
async function editControlPanel(chatId, messageId, state){
  await sendTelegram('editMessageText', { chat_id: chatId, message_id: messageId, text: controlPanelText(state), reply_markup: controlPanelKeyboard(state) });
}
async function editToConfirm(chatId, messageId, fieldKey, nextVal, title, onLabel, offLabel){
  await sendTelegram('editMessageText', {
    chat_id: chatId, message_id: messageId,
    text: `${title} ${nextVal ? 'YOQISH' : "O'CHIRISH"}ni tasdiqlaysizmi?`,
    reply_markup: confirmKeyboard(fieldKey, nextVal, onLabel, offLabel)
  });
}

const TOGGLES = {
  auto: { field: 'autoReplyEnabled', title: 'Avtobotni', onLabel: 'avtobotni yoqish', offLabel: 'avtobotni o\'chirish' },
  newuser: { field: 'newUserAutoReplyEnabled', title: 'Yangi mijozlarga avto javobni', onLabel: 'yoqish', offLabel: "o'chirish" }
};

async function handleControlCallback(callback){
  const parts = callback.data.split('|'); // bc|action|extra
  const action = parts[1];
  const chatId = callback.message.chat.id;
  const messageId = callback.message.message_id;
  const state = await getControlState();

  if(action === 'start'){
    await setControlState({ botEnabled: true });
    await answerCallback(callback.id, 'Bot ishga tushirildi ✅');
    await editControlPanel(chatId, messageId, await getControlState());
    return;
  }
  if(action === 'stop'){
    await setControlState({ botEnabled: false });
    await answerCallback(callback.id, "Bot to'xtatildi ⏸");
    await editControlPanel(chatId, messageId, await getControlState());
    return;
  }

  // "auto" va "newuser" tugmalari — ikkalasi ham TOGGLES orqali umumiy ishlaydi
  if(TOGGLES[action]){
    const t = TOGGLES[action];
    await answerCallback(callback.id);
    await editToConfirm(chatId, messageId, action, !state[t.field], t.title, t.onLabel, t.offLabel);
    return;
  }
  const confirmMatch = action && action.endsWith('_confirm') ? action.slice(0, -'_confirm'.length) : null;
  if(confirmMatch && TOGGLES[confirmMatch]){
    const t = TOGGLES[confirmMatch];
    const val = parts[2] === '1';
    await setControlState({ [t.field]: val });
    await answerCallback(callback.id, `Yangilandi: ${val ? 'yoqildi' : "o'chirildi"}`);
    await editControlPanel(chatId, messageId, await getControlState());
    return;
  }

  if(action === 'back'){
    await answerCallback(callback.id);
    await editControlPanel(chatId, messageId, state);
    return;
  }
  await answerCallback(callback.id);
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
      reply_markup: { inline_keyboard: [[{ text: `✅ ${statusLabel}`, callback_data: 'noop' }]] }
    })
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;

  /* ---- "/panel" buyrug'i — bot boshqaruv panelini ko'rsatadi ---- */
  if(update.message && update.message.text){
    if(String(update.message.chat.id) !== String(allowedChatId)) return { statusCode: 200, body: 'ignored' };
    const cmd = update.message.text.trim();
    if(cmd === '/panel' || cmd === '/bot' || cmd === '/start'){
      await sendControlPanel(update.message.chat.id);
      return { statusCode: 200, body: 'ok' };
    }
    return { statusCode: 200, body: 'ok' };
  }

  const callback = update.callback_query;
  if(!callback || !callback.data) return { statusCode: 200, body: 'ok' };

  if(String(callback.message.chat.id) !== String(allowedChatId)){
    return { statusCode: 200, body: 'ignored' };
  }
  if(callback.data === 'noop') return { statusCode: 200, body: 'ok' };

  /* ---- Bot boshqaruv paneli tugmalari ---- */
  if(callback.data.startsWith('bc|')){
    try{ await handleControlCallback(callback); }
    catch(err){ console.error('BOT-CONTROL XATOSI:', err); await answerCallback(callback.id, 'Xato: ' + err.message); }
    return { statusCode: 200, body: 'ok' };
  }

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
        const STATUS_MESSAGES = {
          "Bog'lanildi": "📞 Operatorlarimiz siz bilan bog'landi.",
          'Yakunlandi': "✅ Haridingiz uchun rahmat! Tez orada raqamingiz yetib boradi.",
          'Bekor qilindi': "❌ Sizning buyurtmangiz bekor qilindi."
        };
        await fetch(`https://api.telegram.org/bot${customerBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: customerChatId,
            text: `${STATUS_MESSAGES[statusLabel] || `📌 Buyurtmangiz holati: ${statusLabel}`}\n\n📱 ${orderNumber}`
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
