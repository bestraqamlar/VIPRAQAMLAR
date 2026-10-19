// MOBIL ILOVA UCHUN OCHIQ API — promokod tekshirish.
// Kod haqiqiyligini tekshiradi va faqat "to'g'ri/noto'g'ri + chegirma"
// javobini beradi — ilova hech qachon barcha promokodlar ro'yxatini
// ko'rmaydi.
//
// Chaqirish: POST /.netlify/functions/api-check-promo
// Sarlavha:  x-api-key: <MOBILE_API_KEY>
//
// So'rov tanasi:
// { "code": "VIP2026", "numberId": "abc123" }   // numberId ixtiyoriy
//
// Javob:
// { "ok": true, "discount": 10 }
// yoki: { "ok": false, "error": "Promokod topilmadi" }

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

  try {
    const { code, numberId } = JSON.parse(event.body || '{}');
    const codeVal = String(code || '').trim().toUpperCase();
    if (!codeVal) return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Promokod kiriting' }) };

    if (numberId) {
      const usageDoc = await db.collection('promo_usage').doc(numberId).get();
      if (usageDoc.exists) {
        return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Bu raqamga promokod allaqachon ishlatilgan' }) };
      }
    }

    const snap = await db.collection('promo_codes').where('code', '==', codeVal).limit(1).get();
    if (snap.empty) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Promokod topilmadi' }) };
    }

    const discount = snap.docs[0].data().discount || 0;
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, discount }) };
  } catch (err) {
    console.error('api-check-promo xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
