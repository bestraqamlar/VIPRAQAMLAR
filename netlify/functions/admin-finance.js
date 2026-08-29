// "KIRIM-CHIQIM" — admin panelidan shaxsiy daromad/xarajat yozib borish,
// avval faqat Telegram bot (personal-bot-webhook.js) orqali qilingan bu
// ishni endi admin saytidan ham qilish mumkin.
//
// MUHIM: ikkalasi (bot va admin panel) BIR XIL Firestore kolleksiyasiga
// ('personal_bot_tx') yozadi — shu sabab statistikalar, haftalik/oylik
// hisobotlar (personal-bot-weekly-report.js, personal-bot-monthly-report.js
// va h.k.) admin paneldan qo'shilgan yozuvlarni ham avtomatik hisobga oladi,
// alohida "ikkinchi baza" paydo bo'lmaydi.
//
// XAVFSIZLIK: bu kolleksiya (personal_bot_tx) firestore.rules'da UMUMAN
// ro'yxatga OLINMAGAN — brauzerdan (Client SDK orqali) hech kim to'g'ridan-
// to'g'ri kira olmaydi. Yagona yo'l — shu funksiya, u esa har bir so'rovda
// requireAdmin(event, { feature: 'finance' }) orqali HAQIQIY admin custom
// claim'ini va shu bo'limga ruxsatini tekshiradi. Bu — shaxsiy moliyaviy
// ma'lumot (daromad/xarajat summalari), shuning uchun "Boshqaruv"da alohida
// ruxsat sifatida ('finance') beriladi — standart (eski) adminlarga ham,
// yangi cheklangan sub-adminlarga ham faqat ANIQ ruxsat berilsa ko'rinadi.
//
// IZOLYATSIYA (har bir admin FAQAT o'zi kiritgan yozuvlarni ko'radi):
// Har bir yozuv `addedByUid` (kim qo'shgani) bilan saqlanadi. Har bir
// admin standart holatda FAQAT o'zining `addedByUid`siga mos yozuvlarini
// ko'radi — boshqa hech qanday adminning (shu jumladan bosh adminning ham)
// daromad/xarajatini emas. Bundan yagona istisno: eski, Telegram bot
// orqali (admin panel yaratilishidan OLDIN) kiritilgan yozuvlarda
// `addedByUid` maydoni umuman yo'q — bular FAQAT bosh (super) adminning
// o'z (standart, hech qanday `viewUid` so'ralmagan) ko'rinishida ko'rinadi,
// chunki bot yagona egasi (bosh admin) uchun ishlagan.
//
// Bosh admin "Boshqaruv" orqali biror sub-adminning profiliga kirib,
// `viewUid` parametri bilan ANIQ o'sha kishining yozuvlarini ko'rishi
// mumkin — bu FAQAT superAdmin uchun ochiq, boshqa hech kim (hatto
// o'zganing so'rovida ko'rsatilgan uid orqali ham) bunga erisha olmaydi.

const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');

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

const TX_COLLECTION = 'personal_bot_tx';
const MAX_AMOUNT = 10_000_000_000; // 10 mlrd so'm — aqlga to'g'ri kelmaydigan xato kiritishlardan himoya

function monthRange(date) {
  const d = date || new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return { start, end };
}

function validateAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "Summa noto'g'ri";
  if (n > MAX_AMOUNT) return 'Summa juda katta';
  return null;
}

function sanitizeCategory(category) {
  const c = String(category || '').trim();
  if (!c || c.length > 40) return null;
  return c;
}

// Kredit shartnomalarini "Jarayonda" hisoblashda izolyatsiya qilish uchun.
// Diqqat: bu yerda eski (addedByUid'siz) shartnomalar HECH KIMGA (hatto
// bosh adminning ANIQ bir sub-adminni ko'rish rejimida ham) qo'shilmaydi —
// ular faqat bosh adminning o'z standart (hech kim ko'rsatilmagan)
// ko'rinishida, alohida (yuqorida, to'g'ridan-to'g'ri) hisoblanadi.
function filterCreditContracts(docs, targetUid) {
  return docs.filter(d => d.data().addedByUid === targetUid);
}

