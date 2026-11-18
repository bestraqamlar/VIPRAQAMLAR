// Admin panelidan (brauzerdan) buyurtma statusi o'zgartirilganda, mijozga
// BRAUZER PUSH bildirishnomasi yuborish uchun (Telegram bot ishlatmagan,
// to'g'ridan-to'g'ri saytdan buyurtma bergan mijozlar uchun ham xabar
// borishi uchun). Mijozning "fcmToken"i (agar u push'ga ruxsat bergan
// bo'lsa) buyurtma hujjatida saqlanadi.
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

const STATUS_MESSAGES = {
  "Bog'lanildi": "📞 Operatorlarimiz siz bilan bog'landi.",
  'Yakunlandi': "✅ Haridingiz uchun rahmat! Tez orada raqamingiz yetib boradi.",
  'Bekor qilindi': "❌ Sizning buyurtmangiz bekor qilindi."
};

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) throw new Error("Token yo'q");
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: "Ruxsat yo'q. Iltimos, qaytadan tizimga kiring." }) };
  }

  try {
    const { fcmToken, number, status } = JSON.parse(event.body || '{}');
    if (!fcmToken) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true }) };
    }

    const body = `${STATUS_MESSAGES[status] || `📌 Buyurtmangiz holati: ${status}`}\n📱 ${number || ''}`;

    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: 'VIP RAQAMLAR — buyurtma holati',
        body
      },
      webpush: {
        fcmOptions: { link: 'https://vipraqamlar.uz/' },
        notification: { icon: 'https://vipraqamlar.uz/assets/logo-circle.png' }
      }
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    // Token eskirgan/bekor qilingan bo'lishi mumkin — bu jiddiy xato emas,
    // shunchaki shu mijozga push yetib bormaydi (Telegram xabari baribir boradi).
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
