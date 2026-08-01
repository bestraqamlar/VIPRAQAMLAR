// HAR 5 DAQIQADA AVTOMATIK ISHLAYDI — vaqti kelgan rejalarni tekshirib,
// egasiga Telegram orqali eslatma yuboradi ("X rejangiz tayyormi?").
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

exports.handler = async function () {
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };

  try {
    const now = Date.now();
    const snap = await db.collection('personal_bot_plans')
      .where('status', '==', 'pending')
      .where('reminderAt', '<=', now)
      .get();

    for (const doc of snap.docs) {
      const plan = doc.data();
      const label = plan.planType === 'long' ? 'Uzoq muddat' : 'Yaqin muddat';
      const text = `⏰ <b>${label} rejangiz tayyormi?</b>\n\n«${plan.text}»`;

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

      // Qayta-qayta yubormaslik uchun — "eslatildi" deb belgilaymiz.
      // (status 'pending' qoladi, chunki javob kutilyapti — lekin
      // reminderAt ni juda uzoq muddatga surib qo'yamiz, shu bilan
      // keyingi tekshiruvda qayta ushlanib qolmaydi)
      await doc.ref.update({ reminderAt: now + 100 * 365 * 24 * 60 * 60 * 1000 });
    }

    return { statusCode: 200, body: `ok, ${snap.size} ta eslatma yuborildi` };
  } catch (err) {
    console.error('personal-bot-reminder-check xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
