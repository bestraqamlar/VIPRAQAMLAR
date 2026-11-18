// OPERATOR XATOSINING SABABINI ANIQLASH (V134)
// ============================================
// MUAMMO (mijoz aytgan): "Telegram botga ishlamasa hadeb kelavermasin
// xabar, undan ko'ra sababini topib ishlatsin."
//
// Ilgari ogohlantirish xabari shunchaki xom xato matnini ko'rsatardi:
//     "Ucell: Ucell login: HTTP 404"
// Bu matndan NIMA QILISH kerakligi tushunarsiz edi, va xabar har
// 30 daqiqada qaytarilaverardi.
//
// Endi xato TURKUMLANADI va har bir turkum uchun:
//   * sabab odam tilida yoziladi;
//   * aniq QADAM beriladi ("Adminka -> Operatorlar -> ... ni yangilang");
//   * tizim O'ZI TUZATA OLADIGAN holatlar belgilanadi (`ozi`), masalan
//     sessiya eskirgani — unda sessiya tozalanib qayta urinib ko'riladi,
//     admin bezovta qilinmaydi;
//   * xabar qanchalik tez-tez qaytarilishi (`ogoh`) turkumga qarab
//     belgilanadi: o'zi tuzaladigan holatlar uchun umuman xabar
//     yuborilmaydi.
//
// Turkumlar:
//   manzil   — 404/410: API manzili o'zgargan (ODAM aralashuvi shart)
//   parol    — 401/403: login/parol yoki kalit eskirgan (ODAM shart)
//   limit    — 429: so'rov chegarasi (o'zi tuzaladi — kutish kifoya)
//   server   — 5xx: operator serverida nosozlik (o'zi tuzaladi)
//   sekin    — timeout/abort: javob kechikdi (o'zi tuzaladi)
//   tarmoq   — DNS/ulanish xatosi (o'zi tuzaladi)
//   sessiya  — sessiya olinmadi/eskirgan (tizim o'zi tozalab qayta uradi)
//   sozlama  — login/parol umuman kiritilmagan (ODAM shart)
//   nomalum  — qolganlari

