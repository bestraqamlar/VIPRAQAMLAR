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

// XAVFSIZLIK: yuqoridagi kunlik/daqiqalik chegara faqat BITTA telefon
// raqamiga nisbatan ishlaydi — u bitta mijoz (bitta IP) KO'PLAB TURLI
// telefon raqamlariga SMS yuborishidan (masalan boshqa odamlarni bezovta
// qilish yoki Eskiz balansini tugatish uchun) HIMOYA QILMAYDI. Shu sabab
// bu yerga QO'SHIMCHA, IP manzili bo'yicha soatlik umumiy chegara
// qo'shildi — xuddi shu (Firestore hisoblagich hujjati) naqsh bilan.
// MUHIM (mijoz xabar bergan "ko'p mijoz SMS kod bilan buyurtma
// berolmayapti" muammosini tekshirganda topildi): O'zbekistondagi mobil
// operatorlar (Beeline, Ucell, Uzmobile va h.k.) ko'pincha "CGNAT"
// texnologiyasidan foydalanadi — bitta IP manzil ORQALI BIR VAQTDA
// YUZLAB, hatto MINGLAB turli mijozlar internetga chiqadi. Avvalgi
// chegara (15/soat) juda past edi — bir nechta mijoz aynan shu daqiqada
// SMS so'rasa, o'sha IP ORTIDAGI BOSHQA, umuman aloqasi yo'q mijozlar
// ham "juda ko'p urinish" xatosiga uchrab, SMS ololmay qolishi mumkin
// edi (garchi bu SMS'siz ham buyurtma davom etsa-da, tasdiqlashsiz
// qolish ishonchni pasaytiradi). Chegara ancha yuqoriga ko'tarildi —
// haqiqiy suiiste'molni baribir to'xtatadi, lekin CGNAT ortidagi oddiy
// mijozlarga deyarli ta'sir qilmaydi.
const IP_HOURLY_LIMIT = 60;
async function checkIpRateLimit(event) {
  const ip = (event.headers && (
    event.headers['x-nf-client-connection-ip']
    || event.headers['client-ip']
    || ((event.headers['x-forwarded-for'] || '').split(',')[0].trim())
  )) || 'unknown';
  const hourKey = new Date().toISOString().slice(0, 13);
  const rateLimitRef = db.collection('sms_verifications_ip').doc(ip.replace(/[^\w.:-]/g, '_') || 'unknown');
  const snap = await rateLimitRef.get();
  let count = 0;
  if (snap.exists) {
    const data = snap.data();
    if (data.hourKey === hourKey) count = data.count || 0;
  }
  if (count >= IP_HOURLY_LIMIT) return false;
  await rateLimitRef.set({ hourKey, count: count + 1, lastAttemptAt: Date.now() });
  return true;
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
    if (!(await checkIpRateLimit(event))) {
      return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: "Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring." }) };
    }
    // Eskiz formatida: 998 bilan boshlanadigan 12 xonali raqam
    const fullPhone = cleanPhone.length === 9 ? '998' + cleanPhone : cleanPhone;

    // XAVFSIZLIK: bitta raqamga daqiqasiga faqat 1 marta kod yuboriladi —
    // suiiste'mol (ko'p SMS so'rab, xarajatni oshirish)ning oldini olish uchun.
    // QO'SHIMCHA: kuniga bitta raqamga yuboriladigan SMS soni ham
    // cheklandi — aks holda kimdir boshqa odamning raqamiga har daqiqada
    // (kuniga ~1440 marta) pullik SMS yuborib, ham uni bezovta qilishi,
    // ham Eskiz balansini sarflab yuborishi mumkin edi.
    const DAILY_LIMIT = 8;
    const todayKey = new Date().toISOString().slice(0, 10);
    const rateLimitRef = db.collection('sms_verifications').doc(fullPhone);
    const existing = await rateLimitRef.get();
    let dayCount = 0;
    if (existing.exists) {
      const data = existing.data();
      if (data.sentAt && (Date.now() - data.sentAt) < 60000) {
        return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: '1 daqiqada faqat 1 marta so\'rash mumkin. Biroz kuting.' }) };
      }
      if (data.dayKey === todayKey) dayCount = data.dayCount || 0;
      if (dayCount >= DAILY_LIMIT) {
        return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: "Bu raqamga bugun ruxsat etilgan SMS soni tugadi. Ertaga qayta urinib ko'ring yoki qo'llab-quvvatlash xizmatiga murojaat qiling." }) };
      }
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    // MUHIM (mijoz xabar bergan "sms kod bilan bog'liq" muammoni
    // tekshirganda topildi): avval 5 daqiqa edi — Eskiz.uz SMS'ni ba'zan
    // (ayniqsa peak vaqtlarda) 1-3 daqiqa kechikib yetkazadi, mijoz
    // xabarni ochib kodni yozguncha 5 daqiqa ba'zan yetarli bo'lmagan
    // (ayniqsa xarita/tarif kabi qo'shimcha qadamlarda vaqt ketgan
    // bo'lsa). 10 daqiqaga oshirildi — xavfsizlikka deyarli ta'sir
    // qilmaydi (kod baribir bir martalik va 5 urinishdan keyin bekor
    // bo'ladi), lekin haqiqiy mijozlarga ancha ko'proq nafas oladi.
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 daqiqa

    await rateLimitRef.set({
      code, expiresAt, sentAt: Date.now(), attempts: 0,
      dayKey: todayKey, dayCount: dayCount + 1
    });

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
