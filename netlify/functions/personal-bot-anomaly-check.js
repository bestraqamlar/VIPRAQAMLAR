// HAR KUNI KECHQURUN SOAT 21:00 (Toshkent) DA AVTOMATIK ISHLAYDI —
// bugungi xarajatlarni, shu toifaning oxirgi 30 kunlik o'rtacha kunlik
// xarajati bilan solishtiradi. Agar SEZILARLI (2.5 baravardan ko'p) oshib
// ketgan bo'lsa, so'ramasdan turib, o'zi ogohlantiradi.
// netlify.toml: schedule = "0 16 * * *" (UTC 16:00 = Toshkent 21:00)

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
const OWNER_NAME = 'Asadbek';
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
const ANOMALY_MULTIPLIER = 2.5; // o'rtachadan necha barobar oshsa "g'ayrioddiy" hisoblanadi
const MIN_AMOUNT_TO_FLAG = 20000; // juda kichik summalar uchun bezovta qilmaslik

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
    const y = tashkentNow.getUTCFullYear(), mo = tashkentNow.getUTCMonth(), d = tashkentNow.getUTCDate();
    const todayStart = Date.UTC(y, mo, d, 0, 0) - TASHKENT_OFFSET_MS;
    const last30Start = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    const snap = await db.collection('personal_bot_tx')
      .where('ts', '>=', last30Start).where('type', '==', 'expense').get();

    const todayByCategory = {};
    const totalByCategory = {};
    snap.forEach(doc => {
      const t = doc.data();
      if (t.ts >= todayStart) todayByCategory[t.category] = (todayByCategory[t.category] || 0) + t.amount;
      totalByCategory[t.category] = (totalByCategory[t.category] || 0) + t.amount;
    });

    const alerts = [];
    for (const category of Object.keys(todayByCategory)) {
      const todayAmount = todayByCategory[category];
      if (todayAmount < MIN_AMOUNT_TO_FLAG) continue;
      const avgDaily = (totalByCategory[category] || 0) / 30;
      if (avgDaily > 0 && todayAmount > avgDaily * ANOMALY_MULTIPLIER) {
        alerts.push({ category, todayAmount, avgDaily });
      }
    }

    for (const a of alerts) {
      await sendMessage(
        `⚠️ <b>${OWNER_NAME}</b>, diqqat!\n\n` +
        `Bugun <b>${a.category}</b> uchun ${formatSom(a.todayAmount)} sarfladingiz — ` +
        `bu odatiy kunlik o'rtachangizdan (${formatSom(Math.round(a.avgDaily))}) sezilarli yuqori.`
      );
    }

    return { statusCode: 200, body: `ok, ${alerts.length} ta ogohlantirish yuborildi` };
  } catch (err) {
    console.error('personal-bot-anomaly-check xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
