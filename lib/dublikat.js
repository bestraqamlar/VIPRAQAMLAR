// BITTA RAQAM — FAQAT BIR MARTA.
//
// Mijoz qoidasi: "umumiy bazada bitta raqamni faqat bir marta qo'yish
// mumkin, ikkita bir xil raqam saytda turishi mumkin emas".
//
// Raqam bazaga turli ko'rinishda tushishi mumkin ("+998901234567",
// "998901234567", "901234567") — shu sabab oddiy `number == ...`
// solishtiruvi dublikatni ko'rmay qolardi. Bu yerda har qanday
// ko'rinish avval 9 xonali MILLIY qismga keltiriladi va solishtiruv
// SHU bo'yicha bajariladi.
//
// Qidirish arzon: `last4` maydoni (oxirgi 4 raqam) bo'yicha so'rov
// millionlab raqamli bazada ham bir nechta hujjatga tegadi xolos,
// qo'shimcha indeks ham talab qilmaydi (bitta maydon).

/** Har qanday ko'rinishdagi raqamni 9 xonali milliy qismga keltiradi. */
function raqam9(v) {
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.length > 9 && d.slice(0, 3) === '998') d = d.slice(3);
  return d.slice(-9);
}

/**
 * Bazada shu raqam bormi? Bor bo'lsa {id, data} qaytaradi, aks holda null.
 * db — Firestore (Admin SDK yoki mijoz SDK, ikkalasida ham ishlaydi).
 */
async function bormi(db, num) {
  const n9 = raqam9(num);
  if (n9.length !== 9) return null;
  try {
    const snap = await db.collection('numbers')
      .where('last4', '==', n9.slice(-4)).limit(200).get();
    for (const d of snap.docs) {
      const x = d.data() || {};
      if (raqam9(x.number) === n9) return { id: d.id, data: x };
    }
  } catch (e) { /* so'rov ishlamasa — yozishga to'sqinlik qilmaymiz */ }
  // Zaxira: `last4` yozilmagan eski yozuvlar uchun
  try {
    const s2 = await db.collection('numbers')
      .where('number', '==', String(num).trim()).limit(1).get();
    if (!s2.empty) return { id: s2.docs[0].id, data: s2.docs[0].data() || {} };
  } catch (e) {}
  return null;
}

/**
 * Ro'yxat uchun: qaysi raqamlar YANGI, qaysilari dublikat.
 * rows — [{number, ...}]. Qaytaradi: {yangi:[...], dublikat:[{number, sabab}]}
 */
async function ajrat(db, rows) {
  const yangi = [], dublikat = [], korilgan = new Set();
  for (const row of (rows || [])) {
    const n9 = raqam9(row && row.number);
    if (n9.length !== 9) { dublikat.push({ number: (row && row.number) || '', sabab: "Raqam noto'g'ri" }); continue; }
    if (korilgan.has(n9)) { dublikat.push({ number: row.number, sabab: "Ro'yxatda takrorlangan" }); continue; }
    const bor = await bormi(db, row.number);
    if (bor) { dublikat.push({ number: row.number, sabab: 'Bazada allaqachon bor' }); continue; }
    korilgan.add(n9);
    yangi.push(row);
  }
  return { yangi, dublikat };
}

module.exports = { raqam9, bormi, ajrat };
