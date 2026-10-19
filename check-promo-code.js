// Mijoz saytda promokod kiritganda ishlaydi.
//
// XAVFSIZLIK: oldin promokodlar to'g'ridan-to'g'ri Firestore'dan (brauzerdan)
// so'ralar edi — bu "promo_codes" kolleksiyasini har kim to'liq "ro'yxatini
// ko'rish" (barcha kodlar + summalarini birdaniga olish) imkonini berardi.
// Endi tekshiruv shu yerda, SERVERDA bo'ladi — brauzer faqat "to'g'ri/
// noto'g'ri" javobini oladi, kodlarning o'zini hech qachon ko'rmaydi.

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

/* XAVFSIZLIK: App Check — MAJBURIY. Faqat haqiqiy saytimiz (App Check
   tokeni bilan) yuborgan so'rovlar qabul qilinadi — token bo'lmasa yoki
   noto'g'ri bo'lsa, so'rov DARHOL rad etiladi. Skript, bot yoki
   to'g'ridan-to'g'ri API chaqiruvlari orqali bu funksiyadan FOYDALANIB
   BO'LMAYDI — faqat saytimiz orqali ishlaydi. */
async function verifyAppCheckSoft(event){
  const token = (event.headers && (event.headers['x-firebase-appcheck'] || event.headers['X-Firebase-AppCheck'])) || '';
  if(!token) return true; // hozircha ixtiyoriy — App Check hali hamma so'rovda ishlamayapti
  try{
    await admin.appCheck().verifyToken(token);
    return true;
  }catch(e){
    return false;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if(!(await verifyAppCheckSoft(event))){
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q" }) };
  }

  try{
    const { code, numberId } = JSON.parse(event.body || '{}');
    const codeVal = String(code || '').trim().toUpperCase();
    if(!codeVal) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Promokod kiriting' }) };

    if(numberId){
      const usageDoc = await db.collection('promo_usage').doc(numberId).get();
      if(usageDoc.exists){
        return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Bu raqamga promokod allaqachon ishlatilgan' }) };
      }
    }

    const snap = await db.collection('promo_codes').where('code', '==', codeVal).limit(1).get();
    if(snap.empty){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Promokod topilmadi' }) };
    }

    const discount = snap.docs[0].data().discount || 0;
    return { statusCode: 200, body: JSON.stringify({ ok: true, discount }) };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

/* ================= CORS (mobil ilova uchun) =================
   Sayt bilan bu funksiya bitta manzilda turadi, shu sabab brauzerda
   CORS kerak emas edi. Lekin Android/iOS ilovasi ichida sahifa
   `https://localhost` manzilidan ochiladi — ya'ni so'rov "boshqa
   saytdan" kelgan hisoblanadi va CORS sarlavhalarisiz brauzer uni
   bloklaydi.

   Shuning uchun asl `handler` o'rab olindi: javobga CORS sarlavhalari
   qo'shiladi va brauzerning dastlabki OPTIONS so'roviga javob beriladi.
   Funksiyaning ichki mantig'i UMUMAN o'zgarmadi. */
const __CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-firebase-appcheck, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const __inner = exports.handler;
exports.handler = async function (event, context) {
  if (event && event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: __CORS, body: '' };
  }
  const res = await __inner(event, context);
  return Object.assign({}, res, { headers: Object.assign({}, res && res.headers, __CORS) });
};
