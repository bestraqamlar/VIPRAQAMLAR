// "KREDIT" — kredit shartnomalarini yaratish/ko'rish/tahrirlash.
//
// XAVFSIZLIK / IZOLYATSIYA: avval bu bo'lim admin panelidan TO'G'RIDAN-
// TO'G'RI (Client SDK orqali) Firestore'ga kirar edi — demak 'credit'
// ruxsatiga ega har qanday sub-admin BARCHA adminlarning BARCHA
// shartnomalarini ko'rar edi. Endi bu — Kirim-Chiqim (admin-finance.js)
// bilan BIR XIL andoza: har bir shartnoma `addedByUid` (kim qo'shgani)
// bilan saqlanadi, va:
//   - oddiy sub-admin FAQAT o'zi qo'shgan shartnomalarni ko'radi (yangi
//     qo'shilgan sub-admin uchun ro'yxat "0 dan" — bo'sh — boshlanadi),
//   - bosh (super) admin HAR DOIM barcha shartnomalarni (shu jumladan
//     eski, `addedByUid`siz shartnomalarni ham) ko'radi,
//   - bosh admin "Boshqaruv"dan biror sub-adminning profiliga kirib,
//     `viewUid` bilan ANIQ o'sha kishining shartnomalarini alohida
//     ko'rishi mumkin (faqat superAdmin uchun, boshqa hech kim uchun emas).
// Bitta shartnomani o'zgartirish (to'lov belgilash, tahrirlash, status)
// ham FAQAT shu shartnomani qo'shgan admin yoki bosh admin uchun ochiq.

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

const COLLECTION = 'credit_contracts';
/* SHARTNOMA RAQAMI — 2 HARF + 5 RAQAM (V146)
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "shartnoma ID berayotganda endi XX12345 — tasodifiy
   2 harf 5 ta son berilsin".  Masalan: KD48217, PR90134.

   NEGA HARFLAR CHEKLANGAN. `I`, `O`, `Q`, `S` ishlatilmaydi: ular
   og'zaki aytilganda va qo'lda yozilganda `1`, `0`, `9`, `5` bilan
   adashtiriladi. Shartnoma raqamini admin telefonda mijozga aytadi,
   shuning uchun chalkashlik bo'lmasligi muhim.

   ESKI SHARTNOMALAR TEGILMAYDI — bu faqat YANGI shartnomaga beriladi.
   TAKRORLANMASLIK: 21x21x90000 = ~40 mln variant, ustiga quyida
   bazadan tekshiruv ham bor. */
const ID_HARF = 'ABCDEFGHJKLMNPRTUVXYZ';

function randomContractId() {
  const h = () => ID_HARF[Math.floor(Math.random() * ID_HARF.length)];
  return h() + h() + String(10000 + Math.floor(Math.random() * 90000));
}

/* ==================================================================
   TO'LOV JADVALI — IKKI XIL (V146)
   ------------------------------------------------------------------
   MIJOZ SO'ROVI (oxirgi tahrir, aynan):
     "bundan keyin kredit qo'shganda ikki xil bo'lsin — bosh to'lov
      yoki bosh to'lovsiz, ikkisidan birini tanlab qilaveramiz.
      Agar bosh to'lov bosilsa, to'lov qisqa: 23 oyi qoladi.
      Narigisida esa keyingi oydan to'lov bo'ladi."

   ============ 1) BOSH TO'LOVSIZ ============
   Shartnoma kunida hech qanday to'lov yo'q. To'lovlar KEYINGI OYDAN
   boshlanadi va to'liq N ta bo'ladi.
       24 oy, shartnoma 10.11.2026, to'lov kuni 10:
         1-to'lov   10.12.2026
         ...
         24-to'lov  10.11.2028

   ============ 2) BOSH TO'LOV BILAN ============
   Bosh to'lov SHARTNOMA KUNIDA olinadi va u BIRINCHI OY O'RNIGA
   hisoblanadi. Shuning uchun oylik to'lovlar bittaga KAM bo'ladi.
       24 oy, shartnoma 10.11.2026, to'lov kuni 10:
         Bosh to'lov  10.11.2026
         1-to'lov     10.12.2026
         ...
         23-to'lov    10.10.2028     <-- 23 ta (mijoz aytganidek)

   IKKALA HOLATDA HAM oylik to'lovlar keyingi oydan boshlanadi —
   farq faqat SONIDA (N yoki N-1) va bosh to'lov borligida.

   ============ NOZIK JOY — QISQA OYLAR ============
   To'lov kuni 31 bo'lsa, fevralda 31-sana yo'q. `new Date(yil,oy,31)`
   esa jimgina keyingi oyga o'tib ketadi (3-mart bo'lib qoladi) va
   jadvalni buzardi. Shuning uchun kun oyning haqiqiy uzunligiga
   qisqartiriladi: fevralda 28 (kabisa yilida 29), aprelda 30.
   ================================================================== */

