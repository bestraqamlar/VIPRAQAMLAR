// TELEGRAM XABARIDAGI TUGMALARNI BOSISH ORQALI BUYURTMA STATUSINI O'ZGARTIRISH
// (firebase-admin bilan, ishonchli)
//
// Bu ADMIN BOTI — buyurtma bildirishnomalari, /panel boshqaruv paneli,
// "Barchaga xabar yuborish" va "Kanalga raqam joylash" shu yerda ishlaydi.
// "Kanalga raqam joylash" uchun QO'SHIMCHA environment variable kerak:
//   TELEGRAM_BUSINESS_BOT_TOKEN — @vip_raqamlar_uz kanaliga ADMIN (post
//     joylash huquqi bilan) qilib qo'shilgan bot tokeni (telegram-business-
//     webhook.js'dagi bilan bir xil bot — u kanalga allaqachon admin).
//   TELEGRAM_CHANNEL_ID — ixtiyoriy, sozlanmasa standart holatda
//     "@vip_raqamlar_uz" ishlatiladi.

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
/* Mijoz iltimosiga ko'ra bosh menyu endi INLINE emas, DOIMIY (persistent)
   Telegram klaviaturasi — matn kiritish maydonining tepasida doim ko'rinib
   turadi, yangi xabarlar ostida "yo'qolib" ketmaydi. Har bir tugma sodda
   (holatga qarab o'zgarmaydigan) matn bilan — joriy holat esa yuqoridagi
   controlPanelText() xabarida ko'rsatiladi. Tugma bosilganda Telegram
   xuddi shu matnni oddiy xabar sifatida botga yuboradi — handleMenuText()
   shu matnni tekshiradi. */
const MENU_LABELS = {
  start: '▶️ Botni ishga tushirish',
  stop: "⏸️ Botni to'xtatish",
  auto: "🤖 Avtobotni yoqish/o'chirish",
  newuser: "🆕 Yangi mijoz avto-javobini yoqish/o'chirish",
  stats: '📊 Statistika',
  broadcast: '📢 Barchaga xabar yuborish',
  postchannel: '📣 Kanalga raqam joylash',
  aksiya: '🔥 Aksiya raqam joylash'
};
const MENU_LABEL_SET = new Set(Object.values(MENU_LABELS));

