// HAR KUNI SOAT 07:00 (Toshkent) DA AVTOMATIK ISHLAYDI — doimiy
// (takrorlanuvchi) xarajat/daromadlarni (ijara, internet va h.k.) tekshirib,
// bugun ularning "yozilish kuni" bo'lsa, avtomatik qo'shadi va xabar beradi.
// netlify.toml: schedule = "0 2 * * *" (UTC 02:00 = Toshkent 07:00)

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
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

function formatSom(n) {
  return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

async function sendMessage(text) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text, parse_mode: 'HTML' })
  });
}

exports.handler = async function () {
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };
  try {
    const now = new Date();
    const tashkentNow = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    const todayDay = tashkentNow.getUTCDate();
    const monthKey = `${tashkentNow.getUTCFullYear()}-${tashkentNow.getUTCMonth() + 1}`;

    const snap = await db.collection('personal_bot_recurring').get();
    let addedCount = 0;

    for (const doc of snap.docs) {
      const r = doc.data();
      if (r.dayOfMonth !== todayDay) continue;
      if (r.lastRunKey === monthKey) continue; // bu oy uchun allaqachon yozilgan

      await db.collection('personal_bot_tx').add({
        type: r.type, amount: r.amount, category: r.category, ts: Date.now(), recurringId: doc.id
      });
      await doc.ref.update({ lastRunKey: monthKey });

      const sign = r.type === 'expense' ? '-' : '+';
      await sendMessage(`🔁 Doimiy yozuv qo'shildi: ${sign}${formatSom(r.amount)} — «${r.description}»`);
      addedCount++;
    }

    return { statusCode: 200, body: `ok, ${addedCount} ta yozildi` };
  } catch (err) {
    console.error('personal-bot-recurring-check xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
