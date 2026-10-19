// "BAZA RAQAM" KUZATUVI — har daqiqada ishga tushadi (netlify.toml),
// muddati kelgan har bir kuzatuvni tegishli operatorda qidiradi, topilsa
// admin'ga Telegram orqali (faqat TELEGRAM_CHAT_ID'ga — hech kim boshqa
// ko'rmaydi) darhol xabar beradi.
//
// Fayl nomi "-background" bilan tugashi MUHIM: Netlify'da bu funksiyani
// "Background Function" qiladi (oddiy funksiya ~10 soniyada to'xtaydi,
// background esa bir necha daqiqagacha ishlay oladi).
//
// OPTIMALLASHTIRISH (bu versiyada): avval har bir kuzatuv (watch) UCHUN
// ALOHIDA operator so'rovi (login+qidiruv) yuborilardi — agar bitta
// operatorda (masalan Humans) o'nlab kuzatuv bo'lsa, shuncha marta
// alohida so'rov ketardi. Bu esa (operator login/sessiya sekinligi va
// navbat to'planishi tufayli) ba'zi kuzatuvlar haqiqiy paydo bo'lish
// vaqtidan SOATLAB kech tekshirilishiga olib kelardi (masalan: Humans'da
// soat 10:00 da chiqqan raqam haqida xabar 13:00 atrofida kelgan holat).
//
// Endi: muddati kelgan kuzatuvlar operator bo'yicha GURUHLANADI. Operator
// API'si buni qo'llab-quvvatlasa (Beeline, Humans, Mobiuz, Perfektum),
// HAR BIR OPERATOR uchun BOR-YO'G'I BITTA, KENG (hamma katakcha bo'sh —
// operatorda hozir mavjud bo'lgan BARCHA raqamlarni so'ragan) so'rov
// yuboriladi — operatordan bir yurishda 200 tagacha (Beeline uchun 100 —
// operator API'sining o'zi bundan ko'pini qabul qilmaydi, 400 xato
// qaytaradi) natija olinadi. Shu BITTA natija ro'yxati keyin xotirada
// (tarmoqqa chiqmasdan, darhol) o'sha operatordagi HAR BIR kuzatuvning
// naqshiga (boxes) alohida-alohida solishtiriladi.
//
// ISTISNO — UCELL: uning qidiruv API'si "hammasini ber" so'rovini
// qo'llab-quvvatlamaydi (bo'sh so'rov yuborilsa butun bazani qaytarib
// yuborishi mumkin, shu sabab lib/operators.js buni ATAYLAB rad etadi —
// qarang: searchUcell). Shu sabab Ucell kuzatuvlari eski usulda — HAR
// BIRI O'Z naqshi bilan, alohida so'rov orqali — tekshiriladi.
//
// Natijada: 50 ta kuzatuvning aksariyati (Beeline/Humans/Mobiuz/
// Perfektum) atigi 4 tagacha (operatorlar soni) haqiqiy tarmoq so'rovi
// bilan, deyarli HAR DAQIQA (cron intervali) chinakam tekshiriladi.
//
// MUHIM: natija ENDI hech qanday operator-kod (masalan "faqat 87/88/97
// Mobiuz uchun") bo'yicha FILTRLANMAYDI — operatorlar vaqti-vaqti bilan
// yangi kod olishi mumkin, shu sabab bunday "ma'lum kodlar" ro'yxati
// kelajakda haqiqiy yangi raqamlarni noto'g'ri chetlab qo'yishi mumkin
// edi. Operator nima qaytarsa, o'shani ishonib qabul qilamiz.

const admin = require('firebase-admin');
const { searchAll, matchesBoxes } = require('./lib/operators');

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
const FINALIZE_CONCURRENCY = 6;    // Firestore yozish/Telegram xabar bosqichi uchun
const UCELL_CONCURRENCY = 4;       // Ucell uchun (eski, har-kuzatuv-alohida yo'l)
const MAX_RUN_MS = 12 * 60 * 1000; // bitta yurish shu vaqtdan oshsa, qolganini keyingi yurishga qoldiradi

// "Hammasini ber" so'rovini qo'llab-quvvatlamaydigan operatorlar — bular
// uchun har bir kuzatuv o'z naqshi bilan alohida so'raladi.
const NO_WILDCARD_OPERATORS = new Set(['Ucell']);

