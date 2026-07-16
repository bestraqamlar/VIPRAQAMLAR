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
//  6) Mijoz bizga BIRINCHI MARTA yozganda: "Assalomu alaykum!" + "YORDAMCHI
//     24/7" belgisi bilan boshlanadi, kanal havolasi tavsiya qilinadi.
//     Qaytgan mijozlarga esa to'g'ridan-to'g'ri, kanal havolasini
//     takrorlamasdan javob beriladi.
//  7) Bot @vip_raqamlar_uz kanaliga ADMIN qilib qo'shilgan bo'lsa, kanalga
//     joylangan postlardagi raqamlarni kuzatib boradi (so'nggi 2 kun) —
//     shunda bazada hali yo'q, lekin kanalda e'lon qilingan raqamlar haqida
//     ham "bor" deb javob bera oladi (faqat raqamning o'zi, narxsiz).
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
  // Telegram'ning haqiqiy BusinessConnection obyektida akkaunt egasi
  // conn.user (User obyekti, .id maydoni bilan) ko'rinishida keladi —
  // conn.user_id emas. Faollik esa conn.is_enabled orqali beriladi
  // (true = faol), conn.is_disabled degan maydon umuman yo'q.
  const ownerUser = conn.user || {};
  await withRetry(() => db.collection('tg_business_connections').doc(conn.id).set({
    ownerUserId: ownerUser.id || null,
    canReply: !!(conn.rights && conn.rights.can_reply),
    disabled: conn.is_enabled === false,
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

/* ==================================================================
   TELEGRAM KANAL (@vip_raqamlar_uz) POSTLARINI KUZATISH
   ==================================================================
   Bot shu kanalga ADMIN sifatida qo'shilgan bo'lishi kerak (buni admin
   Telegram ilovasida qo'lda qiladi). Shunda har safar kanalga yangi post
   joylanganda, Telegram bizga "channel_post" turidagi webhook yuboradi.
   Biz post matnidan telefon raqamiga o'xshagan ketma-ketliklarni topib,
   Firestore'ga saqlab qo'yamiz — shunda mijoz "0101 bormi" deb so'rasa,
   agar bazada bo'lmasa ham, "kanalda so'nggi 2 kunda joylangan edi"
   holatini bot bila oladi.
   ================================================================== */
const CHANNEL_MATCH_WINDOW_MS = 2 * 24 * 60 * 60 * 1000; // 2 kun

function extractNumbersFromText(text){
  if(!text) return [];
  // O'zbek raqamlariga xos ketma-ketlik: ixtiyoriy +998 bilan boshlanib,
  // 9 ta raqamdan iborat (bo'sh joy/tire bilan ajratilgan bo'lishi mumkin)
  const regex = /(?:\+?998[\s\-]?)?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}\b/g;
  const found = new Set();
  const matches = text.match(regex) || [];
  for(const m of matches){
    const digits = m.replace(/\D/g, '').slice(-9);
    if(digits.length === 9) found.add(digits);
  }
  return Array.from(found);
}

async function saveChannelPost(text){
  const nums = extractNumbersFromText(text);
  for(const digits of nums){
    try{
      await withRetry(() => db.collection('channel_posted_numbers').doc(digits).set({
        number: '+998' + digits,
        postedAt: Date.now(),
        rawText: (text || '').slice(0, 300)
      }));
    }catch(e){ /* muhim emas */ }
  }
}

async function searchChannelPosts(suffix, contains){
  try{
    const cutoff = Date.now() - CHANNEL_MATCH_WINDOW_MS;
    const snap = await withRetry(() => db.collection('channel_posted_numbers').where('postedAt', '>=', cutoff).get());
    let items = snap.docs.map(d => d.data());
    if(suffix){ const s = String(suffix).replace(/\D/g, ''); if(s) items = items.filter(it => it.number.replace(/\D/g, '').endsWith(s)); }
    if(contains){ const c = String(contains).replace(/\D/g, ''); if(c) items = items.filter(it => it.number.replace(/\D/g, '').includes(c)); }
    return items.slice(0, 5).map(it => ({ number: displayNumber(it.number) }));
  }catch(e){ return []; }
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
   bitta joydan ko'radi. */
async function logVoiceCustomer(userId, name){
  await updateAdminList(db, 'voice_message_customers', "🎤 Ovozli xabar yuborgan mijozlar (o'zingiz javob berishingiz kerak):", userId, name);
}

/* ---------------- AI javob (mijoz botidagi bilan bir xil sozlamalardan foydalanadi) ---------------- */
const AI_TOOLS = [
  {
    name: 'search_numbers',
    description: "Bazadagi telefon raqamlarini filtrlar bo'yicha qidiradi (faqat o'qish). Bazada topilmasa, natijada 'channelMatches' orqali Telegram kanalidagi so'nggi 2 kunlik postlardan topilgan mos raqamlar ham qaytishi mumkin.",
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
      telegramChannelLink: data.telegramChannelLink || 'https://t.me/vip_raqamlar_uz',
      faqRules: Array.isArray(data.faqRules) ? data.faqRules : []
    };
  }catch(e){
    return { generalInstructions: '', deliveryInfo: "Ha, 12 ta viloyatga yetkazib berish xizmatimiz mavjud.", telegramChannelLink: 'https://t.me/vip_raqamlar_uz', faqRules: [] };
  }
}

function buildSystemPrompt(settings, isFirstTime){
  const parts = [];
  parts.push(`Sen RAQAM.UZ (O'zbekistondagi chiroyli/oltin/VIP telefon raqamlari do'koni) egasining shaxsiy Telegram akkauntiga yozilgan xabarlarga javob beryapsan. MUHIM: mijoz buni "bot" deb emas, xuddi akkaunt egasi o'zi yozayotgandek his qilishi kerak — shuning uchun tabiiy, HAQIQIY ODAM kabi (shablon/robot ohangida emas) yoz.`);
  parts.push(`QOIDALAR (BULARGA QAT'IY RIOYA QIL):
- Javoblaring HECH QACHON ${MAX_REPLY_WORDS} ta so'zdan oshmasin. Juda qisqa va lo'nda yoz.
- Kamida bitta mos emoji ishlat, lekin bachkana bo'lmasin.
- Narxlarni faqat search_numbers natijasidan ol — o'ylab topma.
- Mijoz aniq raqam so'rasa (masalan "0101 bormi"): search_numbers bilan tekshir. Topilsa FAQAT RAQAMNING O'ZINI ayt — narxini aytish SHART EMAS.
- Agar search_numbers natijasida "channelMatches" ro'yxati bo'lsa (bazada topilmagan, lekin bizning Telegram kanalimizda so'nggi 2 kun ichida joylangan raqam) — o'sha raqamni xuddi shunday, faqat o'zini ayt.
- Agar hech qayerda (na bazada, na kanalda) topilmasa, buni hech qachon qat'iy "yo'q"/"mavjud emas" deb aytma — "Operatorimiz tekshirib, tez orada javob beradi" kabi qisqa javob ber va albatta forward_lead_to_admin vositasini chaqirib, so'ralgan raqamni yetkaz.
- Yetkazib berish so'ralsa: "${settings.deliveryInfo}"
- Salbiy fikrga bahslashmasdan xotirjam javob ber.
- Mijoz aniq sotib olish niyatini bildirsa, forward_lead_to_admin vositasini chaqir.
- "Siz botmisiz" deb so'rasa — rostini ayt, yashirma.`);

  if(isFirstTime){
    parts.push(`BU MIJOZ BIZGA HOZIR BIRINCHI MARTA YOZYAPTI. Javobingda o'zing "Assalomu alaykum" deb salomlashma — bu allaqachon xabar boshiga alohida qo'shib qo'yiladi, sen faqat undan keyingi asosiy mazmunni yoz. Mavzuga mos bo'lsa, Telegram kanalimizni tavsiya qil: "${settings.telegramChannelLink}" — masalan "Kanalimizdan yoqqan raqamni tanlab aytsangiz, rasmiylashtirib beramiz" kabi.`);
  }else{
    parts.push(`Bu mijoz bilan avval ham yozishgansiz — salomlashish shart emas, to'g'ridan-to'g'ri savoliga javob ber. Telegram kanal havolasini ("${settings.telegramChannelLink}") FAQAT mijoz o'zi so'rasa yoki aniq kerak bo'lganda ayt — har bir xabarda takrorlama.`);
  }

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

  // Bazada topilmasa, VA aniq suffix/contains bilan qidirilgan bo'lsa —
  // Telegram kanalidagi so'nggi 2 kunlik postlardan ham tekshiramiz
  let channelMatches = [];
  if(total === 0 && (input.suffix || input.contains)){
    channelMatches = await searchChannelPosts(input.suffix, input.contains);
  }

  return { total, items: shown, channelMatches };
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

async function generateReply(userText, senderId, isFirstTime){
  const settings = await loadBotSettings();
  const systemPrompt = buildSystemPrompt(settings, isFirstTime);
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

    // --- Kanalga (@vip_raqamlar_uz) yangi post joylanganda keladi. Bot shu
    //     kanalga ADMIN sifatida qo'shilgan bo'lishi kerak. Post matnidan
    //     raqamlarni ajratib, keyinchalik "0101 bormi" kabi so'rovlarga
    //     javob berishda ishlatish uchun saqlaymiz. ---
    if(update.channel_post){
      const post = update.channel_post;
      await saveChannelPost(post.text || post.caption || '');
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
      // Gift, stiker, rasm va h.k. (matni yo'q xabarlar) — botni buzmasdan,
      // shunchaki hech narsa qilmasdan qabul qilinadi (xatoga olib kelmaydi).
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

      // Avval yozgan (qaytgan) mijozlarga bot DARHOL javob beradi — hech
      // qanday qo'shimcha kechikish yoki tekshiruv qo'shilmagan.
      await tgBiz('sendChatAction', { chat_id: msg.chat.id, action: 'typing', business_connection_id: connectionId });

      const rawReply = await generateReply(text, senderId, isFirstTime);
      if(rawReply){
        // Birinchi marta yozgan mijozga: "Assalomu alaykum" + ajratuvchi
        // "YORDAMCHI 24/7" belgisi + asosiy javob. Qaytgan mijozga — to'g'ridan-to'g'ri javob.
        const finalReply = isFirstTime
          ? `Assalomu alaykum!\n\nYORDAMCHI 24/7\n\n${rawReply}`
          : rawReply;
        await tgBiz('sendMessage', { chat_id: msg.chat.id, text: finalReply, business_connection_id: connectionId });
      }
      return { statusCode: 200, body: 'ok' };
    }

    return { statusCode: 200, body: 'ok' };
  }catch(err){
    console.error('TELEGRAM BUSINESS BOT XATOSI:', err);
    return { statusCode: 200, body: 'ok' };
  }
};
