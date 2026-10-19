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

/* ---------- JONLI RAQAM QULFLARI (live_reservations) ----------
   "Standart" (operatordan jonli qidirilgan) raqamlarda Firestore'da
   hujjat yo'q, shu sabab ikki mijoz bir vaqtda bitta raqamga buyurtma
   bermasin deb yengil "qulf" hujjati yoziladi. U ANONIM yoziladi va
   ilgari HECH QACHON tozalanmasdi — ya'ni kimdir skript bilan minglab
   raqamga qulf qo'yib, butun Standart katalogga buyurtma berishni to'sib
   qo'yishi mumkin edi (V76 da yopildi).
   Endi 2 soatdan eski qulflar o'chiriladi: qulfning maqsadi faqat "bir
   vaqtda ikki buyurtma"ning oldini olish; undan keyin raqamning holati
   operatorning o'zidan ko'rinadi. */
async function jonliQulflarniTozala() {
  try {
    const chegara = Date.now() - 2 * 60 * 60 * 1000;
    const qulflar = await db.collection('live_reservations').limit(2000).get();
    if (qulflar.empty) return 0;
    let b = db.batch(), n = 0;
    qulflar.forEach(d => {
      const v = d.data() || {};
      const ms = v.reservedAt && v.reservedAt.toMillis ? v.reservedAt.toMillis() : 0;
      if (!ms || ms < chegara) { b.delete(d.ref); n++; }
    });
    if (n) await b.commit();
    return n;
  } catch (e) {
    console.error('live_reservations tozalashda xato:', e);
    return 0;
  }
}

exports.handler = async function (event) {
  /* XAVFSIZLIK (V73): bu funksiya jadval bo'yicha ishlaydi —
     tashqaridan chaqirilishi kerak emas. Qarang: lib/jadvalQalqon.js */
  if (!jadvalOk(event)) return { statusCode: 403, body: 'forbidden' };

  try {
    const reservedSnap = await db.collection('numbers').where('reserved', '==', true).get();
    if (reservedSnap.empty) {
      const n = await jonliQulflarniTozala();
      return { statusCode: 200, body: 'ok: band raqam yoq, ' + n + ' ta eski jonli qulf o\'chirildi' };
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

    /* MUHIM (V73): faqat ESKIRGAN "band"lar bo'shatiladi.
       Ilgari yosh tekshirilmasdi — ya'ni bu funksiya ishga tushganda
       ADMIN hozirgina qo'lda band qilgan raqam ham (unga hali buyurtma
       hujjati bog'lanmagani uchun) bo'shab ketishi mumkin edi. Endi
       kamida 30 daqiqa turgan "band"largina bo'shatiladi. */
    const ESKIRISH_MS = 30 * 60 * 1000;
    const endi = Date.now();
    for (const doc of reservedDocs) {
      const d = doc.data() || {};
      const vaqt = d.reservedAt && d.reservedAt.toMillis ? d.reservedAt.toMillis() : 0;
      if (vaqt && (endi - vaqt) < ESKIRISH_MS) continue;    // hali yangi — tegilmaydi
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

    const qulfOchirildi = await jonliQulflarniTozala();

    return { statusCode: 200, body: `ok: ${batchCount} ta bo'shatildi, ${reservedDocs.length - batchCount} ta haqiqiy band qoldi, ${qulfOchirildi} ta eski jonli qulf o'chirildi` };
  } catch (err) {
    console.error('RELEASE-STALE-RESERVATIONS XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