/* Oyning oxirgi kuni (oy 0-11 tartibida) */
function oyningOxirgiKuni(yil, oy) {
  return new Date(yil, oy + 1, 0).getDate();
}

/* Shartnoma sanasidan `oyQoshish` oy keyingi, `payDay` kunidagi sana */
function calcDueDate(startTs, payDay, oyQoshish) {
  const d = new Date(startTs);
  const norm = new Date(d.getFullYear(), d.getMonth() + oyQoshish, 1);
  const kun = Math.min(payDay, oyningOxirgiKuni(norm.getFullYear(), norm.getMonth()));
  return new Date(norm.getFullYear(), norm.getMonth(), kun).getTime();
}

/* Kunning boshiga keltiradi */
function kunBoshi(ts) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/* NECHTA OYLIK TO'LOV BO'LADI — bosh to'lov birinchi oy o'rniga
   hisoblangani uchun bittaga kam. */
function oylikSoni(months, boshTolovBor) {
  return boshTolovBor ? Math.max(0, months - 1) : months;
}

/* JADVALNI QURADI. `eskiTolovlar` — tahrirlashda to'langan oylar
   saqlanib qolsin. */
function jadvalQur(startTs, payDay, months, boshTolovBor, eskiTolovlar) {
  const eski = eskiTolovlar || [];
  const n = oylikSoni(months, boshTolovBor);
  const payments = [];
  for (let i = 0; i < n; i++) {
    const dueDate = calcDueDate(startTs, payDay, i + 1);   /* keyingi oydan */
    const old = eski.find(p => p.month === i + 1);
    payments.push({
      month: i + 1,
      dueDate,
      status: old ? old.status : 'pending',
      paidAt: old ? old.paidAt : null
    });
  }
  return payments;
}

// Berilgan shartnomaga kim tegishligini (huquqni) tekshiradi: bosh admin
// — hammasiga; oddiy admin — faqat o'zi qo'shganiga.
function canAccessContract(decoded, contractData) {
  if (decoded.superAdmin === true) return true;
  return contractData.addedByUid === decoded.uid;
}

// Ro'yxatni izolyatsiya qoidasiga ko'ra filtrlaydi (qarang: admin-finance.js
// dagi bir xil mantiq).
function filterContracts(docs, targetUid, includeLegacy) {
  return docs.filter(d => {
    const c = d.data();
    if (c.addedByUid === targetUid) return true;
    if (!c.addedByUid && includeLegacy) return true;
    return false;
  });
}

async function listContracts(decoded, body) {
  const isSuper = decoded.superAdmin === true;
  const callerUid = decoded.uid;
  const requestedViewUid = typeof body.viewUid === 'string' ? body.viewUid : null;
  const viewUid = (isSuper && requestedViewUid) ? requestedViewUid : null;

  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();

  let docs;
  if (isSuper && !viewUid) {
    // Bosh adminning o'z (standart) ko'rinishi — HAMMASI, hech qanday filtr yo'q.
    docs = snap.docs;
  } else {
    const targetUid = viewUid || callerUid;
    docs = filterContracts(snap.docs, targetUid, false);
  }

  const contracts = docs.map(d => ({ id: d.id, ...d.data() }));
  return { contracts };
}

