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
      paymentType,
      numberId,
      status: 'Yangi',
      source: 'Mobil ilova',
      createdAt: orderTime,
      createdAtSort: Date.now()
    });

    await numRef.update({ reserved: true });

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
        await fetch(`${siteUrl}/.netlify/functions/telegram-notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
