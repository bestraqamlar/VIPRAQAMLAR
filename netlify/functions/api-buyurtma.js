// SAYTDAN BUYURTMA — SERVER ORQALI (V120)
// =======================================
// NEGA KERAK. Ilgari buyurtmani MIJOZ BRAUZERI to'g'ridan-to'g'ri
// Firestore'ga yozardi. Bu uchta narsaga bir vaqtda bog'liq edi:
//   1. Firestore qoidalari to'g'ri joylangan bo'lishi;
//   2. App Check tokeni olinishi (reklama bloklagichi bo'lsa — olinmaydi);
//   3. mijoz tarmog'idan firestore.googleapis.com ochilishi.
// Uchtasidan BIRI ishlamasa — buyurtma yo'qolardi va mijoz "internetni
// tekshiring" degan xatoni ko'rardi. Bu to'g'ridan-to'g'ri yo'qotilgan
// pul: odam raqamni tanlab, ma'lumotini kiritib, oxirida chiqib ketardi.
//
// ENDI: brauzer buyurtmani SAYTNING O'ZIGA yuboradi, server esa uni
// Admin SDK bilan yozadi. Admin SDK qoidalardan ham, App Check'dan ham
// o'tmaydi — ya'ni yuqoridagi uchala sabab ham yo'qoladi. Sayt ochilgan
// bo'lsa, buyurtma o'tadi.
//
// HIMOYA:
//   * IP bo'yicha soatlik chegara (lib/tezlik.js) — skript bilan
//     bazani buyurtmaga to'ldirib bo'lmaydi;
//   * maydonlar RO'YXATI va SHAKLI tekshiriladi (firestore.rules dagi
//     bilan bir xil mantiq): ism harfli, telefon haqiqiy operator kodi
//     bilan, narx son va h.k.;
//   * `sorovId` orqali TAKRORLANISH bloklanadi: javob yo'lda yo'qolib,
//     brauzer qayta yuborsa ham ikkinchi buyurtma YARATILMAYDI;
//   * raqam band bo'lsa tranzaksiya rad etadi — ikki kishiga bitta
//     raqam sotilmaydi.

const admin = require('firebase-admin');
const { tezlikOk } = require('./lib/tezlik');

/* Ulanish xatosi (muhit o'zgaruvchilari yo'q/noto'g'ri) fayl
   yuklanayotganda butun funksiyani yiqitmasligi kerak — eslab qolamiz
   va so'rov kelganda TUSHUNARLI 500 qaytaramiz. */
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
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/* firestore.rules dagi ro'yxat bilan AYNAN bir xil bo'lishi kerak */
const RUXSAT_MAYDON = new Set([
  'number', 'price', 'currency', 'name', 'region', 'phone', 'phoneNormalized',
  'source', 'paymentType', 'operator', 'catalogType', 'smsVerified',
  'numberId', 'status', 'createdAt', 'createdAtSort',
  'installmentMonths', 'monthlyPayment', 'installmentDownPayment',
  'installmentTariff', 'cashTariffName', 'cashTariffPrice',
  'location', 'sellerId', 'promoCode', 'discount', 'sorovId'
]);

const UZ_TEL = /^\+998[ ]?(20|33|50|55|70|77|78|80|87|88|90|91|92|93|94|95|97|98|99)[ -][0-9]{3}[ -][0-9]{2}[ -][0-9]{2}$/;
const IKKI_HARF = /\p{L}[\s\S]*\p{L}/u;

function xato(kod, matn) {
  return { statusCode: kod, headers: CORS, body: JSON.stringify({ ok: false, error: matn }) };
}

