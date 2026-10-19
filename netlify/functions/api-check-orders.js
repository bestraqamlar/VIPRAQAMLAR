// MOBIL ILOVA UCHUN OCHIQ API — mijoz o'z buyurtmalari holatini
// tekshirishi uchun. Xavfsizlik uchun IKKI OMIL talab qilinadi: telefon
// raqami + sotib olgan raqamning oxirgi 4 raqami (xuddi saytdagi
// "Buyurtmalarim" bo'limi kabi) — shunda kimdir faqat telefon raqamini
// bilib, boshqa birovning ma'lumotini ko'ra olmaydi.
//
// Chaqirish: POST /.netlify/functions/api-check-orders
// Sarlavha:  x-api-key: <MOBILE_API_KEY>
//
// So'rov tanasi:
// { "phone": "901234567", "lastDigits": "1234" }
//
// Javob:
// { "ok": true, "orders": [ { "number": "...", "price": ..., "status": "...", ... } ] }
// yoki: { "ok": false, "error": "Ma'lumot topilmadi" }

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
const { tezlikOk } = require('./lib/tezlik');
db.settings({ preferRest: true });

function checkApiKey(event) {
  const expected = process.env.MOBILE_API_KEY;
  /* XAVFSIZLIK (V73): ilgari kalit sozlanmagan bo'lsa funksiya BUTUNLAY
     ochiq qolardi ("fail-open") — ya'ni mobil API'ning hamma yo'llari
     (buyurtma/shartnoma qidirish ham) hammaga ochiq edi. Endi aksincha:
     kalit yo'q bo'lsa — yopiq. Mobil ilovani ishlatish uchun Netlify'da
     MOBILE_API_KEY o'zgaruvchisini qo'ying (sayt bunga bog'liq emas). */
  if (!expected) return false;
  const provided = (event.headers && (event.headers['x-api-key'] || event.headers['X-Api-Key'])) || '';
  return provided === expected;
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST so\'rovlariga ruxsat berilgan' }) };
  }
  if (!checkApiKey(event)) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri yoki yo\'q API kalit (x-api-key)' }) };
  }
  if (!(await tezlikOk(db, event, 'order_api_rate_limits', 60))) {
    return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: "Juda ko'p so'rov. Birozdan keyin urinib ko'ring." }) };
  }

  try {
    const { phone, lastDigits } = JSON.parse(event.body || '{}');
    const numVal = String(phone || '').replace(/\D/g, '');
    const last4 = String(lastDigits || '').replace(/\D/g, '');

    const notFound = { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi. Raqamlarni tekshiring." }) };

    if (!numVal || numVal.length < 9) return notFound;
    if (!last4 || last4.length !== 4) return notFound;
    const last9 = numVal.slice(-9);

    const snap = await db.collection('orders').orderBy('createdAtSort', 'desc').limit(3000).get();
    const ownedOrders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(o => (o.phone || '').replace(/\D/g, '').slice(-9) === last9);

    const hasMatchingNumber = ownedOrders.some(o => (o.number || '').replace(/\D/g, '').slice(-4) === last4);
    if (!hasMatchingNumber) return notFound;

    const matches = ownedOrders.slice(0, 30).map(o => ({
      number: o.number || '',
      price: o.price || 0,
      status: o.status || 'Yangi',
      createdAt: o.createdAt || '',
      paymentType: o.paymentType || 'cash',
      installmentMonths: o.installmentMonths || null,
      monthlyPayment: o.monthlyPayment || null
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, orders: matches }) };
  } catch (err) {
    console.error('api-check-orders xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
