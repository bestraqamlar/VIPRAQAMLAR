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
      [{ text: `🆕 Yangi mijozlarga avto javob: ${state.newUserAutoReplyEnabled ? 'Yoqilgan ✅' : "O'chirilgan ❌"}`, callback_data: 'bc|newuser' }],
      [{ text: '📊 Statistika', callback_data: 'bc|stats' }],
      [{ text: '📢 Barchaga xabar yuborish', callback_data: 'bc|broadcast' }]
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

  if(action === 'stats'){
    const users = await getCustomerBotUsers();
    await answerCallback(callback.id);
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `📊 Mijoz botidan foydalangan: ${users.length} kishi`,
      reply_markup: { inline_keyboard: [[{ text: "📋 To'liq ko'rish", callback_data: 'bc|full_list' }]] }
    });
    return;
  }
  if(action === 'full_list'){
    const users = await getCustomerBotUsers();
    await answerCallback(callback.id);
    await sendFullCustomerList(chatId, users);
    return;
  }
  if(action === 'broadcast'){
    await setAdminState({ awaitingBroadcast: true });
    await answerCallback(callback.id);
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: "✍️ Yubormoqchi bo'lgan xabaringizni yuboring — matn, rasm yoki video (izoh bilan bo'lishi mumkin).\n\nBekor qilish uchun /bekor yozing."
    });
    return;
  }
  if(action === 'broadcast_confirm'){
    await answerCallback(callback.id, 'Yuborilmoqda...');
    try{ await executeBroadcast(chatId); }
    catch(err){ await sendTelegram('sendMessage', { chat_id: chatId, text: 'Xato: ' + err.message }); }
    return;
  }
  if(action === 'broadcast_cancel'){
    await clearPendingBroadcast();
    await answerCallback(callback.id, 'Bekor qilindi');
    await sendTelegram('sendMessage', { chat_id: chatId, text: 'Xabar yuborish bekor qilindi.' });
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

/* ==================================================================
   MIJOZ BOTIDAN FOYDALANGANLAR RO'YXATI VA BARCHAGA XABAR YUBORISH
   — "bot_sessions" collection'i mijoz botiga /start bosgan (yoki
   biror tugma bosgan) HAR BIR odam uchun yoziladi, shuning uchun
   eng to'liq foydalanuvchilar ro'yxati sifatida shu yerdan olinadi.
   ================================================================== */
async function getCustomerBotUsers(){
  const snap = await withRetry(() => db.collection('bot_sessions').get());
  return snap.docs.map(d => {
    const data = d.data() || {};
    return { id: d.id, name: data.name || null, username: data.username || null };
  });
}
function escapeHtml(s){
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/* Har bir mijozni "N - Ism" ko'rinishida, ismi bosilsa uning Telegram
   profiliga o'tadigan qilib (tg://user?id=...), raqamlangan ro'yxat
   qilib chiqaradi. Ko'p bo'lsa, bir nechta xabarga bo'lib yuboradi. */
async function sendFullCustomerList(chatId, users){
  if(users.length === 0){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Hozircha hech kim yo'q." });
    return;
  }
  const CHUNK = 50;
  for(let i = 0; i < users.length; i += CHUNK){
    const batch = users.slice(i, i + CHUNK);
    const lines = batch.map((u, idx) => {
      const n = i + idx + 1;
      const name = escapeHtml(u.name || `ID:${u.id}`);
      const usernamePart = u.username ? ` (@${escapeHtml(u.username)})` : '';
      return `${n} - <a href="tg://user?id=${u.id}">${name}</a>${usernamePart}`;
    });
    await sendTelegram('sendMessage', { chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' });
  }
}

async function getAdminState(){
  try{
    const doc = await withRetry(() => db.collection('site_settings').doc('admin_state').get());
    return doc.exists ? doc.data() : {};
  }catch(e){ return {}; }
}
async function setAdminState(patch){
  await withRetry(() => db.collection('site_settings').doc('admin_state').set(patch, { merge: true }));
}
async function getPendingBroadcast(){
  const doc = await withRetry(() => db.collection('site_settings').doc('pending_broadcast').get());
  return doc.exists ? doc.data() : null;
}
async function setPendingBroadcast(data){
  await withRetry(() => db.collection('site_settings').doc('pending_broadcast').set(data));
}
async function clearPendingBroadcast(){
  await withRetry(() => db.collection('site_settings').doc('pending_broadcast').delete());
}

/* Admin botiga yuborilgan faylni (rasm/video) yuklab oladi — file_id'lar
   bot-token'ga bog'liq bo'lgani uchun boshqa bot orqali qayta yuborishdan
   oldin haqiqiy baytlarni olish shart. */
async function downloadTelegramFile(token, fileId){
  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
  const info = await infoRes.json();
  if(!info.ok) throw new Error('Faylni olishda xato: ' + (info.description || JSON.stringify(info)));
  const filePath = info.result.file_path;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/* Haqiqiy fayl baytlarini (multipart) mijoz botining bitta chatiga yuboradi —
   javobda mijoz botiga tegishli YANGI file_id qaytadi, shu file_id keyin
   qolgan barcha mijozlarga tezkor (qayta yuklamasdan) yuboriladi. */
async function uploadMediaToChat(token, chatId, type, buffer, caption){
  const form = new FormData();
  form.append('chat_id', String(chatId));
  if(caption) form.append('caption', caption);
  const field = type === 'photo' ? 'photo' : 'video';
  const filename = type === 'photo' ? 'broadcast.jpg' : 'broadcast.mp4';
  const mime = type === 'photo' ? 'image/jpeg' : 'video/mp4';
  form.append(field, new Blob([buffer], { type: mime }), filename);
  const method = type === 'photo' ? 'sendPhoto' : 'sendVideo';
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body: form });
  return res.json();
}

/* Bitta mijozga (JSON orqali, tezkor) xabar/rasm/video yuboradi */
async function sendBroadcastToOne(token, chatId, pending, uploadedFileId){
  if(pending.type === 'text'){
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: pending.text })
    });
    return res.json();
  }
  const method = pending.type === 'photo' ? 'sendPhoto' : 'sendVideo';
  const field = pending.type === 'photo' ? 'photo' : 'video';
  const payload = { chat_id: chatId, [field]: uploadedFileId };
  if(pending.caption) payload.caption = pending.caption;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

