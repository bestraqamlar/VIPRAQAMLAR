// MIJOZ SAYTDA "Buyurtmalarim" bo'limida telefon raqamini kiritganda ishlaydi.
// Telefon raqami bo'yicha shu mijozning barcha buyurtmalarini topib beradi.
//
// XAVFSIZLIK: telefon raqami yolg'iz o'zi "sir" emas — ko'p odam bir-birining
// raqamini biladi. Shu sababli faqat telefon bilan qidirish YETARLI EMAS edi
// (kimdir boshqa birovning raqamini bilib, uning sotib olgan raqami/narxini
// ko'rishi mumkin edi). Endi "Shartnomalarim" bo'limidagi kabi IKKINCHI omil
// ham talab qilinadi: mijoz sotib olgan (yoki buyurtma bergan) raqamning
// OXIRGI 4 RAQAMI. Faqat ikkalasi ham to'g'ri kelsagina natija qaytariladi.

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
async function verifyAppCheckStrict(event){
  const token = (event.headers && (event.headers['x-firebase-appcheck'] || event.headers['X-Firebase-AppCheck'])) || '';
  if(!token) return false; // MAJBURIY: token bo'lmasa — RAD ETILADI
  try{
    await admin.appCheck().verifyToken(token);
    return true;
  }catch(e){
    return false;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if(!(await verifyAppCheckStrict(event))){
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q" }) };
  }

  try{
    const { phone, lastDigits } = JSON.parse(event.body || '{}');
    const numVal = String(phone || '').replace(/\D/g, '');
    const last4 = String(lastDigits || '').replace(/\D/g, '');

    const notFound = { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi. Raqamlarni tekshiring." }) };

    if(!numVal || numVal.length < 9) return notFound;
    if(!last4 || last4.length !== 4) return notFound;
    const last9 = numVal.slice(-9);

    const snap = await db.collection('orders').orderBy('createdAtSort', 'desc').limit(3000).get();
    const ownedOrders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => (o.phone || '').replace(/\D/g, '').slice(-9) === last9);

    // Ikkinchi omil: shu telefonga tegishli buyurtmalar ICHIDA, kamida
    // BITTASINING raqami aynan shu 4 raqam bilan tugashi shart — aks holda
    // hech narsa qaytarilmaydi (ID topildi/topilmadi farqini bildirmaymiz).
    const hasMatchingNumber = ownedOrders.some(o => (o.number || '').replace(/\D/g, '').slice(-4) === last4);
    if(!hasMatchingNumber) return notFound;

    const matches = ownedOrders
      .slice(0, 30)
      .map(o => ({
        number: o.number || '',
        price: o.price || 0,
        status: o.status || 'Yangi',
        createdAt: o.createdAt || '',
        paymentType: o.paymentType || 'cash',
        installmentMonths: o.installmentMonths || null,
        monthlyPayment: o.monthlyPayment || null
      }));

    return { statusCode: 200, body: JSON.stringify({ ok: true, orders: matches }) };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
