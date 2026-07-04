// MIJOZ UCHUN TELEGRAM BOT — sayt bilan bir xil ma'lumotlardan foydalanadi
// ---------------------------------------------------------------------------
// Kerakli Environment variables (Netlify):
//   CUSTOMER_BOT_TOKEN   — shu bot uchun YANGI token (@BotFather orqali)
//   TELEGRAM_BOT_TOKEN   — admin bildirishnoma boti (avvaldan bor)
//   TELEGRAM_CHAT_ID     — sizning chat_id (avvaldan bor)
//   FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY — (avvaldan bor)
//
// O'RNATISH: brauzerda oching (bir marta):
//   https://api.telegram.org/bot<CUSTOMER_BOT_TOKEN>/setWebhook?url=https://SAYTINGIZ.netlify.app/.netlify/functions/customer-bot-webhook

const crypto = require('crypto');

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

/* ---------------- Firestore (REST API, xizmat hisobi orqali) ---------------- */

async function getGoogleAccessToken(){
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: process.env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claimSet)}`;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
  const jwt = `${unsigned}.${signature}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if(!data.access_token) throw new Error('Google token olinmadi: ' + JSON.stringify(data));
  return data.access_token;
}

function baseUrl(){
  return `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
}

function fv(fields, name, fallback){
  if(!fields || !fields[name]) return fallback;
  const f = fields[name];
  if('stringValue' in f) return f.stringValue;
  if('integerValue' in f) return Number(f.integerValue);
  if('doubleValue' in f) return f.doubleValue;
  if('booleanValue' in f) return f.booleanValue;
  return fallback;
}

async function getDoc(token, path){
  const res = await fetch(`${baseUrl()}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if(!res.ok) return null;
  return res.json();
}

async function runQuery(token, collectionId, whereField, whereValue, limit){
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: whereField },
          op: 'EQUAL',
          value: typeof whereValue === 'boolean' ? { booleanValue: whereValue } : { stringValue: whereValue }
        }
      },
      limit: limit || 300
    }
  };
  const res = await fetch(`${baseUrl()}:runQuery`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const rows = await res.json();
  return (rows || [])
    .filter(r => r.document)
    .map(r => {
      const id = r.document.name.split('/').pop();
      const f = r.document.fields || {};
      return {
        id,
        number: fv(f, 'number', ''),
        operator: fv(f, 'operator', ''),
        price: fv(f, 'price', 0),
        oldPrice: fv(f, 'oldPrice', 0),
        tag: fv(f, 'tag', 'oddiy'),
        installment: fv(f, 'installment', false),
        featured: fv(f, 'featured', false),
        onSale: fv(f, 'onSale', false),
        reserved: fv(f, 'reserved', false)
      };
    });
}

async function createDoc(token, collectionId, fields){
  const res = await fetch(`${baseUrl()}/${collectionId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const data = await res.json();
  return data.name ? data.name.split('/').pop() : null;
}

async function patchField(token, path, fieldName, value){
  const url = `${baseUrl()}/${path}?updateMask.fieldPaths=${fieldName}`;
  const fieldValue = typeof value === 'boolean' ? { booleanValue: value }
    : typeof value === 'number' ? { integerValue: String(value) }
    : { stringValue: String(value) };
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { [fieldName]: fieldValue } })
  });
}

/* ---------------- Seans (har bir mijoz uchun holat) ---------------- */

async function getSession(token, chatId){
  const doc = await getDoc(token, `bot_sessions/${chatId}`);
  if(doc && doc.fields && doc.fields.data){
    try{ return JSON.parse(doc.fields.data.stringValue); }catch(e){}
  }
  return { step: 'menu' };
}
async function saveSession(token, chatId, session){
  const url = `${baseUrl()}/bot_sessions/${chatId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { data: { stringValue: JSON.stringify(session) } } })
  });
  if(!res.ok){
    console.error('Seans saqlanmadi:', await res.text());
  }
}

/* ---------------- Telegram yordamchi funksiyalari ---------------- */

