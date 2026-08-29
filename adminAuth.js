// XAVFSIZLIK — MARKAZIY ADMIN TEKSHIRUVI.
//
// MUAMMO (ilgari): har bir funksiya faqat `admin.auth().verifyIdToken()`
// muvaffaqiyatli o'tishini tekshirar edi — bu FAQAT "bu odam Firebase
// loyihasida ro'yxatdan o'tgan, HAQIQIY hisobga ega" degani, "bu odam
// ADMIN" degani EMAS. Agar Firebase konsolida Email/Parol provayderida
// o'z-o'zini ro'yxatdan o'tkazish (self-signup) yoqilgan bo'lsa — bu
// odatiy standart holat — unda HAR KIM ochiq (maxfiy bo'lmagan) Firebase
// Web API kalitidan foydalanib o'ziga hisob ochib, shu tokenni yuborib,
// o'zini ADMIN sifatida tanitib qo'ya oladi. Natijada: butun mijozlar
// bazasi, operator login-parollari, kredit shartnomalari va h.k. — barchasi
// xavf ostida qoladi.
//
// YECHIM: endi token muvaffaqiyatli tekshirilishi YETARLI EMAS — token
// ichida Firebase Custom Claim sifatida `admin: true` borligi ham
// tekshiriladi. Bu claim FAQAT server tomonidan (Admin SDK orqali) —
// aynan shu loyihadagi admin-grant-role.js yoki admin-manage-admins.js
// funksiyasi orqali — beriladi, oddiy foydalanuvchi o'ziga o'zi bera
// olmaydi.
//
// "BOSHQARUV" (ko'p adminli) tizimi — qo'shimcha ikki qatlam:
//   1. superAdmin claim — FAQAT qo'lda, maxfiy kalit orqali
//      (admin-grant-role.js) beriladi. Bosh admin — HAMMASIGA ruxsatli.
//   2. perms claim — "Boshqaruv" bo'limidan yaratilgan sub-adminlarga
//      biriktiriladigan, bo'lim-bo'lim (masalan {numbers:1, orders:1})
//      ruxsatlar ro'yxati. Bu claim UMUMAN yo'q bo'lsa (eski, tizimdan
//      OLDIN yaratilgan admin hisoblar) — hech narsa buzilmasin deb,
//      TO'LIQ huquqli deb hisoblanadi (orqaga moslik).
//
// MUHIM: yangi bosh-admin hisobga bu huquqni berish uchun
// admin-grant-role.js fayldagi yo'riqnomaga qarang.

const admin = require('firebase-admin');

/**
 * event ichidan Firebase ID tokenni oladi, tekshiradi va uning
 * `admin: true` maxsus huquqiga (custom claim) ega ekanini tasdiqlaydi.
 * `opts.feature` berilsa — shu bo'limga (masalan 'watch', 'operators')
 * aniq ruxsati borligini ham tekshiradi (bosh admin va "perms" claim'i
 * umuman yo'q eski hisoblar avtomatik o'tadi).
 * Muvaffaqiyatli bo'lsa — dekodlangan tokenni (uid, email, ...) qaytaradi.
 * Aks holda xato tashlaydi (chaqiruvchi buni ushlab, 401/403 qaytarishi kerak).
 */
async function requireAdmin(event, opts) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    const err = new Error("Token yo'q");
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    // checkRevoked=true: agar bu hisobning tokenlari majburan bekor
    // qilingan bo'lsa (masalan "Boshqaruv" bo'limidan to'xtatilgan yoki
    // o'chirilgan bo'lsa — qarang: admin-manage-admins.js), ESKI (hali
    // muddati o'tmagan) token ham SHU ZAHOTIYOQ rad etiladi. Aks holda
    // to'xtatilgan admin o'zining eski (10 daqiqagacha yaroqli) tokeni
    // bilan ishlashda davom etishi mumkin bo'lardi.
    decoded = await admin.auth().verifyIdToken(idToken, true);
  } catch (e) {
    const err = new Error("Token yaroqsiz, muddati o'tgan yoki hisob to'xtatilgan");
    err.statusCode = 401;
    throw err;
  }

  if (decoded.admin !== true) {
    const err = new Error('Bu hisobda admin huquqi yo\'q');
    err.statusCode = 403;
    throw err;
  }

  const isSuper = decoded.superAdmin === true;

  // Sub-admin profili "to'xtatilgan" (active:false) bo'lsa — token hali
  // texnik jihatdan yaroqli bo'lsa ham darhol rad etamiz. (Odatda
  // to'xtatishda revokeRefreshTokens ham chaqiriladi, lekin bu — qo'shimcha,
  // darhol ta'sir qiladigan xavfsizlik qatlami.)
  if (!isSuper) {
    try {
      const db = admin.firestore();
      const profSnap = await db.collection('admins').doc(decoded.uid).get();
      if (profSnap.exists && profSnap.data().active === false) {
        const err = new Error("Bu admin hisobi vaqtincha to'xtatilgan");
        err.statusCode = 403;
        throw err;
      }
    } catch (e) {
      if (e.statusCode) throw e;
      // Firestore o'qishda kutilmagan (masalan vaqtinchalik tarmoq) xato
      // bo'lsa ham davom etamiz — aks holda Firestore'dagi vaqtinchalik
      // nosozlik BARCHA adminlarni tizimdan chiqarib yuborgan bo'lardi.
    }
  }

  if (opts && opts.feature) {
    const hasAccess =
      isSuper ||
      decoded.perms === undefined ||               // eski admin — hammasiga ruxsat
      decoded.perms[opts.feature] === 1;
    if (!hasAccess) {
      const err = new Error("Bu bo'limga ruxsatingiz yo'q");
      err.statusCode = 403;
      throw err;
    }
  }

  return decoded;
}

/**
 * requireAdmin bilan bir xil, lekin qo'shimcha ravishda hisobda
 * superAdmin (ENG KATTA / bosh admin) huquqi borligini ham talab qiladi.
 * "Boshqaruv" bo'limi (admin qo'shish/o'chirish, ruxsatlarni boshqarish)
 * FAQAT shu tekshiruvdan o'tgan so'rovlarga ochiq.
 */
async function requireSuperAdmin(event) {
  const decoded = await requireAdmin(event);
  if (decoded.superAdmin !== true) {
    const err = new Error('Bu amal faqat bosh admin uchun');
    err.statusCode = 403;
    throw err;
  }
  return decoded;
}

module.exports = { requireAdmin, requireSuperAdmin };
