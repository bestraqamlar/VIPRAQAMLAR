// Yangi buyurtma (yoki "Zakaz" so'rovi) kelganda ADMIN qurilmalariga
// brauzer push bildirishnoma yuborish uchun. Telegram bilan bir qatorda
// ishlaydi — Telegram ishlamasa/o'chirilgan bo'lsa ham, admin sayt yopiq
// bo'lsa ham push orqali xabardor bo'ladi.
//
// Ochiq (autentifikatsiyasiz) chaqiriladi — xuddi telegram-notify.js kabi,
// chunki bu mijoz saytidan (buyurtma berilgan zahoti) chaqiriladi va hech
// qanday maxfiy ma'lumotni oshkor qilmaydi. Qaysi tokenlarga yuborish
// kerakligini o'zi (admin_meta/pushTokens hujjatidan) topadi — chaqiruvchi
// tokenlarni bilishi ham, yuborishi ham shart emas.

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

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { title, body } = JSON.parse(event.body || '{}');
    if (!body) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true }) };
    }

    const doc = await db.collection('admin_meta').doc('pushTokens').get();
    const tokens = (doc.exists && Array.isArray(doc.data().tokens)) ? doc.data().tokens : [];
    if (tokens.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true, error: 'Admin push tokeni yo\'q' }) };
    }

    const invalidTokens = [];
    await Promise.all(tokens.map(async (token) => {
      try {
        await admin.messaging().send({
          token,
          notification: { title: title || 'VIP RAQAMLAR — Admin', body },
          webpush: {
            fcmOptions: { link: 'https://vipraqamlar.uz/admin.html' },
            notification: { icon: 'https://vipraqamlar.uz/assets/logo-circle.png' }
          }
        });
      } catch (e) {
        // Token eskirgan/bekor qilingan (masalan mijoz bildirishnomani
        // o'chirib qo'ygan) — ro'yxatdan tozalash uchun belgilaymiz.
        if (e.code === 'messaging/registration-token-not-registered' || e.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(token);
        }
      }
    }));

    if (invalidTokens.length > 0) {
      try {
        await db.collection('admin_meta').doc('pushTokens').set({
          tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        }, { merge: true });
      } catch (e) { /* muhim emas — keyingi safar qayta urinamiz */ }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, sentTo: tokens.length - invalidTokens.length }) };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
