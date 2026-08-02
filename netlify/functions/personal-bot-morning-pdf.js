// HAR KUNI SOAT 05:00 (Toshkent vaqti) DA AVTOMATIK ISHLAYDI —
// kecha kiritilgan rejalarni "Bugungi rejalarim" deb, chiroyli PDF
// jadval ko'rinishida, oxirida "Umumiy rejalarim" bilan yuboradi.
// netlify.toml'da "schedule = 0 0 * * *" (UTC 00:00 = Toshkent 05:00).

const admin = require('firebase-admin');
const { buildPlansPdfBuffer } = require('./lib/personalBotPdf');

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
const OWNER_NAME = 'Asadbek';

async function sendDocument(chatId, buffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), filename);
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, { method: 'POST', body: form });
}

exports.handler = async function () {
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };

  try {
    const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
    const now = new Date();
    const tashkentNow = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    const y = tashkentNow.getUTCFullYear(), mo = tashkentNow.getUTCMonth(), d = tashkentNow.getUTCDate();
    const dayStart = Date.UTC(y, mo, d, 0, 0) - TASHKENT_OFFSET_MS;
    const dayEnd = Date.UTC(y, mo, d, 23, 59, 59) - TASHKENT_OFFSET_MS;

    const snap = await db.collection('personal_bot_plans').where('status', '==', 'pending').get();
    const allPlans = [];
    snap.forEach(doc => allPlans.push(doc.data()));
    allPlans.sort((a, b) => a.reminderAt - b.reminderAt);
    const todayPlans = allPlans.filter(p => p.reminderAt >= dayStart && p.reminderAt <= dayEnd);

    const buffer = await buildPlansPdfBuffer(todayPlans, allPlans, OWNER_NAME);
    await sendDocument(OWNER_CHAT_ID, buffer, `bugungi_rejalar_${now.toISOString().slice(0, 10)}.pdf`,
      `☀️ Xayrli tong, ${OWNER_NAME}! Bugungi rejalaringiz tayyor.`);

    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('personal-bot-morning-pdf xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
