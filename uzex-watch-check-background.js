// UZEX AUKSION KUZATUVI — admin AI yordamchisiga "shu raqam/shartlar
// chiqsa menga aytib ber" deb buyruq berilganda yaratiladigan "kuzatuv"
// (uzex_watches kolleksiyasi) shu yerda muntazam tekshiriladi. Topilsa,
// admin AI nomidan Telegram orqali xabar yuboradi: "So'ragan raqamingiz
// keldi".
//
// number-watch-check-background.js (operator bazasi kuzatuvi) bilan BIR
// XIL naqsh: "-background" qo'shimchasi MAJBURIY (Netlify'da uzoqroq
// ishlashga ruxsat beradi), har bir kuzatuvning o'z nextCheckAt vaqti bor,
// topilgan raqam 12 soat davomida qayta xabar qilinmaydi (lekin naqshga
// mos YANGI raqam chiqsa, darhol xabar beriladi).
//
// UZEX'da operator bazasidagidek "bitta keng so'rov + mahalliy filtr"
// (pooling) qo'llab bo'lmaydi — chunki UZEX o'zi mask/narx bo'yicha
// SERVER TOMONDA filtrlaydi va har bir kuzatuvning shartlari (mask,
// narx oralig'i, kompaniya, sana) boshqacha bo'lishi mumkin. Shu sabab
// har bir kuzatuv o'zining ANIQ so'rovi bilan, alohida-alohida (lekin
// parallel, bir nechta ishchi bilan) tekshiriladi.

const admin = require('firebase-admin');
const { searchUzex } = require('./lib/uzexClient');

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

const COLLECTION = 'uzex_watches';
const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const CONCURRENCY = 4;
const MAX_RUN_MS = 12 * 60 * 1000;
// UZEX tashqi API'siga tez-tez murojaat qilib "spam" qilib yubormaslik
// uchun — bitta kuzatuv kamida shuncha daqiqada bir marta tekshiriladi
// (kuzatuv yaratilganda intervalMinutes berilmasa, shu standart ishlatiladi).
const DEFAULT_INTERVAL_MINUTES = 15;

function formatNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 12) return raw;
  return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,10)} ${digits.slice(10,12)}`;
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) { /* xabar yubormasa ham, tekshiruv davom etadi */ }
}

// number-watch-check-background.js bilan BIR XIL bot/chat ID'lardan
// foydalanadi — alohida UZEX uchun maxsus bot sozlanmagan bo'lsa ham,
// admin xabarni albatta oladi.
async function notifyAdmin(text) {
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) await sendTelegramMessage(token, chatId, text);
}

async function finalizeWatch(doc, items) {
  const watch = doc.data();
  const ref = doc.ref;
  const now = Date.now();
  const intervalMinutes = Number(watch.intervalMinutes) > 0 ? Number(watch.intervalMinutes) : DEFAULT_INTERVAL_MINUTES;

  const update = {
    lastCheckedAt: admin.firestore.Timestamp.now(),
    nextCheckAt: admin.firestore.Timestamp.fromMillis(now + intervalMinutes * 60000),
    checkCount: (watch.checkCount || 0) + 1
  };

  const prevNotified = watch.notifiedNumbers || {};
  const keptNotified = {};
  for (const num in prevNotified) {
    const ts = prevNotified[num];
    if (typeof ts === 'number' && (now - ts) < NOTIFY_COOLDOWN_MS) keptNotified[num] = ts;
  }

  if (items.length > 0) {
    update.lastFoundAt = admin.firestore.Timestamp.now();
    update.lastFoundNumbers = items.slice(0, 5).map(x => x.number);

    const freshItems = items.filter(it => !keptNotified[it.number]);
    for (const item of freshItems) {
      const priceText = item.price ? `${Number(item.price).toLocaleString('ru-RU')} so'm` : "narxi ko'rsatilmagan";
      const noteText = watch.note ? `\n📝 ${watch.note}` : '';
      await notifyAdmin(
        `🎯 So'ragan raqamingiz keldi!\n\n` +
        `📱 ${formatNumber(item.number)} - ${priceText}\n` +
        `🏢 ${item.seller || "sotuvchi ko'rsatilmagan"}${noteText}\n\n` +
        `🏛️ UZEX auksion (kuzatuv: "${watch.label || watch.mask || ''}")`
      );
      keptNotified[item.number] = now;
    }
  }

  update.notifiedNumbers = keptNotified;
  await ref.update(update);
}

let START_TIME = 0;

exports.handler = async function () {
  START_TIME = Date.now();
  try {
    const snap = await db.collection(COLLECTION).where('active', '==', true).get();
    if (snap.empty) return { statusCode: 200, body: 'ok: uzex kuzatuv yoq' };

    const now = admin.firestore.Timestamp.now();
    const due = snap.docs.filter(d => {
      const nc = d.data().nextCheckAt;
      return !nc || nc.toMillis() <= now.toMillis();
    });
    if (due.length === 0) return { statusCode: 200, body: 'ok: hozircha muddati kelgan uzex kuzatuv yoq' };

    let idx = 0;
    async function worker() {
      while (idx < due.length) {
        const doc = due[idx++];
        const watch = doc.data();
        let items = [];
        try {
          const out = await searchUzex({
            mask: watch.mask,
            startPrice: watch.priceMin,
            endPrice: watch.priceMax,
            seller: watch.sellerQuery,
            dateFrom: watch.dateFrom,
            dateTo: watch.dateTo,
            limit: 50
          });
          items = out.items || [];
        } catch (e) { /* bitta kuzatuv ishlamasa ham, qolganlari davom etadi */ }
        await finalizeWatch(doc, items);
        if (Date.now() - START_TIME > MAX_RUN_MS) return;
      }
    }
    const workers = Array(Math.min(CONCURRENCY, due.length)).fill(0).map(worker);
    await Promise.all(workers);

    return { statusCode: 200, body: `ok: ${due.length} ta uzex kuzatuv tekshirildi, jami ${snap.size} ta faol` };
  } catch (err) {
    console.error('UZEX-WATCH-CHECK XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
