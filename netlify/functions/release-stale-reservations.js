// XAVFSIZLIK: soxta "band qilingan" belgilarni avtomatik bo'shatadi.
//
// Nega kerak: firestore.rules'da anonim (tizimga kirmagan) mijoz
// 'numbers' hujjatining 'reserved' maydonini false→true qila oladi —
// bu ataylab shunday qilingan, chunki oddiy mijoz buyurtma berganda
// autentifikatsiyasiz turib raqamni "band" qilib qo'yishi kerak.
// Lekin xuddi shu qoida ataylab yomon niyatli odam tomonidan
// suiiste'mol qilinishi mumkin: brauzer konsolidan yoki skriptdan
// to'g'ridan-to'g'ri Firestore SDK chaqirib, HAQIQIY BUYURTMA
// bermasdan turib barcha (yoki ko'p) raqamlarni "band" qilib
// qo'yish — natijada butun katalog soxta ravishda "sotilgan" bo'lib
// ko'rinadi (DoS-uslub hujum).
//
// Yechim: har doim HAQIQIY band qilish (sayt/mobil ilova/Telegram bot
// orqali) bir vaqtning o'zida 'orders' to'plamida ham mos yozuv
// yaratadi (finalizeOrder, api-create-order.js, customer-bot-webhook.js
// — barchasi shu tartibda ishlaydi: avval order, keyin reserved:true).
// Demak: agar biror raqam reserved==true bo'lsa-yu, unga mos
// numberId bilan HECH QANDAY buyurtma topilmasa — bu reservatsiya
// SOXTA, chunki hech qanday qonuniy yo'l bunday holatni hosil
// qila olmaydi. Bu funksiya har 10 daqiqada shunday soxta
// "band"larni topib, avtomatik bo'shatadi.
//
// Diqqat: bu funksiya VAQT (necha daqiqa o'tgani) bo'yicha emas,
// balki BOG'LIQ BUYURTMA BOR-YO'QLIGI bo'yicha qaror qiladi — shu
// sabab haqiqiy, hali admin ko'rib chiqmagan buyurtmalar (bir necha
// kun kutsa ham) хato bilan bo'shatib yuborilmaydi.

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

async function notifyAdmin(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) { /* xabar yubormasa ham, asosiy vazifa bajarilaveradi */ }
}

exports.handler = async function () {
  try {
    const reservedSnap = await db.collection('numbers').where('reserved', '==', true).get();
    if (reservedSnap.empty) {
      return { statusCode: 200, body: 'ok: band raqam yoq' };
    }

    const released = [];

    // Firestore 'in' so'rovi bir vaqtda ko'pi bilan 30 ta qiymatni
    // qabul qiladi — shu sabab numberId'larni 30talik guruhlarga
    // bo'lib tekshiramiz.
    const reservedDocs = reservedSnap.docs;
    const CHUNK = 30;
    const hasOrderFor = new Set();

    for (let i = 0; i < reservedDocs.length; i += CHUNK) {
      const chunk = reservedDocs.slice(i, i + CHUNK);
      const ids = chunk.map(d => d.id);

      const ordersSnap = await db.collection('orders')
        .where('numberId', 'in', ids)
        .get();
      ordersSnap.forEach(o => {
        const numberId = o.data().numberId;
        if (numberId) hasOrderFor.add(numberId);
      });
    }

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of reservedDocs) {
      if (!hasOrderFor.has(doc.id)) {
        batch.update(doc.ref, {
          reserved: false,
          reservedAt: admin.firestore.FieldValue.delete()
        });
        released.push(doc.data().number || doc.id);
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      await notifyAdmin(
        `⚠️ Diqqat: ${batchCount} ta raqamda "band" belgisi bor edi, lekin ularga mos buyurtma topilmadi — avtomatik bo'shatildi (bu ehtimol tizimni suiiste'mol qilishga urinish bo'lgan).\n\n` +
        released.slice(0, 20).join(', ') + (released.length > 20 ? `\n... va yana ${released.length - 20} ta` : '')
      );
    }

    return { statusCode: 200, body: `ok: ${batchCount} ta bo'shatildi, ${reservedDocs.length - batchCount} ta haqiqiy band qoldi` };
  } catch (err) {
    console.error('RELEASE-STALE-RESERVATIONS XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
