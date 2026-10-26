// KABINETGA KIRISH — BITTA YO'L: TELEGRAM BOTI (V131)
// ===================================================
// Mijoz saytda telefon raqamini yozadi va «Kodni olish» ni bosadi.
// Shundan keyin BARCHA ISH BOTDA bo'ladi: havola botni ochadi, bot
// avtomatik «Start» bo'ladi, raqamni tasdiqlaydi va 4 xonali kodni
// bosib-nusxalanadigan ko'rinishda yuboradi. Mijoz kodni saytga
// joylashtiradi — tamom.
//
// SMS YO'Q, "raqamning oxirgi 4 ta raqami" degan zaxira yo'l ham YO'Q
// (V131'da ataylab olib tashlandi): bitta, ishonchli yo'l.
//
// ===================== XAVFSIZLIK (ENG MUHIMI) =====================
// Eng katta xavf shu: kimdir BOSHQA ODAMNING raqamini yozib, havolani
// O'Z Telegram'ida ochadi va kodni oladi. Shunda u begona kabinetga
// kirib qolardi.
//
// Shuning uchun qoida QAT'IY: kod FAQAT shu raqamning HAQIQIY
// egasiga yuboriladi. Bot kodni yuborishdan oldin Telegram'ning o'z
// «kontakt yuborish» tugmasi orqali raqamni oladi va:
//    * `contact.user_id` yozgan odamning ID'siga TENG bo'lishi shart
//      (birovning kontakt kartochkasi o'tmaydi);
//    * yuborilgan raqam saytda KIRITILGAN raqam bilan BIR XIL bo'lishi
//      shart (aks holda "mos kelmadi" deb rad etiladi).
// Ya'ni hujumchi begona raqamni yozsa, bot undan O'SHA raqamni
// so'raydi; Telegram esa faqat uning O'Z raqamini beradi — mos
// kelmaydi, kod yuborilmaydi.
//
// Qo'shimcha himoya:
//    * `boshla` so'rovi bitta martalik NONCE yaratadi (10 daqiqa),
//      nonce raqamga bog'langan va bir marta ishlatiladi;
//    * kodning o'zi bazaga yozilmaydi — faqat SHA-256 xeshi;
//    * kod 5 daqiqa, 3 ta xato urinish, keyin bekor;
//    * telefon bo'yicha soatiga 10 ta xato, kuniga 15 ta kod — IP
//      almashtirib aylanib o'tib bo'lmaydi;
//    * botdagi "bir bosishda kirish" havolasi BIR MARTALIK kalit
//      (10 daqiqa) — token chatda yozilib qolmaydi.

const admin = require('firebase-admin');
const crypto = require('crypto');
const { tezlikOk } = require('./lib/tezlik');
const { kabinetToken } = require('./lib/kabinetToken');

let ULANISH_XATOSI = null;
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  } catch (e) { ULANISH_XATOSI = (e && e.message) || "sabab noma'lum"; }
}
let db = null;
if (!ULANISH_XATOSI && admin.apps.length) {
  db = admin.firestore();
  try { db.settings({ preferRest: true }); } catch (e) {}
}

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-firebase-appcheck, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const javob = (kod, obj) => ({ statusCode: kod, headers: CORS, body: JSON.stringify(obj) });

const KODLAR = 'kabinet_login_codes';     // telefon -> kod xeshi
const NONCELAR = 'kabinet_login_nonces';  // nonce -> telefon
const KALITLAR = 'kabinet_login_keys';    // bir martalik kirish kaliti
const HISOB = 'kabinet_login_fails';      // telefon bo'yicha xato/kod hisobi

const NONCE_MUDDAT_MS = 10 * 60 * 1000;
const KALIT_MUDDAT_MS = 10 * 60 * 1000;
const ENG_KOP_URINISH = 3;
const SOATLIK_XATO = 10;
const KUNLIK_KOD = 15;

const BOT_NOMI = String(process.env.CUSTOMER_BOT_USERNAME || 'vip_raqamlar_bot').replace(/[^\w]/g, '');

async function appCheckOk(event) {
  const token = (event.headers && (event.headers['x-firebase-appcheck'] || event.headers['X-Firebase-AppCheck'])) || '';
  if (!token) return true;
  try { await admin.appCheck().verifyToken(token); return true; }
  catch (e) { return false; }
}

