// INSTAGRAM DIRECT + KOMMENTARIYA BOTI — VIPRAQAMLAR.UZ'ning Instagram sahifasiga
// yozilgan Direct xabarlar va post/reels kommentariyalariga "VIPRAQAMLAR AI"
// nomi bilan avtomatik javob beradi.
//
// Botning xatti-harakati (Telegram kanal havolasi, dostavka javobi,
// qo'shimcha ko'rsatmalar va tayyor savol-javoblar) ADMIN PANELIDAGI
// "📸 Instagram AI" bo'limidan boshqariladi — Firestore'ning
// site_settings/instagram_bot hujjatidan har bir so'rovda o'qiladi, shuning
// uchun admin sozlamani o'zgartirsa, botning javobi darhol yangilanadi
// (kodni qayta joylash shart emas).
//
// ISHLASH TARTIBI:
//  1) GET so'rov — Meta webhook'ni sozlayotganda "hub.challenge" orqali
//     tekshiradi.
//  2) POST so'rov — yangi comment yoki DM kelganda Meta shu yerga xabar
//     yuboradi. Imzo tekshiriladi, hodisa o'qiladi, Claude orqali javob
//     matni generatsiya qilinadi va Instagram Graph API orqali yuboriladi.
//  3) Mijoz sotib olishga qiziqish bildirsa — forward_lead_to_admin vositasi
//     orqali sizning ICHKI Telegram admin botingizga (TELEGRAM_BOT_TOKEN/
//     TELEGRAM_CHAT_ID) xabar boradi. Bu — mijozlarga ko'rsatiladigan ochiq
//     Telegram KANAL havolasidan farqli, faqat siz ko'radigan ichki xabar.
//
// XAVFSIZLIK: bu funksiya faqat O'QIYDI (search_numbers) — o'chirish, narx
// o'zgartirish yoki qo'shish vositasi YO'Q, chunki bu ochiq, tashqi
// foydalanuvchilar bilan ishlaydigan webhook.
//
// Kerakli Environment variables (Netlify Dashboard > Environment variables):
//   IG_VERIFY_TOKEN, IG_APP_SECRET, IG_PAGE_ACCESS_TOKEN
//   ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const crypto = require('crypto');
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
const IG_GRAPH_VERSION = 'v21.0';
const MAX_TOOL_ROUNDS = 4;

const DEFAULT_SETTINGS = {
  telegramChannelLink: 'https://t.me/raqamuz',
  deliveryInfo: "Ha, 12 ta viloyatga yetkazib berish xizmatimiz mavjud.",
  generalInstructions: '',
  faqRules: []
};

const TOOLS = [
  {
    name: 'search_numbers',
    description: "Bazadagi telefon raqamlarini filtrlar bo'yicha qidiradi (faqat o'qish). Mijoz aniq raqam yoki narx haqida so'raganda ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: {
        suffix: { type: 'string', description: "Raqam shu bilan tugashi kerak" },
        contains: { type: 'string', description: "Raqam ichida shu ketma-ketlik bo'lishi kerak" },
        operator: { type: 'string', enum: ['Beeline', 'Ucell', 'Uzmobile', 'Mobiuz', 'Humans', 'Perfektum'] },
        tag: { type: 'string', enum: ['oddiy', 'vip'] },
        maxPrice: { type: 'number' },
        limit: { type: 'number', description: 'Standart 5, maksimal 10' }
      }
    }
  },
  {
    name: 'forward_lead_to_admin',
    description: "Mijozning sotib olish niyati yoki aloqa ma'lumotini adminning ICHKI Telegram botiga yuboradi (mijozga ko'rinmaydi).",
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: "Adminga yuboriladigan qisqa xulosa: kim, nima haqida, qaysi raqam" }
      },
      required: ['summary']
    }
  }
];

function formatPrice(n) {
  return (Number(n) || 0).toLocaleString('ru-RU') + " so'm";
}

