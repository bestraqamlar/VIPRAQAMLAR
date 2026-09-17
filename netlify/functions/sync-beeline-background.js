// BEELINE — KAMYOB TOIFALARNI FON SINXRONIZATSIYASI
// (netlify.toml'dagi jadval bo'yicha ishlaydi)
//
// ============================ NEGA KERAK ============================
// Beeline ochiq API'sining javob vaqti KATEGORIYAGA bog'liq: kategoriyada
// raqam qancha KAM bo'lsa, u shuncha UZOQ qidiradi (butun bazani skanerlab
// chiqadi). Real o'lchov (bir xil mask, 3 martadan):
//
//   Oddiy  (0 so'm)    ~36 000 ta raqam    0.3-0.5 s   <- tez
//   Bronze (100 000)   ~1 700 ta           3.0-3.4 s
//   Silver (250 000)   ~1 600 ta           8.3-9.4 s   <- eng sekin
//   Gold   (500 000)   ~1 600 ta           4.8-4.9 s
//
// Ya'ni mijoz eng ko'p qiziqadigan QIMMAT raqamlar eng sekin keladi.
// Bundan tashqari ochiq API PARALLEL so'rovni ko'tarmaydi: 4 ta so'rov
// bir vaqtda yuborilsa "JWT token invalid" (HTTP 500) qaytadi (o'lchangan:
// 2 parallel — xatosiz, 4 parallel — 1/4 xato, 8 parallel — 2/8 xato).
// Shu sabab 4 kategoriyani ketma-ket so'rash = 16-17 soniya. Mijoz bunchalik
// kutmasligi kerak.
//
// ============================ YECHIM ============================
// Kamyob (va sekin) uchta toifa — Bronze, Silver, Gold — shu yerda, FONDA
// yig'ilib Firestore'ga (live_cache/Beeline) yoziladi. Mijoz qidirganda
// ular keshdan, bir zumda beriladi. "Oddiy" toifa esa keshlanmaydi —
// u allaqachon 0.3 soniyada keladi va hajmi katta (~36 000 raqam ≈ 3.8 MB,
// Firestore hujjat limiti esa 1 MB).
//
// ==================== MASKA QANDAY BO'LINADI ====================
// Bitta so'rov eng ko'pi bilan 90 ta raqam qaytaradi (size=200 -> HTTP 422;
// page=1 aynan page=0 dagi natijani qaytaradi, ya'ni sahifalash ISHLAMAYDI).
// Shuning uchun maskani bo'lib, ko'p marta so'rash kerak.
//
// MUHIM (tajribada aniqlangan): OXIRGI xonani bo'lish ("9989*******d")
// Gold toifasida so'rovni osiltirib qo'yadi — 10 tadan 9 tasi 15-45
// soniyada ham javob bermadi. BIRINCHI pozitsiyalarni bo'lish esa
// ("9989" dan keyingi 2 xona — operator kodining qolgan qismi) BARQAROR
// ishlaydi, chunki Beeline raqamlarni shu boshlanish bo'yicha indekslaydi.
//
// O'lchangan natija (2 pozitsiya, 3 toifa = 300 so'rov, ketma-ket):
//   4964 ta noyob raqam | 0 xato | 65 soniya | ~215 KB
// Bu ham Netlify funksiya limitiga, ham Firestore 1 MB limitiga sig'adi.
//
// ==================== XAVFSIZLIK / ISHONCHLILIK ====================
// Agar sinxronizatsiya BUTUNLAY muvaffaqiyatsiz bo'lsa (0 ta raqam), eski
// ma'lumot Firestore'da O'ZGARTIRILMAY qoladi — mijoz bo'sh ro'yxat emas,
// eskiroq (lekin mavjud) natija ko'radi. Admin Telegram orqali xabardor
// qilinadi, lekin "spam" bo'lmasligi uchun bir xil muammo haqida ko'pi
// bilan 30 daqiqada bir marta.

const admin = require('firebase-admin');
const {
  getBeelinePublicSession,
  beelinePublicFetchCategory,
  BEELINE_PUBLIC_RARE_IDS,
  beelineSalePrice
} = require('./lib/operators');

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

// Firestore hujjati 1 MB dan oshmasligi kerak. Bitta raqam ~105 bayt,
// ya'ni 1 MB ga ~9900 ta sig'adi. O'lchovda 4964 ta chiqdi (~215 KB) —
// bu chegara faqat ehtiyot uchun, kutilmagan o'sishda hujjat buzilmasin.
const MAX_STORED_ITEMS = 8000;