// Operatorning o'zidan BIR SO'ROVDA so'ralishi mumkin bo'lgan eng ko'p
// natija soni. Beeline'ning o'ziga xos, qattiq 100 chegarasi bor (undan
// oshsa 400 xato qaytaradi — bu avval bir marta boshimizga muammo bo'lib
// kelgan, qarang: api-live-search.js izohi) — u HAQIQIY GET so'rov
// parametriga (?limit=) ketadi, shu sabab qat'iy 100'da qoldirilishi
// SHART. Lekin Beeline'da 7 ta ombor (warehouse) bor va hammasi PARALLEL
// so'raladi — demak Beeline'dan jami 700 tagacha natija kelishi mumkin.
//
// Humans va Mobiuz'ning API'siga esa BIZNING limit'imiz umuman
// yuborilmaydi (ular o'zlari qancha natija bersa, o'shani qaytaradi) —
// bizning kodimizdagi "limit" faqat OLINGAN natijani KEYIN qanchasini
// SAQLAB QOLISHNI belgilaydi. Shu sabab bu ikkalasi uchun juda katta
// (amalda "kesilmasin" degani) qiymat qo'yiladi — mijoz "200 va undan
// ko'p birdaniga chiqsin" desa, operator o'zi qancha bersa, o'shanchasi
// TO'LIQ saqlanadi, sun'iy ravishda 200'da kesilib qolmaydi.
const BULK_LIMIT_DEFAULT = 2000;
const BULK_LIMIT_BY_OPERATOR = { Beeline: 100 };
const PER_WATCH_LIMIT = 300; // Ucell yo'li uchun (avval 20 edi) — bu ham faqat bizning saqlash chegaramiz

// Katakchalarning barchasi bo'sh — "operatorda hozir mavjud bo'lgan
// BARCHA raqamlarni ber" degani.
const WILDCARD_BOXES = ['', '', '', '', '', '', ''];

function formatNumber(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 12) return raw;
  return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,10)} ${digits.slice(10,12)}`;
}

// "Sozlamalar" bo'limida qo'shilgan qo'shimcha Telegram ID'lar (qarang:
// admin-number-watch.js -> listNotifyIds/addNotifyId) — asosiy botdan
// TASHQARI, shu ID'larning HAR BIRIGA ham xabar yuboriladi. Bir nechta
// admin/bot qo'shilsa, hammasi bir vaqtda xabardor bo'ladi.
const NOTIFY_COLLECTION = 'watch_notify_recipients';

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) { /* xabar yubormasa ham, tekshiruv davom etadi */ }
}

async function notifyAdmin(text) {
  // Alohida "kuzatuv" boti — asosiy admin botidan AJRATILGAN, shu bilan
  // bu xabarlar boshqa xabarlar orasida yo'qolib qolmaydi. Agar
  // WATCH_BOT_TOKEN/WATCH_CHAT_ID hali sozlanmagan bo'lsa, asosiy admin
  // botiga (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) tushib qoladi — shu bilan
  // sozlash tugallanmagan bo'lsa ham xabar butunlay yo'qolib ketmaydi.
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) await sendTelegramMessage(token, chatId, text);

  // Qo'shimcha, Sozlamalardan qo'shilgan ID'lar — xuddi shu bot tokeni
  // bilan, lekin HAR BIR ID'ga alohida xabar sifatida.
  if (!token) return;
  try {
    const snap = await db.collection(NOTIFY_COLLECTION).get();
    await Promise.all(snap.docs.map(d => {
      const extraChatId = d.data().chatId;
      if (!extraChatId) return null;
      return sendTelegramMessage(token, extraChatId, text);
    }));
  } catch (e) { /* qo'shimcha ro'yxat o'qilmasa ham, asosiy xabar allaqachon ketgan */ }
}

async function loadOperatorConfig() {
  try {
    const doc = await db.collection('operator_config').doc('main').get();
    return (doc.exists && doc.data()) || {};
  } catch (e) { return {}; }
}

// Bitta operator uchun BITTA, keng so'rov — shu operatordagi hozir
// mavjud bo'lgan (limit tagacha) barcha raqamlarni qaytaradi. Xato
// bo'lsa (operator vaqtincha ishlamasa) bo'sh ro'yxat qaytadi — shu
// operatordagi kuzatuvlar shu safar "natija yo'q" deb hisoblanadi,
// lekin navbatdagi tekshiruvlari (nextCheckAt, pastda) baribir oldinga
// suriladi, ya'ni "abadiy qotib qolish" yo'q.
async function fetchOperatorPool(operatorName, config) {
  const limit = BULK_LIMIT_BY_OPERATOR[operatorName] || BULK_LIMIT_DEFAULT;
  try {
    const out = await searchAll(WILDCARD_BOXES, config, { operator: operatorName, limit, deadline: 10000 });
    return out.items || [];
  } catch (e) {
    return [];
  }
}

// Kuzatuv hujjatini (topilgan raqamlar ro'yxati asosida) yakunlaydi:
// kerak bo'lsa Telegram xabar yuboradi va Firestore'ni yangilaydi.
async function finalizeWatch(doc, items) {
  const watch = doc.data();
  const ref = doc.ref;
  const now = Date.now();

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
      const priceText = item.price ? `${Number(item.price).toLocaleString('ru-RU')} so'm` : "narxi ko'rsatilmagan";
      await notifyAdmin(
        `🟢 Sotuvga qo'yildi\n\n` +
        `📱 ${formatNumber(item.number)} - ${priceText}\n` +
        `📶 ${watch.operator}`
      );
      keptNotified[item.number] = now;
    }
  }

  update.notifiedNumbers = keptNotified;

  await ref.update(update);
}