/* MAYDON CHEGARALARI (V120).
   ------------------------------------------------------------------
   SABAB: "Shartnoma qo'shish" bosilganda ba'zan Netlify'ning
   "Request payload size exceeds the limit" xatosi chiqardi — ya'ni
   so'rov hajmi platforma chegarasidan oshib ketgan va funksiya UMUMAN
   ishga tushmagan. Hajm bitta maydonga juda katta matn tushganda
   oshadi (masalan izohga rasm yoki uzun matn joylashtirilsa).
   Brauzer tomonida ham chegara qo'yildi (maxlength + kesish), lekin
   ASOSIY himoya SHU YERDA: so'rov qayerdan kelishidan qat'i nazar,
   bazaga faqat shu uzunlikdagi qiymat tushadi. Uzun matn xato
   qaytarmaydi — shunchaki KESILADI, ya'ni admin ishi to'xtab
   qolmaydi. */
const CHEGARA = {
  customerName: 100, customerPhone: 30, region: 60, number: 30,
  additionalInfo: 500, passportNumber: 30, birthDate: 20,
  permanentAddress: 300, startDate: 20
};
function matn(body, kalit) {
  return String(body[kalit] == null ? '' : body[kalit]).slice(0, CHEGARA[kalit] || 200).trim();
}