function mainMenuKeyboard(){
  return {
    keyboard: [
      [MENU_LABELS.start, MENU_LABELS.stop],
      [MENU_LABELS.auto, MENU_LABELS.newuser],
      [MENU_LABELS.stats, MENU_LABELS.broadcast],
      [MENU_LABELS.postchannel, MENU_LABELS.aksiya]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

/* ==================================================================
   "KANALGA RAQAM JOYLASH" — admin matn/rasm/video yuboradi, bot buni
   @vip_raqamlar_uz kanaliga, tagida DOIM ikkita yonma-yon tugma bilan
   joylaydi: "📱 Raqam tanlash" (mijoz botimizga) va "📸 Instagram"
   (Instagram sahifamizga). Bu tugmalar Telegram'ning o'zi tomonidan
   xabarga "yopishtirilgani" uchun, mijoz shu postni boshqa odamga
   ULASHSA (forward qilsa) ham, ikkala tugma xabar bilan BIRGA ketadi.
   ================================================================== */
const CHANNEL_POST_BOT_LINK = 'https://t.me/vipraqambot';
const CHANNEL_POST_INSTAGRAM_LINK = 'https://instagram.com/vipraqamlar';
function channelPostButtons(){
  return {
    inline_keyboard: [[
      { text: '📱 Raqam tanlash', url: CHANNEL_POST_BOT_LINK },
      { text: '📸 Instagram', url: CHANNEL_POST_INSTAGRAM_LINK }
    ]]
  };
}
async function getPendingChannelPost(){
  const doc = await withRetry(() => db.collection('site_settings').doc('pending_channel_post').get());
  return doc.exists ? doc.data() : null;
}
async function setPendingChannelPost(data){
  await withRetry(() => db.collection('site_settings').doc('pending_channel_post').set(data));
}
async function clearPendingChannelPost(){
  await withRetry(() => db.collection('site_settings').doc('pending_channel_post').delete()).catch(() => {});
}
/* Admin "📣 Kanalga raqam joylash"ni bosgandan keyin yuborgan birinchi
   xabarini (matn/rasm/video) qabul qiladi — HALI kanalga joylamaydi,
   avval oldindan ko'rsatib tasdiqlash so'raydi (tasodifan bosilib
   ketishning oldini olish uchun). */
async function handleIncomingChannelPostContent(msg){
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

  await setAdminState({ awaitingChannelPost: false });
  await setPendingChannelPost(pending);

  await sendTelegram('sendMessage', {
    chat_id: msg.chat.id,
    text: "Kanalga shu holicha joylanaversinmi? Tagida avtomatik \"📱 Raqam tanlash\" va \"📸 Instagram\" tugmalari qo'shiladi.",
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Ha, joylash', callback_data: 'bc|postchannel_confirm' }],
        [{ text: '❌ Bekor qilish', callback_data: 'bc|postchannel_cancel' }]
      ]
    }
  });
}
/* Tasdiqlangandan keyin — TELEGRAM_BUSINESS_BOT_TOKEN orqali (aynan shu
   bot @vip_raqamlar_uz kanaliga ADMIN qilib qo'shilgan) haqiqiy postni
   joylaydi. Fayl (rasm/video) avval ADMIN botining o'z tokeni bilan
   yuklab olinadi, so'ng BUSINESS bot tokeni bilan qayta yuklanadi —
   chunki Telegram file_id'lari bitta botdan ikkinchisiga to'g'ridan-
   to'g'ri ko'chmaydi. */
async function executeChannelPost(adminChatId){
  const pending = await getPendingChannelPost();
  if(!pending) throw new Error("Joylanishi kerak bo'lgan xabar topilmadi.");

  const businessToken = process.env.TELEGRAM_BUSINESS_BOT_TOKEN;
  if(!businessToken){
    throw new Error("TELEGRAM_BUSINESS_BOT_TOKEN sozlanmagan — shu bot @vip_raqamlar_uz kanaliga ADMIN (post joylash huquqi bilan) qilib qo'shilgan bo'lishi kerak.");
  }
  const channelId = process.env.TELEGRAM_CHANNEL_ID || '@vip_raqamlar_uz';
  const buttons = channelPostButtons();

  let res;
  if(pending.type === 'text'){
    res = await fetch(`https://api.telegram.org/bot${businessToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: channelId,
        text: `<b>${escapeHtml(pending.text)}</b>`,
        parse_mode: 'HTML',
        reply_markup: buttons
      })
    }).then(r => r.json());
  }else{
    const adminToken = process.env.TELEGRAM_BOT_TOKEN;
    const buffer = await downloadTelegramFile(adminToken, pending.sourceFileId);
    const form = new FormData();
    form.append('chat_id', channelId);
    if(pending.caption){
      form.append('caption', `<b>${escapeHtml(pending.caption)}</b>`);
      form.append('parse_mode', 'HTML');
    }
    form.append('reply_markup', JSON.stringify(buttons));
    const field = pending.type === 'photo' ? 'photo' : 'video';
    const filename = pending.type === 'photo' ? 'post.jpg' : 'post.mp4';
    const mime = pending.type === 'photo' ? 'image/jpeg' : 'video/mp4';
    form.append(field, new Blob([buffer], { type: mime }), filename);
    const method = pending.type === 'photo' ? 'sendPhoto' : 'sendVideo';
    res = await fetch(`https://api.telegram.org/bot${businessToken}/${method}`, { method: 'POST', body: form }).then(r => r.json());
  }

  await clearPendingChannelPost();
  if(res && res.ok){
    await sendTelegram('sendMessage', { chat_id: adminChatId, text: '✅ Kanalga joylandi.' });
  }else{
    await sendTelegram('sendMessage', {
      chat_id: adminChatId,
      text: '❌ Kanalga joylashda xato: ' + (res && res.description ? res.description : JSON.stringify(res))
    });
  }
}
// Har qanday ikkilik (yoqish/o'chirish) sozlama uchun umumiy tasdiqlash tugmalari
function confirmKeyboard(fieldKey, nextVal, onLabel, offLabel){
  return {
    inline_keyboard: [
      [{ text: nextVal ? `✅ Ha, ${onLabel}` : `✅ Ha, ${offLabel}`, callback_data: `bc|${fieldKey}_confirm|` + (nextVal ? '1' : '0') }],
      [{ text: '❌ Bekor qilish', callback_data: `bc|${fieldKey}_toggle_cancel` }]
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
  await sendTelegram('sendMessage', { chat_id: chatId, text: controlPanelText(state), reply_markup: mainMenuKeyboard() });
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

  // "auto" va "newuser" tasdiqlash/bekor qilish tugmalari — persistent
  // menyudagi 🤖/🆕 tugmalari bosilganda handleMenuText() shu tasdiqlash
  // xabarini (inline tugmalar bilan) yuboradi, natija shu yerda qayta ishlanadi.
  const confirmMatch = action && action.endsWith('_confirm') ? action.slice(0, -'_confirm'.length) : null;
  if(confirmMatch && TOGGLES[confirmMatch]){
    const t = TOGGLES[confirmMatch];
    const val = parts[2] === '1';
    await setControlState({ [t.field]: val });
    await answerCallback(callback.id, `Yangilandi: ${val ? 'yoqildi' : "o'chirildi"}`);
    await sendTelegram('editMessageText', { chat_id: chatId, message_id: messageId, text: `✅ ${t.title} ${val ? 'yoqildi' : "o'chirildi"}.` });
    return;
  }
  const cancelMatch = action && action.endsWith('_toggle_cancel') ? action.slice(0, -'_toggle_cancel'.length) : null;
  if(cancelMatch && TOGGLES[cancelMatch]){
    await answerCallback(callback.id, 'Bekor qilindi');
    await sendTelegram('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Bekor qilindi.' });
    return;
  }

  if(action === 'full_list'){
    const users = await getCustomerBotUsers();
    await answerCallback(callback.id);
    await sendFullCustomerList(chatId, users);
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

  if(action === 'postchannel_confirm'){
    await answerCallback(callback.id, 'Joylanmoqda...');
    try{ await executeChannelPost(chatId); }
    catch(err){ await sendTelegram('sendMessage', { chat_id: chatId, text: 'Xato: ' + err.message }); }
    return;
  }
  if(action === 'postchannel_cancel'){
    await clearPendingChannelPost();
    await answerCallback(callback.id, 'Bekor qilindi');
    await sendTelegram('sendMessage', { chat_id: chatId, text: 'Kanalga joylash bekor qilindi.' });
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

/* ==================================================================
   "🔥 AKSIYA RAQAM JOYLASH" — persistent menyudagi yangi tugma.
   Admin: 1) raqam yozadi (yoki bir nechta mos topilsa — tanlaydi),
          2) ESKI narxni kiritadi (so'mda),
          3) HOZIRGI (aksiya) narxni kiritadi (so'mda),
          4) tayyor muddat (1/3/12/24 soat, 3 kun) yoki "Boshqa" orqali
             o'zi soat kiritadi,
          5) yakuniy tasdiqlaydi.
   Natijada 'numbers/{id}' hujjatida oldPrice, price, dailyDeal:true va
   dealExpiresAt (millisekund, Date.now() + soat*3600*1000) yoziladi —
   bu AYNAN index.html/panel-boshqaruv.html'dagi "Bugungi aksiya" tizimi
   kutayotgan maydonlar (xuddi panel-boshqaruv.html'dagi "aksAddBtn"
   qo'shish formasi bilan bir xil maydon nomlari), shu sabab sayt/panel
   o'zgarishsiz to'g'ri ishlayveradi.
   Muddati tugagan aksiyani QAYTA joylash (repost) ham xuddi shu oqim —
   raqam yana tanlanadi va YANGI dealExpiresAt yoziladi.
   ================================================================== */
async function getPendingAksiya(){
  const doc = await withRetry(() => db.collection('site_settings').doc('pending_aksiya').get());
  return doc.exists ? doc.data() : null;
}
async function setPendingAksiya(data){
  await withRetry(() => db.collection('site_settings').doc('pending_aksiya').set(data));
}
async function clearPendingAksiya(){
  await withRetry(() => db.collection('site_settings').doc('pending_aksiya').delete()).catch(() => {});
}

function aksiyaDurationKeyboard(){
  return {
    inline_keyboard: [
      [{ text: '1 soat', callback_data: 'ak|dur|1' }, { text: '3 soat', callback_data: 'ak|dur|3' }],
      [{ text: '12 soat', callback_data: 'ak|dur|12' }, { text: '24 soat', callback_data: 'ak|dur|24' }],
      [{ text: '3 kun', callback_data: 'ak|dur|72' }],
      [{ text: '✍️ Boshqa muddat', callback_data: 'ak|custom' }],
      [{ text: '❌ Bekor qilish', callback_data: 'ak|cancel' }]
    ]
  };
}

async function startAksiyaFlow(chatId){
  await clearPendingAksiya();
  await setAdminState({ awaitingAksiyaNumber: true, awaitingAksiyaOldPrice: false, awaitingAksiyaNewPrice: false, awaitingAksiyaCustomHours: false });
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: "🔥 Aksiya raqam joylash\n\nQaysi raqamni aksiyaga qo'yamiz? Raqamni yozing (masalan: 90 777 77 77) — bu ilgari aksiyada bo'lib, muddati tugagan raqam bo'lsa ham bo'ladi (qayta joylanadi, yangi taymer bilan).\n\nBekor qilish uchun /bekor yozing."
  });
}

/* Admin chatga narx yozganda ishlatiladigan matn->son ajratuvchi.
   panel-boshqaruv.html'dagi narx maydonlari (masalan "Aksiya narxi"/
   "Eski narxi" — Number(input.value)||0) bilan bir xil g'oyada: faqat
   probel/nuqta/vergul kabi ming ajratuvchilarni tashlab, musbat sonni
   qaytaradi; noto'g'ri kiritilsa null qaytaradi (qayta so'raladi). */
function parsePriceInput(text){
  const cleaned = String(text || '').replace(/[.\s,]/g, '').trim();
  if(!cleaned) return null;
  const n = Number(cleaned);
  return (isFinite(n) && n > 0) ? n : null;
}

/* Admin yozgan matndan raqamlarni oxirgi raqamlar bo'yicha moslashtiradi
   (index.html/panel-boshqaruv.html'dagi raqam qidirish mantig'iga o'xshab) */
async function findNumbersByDigits(rawText){
  const digits = String(rawText || '').replace(/\D/g, '');
  if(digits.length < 4) return [];
  const suffix = digits.slice(-9);
  const snap = await withRetry(() => db.collection('numbers').limit(1000).get());
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(item => String(item.number || '').replace(/\D/g, '').endsWith(suffix))
    .slice(0, 10);
}

/* Raqam tanlangandan keyin ENDI birinchi navbatda ESKI narx so'raladi,
   keyin HOZIRGI (aksiya) narx, so'ng muddat — mijoz iltimosiga ko'ra. */
async function presentAksiyaOldPriceStep(chatId, item){
  await setAdminState({ awaitingAksiyaNumber: false, awaitingAksiyaOldPrice: true, awaitingAksiyaNewPrice: false });
  const wasExpired = !!(item.dailyDeal && item.dealExpiresAt && item.dealExpiresAt <= Date.now());
  await setPendingAksiya({
    numberId: item.id,
    number: item.number || '',
    wasExpired,
    createdAt: Date.now()
  });
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: `📱 ${item.number || item.id}${wasExpired ? "\n(oldingi aksiya muddati tugagan — qayta joylanadi)" : ''}\n\n💰 Eski narxini kiriting (so'mda), masalan: 8 000 000\n\nBekor qilish uchun /bekor yozing.`
  });
}

async function presentAksiyaDurationStep(chatId, pending){
  await setAdminState({ awaitingAksiyaNewPrice: false });
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: `📱 ${pending.number}\n💵 Eski narx: ${formatSum(pending.oldPrice)}\n🔥 Hozirgi narx: ${formatSum(pending.price)}${pending.wasExpired ? "\n(oldingi aksiya muddati tugagan — qayta joylanadi)" : ''}\n\nAksiya necha vaqtga qo'yilsin?`,
    reply_markup: aksiyaDurationKeyboard()
  });
}

