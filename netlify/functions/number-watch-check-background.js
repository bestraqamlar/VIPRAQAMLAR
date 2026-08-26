// "BAZA RAQAM" KUZATUVI — har daqiqada ishga tushadi (netlify.toml),
// muddati kelgan har bir kuzatuvni tegishli operatorda qidiradi, topilsa
// admin'ga Telegram orqali (faqat TELEGRAM_CHAT_ID'ga — hech kim boshqa
// ko'rmaydi) darhol xabar beradi.
//
// Fayl nomi "-background" bilan tugashi MUHIM: Netlify'da bu funksiyani
// "Background Function" qiladi (oddiy funksiya ~10 soniyada to'xtaydi,
// background esa bir necha daqiqagacha ishlay oladi) — chunki bir yurishda
// ONLARCHA/YUZLAB kuzatuvni, har birida haqiqiy operator API so'rovi bilan
// (1-6 soniya) tekshirish kerak bo'lishi mumkin.
//
// MASSHTAB HAQIDA ROSTGO'YLIK: agar admin juda ko'p raqamni (masalan
// yuzlab) 1 daqiqalik oraliqda kuzatishni tanlasa, HAMMASINI aynan bir
// daqiqa ichida ulgurib bo'lmasligi mumkin (operator API'lari sekin
// javob berishi mumkin). Bu funksiya har yurishda imkon qadar ko'pini
// qayta ishlaydi; ulgurmaganlari nextCheckAt o'zgarmagani uchun keyingi
// yurishda (bir daqiqadan keyin) DARHOL navbatga tushadi — demak eng
// yomon holatda ham kechikish bo'ladi, lekin hech qaysi kuzatuv
// "unutilib" qolmaydi.

const admin = require('firebase-admin');
const { searchAll } = require('./lib/operators');

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

const COLLECTION = 'number_watches';
// Har bir ANIQ topilgan raqam (masalan +998901234567) uchun: xabar berilgach,
// shu XUDDI SHU raqam qayta 12 soat ichida qayta xabar qilinmaydi — lekin
// naqshga mos boshqa (yangi) raqam chiqsa, kutmasdan darhol xabar beriladi.
// Qidiruv esa bu vaqt ichida ham to'xtamasdan, belgilangan intervalda davom etadi.
const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const CONCURRENCY = 4;             // bir vaqtda nechta operator so'rovi parallel yuborilsin
const MAX_RUN_MS = 12 * 60 * 1000; // bitta yurish shu vaqtdan oshsa, qolganini keyingi yurishga qoldiradi

function formatNumber(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 12) return raw;
  return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,10)} ${digits.slice(10,12)}`;
}

async function notifyAdmin(text) {
  // Alohida "kuzatuv" boti — asosiy admin botidan AJRATILGAN, shu bilan
  // bu xabarlar boshqa xabarlar orasida yo'qolib qolmaydi. Agar
  // WATCH_BOT_TOKEN/WATCH_CHAT_ID hali sozlanmagan bo'lsa, asosiy admin
  // botiga (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) tushib qoladi — shu bilan
  // sozlash tugallanmagan bo'lsa ham xabar butunlay yo'qolib ketmaydi.
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) { /* xabar yubormasa ham, tekshiruv davom etadi */ }
}

async function loadOperatorConfig() {
  try {
    const doc = await db.collection('operator_config').doc('main').get();
    return (doc.exists && doc.data()) || {};
  } catch (e) { return {}; }
}

async function processWatch(doc, config) {
  const watch = doc.data();
  const ref = doc.ref;
  const now = Date.now();

  let items = [];
  try {
    // limit oshirildi: bitta naqsh (masalan "___0000") bazada bir nechta
    // turli raqamga mos kelishi mumkin — hammasini ko'rib, ulardan qaysi
    // biri YANGI (hali 12 soat ichida xabar qilinmagan) ekanini aniqlaymiz.
    const out = await searchAll(watch.boxes, config, { operator: watch.operator, limit: 20, deadline: 8000 });
    items = out.items || [];
  } catch (e) {
    // Bitta operator vaqtincha ishlamasa ham, boshqa kuzatuvlar davom etadi —
    // faqat shu kuzatuvning navbatdagi tekshiruvi rejalashtiriladi.
  }

  const update = {
    lastCheckedAt: admin.firestore.Timestamp.now(),
    nextCheckAt: admin.firestore.Timestamp.fromMillis(now + watch.intervalMinutes * 60000),
    checkCount: (watch.checkCount || 0) + 1
  };

  // Avval xabar qilingan raqamlar ro'yxatidan muddati (12 soat) o'tganlarini
  // tozalab boramiz — shunda ular yana "yangidek" xabar qilinishi mumkin
  // bo'ladi, va hujjat vaqt o'tishi bilan cheksiz kattalashib ketmaydi.
  const prevNotified = watch.notifiedNumbers || {};
  const keptNotified = {};
  for (const num in prevNotified) {
    const ts = prevNotified[num];
    if (typeof ts === 'number' && (now - ts) < NOTIFY_COOLDOWN_MS) keptNotified[num] = ts;
  }

  if (items.length > 0) {
    update.lastFoundAt = admin.firestore.Timestamp.now();
    update.lastFoundNumbers = items.slice(0, 5).map(x => x.number);

    // Faqat hali "sovish" muddati tugamagan ro'yxatda YO'Q raqamlarga xabar
    // yuboramiz — xuddi shu raqam qayta-qayta tashlanmaydi, lekin naqshga
    // mos boshqa (hali xabar qilinmagan) raqam chiqsa, darhol xabar ketadi.
    const freshItems = items.filter(it => !keptNotified[it.number]);
    for (const item of freshItems) {
      const priceLine = item.price ? `\n💰 Narx: ${Number(item.price).toLocaleString('ru-RU')} so'm` : '';
      await notifyAdmin(
        `🎯 ${formatNumber(item.number)} - raqami sotuvga chiqdi!\n` +
        `📶 Operator: ${watch.operator}${priceLine}`
      );
      keptNotified[item.number] = now;
    }
  }

  update.notifiedNumbers = keptNotified;

  await ref.update(update);
}

async function runBatch(docs, config) {
  let idx = 0;
  async function worker() {
    while (idx < docs.length) {
      const doc = docs[idx++];
      await processWatch(doc, config);
      if (Date.now() - START_TIME > MAX_RUN_MS) return;
    }
  }
  const workers = Array(Math.min(CONCURRENCY, docs.length)).fill(0).map(worker);
  await Promise.all(workers);
}

let START_TIME = 0;

exports.handler = async function () {
  START_TIME = Date.now();
  try {
    const snap = await db.collection(COLLECTION).where('active', '==', true).get();
    if (snap.empty) return { statusCode: 200, body: 'ok: kuzatuv yoq' };

    const now = admin.firestore.Timestamp.now();
    const due = snap.docs.filter(d => {
      const nc = d.data().nextCheckAt;
      return !nc || nc.toMillis() <= now.toMillis();
    });
    if (due.length === 0) return { statusCode: 200, body: 'ok: hozircha muddati kelgani yoq' };

    const config = await loadOperatorConfig();
    await runBatch(due, config);

    return { statusCode: 200, body: `ok: ${due.length} ta kuzatuvdan tekshirildi (jami ${snap.size} ta faol)` };
  } catch (err) {
    console.error('NUMBER-WATCH-CHECK XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
