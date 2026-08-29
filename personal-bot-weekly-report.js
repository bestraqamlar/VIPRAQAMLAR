// HAR DUSHANBA ERTALAB SOAT 07:00 (Toshkent) DA AVTOMATIK ISHLAYDI —
// o'tgan haftaning moliyaviy hisobotini PDF ko'rinishida yuboradi.
// netlify.toml: schedule = "0 2 * * 1" (UTC 02:00 Dushanba = Toshkent 07:00)

const admin = require('firebase-admin');
const { buildStatsPdfBuffer } = require('./lib/personalBotPdf');

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
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

async function sendDocument(chatId, buffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), filename);
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, { method: 'POST', body: form });
}

async function computeSummary(startTs, endTs) {
  const snap = await db.collection('personal_bot_tx').where('ts', '>=', startTs).where('ts', '<=', endTs).get();
  const byCategory = {};
  let totalIncome = 0, totalExpense = 0;
  snap.forEach(doc => {
    const d = doc.data();
    const key = `${d.type === 'income' ? '➕' : '➖'} ${d.category}`;
    byCategory[key] = (byCategory[key] || 0) + d.amount;
    if (d.type === 'income') totalIncome += d.amount; else totalExpense += d.amount;
  });
  return { byCategory, totalIncome, totalExpense };
}

exports.handler = async function () {
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };
  try {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    const summary = await computeSummary(weekStart, now);
    const buffer = await buildStatsPdfBuffer(summary, "O'tgan hafta", OWNER_NAME);
    await sendDocument(OWNER_CHAT_ID, buffer, `haftalik_hisobot_${new Date(now).toISOString().slice(0, 10)}.pdf`,
      `📊 ${OWNER_NAME}, haftalik moliyaviy hisobotingiz tayyor.`);
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('personal-bot-weekly-report xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
