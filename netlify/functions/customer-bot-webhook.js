// MIJOZ UCHUN TELEGRAM BOT — sayt bilan bir xil ma'lumotlardan foydalanadi
// ---------------------------------------------------------------------------
// Tugmali menyu (asosiy) + erkin savolga AI javob berish (aralash rejim).
// AI faqat mijoz tugma bosmasdan erkin matn yozganda ishga tushadi —
// buyurtma to'ldirish bosqichlariga (ism/telefon/viloyat) aralashmaydi.
// Botning AI javoblarini (ohang, tayyor javoblar) admin panelidagi
// "💬 Telegram AI" bo'limidan boshqarasiz (Firestore: site_settings/telegram_bot).
//
// Kerakli Environment variables (Netlify):
//   CUSTOMER_BOT_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ANTHROPIC_API_KEY,
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const admin = require('firebase-admin');
const { getBotControl } = require('./lib/botControl');
const { checkAndMarkKnown } = require('./lib/knownCustomers');
const { updateAdminList } = require('./lib/adminList');

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

/* Vaqtinchalik "quota" xatoliklarida qayta urinib ko'radi (Google shuni tavsiya qiladi) */
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

const OPERATORS = ['Beeline', 'Ucell', 'Mobiuz', 'Humans', 'Uzmobile', 'Perfektum'];
const OPERATOR_EMOJI = { Beeline:'🟡', Ucell:'🟣', Mobiuz:'🔴', Humans:'🟠', Uzmobile:'🔵', Perfektum:'🟢' };
const REGIONS = [
  ['Toshkent shahri', 'Toshkent viloyati'],
  ['Andijon', "Farg'ona"],
  ['Namangan', 'Samarqand'],
  ['Buxoro', 'Xorazm'],
  ['Navoiy', 'Qashqadaryo'],
  ['Surxondaryo', 'Jizzax'],
  ['Sirdaryo', "Qoraqalpog'iston"]
];
const BTN = {
  PREMIUM: '💎 Premium raqamlar',
  SALE: '🔥 Aksiya raqamlar',
  CONTACT: '📞 Biz bilan aloqa',
  MYORDERS: '📋 Buyurtmalarim',
  BACK: '⬅️ Orqaga',
  CANCEL: '❌ Bekor qilish',
  SHARE_CONTACT: '📱 Kontaktni yuborish'
};

/* ---------------- Seans (Firestore'da, chatId bo'yicha) ---------------- */
async function getSession(chatId){
  const doc = await withRetry(() => db.collection('bot_sessions').doc(String(chatId)).get());
  if(doc.exists && doc.data().data){
    try{ return JSON.parse(doc.data().data); }catch(e){}
  }
  return { step: 'menu' };
}
async function saveSession(chatId, session){
  await withRetry(() => db.collection('bot_sessions').doc(String(chatId)).set({ data: JSON.stringify(session) }));
}

/* ---------------- Telegram yordamchi funksiyalari ---------------- */
async function tg(method, payload){
  const token = process.env.CUSTOMER_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}
function send(chatId, text, keyboard){
  const payload = { chat_id: chatId, text };
  if(keyboard) payload.reply_markup = keyboard;
  return tg('sendMessage', payload);
}
function replyKb(rows){ return { keyboard: rows, resize_keyboard: true }; }
function inlineKb(rows){ return { inline_keyboard: rows }; }

function mainMenuKeyboard(){
  return replyKb([
    OPERATORS.slice(0,2).map(op => `${OPERATOR_EMOJI[op]} ${op}`),
    OPERATORS.slice(2,4).map(op => `${OPERATOR_EMOJI[op]} ${op}`),
    OPERATORS.slice(4,6).map(op => `${OPERATOR_EMOJI[op]} ${op}`),
    [BTN.PREMIUM, BTN.SALE],
    [BTN.CONTACT, BTN.MYORDERS]
  ]);
}
function backKeyboard(){ return replyKb([[BTN.BACK]]); }
function cancelKeyboard(){ return replyKb([[BTN.CANCEL]]); }
function regionKeyboard(){
  const rows = REGIONS.map(r => [...r]);
  rows.push([BTN.CANCEL]);
  return replyKb(rows);
}
function contactKeyboard(){
  return replyKb([[{ text: BTN.SHARE_CONTACT, request_contact: true }], [BTN.CANCEL]]);
}

