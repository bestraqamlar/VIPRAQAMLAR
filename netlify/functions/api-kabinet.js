// MIJOZ KABINETI (V122)
// =====================
// NEGA KERAK. Ilgari mijoz uchun ikkita alohida bo'lim bor edi:
//   * "Buyurtmalarim"  — telefon + raqamning oxirgi 4 ta raqami;
//   * "Shartnomani tekshirish" — shartnoma ID'si + telefon.
// Ya'ni mijoz shartnoma ID'sini ESLAB QOLISHI kerak edi (hech kim
// eslab qolmaydi), va hamma narsani ko'rish uchun ikki marta,
// ikki xil ma'lumot bilan qidirishi kerak edi.
//
// ENDI: BITTA so'rov — telefon + raqamning oxirgi 4 ta raqami.
// Javobda mijozning HAMMA narsasi: buyurtmalari, shartnomalari,
// to'lov jadvali, to'langan/qolgan summa va keyingi to'lov sanasi.
//
// XAVFSIZLIK — ilgarigidek IKKI bosqichli.
//   * Telefon raqamining o'zi YETARLI EMAS: ustiga raqamning oxirgi 4
//     ta raqami ham to'g'ri kelishi kerak (shartnoma ID'si o'rniga
//     shu "ikkinchi kalit" bo'lib xizmat qiladi). Ya'ni birovning
//     telefon raqamini bilgan odam uning ma'lumotini KO'RA OLMAYDI.
//   * IP bo'yicha soatiga 20 ta urinish — "taxmin qilib topish"
//     (brute-force) yo'li yopiq. 4 ta raqam = 10 000 kombinatsiya,
//     chegarasiz bo'lsa skript bilan topish mumkin edi.
//   * Javobga PASSPORT, TUG'ILGAN SANA va YASHASH JOYI ATAYLAB
//     QO'SHILMAYDI. Ular shartnomada bor, lekin brauzerga
//     yuborilmaydi — kerak emas, xavf esa katta.
//   * App Check tekshiriladi (mavjud funksiyalardagi bilan bir xil).

const admin = require('firebase-admin');
const { sanaUz } = require('./lib/sana');

let ULANISH_XATOSI = null;
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  } catch (e) { ULANISH_XATOSI = (e && e.message) || "sabab noma'lum"; }
}
let db = null;
if (!ULANISH_XATOSI && admin.apps.length) {
  db = admin.firestore();
  try { db.settings({ preferRest: true }); } catch (e) {}
}

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-firebase-appcheck, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function javob(kod, obj) {
  return { statusCode: kod, headers: CORS, body: JSON.stringify(obj) };
}

async function appCheckOk(event) {
  const token = (event.headers && (event.headers['x-firebase-appcheck'] || event.headers['X-Firebase-AppCheck'])) || '';
  if (!token) return true;   // mavjud funksiyalardagi bilan bir xil: tokensiz ham o'tadi
  try { await admin.appCheck().verifyToken(token); return true; }
  catch (e) { return false; }
}

const SOATLIK_CHEGARA = 20;
async function tezlikOk(event) {
  try {
    const h = event.headers || {};
    const ip = String(h['x-nf-client-connection-ip'] || h['client-ip']
      || ((h['x-forwarded-for'] || '').split(',')[0].trim()) || 'unknown')
      .replace(/[^\w.:-]/g, '_').slice(0, 60) || 'unknown';
    const soat = new Date().toISOString().slice(0, 13);
    const ref = db.collection('order_lookup_rate_limits').doc(ip);
    const snap = await ref.get();
    let soni = 0;
    if (snap.exists) {
      const d = snap.data() || {};
      if (d.hourKey === soat) soni = Number(d.count) || 0;
    }
    if (soni >= SOATLIK_CHEGARA) return false;
    await ref.set({ hourKey: soat, count: soni + 1, lastAttemptAt: Date.now() }, { merge: true });
    return true;
  } catch (e) { return true; }   // baza javob bermasa — mijozni to'smaymiz
}

/* To'lov jadvalidan hisob-kitob: to'langan, qolgan, keyingi sana,
   kechikkan oylar. Admin paneli va PDF bilan BIR XIL mantiq. */
