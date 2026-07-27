// SMS TASDIQLASH KODINI YUBORISH (Eskiz.uz orqali).
//
// Ishlash tartibi:
//  1) Mijoz telefon raqamini kiritadi.
//  2) Tizim 4 xonali tasodifiy kod yaratadi.
//  3) Kod Firestore'ga 5 daqiqaga (muddati bilan) saqlanadi.
//  4) Eskiz.uz orqali SMS yuboriladi.
//
// Chaqirish: POST /.netlify/functions/send-sms-code
// So'rov: { "phone": "998901234567" }
// Javob: { "ok": true } yoki { "ok": false, "error": "..." }
//
// MUHIM: ESKIZ_EMAIL va ESKIZ_PASSWORD — Netlify muhit
// o'zgaruvchilarida saqlanadi, kodda hech qachon ko'rinmaydi.

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

let cachedToken = null;
let tokenFetchedAt = 0;

async function getEskizToken() {
  // Tokenni 25 kun davomida qayta ishlatamiz (Eskiz 30 kunga beradi) —
  // har safar qayta so'ramaslik uchun.
  const TOKEN_TTL = 25 * 24 * 60 * 60 * 1000;
  if (cachedToken && (Date.now() - tokenFetchedAt) < TOKEN_TTL) return cachedToken;

  const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ESKIZ_EMAIL,
      password: process.env.ESKIZ_PASSWORD
    })
  });
  const data = await res.json();
  if (!data.data || !data.data.token) {
    throw new Error('Eskiz token olinmadi: ' + JSON.stringify(data));
  }
  cachedToken = data.data.token;
  tokenFetchedAt = Date.now();
  return cachedToken;
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
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  try {
    const { phone } = JSON.parse(event.body || '{}');
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Telefon raqam noto'g'ri" }) };
    }
    // Eskiz formatida: 998 bilan boshlanadigan 12 xonali raqam
    const fullPhone = cleanPhone.length === 9 ? '998' + cleanPhone : cleanPhone;

    // XAVFSIZLIK: bitta raqamga daqiqasiga faqat 1 marta kod yuboriladi —
    // suiiste'mol (ko'p SMS so'rab, xarajatni oshirish)ning oldini olish uchun.
    const rateLimitRef = db.collection('sms_verifications').doc(fullPhone);
    const existing = await rateLimitRef.get();
    if (existing.exists) {
      const data = existing.data();
      if (data.sentAt && (Date.now() - data.sentAt) < 60000) {
        return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: '1 daqiqada faqat 1 marta so\'rash mumkin. Biroz kuting.' }) };
      }
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 daqiqa

    await rateLimitRef.set({ code, expiresAt, sentAt: Date.now(), attempts: 0 });

    const token = await getEskizToken();
    const smsRes = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        mobile_phone: fullPhone,
        message: `VIP RAQAMLAR: tasdiqlash kodingiz — ${code}`,
        from: '4546'
      })
    });
    const smsData = await smsRes.json();
    if (smsData.status !== 'success' && smsData.status !== 'waiting') {
      console.error('Eskiz SMS xato:', smsData);
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'SMS yuborilmadi' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('send-sms-code xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