async function addContract(body, decoded) {
  const name = matn(body, 'customerName');
  const phone = matn(body, 'customerPhone');
  const region = matn(body, 'region');
  const number = matn(body, 'number');
  /* Son maydonlar ham aqlli chegarada bo'lsin (jadval cheksiz
     uzun bo'lib ketmasin — 600 oy = 50 yil, bundan ortig'i xato). */
  const months = Math.min(Math.max(Number(body.totalMonths) || 0, 0), 600);
  const monthly = Math.min(Math.max(Number(body.monthlyPayment) || 0, 0), 1e12);
  const payDay = Math.min(Math.max(Number(body.paymentDay) || 1, 1), 31);
  const info = matn(body, 'additionalInfo');
  const passportNumber = matn(body, 'passportNumber');
  const birthDate = matn(body, 'birthDate');
  const permanentAddress = matn(body, 'permanentAddress');
  const startDateVal = matn(body, 'startDate');
  /* Valyuta — so'm yoki dollar. Hisob-kitob o'zgarmaydi, faqat qaysi
     valyutada ekani saqlanadi va hamma joyda shunday ko'rsatiladi. */
  const currency = String(body.currency || '').toUpperCase() === 'USD' ? 'USD' : 'UZS';

  if (!name || !phone || !region || !number || months <= 0 || monthly <= 0) {
    const err = new Error("Barcha maydonlarni to'g'ri to'ldiring");
    err.statusCode = 400;
    throw err;
  }

  let contractId = randomContractId();
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await db.collection(COLLECTION).doc(contractId).get();
    if (!existing.exists) break;
    contractId = randomContractId();
  }

  const startTs = startDateVal ? new Date(startDateVal + 'T00:00:00').getTime() : Date.now();

  /* BOSH TO'LOV (V143). Admin formasidagi ptichka yoqilgan bo'lsa,
     summa ham kelishi kerak; summa 0 yoki kelmagan bo'lsa — bosh
     to'lov YO'Q deb hisoblanadi (ptichka adashib bosilgan bo'lishi
     mumkin, yarim holat bilan shartnoma yaratmaymiz). */
  const downPayment = Math.min(Math.max(Number(body.downPayment) || 0, 0), 1e12);
  const boshTolovBor = !!body.hasDownPayment && downPayment > 0;
  /* CHEKKA HOLAT HIMOYASI (V146). Bosh to'lov birinchi oy o'rniga
     hisoblanadi, shuning uchun 1 oylik shartnomada oylik to'lov
     umuman qolmaydi va jadval bo'sh bo'lib qolardi — "qolgan summa",
     eslatmalar va PDF shunda noto'g'ri ishlardi. */
  if (boshTolovBor && months < 2) {
    const err = new Error("Boshlang'ich to'lov bilan muddat kamida 2 oy bo'lishi kerak");
    err.statusCode = 400;
    throw err;
  }

  const payments = jadvalQur(startTs, payDay, months, boshTolovBor, null);

  let customerChatId = null;
  try {
    const phoneDigits = phone.replace(/\D/g, '').slice(-9);
    const ordersSnap = await db.collection('orders').orderBy('createdAtSort', 'desc').limit(500).get();
    const matchOrder = ordersSnap.docs
      .map(d => d.data())
      .find(o => o.customerChatId && (o.phone || '').replace(/\D/g, '').slice(-9) === phoneDigits);
    if (matchOrder) customerChatId = matchOrder.customerChatId;
  } catch (e) { console.error('customerChatId topishda xato:', e); }

  await db.collection(COLLECTION).doc(contractId).set({
    contractId, customerName: name, customerPhone: phone, region, number,
    /* QIDIRUV MAYDONI (V122). Mijoz kabineti shartnomani TELEFON
       bo'yicha topadi. Firestore faqat ANIQ moslik bo'yicha qidira
       oladi, telefon esa turli ko'rinishda yozilishi mumkin
       ("+998 90 123-45-67", "998901234567"...). Shu sabab oxirgi 9
       raqam alohida, toza holda saqlanadi — xuddi `orders` dagi
       `phoneNormalized` kabi. Busiz kabinet butun to'plamni o'qishga
       majbur bo'lardi (qimmat va sekin). */
    phoneNormalized: phone.replace(/\D/g, '').slice(-9),
    numberNormalized: number.replace(/\D/g, '').slice(-9),
    totalMonths: months, monthlyPayment: monthly, currency, paymentDay: payDay,
    /* Bosh to'lov alohida maydonlarda saqlanadi, `payments` ichiga
       QO'SHILMAYDI. Sababi: butun tizim bo'ylab "to'langan oylar",
       "qolgan summa", eslatmalar va PDF `payments` ro'yxatini OYLIK
       to'lovlar deb biladi. Bosh to'lovni o'sha ro'yxatga tiqib
       qo'ysak, 24 oylik shartnoma 25 oylik bo'lib ko'rinib, barcha
       hisob-kitob buzilardi. */
    downPayment: boshTolovBor ? downPayment : 0,
    downPaymentDueDate: boshTolovBor ? kunBoshi(startTs) : null,
    downPaymentStatus: boshTolovBor ? 'pending' : null,
    downPaymentPaidAt: null,
    additionalInfo: info, createdAt: startTs, payments, contractStatus: 'active',
    customerChatId, passportNumber, birthDate, permanentAddress,
    // Kim qo'shgani — HAR DOIM tekshirilgan tokendan olinadi, mijoz
    // tomonidan yuborilmaydi (qarang: getSummary/list izolyatsiya mantig'i).
    addedByUid: decoded.uid
  });

  // Agar shu raqam "Shaxsiy baza"da (o'zimizning qo'limizdagi raqamlar
  // ro'yxati) mavjud bo'lsa — endi mijozga kredit sifatida berilgani
  // uchun avtomatik "yopiq" deb belgilaymiz (band bo'lib qoldi).
  try {
    const numDigits = number.replace(/\D/g, '');
    if (numDigits) {
      const personalSnap = await db.collection('personal_numbers').get();
      const match = personalSnap.docs.find(d => {
        const pd = String(d.data().number || '').replace(/\D/g, '');
        return pd && (pd === numDigits || pd.slice(-9) === numDigits.slice(-9));
      });
      if (match && match.data().status !== 'yopiq') {
        await match.ref.update({ status: 'yopiq', closedAt: Date.now(), linkedContractId: contractId });
      }
    }
  } catch (e) { console.error('Shaxsiy bazani avtomatik yopishda xato:', e); }

  return { id: contractId, contractId, customerChatId };
}