// So'rovlar orasidagi kichik pauza — Beeline'ga "portlash" (burst) bo'lib
// tushmasligi uchun. O'lchovda pauzasiz ham 300 so'rov xatosiz o'tdi,
// lekin production'da operator tomoni band bo'lishi mumkin.
const REQUEST_PAUSE_MS = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  const startedAt = Date.now();
  try {
    // Narx jadvali (operator narxi -> sotuv narxi). Adminkada sozlanadi.
    let priceTable = null;
    try {
      const cfgDoc = await db.collection('operator_config').doc('main').get();
      const cfg = cfgDoc.exists ? (cfgDoc.data() || {}) : {};
      const bee = cfg.Beeline || {};
      if (bee.prices && bee.prices.length) priceTable = bee.prices;
    } catch (e) {
      console.error('sync-beeline: operator_config o\'qilmadi:', e.message);
    }

    const session = await getBeelinePublicSession();
    const rareIds = BEELINE_PUBLIC_RARE_IDS;
    const categories = session.categories.filter(c => rareIds.includes(c.id));

    if (!categories.length) {
      console.error('sync-beeline: kamyob toifalar topilmadi, sinxronizatsiya to\'xtatildi');
      return { statusCode: 200, body: 'skip: toifa yo\'q' };
    }

    // "9989" dan keyingi IKKI pozitsiyani 00..99 bo'ylab bo'lamiz.
    // Bu Beeline indeksiga mos keladi va so'rovlar barqaror ishlaydi.
    const prefixes = [];
    for (let d1 = 0; d1 < 10; d1++) {
      for (let d2 = 0; d2 < 10; d2++) prefixes.push(String(d1) + String(d2));
    }

    const byNumber = new Map();
    const errors = [];
    let requests = 0;

    for (const cat of categories) {
      for (const pref of prefixes) {
        const mask = '9989' + pref + '******';
        requests++;
        try {
          const items = await beelinePublicFetchCategory({
            sid: session.sid,
            categoryId: cat.id,
            categoryName: cat.name,
            categoryPrice: cat.operatorPrice,
            mask
          });
          items.forEach(x => {
            if (!byNumber.has(x.number)) {
              byNumber.set(x.number, {
                number: x.number,
                operator: 'Beeline',
                category: x.category,
                operatorPrice: x.operatorPrice,
                price: beelineSalePrice(priceTable, x.operatorPrice)
              });
            }
          });
        } catch (err) {
          errors.push(cat.name + ' ' + pref + ': ' + err.message);
        }
        if (REQUEST_PAUSE_MS) await sleep(REQUEST_PAUSE_MS);
      }
    }

    const merged = [...byNumber.values()];

    if (merged.length === 0) {
      // Butunlay muvaffaqiyatsiz — ESKI ma'lumotni saqlab qolamiz.
      const uniqErrors = [...new Set(errors)].slice(0, 5);
      console.error('sync-beeline: hech narsa olinmadi:', uniqErrors);

      const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000;
      let shouldNotify = true;
      try {
        const statusDoc = await db.collection('live_cache').doc('Beeline').get();
        const lastNotifyAt = statusDoc.exists && statusDoc.data().lastFailNotifyAt
          ? statusDoc.data().lastFailNotifyAt.toMillis() : 0;
        shouldNotify = (Date.now() - lastNotifyAt) > NOTIFY_COOLDOWN_MS;
      } catch (_) { /* holatni bilmasak — xavfsizlik uchun xabar yuboraveramiz */ }

      if (shouldNotify) {
        await notifyAdmin(
          '⚠️ Beeline sinxronizatsiyasi muvaffaqiyatsiz (0 ta raqam olindi). '
          + 'Mijozlarga eski ma\'lumot ko\'rsatilishda davom etadi. '
          + '(Muammo davom etsa, keyingi xabar 30 daqiqadan keyin.)\n\n'
          + 'Xatolar: ' + uniqErrors.join('; ')
        );
        try {
          await db.collection('live_cache').doc('Beeline').set(
            { lastFailNotifyAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
        } catch (_) {}
      }
      return { statusCode: 200, body: 'fail: 0 items, old cache kept' };
    }

    merged.sort((a, b) => a.price - b.price);
    const toStore = merged.slice(0, MAX_STORED_ITEMS);

    await db.collection('live_cache').doc('Beeline').set({
      items: toStore,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Qaysi toifalar keshda — api-live-search shu ro'yxatga qarab
      // qaysi toifani keshdan, qaysinisini jonli olishni hal qiladi.
      cachedCategoryIds: categories.map(c => c.id),
      requests,
      errors: [...new Set(errors)].slice(0, 5)
    });

    const secs = Math.round((Date.now() - startedAt) / 1000);
    return {
      statusCode: 200,
      body: `ok: ${toStore.length} ta raqam, ${requests} so'rov, ${secs}s, xato: ${errors.length}`
    };
  } catch (err) {
    console.error('SYNC-BEELINE XATOSI:', err);
    await notifyAdmin('⚠️ Beeline sinxronizatsiyasida kutilmagan xato: ' + err.message);
    return { statusCode: 500, body: 'error' };
  }
};
