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

  /* MRZ QATORIMI? (V194)
     ------------------------------------------------------------------
     XATO VA TUZATISHI (haqiqiy ID kartada topildi). Avval shart
     "uzunligi 25 dan katta" edi. Lekin yuqoridagi tozalash BO'SHLIQNI
     ham o'chiradi, shuning uchun kartaning OLD tomonidagi yozuvlar —
     "IMZOSI AMAL QILISH MUDDATI DATE OF EXPIRY KARTA RAQAMI CARD
     NUMBER" — bitta 56 belgili qatorga aylanib, MRZ deb qabul
     qilinardi. Natijada ism o'rniga yorliqlar chiqdi.

     Haqiqiy MRZ qatorining ikkita ajralib turadigan belgisi bor:
       - uzunligi aniq (30 / 36 / 44 belgi, OCR uchun ±2);
       - ichida ko'p `<` yoki ko'p raqam bo'ladi.
     Oddiy yozuvda bunday bo'lmaydi. */
  function mrzQatorimi(q){
    if(!q) return false;
    const n = q.length;
    const olcham = (n >= 28 && n <= 32) || (n >= 34 && n <= 38) || (n >= 42 && n <= 46);
    if(!olcham) return false;
    let kichik = 0, raqam = 0;
    for(let i = 0; i < n; i++){
      const c = q[i];
      if(c === '<') kichik++;
      else if(c >= '0' && c <= '9') raqam++;
    }
    return kichik >= 3 || raqam >= 6;
  }

  /* --- Qatorlarni tozalash ---------------------------------------- */
  function qatorlar(xomMatn){
    /* V193: avval OCR chalkashtirgan belgilar almashtiriladi
       (`«` -> `<<` va h.k.), chunki quyidagi filtr ularni shunchaki
       o'chirib yuborardi va qator kaltalanib MRZ tanilmay qolardi. */
    return mrzTozala(xomMatn)
      .toUpperCase()
      .split(/[\r\n]+/)
      .map(q => q.replace(/[^A-Z0-9<]/g, ''))   /* MRZ da boshqa belgi yo'q */
      .filter(mrzQatorimi);
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
  /* Nomzod haqiqatan ismga o'xshaydimi?
     Qaytadi: tozalangan ism yoki '' (yaramasa). */
  const YORLIQ = /^(PASSPORT|PASPORT|REPUBLIC|UZBEKISTAN|OZBEKISTON|O.ZBEKISTON|RESPUBLIKASI|RESPUBLIKAS|IDENTITY|CARD|KARTA|RAQAMI|RAQAM|NUMBER|NATIONALITY|MILLATI|FUQAROLIGI|CITIZENSHIP|SURNAME|FAMILIYASI|FAMILIYA|GIVEN|NAMES|NAME|ISMI|OTASINING|PATRONYMIC|DATE|SANASI|SANA|BIRTH|TUGILGAN|TUG.ILGAN|SEX|JINSI|PLACE|JOYI|ISSUE|BERILGAN|BERGAN|EXPIRY|MUDDATI|QILISH|GILISH|AMAL|AUTHORITY|ORGAN|TYPE|TURI|CODE|KOD|SIGNATURE|IMZOSI|IMZO|ADDRESS|MANZIL|VILOYAT|TUMAN|SHAHAR|SERIYA|JSHSHIR|PINFL|DRIVING|LICENCE|LICENSE|OF|AND|THE)$/;
  /* Qatordan yorliq so'zlarini olib tashlab, qolgan 1-3 so'zni ism
     deb qaytaradi (bo'lmasa — ''). */
  function qatordanIsm(qator){
    const sozlar = String(qator || '').toUpperCase()
      .replace(/[^A-Z' ]+/g, ' ')
      .split(/\s+/).filter(Boolean)
      .filter(sz => sz.length >= 2 && sz.length <= 16 && !YORLIQ.test(sz));
    if(!sozlar.length || sozlar.length > 3) return '';
    return ismTozami(sozlar.join(' '));
  }

  function ismTozami(xom){
    if(!xom) return '';
    const sozlar = String(xom).toUpperCase()
      .replace(/[^A-Z' ]+/g, ' ')
      .split(/\s+/).filter(Boolean);
    if(sozlar.length < 1 || sozlar.length > 4) return '';
    for(const sz of sozlar){
      /* Bitta so'z 16 belgidan uzun bo'lsa — bu OCR qo'shib yuborgan
         yorliqlar zanjiri, ism emas. Aynan shu xato chiqqan edi. */
      if(sz.length < 2 || sz.length > 16) return '';
      if(YORLIQ.test(sz)) return '';
    }
    const toliq = sozlar.join(' ');
    if(toliq.length < 4 || toliq.length > 42) return '';
    return toliq;
  }

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

    /* ISM — YORLIQQA BOG'LAB (V194)
       ------------------------------------------------------------
       XATO VA TUZATISHI (haqiqiy ID kartada topildi). Avval "eng
       uzun ketma-ket bosh harfli so'zlar" olinardi. ID kartaning
       old tomonida esa eng uzun bunday ketma-ketlik — YORLIQLARNING
       o'zi: "IMZOSI ... DATE OF EXPIRY ... CARD NUMBER". Shuning
       uchun ism o'rniga yorliqlar chiqib qolgan edi.

       Endi hujjatdagi yorliqning O'ZIDAN foydalanamiz: "Familiyasi /
       Surname" yozuvini topamiz va QIYMAT o'sha qatorning davomida
       yoki keyingi qatorda bo'ladi. Bu ancha ishonchli, chunki
       hujjatda yorliq har doim qiymatning yonida turadi. */
    const qatorlarRoyxati = matn.split(/[\r\n]+/).map(q => q.trim()).filter(Boolean);

    function qiymatOl(yorliq){
      for(let i = 0; i < qatorlarRoyxati.length; i++){
        const q = qatorlarRoyxati[i];
        if(!yorliq.test(q)) continue;
        /* Yorliq va qiymat BIR qatorda bo'lishi mumkin
           ("Familiyasi / Surname: KARIMOV"). Shu sababli qatordagi
           YORLIQ so'zlarini olib tashlaymiz va qolganini qaraymiz. */
        const qoldiq = qatordanIsm(q);
        if(qoldiq) return qoldiq;
        /* yo'q — keyingi 2 qatorga qaraymiz */
        for(let k = 1; k <= 2 && i + k < qatorlarRoyxati.length; k++){
          const n2 = ismTozami(qatorlarRoyxati[i + k]);
          if(n2) return n2;
        }
      }
      return '';
    }

    const familiya = qiymatOl(/FAMILIYA|SURNAME/);
    const berilgan = qiymatOl(/\bISMI\b|GIVEN\s*NAME|FORENAME/);
    let eng = '';
    if(familiya && berilgan) eng = familiya + ' ' + berilgan;
    else if(familiya) eng = familiya;
    else if(berilgan) eng = berilgan;

    /* Yorliq topilmasa — zaxira yo'l: qatorlardagi 2-3 ta so'zdan
       iborat, yorliq bo'lmagan eng uzun nomzod. */
    if(!eng){
      for(const qator of qatorlarRoyxati){
        if(qator.indexOf('/') >= 0) continue;        /* yorliq qatori */
        const nomzod = ismTozami(qator);
        if(nomzod && nomzod.length > eng.length) eng = nomzod;
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
      /* V194: ILGARI MRZ dagi ism SO'ZSIZ ishonilardi. Lekin bu yerga
         tushgan MRZ nazoratdan O'TMAGAN, ya'ni u umuman MRZ
         bo'lmasligi mumkin. Shuning uchun ismni avval tekshiramiz va
         faqat oddiy matndan ism topilmagan bo'lsagina olamiz. */
      const mi = ismTozami(mrz.toliqIsm);
      if(mi && !matn.toliqIsm){
        matn.toliqIsm = mi;
        const bk = mi.split(' ');
        matn.familiya = bk[0] || ''; matn.ism = bk.slice(1).join(' ');
      }
      matn.tur = mrz.tur + '?';
    }
    return matn;
  }

  /* ==================================================================
     MRZ TASMASINI RASMDAN TOPISH (V193) — OCR'siz, faqat piksellar
     ------------------------------------------------------------------
     NEGA KERAK. Avval skaner rasmni 4 burchakda va 2 xil kesimda —
     jami 8 marta — OCR qilardi. Telefonda har bir urinish 10-40
     soniya, ya'ni foydalanuvchi 3-5 daqiqa "O'qilmoqda..." ni ko'rib
     turardi va ko'pincha kutmay yopardi.

     YECHIM. MRZ ni OCR'siz ham topsa bo'ladi: u hujjatning bir
     chekkasida turgan, BIR XIL balandlikdagi 2-3 ta zich matn qatori
     bo'lib, deyarli BUTUN kenglikni egallaydi. Oddiy matnda bunday
     tuzilma uchramaydi. Shuning uchun:

       1) rasm kichik kulrangga keltiriladi (~700px) — bu millisekund;
       2) Otsu usuli bilan avtomatik qora/oq chegara topiladi;
       3) 4 burchakning har birida qatorlar zichligi hisoblanadi;
       4) eng "MRZ ga o'xshagan" tasma tanlanadi.

     Natijada OCR BIR MARTA, faqat o'sha tasmaning o'zida va yuqori
     aniqlikda ishlaydi. 8 urinish -> 1 urinish.

     Bu yerdagi hamma narsa SOF funksiya (kirish: kulrang massiv) —
     brauzersiz, Node'da ham sinab ko'rsa bo'ladi.
     ================================================================== */

  /* YORITISHNI TEKISLASH (V193).
     Telefon surati deyarli har doim notekis yoritilgan: bir chekkasi
     soyada, boshqasi yorug'. Bitta umumiy chegara bunday rasmda
     ishlamaydi — soyadagi joyning HAMMASI "qora", yorug' joyniki esa
     "oq" bo'lib chiqadi va matn qatorlari umuman ko'rinmay qoladi
     (sinovda aynan shu sabab tasma topilmagan edi).

     Yechim: rasmdan uning o'zining KUCHLI XIRALASHTIRILGAN nusxasi
     ayriladi. Xira nusxa — bu "fon yorug'ligi"; uni ayirsak, faqat
     mayda tafsilot, ya'ni matn qoladi. */
  function yoritishTekisla(kul, w, h){
    const n = w * h;
    const S = new Float64Array(n);
    for(let y = 0; y < h; y++){
      let qator = 0;
      for(let x = 0; x < w; x++){
        qator += kul[y * w + x];
        S[y * w + x] = (y ? S[(y-1) * w + x] : 0) + qator;
      }
    }
    const r = Math.max(6, Math.round(Math.min(w, h) / 8));
    const chiq = new Uint8Array(n);
    for(let y = 0; y < h; y++){
      const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
      for(let x = 0; x < w; x++){
        const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
        const soni = (x1 - x0 + 1) * (y1 - y0 + 1);
        const A = y0 ? S[(y0-1) * w + x1] : 0;
        const B = x0 ? S[y1 * w + (x0-1)] : 0;
        const C = (y0 && x0) ? S[(y0-1) * w + (x0-1)] : 0;
        const fon = (S[y1 * w + x1] - A - B + C) / soni;
        let v = 160 + (kul[y * w + x] - fon);
        chiq[y * w + x] = v < 0 ? 0 : (v > 255 ? 255 : v);
      }
    }
    return chiq;
  }

  /* Otsu: gistogrammadan eng yaxshi qora/oq chegarani topadi. */
  function otsuChegara(kul){
    const hist = new Uint32Array(256);
    for(let i = 0; i < kul.length; i++) hist[kul[i]]++;
    const jami = kul.length;
    let sum = 0;
    for(let t = 0; t < 256; t++) sum += t * hist[t];
    let sumB = 0, wB = 0, eng = -1, chegara = 128;
    for(let t = 0; t < 256; t++){
      wB += hist[t]; if(!wB) continue;
      const wF = jami - wB; if(!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const v = wB * wF * (mB - mF) * (mB - mF);
      if(v > eng){ eng = v; chegara = t; }
    }
    return chegara;
  }

  /* Kulrang massivni burish. MUHIM: bu canvas'dagi
     `ctx.rotate(burilish)` bilan AYNAN bir xil natija berishi shart —
     aks holda tasma topilgan joy bilan kesilgan joy mos kelmaydi.
     Shuning uchun brauzer sinovida ikkalasi solishtiriladi. */
  function kulAylan(kul, w, h, burilish){
    burilish = ((burilish % 360) + 360) % 360;
    if(burilish === 0) return { kul: kul, w: w, h: h };
    const n = w * h, chiq = new Uint8Array(n);
    if(burilish === 180){
      for(let i = 0; i < n; i++) chiq[i] = kul[n - 1 - i];
      return { kul: chiq, w: w, h: h };
    }
    if(burilish === 90){
      /* soat yo'nalishi: eski (x,y) -> yangi (h-1-y, x) */
      for(let y = 0; y < h; y++){ const o = y * w;
        for(let x = 0; x < w; x++) chiq[x * h + (h - 1 - y)] = kul[o + x]; }
      return { kul: chiq, w: h, h: w };
    }
    for(let y = 0; y < h; y++){ const o = y * w;
      for(let x = 0; x < w; x++) chiq[(w - 1 - x) * h + y] = kul[o + x]; }
    return { kul: chiq, w: h, h: w };
  }

  /* Bitta burilish uchun: pastki chekkadagi eng MRZ'simon tasma. */
  function tasmaTop(kul, w, h, chegara){
    if(w < 40 || h < 40) return null;

    /* Har qatorda qancha qora piksel bor + qayerdan qayergacha. */
    const zich = new Float32Array(h), chap = new Int32Array(h), ong = new Int32Array(h);
    for(let y = 0; y < h; y++){
      const o = y * w; let n = 0, c = -1, g = -1;
      for(let x = 0; x < w; x++) if(kul[o + x] <= chegara){ n++; if(c < 0) c = x; g = x; }
      zich[y] = n / w; chap[y] = c; ong[y] = g;
    }

    /* Qatorlarni ajratamiz: zichligi yetarli ketma-ket satrlar. */
    const satrlar = [];
    let bosh = -1;
    for(let y = 0; y <= h; y++){
      const bor = y < h && zich[y] >= 0.06;
      if(bor && bosh < 0) bosh = y;
      if(!bor && bosh >= 0){
        const y0 = bosh, y1 = y - 1; bosh = -1;
        const bal = y1 - y0 + 1;
        if(bal < Math.max(2, h * 0.004) || bal > h * 0.09) continue;
        let z = 0, kmin = w, kmax = 0;
        for(let k = y0; k <= y1; k++){
          z += zich[k];
          if(chap[k] >= 0 && chap[k] < kmin) kmin = chap[k];
          if(ong[k] > kmax) kmax = ong[k];
        }
        satrlar.push({ y0: y0, y1: y1, bal: bal, zich: z / bal, qamrov: (kmax - kmin) / w });
      }
    }
    if(satrlar.length < 2) return null;

    /* MRZ: 2 yoki 3 ta yonma-yon, bir xil balandlikdagi, zich va
       deyarli butun kenglikka cho'zilgan qator. */
    let eng = null;
    for(let n = 3; n >= 2; n--){
      for(let i = 0; i + n <= satrlar.length; i++){
        const g = satrlar.slice(i, i + n);
        let yaxshi = true, zJami = 0, qJami = 0;
        for(const s of g){
          if(s.zich < 0.13 || s.qamrov < 0.62){ yaxshi = false; break; }
          zJami += s.zich; qJami += s.qamrov;
        }
        if(!yaxshi) continue;
        /* balandliklar va oraliqlar bir xilmi? */
        const ball0 = g[0].bal;
        let tekis = true, oraliqlar = [];
        for(let k = 0; k < n; k++){
          if(Math.abs(g[k].bal - ball0) > Math.max(2, ball0 * 0.55)){ tekis = false; break; }
          if(k) oraliqlar.push(g[k].y0 - g[k-1].y1);
        }
        if(!tekis) continue;
        const engOraliq = Math.max.apply(null, oraliqlar);
        if(engOraliq > ball0 * 2.2) continue;
        /* chekkaga yaqinmi? MRZ hujjatning pastki qismida bo'ladi. */
        const markaz = (g[0].y0 + g[n-1].y1) / 2 / h;
        if(markaz < 0.55) continue;
        const chekka = (markaz - 0.55) / 0.45;         /* 0..1 */
        const ball = (zJami / n) * 2 + (qJami / n) + chekka * 1.6 + (n === 3 ? 0.35 : 0);
        if(!eng || ball > eng.ball){
          const sig = Math.round(ball0 * 0.7);
          eng = { y0: Math.max(0, g[0].y0 - sig), y1: Math.min(h - 1, g[n-1].y1 + sig),
                  qatorlar: n, ball: ball };
        }
      }
    }
    return eng;
  }

  /* Hamma burilishni ko'rib, eng yaxshi tasmani qaytaradi.
     Qaytadi: {burilish, y0, y1, w, h, ball} — y0/y1 O'SHA burilishdagi
     rasm koordinatasida. */
  function mrzBandi(kul, w, h){
    kul = yoritishTekisla(kul, w, h);
    const chegara = otsuChegara(kul);
    let eng = null;
    for(const b of [0, 180, 90, 270]){
      const r = kulAylan(kul, w, h, b);
      const t = tasmaTop(r.kul, r.w, r.h, chegara);
      if(t && (!eng || t.ball > eng.ball)){
        eng = { burilish: b, y0: t.y0, y1: t.y1, w: r.w, h: r.h,
                qatorlar: t.qatorlar, ball: t.ball };
      }
    }
    return eng;
  }

  /* --- QIYSHIQLIKNI O'LCHASH (V193) ---------------------------------
     Telefonda qo'lda olingan surat hech qachon tep-tekis bo'lmaydi —
     odatda 2-6 daraja qiyshiq tushadi. OCR uchun bu ko'p: harflar
     qatori "zinapoya" bo'lib ketadi va MRZ tasmasi ham yoyilib,
     topilmay qoladi (sinovda aynan shunday bo'ldi).

     USUL — "proyeksiya profili". Rasmni turli burchakda qaraymiz va
     har safar qora piksellarni gorizontal yo'laklarga taqsimlaymiz.
     TO'G'RI burchakda matn qatorlari aniq yo'laklarga tushadi, ya'ni
     profil "tishli" bo'ladi; qiyshiq burchakda esa yoyilib, silliq
     bo'lib qoladi. Shunday qilib eng "tishli" burchak — to'g'risi.

     Matn qatorlari TIK bo'lishi ham mumkin (hujjat yonboshlagan), shu
     sabab ikkala o'q bo'yicha ham qaraladi. */
  function profilBalli(kul, w, h, chegara, t, oq){
    const n = h + w + 4;
    const acc = new Float64Array(n);
    const ofs = Math.ceil(Math.abs(t) * (oq ? h : w)) + 1;
    const qadam = (w * h > 400000) ? 2 : 1;
    for(let y = 0; y < h; y += qadam){
      const o = y * w;
      for(let x = 0; x < w; x += qadam){
        if(kul[o + x] > chegara) continue;
        const b = oq ? (x - t * y + ofs) : (y - t * x + ofs);
        const i = b | 0;
        if(i >= 0 && i < n) acc[i]++;
      }
    }
    let ball = 0;
    for(let i = 1; i < n; i++){ const d = acc[i] - acc[i-1]; ball += d * d; }
    return ball;
  }

  /* Qaytadi: {burchak, oq} — `burchak` daraja, `oq` 0 = matn qatorlari
     gorizontal, 1 = tik. To'g'rilash uchun rasmni (-burchak) ga burish
     kerak (ikkala holatda ham). */
  function qiyshiqlik(kul, w, h, chegara){
    if(chegara == null) chegara = otsuChegara(kul);
    /* MUHIM: ikki o'qning ballarini BEVOSITA solishtirib bo'lmaydi —
       ular har xil sondagi yo'lakka bo'linadi, ya'ni o'lchov birligi
       boshqa. Shuning uchun har o'q ichida "eng yaxshi / o'rtacha"
       nisbati olinadi: matn qatorlari qaysi o'qda bo'lsa, o'sha o'qda
       burchak o'zgarganda ball keskin o'zgaradi. */
    let eng = { burchak: 0, oq: 0, nisbat: 0 };
    for(let oq = 0; oq <= 1; oq++){
      const ballar = [];
      for(let a = -8; a <= 8.0001; a += 0.5){
        const t = Math.tan(a * Math.PI / 180);
        ballar.push({ a: a, b: profilBalli(kul, w, h, chegara, t, oq) });
      }
      let yig = 0, mx = ballar[0];
      for(const x of ballar){ yig += x.b; if(x.b > mx.b) mx = x; }
      const ortacha = yig / ballar.length;
      const nisbat = ortacha > 0 ? mx.b / ortacha : 0;
      if(nisbat > eng.nisbat) eng = { burchak: mx.a, oq: oq, nisbat: nisbat };
    }
    return eng;
  }

  /* Rasmni tekislash uchun KERAKLI burilish (daraja, soat yo'nalishi
     musbat — canvas'dagi `ctx.rotate` bilan bir xil).
     Belgilar sinov bilan aniqlangan: matn qatorlari tik bo'lsa
     (oq=1) ishora teskari bo'ladi. */
  function tuzatishBurchagi(kul, w, h, chegara){
    const q = qiyshiqlik(yoritishTekisla(kul, w, h), w, h, chegara);
    return q.oq ? q.burchak : -q.burchak;
  }

  /* OCR MRZ belgilarini ko'pincha chalkashtiradi: `<` ni `«`, `‹`,
     `(`, `K` deb o'qiydi. `qatorlar()` bunday belgini olib tashlaydi
     va qator qisqarib, MRZ tanilmay qoladi. Shuning uchun avval
     almashtiramiz. */
  function mrzTozala(xom){
    return String(xom || '')
      .replace(/[«»‹›]/g, '<<')
      .replace(/[‹›❰❱]/g, '<')
      .replace(/[({\[〈〉]/g, '<')
      .replace(/[|!]/g, '1')
      .replace(/[ \t]+/g, '');
  }

  const API = { oqi, mrzOqi, oddiyMatndan, nazoratRaqami, nazoratTogrimi, sanaOch, ismOch,
                otsuChegara, kulAylan, tasmaTop, mrzBandi, mrzTozala,
                profilBalli, qiyshiqlik, tuzatishBurchagi, yoritishTekisla,
                mrzQatorimi, ismTozami, qatordanIsm };
  if(typeof module !== 'undefined' && module.exports) module.exports = API;
  global.HujjatOqish = API;
})(typeof window !== 'undefined' ? window : globalThis);
