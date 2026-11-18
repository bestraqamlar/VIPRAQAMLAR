// KABINET TOKENI (V129)
// =====================
// Mijoz Telegram'dagi kod bilan bir marta kirgandan keyin, har safar
// kod so'ramaslik uchun unga IMZOLANGAN TOKEN beriladi. Token
// mijozning o'z telefonida (localStorage) saqlanadi va har so'rovda
// serverga yuboriladi.
//
// NEGA BAZADA SAQLANMAYDI. Token o'z ichida hamma narsani olib
// yuradi: telefon + muddat + imzo. Shuning uchun uni tekshirish
// uchun bazaga MUROJAAT QILINMAYDI — bitta HMAC hisobi, xolos.
// Ya'ni kabinet ochilishi bitta o'qishga arzimaydi va tezroq ishlaydi.
//
// IMZO. HMAC-SHA256. Kalit: KABINET_TOKEN_SECRET; u sozlanmagan
// bo'lsa — xizmat hisobining maxfiy kalitidan (FIREBASE_PRIVATE_KEY)
// hosil qilinadi. Ya'ni sozlamasiz ham ishlaydi, lekin kalitni
// alohida qo'yish afzal (xizmat hisobi almashtirilsa tokenlar
// bekor bo'lmaydi).
//
// MUHIM: token FAQAT "shu telefon egasiman" degan ma'noni bildiradi.
// Unda hech qanday shaxsiy ma'lumot yo'q va u bilan admin huquqlari
// olib bo'lmaydi.

const crypto = require('crypto');

/* V131: 365 kun. Mijoz saytdan chiqib ketib, oylar o'tib qaytsa ham
   kabineti joyida tursin — har safar kod so'rash noqulaylik edi. */
const AMAL_KUN = 365;

function sir() {
  const s = process.env.KABINET_TOKEN_SECRET;
  if (s && String(s).length >= 16) return String(s);
  const pk = process.env.FIREBASE_PRIVATE_KEY || '';
  if (!pk) throw new Error('KABINET_TOKEN_SECRET ham, FIREBASE_PRIVATE_KEY ham yo\'q');
  return crypto.createHash('sha256').update('kabinet-token:' + pk).digest('hex');
}

function imzo(asos) {
  return crypto.createHmac('sha256', sir()).update(asos).digest('base64url').slice(0, 32);
}

/* Token ko'rinishi:  <tel9>.<muddat>.<imzo>   (masalan 901234567.1790000000000.AbC...) */
function yarat(tel9, kunlar) {
  const tel = String(tel9).replace(/\D/g, '').slice(-9);
  if (tel.length !== 9) throw new Error('Telefon raqami xato');
  const muddat = Date.now() + (Number(kunlar) || AMAL_KUN) * 24 * 60 * 60 * 1000;
  const asos = tel + '.' + muddat;
  return asos + '.' + imzo(asos);
}

/* Tekshiradi va telefonni qaytaradi; yaroqsiz bo'lsa null. */
function ochib(token) {
  try {
    const q = String(token || '').split('.');
    if (q.length !== 3) return null;
    const [tel, muddat, sig] = q;
    if (!/^\d{9}$/.test(tel) || !/^\d{10,16}$/.test(muddat)) return null;
    if (Date.now() > Number(muddat)) return null;
    const kutilgan = Buffer.from(imzo(tel + '.' + muddat), 'utf8');
    const kelgan = Buffer.from(sig, 'utf8');
    if (kutilgan.length !== kelgan.length) return null;
    if (!crypto.timingSafeEqual(kutilgan, kelgan)) return null;
    return tel;
  } catch (e) { return null; }
}

module.exports = { kabinetToken: { yarat, ochib, AMAL_KUN } };
