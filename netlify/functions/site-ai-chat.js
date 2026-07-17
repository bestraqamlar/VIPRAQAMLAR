// SAYTDAGI AI CHAT WIDGET — index.html'ning pastki o'ng burchagidagi
// suhbat oynasi shu funksiyaga ulanadi. Saytga kirgan har qanday mehmon
// (tizimga kirmasdan) foydalana oladi — shuning uchun FAQAT O'QIYDI
// (search_numbers) — hech qanday o'chirish/qo'shish/narx o'zgartirish
// vositasi YO'Q.
//
// Botning ohangi/qoidalari admin paneldagi "💬 Telegram AI" bo'limi bilan
// BIR XIL sozlamalardan (site_settings/telegram_bot) foydalanadi — shunda
// barcha kanallarda (sayt, Telegram, Instagram) izchil ovoz saqlanadi.
//
// Kerakli Environment variables (Netlify):
//   ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (lead xabarnomasi uchun)
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const admin = require('firebase-admin');
const { getBotControl } = require('./lib/botControl');

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
const MAX_REPLY_WORDS = 40; // saytda biroz batafsilroq javob berish mumkin (Telegram'dan farqli)
const OPERATORS = ['Beeline', 'Ucell', 'Mobiuz', 'Humans', 'Uzmobile', 'Perfektum'];

function capWords(text, maxWords = MAX_REPLY_WORDS){
  if(!text) return text;
  const words = text.trim().split(/\s+/);
  if(words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

function displayNumber(numberStr){ return (numberStr || '').replace(/-/g, ' '); }

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
        limit: { type: 'number', description: 'Standart 6, maksimal 12' }
      }
    }
  },
  {
    name: 'forward_lead_to_admin',
    description: "Mehmonning sotib olish niyatini yoki aloqa ma'lumotini adminning ICHKI Telegram botiga yuboradi.",
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary']
    }
  }
];

async function loadBotSettings(){
  try{
    const doc = await db.collection('site_settings').doc('telegram_bot').get();
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
  parts.push(`Sen "VIPRAQAMLAR AI" — VIPRAQAMLAR.UZ (O'zbekistondagi chiroyli/oltin/VIP telefon raqamlari do'koni) saytida ishlaydigan yordamchisan. Saytga kirgan mehmonlar bilan gaplashasan.`);
  parts.push(`QOIDALAR:
- Javoblaring qisqa va lo'nda bo'lsin (${MAX_REPLY_WORDS} so'zdan oshmasin), lekin foydali va aniq ma'lumot ber.
- Kamida bitta mos emoji ishlat, lekin bachkana bo'lmasin — did bilan tanlangan bo'lsin.
- Narxlarni faqat search_numbers natijasidan ol — hech qachon o'ylab topma.
- Mijoz aniq raqam so'rasa: search_numbers bilan tekshir, natijani aniq ayt.
- Agar qidiruvda hech narsa topilmasa, buni qat'iy "yo'q" deb aytma — "Operatorimiz tekshirib chiqadi" deb ayt va forward_lead_to_admin vositasini chaqir.
- Yetkazib berish so'ralsa: "${settings.deliveryInfo}"
- Mijoz sotib olishga qiziqish bildirsa yoki kontakt ma'lumot qoldirsa, forward_lead_to_admin vositasini chaqir.
- Saytdagi katalogdan qidirish yoki buyurtma berish tugmalaridan foydalanishni ham tabiiy joyda tavsiya qilib qo'y.`);

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
  const snap = await db.collection('numbers').get();
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if(input.suffix){ const s = String(input.suffix).replace(/\D/g,''); if(s) items = items.filter(it => (it.number||'').replace(/\D/g,'').endsWith(s)); }
  if(input.contains){ const c = String(input.contains).replace(/\D/g,''); if(c) items = items.filter(it => (it.number||'').replace(/\D/g,'').includes(c)); }
  if(input.operator) items = items.filter(it => it.operator === input.operator);
  if(input.tag) items = items.filter(it => it.tag === input.tag);
  if(typeof input.maxPrice === 'number') items = items.filter(it => (it.price||0) <= input.maxPrice);
  items = items.filter(it => !it.reserved);
  const total = items.length;
  const limit = Math.min(input.limit || 6, 12);
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
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 500, system: systemPrompt, tools: AI_TOOLS, messages })
  });
  const data = await res.json();
  if(!res.ok) throw new Error((data && data.error && data.error.message) || 'Claude API xatosi');
  return data;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'AI hozircha mavjud emas.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let messages = Array.isArray(body.messages) ? body.messages.slice(-20) : []; // suhbat juda uzun bo'lib ketmasligi uchun oxirgi 20 tasi
    if (body.userMessage) {
      if (String(body.userMessage).length > 800) {
        return { statusCode: 200, body: JSON.stringify({ reply: "Xabaringiz biroz uzun ekan — qisqaroq yozib ko'rsangiz?", messages }) };
      }
      messages = [...messages, { role: 'user', content: body.userMessage }];
    }

    const control = await getBotControl(db);
    if(!control.botEnabled || !control.autoReplyEnabled){
      return { statusCode: 200, body: JSON.stringify({ reply: "Hozircha operatorlarimiz band. Telegram botimiz orqali yozib qoldiring, tez orada javob beramiz 🙏", messages }) };
    }

    const settings = await loadBotSettings();
    const systemPrompt = buildSystemPrompt(settings);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callClaude(systemPrompt, messages);
      const content = data.content || [];
      messages = [...messages, { role: 'assistant', content }];

      const toolUse = content.find(b => b.type === 'tool_use');
      if (!toolUse) {
        const reply = content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        return { statusCode: 200, body: JSON.stringify({ reply: capWords(reply), messages }) };
      }

      let toolResult;
      try {
        if (toolUse.name === 'search_numbers') toolResult = await execSearch(toolUse.input || {});
        else if (toolUse.name === 'forward_lead_to_admin') {
          await notifyAdminLead(`🌐 Saytdagi AI chat orqali yangi qiziqish!\n\n📝 ${(toolUse.input || {}).summary || ''}`);
          toolResult = { forwarded: true };
        } else toolResult = { error: "Noma'lum vosita" };
      } catch (err) {
        toolResult = { error: err.message };
      }

      messages = [...messages, { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }] }];
    }

    return { statusCode: 200, body: JSON.stringify({ reply: "Aniqroq savol bersangiz yordam beraman 🙂", messages }) };
  } catch (err) {
    console.error('SITE-AI-CHAT XATOSI:', err);
    return { statusCode: 200, body: JSON.stringify({ reply: "Kechirasiz, hozircha javob bera olmadim. Iltimos, birozdan so'ng qayta urinib ko'ring.", messages: [] }) };
  }
};