function formatPrice(n){ return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm"; }
function displayNumber(numberStr){ return (numberStr || '').replace(/-/g, ' '); }
function localDigits(numberStr){ return (numberStr || '').replace(/\D/g, '').slice(5); }
function operatorFromButton(text){
  for(const op of OPERATORS){ if(text === `${OPERATOR_EMOJI[op]} ${op}`) return op; }
  return null;
}

/* Natijalarni ro'yxat qilib ko'rsatadi (qidiruv/premium/aksiya uchun umumiy) */
async function showNumberList(chatId, session, items, emptyText){
  if(items.length === 0){
    await send(chatId, emptyText, backKeyboard());
    return;
  }
  session.step = 'list_shown';
  session.candidates = {};
  items.slice(0, 8).forEach(item => { session.candidates[displayNumber(item.number)] = item.id; });
  await saveSession(chatId, session);

  const rows = items.slice(0, 8).map(item => [displayNumber(item.number)]);
  rows.push([BTN.BACK]);
  await send(chatId, "Mos raqamlar topildi. Batafsil ko'rish uchun birini tanlang 👇", replyKb(rows));
}

async function showNumberDetail(chatId, item){
  const hasDiscount = item.oldPrice && item.oldPrice > item.price;
  let text = `${OPERATOR_EMOJI[item.operator] || ''} ${item.operator}\n`;
  text += `📱 ${displayNumber(item.number)}\n\n`;
  if(hasDiscount){
    const pct = Math.round((1 - item.price / item.oldPrice) * 100);
    text += `💰 ${formatPrice(item.price)}  (eski narx: ${formatPrice(item.oldPrice)}, -${pct}%)\n`;
  }else{
    text += `💰 ${formatPrice(item.price)}\n`;
  }
  text += `🏷 ${item.tag === 'vip' ? 'VIP' : 'Oddiy'}\n`;
  if(item.installment) text += `📅 Bo'lib to'lash mumkin\n`;
  if(item.reserved) text += `\n⚠️ Bu raqam hozir band qilinmoqda.`;

  const buttons = item.reserved
    ? [[{ text: '⬅️ Orqaga', callback_data: 'backmenu' }]]
    : [
        [{ text: '🛒 Buyurtma berish', callback_data: `buy|${item.id}` }],
        [{ text: '❌ Bekor qilish', callback_data: 'cancelview' }]
      ];
  await tg('sendMessage', { chat_id: chatId, text, reply_markup: inlineKb(buttons) });
}

/* ---------------- Admin bildirishnomasi (buyurtma tushganda) ---------------- */
async function notifyAdmin(orderId, payload){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;
  const text =
`🔔 Yangi buyurtma (Telegram bot orqali)

📱 Buyurtma raqami: ${payload.number}
👤 Mijoz ismi: ${payload.name}
☎️ Ishlab turgan raqami: ${payload.phone}
📍 Manzil: ${payload.region}
🕐 Vaqti: ${payload.time}
🌐 Qayerdan: Telegram bot`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [
          [{ text: "📞 Bog'lanildi", callback_data: `st|${orderId}|B` }],
          [{ text: '✅ Yakunlandi', callback_data: `st|${orderId}|Y` }],
          [{ text: '❌ Bekor qilindi', callback_data: `st|${orderId}|C` }]
        ]
      }
    })
  });
  try{
    const data = await res.json();
    if(data.ok && data.result && data.result.message_id){
      await db.collection('orders').doc(orderId).update({ adminMessageId: data.result.message_id });
    }
  }catch(e){ /* muhim emas */ }
}

function docToItem(doc){
  const d = doc.data();
  return {
    id: doc.id,
    number: d.number || '',
    operator: d.operator || '',
    price: d.price || 0,
    oldPrice: d.oldPrice || 0,
    tag: d.tag || 'oddiy',
    installment: !!d.installment,
    featured: !!d.featured,
    onSale: !!d.onSale,
    reserved: !!d.reserved
  };
}

/* ================================================================
   AI JAVOB BERISH (erkin matnli xabarlarga) — "Aralash" rejim:
   Tugmali menyu o'zgarishsiz qoladi, lekin mijoz tugma bosmasdan
   erkin savol yozsa (masalan "0101 raqami bormi", "narxi qancha"),
   shu bo'lim javob beradi. Buyurtma to'ldirish bosqichlarida
   (ism/telefon/viloyat so'ralayotganda) bu ishlamaydi — o'sha yerlar
   hali ham qat'iy qoidalar bilan ishlaydi, aralashmaymiz.
   ================================================================ */
