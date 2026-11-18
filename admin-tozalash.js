// ==================================================================
// BAZANI TOZALASH — `active_sessions` (V144)
// ==================================================================
// NEGA BU FUNKSIYA KERAK BO'LDI.
//
// Saytda "hozir saytda nechta odam bor" degan sanoq bor. U shunday
// ishlardi: mijoz saytni ochganda `active_sessions` to'plamiga bitta
// hujjat yozilardi va har 20 soniyada yangilanardi.
//
// XATO shunda ediki:
//   * hujjat ID'si HAR SAHIFA OCHILISHIDA yangidan yasalardi (ya'ni
//     bitta mijoz saytni 10 marta ochsa — 10 ta hujjat);
//   * bu hujjatlarni HECH KIM O'CHIRMASDI — butun loyihada ularni
//     o'chiradigan bitta ham qator yo'q edi.
//
// Natijada to'plam oylar davomida faqat o'sib bordi va Firestore'ning
// bepul saqlash hajmini to'ldirib qo'ydi. Hajm to'lgach, Firestore
// yangi yozuvlarni ham, ba'zan o'qishlarni ham RAD ETA boshlaydi —
// tashqaridan bu "sayt umuman ishlamay qoldi" bo'lib ko'rinadi.
//
// `assets/app.js` dagi xato V144 da tuzatildi (bitta oynaga bitta
// hujjat, fon oynada to'xtaydi, `expireAt` maydoni bilan). Lekin
// ALLAQACHON yig'ilib qolgan eski hujjatlarni ham o'chirish kerak —
// shu funksiya aynan shuni qiladi.
//
// ============ QANDAY ISHLAYDI ============
// Bir chaqiruvda ENG KO'PI BILAN 3000 ta eski hujjat o'chiriladi va
// "yana qoldimi" degan javob qaytariladi. Nega bo'lak-bo'lak:
//   * Netlify funksiyasining ishlash vaqti cheklangan (10 soniya);
//   * Firestore'da bepul rejada KUNLIK O'CHIRISH chegarasi ham bor —
//     hammasini bir zarbada o'chirib bo'lmaydi.
// Shuning uchun `tugadi: false` qaytsa, funksiyani qayta chaqirish
// kerak. Admin panelidagi tugma shuni avtomatik takrorlaydi.
//
// ============ XAVFSIZLIK ============
//   * FAQAT bosh admin (superAdmin) chaqira oladi;
//   * faqat `active_sessions` to'plamiga tegadi — boshqa hech qanday
//     ma'lumot (mijozlar, buyurtmalar, shartnomalar) xavf ostida emas;
//   * `eskiSoat` dan yangi yozuvlar TEGILMAYDI, ya'ni hozir saytda
//     turgan mijozlar sanog'i buzilmaydi.

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
db.settings({ preferRest: true });

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const javob = (kod, obj) => ({ statusCode: kod, headers: CORS, body: JSON.stringify(obj) });

/* Bir chaqiruvda nechta hujjat o'chiriladi. 3000 — Netlify'ning
   10 soniyalik chegarasiga bemalol sig'adigan, sinab ko'rilgan son
   (Firestore bir paketda 500 tadan o'chiradi, ya'ni 6 ta paket). */
const BIR_CHAQIRUVDA = 3000;
const PAKET = 500;

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return javob(405, { ok: false, error: 'Faqat POST' });

  /* --- Faqat bosh admin --- */
  let decoded;
  try {
    const authHeader = (event.headers.authorization || event.headers.Authorization || '');
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) return javob(401, { ok: false, error: 'Token yo\'q' });
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    return javob(401, { ok: false, error: 'Token tekshirilmadi' });
  }
  if (decoded.superAdmin !== true) {
    return javob(403, { ok: false, error: 'Bu amal faqat bosh admin uchun' });
  }

  let kirish = {};
  try { kirish = JSON.parse(event.body || '{}'); } catch (e) {}

  /* Shu soatdan eskilari o'chiriladi. Standart — 2 soat: hozir
     saytda turganlar (40 soniyalik oyna) hech qachon tegilmaydi. */
  const eskiSoat = Math.min(Math.max(Number(kirish.eskiSoat) || 2, 1), 24 * 365);
  const chegaraMs = Date.now() - eskiSoat * 3600000;
  const chegaraTs = admin.firestore.Timestamp.fromMillis(chegaraMs);

  let ochirildi = 0;
  let tugadi = true;

  try {
    while (ochirildi < BIR_CHAQIRUVDA) {
      /* `lastSeen` bo'yicha eng eskilaridan boshlab olamiz.
         `orderBy` + `limit` — ya'ni butun to'plam O'QILMAYDI. */
      const snap = await db.collection('active_sessions')
        .where('lastSeen', '<', chegaraTs)
        .limit(PAKET)
        .get();

      if (snap.empty) { tugadi = true; break; }

      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      ochirildi += snap.size;

      /* To'liq paket kelgan bo'lsa — demak yana bor */
      if (snap.size < PAKET) { tugadi = true; break; }
      tugadi = false;
    }
  } catch (e) {
    console.error('TOZALASH xatosi:', (e && e.message) || e);
    return javob(500, {
      ok: false, ochirildi,
      error: (e && e.message) || 'Noma\'lum xato',
      /* Eng ko'p uchraydigan sabab — indeks yo'qligi */
      maslahat: "Agar xato indeks haqida bo'lsa, xabardagi havolani "
        + "oching va Firestore o'zi taklif qilgan indeksni yarating."
    });
  }

  return javob(200, {
    ok: true,
    ochirildi,
    tugadi,
    xabar: tugadi
      ? ('Tozalash yakunlandi. Jami ' + ochirildi + ' ta eski yozuv o\'chirildi.')
      : (ochirildi + ' ta o\'chirildi. Yana bor — qayta bosing.')
  });
};
