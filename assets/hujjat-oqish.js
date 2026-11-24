/* ==================================================================
   HUJJAT O'QISH — MRZ TAHLILI  (V179)
   ------------------------------------------------------------------
   Bu fayl RASMNI o'qimaydi. U OCR qaytargan xom matnni oladi va undan
   ishonchli ma'lumot ajratadi. Shunday bo'lgani muhim: tahlil sof
   funksiya bo'lgani uchun uni kameraga, telefonga va internetga
   bog'lamasdan, o'nlab haqiqiy namunada sinab ko'rish mumkin.

   MRZ NIMA VA NEGA AYNAN U.
   Hujjatning pastidagi `<<<` belgilari bilan to'la qatorlar — MRZ
   (Machine Readable Zone). Uni odam uchun emas, mashina uchun
   yozishadi, shuning uchun:
     * shrifti bitta va qat'iy (OCR-B), ya'ni xato o'qish ehtimoli past;
     * joylashuvi standart — qaysi belgidan qaysi ma'lumot boshlanishi
       aniq;
     * va eng muhimi — ichida NAZORAT RAQAMLARI bor. Ya'ni dastur
       o'qiganini O'ZI TEKSHIRA OLADI. Oddiy matn o'qishda bunday
       imkoniyat yo'q: u yerda "0" ni "O" deb o'qigani bilinmaydi.

   Shu sabab tartib quyidagicha: avval MRZ qidiriladi; topilsa va
   nazorat raqamlari to'g'ri chiqsa — ma'lumot ishonchli. Topilmasa
   (masalan haydovchilik guvohnomasi) oddiy matndan qidiriladi, lekin
   natija "tekshirilmagan" deb belgilanadi va admin ko'z bilan
   tasdiqlaydi.

   QO'LLAB-QUVVATLANADIGAN TURLAR:
     TD1 — yangi ID karta: 3 qator x 30 belgi
     TD3 — pasport kitobchasi: 2 qator x 44 belgi
     TD2 — ba'zi eski hujjatlar: 2 qator x 36 belgi
   ================================================================== */