function formatSum(n){
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

async function handleAksiyaNumberInput(msg){
  const chatId = msg.chat.id;
  if(!msg.text){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Iltimos, raqamni matn sifatida yuboring (masalan: 90 777 77 77)." });
    return;
  }
  const matches = await findNumbersByDigits(msg.text);
  if(matches.length === 0){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Bunday raqam bazada topilmadi. Qaytadan urinib ko'ring yoki /bekor yozing." });
    return;
  }
  if(matches.length === 1){
    await presentAksiyaOldPriceStep(chatId, matches[0]);
    return;
  }
  await setAdminState({ awaitingAksiyaNumber: false });
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: `${matches.length} ta mos raqam topildi. Birini tanlang:`,
    reply_markup: { inline_keyboard: matches.map(m => [{ text: m.number || m.id, callback_data: `ak|pick|${m.id}` }]) }
  });
}

async function handleAksiyaOldPriceInput(msg){
  const chatId = msg.chat.id;
  const oldPrice = parsePriceInput(msg.text);
  if(!oldPrice){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Iltimos, musbat son kiriting — eski narx so'mda (masalan: 8 000 000)." });
    return;
  }
  const pending = await getPendingAksiya();
  if(!pending || !pending.numberId){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Xatolik: raqam tanlanmagan. /bekor yozib, qaytadan boshlang." });
    return;
  }
  await setPendingAksiya({ ...pending, oldPrice });
  await setAdminState({ awaitingAksiyaOldPrice: false, awaitingAksiyaNewPrice: true });
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: `💵 Eski narx: ${formatSum(oldPrice)}\n\n🔥 Endi HOZIRGI (aksiya) narxini kiriting (so'mda), masalan: 6 500 000`
  });
}

