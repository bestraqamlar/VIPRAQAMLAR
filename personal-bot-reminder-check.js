// HAR 5 DAQIQADA AVTOMATIK ISHLAYDI — rejalashtirilgan vaqtdan 24 SOAT
// o'tgan, hali javob berilmagan vazifalarni tekshirib, egasiga
// "X vazifa bajarildimi?" deb so'raydi.
// netlify.toml'da "schedule" bilan sozlangan.

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

const TOKEN = process.env.PERSONAL_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.PERSONAL_BOT_CHAT_ID;
const DAY_MS = 24 * 60 * 60 * 1000;

exports.handler = async function () {
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };

  try {
    const now = Date.now();
    // reminderAt + 24 soat <= hozir — ya'ni belgilangan vaqtdan 24 soat o'tgan
    const snap = await db.collection('personal_bot_plans')
      .where('status', '==', 'pending')
      .where('reminderAt', '<=', now - DAY_MS)
      .get();

    for (const doc of snap.docs) {
      const plan = doc.data();
      const escapedText = String(plan.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const text = `❓ <b>«${escapedText}»</b> vazifa bajarildimi?`;

      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: OWNER_CHAT_ID,
          text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Ha', callback_data: `plan_done:${doc.id}` },
              { text: '❌ Yo\'q', callback_data: `plan_notdone:${doc.id}` }
            ]]
          }
        })
      });

      // Qayta-qayta so'ramaslik uchun — javob kutilyapti deb, vaqtincha
      // juda uzoqqa suramiz (javob kelganda webhook o'zi to'g'rilaydi).
      await doc.ref.update({ reminderAt: now + 100 * 365 * DAY_MS });
    }

    return { statusCode: 200, body: `ok, ${snap.size} ta so'rov yuborildi` };
  } catch (err) {
    console.error('personal-bot-reminder-check xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
