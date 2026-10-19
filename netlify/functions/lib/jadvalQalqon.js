// JADVAL BO'YICHA ISHLAYDIGAN FUNKSIYALAR UCHUN QALQON.
//
// Bu funksiyalar (masalan to'lov eslatmalari, kredit tekshiruvi, PDF/Excel
// hisobotlari, UZEX va Beeline sinxronizatsiyasi) netlify.toml'dagi
// `schedule` bo'yicha O'ZI ishga tushadi — ularni hech kim "bosmaydi".
// Netlify jadvalli funksiyalarni tashqaridan HTTP bilan chaqirishni
// odatda taqiqlaydi, lekin bu bizga bog'liq emas (platforma siyosati
// o'zgarishi mumkin). Shu sabab qo'shimcha, O'ZIMIZNING qalqonimiz:
//
//   • Netlify jadval chaqiruvi (body ichida `next_run` bo'ladi) — o'tadi;
//   • `x-cron-secret` sarlavhasi CRON_SECRET bilan mos kelsa — o'tadi
//     (masalan admin qo'lda ishga tushirmoqchi bo'lsa);
//   • CRON_SECRET UMUMAN sozlanmagan bo'lsa — eskicha o'tadi (hech narsa
//     buzilmasligi uchun; Netlify'ning o'z himoyasi qolaveradi);
//   • aks holda — 403.
//
// Ya'ni: Netlify'da bitta `CRON_SECRET` o'zgaruvchisini qo'yish bilan
// bu funksiyalarning HAMMASI tashqi chaqiruvlardan butunlay yopiladi.

function jadvalOk(event) {
  const sir = process.env.CRON_SECRET || '';

  /* Netlify'ning o'z jadval chaqiruvi: tanasida `next_run` keladi. */
  try {
    const b = JSON.parse((event && event.body) || '{}');
    if (b && b.next_run) return true;
  } catch (e) { /* tana bo'sh yoki JSON emas */ }

  /* Netlify ba'zi hollarda hodisa turini sarlavhada ham bildiradi. */
  const h = (event && event.headers) || {};
  if (String(h['x-nf-event'] || '') === 'schedule') return true;

  if (!sir) return true;                       // sozlanmagan — eskicha

  const kelgan = h['x-cron-secret'] || h['X-Cron-Secret'] || '';
  return kelgan === sir;
}

module.exports = { jadvalOk };