async function handleAksiyaNewPriceInput(msg){
  const chatId = msg.chat.id;
  const price = parsePriceInput(msg.text);
  if(!price){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Iltimos, musbat son kiriting — hozirgi (aksiya) narx so'mda (masalan: 6 500 000)." });
    return;
  }
  const pending = await getPendingAksiya();
  if(!pending || !pending.numberId){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Xatolik: raqam tanlanmagan. /bekor yozib, qaytadan boshlang." });
    return;
  }
  await setPendingAksiya({ ...pending, price });
  await presentAksiyaDurationStep(chatId, { ...pending, price });
}

async function handleAksiyaCustomHours(msg){
  const chatId = msg.chat.id;
  const hours = Number(String(msg.text || '').replace(',', '.').trim());
  if(!hours || hours <= 0 || !isFinite(hours)){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Iltimos, musbat son kiriting — necha SOATga aksiya qo'yilsin (masalan: 5 yoki 48). 1 kun = 24 soat." });
    return;
  }
  await setAdminState({ awaitingAksiyaCustomHours: false });
  await confirmAksiyaDuration(chatId, hours);
}

async function confirmAksiyaDuration(chatId, hours){
  const pending = await getPendingAksiya();
  if(!pending || !pending.numberId){
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Xatolik: raqam tanlanmagan. /bekor yozib, qaytadan boshlang." });
    return;
  }
  const expiresAt = Date.now() + hours * 3600 * 1000;
  await setPendingAksiya({ ...pending, hours, expiresAt });
  const untilStr = new Date(expiresAt).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' });
  await sendTelegram('sendMessage', {
    chat_id: chatId,
    text: `📱 ${pending.number}\n💵 Eski narx: ${formatSum(pending.oldPrice)}\n🔥 Hozirgi narx: ${formatSum(pending.price)}\n⏱ Muddat: ${hours} soat\n🕐 Tugash vaqti: ${untilStr}\n\nTasdiqlaysizmi?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Ha, joylash', callback_data: 'ak|confirm' }],
        [{ text: '❌ Bekor qilish', callback_data: 'ak|cancel' }]
      ]
    }
  });
}

async function executeAksiyaPost(chatId){
  const pending = await getPendingAksiya();
  if(!pending || !pending.expiresAt || !pending.numberId || !pending.oldPrice || !pending.price) throw new Error("Joylanishi kerak bo'lgan aksiya topilmadi.");
  await withRetry(() => db.collection('numbers').doc(pending.numberId).update({
    oldPrice: pending.oldPrice,
    price: pending.price,
    dailyDeal: true,
    dealExpiresAt: pending.expiresAt
  }));
  await clearPendingAksiya();
  await sendTelegram('sendMessage', { chat_id: chatId, text: `✅ ${pending.number} aksiyaga qo'yildi (${pending.hours} soat).\n💵 ${formatSum(pending.oldPrice)} → 🔥 ${formatSum(pending.price)}` });
}

async function handleAksiyaCallback(callback){
  const parts = callback.data.split('|'); // ak|action|extra
  const action = parts[1];
  const chatId = callback.message.chat.id;

  if(action === 'pick'){
    const numberId = parts[2];
    const doc = await withRetry(() => db.collection('numbers').doc(numberId).get());
    if(!doc.exists){ await answerCallback(callback.id, 'Topilmadi'); return; }
    await answerCallback(callback.id);
    await presentAksiyaOldPriceStep(chatId, { id: doc.id, ...doc.data() });
    return;
  }
  if(action === 'dur'){
    const hours = Number(parts[2]);
    await answerCallback(callback.id);
    await confirmAksiyaDuration(chatId, hours);
    return;
  }
  if(action === 'custom'){
    await answerCallback(callback.id);
    await setAdminState({ awaitingAksiyaCustomHours: true });
    await sendTelegram('sendMessage', { chat_id: chatId, text: "Necha SOATga aksiya qo'yilsin? Son kiriting (masalan: 5 yoki 48). 1 kun = 24 soat." });
    return;
  }
  if(action === 'confirm'){
    await answerCallback(callback.id, 'Joylanmoqda...');
    try{ await executeAksiyaPost(chatId); }
    catch(err){ await sendTelegram('sendMessage', { chat_id: chatId, text: 'Xato: ' + err.message }); }
    return;
  }
  if(action === 'cancel'){
    await clearPendingAksiya();
    await setAdminState({ awaitingAksiyaNumber: false, awaitingAksiyaCustomHours: false });
    await answerCallback(callback.id, 'Bekor qilindi');
    await sendTelegram('sendMessage', { chat_id: chatId, text: 'Aksiya joylash bekor qilindi.' });
    return;
  }
  await answerCallback(callback.id);
}

/* ==================================================================
   Persistent bosh menyu tugmalari — matn tenglik bo'yicha tekshiriladi
   (MENU_LABEL_SET). Har bir tugma bosilganda avval boshqa "kutilayotgan"
   (broadcast/kanal post/aksiya) oqimlar bekor qilinadi — aks holda admin
   menyu tugmasini bossa, u tasodifan o'sha oqimga matn sifatida ketib
   qolishi mumkin edi. */
async function handleMenuText(msg){
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();

  await setAdminState({
    awaitingBroadcast: false,
    awaitingChannelPost: false,
    awaitingAksiyaNumber: false,
    awaitingAksiyaOldPrice: false,
    awaitingAksiyaNewPrice: false,
    awaitingAksiyaCustomHours: false
  });

  if(text === MENU_LABELS.start){
    await setControlState({ botEnabled: true });
    await sendTelegram('sendMessage', { chat_id: chatId, text: '✅ Bot ishga tushirildi.' });
    return;
  }
  if(text === MENU_LABELS.stop){
    await setControlState({ botEnabled: false });
    await sendTelegram('sendMessage', { chat_id: chatId, text: "⏸ Bot to'xtatildi." });
    return;
  }
  if(text === MENU_LABELS.auto || text === MENU_LABELS.newuser){
    const key = text === MENU_LABELS.auto ? 'auto' : 'newuser';
    const t = TOGGLES[key];
    const state = await getControlState();
    const nextVal = !state[t.field];
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `${t.title} ${nextVal ? 'YOQISH' : "O'CHIRISH"}ni tasdiqlaysizmi?`,
      reply_markup: confirmKeyboard(key, nextVal, t.onLabel, t.offLabel)
    });
    return;
  }
  if(text === MENU_LABELS.stats){
    const users = await getCustomerBotUsers();
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: `📊 Mijoz botidan foydalangan: ${users.length} kishi`,
      reply_markup: { inline_keyboard: [[{ text: "📋 To'liq ko'rish", callback_data: 'bc|full_list' }]] }
    });
    return;
  }
  if(text === MENU_LABELS.broadcast){
    await setAdminState({ awaitingBroadcast: true });
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: "✍️ Yubormoqchi bo'lgan xabaringizni yuboring — matn, rasm yoki video (izoh bilan bo'lishi mumkin).\n\nBekor qilish uchun /bekor yozing."
    });
    return;
  }
  if(text === MENU_LABELS.postchannel){
    await setAdminState({ awaitingChannelPost: true });
    await sendTelegram('sendMessage', {
      chat_id: chatId,
      text: "✍️ Kanalga joylamoqchi bo'lgan xabaringizni yuboring — matn, rasm yoki video (izoh bilan bo'lishi mumkin). Tagida avtomatik \"📱 Raqam tanlash\" va \"📸 Instagram\" tugmalari qo'shiladi.\n\nBekor qilish uchun /bekor yozing."
    });
    return;
  }
  if(text === MENU_LABELS.aksiya){
    await startAksiyaFlow(chatId);
    return;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  // XAVFSIZLIK: bu ADMIN boti — buyurtmalarni boshqaradi, hammaga xabar
  // yuboradi. ADMIN_BOT_WEBHOOK_SECRET sozlangan bo'lsa, faqat
  // Telegram'ning o'zidan (setWebhook'da shu so'z bilan ro'yxatdan
  // o'tgan) kelgan so'rovlar qabul qilinadi. HALI SOZLANMAGAN bo'lsa —
  // eskicha (chat_id tekshiruvi bilan) ishlayveradi. To'liq "qat'iy"
  // qilish uchun: Netlify'da shu o'zgaruvchini sozlang VA Telegram'ga
  // setWebhook chaqirganda secret_token sifatida xuddi shu qiymatni
  // yuboring — bittasi yetishmasa bot to'xtab qoladi.
  const expectedSecret = process.env.ADMIN_BOT_WEBHOOK_SECRET;
  if(expectedSecret){
    const gotSecret = (event.headers && (event.headers['x-telegram-bot-api-secret-token'] || event.headers['X-Telegram-Bot-Api-Secret-Token'])) || '';
    if(gotSecret !== expectedSecret) return { statusCode: 401, body: 'unauthorized' };
  }

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;

  /* ---- "/panel" buyrug'i — bot boshqaruv panelini ko'rsatadi ---- */
  if(update.message){
    const msg = update.message;
    if(String(msg.chat.id) !== String(allowedChatId)) return { statusCode: 200, body: 'ignored' };

    if(msg.text && msg.text.trim() === '/bekor'){
      await setAdminState({ awaitingBroadcast: false, awaitingChannelPost: false, awaitingAksiyaNumber: false, awaitingAksiyaOldPrice: false, awaitingAksiyaNewPrice: false, awaitingAksiyaCustomHours: false });
      await clearPendingBroadcast().catch(() => {});
      await clearPendingChannelPost();
      await clearPendingAksiya();
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

    // ---- Persistent bosh menyu tugmalari (matn tengligi bo'yicha) ----
    if(msg.text && MENU_LABEL_SET.has(msg.text.trim())){
      try{ await handleMenuText(msg); }
      catch(err){
        console.error('MENU XATOSI:', err);
        await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Xato: ' + err.message });
      }
      return { statusCode: 200, body: 'ok' };
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
    if(adminState.awaitingChannelPost){
      try{ await handleIncomingChannelPostContent(msg); }
      catch(err){
        console.error('CHANNEL-POST XATOSI:', err);
        await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Xato: ' + err.message });
      }
      return { statusCode: 200, body: 'ok' };
    }
    if(adminState.awaitingAksiyaNumber){
      try{ await handleAksiyaNumberInput(msg); }
      catch(err){
        console.error('AKSIYA XATOSI:', err);
        await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Xato: ' + err.message });
      }
      return { statusCode: 200, body: 'ok' };
    }
    if(adminState.awaitingAksiyaOldPrice){
      try{ await handleAksiyaOldPriceInput(msg); }
      catch(err){
        console.error('AKSIYA XATOSI:', err);
        await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Xato: ' + err.message });
      }
      return { statusCode: 200, body: 'ok' };
    }
    if(adminState.awaitingAksiyaNewPrice){
      try{ await handleAksiyaNewPriceInput(msg); }
      catch(err){
        console.error('AKSIYA XATOSI:', err);
        await sendTelegram('sendMessage', { chat_id: msg.chat.id, text: 'Xato: ' + err.message });
      }
      return { statusCode: 200, body: 'ok' };
    }
    if(adminState.awaitingAksiyaCustomHours){
      try{ await handleAksiyaCustomHours(msg); }
      catch(err){
        console.error('AKSIYA XATOSI:', err);
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

  /* ---- "🔥 Aksiya raqam joylash" oqimining inline tugmalari ---- */
  if(callback.data.startsWith('ak|')){
    try{ await handleAksiyaCallback(callback); }
    catch(err){ console.error('AKSIYA-CALLBACK XATOSI:', err); await answerCallback(callback.id, 'Xato: ' + err.message); }
    return { statusCode: 200, body: 'ok' };
  }

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
        await withRetry(() => db.collection('numbers').doc(numberId).update({
          reserved: false,
          reservedAt: admin.firestore.FieldValue.delete()
        }));
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