function xatoSababi(operator, xatoMatni) {
  const m = String(xatoMatni || '');
  const op = String(operator || 'Operator');
  const kod = (m.match(/HTTP\s*(\d{3})/i) || [])[1];

  const J = (turkum, sabab, qadam, ozi) => ({ turkum, sabab, qadam, ozi: !!ozi, kod: kod || '' });

  /* --- Sozlama umuman yo'q --- */
  if (/login\/parol|kiritilmagan|sozlanmagan|not configured|token yo'q|TOKEN sozlanmagan/i.test(m)) {
    return J('sozlama',
      op + ' uchun login/parol yoki kalit kiritilmagan.',
      'Adminka → Operatorlar → ' + op + ' → ma\'lumotlarni to\'ldiring.',
      false);
  }

  /* --- Manzil o'zgargan --- */
  if (kod === '404' || kod === '410' || /not found/i.test(m)) {
    return J('manzil',
      op + ' API manzili ishlamayapti (HTTP ' + (kod || '404') + '). Odatda bu manzil '
        + 'O\'ZGARGANINI bildiradi — operator yangi manzilga ko\'chgan.',
      'Operatordan yangi API manzilini oling va Adminka → Operatorlar → ' + op
        + ' bo\'limiga kiriting. Manzil to\'g\'rilangunicha bu operator tinimda turadi.',
      false);
  }

  /* --- Ruxsat yo'q --- */
  if (kod === '401' || kod === '403' || /unauthorized|forbidden|invalid credentials|noto'g'ri parol/i.test(m)) {
    return J('parol',
      op + ' ruxsat bermayapti (HTTP ' + (kod || '401') + '). Login/parol yoki kalit '
        + 'o\'zgargan yoki muddati tugagan.',
      'Adminka → Operatorlar → ' + op + ' → login va parolni yangilang.',
      false);
  }

  /* --- So'rov chegarasi --- */
  if (kod === '429' || /too many requests|rate limit/i.test(m)) {
    return J('limit',
      op + ' so\'rovlar chegarasiga yetdi (HTTP 429).',
      'Hech narsa qilish shart emas: tizim o\'zi kutib, so\'rovlarni siyraklashtiradi.',
      true);
  }

  /* --- Operator serveri --- */
  if (kod && /^5\d\d$/.test(kod)) {
    return J('server',
      op + ' serverida nosozlik (HTTP ' + kod + '). Bu bizning tomonda emas.',
      'Hech narsa qilish shart emas: operator tuzatgach o\'zi tiklanadi.',
      true);
  }

  /* --- Sekin javob --- */
  if (/timeout|aborted|operation was aborted/i.test(m)) {
    return J('sekin',
      op + ' belgilangan vaqtda javob bermadi (sekin ishlayapti).',
      'Hech narsa qilish shart emas: tizim qayta urinadi. Sekinlik davom etsa, '
        + 'Adminka → Kuzatuv bo\'limidagi tezlik ko\'rsatkichini kuzating.',
      true);
  }

  /* --- Tarmoq --- */
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|EAI_AGAIN|network|socket hang up|getaddrinfo/i.test(m)) {
    return J('tarmoq',
      op + ' serveriga ulanib bo\'lmadi (tarmoq xatosi).',
      'Hech narsa qilish shart emas: aloqa tiklangach o\'zi ishlaydi.',
      true);
  }

  /* --- Sessiya --- */
  if (/sessiya|session|token/i.test(m)) {
    return J('sessiya',
      op + ' sessiyasi olinmadi yoki muddati tugagan.',
      'Hech narsa qilish shart emas: tizim sessiyani tozalab, qayta oladi.',
      true);
  }

  return J('nomalum',
    op + ' javobini tushunib bo\'lmadi.',
    'Adminka → Kuzatuv bo\'limida batafsil xatoni ko\'ring.',
    false);
}

/* OGOHLANTIRISH ORALIG'I — KUNIGA BIR MARTA (V135)
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "1 kunda 1 marta kelsin ishlamasa."

   Shuning uchun qoida endi oddiy va oldindan bilinadigan:

     * BIRINCHI xabar — muammo aniqlangach DARHOL (aks holda nosozlik
       haqida bir kun bilmay yurilardi);
     * keyin — muammo davom etsa ham HAR 24 SOATDA BIR MARTA.

   Bitta istisno bor: o'zi tuzaladigan turkumlar (timeout, 5xx, 429,
   tarmoq uzilishi). Bular odatda bir necha daqiqada o'tib ketadi,
   shuning uchun ular bo'yicha birinchi xabar ham DARHOL EMAS —
   nosozlik 3 soatdan ortiq davom etgandagina yuboriladi. Keyin esa
   ular ham kuniga bir marta.

   Nosozlik tuzalsa hisoblagich nolga qaytadi ("tiklandi" xabari
   ketadi), keyingi safar yana darhol xabar keladi.
   ------------------------------------------------------------------ */
const KUNLIK_MS = 24 * 60 * 60 * 1000;
const OZI_BIRINCHI_KUTISH_MS = 3 * 60 * 60 * 1000;

function ogohOraligi(sabab, nechanchiXabar) {
  const n = Math.max(0, Number(nechanchiXabar) || 0);
  /* Birinchi xabar: odam aralashuvi shart bo'lsa darhol, o'zi
     tuzaladigan bo'lsa 3 soatdan keyin. */
  if (n === 0) return (sabab && sabab.ozi) ? OZI_BIRINCHI_KUTISH_MS : 0;
  /* Keyingilari: kuniga bir marta. */
  return KUNLIK_MS;
}

module.exports = { xatoSababi, ogohOraligi, KUNLIK_MS };
