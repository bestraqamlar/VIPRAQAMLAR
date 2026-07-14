// TELEGRAM BUSINESS BOT — sizning SHAXSIY/BIZNES Telegram akkauntingizga
// (Premium obunasi orqali yoqiladigan "Secretary Mode" / "Telegram Business"
// funksiyasi) yozilgan xabarlarga AI orqali AVTOMATIK javob beradi.
//
// FARQI boshqa botlardan: bu yerda mijoz sizning ismingiz/rasmingizni ko'radi
// — botning alohida profili yo'q, xuddi siz o'zingiz yozayotgandek ko'rinadi.
// Bu Telegram'ning rasmiy "Business Connection" API'si orqali ishlaydi.
//
// QANDAY ISHLAYDI:
//  1) Telegram sizga (business account egasiga) yozilgan har bir xabar haqida
//     "business_message" turidagi webhook yuboradi.
//  2) Biz buni AI'ga uzatib, javob matnini olamiz (har doim 15 so'zdan qisqa).
//  3) Javobni sendMessage orqali, business_connection_id parametri bilan
//     yuboramiz — shunda Telegram buni xuddi SIZ yozgandek mijozga ko'rsatadi.
//  4) Agar SIZ o'zingiz qo'lda javob yozsangiz, bot buni sezib, aralashmaydi
//     — sizning qo'lda yozgan xabaringiz doim ustunlik qiladi.
//  5) Agar mijoz OVOZLI (voice/audio) xabar yuborsa — bot uni o'qimaydi va
//     mijozga hech narsa yozmaydi, faqat mijoz ismini adminning ICHKI
//     Telegram botiga raqamlangan ro'yxat qilib yuboradi (1. Ism, 2. Ism...),
//     shunda admin bunday mijozlarga o'zi qo'lda javob bera oladi.
//
// Kerakli Environment variables (Netlify):
//   TELEGRAM_BUSINESS_BOT_TOKEN — Secretary Mode yoqilgan alohida bot tokeni
//   ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (ichki xabarnoma uchun)
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//
// Botning javob uslubi admin paneldagi "💬 Telegram AI" bo'limidan
// boshqariladi (xuddi mijoz boti bilan bir xil sozlamalar ishlatiladi).

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
db.settings({ preferRest: true });

const CLAUDE_MODEL = 'claude-sonnet-5';
const MAX_TOOL_ROUNDS = 4;
const MAX_REPLY_WORDS = 15;
const OPERATORS = ['Beeline', 'Ucell', 'Mobiuz', 'Humans', 'Uzmobile', 'Perfektum'];

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

/* Javob matnini HECH QACHON 15 so'zdan oshirmaslik uchun xavfsizlik to'sig'i
   (AI ko'rsatmaga rioya qilmagan taqdirda ham kafolatlaydi). */