async function tg(method, payload){
  const token = process.env.CUSTOMER_BOT_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
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
async function showNumberList(chatId, session, token, items, emptyText){
  if(items.length === 0){
    await send(chatId, emptyText, backKeyboard());
    return;
  }
  session.candidates = {};
  items.slice(0, 8).forEach(item => { session.candidates[displayNumber(item.number)] = item.id; });
  await saveSession(token, chatId, session);

  const rows = items.slice(0, 8).map(item => [displayNumber(item.number)]);
  rows.push([BTN.BACK]);
  await send(chatId, "Mos raqamlar topildi. Batafsil ko'rish uchun birini tanlang 👇", replyKb(rows));
}

async function showNumberDetail(chatId, token, item){
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
    : [[
        { text: '🛒 Buyurtma berish', callback_data: `buy|${item.id}` },
        { text: '❌ Bekor qilish', callback_data: 'cancelview' }
      ]];
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
🕐 Vaqti: ${payload.time}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[
          { text: "📞 Bog'lanildi", callback_data: `st|${orderId}|B` },
          { text: '✅ Yakunlandi', callback_data: `st|${orderId}|Y` },
          { text: '❌ Bekor qilindi', callback_data: `st|${orderId}|C` }
        ]]
      }
    })
  });
}

/* ---------------- Asosiy handler ---------------- */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const token = await getGoogleAccessToken();

  /* ---- Inline tugma bosilganda (raqam tafsiloti, buyurtma tasdiqlash) ---- */
  if(update.callback_query){
    const cq = update.callback_query;
    const chatId = cq.message.chat.id;
    const data = cq.data;
    let session = await getSession(token, chatId);

    if(data === 'backmenu' || data === 'cancelview'){
      session = { step: 'menu' };
      await saveSession(token, chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data.startsWith('buy|')){
      const numberId = data.split('|')[1];
      session = { step: 'awaiting_name', numberId };
      await saveSession(token, chatId, session);
      await tg('answerCallbackQuery', { callback_query_id: cq.id });
      await send(chatId, 'Ismingizni kiriting:', cancelKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data === 'confirmorder'){
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Yuborilmoqda...' });
      const numberDoc = await getDoc(token, `numbers/${session.numberId}`);
      const numberFields = numberDoc ? numberDoc.fields : {};
      const numberStr = displayNumber(fv(numberFields, 'number', ''));
      const price = fv(numberFields, 'price', 0);
      const time = new Date().toLocaleString('uz-UZ');

      const orderId = await createDoc(token, 'orders', {
        number: { stringValue: numberStr },
        price: { integerValue: String(price) },
        name: { stringValue: session.draftName || '' },
        region: { stringValue: session.draftRegion || '' },
        phone: { stringValue: session.draftPhone || '' },
        numberId: { stringValue: session.numberId },
        customerChatId: { stringValue: String(chatId) },
        status: { stringValue: 'Yangi' },
        createdAt: { stringValue: time },
        createdAtSort: { integerValue: String(Date.now()) }
      });

      if(session.numberId){ await patchField(token, `numbers/${session.numberId}`, 'reserved', true); }

      await notifyAdmin(orderId, {
        number: numberStr, name: session.draftName, phone: session.draftPhone,
        region: session.draftRegion, time
      });

      session = { step: 'menu' };
      await saveSession(token, chatId, session);
      await send(chatId, "✅ Buyurtmangiz qabul qilindi! Tez orada siz bilan bog'lanamiz.", mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(data === 'cancelorder'){
      session = { step: 'menu' };
      await saveSession(token, chatId, session);
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
  const text = (message.text || '').trim();
  let session = await getSession(token, chatId);

  if(text === '/start'){
    session = { step: 'menu' };
    await saveSession(token, chatId, session);
    await send(chatId,
      "Assalomu alaykum! VIP RAQAMLAR botiga xush kelibsiz 👋\n\nKerakli operatorni tanlang yoki quyidagi bo'limlardan foydalaning:",
      mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  if(text === BTN.BACK){
    session = { step: 'menu' };
    await saveSession(token, chatId, session);
    await send(chatId, 'Asosiy menyu:', mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }
  if(text === BTN.CANCEL){
    session = { step: 'menu' };
    await saveSession(token, chatId, session);
    await send(chatId, 'Bekor qilindi.', mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Asosiy menyu tugmalari ---- */
  if(session.step === 'menu' || !session.step){
    const operator = operatorFromButton(text);
    if(operator){
      session = { step: 'awaiting_digits', operator };
      await saveSession(token, chatId, session);
      await send(chatId, 'Sevimli raqamingizni kiriting.\nMisol: 0707', backKeyboard());
      return { statusCode: 200, body: 'ok' };
    }

    if(text === BTN.PREMIUM){
      const items = await runQuery(token, 'numbers', 'featured', true, 8);
      await showNumberList(chatId, session, token, items, "Hozircha premium raqamlar yo'q.");
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.SALE){
      const items = await runQuery(token, 'numbers', 'onSale', true, 8);
      await showNumberList(chatId, session, token, items, "Hozircha aksiyadagi raqamlar yo'q.");
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.CONTACT){
      await send(chatId, "📞 Biz bilan bog'lanish:\n\nTelegram: @Vip_raqamlar_admin\n\nSavollaringiz bo'lsa, xabar yozishingiz mumkin!", mainMenuKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    if(text === BTN.MYORDERS){
      const orders = await runQuery(token, 'orders', 'customerChatId', String(chatId), 20);
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

    await send(chatId, "Iltimos, menyudagi tugmalardan birini tanlang.", mainMenuKeyboard());
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Raqam qidirish: operator tanlangandan keyin raqam kutilmoqda ---- */
  if(session.step === 'awaiting_digits'){
    const digits = text.replace(/\D/g, '');
    if(!digits || digits.length > 4){
      await send(chatId, "Iltimos, 1 dan 4 tagacha raqam kiriting. Misol: 0707", backKeyboard());
      return { statusCode: 200, body: 'ok' };
    }
    const all = await runQuery(token, 'numbers', 'operator', session.operator, 500);
    const matches = all.filter(item => !item.reserved && localDigits(item.number).endsWith(digits));
    await showNumberList(chatId, session, token, matches,
      `"${digits}" bilan tugaydigan raqam topilmadi. Boshqa raqam kiriting.`);
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Ro'yxatdan bittasini tanlash (tugma matni = raqam) ---- */
  if(session.candidates && session.candidates[text]){
    const numberId = session.candidates[text];
    const numberDoc = await getDoc(token, `numbers/${numberId}`);
    if(numberDoc){
      const f = numberDoc.fields || {};
      const item = {
        id: numberId, number: fv(f,'number',''), operator: fv(f,'operator',''),
        price: fv(f,'price',0), oldPrice: fv(f,'oldPrice',0), tag: fv(f,'tag','oddiy'),
        installment: fv(f,'installment',false), reserved: fv(f,'reserved',false)
      };
      await showNumberDetail(chatId, token, item);
    }
    return { statusCode: 200, body: 'ok' };
  }

  /* ---- Buyurtma: ism ---- */
  if(session.step === 'awaiting_name'){
    session.draftName = text;
    session.step = 'awaiting_phone';
    await saveSession(token, chatId, session);
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
    session.draftPhone = phone;
    session.step = 'awaiting_region';
    await saveSession(token, chatId, session);
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
    await saveSession(token, chatId, session);

    const numberDoc = await getDoc(token, `numbers/${session.numberId}`);
    const numberStr = numberDoc ? displayNumber(fv(numberDoc.fields, 'number', '')) : '';
    const summary =
`Buyurtmangizni tasdiqlang:

📱 Raqam: ${numberStr}
👤 Ism: ${session.draftName}
☎️ Telefon: ${session.draftPhone}
📍 Viloyat: ${session.draftRegion}`;

    await tg('sendMessage', {
      chat_id: chatId, text: summary,
      reply_markup: inlineKb([[
        { text: '✅ Tasdiqlash', callback_data: 'confirmorder' },
        { text: '❌ Bekor qilish', callback_data: 'cancelorder' }
      ]])
    });
    return { statusCode: 200, body: 'ok' };
  }

  await send(chatId, "Asosiy menyudan foydalaning:", mainMenuKeyboard());
  return { statusCode: 200, body: 'ok' };
};
