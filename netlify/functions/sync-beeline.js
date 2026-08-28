// BEELINE — DAVRIY TO'LIQ SINXRONIZATSIYA (netlify.toml'da belgilangan
// jadval bo'yicha, HAR 5 DAQIQADA bir marta ishga tushadi).
//
// NEGA KERAK: avval mijoz STANDART bo'limida qidirganda, so'rov TO'G'RIDAN-
// TO'G'RI Beeline serveriga ketardi (bitta qidiruv — 7 ta ombor uchun 7 ta
// parallel so'rov, bitta umumiy dilerlik hisobi orqali). Agar bir vaqtning
// o'zida yuzlab/minglab mijoz turli raqam qidirsa, bu Beeline'ga o'n
// minglab so'rov yuborilishi va ular "429 — so'rovlar chegarasi" xatosi
// bilan javob berishi, YOMONI — Beeline dilerlik hisobimizni vaqtincha
// yoki BUTUNLAY bloklashi mumkin edi.
//
// YECHIM: bu funksiya Beeline'dan mavjud raqamlarni MIJOZLAR SONIDAN
// MUSTAQIL, faqat har 5 daqiqada BIR MARTA to'liq yig'ib, Firestore'ga
// (live_cache/Beeline) saqlaydi. Mijozlar STANDART'da qidirganda endi
// Beeline'ga umuman jonli so'rov ketmaydi (qarang: api-live-search.js) —
// faqat shu saqlangan ro'yxatdan (mask bo'yicha) filtrlanadi. Boshqa
// operatorlar (Ucell, Humans, Mobiuz, Perfektum) hozircha O'ZGARTIRILMAGAN
// — ular hamon jonli so'raladi (faqat Beeline eng ko'p muammo bergani
// uchun birinchi navbatda shu hal qilindi).
//
// QANDAY "TO'LIQ" YIG'ILADI: Beeline API bo'sh maskani ("hammasini ber")
// rad etadi, shu sabab oxirgi raqamni 0 dan 9 gacha almashtirib, 10 xil
// so'rov yuboriladi (har biri o'zining 7 ta ombori bo'yicha ichki so'rovi
// bilan — jami ~70 ta so'rov, HAMMASI BIR VAQTDA, parallel). Bu mijozni
// kutdirmaydigan fon jarayoni bo'lgani uchun, har bir so'rovga qo'yiladigan
// limit ham ancha yuqori (mijozga ko'rsatiladigan jonli qidiruvdagi 40 emas,
// bu yerda 300) — shu bilan bironta ombordagi raqam "chegaradan tashqarida
// qolib" ko'rinmay qolish ehtimoli kamaytiriladi. 100% kafolat emas (agar
// bitta kategoriyada 300 tadan ortiq raqam bo'lsa, ortig'i baribir tushmay
// qoladi), lekin amaliyotda bu juda kam uchraydigan holat.
//
// XAVFSIZLIK: agar bu urinish BUTUNLAY muvaffaqiyatsiz bo'lsa (masalan
// login/parol xato yoki Beeline serveri butunlay javob bermasa), ESKI
// (oldingi muvaffaqiyatli) ma'lumot Firestore'da O'ZGARTIRILMAY qoladi —
// mijozlar hech bo'lmaganda eskiroq (lekin mavjud) natija ko'rishda davom
// etadi, birdaniga "hech narsa yo'q" bo'lib qolmaydi. Bundan tashqari,
// admin Telegram orqali xabardor qilinadi (shu bilan muammo sezilmasdan
// uzoq davom etib ketmaydi).

const admin = require('firebase-admin');
const { searchBeeline } = require('./lib/operators');

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