async function getSummary(decoded, body) {
  const { start, end } = monthRange();
  const isSuper = decoded.superAdmin === true;
  const callerUid = decoded.uid;

  // "viewUid" — bosh admin "Boshqaruv"dan biror sub-adminning profiliga
  // kirib, ANIQ o'sha kishining yozuvlarini ko'rmoqchi bo'lganda yuboriladi.
  // XAVFSIZLIK: faqat superAdmin BUNI ishlata oladi — sub-admin so'rovida
  // viewUid bo'lsa ham, jim e'tiborsiz qoldiriladi (o'zining ma'lumotini
  // ko'radi, boshqa hech kimniki emas).
  const requestedViewUid = typeof body.viewUid === 'string' ? body.viewUid : null;
  const viewUid = (isSuper && requestedViewUid) ? requestedViewUid : null;
  const targetUid = viewUid || callerUid;
  // Eski (uid'siz) bot yozuvlari FAQAT bosh adminning o'z (standart,
  // hech qanday boshqa profil so'ralmagan) ko'rinishida qo'shiladi.
  const includeLegacy = isSuper && !viewUid;

  const txSnap = await db.collection(TX_COLLECTION)
    .where('ts', '>=', start).where('ts', '<', end)
    .orderBy('ts', 'desc')
    .get();

  const relevantDocs = txSnap.docs.filter(d => {
    const t = d.data();
    if (t.addedByUid === targetUid) return true;
    if (!t.addedByUid && includeLegacy) return true;
    return false;
  });

  let incomeThisMonth = 0;
  let expenseThisMonth = 0;
  relevantDocs.forEach(d => {
    const t = d.data();
    if (t.type === 'income') incomeThisMonth += Number(t.amount) || 0;
    else if (t.type === 'expense') expenseThisMonth += Number(t.amount) || 0;
  });

  // "Jarayonda" — Kredit bo'limidagi shartnomalardan, shu oy ichida
  // to'lanishi kutilayotgan (hali "to'landi" deb belgilanmagan) oylik
  // to'lovlar yig'indisi. AVVAL bu — BARCHA shartnomalardan hisoblanadigan
  // umumiy ko'rsatkich edi. ENDI Kredit bo'limi ham izolyatsiyalangani
  // sabab (qarang: admin-credit.js), bu yerda ham AYNAN O'SHA qoida
  // qo'llaniladi: oddiy admin FAQAT o'zi qo'shgan shartnomalaridan kelib
  // chiqadigan to'lovlarni ko'radi (yangi admin uchun — 0 dan boshlab),
  // bosh admin esa (o'z, standart ko'rinishida) HAMMASINI ko'radi.
  const creditSnap = await db.collection('credit_contracts').get();
  const relevantCreditDocs = (isSuper && !viewUid)
    ? creditSnap.docs
    : filterCreditContracts(creditSnap.docs, targetUid);
  let dueThisMonth = 0;
  relevantCreditDocs.forEach(d => {
    const c = d.data();
    if (!Array.isArray(c.payments)) return;
    c.payments.forEach(p => {
      if (p.status === 'pending' && p.dueDate >= start && p.dueDate < end) {
        dueThisMonth += Number(c.monthlyPayment) || 0;
      }
    });
  });

  const recentTx = relevantDocs.slice(0, 30).map(d => ({ id: d.id, ...d.data() }));

  return { incomeThisMonth, expenseThisMonth, dueThisMonth, recentTx, viewingUid: targetUid };
}

async function addTx(body, decoded) {
  const type = body.type === 'income' ? 'income' : (body.type === 'expense' ? 'expense' : null);
  if (!type) { const err = new Error("type 'income' yoki 'expense' bo'lishi kerak"); err.statusCode = 400; throw err; }

  const amountErr = validateAmount(body.amount);
  if (amountErr) { const err = new Error(amountErr); err.statusCode = 400; throw err; }

  const category = sanitizeCategory(body.category);
  if (!category) { const err = new Error('Kategoriya kiritilishi shart'); err.statusCode = 400; throw err; }

  const docRef = await db.collection(TX_COLLECTION).add({
    type,
    amount: Number(body.amount),
    category,
    ts: Date.now(),
    source: 'admin-panel',
    // Kim qo'shgani — shu bilan har bir admin FAQAT o'zi kiritganini
    // ko'radi (qarang: getSummary()). Bu qiymat mijoz tomonidan
    // YUBORILMAYDI — har doim tekshirilgan tokendan olinadi, shu sabab
    // birov o'zini boshqa admin nomidan yozuv qo'shgandek ko'rsata olmaydi.
    addedByUid: decoded.uid
  });

  return { id: docRef.id };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let decoded;
  try {
    decoded = await requireAdmin(event, { feature: 'finance' });
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  try {
    let result;
    switch (body.action) {
      case 'summary': result = await getSummary(decoded, body); break;
      case 'add': result = await addTx(body, decoded); break;
      default: {
        const err = new Error("Noma'lum amal");
        err.statusCode = 400;
        throw err;
      }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (err) {
    console.error('ADMIN-FINANCE XATOSI:', err);
    return { statusCode: err.statusCode || 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
