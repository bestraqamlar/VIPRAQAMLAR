// Admin panelidan (brauzerdan) buyurtma statusi o'zgartirilganda, mijozga
// Telegram orqali xabar yuborish uchun. CUSTOMER_BOT_TOKEN shu yerda,
// serverda ishlatiladi — brauzerga hech qachon chiqmaydi.
//
// XAVFSIZLIK: bu funksiya sizning botingiz nomidan Telegram xabar
// yuboradi — shu sababli faqat tizimga kirgan ADMIN chaqira olishi shart.
// Aks holda har kim istalgan odamga (chatId'ni bilsa) sizning bot nomingiz
// bilan soxta xabar yubora olardi. Shuning uchun har bir so'rovda Firebase
// ID token tekshiriladi.

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

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // --- Autentifikatsiya: faqat tizimga kirgan admin foydalana oladi ---
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) throw new Error("Token yo'q");
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: "Ruxsat yo'q. Iltimos, qaytadan tizimga kiring." }) };
  }

  try {
    const { chatId, number, status } = JSON.parse(event.body || '{}');
    const token = process.env.CUSTOMER_BOT_TOKEN;

    if (!token || !chatId) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true }) };
    }

    const STATUS_MESSAGES = {
      "Bog'lanildi": "📞 Operatorlarimiz siz bilan bog'landi.",
      'Yakunlandi': "✅ Haridingiz uchun rahmat! Tez orada raqamingiz yetib boradi.",
      'Bekor qilindi': "❌ Sizning buyurtmangiz bekor qilindi."
    };
    const text = `${STATUS_MESSAGES[status] || `📌 Buyurtmangiz holati: ${status}`}\n\n📱 ${number}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