async function updatePayment(body, decoded) {
  const id = String(body.id || '').slice(0, 40);
  const month = Number(body.month);
  if (!id || !month) { const err = new Error('id va oy kerak'); err.statusCode = 400; throw err; }

  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) { const err = new Error('Shartnoma topilmadi'); err.statusCode = 404; throw err; }
  const data = doc.data();
  if (!canAccessContract(decoded, data)) {
    const err = new Error('Bu shartnomaga ruxsatingiz yo\'q');
    err.statusCode = 403;
    throw err;
  }

  const payments = data.payments.map(p => {
    if (p.month === month) {
      const newStatus = p.status === 'paid' ? 'pending' : 'paid';
      return { ...p, status: newStatus, paidAt: newStatus === 'paid' ? Date.now() : null };
    }
    return p;
  });
  await ref.update({ payments });
  return { ok: true };
}

async function updateContract(body, decoded) {
  const id = String(body.id || '').slice(0, 40);
  if (!id) { const err = new Error('id kerak'); err.statusCode = 400; throw err; }

  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) { const err = new Error('Shartnoma topilmadi'); err.statusCode = 404; throw err; }
  const existing = doc.data();
  if (!canAccessContract(decoded, existing)) {
    const err = new Error('Bu shartnomaga ruxsatingiz yo\'q');
    err.statusCode = 403;
    throw err;
  }

  /* V120: tahrirlashda ham AYNAN SHU chegaralar (qarang: addContract) */
  const payDay = Math.min(Math.max(Number(body.paymentDay) || 1, 1), 31);
  const newTotalMonths = Math.min(Math.max(Number(body.totalMonths) || 1, 1), 600);
  const sanaMatn = matn(body, 'startDate');
  const newStartTs = sanaMatn ? new Date(sanaMatn + 'T00:00:00').getTime() : Date.now();

  /* BOSH TO'LOV — tahrirlashda. `hasDownPayment` yuborilmagan bo'lsa
     (eski panel yoki boshqa chaqiruv) mavjud holat SAQLANADI, aks
     holda shartnomani tahrirlash bosh to'lovni jimgina o'chirib
     yuborardi. */
  const eskiBoshBor = Number(existing.downPayment) > 0;
  const boshBerilgan = Object.prototype.hasOwnProperty.call(body, 'hasDownPayment');
  const yangiBoshSumma = boshBerilgan
    ? Math.min(Math.max(Number(body.downPayment) || 0, 0), 1e12)
    : Number(existing.downPayment) || 0;
  const boshTolovBor = boshBerilgan ? (!!body.hasDownPayment && yangiBoshSumma > 0) : eskiBoshBor;

  const payments = jadvalQur(newStartTs, payDay, newTotalMonths, boshTolovBor, existing.payments || []);

  await ref.update({
    customerName: matn(body, 'customerName'),
    customerPhone: matn(body, 'customerPhone'),
    phoneNormalized: matn(body, 'customerPhone').replace(/\D/g, '').slice(-9),
    region: matn(body, 'region'),
    number: matn(body, 'number'),
    numberNormalized: matn(body, 'number').replace(/\D/g, '').slice(-9),
    monthlyPayment: Math.min(Math.max(Number(body.monthlyPayment) || 0, 0), 1e12),
    currency: String(body.currency || '').toUpperCase() === 'USD' ? 'USD' : 'UZS',
    additionalInfo: matn(body, 'additionalInfo'),
    passportNumber: matn(body, 'passportNumber'),
    birthDate: matn(body, 'birthDate'),
    permanentAddress: matn(body, 'permanentAddress'),
    createdAt: newStartTs,
    paymentDay: payDay,
    totalMonths: newTotalMonths,
    downPayment: boshTolovBor ? yangiBoshSumma : 0,
    downPaymentDueDate: boshTolovBor ? kunBoshi(newStartTs) : null,
    /* To'langan bosh to'lov holati saqlanadi */
    downPaymentStatus: boshTolovBor ? (existing.downPaymentStatus || 'pending') : null,
    downPaymentPaidAt: boshTolovBor ? (existing.downPaymentPaidAt || null) : null,
    payments
  });

  return { ok: true };
}