function capWords(text, maxWords = MAX_REPLY_WORDS){
  if(!text) return text;
  const words = text.trim().split(/\s+/);
  if(words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

async function tgBiz(method, payload){
  const token = process.env.TELEGRAM_BUSINESS_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

/* ---------------- Business connection ma'lumotini keshlash ---------------- */
async function saveConnection(conn){
  await withRetry(() => db.collection('tg_business_connections').doc(conn.id).set({
    ownerUserId: conn.user_id,
    canReply: !!(conn.rights && conn.rights.can_reply),
    disabled: !!conn.is_disabled,
    updatedAt: Date.now()
  }));
}
async function getConnection(connectionId){
  try{
    const doc = await withRetry(() => db.collection('tg_business_connections').doc(connectionId).get());
    return doc.exists ? doc.data() : null;
  }catch(e){ return null; }
}

async function alreadyProcessed(key){
  const ref = db.collection('tg_business_processed').doc(String(key));
  const doc = await withRetry(() => ref.get());
  if(doc.exists) return true;
  await withRetry(() => ref.set({ at: Date.now() }));
  return false;
}

/* ---------------- "Qo'lda javob bersam — bot aralashmasin" ----------------
   Agar akkaunt egasi (siz) shu mijozga o'zingiz shaxsan javob yozsangiz,
   bot o'sha muayyan suhbatga 30 daqiqa davomida aralashmaydi — sizning
   qo'lda yozgan xabaringiz doim ustunlik qiladi. (Eslatma: Telegram Bot
   API "xabarni o'qidingizmi" degan holatni bermaydi, shuning uchun bu
   aynan "SIZ o'zingiz yozganingizda" ishlaydi, shunchaki ochib qo'yish
   bilan emas — bu Telegram tomonidan texnik cheklov.) */
const HUMAN_OVERRIDE_MS = 30 * 60 * 1000; // 30 daqiqa

async function setHumanOverride(chatId){
  try{
    await withRetry(() => db.collection('tg_business_human_override').doc(String(chatId)).set({ until: Date.now() + HUMAN_OVERRIDE_MS }));
  }catch(e){ /* muhim emas */ }
}
async function isHumanOverrideActive(chatId){
  try{
    const doc = await withRetry(() => db.collection('tg_business_human_override').doc(String(chatId)).get());
    if(!doc.exists) return false;
    return (doc.data().until || 0) > Date.now();
  }catch(e){ return false; }
}

/* ---------------- Ovozli xabar yuborgan mijozlar ro'yxati (adminga) ----------------
   Barcha kanallardan (bu bot + mijoz Telegram boti) kelgan ovozli xabar
   yuboruvchilar BITTA umumiy ro'yxatga to'planadi — shu bilan admin qaysi
   kanaldan bo'lishidan qat'iy nazar, barcha "javobsiz qolgan" mijozlarni
   bitta joydan ko'radi. Ro'yxat bitta xabarni tahrirlab (edit) yangilanadi. */
/* ---------------- Ovozli xabar yuborgan mijozlar ro'yxati (adminga) ----------------
   Barcha kanallardan (bu bot + mijoz Telegram boti) kelgan ovozli xabar
   yuboruvchilar BITTA umumiy ro'yxatga to'planadi — shu bilan admin qaysi
   kanaldan bo'lishidan qat'iy nazar, barcha "javobsiz qolgan" mijozlarni
   bitta joydan ko'radi. */
async function logVoiceCustomer(userId, name){
  await updateAdminList(db, 'voice_message_customers', "🎤 Ovozli xabar yuborgan mijozlar (o'zingiz javob berishingiz kerak):", userId, name);
}

/* ---------------- AI javob (mijoz botidagi bilan bir xil sozlamalardan foydalanadi) ---------------- */
const AI_TOOLS = [
  {
    name: 'search_numbers',
    description: "Bazadagi telefon raqamlarini filtrlar bo'yicha qidiradi (faqat o'qish).",
    input_schema: {
      type: 'object',
      properties: {
        suffix: { type: 'string' },
        contains: { type: 'string' },
        operator: { type: 'string', enum: OPERATORS },
        tag: { type: 'string', enum: ['oddiy', 'vip'] },
        maxPrice: { type: 'number' },
        limit: { type: 'number' }
      }
    }
  },
  {
    name: 'forward_lead_to_admin',
    description: "Mijozning sotib olish niyatini yoki topilmagan raqam so'rovini adminning ICHKI Telegram botiga yuboradi.",
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary']
    }
  }
];

function displayNumber(numberStr){ return (numberStr || '').replace(/-/g, ' '); }

async function loadBotSettings(){
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

function buildSystemPrompt(settings){
  const parts = [];
  parts.push(`Sen RAQAM.UZ (O'zbekistondagi chiroyli/oltin/VIP telefon raqamlari do'koni) egasining shaxsiy Telegram akkauntiga yozilgan xabarlarga javob beryapsan. MUHIM: mijoz buni "bot" deb emas, xuddi akkaunt egasi o'zi yozayotgandek his qilishi kerak — shuning uchun tabiiy, inson kabi yoz.`);
  parts.push(`QOIDALAR (BULARGA QAT'IY RIOYA QIL):
- Javoblaring HECH QACHON ${MAX_REPLY_WORDS} ta so'zdan oshmasin. Juda qisqa va lo'nda yoz.
- Kamida bitta mos emoji ishlat, lekin bachkana bo'lmasin.
- Narxlarni faqat search_numbers natijasidan ol — o'ylab topma.
- Agar mijoz so'ragan raqam qidiruvda TOPILMASA, buni hech qachon qat'iy "yo'q"/"mavjud emas" deb aytma — katalogimizda hali bazaga kiritilmagan ko'p raqam bor. Bunday holatda: "Operatorimiz tekshirib, tez orada javob beradi" kabi qisqa javob ber va albatta forward_lead_to_admin vositasini chaqirib, so'ralgan raqamni yetkaz.
- Yetkazib berish so'ralsa: "${settings.deliveryInfo}"
- Salbiy fikrga bahslashmasdan xotirjam javob ber.
- Mijoz aniq sotib olish niyatini bildirsa, forward_lead_to_admin vositasini chaqir.
- "Siz botmisiz" deb so'rasa — rostini ayt, yashirma.`);

  if(settings.faqRules && settings.faqRules.length){
    const rulesText = settings.faqRules
      .filter(r => r && r.trigger && r.response)
      .map(r => `- "${r.trigger}" → "${r.response}"`)
      .join('\n');
    if(rulesText) parts.push(`TAYYOR JAVOBLAR:\n${rulesText}`);
  }
  if(settings.generalInstructions && settings.generalInstructions.trim()){
    parts.push(`QO'SHIMCHA KO'RSATMALAR:\n${settings.generalInstructions.trim()}`);
  }
  return parts.join('\n\n');
}

async function execSearch(input){
  const snap = await withRetry(() => db.collection('numbers').get());
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if(input.suffix){ const s = String(input.suffix).replace(/\D/g,''); if(s) items = items.filter(it => (it.number||'').replace(/\D/g,'').endsWith(s)); }
  if(input.contains){ const c = String(input.contains).replace(/\D/g,''); if(c) items = items.filter(it => (it.number||'').replace(/\D/g,'').includes(c)); }
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
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function callClaude(systemPrompt, messages){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 400, system: systemPrompt, tools: AI_TOOLS, messages })
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data && data.error && data.error.message) || 'Claude API xatosi');
  return data;
}

