// Admin panelidan "Zakaz" (Raqam buyurtma berish) so'rovi holati
// o'zgartirilganda, mijozga Telegram orqali avtomatik xabar yuborish uchun.
//
// Mijoz bu so'rovni SAYTDAN (Telegram botsiz) yuborgan bo'lishi mumkin —
// shu sababli avval uning chat ID'sini telefon raqami orqali "orders"
// kolleksiyasidan (agar u bot orqali biror narsa buyurtma qilgan bo'lsa)
// topishga harakat qilamiz. Topilmasa, xabar yuborilmaydi (boshqa yo'l yo'q).
//
// XAVFSIZLIK: faqat tizimga kirgan ADMIN chaqira oladi.

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

const STATUS_MESSAGES = {
  "Bog'lanildi": "📞 Operatorlarimiz siz bilan bog'landi.",
  'Yakunlandi': "✅ So'rovingiz bo'yicha buyurtma rasmiylashtirildi. Xaridingiz uchun rahmat!",
  'Bekor qilindi': "❌ Afsuski, so'rovingiz bekor qilindi."
};

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) throw new Error("Token yo'q");
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q. Iltimos, qaytadan tizimga kiring." }) };
  }

  try{
    const { customOrderId, status } = JSON.parse(event.body || '{}');
    if(!customOrderId || !status){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot yetarli emas" }) };
    }

    const doc = await db.collection('custom_orders').doc(customOrderId).get();
    if(!doc.exists) return { statusCode: 200, body: JSON.stringify({ ok: false, error: "So'rov topilmadi" }) };
    const data = doc.data();

    const phoneDigits = (data.phone || '').replace(/\D/g, '').slice(-9);
    if(!phoneDigits){
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true, error: "Telefon raqami yo'q" }) };
    }

    const ordersSnap = await db.collection('orders').orderBy('createdAtSort', 'desc').limit(500).get();
    const match = ordersSnap.docs
      .map(d => d.data())
      .find(o => o.customerChatId && (o.phone || '').replace(/\D/g, '').slice(-9) === phoneDigits);

    if(!match){
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true, error: 'Mijozning Telegram ID topilmadi' }) };
    }

    const token = process.env.CUSTOMER_BOT_TOKEN;
    if(!token) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'CUSTOMER_BOT_TOKEN sozlanmagan' }) };

    const text = `${STATUS_MESSAGES[status] || `📌 So'rovingiz holati: ${status}`}\n\n🔢 Raqam naqshi: ••••${data.pattern || ''}`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: match.customerChatId, text })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