const CLAUDE_MODEL = 'claude-sonnet-5';
const MAX_TOOL_ROUNDS = 4;
const MAX_REPLY_WORDS = 15;

/* Javob matnini HECH QACHON 15 so'zdan oshirmaslik uchun xavfsizlik to'sig'i
   (AI ko'rsatmaga rioya qilmagan taqdirda ham kafolatlaydi). */
function capWords(text, maxWords = MAX_REPLY_WORDS){
  if(!text) return text;
  const words = text.trim().split(/\s+/);
  if(words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

/* ---------------- Ovozli xabar yuborgan mijozlar ro'yxati (adminga) ----------------
   Bot ovozli/audio xabarni O'QIMAYDI va mijozga javob YOZMAYDI — faqat
   ismini adminning ICHKI Telegram botiga bitta doimiy xabarni tahrirlab
   (edit) yangilanadigan raqamlangan ro'yxat qilib yuboradi. Bu ro'yxat
   Telegram Business boti bilan umumiy (bitta joydan kuzatiladi). */
async function logVoiceCustomer(userId, name){
  await updateAdminList(db, 'voice_message_customers', "🎤 Ovozli xabar yuborgan mijozlar (o'zingiz javob berishingiz kerak):", userId, name);
}

const AI_TOOLS = [
  {
    name: 'search_numbers',
    description: "Bazadagi telefon raqamlarini filtrlar bo'yicha qidiradi (faqat o'qish).",
    input_schema: {
      type: 'object',
      properties: {
        suffix: { type: 'string', description: "Raqam shu bilan tugashi kerak" },
        contains: { type: 'string', description: "Raqam ichida shu ketma-ketlik bo'lishi kerak" },
        operator: { type: 'string', enum: OPERATORS },
        tag: { type: 'string', enum: ['oddiy', 'vip'] },
        maxPrice: { type: 'number' },
        limit: { type: 'number', description: 'Standart 5, maksimal 10' }
      }
    }
  },
  {
    name: 'forward_lead_to_admin',
    description: "Mijozning sotib olish niyati yoki muhim savolini adminning ICHKI Telegram botiga yuboradi.",
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string', description: "Qisqa xulosa: kim, nima haqida" } },
      required: ['summary']
    }
  }
];

async function loadTelegramBotSettings(){
  try{
    const doc = await withRetry(() => db.collection('site_settings').doc('telegram_bot').get());
    const data = doc.exists ? doc.data() : {};
    return {
      generalInstructions: data.generalInstructions || '',
      deliveryInfo: data.deliveryInfo || "Ha, 12 ta viloyatga yetkazib berish xizmatimiz mavjud.",
      faqRules: Array.isArray(data.faqRules) ? data.faqRules : []
    };
  }catch(e){
    return { generalInstructions: '', deliveryInfo: "Ha, 12 ta viloyatga yetkazib berish xizmatimiz mavjud.", faqRules: [] };
  }
}

function buildTelegramSystemPrompt(settings){
  const parts = [];
  parts.push(`Sen VIP RAQAMLAR (070.uz — O'zbekistondagi chiroyli/oltin/VIP telefon raqamlari do'koni) Telegram botida ishlaydigan yordamchisan. Mijoz botga tugma bosmasdan, erkin matn yozganda sen javob berasan.`);
  parts.push(`QOIDALAR (BULARGA QAT'IY RIOYA QIL):
- Javoblaring HECH QACHON ${MAX_REPLY_WORDS} ta so'zdan oshmasin. Juda qisqa va lo'nda yoz, do'stona ohangda. Kamida bitta mos emoji ishlat, lekin bachkana bo'lmasin.
- Narxlarni faqat search_numbers natijasidan ol — hech qachon o'ylab topma.
- Mijoz aniq raqamning oxirini aytsa (masalan "0101 bormi"), search_numbers bilan tekshir va natijani qisqa ayt.
- Agar mijoz so'ragan raqam qidiruvda TOPILMASA, buni hech qachon qat'iy "yo'q"/"mavjud emas" deb aytma — katalogimizda hali bazaga kiritilmagan ko'p raqam bor. Bunday holatda: "Operatorimiz tekshirib, tez orada javob beradi" kabi qisqa javob ber va albatta forward_lead_to_admin vositasini chaqirib, so'ralgan raqamni yetkaz.
- Agar mijoz aniq buyurtma bermoqchi bo'lsa, unga botdagi tugmalardan (operatorni tanlab, so'ng raqam kiritib) yoki ro'yxatdan raqamni tanlab "🛒 Buyurtma berish" tugmasini bosishni tavsiya qil — bu orqali rasmiy buyurtma tizimidan o'tadi.
- Yetkazib berish haqida so'ralsa: "${settings.deliveryInfo}"
- Salbiy/norozi fikrga bahslashmasdan, xotirjam va qisqa javob ber.
- Mijoz aniq sotib olish niyatini yoki maxsus so'rovini bildirsa, forward_lead_to_admin vositasini chaqir.
- Agar savol tushunarsiz yoki mavzuga aloqasiz bo'lsa, qisqa umumiy javob ber va menyudan foydalanishni taklif qil.`);

  if(settings.faqRules && settings.faqRules.length){
    const rulesText = settings.faqRules
      .filter(r => r && r.trigger && r.response)
      .map(r => `- Agar mijozning yozgani mana bunga o'xshasa: "${r.trigger}" → shunday javob ber: "${r.response}"`)
      .join('\n');
    if(rulesText) parts.push(`ADMIN BELGILAGAN TAYYOR JAVOBLAR (bularga ustunlik ber):\n${rulesText}`);
  }
  if(settings.generalInstructions && settings.generalInstructions.trim()){
    parts.push(`ADMINNING QO'SHIMCHA KO'RSATMALARI:\n${settings.generalInstructions.trim()}`);
  }
  return parts.join('\n\n');
}

async function aiExecSearch(input){
  const snap = await withRetry(() => db.collection('numbers').get());
  let items = snap.docs.map(docToItem);

  if(input.suffix){
    const s = String(input.suffix).replace(/\D/g, '');
    if(s) items = items.filter(it => (it.number||'').replace(/\D/g,'').endsWith(s));
  }
  if(input.contains){
    const c = String(input.contains).replace(/\D/g, '');
    if(c) items = items.filter(it => (it.number||'').replace(/\D/g,'').includes(c));
  }
  if(input.operator) items = items.filter(it => it.operator === input.operator);
  if(input.tag) items = items.filter(it => it.tag === input.tag);
  if(typeof input.maxPrice === 'number') items = items.filter(it => (it.price||0) <= input.maxPrice);
  items = items.filter(it => !it.reserved);

  const total = items.length;
  const limit = Math.min(input.limit || 5, 10);
  const shown = items.slice(0, limit).map(it => ({ number: displayNumber(it.number), operator: it.operator, price: it.price, tag: it.tag }));
  return { total, items: shown };
}

async function notifyAdminLead(text){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function aiForwardLead(input, chatId){
  const text = `💬 Telegram botdan yangi qiziqish!\n\n👤 Chat ID: ${chatId}\n📝 ${input.summary || ''}`;
  await notifyAdminLead(text);
  return { forwarded: true };
}

async function callClaudeAI(systemPrompt, messages){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 400, system: systemPrompt, tools: AI_TOOLS, messages })
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data && data.error && data.error.message) || 'Claude API xatosi');
  return data;
}

