// MOBIL ILOVA UCHUN OCHIQ API — mijoz ilova orqali buyurtma bersa,
// aynan saytdagi kabi ishlaydi: buyurtma bazaga yoziladi, raqam "band"
// qilinadi, va admin botiga (Telegram) darhol xabar boradi.
//
// Chaqirish: POST /.netlify/functions/api-create-order
// Sarlavha:  x-api-key: <MOBILE_API_KEY muhit o'zgaruvchisi qiymati>
//            Content-Type: application/json
//
// So'rov tanasi (JSON):
// {
//   "numberId": "abc123",      // MAJBURIY — api-numbers dan olingan "id"
//   "name": "Aziz Karimov",    // MAJBURIY
//   "phone": "901234567",      // MAJBURIY — mijozning HOZIRGI ishlatayotgan raqami
//   "region": "Toshkent shahri", // MAJBURIY
//   "paymentType": "cash"      // ixtiyoriy: "cash" yoki "installment"
// }
//
// Javob:
// { "ok": true, "orderId": "xyz789" }
// yoki xato bo'lsa: { "ok": false, "error": "..." }

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

// XAVFSIZLIK: bitta IP manzildan (masalan API kaliti oqib chiqqan yoki
// noto'g'ri ishlatilgan holatda) cheksiz buyurtma yaratib, katalogdagi
// barcha raqamlarni "band qilib qo'yish" (spam) hujumining oldini olish
// uchun — send-sms-code.js'dagi bilan bir xil Firestore hisoblagich naqshi.
const ORDER_HOURLY_LIMIT = 30;
async function checkIpRateLimit(event) {
  const ip = (event.headers && (
    event.headers['x-nf-client-connection-ip']
    || event.headers['client-ip']
    || ((event.headers['x-forwarded-for'] || '').split(',')[0].trim())
  )) || 'unknown';
  const hourKey = new Date().toISOString().slice(0, 13);
  const rateLimitRef = db.collection('order_create_rate_limits').doc(ip.replace(/[^\w.:-]/g, '_') || 'unknown');
  const snap = await rateLimitRef.get();
  let count = 0;
  if (snap.exists) {
    const data = snap.data();
    if (data.hourKey === hourKey) count = data.count || 0;
  }
  if (count >= ORDER_HOURLY_LIMIT) return false;
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
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST so\'rovlariga ruxsat berilgan' }) };
  }
  if (!checkApiKey(event)) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri yoki yo\'q API kalit (x-api-key)' }) };
  }
  if (!(await checkIpRateLimit(event))) {
    return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: "Juda ko'p so'rov. Birozdan so'ng qayta urinib ko'ring." }) };
  }

  let data;
  try { data = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri JSON' }) }; }

  const numberId = String(data.numberId || '').trim();
  const name = String(data.name || '').trim();
  const phone = String(data.phone || '').trim();
  const region = String(data.region || '').trim();
  const paymentType = data.paymentType === 'installment' ? 'installment' : 'cash';

  // XAVFSIZLIK: barcha maydonlar tekshiriladi — bo'sh, haddan tashqari
  // uzun yoki noto'g'ri turdagi qiymatlar rad etiladi (xuddi sayt
  // formasidagi va Firestore qoidalaridagi kabi).
  if (!numberId) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'numberId majburiy' }) };
  if (!name || name.length > 200) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Ism noto\'g\'ri yoki juda uzun' }) };
  if (!phone || phone.length > 50) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Telefon raqam noto\'g\'ri yoki juda uzun' }) };
  if (!region || region.length > 300) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Viloyat noto\'g\'ri yoki juda uzun' }) };

  try {
    const numRef = db.collection('numbers').doc(numberId);
    const numSnap = await numRef.get();
    if (!numSnap.exists) {
      return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Bunday raqam topilmadi' }) };
    }
    const numData = numSnap.data();
    if (numData.reserved) {
      return { statusCode: 409, headers, body: JSON.stringify({ ok: false, error: 'Bu raqam allaqachon band qilingan' }) };
    }

    const orderTime = new Date().toLocaleString('uz-UZ');
    const orderRef = await db.collection('orders').add({
      number: numData.number || '',
      price: typeof numData.price === 'number' ? numData.price : 0,
      name, region, phone,
      // check-my-orders.js shu maydon bo'yicha to'g'ridan-to'g'ri
      // .where() so'rovi yuboradi (3000 tagacha hujjatni skanerlash
      // o'rniga) — qarang: index.html'dagi finalizeOrder().
      phoneNormalized: phone.replace(/\D/g, '').slice(-9),
      paymentType,
      numberId,
      status: 'Yangi',
      source: 'Mobil ilova',
      createdAt: orderTime,
      createdAtSort: Date.now()
    });

    await numRef.update({ reserved: true, reservedAt: admin.firestore.FieldValue.serverTimestamp() });

    // Admin Telegram botiga darhol xabar — sayt orqali kelgan
    // buyurtmalar bilan bir xil tarzda.
    try {
      const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
      if (siteUrl) {
        const paymentLine = paymentType === 'installment'
          ? "💳 To'lov turi: Bo'lib to'lash"
          : "💵 To'lov turi: Naqt to'lov";
        const text =
`🔔 Yangi buyurtma

📱 Buyurtma raqami: ${numData.number}
👤 Mijoz ismi: ${name}
☎️ Ishlab turgan raqami: ${phone}
📍 Manzil: ${region}
${paymentLine}
🕐 Vaqti: ${orderTime}
🌐 Qayerdan: Mobil ilova`;
        // telegram-notify endi himoyalangan (App Check YOKI x-api-key
        // talab qiladi) — bu yerdan server-serverga chaqirilgani uchun
        // xuddi shu funksiyaning o'zini himoya qilgan MOBILE_API_KEY'ni
        // qayta ishlatamiz (agar sozlangan bo'lsa).
        const notifyHeaders = { 'Content-Type': 'application/json' };
        if (process.env.MOBILE_API_KEY) notifyHeaders['x-api-key'] = process.env.MOBILE_API_KEY;
        await fetch(`${siteUrl}/.netlify/functions/telegram-notify`, {
          method: 'POST',
          headers: notifyHeaders,
          body: JSON.stringify({ text, orderId: orderRef.id })
        });
      }
    } catch (notifyErr) {
      console.error('Telegramga xabar yuborishda xato (buyurtma baribir saqlandi):', notifyErr);
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, orderId: orderRef.id }) };
  } catch (err) {
    console.error('api-create-order xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
