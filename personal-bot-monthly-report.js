// HAR OYNING 1-KUNI ERTALAB SOAT 07:00 (Toshkent) DA AVTOMATIK ISHLAYDI —
// o'tgan oyning moliyaviy hisobotini PDF ko'rinishida yuboradi.
// netlify.toml: schedule = "0 2 1 * *" (UTC 02:00, 1-kun = Toshkent 07:00)

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
    const now = new Date();
    const tashkentNow = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    // O'tgan oyning boshi va oxiri (Toshkent vaqtida)
    const y = tashkentNow.getUTCFullYear(), m = tashkentNow.getUTCMonth(); // hozirgi oy (0-based)
    const prevMonthStart = Date.UTC(y, m - 1, 1, 0, 0, 0) - TASHKENT_OFFSET_MS;
    const prevMonthEnd = Date.UTC(y, m, 0, 23, 59, 59) - TASHKENT_OFFSET_MS;
    // Undan oldingi oy — solishtirish uchun
    const twoMonthsAgoStart = Date.UTC(y, m - 2, 1, 0, 0, 0) - TASHKENT_OFFSET_MS;
    const twoMonthsAgoEnd = Date.UTC(y, m - 1, 0, 23, 59, 59) - TASHKENT_OFFSET_MS;

    const summary = await computeSummary(prevMonthStart, prevMonthEnd);
    const prevSummary = await computeSummary(twoMonthsAgoStart, twoMonthsAgoEnd);

    const buffer = await buildStatsPdfBuffer(summary, "O'tgan oy", OWNER_NAME);

    // ---- Oy solishtirmasi — tushunarli xulosa matni ----
    let comparisonText = `📊 ${OWNER_NAME}, oylik moliyaviy hisobotingiz tayyor.\n\n`;
    if (prevSummary.totalExpense > 0) {
      const pctChange = Math.round(((summary.totalExpense - prevSummary.totalExpense) / prevSummary.totalExpense) * 100);
      const direction = pctChange > 0 ? "ko'proq" : "kamroq";
      comparisonText += `Bu oy avvalgi oyga nisbatan <b>${Math.abs(pctChange)}% ${direction}</b> xarajat qildingiz.\n`;

      // Eng ko'p o'zgargan toifani topamiz
      let maxDiffCategory = null, maxDiff = 0;
      for (const cat of Object.keys(summary.byCategory)) {
        if (!cat.startsWith('➖')) continue;
        const prevVal = prevSummary.byCategory[cat] || 0;
        const diff = summary.byCategory[cat] - prevVal;
        if (Math.abs(diff) > Math.abs(maxDiff)) { maxDiff = diff; maxDiffCategory = cat; }
      }
      if (maxDiffCategory && Math.abs(maxDiff) > 10000) {
        const dirWord = maxDiff > 0 ? 'oshgan' : 'kamaygan';
        comparisonText += `Asosan <b>${maxDiffCategory.replace('➖ ', '')}</b> toifasida ${dirWord}.`;
      }
    } else {
      comparisonText += "Avvalgi oy uchun solishtirish ma'lumoti yo'q.";
    }

    await sendDocument(OWNER_CHAT_ID, buffer, `oylik_hisobot_${now.toISOString().slice(0, 10)}.pdf`, comparisonText);
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error('personal-bot-monthly-report xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
