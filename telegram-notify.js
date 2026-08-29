// Bu fayl serverda ishlaydi (Netlify Functions) — bot tokeni mijoz brauzeriga
// hech qachon yuborilmaydi, shuning uchun sayt manba kodida ko'rinmaydi.
//
// Kerakli Environment variables: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, orderId } = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan' }) };
    }
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'text maydoni kerak' }) };
    }

    const body = { chat_id: chatId, text };
    if (orderId) {
      body.reply_markup = {
        inline_keyboard: [
          [{ text: "📞 Bog'lanildi", callback_data: `st|${orderId}|B` }],
          [{ text: '✅ Yakunlandi', callback_data: `st|${orderId}|Y` }],
          [{ text: '❌ Bekor qilindi', callback_data: `st|${orderId}|C` }]
        ]
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    // Xabar ID sini buyurtmaga saqlaymiz — shunda admin panelidan status
    // o'zgartirilganda, aynan shu Telegram xabarini topib yangilay olamiz.
    if (data.ok && orderId && data.result && data.result.message_id) {
      try{
        await db.collection('orders').doc(orderId).update({ adminMessageId: data.result.message_id });
      }catch(e){ /* muhim emas, asosiy xabar baribir yuborildi */ }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: data.ok === true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
