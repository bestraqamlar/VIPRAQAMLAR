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
const { kabinetToken } = require('./lib/kabinetToken');

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

    /* FAQAT TOKEN (V131).
       Ilgari zaxira yo'l ham bor edi: telefon + sotib olingan
       raqamning oxirgi 4 ta raqami. U ATAYLAB OLIB TASHLANDI —
       4 ta raqam "parol" darajasidagi himoya emas va serverda ochiq
       qolishi xavfsizlik teshigi edi. Endi kabinet faqat Telegram
       kodi orqali olingan IMZOLANGAN TOKEN bilan ochiladi. */
    const tokenTel = kirish.token ? kabinetToken.ochib(kirish.token) : null;
    const tel9 = tokenTel || '';

    /* Xato xabari HAR DOIM bir xil: "topilmadi" va "noto'g'ri kalit"
       farqlanmaydi — aks holda telefon bazada bor-yo'qligini bilib
       olish mumkin bo'lardi. */
    const topilmadi = javob(200, { ok: false, error: "Ma'lumot topilmadi." });
    /* Token yo'q yoki yaroqsiz/muddati o'tgan — mijozni qayta
       kirishga yo'naltiramiz. */
    if (!tokenTel) {
      return javob(200, { ok: false, qaytaKirish: true, error: "Kirish muddati tugadi. Qaytadan kiring." });
    }

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
    /* IKKINCHI KALIT TEKSHIRUVI OLIB TASHLANDI: token Telegram
       orqali tasdiqlangan raqam egasiga berilgan, undan kuchliroq
       tekshiruv yo'q. */

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

    /* ---------- PROFIL (V126) ----------
       Mijoz kabinetga kirganda birinchi ko'rishi kerak bo'lgan narsa —
       O'ZI: ismi, raqami va "men bu yerda kimman" degan savolga javob.
       Ilgari kabinet darhol buyurtmalar ro'yxatidan boshlanardi, ya'ni
       "kabinet" emas, "qidiruv natijasi" edi.

       MA'LUMOT QAYERDAN. Hammasi mijozning O'ZI kiritgan ma'lumot:
       buyurtma bergandagi ism va hudud, yoki shartnomadagi shu
       maydonlar. Yangi maydon yozilmaydi, yangi so'rov qilinmaydi —
       allaqachon o'qilgan hujjatlardan hisoblanadi.

       PASSPORT, TUG'ILGAN SANA va YASHASH JOYI bu yerga HAM
       qo'shilmaydi (yuqoridagi izohga qarang). */
    const oxB = buyurtmalar[0] || {};
    const oxS = shartnomalar[0] || {};
    const ism = String(oxB.name || oxS.customerName || '').slice(0, 100);
    const hudud = String(oxB.region || oxS.region || '').slice(0, 200);

    const yakunlangan = buyurtmalar.filter(o => o.status === 'Yakunlandi').length;
    const bekor = buyurtmalar.filter(o => o.status === 'Bekor qilindi').length;
    const jarayonda = buyurtmalar.length - yakunlangan - bekor;

    /* Jami xarid — FAQAT yakunlangan buyurtmalar bo'yicha. Valyutalar
       aralashmasligi uchun so'm va dollar alohida yig'iladi. */
    let xaridUzs = 0, xaridUsd = 0;
    for (const o of buyurtmalar) {
      if (o.status !== 'Yakunlandi') continue;
      const n = Number(o.price) || 0;
      if (String(o.currency).toUpperCase() === 'USD') xaridUsd += n; else xaridUzs += n;
    }

    const faolShartnoma = chiqShartnomalar.filter(c => c.contractStatus === 'active').length;
    const qolganJami = chiqShartnomalar.reduce((a, c) => a + (Number(c.qolganSumma) || 0), 0);
    const kechikkanJami = chiqShartnomalar.reduce((a, c) => a + (Number(c.kechikkanOy) || 0), 0);

    /* Eng yaqin to'lov sanasi — barcha shartnomalar bo'yicha eng
       yaqini (mijoz "qachon to'lashim kerak" degan savolga darhol
       javob topsin). */
    let keyingiMs = 0;
    for (const c of chiqShartnomalar) {
      const m = Number(c.keyingiSanaMs) || 0;
      if (m && (!keyingiMs || m < keyingiMs)) keyingiMs = m;
    }

    /* Mijozlik boshlangan sana — eng birinchi buyurtma yoki
       shartnomaning sanasi. */
    let birinchiMs = 0;
    for (const o of buyurtmalar) {
      const m = Number(o.createdAtSort) || 0;
      if (m && (!birinchiMs || m < birinchiMs)) birinchiMs = m;
    }
    for (const c of shartnomalar) {
      const m = Number(c.createdAt) || 0;
      if (m && (!birinchiMs || m < birinchiMs)) birinchiMs = m;
    }

    /* Daraja — sotib olingan raqamlar soni bo'yicha. Mijoz uchun
       "meni taniydi" hissi, biz uchun esa qaytib kelgan mijozni
       ko'rsatadigan oddiy belgi. Hech qanday chegirma yoki huquq
       bermaydi — faqat belgi. */
    const sotibOlgan = yakunlangan + faolShartnoma;
    const daraja = sotibOlgan >= 5 ? 'vip' : (sotibOlgan >= 2 ? 'doimiy' : 'yangi');

    /* ---- KREDIT HOLATI: YASHIL / SARIQ / QIZIL (V129) ----
       Banklardagi kabi oddiy "svetofor". Faqat KECHIKKAN oylar soniga
       qaraydi, chunki mijoz uchun eng muhim savol shu: "men orqada
       qoldimmi?"
         yashil — kechikish yo'q;
         sariq  — 1 oy kechikkan (ogohlantirish, hali tuzatsa bo'ladi);
         qizil  — 2 va undan ko'p oy kechikkan.
       Shartnomasi yo'q mijozda holat 'yoq' — svetofor ko'rsatilmaydi,
       chunki baholaydigan narsa yo'q. */
    let kreditHolat = 'yoq';
    if (chiqShartnomalar.length) {
      if (kechikkanJami >= 2) kreditHolat = 'qizil';
      else if (kechikkanJami === 1) kreditHolat = 'sariq';
      else kreditHolat = 'yashil';
    }

    const profil = {
      kreditHolat,
      ism,
      hudud,
      telefon: tel9,
      daraja,
      jamiBuyurtma: buyurtmalar.length,
      yakunlangan,
      jarayonda,
      bekor,
      xaridUzs,
      xaridUsd,
      jamiShartnoma: chiqShartnomalar.length,
      faolShartnoma,
      qolganSumma: qolganJami,
      kechikkanOy: kechikkanJami,
      keyingiSana: keyingiMs ? sanaUz(keyingiMs) : '',
      keyingiSanaMs: keyingiMs,
      mijozlikSana: birinchiMs ? sanaUz(birinchiMs) : '',
      mijozlikMs: birinchiMs
    };

    return javob(200, {
      ok: true,
      profile: profil,
      orders: chiqBuyurtmalar,
      contracts: chiqShartnomalar
    });
  } catch (err) {
    console.error('API-KABINET XATOSI:', err);
    return javob(500, { ok: false, error: "Hozir ochib bo'lmadi. Birozdan keyin qayta urining." });
  }
};