(function(global){
  'use strict';

  /* --- Nazorat raqami: ICAO 9303 standarti ------------------------
     Har belgiga qiymat beriladi (raqam - o'zi, harf - A=10..Z=35,
     '<' - 0), keyin 7-3-1 og'irliklari bilan ko'paytirilib qo'shiladi
     va 10 ga bo'lingandagi qoldiq olinadi. */
  const OGIRLIK = [7, 3, 1];
  function belgiQiymati(c){
    if(c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
    if(c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
    return 0;                       /* '<' va noma'lum belgilar */
  }
  function nazoratRaqami(matn){
    let yigindi = 0;
    for(let i = 0; i < matn.length; i++){
      yigindi += belgiQiymati(matn[i]) * OGIRLIK[i % 3];
    }
    return yigindi % 10;
  }
  function nazoratTogrimi(matn, kutilgan){
    if(!/^[0-9]$/.test(kutilgan)) return false;
    return nazoratRaqami(matn) === Number(kutilgan);
  }

  /* --- OCR tez-tez adashadigan belgilar ---------------------------
     MRZ ning RAQAM bo'lishi shart joylarida harf chiqsa, uni raqamga
     qaytaramiz va aksincha. Bu nazorat raqami tekshiruvidan OLDIN
     qilinadi — ko'p hollarda aynan shu bitta almashtirish butun
     qatorni to'g'rilaydi. */
  const HARFDAN_RAQAM = { O:'0', Q:'0', D:'0', I:'1', L:'1', Z:'2', S:'5', B:'8', G:'6', A:'4', T:'7' };
  const RAQAMDAN_HARF = { '0':'O', '1':'I', '2':'Z', '5':'S', '8':'B', '6':'G', '4':'A' };
  function raqamlashtir(s){
    return s.replace(/[A-Z]/g, (c)=> HARFDAN_RAQAM[c] || c);
  }
  function harflashtir(s){
    return s.replace(/[0-9]/g, (c)=> RAQAMDAN_HARF[c] || c);
  }

  /* --- Sana: YYMMDD -> YYYY-MM-DD ---------------------------------
     MRZ da yil ikki xonali. Tug'ilgan sana uchun: kelajakdagi sana
     bo'lishi mumkin emas, shuning uchun bugungi yildan katta chiqsa
     100 yil ayiriladi. Amal qilish muddati uchun esa aksincha. */
  function sanaOch(yymmdd, tur){
    if(!/^[0-9]{6}$/.test(yymmdd)) return '';
    const yy = Number(yymmdd.slice(0, 2));
    const oy = Number(yymmdd.slice(2, 4));
    const kun = Number(yymmdd.slice(4, 6));
    if(oy < 1 || oy > 12 || kun < 1 || kun > 31) return '';
    const hozirgiYil = new Date().getFullYear();
    const asr = Math.floor(hozirgiYil / 100) * 100;
    let yil = asr + yy;
    if(tur === 'tugilgan'){
      if(yil > hozirgiYil) yil -= 100;
    }else{
      if(yil < hozirgiYil - 10) yil += 100;
    }
    const ik = (n)=> (n < 10 ? '0' : '') + n;
    return yil + '-' + ik(oy) + '-' + ik(kun);
  }

  /* --- Ism maydonini ochish ---------------------------------------
     MRZ da ism "FAMILIYA<<ISM<OTASINING<ISMI" ko'rinishida. */
  function ismOch(xom){
    const bolak = String(xom || '').split('<<');
    const familiya = (bolak[0] || '').replace(/</g, ' ').trim();
    const qolgan   = (bolak.slice(1).join(' ') || '').replace(/</g, ' ').replace(/\s+/g, ' ').trim();
    const toliq = (familiya + ' ' + qolgan).replace(/\s+/g, ' ').trim();
    return { familiya: familiya, ism: qolgan, toliq: toliq };
  }

  /* --- Qatorlarni tozalash ---------------------------------------- */
  function qatorlar(xomMatn){
    return String(xomMatn || '')
      .toUpperCase()
      .split(/[\r\n]+/)
      .map(q => q.replace(/[^A-Z0-9<]/g, ''))   /* MRZ da boshqa belgi yo'q */
      .filter(q => q.length >= 25);
  }

  /* --- TD3: pasport kitobchasi (2 x 44) ---------------------------- */
  function td3(q1, q2){
    if(q1.length < 43 || q2.length < 43) return null;
    /* XATO VA TUZATISHI (sinovda topildi): bu yerda hujjat raqamiga
       ham `raqamlashtir()` qo'llanardi. Lekin hujjat raqami ARALASH
       bo'ladi — "L898902C3" dagi L harfi haqiqiy harf. Uni 1 ga
       aylantirish raqamni BUZADI. Raqamga aylantirish faqat SANA
       maydonlarida o'rinli, chunki ular doim sof raqam. */
    const hujjat   = q2.slice(0, 9).replace(/</g, '');
    const hujjatNz = q2[9];
    const millat   = harflashtir(q2.slice(10, 13));
    const tugilgan = raqamlashtir(q2.slice(13, 19));
    const tugNz    = q2[19];
    const jins     = q2[20];
    const muddat   = raqamlashtir(q2.slice(21, 27));
    const muddatNz = q2[27];

    const tekshir = {
      hujjat:   nazoratTogrimi(q2.slice(0, 9), hujjatNz),
      tugilgan: nazoratTogrimi(tugilgan, tugNz),
      muddat:   nazoratTogrimi(muddat, muddatNz)
    };
    const nom = ismOch(q1.slice(5));
    return {
      tur: 'TD3',
      hujjatRaqami: hujjat,
      millat: millat,
      tugilganSana: sanaOch(tugilgan, 'tugilgan'),
      amalMuddati: sanaOch(muddat, 'muddat'),
      jins: jins === 'M' ? 'erkak' : (jins === 'F' ? 'ayol' : ''),
      familiya: nom.familiya, ism: nom.ism, toliqIsm: nom.toliq,
      tekshir: tekshir,
      ishonchli: tekshir.hujjat && tekshir.tugilgan
    };
  }

  /* --- TD1: ID karta (3 x 30) -------------------------------------- */
  function td1(q1, q2, q3){
    if(q1.length < 29 || q2.length < 29 || q3.length < 29) return null;
    /* Hujjat raqami ARALASH — raqamlashtirilmaydi (yuqoridagi izoh) */
    const hujjat   = q1.slice(5, 14).replace(/</g, '');
    const hujjatNz = q1[14];
    const tugilgan = raqamlashtir(q2.slice(0, 6));
    const tugNz    = q2[6];
    const jins     = q2[7];
    const muddat   = raqamlashtir(q2.slice(8, 14));
    const muddatNz = q2[14];
    const millat   = harflashtir(q2.slice(15, 18));

    const tekshir = {
      hujjat:   nazoratTogrimi(q1.slice(5, 14), hujjatNz),
      tugilgan: nazoratTogrimi(tugilgan, tugNz),
      muddat:   nazoratTogrimi(muddat, muddatNz)
    };
    const nom = ismOch(q3);
    return {
      tur: 'TD1',
      hujjatRaqami: hujjat,
      millat: millat,
      tugilganSana: sanaOch(tugilgan, 'tugilgan'),
      amalMuddati: sanaOch(muddat, 'muddat'),
      jins: jins === 'M' ? 'erkak' : (jins === 'F' ? 'ayol' : ''),
      familiya: nom.familiya, ism: nom.ism, toliqIsm: nom.toliq,
      tekshir: tekshir,
      ishonchli: tekshir.hujjat && tekshir.tugilgan
    };
  }

  /* --- TD2 (2 x 36) ------------------------------------------------ */
  function td2(q1, q2){
    if(q1.length < 35 || q2.length < 35) return null;
    /* XATO VA TUZATISHI (sinovda topildi): bu yerda hujjat raqamiga
       ham `raqamlashtir()` qo'llanardi. Lekin hujjat raqami ARALASH
       bo'ladi — "L898902C3" dagi L harfi haqiqiy harf. Uni 1 ga
       aylantirish raqamni BUZADI. Raqamga aylantirish faqat SANA
       maydonlarida o'rinli, chunki ular doim sof raqam. */
    const hujjat   = q2.slice(0, 9).replace(/</g, '');
    const hujjatNz = q2[9];
    const millat   = harflashtir(q2.slice(10, 13));
    const tugilgan = raqamlashtir(q2.slice(13, 19));
    const tugNz    = q2[19];
    const jins     = q2[20];
    const muddat   = raqamlashtir(q2.slice(21, 27));
    const muddatNz = q2[27];
    const tekshir = {
      hujjat:   nazoratTogrimi(q2.slice(0, 9), hujjatNz),
      tugilgan: nazoratTogrimi(tugilgan, tugNz),
      muddat:   nazoratTogrimi(muddat, muddatNz)
    };
    const nom = ismOch(q1.slice(5));
    return {
      tur: 'TD2',
      hujjatRaqami: hujjat,
      millat: millat,
      tugilganSana: sanaOch(tugilgan, 'tugilgan'),
      amalMuddati: sanaOch(muddat, 'muddat'),
      jins: jins === 'M' ? 'erkak' : (jins === 'F' ? 'ayol' : ''),
      familiya: nom.familiya, ism: nom.ism, toliqIsm: nom.toliq,
      tekshir: tekshir,
      ishonchli: tekshir.hujjat && tekshir.tugilgan
    };
  }

  /* --- MRZ ni topish va o'qish -------------------------------------
     OCR ba'zan ortiqcha qator qo'shadi, ba'zan MRZ ning birinchi
     qatorini tashlab ketadi. Shuning uchun BARCHA ketma-ket
     kombinatsiyalar sinab ko'riladi va eng ko'p nazorat raqami
     to'g'ri chiqqani tanlanadi. */
  function mrzOqi(xomMatn){
    const q = qatorlar(xomMatn);
    const nomzodlar = [];
    for(let i = 0; i < q.length; i++){
      if(i + 2 < q.length){ const r = td1(q[i], q[i+1], q[i+2]); if(r) nomzodlar.push(r); }
      if(i + 1 < q.length){
        const a = td3(q[i], q[i+1]); if(a) nomzodlar.push(a);
        const b = td2(q[i], q[i+1]); if(b) nomzodlar.push(b);
      }
    }
    if(!nomzodlar.length) return null;
    const ball = (r)=> (r.tekshir.hujjat ? 4 : 0) + (r.tekshir.tugilgan ? 3 : 0)
                     + (r.tekshir.muddat ? 2 : 0) + (r.toliqIsm ? 1 : 0);
    nomzodlar.sort((a, b) => ball(b) - ball(a));
    return nomzodlar[0];
  }

  /* --- MRZ yo'q hujjatlar: oddiy matndan qidirish -------------------
     Haydovchilik guvohnomasi va shunga o'xshash hujjatlarda MRZ yo'q.
     Bu yerda natija ALBATTA "tekshirilmagan" deb belgilanadi. */
  const PASPORT_NAQSH = /\b([A-Z]{2})\s?-?\s?([0-9]{7})\b/;
  const SANA_NAQSH = /\b([0-3]?[0-9])[.\-\/ ]([0-1]?[0-9])[.\-\/ ]((?:19|20)[0-9]{2})\b/g;
  function oddiyMatndan(xomMatn){
    const matn = String(xomMatn || '').toUpperCase().replace(/ /g, ' ');
    const natija = { tur: 'MATN', ishonchli: false, tekshir: {},
                     hujjatRaqami: '', tugilganSana: '', toliqIsm: '', familiya: '', ism: '' };

    const p = PASPORT_NAQSH.exec(matn);
    if(p) natija.hujjatRaqami = p[1] + p[2];

    /* Sanalardan ENG ERKINI tug'ilgan sana deb olinadi: hujjatda
       berilgan va amal qilish sanalari undan albatta keyin bo'ladi. */
    const sanalar = [];
    let m; SANA_NAQSH.lastIndex = 0;
    while((m = SANA_NAQSH.exec(matn))){
      const kun = Number(m[1]), oy = Number(m[2]), yil = Number(m[3]);
      if(oy >= 1 && oy <= 12 && kun >= 1 && kun <= 31) sanalar.push({ yil, oy, kun });
    }
    if(sanalar.length){
      sanalar.sort((a, b)=> (a.yil - b.yil) || (a.oy - b.oy) || (a.kun - b.kun));
      const s = sanalar[0];
      const ik = (n)=> (n < 10 ? '0' : '') + n;
      natija.tugilganSana = s.yil + '-' + ik(s.oy) + '-' + ik(s.kun);
    }

    /* Ism: ketma-ket kelgan 2-3 ta uzun BOSH HARFLI so'z.
       XATO VA TUZATISHI (sinovda topildi): avval butun matn bo'ylab
       qidirardi va `\s` yangi qatorga ham moslashardi. Natijada
       "DRIVING LICENCE" + keyingi qatordagi "KARIMOV" bitta moslik
       bo'lib chiqib, tashlab yuborilardi — ism esa o'sha moslik
       ichida qolib ketardi. Endi HAR QATOR alohida qaraladi. */
    const ismNaqsh = /\b([A-Z]{3,20})[ \t]+([A-Z]{3,20})(?:[ \t]+([A-Z]{3,25}))?\b/g;
    const tashla = /^(PASSPORT|REPUBLIC|UZBEKISTAN|OZBEKISTON|RESPUBLIKASI|IDENTITY|CARD|NATIONALITY|SURNAME|GIVEN|NAMES|DATE|BIRTH|SEX|PLACE|ISSUE|EXPIRY|AUTHORITY|TYPE|CODE|DRIVING|LICENCE|LICENSE)$/;
    let eng = null;
    for(const qator of matn.split(/[\r\n]+/)){
      let m2; ismNaqsh.lastIndex = 0;
      while((m2 = ismNaqsh.exec(qator))){
        const qism = [m2[1], m2[2], m2[3]].filter(Boolean);
        if(qism.some(w => tashla.test(w))) continue;
        const nomzod = qism.join(' ');
        if(!eng || nomzod.length > eng.length) eng = nomzod;
      }
    }
    if(eng){
      natija.toliqIsm = eng;
      const b = eng.split(' ');
      natija.familiya = b[0] || '';
      natija.ism = b.slice(1).join(' ');
    }
    return natija;
  }

  /* --- Asosiy kirish nuqtasi --------------------------------------- */
  function oqi(xomMatn){
    const mrz = mrzOqi(xomMatn);
    if(mrz && (mrz.tekshir.hujjat || mrz.tekshir.tugilgan)) return mrz;
    const matn = oddiyMatndan(xomMatn);
    /* MRZ topilgan, lekin nazoratdan o'tmagan bo'lsa ham undagi ism
       odatda oddiy matndan ko'ra to'g'riroq bo'ladi. */
    if(mrz){
      if(!matn.hujjatRaqami && mrz.hujjatRaqami) matn.hujjatRaqami = mrz.hujjatRaqami;
      if(!matn.tugilganSana && mrz.tugilganSana) matn.tugilganSana = mrz.tugilganSana;
      if(mrz.toliqIsm){ matn.toliqIsm = mrz.toliqIsm; matn.familiya = mrz.familiya; matn.ism = mrz.ism; }
      matn.tur = mrz.tur + '?';
    }
    return matn;
  }

  const API = { oqi, mrzOqi, oddiyMatndan, nazoratRaqami, nazoratTogrimi, sanaOch, ismOch };
  if(typeof module !== 'undefined' && module.exports) module.exports = API;
  global.HujjatOqish = API;
})(typeof window !== 'undefined' ? window : globalThis);