function jadvalHisobi(shartnoma) {
  const oylik = Number(shartnoma.monthlyPayment) || 0;
  const jadval = Array.isArray(shartnoma.payments) ? shartnoma.payments : [];
  const hozir = Date.now();

  let tolangan = 0, kechikkan = 0;
  let keyingi = null;
  const oylar = jadval.map(p => {
    const tolandi = p.status === 'paid' || p.paid === true;
    if (tolandi) tolangan++;
    const muddat = Number(p.dueDate) || 0;
    let holat = 'kutilmoqda';
    if (tolandi) holat = 'tolandi';
    else if (muddat && muddat < hozir) { holat = 'kechikdi'; kechikkan++; }
    if (!tolandi && !keyingi && muddat) keyingi = muddat;
    return {
      oy: Number(p.month) || 0,
      sana: muddat ? sanaUz(muddat) : '',
      sanaMs: muddat || 0,
      summa: oylik,
      holat
    };
  });

  const jami = (Number(shartnoma.totalMonths) || jadval.length) * oylik;
  return {
    oylar,
    jamiOy: Number(shartnoma.totalMonths) || jadval.length,
    tolanganOy: tolangan,
    kechikkanOy: kechikkan,
    jamiSumma: jami,
    tolanganSumma: tolangan * oylik,
    qolganSumma: Math.max(0, jami - tolangan * oylik),
    keyingiSana: keyingi ? sanaUz(keyingi) : '',
    keyingiSanaMs: keyingi || 0
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return javob(405, { ok: false, error: 'Faqat POST' });
  if (!db) {
    console.error('API-KABINET: Firebase ulanmagan:', ULANISH_XATOSI);
    return javob(503, { ok: false, error: "Hozir ochib bo'lmadi. Birozdan keyin qayta urining." });
  }
  if (!(await appCheckOk(event))) return javob(401, { ok: false, error: "Ruxsat yo'q" });
  if (!(await tezlikOk(event))) {
    return javob(429, { ok: false, error: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." });
  }

  try {
    const kirish = JSON.parse(event.body || '{}');
    const tel9 = String(kirish.phone || '').replace(/\D/g, '').slice(-9);
    const oxirgi4 = String(kirish.lastDigits || '').replace(/\D/g, '');

    /* Xato xabari HAR DOIM bir xil: "topilmadi" va "noto'g'ri kalit"
       farqlanmaydi — aks holda telefon bazada bor-yo'qligini bilib
       olish mumkin bo'lardi. */
    const topilmadi = javob(200, { ok: false, error: "Ma'lumot topilmadi. Raqamlarni tekshiring." });
    if (tel9.length !== 9 || oxirgi4.length !== 4) return topilmadi;

    const [buyurtmaSnap, shartnomaSnap] = await Promise.all([
      db.collection('orders').where('phoneNormalized', '==', tel9).limit(50).get(),
      db.collection('credit_contracts').where('phoneNormalized', '==', tel9).limit(20).get()
        .catch(() => ({ docs: [] }))
    ]);

    const buyurtmalar = buyurtmaSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAtSort || 0) - (a.createdAtSort || 0));
    const shartnomalar = shartnomaSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    /* IKKINCHI KALIT: oxirgi 4 ta raqam buyurtmalardan YOKI
       shartnomalardan biriga to'g'ri kelishi shart. */
    const mos = (x) => String(x || '').replace(/\D/g, '').slice(-4) === oxirgi4;
    const kalitTogri = buyurtmalar.some(o => mos(o.number)) || shartnomalar.some(c => mos(c.number));
    if (!kalitTogri) return topilmadi;

    const chiqBuyurtmalar = buyurtmalar.slice(0, 30).map(o => ({
      number: o.number || '',
      price: o.price || 0,
      currency: o.currency || 'UZS',
      status: o.status || 'Yangi',
      createdAt: o.createdAt || '',
      createdAtSort: o.createdAtSort || 0,
      paymentType: o.paymentType || 'cash',
      installmentMonths: o.installmentMonths || null,
      monthlyPayment: o.monthlyPayment || null,
      cashTariffName: o.cashTariffName || null,
      cashTariffPrice: o.cashTariffPrice || null,
      /* Yetkazib berish bosqichi — mijoz saytda "qayerda" ekanini
         ko'radi (qarang: ORDER_STATUS, index.html). */
      statusAt: o.statusAt || 0
    }));

    const chiqShartnomalar = shartnomalar.map(c => {
      const h = jadvalHisobi(c);
      return {
        contractId: c.contractId || c.id,
        number: c.number || '',
        currency: c.currency || 'UZS',
        monthlyPayment: Number(c.monthlyPayment) || 0,
        contractStatus: c.contractStatus || 'active',
        boshlangan: c.createdAt ? sanaUz(c.createdAt) : '',
        ...h
        /* DIQQAT: passport, tug'ilgan sana va yashash joyi ATAYLAB
           yuborilmaydi — mijozga kerak emas, xavf esa katta. */
      };
    }).sort((a, b) => String(a.contractId).localeCompare(String(b.contractId)));

    return javob(200, {
      ok: true,
      orders: chiqBuyurtmalar,
      contracts: chiqShartnomalar
    });
  } catch (err) {
    console.error('API-KABINET XATOSI:', err);
    return javob(500, { ok: false, error: "Hozir ochib bo'lmadi. Birozdan keyin qayta urining." });
  }
};