function tekshir(p) {
  if (!p || typeof p !== 'object') return "Ma'lumot yuborilmadi";
  for (const k of Object.keys(p)) if (!RUXSAT_MAYDON.has(k)) return "Ruxsat etilmagan maydon: " + k;
  if (typeof p.name !== 'string' || p.name.length < 2 || p.name.length > 100 || !IKKI_HARF.test(p.name) || /[<>]/.test(p.name))
    return "Ismni to'g'ri kiriting";
  if (typeof p.region !== 'string' || p.region.length < 2 || p.region.length > 200 || !IKKI_HARF.test(p.region) || /[<>]/.test(p.region))
    return "Manzilni to'g'ri kiriting";
  if (typeof p.phone !== 'string' || !UZ_TEL.test(p.phone)) return "Telefon raqamini to'g'ri kiriting";
  if (typeof p.number !== 'string' || !UZ_TEL.test(p.number)) return "Buyurtma raqami noto'g'ri";
  if (typeof p.price !== 'number' || !(p.price >= 0) || p.price > 10000000000) return "Narx noto'g'ri";
  if (p.source && p.source !== 'Sayt') return "Manba noto'g'ri";
  for (const k of ['installmentMonths', 'monthlyPayment', 'installmentDownPayment', 'cashTariffPrice', 'discount'])
    if (k in p && typeof p[k] !== 'number') return k + " — son bo'lishi kerak";
  if ('smsVerified' in p && typeof p.smsVerified !== 'boolean') return "smsVerified noto'g'ri";
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return xato(405, 'Faqat POST');

  if (!db) {
    /* Server Firebase'ga ulanmagan. Mijozga texnik sabab ko'rsatilmaydi,
       lekin brauzer `serverYoq` belgisini ko'rib ZAXIRA yo'lga
       (to'g'ridan-to'g'ri Firestore) o'tadi — buyurtma yo'qolmaydi. */
    console.error('API-BUYURTMA: Firebase ulanmagan:', ULANISH_XATOSI);
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ ok: false, serverYoq: true, error: "Buyurtmani hozir qabul qilib bo'lmadi" }) };
  }

  if (!(await tezlikOk(db, event, 'order_create_rate_limits', 30))) {
    return xato(429, "Juda ko'p urinish. Biroz kuting.");
  }

  let kirish;
  try { kirish = JSON.parse(event.body || '{}'); }
  catch (e) { return xato(400, "Noto'g'ri JSON"); }

  const payload = kirish.payload;
  const xabar = tekshir(payload);
  if (xabar) return xato(400, xabar);

  const numberId = typeof kirish.numberId === 'string' ? kirish.numberId.slice(0, 80) : '';
  const live = !!kirish.live;
  const sorovId = typeof kirish.sorovId === 'string' ? kirish.sorovId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) : '';

  try {
    /* TAKRORLANISHNI TO'XTATISH: javob yo'lda yo'qolib, brauzer qayta
       yuborgan bo'lsa — eski buyurtmaning ID'sini qaytaramiz. */
    if (sorovId) {
      const bor = await db.collection('orders').where('sorovId', '==', sorovId).limit(1).get();
      if (!bor.empty) {
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, orderId: bor.docs[0].id, takror: true }) };
      }
    }

    const yozuv = Object.assign({}, payload, {
      status: 'Yangi',
      createdAt: payload.createdAt || new Date().toLocaleString('uz-UZ'),
      createdAtSort: Date.now()
    });
    if (sorovId) yozuv.sorovId = sorovId;

    const yangiRef = db.collection('orders').doc();

    if (numberId && !live) {
      yozuv.numberId = numberId;
      const raqamRef = db.collection('numbers').doc(numberId);
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(raqamRef);
          if (snap.exists && snap.data().reserved === true) {
            const e = new Error('ALREADY_RESERVED'); e.band = true; throw e;
          }
          tx.set(yangiRef, yozuv);
          tx.update(raqamRef, { reserved: true, reservedAt: admin.firestore.FieldValue.serverTimestamp() });
        });
      } catch (e) {
        if (e && e.band) {
          return { statusCode: 409, headers: CORS, body: JSON.stringify({ ok: false, band: true, error: 'Bu raqam allaqachon band qilindi' }) };
        }
        /* Raqamni band qilib bo'lmadi (masalan hujjat o'chirilgan) —
           LEKIN BUYURTMANI YO'QOTMAYMIZ: uni baribir yozamiz. Admin
           ro'yxatda ko'radi va qo'lda hal qiladi. Mijoz uchun eng
           yomoni — buyurtmasi umuman yo'qolishi. */
        await yangiRef.set(yozuv);
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, orderId: yangiRef.id, bandQilinmadi: true }) };
      }
    } else {
      /* "Jonli" (operator bazasidan kelgan) raqam — bizning bazada
         hujjati yo'q, shuning uchun band qilish `live_reservations`
         to'plamida raqamning o'zi bo'yicha amalga oshiriladi. Shu
         sababli bitta jonli raqamga ikki kishi buyurtma bera olmaydi. */
      yozuv.numberId = null;
      const kalit = String(payload.number || '').replace(/\D/g, '');
      if (kalit) {
        const qulfRef = db.collection('live_reservations').doc(kalit);
        try {
          await db.runTransaction(async (tx) => {
            const qulf = await tx.get(qulfRef);
            if (qulf.exists) { const e = new Error('ALREADY_RESERVED'); e.band = true; throw e; }
            tx.set(yangiRef, yozuv);
            tx.set(qulfRef, { reservedAt: admin.firestore.FieldValue.serverTimestamp() });
          });
        } catch (e) {
          if (e && e.band) {
            return { statusCode: 409, headers: CORS, body: JSON.stringify({ ok: false, band: true, error: 'Bu raqam allaqachon band qilindi' }) };
          }
          /* Qulf qo'yilmadi — buyurtmani BARIBIR yozamiz. */
          await yangiRef.set(yozuv);
          return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, orderId: yangiRef.id, bandQilinmadi: true }) };
        }
      } else {
        await yangiRef.set(yozuv);
      }
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, orderId: yangiRef.id }) };
  } catch (err) {
    console.error('API-BUYURTMA XATOSI:', err);
    return xato(500, "Buyurtma saqlanmadi. Biroz o'tib qayta urinib ko'ring.");
  }
};
