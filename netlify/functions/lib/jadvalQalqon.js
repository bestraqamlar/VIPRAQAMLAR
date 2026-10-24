// JADVAL BO'YICHA ISHLAYDIGAN FUNKSIYALAR UCHUN QALQON.
//
// Bu funksiyalar (to'lov eslatmalari, kredit tekshiruvi, PDF/Excel
// hisobotlari, UZEX/Beeline sinxronizatsiyasi, zaxira nusxa, raqam
// kuzatuvi) netlify.toml'dagi `schedule` bo'yicha O'ZI ishga tushadi.
//
// V120 — MUHIM TUZATISH (xavfsizlik teshigi yopildi).
// ---------------------------------------------------------------
// Ilgari qalqon faqat shu uch belgiga qarardi:
//   1. so'rov tanasida `next_run` bo'lsa — o'tkazardi;
//   2. `x-nf-event: schedule` sarlavhasi bo'lsa — o'tkazardi;
//   3. CRON_SECRET sozlanmagan bo'lsa — HAMMANI o'tkazardi.
// Birinchi ikkitasini HAR KIM soxtalashtira oladi: oddiy
//   curl -X POST .../zaxira-background -d '{"next_run":"x"}'
// qalqondan o'tib ketardi. Ya'ni tashqi odam zaxira nusxani qayta-qayta
// yuritib xarajat chiqarishi, `release-stale-reservations` ni chaqirib
// band raqamlarni bo'shatib yuborishi, operator API'lariga minglab
// so'rov ketishiga sabab bo'lishi mumkin edi.
//
// ENDI IKKI QATLAM:
//   A) HAQIQIY KALIT — `x-cron-secret` CRON_SECRET bilan mos kelsa,
//      hech qanday cheklovsiz o'tadi (admin panelidagi "Hozir
//      tekshirish" tugmasi aynan shu yo'ldan yuradi).
//   B) KALITSIZ CHAQIRUV (Netlify o'z jadvali ham shu yo'ldan keladi) —
//      o'tadi, LEKIN "eng kam oraliq" qo'riqchisi bor: shu ish oxirgi
//      marta `engKamSek` sekunddan kam vaqt oldin bajarilgan bo'lsa,
//      qayta bajarilmaydi. Oraliq har bir ishning o'z jadvaliga qarab
//      qo'yilgan (har daqiqalik ish — 40 s, kunlik ish — 16 soat).
//      Natijada soxta chaqiruvdan HECH QANDAY foyda yo'q: ish baribir
//      jadvaldagidan tez-tez bajarilmaydi.
//
// Oxirgi bajarilish vaqti Firestore'da `cron_locks/<nom>` hujjatida
// turadi (bitta o'qish + bitta yozish — deyarli bepul).
// Baza javob bermasa qo'riqchi "ochiq" holatda qoladi (ish to'xtab
// qolmasligi uchun) — bu faqat baza ishlamayotgan paytda.

const admin = require('firebase-admin');

function sirMos(event) {
  const sir = process.env.CRON_SECRET || '';
  if (!sir) return false;
  const h = (event && event.headers) || {};
  const kelgan = h['x-cron-secret'] || h['X-Cron-Secret'] || '';
  return kelgan === sir;
}

/**
 * @param event      Netlify event
 * @param nom        ishning nomi (masalan 'zaxira') — qulf hujjati nomi
 * @param engKamSek  ikki bajarilish orasidagi eng kam oraliq (sekund)
 * @returns true — bajarish mumkin, false — bajarmaslik kerak
 */
async function jadvalOk(event, nom, engKamSek) {
  /* A) Haqiqiy kalit — cheklovsiz. */
  if (sirMos(event)) return true;

  /* B) Kalitsiz. Netlify o'z jadvali ham, soxta chaqiruv ham shu yerda.
        Farqini ISHONCHLI aniqlab bo'lmaydi (sarlavha ham, tana ham
        soxtalashtiriladi), shuning uchun farqini aniqlashga urinmaymiz —
        oraliq qo'riqchisi ikkisiga ham baravar qo'llanadi. */
  const oraliq = Number(engKamSek) > 0 ? Number(engKamSek) : 240;
  if (!nom) return true;                       // nom berilmagan — eskicha

  try {
    if (!admin.apps.length) return true;       // SDK yo'q — to'smaymiz
    const db = admin.firestore();
    const ref = db.collection('cron_locks').doc(String(nom).slice(0, 60));
    const snap = await ref.get();
    const hozir = Date.now();
    if (snap.exists) {
      const oxirgi = Number((snap.data() || {}).at) || 0;
      if (hozir - oxirgi < oraliq * 1000) return false;
    }
    await ref.set({ at: hozir, nom: String(nom).slice(0, 60) }, { merge: true });
    return true;
  } catch (e) {
    return true;
  }
}

module.exports = { jadvalOk };
