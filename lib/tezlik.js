// TEZLIK CHEGARASI (rate limit) — bitta IP manzildan keladigan ommaviy
// so'rovlarni cheklaydi.
//
// NEGA KERAK. Saytning bir nechta funksiyasi ataylab OCHIQ (mijoz hali
// tizimga kirmagan bo'ladi): raqam qidirish, ko'rishlar hisoblagichi,
// bildirishnoma tokeni, "buyurtmalarim"ni telefon bo'yicha topish va
// hokazo. Ochiq bo'lgani uchun ularni SKRIPT bilan minglab marta chaqirib
// bo'ladi — natijada: Firestore o'qish/yozish xarajati oshadi, operator
// API'lariga minglab so'rov ketadi (hisob bloklanishi mumkin), bazaga
// axlat hujjatlar to'ladi. Bu "sayt buzildi" degan holatning eng keng
// tarqalgan sababi.
//
// QANDAY ISHLAYDI. Har bir IP uchun SOATLIK hisoblagich Firestore'da
// saqlanadi (bitta hujjat, bitta o'qish + bitta yozish). Chegaradan
// oshsa — 429 qaytariladi. Soat almashganda hisoblagich o'zi noldan
// boshlanadi (alohida tozalash kerak emas).
//
// MUHIM: bu himoya "odamni" to'smaydi — chegaralar ataylab katta
// qo'yilgan (masalan soatiga 200 ta qidiruv). Oddiy mijoz hech qachon
// bunga yetmaydi; skript esa darhol yetadi.

function ipOl(event) {
  const h = (event && event.headers) || {};
  const ip = h['x-nf-client-connection-ip']
    || h['client-ip']
    || ((h['x-forwarded-for'] || '').split(',')[0].trim())
    || 'unknown';
  return String(ip).replace(/[^\w.:-]/g, '_').slice(0, 60) || 'unknown';
}

/**
 * @param db        Firestore (Admin SDK)
 * @param event     Netlify event
 * @param toplam    hisoblagichlar uchun to'plam nomi (har bir funksiya o'ziniki)
 * @param chegara   bir soatda ruxsat etilgan so'rovlar soni
 * @returns true — ruxsat, false — chegaradan oshdi
 */
async function tezlikOk(db, event, toplam, chegara) {
  try {
    const ip = ipOl(event);
    const soat = new Date().toISOString().slice(0, 13);      // "2026-10-19T19"
    const ref = db.collection(toplam).doc(ip);
    const snap = await ref.get();
    let soni = 0;
    if (snap.exists) {
      const d = snap.data() || {};
      if (d.hourKey === soat) soni = Number(d.count) || 0;
    }
    if (soni >= chegara) return false;
    await ref.set({ hourKey: soat, count: soni + 1, lastAt: Date.now() }, { merge: true });
    return true;
  } catch (e) {
    /* Baza javob bermasa — mijozni to'sib qo'ymaymiz (himoya "ochiq"
       holatda qoladi, lekin bu faqat baza ishlamayotgan paytda). */
    return true;
  }
}

module.exports = { tezlikOk, ipOl };
