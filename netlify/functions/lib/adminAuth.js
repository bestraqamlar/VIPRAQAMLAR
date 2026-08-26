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
// aynan shu loyihadagi admin-grant-role.js funksiyasi orqali — beriladi,
// oddiy foydalanuvchi o'ziga o'zi bera olmaydi.
//
// MUHIM: yangi admin hisobga bu huquqni berish uchun admin-grant-role.js
// faylidagi yo'riqnomaga qarang.

const admin = require('firebase-admin');

/**
 * event ichidan Firebase ID tokenni oladi, tekshiradi va uning
 * `admin: true` maxsus huquqiga (custom claim) ega ekanini tasdiqlaydi.
 * Muvaffaqiyatli bo'lsa — dekodlangan tokenni (uid, email, ...) qaytaradi.
 * Aks holda xato tashlaydi (chaqiruvchi buni ushlab, 401/403 qaytarishi kerak).
 */
async function requireAdmin(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) {
    const err = new Error("Token yo'q");
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (e) {
    const err = new Error('Token yaroqsiz yoki muddati o\'tgan');
    err.statusCode = 401;
    throw err;
  }

  if (decoded.admin !== true) {
    const err = new Error('Bu hisobda admin huquqi yo\'q');
    err.statusCode = 403;
    throw err;
  }

  return decoded;
}

module.exports = { requireAdmin };