async function generateTelegramAIReply(userText, chatId){
  if(!process.env.ANTHROPIC_API_KEY){
    return "Iltimos, menyudagi tugmalardan foydalaning 👇";
  }
  try{
    const settings = await loadTelegramBotSettings();
    const systemPrompt = buildTelegramSystemPrompt(settings);
    let messages = [{ role: 'user', content: userText }];

    for(let round = 0; round < MAX_TOOL_ROUNDS; round++){
      const data = await callClaudeAI(systemPrompt, messages);
      const content = data.content || [];
      messages = [...messages, { role: 'assistant', content }];

      const toolUse = content.find(b => b.type === 'tool_use');
      if(!toolUse){
        const reply = content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        return capWords(reply || "Menyudan kerakli bo'limni tanlang 👇");
      }

      let toolResult;
      try{
        if(toolUse.name === 'search_numbers') toolResult = await aiExecSearch(toolUse.input || {});
        else if(toolUse.name === 'forward_lead_to_admin') toolResult = await aiForwardLead(toolUse.input || {}, chatId);
        else toolResult = { error: "Noma'lum vosita" };
      }catch(err){ toolResult = { error: err.message }; }

      messages = [...messages, { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] }];
    }
    return "Aniqroq savol bersangiz yordam beraman, yoki menyudan foydalaning 👇";
  }catch(err){
    console.error('TELEGRAM AI XATOSI:', err);
    return "Hozircha javob bera olmadim, iltimos menyudan foydalaning 👇";
  }
}