async function generateReply(userText, senderId){
  const settings = await loadBotSettings();
  const systemPrompt = buildSystemPrompt(settings);
  let messages = [{ role: 'user', content: userText }];

  for(let round = 0; round < MAX_TOOL_ROUNDS; round++){
    const data = await callClaude(systemPrompt, messages);
    const content = data.content || [];
    messages = [...messages, { role: 'assistant', content }];

    const toolUse = content.find(b => b.type === 'tool_use');
    if(!toolUse){
      const reply = content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
      return capWords(reply);
    }

    let toolResult;
    try{
      if(toolUse.name === 'search_numbers') toolResult = await execSearch(toolUse.input || {});
      else if(toolUse.name === 'forward_lead_to_admin'){
        await notifyAdminLead(`💬 Shaxsiy Telegram akkauntga yangi qiziqish!\n\n👤 Foydalanuvchi ID: ${senderId}\n📝 ${(toolUse.input||{}).summary || ''}`);
        toolResult = { forwarded: true };
      }
      else toolResult = { error: "Noma'lum vosita" };
    }catch(err){ toolResult = { error: err.message }; }

    messages = [...messages, { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] }];
  }
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  try{
    const control = await getBotControl(db);
    if(!control.botEnabled) return { statusCode: 200, body: 'ok' }; // bot butunlay to'xtatilgan

    if(update.business_connection){
      await saveConnection(update.business_connection);
      return { statusCode: 200, body: 'ok' };
    }

    if(update.business_message){
      const msg = update.business_message;
      const connectionId = msg.business_connection_id;

      // --- Ovozli/audio xabar: o'qimaymiz, mijozga javob yozmaymiz — faqat adminga ro'yxat qilib yuboramiz ---
      if(msg.voice || msg.audio){
        const from = msg.from || {};
        const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || (from.username ? '@' + from.username : `ID:${from.id || ''}`);
        await logVoiceCustomer(from.id || (msg.chat && msg.chat.id), name);
        return { statusCode: 200, body: 'ok' };
      }

      const text = msg.text;
      if(!connectionId || !text) return { statusCode: 200, body: 'ok' };

      const dedupKey = 'msg_' + connectionId + '_' + msg.message_id;
      if(await alreadyProcessed(dedupKey)) return { statusCode: 200, body: 'ok' };

      let conn = await getConnection(connectionId);
      if(!conn){
        try{
          const res = await tgBiz('getBusinessConnection', { business_connection_id: connectionId });
          if(res.ok && res.result){ await saveConnection(res.result); conn = await getConnection(connectionId); }
        }catch(e){ /* topilmasa pastda xavfsiz tomonga o'tamiz */ }
      }

      const senderId = msg.from && msg.from.id;

      // --- SIZ o'zingiz shaxsan javob yozdingiz — bot shu suhbatga 30 daqiqa
      //     aralashmaydi, sizning qo'lda yozgan xabaringiz ustunlik qiladi ---
      if(conn && senderId === conn.ownerUserId){
        await setHumanOverride(msg.chat.id);
        return { statusCode: 200, body: 'ok' };
      }
      if(conn && conn.disabled) return { statusCode: 200, body: 'ok' };

      // --- Avtobot o'chirilgan bo'lsa, yoki siz yaqinda shu mijozga qo'lda
      //     javob yozgan bo'lsangiz — bot jim turadi ---
      if(!control.autoReplyEnabled) return { statusCode: 200, body: 'ok' };
      if(await isHumanOverrideActive(msg.chat.id)) return { statusCode: 200, body: 'ok' };

      // --- Bu mijoz BIZGA BIRINCHI MARTA yozayapti va admin "yangi
      //     mijozlarga avto javob"ni o'chirib qo'ygan bo'lsa — bot javob
      //     yozmaydi, faqat ismini adminga ro'yxat qilib yuboradi ---
      const isFirstTime = await checkAndMarkKnown(db, 'known_customers_tgbusiness', msg.chat.id);
      if(isFirstTime && !control.newUserAutoReplyEnabled){
        const from = msg.from || {};
        const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || (from.username ? '@' + from.username : `ID:${msg.chat.id}`);
        await updateAdminList(db, 'new_customers', "🆕 Yangi mijozlar (birinchi marta yozgan, o'zingiz javob berishingiz kerak):", msg.chat.id, name);
        return { statusCode: 200, body: 'ok' };
      }

      await tgBiz('sendChatAction', { chat_id: msg.chat.id, action: 'typing', business_connection_id: connectionId });

      const reply = await generateReply(text, senderId);
      if(reply){
        await tgBiz('sendMessage', { chat_id: msg.chat.id, text: reply, business_connection_id: connectionId });
      }
      return { statusCode: 200, body: 'ok' };
    }

    return { statusCode: 200, body: 'ok' };
  }catch(err){
    console.error('TELEGRAM BUSINESS BOT XATOSI:', err);
    return { statusCode: 200, body: 'ok' };
  }
};
