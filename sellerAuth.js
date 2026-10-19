// SOTUVCHI (diler) HISOBLARI — parol va seans tokeni.
//
// NEGA ADMIN TIZIMIDAN ALOHIDA: adminlar Firebase Auth orqali kiradi va
// ularda `admin: true` custom claim bor. Sotuvchilarga Firebase hisob
// ochib berish ham qimmat (har biri uchun qo'lda ish), ham xavfli
// (bitta xatoda sotuvchi admin huquqiga yaqinlashib qoladi). Shu sabab
// sotuvchilar butunlay ALOHIDA, soddaroq tizimda: login + parol, va
// imzolangan (HMAC) seans tokeni.
//
// IMZO KALITI — hech narsa sozlash SHART EMAS.
//   Seans tokenlari maxfiy kalit bilan imzolanadi. Kalit shu tartibda
//   olinadi:
//     1. Agar Netlify muhit o'zgaruvchisi SELLER_SECRET qo'yilgan bo'lsa
//        — o'sha ishlatiladi (eng afzal yo'l).
//     2. Aks holda tizim BIRINCHI ishlaganda o'zi tasodifiy kalit hosil
//        qilib, Firestore'ning `sys_config/seller` hujjatiga yozib
//        qo'yadi va keyin doim o'shani ishlatadi.
//   Ikkala holatda ham kalit FAQAT serverda qoladi — brauzerga hech
//   qachon yuborilmaydi (`sys_config` Firestore qoidalarida yopiq).
//
//   Kalitni almashtirmoqchi bo'lsangiz: SELLER_SECRET ni qo'ying yoki
//   Firestore'dagi `sys_config/seller` hujjatini o'chiring — shunda
//   barcha sotuvchilar tizimdan chiqadi va qaytadan kirishadi.
//
// PAROL QANDAY SAQLANADI: ochiq matnda EMAS. scrypt (sekin, maxsus
// parol uchun mo'ljallangan algoritm) + har parol uchun alohida "tuz"
// (salt). Baza sizib chiqsa ham parollarni tiklab bo'lmaydi.

const crypto = require('crypto');

const SESSION_DAYS = 14;

/* Kalit bir marta olinadi va funksiya "issiq" turgan vaqt davomida
   xotirada saqlanadi — har so'rovda Firestore'ga bormaydi. */
let CACHED = process.env.SELLER_SECRET || '';
const SECRET = () => CACHED;

/**
 * Kalitni tayyorlaydi. Har bir handler ISHNING BOSHIDA buni
 * chaqirishi kerak (await bilan).
 */
async function initSecret(db) {
  if (CACHED) return CACHED;
  const ref = db.collection('sys_config').doc('seller');
  const snap = await ref.get();
  const have = snap.exists && snap.data() && snap.data().secret;
  if (have && String(have).length >= 32) { CACHED = String(have); return CACHED; }
  // Birinchi ishga tushish — kalitni o'zimiz hosil qilamiz.
  // Poyga holati (ikki funksiya bir vaqtda yozishi) bo'lmasin deb
  // tranzaksiya ichida: kim birinchi yozsa — o'shaniki qoladi.
  const made = crypto.randomBytes(48).toString('hex');
  const final = await db.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    if (cur.exists && cur.data() && cur.data().secret) return String(cur.data().secret);
    tx.set(ref, { secret: made, createdAt: Date.now() });
    return made;
  });
  CACHED = final;
  return CACHED;
}

/* ---------- Parol ---------- */

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const dk = crypto.scryptSync(String(plain), salt, 32).toString('hex');
  return 's1$' + salt + '$' + dk;
}

function verifyPassword(plain, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 3 || parts[0] !== 's1') return false;
    const dk = crypto.scryptSync(String(plain), parts[1], 32).toString('hex');
    // timingSafeEqual — parolni "belgima-belgi" taqqoslash orqali
    // topib olish hujumining (timing attack) oldini oladi
    const a = Buffer.from(dk, 'hex'), b = Buffer.from(parts[2], 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}

/* ---------- Seans tokeni ----------
   Ko'rinishi: <base64url(payload)>.<base64url(imzo)>
   payload: { id, u, exp }  — sotuvchi hujjat id'si, login, muddati.
   Serverda hech narsa saqlanmaydi: token o'zi imzolangan, soxtalashtirib
   bo'lmaydi (SELLER_SECRET bo'lmasa imzo to'g'ri chiqmaydi). */

const b64 = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function sign(payloadStr) {
  return b64(crypto.createHmac('sha256', SECRET()).update(payloadStr).digest());
}

function makeToken(seller) {
  if (!SECRET()) throw new Error('Imzo kaliti tayyor emas');
  const payload = JSON.stringify({
    id: seller.id,
    u: seller.username,
    exp: Date.now() + SESSION_DAYS * 86400000
  });
  const p = b64(payload);
  return p + '.' + sign(p);
}

function readToken(token) {
  if (!SECRET()) return null;
  const s = String(token || '');
  const i = s.indexOf('.');
  if (i < 1) return null;
  const p = s.slice(0, i), sig = s.slice(i + 1);
  const expect = sign(p);
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let data;
  try { data = JSON.parse(unb64(p).toString('utf8')); } catch (e) { return null; }
  if (!data || !data.id || !data.exp || Date.now() > data.exp) return null;
  return data;
}

/**
 * So'rovdan sotuvchini aniqlaydi va uning Firestore hujjatini qaytaradi.
 * Bloklangan yoki o'chirilgan sotuvchi — darhol rad etiladi (eski token
 * bilan ham ishlay olmaydi).
 */
async function requireSeller(event, db) {
  const h = event.headers || {};
  const raw = (h.authorization || h.Authorization || '').replace(/^Bearer\s+/i, '');
  const data = readToken(raw);
  if (!data) { const e = new Error('Kirish muddati tugagan. Qaytadan kiring.'); e.statusCode = 401; throw e; }
  const snap = await db.collection('sellers').doc(String(data.id)).get();
  if (!snap.exists) { const e = new Error('Hisob topilmadi'); e.statusCode = 401; throw e; }
  const s = Object.assign({ id: snap.id }, snap.data());
  if (s.blocked) { const e = new Error('Hisobingiz vaqtincha to’xtatilgan. Admin bilan bog’laning.'); e.statusCode = 403; throw e; }
  return s;
}

module.exports = { hashPassword, verifyPassword, makeToken, readToken, requireSeller, initSecret, SESSION_DAYS };
