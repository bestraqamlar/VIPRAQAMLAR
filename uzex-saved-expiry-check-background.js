// SAQLANGAN UZEX RAQAMLARI — SAVDO TUGASH OGOHLANTIRUVI.
//
// Admin UZEX bo'limida 💾 "Saqlash" bosgan har bir raqam uchun (Firestore
// 'uzex_saved_numbers' kolleksiyasi): shu lotning savdosi (auksion)
// tugashiga aynan 3 SOAT va 1 SOAT qolganda, Telegram orqali BIR MARTADAN
// ogohlantirish yuboradi — "shu raqam savdosi tugashiga X soat qoldi".
//
// MUHIM (vaqt mintaqasi): UZEX sanani "2026-09-25T17:00:00" ko'rinishida,
// vaqt mintaqasisiz beradi — bu allaqachon Toshkent (UTC+5, yil bo'yi
// o'zgarmas, DST yo'q) mahalliy vaqti. Bu funksiya Netlify serverida
// (odatda UTC) ishlaydi, shu sabab oddiy `new Date(y,m,d,h,mi,s)` BILAN
// EMAS — aniq `Date.UTC(y,m,d, h-5, mi, s)` bilan hisoblanadi, aks holda
// natija 5 soatga siljib, ogohlantirish noto'g'ri vaqtda kelardi.
//
// "-background" qo'shimchasi MAJBURIY (Netlify'da uzoqroq ishlashga
// ruxsat beradi — boshqa "*-background.js" fayllar bilan bir xil naqsh).

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

const COLLECTION = 'uzex_saved_numbers';
const TASHKENT_UTC_OFFSET_HOURS = 5;
const THRESHOLDS_HOURS = [3, 1]; // KATTADAN KICHIKKA — tartib muhim emas, lekin shunday o'qish qulayroq

function parseUzexEndMsUTC(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):?(\d{2})?/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - TASHKENT_UTC_OFFSET_HOURS, +m[5], +(m[6] || 0));
}

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

// number-watch-check-background.js / uzex-watch-check-background.js bilan
// BIR XIL bot/chat ID'lardan foydalanadi — yangi environment variable
// qo'shish shart emas.
async function notifyAdmin(text) {
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) await sendTelegramMessage(token, chatId, text);
}

exports.handler = async function () {
  try {
    const snap = await db.collection(COLLECTION).get();
    if (snap.empty) return { statusCode: 200, body: 'ok: saqlangan raqam yoq' };

    const now = Date.now();
    let checked = 0, notified = 0;

    for (const doc of snap.docs) {
      const item = doc.data();
      const endMs = parseUzexEndMsUTC(item.endDate);
      if (!endMs) continue;
      checked++;

      const hoursLeft = (endMs - now) / 3600000;
      // Savdo allaqachon tugagan — ogohlantirish keragi yo'q (hujjat
      // o'zi ham "Saqlanganlar" ro'yxatida qolaveradi, admin o'zi
      // o'chiradi — biz avtomatik o'chirmaymiz).
      if (hoursLeft <= 0) continue;

      const alerted = item.expiryAlertsSent || {};
      const updates = {};

      for (const h of THRESHOLDS_HOURS) {
        const key = String(h) + 'h';
        if (hoursLeft <= h && !alerted[key]) {
          await notifyAdmin(
            `⏰ Saqlangan raqam savdosi tugashiga ${h} soat qoldi!\n\n` +
            `📱 ${formatNumber(item.number)} - ${item.price ? Number(item.price).toLocaleString('ru-RU') + " so'm" : "narxi ko'rsatilmagan"}\n` +
            `🏢 ${item.seller || "sotuvchi ko'rsatilmagan"}\n\n` +
            `🏛️ UZEX auksion — Saqlanganlar ro'yxatidan`
          );
          updates['expiryAlertsSent.' + key] = true;
          notified++;
        }
      }

      if (Object.keys(updates).length) {
        await doc.ref.update(updates);
      }
    }

    return { statusCode: 200, body: `ok: ${checked} ta saqlangan raqam tekshirildi, ${notified} ta ogohlantirish yuborildi` };
  } catch (err) {
    console.error('UZEX-SAVED-EXPIRY-CHECK XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
