// TARIF MUDDATINI KUZATISH — har kuni bir marta o'zi ishga tushadi.
//
// IKKI ISH QILADI:
//
//   1) OGOHLANTIRISH. Tarif tugashiga 3 kun yoki kamroq qolgan
//      dilerga kabinetdagi yozishma orqali xabar yoziladi (va adminga
//      Telegram). Shunda diler "nega raqamlarim oddiy bo'lib qoldi"
//      deb hayron bo'lmaydi — oldindan bilib turadi. Xabar har kuni
//      qayta yozilmaydi (24 soatda bir marta).
//
//   2) MUDDAT TUGASA — TOIFALARNI O'CHIRISH. Diler to'lamagan bo'lsa,
//      uning raqamlaridagi VIP/Premium/Gold rang-yorliqlari va
//      "Mashhur" belgisi olib tashlanadi. MUHIM: RAQAMNING O'ZI
//      SAYTDAN YO'QOLMAYDI — u oddiy raqam bo'lib qolaveradi va
//      sotilishi mumkin. Keyin diler to'lasa, toifani qaytadan
//      qo'yadi (joyi bo'sh turgan bo'ladi).
//
// NEGA "-background": bir nechta dilerning minglab raqami bo'lsa,
// ish 10 soniyadan oshishi mumkin. Background funksiyaga Netlify
// 15 daqiqagacha ruxsat beradi.
//
// Jadval netlify.toml ichida: [functions."tarif-muddat-background"]

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
const NOW = () => admin.firestore.FieldValue.serverTimestamp();

const KUN = 86400000;
const OGOH_KUN = 3;              // tugashiga shuncha kun qolganda ogohlantiriladi
const OGOH_TAKROR = 20 * 3600000; // bir ogohlantirishdan keyin shuncha vaqt jim

async function telegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
  } catch (e) {}
}

async function dilergaXabar(sellerId, text) {
  try {
    await db.collection('seller_messages').add({
      sellerId, from: 'admin', text, createdAt: NOW(), createdAtSort: Date.now()
    });
    await db.collection('sellers').doc(sellerId)
      .update({ unreadForSeller: admin.firestore.FieldValue.increment(1) }).catch(() => {});
  } catch (e) {}
}

/* Dilerning ajratilgan raqamlarini oddiy holatga qaytaradi.
   `promoSeller` maydoni FAQAT ajratilgan raqamlarda bo'ladi — shu
   sabab 10 000 raqamli dilerda ham so'rov 10-15 hujjatga tegadi. */
async function toifalarniOchir(sellerId) {
  let ochirildi = 0;
  for (let aylanish = 0; aylanish < 30; aylanish++) {
    const q = await db.collection('numbers').where('promoSeller', '==', sellerId)
      .limit(300).get().catch(() => null);
    if (!q || q.empty) break;
    const batch = db.batch();
    q.docs.forEach(d => batch.update(d.ref, {
      tier: '', featured: false,
      promoSeller: admin.firestore.FieldValue.delete(),
      tarifTugadiAt: Date.now()
    }));
    await batch.commit();
    ochirildi += q.docs.length;
    if (q.docs.length < 300) break;
  }
  if (ochirildi) {
    // Katalog indeksi yangilansin — saytda eski rang qolib ketmasin
    await db.collection('search_index').doc('dirty').set({ at: Date.now() }).catch(() => {});
  }
  return ochirildi;
}

exports.handler = async function (event) {
  /* XAVFSIZLIK (V73): bu funksiya jadval bo'yicha ishlaydi —
     tashqaridan chaqirilishi kerak emas. Qarang: lib/jadvalQalqon.js */
  if (!(await jadvalOk(event, 'tarif-muddat-background', 60000))) return { statusCode: 403, body: 'forbidden' };

  const hozir = Date.now();
  const natija = { ogohlantirildi: 0, tugatildi: 0, raqam: 0 };

  // Muddati 3 kun ichida tugaydigan (yoki allaqachon tugagan) dilerlar.
  // So'rov BITTA maydon bo'yicha — qo'shimcha indeks kerak emas.
  const q = await db.collection('sellers')
    .where('planUntil', '<', hozir + OGOH_KUN * KUN)
    .limit(500).get().catch(() => null);
  if (!q || q.empty) return { statusCode: 200, body: JSON.stringify(natija) };

  for (const d of q.docs) {
    const x = d.data() || {};
    if (!x.plan) continue;                      // tarifi yo'q — tegmaymiz
    const until = Number(x.planUntil) || 0;
    if (!until) continue;

    if (until <= hozir) {
      /* ---- MUDDAT TUGADI ---- */
      const n = await toifalarniOchir(d.id);
      await d.ref.update({
        plan: '', planUntil: 0,
        oldPlan: x.plan, planEndedAt: Date.now()
      }).catch(() => {});
      await dilergaXabar(d.id,
        'Tarif muddati tugadi. Raqamlaringizdagi toifa belgilari (VIP / Premium / Gold / Mashhur) ' +
        'olib tashlandi — lekin raqamlar saytda qolaveradi va sotilishi mumkin. ' +
        'Tarifni qayta yoqsangiz, toifani darhol qaytarasiz.');
      await telegram('⏰ Tarif tugadi: ' + (x.name || x.username || d.id) +
        ' (' + x.plan + '). ' + n + ' raqamdan toifa olindi.');
      natija.tugatildi++; natija.raqam += n;
    } else {
      /* ---- TUGASHIGA 3 KUN YOKI KAMROQ ---- */
      const oxirgi = Number(x.planWarnedAt) || 0;
      if (hozir - oxirgi < OGOH_TAKROR) continue;
      const kun = Math.max(1, Math.ceil((until - hozir) / KUN));
      await d.ref.update({ planWarnedAt: hozir }).catch(() => {});
      await dilergaXabar(d.id,
        'Eslatma: tarifingiz ' + kun + ' kundan keyin tugaydi. To‘lanmasa raqamlaringizdagi ' +
        'toifa belgilari avtomatik olib tashlanadi (raqamlar saytda qoladi). ' +
        'Kabinetdagi "Tarif" bo‘limidan uzaytirishingiz mumkin.');
      await telegram('⚠️ Tarif tugayapti: ' + (x.name || x.username || d.id) +
        ' — ' + kun + ' kun qoldi.');
      natija.ogohlantirildi++;
    }
  }

  return { statusCode: 200, body: JSON.stringify(natija) };
};
