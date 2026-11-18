// "VAZIFALAR" (admin shaxsiy dedlayn ro'yxati) KUZATUVI — har 5 daqiqada
// ishga tushadi (netlify.toml), muddatiga 5 SOATDAN KAM qolgan va hali
// bajarilmagan har bir vazifa uchun admin'ga Telegram orqali bir marta
// ogohlantirish yuboradi (admin panel yopiq bo'lsa ham xabardor bo'lishi
// uchun — panel ochiq bo'lsa, saytning o'zida ham real vaqtda
// "qo'ng'iroqcha" chiqadi, buni admin-tasks.html/panel JS qismi qiladi).
//
// Fayl nomi "-background" bilan tugashi MUHIM: Netlify'da bu funksiyani
// uzoqroq ishlay oladigan "Background Function" qiladi.

const admin = require('firebase-admin');
const { sanaUz, sanaVaqtUz } = require('./lib/sana');   // V121: kun.oy.yil

const { jadvalOk } = require('./lib/jadvalQalqon');
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

const COLLECTION = 'admin_tasks';
const NOTIFY_COLLECTION = 'watch_notify_recipients';
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) { /* xabar yubormasa ham, tekshiruv davom etadi */ }
}

async function notifyAdmin(text) {
  // Xuddi "raqam kuzatuvi" bilan bir xil bot/qabul qiluvchilar ro'yxatidan
  // foydalanamiz — alohida bot sozlashning hojati yo'q.
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) await sendTelegramMessage(token, chatId, text);
  if (!token) return;
  try {
    const snap = await db.collection(NOTIFY_COLLECTION).get();
    await Promise.all(snap.docs.map(d => {
      const extraChatId = d.data().chatId;
      if (!extraChatId) return null;
      return sendTelegramMessage(token, extraChatId, text);
    }));
  } catch (e) { /* qo'shimcha ro'yxat o'qilmasa ham, asosiy xabar allaqachon ketgan */ }
}

exports.handler = async function (event) {
  /* XAVFSIZLIK (V73): bu funksiya jadval bo'yicha ishlaydi —
     tashqaridan chaqirilishi kerak emas. Qarang: lib/jadvalQalqon.js */
  if (!(await jadvalOk(event, 'admin-tasks-check-background', 240))) return { statusCode: 403, body: 'forbidden' };

  try {
    const now = Date.now();

    const snap = await db.collection(COLLECTION)
      .where('completed', '==', false)
      .where('dueAt', '<=', now + FIVE_HOURS_MS)
      .get();

    let sent = 0;
    for (const doc of snap.docs) {
      const task = doc.data();
      if (task.notified5h) continue; // faqat bir marta ogohlantiramiz

      const escapedText = String(task.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const dueDate = new Date(task.dueAt);
      const dueStr = sanaVaqtUz(dueDate);   // V121: kun.oy.yil
      const label = task.important ? '⭐️ MUHIM VAZIFA' : '⏰ Vazifa';
      const text = `${label} tugashiga 5 soatdan kam qoldi!\n\n<b>${escapedText}</b>\n\n🗓 Muddati: ${dueStr}`;

      await notifyAdmin(text);
      await doc.ref.update({ notified5h: true });
      sent++;
    }

    return { statusCode: 200, body: `ok, ${sent} ta ogohlantirish yuborildi` };
  } catch (err) {
    console.error('admin-tasks-check-background xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