async function updateStatus(body, decoded) {
  const id = String(body.id || '').slice(0, 40);
  const statusKey = String(body.status || '').slice(0, 30);
  if (!id || !statusKey) { const err = new Error('id va status kerak'); err.statusCode = 400; throw err; }

  const ref = db.collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists) { const err = new Error('Shartnoma topilmadi'); err.statusCode = 404; throw err; }
  if (!canAccessContract(decoded, doc.data())) {
    const err = new Error('Bu shartnomaga ruxsatingiz yo\'q');
    err.statusCode = 403;
    throw err;
  }

  await ref.update({ contractStatus: statusKey });
  return { ok: true };
}

// Eski (auto-ID) shartnomalarni contractId-ID'ga ko'chirish — bu butun
// bazaga ta'sir qiladigan bir martalik texnik amal, shu sabab FAQAT bosh
// admin uchun ochiq.
async function migrateContracts(decoded) {
  if (decoded.superAdmin !== true) {
    const err = new Error('Bu amal faqat bosh admin uchun');
    err.statusCode = 403;
    throw err;
  }
  const snap = await db.collection(COLLECTION).get();
  let migrated = 0, skipped = 0, qidiruv = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const properId = data.contractId;

    /* V122: ESKI shartnomalarga qidiruv maydonlarini qo'shamiz —
       ularsiz mijoz kabineti shartnomani telefon bo'yicha topa
       olmaydi. Hujjat ID'si to'g'ri bo'lsa ham shu ish bajariladi. */
    const kerak = {};
    const tel = String(data.customerPhone || '').replace(/\D/g, '').slice(-9);
    const raq = String(data.number || '').replace(/\D/g, '').slice(-9);
    if (tel && data.phoneNormalized !== tel) kerak.phoneNormalized = tel;
    if (raq && data.numberNormalized !== raq) kerak.numberNormalized = raq;

    if (!properId || docSnap.id === properId) {
      if (Object.keys(kerak).length) {
        await docSnap.ref.update(kerak);
        qidiruv++;
      }
      skipped++;
      continue;
    }
    await db.collection(COLLECTION).doc(properId).set(Object.assign({}, data, kerak));
    await db.collection(COLLECTION).doc(docSnap.id).delete();
    migrated++;
    if (Object.keys(kerak).length) qidiruv++;
  }
  return { migrated, skipped, qidiruv };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let decoded;
  try {
    decoded = await requireAdmin(event, { feature: 'credit' });
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  try {
    let result;
    switch (body.action) {
      case 'list':          result = await listContracts(decoded, body); break;
      case 'add':            result = await addContract(body, decoded); break;
      case 'updatePayment':  result = await updatePayment(body, decoded); break;
      case 'updateContract': result = await updateContract(body, decoded); break;
      case 'updateStatus':   result = await updateStatus(body, decoded); break;
      case 'migrate':        result = await migrateContracts(decoded); break;
      default: {
        const err = new Error("Noma'lum amal");
        err.statusCode = 400;
        throw err;
      }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (err) {
    console.error('ADMIN-CREDIT XATOSI:', err);
    return { statusCode: err.statusCode || 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
