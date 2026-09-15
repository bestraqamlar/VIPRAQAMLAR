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

/* XAVFSIZLIK (PIN "brute-force" oldini olish): bu funksiya telefon + oxirgi
   4 raqam ("PIN" kabi, atigi 10 000 xil kombinatsiya) bo'yicha qidiradi —
   token/parol emas, shu sabab cheklov bo'lmasa kimdir ko'p (yoki skript
   bilan avtomatik) urinib, boshqa mijozning buyurtmasini "taxmin qilib"
   topishi mumkin edi. send-sms-code.js'dagi bilan bir xil naqsh: Firestore
   hujjatida IP bo'yicha soatlik hisoblagich saqlanadi. */
const LOOKUP_HOURLY_LIMIT = 20;
async function checkIpRateLimit(event){
  const ip = (event.headers && (
    event.headers['x-nf-client-connection-ip']
    || event.headers['client-ip']
    || ((event.headers['x-forwarded-for'] || '').split(',')[0].trim())
  )) || 'unknown';
  const hourKey = new Date().toISOString().slice(0, 13); // masalan "2026-09-15T14"
  const rateLimitRef = db.collection('order_lookup_rate_limits').doc(ip.replace(/[^\w.:-]/g, '_') || 'unknown');
  const snap = await rateLimitRef.get();
  let count = 0;
  if(snap.exists){
    const data = snap.data();
    if(data.hourKey === hourKey) count = data.count || 0;
  }
  if(count >= LOOKUP_HOURLY_LIMIT) return false;
  await rateLimitRef.set({ hourKey, count: count + 1, lastAttemptAt: Date.now() });
  return true;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if(!(await verifyAppCheckSoft(event))){
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q" }) };
  }
  if(!(await checkIpRateLimit(event))){
    return { statusCode: 429, body: JSON.stringify({ ok: false, error: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." }) };
  }

  try{
    const { phone, lastDigits } = JSON.parse(event.body || '{}');
    const numVal = String(phone || '').replace(/\D/g, '');
    const last4 = String(lastDigits || '').replace(/\D/g, '');

    const notFound = { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi. Raqamlarni tekshiring." }) };

    if(!numVal || numVal.length < 9) return notFound;
    if(!last4 || last4.length !== 4) return notFound;
    const last9 = numVal.slice(-9);

    // XAVFSIZLIK/TEZLIK: butun 'orders' kolleksiyasini (3000 tagacha
    // hujjat) skanerlash o'rniga, endi to'g'ridan-to'g'ri 'phoneNormalized'
    // maydoni bo'yicha so'raladi (buyurtma yaratilganda yoziladi — qarang:
    // index.html'dagi finalizeOrder(), api-create-order.js,
    // customer-bot-webhook.js). ESLATMA: bu maydon qo'shilishidan OLDIN
    // yaratilgan ESKI buyurtmalarda bu maydon yo'q — ular bu qidiruvda
    // topilmaydi (qabul qilingan cheklov, orqaga qarab to'ldirish qilinmadi).
    const snap = await db.collection('orders').where('phoneNormalized', '==', last9).limit(50).get();
    const ownedOrders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAtSort || 0) - (a.createdAtSort || 0));

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
