// Admin panel (veb-sayt)dan buyurtma statusi o'zgartirilganda, mos Telegram
// xabaridagi tugmalarni ham "tasdiqlangan holat"ga almashtirish uchun.
//
// XAVFSIZLIK: faqat tizimga kirgan ADMIN chaqira olishi kerak — aks holda
// har kim admin botining o'z chatidagi xabarlarni (messageId'ni topib/
// taxmin qilib) o'zgartirib, buyurtma bildirishnomalarini buzishi mumkin edi.

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
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) throw new Error("Token yo'q");
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: "Ruxsat yo'q. Iltimos, qaytadan tizimga kiring." }) };
  }

  try {
    const { messageId, statusLabel } = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId || !messageId || !statusLabel) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true }) };
    }

    await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: `✅ ${statusLabel}`, callback_data: 'noop' }]] }
      })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
