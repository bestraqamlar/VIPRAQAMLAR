// TELEGRAM MINI ILOVA ("telegram-ilova.html") UCHUN — "Buyurtmalarim"
// bo'limida mijozdan ENDI telefon raqami VA oxirgi 4 raqam SO'RALMAYDI.
// Sabab: mijoz Telegram ichida allaqachon O'Z PROFILIGA kirib turibdi —
// Telegram'ning o'zi mijozni ANIQLAB BERADI (initData orqali), shu sabab
// qo'shimcha so'rov ortiqcha va noqulay. Bu funksiya Telegram'ning rasmiy
// tekshiruv algoritmi bilan initData'ni SERVERDA tasdiqlaydi (soxta
// initData bilan boshqa birovning buyurtmasini "ko'rish" imkonsiz bo'lsin
// uchun) va faqat SHU (haqiqiy, tasdiqlangan) foydalanuvchiga tegishli
// buyurtmalarni qaytaradi.
//
// Chaqirish: POST /.netlify/functions/check-my-orders-telegram
// So'rov tanasi: { "initData": "<Telegram.WebApp.initData>" }
// Javob: { ok:true, orders:[...] } yoki { ok:false, error:"..." }

const crypto = require('crypto');
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

// Telegram Mini App'lar uchun RASMIY tekshirish algoritmi:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// secret_key = HMAC_SHA256(key="WebAppData", data=BOT_TOKEN)
// hash'siz qolgan hamma maydonlar alifbo tartibida "key=value\n" qilib
// birlashtiriladi, keyin shu satr secret_key bilan HMAC_SHA256 qilinadi —
// natija Telegram yuborgan "hash" bilan AYNAN mos kelishi kerak.
function verifyTelegramInitData(initData){
  try{
    if(!initData || typeof initData !== 'string' || initData.length > 8192) return null;
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if(!token) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if(!hash) return null;
    params.delete('hash');
    const pairs = [];
    for(const [key, value] of params.entries()) pairs.push(key + '=' + value);
    pairs.sort();
    const dataCheckString = pairs.join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if(computedHash !== hash) return null;

    // Eskirgan (masalan ilgari "ushlab qolingan") initData bilan qayta
    // urinishning oldini olish — 24 soatdan eski bo'lsa rad etiladi.
    const authDate = Number(params.get('auth_date') || 0);
    if(!authDate || (Date.now() / 1000 - authDate) > 86400) return null;

    const userRaw = params.get('user');
    if(!userRaw) return null;
    const user = JSON.parse(userRaw);
    if(!user || !user.id) return null;
    return String(user.id);
  }catch(e){
    return null;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try{
    const { initData } = JSON.parse(event.body || '{}');
    const telegramUserId = verifyTelegramInitData(initData);
    if(!telegramUserId){
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Telegram orqali tasdiqlab bo'lmadi" }) };
    }

    const snap = await db.collection('orders').where('telegramUserId', '==', telegramUserId).limit(50).get();
    const ownedOrders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAtSort || 0) - (a.createdAtSort || 0));

    const matches = ownedOrders.slice(0, 30).map(o => ({
      number: o.number || '',
      price: o.price || 0,
      status: o.status || 'Yangi',
      createdAt: o.createdAt || '',
      paymentType: o.paymentType || 'cash',
      installmentMonths: o.installmentMonths || null,
      monthlyPayment: o.monthlyPayment || null,
      cashTariffName: o.cashTariffName || null,
      cashTariffPrice: o.cashTariffPrice || null
    }));

    return { statusCode: 200, body: JSON.stringify({ ok: true, orders: matches }) };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