function kodXesh(tel9, kod) {
  return crypto.createHash('sha256').update(tel9 + ':' + kod + ':kabinet').digest('hex');
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return javob(405, { ok: false, error: 'Faqat POST' });
  if (!db) {
    console.error('API-KABINET-KOD: Firebase ulanmagan:', ULANISH_XATOSI);
    return javob(503, { ok: false, error: "Hozir ochib bo'lmadi. Birozdan keyin qayta urining." });
  }
  if (!(await appCheckOk(event))) return javob(401, { ok: false, error: "Ruxsat yo'q" });

  let kirish = {};
  try { kirish = JSON.parse(event.body || '{}'); } catch (e) {}
  const amal = String(kirish.action || '').trim();

  /* ============ 1) BOSHLASH: botga havola olish ============
     Sayt faqat telefon raqamini yuboradi. Javobda — botga havola.
     Kod BU YERDA YUBORILMAYDI: uni bot, raqamni tasdiqlagandan
     keyin yuboradi. Shu sabab bu so'rov "telefon bazada bormi"
     degan ma'lumotni ham ochmaydi. */
  if (amal === 'boshla') {
    const tel9 = String(kirish.phone || '').replace(/\D/g, '').slice(-9);
    if (!/^\d{9}$/.test(tel9)) return javob(200, { ok: false, error: "Telefon raqamini to'liq kiriting" });

    if (!(await tezlikOk(db, event, 'kabinet_code_rate_limits', 20))) {
      return javob(429, { ok: false, error: "Juda ko'p urinish. Bir soatdan so'ng qayta urining." });
    }
    /* Kunlik chegara — bitta raqam uchun cheksiz havola yasalmasin. */
    const kun = new Date().toISOString().slice(0, 10);
    try {
      const hs = await db.collection(HISOB).doc(tel9).get();
      const hd = hs.exists ? (hs.data() || {}) : {};
      if (hd.dayKey === kun && (Number(hd.codes) || 0) >= KUNLIK_KOD) {
        return javob(429, { ok: false, error: "Bugun uchun chegara tugadi. Ertaga urinib ko'ring." });
      }
      await db.collection(HISOB).doc(tel9).set(
        hd.dayKey === kun ? { codes: (Number(hd.codes) || 0) + 1 } : { dayKey: kun, codes: 1 },
        { merge: true }
      );
    } catch (e) {}

    /* Nonce — qisqa, URL'ga sig'adigan, taxmin qilib bo'lmaydigan. */
    const nonce = crypto.randomBytes(12).toString('base64url');
    await db.collection(NONCELAR).doc(nonce).set({
      tel9, createdAt: Date.now(), expiresAt: Date.now() + NONCE_MUDDAT_MS, used: false
    });

    return javob(200, {
      ok: true,
      botNomi: BOT_NOMI,
      /* `k_<nonce>` — Telegram deep link. Havola ochilishi bilan
         Telegram «Start» ni O'ZI bosadi va shu matnni botga yuboradi. */
      havola: 'https://t.me/' + BOT_NOMI + '?start=k_' + nonce,
      muddat: Math.round(NONCE_MUDDAT_MS / 1000)
    });
  }

  /* ============ 2) KODNI TEKSHIRISH ============ */
  if (amal === 'tekshir') {
    const tel9 = String(kirish.phone || '').replace(/\D/g, '').slice(-9);
    if (!/^\d{9}$/.test(tel9)) return javob(200, { ok: false, error: "Telefon raqamini to'liq kiriting" });
    if (!(await tezlikOk(db, event, 'kabinet_code_check_limits', 30))) {
      return javob(429, { ok: false, error: "Juda ko'p urinish. Bir soatdan so'ng urinib ko'ring." });
    }
    const kod = String(kirish.code || '').replace(/\D/g, '');
    if (kod.length !== 4) return javob(200, { ok: false, error: "Kod 4 xonali bo'lishi kerak" });

    const hisobRef = db.collection(HISOB).doc(tel9);
    const soatKey = new Date().toISOString().slice(0, 13);
    let hisob = {};
    try {
      const hs = await hisobRef.get();
      hisob = hs.exists ? (hs.data() || {}) : {};
      if (hisob.hourKey === soatKey && (Number(hisob.fails) || 0) >= SOATLIK_XATO) {
        return javob(429, { ok: false, error: "Juda ko'p xato urinish. Bir soatdan so'ng urinib ko'ring." });
      }
    } catch (e) {}

    const ref = db.collection(KODLAR).doc(tel9);
    const snap = await ref.get();
    if (!snap.exists) return javob(200, { ok: false, error: "Kod topilmadi. Yangi kod oling." });
    const d = snap.data() || {};

    if (Date.now() > (Number(d.expiresAt) || 0)) {
      try { await ref.delete(); } catch (e) {}
      return javob(200, { ok: false, error: "Kod muddati tugadi. Yangi kod oling." });
    }
    if ((Number(d.attempts) || 0) >= ENG_KOP_URINISH) {
      try { await ref.delete(); } catch (e) {}
      return javob(200, { ok: false, error: "Juda ko'p xato urinish. Yangi kod oling." });
    }

    const kelgan = Buffer.from(kodXesh(tel9, kod), 'utf8');
    const saqlangan = Buffer.from(String(d.hash || ''), 'utf8');
    const togri = kelgan.length === saqlangan.length && crypto.timingSafeEqual(kelgan, saqlangan);

    if (!togri) {
      await ref.set({ attempts: (Number(d.attempts) || 0) + 1 }, { merge: true });
      try {
        await hisobRef.set(
          hisob.hourKey === soatKey ? { fails: (Number(hisob.fails) || 0) + 1 } : { hourKey: soatKey, fails: 1 },
          { merge: true }
        );
      } catch (e) {}
      const qoldi = ENG_KOP_URINISH - ((Number(d.attempts) || 0) + 1);
      return javob(200, {
        ok: false,
        error: qoldi > 0 ? "Kod noto'g'ri. Yana " + qoldi + " urinish qoldi." : "Kod noto'g'ri. Yangi kod oling."
      });
    }

    try { await ref.delete(); } catch (e) {}
    try { await hisobRef.set({ hourKey: soatKey, fails: 0 }, { merge: true }); } catch (e) {}
    return javob(200, { ok: true, token: kabinetToken.yarat(tel9) });
  }

  /* ============ 3) BIR BOSISHDA KIRISH ============
     Bot kod bilan birga "bir bosishda kirish" havolasini ham beradi:
     saytni ochadi va shu yerga BIR MARTALIK kalit keladi. Kalit
     tokenga almashtiriladi.
     NEGA KALIT, TOKEN EMAS: token 1 yil amal qiladi, uni chat
     tarixida qoldirish noto'g'ri bo'lardi. Kalit esa 10 daqiqa va
     bir martalik. */
  if (amal === 'kalit') {
    if (!(await tezlikOk(db, event, 'kabinet_code_check_limits', 30))) {
      return javob(429, { ok: false, error: "Juda ko'p urinish. Birozdan so'ng urinib ko'ring." });
    }
    const kalit = String(kirish.key || '').trim();
    if (!/^[\w-]{16,64}$/.test(kalit)) return javob(200, { ok: false, error: "Havola yaroqsiz" });

    const ref = db.collection(KALITLAR).doc(kalit);
    const snap = await ref.get();
    if (!snap.exists) return javob(200, { ok: false, error: "Havola yaroqsiz yoki ishlatilgan" });
    const d = snap.data() || {};
    /* Bir martalik: o'qilishi bilan darhol o'chiriladi — havola
       ikkinchi marta ishlamaydi (chat tarixidan qayta bosilsa ham). */
    try { await ref.delete(); } catch (e) {}
    if (Date.now() > (Number(d.expiresAt) || 0)) {
      return javob(200, { ok: false, error: "Havola muddati tugadi. Yangi kod oling." });
    }
    const tel9 = String(d.tel9 || '').replace(/\D/g, '').slice(-9);
    if (!/^\d{9}$/.test(tel9)) return javob(200, { ok: false, error: "Havola yaroqsiz" });
    return javob(200, { ok: true, token: kabinetToken.yarat(tel9), phone: tel9 });
  }

  return javob(400, { ok: false, error: "Noma'lum amal" });
};
