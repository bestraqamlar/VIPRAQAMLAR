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
const DISTRICTS_BY_REGION = {
  'Toshkent shahri': ['Bektemir', 'Chilonzor', "Mirzo Ulug'bek", 'Mirobod', 'Sergeli', 'Shayxontohur', 'Olmazor', 'Uchtepa', 'Yakkasaroy', 'Yunusobod', 'Yashnobod', 'Yangihayot'],
  'Toshkent viloyati': [
    'Bekobod tumani', "Bo'ka", "Bo'stonliq", 'Chinoz', 'Qibray', 'Ohangaron tumani', "Oqqo'rg'on", 'Parkent', 'Piskent', 'Quyichirchiq', 'Toshkent tumani', "O'rtachirchiq", "Yangiyo'l tumani", 'Yuqorichirchiq', 'Zangiota',
    'Nurafshon shahri', 'Angren shahri', 'Bekobod shahri', 'Chirchiq shahri', 'Ohangaron shahri', 'Olmaliq shahri', "Yangiyo'l shahri"
  ],
  'Andijon': [
    'Andijon tumani', 'Asaka tumani', 'Baliqchi', "Bo'z", 'Buloqboshi', 'Izboskan', 'Jalaquduq', "Xo'jaobod tumani", "Qo'rg'ontepa tumani", 'Marhamat', "Oltinko'l", 'Paxtaobod', 'Shahrixon tumani', "Ulug'nor",
    'Andijon shahri', 'Xonobod shahri', 'Asaka shahri', "Xo'jaobod shahri", "Qo'rg'ontepa shahri", 'Shahrixon shahri'
  ],
  "Farg'ona": [
    'Beshariq', "Bog'dod", 'Buvayda', "Dang'ara", "Farg'ona tumani", 'Furqat', "Qo'shtepa", 'Quva tumani', 'Rishton tumani', "So'x", 'Toshloq', "Uchko'prik", "O'zbekiston", 'Yozyovon', 'Oltiariq',
    "Farg'ona shahri", "Qo'qon shahri", "Marg'ilon shahri", 'Quvasoy shahri', 'Quva shahri', 'Rishton shahri'
  ],
  'Namangan': [
    'Chortoq', 'Chust tumani', 'Kosonsoy tumani', 'Mingbuloq', 'Namangan tumani', 'Norin', 'Pop tumani', "To'raqo'rg'on tumani", "Uchqo'rg'on", 'Uychi', "Yangiqo'rg'on",
    'Namangan shahri', 'Chust shahri', 'Kosonsoy shahri', 'Pop shahri', "To'raqo'rg'on shahri"
  ],
  'Samarqand': [
    "Bulung'ur", 'Ishtixon', 'Jomboy', "Kattaqo'rg'on tumani", "Qo'shrabot", 'Narpay', 'Nurobod', 'Oqdaryo', "Pastdarg'om", 'Paxtachi', 'Payariq', 'Samarqand tumani', 'Toyloq', 'Urgut tumani',
    'Samarqand shahri', "Kattaqo'rg'on shahri", 'Urgut shahri'
  ],
  'Buxoro': [
    'Buxoro tumani', "G'ijduvon tumani", 'Jondor', 'Kogon tumani', "Qorako'l", 'Qorovulbozor', 'Peshku', 'Romitan', 'Shofirkon tumani', 'Vobkent', 'Olot',
    'Buxoro shahri', 'Kogon shahri', "G'ijduvon shahri", 'Shofirkon shahri'
  ],
  'Xorazm': [
    "Bog'ot", 'Gurlan', 'Xazorasp tumani', 'Xonqa', "Qo'shko'pir", 'Shovot tumani', 'Urganch tumani', 'Yangiariq', 'Yangibozor', 'Xiva tumani',
    'Urganch shahri', 'Xiva shahri', 'Xazorasp shahri', 'Shovot shahri'
  ],
  'Navoiy': [
    'Konimex', 'Karmana', 'Navbahor', 'Nurota tumani', 'Qiziltepa', 'Tomdi', 'Uchquduq tumani', 'Xatirchi',
    'Navoiy shahri', 'Zarafshon shahri', 'Uchquduq shahri', 'Nurota shahri', "G'azli shahri"
  ],
  'Qashqadaryo': [
    'Chiroqchi', 'Dehqonobod', "G'uzor tumani", 'Kasbi', 'Kitob tumani', 'Koson tumani', 'Mirishkor', 'Muborak tumani', 'Nishon', 'Qamashi', 'Qarshi tumani', 'Shahrisabz tumani', "Yakkabog'", "Ko'kdala",
    'Qarshi shahri', 'Shahrisabz shahri', 'Kitob shahri', 'Koson shahri', "G'uzor shahri", 'Muborak shahri'
  ],
  'Surxondaryo': [
    'Angor', 'Bandixon', 'Boysun tumani', 'Denov tumani', "Jarqo'rg'on", 'Muzrabot', 'Oltinsoy', 'Qiziriq', "Qumqo'rg'on", 'Sariosiyo', 'Sherobod tumani', "Sho'rchi", 'Termiz tumani', 'Uzun',
    'Termiz shahri', 'Denov shahri', 'Sherobod shahri', 'Boysun shahri'
  ],
  'Jizzax': [
    'Arnasoy', 'Baxmal', "Do'stlik tumani", 'Forish', "G'allaorol tumani", 'Jizzax tumani', "Mirzacho'l", 'Paxtakor', 'Yangiobod', 'Zafarobod', 'Zarbdor', 'Zomin tumani',
    'Jizzax shahri', "G'allaorol shahri", "Do'stlik shahri"
  ],
  'Sirdaryo': [
    'Boyovut', 'Guliston tumani', 'Mirzaobod', 'Oqoltin', 'Sardoba', 'Sayxunobod', 'Sirdaryo tumani', 'Xovos',
    'Guliston shahri', 'Shirin shahri', 'Yangiyer shahri', 'Sirdaryo shahri', 'Boyovut shahri'
  ],
  "Qoraqalpog'iston": [
    'Amudaryo', 'Beruniy tumani', 'Chimboy tumani', "Ellikqal'a", 'Kegeyli', "Mo'ynoq tumani", 'Nukus tumani', "Qanliko'l", "Qorao'zak", "Qo'ng'irot tumani", 'Shumanay', "Taxtako'pir tumani", "To'rtko'l tumani", "Xo'jayli tumani",
    'Nukus shahri', 'Taxiatosh shahri', "Xo'jayli shahri", 'Chimboy shahri', 'Beruniy shahri', "To'rtko'l shahri", "Qo'ng'irot shahri", "Mo'ynoq shahri", "Taxtako'pir shahri"
  ]
};
function regionDisplayName(region){
  if(region === 'Toshkent shahri' || region === 'Toshkent viloyati') return region;
  if(region === "Qoraqalpog'iston") return "Qoraqalpog'iston Respublikasi";
  return `${region} viloyati`;
}
const BTN = {
  CHOOSE: '🔢 Raqam tanlash',
  PREMIUM: '💎 VIP raqamlar',
  SALE: '🔥 Aksiya raqamlar',
  CONTACT: '📞 Biz bilan aloqa',
  MYORDERS: '📋 Buyurtmalarim',
  BACK: '⬅️ Orqaga',
  CANCEL: '🔁 Bekor qilish',
  STEP_BACK: '🔙 Orqaga',
  SHARE_CONTACT: '📱 Raqamimni yuborish'
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
  await withRetry(() => db.collection('bot_sessions').doc(String(chatId)).set({ data: JSON.stringify(session) }, { merge: true }));
}
/* Mijozning Telegram profil ismi va username'ini saqlaydi — admin panelidagi
   "mijozlar ro'yxati"da ko'rsatish uchun. Sessiya bilan bir hujjatda,
   merge:true bilan (bir-birini ustidan yozib yubormasligi uchun). */