/* Admin "📢 Barchaga xabar yuborish"ni bosgandan keyin yuborgan birinchi
   xabarini (matn/rasm/video) qabul qiladi — bazaga vaqtincha saqlaydi va
   tasdiqlash so'raydi (hech narsa hali mijozlarga yuborilmaydi). */
async function handleIncomingBroadcastContent(msg){
  let pending;
  if(msg.photo && msg.photo.length){
    const best = msg.photo[msg.photo.length - 1];
    pending = { type: 'photo', sourceFileId: best.file_id, caption: msg.caption || '', createdAt: Date.now() };
  }else if(msg.video){
    pending = { type: 'video', sourceFileId: msg.video.file_id, caption: msg.caption || '', createdAt: Date.now() };
  }else if(msg.text){
    pending = { type: 'text', text: msg.text, createdAt: Date.now() };
  }else{
    await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: "Iltimos, matn, rasm yoki video yuboring." });
    return;
  }

  const userIds = (await getCustomerBotUsers()).map(u => u.id);
  await setAdminState({ awaitingBroadcast: false });
  await setPendingBroadcast(pending);

  if(userIds.length === 0){
    await clearPendingBroadcast();
    await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: "Hozircha mijoz botidan foydalangan hech kim yo'q." });
    return;
  }

  await sendTelegram('sendMessage', {
    chat_id: msg.chat.id,
    text: `${userIds.length} ta mijozga yuborilsinmi?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Ha, yuborish', callback_data: 'bc|broadcast_confirm' }],
        [{ text: '❌ Bekor qilish', callback_data: 'bc|broadcast_cancel' }]
      ]
    }
  });
}

/* Tasdiqlangandan keyin — HAMMAGA bir vaqtda (parallel, bo'lib-bo'lib) yuboradi */
async function executeBroadcast(adminChatId){
  const pending = await getPendingBroadcast();
  if(!pending) throw new Error("Yuborilishi kerak bo'lgan xabar topilmadi.");

  const userIds = (await getCustomerBotUsers()).map(u => u.id);
  const customerToken = process.env.CUSTOMER_BOT_TOKEN;
  if(!customerToken) throw new Error('CUSTOMER_BOT_TOKEN sozlanmagan.');

  let uploadedFileId = null;
  let remaining = userIds;

  if(pending.type !== 'text' && userIds.length > 0){
    const adminToken = process.env.TELEGRAM_BOT_TOKEN;
    const buffer = await downloadTelegramFile(adminToken, pending.sourceFileId);
    const first = userIds[0];
    const uploadRes = await uploadMediaToChat(customerToken, first, pending.type, buffer, pending.caption);
    if(!uploadRes.ok) throw new Error('Birinchi mijozga yuborishda xato: ' + (uploadRes.description || JSON.stringify(uploadRes)));
    uploadedFileId = pending.type === 'photo'
      ? uploadRes.result.photo[uploadRes.result.photo.length - 1].file_id
      : uploadRes.result.video.file_id;
    remaining = userIds.slice(1);
  }

  let success = (pending.type !== 'text' && userIds.length > 0) ? 1 : 0;
  let fail = 0;
  const CHUNK = 20;
  for(let i = 0; i < remaining.length; i += CHUNK){
    const batch = remaining.slice(i, i + CHUNK);
    const results = await Promise.allSettled(batch.map(uid => sendBroadcastToOne(customerToken, uid, pending, uploadedFileId)));
    results.forEach(r => {
      if(r.status === 'fulfilled' && r.value && r.value.ok) success++;
      else fail++;
    });
  }

  await clearPendingBroadcast();
  await sendTelegram('sendMessage', {
    chat_id: adminChatId,
    text: `✅ Yuborildi: ${success} ta\n❌ Yetib bormadi: ${fail} ta\n👥 Jami mijozlar: ${userIds.length} ta`
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;

  /* ---- "/panel" buyrug'i — bot boshqaruv panelini ko'rsatadi ---- */
  if(update.message){
    const msg = update.message;
    if(String(msg.chat.id) !== String(allowedChatId)) return { statusCode: 200, body: 'ignored' };

    if(msg.text && msg.text.trim() === '/bekor'){
      await setAdminState({ awaitingBroadcast: false });
      await clearPendingBroadcast().catch(() => {});
      await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Bekor qilindi.' });
      return { statusCode: 200, body: 'ok' };
    }

    if(msg.text){
      const cmd = msg.text.trim();
      if(cmd === '/panel' || cmd === '/bot' || cmd === '/start'){
        await sendControlPanel(msg.chat.id);
        return { statusCode: 200, body: 'ok' };
      }
    }

    const adminState = await getAdminState();
    if(adminState.awaitingBroadcast){
      try{ await handleIncomingBroadcastContent(msg); }
      catch(err){
        console.error('BROADCAST XATOSI:', err);
        await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Xato: ' + err.message });
      }
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
