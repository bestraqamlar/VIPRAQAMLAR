// KIRISH URINISHLARI QULFI — "parolni tanlab ko'rish" (brute-force)
// hujumiga qarshi yagona, markaziy himoya.
//
// QOIDA (mijoz so'roviga ko'ra): 5 DAQIQADA 3 MARTA urinish mumkin.
// To'rtinchi urinishda hisob 5 daqiqaga qulflanadi va qolgan vaqt
// ekranda sanoq bilan ko'rsatiladi.
//
// IKKI KALIT bilan hisoblanadi — shuning uchun hujumchi "boshqa login
// yozib ko'raman" yoki "boshqa qurilmadan kiraman" deb qutulolmaydi:
//   1. LOGIN bo'yicha  (masalan `sotuvchi:akmal`) — bitta hisobni
//      turli joylardan tanlab ko'rishning oldini oladi;
//   2. IP bo'yicha     (masalan `ip:85.12.x.x`) — bitta joydan turib
//      o'nlab loginni sinab ko'rishning oldini oladi.
// Ikkalasidan BIRI qulflangan bo'lsa — kirish taqiqlanadi.
//
// Hisob Firestore'da (`login_attempts` to'plami) turadi: ya'ni qulf
// brauzerni yopish, "Incognito" rejim yoki localStorage'ni tozalash
// bilan aylanib o'tilmaydi (bu — faqat ekranda hisoblaydigan himoyaning
// asosiy kamchiligi).
//
// MUHIM: to'g'ri parol kiritilganda hisoblagich darhol nolga tushadi —
// ya'ni haqiqiy egasi bir marta adashsa ham, keyin bemalol kiradi.

const TOPLAM = 'login_attempts';
const CHEGARA = 3;                      // 5 daqiqada necha marta
const OYNA_MS = 5 * 60 * 1000;          // 5 daqiqa
const QULF_MS = 5 * 60 * 1000;          // qulf muddati

function tozaKalit(v) {
  return String(v || '').replace(/[^\w.:@-]/g, '_').slice(0, 120) || 'nomalum';
}

/** IP manzil (Netlify sarlavhalaridan). */
function ipOl(event) {
  const h = (event && event.headers) || {};
  const ip = h['x-nf-client-connection-ip']
    || h['client-ip']
    || ((h['x-forwarded-for'] || '').split(',')[0].trim())
    || 'unknown';
  return tozaKalit(ip);
}

/** Bitta kalitning holati. */
async function birHolat(db, kalit) {
  const ref = db.collection(TOPLAM).doc(tozaKalit(kalit));
  const snap = await ref.get();
  const endi = Date.now();
  if (!snap.exists) return { ref, soni: 0, boshlangan: endi, qulfMs: 0 };
  const d = snap.data() || {};
  const soni = Number(d.count) || 0;
  const boshlangan = Number(d.firstAt) || 0;
  const qulfgacha = Number(d.lockedUntil) || 0;
  if (qulfgacha > endi) return { ref, soni, boshlangan, qulfMs: qulfgacha - endi };
  /* Oyna o'tib ketgan bo'lsa — hisob noldan boshlanadi */
  if (!boshlangan || (endi - boshlangan) > OYNA_MS) return { ref, soni: 0, boshlangan: endi, qulfMs: 0 };
  return { ref, soni, boshlangan, qulfMs: 0 };
}

/**
 * Kirishga ruxsat bormi? (parolni TEKSHIRMASDAN oldin chaqiriladi)
 * @returns {qulf:boolean, qoldiMs:number, qolganUrinish:number}
 */
async function qulfHolati(db, kalitlar) {
  let qoldiMs = 0, engKopSoni = 0;
  for (const k of kalitlar) {
    try {
      const h = await birHolat(db, k);
      if (h.qulfMs > qoldiMs) qoldiMs = h.qulfMs;
      if (h.soni > engKopSoni) engKopSoni = h.soni;
    } catch (e) { /* baza javob bermasa — kirishni to'smaymiz */ }
  }
  return {
    qulf: qoldiMs > 0,
    qoldiMs,
    qolganUrinish: Math.max(0, CHEGARA - engKopSoni)
  };
}

/**
 * Xato urinishni yozadi. Chegaraga yetganda qulflaydi.
 * @returns {qulf, qoldiMs, qolganUrinish, endiQulflandi}
 */
async function xatoQayd(db, kalitlar) {
  let qoldiMs = 0, engKopSoni = 0, endiQulflandi = false;
  for (const k of kalitlar) {
    try {
      const h = await birHolat(db, k);
      if (h.qulfMs > 0) { qoldiMs = Math.max(qoldiMs, h.qulfMs); engKopSoni = CHEGARA; continue; }
      const soni = h.soni + 1;
      const yozuv = { count: soni, firstAt: h.boshlangan || Date.now(), lastAt: Date.now() };
      if (soni >= CHEGARA) {
        yozuv.lockedUntil = Date.now() + QULF_MS;
        yozuv.count = 0;                 // qulfdan keyin noldan boshlanadi
        yozuv.firstAt = Date.now() + QULF_MS;
        endiQulflandi = true;
        qoldiMs = Math.max(qoldiMs, QULF_MS);
      }
      await h.ref.set(yozuv, { merge: true });
      if (soni > engKopSoni) engKopSoni = soni;
    } catch (e) { /* e'tiborsiz */ }
  }
  return {
    qulf: qoldiMs > 0,
    qoldiMs,
    qolganUrinish: Math.max(0, CHEGARA - engKopSoni),
    endiQulflandi
  };
}

/** To'g'ri parol — hisoblagich tozalanadi. */
async function tozala(db, kalitlar) {
  for (const k of kalitlar) {
    try { await db.collection(TOPLAM).doc(tozaKalit(k)).delete(); } catch (e) {}
  }
}

/** Ekranda ko'rsatish uchun: "4 daqiqa 12 soniya" */
function qoldiMatn(ms) {
  const s = Math.max(0, Math.ceil(Number(ms) / 1000));
  const d = Math.floor(s / 60), q = s % 60;
  if (d > 0) return d + ' daqiqa' + (q ? ' ' + q + ' soniya' : '');
  return q + ' soniya';
}

module.exports = { qulfHolati, xatoQayd, tozala, ipOl, qoldiMatn, CHEGARA, QULF_MS, OYNA_MS, TOPLAM };