/* Erkin matn kelganda AI javobiga o'tishdan oldingi umumiy tekshiruvlar:
   1) Avtobot butunlay o'chirilgan bo'lsa — AI chaqirmasdan, oddiy javob.
   2) Bu mijoz BIZGA BIRINCHI MARTA yozayotgan bo'lsa va admin "yangi
      mijozlarga avto javob"ni o'chirib qo'ygan bo'lsa — bot hech narsa
      yozmaydi, faqat ismini adminga ro'yxat qilib yuboradi (admin o'zi
      shaxsan javob yozadi). Qaytgan mijozlarga bu tekshiruv qo'llanmaydi. */
async function handleFreeTextReply(chatId, text, from, control){
  if(!control.autoReplyEnabled){
    await send(chatId, "Iltimos, menyudagi tugmalardan foydalaning 👇", mainMenuKeyboard());
    return;
  }

  const isFirstTime = await checkAndMarkKnown(db, 'known_customers_tgmenu', chatId);
  if(isFirstTime && !control.newUserAutoReplyEnabled){
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || (from.username ? '@' + from.username : `ID:${chatId}`);
    await updateAdminList(db, 'new_customers', "🆕 Yangi mijozlar (birinchi marta yozgan, o'zingiz javob berishingiz kerak):", chatId, name);
    return; // mijozga hech narsa yozmaymiz — admin o'zi shaxsan javob beradi
  }

  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
  const aiReply = await generateTelegramAIReply(text, chatId);
  await send(chatId, aiReply, mainMenuKeyboard());
}

