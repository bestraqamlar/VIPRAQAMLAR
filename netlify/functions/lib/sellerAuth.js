// SOTUVCHI (diler) HISOBLARI — parol va seans tokeni.
//
// NEGA ADMIN TIZIMIDAN ALOHIDA: adminlar Firebase Auth orqali kiradi va
// ularda `admin: true` custom claim bor. Sotuvchilarga Firebase hisob
// ochib berish ham qimmat (har biri uchun qo'lda ish), ham xavfli
// (bitta xatoda sotuvchi admin huquqiga yaqinlashib qoladi). Shu sabab
// sotuvchilar butunlay ALOHIDA, soddaroq tizimda: login + parol, va
// imzolangan (HMAC) seans tokeni.
//
// MUHIM MUHIT O'ZGARUVCHISI (Netlify -> Environment variables):
//   SELLER_SECRET — uzun tasodifiy satr (kamida 32 belgi). Seans
//   tokenlari shu kalit bilan imzolanadi. U O'ZGARTIRILSA — barcha
//   sotuvchilar tizimdan chiqib ketadi (ba'zan bu foydali).
//   Masalan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// PAROL QANDAY SAQLANADI: ochiq matnda EMAS. scrypt (sekin, maxsus
// parol uchun mo'ljallangan algoritm) + har parol uchun alohida "tuz"
// (salt). Baza sizib chiqsa ham parollarni tiklab bo'lmaydi.

const crypto = require('crypto');

const SECRET = () => process.env.SELLER_SECRET || '';
const SESSION_DAYS = 14;

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
  if (!SECRET()) throw new Error('SELLER_SECRET sozlanmagan');
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

module.exports = { hashPassword, verifyPassword, makeToken, readToken, requireSeller, SESSION_DAYS };
