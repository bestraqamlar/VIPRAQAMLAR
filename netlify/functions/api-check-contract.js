// MOBIL ILOVA UCHUN OCHIQ API — "Shartnomalarim" (bo'lib to'lash
// shartnomasi holatini tekshirish). Xavfsizlik uchun IKKI OMIL talab
// qilinadi: shartnoma ID'si + mijozning telefon raqami — shu ikkalasi
// TO'G'RI kelsagina ma'lumot qaytariladi. Shartnoma ID'lari ketma-ket
// (KR001, KR002...) bo'lgani uchun, faqat ID orqali qidirishga ruxsat
// berilmaydi — aks holda kimdir barcha ID'larni "sinab", boshqa
// mijozlarning ismi/telefoni/to'lov tarixini ko'rishi mumkin bo'lardi.
//
// Chaqirish: POST /.netlify/functions/api-check-contract
// Sarlavha:  x-api-key: <MOBILE_API_KEY>
//
// So'rov tanasi:
// { "contractId": "KR001", "phone": "901234567" }
//
// Javob (topilsa):
// {
//   "ok": true,
//   "data": {
//     "customerName": "Aziz Karimov",
//     "number": "+998901234567",
//     "totalMonths": 12,
//     "monthlyPayment": 500000,
//     "contractStatus": "active",
//     "payments": [ { "month": 1, "paid": true, "dueDate": "..." }, ... ]
//   }
// }
//
// Javob (topilmasa):
// { "ok": false, "error": "Ma'lumot topilmadi. ID va raqamni tekshiring." }

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
  if (!expected) return true;
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
    const { contractId, phone } = JSON.parse(event.body || '{}');
    const idVal = String(contractId || '').trim().toUpperCase();
    const numVal = String(phone || '').replace(/\D/g, '');

    // Bir xil, umumiy xato xabari — ID topilmagan yoki ID topilib
    // raqam mos kelmagan holatlarni FARQLAB bo'lmasligi kerak.
    const notFound = { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi. ID va raqamni tekshiring." }) };

    if (!idVal || !numVal || numVal.length < 9) return notFound;

    const doc = await db.collection('credit_contracts').doc(idVal).get();
    if (!doc.exists) return notFound;

    const data = doc.data();
    const docNumDigits = (data.number || '').replace(/\D/g, '');
    if (!docNumDigits.endsWith(numVal.slice(-9))) return notFound;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: {
          customerName: data.customerName || '',
          number: data.number || '',
          totalMonths: data.totalMonths || 0,
          monthlyPayment: data.monthlyPayment || 0,
          contractStatus: data.contractStatus || 'active',
          payments: data.payments || []
        }
      })
    };
  } catch (err) {
    console.error('api-check-contract xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