const SYNC_LIMIT_PER_CALL = 300;
// Firestore hujjati 1MB dan oshmasligi kerak — bu ehtiyot uchun qo'yilgan
// yuqori chegara, amaliyotda hech qachon bunchalik ko'p raqamga yetmaydi.
const MAX_STORED_ITEMS = 3000;

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
    const configDoc = await db.collection('operator_config').doc('main').get();
    const config = configDoc.exists ? (configDoc.data() || {}) : {};
    const beelineCfg = config.Beeline || {};

    if (!(beelineCfg.username || '').trim() || !beelineCfg.password) {
      console.error('sync-beeline: login/parol sozlanmagan (adminka -> Operatorlar), sinxronizatsiya o\'tkazib yuborildi');
      return { statusCode: 200, body: 'skip: login/parol yoq' };
    }

    // Oxirgi raqam 0..9 — har biri o'zining 7 ombor bo'yicha ichki
    // so'rovini yuboradi (searchBeeline ichida, Promise.allSettled bilan).
    //
    // MUHIM: avval BARCHA 10 ta raqam BIR VAQTDA (= 10x7 = 70 ta so'rov
    // bir zumda) yuborilardi. Login-navbat (yuqoridagi getBeelineToken
    // qulfi) 401 xatosini bartaraf qildi, lekin baribir HAR BIR sinxron-
    // izatsiyada "HTTP 400" xatosi bilan HAMMASI muvaffaqiyatsiz bo'lib
    // qolyapti — bu shuni ko'rsatadiki, Beeline tomoni bunday katta
    // "portlash" (burst) so'rovni umuman xush ko'rmaydi (ehtimol avvalgi
    // xato tufayli hisobga vaqtinchalik cheklov qo'yilgan). Shu sabab endi
    // 10 ta raqam KICHIK GURUHLARGA (har birida 2 tadan) bo'lib, guruhlar
    // orasida qisqa pauza bilan YUBORILADI — bir vaqtning o'zida ko'pi
    // bilan 2x7=14 ta so'rov ketadi, portlash yo'qoladi.
    const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const BATCH_SIZE = 2;
    const BATCH_PAUSE_MS = 1500;
    const settled = [];
    for (let i = 0; i < digits.length; i += BATCH_SIZE) {
      const batch = digits.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(d => searchBeeline(['', '', '', '', '', '', d], beelineCfg, SYNC_LIMIT_PER_CALL))
      );
      settled.push(...batchResults);
      if (i + BATCH_SIZE < digits.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_PAUSE_MS));
      }
    }

    const merged = [];
    const seen = new Set();
    const errors = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        r.value.items.forEach(x => {
          if (!seen.has(x.number)) { seen.add(x.number); merged.push(x); }
        });
        if (r.value.errors && r.value.errors.length) errors.push(...r.value.errors);
      } else {
        errors.push('digit ' + digits[i] + ': ' + ((r.reason && r.reason.message) || String(r.reason)));
      }
    });

    if (merged.length === 0) {
      // Butunlay muvaffaqiyatsiz — eski (oldingi) ma'lumotni saqlab
      // qolamiz, USTIDAN YOZMAYMIZ.
      const uniqErrors = [...new Set(errors)].slice(0, 5);
      console.error('sync-beeline: hech narsa olinmadi:', uniqErrors);

      // MUHIM: bu funksiya har 5 daqiqada ishga tushadi — agar muammo
      // uzoq davom etsa, ADMIN'GA HAR 5 DAQIQADA bitta xabar borib,
      // Telegram'ni "spam" qilib yuborardi (aynan shu sodir bo'ldi).
      // Endi xuddi shu (uzluksiz) muammo uchun FAQAT har 30 daqiqada bir
      // marta xabar boradi — Firestore'da saqlangan "oxirgi xabar vaqti"
      // shuni nazorat qiladi (bu maydon items/updatedAt'ga tegmaydi,
      // eski ma'lumot baribir saqlanib qoladi).
      const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;
      let shouldNotify = true;
      try {
        const statusDoc = await db.collection('live_cache').doc('Beeline').get();
        const lastNotifyAt = statusDoc.exists && statusDoc.data().lastFailNotifyAt
          ? statusDoc.data().lastFailNotifyAt.toMillis() : 0;
        shouldNotify = (Date.now() - lastNotifyAt) > NOTIFY_COOLDOWN_MS;
      } catch (_) { /* holatni bilmasak ham — xavfsizlik uchun xabar yuboraveramiz */ }

      if (shouldNotify) {
        await notifyAdmin(
          `⚠️ Beeline sinxronizatsiyasi muvaffaqiyatsiz bo'ldi (0 ta raqam olindi). ` +
          `Mijozlarga eski (oldingi) ma'lumot ko'rsatilishda davom etadi. ` +
          `(Muammo davom etsa, keyingi xabar 30 daqiqadan keyin boradi.)\n\nXatolar: ${uniqErrors.join('; ')}`
        );
        try {
          await db.collection('live_cache').doc('Beeline').set(
            { lastFailNotifyAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
        } catch (_) {}
      } else {
        console.error('sync-beeline: xato davom etyapti, lekin so\'nggi 30 daqiqada xabar berilgan — Telegram\'ga qayta yuborilmadi.');
      }
      return { statusCode: 200, body: 'fail: 0 items, old cache kept' };
    }

    merged.sort((a, b) => a.price - b.price);
    const toStore = merged.slice(0, MAX_STORED_ITEMS);

    await db.collection('live_cache').doc('Beeline').set({
      items: toStore,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      errors: [...new Set(errors)].slice(0, 5)
    });

    return { statusCode: 200, body: `ok: ${toStore.length} ta raqam yangilandi` };
  } catch (err) {
    console.error('SYNC-BEELINE XATOSI:', err);
    await notifyAdmin(`⚠️ Beeline sinxronizatsiyasida kutilmagan xato: ${err.message}`);
    return { statusCode: 500, body: err.message };
  }
};
