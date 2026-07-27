// SMS TASDIQLASH KODINI TEKSHIRISH.
//
// Chaqirish: POST /.netlify/functions/verify-sms-code
// So'rov: { "phone": "998901234567", "code": "1234" }
// Javob: { "ok": true } yoki { "ok": false, "error": "..." }

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

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  try {
    const { phone, code } = JSON.parse(event.body || '{}');
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 9 ? '998' + cleanPhone : cleanPhone;
    const codeVal = String(code || '').trim();

    if (!codeVal || codeVal.length !== 4) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "Kod noto'g'ri" }) };
    }

    const ref = db.collection('sms_verifications').doc(fullPhone);
    const doc = await ref.get();
    if (!doc.exists) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Avval kod so\'rang' }) };
    }

    const data = doc.data();

    // XAVFSIZLIK: 5 martadan ortiq noto'g'ri urinish bo'lsa, kod bekor
    // qilinadi — kodni "taxmin qilib topish" (brute-force)ning oldini oladi.
    if ((data.attempts || 0) >= 5) {
      await ref.delete();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "Urinishlar tugadi. Qayta kod so'rang." }) };
    }

    if (Date.now() > data.expiresAt) {
      await ref.delete();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "Kod muddati tugagan. Qayta so'rang." }) };
    }

    if (data.code !== codeVal) {
      await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: "Kod noto'g'ri" }) };
    }

    await ref.delete(); // muvaffaqiyatli — kod bir martalik, endi kerak emas
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('verify-sms-code xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