/* ---------------- Asosiy handler ---------------- */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  try{

  /* ---- Bot butunlay to'xtatilgan bo'lsa (admin panelidan) — hech narsaga javob bermaymiz ---- */
  const control = await getBotControl(db);
  if(!control.botEnabled) return { statusCode: 200, body: 'ok' };

  /* ---- Inline tugma bosilganda (raqam tafsiloti, buyurtma tasdiqlash) ---- */
  if(update.callback_query){
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const data = cq.data;
    let session = await getSession(chatId);

    if(data === 'backmenu' || data === 'cancelview'){
      session = { step: 'menu' };
      await saveSession(chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data.startsWith('buy|')){
      const numberId = data.split('|')[1];
      session = { step: 'awaiting_name', numberId };
      await saveSession(chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Ismingizni kiriting:', cancelKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data === 'confirmorder'){
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Yuborilmoqda...' });
      const numberDoc = await withRetry(() => db.collection('numbers').doc(session.numberId).get());
      const nd = numberDoc.exists ? numberDoc.data() : {};
      const numberStr = displayNumber(nd.number || '');
      const price = nd.price || 0;
      const time = new Date().toLocaleString('uz-UZ');

      const orderRef = await withRetry(() => db.collection('orders').add({
        number: numberStr,
        price,
        name: session.draftName || '',
        region: session.draftRegion || '',
        phone: session.draftPhone || '',
        numberId: session.numberId,
        customerChatId: String(chatId),
        status: 'Yangi',
        source: 'Telegram bot',
        createdAt: time,
        createdAtSort: Date.now()
      }));

      if(session.numberId){
        await withRetry(() => db.collection('numbers').doc(session.numberId).update({ reserved: true }));
      }

      await notifyAdmin(orderRef.id, {
        number: numberStr, name: session.draftName, phone: session.draftPhone,
        region: session.draftRegion, time
      });

      session = { step: 'menu' };
      await saveSession(chatId, session);
      await send(chatId, "✅ Buyurtmangiz qabul qilindi! Tez orada siz bilan bog'lanamiz.", mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data === 'cancelorder'){
      session = { step: 'menu' };
      await saveSession(chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Buyurtma bekor qilindi.', mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    await tg('answerCallbackQuery', { callback_query_id: cq.id });
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Oddiy xabar (matn yoki kontakt) ---- */
  const message = update.message;
  if(!message) return { statusCode: 200, body: 'ok' };
  const chatId = message.chat.id;

  // --- Ovozli/audio xabar: bot o'qimaydi, mijozga javob yozmaydi — faqat
  //     adminga (siz) ismini raqamlangan ro'yxat qilib yuboradi ---
  if(message.voice || message.audio){
    const from = message.from || {};
    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || (from.username ? '@' + from.username : `ID:${chatId}`);
    await logVoiceCustomer(chatId, name);
    return { statusCode: 200, body: 'ok' };
  }

  const text = (message.text || '').trim();
  let session = await getSession(chatId);

  if(text === '/start'){
    session = { step: 'menu' };
    await saveSession(chatId, session);
    await send(chatId,
      "Assalomu alaykum! VIP RAQAMLAR botiga xush kelibsiz 👋\n\nKerakli operatorni tanlang yoki quyidagi bo'limlardan foydalaning:",
      mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  if(text === BTN.BACK){
    session = { step: 'menu' };
    await saveSession(chatId, session);
    await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }
  if(text === BTN.CANCEL){
    session = { step: 'menu' };
    await saveSession(chatId, session);
    await send(chatId, 'Bekor qilindi.', mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Asosiy menyu tugmalari ---- */
  if(session.step === 'menu' || !session.step){
    const operator = operatorFromButton(text);
    if(operator){
      session = { step: 'awaiting_digits', operator };
      await saveSession(chatId, session);
      await send(chatId, 'Sevimli raqamingizni kiriting.\nMisol: 0707', backKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(text === BTN.PREMIUM){
      const snap = await withRetry(() => db.collection('numbers').where('featured', '==', true).limit(8).get());
      await showNumberList(chatId, session, snap.docs.map(docToItem), "Hozircha premium raqamlar yo'q.");
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.SALE){
      const snap = await withRetry(() => db.collection('numbers').where('onSale', '==', true).limit(8).get());
      await showNumberList(chatId, session, snap.docs.map(docToItem), "Hozircha aksiyadagi raqamlar yo'q.");
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.CONTACT){
      await send(chatId, "📞 Biz bilan bog'lanish:\n\nTelegram: @Vip_raqamlar_admin\n\nSavollaringiz bo'lsa, xabar yozishingiz mumkin!", mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.MYORDERS){
      const snap = await withRetry(() => db.collection('orders').where('customerChatId', '==', String(chatId)).limit(20).get());
      const orders = snap.docs.map(d => d.data());
      if(orders.length === 0){
        await send(chatId, "Sizda hali buyurtmalar yo'q.", mainMenuKeyboard());
      }else{
        const list = orders
          .sort((a,b)=> (b.createdAtSort||0) - (a.createdAtSort||0))
          .map(o => `📱 ${o.number}\n💰 ${formatPrice(o.price)}\n📌 Holati: ${o.status}`)
          .join('\n\n—\n\n');
        await send(chatId, `📋 Sizning buyurtmalaringiz:\n\n${list}`, mainMenuKeyboard());
      }
      return { statusCode: 200, body: 'ok' };
    }

    await handleFreeTextReply(chatId, text, message.from || {}, control);
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Raqam qidirish: operator tanlangandan keyin raqam kutilmoqda ---- */
  if(session.step === 'awaiting_digits'){
    const digits = text.replace(/\D/g, '');
    if(!digits || digits.length > 4){
      await send(chatId, "Iltimos, 1 dan 4 tagacha raqam kiriting. Misol: 0707", backKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    const suffixField = 'last' + digits.length; // last1, last2, last3 yoki last4

    // Qidiruv boshlanganini darhol bildiramiz — mijoz jim kutib qolmasin
    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    await send(chatId, "🔍 Qidirilmoqda...");

    // Avval tezkor (indekslangan) qidiruv — yangi qo'shilgan raqamlar uchun
    let matches = [];
    try{
      const snap = await withRetry(() => db.collection('numbers')
        .where('operator', '==', session.operator)
        .where(suffixField, '==', digits)
        .limit(50).get());
      matches = snap.docs.map(docToItem).filter(item => !item.reserved);
    }catch(e){ /* indeks hali tayyor bo'lmasa, pastdagi zaxira qidiruv ishlaydi */ }

    // Agar topilmasa (yoki indeks yo'q bo'lsa) — shu operatordagi BARCHA raqamlarni
    // (sahifalab, cheklovsiz) tekshirib chiqamiz — bu "qidiruv belgisi"siz eski
    // raqamlarni ham, bazada qancha bo'lsa ham, albatta topadi.
    if(matches.length === 0){
      const allDocs = [];
      let lastDoc = null;
      while(true){
        await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
        let q = db.collection('numbers')
          .where('operator', '==', session.operator)
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(300);
        if(lastDoc) q = q.startAfter(lastDoc);
        const pageSnap = await withRetry(() => q.get());
        if(pageSnap.empty) break;
        allDocs.push(...pageSnap.docs);
        lastDoc = pageSnap.docs[pageSnap.docs.length - 1];
        if(pageSnap.docs.length < 300) break;
      }
      matches = allDocs.map(docToItem)
        .filter(item => !item.reserved && localDigits(item.number).endsWith(digits));
    }

    await showNumberList(chatId, session, matches,
      `"${digits}" bilan tugaydigan raqam topilmadi. Boshqa raqam kiriting.`);
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Ro'yxatdan bittasini tanlash (tugma matni = raqam) ---- */
  if(session.candidates && session.candidates[text]){
    const numberId = session.candidates[text];
    const numberDoc = await withRetry(() => db.collection('numbers').doc(numberId).get());
    if(numberDoc.exists){
      await showNumberDetail(chatId, docToItem(numberDoc));
    }
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Buyurtma: ism ---- */
  if(session.step === 'awaiting_name'){
    session.draftName = text;
    session.step = 'awaiting_phone';
    await saveSession(chatId, session);
    await send(chatId, "Hozir ishlatib turgan raqamingizni yuboring (yozing yoki kontaktni ulashing):", contactKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Buyurtma: telefon (matn yoki kontakt) ---- */
  if(session.step === 'awaiting_phone'){
    const phone = message.contact ? message.contact.phone_number : text;
    if(!phone){
      await send(chatId, "Iltimos, raqamingizni kiriting yoki kontaktni ulashing.", contactKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    const VALID_UZ_CODES = ['20','33','50','70','77','80','87','88','90','91','92','93','94','95','97','98','99'];
    let rawDigits = phone.replace(/\D/g, '');
    if(rawDigits.startsWith('998')) rawDigits = rawDigits.slice(3);
    rawDigits = rawDigits.slice(0, 9);
    if(rawDigits.length < 9 || !VALID_UZ_CODES.includes(rawDigits.slice(0, 2))){
      await send(chatId, "Bunday raqam mavjud emas. Iltimos, to'g'ri raqam kiriting yoki kontaktni ulashing.", contactKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    session.draftPhone = phone;
    session.step = 'awaiting_region';
    await saveSession(chatId, session);
    await send(chatId, "Viloyatingizni tanlang:", regionKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Buyurtma: viloyat ---- */
  if(session.step === 'awaiting_region'){
    const validRegion = REGIONS.some(row => row.includes(text));
    if(!validRegion){
      await send(chatId, "Iltimos, ro'yxatdan viloyatni tanlang.", regionKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    session.draftRegion = text;
    session.step = 'confirm';
    await saveSession(chatId, session);

    const numberDoc = await withRetry(() => db.collection('numbers').doc(session.numberId).get());
    const numberStr = numberDoc.exists ? displayNumber(numberDoc.data().number || '') : '';
    const summary =
`Buyurtmangizni tasdiqlang:

📱 Raqam: ${numberStr}
👤 Ism: ${session.draftName}
☎️ Telefon: ${session.draftPhone}
📍 Viloyat: ${session.draftRegion}`;

    await tg('sendMessage', {
      chat_id: chatId, text: summary,
      reply_markup: inlineKb([
        [{ text: '✅ Tasdiqlash', callback_data: 'confirmorder' }],
        [{ text: '❌ Bekor qilish', callback_data: 'cancelorder' }]
      ])
    });
    return { statusCode: 200, body: 'ok' };
  }

  await handleFreeTextReply(chatId, text, message.from || {}, control);
  return { statusCode: 200, body: 'ok' };

  }catch(err){
    console.error('BOT XATOSI:', err);
    return { statusCode: 200, body: 'ok' };
  }
};