async function loadBotSettings() {
  try {
    const doc = await db.collection('site_settings').doc('instagram_bot').get();
    if (!doc.exists) return { ...DEFAULT_SETTINGS };
    const data = doc.data() || {};
    return {
      telegramChannelLink: data.telegramChannelLink || DEFAULT_SETTINGS.telegramChannelLink,
      deliveryInfo: data.deliveryInfo || DEFAULT_SETTINGS.deliveryInfo,
      generalInstructions: data.generalInstructions || '',
      faqRules: Array.isArray(data.faqRules) ? data.faqRules : []
    };
  } catch (e) {
    console.error('Instagram bot sozlamalarini o\'qishda xato:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

async function getCheapestPrice() {
  try {
    const snap = await db.collection('numbers').get();
    const items = snap.docs.map(d => d.data()).filter(it => !it.reserved && (it.price || 0) > 0);
    if (!items.length) return null;
    return Math.min(...items.map(it => it.price));
  } catch (e) {
    return null;
  }
}

function buildSystemPrompt(channel, settings, cheapestPrice) {
  const parts = [];

  parts.push(`Sen "VIPRAQAMLAR AI" — VIPRAQAMLAR.UZ (O'zbekistondagi chiroyli/oltin/VIP telefon raqamlari do'koni) Instagram sahifasida ishlaydigan yordamchisan. Sahifamiz obunachilari orasida qimmatbaho narsalarni qadrlaydigan, badavlat auditoriya ko'p — shuning uchun har doim hurmatli, ishonchli va PREMIUM ohangda yoz, hech qachon arzimas yoki bosiq-oddiy ko'rinma.`);

  parts.push(`QOIDALAR:
- Har bir javobingda albatta kamida bitta mos emoji bo'lsin, lekin BOLALARCHA yoki bachkana emojilardan (masalan 😂🤣💀😜) foydalanma — o'rniga did bilan tanlangan, holatga mos emoji ishlat (masalan 📞✨💎🚗📍✅).
- Javoblaring QISQA bo'lsin (odatda 1-3 gap). Instagram uslubiga mos — rasmiy hujjat emas, samimiy va tabiiy yoz.
- Narxlarni faqat search_numbers natijasidan yoki quyida berilgan haqiqiy ma'lumotdan ol — hech qachon narxni o'ylab topma.
- Agar mijoz salbiy/norozi fikr yozsa (masalan narx qimmat deydi, shikoyat qiladi) — bahslashma, himoyalanma. Xotirjam, "xay bo'pti" ohangida, qisqa va vazmin javob ber, holatga mos emoji bilan.
- Agar savol raqamlarga umuman aloqasi bo'lmasa yoki tushunarsiz bo'lsa — vosita chaqirmasdan, qisqa va muloyim umumiy javob ber.`);

  if (channel === 'dm') {
    parts.push(`BU — INSTAGRAM DIRECT XABARGA JAVOB.
- Javobing juda qisqa bo'lsin (1-2 gap).
- Mijoz aniq raqam so'rasa (masalan "0101 bormi", "shu raqam bormi"): search_numbers bilan tekshir. Agar mavjud bo'lsa qisqa tasdiqla va narxini ayt. Agar aniq shu raqam topilmasa YOKI mijoz umuman narx/mavjudlik haqida so'rasa, "Bizda eng arzon raqam ${cheapestPrice ? formatPrice(cheapestPrice) : "190 000 so'm"}dan boshlanadi" tarzida qisqa ayt.
- HAR DOIM javobing oxirida mijozni bizning Telegram kanalimizga o'tishga taklif qil, aynan shu havola bilan: ${settings.telegramChannelLink} — chunki tanlov va buyurtam shu yerda davom etadi.
- Agar mijoz sotib olishga aniq tayyor ekanini yoki kontaktini yozsa, forward_lead_to_admin vositasini albatta chaqir.`);
  } else {
    parts.push(`BU — POST/REELS OSTIDAGI KOMMENTARIYAGA JAVOB (hammaga ko'rinadi).
- Mijoz raqam haqida so'rasa (mavjudmi, narxi, va h.k.): "Siz qidirgan raqam bizda mavjud ✨, Telegram kanalimizdan (${settings.telegramChannelLink}) tanlab buyurtma bersangiz bo'ladi." tarzida javob ber — aniq narxni kommentariyada ochiq yozmaslik ma'qul (agar admin ko'rsatmasida boshqacha aytilmagan bo'lsa).
- Yetkazib berish/dostavka haqida so'ralsa: "${settings.deliveryInfo}"
- Javobingda tabiiy joyda o'zingni tanishtirib qo'y (masalan oxirida "— VIPRAQAMLAR AI" kabi qisqa imzo, lekin har safar shart emas, tabiiy ko'rinsin).`);
  }

  if (settings.faqRules && settings.faqRules.length) {
    const rulesText = settings.faqRules
      .filter(r => r && r.trigger && r.response)
      .map(r => `- Agar mijozning yozgani mana bunga o'xshasa: "${r.trigger}" → aynan shunday javob ber (mazmunini saqlab, kerak bo'lsa tabiiylashtirib): "${r.response}"`)
      .join('\n');
    if (rulesText) parts.push(`ADMIN BELGILAGAN TAYYOR JAVOBLAR (bularga ANIQ rioya qil, ustunlik shularda):\n${rulesText}`);
  }

  if (settings.generalInstructions && settings.generalInstructions.trim()) {
    parts.push(`ADMINNING QO'SHIMCHA KO'RSATMALARI (albatta rioya qil):\n${settings.generalInstructions.trim()}`);
  }

  return parts.join('\n\n');
}

async function execSearch(input) {
  const snap = await db.collection('numbers').get();
  let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (input.suffix) {
    const s = String(input.suffix).replace(/\D/g, '');
    if (s) items = items.filter(it => (it.number || '').replace(/\D/g, '').endsWith(s));
  }
  if (input.contains) {
    const c = String(input.contains).replace(/\D/g, '');
    if (c) items = items.filter(it => (it.number || '').replace(/\D/g, '').includes(c));
  }
  if (input.operator) items = items.filter(it => it.operator === input.operator);
  if (input.tag) items = items.filter(it => it.tag === input.tag);
  if (typeof input.maxPrice === 'number') items = items.filter(it => (it.price || 0) <= input.maxPrice);
  items = items.filter(it => !it.reserved);

  const total = items.length;
  const limit = Math.min(input.limit || 5, 10);
  const shown = items.slice(0, limit).map(it => ({ number: it.number, operator: it.operator, price: it.price, tag: it.tag }));
  return { total, items: shown };
}

async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

async function execForwardLead(input, sourceInfo) {
  const text = `📸 Instagram'dan yangi qiziqish!\n\n${sourceInfo}\n\n📝 ${input.summary || ''}`;
  await notifyTelegram(text);
  return { forwarded: true };
}

async function callClaude(systemPrompt, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      tools: TOOLS,
      messages
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Claude API xatosi');
  return data;
}

// Kiruvchi matnga AI javobini generatsiya qiladi (tool-loop bilan).
async function generateReply(userText, sourceInfo, channel, settings, cheapestPrice) {
  const systemPrompt = buildSystemPrompt(channel, settings, cheapestPrice);
  let messages = [{ role: 'user', content: userText }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await callClaude(systemPrompt, messages);
    const content = data.content || [];
    messages = [...messages, { role: 'assistant', content }];

    const toolUse = content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      return content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    }

    let toolResult;
    try {
      if (toolUse.name === 'search_numbers') toolResult = await execSearch(toolUse.input || {});
      else if (toolUse.name === 'forward_lead_to_admin') toolResult = await execForwardLead(toolUse.input || {}, sourceInfo);
      else toolResult = { error: "Noma'lum vosita" };
    } catch (err) {
      toolResult = { error: err.message };
    }

    messages = [...messages, {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
    }];
  }
  return `Tez orada javob beramiz 🙏 Iltimos, Telegram kanalimizga o'ting: ${settings.telegramChannelLink}`;
}

// Bir xil hodisani ikki marta qayta ishlamaslik uchun — Meta webhooklarni
// ba'zan qayta yuborishi mumkin (retry). Firestore'da event ID saqlaymiz.
async function alreadyProcessed(eventId) {
  if (!eventId) return false;
  const ref = db.collection('ig_processed_events').doc(String(eventId));
  const doc = await ref.get();
  if (doc.exists) return true;
  await ref.set({ at: Date.now() });
  return false;
}

async function replyToComment(commentId, text) {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  await fetch(`https://graph.instagram.com/${IG_GRAPH_VERSION}/${commentId}/replies?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text })
  });
}

async function sendDirectMessage(recipientId, text) {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  await fetch(`https://graph.instagram.com/${IG_GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text } })
  });
}

function verifySignature(rawBody, signatureHeader) {
  if (!process.env.IG_APP_SECRET || !signatureHeader) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.IG_APP_SECRET).update(rawBody, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch (e) {
    return false;
  }
}

exports.handler = async function (event) {
  // --- 1) Meta webhook tasdiqlash (GET) ---
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.IG_VERIFY_TOKEN) {
      return { statusCode: 200, body: q['hub.challenge'] || '' };
    }
    return { statusCode: 403, body: 'Verification failed' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // --- 2) Imzoni tekshirish (faqat haqiqatan Meta'dan kelgan so'rovlarni qabul qilamiz) ---
  const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'];
  if (!verifySignature(event.body || '', signature)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  try {
    const control = await getBotControl(db);
    if(!control.botEnabled || !control.autoReplyEnabled){
      // Bot to'xtatilgan yoki avtobot o'chirilgan — hech kimga javob bermaymiz
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
    }

    const payload = JSON.parse(event.body || '{}');
    const settings = await loadBotSettings();
    const cheapestPrice = await getCheapestPrice();

    for (const entry of payload.entry || []) {
      // --- Kommentariyalar ---
      for (const change of entry.changes || []) {
        if (change.field !== 'comments') continue;
        const c = change.value || {};
        if (!c.id || !c.text) continue;
        if (await alreadyProcessed('comment_' + c.id)) continue;
        // O'z akkauntimizning javoblariga o'zimiz javob qaytarmasligimiz kerak
        if (c.from && entry.id && c.from.id === entry.id) continue;

        const reply = await generateReply(
          c.text,
          `Kommentariya (@${(c.from && c.from.username) || "noma'lum"}): "${c.text}"`,
          'comment', settings, cheapestPrice
        );
        if (reply) await replyToComment(c.id, reply);
      }

      // --- Direct xabarlar ---
      for (const m of entry.messaging || []) {
        if (!m.message || m.message.is_echo) continue; // is_echo = o'zimiz yuborgan xabar
        const senderId = m.sender && m.sender.id;
        const text = m.message.text;
        if (!senderId || !text) continue;
        const eventId = 'dm_' + (m.message.mid || (senderId + '_' + m.timestamp));
        if (await alreadyProcessed(eventId)) continue;

        // Bu foydalanuvchi bizga BIRINCHI MARTA yozayaptimi va admin "yangi
        // mijozlarga avto javob"ni o'chirib qo'yganmi — shunda bot javob
        // yozmaydi, faqat ID'sini adminga ro'yxat qilib yuboradi.
        const isFirstTime = await checkAndMarkKnown(db, 'known_customers_instagram', senderId);
        if (isFirstTime && !control.newUserAutoReplyEnabled) {
          await updateAdminList(db, 'new_customers', "🆕 Yangi mijozlar (birinchi marta yozgan, o'zingiz javob berishingiz kerak):", senderId, `Instagram ID:${senderId}`);
          continue;
        }

        const reply = await generateReply(
          text,
          `Direct xabar (foydalanuvchi ID: ${senderId}): "${text}"`,
          'dm', settings, cheapestPrice
        );
        if (reply) await sendDirectMessage(senderId, reply);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('INSTAGRAM-WEBHOOK XATOSI:', err);
    // Meta xato holatida qayta-qayta urinaveradi — 200 qaytarib, xatoni faqat logga yozamiz
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