// --- Operator "hammasini ber"ni qo'llab-quvvatlaydigan yo'l: bitta keng
//     pool, keyin har bir kuzatuv shu pooldan mahalliy filtrlanadi. ---
async function finalizePooled(docsWithPool) {
  let idx = 0;
  async function worker() {
    while (idx < docsWithPool.length) {
      const { doc, poolItems } = docsWithPool[idx++];
      const items = poolItems.filter(it => matchesBoxes(it.number, doc.data().boxes));
      await finalizeWatch(doc, items);
      if (Date.now() - START_TIME > MAX_RUN_MS) return;
    }
  }
  const workers = Array(Math.min(FINALIZE_CONCURRENCY, docsWithPool.length)).fill(0).map(worker);
  await Promise.all(workers);
}

// --- Ucell yo'li: har bir kuzatuv o'z naqshi bilan ALOHIDA so'raladi
//     (operator API'si "hammasini ber"ni qo'llamaydi). ---
async function finalizePerWatch(docs, config) {
  let idx = 0;
  async function worker() {
    while (idx < docs.length) {
      const doc = docs[idx++];
      const watch = doc.data();
      let items = [];
      try {
        const out = await searchAll(watch.boxes, config, { operator: watch.operator, limit: PER_WATCH_LIMIT, deadline: 8000 });
        items = out.items || [];
      } catch (e) { /* bitta kuzatuv ishlamasa ham, qolganlari davom etadi */ }
      await finalizeWatch(doc, items);
      if (Date.now() - START_TIME > MAX_RUN_MS) return;
    }
  }
  const workers = Array(Math.min(UCELL_CONCURRENCY, docs.length)).fill(0).map(worker);
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

    const pooledDue = due.filter(d => !NO_WILDCARD_OPERATORS.has(d.data().operator));
    const perWatchDue = due.filter(d => NO_WILDCARD_OPERATORS.has(d.data().operator));

    // "Hammasini ber"ga mos operatorlarni guruhlab, har biridan BITTA
    // keng so'rov — PARALLEL.
    const byOperator = {};
    for (const doc of pooledDue) {
      const op = doc.data().operator;
      if (!byOperator[op]) byOperator[op] = [];
      byOperator[op].push(doc);
    }
    const operatorNames = Object.keys(byOperator);
    const pools = await Promise.all(
      operatorNames.map(async (op) => ({ op, items: await fetchOperatorPool(op, config) }))
    );
    const poolByOperator = {};
    pools.forEach(p => { poolByOperator[p.op] = p.items; });

    const docsWithPool = pooledDue.map(doc => ({ doc, poolItems: poolByOperator[doc.data().operator] || [] }));

    await Promise.all([
      finalizePooled(docsWithPool),
      finalizePerWatch(perWatchDue, config)
    ]);

    return {
      statusCode: 200,
      body: `ok: ${due.length} ta kuzatuv (${pooledDue.length} pool orqali / ${operatorNames.length} operator, ${perWatchDue.length} Ucell alohida), jami ${snap.size} ta faol`
    };
  } catch (err) {
    console.error('NUMBER-WATCH-CHECK XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