async function saveCustomerProfile(chatId, from){
  if(!from) return;
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || null;
  const username = from.username || null;
  try{
    await withRetry(() => db.collection('bot_sessions').doc(String(chatId)).set({ name, username, lastSeenAt: Date.now() }, { merge: true }));
  }catch(e){ /* muhim emas */ }
}
/* Mijoz bir tugmani bosgach, o'sha eski xabardagi tugmalarni olib tashlaydi —
   shunda eski (allaqachon bosilgan) tugmalar chatda "tirik" qolib, mijozni
   chalg'itmaydi. Xabar juda eski/o'zgarmagan bo'lsa Telegram xato qaytarishi
   mumkin — bu muhim emas, e'tiborsiz qoldiriladi. */
async function clearInlineButtons(chatId, messageId){
  if(!messageId) return;
  try{
    await tg('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
  }catch(e){ /* muhim emas */ }
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
async function send(chatId, text, keyboard){
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
  const payload = { chat_id: chatId, text };
  if(keyboard) payload.reply_markup = keyboard;
  return tg('sendMessage', payload);
}
function replyKb(rows){ return { keyboard: rows, resize_keyboard: true }; }
function inlineKb(rows){ return { inline_keyboard: rows }; }

function mainMenuKeyboard(){
  return replyKb([
    [BTN.CHOOSE],
    [BTN.PREMIUM, BTN.SALE],
    [BTN.CONTACT, BTN.MYORDERS]
  ]);
}
function backKeyboard(){ return replyKb([[BTN.BACK]]); }
function cancelKeyboard(){ return replyKb([[BTN.CANCEL, BTN.STEP_BACK]]); }
function regionKeyboard(){
  const rows = REGIONS.map(r => [...r]);
  rows.push([BTN.CANCEL, BTN.STEP_BACK]);
  return replyKb(rows);
}
function districtKeyboard(region){
  const districts = DISTRICTS_BY_REGION[region] || [];
  const rows = [];
  for(let i = 0; i < districts.length; i += 2){
    rows.push(districts.slice(i, i + 2));
  }
  rows.push([BTN.CANCEL, BTN.STEP_BACK]);
  return replyKb(rows);
}
function contactKeyboard(){
  return replyKb([[{ text: BTN.SHARE_CONTACT, request_contact: true }], [BTN.CANCEL, BTN.STEP_BACK]]);
}

function formatPrice(n){ return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm"; }

async function getInstallmentRates(){
  try{
    const doc = await withRetry(() => db.collection('site_settings').doc('general').get());
    const r = (doc.exists && doc.data().installmentRates) || {};
    return {
      6: Number(r[6]) || 0,
      12: Number(r[12]) || 0,
      24: Number(r[24]) || 0,
      36: Number(r[36]) || 0
    };
  }catch(e){
    return { 6: 0, 12: 0, 24: 0, 36: 0 };
  }
}
function displayNumber(numberStr){ return (numberStr || '').replace(/-/g, ' '); }
function localDigits(numberStr){ return (numberStr || '').replace(/\D/g, '').slice(5); }
/* Natijalarni ro'yxat qilib ko'rsatadi (qidiruv/premium/aksiya uchun umumiy) */
async function showNumberList(chatId, session, items, emptyText, emptyExtraKeyboard){
  if(items.length === 0){
    if(emptyExtraKeyboard){
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
      await tg('sendMessage', { chat_id: chatId, text: emptyText, reply_markup: emptyExtraKeyboard });
    }else{
      await send(chatId, emptyText, backKeyboard());
    }
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
  const plainNumber = '+' + (item.number || '').replace(/\D/g, '');
  let text = `<b>${plainNumber}</b>\n\n`;
  text += `💵 Narxi: <b>${formatPrice(item.price)}</b>\n`;
  if(item.onSale && item.oldPrice > item.price){
    text += `<s>⚠️ Eski narxi : ${formatPrice(item.oldPrice)}</s>\n`;
  }
  if(item.installment){
    text += `💰 Raqamni 6,12,24,36 oygacha bo'lib to'lash sharti bilan olish mumkin.\n`;
  }
  if(item.reserved){
    text += `\n⚠️ Bu raqam hozir band qilinmoqda.`;
  }else{
    text += `✍️ Ushbu raqamga buyurtma berishni istaysizmi?`;
  }

  const buttons = item.reserved
    ? [[{ text: '⬅️ Orqaga', callback_data: 'backmenu' }]]
    : item.installment
      ? [
          [
            { text: "💵 Naqt to'lov", callback_data: `buy|${item.id}` },
            { text: "💳 Bo'lib to'lash", callback_data: `installment|${item.id}` }
          ],
          [{ text: '❌ Bekor qilish', callback_data: 'cancelview' }]
        ]
      : [
          [{ text: "💵 Naqt to'lov", callback_data: `buy|${item.id}` }],
          [{ text: '❌ Bekor qilish', callback_data: 'cancelview' }]
        ];
  await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
  await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: inlineKb(buttons) });
}

/* ---------------- Admin bildirishnomasi (buyurtma tushganda) ---------------- */
async function notifyAdmin(orderId, payload){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;
  let text =
`🔔 Yangi buyurtma (Telegram bot orqali)

📱 Buyurtma raqami: ${payload.number}
👤 Mijoz ismi: ${payload.name}
☎️ Ishlab turgan raqami: ${payload.phone}
📍 Manzil: ${payload.region}
🕐 Vaqti: ${payload.time}
🌐 Qayerdan: Telegram bot`;
  if(payload.installmentMonths){
    text += `\n💳 To'lov turi: ${payload.installmentMonths} oyga bo'lib to'lash (oyiga ${formatPrice(payload.installmentMonthly)})`;
  }

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
- Agar mijoz aniq buyurtma bermoqchi bo'lsa, unga botdagi tugmalardan (operatorni tanlab, so'ng raqam kiritib) yoki ro'yxatdan raqamni tanlab "💵 Naqt to'lov" tugmasini bosishni tavsiya qil — bu orqali rasmiy buyurtma tizimidan o'tadi.
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
    await saveCustomerProfile(chatId, cq.from);
    let session = await getSession(chatId);

    // Har qanday tugma bosilganda — o'sha xabardagi tugmalarni darhol olib tashlaymiz,
    // shunda mijoz eski tugmalarga chalg'imaydi, faqat oxirgi (joriy) tugmalar ko'rinadi.
    await clearInlineButtons(chatId, cq.message.message_id);

    if(data === 'backmenu' || data === 'cancelview'){
      session = { step: 'menu' };
      await saveSession(chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data.startsWith('installment|')){
      const numberId = data.split('|')[1];
      const numberDoc = await withRetry(() => db.collection('numbers').doc(numberId).get());
      if(!numberDoc.exists){
        await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Raqam topilmadi' });
        return { statusCode: 200, body: 'ok' };
      }
      const price = numberDoc.data().price || 0;
      const rates = await getInstallmentRates();
      const months = [6, 12, 24, 36];
      const tierButtons = months.map(m => {
        const rate = rates[m] || 0;
        const total = price * (1 + rate / 100);
        const monthly = Math.ceil(total / m / 1000) * 1000;
        return [{ text: `${Number(monthly).toLocaleString('ru-RU').replace(/,/g, ' ')} so'mdan - ${m} oy`, callback_data: `installmentpick|${numberId}|${m}|${monthly}` }];
      });
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
      await tg('sendMessage', {
        chat_id: chatId,
        text: "To'lash muddatini tanlang:",
        reply_markup: inlineKb([...tierButtons, [{ text: '❌ Bekor qilish', callback_data: 'cancelview' }]])
      });
      return { statusCode: 200, body: 'ok' };
    }

    if(data.startsWith('installmentpick|')){
      const [, numberId, monthsStr, monthlyStr] = data.split('|');
      session = {
        step: 'awaiting_name',
        numberId,
        installmentMonths: Number(monthsStr),
        installmentMonthly: Number(monthlyStr)
      };
      await saveSession(chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Ismingizni kiriting:', cancelKeyboard());
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
      const manzil = session.draftDistrict
        ? `${session.draftDistrict} tumani, ${regionDisplayName(session.draftRegion)}`
        : (session.draftRegion || '');

      const orderRef = await withRetry(() => db.collection('orders').add({
        number: numberStr,
        price,
        name: session.draftName || '',
        region: manzil,
        phone: session.draftPhone || '',
        numberId: session.numberId,
        customerChatId: String(chatId),
        status: 'Yangi',
        source: 'Telegram bot',
        installmentMonths: session.installmentMonths || null,
        installmentMonthly: session.installmentMonthly || null,
        createdAt: time,
        createdAtSort: Date.now()
      }));

      if(session.numberId){
        await withRetry(() => db.collection('numbers').doc(session.numberId).update({ reserved: true }));
      }

      await notifyAdmin(orderRef.id, {
        number: numberStr, name: session.draftName, phone: session.draftPhone,
        region: manzil, time,
        installmentMonths: session.installmentMonths || null,
        installmentMonthly: session.installmentMonthly || null
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
  await saveCustomerProfile(chatId, message.from);

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
  if(text === BTN.STEP_BACK){
    if(session.step === 'awaiting_name'){
      // Ism so'ralayotgan bosqichdan orqaga — o'sha raqamning tafsilotiga qaytaramiz,
      // shunda mijoz "Naqt to'lov" / "Bo'lib to'lash"ni qayta tanlashi mumkin.
      const numberId = session.numberId;
      const numberDoc = numberId ? await withRetry(() => db.collection('numbers').doc(numberId).get()) : null;
      session = { step: 'list_shown' };
      await saveSession(chatId, session);
      if(numberDoc && numberDoc.exists){
        await showNumberDetail(chatId, docToItem(numberDoc));
      }else{
        await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
      }
    }else if(session.step === 'awaiting_phone'){
      session.step = 'awaiting_name';
      await saveSession(chatId, session);
      await send(chatId, 'Ismingizni kiriting:', cancelKeyboard());
    }else if(session.step === 'awaiting_region'){
      session.step = 'awaiting_phone';
      await saveSession(chatId, session);
      await send(chatId, "Hozir ishlatib turgan raqamingizni yuboring (yozing yoki kontaktni ulashing):", contactKeyboard());
    }else if(session.step === 'awaiting_district'){
      session.step = 'awaiting_region';
      await saveSession(chatId, session);
      await send(chatId, "Viloyatingizni tanlang:", regionKeyboard());
    }else if(session.step === 'confirm'){
      session.step = 'awaiting_district';
      await saveSession(chatId, session);
      await send(chatId, 'Tumanni tanlang:', districtKeyboard(session.draftRegion));
    }else{
      session = { step: 'menu' };
      await saveSession(chatId, session);
      await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
    }
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Asosiy menyu tugmalari ---- */
  if(session.step === 'menu' || !session.step){
    if(text === BTN.CHOOSE){
      session = { step: 'awaiting_digits' };
      await saveSession(chatId, session);
      await send(chatId, 'Raqamning oxirgi 4 ta raqamini kiriting.\nMisol: 0707', backKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(text === BTN.PREMIUM){
      const snap = await withRetry(() => db.collection('numbers').where('featured', '==', true).limit(8).get());
      await showNumberList(chatId, session, snap.docs.map(docToItem), "Hozircha VIP raqamlar yo'q.");
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.SALE){
      const snap = await withRetry(() => db.collection('numbers').where('dailyDeal', '==', true).limit(8).get());
      await showNumberList(chatId, session, snap.docs.map(docToItem), "Hozircha bugungi aksiyadagi raqamlar yo'q.");
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.CONTACT){
      const contactText =
`🤖 Botga o'tish 👉 @vipraqambot

🚚 📦 O'zbekistonning istalgan hududiga yetkazib berish mavjud
☎️ Call Markaz: 878880101 | 888620101
👨‍💻 Operator: @Vip_raqamlar_admin
🆔 Telegram kanal : @Vip_raqamlar_uz`;
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
      await tg('sendMessage', {
        chat_id: chatId,
        text: contactText,
        reply_markup: inlineKb([[{ text: "VIP RAQAMLAR RO'YXATI", url: 'https://t.me/vip_raqamlar_uz' }]])
      });
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
    if(!digits || digits.length !== 4){
      await send(chatId, "Iltimos, oxirgi 4 ta raqamni kiriting. Misol: 0707", backKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    // Qidiruv boshlanganini darhol bildiramiz — mijoz jim kutib qolmasin
    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    const searchingMsg = await send(chatId, "🔍 Qidirilmoqda...");

    // Avval tezkor (indekslangan) qidiruv — barcha operatorlar orasidan,
    // yangi qo'shilgan raqamlar uchun
    let matches = [];
    try{
      const snap = await withRetry(() => db.collection('numbers')
        .where('last4', '==', digits)
        .limit(50).get());
      matches = snap.docs.map(docToItem).filter(item => !item.reserved);
    }catch(e){ /* indeks hali tayyor bo'lmasa, pastdagi zaxira qidiruv ishlaydi */ }

    // Agar topilmasa (yoki indeks yo'q bo'lsa) — bazadagi BARCHA raqamlarni
    // (sahifalab, cheklovsiz, operatordan qat'iy nazar) tekshirib chiqamiz —
    // bu eski raqamlarni ham, bazada qancha bo'lsa ham, albatta topadi.
    if(matches.length === 0){
      const allDocs = [];
      let lastDoc = null;
      while(true){
        await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
        let q = db.collection('numbers')
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

    if(searchingMsg && searchingMsg.result && searchingMsg.result.message_id){
      await tg('deleteMessage', { chat_id: chatId, message_id: searchingMsg.result.message_id }).catch(() => {});
    }
    await showNumberList(chatId, session, matches,
      `${digits} raqami sotuvda mavjud emas`,
      inlineKb([[{ text: '📋 Raqam ro\'yxati', url: 'https://t.me/vip_raqamlar_uz' }]]));
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
    session.step = 'awaiting_district';
    await saveSession(chatId, session);
    await send(chatId, 'Tumanni tanlang:', districtKeyboard(text));
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Buyurtma: tuman ---- */
  if(session.step === 'awaiting_district'){
    const districts = DISTRICTS_BY_REGION[session.draftRegion] || [];
    if(!districts.includes(text)){
      await send(chatId, "Iltimos, ro'yxatdan tumanni tanlang.", districtKeyboard(session.draftRegion));
      return { statusCode: 200, body: 'ok' };
    }
    session.draftDistrict = text;
    session.step = 'confirm';
    await saveSession(chatId, session);

    const numberDoc = await withRetry(() => db.collection('numbers').doc(session.numberId).get());
    const nd = numberDoc.exists ? numberDoc.data() : {};
    const numberStr = displayNumber(nd.number || '');
    const priceStr = formatPrice(nd.price || 0);
    const manzil = `${session.draftDistrict} tumani, ${regionDisplayName(session.draftRegion)}`;

    let summary =
`Barcha ma'lumotlar to'g'ri ekanligini tasdiqlaysizmi?

FIO: ${session.draftName}
Sevimli raqam: <b>${numberStr}</b>
Narxi: <b>${priceStr}</b>
Bog'lanish uchun raqam: ${session.draftPhone}
Manzil: ${manzil}`;
    if(session.installmentMonths){
      summary += `\nTo'lov turi: ${session.installmentMonths} oyga bo'lib to'lash (oyiga ${formatPrice(session.installmentMonthly)})`;
    }

    await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
    await tg('sendMessage', {
      chat_id: chatId, text: summary, parse_mode: 'HTML',
      reply_markup: inlineKb([
        [{ text: '✅ Ha', callback_data: 'confirmorder' }, { text: "❌ Yo'q", callback_data: 'cancelorder' }]
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
