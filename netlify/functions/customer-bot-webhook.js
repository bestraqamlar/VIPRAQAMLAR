// MIJOZ UCHUN TELEGRAM BOT — sayt bilan bir xil ma'lumotlardan foydalanadi
// ---------------------------------------------------------------------------
// Kerakli Environment variables (Netlify):
//   CUSTOMER_BOT_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

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

/* ---------------- Asosiy handler ---------------- */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  try{

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

  await send(chatId, "Asosiy menyudan foydalaning:", mainMenuKeyboard());
  return { statusCode: 200, body: 'ok' };

  }catch(err){
    console.error('BOT XATOSI:', err);
    return { statusCode: 200, body: 'ok' };
  }
};
