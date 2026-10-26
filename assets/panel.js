
/* ==================================================================
   SANA FORMATI — KUN.OY.YIL (V121)
   ------------------------------------------------------------------
   MUAMMO. Hamma joyda `toLocaleDateString('uz-UZ')` ishlatilardi.
   Brauzerda (Chrome) o'zbek lokali sanani TESKARI — ISO tartibida
   qaytaradi: "2026-03-09". Admin esa kun.oy.yil kutadi.
   Tekshirildi (brauzerda o'lchangan):
       uz-UZ  ->  2026-03-09     (teskari)
       ru-RU  ->  09.03.2026     (to'g'ri)
   Lokalga tayanmaymiz: sanani O'ZIMIZ yig'amiz, shunda u HAR QANDAY
   brauzerda, har qanday til sozlamasida bir xil chiqadi.
   ================================================================== */
function sanaUz(x){
  const d = (x instanceof Date) ? x : new Date(x);
  if(!d || isNaN(d.getTime())) return '';
  const q = n => String(n).padStart(2, '0');
  return q(d.getDate()) + '.' + q(d.getMonth() + 1) + '.' + d.getFullYear();
}
function sanaVaqtUz(x){
  const d = (x instanceof Date) ? x : new Date(x);
  if(!d || isNaN(d.getTime())) return '';
  const q = n => String(n).padStart(2, '0');
  return sanaUz(d) + ', ' + q(d.getHours()) + ':' + q(d.getMinutes());
}
/* "2026-03-09" (input qiymati) -> "09.03.2026" */
function isoSanaUz(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '.' + m[2] + '.' + m[1]) : '';
}
/* "09.03.2026" -> "2026-03-09" (input qiymati uchun) */
function uzSanaIso(uz){
  const m = String(uz || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if(!m) return '';
  const k = Number(m[1]), o = Number(m[2]), y = Number(m[3]);
  if(k < 1 || k > 31 || o < 1 || o > 12 || y < 1900 || y > 2200) return '';
  return m[3] + '-' + m[2] + '-' + m[1];
}

/* ==================================================================
   SANA MAYDONI — KUN.OY.YIL KO'RINISHIDA (V121)
   ------------------------------------------------------------------
   MUAMMO. `<input type="date">` ni brauzer O'ZI chizadi va qaysi
   tartibda ko'rsatishni BRAUZER TILI hal qiladi — biz emas. Sinab
   ko'rildi: elementga `lang="ru-RU"` qo'yish ham yordam bermaydi,
   Chrome baribir o'z interfeys tilidagi tartibni ishlatadi
   (ko'pincha oy/kun/yil yoki yil-oy-kun). Admin esa KUN.OY.YIL
   kutadi.

   YECHIM. Asl `type="date"` maydoni DOM da QOLADI (ko'rinmaydi) —
   demak uni o'qiydigan/yozadigan butun mavjud kod o'zgarmasdan
   ishlayveradi. Uning ustiga oddiy MATN maydoni qo'yiladi: u
   kun.oy.yil ko'rinishida yoziladi va yozilayotganda nuqtalar o'zi
   qo'yiladi. Yonidagi tugma esa brauzerning o'z taqvimini ochadi.

   Qo'shimcha nozik joy: mavjud kod ba'zan `el.value = '2026-10-26'`
   deb TO'G'RIDAN-TO'G'RI yozadi (masalan formani tozalaganda). Oddiy
   hodisa tinglash bunda ishlamaydi, shu sabab shu ELEMENTNING O'ZIDA
   `value` xossasi ustidan yoziladi — qiymat o'zgarishi bilan matn
   maydoni ham yangilanadi. */
function sanaMaydoniUz(el){
  if(!el || el.dataset.uzSana === '1') return;
  el.dataset.uzSana = '1';

  const oram = document.createElement('div');
  oram.className = 'uzsana';
  el.parentNode.insertBefore(oram, el);
  oram.appendChild(el);

  const matn = document.createElement('input');
  matn.type = 'text';
  matn.inputMode = 'numeric';
  matn.autocomplete = 'off';
  matn.placeholder = 'kun.oy.yil';
  matn.maxLength = 10;
  matn.className = el.className;
  if(el.id) matn.id = el.id + '_uz';
  oram.appendChild(matn);

  const tugma = document.createElement('button');
  tugma.type = 'button';
  tugma.className = 'uzsana-btn';
  tugma.setAttribute('aria-label', 'Taqvimni ochish');
  tugma.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
  oram.appendChild(tugma);

  const tavsif = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const matndanIso = () => uzSanaIso(matn.value);

  function matnniYangila(){ matn.value = isoSanaUz(tavsif.get.call(el)); }

  /* Asl maydon qiymati O'ZGARTIRILSA (kod orqali ham) — matn ergashadi */
  Object.defineProperty(el, 'value', {
    configurable: true,
    get(){ return tavsif.get.call(el); },
    set(v){ tavsif.set.call(el, v); matnniYangila(); }
  });

  el.addEventListener('change', matnniYangila);
  el.addEventListener('input', matnniYangila);

  matn.addEventListener('input', ()=>{
    const r = matn.value.replace(/\D/g, '').slice(0, 8);
    let chiq = r.slice(0, 2);
    if(r.length > 2) chiq += '.' + r.slice(2, 4);
    if(r.length > 4) chiq += '.' + r.slice(4, 8);
    matn.value = chiq;
    const iso = matndanIso();
    if(iso){
      tavsif.set.call(el, iso);
      el.dispatchEvent(new Event('change', { bubbles:true }));
    }
  });
  matn.addEventListener('blur', ()=>{
    /* To'liq bo'lmasa — asl qiymatga qaytaramiz (yarim sana saqlanmasin) */
    if(!matndanIso()) matnniYangila();
  });

  tugma.addEventListener('click', ()=>{
    try{ if(typeof el.showPicker === 'function'){ el.showPicker(); return; } }catch(e){}
    try{ el.focus(); el.click(); }catch(e){}
  });

  matnniYangila();
}

/* Sahifadagi BARCHA sana maydonlarini bir yo'la o'zgartiradi.
   Keyin qo'shilganlari uchun ham qayta chaqirish mumkin — allaqachon
   o'zgartirilganlari ikkinchi marta tegilmaydi. */
function sanaMaydonlariniUzlashtir(ildiz){
  const joy = ildiz || document;
  joy.querySelectorAll('input[type="date"]').forEach(sanaMaydoniUz);
}
/* ==================================================================
   VIP RAQAMLAR — BOSHQARUV PANELI MANTIQI
   ------------------------------------------------------------------
   Bu fayl ilgari panel-boshqaruv.html ICHIDA (inline <script>) edi —
   483 KB. Panel har ochilganda brauzer uni qaytadan yuklab, qaytadan
   kompilyatsiya qilardi. iPhone'dagi "sekin ochilyapti" ning eng
   katta sababi shu edi.

   ENDI alohida fayl va `defer` bilan yuklanadi:
     * brauzer HTML'ni DARHOL chizadi, skriptni fonda yuklaydi;
     * fayl bir marta yuklanib, keyin diskdan olinadi (bir yillik
       kesh) — ikkinchi ochilishda 483 KB umuman yuklanmaydi;
     * Safari kompilyatsiya natijasini ham keshlaydi, ya'ni ikkinchi
       ochilishda tahlil qilish vaqti ham qisqaradi.

   `defer` xavfsiz: skript HTML to'liq o'qilgandan keyin ishga
   tushadi (ilgari ham u <body> oxirida turardi), Firebase SDK
   fayllari esa undan OLDIN, o'z tartibida yuklanadi.

   O'ZGARTIRISH KIRITSANGIZ: endi mantiq SHU faylda. HTML'dagi
   havolaning oxiridagi raqamni (?v=114) ham oshiring.
   ================================================================== */
/* =========================================================
   FIREBASE SOZLAMALARI
   index.html dagi bilan AYNAN BIR XIL bo'lishi kerak.
========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyAZVM_C5tRYe77j4OvQtrBhV3dpEZAxk_A",
  authDomain: "vip-raqamlar.firebaseapp.com",
  projectId: "vip-raqamlar",
  storageBucket: "vip-raqamlar.firebasestorage.app",
  messagingSenderId: "872049914686",
  appId: "1:872049914686:web:32fd7945238fdbf5eeb26f",
  measurementId: "G-SB37FEXJ0F"
};
firebase.initializeApp(firebaseConfig);
/* ---------- APP CHECK (bot himoyasi) ----------
   Firebase konsolida App Check "Enforced" (majburiy) holatida:
   Authentication, Firestore va Storage HAR BIR so'rovda haqiqiy
   App Check tokenini talab qiladi. Token bo'lmasa — kirish ham,
   ma'lumot o'qish ham RAD etiladi ("auth/firebase-app-check-token-
   is-invalid"). Ya'ni App Check'ni O'CHIRIB QO'YISH yordam bermaydi,
   aksincha panelni butunlay yopib qo'yadi — shuning uchun u HAR DOIM
   yoqiladi.

   Token olinmasligining amaliy sabablari (hammasi brauzer tomonida):
     * reCAPTCHA skripti (www.google.com) to'silgan — kengaytma,
       reklama bloklagich yoki antivirusning veb qalqoni;
     * kompyuter soati noto'g'ri — token "muddati o'tgan" hisoblanadi;
     * sayt reCAPTCHA kalitida ro'yxatdan o'tmagan domendan ochilgan
       (masalan `www.` bilan yoki Netlify'ning vaqtinchalik manzilidan).
   Quyidagi `appCheckTashxis()` aynan shu uchtasini ajratib aytadi.

   TUZATISH UCHUN TOKEN (debug token). Bitta kompyuterni tezda
   ochish kerak bo'lsa: panelni `?appcheck-debug=1` bilan oching,
   brauzer konsolida chiqqan tokenni Firebase konsolidagi
   App Check -> Apps -> (web ilova) -> Manage debug tokens ga
   qo'shing. Token RO'YXATGA QO'SHILMAGUNCHA hech narsa ochilmaydi,
   shuning uchun bu himoyani zaiflashtirmaydi. Ish tugagach tokenni
   konsoldan o'chiring. */
const APPCHECK_DEBUG_KALIT = 'vr_appcheck_debug';
try{
  if(new URLSearchParams(location.search).get('appcheck-debug') === '1'){
    localStorage.setItem(APPCHECK_DEBUG_KALIT, '1');
  }
  if(localStorage.getItem(APPCHECK_DEBUG_KALIT) === '1'){
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.warn('App Check DEBUG rejimi yoqilgan. Pastda chiqqan tokenni '
      + 'Firebase konsolida "Manage debug tokens" ga qo\'shing. '
      + 'Ish tugagach: localStorage.removeItem("' + APPCHECK_DEBUG_KALIT + '")');
  }
}catch(e){}
try{ firebase.appCheck().activate('6LddC2ItAAAAAPajc0NSM_wtRLb_6ik0VDVCV7ll', true); }
catch(e){ console.warn('App Check yoqilmadi:', e && e.message); }

/* App Check tokeni nega olinmayotganini aniqlaydi. Uchta sababni
   alohida tekshiradi va mijozga TUSHUNARLI matn qaytaradi. */
async function appCheckTashxis(){
  async function ochiqmi(url, opt){
    const ctrl = new AbortController();
    const t = setTimeout(()=> ctrl.abort(), 5000);
    try{ await fetch(url, Object.assign({ cache:'no-store', signal: ctrl.signal }, opt||{})); return true; }
    catch(e){ return false; }
    finally{ clearTimeout(t); }
  }
  const [cap, ac] = await Promise.all([
    ochiqmi('https://www.google.com/recaptcha/api.js', { mode:'no-cors' }),
    ochiqmi('https://firebaseappcheck.googleapis.com/v1/jwks', { mode:'no-cors' })
  ]);
  /* Kompyuter soati — server vaqtiga solishtiramiz */
  let farq = null;
  try{
    const r = await fetch('/?soat=' + Date.now(), { method:'HEAD', cache:'no-store' });
    const sarlavha = r.headers.get('date');
    if(sarlavha) farq = Math.round((Date.now() - new Date(sarlavha).getTime()) / 1000);
  }catch(e){}

  if(!cap || !ac){
    return "Sabab: bot himoyasi (App Check) uchun kerakli manzil to'silgan"
      + (!cap ? " — www.google.com/recaptcha" : " — firebaseappcheck.googleapis.com") + ".\n"
      + "Odatda buni brauzer kengaytmasi (reklama bloklagich, maxfiylik qalqoni) "
      + "yoki antivirusning veb qalqoni to'sadi.\n"
      + "• Yashirin oynada oching (Ctrl+Shift+N) — kengaytmalar o'chadi;\n"
      + "• yoki kengaytmalarda google.com va googleapis.com ga ruxsat bering;\n"
      + "• yoki antivirusning “veb/HTTPS qalqoni”ni vaqtincha o'chiring.";
  }
  if(farq !== null && Math.abs(farq) > 120){
    return "Sabab: KOMPYUTER SOATI noto'g'ri — haqiqiy vaqtdan "
      + Math.abs(farq) + " soniya " + (farq > 0 ? "oldinda" : "orqada") + ".\n"
      + "Bot himoyasi tokeni shu sabab “muddati o'tgan” hisoblanadi.\n"
      + "• Windows: Sana va vaqt → “Vaqtni avtomatik o'rnatish” yoqing, "
      + "so'ng “Hozir sinxronlash” tugmasini bosing;\n"
      + "• keyin sahifani yangilang.";
  }
  if(location.hostname !== 'vipraqamlar.uz'){
    return "Sabab: sahifa “" + location.hostname + "” manzilidan ochilgan. "
      + "Bot himoyasi kaliti faqat vipraqamlar.uz uchun ro'yxatdan o'tgan.\n"
      + "• Panelni https://vipraqamlar.uz/panel-boshqaruv.html manzilidan oching.";
  }
  return "Bot himoyasi (App Check) tokenini olib bo'lmadi, lekin aniq sabab "
    + "topilmadi.\n• Sahifani yangilang (Ctrl+F5) va yana urinib ko'ring;\n"
    + "• yordam bermasa, panelni ?appcheck-debug=1 bilan oching va "
    + "konsoldagi tokenni Firebase → App Check → Manage debug tokens ga qo'shing.";
}

/* ================= KIRISH XIZMATI: ZAXIRA YO'L (V99) =================
   MUAMMO. Ba'zi KOMPYUTERLARDA panelga kirib bo'lmasdi: sayt ochiladi,
   parol to'g'ri, lekin Firebase "auth/network-request-failed" beradi.
   Xuddi shu tarmoqda TELEFONDAN esa kiraverardi. Sabab: kirish
   so'rovi saytga EMAS, Google'ning alohida manziliga ketadi —
   identitytoolkit.googleapis.com. Kompyuterdagi antivirusning "veb
   qalqoni", reklama bloklagich/maxfiylik kengaytmasi yoki routerdagi
   DNS filtri aynan shu manzilni to'sadi. Telefonda bunday to'siq yo'q.

   YECHIM. Firebase SDK'da "boshqa manzilga yuborish" imkoni bor
   (useEmulator). Biz undan shu maqsadda foydalanamiz: so'rov
   SAYTNING O'ZIGA ketadi, sayt esa uni Google'ga uzatadi
   (netlify/functions/auth-proxy.js). Sayt manzili to'silmagan —
   demak kirish ishlaydi.

   QACHON YOQILADI:
     1. Sahifa ochilganda Google manzili TEKSHIRILADI. Ochilmasa —
        zaxira yo'l DARHOL yoqiladi, mijoz hech narsa sezmaydi.
     2. Tekshiruv "ochiq" desa-yu, kirish baribir tarmoq xatosi bersa —
        belgi saqlanadi va sahifa bir marta yangilanadi, keyin zaxira
        yo'ldan kiriladi.
     3. Belgi saqlangan bo'lsa — keyingi safar tekshiruvsiz, to'g'ridan
        zaxira yo'l (tez ochiladi).

   MUHIM: `useEmulator` Firebase'ning BIRINCHI kirish so'rovidan OLDIN
   chaqirilishi shart, shuning uchun u aynan shu yerda — fayl boshida.
   `doLogin` esa quyida `await AUTH_TAYYOR` bilan tekshiruvni kutadi. */
const AUTH_ZAXIRA_KALIT = 'vr_auth_zaxira';
window.AUTH_ZAXIRA = false;

function authZaxiraYoq(){
  if(window.AUTH_ZAXIRA) return true;
  try{
    /* Manzil sifatida saytning O'ZI beriladi. Firebase SDK undan faqat
       domen va portni oladi va so'rovni
         https://vipraqamlar.uz/identitytoolkit.googleapis.com/v1/...
       ko'rinishida yuboradi — _redirects uni auth-proxy funksiyasiga
       yo'naltiradi. `disableWarnings` — ekranda sariq ogohlantirish
       chizig'i chiqmasligi uchun (u mijozga keraksiz). */
    firebase.auth().useEmulator(location.origin, { disableWarnings: true });
    window.AUTH_ZAXIRA = true;
    try{ localStorage.setItem(AUTH_ZAXIRA_KALIT, '1'); }catch(e){}
    console.info('Kirish: zaxira yo\'l yoqildi (sayt orqali).');
    return true;
  }catch(e){
    console.warn('Zaxira yo\'lni yoqib bo\'lmadi:', e && e.message);
    return false;
  }
}

window.AUTH_TAYYOR = (async function authYolTanla(){
  if(location.protocol === 'file:') return;          // baribir ishlamaydi
  /* TUZATISH (V102): ilgari bu yerda Google manzili "ochiqmi" deb
     TEKSHIRILARDI va tekshiruv muvaffaqiyatsiz bo'lsa zaxira yo'l
     DARHOL yoqilardi. Bu xato yondashuv edi:
       * `no-cors` tekshiruv sog'lom qurilmada ham rad etilishi mumkin
         (CSP, kesh, sekin tarmoq) — ya'ni YOLG'ON signal beradi;
       * belgi localStorage'da QOLIB ketardi, ya'ni bitta yolg'on
         signal o'sha qurilmada kirishni butunlay zaxira yo'lga
         o'tkazib qo'yardi.
     Endi zaxira yo'l FAQAT haqiqiy tarmoq xatosidan keyin yoqiladi
     (qarang: doLogin ichidagi 'auth/network-request-failed'). */
  try{
    /* Qo'lda o'chirish: panelni `?zaxira=0` bilan ochish zaxira yo'l
       belgisini tozalaydi. Qurilma biror sababga ko'ra zaxira yo'lda
       "qotib" qolsa, konsolga kirmasdan tiklash uchun. */
    if(new URLSearchParams(location.search).get('zaxira') === '0'){
      localStorage.removeItem(AUTH_ZAXIRA_KALIT);
      sessionStorage.removeItem('vr_auth_zaxira_qayta');
      console.info("Zaxira yo'l belgisi o'chirildi.");
      return;
    }
    if(localStorage.getItem(AUTH_ZAXIRA_KALIT) === '1') authZaxiraYoq();
  }catch(e){}
})();

const db = firebase.firestore();

/* ================= KATALOG INDEKSINI "ESKIRGAN" DEB BELGILASH =================
   Sayt katalogni endi Firestore'dan to'g'ridan-to'g'ri emas, tayyor
   ixcham indeksdan o'qiydi (netlify/functions/api-index.js) — shu sabab
   u mijozlarda bir zumda ochiladi. Lekin indeks o'z-o'zidan yangilanmaydi:
   raqam qo'shilgani yoki o'chirilgani sonidan bilinadi, NARX TAHRIRI esa
   bilinmaydi.

   Shuning uchun panelda `numbers` to'plamiga har qanday yozuv amalga
   oshganda shu yerda bitta kichik belgi qo'yiladi — keyingi so'rovda
   indeks qaytadan quriladi (bir daqiqa ichida saytda ko'rinadi).

   Bu yondashuvning afzalligi: panelning 14 ta turli joyidagi yozuvni
   birma-bir tahrirlash shart emas — hammasi SHU YERDAN, bitta joydan
   ushlanadi. Yangi yozuv kodi qo'shilsa ham o'zi ishlayveradi. */
(function indeksBelgisi(){
  let oxirgi = 0;
  const belgila = ()=>{
    const now = Date.now();
    if(now - oxirgi < 1500) return;        // ketma-ket yozuvlarda bir marta
    oxirgi = now;
    db.collection('search_index').doc('dirty')
      .set({ at: now }, { merge:true }).catch(()=>{});
  };

  const asl = db.collection.bind(db);
  db.collection = function(name){
    const c = asl(name);
    if(name !== 'numbers') return c;

    const aslAdd = c.add.bind(c);
    c.add = (...a) => aslAdd(...a).then(r => { belgila(); return r; });

    const aslDoc = c.doc.bind(c);
    c.doc = function(...d){
      const ref = aslDoc(...d);
      for(const m of ['set','update','delete']){
        const f = ref[m].bind(ref);
        ref[m] = (...a) => f(...a).then(r => { belgila(); return r; });
      }
      return ref;
    };
    return c;
  };
})();

/* telegram-notify kabi funksiyalarga so'rov yuborganda App Check tokenini
   ham qo'shib yuboramiz — xuddi index.html'dagi getAppCheckHeaders() kabi
   (qarang: netlify/functions/telegram-notify.js). */
async function getAppCheckHeaders(){
  try{
    const t = await firebase.appCheck().getToken();
    return { 'X-Firebase-AppCheck': t.token };
  }catch(e){ return {}; }
}

// MUHIM (mijoz iltimosi: "admin saytda faqat iPhone'dan yozilsa umuman
// yozilmayabdi, qotib qolyabdi — orqada biror narsa ishlayotgan bo'lsa
// olib tashla"): sahifada bir nechta orqa fon jarayoni (buyurtmalar
// ro'yxatining jonli tinglovchisi, vazifa muddati countdown'i, onlayn
// statistika) muntazam DOM'ni yangilab turadi. Bu jarayonlar, hatto
// "yengil" ko'rinsa ham, aynan klaviaturadan harf bosilgan zumda ishga
// tushib qolsa — iPhone Safari'da asosiy JS oqimini bir lahzaga band
// qilib, ekranga chiqishi kerak bo'lgan harfni "kechiktirib" yuboradi
// (natijada "yozgan so'zlar darhol ko'rinmayabdi" degan taassurot
// qoldiradi). Shu sabab BUTUN sahifa darajasida ANIQ bitta bayroq bilan
// "hozir kimdir yozyapti" holatini kuzatamiz — pastda bir nechta joyda
// (buyurtmalar, vazifa countdown'i, onlayn statistika) shu bayroqqa
// qarab og'ir/davriy yangilanishlar YOZISH TUGAGUNCHA kechiktiriladi.
let isUserTyping = false;
document.addEventListener('focusin', (e)=>{
  if(e.target && e.target.matches && e.target.matches('input, textarea')) isUserTyping = true;
});
document.addEventListener('focusout', (e)=>{
  if(e.target && e.target.matches && e.target.matches('input, textarea')) isUserTyping = false;
});

// Ba'zi tarmoqlar (mobil operator, ofis Wi-Fi, VPN) Firestore'ning
// standart "streaming" ulanishini bloklashi mumkin — shu qator yoqilganda
// Firestore buni avtomatik aniqlab, orqa fonda oddiy "long polling"
// (HTTP so'rovlar) usuliga o'tadi, admin buni sezmaydi ham. Qarang:
// index.html'dagi bir xil izoh.
try{ db.settings({ experimentalAutoDetectLongPolling: true }); }catch(e){}
let storage = null;
try{ storage = firebase.storage(); }
catch(e){ console.error('Firebase Storage ishga tushmadi:', e); }

let lastSeenOrders = 0;
let currentOrdersCache = [];
let orderStatusFilter = 'all';
let currentNumbersCache = [];

function updateOverview(){
  document.getElementById('ovTotalNumbers').textContent = currentNumbersCache.length;
  document.getElementById('ovVipNumbers').textContent = currentNumbersCache.filter(n => n.tag === 'vip').length;
  document.getElementById('ovTotalOrders').textContent = currentOrdersCache.length;
}

/* ==================================================================
   BOSHQARUV PANELI (Dashboard) va BAZA RAQAM
   Faqat REAL, allaqachon bazada mavjud ma'lumotlardan hisoblanadi —
   hech qanday o'ylab topilgan (fake) raqam yo'q. Statistikalar
   currentOrdersCache / currentCreditContracts / currentNumbersCache
   keshlaridan va admin_tasks to'plamidan olinadi.
   ================================================================== */
function isToday(ts){
  if(!ts) return false;
  const d = new Date(ts), now = new Date();
  return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate();
}
/* "12.10.2026, 19:02:36" -> "12.10 19:02" — boshqaruv panelidagi
   ro'yxat tor joyga sig'sin, uzun sana qo'shni yozuvga tegib
   ketmasin (mijoz: "ustma-ust bo'lib juda hunuk"). */
function dashQisqaSana(v){
  const t = String(v || '').trim();
  if(!t) return '';
  const m = t.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})(?:[,\s]+(\d{1,2}:\d{2}))?/);
  if(m) return m[1].padStart(2,'0') + '.' + m[2].padStart(2,'0') + (m[4] ? ' ' + m[4] : '');
  return t.length > 12 ? t.slice(0, 12) : t;
}

function dashInitials(name){
  const s = (name || '').trim();
  if(!s) return '—';
  return s.split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
}

/* Real createdAtSort (millisekund) qiymatidan "5 daqiqa oldin" kabi
   nisbiy vaqt matnini hisoblaydi — Buyurtmalar ro'yxatida ishlatiladi. */
function relativeTimeUz(ts){
  if(!ts) return '';
  const diffMs = Date.now() - ts;
  if(diffMs < 0) return '';
  const diffMin = Math.floor(diffMs / 60000);
  if(diffMin < 1) return 'hozir';
  if(diffMin < 60) return diffMin + ' daqiqa oldin';
  const diffH = Math.floor(diffMin / 60);
  if(diffH < 24) return diffH + ' soat oldin';
  const diffD = Math.floor(diffH / 24);
  if(diffD === 1) return 'kecha';
  if(diffD < 7) return diffD + ' kun oldin';
  return sanaUz(ts);
}

async function refreshDashboardPane(){
  const statsEl = document.getElementById('dashStatsRow');
  const ordersEl = document.getElementById('dashRecentOrders');
  const tasksEl = document.getElementById('dashTasksMini');
  const creditEl = document.getElementById('dashCreditMini');
  const trendEl = document.getElementById('dashTrendChart');
  if(!statsEl) return;

  // Karta sarlavhalaridagi statik ikonalar (har chaqiriqda qayta
  // yozilsa ham arzon — DOM'ga faqat bir marta tegishdek ta'sir qiladi)
  const ordersIco = document.getElementById('dashOrdersIco');
  if(ordersIco && !ordersIco.innerHTML) ordersIco.innerHTML = ICONS.cart;
  const trendIco = document.getElementById('dashTrendIco');
  if(trendIco && !trendIco.innerHTML) trendIco.innerHTML = ICONS.barChart;
  const tasksIco = document.getElementById('dashTasksIco');
  if(tasksIco && !tasksIco.innerHTML) tasksIco.innerHTML = ICONS.listCheck;
  const creditIco = document.getElementById('dashCreditIco');
  if(creditIco && !creditIco.innerHTML) creditIco.innerHTML = ICONS.creditCard;

  // ---- Statistika kartalari (real hisoblangan) ----
  const todayOrders = currentOrdersCache.filter(o => isToday(o.createdAtSort));
  const yesterdayStart = new Date(); yesterdayStart.setDate(yesterdayStart.getDate()-1); yesterdayStart.setHours(0,0,0,0);
  const yesterdayEnd = new Date(yesterdayStart); yesterdayEnd.setHours(23,59,59,999);
  const yesterdayOrders = currentOrdersCache.filter(o => o.createdAtSort >= yesterdayStart.getTime() && o.createdAtSort <= yesterdayEnd.getTime());
  const ordersTrendDiff = todayOrders.length - yesterdayOrders.length;

  let activeContracts = 0, overdueContracts = 0;
  try{
    currentCreditContracts.forEach(d => {
      const a = qzAnalyze(d);
      if(a.state === 'done') return;
      activeContracts++;
      if(a.state === 'overdue') overdueContracts++;
    });
  }catch(e){ /* qzAnalyze hali yuklanmagan bo'lishi mumkin */ }

  const vipCount = currentNumbersCache.filter(n=>n.tag==='vip').length;

  statsEl.innerHTML = `
    <div class="dash-stat-card dsc-blue">
      <div class="dash-stat-top"><span class="dash-stat-label">Bugungi buyurtmalar</span><div class="dash-stat-ico">${ICONS.cart}</div></div>
      <div class="dash-stat-num">${todayOrders.length}${ordersTrendDiff !== 0 ? `<small class="${ordersTrendDiff<0?'bad':''}">${ordersTrendDiff>0?ICONS.trendUp:ICONS.trendDown} ${Math.abs(ordersTrendDiff)}</small>` : ''}</div>
      <div class="dash-stat-sub">jami ${currentOrdersCache.length} ta buyurtma</div>
    </div>
    <div class="dash-stat-card dsc-green">
      <div class="dash-stat-top"><span class="dash-stat-label">Bazadagi raqamlar</span><div class="dash-stat-ico">${ICONS.database}</div></div>
      <div class="dash-stat-num">${currentNumbersCache.length}</div>
      <div class="dash-stat-sub">shundan ${vipCount} ta VIP</div>
    </div>
    <div class="dash-stat-card dsc-violet">
      <div class="dash-stat-top"><span class="dash-stat-label">Faol shartnomalar</span><div class="dash-stat-ico">${ICONS.creditCard}</div></div>
      <div class="dash-stat-num">${activeContracts}</div>
      <div class="dash-stat-sub">bo'lib to'lashda</div>
    </div>
    <div class="dash-stat-card dsc-red">
      <div class="dash-stat-top"><span class="dash-stat-label">Kechikkan to'lovlar</span><div class="dash-stat-ico">${ICONS.alertTriangle}</div></div>
      <div class="dash-stat-num">${overdueContracts}<small class="${overdueContracts?'bad':''}">${overdueContracts ? '⚠' : '✓'}</small></div>
      <div class="dash-stat-sub">${overdueContracts ? 'eslatma yuborish kerak' : 'hammasi joyida'}</div>
    </div>
  `;

  // ---- Haftalik buyurtmalar trendi (oxirgi 7 kun, REAL sanalardan) ----
  if(trendEl){
    const days = [];
    for(let i=6;i>=0;i--){
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
      days.push(d);
    }
    const counts = days.map(d => {
      const next = new Date(d); next.setDate(next.getDate()+1);
      return currentOrdersCache.filter(o => o.createdAtSort >= d.getTime() && o.createdAtSort < next.getTime()).length;
    });
    const max = Math.max(1, ...counts);
    const dayLabels = ['Ya','Du','Se','Ch','Pa','Ju','Sh'];
    trendEl.innerHTML = days.map((d,i) => {
      const h = Math.max(4, Math.round((counts[i]/max)*96));
      const today = i === days.length-1;
      return `
      <div class="dash-trend-col">
        <div class="dash-trend-num">${counts[i]}</div>
        <div class="dash-trend-bar-track"><div class="dash-trend-bar ${today?'today':''} ${counts[i]===0?'empty':''}" style="height:${h}px;animation-delay:${i*0.04}s;"></div></div>
        <div class="dash-trend-label">${dayLabels[d.getDay()]}</div>
      </div>`;
    }).join('');
    const totalWeek = counts.reduce((a,b)=>a+b,0);
    const totalEl = document.getElementById('dashTrendTotal');
    if(totalEl) totalEl.textContent = `7 kunda: ${totalWeek} ta`;
  }

  // ---- So'nggi buyurtmalar ----
  if(ordersEl){
    const recent = currentOrdersCache.slice(0, 6);
    ordersEl.innerHTML = recent.length ? recent.map(o => `
      <div class="dash-order-row">
        <div class="dash-order-avatar">${dashInitials(o.name)}</div>
        <div class="dash-order-client-wrap">
          <span class="dash-order-num">${escapeHtml(o.number || '')}</span>
          <span class="dash-order-client">${escapeHtml(o.name || '')}</span>
        </div>
        <span class="dash-order-right">
          <span class="oc-status-badge ${statusClass(o.status)}">${escapeHtml(o.status || 'Yangi')}</span>
          <span class="dash-order-time">${escapeHtml(dashQisqaSana(o.createdAt))}</span>
        </span>
      </div>`).join('') : '<div class="wt-empty">Hali buyurtma yo\'q</div>';
    const ordersTotalEl = document.getElementById('dashOrdersTotal');
    if(ordersTotalEl) ordersTotalEl.textContent = `jami ${currentOrdersCache.length} ta`;
  }

  // ---- Bugungi vazifalar (mini) ----
  // ESLATMA: avval shu yerda .where('completed','==',false).orderBy('dueAt','asc')
  // ishlatilgan edi — Firestore'da bunday birlashtirilgan filtr+tartiblash uchun
  // alohida COMPOSITE INDEX kerak, u hali yaratilmagani uchun so'rov doim xatoga
  // uchrab "Yuklab bo'lmadi" chiqarardi. Endi faqat where bilan olib, tartiblashni
  // JS tomonida qilamiz — indekssiz ham ishlayveradi.
  if(tasksEl){
    try{
      const snap = await db.collection('admin_tasks').where('completed','==', false).limit(20).get();
      const tasks = snap.docs.map(d => d.data()).sort((a,b) => (a.dueAt||0) - (b.dueAt||0)).slice(0,5);
      tasksEl.innerHTML = tasks.length ? tasks.map(t => `
        <div class="dash-task-row">
          <div class="dash-task-dot"></div>
          <div>
            <div class="dash-task-title">${escapeHtml(t.text || '')}</div>
            <div class="dash-task-meta">${t.dueAt ? sanaVaqtUz(t.dueAt) : ''}</div>
          </div>
        </div>`).join('') : '<div class="wt-empty">Faol vazifa yo\'q</div>';
    }catch(e){ tasksEl.innerHTML = '<div class="wt-empty">Yuklab bo\'lmadi</div>'; }
  }

  // ---- Kredit shartnomalari (mini, kechikkanlar birinchi) ----
  if(creditEl){
    try{
      const withA = currentCreditContracts.map(d => ({ d, a: qzAnalyze(d) })).filter(x => x.a.state !== 'done');
      withA.sort((x,y) => QZ_RANK[x.a.state] - QZ_RANK[y.a.state]);
      const top = withA.slice(0, 5);
      creditEl.innerHTML = top.length ? top.map(({d,a}) => `
        <div class="dash-task-row">
          <div class="dash-task-dot" style="background:${a.state==='overdue'?'var(--red)':a.state==='soon'?'var(--amber)':'var(--green)'};"></div>
          <div>
            <div class="dash-task-title">${escapeHtml(d.number || '')} — ${escapeHtml(d.customerName || '')}</div>
            <div class="dash-task-meta">${qzPill(a)}</div>
          </div>
        </div>`).join('') : '<div class="wt-empty">Faol shartnoma yo\'q</div>';
    }catch(e){ creditEl.innerHTML = '<div class="wt-empty">Yuklab bo\'lmadi</div>'; }
  }

  const updatedEl = document.getElementById('dashUpdatedAt');
  if(updatedEl) updatedEl.textContent = 'Yangilandi: ' + new Date().toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
}

async function refreshBazaraqamPane(){
  const statsEl = document.getElementById('bazaOperatorStats');
  const listEl = document.getElementById('bazaRecentList');
  if(!statsEl) return;
  statsEl.innerHTML = OPERATORS.map(op => {
    const count = currentNumbersCache.filter(n => n.operator === op).length;
    return `
    <div class="dash-stat-card">
      <div class="dash-stat-top">${escapeHtml(op)}</div>
      <div class="dash-stat-num">${count}</div>
      <div class="dash-stat-sub">ta raqam bazada</div>
    </div>`;
  }).join('');

  if(listEl){
    const recent = currentNumbersCache
      .slice()
      .sort((a,b) => (b.createdAtSort||0) - (a.createdAtSort||0))
      .slice(0, 8);
    /* SO'NGGI QO'SHILGAN RAQAMLAR — QISQA VA ANIQ.
       Ilgari bu yerda to'rtta bo'sh <span> yonma-yon turardi: telefonda
       raqam, operator, "VIP" va TO'LIQ sana bir qatorga tiqilib,
       bir-birining ustiga chiqib ketardi (mijoz: "ustma-ust bo'lib
       juda xunuk"). Endi buyurtmalar ro'yxati bilan bir xil tuzilma:
       chapda raqam va operator (ikki qator), o'ngda toifa va QISQA
       sana — ustma-ust emas, bir-birining ostida. */
    listEl.innerHTML = recent.length ? recent.map(n => `
      <div class="dash-order-row">
        <div class="dash-order-client-wrap">
          <span class="dash-order-num">${escapeHtml(n.number || '')}</span>
          <span class="dash-order-client">${escapeHtml(n.operator || '—')}</span>
        </div>
        <span class="dash-order-right">
          ${n.tier || n.tag === 'vip'
            ? `<span class="oc-status-badge st-yakunlandi">${escapeHtml((n.tier || 'vip').toUpperCase())}</span>`
            : ''}
          <span class="dash-order-time">${escapeHtml(dashQisqaSana(n.createdAt))}</span>
        </span>
      </div>`).join('') : '<div class="wt-empty">Hali raqam qo\'shilmagan</div>';
  }
}

const OPERATORS = ['Beeline','Ucell','Uzmobile','Mobiuz','Humans','Perfektum'];

/* Operator kodlari — raqam kiritilganda avtomatik aniqlash uchun */
const CODE_TO_OPERATOR = {
  '91':'Beeline', '90':'Beeline', '92':'Beeline',
  '33':'Humans',
  '50':'Ucell', '94':'Ucell', '93':'Ucell',
  '88':'Mobiuz', '97':'Mobiuz', '87':'Mobiuz',
  '77':'Uzmobile', '70':'Uzmobile', '95':'Uzmobile', '99':'Uzmobile',
  '98':'Perfektum', '80':'Perfektum'
};

/* Foydalanuvchi kiritgan raqamdan faqat "sof" (o'ziga xos) raqamlarni ajratib oladi,
   avvalgi "+998" prefiksini hisobga olmaydi */
function extractRawDigits(value){
  let d = value.replace(/\D/g,'');
  if(d.startsWith('998')) d = d.slice(3);
  return d.slice(0,9); // kod(2) + mahalliy(7)
}
function formatUzNumber(rawDigits){
  let out = '+998';
  if(rawDigits.length > 0) out += ' ' + rawDigits.slice(0,2);
  if(rawDigits.length > 2) out += ' ' + rawDigits.slice(2,5);
  if(rawDigits.length > 5) out += '-' + rawDigits.slice(5,7);
  if(rawDigits.length > 7) out += '-' + rawDigits.slice(7,9);
  return out;
}

/* ==================================================================
   AVTOMATIK TELEFON NIQOBI  (+998 90 123-45-67)
   ------------------------------------------------------------------
   Raqam yoziladigan HAR BIR maydonda ishlaydi: raqam qo'shish, kredit
   shartnomasi, zakaz, sotuvchi telefoni, to'lov, video va h.k.
   "+998" va chiziqchalarni foydalanuvchi emas, maydon O'ZI qo'yadi.

   NEGA DELEGATSIYA (document ustida bitta tinglovchi): maydonlarning
   ko'pi keyinroq JS orqali yasaladi yoki modal oynaga ko'chiriladi —
   har biriga alohida tinglovchi qo'shib yurish kerak emas, bitta
   joyda turadi va hamma yerda bir xil ishlaydi.

   iPhone QOTMASLIGI uchun uch qoida:
     1) qiymat faqat haqiqatan o'zgarganda qayta yoziladi —
        ortiqcha yozish yo'q;
     2) kursor maydon OXIRIDA bo'lsagina formatlanadi (o'rta joyni
        tahrirlayotganda tegilmaydi — kursor sakramaydi);
     3) o'chirish (Backspace) paytida formatlanmaydi — aks holda
        chiziqcha qaytib kelib, o'chirish "ishlamayotgandek" bo'lardi.
        Maydondan chiqqanda format baribir qo'yiladi.
   ================================================================== */
const TEL_IDLAR = ['newNumber','dayMnNumber','videoNumberInput','crPhone','crNumber',
  'zkCustWorkingPhone','zkCustOrderedPhone','tlvNumber','pbNumberInput','selPhone','hkInPhone'];
/* Katta harfga o'tadigan maydonlar: kredit shartnomasidagi mijoz ismi
   va pasport seriyasi — hujjatlarda har doim KATTA harfda yoziladi. */
const KATTA_IDLAR = ['crName','crPassport'];

function telMaydonmi(el){
  if(!el || el.tagName !== 'INPUT') return false;
  const id = el.id || '';
  if(/search|qidir/i.test(id)) return false;        // qidiruv maydoniga niqob kerak emas
  if(el.dataset && el.dataset.tel === '1') return true;
  return TEL_IDLAR.indexOf(id) !== -1;
}

function telFormatla(el, ochirish){
  const raw = extractRawDigits(el.value);
  const yangi = raw ? formatUzNumber(raw) : '';
  if(yangi === el.value) return;
  if(ochirish){
    /* Backspace: oxirida qolgan bo'shliq/chiziqcha ham o'chadi —
       o'chirish tabiiy his qilinadi. */
    const t = el.value.replace(/[\s-]+$/, '');
    if(t !== el.value){ el.value = t; try{ el.setSelectionRange(t.length, t.length); }catch(e){} }
    return;
  }
  const oxirida = el.selectionStart == null || el.selectionStart >= el.value.length;
  if(!oxirida) return;                              // kursor o'rtada — tegilmaydi
  el.value = yangi;
  try{ el.setSelectionRange(yangi.length, yangi.length); }catch(e){}
}

document.addEventListener('input', (e)=>{
  const el = e.target;
  if(telMaydonmi(el)){
    if(!el.dataset.telTayyor){
      el.dataset.telTayyor = '1';
      el.setAttribute('inputmode', 'tel');
      if(!el.placeholder || /^\s*$/.test(el.placeholder)) el.placeholder = '+998 90 123-45-67';
    }
    telFormatla(el, !!(e.inputType && e.inputType.indexOf('delete') === 0));
    return;
  }
  if(el && el.tagName === 'INPUT' && KATTA_IDLAR.indexOf(el.id) !== -1){
    /* Uzunlik o'zgarmaydi — kursor joyida qoladi. */
    const k = el.value.toUpperCase();
    if(k !== el.value){
      const a = el.selectionStart, b = el.selectionEnd;
      el.value = k;
      try{ el.setSelectionRange(a, b); }catch(e2){}
    }
  }
}, true);

/* Maydondan chiqqanda — to'liq format (o'rtasini tahrirlagan yoki
   Backspace bosgan holat ham tartibga keladi). */
document.addEventListener('blur', (e)=>{
  const el = e.target;
  if(!telMaydonmi(el)) return;
  const raw = extractRawDigits(el.value);
  const yangi = raw ? formatUzNumber(raw) : '';
  if(yangi !== el.value) el.value = yangi;
}, true);

/* BUYURTMA BOSQICHLARI (V122 da "Yo'lda" qo'shildi).
   Mijoz saytda o'z buyurtmasining qaysi bosqichda ekanini ko'radi:
       Yangi -> Bog'lanildi -> Yo'lda -> Yakunlandi
   ("Bekor qilindi" — alohida, zanjirdan tashqarida.)
   Ilgari "Bog'lanildi" dan keyin to'g'ridan-to'g'ri "Yakunlandi" edi,
   ya'ni mijoz kuryer yo'lga chiqqanini BILMASDI va "qani mening
   raqamim?" deb qo'ng'iroq qilardi. */
const ORDER_STATUSES = ["Yangi","Bog'lanildi","Yo'lda","Yakunlandi","Bekor qilindi"];

/* Buyurtmada raqam ko'rinishi. Eski Telegram bot xatosi tufayli bazada
   raqami BO'SH ("+998 00-000-00-00") buyurtmalar bo'lishi mumkin —
   ularni "yo'q raqam" deb ochiq yozamiz, aks holda admin bunday
   buyurtmani haqiqiy raqam deb o'ylardi. (Bot tomoni V72 da tuzatildi:
   endi raqamsiz buyurtma umuman yozilmaydi.) */
function buyurtmaRaqami(num){
  const d = String(num || '').replace(/\D/g, '');
  const n9 = (d.startsWith('998') ? d.slice(3) : d).slice(-9);
  if(!n9 || /^0+$/.test(n9) || n9.slice(0, 2) === '00') return '';
  return String(num);
}

function operatorOptionsHtml(selected){
  return OPERATORS.map(op => `<option value="${op}" ${op===selected?'selected':''}>${op}</option>`).join('');
}
function formatPrice(n){
  const num = Number(n);
  if(!isFinite(num)) return "0 so'm";
  return num.toLocaleString('ru-RU').replace(/,/g,' ') + " so'm";
}
/* XAVFSIZLIK: mijozlar tomonidan kiritilgan (masalan buyurtma formasidagi
   ism/telefon/manzil) matnlarni HTML sifatida emas, oddiy matn sifatida
   ko'rsatish uchun — aks holda kimdir ismiga zararli kod yozib, admin
   ochganda ishga tushirishi mumkin edi (XSS). */
function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// YANGI (mijoz so'roviga ko'ra): mijoz saytda "Toshkent shahri" uchun
// xaritada belgilagan aniq joylashuvi (o.location.lat/lng) mavjud bo'lsa,
// admin shu havolani bosib to'g'ridan-to'g'ri Yandex Go ilovasida
// marshrutni ko'radi. index.html'dagi bilan AYNAN bir xil formula
// (Yandex'ning rasmiy universal "deep link" xizmati).
function buildYandexGoLink(lat, lng){
  return `https://3.redirect.appmetrica.yandex.com/route?end-lat=${lat}&end-lon=${lng}&appmetrica_tracking_id=1178268795219780156`;
}

/* ---- Oxirgi ko'rilgan vaqt (bildirishnoma uchun) ---- */
async function loadLastSeen(){
  try{
    const doc = await db.collection('admin_meta').doc('lastSeen').get();
    if(doc.exists) lastSeenOrders = doc.data().ordersSeenAt || 0;
  }catch(e){ lastSeenOrders = 0; }
}
async function markOrdersSeen(){
  lastSeenOrders = Date.now();
  updateBellBadge();
  try{ await db.collection('admin_meta').doc('lastSeen').set({ ordersSeenAt: lastSeenOrders }); }
  catch(e){ /* internetsiz bo'lsa ham UI darhol yangilanadi */ }
}
function updateBellBadge(){
  const unread = currentOrdersCache.filter(o => (o.createdAtSort || 0) > lastSeenOrders).length;
  const badge = document.getElementById('bellBadge');
  if(unread > 0){ badge.textContent = unread > 99 ? '99+' : unread; badge.style.display = 'flex'; }
  else{ badge.style.display = 'none'; }
}

/* ==================================================================
   "ZAKAZ" — raqam toifa narxlari (kompaniya + naqsh bo'yicha to'liq
   shartlar: narx, oylik tarif, aksiya, bo'lib to'lash, nomiga o'tkazish)
   va mijozlardan kelgan maxsus so'rovlar
   ================================================================== */
attachThousandsFormat(document.getElementById('zkFullPrice'));
attachThousandsFormat(document.getElementById('zkMonthlyTariff'));
attachThousandsFormat(document.getElementById('zkSalePrice'));
attachThousandsFormat(document.getElementById('zkSaleTariff'));
attachThousandsFormat(document.getElementById('zkInstallmentMonthly'));
attachThousandsFormat(document.getElementById('zkDownPayment'));

let zkOpSelected = null;
document.querySelectorAll('.zk-op-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    zkOpSelected = btn.dataset.op;
    document.querySelectorAll('.zk-op-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});
document.getElementById('zkSaleToggle').addEventListener('click', function(){
  this.classList.toggle('active');
  document.getElementById('zkSaleFields').style.display = this.classList.contains('active') ? 'block' : 'none';
});
document.getElementById('zkInstallmentToggle').addEventListener('click', function(){
  this.classList.toggle('active');
  document.getElementById('zkInstallmentFields').style.display = this.classList.contains('active') ? 'block' : 'none';
});
document.getElementById('zkOwnershipToggle').addEventListener('click', function(){
  this.classList.toggle('active');
});

let zkEditingDocId = null;
function zkResetForm(){
  zkEditingDocId = null;
  zkOpSelected = null;
  document.querySelectorAll('.zk-op-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('zkPattern').value = '';
  document.getElementById('zkFullPrice').value = '';
  document.getElementById('zkMonthlyTariff').value = '';
  document.getElementById('zkTariffMonths').value = '';
  document.getElementById('zkSalePrice').value = '';
  document.getElementById('zkSaleTariff').value = '';
  document.getElementById('zkInstallmentMonths').value = '';
  document.getElementById('zkInstallmentMonthly').value = '';
  document.getElementById('zkDownPayment').value = '';
  document.getElementById('zkSaleToggle').classList.remove('active');
  document.getElementById('zkInstallmentToggle').classList.remove('active');
  document.getElementById('zkOwnershipToggle').classList.remove('active');
  document.getElementById('zkSaleFields').style.display = 'none';
  document.getElementById('zkInstallmentFields').style.display = 'none';
  document.getElementById('zkFormTitle').textContent = "💰 Raqam toifasi narxi (Zakaz)";
  document.getElementById('zkSaveBtn').textContent = 'Saqlash';
  document.getElementById('zkMsg').textContent = '';
  document.getElementById('zkMsg').className = 'settings-msg';
}
document.getElementById('zkResetFormBtn').addEventListener('click', zkResetForm);

document.getElementById('zkSaveBtn').addEventListener('click', async ()=>{
  const pattern = document.getElementById('zkPattern').value.trim();
  const fullPrice = parseSumInput(document.getElementById('zkFullPrice').value);
  const msg = document.getElementById('zkMsg');
  if(!zkOpSelected){
    msg.textContent = 'Kompaniyani tanlang';
    msg.className = 'settings-msg bad';
    return;
  }
  if(!/^\d{4}$/.test(pattern)){
    msg.textContent = "4 ta raqamni to'g'ri kiriting (masalan: 6666)";
    msg.className = 'settings-msg bad';
    return;
  }
  if(!fullPrice || fullPrice <= 0){
    msg.textContent = "To'liq narxni to'g'ri kiriting";
    msg.className = 'settings-msg bad';
    return;
  }
  const onSale = document.getElementById('zkSaleToggle').classList.contains('active');
  const installmentAvailable = document.getElementById('zkInstallmentToggle').classList.contains('active');
  const ownershipTransfer = document.getElementById('zkOwnershipToggle').classList.contains('active');
  const data = {
    operator: zkOpSelected,
    pattern,
    fullPrice,
    monthlyTariff: parseSumInput(document.getElementById('zkMonthlyTariff').value),
    tariffMonths: Number(document.getElementById('zkTariffMonths').value) || 0,
    onSale,
    salePrice: onSale ? parseSumInput(document.getElementById('zkSalePrice').value) : 0,
    saleMonthlyTariff: onSale ? parseSumInput(document.getElementById('zkSaleTariff').value) : 0,
    installmentAvailable,
    installmentMonths: installmentAvailable ? (Number(document.getElementById('zkInstallmentMonths').value) || 0) : 0,
    installmentMonthly: installmentAvailable ? parseSumInput(document.getElementById('zkInstallmentMonthly').value) : 0,
    downPayment: installmentAvailable ? parseSumInput(document.getElementById('zkDownPayment').value) : 0,
    ownershipTransfer,
    updatedAt: Date.now()
  };
  try{
    const docId = zkEditingDocId || `${zkOpSelected}_${pattern}`;
    await db.collection('number_price_categories').doc(docId).set(data);
    msg.textContent = `✓ "${zkOpSelected} ••${pattern}" uchun narx saqlandi`;
    msg.className = 'settings-msg ok';
    vibrate(80);
    zkResetForm();
    loadPriceCategories();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
});

function zkFillFormForEdit(id, data){
  zkEditingDocId = id;
  zkOpSelected = data.operator;
  document.querySelectorAll('.zk-op-btn').forEach(b => b.classList.toggle('active', b.dataset.op === data.operator));
  document.getElementById('zkPattern').value = data.pattern || '';
  document.getElementById('zkFullPrice').value = data.fullPrice ? data.fullPrice.toLocaleString('ru-RU').replace(/,/g,' ') : '';
  document.getElementById('zkMonthlyTariff').value = data.monthlyTariff ? data.monthlyTariff.toLocaleString('ru-RU').replace(/,/g,' ') : '';
  document.getElementById('zkTariffMonths').value = data.tariffMonths || '';
  document.getElementById('zkSaleToggle').classList.toggle('active', !!data.onSale);
  document.getElementById('zkSaleFields').style.display = data.onSale ? 'block' : 'none';
  document.getElementById('zkSalePrice').value = data.salePrice ? data.salePrice.toLocaleString('ru-RU').replace(/,/g,' ') : '';
  document.getElementById('zkSaleTariff').value = data.saleMonthlyTariff ? data.saleMonthlyTariff.toLocaleString('ru-RU').replace(/,/g,' ') : '';
  document.getElementById('zkInstallmentToggle').classList.toggle('active', !!data.installmentAvailable);
  document.getElementById('zkInstallmentFields').style.display = data.installmentAvailable ? 'block' : 'none';
  document.getElementById('zkInstallmentMonths').value = data.installmentMonths || '';
  document.getElementById('zkInstallmentMonthly').value = data.installmentMonthly ? data.installmentMonthly.toLocaleString('ru-RU').replace(/,/g,' ') : '';
  document.getElementById('zkDownPayment').value = data.downPayment ? data.downPayment.toLocaleString('ru-RU').replace(/,/g,' ') : '';
  document.getElementById('zkOwnershipToggle').classList.toggle('active', !!data.ownershipTransfer);
  document.getElementById('zkFormTitle').textContent = `✏️ Tahrirlash: ${data.operator} ••${data.pattern}`;
  document.getElementById('zkSaveBtn').textContent = 'Saqlash (yangilash)';
  document.getElementById('zkFullPrice').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadPriceCategories(){
  const listEl = document.getElementById('zkCategoryList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('number_price_categories').get();
    const catCountEl = document.getElementById('zkPriceCatCount');
    if(catCountEl) catCountEl.textContent = snap.size;
    if(snap.empty){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali hech qanday toifa narxi kiritilmagan.</div>';
      return;
    }
    const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }))
      .sort((a,b) => (a.data.operator||'').localeCompare(b.data.operator||'') || (a.data.pattern||'').localeCompare(b.data.pattern||''));
    const OP_EMOJI = { Ucell: '🟣', Humans: '🟠', Beeline: '🟡', Mobiuz: '🔴', Uzmobile: '🔵', Perfektum: '🟢' };
    listEl.innerHTML = docs.map(({ id, data })=>{
      const extras = [];
      if(data.installmentAvailable) extras.push(`💳 ${data.installmentMonths} oyga, oyiga ${formatPrice(data.installmentMonthly)}`);
      if(data.monthlyTariff) extras.push(`📶 Oylik tarif: ${formatPrice(data.monthlyTariff)}`);
      if(data.tariffMonths) extras.push(`⏳ ${data.tariffMonths} oydan keyin tarif almashtirish mumkin`);
      if(data.ownershipTransfer) extras.push(`✅ Mijoz nomiga rasmiylashtiriladi`);
      return `
        <div class="zk-cat-row" data-op="${escapeHtml(data.operator || '')}">
          <span class="zk-cat-op-badge" data-op="${escapeHtml(data.operator || '')}">${OP_EMOJI[data.operator] || '📶'} ${escapeHtml(data.operator || '')}</span>
          <span class="zk-cat-pattern">••${escapeHtml(data.pattern || id)}</span>
          <span class="zk-cat-price">${formatPrice(data.fullPrice)}</span>
          ${data.onSale ? `<span class="zk-cat-sale-badge">🔥 ${formatPrice(data.salePrice)}</span>` : ''}
          <button data-id="${escapeHtml(id)}" class="zk-edit-btn zk-del-btn" aria-label="Tahrirlash" style="color:var(--amber);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
          <button data-id="${escapeHtml(id)}" class="zk-del-btn" aria-label="O'chirish"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg></button>
          ${extras.length ? `<span class="zk-cat-extra">${extras.join(' · ')}</span>` : ''}
        </div>`;
    }).join('');
    listEl.querySelectorAll('.zk-edit-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const found = docs.find(d => d.id === btn.dataset.id);
        if(found) zkFillFormForEdit(found.id, found.data);
      });
    });
    listEl.querySelectorAll('.zk-del-btn:not(.zk-edit-btn)').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(!confirm(`"${btn.dataset.id}" narxini o'chirasizmi?`)) return;
        await db.collection('number_price_categories').doc(btn.dataset.id).delete();
        if(zkEditingDocId === btn.dataset.id) zkResetForm();
        loadPriceCategories();
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}

const ZAKAZ_STATUS_OPTIONS = ['Yangi', "Bog'lanildi", "Yo'lda", 'Yakunlandi', 'Bekor qilindi'];
const ZAKAZ_STATUS_CLASS = { 'Yangi':'opt-yangi', "Bog'lanildi":'opt-boglanildi', "Yo'lda":'opt-yolda', 'Yakunlandi':'opt-yakunlandi', 'Bekor qilindi':'opt-bekor' };

function renderZkStats(orders){
  const counts = { 'Yangi':0, "Bog'lanildi":0, "Yo'lda":0, 'Yakunlandi':0, 'Bekor qilindi':0 };
  orders.forEach(o => { if(counts[o.status] !== undefined) counts[o.status]++; });
  const ordersCountEl = document.getElementById('zkOrdersCount');
  if(ordersCountEl) ordersCountEl.textContent = orders.length;
  const statsEl = document.getElementById('zkStatsRow');
  statsEl.innerHTML = `
    <div class="zk-stat-card"><b>${orders.length}</b><span>Jami so'rov</span></div>
    <div class="zk-stat-card st-new"><b>${counts['Yangi']}</b><span>Yangi</span></div>
    <div class="zk-stat-card st-contacted"><b>${counts["Bog'lanildi"]}</b><span>Bog'lanildi</span></div>
    <div class="zk-stat-card st-yolda"><b>${counts["Yo'lda"]}</b><span>Yo'lda</span></div>
    <div class="zk-stat-card st-done"><b>${counts['Yakunlandi']}</b><span>Yakunlandi</span></div>
    <div class="zk-stat-card st-cancelled"><b>${counts['Bekor qilindi']}</b><span>Bekor qilindi</span></div>
  `;
}

async function loadCustomOrders(){
  const listEl = document.getElementById('customOrdersList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    /* MIJOZ SO'ROVI: "nechta so'rov bo'lsa hammasi ko'rsatilsin" —
       chegara 100 dan 1000 ga ko'tarildi va pastda jami son yoziladi. */
    const snap = await db.collection('custom_orders').orderBy('createdAtSort', 'desc').limit(1000).get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderZkStats(orders);

    if(orders.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali so\'rovlar yo\'q.</div>';
      return;
    }
    listEl.innerHTML = orders.map((o, i)=>{
      const badgeClass = ZAKAZ_STATUS_CLASS[o.status] || 'opt-yangi';
      return `
        <div class="zk-order-card" data-id="${o.id}" style="animation-delay:${Math.min(i * 0.03, 0.4)}s;">
          <div class="zk-order-summary" data-id="${o.id}">
            <span class="zk-order-pattern">••••${escapeHtml(o.pattern)}</span>
            <span class="zk-order-summary-name">${escapeHtml(o.name)}</span>
            <span class="zk-order-badge ${badgeClass}">${escapeHtml(o.status || 'Yangi')}</span>
            <span class="zk-order-arrow">▾</span>
          </div>
          <div class="zk-order-body">
            <div class="zk-order-top">
              <span></span>
              <span class="zk-order-time">${escapeHtml(o.createdAt || '')}</span>
            </div>
            <div class="zk-order-info">
              <span>Ism</span><span>${escapeHtml(o.name)}</span>
              <span>Viloyat</span><span>${escapeHtml(o.region)}</span>
              <span>Telefon</span><span>${escapeHtml(o.phone)}</span>
              ${o.operator ? `<span>Kompaniya</span><span>${escapeHtml(o.operator)}</span>` : ''}
              ${o.fullPrice ? `<span>Narxi</span><span>${formatPrice(o.onSale && o.salePrice ? o.salePrice : o.fullPrice)}${o.onSale && o.salePrice ? ' 🔥 aksiya' : ''}</span>` : ''}
              ${o.monthlyTariff ? `<span>Oylik tarif</span><span>${formatPrice(o.monthlyTariff)}</span>` : ''}
              ${o.installmentAvailable ? `<span>Bo'lib to'lash</span><span>${escapeHtml(o.installmentMonths)} oyga, oyiga ${formatPrice(o.installmentMonthly)}${o.downPayment ? ' (bosh to\'lov ' + formatPrice(o.downPayment) + ')' : ''}</span>` : ''}
              ${o.ownershipTransfer !== undefined ? `<span>Nomiga o'tkazish</span><span>${o.ownershipTransfer ? "✅ Mijoz nomiga" : "➖ O'tkazilmaydi"}</span>` : ''}
              ${o.tariffMonths ? `<span>Tarif muddati</span><span>${escapeHtml(o.tariffMonths)} oydan keyin almashtirish mumkin</span>` : ''}
              ${o.source ? `<span>Manba</span><span>${escapeHtml(o.source)}</span>` : ''}
            </div>
            <select class="zk-status-select ${badgeClass}" data-id="${o.id}">
              ${ZAKAZ_STATUS_OPTIONS.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <div class="vac-admin-actions zk-order-actions">
              <button type="button" class="vac-edit-btn zk-order-edit-btn" data-id="${o.id}">✏️ Tahrirlash</button>
              <button type="button" class="vac-del-btn zk-order-del-btn" data-id="${o.id}">🗑 O'chirish</button>
            </div>
            <div class="zk-order-edit-form" id="zkOrderEdit-${o.id}" style="display:none;">
              <label>Ism</label>
              <input type="text" class="zoe-name" value="${escapeHtml(o.name || '')}">
              <label>Telefon</label>
              <input type="text" class="zoe-phone" value="${escapeHtml(o.phone || '')}" inputmode="tel">
              <label>Viloyat</label>
              <input type="text" class="zoe-region" value="${escapeHtml(o.region || '')}">
              <label>Kompaniya</label>
              <select class="zoe-operator">
                <option value="">—</option>
                ${['Ucell','Humans','Beeline','Mobiuz','Uzmobile','Perfektum'].map(op => `<option value="${op}" ${o.operator === op ? 'selected' : ''}>${op}</option>`).join('')}
              </select>
              <label>To'liq narxi (so'm)</label>
              <div class="zk-sum-field"><input type="text" class="zoe-fullprice" value="${escapeHtml(o.fullPrice || '')}" inputmode="numeric"><span>so'm</span></div>
              <label class="zoe-onsale-label"><input type="checkbox" class="zoe-onsale" ${o.onSale ? 'checked' : ''}> Aksiyada</label>
              <div class="zoe-sale-wrap" style="${o.onSale ? '' : 'display:none;'}">
                <label>Aksiya narxi (so'm)</label>
                <div class="zk-sum-field"><input type="text" class="zoe-saleprice" value="${escapeHtml(o.salePrice || '')}" inputmode="numeric"><span>so'm</span></div>
              </div>
              <label>Oylik tarif (so'm) — bo'lmasa bo'sh qoldiring</label>
              <div class="zk-sum-field"><input type="text" class="zoe-monthly" value="${escapeHtml(o.monthlyTariff || '')}" inputmode="numeric"><span>so'm</span></div>
              <label>Tarif muddati (oy) — bo'lmasa bo'sh qoldiring</label>
              <input type="number" class="zoe-tariffmonths" value="${escapeHtml(o.tariffMonths || '')}">
              <div class="zk-order-edit-actions">
                <button type="button" class="zoe-save-btn" data-id="${o.id}">💾 Saqlash</button>
                <button type="button" class="zoe-cancel-btn" data-id="${o.id}">Bekor qilish</button>
              </div>
              <div class="settings-msg zoe-msg" id="zoeMsg-${o.id}"></div>
            </div>
          </div>
        </div>`;
    }).join('');
    listEl.querySelectorAll('.zk-order-summary').forEach(summary=>{
      summary.addEventListener('click', ()=>{
        summary.closest('.zk-order-card').classList.toggle('zk-open');
      });
    });
    listEl.querySelectorAll('.zk-status-select').forEach(sel=>{
      sel.addEventListener('click', (e)=> e.stopPropagation());
      sel.addEventListener('change', async (e)=>{
        e.stopPropagation();
        sel.className = 'zk-status-select ' + (ZAKAZ_STATUS_CLASS[sel.value] || 'opt-yangi');
        const card = sel.closest('.zk-order-card');
        const badge = card ? card.querySelector('.zk-order-badge') : null;
        if(badge){
          badge.className = 'zk-order-badge ' + (ZAKAZ_STATUS_CLASS[sel.value] || 'opt-yangi');
          badge.textContent = sel.value;
        }
        await db.collection('custom_orders').doc(sel.dataset.id).update({ status: sel.value });
        vibrate(60);
        renderZkStats(orders.map(o => o.id === sel.dataset.id ? { ...o, status: sel.value } : o));
        try{
          const idToken = await firebase.auth().currentUser.getIdToken();
          await fetch('/.netlify/functions/notify-custom-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ customOrderId: sel.dataset.id, status: sel.value })
          });
        }catch(e){ console.error('Mijozga xabar yuborishda xato:', e); }
      });
    });

    /* ---- Tahrirlash / O'chirish — mijoz iltimosiga ko'ra admin Zakaz
       so'rovini xohlagan vaqtida to'liq tahrirlashi yoki o'chirishi mumkin
       bo'lishi kerak (avval faqat holat — status — o'zgartirilardi). ---- */
    listEl.querySelectorAll('.zk-order-edit-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const form = document.getElementById('zkOrderEdit-' + btn.dataset.id);
        if(form) form.style.display = (form.style.display === 'none') ? 'block' : 'none';
      });
    });
    listEl.querySelectorAll('.zoe-onsale').forEach(chk=>{
      chk.addEventListener('change', ()=>{
        const wrap = chk.closest('.zk-order-edit-form').querySelector('.zoe-sale-wrap');
        if(wrap) wrap.style.display = chk.checked ? '' : 'none';
      });
    });
    listEl.querySelectorAll('.zoe-cancel-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const form = document.getElementById('zkOrderEdit-' + btn.dataset.id);
        if(form) form.style.display = 'none';
      });
    });
    listEl.querySelectorAll('.zoe-save-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const id = btn.dataset.id;
        const form = document.getElementById('zkOrderEdit-' + id);
        const msgEl = document.getElementById('zoeMsg-' + id);
        const val = sel => form.querySelector(sel);
        const patch = {
          name: val('.zoe-name').value.trim(),
          phone: val('.zoe-phone').value.trim(),
          region: val('.zoe-region').value.trim(),
          operator: val('.zoe-operator').value || null,
          fullPrice: Number(val('.zoe-fullprice').value.replace(/\D/g,'')) || 0,
          onSale: val('.zoe-onsale').checked,
          salePrice: Number(val('.zoe-saleprice').value.replace(/\D/g,'')) || 0,
          monthlyTariff: Number(val('.zoe-monthly').value.replace(/\D/g,'')) || 0,
          tariffMonths: Number(val('.zoe-tariffmonths').value) || 0
        };
        btn.disabled = true;
        if(msgEl){ msgEl.textContent = 'Saqlanmoqda...'; msgEl.className = 'settings-msg zoe-msg'; }
        try{
          await db.collection('custom_orders').doc(id).update(patch);
          vibrate(60);
          loadCustomOrders();
        }catch(err){
          if(msgEl){ msgEl.textContent = 'Xato: ' + err.message; msgEl.className = 'settings-msg zoe-msg bad'; }
          btn.disabled = false;
        }
      });
    });
    listEl.querySelectorAll('.zk-order-del-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        if(!confirm("Ushbu Zakaz so'rovini butunlay o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.")) return;
        const id = btn.dataset.id;
        const card = btn.closest('.zk-order-card');
        btn.disabled = true;
        try{
          await db.collection('custom_orders').doc(id).delete();
          vibrate(60);
          if(card){
            card.style.transition = 'opacity .2s ease, transform .2s ease';
            card.style.opacity = '0';
            card.style.transform = 'translateX(-8px)';
            setTimeout(()=>{ card.remove(); }, 200);
          }
          renderZkStats(orders.filter(o => o.id !== id));
        }catch(err){ alert('Xato: ' + err.message); btn.disabled = false; }
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}

/* ================= "Vakansiya" bo'limi (admin) =================
   `vacancies` — saytdagi "Vakansiya" bo'limida ko'rinadigan ochiq ish
   o'rinlari (title, description, salaryMin/Max, active, order). `active`
   maydoni to'g'ridan-to'g'ri mijoz saytidagi ko'rinishni boshqaradi.
   `job_applications` — arizachilardan kelgan murojaatlar, "Zakaz"
   bo'limidagi so'rovlar ro'yxati bilan bir xil "zk-order-card"
   uslubida ko'rsatiladi. */
let vacEditingId = null; // hozir tahrirlanayotgan vakansiya ID (null = yangi qo'shish)

function vacAdminResetForm(){
  vacEditingId = null;
  document.getElementById('vacAdminFormTitle').textContent = "➕ Yangi vakansiya qo'shish";
  document.getElementById('vacAdminTitle').value = '';
  document.getElementById('vacAdminDesc').value = '';
  document.getElementById('vacAdminSalaryMin').value = '';
  document.getElementById('vacAdminSalaryMax').value = '';
  document.getElementById('vacAdminActive').checked = true;
  document.getElementById('vacAdminCancelBtn').style.display = 'none';
  document.getElementById('vacAdminSaveMsg').textContent = '';
}

async function loadVacancyAdminList(){
  const listEl = document.getElementById('vacAdminList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('vacancies').get();
    const vacancies = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));

    if(vacancies.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali vakansiya qo\'shilmagan.</div>';
      return;
    }

    listEl.innerHTML = vacancies.map((v, i) => {
      const badgeClass = v.active ? 'opt-yakunlandi' : 'vac-inactive-badge';
      const badgeText = v.active ? 'Faol' : 'Nofaol';
      return `
        <div class="zk-order-card" data-id="${v.id}" style="animation-delay:${Math.min(i * 0.03, 0.4)}s;">
          <div class="zk-order-summary" data-id="${v.id}">
            <span class="zk-order-summary-name">${escapeHtml(v.title || '')}</span>
            <span class="zk-order-badge ${badgeClass}">${badgeText}</span>
            <span class="zk-order-arrow">▾</span>
          </div>
          <div class="zk-order-body">
            <div class="zk-order-info">
              <span>Oylik</span><span>${formatPrice(v.salaryMin || 0)} – ${formatPrice(v.salaryMax || 0)}</span>
            </div>
            <div class="vac-card-desc-admin">${escapeHtml(v.description || '')}</div>
            <div class="vac-admin-actions">
              <button type="button" class="vac-edit-btn" data-id="${v.id}">✏️ Tahrirlash</button>
              <button type="button" class="vac-toggle-btn" data-id="${v.id}" data-active="${v.active ? '1' : '0'}">${v.active ? '🚫 Nofaol qilish' : '✅ Faollashtirish'}</button>
              <button type="button" class="vac-del-btn" data-id="${v.id}">🗑 O'chirish</button>
            </div>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.zk-order-summary').forEach(summary=>{
      summary.addEventListener('click', ()=>{
        summary.closest('.zk-order-card').classList.toggle('zk-open');
      });
    });

    listEl.querySelectorAll('.vac-edit-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        const v = vacancies.find(x => x.id === btn.dataset.id);
        if(!v) return;
        vacEditingId = v.id;
        document.getElementById('vacAdminFormTitle').textContent = '✏️ Vakansiyani tahrirlash';
        document.getElementById('vacAdminTitle').value = v.title || '';
        document.getElementById('vacAdminDesc').value = v.description || '';
        document.getElementById('vacAdminSalaryMin').value = v.salaryMin || '';
        document.getElementById('vacAdminSalaryMax').value = v.salaryMax || '';
        document.getElementById('vacAdminActive').checked = !!v.active;
        document.getElementById('vacAdminCancelBtn').style.display = 'block';
        document.getElementById('vacAdminForm').scrollIntoView({ behavior:'smooth', block:'start' });
      });
    });

    listEl.querySelectorAll('.vac-toggle-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const nextActive = btn.dataset.active !== '1';
        try{
          await db.collection('vacancies').doc(btn.dataset.id).update({ active: nextActive });
          vibrate(60);
          loadVacancyAdminList();
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });

    listEl.querySelectorAll('.vac-del-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        if(!confirm("Bu vakansiyani o'chirishni tasdiqlaysizmi?")) return;
        try{
          await db.collection('vacancies').doc(btn.dataset.id).delete();
          if(vacEditingId === btn.dataset.id) vacAdminResetForm();
          loadVacancyAdminList();
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}

document.getElementById('vacAdminSaveBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('vacAdminSaveMsg');
  const title = document.getElementById('vacAdminTitle').value.trim();
  const description = document.getElementById('vacAdminDesc').value.trim();
  const salaryMin = Number(document.getElementById('vacAdminSalaryMin').value) || 0;
  const salaryMax = Number(document.getElementById('vacAdminSalaryMax').value) || 0;
  const active = document.getElementById('vacAdminActive').checked;

  if(!title || !description){
    msg.textContent = "Lavozim nomi va vazifalar/talablarni to'ldiring";
    msg.className = 'ig-save-msg';
    msg.style.color = 'var(--red)';
    return;
  }

  const btn = document.getElementById('vacAdminSaveBtn');
  btn.disabled = true;
  msg.style.color = '';
  msg.textContent = 'Saqlanmoqda...';
  try{
    if(vacEditingId){
      await db.collection('vacancies').doc(vacEditingId).update({ title, description, salaryMin, salaryMax, active });
      msg.textContent = '✓ Vakansiya yangilandi';
    }else{
      await db.collection('vacancies').add({
        title, description, salaryMin, salaryMax, active,
        order: Date.now(),
        createdAt: Date.now()
      });
      msg.textContent = '✓ Vakansiya qo\'shildi';
    }
    vibrate(60);
    vacAdminResetForm();
    loadVacancyAdminList();
  }catch(err){
    msg.style.color = 'var(--red)';
    msg.textContent = 'Xato: ' + err.message;
  }
  btn.disabled = false;
});
document.getElementById('vacAdminCancelBtn').addEventListener('click', vacAdminResetForm);

const VAC_APP_STATUS_OPTIONS = ['new', 'reviewing', 'accepted', 'rejected'];
const VAC_APP_STATUS_LABELS = { new: 'Yangi', reviewing: "Ko'rib chiqilmoqda", accepted: 'Qabul qilindi', rejected: 'Rad etildi' };
const VAC_APP_STATUS_CLASS = { new: 'opt-yangi', reviewing: 'opt-boglanildi', accepted: 'opt-yakunlandi', rejected: 'opt-bekor' };

async function loadJobApplications(){
  const listEl = document.getElementById('vacAppList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('job_applications').orderBy('createdAt', 'desc').limit(200).get();
    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('vacAppCount').textContent = apps.length;

    const newCount = apps.filter(a => (a.status || 'new') === 'new').length;
    const badge = document.getElementById('vacTabBadge');
    if(badge){
      badge.style.display = newCount > 0 ? 'inline-flex' : 'none';
      badge.textContent = newCount;
    }

    if(apps.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali ariza kelmagan.</div>';
      return;
    }

    listEl.innerHTML = apps.map((a, i) => {
      const status = a.status || 'new';
      const badgeClass = VAC_APP_STATUS_CLASS[status] || 'opt-yangi';
      const dateStr = a.createdAt && a.createdAt.toDate ? sanaVaqtUz(a.createdAt.toDate()) : '';
      return `
        <div class="zk-order-card" data-id="${a.id}" style="animation-delay:${Math.min(i * 0.03, 0.4)}s;">
          <div class="zk-order-summary" data-id="${a.id}">
            <span class="zk-order-summary-name">${escapeHtml(a.fullName || '')}</span>
            <span class="zk-order-badge ${badgeClass}">${escapeHtml(VAC_APP_STATUS_LABELS[status] || status)}</span>
            <span class="zk-order-arrow">▾</span>
          </div>
          <div class="zk-order-body">
            <div class="zk-order-top">
              <span></span>
              <span class="zk-order-time">${escapeHtml(dateStr)}</span>
            </div>
            <div class="zk-order-info">
              <span>Lavozim</span><span>${escapeHtml(a.vacancyTitle || '')}</span>
              <span>Telefon</span><span>${escapeHtml(a.phone || '')}</span>
              ${a.experience ? `<span>Tajriba</span><span>${escapeHtml(a.experience)}</span>` : ''}
            </div>
            <select class="zk-status-select ${badgeClass}" data-id="${a.id}">
              ${VAC_APP_STATUS_OPTIONS.map(s => `<option value="${s}" ${status === s ? 'selected' : ''}>${VAC_APP_STATUS_LABELS[s]}</option>`).join('')}
            </select>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.zk-order-summary').forEach(summary=>{
      summary.addEventListener('click', ()=>{
        summary.closest('.zk-order-card').classList.toggle('zk-open');
      });
    });
    listEl.querySelectorAll('.zk-status-select').forEach(sel=>{
      sel.addEventListener('click', (e)=> e.stopPropagation());
      sel.addEventListener('change', async (e)=>{
        e.stopPropagation();
        sel.className = 'zk-status-select ' + (VAC_APP_STATUS_CLASS[sel.value] || 'opt-yangi');
        const card = sel.closest('.zk-order-card');
        const badge = card ? card.querySelector('.zk-order-badge') : null;
        if(badge){
          badge.className = 'zk-order-badge ' + (VAC_APP_STATUS_CLASS[sel.value] || 'opt-yangi');
          badge.textContent = VAC_APP_STATUS_LABELS[sel.value] || sel.value;
        }
        await db.collection('job_applications').doc(sel.dataset.id).update({ status: sel.value });
        vibrate(60);
        loadJobApplications();
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}

/* ---- Zamonaviy chiziqli (line) ikonkalar — "Mijozlar bazasi" va
   "Shaxsiy baza" bo'limlarida emoji o'rniga ishlatiladi (sayt bo'ylab
   tab-ikonkalar bilan bir xil uslub: stroke="currentColor"). ---- */
const ICONS = {
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3h2.7l1.3 4-2 1.3a12 12 0 0 0 6.2 6.2l1.3-2 4 1.3v2.7a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
  xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
  trendUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 6h6v6"/></svg>',
  trendDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 3H5a2 2 0 0 0-2 2v7.6a2 2 0 0 0 .6 1.4l8.9 8.9a2 2 0 0 0 2.8 0l6.5-6.5a2 2 0 0 0 0-2.8l-8.9-8.9A2 2 0 0 0 12.6 3z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.6 6.1.5-4.6 4.1 1.4 6-5.4-3.3-5.4 3.3 1.4-6-4.6-4.1 6.1-.5L12 3z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2.5 3h2.2l2.2 12.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21 7.5H6"/></svg>',
  creditCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 14.5h4"/></svg>',
  alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 22 20.5H2L12 3.5z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.3" r="0.9" fill="currentColor" stroke="none"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></svg>',
  barChart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>',
  listCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.3 1.3L6.5 5"/><path d="m3 12 1.3 1.3 2.2-2.3"/><path d="m3 18 1.3 1.3 2.2-2.3"/></svg>'
};

/* O'zbekiston raqamlarini avtomatik "+998 90 123-45-67" ko'rinishiga
   keltiradi — mijoz/raqam qo'shish formalaridagi telefon maydonlariga
   ulanadi, shu bilan admin qo'lda "+998" va chiziqchalarni yozib
   o'tirishi shart emas. */
function attachUzPhoneAutoFormat(el){
  if(!el) return;
  el.setAttribute('inputmode', 'tel');
  el.setAttribute('autocomplete', 'off');
  el.setAttribute('autocorrect', 'off');
  el.setAttribute('spellcheck', 'false');

  /* MUHIM: yozayotganda `el.value` ga UMUMAN TEGILMAYDI.
     Aynan shu — iPhone'dagi "qotib qolish"ning sababi: har bir
     harfda qiymat qayta yozilsa, iOS kursorni ko'chiradi va
     klaviatura ustidagi bashorat paneli bilan sinxronlash
     kechikadi. (Avval buni requestAnimationFrame bilan
     yumshatishga urinilgan edi — yetarli bo'lmadi.)
     Endi "Vazifa qo'shish" maydonidagi kabi: yozish butunlay
     erkin, format esa maydondan CHIQQANDA bir marta qo'yiladi. */
  el.addEventListener('blur', ()=>{
    let digits = String(el.value || '').replace(/\D/g, '');
    if(digits.startsWith('998')) digits = digits.slice(3);
    digits = digits.slice(0, 9);
    if(!digits){ el.value = ''; return; }
    let out = '+998';
    out += ' ' + digits.slice(0, 2);
    if(digits.length > 2) out += ' ' + digits.slice(2, 5);
    if(digits.length > 5) out += '-' + digits.slice(5, 7);
    if(digits.length > 7) out += '-' + digits.slice(7, 9);
    el.value = out;
  });
}

/* Katta summalarni ("500000" -> "500 000") o'qish oson bo'lishi uchun
   avtomatik bo'shliq bilan ajratadi — Shaxsiy baza narx maydonlariga
   ulanadi. Haqiqiy sonni olish uchun vzParseSum() ishlatiladi. */
function attachThousandsFormat(el){
  if(!el) return;
  el.setAttribute('inputmode', 'numeric');
  /* Yozayotganda tegilmaydi (attachUzPhoneAutoFormat izohiga qarang) —
     bo'shliqlar maydondan chiqqanda qo'yiladi. */
  el.addEventListener('blur', ()=>{
    const digits = String(el.value || '').replace(/\D/g, '');
    el.value = digits ? Number(digits).toLocaleString('ru-RU').replace(/,/g, ' ') : '';
  });
}
function parseSumInput(val){
  return Number(String(val || '').replace(/\D/g, '')) || 0;
}

/* ---- "Mijoz qo'shish" / "Mijozlarni ko'rish" — Zakaz bo'limi ----
   Bu yerda admin qo'lda mijoz qo'shadi (ism, ishlab turgan raqami,
   zakaz qilgan raqami). Barcha qo'shilgan mijozlar 'manual_customers'
   Firestore kolleksiyasida saqlanadi. */
attachUzPhoneAutoFormat(document.getElementById('zkCustWorkingPhone'));
attachUzPhoneAutoFormat(document.getElementById('zkCustOrderedPhone'));
attachUzPhoneAutoFormat(document.getElementById('pbNumberInput'));
attachThousandsFormat(document.getElementById('pbMonthlyInput'));
attachThousandsFormat(document.getElementById('pbCashInput'));

async function loadManualCustomersCount(){
  const countEl = document.getElementById('zkCustomerCount');
  try{
    const snap = await db.collection('manual_customers').get();
    if(countEl) countEl.textContent = snap.size;
  }catch(e){ /* xato bo'lsa ham interfeys ishlashda davom etadi */ }
}

// Kartochka bosilganda YANGI OYNA OCHILMAYDI — shu bo'limning o'zida
// (joyida) tegishli panel ochiladi, ikkala kartochka vaqtincha
// yashiriladi; "orqaga" strelkasi bosilsa kartochkalar qaytadi.
function openAddCustomerModal(){
  document.getElementById('zkCustCardsRow').style.display = 'none';
  document.getElementById('zkViewCustomersPanel').classList.remove('open');
  document.getElementById('zkCustName').value = '';
  document.getElementById('zkCustWorkingPhone').value = '';
  document.getElementById('zkCustOrderedPhone').value = '';
  document.getElementById('zkCustAddMsg').textContent = '';
  document.getElementById('zkCustAddMsg').className = 'settings-msg';
  document.getElementById('zkCustSuccess').classList.remove('show');
  document.getElementById('zkAddCustomerFormWrap').style.display = '';
  document.getElementById('zkAddCustomerPanel').classList.add('open');
}
function closeAddCustomerModal(){
  document.getElementById('zkAddCustomerPanel').classList.remove('open');
  document.getElementById('zkCustCardsRow').style.display = '';
}
document.getElementById('zkAddCustomerCard').addEventListener('click', openAddCustomerModal);
document.getElementById('zkAddCustomerBack').addEventListener('click', closeAddCustomerModal);

document.getElementById('zkCustAddBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('zkCustName').value.trim();
  const workingPhone = document.getElementById('zkCustWorkingPhone').value.trim();
  const orderedPhone = document.getElementById('zkCustOrderedPhone').value.trim();
  const msgEl = document.getElementById('zkCustAddMsg');
  if(!name || !workingPhone || !orderedPhone){
    msgEl.textContent = 'Barcha maydonlarni to\'ldiring';
    msgEl.className = 'settings-msg bad';
    return;
  }
  const btn = document.getElementById('zkCustAddBtn');
  btn.disabled = true;
  msgEl.textContent = '';
  msgEl.className = 'settings-msg';
  try{
    await db.collection('manual_customers').add({
      name, workingPhone, orderedPhone,
      createdAt: sanaVaqtUz(new Date()),
      createdAtSort: Date.now()
    });
    // Muvaffaqiyatli qo'shilgandan keyin — zamonaviy animatsiya bilan xabar
    document.getElementById('zkAddCustomerFormWrap').style.display = 'none';
    document.getElementById('zkCustSuccess').classList.add('show');
    vibrate(60);
    loadManualCustomersCount();
    setTimeout(()=>{ closeAddCustomerModal(); }, 1400);
  }catch(err){
    msgEl.textContent = 'Xato: ' + err.message;
    msgEl.className = 'settings-msg bad';
  }finally{
    btn.disabled = false;
  }
});

async function loadManualCustomersList(){
  const listEl = document.getElementById('zkCustomersList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('manual_customers').orderBy('createdAtSort', 'desc').get();
    const customers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('zkViewCustomerCount').textContent = customers.length;
    if(customers.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali mijoz qo\'shilmagan.</div>';
      return;
    }
    listEl.innerHTML = customers.map((c, i)=>{
      const statusClass = c.status === 'Yakunlandi' ? 'status-done' : (c.status === 'Bekor qilindi' ? 'status-cancelled' : '');
      const badgeHtml = c.status ? `<span class="zk-customer-status-badge ${statusClass}">${escapeHtml(c.status)}</span>` : '';
      return `
      <div class="zk-customer-row ${statusClass}" data-id="${c.id}" style="animation-delay:${Math.min(i * 0.03, 0.4)}s;">
        <div class="zk-customer-summary" data-id="${c.id}">
          <span class="zk-customer-summary-ico">${ICONS.phone}</span>
          <span class="zk-customer-ordered-phone">${escapeHtml(c.orderedPhone || '')}</span>
          ${badgeHtml}
          <span class="zk-customer-arrow">▾</span>
        </div>
        <div class="zk-customer-body">
          <div class="zk-customer-info">
            <span>Ism</span><span>${escapeHtml(c.name || '')}</span>
            <span>Ishlab turgan raqami</span><span>${escapeHtml(c.workingPhone || '')}</span>
            <span>Zakaz qilgan raqami</span><span>${escapeHtml(c.orderedPhone || '')}</span>
            <span>Qo'shilgan sana</span><span>${escapeHtml(c.createdAt || '')}</span>
          </div>
          <div class="zk-customer-actions">
            <button type="button" class="zk-cust-action-btn done-btn ${c.status === 'Yakunlandi' ? 'active-status' : ''}" data-action="done" data-id="${c.id}">${ICONS.check} Yakunlandi</button>
            <button type="button" class="zk-cust-action-btn cancel-btn ${c.status === 'Bekor qilindi' ? 'active-status' : ''}" data-action="cancel" data-id="${c.id}">${ICONS.xCircle} Bekor qilindi</button>
            <button type="button" class="zk-cust-action-btn delete-btn" data-action="delete" data-id="${c.id}">${ICONS.trash}</button>
          </div>
        </div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('.zk-customer-summary').forEach(summary=>{
      summary.addEventListener('click', ()=>{
        summary.closest('.zk-customer-row').classList.toggle('zk-open');
      });
    });
    listEl.querySelectorAll('.zk-cust-action-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const row = btn.closest('.zk-customer-row');
        if(action === 'delete'){
          if(!confirm('Ushbu mijozni bazadan butunlay o\'chirishni tasdiqlaysizmi?')) return;
          try{
            await db.collection('manual_customers').doc(id).delete();
            row.style.transition = 'opacity .2s ease, transform .2s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(-8px)';
            setTimeout(()=>{ row.remove(); }, 200);
            vibrate(60);
            loadManualCustomersCount();
            const countEl = document.getElementById('zkViewCustomerCount');
            if(countEl) countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
          }catch(err){ alert('Xato: ' + err.message); }
          return;
        }
        const newStatus = action === 'done' ? 'Yakunlandi' : 'Bekor qilindi';
        try{
          await db.collection('manual_customers').doc(id).update({ status: newStatus });
          const newClass = newStatus === 'Yakunlandi' ? 'status-done' : 'status-cancelled';
          row.classList.remove('status-done', 'status-cancelled');
          row.classList.add(newClass);
          row.querySelectorAll('.zk-cust-action-btn').forEach(b => b.classList.remove('active-status'));
          btn.classList.add('active-status');
          let badge = row.querySelector('.zk-customer-status-badge');
          if(!badge){
            badge = document.createElement('span');
            badge.className = 'zk-customer-status-badge';
            row.querySelector('.zk-customer-arrow').insertAdjacentElement('beforebegin', badge);
          }
          badge.className = 'zk-customer-status-badge ' + newClass;
          badge.textContent = newStatus;
          vibrate(60);
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}
document.getElementById('zkViewCustomersCard').addEventListener('click', ()=>{
  document.getElementById('zkCustCardsRow').style.display = 'none';
  document.getElementById('zkAddCustomerPanel').classList.remove('open');
  document.getElementById('zkViewCustomersPanel').classList.add('open');
  loadManualCustomersList();
});
document.getElementById('zkViewCustomersBack').addEventListener('click', ()=>{
  document.getElementById('zkViewCustomersPanel').classList.remove('open');
  document.getElementById('zkCustCardsRow').style.display = '';
});

// "Narx qo'shish" va "Buyurtmalar" — xuddi shu naqsh: kartochka bosilsa
// shu bo'limning o'zida (joyida) tegishli panel ochiladi, kartochkalar
// qatori vaqtincha yashiriladi.
document.getElementById('zkOpenPriceCard').addEventListener('click', ()=>{
  document.getElementById('zkCustCardsRow').style.display = 'none';
  document.getElementById('zkOrdersPanel').classList.remove('open');
  document.getElementById('zkPricePanel').classList.add('open');
  loadPriceCategories();
});
document.getElementById('zkPriceBack').addEventListener('click', ()=>{
  document.getElementById('zkPricePanel').classList.remove('open');
  document.getElementById('zkCustCardsRow').style.display = '';
});
document.getElementById('zkOpenOrdersCard').addEventListener('click', ()=>{
  document.getElementById('zkCustCardsRow').style.display = 'none';
  document.getElementById('zkPricePanel').classList.remove('open');
  document.getElementById('zkOrdersPanel').classList.add('open');
  loadCustomOrders();
});
document.getElementById('zkOrdersBack').addEventListener('click', ()=>{
  document.getElementById('zkOrdersPanel').classList.remove('open');
  document.getElementById('zkCustCardsRow').style.display = '';
});

/* ---- "Shaxsiy baza" bo'limi ----
   Admin o'z qo'lidagi raqamlarini va narxlarini shu yerga kiritadi.
   'personal_numbers' Firestore kolleksiyasida saqlanadi. Agar shu
   bazadagi raqam "Kredit" bo'limida yangi shartnoma sifatida
   qo'shilsa (netlify/functions/admin-credit.js -> addContract), server
   avtomatik shu yerdagi holatni "yopiq" ga o'zgartiradi. */
const PB_MONTHLY_GOAL = 10;

async function loadPersonalBaseStats(){
  const statsEl = document.getElementById('pbStatsRow');
  if(!statsEl) return;
  statsEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('personal_numbers').get();
    const numbers = snap.docs.map(d => d.data());
    const now = new Date();
    const isThisMonth = (ts) => {
      if(!ts) return false;
      const d = new Date(ts);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };
    const addedThisMonth = numbers.filter(n => isThisMonth(n.createdAtSort)).length;
    const soldThisMonth = numbers.filter(n => n.status === 'yopiq' && isThisMonth(n.closedAt)).length;

    const addedGood = addedThisMonth >= PB_MONTHLY_GOAL;
    const soldGood = soldThisMonth >= PB_MONTHLY_GOAL;

    statsEl.innerHTML = `
      <div class="pb-stat-card">
        <div class="pb-stat-ico">${ICONS.database}</div>
        <b>${numbers.length}</b>
        <span class="pb-stat-label">Jami raqamlar</span>
      </div>
      <div class="pb-stat-card ${addedGood ? 'good' : 'bad'}">
        <div class="pb-stat-ico">${addedGood ? ICONS.trendUp : ICONS.trendDown}</div>
        <b>${addedThisMonth}</b>
        <span class="pb-stat-label">Shu oy qo'shilgan</span>
        <span class="pb-stat-trend">${addedGood ? "A'lo, 10 tadan oshdi!" : 'Hali 10 tadan kam'}</span>
      </div>
      <div class="pb-stat-card ${soldGood ? 'good' : 'bad'}">
        <div class="pb-stat-ico">${ICONS.tag}</div>
        <b>${soldThisMonth}</b>
        <span class="pb-stat-label">Shu oy sotilgan</span>
        <span class="pb-stat-trend">${soldGood ? "Zo'r natija!" : 'Hali yomon'}</span>
      </div>
    `;
  }catch(err){
    statsEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}

async function loadPersonalNumbersCount(){
  const countEl = document.getElementById('pbNumberCount');
  try{
    const snap = await db.collection('personal_numbers').get();
    if(countEl) countEl.textContent = snap.size;
  }catch(e){ /* xato bo'lsa ham interfeys ishlashda davom etadi */ }
}

let pbEditingId = null;
let pbReturnToList = false;

function openAddNumberModal(editDoc){
  pbEditingId = editDoc ? editDoc.id : null;
  if(!editDoc) pbReturnToList = false;
  document.getElementById('pbCustCardsRow').style.display = 'none';
  document.getElementById('pbViewNumbersPanel').classList.remove('open');
  document.getElementById('pbAddNumberTitle').textContent = editDoc ? "Raqamni tahrirlash" : "Raqam qo'shish";
  document.getElementById('pbAddNumberBtn').textContent = editDoc ? 'Saqlash' : "+ Qo'shish";
  document.getElementById('pbNumberInput').value = editDoc ? (editDoc.number || '') : '';
  document.getElementById('pbMonthlyInput').value = editDoc && editDoc.monthlyPayment ? editDoc.monthlyPayment.toLocaleString('ru-RU').replace(/,/g, ' ') : '';
  document.getElementById('pbCashInput').value = editDoc && editDoc.cashPrice ? editDoc.cashPrice.toLocaleString('ru-RU').replace(/,/g, ' ') : '';
  document.getElementById('pbAddNumberMsg').textContent = '';
  document.getElementById('pbAddNumberMsg').className = 'settings-msg';
  document.getElementById('pbAddNumberSuccess').classList.remove('show');
  document.getElementById('pbAddNumberFormWrap').style.display = '';
  document.getElementById('pbAddNumberPanel').classList.add('open');
}
function closeAddNumberModal(){
  document.getElementById('pbAddNumberPanel').classList.remove('open');
  pbEditingId = null;
  if(pbReturnToList){
    pbReturnToList = false;
    document.getElementById('pbViewNumbersPanel').classList.add('open');
    loadPersonalNumbersList();
  }else{
    document.getElementById('pbCustCardsRow').style.display = '';
  }
}
document.getElementById('pbAddNumberCard').addEventListener('click', ()=> openAddNumberModal(null));
document.getElementById('pbAddNumberBack').addEventListener('click', closeAddNumberModal);

document.getElementById('pbAddNumberBtn').addEventListener('click', async ()=>{
  const number = document.getElementById('pbNumberInput').value.trim();
  const monthlyPayment = parseSumInput(document.getElementById('pbMonthlyInput').value);
  const cashPrice = parseSumInput(document.getElementById('pbCashInput').value);
  const msgEl = document.getElementById('pbAddNumberMsg');
  if(!number || monthlyPayment <= 0 || cashPrice <= 0){
    msgEl.textContent = "Barcha maydonlarni to'g'ri to'ldiring";
    msgEl.className = 'settings-msg bad';
    return;
  }
  const btn = document.getElementById('pbAddNumberBtn');
  btn.disabled = true;
  msgEl.textContent = '';
  msgEl.className = 'settings-msg';
  try{
    if(pbEditingId){
      await db.collection('personal_numbers').doc(pbEditingId).update({ number, monthlyPayment, cashPrice });
      closeAddNumberModal();
      loadPersonalBaseStats();
    }else{
      await db.collection('personal_numbers').add({
        number, monthlyPayment, cashPrice, status: 'ochiq',
        createdAt: sanaVaqtUz(new Date()),
        createdAtSort: Date.now()
      });
      document.getElementById('pbAddNumberFormWrap').style.display = 'none';
      document.getElementById('pbAddNumberSuccess').classList.add('show');
      vibrate(60);
      loadPersonalNumbersCount();
      loadPersonalBaseStats();
      setTimeout(()=>{ closeAddNumberModal(); }, 1400);
    }
  }catch(err){
    msgEl.textContent = 'Xato: ' + err.message;
    msgEl.className = 'settings-msg bad';
  }finally{
    btn.disabled = false;
  }
});

async function loadPersonalNumbersList(){
  const listEl = document.getElementById('pbNumbersList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('personal_numbers').orderBy('createdAtSort', 'desc').get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    document.getElementById('pbViewNumberCount').textContent = items.length;
    if(items.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali raqam qo\'shilmagan.</div>';
      return;
    }
    listEl.innerHTML = items.map((n, i)=>{
      const isClosed = n.status === 'yopiq';
      const statusClass = isClosed ? 'status-cancelled' : 'status-open';
      const statusLabel = isClosed ? 'Yopiq' : 'Ochiq';
      return `
      <div class="zk-customer-row ${statusClass}" data-id="${n.id}" style="animation-delay:${Math.min(i * 0.03, 0.4)}s;">
        <div class="zk-customer-summary" data-id="${n.id}">
          <span class="zk-customer-summary-ico">${ICONS.phone}</span>
          <span class="zk-customer-ordered-phone">${escapeHtml(n.number || '')}</span>
          <span class="zk-customer-status-badge ${statusClass}">${statusLabel}</span>
          <span class="zk-customer-arrow">▾</span>
        </div>
        <div class="zk-customer-body">
          <div class="zk-customer-info">
            <span>Raqam</span><span>${escapeHtml(n.number || '')}</span>
            <span>24 oyga oylik to'lov</span><span>${Number(n.monthlyPayment || 0).toLocaleString('ru-RU')} so'm</span>
            <span>Naxt summasi</span><span>${Number(n.cashPrice || 0).toLocaleString('ru-RU')} so'm</span>
            <span>Holat</span><span>${statusLabel}${n.linkedContractId ? ' (Shartnoma: ' + escapeHtml(n.linkedContractId) + ')' : ''}</span>
            <span>Qo'shilgan sana</span><span>${escapeHtml(n.createdAt || '')}</span>
          </div>
          <div class="zk-customer-actions">
            <button type="button" class="zk-cust-action-btn toggle-btn" data-action="toggle" data-id="${n.id}">${isClosed ? ICONS.unlock + ' Ochish' : ICONS.lock + ' Yopish'}</button>
            <button type="button" class="zk-cust-action-btn edit-btn" data-action="edit" data-id="${n.id}">${ICONS.pencil} Tahrirlash</button>
            <button type="button" class="zk-cust-action-btn delete-btn" data-action="delete" data-id="${n.id}">${ICONS.trash}</button>
          </div>
        </div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('.zk-customer-summary').forEach(summary=>{
      summary.addEventListener('click', ()=>{
        summary.closest('.zk-customer-row').classList.toggle('zk-open');
      });
    });
    listEl.querySelectorAll('.zk-cust-action-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const row = btn.closest('.zk-customer-row');
        const item = items.find(x => x.id === id);
        if(action === 'delete'){
          if(!confirm("Ushbu raqamni shaxsiy bazadan butunlay o'chirishni tasdiqlaysizmi?")) return;
          try{
            await db.collection('personal_numbers').doc(id).delete();
            row.style.transition = 'opacity .2s ease, transform .2s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(-8px)';
            setTimeout(()=>{ row.remove(); }, 200);
            vibrate(60);
            loadPersonalNumbersCount();
            loadPersonalBaseStats();
            const countEl = document.getElementById('pbViewNumberCount');
            if(countEl) countEl.textContent = Math.max(0, Number(countEl.textContent) - 1);
          }catch(err){ alert('Xato: ' + err.message); }
          return;
        }
        if(action === 'edit'){
          if(item){ pbReturnToList = true; openAddNumberModal(item); }
          return;
        }
        if(action === 'toggle'){
          const nowClosed = item.status !== 'yopiq';
          try{
            await db.collection('personal_numbers').doc(id).update({
              status: nowClosed ? 'yopiq' : 'ochiq',
              closedAt: nowClosed ? Date.now() : firebase.firestore.FieldValue.delete()
            });
            item.status = nowClosed ? 'yopiq' : 'ochiq';
            row.classList.remove('status-open', 'status-cancelled');
            row.classList.add(nowClosed ? 'status-cancelled' : 'status-open');
            const badge = row.querySelector('.zk-customer-status-badge');
            if(badge){
              badge.className = 'zk-customer-status-badge ' + (nowClosed ? 'status-cancelled' : 'status-open');
              badge.textContent = nowClosed ? 'Yopiq' : 'Ochiq';
            }
            btn.innerHTML = nowClosed ? ICONS.unlock + ' Ochish' : ICONS.lock + ' Yopish';
            vibrate(60);
            loadPersonalBaseStats();
          }catch(err){ alert('Xato: ' + err.message); }
        }
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}
document.getElementById('pbViewNumbersCard').addEventListener('click', ()=>{
  document.getElementById('pbCustCardsRow').style.display = 'none';
  document.getElementById('pbAddNumberPanel').classList.remove('open');
  document.getElementById('pbViewNumbersPanel').classList.add('open');
  loadPersonalNumbersList();
});
document.getElementById('pbViewNumbersBack').addEventListener('click', ()=>{
  document.getElementById('pbViewNumbersPanel').classList.remove('open');
  document.getElementById('pbCustCardsRow').style.display = '';
});

/* ---- "Vazifalar" bo'limi ----
   Adminning shaxsiy ish/dedlayn ro'yxati — 'admin_tasks' Firestore
   kolleksiyasida saqlanadi. Har bir vazifa: matn, muddati (dueAt, ms),
   "muhim" belgisi, bajarilgan holati. Muhim vazifalar ro'yxat boshida
   turadi, qolganlari muddatiga qarab (yaqinrog'i birinchi) tartiblanadi.
   Muddatga 5 soatdan kam qolganda: (1) shu sahifada (qaysi bo'limda
   turgan bo'lsangiz ham) qo'ng'iroqcha va ovozli/vizual ogohlantirish
   chiqadi, (2) netlify/functions/admin-tasks-check-background.js orqali
   Telegram'ga ham bir marta xabar yuboriladi (panel yopiq bo'lsa ham). */
const VZ_URGENT_MS = 5 * 60 * 60 * 1000; // 5 soat

function vzMsToParts(ms){
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  return { days, hours, mins };
}
function vzFormatCountdown(dueAt){
  const diff = dueAt - Date.now();
  if(diff <= 0) return { text: "Muddati o'tdi", cls: 'vz-overdue' };
  const { days, hours, mins } = vzMsToParts(diff);
  let text;
  if(days > 0) text = `${days} kun ${hours} soat qoldi`;
  else if(hours > 0) text = `${hours} soat ${mins} daq. qoldi`;
  else text = `${mins} daqiqa qoldi`;
  return { text, cls: diff <= VZ_URGENT_MS ? 'vz-urgent' : '' };
}
function vzFormatDue(dueAt){
  const d = new Date(dueAt);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* Har soniyada — sahifada ochiq turgan barcha countdown yozuvlarini
   yangilab boradi (qaysi panel ochiq bo'lishidan qat'i nazar). Admin
   biror maydonga yozayotgan bo'lsa (isUserTyping) — iPhone'da klaviatura
   bilan to'qnashmasin deb shu soniyalik yangilanish o'tkazib yuboriladi
   (keyingi soniyada baribir davom etadi, foydalanuvchiga sezilmaydi). */
setInterval(()=>{
  if(isUserTyping) return;
  document.querySelectorAll('.vz-countdown[data-due]').forEach(el=>{
    if(el.dataset.completed === '1') return;
    const { text, cls } = vzFormatCountdown(Number(el.dataset.due));
    el.textContent = text;
    el.className = 'vz-countdown' + (cls ? ' ' + cls : '');
  });
}, 1000);

function vzPlayAlertSound(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((delay, i)=>{
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1040 : 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    });
  }catch(e){ /* audio ishlamasa ham, vizual ogohlantirish yetarli */ }
}

/* ==================================================================
   BILDIRISHNOMANI SURIB YUBORISH (Telegram / iOS uslubida)
   ------------------------------------------------------------------
   Bitta joyda yozilgan, barcha bildirishnomalarga ulanadigan imo-ishora:

     * barmoq (yoki sichqoncha) qaysi tomonga ketsa — kartochka O'SHA
       tomonga ergashadi: yonga sursa yonga, tepadagi kartochkani
       yuqoriga sursa yuqoriga (pastdagisini pastga);
     * yo'nalish birinchi 5 pikselda TANLANADI va shundan keyin
       o'zgarmaydi — shunda kartochka "qaltiramaydi";
     * teskari tomonga tortsa "rezina" kabi qarshilik qiladi (0,16);
     * qo'yib yuborilganda: masofa yetarli bo'lsa YOKI harakat tez
       bo'lsa (flick) — uchib ketadi; aks holda yumshoq "prujina"
       bilan joyiga qaytadi va taymer qaytadan ketadi;
     * surish paytida avtomatik yopilish taymeri TO'XTAYDI.

   Faqat `transform` va `opacity` o'zgaradi — ya'ni ish videokartada
   bajariladi, eski telefonda ham silliq chiqadi.
   ================================================================== */
function surishBogla(el, opt){
  opt = opt || {};
  const past = opt.yon === 'past';          /* pastdagi bildirishnoma */
  let sx = 0, sy = 0, dx = 0, dy = 0, oq = null, bosildi = false;
  /* Tezlikni OXIRGI harakatlar bo'yicha o'lchaymiz (butun surish
     bo'yicha emas): shunda "flick" — qisqa, lekin tez silkitish ham
     bildirishnomani uchirib yuboradi, xuddi telefondagidek. */
  let oVaqt = 0, oX = 0, oY = 0, vx = 0, vy = 0;
  const hozir = () => (window.performance && performance.now) ? performance.now() : Date.now();
  const en = () => Math.max(160, el.getBoundingClientRect().width || 320);
  /* Ba'zi kartochkalar CSS'da `translateX(-50%)` bilan markazlashgan —
     surishda u yo'qolmasligi uchun old qo'shimcha sifatida saqlanadi. */
  const asos = opt.asos || '';
  const qoy = (x, y, o) => {
    el.style.transform = asos + 'translate3d(' + x + 'px,' + y + 'px,0)';
    el.style.opacity = String(o);
  };
  const tozala = () => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; };

  el.addEventListener('pointerdown', (e) => {
    if(e.button) return;
    bosildi = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; oq = null;
    oVaqt = hozir(); oX = e.clientX; oY = e.clientY; vx = vy = 0;
    el.classList.add('surilmoqda');
    el.style.transition = 'none';
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    if(opt.toxtat) opt.toxtat();
  });

  el.addEventListener('pointermove', (e) => {
    if(!bosildi) return;
    const X = e.clientX - sx, Y = e.clientY - sy;
    if(!oq){
      if(Math.abs(X) < 5 && Math.abs(Y) < 5) return;
      oq = Math.abs(X) > Math.abs(Y) ? 'x' : 'y';
    }
    /* Oniy tezlik (px/ms), yengil silliqlash bilan */
    const t = hozir(), dt = Math.max(8, t - oVaqt);
    vx = 0.6 * ((e.clientX - oX) / dt) + 0.4 * vx;
    vy = 0.6 * ((e.clientY - oY) / dt) + 0.4 * vy;
    oVaqt = t; oX = e.clientX; oY = e.clientY;
    if(oq === 'x'){ dx = X; dy = 0; }
    else {
      dx = 0;
      const togri = past ? (Y > 0) : (Y < 0);
      dy = togri ? Y : Y * 0.16;
    }
    const tik = past ? Math.max(0, dy) : Math.max(0, -dy);
    const o = Math.max(0.15, 1 - Math.abs(dx) / (en() * 0.9) - tik / 130);
    qoy(dx, dy, o);
  });

  const tugadi = () => {
    if(!bosildi) return;
    bosildi = false;
    el.classList.remove('surilmoqda');
    /* Barmoq uzilgandan beri ko'p vaqt o'tgan bo'lsa (to'xtab turgan
       edi) — tezlikni hisobga olmaymiz. */
    if(hozir() - oVaqt > 120){ vx = 0; vy = 0; }
    const tik = past ? dy : -dy;
    const tikTez = past ? vy : -vy;
    const ketsin = (oq === 'x' && (Math.abs(dx) > en() * 0.28 || (Math.abs(vx) > 0.35 && Math.abs(dx) > 12)))
                || (oq === 'y' && (tik > 42 || (tikTez > 0.3 && tik > 8)));
    if(ketsin){
      const hx = oq === 'x' ? (dx > 0 ? en() + 90 : -(en() + 90)) : 0;
      const hy = oq === 'x' ? 0 : (past ? 240 : -240);
      el.style.transition = 'transform .22s cubic-bezier(.3,0,.7,.4), opacity .2s linear';
      qoy(hx, hy, 0);
      setTimeout(() => { if(opt.yopish) opt.yopish(true); }, 195);
      return;
    }
    el.style.transition = 'transform .34s cubic-bezier(.2,.9,.28,1.25), opacity .2s ease';
    qoy(0, 0, 1);
    setTimeout(tozala, 360);
    if(opt.davom) opt.davom();
  };
  el.addEventListener('pointerup', tugadi);
  el.addEventListener('pointercancel', tugadi);
  el.addEventListener('lostpointercapture', tugadi);

  /* Bosish (click) va surishni ajratish uchun */
  el.surilganmi = () => (Math.abs(dx) > 6 || Math.abs(dy) > 6);
  /* Sinov uchun: oxirgi surish holati (dasturga ta'sir qilmaydi) */
  el.surishHolati = () => ({ dx: dx, dy: dy, oq: oq, vx: vx, vy: vy });
  return el;
}

function vzToastJoy(){
  let box = document.getElementById('vzToasts');
  if(!box){
    box = document.createElement('div');
    box.id = 'vzToasts';
    document.body.appendChild(box);
  }
  return box;
}

/* Bildirishnomani yopish (yonga surilganda yoki vaqti tugaganda) */
function vzToastYop(el, yon){
  if(el.dataset.yopilmoqda) return;
  el.dataset.yopilmoqda = '1';
  if(yon){
    el.style.transition = 'transform .22s ease, opacity .22s ease';
    el.style.transform = 'translateX(' + (yon > 0 ? 460 : -460) + 'px)';
    el.style.opacity = '0';
    setTimeout(()=> el.remove(), 230);
  }else{
    el.classList.add('vz-toast-out');
    setTimeout(()=> el.remove(), 300);
  }
}

/* SURIB YUBORISH — umumiy yordamchi orqali (butun saytda bir xil):
   yonga sursa yonga, yuqoriga sursa yuqoriga uchib ketadi; yetarli
   surilmasa yumshoq prujina bilan joyiga qaytadi. */
function vzSurish(el, vaqtlar){
  surishBogla(el, {
    yon: 'tepa',
    toxtat: ()=>{ if(vaqtlar) clearTimeout(vaqtlar.t); },
    davom:  ()=>{ if(vaqtlar) vaqtlar.t = setTimeout(()=> vzToastYop(el), 3500); },
    yopish: ()=>{ if(vaqtlar) clearTimeout(vaqtlar.t); el.remove(); }
  });
}

/* Firestore'dagi vaqt (ms) -> <input type="datetime-local"> formati.
   Mahalliy vaqt bo'yicha, ya'ni admin ko'rgan sana o'zgarmaydi. */
function vzLocalInput(ms){
  const d = new Date(Number(ms) || Date.now());
  const q = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + q(d.getMonth() + 1) + '-' + q(d.getDate()) +
         'T' + q(d.getHours()) + ':' + q(d.getMinutes());
}

function vzShowToast(task){
  const box = vzToastJoy();
  // Bir vaqtda ko'pi bilan 3 ta — ekran to'lib ketmasin
  while(box.children.length >= 3) box.firstElementChild.remove();

  const kechikkan = (Number(task.dueAt) || 0) < Date.now();
  const toast = document.createElement('div');
  toast.className = 'vz-toast' + (kechikkan ? '' : ' muhlat');
  toast.innerHTML = ICONS.bell +
    '<div style="min-width:0"><b>' +
      (kechikkan ? "\u23F0 Vazifa muddati o\u2018tdi" : (task.important ? "\u2B50\uFE0F Muhim vazifa" : "Vazifa muddati yaqin")) +
    '</b><span>' + escapeHtml(task.text || '') + ' \u2014 ' + vzFormatCountdown(task.dueAt).text + '</span></div>' +
    '<i class="vz-tut"></i>';

  const vaqtlar = { t: null };
  toast.addEventListener('click', ()=>{
    if(toast.surilganmi && toast.surilganmi()) return;   // surish edi, bosish emas
    const t = document.querySelector('.tab[data-tab="vazifalar"]');
    if(t) t.click();
    clearTimeout(vaqtlar.t);
    vzToastYop(toast);
  });
  vzSurish(toast, vaqtlar);

  box.appendChild(toast);
  vaqtlar.t = setTimeout(()=> vzToastYop(toast), 8000);
}

let vzAlertedIds = new Set();
let vzWatchStarted = false;

async function vzGlobalCheck(){
  // Admin hozir biror joyga yozayotgan bo'lsa — bu tekshiruvni o'tkazib
  // yuboramiz (keyingi 30 soniyalik siklda baribir qayta ishlaydi).
  if(isUserTyping) return;
  try{
    const snap = await db.collection('admin_tasks').where('completed', '==', false).get();
    const now = Date.now();
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const urgent = tasks.filter(t => t.dueAt - now <= VZ_URGENT_MS);

    const tabBadge = document.getElementById('taskTabBadge');
    const bellBtn = document.getElementById('taskBellBtn');
    const bellBadge = document.getElementById('taskBellBadge');
    if(urgent.length > 0){
      if(tabBadge){ tabBadge.style.display = ''; tabBadge.textContent = urgent.length; }
      if(bellBtn){ bellBtn.style.display = ''; }
      if(bellBadge){ bellBadge.textContent = urgent.length; }
    }else{
      if(tabBadge) tabBadge.style.display = 'none';
      if(bellBtn) bellBtn.style.display = 'none';
    }
    // Yon menyudagi guruh yopiq bo'lsa, son guruh sarlavhasida ko'rinsin.
    try{ if(typeof refreshTabGroupBadges === 'function') refreshTabGroupBadges(); }catch(e){}

    urgent.forEach(t=>{
      if(vzAlertedIds.has(t.id)) return;
      vzAlertedIds.add(t.id);
      vzPlayAlertSound();
      vzShowToast(t);
      vibrate([80, 40, 80]);
    });
  }catch(e){ /* internet yo'q bo'lsa ham panel ishlashda davom etadi */ }
}
function startVazifalarWatch(){
  if(vzWatchStarted) return;
  vzWatchStarted = true;
  vzGlobalCheck();
  setInterval(vzGlobalCheck, 30000);
}
document.getElementById('taskBellBtn').addEventListener('click', ()=>{
  document.querySelector('.tab[data-tab="vazifalar"]').click();
});

async function loadVazifalarStats(){
  const statsEl = document.getElementById('vzStatsRow');
  if(!statsEl) return;
  statsEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('admin_tasks').where('completed', '==', false).get();
    const tasks = snap.docs.map(d => d.data());
    const now = Date.now();
    const importantCount = tasks.filter(t => t.important).length;
    const urgentCount = tasks.filter(t => t.dueAt - now <= VZ_URGENT_MS).length;
    statsEl.innerHTML = `
      <div class="pb-stat-card">
        <div class="pb-stat-ico">${ICONS.clock}</div>
        <b>${tasks.length}</b>
        <span class="pb-stat-label">Faol vazifalar</span>
      </div>
      <div class="pb-stat-card" style="background:linear-gradient(135deg,#E8B339,#B8862A);">
        <div class="pb-stat-ico">${ICONS.star}</div>
        <b>${importantCount}</b>
        <span class="pb-stat-label">Muhim vazifalar</span>
      </div>
      <div class="pb-stat-card ${urgentCount > 0 ? 'bad' : 'good'}">
        <div class="pb-stat-ico">${ICONS.bell}</div>
        <b>${urgentCount}</b>
        <span class="pb-stat-label">Muddati yaqin (5 soat)</span>
        <span class="pb-stat-trend">${urgentCount > 0 ? 'Diqqat, shoshiling!' : 'Hammasi tinch'}</span>
      </div>
    `;
  }catch(err){
    statsEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}
async function loadVazifalarCount(){
  const countEl = document.getElementById('vzTaskCount');
  try{
    const snap = await db.collection('admin_tasks').where('completed', '==', false).get();
    if(countEl) countEl.textContent = snap.size;
  }catch(e){ /* xato bo'lsa ham interfeys ishlashda davom etadi */ }
}

let vzImportantSelected = false;
function vzDateToLocalInputValue(d){
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function vzUpdateDuePreview(){
  const raw = document.getElementById('vzTaskDue').value;
  const preview = document.getElementById('vzDuePreview');
  if(!raw){ preview.classList.remove('show'); return; }
  const dueAt = new Date(raw).getTime();
  if(!dueAt || isNaN(dueAt)){ preview.classList.remove('show'); return; }
  const { text } = vzFormatCountdown(dueAt);
  document.getElementById('vzDuePreviewText').textContent = `${vzFormatDue(dueAt)} — ${text}`;
  preview.classList.add('show');
}
function vzResetAddForm(){
  document.getElementById('vzTaskText').value = '';
  document.getElementById('vzTaskDue').value = '';
  vzImportantSelected = false;
  document.getElementById('vzImportantToggle').classList.remove('active');
  document.getElementById('vzAddTaskMsg').textContent = '';
  document.getElementById('vzAddTaskMsg').className = 'settings-msg';
  document.querySelectorAll('.vz-quickdate-chip').forEach(c => c.classList.remove('active'));
  document.getElementById('vzDuePreview').classList.remove('show');
}
document.querySelectorAll('.vz-quickdate-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    const hours = Number(chip.dataset.hours);
    const target = new Date(Date.now() + hours * 3600000);
    document.getElementById('vzTaskDue').value = vzDateToLocalInputValue(target);
    document.querySelectorAll('.vz-quickdate-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    vzUpdateDuePreview();
    vibrate(30);
  });
});
document.getElementById('vzTaskDue').addEventListener('input', ()=>{
  document.querySelectorAll('.vz-quickdate-chip').forEach(c => c.classList.remove('active'));
  vzUpdateDuePreview();
});
document.getElementById('vzAddTaskCard').addEventListener('click', ()=>{
  document.getElementById('vzCustCardsRow').style.display = 'none';
  document.getElementById('vzViewTasksPanel').classList.remove('open');
  vzResetAddForm();
  document.getElementById('vzAddTaskSuccess').classList.remove('show');
  document.querySelector('#vzAddTaskPanel .zk-inline-body').style.display = '';
  document.getElementById('vzAddTaskPanel').classList.add('open');
});
document.getElementById('vzAddTaskBack').addEventListener('click', ()=>{
  document.getElementById('vzAddTaskPanel').classList.remove('open');
  document.getElementById('vzCustCardsRow').style.display = '';
});
document.getElementById('vzImportantToggle').addEventListener('click', ()=>{
  vzImportantSelected = !vzImportantSelected;
  document.getElementById('vzImportantToggle').classList.toggle('active', vzImportantSelected);
  vibrate(30);
});
document.getElementById('vzAddTaskBtn').addEventListener('click', async ()=>{
  const text = document.getElementById('vzTaskText').value.trim();
  const dueRaw = document.getElementById('vzTaskDue').value;
  const msgEl = document.getElementById('vzAddTaskMsg');
  if(!text || !dueRaw){
    msgEl.textContent = "Vazifa matnini va muddatini kiriting";
    msgEl.className = 'settings-msg bad';
    return;
  }
  const dueAt = new Date(dueRaw).getTime();
  if(!dueAt || isNaN(dueAt)){
    msgEl.textContent = "Muddat sanasi noto'g'ri";
    msgEl.className = 'settings-msg bad';
    return;
  }
  const btn = document.getElementById('vzAddTaskBtn');
  btn.disabled = true;
  msgEl.textContent = '';
  try{
    await db.collection('admin_tasks').add({
      text,
      dueAt,
      important: vzImportantSelected,
      completed: false,
      notified5h: false,
      createdAt: sanaVaqtUz(new Date()),
      createdAtSort: Date.now()
    });
    document.querySelector('#vzAddTaskPanel .zk-inline-body').style.display = 'none';
    document.getElementById('vzAddTaskSuccess').classList.add('show');
    vibrate(60);
    loadVazifalarCount();
    loadVazifalarStats();
    vzGlobalCheck();
    setTimeout(()=>{
      document.getElementById('vzAddTaskPanel').classList.remove('open');
      document.getElementById('vzCustCardsRow').style.display = '';
    }, 1400);
  }catch(err){
    msgEl.textContent = 'Xato: ' + err.message;
    msgEl.className = 'settings-msg bad';
  }finally{
    btn.disabled = false;
  }
});

/* ---------- VAZIFA FILTRI VA TOPLAM AMALLAR (V113) ---------- */
let VZ_FILTR = 'hammasi';

function vzChiplarniChiz(hisob){
  const el = document.getElementById('vzFiltrlar');
  if(!el) return;
  const chips = [
    ['hammasi', 'Hammasi', hisob.hammasi],
    ['faol', 'Faol', hisob.faol],
    ['otgan', "Muddati o'tgan", hisob.otgan],
    ['bajarilgan', 'Bajarilgan', hisob.bajarilgan]
  ];
  el.innerHTML = chips.map(([k, nom, n]) =>
    '<button type="button" class="vz-filtr-chip' + (VZ_FILTR === k ? ' active' : '')
    + (k === 'otgan' && n > 0 ? ' ogoh' : '') + '" data-f="' + k + '">'
    + nom + '<b>' + n + '</b></button>'
  ).join('')
  /* Muddati o'tganlarni BIR YO'LA tozalash — ular ko'payib ketganda
     bittalab o'chirish juda zerikarli. */
  + (hisob.otgan > 0
      ? '<button type="button" class="vz-tozala-btn" id="vzOtganTozala">\uD83D\uDDD1 Muddati o\'tganlarni tozalash (' + hisob.otgan + ')</button>'
      : '');

  el.querySelectorAll('.vz-filtr-chip').forEach(b => b.addEventListener('click', ()=>{
    VZ_FILTR = b.dataset.f;
    loadVazifalarList();
  }));
  const toz = document.getElementById('vzOtganTozala');
  if(toz) toz.addEventListener('click', vzOtganlarniTozala);
}

async function vzOtganlarniTozala(){
  const btn = document.getElementById('vzOtganTozala');
  if(!confirm("Muddati o'tgan BARCHA vazifalar butunlay o'chiriladi. Davom etasizmi?")) return;
  if(btn){ btn.disabled = true; btn.textContent = "O'chirilmoqda\u2026"; }
  try{
    const snap = await db.collection('admin_tasks').where('completed', '==', false).get();
    const now = Date.now();
    const otganlar = snap.docs.filter(d => (d.data().dueAt || 0) <= now);
    /* Firestore partiyasi bir yo'la 500 tagacha yozuvni qabul qiladi */
    for(let i = 0; i < otganlar.length; i += 450){
      const batch = db.batch();
      otganlar.slice(i, i + 450).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    panelToast(otganlar.length + " ta vazifa o'chirildi", 'ok', { sarlavha: 'Tozalandi' });
    vibrate(60);
    loadVazifalarList(); loadVazifalarCount(); loadVazifalarStats(); vzGlobalCheck();
  }catch(err){
    panelToast('Xato: ' + err.message, 'err');
    if(btn){ btn.disabled = false; btn.textContent = "\uD83D\uDDD1 Muddati o'tganlarni tozalash"; }
  }
}

async function loadVazifalarList(){
  const listEl = document.getElementById('vzTasksList');
  listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('admin_tasks').orderBy('dueAt', 'asc').get();
    let tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Tartib: bajarilmagan avval, orasida MUHIM birinchi, keyin muddat yaqinligi bo'yicha.
    tasks.sort((a, b)=>{
      if(a.completed !== b.completed) return a.completed ? 1 : -1;
      if(!!a.important !== !!b.important) return a.important ? -1 : 1;
      return a.dueAt - b.dueAt;
    });
    document.getElementById('vzViewTaskCount').textContent = tasks.filter(t => !t.completed).length;
    if(tasks.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali vazifa qo\'shilmagan.</div>';
      return;
    }
    const now = Date.now();

    /* FILTR (V113). Muddati o'tib ketgan vazifalar ro'yxatda qolaveradi —
       ularni ham tahrirlash va o'chirish kerak. Lekin ular ko'payib
       ketganda faol vazifalarni ko'rishga xalal beradi, shu sabab
       yuqoridagi chiplar bilan ajratib ko'rish mumkin. */
    const filtr = VZ_FILTR;
    const otgan = (t)=> !t.completed && t.dueAt <= now;
    const hisob = {
      hammasi: tasks.length,
      faol: tasks.filter(t => !t.completed && !otgan(t)).length,
      otgan: tasks.filter(otgan).length,
      bajarilgan: tasks.filter(t => t.completed).length
    };
    vzChiplarniChiz(hisob);
    if(filtr === 'faol') tasks = tasks.filter(t => !t.completed && !otgan(t));
    else if(filtr === 'otgan') tasks = tasks.filter(otgan);
    else if(filtr === 'bajarilgan') tasks = tasks.filter(t => t.completed);

    if(tasks.length === 0){
      listEl.innerHTML = '<div style="color:var(--muted);font-size:12px;">Bu toifada vazifa yo\'q.</div>';
      return;
    }

    listEl.innerHTML = tasks.map((t, i)=>{
      const kechikdi = otgan(t);
      const isUrgent = !t.completed && !kechikdi && (t.dueAt - now) <= VZ_URGENT_MS;
      const statusClass = t.completed ? 'status-taskdone'
        : (kechikdi ? 'status-otgan' : (isUrgent ? 'status-urgent' : (t.important ? 'status-important' : '')));
      const ico = t.important ? ICONS.star : ICONS.clock;
      const importantBadge = (t.important && !t.completed) ? `<span class="vz-important-badge">${ICONS.star} Muhim</span>` : '';
      const otganBadge = kechikdi ? `<span class="vz-otgan-badge">Muddati o'tgan</span>` : '';
      const { text: cdText, cls: cdCls } = vzFormatCountdown(t.dueAt);
      const countdownHtml = t.completed
        ? `<span class="vz-countdown">Bajarildi</span>`
        : `<span class="vz-countdown ${cdCls}" data-due="${escapeHtml(t.dueAt)}">${cdText}</span>`;
      return `
      <div class="zk-customer-row ${statusClass}" data-id="${t.id}" style="animation-delay:${Math.min(i * 0.03, 0.4)}s;">
        <div class="zk-customer-summary" data-id="${t.id}">
          <span class="zk-customer-summary-ico">${ico}</span>
          <span class="zk-customer-ordered-phone">${escapeHtml(t.text || '')}</span>
          ${importantBadge}
          ${otganBadge}
          ${countdownHtml}
          <span class="zk-customer-arrow">▾</span>
        </div>
        <div class="zk-customer-body">
          <div class="zk-customer-info">
            <span>Vazifa</span><span>${escapeHtml(t.text || '')}</span>
            <span>Muddati</span><span>${vzFormatDue(t.dueAt)}</span>
            <span>Holati</span><span>${t.completed ? 'Bajarildi' : (kechikdi ? "Muddati o'tgan" : (isUrgent ? 'Muddati yaqinlashdi' : 'Jarayonda'))}</span>
            <span>Qo'shilgan sana</span><span>${escapeHtml(t.createdAt || '')}</span>
          </div>
          <!-- TAHRIRLASH: matn va muddat. Muddati o'tib ketgan va
               ancha oldin qo'shilgan vazifalar ham tahrirlanadi —
               ro'yxatda hamma vazifa turadi (bajarilganlari ham). -->
          <div class="vz-edit" data-edit="${t.id}" style="display:none">
            <input class="vz-e-text" type="text" maxlength="300" value="${escapeHtml(t.text || '')}" placeholder="Vazifa matni">
            <input class="vz-e-due" type="datetime-local" value="${vzLocalInput(t.dueAt)}">
            <label class="vz-e-imp"><input type="checkbox" class="vz-e-important" ${t.important ? 'checked' : ''}> Muhim vazifa</label>
            <div class="vz-e-row">
              <button type="button" class="zk-cust-action-btn vz-e-save" data-action="save" data-id="${t.id}">Saqlash</button>
              <button type="button" class="zk-cust-action-btn vz-e-cancel" data-action="cancel" data-id="${t.id}">Bekor</button>
            </div>
          </div>
          <div class="zk-customer-actions">
            <button type="button" class="zk-cust-action-btn" data-action="edit" data-id="${t.id}">${ICONS.pencil || ''} Tahrirlash</button>
            <button type="button" class="zk-cust-action-btn done-toggle-btn ${t.completed ? 'active-status' : ''}" data-action="toggle" data-id="${t.id}">${ICONS.check} ${t.completed ? 'Bajarilgan' : 'Bajarildi'}</button>
            <button type="button" class="zk-cust-action-btn delete-btn" data-action="delete" data-id="${t.id}">${ICONS.trash}</button>
          </div>
        </div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('.zk-customer-summary').forEach(summary=>{
      summary.addEventListener('click', ()=>{
        summary.closest('.zk-customer-row').classList.toggle('zk-open');
      });
    });
    listEl.querySelectorAll('.zk-cust-action-btn').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const row = btn.closest('.zk-customer-row');
        if(action === 'delete'){
          if(!confirm("Ushbu vazifani butunlay o'chirishni tasdiqlaysizmi?")) return;
          try{
            await db.collection('admin_tasks').doc(id).delete();
            row.style.transition = 'opacity .2s ease, transform .2s ease';
            row.style.opacity = '0';
            row.style.transform = 'translateX(-8px)';
            setTimeout(()=>{ row.remove(); }, 200);
            vibrate(60);
            loadVazifalarCount();
            loadVazifalarStats();
            vzGlobalCheck();
          }catch(err){ alert('Xato: ' + err.message); }
          return;
        }
        if(action === 'edit' || action === 'cancel'){
          const box = row.querySelector('[data-edit]');
          const acts = row.querySelector('.zk-customer-actions');
          const info = row.querySelector('.zk-customer-info');
          const ochiq = box.style.display !== 'none';
          box.style.display = ochiq ? 'none' : 'block';
          if(acts) acts.style.display = ochiq ? '' : 'none';
          if(info) info.style.display = ochiq ? '' : 'none';
          return;
        }
        if(action === 'save'){
          const box = row.querySelector('[data-edit]');
          const matn = (box.querySelector('.vz-e-text').value || '').trim();
          const sana = box.querySelector('.vz-e-due').value;
          const muhim = box.querySelector('.vz-e-important').checked;
          if(!matn){ alert('Vazifa matnini kiriting'); return; }
          const yangiVaqt = sana ? new Date(sana).getTime() : 0;
          if(!yangiVaqt){ alert('Muddatni tanlang'); return; }
          try{
            await db.collection('admin_tasks').doc(id).update({
              text: matn, dueAt: yangiVaqt, important: muhim
            });
            /* Muddati o'zgargan bo'lsa — eslatma qaytadan ishlashi
               uchun "aytib bo'lingan" belgisini olib tashlaymiz. */
            vzAlertedIds.delete(id);
            vibrate(60);
            loadVazifalarList(); loadVazifalarCount(); loadVazifalarStats(); vzGlobalCheck();
          }catch(err){ alert('Xato: ' + err.message); }
          return;
        }
        // action === 'toggle' — bajarildi / bajarilmagan
        try{
          const newCompleted = !row.classList.contains('status-taskdone');
          await db.collection('admin_tasks').doc(id).update({ completed: newCompleted });
          vibrate(60);
          loadVazifalarCount();
          loadVazifalarStats();
          vzGlobalCheck();
          loadVazifalarList();
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });
  }catch(err){
    listEl.innerHTML = '<div style="color:var(--red);font-size:12px;">Xato: ' + err.message + '</div>';
  }
}
/* Ro'yxatni ochish — bo'lim ochilganda ham, kartochka bosilganda ham
   shu funksiya ishlatiladi. Tezkor amallar kartochkalari YASHIRILMAYDI:
   admin bir vaqtning o'zida ham vazifa qo'sha oladi, ham ro'yxatni
   ko'rib turadi. */
function vzRoyxatniOch(){
  const panel = document.getElementById('vzViewTasksPanel');
  if(!panel) return;
  panel.classList.add('open');
  panel.classList.add('vz-doim');          // "orqaga" tugmasi kerak emas
  loadVazifalarList();
}
document.getElementById('vzViewTasksCard').addEventListener('click', ()=>{
  document.getElementById('vzAddTaskPanel').classList.remove('open');
  vzRoyxatniOch();
  try{ document.getElementById('vzViewTasksPanel').scrollIntoView({ block:'start', behavior:'smooth' }); }catch(e){}
});
document.getElementById('vzViewTasksBack').addEventListener('click', ()=>{
  document.getElementById('vzViewTasksPanel').classList.remove('open');
  document.getElementById('vzCustCardsRow').style.display = '';
});

function detectDevice(ua){
  let os = "Noma'lum qurilma";
  if(/iPhone/.test(ua)) os = 'iPhone';
  else if(/iPad/.test(ua)) os = 'iPad';
  else if(/Android/.test(ua)) os = 'Android';
  else if(/Macintosh/.test(ua)) os = 'Mac';
  else if(/Windows/.test(ua)) os = 'Windows';
  else if(/Linux/.test(ua)) os = 'Linux';

  let browser = 'Brauzer';
  if(/Edg\//.test(ua)) browser = 'Edge';
  else if(/OPR\//.test(ua)) browser = 'Opera';
  else if(/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if(/Firefox\//.test(ua)) browser = 'Firefox';
  else if(/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  return `${os} — ${browser}`;
}
// Har bir kirish/chiqish ALOHIDA yozuv sifatida saqlanadi (type: 'login'
// yoki 'logout') — shu bilan "Seanslar" bo'limida qaysi admin qachon
// kirib, qachon chiqqani ko'rinadi. uid — o'sha adminning O'ZI (Firestore
// qoidasi buni tekshiradi, boshqa admin nomidan yozib bo'lmaydi).
async function recordSessionEvent(type){
  try{
    const user = firebase.auth().currentUser;
    if(!user) return;
    await db.collection('admin_sessions').add({
      uid: user.uid,
      name: (window.CURRENT_ADMIN_NAME || user.email || ''),
      type,
      device: detectDevice(navigator.userAgent),
      loginAt: sanaVaqtUz(new Date()),
      loginAtSort: Date.now()
    });
  }catch(e){ console.error('Seansni yozishda xato:', e); }
}
function recordSession(){ return recordSessionEvent('login'); }
function recordLogout(){ return recordSessionEvent('logout'); }

/* ---- Login ---- */
const loginScreen  = document.getElementById('loginBg');
const dashboard    = document.getElementById('dashboard');
const usernameInput= document.getElementById('usernameInput');
const passwordInput= document.getElementById('passwordInput');
const loginError   = document.getElementById('loginError');

/* ---------- KIRISH EKRANI: tugma holati, ko'z, Caps Lock (V100) ----------
   Tugma ichida endi ikkita element bor: matn (.lb-matn) va yuklanish
   halqasi (.lb-yuk). Shu sabab `btn.textContent = '...'` ishlatib
   bo'lmaydi — u ikkalasini ham o'chirib yuborardi. Quyidagi yordamchi
   faqat MATNNI almashtiradi va halqani yoqadi/o'chiradi. */
function loginTugmaMatn(matn, yuklanmoqda){
  const btn = document.getElementById('loginBtn');
  if(!btn) return;
  const el = btn.querySelector('.lb-matn');
  if(el) el.textContent = matn; else btn.textContent = matn;
  btn.classList.toggle('yuklanmoqda', !!yuklanmoqda);
}
function loginTugmaMatnOl(){
  const btn = document.getElementById('loginBtn');
  if(!btn) return 'Kirish';
  const el = btn.querySelector('.lb-matn');
  return (el ? el.textContent : btn.textContent) || 'Kirish';
}

(function kirishOynasi(){
  const parol = document.getElementById('passwordInput');
  const koz   = document.getElementById('loginEye');
  const login = document.getElementById('usernameInput');
  const karta = document.getElementById('loginScreen');

  /* Parolni ko'rsatish/yashirish. Katta xizmatlarning hammasida bor:
     telefon klaviaturasida parolni xato terish juda oson. */
  if(koz && parol){
    koz.addEventListener('click', ()=>{
      const ochiq = koz.getAttribute('data-ochiq') === '1';
      parol.type = ochiq ? 'password' : 'text';
      koz.setAttribute('data-ochiq', ochiq ? '0' : '1');
      koz.setAttribute('aria-label', ochiq ? "Parolni ko'rsatish" : 'Parolni yashirish');
      parol.focus();
    });
  }

  /* Kursor ortidan yuradigan yorug'lik. Qiymat requestAnimationFrame
     bilan, kadrga BIR MARTA yangilanadi — sichqoncha sekundiga yuzlab
     hodisa yuborsa ham brauzer ortiqcha ish qilmaydi. */
  if(karta && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    let x = 0, y = 0, navbatda = false;
    karta.addEventListener('pointermove', (e)=>{
      const q = karta.getBoundingClientRect();
      x = e.clientX - q.left; y = e.clientY - q.top;
      if(navbatda) return;
      navbatda = true;
      requestAnimationFrame(()=>{
        navbatda = false;
        karta.style.setProperty('--nx', x + 'px');
        karta.style.setProperty('--ny', y + 'px');
      });
    }, { passive: true });
  }

  /* Enter bilan kirish: loginda bosilsa parolga o'tadi, parolda bosilsa
     kiradi — sichqonchaga tegmasdan ishlash. */
  if(login) login.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); if(parol) parol.focus(); } });
  if(parol) parol.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.preventDefault(); doLogin(); } });

  /* Yozishni boshlasa — eski xato xabari ketadi. Qulf sanog'i esa
     qolaveradi (u vaqt hisoblab turadi, uni o'chirish chalg'itardi). */
  [login, parol].forEach(el=>{
    if(!el) return;
    el.addEventListener('input', ()=>{
      const x = document.getElementById('loginError');
      if(x && x.style.display !== 'none' && !/Qayta urinish/.test(x.textContent)){
        x.style.display = 'none';
      }
    });
  });

  if(login) setTimeout(()=>{ try{ login.focus({ preventScroll: true }); }catch(e){} }, 650);
})();

document.getElementById('loginBtn').addEventListener('click', doLogin);
usernameInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') passwordInput.focus(); });
passwordInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') doLogin(); });

/* ---- Boshqaruv paneli yonidagi jonli soat (soniyagacha) ---- */
function updateTopbarClock(){
  const el = document.getElementById('topbarClock');
  if(!el) return;
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
updateTopbarClock();
setInterval(updateTopbarClock, 1000);

const SESSION_DURATION = 10 * 60 * 1000; // 10 daqiqa (endi ISHLATILMAYDI — pastga qarang)
let sessionTimer = null;

function startSessionTimer(){
  if(sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(async ()=>{
    await recordLogout(); // hali tizimga kirgan holatda — signOut()dan OLDIN yozilishi shart
    firebase.auth().signOut();
    if(ordersUnsubscribe){ ordersUnsubscribe(); ordersUnsubscribe = null; }
    dashboard.style.display = 'none';
    loginScreen.style.display = 'block';
    usernameInput.value = '';
    passwordInput.value = '';
    loginError.textContent = "Seans muddati tugadi (10 daqiqa). Xavfsizlik uchun qaytadan kiring.";
    loginError.style.display = 'block';
  }, SESSION_DURATION);
}
function stopSessionTimer(){
  if(sessionTimer){ clearTimeout(sessionTimer); sessionTimer = null; }
}

/* Firebase Auth faqat EMAIL bilan ishlaydi (Email/Password usuli).
   Shu sabab admin kiritgan telefon raqam ichkarida doimiy email manzilga
   aylantiriladi: 998901234567 -> 998901234567@070.uz
   Ya'ni Firebase Console'da foydalanuvchi AYNAN shu ko'rinishda yaratiladi.
   SMS yuborilmaydi, hech qanday qo'shimcha xarajat yo'q.
   Eskicha to'g'ridan-to'g'ri email kiritish ham ishlayveradi — "@" bo'lsa
   o'zgartirilmaydi (avvaldan yaratilgan adminlar buzilmasin). */
const ADMIN_EMAIL_DOMAIN = '@070.uz';

// "Boshqaruv" orqali yaratilgan sub-adminlar EMAIL emas, faqat ISM
// (login) bilan kiradi. Bu ism orqa fonda AYNAN shu ko'rinishda ichki
// email'ga aylantiriladi — netlify/functions/admin-manage-admins.js
// dagi slugify() bilan BIR XIL mantiq (aks holda login topilmaydi).
const SUBADMIN_EMAIL_DOMAIN = '@ichki.vipraqamlar-admin.uz';
const CYRILLIC_MAP_LOGIN = {
  'ў':'u','қ':'q','ғ':'g','ҳ':'h','ш':'sh','ч':'ch','ё':'yo','я':'ya',
  'ю':'yu','ц':'ts','й':'y','х':'x','ж':'j','э':'e'
};
function slugifyLoginName(name){
  let s = String(name || '').trim().toLowerCase();
  s = s.replace(/[ўқғҳшчёяюцйхжэ]/g, ch => CYRILLIC_MAP_LOGIN[ch] || ch);
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.');
  return s || 'admin';
}

function loginToEmail(raw){
  const v = (raw || '').trim();
  if(v.includes('@')) return v;                 // email kiritildi — tegmaymiz

  let digits = v.replace(/\D/g, '');
  if(digits.length === 9) digits = '998' + digits;        // 901234567
  else if(digits.length === 12 && digits.startsWith('998')) { /* to'g'ri */ }
  else if(digits.length === 13 && digits.startsWith('9998')) digits = digits.slice(1);

  // Kiritilgan matnda harflar bor (faqat raqam emas) — demak bu telefon
  // emas, "Boshqaruv"da berilgan ISM (login). Sub-admin ichki email'iga
  // aylantiramiz.
  if(/[a-zA-Zа-яА-ЯёЁўқғҳЎҚҒҲ]/.test(v)){
    return slugifyLoginName(v) + SUBADMIN_EMAIL_DOMAIN;
  }

  return digits ? digits + ADMIN_EMAIL_DOMAIN : v;
}

// Kirish paytida "auth/network-request-failed" ko'pincha BIR MARTALIK,
// o'tkinchi tarmoq uzilishi tufayli chiqadi (Wi-Fi bir zumga sakrashi,
// mobil tarmoq uyasi almashishi va h.k.) — shu sabab darhol xato
// ko'rsatish o'rniga, avval jim-jimgina 2 marta (qisqa kutish bilan)
// qayta urinib ko'ramiz. Faqat SHU aniq (tarmoq) xatosida qayta
// urinamiz — parol/login xato bo'lsa qayta urinishning foydasi yo'q,
// darhol to'g'ri xabar ko'rsatiladi.
function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

/* ==================================================================
   TARMOQ TASHXISI — "auth/network-request-failed" bo'lganda
   ------------------------------------------------------------------
   MUAMMO. Bu xato bitta narsani anglatadi: brauzer Google'ning kirish
   xizmatiga (identitytoolkit.googleapis.com) UMUMAN ulana olmadi.
   Sabablari esa butunlay boshqa-boshqa:
     • internet yo'q;
     • brauzer kengaytmasi (reklama bloklagich, maxfiylik qalqoni)
       googleapis.com ni to'sib qo'ygan;
     • antivirusning "veb qalqoni" HTTPS'ni ochib-yopib tekshiryapti va
       so'rovni uzib qo'yyapti;
     • korporativ/uy routeri yoki DNS googleapis.com ni bloklagan.
   Ekranda esa bitta umumiy xabar chiqardi va admin nima qilishini
   bilmasdi ("telefonda ishlaydi, kompyuterda yo'q" holati aynan shu).

   YECHIM. Xato chiqqanda uchta qisqa tekshiruv qilamiz va AYNAN
   qaysi joyda uzilganini aytamiz:
     1. saytning o'zi ochilyaptimi (o'z faylimizni so'raymiz);
     2. saytning server funksiyasi javob beryaptimi;
     3. Google kirish xizmatiga yetib borish mumkinmi.
   Uchinchisi `mode:'no-cors'` bilan so'raladi: javobni O'QIY olmaymiz,
   lekin so'rov umuman KETDIMI — shuni bilamiz. Kengaytma yoki antivirus
   to'sgan bo'lsa, so'rov xatolik bilan tugaydi; o'tgan bo'lsa — "opaque"
   javob qaytadi. Aynan shu farq bizga kerak.
   ================================================================== */
/* ==================================================================
   OCHILISH TEKSHIRUVI — sahifa to'g'ri joydan ochilganmi
   ------------------------------------------------------------------
   Ikkita eng ko'p uchraydigan chalkashlikni sahifa ochilishidayoq
   aytib qo'yamiz, ya'ni admin parolni behuda terib o'tirmasin:
     1) panel kompyuterdagi FAYLDAN ochilgan (file:///...) — Google
        kirish xizmati bunday sahifani rad etadi;
     2) uslublar fayli (panel.css) yuklanmagan — demak kengaytma yoki
        antivirus fayllarni to'sayapti (sahifa "yalang'och" ko'rinadi).
   ================================================================== */
(function ochilishTekshiruvi(){
  function xabar(matn){
    const el = document.getElementById('loginError');
    if(!el) return;
    el.style.whiteSpace = 'pre-line';
    el.textContent = matn;
    el.style.display = 'block';
  }
  if(location.protocol === 'file:'){
    xabar("Bu sahifa kompyuterdagi FAYLDAN ochilgan \u2014 shu sababli kirish ishlamaydi.\n\n"
      + "Panelni saytdan oching:\n\u2022 https://vipraqamlar.uz/panel-boshqaruv.html");
    const btn = document.getElementById('loginBtn');
    if(btn){ btn.disabled = true; btn.style.opacity = '.5'; }
    return;
  }
  /* Uslublar yuklanganini sahifa to'liq ochilgach tekshiramiz */
  window.addEventListener('load', function(){
    let bor = false;
    try{
      bor = Array.prototype.some.call(document.styleSheets,
        sh => String(sh.href || '').indexOf('panel.css') !== -1);
    }catch(e){ bor = true; }
    if(!bor){
      xabar("Sahifa uslublari yuklanmadi (panel.css) \u2014 odatda buni brauzer "
        + "kengaytmasi yoki antivirusning veb qalqoni to'sadi.\n"
        + "\u2022 Yashirin oynada oching (Ctrl+Shift+N)\n"
        + "\u2022 yoki boshqa brauzerda sinab ko'ring.");
    }
  });
})();

async function tekshirManba(url, opt){
  const ctrl = new AbortController();
  const t = setTimeout(()=> ctrl.abort(), 6000);
  try{
    await fetch(url, Object.assign({ signal: ctrl.signal, cache: 'no-store' }, opt || {}));
    return true;
  }catch(e){ return false; }
  finally{ clearTimeout(t); }
}

async function tarmoqTashxis(){
  const b = Date.now();
  const [sayt, funksiya, google] = await Promise.all([
    tekshirManba('assets/panel.css?tashxis=' + b),
    tekshirManba('/.netlify/functions/api-index?tashxis=' + b),
    tekshirManba('https://identitytoolkit.googleapis.com/v1/projects?key=tashxis', { mode: 'no-cors' })
  ]);
  /* Uslublar fayli umuman biriktirilganmi (to'silgan bo'lsa — yo'q) */
  let uslub = false;
  try{
    uslub = Array.prototype.some.call(document.styleSheets,
      sh => String(sh.href || '').indexOf('panel.css') !== -1);
  }catch(e){ uslub = true; }

  /* ENG AVVAL: sahifa SAYTDAN ochilganmi yoki kompyuterdagi FAYLDAN?
     Zip'ni ochib, panel-boshqaruv.html ni ikki marta bosish — eng ko'p
     uchraydigan chalkashlik. Bunda manzil `file:///C:/...` bo'ladi va
     Google kirish xizmati bunday sahifani RAD ETADI (sahifaning
     manzili yo'q — "origin: null"). Natija aynan shu xato. */
  if(location.protocol === 'file:'){
    return "Bu sahifa kompyuterdagi FAYLDAN ochilgan (manzil qatorida "
      + "\"file:///...\" turibdi). Google kirish xizmati bunday sahifaga "
      + "ruxsat bermaydi.\n\nPanelni SAYTDAN oching:\n"
      + "\u2022 https://vipraqamlar.uz/panel-boshqaruv.html";
  }
  if(!navigator.onLine){
    return "Internet umuman yo'q ko'rinadi — ulanishni tekshiring.";
  }
  if(!sayt && !funksiya){
    return "Sayt serveriga ham ulanib bo'lmadi — internet yoki DNS muammosi. "
      + "Boshqa tarmoqqa (mobil internet) o'tib ko'ring.";
  }
  if(!google && window.AUTH_ZAXIRA){
    return "Google kirish xizmati to'silgan, shu sabab sayt orqali ZAXIRA YO'L "
      + "yoqilgan \u2014 lekin u ham javob bermadi.\n"
      + "\u2022 Sahifani yangilab (Ctrl+F5), yana bir marta urinib ko'ring;\n"
      + "\u2022 yoki yashirin oynada oching (Ctrl+Shift+N);\n"
      + "\u2022 yoki antivirusning \u201cveb/HTTPS qalqoni\u201dni vaqtincha o'chiring.";
  }
  if(!google){
    return "Sayt ochilyapti, lekin GOOGLE kirish xizmatiga ulanib bo'lmadi. "
      + "Odatda buni brauzer kengaytmasi (reklama bloklagich, maxfiylik qalqoni) "
      + "yoki antivirusning veb qalqoni to'sadi."
      + (uslub ? '' : ' Sahifa uslublari ham yuklanmagan — demak fayllar to‘sib qo‘yilgan.')
      + "\n• Yashirin oynada (Ctrl+Shift+N) oching — kengaytmalar o‘chadi;"
      + "\n• yoki boshqa brauzerda sinab ko‘ring;"
      + "\n• yoki antivirusning “veb/HTTPS qalqoni”ni vaqtincha o‘chiring;"
      + "\n• kengaytmalarda googleapis.com ga ruxsat bering.";
  }
  if(!uslub){
    return "Sahifa uslublari yuklanmagan — fayllar to‘sib qo‘yilgan bo‘lishi mumkin. "
      + "Yashirin oynada yoki boshqa brauzerda sinab ko‘ring.";
  }
  return "Ulanish tiklandi ko‘rinadi — yana bir marta “Kirish”ni bosing.";
}
async function signInWithRetry(email, password, attemptsLeft){
  try{
    return await firebase.auth().signInWithEmailAndPassword(email, password);
  }catch(err){
    if(err.code === 'auth/network-request-failed' && attemptsLeft > 0){
      await wait(1500);
      return signInWithRetry(email, password, attemptsLeft - 1);
    }
    throw err;
  }
}

/* ==================================================================
   KIRISH QULFI — 5 DAQIQADA 3 MARTA URINISH
   ------------------------------------------------------------------
   Urinishlar SERVERDA sanaladi (netlify/functions/admin-login-guard.js
   + lib/kirishQulf.js), ya'ni sahifani yangilash, "Incognito" oynasi
   yoki brauzer xotirasini tozalash bilan qulfni aylanib o'tib
   bo'lmaydi. Hisob ham LOGIN, ham IP bo'yicha yuritiladi.
   3-chi xato parolda hisob 5 daqiqaga qulflanadi va adminning
   Telegram botiga darhol xabar ketadi.
   ================================================================== */
let qulfTimer = null;
async function qulfSoragich(action, login){
  try{
    const r = await fetch('/.netlify/functions/admin-login-guard', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, login: login || '' })
    });
    return await r.json();
  }catch(e){ return { ok: true, qulf: false, qoldiMs: 0, qolganUrinish: 3 }; }
}

/* Qulf vaqti tugaguncha tugma o'chiq turadi va sanoq ko'rinadi */
function qulfSanoq(qoldiMs){
  const btn = document.getElementById('loginBtn');
  clearInterval(qulfTimer);
  let qoldi = Math.ceil(Number(qoldiMs) / 1000);
  const chiz = ()=>{
    if(qoldi <= 0){
      clearInterval(qulfTimer);
      btn.disabled = false;
      loginTugmaMatn('Kirish', false);
      loginError.style.display = 'none';
      return;
    }
    const d = Math.floor(qoldi / 60), q = qoldi % 60;
    loginError.textContent = 'Qayta urinish: ' +
      (d ? d + ':' + String(q).padStart(2, '0') : q + ' soniya');
    loginError.style.display = 'block';
    btn.disabled = true;
    loginTugmaMatn('Kutilmoqda…', false);
    qoldi--;
  };
  chiz();
  qulfTimer = setInterval(chiz, 1000);
}

/* ==================================================================
   PANELNI OCHISH (V132)
   ------------------------------------------------------------------
   Ilgari bu qadamlar faqat `doLogin()` ichida edi. Natijada SAHIFA
   YANGILANSA (F5 yoki "qayta yuklash") panel baribir login ekranini
   ko'rsatardi — garchi Firebase'da seans o'chmagan bo'lsa ham.
   Admin har yangilaganda login va parolni qaytadan yozishga majbur
   bo'lardi.

   Endi bu qadamlar alohida funksiyaga ajratildi va IKKI joydan
   chaqiriladi:
     * `doLogin()` — admin endigina kirganda;
     * `seansniTikla()` — sahifa yangilanganda, Firebase seansi
       joyida bo'lsa.

   XAVFSIZLIK O'ZGARMADI: dashboard faqat ruxsatlar SERVERDAN
   tasdiqlangandan keyin ko'rsatiladi (`checkAdminClaimStatus()`),
   shu sabab cheklangan sub-admin uchun yopiq bo'limlar bir lahzaga
   ham "chaqnab" ko'rinmaydi. Haqiqiy himoya baribir Firestore
   qoidalari va funksiyalardagi `requireAdmin()` da — bu yer faqat
   ko'rinish.
   ================================================================== */
async function panelniOch(sozlama){
  const yangiKirish = !!(sozlama && sozlama.yangiKirish);
  const authGate = document.getElementById('authGateScreen');
  if(loginScreen) loginScreen.style.display = 'none';
  if(authGate) authGate.style.display = 'flex';
  await loadLastSeen();
  // ism va ruxsatlarni birinchi o'rnatamiz — Seanslar yozuvi to'g'ri ism
  // bilan yozilsin, applyAccessControl() shu yerda ishlaydi
  await checkAdminClaimStatus();
  if(authGate) authGate.style.display = 'none';
  dashboard.style.display = 'block';
  /* Seans jurnaliga FAQAT haqiqiy kirish yoziladi. Sahifani yangilash
     "yangi kirish" emas — aks holda jurnal bir kunda o'nlab keraksiz
     yozuv bilan to'lardi. */
  if(yangiKirish) recordSession();
  if(hasFeaturePerm('numbers')) refreshNumbers();
  if(hasFeaturePerm('orders')) refreshOrders();
  refreshDashboardPane();
  if(hasFeaturePerm('watch') && document.getElementById('watchNotifyIdList')) loadWatchNotifyIds();
  if(hasFeaturePerm('vazifalar')) startVazifalarWatch();
  if(hasFeaturePerm('vakansiya')) loadJobApplications();
  // 10 daqiqalik avtomatik seans tugashi (startSessionTimer) so'rov
  // bo'yicha OLIB TASHLANDI — endi admin faol ishlatmasa ham saytdan
  // avtomatik chiqarilmaydi.
  startVisitorTracking();
}

/* ------------------------------------------------------------------
   SEANSNI TIKLASH — sahifa yangilanganda
   Firebase Auth seansni brauzerda O'ZI saqlaydi (LOCAL persistence),
   lekin uni O'QISH asinxron: sahifa ochilgan lahzada
   `firebase.auth().currentUser` hali `null` bo'ladi. Shuning uchun
   `onAuthStateChanged` kutiladi — aks holda panel "kirmagan" deb
   o'ylab login ekranini ko'rsatib qo'yardi (aynan shu xato edi).
   Kutilayotganda login ekrani EMAS, "Ruxsatlar tekshirilmoqda..."
   ekrani turadi — admin bir lahzaga bo'lsa ham login formasini
   ko'rmaydi.
   ------------------------------------------------------------------ */
(function seansniTikla(){
  if(typeof firebase === 'undefined' || !firebase.auth) return;
  const authGate = document.getElementById('authGateScreen');

  /* Seans brauzerda saqlansin (standart holat shu, lekin ataylab
     yozib qo'yamiz — kelajakda kimdir o'zgartirib qo'ymasin). */
  try{
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  }catch(e){}

  /* Dastlab login ekranini yashirib turamiz — Firebase javobini
     kutyapmiz. Agar seans yo'q bo'lsa, darhol qaytariladi. */
  let hal = false;
  if(loginScreen) loginScreen.style.display = 'none';
  if(authGate) authGate.style.display = 'flex';

  /* Firebase javob bermay qolsa (internet yo'q, CDN to'silgan) —
     3 soniyadan keyin login ekranini ko'rsatamiz, admin kutib
     qolmasin. */
  const himoya = setTimeout(()=>{
    if(hal) return;
    hal = true;
    if(authGate) authGate.style.display = 'none';
    if(loginScreen) loginScreen.style.display = 'block';
  }, 3000);

  const uzil = firebase.auth().onAuthStateChanged(async (user)=>{
    if(hal && !user) return;
    hal = true;
    clearTimeout(himoya);
    try{ uzil(); }catch(e){}
    if(user){
      try{
        await panelniOch({ yangiKirish: false });
      }catch(err){
        console.error('Seansni tiklashda xato:', err);
        if(authGate) authGate.style.display = 'none';
        if(loginScreen) loginScreen.style.display = 'block';
        if(loginError){
          loginError.textContent = "Seansni tiklab bo'lmadi. Qaytadan kiring.";
          loginError.style.display = 'block';
        }
      }
    }else{
      if(authGate) authGate.style.display = 'none';
      if(loginScreen) loginScreen.style.display = 'block';
    }
  });
})();

async function doLogin(){
  const btn = document.getElementById('loginBtn');
  const authGate = document.getElementById('authGateScreen');
  const btnOrigText = loginTugmaMatnOl();
  const loginNomi = (usernameInput.value || '').trim().toLowerCase();

  btn.disabled = true;
  loginTugmaMatn('Ulanmoqda…', true);

  /* 0-qadam: kirish yo'li tanlanganini kutamiz (V99 — qarang:
     AUTH_TAYYOR). Google manzili to'silgan kompyuterlarda bu yerda
     zaxira yo'l allaqachon yoqilgan bo'ladi. */
  try{ await window.AUTH_TAYYOR; }catch(e){}

  /* 1-qadam: qulflangan bo'lsa Firebase'ga UMUMAN murojaat qilinmaydi */
  const oldin = await qulfSoragich('tekshir', loginNomi);
  if(oldin && oldin.qulf){
    qulfSanoq(oldin.qoldiMs);
    return;
  }

  try{
    await signInWithRetry(loginToEmail(usernameInput.value), passwordInput.value, 2);
    qulfSoragich('ok', loginNomi);          // hisoblagich tozalanadi
    loginError.style.display = 'none';
    loginScreen.style.display = 'none';
    // XAVFSIZLIK: dashboard HALI ko'rsatilmaydi — avval ruxsatlar
    // serverdan tasdiqlanadi (quyida), FAQAT shundan keyin, allaqachon
    // to'g'ri bo'limlar yashirilgan holatda birinchi marta ko'rsatiladi.
    // Shu bilan cheklangan sub-admin uchun yopiq bo'limlar hech qachon,
    // hatto bir lahzaga ham "chaqnab" ko'rinmaydi.
    await panelniOch({ yangiKirish: true });
  }catch(err){
    // Firebase'ning haqiqiy sababini ko'rsatamiz — "noto'g'ri" degan umumiy
    // matn bilan nima bo'lganini aniqlab bo'lmas edi (parolmi, emailmi,
    // tarmoqmi, App Check bloklaganmi).
    /* XAVFSIZLIK VA SODDALIK (V103): ekranda SABAB ko'rsatilmaydi.
       ------------------------------------------------------------
       1) Xavfsizlik: "bunday login yo'q" va "parol noto'g'ri" ni
          ajratib ko'rsatish hujumchiga qaysi loginlar MAVJUDLIGINI
          aytib beradi (user enumeration). Katta xizmatlar shu sabab
          doim bitta umumiy matn ko'rsatadi.
       2) Soddalik: mijozga "auth/firebase-app-check-token-is-invalid"
          kabi texnik matnning keragi yo'q.
       Aniq sabab YO'QOLMAYDI — u brauzer konsoliga yoziladi va
       tekshiruv sahifasi (/tekshiruv.html) uni batafsil ko'rsatadi. */
    const UMUMIY = "Kirib bo'lmadi. Login va parolni tekshirib, qayta urining.";
    /* Parol/login xatosi bo'lsa — urinish serverda hisoblanadi.
       Tarmoq xatosi "urinish" emas: internet uzilganda odamni
       qulflab qo'ymaslik kerak. */
    const APPCHECK_XATO = err.code === 'auth/firebase-app-check-token-is-invalid'
                       || err.code === 'auth/firebase-app-check-token-is-expired';
    /* Parol xatosi EMAS bo'lgan holatlar urinish sifatida hisoblanmaydi —
       aks holda odam tarmoq/himoya muammosi sabab qulflanib qolardi. */
    const hisoblanadi = err.code !== 'auth/network-request-failed'
                     && err.code !== 'auth/unauthorized-domain'
                     && !APPCHECK_XATO;
    if(hisoblanadi){
      const n = await qulfSoragich('xato', loginNomi);
      if(n && n.qulf){ qulfSanoq(n.qoldiMs); return; }
      loginError.textContent = UMUMIY +
        (n && n.qolganUrinish != null ? '  \u00B7 qolgan urinish: ' + n.qolganUrinish : '');
      loginError.style.display = 'block';
      console.error('Login xatosi:', err.code, err.message);
      btn.disabled = false;
      loginTugmaMatn(btnOrigText, false);
      return;
    }
    loginError.textContent = UMUMIY;
    loginError.style.display = 'block';
    loginError.style.whiteSpace = 'pre-line';     /* tashxis qatorma-qator */
    console.error('Login xatosi:', err.code, err.message);

    /* TARMOQ xatosida — aniq sababni topib, ekranga yozamiz.
       (Qarang: tarmoqTashxis — saytning o'zi, server funksiyasi va
       Google kirish xizmati alohida-alohida tekshiriladi.) */
    /* BOT HIMOYASI (App Check) xatosi — sabab faqat KONSOLGA yoziladi,
       ekranda esa umumiy matn turadi (yuqoridagi izohga qarang). */
    if(APPCHECK_XATO){
      appCheckTashxis().then(sabab=>{
        console.warn('Kirish to\'xtadi — bot himoyasi (App Check).\n' + sabab
          + '\nBatafsil tekshiruv: /tekshiruv.html');
      }).catch(()=>{});
      loginError.textContent = UMUMIY;
      loginError.style.display = 'block';
      btn.disabled = false;
      loginTugmaMatn(btnOrigText, false);
      return;
    }

    if(err.code === 'auth/network-request-failed'){
      /* V99: avval ZAXIRA YO'Lni sinab ko'ramiz. Tekshiruv "Google
         ochiq" degan bo'lsa-yu, kirish baribir tarmoq xatosi bersa —
         demak to'siq boshqacha ishlayapti. Belgini saqlab, sahifani
         bir marta yangilaymiz: keyingi ochilishda so'rov saytning
         o'zi orqali ketadi va kirish ishlaydi.
         (Yangilash shart, chunki Firebase yo'lni faqat birinchi
         so'rovdan OLDIN o'zgartirishga ruxsat beradi.) */
      if(!window.AUTH_ZAXIRA && location.protocol !== 'file:'){
        let qayta = false;
        try{ qayta = sessionStorage.getItem('vr_auth_zaxira_qayta') !== '1'; }catch(e){ qayta = false; }
        if(qayta){
          try{
            localStorage.setItem(AUTH_ZAXIRA_KALIT, '1');
            sessionStorage.setItem('vr_auth_zaxira_qayta', '1');   // faqat bir marta
          }catch(e){}
          loginError.textContent = "Ulanish yo'li almashtirilmoqda \u2014 sahifa yangilanadi.\n"
            + "Keyin parolni yana bir marta kiriting.";
          loginError.style.display = 'block';
          setTimeout(()=> location.reload(), 1200);
          return;
        }
      }
      try{
        const sabab = await tarmoqTashxis();
        console.warn("Kirish to'xtadi — tarmoq.\n" + sabab
          + "\nBatafsil tekshiruv: /tekshiruv.html");
      }catch(e){ /* tashxis ham ishlamasa — mayli */ }
    }
  }
  btn.disabled = false;
  loginTugmaMatn(btnOrigText, false);
}

/* XAVFSIZLIK TEKSHIRUVI: tizimga kirgan hisobda HAQIQIY admin huquqi
   (custom claim) bor-yo'qligini tekshiradi. Agar yo'q bo'lsa — bu hisob
   Firestore'dagi hech qanday admin ma'lumotini (buyurtmalar, raqamlar
   qo'shish/o'chirish va h.k.) ko'ra/o'zgartira olmaydi, chunki
   firestore.rules endi shu huquqni talab qiladi. Ekranda katta,
   ko'zga tashlanadigan ogohlantirish ko'rsatamiz — aks holda admin
   nega hech narsa yuklanmayotganini tushunmay qolishi mumkin edi. */
// Joriy tizimga kirgan admin haqida ma'lumot — boshqa joylarda (masalan
// seans yozuvlarida ism ko'rsatish uchun) ishlatiladi.
window.CURRENT_ADMIN_NAME = '';

/* Sidebar'dagi bo'limlarni joriy adminning HAQIQIY (server tomonidan
   tasdiqlangan) ruxsatlariga qarab ko'rsatadi/yashiradi. Bu — shunchaki
   "chiroyli" UI emas: haqiqiy himoya firestore.rules va Netlify
   funksiyalarida (requireAdmin feature tekshiruvi) bo'ladi, bu yerda esa
   ruxsati yo'q admin uchun tugmalarni umuman ko'rsatmay, chalkashlikni
   oldini olamiz. */
/* BO'LIM -> RUXSAT KALITI xaritasi.
   Ba'zi bo'limlar alohida ruxsat sifatida yaratilmagan — ular o'ziga eng
   yaqin bo'limning kalitiga bog'lanadi. Bu yerdagi kalit SERVER
   tekshiradigan kalit bilan BIR XIL bo'lishi shart, aks holda menyuda
   ko'rinib, serverda rad etiladigan bo'lim paydo bo'ladi:
     uzex         -> admin-uzex-search.js  requireAdmin({feature:'watch'})
     bazaraqam    -> raqamlar bilan bir xil
     kuntavsiyasi -> aksiya bilan bir xil turdagi kontent
     kanalpost    -> admin-post-rasm.js    requireAdmin({feature:'numbers'})
   `stories` esa o'z ruxsatiga ega (MGMT_FEATURE_LABELS ichida). */
const TAB_PERM_MAP = {
  uzex: 'watch',
  bazaraqam: 'numbers',
  kuntavsiyasi: 'aksiya',
  kanalpost: 'numbers',
  /* "Sotuvchilar" — server admin-sellers.js da 'numbers' tekshiradi */
  sellers: 'numbers',
  /* "Statistika" — Seanslar bilan bir xil turdagi hisobot bo'limi */
  stats: 'sessions'
};

// Joriy adminning ruxsatlari — boshqa joylarda (masalan login paytida
// qaysi bo'limlarni yuklashni hal qilishda) qayta ishlatish uchun saqlanadi.
window.CURRENT_ADMIN_UID = '';
window.CURRENT_ADMIN_IS_SUPER = false;
window.CURRENT_ADMIN_PERMS = null; // null = eski/cheklovsiz admin (hammasiga ruxsat)
function hasFeaturePerm(key){
  if(window.CURRENT_ADMIN_IS_SUPER) return true;
  if(!window.CURRENT_ADMIN_PERMS) return true; // eski/cheklovsiz admin
  return window.CURRENT_ADMIN_PERMS[key] === 1 || window.CURRENT_ADMIN_PERMS[key] === true;
}

function applyAccessControl(whoami){
  const isSuper = whoami.superAdmin === true;
  const perms = whoami.perms; // null = eski/cheklovsiz admin
  window.CURRENT_ADMIN_IS_SUPER = isSuper;
  window.CURRENT_ADMIN_PERMS = perms || null;
  window.CURRENT_ADMIN_UID = whoami.uid || '';

  const mgmtBtn = document.getElementById('mgmtTabBtn');
  if(mgmtBtn) mgmtBtn.style.display = isSuper ? 'flex' : 'none';
  const mgmtDivider = document.getElementById('mgmtTabDivider');
  if(mgmtDivider) mgmtDivider.style.display = isSuper ? 'flex' : 'none';

  // "Eski shartnomalarni moslashtirish" — butun bazaga ta'sir qiluvchi
  // bir martalik texnik amal, shu sabab (server ham buni bloklaydi, lekin
  // UI'da ham) faqat bosh adminga ko'rsatamiz.
  const migrateCard = document.getElementById('migrateContractsBtn') ? document.getElementById('migrateContractsBtn').closest('.settings-form') : null;
  if(migrateCard) migrateCard.style.display = isSuper ? '' : 'none';

  /* Bosh admin yoki cheklovsiz admin — avval yashirilgan bo'lsa ham
     hammasini QAYTA ochamiz. (Funksiya odatda sahifada bir marta
     ishlaydi, lekin ikki marta chaqirilsa eski `display:none` qolib
     ketardi — sinovda aniqlandi.) */
  if(isSuper || !perms){
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      if(tab.dataset.tab !== 'management') tab.style.display = '';
    });
    document.querySelectorAll('.tab-group').forEach(g => { g.style.display = ''; });
  }

  if(!isSuper && perms){
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      const key = tab.dataset.tab;
      if(key === 'management') return; // allaqachon yashirilgan
      if(key === 'dashboard') return; // boshqaruv paneli — barcha adminlarga ochiq umumiy ko'rinish
      // "UZEX auksion" alohida ruxsat sifatida yaratilmagan — u "Baza raqam"
      // (watch) bilan bir xil turdagi qidiruv vositasi, shuning uchun
      // SERVER TOMONI ham aynan shu ruxsatni tekshiradi
      // (admin-uzex-search.js -> requireAdmin(..., {feature:'watch'})).
      // Ikkalasi bir xil kalitga bog'langani muhim: aks holda menyuda
      // ko'rinib, serverda rad etiladigan bo'lim paydo bo'lardi.
      /* Bo'lim <-> ruxsat xaritasi. MUHIM: xaritada YO'Q bo'lim cheklangan
         admin uchun JIM YO'QOLADI — aynan shu "Kanal posti" bilan bo'ldi
         (yangi bo'lim qo'shildi, ruxsat kaliti esa yo'q edi). Endi xarita
         aniq yozilgan va noma'lum kalit konsolga xabar beradi. */
      const permKey = TAB_PERM_MAP[key] || key;
      /* Kalit umuman MAVJUD ruxsatlar ro'yxatida bormi (MGMT_FEATURE_LABELS
         — bosh admin ruxsat beradigan ro'yxat). Yo'q bo'lsa, bu bo'lim
         HECH QANDAY adminga ko'rinmaydi — shuni konsolga aytamiz. */
      if(typeof MGMT_FEATURE_LABELS === 'object' && !(permKey in MGMT_FEATURE_LABELS)){
        console.warn("Bo'lim uchun ruxsat kaliti topilmadi: " + key + ' -> ' + permKey
          + " - cheklangan adminlarda yashirin qoladi (TAB_PERM_MAP ga qo'shing)");
      }
      const allowed = perms[permKey] === 1 || perms[permKey] === true;
      tab.style.display = allowed ? '' : 'none';
    });
    // Agar hozir faol bo'lim (odatda "Raqamlar") shu adminga yopiq bo'lsa —
    // ko'rinadigan birinchi bo'limga avtomatik o'tkazamiz. MUHIM: faqat
    // tugmani yashirish YETARLI EMAS — pane (bo'lim tarkibi) alohida
    // "active" bo'lib qoladi va tugma yashirilgan bo'lsa ham ko'rinib
    // qolishi mumkin edi, shu sabab bu yerda ANIQ boshqaramiz.
    // Bo'limlari butunlay yopiq bo'lgan guruh sarlavhasi ham ko'rinmasin.
    document.querySelectorAll('.tab-group').forEach(group => {
      const anyVisible = Array.from(group.querySelectorAll('.tab-group-body .tab'))
        .some(t => t.style.display !== 'none');
      group.style.display = anyVisible ? '' : 'none';
    });
    try{ if(typeof refreshTabGroupBadges === 'function') refreshTabGroupBadges(); }catch(e){}

    const activeTab = document.querySelector('.tab.active');
    if(activeTab && activeTab.style.display === 'none'){
      const firstVisible = Array.from(document.querySelectorAll('.tab[data-tab]')).find(t => t.style.display !== 'none');
      if(firstVisible){
        firstVisible.click();
      } else {
        // Hech qanday bo'limga ruxsat yo'q — barcha panellarni yashirib,
        // tushunarli xabar ko'rsatamiz (aks holda "Raqamlar" bo'limi
        // tugmasi yashirin bo'lsa ham tarkibi ko'rinib qolar edi).
        document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
        const contentInner = document.querySelector('.content-inner');
        let noAccessBox = document.getElementById('noAccessBox');
        if(!noAccessBox && contentInner){
          noAccessBox = document.createElement('div');
          noAccessBox.id = 'noAccessBox';
          noAccessBox.className = 'wt-empty';
          noAccessBox.style.cssText = 'margin-top:20px;padding:30px;';
          noAccessBox.textContent = "Hozircha sizga hech qanday bo'limga ruxsat berilmagan. Bosh admin bilan bog'laning.";
          contentInner.appendChild(noAccessBox);
        }
      }
    }
  }
}

async function checkAdminClaimStatus(){
  try{
    const idToken = await firebase.auth().currentUser.getIdToken();
    const res = await fetch('/.netlify/functions/admin-whoami', {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    const data = await res.json();
    if(!data.admin){
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c0392b;color:#fff;padding:14px 16px;text-align:center;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3);';
      banner.textContent = "⚠️ Diqqat: bu hisobda hali ADMIN huquqi (custom claim) yo'q — buyurtmalar, raqamlar va boshqa ma'lumotlar YUKLANMAYDI. admin-grant-role.js orqali huquq bering, so'ng qayta tizimga kiring.";
      document.body.appendChild(banner);
      return;
    }
    window.CURRENT_ADMIN_NAME = (firebase.auth().currentUser && firebase.auth().currentUser.displayName) || data.email || '';
    applyAccessControl(data);
  }catch(e){ console.error('Admin huquqi tekshirilmadi:', e); }
}
document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  stopSessionTimer();
  await recordLogout(); // hali tizimga kirgan holatda — signOut()dan OLDIN yozilishi shart
  if(ordersUnsubscribe){ ordersUnsubscribe(); ordersUnsubscribe = null; }
  if(visitorTrackingTimer){ clearInterval(visitorTrackingTimer); visitorTrackingTimer = null; }
  await firebase.auth().signOut();
  dashboard.style.display = 'none';
  loginScreen.style.display = 'block';
  usernameInput.value = '';
  passwordInput.value = '';
});

document.getElementById('bellBtn').addEventListener('click', ()=>{
  document.querySelector('.tab[data-tab="orders"]').click();
});
document.getElementById('taskBellBtn').addEventListener('click', ()=>{
  document.querySelector('.tab[data-tab="vazifalar"]').click();
});

/* ==================================================================
   YON MENYU GURUHLARI — ochish/yopish
   ------------------------------------------------------------------
   Yigirmata bo'lim bitta uzun ro'yxatda turgani sabab menyu chalkash
   edi. Endi:
     * bo'limlar oltita guruhga ajratilgan;
     * sahifa ochilganda FAQAT hozir ishlatilayotgan bo'lim turgan guruh
       ochiq bo'ladi, qolganlari yig'ilgan;
     * admin qaysi guruhni ochgan bo'lsa, u brauzerda eslab qolinadi;
     * yopiq guruh ichida bildirishnoma (masalan bajarilmagan vazifalar
       soni) bo'lsa, u guruh sarlavhasida ko'rinadi — shu sabab hech
       narsa e'tibordan chetda qolmaydi.
   ================================================================== */
const TAB_GROUP_KEY = 'vipAdminTabGroups';

function tabGroupsLoad(){
  try{
    const raw = localStorage.getItem(TAB_GROUP_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return (v && typeof v === 'object') ? v : null;
  }catch(e){ return null; }
}
function tabGroupsSave(state){
  try{ localStorage.setItem(TAB_GROUP_KEY, JSON.stringify(state)); }catch(e){}
}

/* Yopiq guruhlarda "o'qilmagan" belgilar yig'indisini sarlavhaga chiqaramiz. */
function refreshTabGroupBadges(){
  document.querySelectorAll('.tab-group').forEach(group => {
    const badgeEl = group.querySelector('.tgh-badge');
    if(!badgeEl) return;
    let sum = 0;
    group.querySelectorAll('.tab-group-body .tab').forEach(tab => {
      if(tab.style.display === 'none') return;
      tab.querySelectorAll('.task-tab-badge, .tab-badge, .nav-badge').forEach(b => {
        if(b.style.display === 'none') return;
        const n = parseInt((b.textContent || '').replace(/\D/g, ''), 10);
        if(Number.isFinite(n)) sum += n;
      });
    });
    const collapsed = group.classList.contains('is-collapsed');
    if(collapsed && sum > 0){
      badgeEl.textContent = sum > 99 ? '99+' : String(sum);
      badgeEl.hidden = false;
    }else{
      badgeEl.hidden = true;
    }
  });
}

function setTabGroupOpen(group, open, persist){
  group.classList.toggle('is-collapsed', !open);
  const head = group.querySelector('.tab-group-head');
  if(head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  if(persist){
    const state = tabGroupsLoad() || {};
    state[group.dataset.group] = open ? 1 : 0;
    tabGroupsSave(state);
  }
  refreshTabGroupBadges();
}

/* Biror bo'lim tanlanganda uning guruhi albatta ochiq bo'lsin. */
function openGroupOfTab(tab){
  const group = tab && tab.closest ? tab.closest('.tab-group') : null;
  if(group && group.classList.contains('is-collapsed')) setTabGroupOpen(group, true, true);
}


/* ==================================================================
   SAHIFA BOSHI VA QO'SHISH OYNALARI
   Bu blok HTML'ni qayta yozmaydi — mavjud formalarni DOM'da ko'chirib,
   oyna ichiga joylashtiradi. Element ko'chirilganda unga ilgari
   qo'yilgan hodisa tinglovchilari saqlanib qoladi, shuning uchun
   "Saqlash"/"Qo'shish" tugmalari avvalgidek ishlayveradi.
   ================================================================== */
(function yangiQobiq(){

  const ICO = {
    raqam: '<svg viewBox="0 0 24 24"><path d="M6 3h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z"/></svg>',
    aksiya: '<svg viewBox="0 0 24 24"><path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1.5 1 2 3 2 4.5A5.5 5.5 0 0 1 6 14.5C6 9 12 7 12 2z"/></svg>',
    kredit: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.4"/><path d="M3 10h18M7 15h4"/></svg>',
    plus:  '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    yopish:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  const oynalar = {};

  /* Berilgan elementni oynaga ko'chiradi va oynani qaytaradi */
  function oynaYasa(kalit, el, nom, izoh, ikona){
    if(!el) return null;
    const back = document.createElement('div');
    back.className = 'vm-back';
    back.innerHTML =
      '<div class="vm" role="dialog" aria-modal="true" aria-label="' + nom + '">' +
        '<div class="vm-head">' +
          '<span class="vm-ico">' + (ikona || ICO.plus) + '</span>' +
          '<div><h3>' + nom + '</h3><p>' + izoh + '</p></div>' +
          '<button type="button" class="vm-x" aria-label="Yopish">' + ICO.yopish + '</button>' +
        '</div>' +
        '<div class="vm-body"></div>' +
      '</div>';
    document.body.appendChild(back);
    back.querySelector('.vm-body').appendChild(el);
    el.style.display = '';          // eski "display:none" bo'lsa ochamiz

    const yop = () => { back.classList.remove('is-open'); document.body.style.overflow = ''; };
    back.querySelector('.vm-x').addEventListener('click', yop);
    back.addEventListener('click', (e) => { if(e.target === back) yop(); });
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && back.classList.contains('is-open')) yop();
    });

    const obj = {
      el: back,
      och(){
        back.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        const birinchi = back.querySelector('input,select,textarea');
        if(birinchi) setTimeout(()=>{ try{ birinchi.focus(); }catch(e){} }, 60);
      },
      yop
    };
    oynalar[kalit] = obj;
    return obj;
  }

  /* Bo'lim boshiga sarlavha qo'shadi */
  function sahifaBoshi(pane, nom, izoh, amallar){
    if(!pane || pane.querySelector(':scope > .page-head')) return;
    const head = document.createElement('div');
    head.className = 'page-head';
    head.innerHTML =
      '<div class="ph-txt"><h1>' + nom + '</h1><p>' + izoh + '</p></div>' +
      '<div class="ph-acts"></div>';
    const box = head.querySelector('.ph-acts');
    (amallar || []).forEach(a => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ph-btn' + (a.asosiy ? ' is-primary' : '');
      b.innerHTML = (a.ikona || ICO.plus) + '<span>' + a.nom + '</span>';
      b.addEventListener('click', a.bos);
      box.appendChild(b);
    });
    // ESLATMA: avval shu yerda har bir sahifa boshida o'ng tomonda bitta
    // harfli (masalan "R") dumaloq admin avatari chiqardi — foydalanuvchi
    // iltimosiga ko'ra BUTUNLAY OLIB TASHLANDI.
    pane.insertBefore(head, pane.firstChild);
  }

  /* Forma muvaffaqiyatli saqlangach oynani o'zi yopadi: belgilangan
     maydon bo'shab qolsa — demak saqlandi (kod shunday tozalaydi). */
  function saqlangachYop(tugma, maydon, oyna){
    if(!tugma || !maydon || !oyna) return;
    tugma.addEventListener('click', () => {
      let n = 0;
      const t = setInterval(() => {
        n++;
        if(!maydon.value){ clearInterval(t); oyna.yop(); }
        else if(n > 20) clearInterval(t);     // ~4 soniya kutamiz
      }, 200);
    });
  }

  const $ = (id) => document.getElementById(id);

  /* ---------------- RAQAMLAR ---------------- */
  (function(){
    const pane = $('paneNumbers');
    if(!pane) return;
    const form = pane.querySelector('.add-form');
    const bulkT = $('bulkToggle'), bulkB = $('bulkBox');
    if(!form) return;

    const quti = document.createElement('div');
    form.parentNode.insertBefore(quti, form);
    quti.appendChild(form);
    if(bulkT) quti.appendChild(bulkT);
    if(bulkB) quti.appendChild(bulkB);

    const oyna = oynaYasa('raqam', quti, "Raqam qo'shish",
      "Saqlaganingizdan keyin raqam saytda va ilovada darhol ko'rinadi.", ICO.raqam);

    sahifaBoshi(pane, 'Raqamlar',
      "Sotuvdagi barcha raqamlar, narxlari va holati. Bu yerdagi o'zgarishlar saytda darhol ko'rinadi.",
      [{ nom: "Raqam qo'shish", asosiy: true, bos: () => oyna.och() }]);

    saqlangachYop($('addNumberBtn'), $('newNumber'), oyna);
  })();

  /* ---------------- AKSIYA ---------------- */
  (function(){
    const pane = $('paneAksiya');
    const form = $('aktFormWrap');
    const tugma = $('aktAddToggleBtn');
    if(!pane || !form) return;

    const oyna = oynaYasa('aksiya', form, 'Aksiya e\'lon qilish',
      "Mavjud raqamga vaqtinchalik chegirma qo'yiladi. Muddat tugaganda narx o'zi eski holiga qaytadi.", ICO.aksiya);

    // Eski tugma endi oynani ochadi (o'zining eski ochish/yopish mantig'i o'rniga)
    if(tugma){
      const yangi = tugma.cloneNode(true);     // eski tinglovchilarni olib tashlaymiz
      tugma.parentNode.replaceChild(yangi, tugma);
      yangi.addEventListener('click', () => oyna.och());
    }
    sahifaBoshi(pane, 'Aksiya',
      "Chegirmali raqamlar. Faol aksiya mijoz saytida teskari sanoq bilan ko'rinadi.",
      [{ nom: 'Yangi aksiya', asosiy: true, ikona: ICO.plus, bos: () => oyna.och() }]);
    saqlangachYop($('aktSaveBtn'), $('aktNewPrice'), oyna);
  })();

  /* ---------------- KREDIT ---------------- */
  (function(){
    const pane = $('paneCredit');
    if(!pane) return;
    const form = pane.querySelector('.settings-form.cr-form-2col');
    if(!form) return;

    const oyna = oynaYasa('kredit', form, 'Yangi kredit shartnomasi',
      "Mijoz ma'lumotlari va to'lov jadvali. Saqlangach shartnoma PDF holida yuklab olinadi.", ICO.kredit);

    sahifaBoshi(pane, 'Kredit',
      "Bo'lib to'lash shartnomalari. Muddati o'tganlar eng tepada turadi.",
      [{ nom: 'Shartnoma', asosiy: true, bos: () => oyna.och() }]);

    saqlangachYop($('addCreditBtn'), $('crName'), oyna);

    // "Excel hisobot" va "Xavfsizlik" qutilari kundalik ish emas — ular
    // ro'yxatdan YUQORIDA turib, eng muhim narsani (kim qarzdor) pastga
    // surib yuborardi. Endi bo'limning oxiriga ko'chadi.
    const tools = pane.querySelector('.cr-tools-grid');
    if(tools) pane.appendChild(tools);
  })();


  /* ---------------- QOLGAN BARCHA BO'LIMLAR ----------------
     Har bir bo'lim bir xil tartibda boshlansin: nomi, bir qator izoh,
     ostida ingichka chiziq. Shunda qaysi bo'limda ekaningiz va u nima
     qilishi birinchi qarashdayoq ma'lum bo'ladi. */
  (function(){
    const BOLIMLAR = [
      ['paneOrders',       'Buyurtmalar',    "Saytdan kelgan buyurtmalar va ularning holati. Yangi buyurtma kelganda qo'ng'iroq belgisi yonadi."],
      ['paneZakaz',        'Zakaz',          "Mijoz so'ragan, lekin bazada yo'q raqamlar. Narx belgilab javob berasiz."],
      ['paneFinance',      'Kirim-chiqim',   "Pul harakati: tushum, xarajat va qoldiq."],
      ['panePersonalbase', 'Shaxsiy baza',   "Qo'lda kiritilgan mijozlar va ular bilan ishlash tarixi."],
      ['paneAi',           'AI yordamchi',   "Panel bilan oddiy tilda gaplashing: narxni o'zgartirish, hisobot olish, raqam qidirish."],
      ['paneInstagram',    'Instagram AI',   "Instagram'ga yozgan odamlarga avtomatik javob beradi. Bilim bazasini shu yerdan to'ldirasiz."],
      ['paneTelegramai',   'Telegram AI',    "Telegram botdagi savollarga avtomatik javob."],
      ['paneStories',      'Stories',        'Bosh sahifadagi dumaloq lenta: rasm, nomi, ko\'rishlar va yurakchalar.'],
      ['paneVideos',       'Video sharhlar', "Mijozlarning video fikrlari. Saytda \"Mijozlarimiz fikri\" bo'limida chiqadi."],
      ['paneStyles',       'Uslublar',       "Sayt ranglari, shriftlari va umumiy ko'rinishi."],
      ['paneDashboard',    'Boshqaruv paneli', "Umumiy ko'rsatkichlar va so'nggi faoliyat bir joyda."],
      ['paneBazaraqam',    'Baza raqam',     "Barcha manbalardan yig'ilgan xomashyo ro'yxati, operator bo'yicha hisob."],
      ['paneWatch',        'Kuzatuv',        "Mijozlar kutayotgan raqamlar, avtomatik tekshiruv."],
      ['paneUzex',         'UZEX auksion',   "Davlat auksionidagi raqamlarni kuzatish va saqlab qo'yish."],
      ['paneSellers',      'Sotuvchilar',    "Hamkor sotuvchilar (dilerlar): hisob yaratish, tarif, raqamlari va yozishma."],
      ['paneTolov',        "Raqam to'lovi",  "O'zimiz muddatli to'lovga olgan raqamlarning oylik to'lovlari, muddatlari va ogohlantirishlari."],
      ['paneXabarlar',     'Saytga xabar',   "Mijozlarga saytda ko'rinadigan bildirishnoma yuborish: qo'ng'iroqcha va telefon push ko'rinishi."],
      ['paneStats',        'Statistika',     "Qaysi raqamga ko'p qiziqishyapti va mijozlar nimani qidirib topolmayapti."],
      ['paneSessions',     'Seanslar',       "Panelga kim, qachon va qaysi qurilmadan kirgani."],
      ['paneVazifalar',    'Vazifalar',      "Xodimlarga topshiriqlar, muddatlari va bajarilishi."],
      ['paneVakansiya',    'Vakansiya',      "Ish e'lonlari va nomzodlardan kelgan arizalar."],
      ['paneOperators',    'Operatorlar',    "Qaysi operator raqamlari saytda ko'rinadi va ularning sozlamalari."],
      ['paneSettings',     'Sozlamalar',     "Umumiy sozlamalar: parol, bo'lib to'lash foizlari, aloqa ma'lumotlari."],
      ['paneManagement',   'Boshqaruv',      "Adminlar, ularning huquqlari va kirish nazorati."]
    ];
    BOLIMLAR.forEach(([id, nom, izoh]) => {
      const pane = document.getElementById(id);
      if(pane) sahifaBoshi(pane, nom, izoh, []);
    });

    // Boshqaruv paneli sarlavhasiga "Yangilash" tugmasi va oxirgi
    // yangilangan vaqt ko'rsatkichi qo'shiladi (mockupda yo'q, lekin
    // adminga real foydali — ma'lumot qachon olinganini ko'rsatadi).
    const dashActs = document.querySelector('#paneDashboard .ph-acts');
    if(dashActs){
      const updatedAt = document.createElement('span');
      updatedAt.className = 'dash-updated-at';
      updatedAt.id = 'dashUpdatedAt';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dash-refresh-btn';
      btn.id = 'dashRefreshBtn';
      btn.innerHTML = ICONS.refresh + '<span>Yangilash</span>';
      btn.addEventListener('click', async () => {
        if(btn.classList.contains('spinning')) return;
        btn.classList.add('spinning');
        try{ await refreshDashboardPane(); } finally {
          setTimeout(() => btn.classList.remove('spinning'), 400);
        }
      });
      dashActs.insertBefore(updatedAt, dashActs.firstChild);
      dashActs.insertBefore(btn, dashActs.firstChild);
    }
  })();


  /* ==================================================================
     QOBIQNI MAKETGA TO'LIQ MOSLASH
     Uchta narsa yetishmayotgan edi:
       1) yon menyu pastida kim kirganini ko'rsatuvchi qator,
       2) yuqorida qidiruv maydoni,
       3) ko'rsatkichlar bo'lim sarlavhasidan PASTDA turishi va
          "hozir saytda" ularning ichiga qo'shilishi.
     ================================================================== */
  (function qobiqniToldir(){

    /* ---- 1. Yon menyu pastidagi foydalanuvchi qatori ---- */
    const aside = document.querySelector('.sidebar');
    const chiqish = document.getElementById('logoutBtn');
    if(aside && chiqish && !aside.querySelector('.sb-user')){
      const row = document.createElement('div');
      row.className = 'sb-user';
      row.innerHTML =
        '<span class="sbu-av">A</span>' +
        '<span class="sbu-txt"><b id="sbUserName">Admin</b><span id="sbUserRole">Boshqaruv paneli</span></span>';
      row.appendChild(chiqish);                 // "Chiqish" tugmasi shu yerga ko'chadi
      chiqish.classList.add('sbu-out');
      chiqish.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M15 17l5-5-5-5M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/></svg>';
      chiqish.title = 'Chiqish';
      aside.appendChild(row);

      // Ism va rol kelgach yozib qo'yamiz (ular keyinroq aniqlanadi)
      let n = 0;
      const t = setInterval(() => {
        n++;
        const ism = (window.CURRENT_ADMIN_NAME || '').trim();
        if(ism){
          const nameEl = document.getElementById('sbUserName');
          const roleEl = document.getElementById('sbUserRole');
          const av = aside.querySelector('.sbu-av');
          const qisqa = ism.split('@')[0];
          if(nameEl) nameEl.textContent = qisqa.charAt(0).toUpperCase() + qisqa.slice(1);
          if(roleEl) roleEl.textContent = window.CURRENT_ADMIN_IS_SUPER ? 'Super admin' : 'Admin';
          if(av) av.textContent = qisqa.charAt(0).toUpperCase();
          clearInterval(t);
        }
        if(n > 40) clearInterval(t);            // ~20 soniya kutamiz
      }, 500);
    }

    /* ESLATMA: avval shu yerda yon menyu tepasidagi "Qidirish..." (⌘K)
       qatorini joriy bo'limning qidiruv maydoniga ulovchi kod bo'lgan —
       foydalanuvchi iltimosiga ko'ra o'sha qidiruv qatori HTML/CSS'dan
       olib tashlandi, shu sabab bu ulash kodi ham endi keraksiz. */

    /* ---- 3. Ko'rsatkichlar: sarlavhadan PASTDA va to'rtinchi katak ---- */
    const ov = document.getElementById('overviewRow');
    const vis = document.querySelector('.visitors-box');
    if(ov && vis && !document.getElementById('ovLiveCard')){
      // "Hozir saytda" alohida quti edi — endi to'rtinchi ko'rsatkich bo'ladi
      const live = document.createElement('div');
      live.className = 'ov-card ov-live';
      live.id = 'ovLiveCard';
      live.innerHTML = '<b id="ovLiveNum">0</b><span>hozir saytda</span><i class="ov-sub" id="ovLiveSub">—</i>';
      ov.appendChild(live);

      function sinxron(){
        const a = document.getElementById('liveVisitors');
        const b = document.getElementById('totalVisitors');
        const n = document.getElementById('ovLiveNum');
        const sub = document.getElementById('ovLiveSub');
        if(a && n) n.textContent = a.textContent;
        if(b && sub) sub.textContent = b.textContent + ' foydalanuvchi jami';
      }
      sinxron();
      setInterval(sinxron, 2000);
      vis.style.display = 'none';
    }

    /* Ko'rsatkichlar chizig'ini faol bo'limning sarlavhasidan keyin qo'yamiz */
    function ovniKochir(){
      const pane = document.querySelector('.pane.active');
      const row = document.getElementById('overviewRow');
      if(!pane || !row) return;
      const head = pane.querySelector(':scope > .page-head');
      if(head) head.insertAdjacentElement('afterend', row);
      else pane.insertBefore(row, pane.firstChild);
    }
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setTimeout(ovniKochir, 30)));
    setTimeout(ovniKochir, 120);

  })();


  /* ---- Yon menyudagi sonlar ----
     Maketda har bo'lim yonida nechta narsa borligi turadi. Bu shunchaki
     bezak emas: menyuga qarabok "Buyurtmalarda 5 ta yangi bor" deb
     bilib olasiz, bo'limma-bo'lim kirib chiqish shart emas. */
  (function menyuSonlari(){
    function qoy(tab, qiymat, ogoh){
      const btn = document.querySelector('.tab[data-tab="' + tab + '"]');
      if(!btn) return;
      let el = btn.querySelector('.tab-count');
      if(!el){
        el = document.createElement('span');
        el.className = 'tab-count';
        btn.appendChild(el);
      }
      const n = Number(qiymat) || 0;
      el.textContent = n > 999 ? '999+' : n;
      el.classList.toggle('is-alert', !!ogoh && n > 0);
      el.style.display = n > 0 ? '' : 'none';
    }

    function yangila(){
      try{
        const raqam = document.getElementById('ovTotalNumbers');
        if(raqam) qoy('numbers', raqam.textContent.replace(/\D/g, ''));

        // Buyurtmalardagi o'qilmaganlar — qo'ng'iroq belgisidagi son
        const bell = document.getElementById('bellBadge');
        if(bell) qoy('orders', bell.textContent.replace(/\D/g, ''), true);

        const task = document.getElementById('taskTabBadge');
        if(task) qoy('vazifalar', task.textContent.replace(/\D/g, ''), true);

        const vac = document.getElementById('vacTabBadge');
        if(vac) qoy('vakansiya', vac.textContent.replace(/\D/g, ''), true);

        // Aksiya va Kredit — ro'yxatdagi qatorlar soni
        const akt = document.getElementById('aktActiveCount');
        if(akt) qoy('aksiya', akt.textContent.replace(/\D/g, ''));

        const kredit = document.querySelectorAll('#creditList .qz-item').length;
        qoy('credit', kredit);
      }catch(e){}
    }
    yangila();
    setInterval(yangila, 3000);
  })();


  /* ==================================================================
     OYNALARNING O'NG USTUNI
     Chap tomonda nima yozsangiz, o'ngda natijasi darhol ko'rinadi:
     raqam saytda qanday chiqishi, bo'lib to'lash qancha bo'lishi,
     shartnoma bo'yicha jami qancha to'lanishi. Bu "saqlab, keyin
     ochib ko'rish" aylanmasini yo'q qiladi — xato saqlanmasdan oldin
     ko'rinadi. */
  (function ongUstun(){
    const OP_RANG = {
      'Beeline':'#FFD400','Ucell':'#8B46A8','Humans':'#1546D6',
      'Mobiuz':'#E5484D','Uzmobile':'#4C84F5','Perfektum':'#2FBF71'
    };
    const pul = (n) => (Number(n)||0).toLocaleString('ru-RU').replace(/,/g,' ');
    const esc = (x) => String(x==null?'':x).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

    /* Oynaga o'ng ustun qo'shadi va yangilovchi funksiyani qaytaradi */
    function ustunQo(kalit, chiz){
      const oyna = oynalar[kalit];
      if(!oyna) return null;
      const vm = oyna.el.querySelector('.vm');
      const body = oyna.el.querySelector('.vm-body');
      if(!vm || !body || vm.querySelector('.vm-side')) return null;

      const wrap = document.createElement('div');
      wrap.className = 'vm-split';
      body.parentNode.insertBefore(wrap, body);
      wrap.appendChild(body);
      const side = document.createElement('div');
      side.className = 'vm-side';
      wrap.appendChild(side);

      const yangila = () => { try{ side.innerHTML = chiz(); }catch(e){ side.innerHTML = ''; } };
      // Har qanday o'zgarishda qayta chizamiz
      body.addEventListener('input', yangila);
      body.addEventListener('change', yangila);
      body.addEventListener('click', () => setTimeout(yangila, 30));
      const eskiOch = oyna.och;
      oyna.och = function(){ eskiOch.call(oyna); yangila(); };
      yangila();
      return yangila;
    }

    /* Sanani o'zbekcha tartibda: 15.10.2027 */
    const sanaMatn = (ts) => {
      const d = new Date(ts); if(isNaN(d)) return '—';
      const q = (x) => String(x).padStart(2, '0');
      return q(d.getDate()) + '.' + q(d.getMonth() + 1) + '.' + d.getFullYear();
    };
    const V = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
    const CH = (id) => { const e = document.getElementById(id); return !!(e && e.checked); };

    /* ---------- RAQAM ---------- */
    ustunQo('raqam', function(){
      const raqam = V('newNumber').trim();
      const op = V('newOperator');
      const narx = Number(V('newPrice')) || 0;
      const vip = V('newTag') === 'vip';
      const usd = V('newCurrency') === 'usd';
      const bolib = CH('newInstallment') && !usd;

      let html = '<div class="vms-t">Saytda shunday ko\'rinadi</div>';
      html += '<div class="vms-card">' +
        '<div class="vms-num">' + (raqam ? esc(raqam) : '—') + '</div>' +
        '<div class="vms-op"><i style="background:' + (OP_RANG[op] || '#6F7F99') + '"></i>' + esc(op) +
          (vip ? ' <span class="tg tg-vip">VIP</span>' : '') + '</div>' +
        '<div class="vms-price">' + (narx ? pul(narx) + (usd ? ' <span>$</span>' : ' <span>so\'m</span>') : 'Narxi kelishiladi') + '</div>' +
        (bolib ? '<div class="vms-sub">Bo\'lib to\'lash mavjud</div>' : '') +
      '</div>';

      if(bolib && narx){
        const f = (id, d) => { const v = Number(V(id)); return Number.isFinite(v) && v > 0 ? v : d; };
        const tarif = [[6, f('installmentRate6', 5)], [12, f('installmentRate12', 10)],
                       [24, f('installmentRate24', 20)], [36, f('installmentRate36', 30)]];
        html += '<div class="vms-t">Bo\'lib to\'lash hisobi</div><div class="vms-tbl">';
        tarif.forEach(([oy, foiz]) => {
          const jami = narx * (1 + foiz / 100);
          html += '<div class="vms-row"><span>' + oy + ' oy · +' + foiz + '%</span><b>' + pul(Math.round(jami / oy)) + '</b></div>';
        });
        html += '<div class="vms-note">Foizlar Sozlamalardan olinadi</div></div>';
      }
      return html;
    });

    /* ---------- AKSIYA ---------- */
    ustunQo('aksiya', function(){
      const yangi = Number(V('aktNewPrice')) || 0;
      const eski = Number(V('aktOldPrice')) || 0;
      const sel = document.getElementById('aktSelectedNumber');
      const raqam = sel && sel.textContent ? sel.textContent.trim().split(/\s{2,}/)[0] : (V('aktNumberSearch') || '—');

      const farq = eski && yangi && eski > yangi ? eski - yangi : 0;
      const foiz = farq ? Math.round(farq / eski * 100) : 0;

      let html = '<div class="vms-t">Saytda shunday ko\'rinadi</div>';
      html += '<div class="vms-card is-sale">' +
        (foiz ? '<div class="vms-badge">AKSIYA −' + foiz + '%</div>' : '') +
        '<div class="vms-num">' + esc(raqam.slice(0, 20)) + '</div>' +
        '<div class="vms-price is-sale">' + (yangi ? pul(yangi) : '—') +
          (farq ? ' <s>' + pul(eski) + '</s>' : '') + '</div>' +
      '</div>';

      html += '<div class="vms-t">Hisob</div><div class="vms-tbl">' +
        '<div class="vms-row"><span>Joriy narx</span><b>' + (eski ? pul(eski) : '—') + '</b></div>' +
        '<div class="vms-row"><span>Aksiya narxi</span><b>' + (yangi ? pul(yangi) : '—') + '</b></div>' +
        '<div class="vms-row"><span>Chegirma</span><b class="is-red">' + (farq ? '−' + pul(farq) : '—') + '</b></div>' +
        '<div class="vms-row"><span>Ulush</span><b class="is-red">' + (foiz ? foiz + '%' : '—') + '</b></div>' +
      '</div>';
      return html;
    });

    /* ---------- KREDIT ---------- */
    ustunQo('kredit', function(){
      const oy = Number(V('crMonths')) || 0;
      const oylik = Number(V('crMonthly')) || 0;
      const kun = Number(V('crPayDay')) || 1;
      const sana = V('crStartDate');
      const jami = oy * oylik;

      let html = '<div class="vms-t">Shartnoma xulosasi</div><div class="vms-tbl">' +
        '<div class="vms-row"><span>Muddat</span><b>' + (oy ? oy + ' oy' : '—') + '</b></div>' +
        '<div class="vms-row"><span>Oylik to\'lov</span><b>' + (oylik ? pul(oylik) : '—') + '</b></div>' +
        '<div class="vms-row is-big"><span>Jami to\'lanadi</span><b>' + (jami ? pul(jami) : '—') + '</b></div>';

      let boshlanish = sana ? new Date(sana + 'T00:00:00') : null;
      if(boshlanish && oy){
        const oxiri = new Date(boshlanish);
        oxiri.setMonth(oxiri.getMonth() + oy);
        oxiri.setDate(kun);
        html += '<div class="vms-row"><span>Yakunlanadi</span><b>' + sanaMatn(oxiri.getTime()) + '</b></div>';
      }
      html += '</div>';

      if(boshlanish && oy && oylik){
        html += '<div class="vms-t">To\'lov jadvali</div><div class="vms-tbl">';
        const n = Math.min(oy, 5);
        for(let i = 0; i < n; i++){
          const d = new Date(boshlanish);
          d.setMonth(d.getMonth() + i + 1);
          d.setDate(kun);
          html += '<div class="vms-row"><span>' + (i + 1) + ' · ' + sanaMatn(d.getTime()) + '</span><b>' + pul(oylik) + '</b></div>';
        }
        if(oy > n) html += '<div class="vms-note">yana ' + (oy - n) + ' ta to\'lov</div>';
        html += '</div>';
      }
      return html;
    });

    /* ---- Operator avtomatik aniqlandi ---- */
    const numEl = document.getElementById('newNumber');
    const opEl = document.getElementById('newOperator');
    if(numEl && opEl){
      const bar = document.createElement('div');
      bar.className = 'vm-detect';
      bar.style.display = 'none';
      numEl.parentNode.insertBefore(bar, numEl.nextSibling);
      numEl.addEventListener('input', () => {
        const d = (numEl.value || '').replace(/\D/g, '').replace(/^998/, '');
        const op = CODE_TO_OPERATOR[d.slice(0, 2)];
        if(op && d.length >= 2){
          bar.style.display = 'flex';
          bar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>Operator avtomatik aniqlandi — ' + op;
        }else{
          bar.style.display = 'none';
        }
      });
    }
  })();

  window.__adminOynalar = oynalar;
})();

/* Sahifa ochilganda ham yo'l ko'rsatkichi faol bo'limni ko'rsatsin */
setTimeout(()=>{
  try{
    const faol = document.querySelector('.tab.active');
    if(faol && typeof yolniYangila === 'function') yolniYangila(faol);
  }catch(e){}
}, 0);

(function initTabGroups(){
  // Foydalanuvchi so'rovi bo'yicha: guruhlar endi yopilmaydi/ochilmaydi —
  // barcha bo'limlar doim ko'rinib turadi, sarlavha faqat vizual yorliq.
  // Eski yig'ish-ochish mexanizmi (localStorage, bosish) butunlay o'chirildi.
  const groups = Array.from(document.querySelectorAll('.tab-group'));
  groups.forEach(group => setTabGroupOpen(group, true, false));
})();

const TAB_PANE_MAP = { dashboard:'Dashboard', bazaraqam:'Bazaraqam', management:'Management', numbers:'Numbers', aksiya:'Aksiya', kuntavsiyasi:'Kuntavsiyasi', xabarlar:'Xabarlar', tolov:'Tolov', ai:'Ai', instagram:'Instagram', telegramai:'Telegramai', videos:'Videos', orders:'Orders', zakaz:'Zakaz', credit:'Credit', personalbase:'Personalbase', vazifalar:'Vazifalar', finance:'Finance', sessions:'Sessions', stats:'Stats', sellers:'Sellers', styles:'Styles', operators:'Operators', watch:'Watch', uzex:'Uzex', vakansiya:'Vakansiya', settings:'Settings', stories:'Stories', kanalpost:'Kanalpost' };
/* ==================================================================
   YUQORIDAGI YO'L KO'RSATKICHI
   Avval tepada doim "Boshqaruv paneli" deb turardi — ya'ni qayerda
   ekaningizni faqat yon menyudan bilish mumkin edi. Endi u "Moliya ›
   Kredit" ko'rinishida, bo'lim almashganda o'zi yangilanadi. Bu
   "ichkariga kirdim" degan tuyg'uni beradigan uchta narsadan biri
   (qolgan ikkitasi: yon menyudagi chiziq va sariq belgi).
   ================================================================== */
function yolniYangila(tab){
  const box = document.getElementById('tbBreadcrumb');
  if(!box || !tab) return;
  const label = (tab.querySelector('.tab-label') || {}).textContent || '';
  const grp = tab.closest('.tab-group');
  const grpName = grp ? ((grp.querySelector('.tgh-label') || {}).textContent || '') : '';
  const esc = (x) => String(x || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  box.innerHTML = grpName
    ? '<b>Admin</b><span class="tbc-sep">/</span>' + esc(grpName.trim()) + '<span class="tbc-sep">/</span><b>' + esc(label.trim()) + '</b>'
    : '<b>Admin</b><span class="tbc-sep">/</span><b>' + esc(label.trim()) + '</b>';
}

document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    yolniYangila(tab);
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    openGroupOfTab(tab);
    /* TUZATISH (V80): ilgari bu yerda xaritada bo'lmagan bo'lim uchun
       `getElementById('paneundefined')` → null qaytib, xato tashlanardi.
       Natijada bo'lim OCHILMAY, ekran butunlay OQ qolardi (aynan
       "Stories" bilan shunday bo'ldi: xaritaga qo'shilmagan edi).
       Endi: nom xaritada bo'lmasa — bo'lim kalitidan o'zi tuziladi, va
       baribir topilmasa, qolgan kod to'xtab qolmaydi. */
    const paneNomi = TAB_PANE_MAP[tab.dataset.tab]
      || (tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1));
    const paneEl = document.getElementById('pane' + paneNomi);
    if(paneEl) paneEl.classList.add('active');
    else console.error("Bo'lim topilmadi: pane" + paneNomi + " (data-tab=" + tab.dataset.tab + ")");

    if(tab.dataset.tab === 'management'){ loadAdminsList(); }
    if(tab.dataset.tab === 'orders'){
      markOrdersSeen();
      // "Buyurtmalar" ro'yxati faqat shu bo'lim OCHIQ bo'lganda to'liq
      // chiziladi (pastda, refreshOrders()'dagi izohga qarang) — endi
      // bo'limga kirganimizda, keshdagi eng so'nggi ma'lumot bilan
      // darhol (qayta so'rovsiz) chizib beramiz.
      ordersPaneVisible = true;
      if(currentOrdersCache.length || ordersFirstLoad === false){ renderAdminOrders(currentOrdersCache); }
    } else {
      ordersPaneVisible = false;
    }
    if(tab.dataset.tab === 'zakaz'){ loadCustomOrders(); loadPriceCategories(); loadManualCustomersCount(); }
    if(tab.dataset.tab === 'sessions'){ refreshSessions(); }
    if(tab.dataset.tab === 'stats'){ loadStats(); }
    if(tab.dataset.tab === 'sellers'){ loadSellers(); loadTariffs(); loadHamkorArizalar(); }
    if(tab.dataset.tab === 'xabarlar'){ loadXabarlar(); xbVapidYukla(); }
    if(tab.dataset.tab === 'settings'){ if(typeof xavfYukla === 'function') xavfYukla(); }
    if(tab.dataset.tab === 'stories'){ if(typeof loadStories === 'function') loadStories(); }
    if(tab.dataset.tab === 'tolov'){ loadTolov(); }
    if(tab.dataset.tab === 'instagram'){ loadInstagramSettings(); }
    if(tab.dataset.tab === 'operators'){ loadOperatorSettings(); }
    if(tab.dataset.tab === 'watch'){ loadWatchList(); }
    if(tab.dataset.tab === 'uzex'){ uzxLoadSaved(); }
    if(tab.dataset.tab === 'telegramai'){ loadTelegramAiSettings(); }
    if(tab.dataset.tab === 'videos'){ loadVideoTestimonials(); }
    if(tab.dataset.tab === 'credit'){
      loadCreditContracts();
      const dateEl = document.getElementById('crStartDate');
      if(dateEl && !dateEl.value) dateEl.value = new Date().toISOString().slice(0,10);
    }
    if(tab.dataset.tab === 'finance'){ loadFinanceSummary(); }
    if(tab.dataset.tab === 'personalbase'){ loadPersonalBaseStats(); loadPersonalNumbersCount(); }
    if(tab.dataset.tab === 'vazifalar'){
      loadVazifalarStats();
      loadVazifalarCount();
      /* TUZATISH (V112): ilgari bo'lim ochilganda faqat raqamli kartalar
         chiqardi, VAZIFALAR RO'YXATI esa "Vazifalarni ko'rish"
         kartochkasi bosilmaguncha yashirin turardi. Natijada bo'limning
         yarmi bo'm-bo'sh oq maydon bo'lib ko'rinardi va admin umuman
         vazifa yo'qdek his qilardi. Endi ro'yxat DARHOL ochiladi. */
      vzRoyxatniOch();
    }
    if(tab.dataset.tab === 'vakansiya'){ loadVacancyAdminList(); loadJobApplications(); }
    if(tab.dataset.tab === 'aksiya'){ renderAksiyaTab(); }
    if(tab.dataset.tab === 'kuntavsiyasi'){ dayLoad(); }
    if(tab.dataset.tab === 'dashboard'){ refreshDashboardPane(); }
    if(tab.dataset.tab === 'bazaraqam'){ refreshBazaraqamPane(); }
    // UZEX jonli hisoblagichi faqat shu bo'lim OCHIQ turganda ishlashi
    // kerak — boshqa har qanday bo'limga o'tilganda (yoki UZEX'ga
    // QAYTA kirilganda, eski hisoblagich ikki marta yugurmasin deb)
    // to'xtatiladi; yangi qidiruv natijasi kelganda uzxSearch() uni
    // qaytadan ishga tushiradi.
    uzxStopTimer();

    // Mobil ekranda menyudan bo'lim tanlansa, sidebar avtomatik yopiladi
    const shellEl = document.querySelector('.admin-shell');
    if(shellEl) shellEl.classList.remove('sidebar-open');
  });
});

/* ---- Sidebar (chap menyu) — mobil ekranda ochish/yopish ---- */
(function(){
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const overlay = document.getElementById('sidebarOverlay');
  const shellEl = document.querySelector('.admin-shell');
  if(!toggleBtn || !shellEl) return;
  toggleBtn.addEventListener('click', () => shellEl.classList.toggle('sidebar-open'));
  if(overlay) overlay.addEventListener('click', () => shellEl.classList.remove('sidebar-open'));
})();

/* ---- Login/parolni almashtirish ---- */
document.getElementById('saveCredentialsBtn').addEventListener('click', async ()=>{
  const curPass  = document.getElementById('curPasswordInput').value;
  const newPass  = document.getElementById('newPasswordInput').value;
  const msg      = document.getElementById('settingsMsg');

  if(!curPass || !newPass){
    msg.textContent = "Joriy va yangi parolni to'liq kiriting"; msg.className = 'settings-msg bad'; return;
  }
  if(newPass.length < 6){
    msg.textContent = "Yangi parol kamida 6 ta belgidan iborat bo'lsin"; msg.className = 'settings-msg bad'; return;
  }
  try{
    const user = firebase.auth().currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(user.email, curPass);
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(newPass);
    msg.textContent = '✓ Parol yangilandi. Keyingi safar shu yangi parol bilan kiring.';
    vibrate(80);
    msg.className = 'settings-msg ok';
    document.getElementById('curPasswordInput').value = '';
    document.getElementById('newPasswordInput').value = '';
  }catch(err){
    msg.textContent = err.code === 'auth/wrong-password' ? "Joriy parol noto'g'ri" : ('Xato: ' + err.message);
    msg.className = 'settings-msg bad';
  }
});

/* ---- Sayt sozlamalari (yon menyu, xarita, ish vaqti va h.k.) ---- */
/* ESLATMA: avval shu yerda mijoz saytining rang mavzusi (SITE_THEMES),
   orqa fon rangi (BG_COLOR_PRESETS) va qidiruv kartochkasi foni
   (SEARCH_CARD_BG_PRESETS) tanlanadigan sozlamalar bo'lgan. Ular BUTUNLAY
   OLIB TASHLANDI — chunki mijoz sahifani ochganda bu sozlamalar
   Firestore'dan ASYNC o'qilib, sahifa chizilgandan KEYIN qo'llanardi,
   shuning uchun har kirishda bir lahzaga standart ko'rinish ko'rinib,
   keyin tanlangan rangga "sakrab" o'tardi (sekin internet yoki eski
   keshda ba'zan umuman o'zgarmay qolardi). Endi sayt bitta qattiq
   (hardcoded) zamonaviy dizaynda ochiladi. Tegishli qo'llash kodi
   index.html'dan ham olib tashlandi. */

/* ---- Raqamlar ro'yxati uslubi (Uslublar bo'limi) ---- */
const CATALOG_STYLES = [
  { key:'classic',        label:'Klassik (standart)',        emoji:'🗂️' },
  { key:'list_minimal',   label:"Ro'yxat — Minimal",         emoji:'📋' },
  { key:'dark_banner',    label:'Katta banner',              emoji:'🎫' },
  { key:'list_icon',      label:"Ro'yxat — Savat belgisi",   emoji:'🛒' },
  { key:'grid_compact',   label:'Ixcham katak',              emoji:'🔲' },
  { key:'outline',        label:'Kontur (Outline)',          emoji:'⬜' },
  { key:'glass',          label:'Shisha effekti',            emoji:'🧊' },
  { key:'ribbon',         label:'Lenta (Ribbon)',            emoji:'🎗️' },
  { key:'ticket',         label:'Chipta (Ticket)',           emoji:'🎟️' },
  { key:'bold_price',     label:'Katta narx',                emoji:'💰' },
  { key:'horizontal',     label:'Gorizontal qator',          emoji:'➡️' },
  { key:'gradient',       label:'Gradient fon',              emoji:'🌈' },
  { key:'numbered_badge', label:'Raqamlangan (Badge)',       emoji:'🏷️' },
  { key:'classic_locked', label:'Standart (saqlangan)',      emoji:'🔒' }
];
let currentCatalogStyle = 'classic';

function renderStylePicker(){
  const picker = document.getElementById('stylePicker');
  if(!picker) return;
  picker.innerHTML = CATALOG_STYLES.map(s => `
    <div class="style-swatch" data-key="${s.key}" style="
      background:var(--panel-2);border:2px solid ${s.key === currentCatalogStyle ? 'var(--amber)' : 'var(--line)'};
      border-radius:10px;padding:14px 8px;cursor:pointer;text-align:center;">
      <div style="font-size:22px;margin-bottom:6px;">${s.emoji}</div>
      <div style="font-size:11.5px;color:var(--text);font-weight:600;">${s.label}</div>
      ${s.key === currentCatalogStyle ? `<div style="margin-top:4px;color:var(--amber);font-size:12px;">✓ tanlangan</div>` : ''}
    </div>
  `).join('');

  picker.querySelectorAll('.style-swatch').forEach(el => {
    el.addEventListener('click', async () => {
      const key = el.dataset.key;
      currentCatalogStyle = key;
      renderStylePicker();
      const msg = document.getElementById('styleMsg');
      try{
        await db.collection('site_settings').doc('general').set({ catalogStyle: key }, { merge: true });
        const label = CATALOG_STYLES.find(s => s.key === key).label;
        msg.textContent = `✓ "${label}" uslubi saqlandi — mijoz saytida darhol qo'llanadi.`;
        msg.className = 'settings-msg ok';
        vibrate(80);
      }catch(err){
        msg.textContent = 'Xato: ' + err.message;
        msg.className = 'settings-msg bad';
      }
    });
  });
}

/* ---- Kreditga berilgan raqamlar ---- */
function calcDueDate(startTs, payDay, monthIndex){
  const d = new Date(startTs);
  d.setDate(1);
  d.setMonth(d.getMonth() + monthIndex);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(payDay, lastDay));
  return d.getTime();
}
function formatDate(ts){
  const d = new Date(ts);
  return sanaUz(d);
}

/* Kredit formasidagi telefon maydonlari — saytdagi BOSHQA barcha
   telefon maydonlari bilan AYNAN bir xil, iPhone'da qotmaydigan
   usul (attachUzPhoneAutoFormat izohiga qarang): yozayotganda
   qiymatga tegilmaydi, format maydondan chiqqanda qo'yiladi. */
attachUzPhoneAutoFormat(document.getElementById('crPhone'));
attachUzPhoneAutoFormat(document.getElementById('crNumber'));

// XAVFSIZLIK / IZOLYATSIYA: "Kredit" bo'limi endi to'g'ridan-to'g'ri
// Firestore Client SDK orqali emas, balki admin-credit.js (Admin SDK,
// requireAdmin bilan himoyalangan) orqali ishlaydi — Kirim-Chiqim
// (admin-finance.js) bilan bir xil andoza. Shu bilan har bir admin FAQAT
// o'zi qo'shgan shartnomalarni ko'radi, bosh admin esa har doim hammasini.
async function creCall(action, extra){
  const idToken = await firebase.auth().currentUser.getIdToken();
  const tana = JSON.stringify(Object.assign({ action }, extra || {}));

  /* HIMOYA (V120). Muammo: "Shartnoma qo'shish" bosilganda ba'zan
     "Request payload size exceeds the limit: 18874368 bytes" degan
     TUSHUNARSIZ xato chiqardi. Bu Netlify'ning o'z xabari — so'rov
     hajmi chegaradan oshganda u funksiyani UMUMAN ishga tushirmaydi.
     Hajm esa odatda bitta maydonga juda katta matn tushganda oshadi
     (masalan "Qo'shimcha ma'lumot" ga rasm yoki uzun matn joylashtirib
     yuborilganda — bunday paytda bir nechta megabayt bo'lishi mumkin).
     Endi hajm YUBORISHDAN OLDIN tekshiriladi va aniq, o'zbekcha xabar
     beriladi. Pastdagi maydon chegaralari esa bunga umuman yo'l
     qo'ymaydi. */
  if(tana.length > 900000){
    throw new Error("Ma'lumot juda katta (" + Math.round(tana.length/1024) + " KB). "
      + "Odatda bu \"Qo'shimcha ma'lumot\" maydoniga juda uzun matn (yoki rasm) "
      + "joylashtirilganda bo'ladi — shu maydonni qisqartiring.");
  }

  const res = await fetch('/.netlify/functions/admin-credit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
    body: tana
  });

  /* Javob JSON bo'lmasligi ham mumkin (platforma xatosi — HTML yoki
     oddiy matn qaytaradi). Ilgari `res.json()` shu yerda yiqilib,
     adminga "Unexpected token" kabi chalg'ituvchi xato ko'rinardi. */
  let data = null;
  const xomJavob = await res.text();
  try{ data = JSON.parse(xomJavob); }catch(e){}
  if(!data){
    if(res.status === 413) throw new Error("Ma'lumot juda katta — maydonlarni qisqartiring.");
    if(res.status === 502 || res.status === 504) throw new Error('Server javob bermadi. Birozdan keyin qayta urining.');
    throw new Error('Server kutilmagan javob qaytardi (HTTP ' + res.status + ')');
  }
  if(!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

document.getElementById('addCreditBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('creditAddMsg');
  const name = document.getElementById('crName').value.trim();
  const phone = document.getElementById('crPhone').value.trim();
  const region = document.getElementById('crRegion').value;
  const number = document.getElementById('crNumber').value.trim();
  const months = Number(document.getElementById('crMonths').value) || 0;
  const monthly = Number(document.getElementById('crMonthly').value) || 0;
  const startDateVal = document.getElementById('crStartDate').value;
  const payDay = Number(document.getElementById('crPayDay').value) || 1;
  const info = document.getElementById('crInfo').value.trim();
  const passportNumber = document.getElementById('crPassport').value.trim();
  const birthDate = document.getElementById('crBirthDate').value;
  const permanentAddress = document.getElementById('crAddress').value.trim();

  if(!name || !phone || !region || !number || months <= 0 || monthly <= 0){
    msg.textContent = "Barcha maydonlarni to'g'ri to'ldiring";
    msg.className = 'settings-msg bad';
    return;
  }

  /* V120: har bir maydon uzunligi CHEKLANADI. Shartnomaga bundan
     ortig'i baribir sig'maydi (PDF ham, Telegram xabari ham), lekin
     cheksiz matn so'rovni megabaytlarga shishirib, Netlify uni
     butunlay rad etishiga olib kelardi. */
  const qisq = (v, n) => String(v || '').slice(0, n);

  try{
    const data = await creCall('add', {
      customerName: qisq(name, 100), customerPhone: qisq(phone, 30),
      region: qisq(region, 60), number: qisq(number, 30),
      totalMonths: months, monthlyPayment: monthly, paymentDay: payDay,
      currency: document.getElementById('crCurrency').value === 'usd' ? 'USD' : 'UZS',
      additionalInfo: qisq(info, 500), startDate: qisq(startDateVal, 20),
      passportNumber: qisq(passportNumber, 30), birthDate: qisq(birthDate, 20),
      permanentAddress: qisq(permanentAddress, 300)
    });
    const contractId = data.contractId;
    const customerChatId = data.customerChatId;

    msg.textContent = customerChatId
      ? `✓ Shartnoma qo'shildi. ID: ${contractId} (mijozga PDF va avtomatik eslatma yuboriladi)`
      : `✓ Shartnoma qo'shildi. ID: ${contractId} (mijoz Telegram botda topilmadi — PDF/eslatma yuborilmaydi)`;
    msg.className = 'settings-msg ok';
    vibrate(80);

    // Mijozning chat ID'si topilgan bo'lsa, shartnoma PDF faylini
    // darhol uning botiga yuboramiz — qo'lda hech narsa qilish shart emas.
    if(customerChatId){
      try{
        const idToken = await firebase.auth().currentUser.getIdToken();
        await fetch('/.netlify/functions/send-contract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
          body: JSON.stringify({ contractId })
        });
      }catch(e){ console.error('Shartnoma PDF yuborishda xato:', e); }
    }

    ['crName','crPhone','crRegion','crNumber','crMonths','crMonthly','crPayDay','crInfo','crPassport','crBirthDate','crAddress'].forEach(id=>{
      document.getElementById(id).value = '';
    });
    document.getElementById('crStartDate').value = new Date().toISOString().slice(0,10);
    loadCreditContracts();
    refreshCrLivePreview();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
});

/* ==================================================================
   KREDIT FORMASI — "JONLI HISOB-KITOB" paneli
   ------------------------------------------------------------------
   Forma yonidagi bo'sh joy o'rniga: admin muddat/oylik to'lovni
   kiritayotganda jami summa, yakunlanish sanasi va dastlabki to'lov
   jadvali shu yerda DARHOL (so'rovsiz) hisoblab ko'rsatiladi.
   ================================================================== */
function refreshCrLivePreview(){
  const body = document.getElementById('crLiveBody');
  if(!body) return;
  const pul = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
  const V = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };

  const name = V('crName').trim();
  const months = Number(V('crMonths')) || 0;
  const monthly = Number(V('crMonthly')) || 0;
  const payDay = Math.min(Math.max(Number(V('crPayDay')) || 1, 1), 31);
  const startVal = V('crStartDate');
  const VAL = V('crCurrency') === 'usd' ? ' $' : " so'm";

  if(!months && !monthly){
    body.innerHTML = '<div class="cr-live-empty">Muddat va oylik to\'lovni kiriting — jami summa, oxirgi sana va dastlabki jadval shu yerda avtomatik chiqadi.</div>';
    return;
  }

  const jami = months * monthly;
  let html = '';
  if(name) html += '<div class="cr-live-row"><span>Mijoz</span><b>' + escapeHtml(name.slice(0, 24)) + '</b></div>';
  html += '<div class="cr-live-row"><span>Muddat</span><b>' + (months ? months + ' oy' : '—') + '</b></div>';
  html += '<div class="cr-live-row"><span>Oylik to\'lov</span><b>' + (monthly ? pul(monthly) + VAL : '—') + '</b></div>';
  html += '<div class="cr-live-row is-big"><span>Jami summa</span><b>' + (jami ? pul(jami) + VAL : '—') + '</b></div>';

  const boshlanish = startVal ? new Date(startVal + 'T00:00:00') : new Date();
  if(months){
    const oxiri = new Date(boshlanish);
    oxiri.setMonth(oxiri.getMonth() + months);
    oxiri.setDate(payDay);
    const q = (x) => String(x).padStart(2, '0');
    html += '<div class="cr-live-row"><span>Yakunlanadi</span><b>' + q(oxiri.getDate()) + '.' + q(oxiri.getMonth() + 1) + '.' + oxiri.getFullYear() + '</b></div>';
  }

  if(months && monthly){
    html += '<div class="cr-live-sched"><div class="cr-live-sched-t">Dastlabki to\'lov jadvali</div>';
    const n = Math.min(months, 4);
    for(let i = 0; i < n; i++){
      const d = new Date(boshlanish);
      d.setMonth(d.getMonth() + i + 1);
      d.setDate(payDay);
      const q = (x) => String(x).padStart(2, '0');
      html += '<div class="cr-live-sched-row"><span>' + (i + 1) + '-oy · ' + q(d.getDate()) + '.' + q(d.getMonth() + 1) + '</span><span>' + pul(monthly) + '</span></div>';
    }
    if(months > n) html += '<div class="cr-live-sched-row" style="color:var(--muted);"><span>... yana ' + (months - n) + ' ta to\'lov</span><span></span></div>';
    html += '</div>';
  }

  body.innerHTML = html;
}
/* TEZLIK (iPhone): jonli ko'rinish (to'lov jadvali) HAR BIR HARFDA
   qayta chizilardi — u butun blokni `innerHTML` bilan yangilaydi,
   ya'ni klaviatura ochiq turganda telefon har harfda sahifani qayta
   joylashtirardi. "Kredit bo'limida yozsam qotib qolyapti" ning
   asosiy sababi aynan shu edi. Endi yozish tingach (250 ms) bir
   marta chiziladi — natija bir xil, yozish esa mutlaqo erkin. */
const crLiveKechikkan = debounce(refreshCrLivePreview, 250);
['crName','crMonths','crMonthly','crPayDay','crStartDate','crCurrency'].forEach(id => {
  const el = document.getElementById(id);
  if(el){ el.addEventListener('input', crLiveKechikkan); el.addEventListener('change', refreshCrLivePreview); }
});
refreshCrLivePreview();

// "short" — tor ekran va kredit kartasi uchun qisqa nom. To'liq nomi
// (label) hisobotlarda va keng ekranda ishlatiladi.
const CONTRACT_STATUSES = [
  { key: 'active',    short: 'Joyida',           label: "To'lov muvaffaqiyatli bajarilmoqda", color: 'var(--green)' },
  { key: 'trouble',   short: 'Uzilishli',        label: "To'lov uzilishlari ko'p",            color: 'var(--amber)' },
  { key: 'cancelling',short: 'Bekor jarayonida', label: "Shartnoma bekor qilish jarayonida",  color: 'var(--red)' },
  { key: 'cancelled', short: "Bekor bo'ldi",     label: 'Shartnoma bekor bo\'ldi',             color: 'var(--red)' },
  { key: 'completed', short: 'Yakunlandi',       label: "Shartnoma muvaffaqiyatli yakunlandi", color: 'var(--green)' }
];
function contractStatusLabel(key){
  const s = CONTRACT_STATUSES.find(s => s.key === key);
  return s ? s.label : CONTRACT_STATUSES[0].label;
}
function contractStatusColor(key){
  const s = CONTRACT_STATUSES.find(s => s.key === key);
  return s ? s.color : CONTRACT_STATUSES[0].color;
}

let currentCreditContracts = [];

// Bosh admin "Boshqaruv"dan biror sub-adminning "💳 Kredit" tugmasini
// bossa, shu ikkalasi o'sha kishining uid/ismini saqlaydi — Kirim-Chiqim
// filtridagi (financeFilterUid) bilan bir xil andoza.
let creditFilterUid = null;
let creditFilterName = null;

function creRenderFilterBanner(){
  const banner = document.getElementById('creditFilterBanner');
  const addForm = document.querySelector('#paneCredit .cr-form-2col');
  if(!banner) return;
  if(creditFilterUid){
    banner.style.display = 'block';
    banner.innerHTML = `🔎 Faqat <b>${escapeHtml(creditFilterName || '')}</b> ning shartnomalari ko'rsatilmoqda (faqat ko'rish). <a href="#" id="creditClearFilter" style="color:var(--amber);">O'zimnikini ko'rsatish</a>`;
    const clearLink = document.getElementById('creditClearFilter');
    if(clearLink) clearLink.addEventListener('click', (e)=>{
      e.preventDefault();
      creditFilterUid = null;
      creditFilterName = null;
      loadCreditContracts();
    });
    if(addForm) addForm.style.display = 'none';
  } else {
    banner.style.display = 'none';
    banner.innerHTML = '';
    if(addForm) addForm.style.display = '';
  }
}

async function loadCreditContracts(){
  const list = document.getElementById('creditList');
  list.innerHTML = 'Yuklanmoqda...';
  creRenderFilterBanner();
  try{
    const data = await creCall('list', creditFilterUid ? { viewUid: creditFilterUid } : {});
    currentCreditContracts = data.contracts || [];
    renderCreditList(currentCreditContracts);
  }catch(err){
    list.innerHTML = 'Xato: ' + err.message;
  }
}

/* ==================================================================
   KREDIT / QARZDORLIK RO'YXATI
   ------------------------------------------------------------------
   Mijoz iltimosi: "birinchi qatorlarda ism-familiya emas, QARZDORLIK
   SUMMASI va RAQAM ko'rinsin; qarzdorlarni ko'rish va to'lovlarni
   tasdiqlash oson va tushunarli bo'lsin".

   Shuning uchun ro'yxat endi shunday tuzilgan:
     * tepada to'rtta umumiy raqam — jami qarz, kechikkanlar, shu hafta
       kutilayotgan to'lovlar, faol shartnomalar;
     * ro'yxat KECHIKKANLARDAN boshlanadi (eng ko'p kechikkani yuqorida),
       keyin kuni yaqinlashganlar — admin hech narsa qidirmaydi;
     * har bir qatorda: raqam (katta), telefon, va o'ng tarafda QOLGAN
       QARZ summasi; chap chekkadagi rangli chiziq holatni bildiradi;
     * shartnoma ochilganda birinchi ko'rinadigan narsa — bitta katta
       "to'lovni tasdiqlash" tugmasi (qaysi oy va qancha summa ekani
       yozilgan holda). Avval buning uchun kichkina katakchani topib
       bosish kerak edi.
   Tahrirlash formasi yig'ib qo'yilgan — u kundalik ishda kerak emas.
   ================================================================== */

const QZ_DAY = 86400000;
let qzFilter = 'all';        // all | overdue | soon | done
let qzSearchQuery = '';

/* Shartnoma valyutasi — so'm yoki dollar. Shartnoma yozuvida
   `currency` bo'lmasa (eski yozuvlar) so'm deb hisoblanadi. */
function crVal(d){ return String((d && d.currency) || '').toUpperCase() === 'USD' ? ' $' : " so'm"; }

function qzMoney(n){
  const v = Number(n) || 0;
  return v.toLocaleString('ru-RU').replace(/,/g, ' ');
}

// Katta summalarni qisqa ko'rinishda (12,5 mln) — tepadagi kartochkalar uchun.
function qzShortMoney(n){
  const v = Number(n) || 0;
  if(v >= 1000000){
    const mln = v / 1000000;
    return (mln >= 100 ? Math.round(mln) : mln.toFixed(1).replace('.0','')).toString().replace('.', ',') + ' mln';
  }
  if(v >= 1000) return Math.round(v / 1000) + ' ming';
  return String(v);
}

/* Bitta shartnomani tahlil qiladi — qaror qabul qilish uchun kerak
   bo'lgan hamma narsa shu yerda bir marta hisoblanadi. */
function qzAnalyze(d){
  const now = Date.now();
  const payments = Array.isArray(d.payments) ? d.payments : [];
  const monthly = Number(d.monthlyPayment) || 0;
  const total = Number(d.totalMonths) || payments.length || 0;
  const paid = payments.filter(p => p.status === 'paid').length;
  const left = Math.max(0, total - paid);
  const pending = payments.filter(p => p.status !== 'paid').sort((a, b) => a.dueDate - b.dueDate);
  const overdue = pending.filter(p => p.dueDate < now);
  const next = pending[0] || null;
  // Arxiv = admin shartnomani QO'LDA yopgan (yakunlandi yoki bekor bo'ldi).
  // Hamma oyi to'langan shartnoma ham tabiiy ravishda yopilgan hisoblanadi.
  const archived = d.contractStatus === 'cancelled' || d.contractStatus === 'completed';
  const closed = archived;

  let state = 'ok', days = 0;
  if(left === 0 || closed){
    state = 'done';
  }else if(overdue.length){
    state = 'overdue';
    days = Math.floor((now - overdue[0].dueDate) / QZ_DAY);
  }else if(next && (next.dueDate - now) <= 7 * QZ_DAY){
    state = 'soon';
    days = Math.max(0, Math.ceil((next.dueDate - now) / QZ_DAY));
  }

  return {
    paid, total, left, monthly, next, days, state, closed, archived,
    cancelled: d.contractStatus === 'cancelled',
    debt: left * monthly,
    overdueCount: overdue.length,
    overdueSum: overdue.length * monthly,
    pct: total ? Math.round((paid / total) * 100) : 0
  };
}

const QZ_RANK = { overdue: 0, soon: 1, ok: 2, done: 3 };

function qzPill(a){
  if(a.state === 'overdue') return '<span class="qz-pill p-overdue">⚠ ' + a.days + ' kun kechikdi</span>';
  if(a.state === 'soon')    return '<span class="qz-pill p-soon">⏳ ' + (a.days === 0 ? 'to\'lov bugun' : a.days + ' kundan keyin') + '</span>';
  if(a.state === 'done')    return '<span class="qz-pill p-done">' + (a.cancelled ? '✕ bekor bo\'ldi' : (a.archived ? '✓ yopilgan' : '✓ to\'liq to\'langan')) + '</span>';
  return '<span class="qz-pill p-ok">● joyida</span>';
}

/* Tepadagi to'rtta umumiy raqam. Faqat YOPILMAGAN shartnomalar hisobga
   olinadi — yakunlangani qarzdorlikka kirmaydi. */
function qzRenderStats(contracts){
  const box = document.getElementById('qzStats');
  if(!box) return;
  let totalDebt = 0, overdueCount = 0, overdueSum = 0, soonCount = 0, soonSum = 0, activeCount = 0;

  contracts.forEach(d => {
    const a = qzAnalyze(d);
    if(a.state === 'done') return;
    activeCount++;
    totalDebt += a.debt;
    if(a.state === 'overdue'){ overdueCount++; overdueSum += a.overdueSum; }
    else if(a.state === 'soon'){ soonCount++; soonSum += a.monthly; }
  });

  box.innerHTML =
    '<div class="qz-stat' + (overdueCount ? ' is-danger' : ' is-ok') + '">' +
      '<span class="qz-stat-label">Kechikkan to\'lovlar</span>' +
      '<b class="qz-stat-value">' + overdueCount + '</b>' +
      '<span class="qz-stat-sub">' + (overdueCount ? qzShortMoney(overdueSum) + ' so\'m undirilishi kerak' : 'kechikkan yo\'q') + '</span>' +
    '</div>' +
    '<div class="qz-stat' + (soonCount ? ' is-warn' : '') + '">' +
      '<span class="qz-stat-label">Yaqin 7 kunda</span>' +
      '<b class="qz-stat-value">' + soonCount + '</b>' +
      '<span class="qz-stat-sub">' + (soonCount ? qzShortMoney(soonSum) + ' so\'m kutilmoqda' : 'bu hafta to\'lov yo\'q') + '</span>' +
    '</div>' +
    '<div class="qz-stat">' +
      '<span class="qz-stat-label">Jami qarzdorlik</span>' +
      '<b class="qz-stat-value">' + qzShortMoney(totalDebt) + '</b>' +
      '<span class="qz-stat-sub">' + qzMoney(totalDebt) + ' so\'m</span>' +
    '</div>' +
    '<div class="qz-stat">' +
      '<span class="qz-stat-label">Faol shartnomalar</span>' +
      '<b class="qz-stat-value">' + activeCount + '</b>' +
      '<span class="qz-stat-sub">jami ' + contracts.length + ' ta shartnoma</span>' +
    '</div>';
}

/* Filtr tugmalari — har birida nechta borligi ko'rinib turadi. */
function qzRenderFilters(contracts){
  const box = document.getElementById('qzFilters');
  if(!box) return;
  // "Hammasi" — faqat FAOL shartnomalar. Yopilganlari Arxivda turadi va
  // na ro'yxatda, na tepadagi summalarda ko'rinadi.
  const c = { all: 0, overdue: 0, soon: 0, done: 0 };
  contracts.forEach(d => {
    const st = qzAnalyze(d).state;
    if(c[st] !== undefined) c[st]++;
    if(st !== 'done') c.all++;
  });

  const defs = [
    { key: 'all',     label: 'Faol',         n: c.all,     cls: '' },
    { key: 'overdue', label: 'Kechikkan',    n: c.overdue, cls: ' qz-chip-danger' },
    { key: 'soon',    label: 'Yaqin 7 kun',  n: c.soon,    cls: ' qz-chip-warn' },
    { key: 'done',    label: 'Arxiv',        n: c.done,    cls: '' }
  ];

  box.innerHTML = defs.map(f =>
    '<button type="button" class="qz-chip' + f.cls + (qzFilter === f.key ? ' is-active' : '') + '" data-qzfilter="' + f.key + '">' +
      f.label + '<span class="qz-chip-count">' + f.n + '</span>' +
    '</button>'
  ).join('');

  box.querySelectorAll('[data-qzfilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      qzFilter = btn.dataset.qzfilter;
      renderCreditList(currentCreditContracts);
    });
  });
}

function renderCreditList(contracts){
  const list = document.getElementById('creditList');
  const all = Array.isArray(contracts) ? contracts : [];

  // Tepadagi raqamlar va filtr tugmalari HAR DOIM to'liq ro'yxat bo'yicha
  // hisoblanadi — qidiruv yoki filtr ularni o'zgartirmasligi kerak.
  qzRenderStats(currentCreditContracts || all);
  qzRenderFilters(currentCreditContracts || all);

  // Qidiruv: raqam, telefon, ism va shartnoma raqami bo'yicha.
  let rows = all;
  if(qzSearchQuery){
    const q = qzSearchQuery;
    rows = rows.filter(d =>
      (d.customerName || '').toLowerCase().includes(q) ||
      (d.number || '').toLowerCase().includes(q) ||
      (d.customerPhone || '').toLowerCase().includes(q) ||
      (d.contractId || '').toLowerCase().includes(q)
    );
  }
  if(qzFilter === 'all'){
    rows = rows.filter(d => qzAnalyze(d).state !== 'done');   // arxiv alohida
  }else{
    rows = rows.filter(d => qzAnalyze(d).state === qzFilter);
  }

  if(rows.length === 0){
    list.innerHTML = '<div class="empty-admin">' +
      (all.length === 0 ? 'Hali kredit shartnomasi yo\'q.'
        : (qzFilter === 'done' ? 'Arxiv hozircha bo\'sh — yopilgan shartnoma yo\'q.'
        : (qzFilter === 'all' ? 'Faol shartnoma yo\'q. Yopilganlari Arxiv bo\'limida.'
        : 'Bu shartga mos shartnoma topilmadi.'))) + '</div>';
    return;
  }

  // Eng muhimi yuqorida: kechikkanlar (ko'p kechikkani birinchi), keyin
  // kuni yaqinlashganlar, keyin qolganlari.
  const sorted = rows.slice().sort((x, y) => {
    const ax = qzAnalyze(x), ay = qzAnalyze(y);
    if(QZ_RANK[ax.state] !== QZ_RANK[ay.state]) return QZ_RANK[ax.state] - QZ_RANK[ay.state];
    if(ax.state === 'overdue') return ay.days - ax.days;
    if(ax.state === 'soon')    return ax.days - ay.days;
    return ay.debt - ax.debt;
  });

  list.innerHTML = '<div class="qz-list">' +
    '<div class="qz-thead">' +
      '<span class="qzc qzc-num">Raqam / mijoz</span>' +
      '<span class="qzc qzc-state">Holati</span>' +
      '<span class="qzc qzc-prog">Jadval</span>' +
      '<span class="qzc qzc-debt">Qolgan qarz</span>' +
      '<span class="qzc qzc-month">Oylik to\'lov</span>' +
      '<span class="qzc qzc-act"></span>' +
      '<span class="qz-arrow"></span>' +
    '</div>' +
    sorted.map(d => {
    const a = qzAnalyze(d);
    const status = d.contractStatus || 'active';
    const now = Date.now();

    const payCta = a.next
      ? '<button type="button" class="qz-pay-cta' + (a.state === 'overdue' ? ' is-overdue' : '') + '" data-id="' + d.id + '" data-month="' + a.next.month + '">' +
          '<span>' + a.next.month + '-oy to\'lovini tasdiqlash' +
            '<span class="qz-cta-sub">Muddati: ' + formatDate(a.next.dueDate) + (a.state === 'overdue' ? ' · ' + a.days + ' kun kechikkan' : '') + '</span>' +
          '</span>' +
          '<span class="qz-cta-sum">' + qzMoney(a.monthly) + crVal(d) + '</span>' +
        '</button>'
      : '<div class="qz-pay-done">✓ Barcha to\'lovlar yakunlangan</div>';

    return '' +
    '<div class="qz-item st-' + a.state + (a.archived ? ' is-archived' : '') + '" data-id="' + d.id + '">' +
      '<div class="qz-head" data-id="' + d.id + '">' +
        // 1-ustun: raqam va mijoz
        '<span class="qzc qzc-num">' +
          '<b>' + escapeHtml(d.number || '—') + '</b>' +
          '<i>' + escapeHtml(d.customerName || '') +
            (d.customerPhone ? ' · <a href="tel:' + escapeHtml((d.customerPhone || '').replace(/\s/g, '')) + '">' + escapeHtml(d.customerPhone) + '</a>' : '') +
          '</i>' +
        '</span>' +
        // 2-ustun: holati
        '<span class="qzc qzc-state">' + qzPill(a) + '</span>' +
        // 3-ustun: jadval (nechanchi oy va chiziq)
        '<span class="qzc qzc-prog">' +
          '<i class="qzp-txt">' + a.paid + ' / ' + a.total + ' oy</i>' +
          '<span class="qzp-bar' + (a.state === 'overdue' ? ' is-late' : '') + '">' +
            '<span style="width:' + a.pct + '%"></span>' +
          '</span>' +
        '</span>' +
        // 4-ustun: qolgan qarz
        '<span class="qzc qzc-debt' + (a.state === 'overdue' ? ' is-late' : '') + '">' +
          '<b>' + (a.debt > 0 ? qzMoney(a.debt) : '0') + '</b>' +
          '<i>' + qzMoney(a.total * a.monthly) + crVal(d) + ' dan</i>' +
        '</span>' +
        // 5-ustun: oylik to'lov va muddati
        '<span class="qzc qzc-month">' +
          '<b>' + qzMoney(a.monthly) + '</b>' +
          '<i>' + (a.next ? formatDate(a.next.dueDate) + (a.state === 'overdue' ? ' edi' : '') : 'yakunlangan') + '</i>' +
        '</span>' +
        // 6-ustun: asosiy amal
        '<span class="qzc qzc-act">' +
          (a.next && !a.archived
            ? '<button type="button" class="qz-row-pay' + (a.state === 'overdue' ? ' is-late' : '') + '" data-id="' + d.id + '" data-month="' + a.next.month + '">To\'lovni tasdiqlash</button>'
            : '<span class="qz-row-done">✓</span>') +
        '</span>' +
        '<span class="qz-arrow">▾</span>' +
      '</div>' +

      '<div class="qz-body">' +
        (a.archived
          ? '<div class="qz-archive-note">' +
              '<span>Shartnoma ' + (a.cancelled ? 'bekor qilingan' : 'yopilgan') +
              ' · summalarga qo\'shilmaydi</span>' +
              '<button type="button" class="qz-reopen" data-id="' + d.id + '">Qayta ochish</button>' +
            '</div>'
          : payCta) +

        '<div class="cr-progress-wrap" style="margin:12px 0 4px;"><div class="cr-progress-bar" style="width:' + a.pct + '%;"></div></div>' +
        '<p class="qz-hint">To\'langan: <b>' + qzMoney(a.paid * a.monthly) + crVal(d) + '</b> · Qolgan: <b>' + qzMoney(a.debt) + crVal(d) + '</b> · Har oyning ' + d.paymentDay + '-sanasida</p>' +

        '<div class="qz-section-title">Oylar bo\'yicha jadval</div>' +
        '<div class="credit-months">' +
          (d.payments || []).map(p => {
            const isOverdue = p.status === 'pending' && p.dueDate < now;
            const cls = p.status === 'paid' ? 'cm-paid' : (isOverdue ? 'cm-overdue' : 'cm-pending');
            const icon = p.status === 'paid' ? '✓' : (isOverdue ? '⚠' : p.month + '-oy');
            return '<div class="credit-month-chip ' + cls + '" data-id="' + d.id + '" data-month="' + p.month + '" title="' + p.month + '-oy to\'lovi — ' + formatDate(p.dueDate) + '">' +
              '<span class="cm-label">' + icon + '</span><span class="cm-date">' + formatDate(p.dueDate).slice(0, 5) + '</span>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="qz-hint">Xato bosilsa — shu katakchani qayta bosib qaytarish mumkin.</p>' +

        '<div class="contract-status-row">' +
          '<div class="qz-section-title">Shartnoma holati</div>' +
          '<div class="contract-status-buttons cs-grid">' +
            CONTRACT_STATUSES.map(st =>
              '<button class="cs-btn ' + (st.key === status ? 'cs-active' : '') + '"' +
              (st.key === status ? ' style="background:' + st.color + ';border-color:' + st.color + ';"' : '') +
              ' title="' + st.label + '"' +
              ' data-id="' + d.id + '" data-status="' + st.key + '">' + (st.short || st.label) + '</button>').join('') +
          '</div>' +
        '</div>' +

        '<button type="button" class="qz-edit-toggle" data-id="' + d.id + '">' +
          '<span>✎ Shartnoma ma\'lumotlarini tahrirlash</span><span>▾</span>' +
        '</button>' +
        '<div class="qz-edit-box">' +
          '<div class="credit-card" data-id="' + d.id + '" style="border:none;border-radius:0;margin:0;padding:0;background:none;">' +
            '<div class="cr-edit-grid">' +
              '<div><label class="cr-edit-label">Ism</label><input type="text" class="cr-edit-name" value="' + escapeHtml(d.customerName || '') + '"></div>' +
              '<div><label class="cr-edit-label">Ishlab turgan raqami</label><input type="text" class="cr-edit-phone" value="' + escapeHtml(d.customerPhone || '') + '"></div>' +
              '<div><label class="cr-edit-label">Pasport seriya va raqami</label><input type="text" class="cr-edit-passport" value="' + escapeHtml(d.passportNumber || '') + '" placeholder="AD 1234567"></div>' +
              '<div><label class="cr-edit-label">Tug\'ilgan sana</label><input type="date" class="cr-edit-birthdate" value="' + (d.birthDate || '') + '"></div>' +
              '<div style="grid-column:1/-1;"><label class="cr-edit-label">Doimiy yashash joyi</label><input type="text" class="cr-edit-address" value="' + escapeHtml(d.permanentAddress || '') + '" placeholder="Viloyat, tuman, ko\'cha, uy"></div>' +
              '<div><label class="cr-edit-label">Manzil (viloyat)</label><input type="text" class="cr-edit-region" value="' + escapeHtml(d.region || '') + '"></div>' +
              '<div><label class="cr-edit-label">Kreditga olingan raqam</label><input type="text" class="cr-edit-number" value="' + escapeHtml(d.number || '') + '"></div>' +
              '<div><label class="cr-edit-label">Oylik to\'lov</label><input type="number" class="cr-edit-monthly" value="' + a.monthly + '"></div>' +
              '<div><label class="cr-edit-label">Valyuta</label><select class="cr-edit-currency">' +
                '<option value="uzs"' + (crVal(d) === " so\'m" ? ' selected' : '') + '>so\'m (UZS)</option>' +
                '<option value="usd"' + (crVal(d) === ' $' ? ' selected' : '') + '>dollar ($)</option>' +
              '</select></div>' +
              '<div><label class="cr-edit-label">Shartnoma sanasi</label><input type="date" class="cr-edit-date" value="' + (function(){ const t = Number(d.createdAt); const dd = new Date(Number.isFinite(t) && t > 0 ? t : Date.now()); return isNaN(dd) ? '' : dd.toISOString().slice(0, 10); })() + '"></div>' +
              '<div><label class="cr-edit-label">Har oyning nechinchi sanasida (1-31)</label><input type="number" class="cr-edit-payday" min="1" max="31" value="' + d.paymentDay + '"></div>' +
              '<div><label class="cr-edit-label">Necha oyga (jami muddat)</label><input type="number" class="cr-edit-months" min="1" value="' + a.total + '"></div>' +
              '<div style="grid-column:1/-1;"><label class="cr-edit-label">Qo\'shimcha ma\'lumot</label><input type="text" class="cr-edit-info" value="' + escapeHtml(d.additionalInfo || '') + '"></div>' +
            '</div>' +
            '<button class="cr-save-btn" data-id="' + d.id + '">Saqlash</button>' +
            '<p class="qz-hint">Shartnoma sanasi, muddati yoki to\'lov kunini o\'zgartirsangiz, jadval avtomatik qayta hisoblanadi (to\'langan oylar saqlanib qoladi). Shartnoma raqami: <b>' + escapeHtml(d.contractId || '') + '</b></p>' +
          '</div>' +
        '</div>' +

        (a.archived ? '' :
          '<div class="qz-close-row">' +
            '<button type="button" class="qz-close-btn" data-close="' + d.id + '">' +
              '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="5" rx="1.3"/><path d="M5 9v10a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9M10 13h4"/></svg>' +
              'Shartnomani yopish' +
            '</button>' +
          '</div>' +
          '<div class="qz-confirm" data-confirm="' + d.id + '">' +
            '<p>Shartnoma <b>arxivga</b> o\'tadi: ro\'yxatdan chiqadi va qarzdorlik summalariga qo\'shilmaydi. Qanday yopiladi?</p>' +
            '<div class="qz-confirm-btns">' +
              '<button type="button" class="qz-cf cf-done" data-id="' + d.id + '" data-status="completed">✓ Yakunlandi</button>' +
              '<button type="button" class="qz-cf cf-cancel" data-id="' + d.id + '" data-status="cancelled">✕ Bekor bo\'ldi</button>' +
              '<button type="button" class="qz-cf cf-back" data-cfback="' + d.id + '">Bekor qilish</button>' +
            '</div>' +
          '</div>') +
      '</div>' +
    '</div>';
  }).join('') + '</div>';

  /* ---- ochish / yopish ---- */
  list.querySelectorAll('.qz-head').forEach(head => {
    head.addEventListener('click', () => {
      head.closest('.qz-item').classList.toggle('is-open');
    });
  });

  /* ---- shartnomani yopish: avval tasdiq, keyin arxivga ---- */
  list.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const box = list.querySelector('[data-confirm="' + btn.dataset.close + '"]');
      if(box) box.classList.add('is-open');
      btn.closest('.qz-close-row').style.display = 'none';
    });
  });
  list.querySelectorAll('[data-cfback]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const box = btn.closest('.qz-confirm');
      if(box){
        box.classList.remove('is-open');
        const row = box.previousElementSibling;
        if(row && row.classList.contains('qz-close-row')) row.style.display = '';
      }
    });
  });
  list.querySelectorAll('.qz-cf[data-status]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      try{
        await creCall('updateStatus', { id: btn.dataset.id, status: btn.dataset.status });
        vibrate(60);
        loadCreditContracts();
      }catch(err){
        btn.disabled = false;
        alert('Xato: ' + err.message);
      }
    });
  });
  list.querySelectorAll('.qz-reopen').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.disabled = true;
      try{
        await creCall('updateStatus', { id: btn.dataset.id, status: 'active' });
        vibrate(60);
        loadCreditContracts();
      }catch(err){
        btn.disabled = false;
        alert('Xato: ' + err.message);
      }
    });
  });

  /* ---- tahrirlash qismini ochish ---- */
  list.querySelectorAll('.qz-edit-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const box = btn.nextElementSibling;
      if(box) box.classList.toggle('is-open');
    });
  });

  /* ---- Jadval qatoridagi "To'lovni tasdiqlash" ----
     Kartani ochmasdan, bir bosishda tasdiqlanadi — kundalik ishning
     eng ko'p takrorlanadigan amali shu. */
  list.querySelectorAll('.qz-row-pay').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const contract = currentCreditContracts.find(c => c.id === btn.dataset.id);
      if(!contract) return;
      const month = await confirmCreditPayment(contract, Number(btn.dataset.month));
      if(month == null) return;
      btn.disabled = true;
      const eski = btn.textContent;
      btn.textContent = '...';
      try{
        await creCall('updatePayment', { id: btn.dataset.id, month });
        vibrate(60);
        loadCreditContracts();
      }catch(err){
        btn.disabled = false; btn.textContent = eski;
        alert('Xato: ' + err.message);
      }
    });
  });

  /* ---- ASOSIY HARAKAT: to'lovni tasdiqlash ---- */
  list.querySelectorAll('.qz-pay-cta').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const contract = currentCreditContracts.find(c => c.id === btn.dataset.id);
      if(!contract) return;
      const month = await confirmCreditPayment(contract, Number(btn.dataset.month));
      if(month == null) return;
      btn.disabled = true;
      try{
        await creCall('updatePayment', { id: btn.dataset.id, month });
        vibrate(60);
        loadCreditContracts();
      }catch(err){
        btn.disabled = false;
        alert('Xato: ' + err.message);
      }
    });
  });

  /* ---- oy katakchasi: to'landi / to'lanmadi (qaytarish uchun ham) ----
     Bu yerda oy allaqachon aniq (admin xuddi shu katakchani bosdi), shuning
     uchun oy tanlash oynasi chiqmaydi — faqat "shu oyni tasdiqlaysizmi?"
     deb aniq so'raladi (allaqachon to'langan bo'lsa — "bekor qilasizmi?"). */
  list.querySelectorAll('.credit-month-chip').forEach(chip => {
    chip.addEventListener('click', async (e) => {
      e.stopPropagation();
      const contract = currentCreditContracts.find(c => c.id === chip.dataset.id);
      if(!contract) return;
      const isUndo = chip.classList.contains('cm-paid');
      const month = await confirmCreditPayment(contract, Number(chip.dataset.month), { single: true, isUndo });
      if(month == null) return;
      try{
        await creCall('updatePayment', { id: chip.dataset.id, month });
        vibrate(60);
        loadCreditContracts();
      }catch(err){ alert('Xato: ' + err.message); }
    });
  });

  /* ---- shartnoma ma'lumotlarini saqlash ---- */
  list.querySelectorAll('.cr-save-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // ESLATMA: bu yerda PIN-kod SO'RALMAYDI — bu shartnoma sanasi/muddati/
      // kunini TAHRIRLASH (umumiy ma'lumot), to'lovni TASDIQLASH emas. Kod
      // faqat haqiqiy pul harakati — to'lovni tasdiqlash — uchun so'raladi
      // (pastda: qz-row-pay, qz-pay-cta, credit-month-chip). Foydalanuvchi
      // "shartnoma qo'shganimdan keyin ham kod so'raydi" deb shikoyat
      // qilgani uchun bu yerdan olib tashlandi.
      const card = btn.closest('.credit-card');
      const id = btn.dataset.id;
      try{
        const dateVal = card.querySelector('.cr-edit-date').value;
        const payDay = Number(card.querySelector('.cr-edit-payday').value) || 1;
        const newTotalMonths = Number(card.querySelector('.cr-edit-months').value) || 1;
        const newStartTs = dateVal ? new Date(dateVal + 'T00:00:00').getTime() : Date.now();

        // To'langan deb belgilangan oylar saqlanib qoladi.
        const existing = currentCreditContracts.find(c => c.id === id);
        const oldPayments = existing ? existing.payments : [];
        const payments = [];
        for(let i = 0; i < newTotalMonths; i++){
          const old = oldPayments.find(p => p.month === i + 1);
          payments.push({
            month: i + 1,
            dueDate: calcDueDate(newStartTs, payDay, i),
            status: old ? old.status : 'pending',
            paidAt: old ? old.paidAt : null
          });
        }

        await creCall('updateContract', {
          id,
          customerName: card.querySelector('.cr-edit-name').value.trim(),
          customerPhone: card.querySelector('.cr-edit-phone').value.trim(),
          region: card.querySelector('.cr-edit-region').value.trim(),
          number: card.querySelector('.cr-edit-number').value.trim(),
          monthlyPayment: Number(card.querySelector('.cr-edit-monthly').value) || 0,
          currency: (card.querySelector('.cr-edit-currency') || {}).value === 'usd' ? 'USD' : 'UZS',
          additionalInfo: card.querySelector('.cr-edit-info').value.trim(),
          passportNumber: card.querySelector('.cr-edit-passport').value.trim(),
          birthDate: card.querySelector('.cr-edit-birthdate').value,
          permanentAddress: card.querySelector('.cr-edit-address').value.trim(),
          createdAt: newStartTs,
          paymentDay: payDay,
          totalMonths: newTotalMonths,
          payments
        });
        vibrate(60);
        loadCreditContracts();
      }catch(err){ alert('Xato: ' + err.message); }
    });
  });

  /* ---- shartnoma holati ---- */
  list.querySelectorAll('.cs-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try{
        await creCall('updateStatus', { id: btn.dataset.id, status: btn.dataset.status });
        vibrate(80);
        loadCreditContracts();
      }catch(err){ alert('Xato: ' + err.message); }
    });
  });
}

document.getElementById('creditSearchInput').addEventListener('input', debounce((e)=>{
  qzSearchQuery = e.target.value.trim().toLowerCase();
  renderCreditList(currentCreditContracts);
}, 180));

/* ---- Xavfsizlik: eski (auto-ID) shartnomalarni contractId-ID'ga ko'chirish ---- */
document.getElementById('migrateContractsBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('migrateContractsBtn');
  const msg = document.getElementById('migrateContractsMsg');
  btn.disabled = true;
  msg.textContent = 'Tekshirilmoqda...';
  msg.className = 'settings-msg';
  try{
    const data = await creCall('migrate', {});
    const migrated = data.migrated || 0;
    const skipped = data.skipped || 0;
    msg.textContent = migrated > 0
      ? `✓ ${migrated} ta shartnoma moslashtirildi (${skipped} ta allaqachon to'g'ri edi). Endi bosishingiz shart emas.`
      : `✓ Hammasi allaqachon to'g'ri — moslashtirish shart emas edi.`;
    msg.className = 'settings-msg ok';
    vibrate(80);
    loadCreditContracts();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
  btn.disabled = false;
});

/* ---- Excel hisobotni hoziroq yuborish ---- */
document.getElementById('sendExcelNowBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('sendExcelNowBtn');
  const msg = document.getElementById('excelNowMsg');
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = '⏳ Yuborilmoqda...';
  msg.textContent = '';
  msg.className = 'settings-msg';
  try{
    const idToken = await firebase.auth().currentUser.getIdToken();
    const res = await fetch('/.netlify/functions/send-excel-now', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    const data = await res.json().catch(()=>({}));
    if(res.ok && data.ok){
      msg.textContent = `✓ Excel Telegram botingizga yuborildi (${data.contracts} ta shartnoma, ${data.numbers} ta raqam).`;
      msg.className = 'settings-msg ok';
      vibrate(80);
    }else{
      throw new Error(data.error || 'Server xatosi — Netlify logini tekshiring');
    }
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
  btn.disabled = false;
  btn.textContent = oldText;
});

/* ==================================================================
   "KIRIM-CHIQIM" — avvalgi shaxsiy Telegram bot bilan bir xil
   Firestore kolleksiyasiga ('personal_bot_tx') yozadi — shu sabab
   admin paneldan qo'shilgan yozuvlar botning statistika/hisobotlariga
   ham avtomatik qo'shiladi.
   ================================================================== */
async function finCall(action, extra){
  const idToken = await firebase.auth().currentUser.getIdToken();
  const res = await fetch('/.netlify/functions/admin-finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
    body: JSON.stringify(Object.assign({ action }, extra || {}))
  });
  const data = await res.json();
  if(!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function finFormatTime(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  const pad = n => String(n).padStart(2,'0');
  return pad(d.getDate()) + '.' + pad(d.getMonth()+1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function finRenderRecent(recentTx){
  const list = document.getElementById('finRecentList');
  if(!recentTx || recentTx.length === 0){
    list.innerHTML = '<div class="empty-admin">Hali yozuv yo\'q.</div>';
    return;
  }
  list.innerHTML = recentTx.map(t => `
    <div class="fin-tx-row ${t.type === 'income' ? 'tx-income' : 'tx-expense'}">
      <div class="fin-tx-ico">${t.type === 'income' ? '💰' : '📉'}</div>
      <div class="fin-tx-cat">${escapeHtml(t.category || '')}</div>
      <div class="fin-tx-time">${finFormatTime(t.ts)}</div>
      <div class="fin-tx-amount">${t.type === 'income' ? '+' : '-'}${formatPrice(t.amount || 0)}</div>
    </div>
  `).join('');
}

// Bosh admin "Boshqaruv"dan biror sub-adminning "💰 Kirim-Chiqimi"
// tugmasini bossa, shu ikkalasi o'sha kishining uid/ismini saqlaydi —
// Sessions filtridagi bilan bir xil andoza (mgmt-finance-btn qarang).
let financeFilterUid = null;
let financeFilterName = null;

function finRenderFilterBanner(){
  const banner = document.getElementById('financeFilterBanner');
  const addSection = document.getElementById('finAddSection');
  if(financeFilterUid){
    banner.style.display = 'block';
    banner.innerHTML = `🔎 Faqat <b>${escapeHtml(financeFilterName || '')}</b> ning kirim-chiqimlari ko'rsatilmoqda (faqat ko'rish). <a href="#" id="financeClearFilter" style="color:var(--amber);">O'zimnikini ko'rsatish</a>`;
    const clearLink = document.getElementById('financeClearFilter');
    if(clearLink) clearLink.addEventListener('click', (e)=>{
      e.preventDefault();
      financeFilterUid = null;
      financeFilterName = null;
      loadFinanceSummary();
    });
    // Boshqa adminning profilini ko'rish — FAQAT ko'rish, shu yerdan
    // uning nomidan yozuv qo'shib bo'lmaydi (server ham buni ruxsat
    // bermaydi, lekin UI'da ham shart emas narsani ko'rsatmaymiz).
    if(addSection) addSection.style.display = 'none';
  } else {
    banner.style.display = 'none';
    banner.innerHTML = '';
    if(addSection) addSection.style.display = '';
  }
}

const finRecentToggleBtn = document.getElementById('finRecentToggle');
if(finRecentToggleBtn){
  finRecentToggleBtn.addEventListener('click', ()=>{
    const list = document.getElementById('finRecentList');
    const arrow = document.getElementById('finRecentArrow');
    const open = list.style.display !== 'none';
    list.style.display = open ? 'none' : '';
    if(arrow) arrow.textContent = open ? '▾' : '▴';
  });
}

async function loadFinanceSummary(){
  const list = document.getElementById('finRecentList');
  list.innerHTML = '<div class="empty-admin">Yuklanmoqda...</div>';
  finRenderFilterBanner();
  try{
    const data = await finCall('summary', financeFilterUid ? { viewUid: financeFilterUid } : {});
    document.getElementById('finIncomeValue').textContent = formatPrice(data.incomeThisMonth || 0);
    document.getElementById('finExpenseValue').textContent = formatPrice(data.expenseThisMonth || 0);
    document.getElementById('finDueValue').textContent = formatPrice(data.dueThisMonth || 0);
    finRenderRecent(data.recentTx);
  }catch(err){
    list.innerHTML = '<div class="empty-admin">Xato: ' + escapeHtml(err.message) + '</div>';
  }
}

/* ---- Daromad/Xarajat forma ochish-yopish ---- */
document.getElementById('finOpenIncomeBtn').addEventListener('click', ()=>{
  document.getElementById('finExpenseForm').style.display = 'none';
  const form = document.getElementById('finIncomeForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('finOpenExpenseBtn').addEventListener('click', ()=>{
  document.getElementById('finIncomeForm').style.display = 'none';
  const form = document.getElementById('finExpenseForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('finIncomeCancelBtn').addEventListener('click', ()=>{
  document.getElementById('finIncomeForm').style.display = 'none';
});
document.getElementById('finExpenseCancelBtn').addEventListener('click', ()=>{
  document.getElementById('finExpenseForm').style.display = 'none';
});

/* ---- Kategoriya tanlash tugmalari ---- */
let finIncomeCategory = 'Vip raqamlar';
let finExpenseCategory = 'Investitsiya';
document.querySelectorAll('#finIncomeCatPicker .fin-cat-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#finIncomeCatPicker .fin-cat-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    finIncomeCategory = btn.dataset.cat;
  });
});
document.querySelectorAll('#finExpenseCatPicker .fin-cat-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#finExpenseCatPicker .fin-cat-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    finExpenseCategory = btn.dataset.cat;
  });
});

/* ---- Tasdiqlash ---- */
document.getElementById('finIncomeConfirmBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('finIncomeConfirmBtn');
  const msg = document.getElementById('finIncomeMsg');
  const amountInput = document.getElementById('finIncomeAmount');
  const amount = Number(amountInput.value);
  if(!amount || amount <= 0){
    msg.textContent = "Summani to'g'ri kiriting";
    msg.className = 'settings-msg bad';
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Saqlanmoqda...';
  msg.className = 'settings-msg';
  try{
    await finCall('add', { type: 'income', amount, category: finIncomeCategory });
    msg.textContent = `✅ +${formatPrice(amount)} (${finIncomeCategory}) qo'shildi`;
    msg.className = 'settings-msg ok';
    vibrate(80);
    amountInput.value = '';
    setTimeout(()=>{ document.getElementById('finIncomeForm').style.display = 'none'; msg.textContent = ''; }, 1200);
    loadFinanceSummary();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
  btn.disabled = false;
});
document.getElementById('finExpenseConfirmBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('finExpenseConfirmBtn');
  const msg = document.getElementById('finExpenseMsg');
  const amountInput = document.getElementById('finExpenseAmount');
  const amount = Number(amountInput.value);
  if(!amount || amount <= 0){
    msg.textContent = "Summani to'g'ri kiriting";
    msg.className = 'settings-msg bad';
    return;
  }
  btn.disabled = true;
  msg.textContent = 'Saqlanmoqda...';
  msg.className = 'settings-msg';
  try{
    await finCall('add', { type: 'expense', amount, category: finExpenseCategory });
    msg.textContent = `✅ -${formatPrice(amount)} (${finExpenseCategory}) qo'shildi`;
    msg.className = 'settings-msg ok';
    vibrate(80);
    amountInput.value = '';
    setTimeout(()=>{ document.getElementById('finExpenseForm').style.display = 'none'; msg.textContent = ''; }, 1200);
    loadFinanceSummary();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
  btn.disabled = false;
});

/* ---- Promokodlar ---- */
async function loadPromoCodes(){
  const list = document.getElementById('promoList');
  list.innerHTML = 'Yuklanmoqda...';
  try{
    const snap = await db.collection('promo_codes').get();
    if(snap.empty){ list.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali promokod yo\'q.</div>'; return; }
    list.innerHTML = snap.docs.map(doc => {
      const d = doc.data();
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:8px 12px;">
          <div style="font-size:12.5px;"><b>${escapeHtml(d.code)}</b> — ${formatPrice(d.discount || 0)} chegirma</div>
          <button class="promo-delete" data-id="${doc.id}" style="background:none;border:none;color:var(--red);font-size:12px;cursor:pointer;">O'chirish</button>
        </div>`;
    }).join('');
    list.querySelectorAll('.promo-delete').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(!confirm("Bu promokodni o'chirasizmi?")) return;
        await db.collection('promo_codes').doc(btn.dataset.id).delete();
        loadPromoCodes();
      });
    });
  }catch(e){ list.innerHTML = 'Xato: ' + e.message; }
}
loadPromoCodes();

document.getElementById('addPromoBtn').addEventListener('click', async ()=>{
  const codeInput = document.getElementById('newPromoCode');
  const discountInput = document.getElementById('newPromoDiscount');
  const msg = document.getElementById('promoAddMsg');
  const code = codeInput.value.trim().toUpperCase();
  const discount = Number(discountInput.value) || 0;
  if(!code || discount <= 0){
    msg.textContent = "Kod va chegirma summasini to'g'ri kiriting";
    msg.className = 'settings-msg bad';
    return;
  }
  try{
    await db.collection('promo_codes').add({ code, discount, createdAt: Date.now() });
    codeInput.value = ''; discountInput.value = '';
    msg.textContent = '✓ Promokod qo\'shildi';
    msg.className = 'settings-msg ok';
    vibrate(80);
    loadPromoCodes();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
});

async function loadSiteSettingsForm(){
  renderStylePicker();
  try{
    const doc = await db.collection('site_settings').doc('general').get();
    if(!doc.exists) return;
    const s = doc.data();
    if(s.catalogStyle && CATALOG_STYLES.some(cs => cs.key === s.catalogStyle)){ currentCatalogStyle = s.catalogStyle; renderStylePicker(); }
    document.getElementById('siteTelegramLink').value = s.telegramLink || '';
    document.getElementById('siteInstagramLink').value = s.instagramLink || '';
    document.getElementById('siteContactLink').value = s.contactLink || '';
    document.getElementById('siteAdminContactLink').value = s.adminContactLink || '';
    document.getElementById('officeAddress').value = s.officeAddress || '';
    document.getElementById('officeLat').value = s.officeLat || '41.289757';
    document.getElementById('officeLng').value = s.officeLng || '69.201657';
    document.getElementById('yandexApiKey').value = s.yandexApiKey || '788242a0-f999-487f-801f-01d3a640f448';
    document.getElementById('siteWorkingHours').value = s.workingHours || '';
    document.getElementById('siteDeliveryText').value = s.deliveryText || '';
    const ir = (s.installmentRates && typeof s.installmentRates === 'object') ? s.installmentRates : {};
    document.getElementById('installmentRate6').value = (typeof ir[6] === 'number') ? ir[6] : 5;
    document.getElementById('installmentRate12').value = (typeof ir[12] === 'number') ? ir[12] : 10;
    document.getElementById('installmentRate24').value = (typeof ir[24] === 'number') ? ir[24] : 20;
    document.getElementById('installmentRate36').value = (typeof ir[36] === 'number') ? ir[36] : 30;
    /* ==================================================================
       TO'LOVNI TASDIQLASH KODI — ENDI MAXFIY JOYDA (V75)
       ------------------------------------------------------------------
       MUAMMO: bu kod `site_settings/general` hujjatida turardi, u esa
       saytga OCHIQ o'qiladigan hujjat (katalog uslublari, aloqa
       havolalari va h.k. shu yerda). Ya'ni kodni istalgan odam
       brauzerdan o'qib olishi mumkin edi — himoya ma'nosini yo'qotadi.
       ENDI: kod `admin_meta/pay` hujjatida saqlanadi — u Firestore
       qoidalarida FAQAT adminlar uchun ochiq. Eski joyda qolib ketgan
       bo'lsa — birinchi ochilishda avtomatik ko'chiriladi va ochiq
       joydan O'CHIRILADI. */
    (async ()=>{
      let kod = '';
      try{
        const mx = await db.collection('admin_meta').doc('pay').get();
        if(mx.exists && typeof (mx.data() || {}).code === 'string') kod = mx.data().code;
      }catch(e){}
      if(!kod && typeof s.paymentConfirmCode === 'string' && s.paymentConfirmCode){
        kod = s.paymentConfirmCode;                       /* ko'chirish */
        try{
          await db.collection('admin_meta').doc('pay').set({ code: kod, movedAt: Date.now() }, { merge: true });
          await db.collection('site_settings').doc('general').set({ paymentConfirmCode: '' }, { merge: true });
          if(typeof panelToast === 'function') panelToast("To'lov kodi maxfiy joyga ko'chirildi", 'ok');
        }catch(e){}
      }
      window.PAYMENT_CONFIRM_CODE = kod;
      const pcEl = document.getElementById('paymentConfirmCode');
      if(pcEl) pcEl.value = kod;
    })();
  }catch(e){ console.error('Sayt sozlamalarini yuklashda xato:', e); }
}
loadSiteSettingsForm();

document.getElementById('saveSiteSettingsBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('siteSettingsMsg');
  try{
    await db.collection('site_settings').doc('general').set({
      telegramLink: document.getElementById('siteTelegramLink').value.trim(),
      instagramLink: document.getElementById('siteInstagramLink').value.trim(),
      contactLink: document.getElementById('siteContactLink').value.trim(),
      adminContactLink: document.getElementById('siteAdminContactLink').value.trim(),
      officeAddress: document.getElementById('officeAddress').value.trim(),
      officeLat: document.getElementById('officeLat').value.trim(),
      officeLng: document.getElementById('officeLng').value.trim(),
      yandexApiKey: document.getElementById('yandexApiKey').value.trim(),
      workingHours: document.getElementById('siteWorkingHours').value.trim(),
      deliveryText: document.getElementById('siteDeliveryText').value.trim()
    }, { merge: true });
    msg.textContent = '✓ Sayt sozlamalari saqlandi.';
    msg.className = 'settings-msg ok';
    vibrate(80);
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
});

document.getElementById('saveInstallmentRatesBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('installmentRatesMsg');
  try{
    await db.collection('site_settings').doc('general').set({
      installmentRates: {
        6: Number(document.getElementById('installmentRate6').value) || 0,
        12: Number(document.getElementById('installmentRate12').value) || 0,
        24: Number(document.getElementById('installmentRate24').value) || 0,
        36: Number(document.getElementById('installmentRate36').value) || 0
      }
    }, { merge: true });
    msg.textContent = '✓ Foizlar saqlandi.';
    msg.className = 'settings-msg ok';
    vibrate(80);
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
});

/* ==================================================================
   KREDIT TO'LOVLARINI TASDIQLASH KODI
   Sozlamalarda bitta umumiy kod qo'yilsa, kredit bo'limida har bir
   to'lovni "to'landi" qilishdan yoki shartnomani tahrirlab saqlashdan
   oldin shu kod so'raladi. Kod bo'sh bo'lsa — hech narsa so'ralmaydi.
   ================================================================== */
(function(){
  const stil = document.createElement('style');
  stil.textContent = `
    .pin-modal-back{position:fixed;inset:0;z-index:9000;background:rgba(13,27,61,.45);
      display:none;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);}
    .pin-modal-back.is-open{display:flex;animation:fadeIn .15s ease both;}
    .pin-modal{width:100%;max-width:300px;background:var(--panel);border:1px solid var(--line);
      border-radius:16px;padding:22px 20px;box-shadow:0 20px 60px rgba(13,27,61,.25);
      animation:popIn .2s cubic-bezier(.34,1.56,.64,1) both;text-align:center;}
    .pin-modal h3{margin:0 0 4px;font-size:16px;font-weight:800;color:var(--text);font-family:'Sora',sans-serif;}
    .pin-modal p{margin:0 0 14px;font-size:12.5px;color:var(--muted);}
    .pin-modal input{width:100%;text-align:center;letter-spacing:.3em;font-size:20px;font-weight:700;
      padding:12px;border-radius:10px;border:1.5px solid var(--line);background:var(--panel-2);
      color:var(--text);outline:none;box-sizing:border-box;}
    .pin-modal input:focus{border-color:var(--amber);}
    .pin-modal-err{display:none;color:var(--red);font-size:12px;font-weight:600;margin-top:8px;}
    .pin-modal-btns{display:flex;gap:8px;margin-top:16px;}
    .pin-modal-btns button{flex:1;padding:11px;border-radius:10px;font-weight:700;font-size:13.5px;cursor:pointer;border:none;}
    .pin-modal-cancel{background:var(--panel-2);border:1px solid var(--line) !important;color:var(--text-2);}
    .pin-modal-ok{background:var(--amber);color:#fff;}
    .pin-modal-ok.is-danger{background:var(--red);}

    /* ---- To'lov tasdiqlash oynasi (Kredit) — kengaytirilgan versiya:
       endi faqat kod emas, QAYSI OYni tasdiqlayotgani ham aniq so'raladi,
       shuning uchun bitta tugma bosilishi bilan hech narsa "birdaniga"
       o'zgarib ketmaydi. ---- */
    .pay-confirm-modal{max-width:340px;text-align:left;}
    .pay-confirm-modal h3{text-align:center;}
    .pcm-icon{
      width:46px;height:46px;border-radius:13px;margin:0 auto 12px;
      background:linear-gradient(135deg,#4F8CFF,#1546D6);color:#fff;
      display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -4px rgba(21,70,214,.5);
    }
    .pcm-icon svg{width:22px;height:22px;}
    .pcm-icon.is-danger{background:linear-gradient(135deg,#FB923C,#DC2626);box-shadow:0 6px 14px -4px rgba(220,38,38,.5);}
    .pay-confirm-modal p.pcm-client{text-align:center;font-weight:700;color:var(--text);font-size:13px;margin:0 0 16px;}
    .pcm-label{display:block;font-size:11.5px;font-weight:700;color:var(--muted);margin:0 0 6px;}
    .pcm-select, .pay-confirm-modal input{
      width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid var(--line);
      background:var(--panel-2);color:var(--text);font-size:13px;font-weight:700;outline:none;
      box-sizing:border-box;margin-bottom:14px;font-family:inherit;
    }
    .pcm-select:focus, .pay-confirm-modal input:focus{border-color:var(--amber);}
    .pay-confirm-modal input{text-align:center;letter-spacing:.3em;font-size:18px;}
    .pcm-month-fixed{
      background:var(--panel-2);border:1.5px solid var(--line);border-radius:10px;
      padding:11px 12px;font-weight:800;font-size:13px;color:var(--text);margin-bottom:14px;
    }
    .pcm-amount{
      display:flex;align-items:center;justify-content:space-between;
      background:rgba(15,157,88,.08);color:var(--green);border-radius:10px;padding:10px 14px;
      font-weight:800;font-size:14px;margin-bottom:16px;
    }
    .pcm-amount.is-danger{background:rgba(220,38,38,.08);color:var(--red);}
  `;
  document.head.appendChild(stil);
})();

function askPaymentCode(){
  return new Promise((resolve) => {
    const code = ((window.PAYMENT_CONFIRM_CODE != null) ? String(window.PAYMENT_CONFIRM_CODE) : '').trim();
    if(!code){ resolve(true); return; }

    let modal = document.getElementById('pinConfirmModal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'pinConfirmModal';
      modal.className = 'pin-modal-back';
      modal.innerHTML =
        '<div class="pin-modal">' +
          '<h3>🔒 Tasdiqlash kodi</h3>' +
          '<p>Davom etish uchun kodni kiriting</p>' +
          '<input type="password" inputmode="numeric" id="pinModalInput" autocomplete="off">' +
          '<div class="pin-modal-err" id="pinModalErr">Kod noto\'g\'ri, qaytadan urinib ko\'ring</div>' +
          '<div class="pin-modal-btns">' +
            '<button type="button" class="pin-modal-cancel">Bekor qilish</button>' +
            '<button type="button" class="pin-modal-ok">Tasdiqlash</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
    }

    const input = modal.querySelector('#pinModalInput');
    const err = modal.querySelector('#pinModalErr');
    const okBtn = modal.querySelector('.pin-modal-ok');
    const cancelBtn = modal.querySelector('.pin-modal-cancel');
    input.value = '';
    err.style.display = 'none';
    modal.classList.add('is-open');
    setTimeout(() => input.focus(), 60);

    function cleanup(result){
      modal.classList.remove('is-open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onOk(){
      if(input.value.trim() === code){ cleanup(true); }
      else{ err.style.display = 'block'; input.value = ''; input.focus(); if(window.vibrate) vibrate(120); }
    }
    function onCancel(){ cleanup(false); }
    function onKey(e){ if(e.key === 'Enter') onOk(); if(e.key === 'Escape') onCancel(); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
  });
}

/* ==================================================================
   KREDIT — TO'LOVNI TASDIQLASH OYNASI (yaxshilangan)
   Avval: tugma bosilishi bilan (agar PIN kod sozlanmagan bo'lsa) hech
   qanday so'rovsiz, DARHOL "to'landi" deb belgilanardi — admin "qaysi
   oyni bosganimni bilmay qoldim" deb shikoyat qildi. Endi har doim:
   1) qaysi oy uchun ekani alohida oynada aniq ko'rsatiladi (bir nechta
      to'lanmagan oy bo'lsa — tanlab olish mumkin),
   2) agar Sozlamalar'da tasdiqlash kodi o'rnatilgan bo'lsa, o'sha kod
      so'raladi,
   3) ikkala holatda ham "Tasdiqlash" tugmasini ANIQ bosish shart —
      demak endi hech narsa "birdaniga" o'zgarib ketmaydi.
   contract — currentCreditContracts'dagi to'liq shartnoma obyekti.
   opts.single = true bo'lsa — oy tanlanmaydi, aniq bitta oy ko'rsatiladi
   (oylar jadvalidagi bitta katakchani bosganda ishlatiladi).
   opts.isUndo = true bo'lsa — "to'lovni bekor qilish" matni va qizil rang.
   Natija: tanlangan oy raqami (Number) yoki bekor qilinsa null.
   ================================================================== */
function confirmCreditPayment(contract, defaultMonth, opts){
  opts = opts || {};
  return new Promise((resolve) => {
    const payments = contract.payments || [];
    const pending = opts.single
      ? payments.filter(p => p.month === defaultMonth)
      : payments.filter(p => p.status !== 'paid').sort((a,b) => a.month - b.month);
    if(!pending.length){ resolve(null); return; }

    const code = ((window.PAYMENT_CONFIRM_CODE != null) ? String(window.PAYMENT_CONFIRM_CODE) : '').trim();

    const old = document.getElementById('payConfirmModal');
    if(old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'payConfirmModal';
    modal.className = 'pin-modal-back';

    const chosen = pending.find(p => p.month === defaultMonth) || pending[0];
    const monthField = opts.single
      ? '<div class="pcm-month-fixed">' + chosen.month + '-oy &middot; muddati ' + formatDate(chosen.dueDate) + '</div>'
      : '<label class="pcm-label" for="pcmMonthSelect">Qaysi oy uchun tasdiqlaysiz?</label>' +
        '<select id="pcmMonthSelect" class="pcm-select">' +
          pending.map(p => '<option value="' + p.month + '"' + (p.month === chosen.month ? ' selected' : '') + '>' +
            p.month + '-oy — muddati ' + formatDate(p.dueDate) + '</option>').join('') +
        '</select>';

    modal.innerHTML =
      '<div class="pin-modal pay-confirm-modal">' +
        '<div class="pcm-icon' + (opts.isUndo ? ' is-danger' : '') + '">' + (ICONS.creditCard || '') + '</div>' +
        '<h3>' + (opts.isUndo ? "To'lovni bekor qilish" : "To'lovni tasdiqlash") + '</h3>' +
        '<p class="pcm-client">' + escapeHtml(contract.customerName || '') + ' &middot; ' + escapeHtml(contract.number || '') + '</p>' +
        monthField +
        '<div class="pcm-amount' + (opts.isUndo ? ' is-danger' : '') + '"><span>Oylik to\'lov</span><span>' + qzMoney(contract.monthlyPayment || 0) + crVal(contract) + '</span></div>' +
        (code
          ? '<label class="pcm-label" for="pcmPinInput">Tasdiqlash kodi</label>' +
            '<input type="password" inputmode="numeric" id="pcmPinInput" autocomplete="off">' +
            '<div class="pin-modal-err" id="pcmPinErr">Kod noto\'g\'ri, qaytadan urinib ko\'ring</div>'
          : '') +
        '<div class="pin-modal-btns">' +
          '<button type="button" class="pin-modal-cancel">Bekor qilish</button>' +
          '<button type="button" class="pin-modal-ok' + (opts.isUndo ? ' is-danger' : '') + '">' + (opts.isUndo ? "Bekor qilaman" : "Tasdiqlash") + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    const select = modal.querySelector('#pcmMonthSelect');
    const pinInput = modal.querySelector('#pcmPinInput');
    const pinErr = modal.querySelector('#pcmPinErr');
    const okBtn = modal.querySelector('.pin-modal-ok');
    const cancelBtn = modal.querySelector('.pin-modal-cancel');

    requestAnimationFrame(() => modal.classList.add('is-open'));
    setTimeout(() => { (pinInput || select || okBtn).focus(); }, 60);

    function cleanup(result){
      modal.classList.remove('is-open');
      setTimeout(() => { if(modal.parentNode) modal.remove(); }, 180);
      resolve(result);
    }
    function onOk(){
      if(pinInput && pinInput.value.trim() !== code){
        pinErr.style.display = 'block'; pinInput.value = ''; pinInput.focus();
        if(window.vibrate) vibrate(120);
        return;
      }
      cleanup(Number(opts.single ? chosen.month : select.value));
    }
    function onCancel(){ cleanup(null); }
    function onKey(e){ if(e.key === 'Enter') onOk(); if(e.key === 'Escape') onCancel(); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    modal.addEventListener('keydown', onKey);
  });
}

document.getElementById('savePaymentCodeBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('paymentCodeMsg');
  try{
    const code = document.getElementById('paymentConfirmCode').value.trim();
    /* Maxfiy joyga (faqat adminlar o'qiy oladigan hujjatga) yoziladi */
    await db.collection('admin_meta').doc('pay').set({ code, updatedAt: Date.now() }, { merge: true });
    /* Ochiq hujjatda eski nusxa qolib ketmasin */
    try{ await db.collection('site_settings').doc('general').set({ paymentConfirmCode: '' }, { merge: true }); }catch(e){}
    window.PAYMENT_CONFIRM_CODE = code;
    msg.textContent = code ? '✓ Kod saqlandi.' : '✓ Kod o\'chirildi — endi so\'ralmaydi.';
    msg.className = 'settings-msg ok';
    vibrate(80);
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.className = 'settings-msg bad';
  }
});

/* ================= SOTUVCHILAR (dilerlar) =================
   Hamkor sotuvchilar o'z raqamlarini saytga qo'yadi. Komissiya yo'q —
   daromad tarif obunasidan. Butun mantiq serverda (netlify/functions/admin-sellers.js) —
   bu yerda faqat ko'rinish va so'rovlar.
   Sotuvchi kabineti: /sotuvchi.html */
async function selCall(action, extra){
  const idToken = await firebase.auth().currentUser.getIdToken();
  const res = await fetch('/.netlify/functions/admin-sellers', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + idToken },
    body: JSON.stringify(Object.assign({ action }, extra || {}))
  });
  const data = await res.json();
  if(!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

let SEL_CHAT_ID = null;

async function loadSellers(){
  const box = document.getElementById('selList');
  if(!box) return;
  box.innerHTML = 'Yuklanmoqda...';
  try{
    const j = await selCall('list');
    const unread = j.sellers.reduce((a,x) => a + (x.unread || 0), 0);
    const badge = document.getElementById('selTabBadge');
    if(badge){ badge.textContent = unread; badge.style.display = unread > 0 ? '' : 'none'; }

    if(!j.sellers.length){ box.innerHTML = "Hali sotuvchi yo'q. Yuqoridagi shakldan birinchi hisobni yarating."; return; }

    box.innerHTML = '<div style="overflow-x:auto"><table><thead><tr>' +
      '<th>Sotuvchi</th><th>Login</th><th style="text-align:right">Raqamlar</th>' +
      '<th>Tarif</th><th>Holat</th><th></th>' +
      '</tr></thead><tbody>' +
      j.sellers.map(x =>
        '<tr>' +
        '<td><b>' + escapeHtml(x.name) + '</b>' +
          (x.phone ? '<div class="muted" style="font-size:11.5px">' + escapeHtml(x.phone) + '</div>' : '') + '</td>' +
        '<td><code>' + escapeHtml(x.username) + '</code></td>' +
        '<td style="text-align:right">' + x.numbers +
          (x.promo ? '<div class="muted" style="font-size:11px">' + escapeHtml(x.promo) + ' ajratilgan</div>' : '') + '</td>' +
        '<td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-trf="' + escapeHtml(x.id) + '">' +
          (x.plan ? escapeHtml(String(x.plan).toUpperCase()) + (x.planKun != null ? ' \u00B7 ' + x.planKun + ' kun' : '') : 'Tarif yo\u2018q') +
        '</button></td>' +
        '<td><span class="sv-pill ' + (x.blocked ? 'sv-off' : 'sv-on') + '">' + (x.blocked ? 'Bloklangan' : 'Faol') + '</span></td>' +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn btn-ghost btn-sm" data-chat="' + escapeHtml(x.id) + '" data-who="' + escapeHtml(x.name) + '">Yozishma' +
            (x.unread ? ' (' + x.unread + ')' : '') + '</button> ' +
          '<button class="btn btn-ghost btn-sm" data-pass="' + escapeHtml(x.id) + '">Parol</button> ' +
          '<button class="btn btn-ghost btn-sm" data-block="' + escapeHtml(x.id) + '" data-now="' + (x.blocked?'1':'0') + '">' +
            (x.blocked ? 'Ochish' : 'Bloklash') + '</button> ' +
          '<button class="btn btn-dan btn-sm" data-del="' + escapeHtml(x.id) + '">&#10005;</button>' +
        '</td></tr>'
      ).join('') + '</tbody></table></div>';

    box.querySelectorAll('[data-block]').forEach(b => b.onclick = async ()=>{
      try{ await selCall('update', { id: b.dataset.block, blocked: b.dataset.now !== '1' }); loadSellers(); }
      catch(e){ alert(e.message); }
    });
    box.querySelectorAll('[data-pass]').forEach(b => b.onclick = async ()=>{
      const pw = prompt('Yangi parol (kamida 8 belgi):');
      if(!pw) return;
      try{ await selCall('resetPassword', { id: b.dataset.pass, password: pw });
           alert("Parol o'zgartirildi. Sotuvchiga yangi parolni yetkazing."); }
      catch(e){ alert(e.message); }
    });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = async ()=>{
      if(!confirm("Sotuvchi hisobi o'chirilsinmi?")) return;
      try{ await selCall('remove', { id: b.dataset.del }); loadSellers(); }
      catch(e){ alert(e.message); }
    });
    box.querySelectorAll('[data-chat]').forEach(b => b.onclick = ()=> selOpenChat(b.dataset.chat, b.dataset.who));
    box.querySelectorAll('[data-trf]').forEach(b => b.onclick = ()=> tarifQolda(b.dataset.trf));
  }catch(e){
    box.innerHTML = 'Xato: ' + escapeHtml(e.message);
  }
}


/* ================= TARIFLAR (Pro / Max) =================
   Dilerlardan keladigan asosiy daromad. Narx, muddat, toifalar va
   limit Firestore'dagi bitta hujjatda (sys_config/tariflar) turadi;
   shu yerdan tahrirlanadi. Yangi tarif qo'shish uchun ham kodga
   tegish kerak emas.
   Server: netlify/functions/admin-sellers.js (action: tariflar*) */
let TRF = [], TRF_TOIFA = ['vip','premium','gold'];

async function loadTariffs(){
  const box = document.getElementById('trfBox');
  const sbox = document.getElementById('trfSorov');
  if(!box) return;
  box.innerHTML = 'Yuklanmoqda...';
  try{
    const j = await selCall('tariflar');
    TRF = j.plans || [];
    if(Array.isArray(j.toifalar) && j.toifalar.length) TRF_TOIFA = j.toifalar;
    renderTariffs();
    renderTarifSorov(j.sorovlar || []);
  }catch(e){
    box.innerHTML = 'Xato: ' + escapeHtml(e.message);
    if(sbox) sbox.innerHTML = '';
  }
}

function renderTariffs(){
  const box = document.getElementById('trfBox');
  box.innerHTML = '<div style="overflow-x:auto"><table><thead><tr>' +
    '<th>ID</th><th>Nomi</th><th style="text-align:right">Narx</th>' +
    '<th style="text-align:right">Kun</th>' +
    '<th style="text-align:right" title="Diler umuman nechta raqam joylay oladi">Raqam limiti</th>' +
    '<th style="text-align:right" title="Shu raqamlarning nechtasiga toifa qo\u2018yish mumkin">Toifali</th>' +
    '<th>Toifalar</th><th>Mashhur</th><th>Izoh</th><th></th>' +
    '</tr></thead><tbody>' +
    TRF.map((p, i) =>
      '<tr>' +
      '<td><input class="inp" style="width:80px;padding:6px 8px" value="' + escapeHtml(p.id) + '" data-t="id" data-i="' + i + '"></td>' +
      '<td><input class="inp" style="width:96px;padding:6px 8px" value="' + escapeHtml(p.name) + '" data-t="name" data-i="' + i + '"></td>' +
      '<td style="text-align:right"><input class="inp" style="width:104px;padding:6px 8px;text-align:right" type="number" min="0" step="1000" value="' + (Number(p.price)||0) + '" data-t="price" data-i="' + i + '"></td>' +
      '<td style="text-align:right"><input class="inp" style="width:62px;padding:6px 8px;text-align:right" type="number" min="1" max="3650" value="' + (Number(p.days)||30) + '" data-t="days" data-i="' + i + '"></td>' +
      '<td style="text-align:right"><input class="inp" style="width:72px;padding:6px 8px;text-align:right" type="number" min="0" max="100000" value="' + (Number(p.limit)||0) + '" data-t="limit" data-i="' + i + '"></td>' +
      '<td style="text-align:right"><input class="inp" style="width:62px;padding:6px 8px;text-align:right" type="number" min="0" max="100000" value="' + (Number(p.quota)||0) + '" data-t="quota" data-i="' + i + '"></td>' +
      '<td style="white-space:nowrap">' + TRF_TOIFA.map(t =>
          '<label style="margin-right:8px;font-size:11.5px;white-space:nowrap">' +
          '<input type="checkbox" data-t="tier" data-i="' + i + '" data-v="' + escapeHtml(t) + '"' +
          ((p.tiers||[]).indexOf(t) !== -1 ? ' checked' : '') + '> ' + escapeHtml(t.toUpperCase()) + '</label>').join('') + '</td>' +
      '<td><input type="checkbox" data-t="featured" data-i="' + i + '"' + (p.featured ? ' checked' : '') + '></td>' +
      '<td><input class="inp" style="min-width:180px;padding:6px 8px" value="' + escapeHtml(p.desc||'') + '" data-t="desc" data-i="' + i + '"></td>' +
      '<td style="text-align:right"><button class="btn btn-dan btn-sm" data-trfdel="' + i + '">&#10005;</button></td>' +
      '</tr>').join('') + '</tbody></table></div>';

  box.querySelectorAll('[data-t]').forEach(el => el.addEventListener('change', ()=>{
    const i = Number(el.dataset.i), k = el.dataset.t, p = TRF[i]; if(!p) return;
    if(k === 'tier'){
      p.tiers = p.tiers || [];
      const v = el.dataset.v, j = p.tiers.indexOf(v);
      if(el.checked && j === -1) p.tiers.push(v);
      if(!el.checked && j !== -1) p.tiers.splice(j, 1);
    }else if(k === 'featured'){ p.featured = el.checked; }
    else if(k === 'price' || k === 'days' || k === 'quota' || k === 'limit'){ p[k] = Number(el.value) || 0; }
    else { p[k] = el.value; }
  }));
  box.querySelectorAll('[data-trfdel]').forEach(b => b.onclick = ()=>{
    if(!confirm("Tarif ro'yxatdan olinsinmi? (Saqlash bosilgandan keyin kuchga kiradi)")) return;
    TRF.splice(Number(b.dataset.trfdel), 1); renderTariffs();
  });
}

document.getElementById('trfAdd') && document.getElementById('trfAdd').addEventListener('click', ()=>{
  TRF.push({ id:'tarif' + (TRF.length+1), name:'Yangi tarif', price:0, days:30,
    limit:100, quota:10, tiers:['vip'], featured:false, order:TRF.length+1, desc:'' });
  renderTariffs();
});

document.getElementById('trfSave') && document.getElementById('trfSave').addEventListener('click', async ()=>{
  const msg = document.getElementById('trfMsg');
  msg.textContent = 'Saqlanmoqda...';
  try{
    const j = await selCall('tariflarSaqla', { plans: TRF });
    TRF = j.plans || TRF;
    renderTariffs();
    msg.textContent = 'Saqlandi. Diler kabinetida darhol ko‘rinadi.';
    setTimeout(()=>{ msg.textContent = ''; }, 4000);
  }catch(e){ msg.textContent = 'Xato: ' + e.message; }
});

document.getElementById('trfReload') && document.getElementById('trfReload').addEventListener('click', loadTariffs);

function renderTarifSorov(rows){
  const box = document.getElementById('trfSorov');
  if(!box) return;
  const kut = rows.filter(r => r.status === 'kutilmoqda');
  const boshqa = rows.filter(r => r.status !== 'kutilmoqda').slice(0, 20);
  if(!rows.length){ box.innerHTML = "Hali so'rov yo'q."; return; }
  const qator = (r) =>
    '<tr>' +
    '<td><b>' + escapeHtml(r.sellerName || r.sellerId) + '</b></td>' +
    '<td>' + escapeHtml(r.planName || r.planId) + '</td>' +
    '<td style="text-align:right">' + (Number(r.price)||0).toLocaleString('ru-RU') + "</td>" +
    '<td>' + (r.usul === 'online' ? 'onlayn' : "qo'lda") + '</td>' +
    '<td>' + (r.at ? new Date(r.at).toLocaleString('ru-RU') : '') + '</td>' +
    '<td style="text-align:right;white-space:nowrap">' +
      (r.status === 'kutilmoqda'
        ? '<button class="btn btn-sm" data-trfok="' + escapeHtml(r.id) + '">Tasdiqlash</button> ' +
          '<button class="btn btn-ghost btn-sm" data-trfno="' + escapeHtml(r.id) + '">Rad</button>'
        : '<span class="sv-pill ' + (r.status === 'tasdiqlandi' ? 'sv-on' : 'sv-off') + '">' +
          escapeHtml(r.status) + '</span>') +
    '</td></tr>';
  box.innerHTML = '<div style="overflow-x:auto"><table><thead><tr>' +
    '<th>Sotuvchi</th><th>Tarif</th><th style="text-align:right">Summa</th>' +
    '<th>Usul</th><th>Vaqti</th><th></th></tr></thead><tbody>' +
    kut.map(qator).join('') + boshqa.map(qator).join('') + '</tbody></table></div>';

  box.querySelectorAll('[data-trfok]').forEach(b => b.onclick = async ()=>{
    if(!confirm("Pul kelganini tekshirdingizmi? Tasdiqlansa tarif darhol yoqiladi.")) return;
    b.disabled = true;
    try{ await selCall('tarifTasdiq', { id: b.dataset.trfok }); loadTariffs(); loadSellers(); }
    catch(e){ alert(e.message); b.disabled = false; }
  });
  box.querySelectorAll('[data-trfno]').forEach(b => b.onclick = async ()=>{
    const izoh = prompt('Rad etish sababi (dilerga yuboriladi):') || '';
    try{ await selCall('tarifRad', { id: b.dataset.trfno, izoh }); loadTariffs(); }
    catch(e){ alert(e.message); }
  });
}

/* Dilerga tarifni QO'LDA yoqish / to'xtatish (to'lov so'rovisiz) */
async function tarifQolda(sellerId){
  if(!TRF.length){ await loadTariffs(); }
  const nomlar = TRF.map((p,i) => (i+1) + ') ' + p.name + ' — ' +
    (Number(p.price)||0).toLocaleString('ru-RU') + " so'm / " + p.days + ' kun · ' +
    (Number(p.limit)||0) + ' raqam' +
    (Number(p.quota) ? ' (' + p.quota + ' tasiga toifa)' : '') +
    (p.featured ? ' + Mashhur' : '')).join('\n');
  const tanlov = prompt('Qaysi tarif yoqilsin?\n\n' + nomlar + '\n\nRaqamini kiriting (yoki 0 — tarifni to‘xtatish):');
  if(tanlov == null) return;
  const n = Number(tanlov);
  try{
    if(n === 0){
      if(!confirm("Tarif to'xtatilsinmi? Raqamlardagi toifa belgilari DARHOL olib tashlanadi.")) return;
      const j = await selCall('tarifOchir', { sellerId });
      alert("To'xtatildi. " + (j.raqam || 0) + ' raqamdan toifa olindi.');
    }else{
      const p = TRF[n-1]; if(!p) return alert("Bunday tarif yo'q");
      const kun = Number(prompt('Necha kunga?', String(p.days)) || p.days);
      await selCall('tarifQoy', { sellerId, planId: p.id, days: kun });
      alert(p.name + ' yoqildi.');
    }
    loadSellers(); loadTariffs();
  }catch(e){ alert(e.message); }
}


/* ================= HAMKORLIK ARIZALARI =================
   Saytdagi "Hamkor bo'lish" formasidan kelgan arizalar
   (`hamkor_arizalari` to'plami). Mijoz saytida tarif va narx
   ko'rsatilmaydi — odam ariza qoldiradi, shartlarni admin telefon
   orqali aytadi. Shu sabab bu yerda ikkita asosiy amal bor:
     * "Hisob yaratish" — pastdagi "Yangi sotuvchi hisobi" formasini
       arizadagi ism va telefon bilan to'ldiradi (login/parolni
       admin o'zi o'ylab topadi);
     * "Yopish" — ariza ko'rib chiqildi deb belgilaydi.
   ======================================================== */
const HK_HOLAT = { new:'Yangi', called:"Bog'lanildi", done:'Hisob ochildi', rejected:'Rad etildi' };

async function loadHamkorArizalar(){
  const box = document.getElementById('hkList');
  if(!box) return;
  box.innerHTML = 'Yuklanmoqda...';
  try{
    const snap = await db.collection('hamkor_arizalari').limit(300).get();
    const rows = snap.docs.map(d => Object.assign({ id: d.id }, d.data() || {}))
      .sort((a, b) => {
        const av = (a.status === 'new') ? 1 : 0, bv = (b.status === 'new') ? 1 : 0;
        if(av !== bv) return bv - av;                       // yangilari birinchi
        const at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        const bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });

    const yangi = rows.filter(r => (r.status || 'new') === 'new').length;
    const badge = document.getElementById('hkBadge');
    if(badge){ badge.textContent = yangi; badge.style.display = yangi ? '' : 'none'; }

    if(!rows.length){
      box.innerHTML = "Hali ariza yo'q. Saytda: Profil → Hamkor bo'lish.";
      return;
    }

    /* Telefonda jadval emas — alohida kartochkalar (tartibli, yon surishsiz) */
    const kartalar = '<div class="hk-cards">' + rows.map(r => {
      const h = r.status || 'new';
      const vaqt = r.createdAt && r.createdAt.toMillis
        ? new Date(r.createdAt.toMillis()).toLocaleString('ru-RU') : '';
      const tel = String(r.phone || '').replace(/[^+\d]/g, '');
      return '<div class="hk-card' + (h === 'new' ? ' hk-new' : '') + '">' +
        '<div class="hk-top"><b class="hk-nom">' + escapeHtml(r.fullName || '') + '</b>' +
          '<span class="sv-pill ' + (h === 'new' ? 'sv-on' : 'sv-off') + '">' +
          escapeHtml(HK_HOLAT[h] || h) + '</span></div>' +
        '<div class="hk-meta">' +
          '<a href="tel:' + escapeHtml(tel) + '" class="hk-tel">' + escapeHtml(r.phone || '') + '</a>' +
          (r.region ? '<span>' + escapeHtml(r.region) + '</span>' : '') +
          (r.numbersCount ? '<span>' + escapeHtml(r.numbersCount) + ' raqam</span>' : '') +
        '</div>' +
        (r.note ? '<div class="hk-note">' + escapeHtml(r.note) + '</div>' : '') +
        (vaqt ? '<div class="hk-vaqt muted">' + escapeHtml(vaqt) + '</div>' : '') +
        '<div class="hk-act">' +
          '<button class="btn btn-sm" data-hkmake="' + escapeHtml(r.id) + '">Hisob yaratish</button>' +
          '<button class="btn btn-ghost btn-sm" data-hkdone="' + escapeHtml(r.id) + '">Yopish</button>' +
          '<button class="btn btn-dan btn-sm" data-hkdel="' + escapeHtml(r.id) + '">&#10005;</button>' +
        '</div></div>';
    }).join('') + '</div>';

    box.innerHTML = kartalar + '<div class="hk-tbl" style="overflow-x:auto"><table><thead><tr>' +
      '<th>Kim</th><th>Telefon</th><th>Viloyat</th><th>Raqamlari</th>' +
      '<th>Holat</th><th>Vaqti</th><th></th></tr></thead><tbody>' +
      rows.map(r => {
        const h = r.status || 'new';
        const vaqt = r.createdAt && r.createdAt.toMillis
          ? new Date(r.createdAt.toMillis()).toLocaleString('ru-RU') : '';
        return '<tr>' +
          '<td><b>' + escapeHtml(r.fullName || '') + '</b>' +
            (r.note ? '<div class="muted" style="font-size:11.5px;max-width:230px;white-space:normal">' +
              escapeHtml(r.note) + '</div>' : '') + '</td>' +
          '<td><a href="tel:' + escapeHtml(String(r.phone || '').replace(/[^+\d]/g, '')) + '" ' +
            'style="color:var(--amber);text-decoration:none;white-space:nowrap">' +
            escapeHtml(r.phone || '') + '</a></td>' +
          '<td>' + escapeHtml(r.region || '') + '</td>' +
          '<td style="white-space:nowrap">' + escapeHtml(r.numbersCount || '') + '</td>' +
          '<td><span class="sv-pill ' + (h === 'new' ? 'sv-on' : 'sv-off') + '">' +
            escapeHtml(HK_HOLAT[h] || h) + '</span></td>' +
          '<td style="white-space:nowrap;font-size:11.5px" class="muted">' + escapeHtml(vaqt) + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="btn btn-sm" data-hkmake="' + escapeHtml(r.id) + '">Hisob yaratish</button> ' +
            '<button class="btn btn-ghost btn-sm" data-hkdone="' + escapeHtml(r.id) + '">Yopish</button> ' +
            '<button class="btn btn-dan btn-sm" data-hkdel="' + escapeHtml(r.id) + '">&#10005;</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table></div>';

    /* "Hisob yaratish" — pastdagi formani arizadan to'ldiradi */
    box.querySelectorAll('[data-hkmake]').forEach(b => b.onclick = async ()=>{
      const r = rows.find(x => x.id === b.dataset.hkmake); if(!r) return;
      const nm = document.getElementById('selName'), ph = document.getElementById('selPhone');
      const us = document.getElementById('selUser');
      if(nm) nm.value = r.fullName || '';
      if(ph) ph.value = r.phone || '';
      /* Logini ismning birinchi so'zidan taklif qilinadi — admin o'zgartira oladi */
      if(us && !us.value){
        us.value = String(r.fullName || '').trim().split(/\s+/)[0]
          .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      }
      try{ await db.collection('hamkor_arizalari').doc(r.id).update({ status: 'done' }); }catch(e){}
      const pw = document.getElementById('selPass');
      if(pw) pw.focus();
      if(nm) nm.scrollIntoView({ behavior:'smooth', block:'center' });
      if(typeof panelToast === 'function') panelToast('Forma to‘ldirildi — parol o‘ylab, "Hisob yaratish" bosing', 'ok');
      loadHamkorArizalar();
    });
    box.querySelectorAll('[data-hkdone]').forEach(b => b.onclick = async ()=>{
      try{ await db.collection('hamkor_arizalari').doc(b.dataset.hkdone).update({ status: 'called' }); loadHamkorArizalar(); }
      catch(e){ alert(e.message); }
    });
    box.querySelectorAll('[data-hkdel]').forEach(b => b.onclick = async ()=>{
      if(!confirm("Ariza o'chirilsinmi?")) return;
      try{ await db.collection('hamkor_arizalari').doc(b.dataset.hkdel).delete(); loadHamkorArizalar(); }
      catch(e){ alert(e.message); }
    });
  }catch(e){
    box.innerHTML = 'Xato: ' + escapeHtml(e.message);
  }
}
document.getElementById('hkReload') && document.getElementById('hkReload')
  .addEventListener('click', loadHamkorArizalar);

async function selOpenChat(id, who){
  SEL_CHAT_ID = id;
  const card = document.getElementById('selChatCard');
  document.getElementById('selChatWho').textContent = who || '';
  card.style.display = '';
  const box = document.getElementById('selChatBox');
  box.innerHTML = 'Yuklanmoqda...';
  try{
    const j = await selCall('messages', { id });
    box.innerHTML = j.rows.length
      ? j.rows.map(m => '<div class="sv-msg ' + (m.from === 'admin' ? 'adm' : 'sel') + '">' + escapeHtml(m.text) + '</div>').join('')
      : '<div class="muted">Xabarlar yo’q.</div>';
    box.scrollTop = box.scrollHeight;
    card.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }catch(e){ box.innerHTML = 'Xato: ' + escapeHtml(e.message); }
}

document.getElementById('selCreate') && document.getElementById('selCreate').addEventListener('click', async ()=>{
  const msg = document.getElementById('selMsg');
  const data = {
    name: document.getElementById('selName').value.trim(),
    username: document.getElementById('selUser').value.trim().toLowerCase(),
    password: document.getElementById('selPass').value,
    phone: document.getElementById('selPhone').value.trim(),
  };
  msg.textContent = 'Yaratilmoqda...';
  try{
    await selCall('create', data);
    msg.textContent = "Tayyor. Login va parolni sotuvchiga yetkazing.";
    document.getElementById('selName').value = '';
    document.getElementById('selUser').value = '';
    document.getElementById('selPass').value = '';
    document.getElementById('selPhone').value = '';
    loadSellers();
  }catch(e){ msg.textContent = 'Xato: ' + e.message; }
});

document.getElementById('selReload') && document.getElementById('selReload').addEventListener('click', ()=>{ loadSellers(); loadTariffs(); loadHamkorArizalar(); });
document.getElementById('selChatSend') && document.getElementById('selChatSend').addEventListener('click', async ()=>{
  const inp = document.getElementById('selChatIn');
  const text = inp.value.trim();
  if(!text || !SEL_CHAT_ID) return;
  inp.value = '';
  try{ await selCall('reply', { id: SEL_CHAT_ID, text }); selOpenChat(SEL_CHAT_ID, document.getElementById('selChatWho').textContent); }
  catch(e){ alert(e.message); }
});
document.getElementById('selChatIn') && document.getElementById('selChatIn').addEventListener('keydown', e => {
  if(e.key === 'Enter') document.getElementById('selChatSend').click();
});

/* ================= STATISTIKA =================
   Uchta Firestore to'plamini o'qiydi (yozmaydi):
     stats_numbers/{id}   — har raqam bo'yicha views / clicks / orders
     stats_searches/{key} — natija bermagan qidiruvlar va necha marta
     stats_daily/{sana}   — kunlik umumiy yig'indi
   Ularni sayt o'zi emas, netlify/functions/api-track.js to'ldiradi
   (mijoz brauzeridan to'g'ridan-to'g'ri yozishga ruxsat yo'q — aks holda
   har kim sonlarni shishirib yuborishi mumkin edi). */
let statsBusy = false;

function stNum(n){ return (Number(n)||0).toLocaleString('ru-RU').replace(/,/g,' '); }

function stKpi(label, value, hint){
  return '<div class="card" style="padding:14px;margin:0">' +
    '<div class="muted" style="font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">' + escapeHtml(label) + '</div>' +
    '<div style="font-size:24px;font-weight:800;margin-top:5px">' + escapeHtml(String(value)) + '</div>' +
    (hint ? '<div class="muted" style="font-size:11.5px;margin-top:3px">' + escapeHtml(hint) + '</div>' : '') +
    '</div>';
}

async function loadStats(){
  if(statsBusy) return;
  statsBusy = true;
  const days = Number((document.getElementById('stRange')||{}).value) || 30;
  const note = document.getElementById('stNote');
  const kpis = document.getElementById('stKpis');
  const topBox = document.getElementById('stTop');
  const missBox = document.getElementById('stMiss');
  if(note) note.textContent = 'Yuklanmoqda...';

  /* HAR BO'LIM ALOHIDA tekshiriladi. Ilgari uchala so'rov bitta
     `try` ichida edi: birinchisi xato bersa, qolgan ikkitasi umuman
     ishlamay, ekranda abadiy "Yuklanmoqda..." bo'lib qolardi. */
  let xatolar = [];

  try{
    /* --- 1. Kunlik yig'indi ---
       ILGARI bu yerda `.orderBy(documentId(), 'desc')` ishlatilardi va
       Firestore "The query requires an index" deb XATO berardi:
       hujjat nomi bo'yicha TESKARI tartiblash uchun qo'lda indeks
       yaratish kerak ekan. Buning hojati yo'q — hujjat nomi
       "YYYY-MM-DD" bo'lgani uchun oddiy "shu sanadan keyingilari"
       shartining o'zi yetarli. Bu indeks talab qilmaydi va ortiqcha
       hujjat ham o'qilmaydi (ilgari har safar 120 tasi o'qilardi). */
    const from = new Date(Date.now() - days*86400000).toISOString().slice(0,10);
    const daily = await db.collection('stats_daily')
      .where(firebase.firestore.FieldPath.documentId(), '>=', from)
      .get();
    let V=0, C=0, O=0, M=0, kun=0, F=0, U=0, X=0;
    daily.forEach(d => {
      const x = d.data() || {};
      V += Number(x.views)||0; C += Number(x.clicks)||0;
      O += Number(x.orders)||0; M += Number(x.misses)||0; kun++;
      /* V119 — buyurtma yo'lining oradagi qadamlari */
      F += Number(x.forma)||0; U += Number(x.urinish)||0; X += Number(x.xato)||0;
    });
    const konv = V ? Math.round(O / V * 1000) / 10 : 0;
    if(kpis) kpis.innerHTML =
      stKpi('Raqam ochilgan', stNum(V), kun ? ('kuniga o’rtacha ' + stNum(Math.round(V/kun))) : '') +
      stKpi('Buyurtma', stNum(O), 'shu davrda') +
      stKpi('Konversiya', konv + '%', 'ochilgandan buyurtmagacha') +
      stKpi('Natijasiz qidiruv', stNum(M), 'yetishmayotgan raqamlar');

    /* ---- BUYURTMA YO'LI (V119) ----
       Mijoz qayerda to'xtab qolgani. Ilgari faqat "ochildi" va
       "buyurtma" bor edi — oradagi ikki qadam ko'rinmasdi, ya'ni
       "formani ochdi-yu yubormadi" degan holat umuman bilinmasdi. */
    const yol = document.getElementById('stYol');
    if(yol){
      const qadamlar = [
        ['Raqam ochildi',    V, ''],
        ['Batafsil bosildi', C, V],
        ['Forma ochildi',    F, C || V],
        ['Yuborish bosildi', U, F || C || V],
        ['Buyurtma bo\'ldi', O, U || F || C || V]
      ];
      if(!V && !F && !U && !O){
        yol.innerHTML = '<div style="color:var(--muted);font-size:12.5px">'
          + 'Hali ma\'lumot yig\'ilmagan. Yangi o\'lchov bugundan boshlab '
          + 'yig\'iladi — bir-ikki kundan keyin shu yerda to\'liq yo\'l ko\'rinadi.</div>';
      }else{
        yol.innerHTML = qadamlar.map(([nom, son, asos])=>{
          const foiz = asos ? Math.round(son / asos * 1000) / 10 : null;
          const en = V ? Math.max(2, Math.round(son / V * 100)) : 2;
          const yomon = foiz !== null && foiz < 25;
          return '<div class="yol-qator">'
            + '<div class="yol-nom">' + nom + '</div>'
            + '<div class="yol-chiziq"><i style="width:' + en + '%"></i></div>'
            + '<div class="yol-son">' + stNum(son)
            + (foiz !== null ? ' <b class="' + (yomon ? 'yomon' : '') + '">' + foiz + '%</b>' : '')
            + '</div></div>';
        }).join('')
        + (X ? '<div class="yol-xato">\u26A0 ' + stNum(X) + ' ta urinishda birinchi yo\'l ishlamadi. '
               + 'Bunday buyurtma endi YO\'QOLMAYDI: server yo\'li, keyin zaxira yo\'l, '
               + 'oxirida esa navbat (aloqa tiklanishi bilan o\'zi yuboriladi) bor. '
               + 'Bu son uzoq vaqt katta bo\'lsa \u2014 sabab bor, tekshirish kerak.</div>' : '');
      }
    }
  }catch(e){
    xatolar.push('ko\'rsatkichlar');
    if(kpis) kpis.innerHTML = '<div style="color:var(--muted);font-size:12.5px">Ko\'rsatkichlarni o\'qib bo\'lmadi: ' + escapeHtml(e.message || '') + '</div>';
  }

  try{
    /* --- 2. Eng ko'p ochilgan raqamlar --- */
    const top = await db.collection('stats_numbers').orderBy('views','desc').limit(25).get();
    if(top.empty){
      topBox.innerHTML = 'Hali ma’lumot yig’ilmagan. Saytga mijozlar kira boshlagach shu yerda ko’rinadi.';
    } else {
      let rows = '';
      top.forEach(d => {
        const x = d.data() || {};
        const v = Number(x.views)||0, o = Number(x.orders)||0;
        const k = v ? Math.round(o/v*1000)/10 : 0;
        const bad = v >= 20 && k < 2;     /* ko'p ko'rilgan-u, olinmagan */
        rows += '<tr>' +
          '<td style="padding:8px 10px;font-weight:700">' + escapeHtml(x.number || d.id) + '</td>' +
          '<td style="padding:8px 10px;text-align:right">' + stNum(v) + '</td>' +
          '<td style="padding:8px 10px;text-align:right">' + stNum(o) + '</td>' +
          '<td style="padding:8px 10px;text-align:right;' + (bad ? 'color:var(--amber);font-weight:800' : '') + '">' + k + '%' +
            (bad ? ' — narxni ko’rib chiqing' : '') + '</td>' +
          '</tr>';
      });
      topBox.innerHTML =
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">' +
        '<thead><tr style="text-align:left;color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.04em">' +
        '<th style="padding:6px 10px">Raqam</th><th style="padding:6px 10px;text-align:right">Ochilgan</th>' +
        '<th style="padding:6px 10px;text-align:right">Buyurtma</th><th style="padding:6px 10px;text-align:right">Konversiya</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
  }catch(e){
    xatolar.push('raqamlar ro\'yxati');
    topBox.innerHTML = 'O\'qib bo\'lmadi: ' + escapeHtml(e.message || '');
  }

  try{
    /* --- 3. Natijasiz qidiruvlar --- */
    const miss = await db.collection('stats_searches').orderBy('count','desc').limit(30).get();
    if(miss.empty){
      missBox.innerHTML = 'Hozircha natijasiz qidiruv qayd etilmagan.';
    } else {
      let chips = '';
      miss.forEach(d => {
        const x = d.data() || {};
        chips += '<span style="display:inline-flex;align-items:center;gap:7px;margin:0 7px 7px 0;padding:6px 11px;border-radius:9px;background:var(--panel-2,rgba(255,255,255,.05));border:1px solid var(--line,rgba(255,255,255,.1));font-size:13px;font-weight:700">' +
          escapeHtml(x.q || d.id) +
          '<b style="color:var(--amber);font-weight:800">' + stNum(x.count) + '</b></span>';
      });
      missBox.innerHTML = chips;
    }
  }catch(e){
    xatolar.push('qidiruvlar');
    missBox.innerHTML = 'O\'qib bo\'lmadi: ' + escapeHtml(e.message || '');
  }

  if(note){
    note.textContent = xatolar.length
      ? ('Ba\'zi bo\'limlar yuklanmadi: ' + xatolar.join(', '))
      : ('Oxirgi yangilanish: ' + new Date().toLocaleTimeString('uz-UZ'));
  }
  statsBusy = false;
}
document.getElementById('stReindex') && document.getElementById('stReindex').addEventListener('click', async ()=>{
  const m = document.getElementById('stReindexMsg');
  m.textContent = 'Yuborilmoqda...';
  try{
    await db.collection('search_index').doc('dirty').set({ at: Date.now() }, { merge:true });
    /* belgini qo'ygach darhol chaqirib qo'yamiz — indeks shu zahoti qayta quriladi */
    fetch('/.netlify/functions/api-index', { cache:'reload' }).catch(()=>{});
    m.textContent = "Tayyor. Yangi narxlar bir daqiqa ichida saytda ko'rinadi.";
  }catch(e){ m.textContent = 'Xato: ' + e.message; }
});

document.getElementById('stReload') && document.getElementById('stReload').addEventListener('click', loadStats);
document.getElementById('stRange') && document.getElementById('stRange').addEventListener('change', loadStats);

/* ---- Seanslar ro'yxati ---- */
const sessionsList = document.getElementById('sessionsList');
// "Boshqaruv"dan biror adminning "Seanslari" tugmasi bosilsa, shu ikkalasi
// o'rnatiladi va faqat o'sha adminning kirish/chiqish tarixi ko'rsatiladi.
let sessionsFilterUid = null;
let sessionsFilterName = null;

async function refreshSessions(){
  sessionsList.innerHTML = `<div class="empty-admin">Yuklanmoqda...</div>`;
  const banner = document.getElementById('sessionsFilterBanner');
  if(sessionsFilterUid){
    banner.style.display = 'block';
    banner.innerHTML = `🔎 Faqat <b>${escapeHtml(sessionsFilterName || '')}</b> ning kirish/chiqish tarixi ko'rsatilmoqda. <a href="#" id="sessionsClearFilter" style="color:var(--amber);">Hammasini ko'rsatish</a>`;
    const clearLink = document.getElementById('sessionsClearFilter');
    if(clearLink) clearLink.addEventListener('click', (e)=>{ e.preventDefault(); sessionsFilterUid = null; sessionsFilterName = null; refreshSessions(); });
  } else {
    banner.style.display = 'none';
  }

  try{
    const snap = await db.collection('admin_sessions').orderBy('loginAtSort','desc').limit(100).get();
    let sessions = snap.docs.map(doc => doc.data());
    if(sessionsFilterUid) sessions = sessions.filter(s => s.uid === sessionsFilterUid);
    sessions = sessions.slice(0, 50);
    if(sessions.length === 0){
      sessionsList.innerHTML = `<div class="empty-admin">Hali kirish qayd etilmagan.</div>`;
      return;
    }
    sessionsList.innerHTML = sessions.map((s, i) => {
      const isLogout = s.type === 'logout';
      const tag = isLogout
        ? '<span class="mgmt-badge off" style="margin-right:6px;">Chiqdi</span>'
        : '<span class="mgmt-badge on" style="margin-right:6px;">Kirdi</span>';
      const who = s.name ? `<b style="color:var(--text);">${escapeHtml(s.name)}</b> — ` : '';
      return `
      <div class="session-row">
        <span class="sr-index">${i + 1}</span>
        <span class="sr-device">${tag}${who}${escapeHtml(s.device)}</span>
        <span class="sr-time">${escapeHtml(s.loginAt)}</span>
      </div>
    `;
    }).join('');
  }catch(err){
    sessionsList.innerHTML = `<div class="empty-admin">Bazaga ulanishda xato.</div>`;
    console.error(err);
  }
}


/* ==================================================================
   BITTA RAQAM — FAQAT BIR MARTA (dublikat nazorati)
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "umumiy bazada bitta raqamni faqat bir marta qo'yish
   mumkin, ikkita bir xil raqam saytda turishi mumkin emas".

   MUAMMO EDI: diler kabinetida tekshiruv bor edi, lekin ADMIN
   PANELDA yo'q edi — na bitta qo'shishda, na ro'yxat bilan
   qo'shishda. Ustiga raqam turli ko'rinishda saqlanishi mumkin
   ("+998901234567", "998901234567", "901234567") — shu sabab oddiy
   "number ==" solishtiruvi dublikatni ko'rmay qolardi.

   YECHIM: har qanday ko'rinishdagi raqam avval 9 xonali MILLIY
   qismga keltiriladi (998 olib tashlanadi), keyin shu bo'yicha
   solishtiriladi. Bazadan qidirish arzon: `last4` maydoni bo'yicha
   (oxirgi 4 raqam) — millionlab raqamli bazada ham bir nechta
   hujjatga tegadi xolos, qo'shimcha indeks ham kerak emas.
   ================================================================== */
function raqam9(v){
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if(d.length > 9 && d.startsWith('998')) d = d.slice(3);
  return d.slice(-9);
}

/** Bazada shu raqam bormi? Bor bo'lsa {id, number, ...} qaytaradi. */
async function raqamBormi(num){
  const n9 = raqam9(num);
  if(n9.length !== 9) return null;
  // 1) Avval xotiradagi ro'yxatdan — so'rovsiz, bir zumda
  try{
    const kesh = (currentNumbersCache || []).find(x => raqam9(x.number) === n9);
    if(kesh) return kesh;
  }catch(e){}
  // 2) Bazadan: oxirgi 4 raqam bo'yicha (arzon so'rov)
  try{
    const snap = await db.collection('numbers')
      .where('last4', '==', n9.slice(-4)).limit(200).get();
    for(const d of snap.docs){
      const x = d.data() || {};
      if(raqam9(x.number) === n9) return Object.assign({ id: d.id }, x);
    }
  }catch(e){ /* internet yo'q bo'lsa — yozishga to'sqinlik qilmaymiz */ }
  // 3) Zaxira: `last4` yozilmagan eski yozuvlar uchun to'g'ridan-to'g'ri
  try{
    const snap2 = await db.collection('numbers')
      .where('number', '==', String(num).trim()).limit(1).get();
    if(!snap2.empty){ const d = snap2.docs[0]; return Object.assign({ id: d.id }, d.data()); }
  }catch(e){}
  return null;
}

/** Ro'yxat bilan qo'shishda: bazadagi BARCHA raqamlarning 9 xonali
    ko'rinishini bir marta yig'ib olamiz (keyin har qator uchun
    alohida so'rov yubormaymiz). */
async function mavjudRaqamlarToplami(){
  const bor = new Set();
  try{
    (currentNumbersCache || []).forEach(x => { const k = raqam9(x.number); if(k.length === 9) bor.add(k); });
  }catch(e){}
  try{
    const snap = await db.collection('numbers').select('number').get();
    snap.forEach(d => { const k = raqam9((d.data() || {}).number); if(k.length === 9) bor.add(k); });
  }catch(e){}
  return bor;
}


/* ==================================================================
   TAKRORLANGAN RAQAMLARNI TOPISH VA TOZALASH
   ------------------------------------------------------------------
   Yangi raqamlar endi dublikat bo'lib tusha olmaydi (yuqoridagi
   nazorat). Lekin ILGARI tushib qolganlari bazada qolgan bo'lishi
   mumkin — shu tugma ularni topadi va bittasini qoldirib,
   ortiqchalarini o'chiradi.

   QAYSI NUSXA QOLADI (eng to'g'risi):
     1. sotilgan / band qilingan nusxa — mijoz bilan bog'liq, qoladi;
     2. keyin — ma'lumoti eng to'liq nusxa (narx, toifa, bo'lib
        to'lash, izoh to'ldirilgani);
     3. teng bo'lsa — eng avval qo'shilgani.
   ================================================================== */
(function(){
  const btn = document.getElementById('nbDupBtn');
  const box = document.getElementById('nbDupBox');
  if(!btn || !box) return;

  let guruhlar = [];   // [{n9, docs:[{id,x}], qoladi:'id'}]

  const toliqlik = (x) => {
    let n = 0;
    if(Number(x.price) > 0) n += 3;
    if(x.operator) n += 2;
    if(x.tier) n += 2;
    if(x.installment) n += 1;
    if(Number(x.oldPrice) > 0) n += 1;
    if(x.note || x.sellerNote) n += 1;
    if(x.sellerId) n += 1;
    if(Number(x.monthly24) > 0 || Number(x.monthly12) > 0) n += 1;
    return n;
  };

  async function topish(){
    btn.disabled = true;
    box.style.display = '';
    box.innerHTML = 'Baza tekshirilmoqda...';
    try{
      const snap = await db.collection('numbers')
        .select('number','price','operator','tier','installment','oldPrice',
                'note','sellerNote','sellerId','monthly12','monthly24',
                'sold','reserved','addedAt','createdAtSort').get();
      const xarita = new Map();
      snap.forEach(d => {
        const x = d.data() || {};
        const k = raqam9(x.number);
        if(k.length !== 9) return;
        if(!xarita.has(k)) xarita.set(k, []);
        xarita.get(k).push({ id: d.id, x });
      });

      guruhlar = [];
      xarita.forEach((docs, n9) => {
        if(docs.length < 2) return;
        const saralangan = docs.slice().sort((a, b) => {
          const am = (a.x.sold || a.x.reserved) ? 1 : 0, bm = (b.x.sold || b.x.reserved) ? 1 : 0;
          if(am !== bm) return bm - am;                       // sotilgan/band birinchi
          const at = toliqlik(a.x), bt = toliqlik(b.x);
          if(at !== bt) return bt - at;                       // to'liqrog'i
          const aw = Number(a.x.addedAt || a.x.createdAtSort) || 0;
          const bw = Number(b.x.addedAt || b.x.createdAtSort) || 0;
          return aw - bw;                                     // avvalgisi
        });
        guruhlar.push({ n9, docs: saralangan, qoladi: saralangan[0].id });
      });

      chiz();
    }catch(e){
      box.innerHTML = '<b style="color:#E5484D">Xato:</b> ' + escapeHtml(e.message);
    }
    btn.disabled = false;
  }

  function chiz(){
    if(!guruhlar.length){
      box.innerHTML = '<b>✓ Takrorlangan raqam topilmadi.</b><br>' +
        'Bazadagi har bir raqam faqat bir marta turibdi.' +
        '<div class="nb-dup-acts"><button type="button" data-yop="1">Yopish</button></div>';
    }else{
      const ortiqcha = guruhlar.reduce((a, g) => a + (g.docs.length - 1), 0);
      box.innerHTML =
        '<b>' + guruhlar.length + ' ta raqam takrorlangan</b> — jami <b>' + ortiqcha +
        ' ta ortiqcha nusxa</b>. Har biridan eng to‘liq (sotilgan/band bo‘lsa — o‘sha) ' +
        'nusxa qoladi, qolgani o‘chiriladi.' +
        '<div class="nb-dup-list">' + guruhlar.slice(0, 50).map(g =>
          '<div class="nb-dup-row"><b>' + escapeHtml(g.docs[0].x.number || g.n9) + '</b>' +
          '<i>' + g.docs.length + ' ta nusxa</i></div>').join('') +
          (guruhlar.length > 50 ? '<div class="nb-dup-row"><b>... va yana ' + (guruhlar.length - 50) + ' ta</b></div>' : '') +
        '</div>' +
        '<div class="nb-dup-acts">' +
          '<button type="button" data-yop="1">Yopish</button>' +
          '<button type="button" class="asosiy" data-tozala="1">Ortiqchasini o‘chirish</button>' +
        '</div>';
    }
    const y = box.querySelector('[data-yop]');
    if(y) y.onclick = ()=>{ box.style.display = 'none'; };
    const t = box.querySelector('[data-tozala]');
    if(t) t.onclick = tozala;
  }

  async function tozala(){
    const ortiqcha = guruhlar.reduce((a, g) => a + (g.docs.length - 1), 0);
    if(!confirm(ortiqcha + ' ta ortiqcha nusxa o‘chiriladi. Har bir raqamdan bittasi ' +
       'albatta qoladi. Davom etasizmi?')) return;
    const t = box.querySelector('[data-tozala]');
    if(t){ t.disabled = true; t.textContent = 'O‘chirilmoqda...'; }
    try{
      const ochiriladi = [];
      guruhlar.forEach(g => g.docs.forEach(d => { if(d.id !== g.qoladi) ochiriladi.push(d.id); }));
      for(let i = 0; i < ochiriladi.length; i += 400){
        const batch = db.batch();
        ochiriladi.slice(i, i + 400).forEach(id => batch.delete(db.collection('numbers').doc(id)));
        await batch.commit();
        if(t) t.textContent = 'O‘chirilmoqda... (' + Math.min(i + 400, ochiriladi.length) + '/' + ochiriladi.length + ')';
      }
      box.innerHTML = '<b style="color:var(--green)">✓ ' + ochiriladi.length +
        ' ta ortiqcha nusxa o‘chirildi.</b><br>Endi har bir raqam bazada faqat bir marta turibdi.' +
        '<div class="nb-dup-acts"><button type="button" data-yop="1">Yopish</button></div>';
      box.querySelector('[data-yop]').onclick = ()=>{ box.style.display = 'none'; };
      guruhlar = [];
      refreshNumbers();
      vibrate(80);
    }catch(e){
      alert('O‘chirishda xato: ' + e.message);
      if(t){ t.disabled = false; t.textContent = 'Ortiqchasini o‘chirish'; }
    }
  }

  btn.addEventListener('click', topish);
})();

/* ---- Raqamlar CRUD ---- */
const adminNumbersList = document.getElementById('adminNumbersList');

document.getElementById('deleteAllNumbersBtn').addEventListener('click', async ()=>{
  if(!confirm("DIQQAT! Bazadagi BARCHA raqamlar butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Davom etasizmi?")) return;
  if(!confirm("Ishonchingiz komilmi? Barcha raqamlar (jami " + currentNumbersCache.length + " ta) o'chiriladi.")) return;

  const btn = document.getElementById('deleteAllNumbersBtn');
  /* Tugma endi faqat BELGIDAN iborat (savat ikonkasi) — shu sabab
     `textContent` ga yozib bo'lmaydi, aks holda ikonka o'chib ketardi.
     Jarayon soni `title` da va umumiy xabarda ko'rsatiladi. */
  const aslTitle = btn.getAttribute('title') || '';
  btn.disabled = true;
  try{
    let deletedTotal = 0;
    while(true){
      const snap = await db.collection('numbers').limit(400).get();
      if(snap.empty) break;
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletedTotal += snap.docs.length;
      btn.setAttribute('title', "O'chirilmoqda... (" + deletedTotal + ')');
    }
    btn.setAttribute('title', aslTitle);
    alert(`✓ ${deletedTotal} ta raqam o'chirildi.`);
    refreshNumbers();
  }catch(err){
    alert("Xato: " + err.message);
    btn.setAttribute('title', aslTitle);
  }
  btn.disabled = false;
});

/* ---- AI Yordamchi (raqamlarni chat orqali qidirish/o'chirish/qo'shish) ---- */
const aiChatBox = document.getElementById('aiChatBox');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatSendBtn = document.getElementById('aiChatSendBtn');

// Anthropic formatidagi to'liq suhbat tarixi — har bir so'rovda serverga
// to'liq yuborilib turadi (server o'zi hech narsani xotirada saqlamaydi).
let aiConversation = [];

function aiAddBubble(text, cls){
  const div = document.createElement('div');
  div.className = 'ai-msg ' + cls;
  div.textContent = text;
  aiChatBox.appendChild(div);
  aiChatBox.scrollTop = aiChatBox.scrollHeight;
  return div;
}

function aiAddResultsList(title, items, total){
  const box = document.createElement('div');
  box.className = 'ai-results';
  const header = document.createElement('div');
  header.className = 'ai-msg-system';
  header.style.textAlign = 'left';
  header.style.marginBottom = '4px';
  header.textContent = `${title} — jami: ${total} ta` + (items.length < total ? ` (birinchi ${items.length} tasi ko'rsatilmoqda)` : '');
  box.appendChild(header);
  items.forEach(it=>{
    const row = document.createElement('div');
    row.className = 'ai-results-row';
    // XAVFSIZLIK: it.number/it.label bazadan (masalan anonim mijoz
    // yozgan 'orders' hujjatidan) kelishi mumkin — shu sabab escapeHtml
    // orqali tozalanadi (aks holda mijoz nomi ichiga yozilgan <script>
    // kabi kod admin brauzerida ishga tushib qolishi mumkin edi).
    row.innerHTML = `<span class="ai-results-num">${escapeHtml(it.number || '')} ${it.label ? '· ' + escapeHtml(it.label) : ''}</span><span class="ai-results-price">${formatPrice(it.price||0)}</span>`;
    box.appendChild(row);
  });
  aiChatBox.appendChild(box);
  aiChatBox.scrollTop = aiChatBox.scrollHeight;
}

function aiAddConfirmBox(summary, details, isPriceUpdate, onDecision){
  const box = document.createElement('div');
  box.className = 'ai-confirm-box';
  // XAVFSIZLIK: number/price bazadan (masalan tasdiqlanayotgan
  // add_numbers amali ichida, AI kontekstiga anonim mijoz yozuvidan
  // "sizib kirgan" bo'lishi mumkin bo'lgan matn) kelishi mumkin — shu
  // sabab escapeHtml orqali tozalanadi.
  const list = details.slice(0, 20).map(d => {
    if(isPriceUpdate) return `${escapeHtml(d.number)}: ${formatPrice(d.oldPrice||0)} → ${formatPrice(d.price||0)}`;
    return `${escapeHtml(d.number)}${d.price ? ' — ' + formatPrice(d.price) : ''}`;
  }).join('\n');
  const extra = details.length > 20 ? `\n... va yana ${details.length - 20} ta` : '';
  box.innerHTML = `
    <div class="ai-confirm-title">⚠️ ${escapeHtml(summary)}</div>
    <div style="white-space:pre-wrap;font-size:12px;color:var(--muted);max-height:140px;overflow-y:auto;">${list}${extra}</div>
    <div class="ai-confirm-actions">
      <button class="ai-confirm-yes">${isPriceUpdate ? '✓ Ha, o\'zgartirish' : '🗑 Ha, o\'chirish'}</button>
      <button class="ai-confirm-no">Bekor qilish</button>
    </div>
  `;
  aiChatBox.appendChild(box);
  aiChatBox.scrollTop = aiChatBox.scrollHeight;

  box.querySelector('.ai-confirm-yes').addEventListener('click', ()=>{
    box.querySelectorAll('button').forEach(b=>b.disabled = true);
    onDecision('confirm');
  });
  box.querySelector('.ai-confirm-no').addEventListener('click', ()=>{
    box.querySelectorAll('button').forEach(b=>b.disabled = true);
    onDecision('cancel');
  });
}

async function aiCallServer(payload){
  const user = firebase.auth().currentUser;
  if(!user) throw new Error('Tizimga kirilmagan.');
  const idToken = await user.getIdToken();

  // Juda uzoq kutib qolmaslik uchun — 28 soniyadan keyin so'rovni bekor
  // qilamiz va tushunarli xabar chiqaramiz (Netlify funksiyasi odatda
  // 10-26 soniyada javob berishi kerak; undan uzoq kutish foydasiz).
  const controller = new AbortController();
  const timeoutId = setTimeout(()=> controller.abort(), 28000);

  let res;
  try{
    res = await fetch('/.netlify/functions/admin-ai-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  }catch(err){
    if(err.name === 'AbortError'){
      throw new Error("So'rov juda uzoq davom etdi (server javob bermadi). Iltimos, xabarni qisqaroq qilib qayta yozing.");
    }
    throw new Error('Internet aloqasida muammo: ' + err.message);
  }finally{
    clearTimeout(timeoutId);
  }

  // Server ba'zan (masalan vaqt chegarasidan oshib ketganda) JSON o'rniga
  // xato sahifa (HTML) qaytarishi mumkin — buni xavfsiz tekshiramiz, aks
  // holda brauzer tushunarsiz inglizcha "Unexpected token" xatosini beradi.
  const rawText = await res.text();
  let data;
  try{
    data = JSON.parse(rawText);
  }catch(e){
    throw new Error("Server javobi noto'g'ri formatda keldi (ehtimol so'rov juda uzoq davom etib, vaqt tugadi). Iltimos, xabarni qisqaroq yozib qayta yuboring.");
  }

  if(!res.ok){
    const errMsg = typeof data.error === 'string' ? data.error : (data.error && data.error.message) || 'Server xatosi';
    throw new Error(errMsg);
  }
  return data;
}

function aiHandleResponse(data){
  aiConversation = data.messages || aiConversation;

  if(data.status === 'confirm_required'){
    if(data.details && data.details.length){
      const isPriceUpdate = data.action === 'update_numbers_price';
      aiAddConfirmBox(data.summary, data.details, isPriceUpdate, async (decision)=>{
        const typing = aiAddBubble('...', 'ai-typing');
        try{
          const res2 = await aiCallServer({
            messages: aiConversation,
            decision,
            pendingToolUseId: data.toolUseId,
            pendingToolName: data.action,
            pendingToolInput: data.toolInput
          });
          typing.remove();
          aiHandleResponse(res2);
        }catch(err){
          typing.remove();
          aiAddBubble('Xato: ' + err.message, 'ai-msg-error');
        }
      });
    }else{
      aiAddBubble("Bu amal uchun mos raqam topilmadi.", 'ai-msg-bot');
    }
    return;
  }

  if(data.status === 'done'){
    if(data.resultsList && Array.isArray(data.resultsList.items) && data.resultsList.items.length){
      aiAddResultsList(data.resultsList.title, data.resultsList.items, data.resultsList.total);
    }
    if(data.reply) aiAddBubble(data.reply, 'ai-msg-bot');
    return;
  }
}

async function aiSendMessage(){
  const text = aiChatInput.value.trim();
  if(!text) return;
  aiAddBubble(text, 'ai-msg-user');
  aiChatInput.value = '';
  aiChatInput.disabled = true;
  aiChatSendBtn.disabled = true;
  const typing = document.createElement('div');
  typing.className = 'ai-typing';
  typing.innerHTML = '<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';
  aiChatBox.appendChild(typing);
  aiChatBox.scrollTop = aiChatBox.scrollHeight;

  try{
    const data = await aiCallServer({ messages: aiConversation, userMessage: text });
    typing.remove();
    aiHandleResponse(data);
  }catch(err){
    typing.remove();
    aiAddBubble('Xato: ' + err.message, 'ai-msg-error');
  }finally{
    aiChatInput.disabled = false;
    aiChatSendBtn.disabled = false;
    aiChatInput.focus();
  }
}

aiChatSendBtn.addEventListener('click', aiSendMessage);
aiChatInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') aiSendMessage(); });

/* ---- Instagram AI sozlamalari ---- */
const igRulesList = document.getElementById('igRulesList');
let igRulesData = []; // { trigger, response }

function igRenderRules(){
  igRulesList.innerHTML = '';
  if(igRulesData.length === 0){
    igRulesList.innerHTML = `<div class="empty-admin" style="padding:16px;">Hali qoida qo'shilmagan.</div>`;
    return;
  }
  igRulesData.forEach((rule, idx)=>{
    const row = document.createElement('div');
    row.className = 'ig-rule-row';
    row.innerHTML = `
      <div>
        <div class="ig-rule-label">Mijoz shunga o'xshash yozsa:</div>
        <input type="text" class="ig-rule-trigger" placeholder="masalan: dostavka qancha turadi" value="${escapeHtml(rule.trigger||'')}">
      </div>
      <div>
        <div class="ig-rule-label">Bot shunday javob beradi:</div>
        <textarea class="ig-rule-response" rows="2" placeholder="masalan: Yetkazib berish bepul, 1-2 kun ichida yetkazamiz 🚗">${escapeHtml(rule.response||'')}</textarea>
      </div>
      <button type="button" class="ig-rule-remove">O'chirish</button>
    `;
    row.querySelector('.ig-rule-trigger').addEventListener('input', e=>{ igRulesData[idx].trigger = e.target.value; });
    row.querySelector('.ig-rule-response').addEventListener('input', e=>{ igRulesData[idx].response = e.target.value; });
    row.querySelector('.ig-rule-remove').addEventListener('click', ()=>{
      igRulesData.splice(idx, 1);
      igRenderRules();
    });
    igRulesList.appendChild(row);
  });
}

document.getElementById('igAddRuleBtn').addEventListener('click', ()=>{
  igRulesData.push({ trigger: '', response: '' });
  igRenderRules();
});

async function loadInstagramSettings(){
  try{
    const doc = await db.collection('site_settings').doc('instagram_bot').get();
    const data = doc.exists ? doc.data() : {};
    document.getElementById('igTelegramLink').value = data.telegramChannelLink || '';
    document.getElementById('igDeliveryInfo').value = data.deliveryInfo || '';
    document.getElementById('igGeneralInstructions').value = data.generalInstructions || '';
    igRulesData = Array.isArray(data.faqRules) ? data.faqRules : [];
    igRenderRules();
  }catch(err){
    console.error('Instagram sozlamalarini yuklashda xato:', err);
  }
}

document.getElementById('igSaveBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('igSaveBtn');
  const msg = document.getElementById('igSaveMsg');
  btn.disabled = true;
  try{
    const cleanRules = igRulesData
      .map(r => ({ trigger: (r.trigger||'').trim(), response: (r.response||'').trim() }))
      .filter(r => r.trigger && r.response);

    await db.collection('site_settings').doc('instagram_bot').set({
      telegramChannelLink: document.getElementById('igTelegramLink').value.trim(),
      deliveryInfo: document.getElementById('igDeliveryInfo').value.trim(),
      generalInstructions: document.getElementById('igGeneralInstructions').value.trim(),
      faqRules: cleanRules,
      updatedAt: Date.now()
    }, { merge: true });

    msg.textContent = '✓ Saqlandi — bot yangi qoidalar bilan ishlaydi';
    vibrate(80);
    setTimeout(()=>{ msg.textContent = ''; }, 3000);
  }catch(err){
    msg.style.color = 'var(--red)';
    msg.textContent = 'Xato: ' + err.message;
  }
  btn.disabled = false;
});

/* ---- Operatorlar (jonli API qidiruvi) ---- */
//
// Sozlamalar operator_config/main hujjatida saqlanadi. Netlify funksiyasi
// (api-live-search) shu hujjatni o'qiydi. Hujjat bo'lmasa — funksiya o'zining
// standart qiymatlari bilan ishlaydi, ya'ni sayt baribir buzilmaydi.

const OP_DEFAULTS = {
  Beeline: {
    enabled: true, username: '', password: '',
    warehouses: [
      { id: 393, name: 'Oddiy',     operatorPrice: 0,        salePrice: 50000 },
      { id: 394, name: 'Bronze',    operatorPrice: 100000,   salePrice: 150000 },
      { id: 395, name: 'Silver',    operatorPrice: 250000,   salePrice: 190000 },
      { id: 396, name: 'Gold',      operatorPrice: 500000,   salePrice: 400000 },
      { id: 397, name: 'Platinum',  operatorPrice: 1500000,  salePrice: 890000 },
      { id: 413, name: 'Platinum+', operatorPrice: 10000000, salePrice: 5000000 },
      { id: 409, name: '20 mln',    operatorPrice: 20000000, salePrice: 10000000 }
    ]
  },
  Ucell: { enabled: true, prices: [
    { operatorPrice: 0, salePrice: 50000 }, { operatorPrice: 100000, salePrice: 150000 },
    { operatorPrice: 250000, salePrice: 270000 }, { operatorPrice: 500000, salePrice: 300000 },
    { operatorPrice: 1000000, salePrice: 350000 }, { operatorPrice: 3000000, salePrice: 400000 },
    { operatorPrice: 5000000, salePrice: 5000000 }, { operatorPrice: 10000000, salePrice: 10000000 },
    { operatorPrice: 20000000, salePrice: 20000000 }, { operatorPrice: 30000000, salePrice: 30000000 }
  ]},
  Humans: { enabled: true, prices: [
    { operatorPrice: 0, salePrice: 50000 }, { operatorPrice: 54000, salePrice: 180000 },
    { operatorPrice: 108000, salePrice: 308000 },
    { operatorPrice: 144000, salePrice: 344000 }, { operatorPrice: 288000, salePrice: 488000 },
    { operatorPrice: 576000, salePrice: 776000 }, { operatorPrice: 1440000, salePrice: 1800000 },
    { operatorPrice: 3600000, salePrice: 3900000 }, { operatorPrice: 8640000, salePrice: 9000000 },
    { operatorPrice: 18000000, salePrice: 18000000 }
  ]},
  // Perfektum narxlari operatordan olingan (perfectum.uz/numbers/data javobi).
  // Sotuv narxi hozircha operator narxiga TENG — siz jadval berganingizdan
  // keyin o'ng ustunni to'ldirasiz.
  Perfektum: { enabled: false, prices: [
    { operatorPrice: 0, salePrice: 0 }, { operatorPrice: 200000, salePrice: 200000 },
    { operatorPrice: 600000, salePrice: 600000 }, { operatorPrice: 1000000, salePrice: 1000000 },
    { operatorPrice: 3000000, salePrice: 3000000 }, { operatorPrice: 6000000, salePrice: 6000000 },
    { operatorPrice: 10000000, salePrice: 10000000 }, { operatorPrice: 20000000, salePrice: 20000000 },
    { operatorPrice: 30000000, salePrice: 30000000 }, { operatorPrice: 60000000, salePrice: 60000000 },
    { operatorPrice: 100000000, salePrice: 100000000 }
  ]},
  Mobiuz: { enabled: true, prices: [
    { operatorPrice: 0, salePrice: 50000 }, { operatorPrice: 300000, salePrice: 450000 },
    { operatorPrice: 630000, salePrice: 830000 }, { operatorPrice: 840000, salePrice: 950000 },
    { operatorPrice: 2000000, salePrice: 2200000 }, { operatorPrice: 5000000, salePrice: 5100000 },
    { operatorPrice: 10000000, salePrice: 10000000 }, { operatorPrice: 25000000, salePrice: 25000000 }
  ]}
};

// Operatorlarda ROSTDAN uchragan, lekin jadvalda yo'q narxlar (tekshirilgan).
// Bularsiz o'sha raqamlar operator narxida sotiladi — ya'ni ustama qo'shilmaydi.
const OP_GAPS = {
  Ucell:  'Diqqat: operatorda 10 000 (Steel) va 50 000 (Bronze) darajalari ham bor — jadvalda yo\'q. ' +
          'Ular ayni operator narxida ko\'rsatiladi (ustamasiz).',
  Humans: 'Tuzatildi: Kategoriya 2 (108 000) qatori qo\'shildi (sotuv narxi 200 000 so\'m), ' +
          'Kategoriya 8 operator narxi 8 640 000 ga to\'g\'irlandi (sotuv narxi 9 000 000 ' +
          'o\'zgarishsiz). Agar pastdagi jadvalda hali eski qiymatlar (8 600 000 yoki 108 000 ' +
          'qatorisiz) ko\'rinsa — bu eski saqlangan sozlama, "+ Qator" bilan qo\'shib/tahrirlab ' +
          '"Saqlash"ni bosing.',
  Perfektum: 'Chap ustundagi narxlar operatorning o\'zidan olingan (Free 0, First 200 000, ' +
             'Second 600 000, Third 1 mln, Fourth 3 mln, Fifth 6 mln, Sixth 10 mln, ' +
             'Seventh 20 mln, Eighth 30 mln, Ninth 60 mln, Tenth 100 mln). ' +
             'O\'ng ustun hozir ular bilan bir xil — ustama yo\'q.'
};

let opData = null;

// Mijoz iltimosiga ko'ra: "Bo'lib to'lash" endi Beeline'da HAM ishlaydi
// (Humans/Ucell bilan bir xil tizim — operatorPrice bo'yicha bog'lanadi).
const FIN_OPERATORS = ['Humans', 'Ucell', 'Beeline'];

// YANGI (mijoz so'roviga ko'ra — index.html'dagi Naqt to'lov + Tarif
// tanlash bosqichi, #cashTariffView): tarif ro'yxati (tariffsByOperator)
// endi FIN_OPERATORS (faqat Bo'lib to'lash summasi kiritilgan 3 ta
// operator) bilan CHEKLANMAYDI — sayt haqiqatda ishlatadigan BARCHA
// operatorlar uchun tarif kiritish mumkin bo'lishi kerak, chunki Naqt
// to'lov istalgan operatordagi raqamda ishlaydi. Ro'yxat index.html'dagi
// OPERATOR_PICKER_LIST bilan AYNAN bir xil bo'lishi kerak.
const TARIFF_OPERATORS = ['Mobiuz', 'Beeline', 'Ucell', 'Humans', 'Uzmobile', 'Perfektum'];

function opRow(name, item, idx){
  const tr = document.createElement('tr');
  const isFin = FIN_OPERATORS.includes(name);
  if(name === 'Beeline'){
    tr.innerHTML =
      '<td><input type="number" data-f="id" value="' + (item.id ?? '') + '"></td>' +
      '<td><input type="text" data-f="name" value="' + escapeHtml(item.name || '') + '"></td>' +
      '<td><input type="number" data-f="operatorPrice" value="' + (item.operatorPrice ?? 0) + '"></td>' +
      '<td><input type="number" data-f="salePrice" value="' + (item.salePrice ?? 0) + '"></td>' +
      '<td><button type="button" class="op-fin-toggle" title="Bo\'lib to\'lash">▾</button></td>' +
      '<td><button type="button" class="op-del" title="O\'chirish">×</button></td>';
  }else if(isFin){
    tr.innerHTML =
      '<td><input type="number" data-f="operatorPrice" value="' + (item.operatorPrice ?? 0) + '"></td>' +
      '<td><input type="number" data-f="salePrice" value="' + (item.salePrice ?? 0) + '"></td>' +
      '<td><button type="button" class="op-fin-toggle" title="Bo\'lib to\'lash">▾</button></td>' +
      '<td><button type="button" class="op-del" title="O\'chirish">×</button></td>';
  }else{
    tr.innerHTML =
      '<td><input type="number" data-f="operatorPrice" value="' + (item.operatorPrice ?? 0) + '"></td>' +
      '<td><input type="number" data-f="salePrice" value="' + (item.salePrice ?? 0) + '"></td>' +
      '<td><button type="button" class="op-del" title="O\'chirish">×</button></td>';
  }
  tr.querySelector('.op-del').addEventListener('click', ()=>{
    const list = name === 'Beeline' ? opData.Beeline.warehouses : opData[name].prices;
    list.splice(idx, 1);
    opRenderRows(name);
  });
  if(!isFin) return tr;

  // "Bo'lib to'lash" paneli — shu narx qatoriga bog'langan, HAR BIR muddat
  // (6/12/24 oy) uchun ALOHIDA bosh to'lov + oylik to'lov (muddat uzunroq
  // bo'lsa bosh to'lov ham odatda boshqacha bo'ladi, shu sabab bittagina
  // umumiy bosh to'lov emas — har oy guruhining o'z bosh to'lovi bor).
  // ▾ tugmasi bosilganda ochiladi/yopiladi.
  const finRow = document.createElement('tr');
  finRow.className = 'op-fin-panel-row';
  finRow.style.display = 'none';
  const finKey = String(item.operatorPrice ?? 0);
  const fin = (finData.byOperator[name] && finData.byOperator[name][finKey]) || {};
  const finGroup = (months)=>
    '<div class="op-fin-group">' +
      '<div class="op-fin-group-title">' + months + ' oy</div>' +
      '<label>Bosh to\'lov</label><input type="number" data-ff="down' + months + '" value="' + (fin['down' + months] ?? 0) + '">' +
      '<label>Oylik to\'lov</label><input type="number" data-ff="monthly' + months + '" value="' + (fin['monthly' + months] ?? 0) + '">' +
    '</div>';
  const finColspan = name === 'Beeline' ? 6 : 4;
  finRow.innerHTML =
    '<td colspan="' + finColspan + '"><div class="op-fin-panel">' +
      finGroup(6) + finGroup(12) + finGroup(24) +
    '</div></td>';

  const toggleBtn = tr.querySelector('.op-fin-toggle');
  toggleBtn.addEventListener('click', ()=>{
    const isOpen = finRow.style.display !== 'none';
    finRow.style.display = isOpen ? 'none' : '';
    toggleBtn.classList.toggle('active', !isOpen);
  });

  const frag = document.createDocumentFragment();
  frag.appendChild(tr);
  frag.appendChild(finRow);
  return frag;
}

function opRenderRows(name){
  const tbody = document.getElementById('op' + name + 'Rows');
  if(!tbody) return;
  tbody.innerHTML = '';
  const list = name === 'Beeline' ? opData.Beeline.warehouses : opData[name].prices;
  list.forEach((item, i)=> tbody.appendChild(opRow(name, item, i)));
}

// Ekrandagi qiymatlarni obyektga qaytarib yozish (saqlashdan oldin) —
// "Bo'lib to'lash" panel qatorlari (.op-fin-panel-row) chetlab o'tiladi.
function opCollect(name){
  const tbody = document.getElementById('op' + name + 'Rows');
  const rows = [];
  Array.from(tbody.children).forEach(tr=>{
    if(tr.classList.contains('op-fin-panel-row')) return;
    const o = {};
    tr.querySelectorAll('input').forEach(inp=>{
      o[inp.dataset.f] = inp.dataset.f === 'name' ? inp.value.trim() : (Number(inp.value) || 0);
    });
    if(name === 'Beeline'){ if(o.id) rows.push(o); }
    else rows.push({ operatorPrice: o.operatorPrice, salePrice: o.salePrice });
  });
  return rows;
}

// Har bir narx qatoriga bog'langan "Bo'lib to'lash" (rasrochka) ma'lumotini
// yig'ib olish — faqat Humans/Ucell uchun, faqat bosh to'lov kiritilgan
// qatorlar saqlanadi (bo'shlari sotib olinmaydi/tashlab yuboriladi).
function opCollectFinancing(name){
  const tbody = document.getElementById('op' + name + 'Rows');
  const result = {};
  if(!tbody) return result;
  const trs = Array.from(tbody.children);
  for(let i = 0; i < trs.length; i++){
    const tr = trs[i];
    if(tr.classList.contains('op-fin-panel-row')) continue;
    const opInput = tr.querySelector('input[data-f="operatorPrice"]');
    if(!opInput) continue;
    const opPrice = Number(opInput.value) || 0;
    const finRow = trs[i + 1];
    if(!finRow || !finRow.classList.contains('op-fin-panel-row')) continue;
    const f = {};
    finRow.querySelectorAll('input').forEach(inp=>{ f[inp.dataset.ff] = Number(inp.value) || 0; });
    // Har bir muddat (6/12/24 oy) o'zining bosh to'lovi bilan mustaqil —
    // qatorni saqlash uchun kamida BITTA muddatda bosh to'lov kiritilgan
    // bo'lishi kifoya (hammasini to'ldirish shart emas).
    if((f.down6 > 0) || (f.down12 > 0) || (f.down24 > 0)){
      result[opPrice] = {
        down6: f.down6 || 0, monthly6: f.monthly6 || 0,
        down12: f.down12 || 0, monthly12: f.monthly12 || 0,
        down24: f.down24 || 0, monthly24: f.monthly24 || 0
      };
    }
  }
  return result;
}

async function loadOperatorSettings(){
  try{
    const doc = await db.collection('operator_config').doc('main').get();
    const saved = doc.exists ? (doc.data() || {}) : {};
    opData = JSON.parse(JSON.stringify(OP_DEFAULTS));
    ['Beeline','Ucell','Humans','Mobiuz','Perfektum'].forEach(n=>{
      const sv = saved[n];
      if(!sv) return;
      if(typeof sv.enabled === 'boolean') opData[n].enabled = sv.enabled;
      if(n === 'Beeline'){
        opData.Beeline.username = sv.username || '';
        opData.Beeline.password = sv.password || '';
        if(Array.isArray(sv.warehouses) && sv.warehouses.length) opData.Beeline.warehouses = sv.warehouses;
      }else if(Array.isArray(sv.prices) && sv.prices.length){
        opData[n].prices = sv.prices;
      }
    });

    document.getElementById('opBeelineUser').value = opData.Beeline.username;
    document.getElementById('opBeelinePass').value = opData.Beeline.password;
    ['Beeline','Ucell','Humans','Mobiuz','Perfektum'].forEach(n=>{
      document.getElementById('op' + n + 'Enabled').checked = opData[n].enabled !== false;
      opRenderRows(n);
    });
    const uw = document.getElementById('opUcellWarn');  if(uw) uw.textContent = OP_GAPS.Ucell;
    /* V120: Ucell API manzillari (bo'sh bo'lsa server standartni ishlatadi) */
    const ul = document.getElementById('opUcellLoginUrl');
    if(ul) ul.value = (opData.Ucell && opData.Ucell.loginUrl) || '';
    const us = document.getElementById('opUcellSearchUrl');
    if(us) us.value = (opData.Ucell && opData.Ucell.searchUrl) || '';
    const pw = document.getElementById('opPerfektumWarn'); if(pw) pw.textContent = OP_GAPS.Perfektum;
    const hw = document.getElementById('opHumansWarn'); if(hw) hw.textContent = OP_GAPS.Humans;
  }catch(err){
    console.error('Operator sozlamalarini yuklashda xato:', err);
  }
  loadOperatorFinancing();
}

/* ---- "Bo'lib to'lash" (rasrochka) — Humans va Ucell uchun ----
   operator_config/main'dan ALOHIDA — u yerga yozish faqat "Operatorlar"
   ruxsatiga ega adminlarga OCHIQ EMAS mijozga (login/parol bor bo'lgani
   uchun read ham yopiq). Bu ma'lumot esa MIJOZ SAYTIDA (index.html) ko'rinishi
   kerak, shu sabab site_settings/operator_financing hujjatida saqlanadi —
   site_settings/{doc} qoidasi bo'yicha O'QISH hammaga ochiq.

   Bosh to'lov/oylik to'lovlar endi har bir narx qatorining o'zida (▾ tugma
   ostida) kiritiladi — qarang: opRow()/opCollectFinancing(). Mijoz iltimosiga
   ko'ra: har bir operator (Humans/Ucell/Beeline) uchun tarif reja va
   summasi ENDI ALOHIDA — tariffsByOperator: {Humans:[...], Ucell:[...],
   Beeline:[...]}. */
// Mijoz so'roviga ko'ra: default obyekt endi TARIFF_OPERATORS'dagi
// BARCHA operatorlar uchun bo'sh massiv bilan boshlanadi (avval faqat
// Humans/Ucell/Beeline bor edi) — reduce() orqali qo'lda har birini
// yozib chiqmaslik uchun.
function emptyTariffsByOperator(){
  return TARIFF_OPERATORS.reduce((acc, op)=>{ acc[op] = []; return acc; }, {});
}
let finData = { tariffsByOperator: emptyTariffsByOperator(), byOperator: { Humans: {}, Ucell: {}, Beeline: {} } };

function finTariffRow(op, item, idx){
  const tr = document.createElement('tr');
  tr.innerHTML =
    '<td><input type="text" data-f="name" value="' + escapeHtml(item.name || '') + '" placeholder="Standart"></td>' +
    '<td><input type="text" data-f="internet" value="' + escapeHtml(item.internet || '') + '" placeholder="26 GB"></td>' +
    '<td><input type="text" data-f="minutes" value="' + escapeHtml(item.minutes || '') + '" placeholder="Cheksiz"></td>' +
    '<td><input type="text" data-f="sms" value="' + escapeHtml(item.sms || '') + '" placeholder="0 ta"></td>' +
    '<td><input type="number" data-f="price" value="' + (item.price ?? 0) + '" placeholder="0"></td>' +
    // YANGI: "HIT" belgisi — mijoz so'roviga ko'ra (boshqa ilova
    // namunasidagi amber "HIT" lentachasi) faqat shu katak belgilangan
    // tarifda ko'rinadi (qarang: index.html #cashTariffView .ct-badge).
    // Checkbox holati saqlanish uchun alohida data-badge atributiga
    // EMAS, to'g'ridan-to'g'ri finCollectTariffs() ichida o'qiladi.
    '<td style="text-align:center;"><input type="checkbox" data-f="badge" ' + (item.badge ? 'checked' : '') + ' title="Belgilangan (HIT)"></td>' +
    '<td><button type="button" class="op-del" title="O\'chirish">×</button></td>';
  tr.querySelector('.op-del').addEventListener('click', ()=>{
    finData.tariffsByOperator[op].splice(idx, 1);
    finRenderTariffs(op);
  });
  return tr;
}
function finRenderTariffs(op){
  const tbody = document.getElementById('finTariffRows_' + op);
  if(!tbody) return;
  tbody.innerHTML = '';
  (finData.tariffsByOperator[op] || []).forEach((item, i)=> tbody.appendChild(finTariffRow(op, item, i)));
}
function finRenderAllTariffs(){
  // Mijoz so'roviga ko'ra: endi FIN_OPERATORS (3 ta) o'rniga
  // TARIFF_OPERATORS (barcha 6 ta) bo'yicha chiziladi.
  TARIFF_OPERATORS.forEach(op=> finRenderTariffs(op));
}
function finCollectTariffs(op){
  const tbody = document.getElementById('finTariffRows_' + op);
  if(!tbody) return [];
  const rows = [];
  tbody.querySelectorAll('tr').forEach(tr=>{
    const o = {};
    tr.querySelectorAll('input[data-f]').forEach(inp=>{
      if(inp.dataset.f === 'price'){ o.price = Number(inp.value) || 0; }
      else if(inp.dataset.f === 'badge'){ o.badge = inp.checked ? 'HIT' : ''; }
      else{ o[inp.dataset.f] = inp.value.trim(); }
    });
    if(o.name) rows.push(o);
  });
  return rows;
}
async function loadOperatorFinancing(){
  try{
    const doc = await db.collection('site_settings').doc('operator_financing').get();
    const d = doc.exists ? (doc.data() || {}) : {};
    // Mijoz so'roviga ko'ra: BARCHA operatorlar (TARIFF_OPERATORS) uchun
    // bo'sh ro'yxatdan boshlanadi, keyin saqlangan ma'lumot (agar bor
    // bo'lsa) har biriga alohida qo'yiladi — ESKI Humans/Ucell/Beeline
    // ma'lumoti YO'QOLMAYDI, faqat yangi operatorlar uchun ham joy
    // ochiladi (orqaga moslik).
    finData.tariffsByOperator = emptyTariffsByOperator();
    TARIFF_OPERATORS.forEach(op=>{
      if(d.tariffsByOperator && Array.isArray(d.tariffsByOperator[op])){
        finData.tariffsByOperator[op] = d.tariffsByOperator[op];
      }
    });
    if(!d.tariffsByOperator && Array.isArray(d.tariffs)){
      // Eski ma'lumot formati — hammasi Humans'ga tegishli deb hisoblaymiz.
      finData.tariffsByOperator.Humans = d.tariffs;
    }
    finData.byOperator = { Humans: {}, Ucell: {}, Beeline: {} };
    FIN_OPERATORS.forEach(op=>{
      (Array.isArray(d.byOperator && d.byOperator[op]) ? d.byOperator[op] : []).forEach(row=>{
        const price = row.operatorPrice;
        if(price === undefined || price === null) return;
        finData.byOperator[op][String(price)] = {
          down6: Number(row.down6) || 0, monthly6: Number(row.monthly6) || 0,
          down12: Number(row.down12) || 0, monthly12: Number(row.monthly12) || 0,
          down24: Number(row.down24) || 0, monthly24: Number(row.monthly24) || 0
        };
      });
    });
    finRenderAllTariffs();
    // Yuqorida narx qatorlari finData bo'sh paytda chizilgan edi — endi
    // ma'lumot keldi, Humans/Ucell qatorlarini (▾ panellari bilan) qayta chizamiz.
    if(opData){ FIN_OPERATORS.forEach(op=> opRenderRows(op)); }
  }catch(err){
    console.error('Bo\'lib to\'lash sozlamalarini yuklashda xato:', err);
  }
}
document.querySelectorAll('[data-fin-add]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const op = btn.dataset.finAdd;
    if(!finData.tariffsByOperator[op]) finData.tariffsByOperator[op] = [];
    finData.tariffsByOperator[op].push({ name:'', internet:'', minutes:'', sms:'', price:0 });
    finRenderTariffs(op);
  });
});

/* ---- "Baza raqam" kuzatuvi ---- */
/* Kompaniya tanlash — zamonaviy ikonkali tugmalar, orqa fonda yashirin
   <select id="wtOperator"> ning qiymatini yangilab turadi (shunda pastdagi
   qolgan JS mantiq o'zgarishsiz ishlayveradi). */
document.querySelectorAll('#wtOpPicker .wt-op-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#wtOpPicker .wt-op-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('wtOperator').value = btn.dataset.op;
  });
});

const wtBoxInputs = Array.from(document.querySelectorAll('#wtBoxes .wt-box'));
wtBoxInputs.forEach((inp, i)=>{
  inp.addEventListener('input', ()=>{
    inp.value = inp.value.replace(/[^0-9]/g, '').slice(0,1);
    if(inp.value && wtBoxInputs[i+1]) wtBoxInputs[i+1].focus();
  });
  inp.addEventListener('keydown', (e)=>{
    if(e.key === 'Backspace' && !inp.value && wtBoxInputs[i-1]) wtBoxInputs[i-1].focus();
  });
});

let wtSelectedInterval = 5;
document.querySelectorAll('#wtIntervals .wt-interval-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#wtIntervals .wt-interval-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    wtSelectedInterval = Number(btn.dataset.min);
  });
});

async function wtCall(action, extra){
  const idToken = await firebase.auth().currentUser.getIdToken();
  const res = await fetch('/.netlify/functions/admin-number-watch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
    body: JSON.stringify(Object.assign({ action }, extra || {}))
  });
  const data = await res.json();
  if(!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

document.getElementById('wtConfirmBtn').addEventListener('click', async ()=>{
  const boxes = wtBoxInputs.map(inp => inp.value || '');
  const msg = document.getElementById('wtSaveMsg');
  if(!boxes.some(b => b !== '')){
    msg.textContent = "Kamida bitta katakka raqam kiriting.";
    msg.style.color = '#c0392b';
    return;
  }
  const operator = document.getElementById('wtOperator').value;
  const btn = document.getElementById('wtConfirmBtn');
  btn.disabled = true;
  msg.textContent = 'Saqlanmoqda...';
  msg.style.color = '';
  try{
    await wtCall('create', { boxes, operator, intervalMinutes: wtSelectedInterval });
    msg.textContent = "✅ Kuzatuv boshlandi — natija chiqishi bilan Telegram'ga xabar keladi.";
    msg.style.color = '#33E28C';
    wtBoxInputs.forEach(inp => inp.value = '');
    loadWatchList();
  }catch(err){
    msg.textContent = "Xato: " + err.message;
    msg.style.color = '#c0392b';
  }finally{
    btn.disabled = false;
  }
});

function wtFormatBoxes(boxes){
  return (boxes || []).map(b => b || '•').join(' ');
}
function wtFormatTime(ms){
  if(!ms) return '—';
  const d = new Date(ms);
  const pad = n => String(n).padStart(2,'0');
  return pad(d.getDate()) + '.' + pad(d.getMonth()+1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
const WT_INTERVAL_LABELS = {1:'1 daqiqa', 3:'3 daqiqa', 5:'5 daqiqa', 30:'30 daqiqa', 60:'1 soat', 120:'2 soat'};
// Har bir kompaniya uchun rang va belgi — guruh sarlavhalarini ajratib turadi
const WT_OPERATOR_META = {
  Beeline:   { color: '#F2A93B', icon: '🟡' },
  Ucell:     { color: '#9B59B6', icon: '🟣' },
  Humans:    { color: '#E67E22', icon: '🟠' },
  Mobiuz:    { color: '#E24C4C', icon: '🔴' },
  Perfektum: { color: '#16A085', icon: '🟢' }
};
function wtOpMeta(op){ return WT_OPERATOR_META[op] || { color: '#8892A6', icon: '📶' }; }

let wtWatchesCache = [];
const wtSelected = new Set();
const wtOpenGroups = new Set();

function wtUpdateBulkBar(){
  document.getElementById('wtBulkCount').textContent = wtSelected.size;
  document.getElementById('wtBulkDelBtn').classList.toggle('show', wtSelected.size > 0);
  const selectAll = document.getElementById('wtSelectAll');
  selectAll.checked = wtWatchesCache.length > 0 && wtSelected.size === wtWatchesCache.length;
}

function wtRenderStats(watches){
  const stats = document.getElementById('wtStats');
  const total = watches.length;
  const active = watches.filter(w => w.active).length;
  const paused = total - active;
  const found = watches.filter(w => w.lastFoundAt).length;
  stats.innerHTML = `
    <div class="wt-stat"><b>${total}</b><span>jami kuzatuv</span></div>
    <div class="wt-stat wt-stat-active"><b>${active}</b><span>faol</span></div>
    <div class="wt-stat"><b>${paused}</b><span>to'xtatilgan</span></div>
    <div class="wt-stat wt-stat-found"><b>${found}</b><span>topilgan</span></div>
  `;
}

/* OPERATOR TEZLIGI VA HOLATI (V120).
   Har bir operator uchun oxirgi so'rov qancha davom etgani va
   silliqlangan o'rtachasi ko'rsatiladi. Ranglar: 3 sekundgacha yashil
   (tez), 3-7 sekund sariq (sekin, lekin ishlaydi), 7 sekunddan yuqori
   yoki xato — qizil. "Tinim" — operator ketma-ket ko'p xato berib,
   vaqtincha so'rovdan chiqarilgani. */
function wtMsMatn(ms){
  if(!ms) return '—';
  return ms < 1000 ? (ms + ' ms') : ((ms/1000).toFixed(1) + ' s');
}
function wtRenderSoglik(soglik){
  const box = document.getElementById('wtSoglik');
  if(!box) return;
  if(!soglik.length){
    box.innerHTML = '<div class="wt-soglik-bosh">Tezlik ma\'lumoti hali yig\'ilmagan — '
      + 'birinchi tekshiruvdan keyin shu yerda har bir operatorning '
      + 'javob tezligi ko\'rinadi.</div>';
    return;
  }
  const now = Date.now();
  box.innerHTML = soglik.map(o => {
    const tinimda = o.backoffUntil && o.backoffUntil > now;
    const ms = o.avgMs || o.lastMs || 0;
    let holat = 'tez', izoh = 'tez';
    if(tinimda){ holat = 'tinim'; izoh = 'tinimda'; }
    else if(o.streak > 0){ holat = 'xato'; izoh = o.streak + ' marta xato'; }
    else if(ms >= 7000){ holat = 'xato'; izoh = 'juda sekin'; }
    else if(ms >= 3000){ holat = 'sekin'; izoh = 'sekinroq'; }
    else if(ms >= 1500){ holat = 'tez'; izoh = 'yaxshi'; }
    const tafsilot = tinimda
      ? ('yana ' + Math.max(1, Math.round((o.backoffUntil - now)/60000)) + ' daqiqadan keyin sinaladi')
      : (o.lastError ? String(o.lastError).slice(0, 90) : ('oxirgi: ' + wtMsMatn(o.lastMs)));
    /* V134: SABAB va NIMA QILISH. Ilgari bu yerda faqat xom xato matni
       ("HTTP 404") turardi — undan nima qilish kerakligi tushunarsiz
       edi. Endi server xatoni turkumlab, sababini va aniq qadamini
       yozib beradi (qarang: netlify/functions/lib/xatoSababi.js). */
    const sabab = (o.streak > 0 && o.sababMatn)
      ? '<div class="wt-sog-sabab">'
        + '<b>Sababi:</b> ' + escapeHtml(String(o.sababMatn).slice(0, 160))
        + (o.sababQadam ? '<br><b>Nima qilish:</b> ' + escapeHtml(String(o.sababQadam).slice(0, 200)) : '')
        + (o.oziTuzaladi ? '<br><i>Bu holat o\'zi tuzaladi — aralashuv shart emas.</i>' : '')
        + '</div>'
      : '';
    return '<div class="wt-sog wt-sog-' + holat + '">'
      + '<div class="wt-sog-nom">' + escapeHtml(o.operator) + '</div>'
      + '<div class="wt-sog-ms">' + wtMsMatn(ms) + '</div>'
      + '<div class="wt-sog-izoh">' + escapeHtml(izoh) + '</div>'
      + '<div class="wt-sog-tafsilot">' + escapeHtml(tafsilot) + '</div>'
      + sabab
      + '</div>';
  }).join('');
}

function wtRenderGroups(watches){
  const list = document.getElementById('wtList');
  if(watches.length === 0){
    list.innerHTML = '<div class="wt-empty">Hozircha kuzatuv yo\'q</div>';
    return;
  }
  const byOp = {};
  watches.forEach(w => {
    if(!byOp[w.operator]) byOp[w.operator] = [];
    byOp[w.operator].push(w);
  });
  const opNames = Object.keys(byOp).sort((a,b) => byOp[b].length - byOp[a].length);

  list.innerHTML = opNames.map(op => {
    const items = byOp[op];
    const meta = wtOpMeta(op);
    const isOpen = wtOpenGroups.has(op);
    const activeCount = items.filter(w => w.active).length;
    return `
      <div class="wt-group ${isOpen ? 'open' : ''}">
        <div class="wt-group-header" data-op="${escapeHtml(op)}" style="background:linear-gradient(90deg, ${meta.color}26, transparent);">
          <div class="wt-group-icon" style="background:${meta.color}30;color:${meta.color};">${meta.icon}</div>
          <div class="wt-group-name" style="color:${meta.color};">${escapeHtml(op)}</div>
          <div class="wt-group-count"><b>${activeCount}</b>/${items.length} faol</div>
          <svg class="wt-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <div class="wt-group-body">
          <div class="wt-group-body-inner">
            ${items.map(w => `
              <div class="wt-item ${w.active ? '' : 'paused'} ${wtSelected.has(w.id) ? 'selected' : ''}" data-id="${escapeHtml(w.id)}">
                <input type="checkbox" class="wt-item-check" data-id="${escapeHtml(w.id)}" ${wtSelected.has(w.id) ? 'checked' : ''}>
                <div class="wt-item-main">
                  <div class="wt-item-num"><span class="wt-live-dot"></span>${escapeHtml(wtFormatBoxes(w.boxes))}</div>
                  <div class="wt-item-meta">
                    ⏱ ${escapeHtml(WT_INTERVAL_LABELS[w.intervalMinutes] || (w.intervalMinutes + ' daq'))}
                    · so'nggi tekshiruv: ${wtFormatTime(w.lastCheckedAt)}
                    ${w.notifiedCount ? " · xabar qilingan: " + w.notifiedCount + " ta" : ''}
                    ${w.lastFoundAt ? " · oxirgi topilgan: " + wtFormatTime(w.lastFoundAt) : ''}
                    ${!w.active ? " · <b style=\"color:#e74c3c;\">to'xtatilgan</b>" : ''}
                  </div>
                  ${w.lastError ? `<div class="wt-item-xato">\u26A0 Operator javob bermadi${w.errorStreak > 1 ? ' (' + w.errorStreak + ' marta ketma-ket)' : ''}: ${escapeHtml(String(w.lastError).slice(0,140))}</div>` : ''}
                </div>
                <div class="wt-item-actions">
                  <button type="button" class="wt-toggle" data-id="${escapeHtml(w.id)}" data-active="${w.active ? '0' : '1'}" title="${w.active ? "To'xtatish" : 'Davom ettirish'}">${w.active ? '⏸' : '▶'}</button>
                  <button type="button" class="wt-del" data-id="${escapeHtml(w.id)}" title="O'chirish">🗑</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.wt-group-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const op = hdr.dataset.op;
      const group = hdr.closest('.wt-group');
      if(wtOpenGroups.has(op)){ wtOpenGroups.delete(op); group.classList.remove('open'); }
      else { wtOpenGroups.add(op); group.classList.add('open'); }
    });
  });

  list.querySelectorAll('.wt-item-check').forEach(chk => {
    chk.addEventListener('click', (e) => e.stopPropagation());
    chk.addEventListener('change', () => {
      const id = chk.dataset.id;
      if(chk.checked) wtSelected.add(id); else wtSelected.delete(id);
      chk.closest('.wt-item').classList.toggle('selected', chk.checked);
      wtUpdateBulkBar();
    });
  });

  list.querySelectorAll('.wt-toggle').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      btn.disabled = true;
      try{
        await wtCall('toggle', { id: btn.dataset.id, active: btn.dataset.active === '1' });
        loadWatchList();
      }catch(err){ alert('Xato: ' + err.message); btn.disabled = false; }
    });
  });
  list.querySelectorAll('.wt-del').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      if(!confirm("Bu kuzatuvni butunlay o'chirasizmi?")) return;
      btn.disabled = true;
      try{
        await wtCall('delete', { id: btn.dataset.id });
        wtSelected.delete(btn.dataset.id);
        loadWatchList();
      }catch(err){ alert('Xato: ' + err.message); btn.disabled = false; }
    });
  });
}

document.getElementById('wtSelectAll').addEventListener('change', (e)=>{
  if(e.target.checked){ wtWatchesCache.forEach(w => wtSelected.add(w.id)); }
  else { wtSelected.clear(); }
  wtRenderGroups(wtWatchesCache);
  wtUpdateBulkBar();
});

/* "HOZIR TEKSHIR" (V110) — keyingi daqiqani kutmasdan, shu zahoti
   tekshirtiradi. Server tomoni: admin-number-watch.js -> runNow(). */
const wtNowBtn = document.getElementById('wtNowBtn');
if(wtNowBtn){
  wtNowBtn.addEventListener('click', async ()=>{
    const asl = wtNowBtn.textContent;
    wtNowBtn.disabled = true;
    wtNowBtn.textContent = '\u23F3 Tekshirilmoqda\u2026';
    try{
      const j = await wtCall('runNow');
      wtNowBtn.textContent = '\u2713 ' + (j.yangilandi || 0) + ' ta kuzatuv tekshirilmoqda';
      vibrate(60);
      /* Fon funksiyasi natijani yozgach ro'yxat yangilansin */
      setTimeout(loadWatchList, 6000);
      setTimeout(loadWatchList, 15000);
    }catch(e){
      wtNowBtn.textContent = '\u26A0 ' + e.message;
    }finally{
      setTimeout(()=>{ wtNowBtn.disabled = false; wtNowBtn.textContent = asl; }, 8000);
    }
  });
}

document.getElementById('wtBulkDelBtn').addEventListener('click', async ()=>{
  const ids = Array.from(wtSelected);
  if(ids.length === 0) return;
  if(!confirm(`${ids.length} ta kuzatuvni butunlay o'chirasizmi?`)) return;
  const btn = document.getElementById('wtBulkDelBtn');
  btn.disabled = true;
  try{
    await wtCall('deleteMany', { ids });
    wtSelected.clear();
    loadWatchList();
  }catch(err){ alert('Xato: ' + err.message); }
  finally{ btn.disabled = false; }
});

/* ==================================================================
   UZEX AUKSION — faqat shu panelda. Saytga CHIQARILMAYDI.

   UZEX birjasida (mobilraqam.uzex.uz) hozir savdoda turgan raqamlarni
   mask bo'yicha qidiradi. So'rov SERVER orqali ketadi
   (netlify/functions/admin-uzex-search.js) — chunki UZEX API'si
   brauzerdan CORS bilan bloklanadi va "user-agent" sarlavhasini talab
   qiladi (brauzer uni o'zgartirishga ruxsat bermaydi).
   ================================================================== */

const uzxBoxes = Array.from(document.querySelectorAll('#uzxMask .uzx-box'));

// Katakchalar orasida avtomatik o'tish (raqam kiritilsa keyingisiga).
uzxBoxes.forEach((box, idx) => {
  box.addEventListener('input', () => {
    box.value = box.value.replace(/\D/g, '').slice(0, 1);
    box.classList.toggle('filled', box.value !== '');
    if (box.value && idx < uzxBoxes.length - 1) uzxBoxes[idx + 1].focus();
  });
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !box.value && idx > 0) uzxBoxes[idx - 1].focus();
    if (e.key === 'ArrowLeft' && idx > 0) uzxBoxes[idx - 1].focus();
    if (e.key === 'ArrowRight' && idx < uzxBoxes.length - 1) uzxBoxes[idx + 1].focus();
    if (e.key === 'Enter') document.getElementById('uzxSearchBtn').click();
  });
  box.addEventListener('focus', () => box.select());
});

// Katakchalardan 9 belgilik mask yasaydi: bo'sh katak = "x" (istalgan raqam).
function uzxBuildMask(){
  return uzxBoxes.map(b => (b.value || 'x')).join('');
}

// "2026-09-17T16:59:36" -> "17.09.2026, 16:59" (Toshkent vaqti).
// UZEX sanani vaqt mintaqasisiz beradi — u allaqachon mahalliy vaqt,
// shuning uchun qo'shimcha siljitish QILINMAYDI.
function uzxFmtDate(iso){
  if(!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if(!m) return '—';
  return `${m[3]}.${m[2]}.${m[1]}, <b>${m[4]}:${m[5]}</b>`;
}

// "2026-09-17T16:59:36" -> shu lahzadan tugashigacha qolgan millisekund.
// UZEX sanani vaqt mintaqasisiz beradi — u allaqachon mahalliy vaqt.
function uzxParseEndMs(endIso){
  if(!endIso) return null;
  const m = String(endIso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):?(\d{2})?/);
  if(!m) return null;
  return new Date(+m[1], +m[2]-1, +m[3], +m[4], +m[5], +(m[6]||0)).getTime();
}
// Mijoz: "qachon tugashigacha JONLI soat qo'yamiz" — bu funksiya HAR
// safar (soniyasiga bir marta) chaqirilib, "01 kun 04:22:07 qoldi" kabi
// tik-tak yuruvchi matn qaytaradi (qarang: uzxTickTimers()).
function uzxLeftLive(endMs){
  if(endMs == null) return { text: '—', cls: '' };
  const diff = endMs - Date.now();
  if(diff <= 0) return { text: 'Tugadi', cls: 'ended' };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const mi = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n)=> String(n).padStart(2, '0');
  const soon = diff < 3 * 3600000; // 3 soatdan kam qoldi — qizil rang bilan ogohlantiriladi
  const text = d > 0
    ? `${d} kun ${pad(h)}:${pad(mi)}:${pad(s)}`
    : `${pad(h)}:${pad(mi)}:${pad(s)}`;
  return { text, cls: soon ? 'soon' : '' };
}
let __uzxTimerInterval = null;
// Mijoz: "jonli soat qo'yamiz" — barcha ochiq kartochkalardagi
// hisoblagichlarni har soniyada yangilaydi. Faqat UZEX bo'limi ochiq
// va natija bor paytda ishlaydi (qarang: uzxStartTimer()/uzxStopTimer()).
function uzxTickTimers(){
  const els = document.querySelectorAll('.uzx-card-timer[data-end]');
  if(!els.length){ uzxStopTimer(); return; }
  els.forEach(el=>{
    const endMs = Number(el.dataset.end);
    const { text, cls } = uzxLeftLive(endMs);
    const textEl = el.querySelector('.uzx-timer-text');
    if(textEl) textEl.textContent = text;
    el.classList.remove('soon', 'ended');
    if(cls) el.classList.add(cls);
  });
}
function uzxStartTimer(){
  uzxStopTimer();
  uzxTickTimers();
  __uzxTimerInterval = setInterval(uzxTickTimers, 1000);
}
function uzxStopTimer(){
  if(__uzxTimerInterval){ clearInterval(__uzxTimerInterval); __uzxTimerInterval = null; }
}

// Raqamni chiroyli ko'rinishga keltirish: +998901234567 -> +998 90 123 45 67
function uzxFmtNumber(n){
  const d = String(n || '').replace(/\D/g, '');
  if(d.length !== 12) return String(n || '');
  return '+' + d.slice(0,3) + ' ' + d.slice(3,5) + ' ' + d.slice(5,8)
    + ' ' + d.slice(8,10) + ' ' + d.slice(10,12);
}

function uzxSetStatus(text, kind){
  const el = document.getElementById('uzxStatus');
  el.textContent = text || '';
  el.className = 'uzx-status' + (kind ? ' ' + kind : '');
}

async function uzxSearch(){
  const btn = document.getElementById('uzxSearchBtn');
  const box = document.getElementById('uzxResult');
  const mask = uzxBuildMask();
  // Mijoz: "narx bo'yicha qidirish ham qo'y" — ixtiyoriy, bo'sh qoldirilsa
  // cheklov qo'yilmaydi (backend standart 1 / 300 000 000 qabul qiladi).
  const priceMinRaw = document.getElementById('uzxPriceMin').value;
  const priceMaxRaw = document.getElementById('uzxPriceMax').value;
  const startPrice = priceMinRaw ? Number(priceMinRaw) : undefined;
  const endPrice = priceMaxRaw ? Number(priceMaxRaw) : undefined;
  // Mijoz: "kompaniya bo'yicha ham, vaqt bo'yicha ham qidirish mumkin
  // bo'lsin" — ixtiyoriy qo'shimcha filtrlar.
  const seller = document.getElementById('uzxSeller').value.trim() || undefined;
  const dateFrom = document.getElementById('uzxDateFrom').value || undefined;
  const dateTo = document.getElementById('uzxDateTo').value || undefined;

  uzxStopTimer();
  btn.disabled = true;
  uzxSetStatus('Qidirilmoqda...');
  box.innerHTML = '<div class="wt-empty">Qidirilmoqda...</div>';

  // Mijoz: "UZEX ishlamayabdi" — UZEX'ning o'zi ba'zan bir zumlik
  // ishlamay qolishi (yoki tarmoq xatosi) mumkin, shu sabab endi bitta
  // muvaffaqiyatsiz urinishdan keyin (1 soniya kutib) yana bir marta
  // avtomatik qayta uriniladi, darhol xato ko'rsatish o'rniga.
  async function attemptFetch(){
    const idToken = await firebase.auth().currentUser.getIdToken();
    const res = await fetch('/.netlify/functions/admin-uzex-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
      body: JSON.stringify({ mask, startPrice, endPrice, seller, dateFrom, dateTo })
    });
    const data = await res.json().catch(()=> ({}));
    if(!res.ok || !data.ok) throw new Error(data.error || ('Server ' + res.status));
    return data;
  }

  try{
    let data;
    try{
      data = await attemptFetch();
    }catch(firstErr){
      uzxSetStatus('Qayta urinilmoqda...');
      await new Promise(r=> setTimeout(r, 1000));
      data = await attemptFetch();
    }

    const items = data.items || [];
    if(!items.length){
      uzxSetStatus('Topilmadi', 'err');
      // Mijoz: "haqiqatdan API'dan raqam kelyabdimi ko'r" — agar UZEX'dan
      // xom ma'lumot kelgan-u, lekin bizning tozalashimizdan keyin 0 ta
      // chiqqan bo'lsa (masalan UZEX maydon nomlarini o'zgartirgan
      // bo'lsa), server buni `data.debug` orqali ko'rsatadi — shu holatda
      // sababni JIM yashirmasdan, aniq ko'rsatamiz.
      if(data.debug){
        box.innerHTML = `<div class="wt-empty">
          UZEX'dan ${escapeHtml(String(data.debug.rawSampleKeys ? 'ma\'lumot keldi, lekin kutilgan formatda emas' : 'javob keldi'))}.<br>
          <span style="font-size:11px;opacity:.8;">Kelgan maydonlar: ${escapeHtml((data.debug.rawSampleKeys||[]).join(', '))}</span><br>
          <span style="font-size:10.5px;opacity:.6;word-break:break-all;">${escapeHtml(data.debug.rawSample || '')}</span>
        </div>`;
      }else{
        box.innerHTML = '<div class="wt-empty">Bu shartlar bo\'yicha auksionda raqam yo\'q (UZEX\'dan bo\'sh natija keldi)</div>';
      }
      return;
    }

    uzxSetStatus(items.length + ' ta topildi', 'ok');

    const cards = items.map((x, idx) => {
      const endMs = uzxParseEndMs(x.endDate);
      const { text, cls } = uzxLeftLive(endMs);
      return `
      <div class="uzx-card">
        <div class="uzx-card-num">${escapeHtml(uzxFmtNumber(x.number))}</div>
        <div class="uzx-card-price">${formatPrice(x.price)}</div>
        <div class="uzx-card-timer${cls ? ' ' + cls : ''}" data-end="${endMs || ''}">
          <span class="uzx-timer-dot"></span>
          <span class="uzx-timer-text">${escapeHtml(text)}</span>
          <span style="font-weight:600;font-size:11px;color:var(--muted);margin-left:auto;">qoldi</span>
        </div>
        <div class="uzx-card-row">
          <span class="uzx-card-seller" title="${escapeHtml(x.seller || '')}">${escapeHtml(x.seller || '—')}</span>
        </div>
        <div class="uzx-card-dates">Boshlandi: <b>${uzxFmtDate(x.startDate)}</b></div>
        <button type="button" class="uzx-card-save" data-uzx-idx="${idx}">💾 Saqlash</button>
      </div>`;
    }).join('');

    const more = data.totalFound && data.totalFound > items.length
      ? ` (UZEX'da jami <b>${data.totalFound}</b> ta)` : '';

    box.innerHTML = `
      <div class="uzx-count">Topildi: <b>${items.length}</b> ta${more} — eng arzonidan boshlab</div>
      <div class="uzx-cards">${cards}</div>`;

    uzxStartTimer();

    box.querySelectorAll('.uzx-card-save').forEach(saveBtn=>{
      saveBtn.addEventListener('click', async ()=>{
        const item = items[Number(saveBtn.dataset.uzxIdx)];
        if(!item) return;
        saveBtn.disabled = true;
        try{
          const idToken = await firebase.auth().currentUser.getIdToken();
          const res = await fetch('/.netlify/functions/admin-uzex-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ action: 'save', item })
          });
          const d = await res.json().catch(()=> ({}));
          if(!res.ok || !d.ok) throw new Error(d.error || ('Server ' + res.status));
          saveBtn.textContent = '✓ Saqlandi';
          saveBtn.classList.add('saved');
          uzxLoadSaved();
        }catch(err){
          saveBtn.disabled = false;
          alert('Saqlab bo\'lmadi: ' + err.message);
        }
      });
    });
  }catch(err){
    uzxSetStatus('Xato', 'err');
    box.innerHTML = `<div class="wt-empty">Xato: ${escapeHtml(err.message)}<br><span style="font-size:11px;opacity:.75;">Agar bu birinchi marta ko'rinayotgan bo'lsa — yangi funksiya hali GitHub/Netlify'ga yuklanmagan bo'lishi mumkin.</span></div>`;
  }finally{
    btn.disabled = false;
  }
}

document.getElementById('uzxSearchBtn').addEventListener('click', uzxSearch);
document.getElementById('uzxClearBtn').addEventListener('click', () => {
  uzxBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
  document.getElementById('uzxPriceMin').value = '';
  document.getElementById('uzxPriceMax').value = '';
  document.getElementById('uzxSeller').value = '';
  document.getElementById('uzxDateFrom').value = '';
  document.getElementById('uzxDateTo').value = '';
  uzxSetStatus('');
  uzxStopTimer();
  document.getElementById('uzxResult').innerHTML =
    '<div class="wt-empty">Raqam yoki narx kiritib "Qidirish"ni bosing</div>';
  uzxBoxes[0].focus();
});

/* ---- UZEX "Saqlangan raqamlar" ro'yxati ---- */
async function uzxLoadSaved(){
  const box = document.getElementById('uzxSavedResult');
  if(!box) return;
  box.innerHTML = '<div class="wt-empty">Yuklanmoqda...</div>';
  try{
    const idToken = await firebase.auth().currentUser.getIdToken();
    const res = await fetch('/.netlify/functions/admin-uzex-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
      body: JSON.stringify({ action: 'list' })
    });
    const d = await res.json().catch(()=> ({}));
    if(!res.ok || !d.ok) throw new Error(d.error || ('Server ' + res.status));
    const items = d.items || [];
    if(!items.length){
      box.innerHTML = '<div class="wt-empty">Hali hech narsa saqlanmagan</div>';
      return;
    }
    box.innerHTML = items.map(it => `
      <div class="uzx-saved-row" data-uzx-saved-id="${escapeHtml(it.id)}">
        <div class="uzx-saved-main">
          <div class="uzx-saved-num">${escapeHtml(uzxFmtNumber(it.number))} — ${formatPrice(it.price || 0)}</div>
          <div class="uzx-saved-meta">${escapeHtml(it.seller || 'Sotuvchi ko\'rsatilmagan')}</div>
        </div>
        <button type="button" class="uzx-saved-remove" title="O'chirish">✕</button>
      </div>`).join('');
    box.querySelectorAll('.uzx-saved-remove').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const row = btn.closest('[data-uzx-saved-id]');
        const id = row && row.dataset.uzxSavedId;
        if(!id) return;
        btn.disabled = true;
        try{
          const idToken2 = await firebase.auth().currentUser.getIdToken();
          await fetch('/.netlify/functions/admin-uzex-save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken2 },
            body: JSON.stringify({ action: 'unsave', id })
          });
          row.remove();
        }catch(err){ btn.disabled = false; alert('O\'chirib bo\'lmadi: ' + err.message); }
      });
    });
  }catch(err){
    box.innerHTML = `<div class="wt-empty">Xato: ${escapeHtml(err.message)}</div>`;
  }
}
document.getElementById('uzxSavedRefreshBtn').addEventListener('click', uzxLoadSaved);

/* ---- UZEX bo'limiga o'rnatilgan mini AI chat — bosh sahifadagi
   "AI Yordamchi" (admin-ai-assistant.js) bilan AYNAN BIR XIL serverga
   ulanadi, faqat qulaylik uchun UZEX bo'limining o'ziga qo'yilgan
   (mijoz: "chekasiga chat ai ni qo'sh"). Umumiy AI konteynerdan MUSTAQIL
   o'z suhbat tarixiga ega. ---- */
async function loadWatchList(){
  const list = document.getElementById('wtList');
  list.innerHTML = '<div class="wt-empty">Yuklanmoqda...</div>';
  try{
    const data = await wtCall('list');
    const watches = data.watches || [];
    wtWatchesCache = watches;
    const validIds = new Set(watches.map(w => w.id));
    Array.from(wtSelected).forEach(id => { if(!validIds.has(id)) wtSelected.delete(id); });
    wtRenderStats(watches);
    wtRenderSoglik(data.soglik || []);
    wtRenderGroups(watches);
    wtUpdateBulkBar();
  }catch(err){
    list.innerHTML = '<div class="wt-empty">Xato: ' + escapeHtml(err.message) + '</div>';
  }
}

/* ---- "Baza raqam" — qo'shimcha Telegram bildirishnoma ID'lari (Sozlamalar) ---- */
async function loadWatchNotifyIds(){
  const list = document.getElementById('watchNotifyIdList');
  if(!list) return;
  list.innerHTML = 'Yuklanmoqda...';
  try{
    const data = await wtCall('listNotifyIds');
    const recipients = data.recipients || [];
    if(recipients.length === 0){ list.innerHTML = '<div style="color:var(--muted);font-size:12px;">Hali qo\'shimcha ID qo\'shilmagan.</div>'; return; }
    list.innerHTML = recipients.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:8px 12px;">
        <div style="font-size:12.5px;"><b>${escapeHtml(r.chatId)}</b>${r.label ? ' — ' + escapeHtml(r.label) : ''}</div>
        <button class="watch-notify-delete" data-id="${r.id}" style="background:none;border:none;color:var(--red);font-size:12px;cursor:pointer;">O'chirish</button>
      </div>`).join('');
    list.querySelectorAll('.watch-notify-delete').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(!confirm("Bu Telegram ID'ni o'chirasizmi? Endi bu odamga bildirishnoma kelmaydi.")) return;
        try{
          await wtCall('deleteNotifyId', { id: btn.dataset.id });
          loadWatchNotifyIds();
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });
  }catch(err){ list.innerHTML = 'Xato: ' + escapeHtml(err.message); }
}
if(document.getElementById('watchNotifyIdList')) loadWatchNotifyIds();

const addWatchNotifyIdBtn = document.getElementById('addWatchNotifyIdBtn');
if(addWatchNotifyIdBtn){
  addWatchNotifyIdBtn.addEventListener('click', async ()=>{
    const idInput = document.getElementById('newWatchNotifyId');
    const labelInput = document.getElementById('newWatchNotifyLabel');
    const msg = document.getElementById('watchNotifyIdMsg');
    const chatId = idInput.value.trim();
    const label = labelInput.value.trim();
    if(!/^-?\d{5,15}$/.test(chatId)){
      msg.textContent = "Telegram ID noto'g'ri — faqat raqamlardan iborat bo'lishi kerak";
      msg.className = 'settings-msg bad';
      return;
    }
    try{
      await wtCall('addNotifyId', { chatId, label });
      idInput.value = ''; labelInput.value = '';
      msg.textContent = '✓ ID qo\'shildi';
      msg.className = 'settings-msg ok';
      vibrate(80);
      loadWatchNotifyIds();
    }catch(err){
      msg.textContent = 'Xato: ' + err.message;
      msg.className = 'settings-msg bad';
    }
  });
}

/* ---- "Boshqaruv" — adminlarni qo'shish/boshqarish (faqat bosh admin) ---- */
const MGMT_FEATURE_LABELS = {
  numbers:'📱 Raqamlar', aksiya:'🔥 Aksiya', orders:'🛒 Buyurtmalar', zakaz:'📥 Zakaz', credit:'💳 Kredit', personalbase:'🗄️ Shaxsiy baza',
  vazifalar:'⏰ Vazifalar', bazaraqam:'🗄️ Baza raqam',
  watch:'🎯 Kuzatuv', operators:'🔌 Operatorlar', ai:'🤖 AI Yordamchi',
  instagram:'📸 Instagram AI', telegramai:'💬 Telegram AI', videos:'🎥 Video sharhlar',
  stories:'▣ Stories',
  styles:'🎨 Uslublar', sessions:'📊 Seanslar', settings:'⚙️ Sozlamalar',
  finance:'💰 Kirim-Chiqim', vakansiya:'💼 Vakansiya', xabarlar:'🔔 Saytga xabar', tolov:'📲 Raqam to\'lovi'
};
const MGMT_FEATURE_ORDER = Object.keys(MGMT_FEATURE_LABELS);

async function mgmtCall(action, extra){
  const idToken = await firebase.auth().currentUser.getIdToken();
  const res = await fetch('/.netlify/functions/admin-manage-admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
    body: JSON.stringify(Object.assign({ action }, extra || {}))
  });
  const data = await res.json();
  if(!res.ok || !data.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function mgmtPermsGridHtml(idPrefix, checkedKeys){
  const checked = new Set(checkedKeys || []);
  return MGMT_FEATURE_ORDER.map(key => `
    <label class="mgmt-perm-item ${checked.has(key) ? 'checked' : ''}" data-key="${key}">
      <input type="checkbox" data-perm="${key}" id="${idPrefix}-${key}" ${checked.has(key) ? 'checked' : ''}>
      ${MGMT_FEATURE_LABELS[key]}
    </label>
  `).join('');
}
function mgmtWirePermsGrid(container){
  container.querySelectorAll('.mgmt-perm-item').forEach(label => {
    const chk = label.querySelector('input');
    chk.addEventListener('change', () => label.classList.toggle('checked', chk.checked));
  });
}
function mgmtReadPermsGrid(container){
  const out = {};
  container.querySelectorAll('input[data-perm]').forEach(chk => { if(chk.checked) out[chk.dataset.perm] = true; });
  return out;
}

// Yaratish formasidagi ruxsatlar to'ri — bir marta chiziladi
const mgmtPermsGridEl = document.getElementById('mgmtPermsGrid');
if(mgmtPermsGridEl){
  mgmtPermsGridEl.innerHTML = mgmtPermsGridHtml('mgmtperm', []);
  mgmtWirePermsGrid(mgmtPermsGridEl);
}

document.getElementById('mgmtAddToggleBtn').addEventListener('click', (e)=>{
  const form = document.getElementById('mgmtAddForm');
  const isOpening = (form.style.display === 'none' || !form.style.display);
  form.style.display = isOpening ? 'block' : 'none';
  e.currentTarget.classList.toggle('open', isOpening);
  if(isOpening) form.scrollIntoView({ behavior:'smooth', block:'nearest' });
});

document.getElementById('mgmtCreateBtn').addEventListener('click', async ()=>{
  const msg = document.getElementById('mgmtCreateMsg');
  const resultBox = document.getElementById('mgmtResultBox');
  resultBox.style.display = 'none';
  const name = document.getElementById('mgmtName').value.trim();
  const password = document.getElementById('mgmtPassword').value;
  const permissions = mgmtReadPermsGrid(mgmtPermsGridEl);
  if(!name){ msg.textContent = 'Ism kiriting'; msg.style.color = '#e74c3c'; return; }
  if(!password || password.length < 8){ msg.textContent = "Parol kamida 8 belgi bo'lishi kerak"; msg.style.color = '#e74c3c'; return; }

  const btn = document.getElementById('mgmtCreateBtn');
  btn.disabled = true;
  msg.textContent = 'Yaratilmoqda...'; msg.style.color = '';
  try{
    const data = await mgmtCall('create', { name, password, permissions });
    msg.textContent = '✅ Admin yaratildi';
    msg.style.color = '#33E28C';
    resultBox.style.display = 'block';
    resultBox.innerHTML = `Login: <b>${escapeHtml(data.loginHandle)}</b><br>
      Parol: <b>${escapeHtml(password)}</b><br>
      <span style="color:var(--muted);">Shu ikkalasini yangi adminga bering — u tizimga aynan shu login va parol bilan kiradi.
      Bu parolni biz hech qayerda saqlamaymiz, shuning uchun hozir nusxa oling.</span>`;
    document.getElementById('mgmtName').value = '';
    document.getElementById('mgmtPassword').value = '';
    mgmtPermsGridEl.querySelectorAll('input[data-perm]').forEach(chk => { chk.checked = false; chk.closest('.mgmt-perm-item').classList.remove('checked'); });
    loadAdminsList();
  }catch(err){
    msg.textContent = 'Xato: ' + err.message;
    msg.style.color = '#e74c3c';
  }finally{
    btn.disabled = false;
  }
});

function mgmtFormatTime(ms){
  if(!ms) return '—';
  const d = new Date(ms);
  const pad = n => String(n).padStart(2,'0');
  return pad(d.getDate()) + '.' + pad(d.getMonth()+1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

async function loadAdminsList(){
  const list = document.getElementById('mgmtAdminsList');
  list.innerHTML = '<div class="wt-empty">Yuklanmoqda...</div>';
  try{
    const data = await mgmtCall('list');
    const admins = data.admins || [];
    if(admins.length === 0){
      list.innerHTML = '<div class="wt-empty">Hali qo\'shimcha admin yo\'q. Yuqoridan birinchisini qo\'shing.</div>';
      const statsElEmpty = document.getElementById('mgmtStatsRow');
      if(statsElEmpty) statsElEmpty.innerHTML = '';
      const listLabelEmpty = document.getElementById('mgmtListLabel');
      if(listLabelEmpty) listLabelEmpty.style.display = 'none';
      return;
    }
    // Yangi statistik qator — jami, faol, to'xtatilgan adminlar soni.
    const statsEl = document.getElementById('mgmtStatsRow');
    if(statsEl){
      const activeCount = admins.filter(a => a.active).length;
      const pausedCount = admins.length - activeCount;
      statsEl.innerHTML = `
        <div class="dash-stat-card dsc-blue">
          <div class="dash-stat-top"><span class="dash-stat-label">Jami adminlar</span><div class="dash-stat-ico">${ICONS.database}</div></div>
          <div class="dash-stat-num">${admins.length}</div>
          <div class="dash-stat-sub">bosh admindan tashqari</div>
        </div>
        <div class="dash-stat-card dsc-green">
          <div class="dash-stat-top"><span class="dash-stat-label">Faol adminlar</span><div class="dash-stat-ico">${ICONS.check}</div></div>
          <div class="dash-stat-num">${activeCount}</div>
          <div class="dash-stat-sub">tizimga kira oladi</div>
        </div>
        <div class="dash-stat-card dsc-red">
          <div class="dash-stat-top"><span class="dash-stat-label">To'xtatilgan</span><div class="dash-stat-ico">${ICONS.xCircle}</div></div>
          <div class="dash-stat-num">${pausedCount}</div>
          <div class="dash-stat-sub">${pausedCount ? 'kirish bloklangan' : 'hammasi faol'}</div>
        </div>
      `;
    }
    const listLabel = document.getElementById('mgmtListLabel');
    if(listLabel) listLabel.style.display = '';

    list.innerHTML = admins.map(a => {
      const chips = MGMT_FEATURE_ORDER.filter(k => a.permissions[k]).map(k => `<span class="mgmt-chip">${MGMT_FEATURE_LABELS[k]}</span>`).join('');
      const initial = (a.name || '?').trim().charAt(0).toUpperCase();
      return `
      <div class="mgmt-admin-card ${a.active ? '' : 'paused'}" data-uid="${escapeHtml(a.uid)}">
        <button type="button" class="mgmt-del-btn mgmt-danger" title="O'chirish" aria-label="O'chirish">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
        <div class="mgmt-admin-top">
          <div class="mgmt-avatar">${escapeHtml(initial)}</div>
          <div class="mgmt-admin-id">
            <div class="mgmt-admin-name">${escapeHtml(a.name)}</div>
            <div class="mgmt-admin-handle">login: ${escapeHtml(a.loginHandle)} · qo'shilgan: ${mgmtFormatTime(a.createdAt)}</div>
          </div>
          <span class="mgmt-badge ${a.active ? 'on' : 'off'}">${a.active ? 'Faol' : "To'xtatilgan"}</span>
        </div>
        <div class="mgmt-chips">${chips || '<span class="mgmt-chip mgmt-chip-empty">Hech qanday bo\'limga ruxsat yo\'q</span>'}</div>
        <div class="mgmt-admin-actions mgmt-actions-primary">
          <button type="button" class="mgmt-perms-btn">🔧 Ruxsatlar</button>
          <button type="button" class="mgmt-pass-btn">🔑 Parolni yangilash</button>
          <button type="button" class="mgmt-toggle-btn ${a.active ? '' : 'mgmt-toggle-off'}">${a.active ? "⏸ To'xtatish" : '▶ Faollashtirish'}</button>
        </div>
        <div class="mgmt-admin-actions mgmt-actions-secondary">
          <button type="button" class="mgmt-sessions-btn mgmt-primary">📊 Seanslari</button>
          <button type="button" class="mgmt-finance-btn mgmt-primary">💰 Kirim-Chiqimi</button>
          <button type="button" class="mgmt-credit-btn mgmt-primary">💳 Kredit shartnomalari</button>
        </div>
        <div class="mgmt-form mgmt-edit-perms" style="display:none;">
          <div class="mgmt-perms-grid mgmt-edit-perms-grid"></div>
          <button type="button" class="wt-confirm mgmt-save-perms-btn" style="margin-top:10px;">Saqlash</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.mgmt-admin-card').forEach(card => {
      const uid = card.dataset.uid;
      const adminData = admins.find(a => a.uid === uid);

      card.querySelector('.mgmt-perms-btn').addEventListener('click', () => {
        const box = card.querySelector('.mgmt-edit-perms');
        const grid = card.querySelector('.mgmt-edit-perms-grid');
        if(box.style.display === 'none'){
          grid.innerHTML = mgmtPermsGridHtml('mgmtedit-' + uid, Object.keys(adminData.permissions || {}));
          mgmtWirePermsGrid(grid);
          box.style.display = 'block';
        } else {
          box.style.display = 'none';
        }
      });

      card.querySelector('.mgmt-save-perms-btn').addEventListener('click', async (e)=>{
        const grid = card.querySelector('.mgmt-edit-perms-grid');
        const permissions = mgmtReadPermsGrid(grid);
        e.target.disabled = true;
        try{
          await mgmtCall('updatePermissions', { uid, permissions });
          loadAdminsList();
        }catch(err){ alert('Xato: ' + err.message); e.target.disabled = false; }
      });

      card.querySelector('.mgmt-pass-btn').addEventListener('click', async ()=>{
        const newPassword = prompt("Yangi parol kiriting (kamida 8 belgi, harf + raqam):");
        if(!newPassword) return;
        try{
          await mgmtCall('resetPassword', { uid, newPassword });
          alert(`Yangi parol o'rnatildi: ${newPassword}\n\nBuni adminga bering — bu parolni biz saqlamaymiz.`);
        }catch(err){ alert('Xato: ' + err.message); }
      });

      card.querySelector('.mgmt-toggle-btn').addEventListener('click', async (e)=>{
        e.target.disabled = true;
        try{
          await mgmtCall('toggleActive', { uid, active: !adminData.active });
          loadAdminsList();
        }catch(err){ alert('Xato: ' + err.message); e.target.disabled = false; }
      });

      card.querySelector('.mgmt-sessions-btn').addEventListener('click', ()=>{
        sessionsFilterUid = uid;
        sessionsFilterName = adminData.name;
        document.querySelector('.tab[data-tab="sessions"]').click();
      });

      card.querySelector('.mgmt-finance-btn').addEventListener('click', ()=>{
        financeFilterUid = uid;
        financeFilterName = adminData.name;
        document.querySelector('.tab[data-tab="finance"]').click();
      });

      card.querySelector('.mgmt-credit-btn').addEventListener('click', ()=>{
        creditFilterUid = uid;
        creditFilterName = adminData.name;
        document.querySelector('.tab[data-tab="credit"]').click();
      });

      card.querySelector('.mgmt-del-btn').addEventListener('click', async (e)=>{
        if(!confirm(`"${adminData.name}" adminini butunlay o'chirasizmi? Bu amalni ortga qaytarib bo'lmaydi.`)) return;
        e.target.disabled = true;
        try{
          await mgmtCall('delete', { uid });
          loadAdminsList();
        }catch(err){ alert('Xato: ' + err.message); e.target.disabled = false; }
      });
    });
  }catch(err){
    list.innerHTML = '<div class="wt-empty">Xato: ' + escapeHtml(err.message) + '</div>';
  }
}

document.querySelectorAll('.op-add[data-add]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const name = btn.dataset.add;
    if(name === 'Beeline') opData.Beeline.warehouses.push({ id:'', name:'', operatorPrice:0, salePrice:0 });
    else opData[name].prices.push({ operatorPrice:0, salePrice:0 });
    opRenderRows(name);
  });
});

async function opSave(){
  // "Missing or insufficient permissions" xatosining eng ko'p uchraydigan
  // sababi — brauzerda hali ESKI (admin huquqi qo'shilishidan OLDINGI)
  // token keshda turgani (Firebase uni odatda ~1 soatgacha o'zi
  // yangilamaydi). Shu sabab yozishdan OLDIN har doim tokenni MAJBURIY
  // yangilaymiz — agar hisobda haqiqatan ADMIN huquqi bo'lsa, shu bilan
  // xato yo'qoladi.
  try{ await firebase.auth().currentUser.getIdToken(true); }catch(e){}

  ['Beeline','Ucell','Humans','Mobiuz','Perfektum'].forEach(n=>{
    opData[n].enabled = document.getElementById('op' + n + 'Enabled').checked;
    if(n === 'Beeline') opData.Beeline.warehouses = opCollect('Beeline');
    else opData[n].prices = opCollect(n);
  });
  /* V120: Ucell API manzillari. Bo'sh bo'lsa maydon umuman yozilmaydi —
     server o'z standart manzilini ishlatadi. */
  const uLog = (document.getElementById('opUcellLoginUrl') || {}).value;
  const uSrc = (document.getElementById('opUcellSearchUrl') || {}).value;
  opData.Ucell.loginUrl = String(uLog || '').trim().slice(0, 300);
  opData.Ucell.searchUrl = String(uSrc || '').trim().slice(0, 300);

  opData.Beeline.username = document.getElementById('opBeelineUser').value.trim();
  opData.Beeline.password = document.getElementById('opBeelinePass').value;

  await db.collection('operator_config').doc('main').set({
    Beeline: opData.Beeline, Ucell: opData.Ucell,
    Humans: opData.Humans, Mobiuz: opData.Mobiuz,
    Perfektum: opData.Perfektum,
    updatedAt: Date.now()
  }, { merge: true });

  // "Bo'lib to'lash" (rasrochka) — har bir narx qatoriga bog'langan bosh
  // to'lov/oylik to'lovlar + umumiy tarif ro'yxati. Alohida hujjatga
  // (site_settings/operator_financing) yoziladi — site_settings/{doc}
  // qoidasi bo'yicha O'QISH hammaga ochiq (mijoz sayti shu yerdan o'qiydi).
  const toArray = (obj)=> Object.keys(obj).map(price=> Object.assign({ operatorPrice: Number(price) }, obj[price]));
  finData.byOperator = {
    Humans: opCollectFinancing('Humans'),
    Ucell: opCollectFinancing('Ucell'),
    Beeline: opCollectFinancing('Beeline')
  };
  // Mijoz so'roviga ko'ra: endi BARCHA 6 operator uchun tarif ro'yxati
  // yig'iladi (avval faqat 3 tasi). MUHIM — pastdagi .set() { merge:false }
  // bilan yozilgani uchun, agar biror operator shu yerda unutilib qolsa,
  // uning saqlangan tariflari BUTUNLAY o'chib ketardi; shu sabab
  // TARIFF_OPERATORS ro'yxatining O'ZIDAN foydalanamiz (qo'lda yozib
  // adashmaslik uchun).
  finData.tariffsByOperator = TARIFF_OPERATORS.reduce((acc, op)=>{
    acc[op] = finCollectTariffs(op);
    return acc;
  }, {});
  await db.collection('site_settings').doc('operator_financing').set({
    byOperator: {
      Humans: toArray(finData.byOperator.Humans),
      Ucell: toArray(finData.byOperator.Ucell),
      Beeline: toArray(finData.byOperator.Beeline)
    },
    tariffsByOperator: finData.tariffsByOperator,
    updatedAt: Date.now()
  }, { merge: false });
}

document.getElementById('opSaveBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('opSaveBtn');
  const msg = document.getElementById('opSaveMsg');
  btn.disabled = true;
  msg.style.color = '';
  try{
    await opSave();
    msg.textContent = "✓ Saqlandi. Yangi sozlama 1 daqiqagacha ichida kuchga kiradi (funksiya keshi).";
    vibrate(80);
    setTimeout(()=>{ msg.textContent = ''; }, 4000);
  }catch(err){
    msg.style.color = 'var(--red)';
    if(err.code === 'permission-denied' || /insufficient permissions/i.test(err.message || '')){
      msg.textContent = "Xato: Bu hisobda ADMIN huquqi (custom claim) yo'q yoki hali kuchga kirmagan. Tizimdan CHIQIB, qayta KIRING (shunda yangi huquq bilan yangi token olinadi). Agar shunda ham shu xato chiqsa — admin-grant-role.js orqali aynan shu hisob (email)ga admin huquqi berilganini tekshiring.";
    }else{
      msg.textContent = 'Xato: ' + err.message;
    }
  }
  btn.disabled = false;
});

// Login/parolni tekshirish: avval saqlaydi, keyin funksiyani chaqiradi.
// Saqlamasdan tekshirib bo'lmaydi — funksiya kalitni Firestore'dan oladi.
document.getElementById('opBeelineTest').addEventListener('click', async ()=>{
  const btn = document.getElementById('opBeelineTest');
  const out = document.getElementById('opBeelineTestOut');
  btn.disabled = true;
  out.style.color = '';
  out.textContent = 'Saqlanmoqda va tekshirilmoqda...';
  try{
    await opSave();
    // Kesh eskirishi uchun biroz kutamiz (funksiyada sozlama keshi 60 soniya),
    // shu sabab tasodifiy mask bilan chaqiramiz — kesh unga tegmaydi.
    const idToken = await firebase.auth().currentUser.getIdToken();
    const res = await fetch('/.netlify/functions/api-live-search?action=test-beeline', {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    const data = await res.json();

    /* V81: tugma ikki ulanishni alohida ko'rsatadi.
       MUHIM (mijoz so'rovi): ekranda TEXNIK so'z bo'lmasin — "API",
       "RMS", "HTTP 500" kabilar faqat brauzer konsoliga yoziladi,
       ekranda esa oddiy, tushunarli gap turadi. */
    const satrlar = [];
    const o = data.ochiq || {};
    if(o.ok){
      satrlar.push('<div style="color:var(--green);">✓ <b>Beeline ulanishi ishlayapti</b> — '
        + (o.toifalar || 0) + ' toifa'
        + (o.toifaNomlari && o.toifaNomlari.length ? ' (' + o.toifaNomlari.map(escapeHtml).join(', ') + ')' : '')
        + ', sinovda ' + (o.topildi || 0) + ' ta bo\'sh raqam topildi.</div>');
    }else{
      satrlar.push('<div style="color:var(--red);">✗ <b>Beeline hozir javob bermayapti</b> — '
        + 'bu Beeline tomonidagi vaqtinchalik xato. Raqamlar saytda saqlangan '
        + 'oxirgi ro\'yxatdan ko\'rsatilmoqda.</div>');
    }

    const d = data.diler || {};
    if(d.bosh){
      satrlar.push('<div style="color:var(--muted);">• Zaxira ulanish (login/parol) kiritilmagan — '
        + 'bu <b>shart emas</b>, Beeline shundayam ishlaydi.</div>');
    }else if(d.ok){
      satrlar.push('<div style="color:var(--green);">✓ Zaxira ulanish (login/parol) ham ishlayapti.</div>');
    }else{
      satrlar.push('<div style="color:var(--muted);">• Zaxira ulanish hozir ishlamayapti (Beeline tomonida). '
        + 'Yuqoridagi asosiy ulanish ishlayotgan bo\'lsa — <b>saytga ta\'siri yo\'q</b>.</div>');
    }

    /* Texnik tafsilot — faqat konsolda (kerak bo'lsa ko'rish uchun) */
    try{ console.info('Beeline tekshiruvi:', data); }catch(e){}

    out.style.color = '';
    out.innerHTML = satrlar.join('');
  }catch(err){
    out.style.color = 'var(--red)';
    out.textContent = '✗ ' + err.message;
  }
  btn.disabled = false;
});

/* ---- Telegram AI sozlamalari (mijoz boti uchun) ---- */
const tgRulesList = document.getElementById('tgRulesList');
let tgRulesData = [];

function tgRenderRules(){
  tgRulesList.innerHTML = '';
  if(tgRulesData.length === 0){
    tgRulesList.innerHTML = `<div class="empty-admin" style="padding:16px;">Hali qoida qo'shilmagan.</div>`;
    return;
  }
  tgRulesData.forEach((rule, idx)=>{
    const row = document.createElement('div');
    row.className = 'ig-rule-row';
    row.innerHTML = `
      <div>
        <div class="ig-rule-label">Mijoz shunga o'xshash yozsa:</div>
        <input type="text" class="tg-rule-trigger" placeholder="masalan: dostavka qancha turadi" value="${escapeHtml(rule.trigger||'')}">
      </div>
      <div>
        <div class="ig-rule-label">Bot shunday javob beradi:</div>
        <textarea class="tg-rule-response" rows="2" placeholder="masalan: Yetkazib berish bepul, 1-2 kun ichida yetkazamiz 🚗">${escapeHtml(rule.response||'')}</textarea>
      </div>
      <button type="button" class="ig-rule-remove">O'chirish</button>
    `;
    row.querySelector('.tg-rule-trigger').addEventListener('input', e=>{ tgRulesData[idx].trigger = e.target.value; });
    row.querySelector('.tg-rule-response').addEventListener('input', e=>{ tgRulesData[idx].response = e.target.value; });
    row.querySelector('.ig-rule-remove').addEventListener('click', ()=>{
      tgRulesData.splice(idx, 1);
      tgRenderRules();
    });
    tgRulesList.appendChild(row);
  });
}

document.getElementById('tgAddRuleBtn').addEventListener('click', ()=>{
  tgRulesData.push({ trigger: '', response: '' });
  tgRenderRules();
});

async function loadTelegramAiSettings(){
  try{
    const doc = await db.collection('site_settings').doc('telegram_bot').get();
    const data = doc.exists ? doc.data() : {};
    document.getElementById('tgTelegramLink').value = data.telegramChannelLink || '';
    document.getElementById('tgDeliveryInfo').value = data.deliveryInfo || '';
    document.getElementById('tgGeneralInstructions').value = data.generalInstructions || '';
    tgRulesData = Array.isArray(data.faqRules) ? data.faqRules : [];
    tgRenderRules();
  }catch(err){
    console.error('Telegram AI sozlamalarini yuklashda xato:', err);
  }
}

document.getElementById('tgSaveBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('tgSaveBtn');
  const msg = document.getElementById('tgSaveMsg');
  btn.disabled = true;
  try{
    const cleanRules = tgRulesData
      .map(r => ({ trigger: (r.trigger||'').trim(), response: (r.response||'').trim() }))
      .filter(r => r.trigger && r.response);

    await db.collection('site_settings').doc('telegram_bot').set({
      telegramChannelLink: document.getElementById('tgTelegramLink').value.trim(),
      deliveryInfo: document.getElementById('tgDeliveryInfo').value.trim(),
      generalInstructions: document.getElementById('tgGeneralInstructions').value.trim(),
      faqRules: cleanRules,
      updatedAt: Date.now()
    }, { merge: true });

    msg.textContent = '✓ Saqlandi — bot yangi qoidalar bilan ishlaydi';
    vibrate(80);
    setTimeout(()=>{ msg.textContent = ''; }, 3000);
  }catch(err){
    msg.style.color = 'var(--red)';
    msg.textContent = 'Xato: ' + err.message;
  }
  btn.disabled = false;
});

/* ---- Video sharhlar (mijoz fikri, saytda Reels uslubida ko'rsatiladi) ---- */
// Brauzerlar (ayniqsa Chrome/Android va Windows kompyuter) <video> tegi
// orqali FAQAT MP4 (H.264/AAC) va WEBM formatlarini ishonchli o'ynatadi.
// .mov (ba'zan Safari'da ishlaydi, boshqa hech qayerda), .avi, .mkv,
// .3gp esa saytga yuklansa ham ko'pchilik mijozning telefoni/kompyuterida
// UMUMAN OCHILMAYDI (sahifa "ishlamayapti" bo'lib chiqadi) — shu sabab
// bu formatlar tanlansa, yuklashdan oldin admin'ga ogohlantirish
// ko'rsatamiz (butunlay taqiqlamaymiz, chunki fayl kengaytmasi ba'zan
// noto'g'ri bo'lishi ham mumkin, lekin admin ongli tanlov qilsin).
function warnIfRiskyVideoFormat(file){
  const isWebSafe = /\.(mp4|webm|m4v)$/i.test(file.name || '') || file.type === 'video/mp4' || file.type === 'video/webm';
  if(isWebSafe) return true;
  return window.confirm(
    "DIQQAT: bu video formati (" + (file.name || file.type || "noma'lum") + ") ko'pgina telefon/kompyuterlarda (masalan Android, Windows'dagi Chrome) UMUMAN OCHILMASLIGI mumkin — faqat MP4 yoki WEBM formati barcha qurilmalarda kafolatli ishlaydi.\n\nShunga qaramay shu faylni yuklashni davom ettirasizmi?"
  );
}

window.handleVideoUpload = async function(){
  const fileInput = document.getElementById('videoFileInput');
  const numberInput = document.getElementById('videoNumberInput');
  const captionInput = document.getElementById('videoCaptionInput');
  const msg = document.getElementById('videoUploadMsg');
  const progressWrap = document.getElementById('videoProgressWrap');
  const progressBar = document.getElementById('videoProgressBar');
  const btn = document.getElementById('videoUploadBtn');

  function showError(text){
    msg.textContent = '❌ ' + text;
    msg.style.cssText = 'color:#fff;background:var(--red);padding:10px 12px;border-radius:8px;font-weight:700;font-size:13px;text-align:center;';
    progressWrap.style.display = 'none';
    btn.disabled = false;
  }

  try{
    const file = fileInput.files[0];
    if(!file){ showError('Iltimos, video fayl tanlang.'); return; }

    // iPhone (Safari)'da ba'zan video fayl turi (MIME type) bo'sh yoki
    // noto'g'ri qaytadi — shuning uchun faqat fayl kengaytmasiga qarab ham
    // tekshiramiz, aks holda haqiqiy video fayllar noto'g'ri rad etiladi.
    const looksLikeVideo = file.type.startsWith('video/')
      || /\.(mp4|mov|m4v|avi|webm|3gp|mkv)$/i.test(file.name || '');
    if(!looksLikeVideo){ showError("Bu video fayl emas. Fayl turi: " + (file.type || "noma'lum")); return; }
    if(!warnIfRiskyVideoFormat(file)){ return; }

    if(!window.firebase || !firebase.storage){ showError("Firebase Storage SDK yuklanmadi. Internetni tekshiring va sahifani yangilang."); return; }
    if(!storage){ showError("Video xizmati (Firebase Storage) sozlanmagan. Avval Firebase konsolida Storage'ni yoqing."); return; }

    btn.disabled = true;
    msg.textContent = '';
    msg.style.cssText = '';
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';

    const path = `testimonial_videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const ref = storage.ref().child(path);
    const uploadTask = ref.put(file);

    await new Promise((resolve, reject)=>{
      uploadTask.on('state_changed',
        (snap)=>{
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          progressBar.style.width = pct + '%';
        },
        (err)=> reject(err),
        ()=> resolve()
      );
    });

    const videoUrl = await uploadTask.snapshot.ref.getDownloadURL();

    // Ro'yxat oxiriga qo'shish uchun joriy eng katta "order" qiymatini topamiz.
    // MUHIM: bu yerda ATAYLAB .orderBy('order','desc') ISHLATILMAYDI — agar
    // avvalgi hujjatlardan birortasida "order" maydoni umuman bo'lmasa
    // (masalan Firestore konsolidan qo'lda qo'shilgan bo'lsa), Firestore
    // orderBy o'sha hujjatni natijadan chiqarib tashlaydi va eng katta
    // qiymat noto'g'ri hisoblanishi mumkin — shu sabab BARCHA hujjatlar
    // olinib, eng katta "order" shu yerda (JavaScript'da) hisoblanadi.
    const allSnap = await db.collection('video_testimonials').get();
    const nextOrder = allSnap.empty
      ? 1
      : Math.max(0, ...allSnap.docs.map(d => Number(d.data().order) || 0)) + 1;

    await db.collection('video_testimonials').add({
      videoUrl,
      number: numberInput.value.trim(),
      caption: captionInput.value.trim(),
      order: nextOrder,
      likes: 500 + Math.floor(Math.random() * 500), // boshlang'ich "mashhurlik" ko'rsatkichi (500-999), haqiqiy like'lar shu ustiga qo'shiladi
      createdAt: Date.now()
    });

    msg.textContent = '✓ Video yuklandi va saytga qo\'shildi';
    msg.style.cssText = 'color:var(--green);text-align:center;font-weight:700;';
    vibrate(80);
    fileInput.value = '';
    numberInput.value = '';
    captionInput.value = '';
    progressWrap.style.display = 'none';
    if(window.loadVideoTestimonials) loadVideoTestimonials();
  }catch(err){
    showError(err && err.message ? err.message : "Noma'lum xato yuz berdi");
    return;
  }
  btn.disabled = false;
};


async function loadVideoTestimonials(){
  const list = document.getElementById('videoList');
  list.innerHTML = 'Yuklanmoqda...';
  try{
    // MUHIM: .orderBy('order','asc') o'rniga barcha hujjatlar olinib,
    // shu yerda saralanadi — aks holda "order" maydoni yo'q hujjatlar
    // (masalan eski/qo'lda qo'shilgan) admin ro'yxatida HAM ko'rinmay
    // qolar edi, ya'ni admin ularni ko'rib/tuzatib ham bo'lmasdi.
    const snap = await db.collection('video_testimonials').get();
    const videos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    videos.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
    if(videos.length === 0){ list.innerHTML = `<div class="empty-admin">Hali video qo'shilmagan.</div>`; return; }

    list.innerHTML = videos.map(v => `
      <div class="video-item" data-id="${v.id}">
        <button class="vi-delete" data-id="${v.id}">✕</button>
        <video src="${escapeHtml(v.videoUrl)}" muted preload="metadata"></video>
        <div class="vi-caption">${escapeHtml(v.caption || '')}</div>
        <div class="vi-likes-row">
          <span class="vi-likes-icon">❤️</span>
          <input type="number" class="vi-likes-input" data-id="${v.id}" value="${v.likes || 0}" min="0">
          <button class="vi-likes-save" data-id="${v.id}">💾</button>
          <button class="vi-likes-rand" data-id="${v.id}" title="Tasodifiy 500-999">🎲</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.vi-delete').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(!confirm("Bu videoni o'chirishni tasdiqlaysizmi?")) return;
        try{
          await db.collection('video_testimonials').doc(btn.dataset.id).delete();
          loadVideoTestimonials();
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });

    list.querySelectorAll('.vi-likes-save').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const input = list.querySelector(`.vi-likes-input[data-id="${btn.dataset.id}"]`);
        const val = Math.max(0, parseInt(input.value, 10) || 0);
        try{
          await db.collection('video_testimonials').doc(btn.dataset.id).update({ likes: val });
          vibrate(60);
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });

    list.querySelectorAll('.vi-likes-rand').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const val = 500 + Math.floor(Math.random() * 500);
        const input = list.querySelector(`.vi-likes-input[data-id="${btn.dataset.id}"]`);
        input.value = val;
        try{
          await db.collection('video_testimonials').doc(btn.dataset.id).update({ likes: val });
          vibrate(60);
        }catch(err){ alert('Xato: ' + err.message); }
      });
    });
  }catch(err){
    list.innerHTML = 'Xato: ' + err.message;
  }
}

/* "Premium video" bo'limi V118 da BUTUNLAY olib tashlandi (mijoz
   so'rovi). U saytda hech qayerda ko'rsatilmasdi — faqat admin
   panelida joy egallab turardi. Saytdagi pastki "sotilgan raqamlar
   videosi" boshqa bo'lim (video_testimonials, "Video sharhlar") va
   u O'Z JOYIDA qoldi. */

/* ---- Tashrif buyuruvchilar kuzatuvi (real vaqtda) ---- */
let visitorTrackingTimer = null;

function startVisitorTracking(){
  updateVisitorStats();
  if(visitorTrackingTimer) clearInterval(visitorTrackingTimer);
  visitorTrackingTimer = setInterval(updateVisitorStats, 15000);
}

async function updateVisitorStats(){
  // Admin hozir yozayotgan bo'lsa — bu davriy so'rovni o'tkazib yuboramiz
  // (keyingi 15 soniyalik siklda baribir davom etadi).
  if(isUserTyping) return;
  try{
    // Ayni vaqtda saytda: oxirgi 40 soniya ichida "men shu yerdaman" deb signal bergan seanslar
    // (lastSeen endi Firestore serverTimestamp — solishtirish uchun ham Timestamp kerak)
    const cutoff = firebase.firestore.Timestamp.fromMillis(Date.now() - 40000);
    const activeSnap = await db.collection('active_sessions').where('lastSeen', '>', cutoff).get();
    document.getElementById('liveVisitors').textContent = activeSnap.size;
  }catch(e){ console.error('Onlayn foydalanuvchilarni hisoblashda xato:', e); }

  try{
    const statDoc = await db.collection('site_stats').doc('counter').get();
    const total = statDoc.exists ? (statDoc.data().totalVisitors || 0) : 0;
    document.getElementById('totalVisitors').textContent = total;
  }catch(e){ console.error('Jami tashrifni yuklashda xato:', e); }
}

// Kompaniya/Aksiya/VIP filtrlar + "belgilash" (bulk) rejimi holati.
let nbOperatorFilter = '';
let nbFlagFilters = new Set();
let nbSelectMode = false;
let nbSelectedIds = new Set();

function applyNumberFilters(){
  const q = (document.getElementById('numberSearchInput').value || '').replace(/\D/g, '');
  let list = currentNumbersCache;
  if(q) list = list.filter(item => (item.number || '').replace(/\D/g,'').includes(q));
  if(nbOperatorFilter) list = list.filter(item => item.operator === nbOperatorFilter);
  if(nbFlagFilters.has('vip')) list = list.filter(item => item.tag === 'vip');
  if(nbFlagFilters.has('aksiya')) list = list.filter(item => item.dailyDeal || (item.oldPrice > item.price));
  if(nbFlagFilters.has('installment')) list = list.filter(item => item.installment);
  if(nbFlagFilters.has('featured')) list = list.filter(item => item.featured);
  if(nbFlagFilters.has('ownership')) list = list.filter(item => item.ownershipTransfer);
  if(nbFlagFilters.has('recommended')) list = list.filter(item => item.recommended);
  renderAdminNumbers(list);
}

document.querySelectorAll('.nb-op-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    nbOperatorFilter = chip.dataset.op;
    document.querySelectorAll('.nb-op-chip').forEach(c => c.classList.toggle('active', c === chip));
    applyNumberFilters();
  });
});
document.querySelectorAll('.nb-flag-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    const flag = chip.dataset.flag;
    if(nbFlagFilters.has(flag)){ nbFlagFilters.delete(flag); chip.classList.remove('active'); }
    else{ nbFlagFilters.add(flag); chip.classList.add('active'); }
    applyNumberFilters();
  });
});

function updateBulkBar(){
  const bar = document.getElementById('nbBulkBar');
  const countEl = document.getElementById('nbSelectedCount');
  countEl.textContent = nbSelectedIds.size;
  bar.style.display = nbSelectedIds.size > 0 ? 'flex' : 'none';
}
document.getElementById('nbSelectModeBtn').addEventListener('click', ()=>{
  nbSelectMode = !nbSelectMode;
  document.getElementById('nbSelectModeBtn').classList.toggle('active', nbSelectMode);
  if(!nbSelectMode){ nbSelectedIds.clear(); updateBulkBar(); }
  applyNumberFilters();
});
document.getElementById('nbBulkDeleteBtn').addEventListener('click', async ()=>{
  if(nbSelectedIds.size === 0) return;
  if(!confirm(`${nbSelectedIds.size} ta belgilangan raqamni o'chirishni tasdiqlaysizmi?`)) return;
  const btn = document.getElementById('nbBulkDeleteBtn');
  btn.disabled = true;
  try{
    await Promise.all(Array.from(nbSelectedIds).map(id => db.collection('numbers').doc(id).delete()));
    vibrate(80);
    nbSelectedIds.clear();
    updateBulkBar();
    refreshNumbers();
  }catch(err){ alert('O\'chirishda xato: ' + err.message); }
  finally{ btn.disabled = false; }
});

async function refreshNumbers(){
  adminNumbersList.innerHTML = `<div class="empty-admin">Yuklanmoqda...</div>`;
  try{
    const snap = await db.collection('numbers').get();
    const numbers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    currentNumbersCache = numbers;
    try{ document.dispatchEvent(new Event('vip:numbers-cache')); }catch(e){}
    updateOverview();
    applyNumberFilters();
    renderAksiyaTab();
  }catch(err){
    adminNumbersList.innerHTML = `<div class="empty-admin">Bazaga ulanishda xato. Firebase sozlamalarini tekshiring.</div>`;
    console.error(err);
  }
}


/* ==================================================================
   RAQAMLAR RO'YXATI — JADVAL KO'RINISHI
   Avval har bir raqam kartochka edi: raqam, operator va narx bir
   qatorda, lekin ustunlar tekis emasdi — 95 ta raqamni ko'zdan
   kechirish qiyin bo'lardi. Endi chinakam jadval: ustunlar sarlavhali,
   summalar o'ngga tekislangan va tik tekis turadi.
   ================================================================== */
const NB_OP_RANG = {
  'Beeline':'#FFD400', 'Ucell':'#8B46A8', 'Humans':'#1546D6',
  'Mobiuz':'#E5484D', 'Uzmobile':'#4C84F5', 'Perfektum':'#2FBF71'
};
function nbOperatorRang(op){ return NB_OP_RANG[op] || '#6F7F99'; }

function nbJadvalBoshi(){
  return '<div class="an-thead">' +
    '<span class="anc anc-num">Raqam</span>' +
    '<span class="anc anc-op">Operator</span>' +
    '<span class="anc anc-tag">Toifa</span>' +
    '<span class="anc anc-price">Narxi</span>' +
    '<span class="anc anc-state">Holati</span>' +
    '<span class="anc anc-act"></span>' +
  '</div>';
}

function nbUsd(item){
  return String((item && item.currency) || '').toLowerCase() === 'usd';
}
function nbNarx(v, item){
  const n = Number(v);
  if(!Number.isFinite(n) || n <= 0) return 'Kelishiladi';
  const txt = n.toLocaleString('ru-RU').replace(/,/g, ' ');
  return nbUsd(item) ? (txt + ' $') : txt;
}

/* Bo'lib to'lash yoqilgan bo'lsa — oyiga qancha tushishini ko'rsatamiz.
   Admin mijozga "oyiga qancha?" degan savolga darhol javob bersin. */
function nbOylik(item){
  if(!item.installment || nbUsd(item)) return '';
  const narx = Number(item.price) || 0;
  const oy = Number(item.tariffMonths) || 12;
  if(!narx || !oy) return "bo'lib to'lash bor";
  const oylik = Math.round(narx / oy);
  return "bo'lib: " + oylik.toLocaleString('ru-RU').replace(/,/g, ' ') + '/oy';
}

function nbToifa(item){
  const t = String(item.tier || '').toLowerCase();
  if(t === 'vip')     return '<span class="tg tg-t-vip">VIP</span>';
  if(t === 'premium') return '<span class="tg tg-t-prem">PREMIUM</span>';
  if(t === 'gold')    return '<span class="tg tg-t-gold">GOLD</span>';
  if(item.tag === 'vip') return '<span class="tg tg-vip">VIP</span>';
  return '<span class="tg tg-nt">Oddiy</span>';
}

function nbHolat(item){
  if(item.status === 'sold' || item.sold) return '<span class="tg tg-mut">Sotilgan</span>';
  if(item.status === 'reserved' || item.reserved) return '<span class="tg tg-nt">Band qilingan</span>';
  if(item.paused) return '<span class="tg tg-mut">To\'xtatilgan</span>';
  if(item.dailyDeal) return '<span class="tg tg-hot">Aksiyada</span>';
  return '<span class="tg tg-ok">Sotuvda</span>';
}

function nbQoshilgan(item){
  const ts = Number(item.addedAt);
  if(!ts) return '';
  const OY = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
  const d = new Date(ts);
  return d.getDate() + '-' + OY[d.getMonth()] + " qo'shilgan";
}

function renderAdminNumbers(numbers){
  if(numbers.length === 0){
    adminNumbersList.innerHTML = `<div class="empty-admin">Hali raqam qo'shilmagan.</div>`;
    return;
  }

  const RENDER_LIMIT = 300;
  const shown = numbers.slice(0, RENDER_LIMIT);
  const hiddenCount = numbers.length - shown.length;

  /* TEZLIK: tahrirlash formasi (22 ta maydon!) ENDI DARHOL
     chizilmaydi. Avval 300 ta raqam uchun 300 ta forma, ya'ni ~6600
     ta qo'shimcha element birdan yaratilardi — panel aynan shu sabab
     "qotib" qolardi. Endi forma qator OCHILGANDA, faqat o'sha qator
     uchun bir marta quriladi. Ro'yxat bir necha barobar yengillashdi,
     tahrirlash esa avvalgiday ishlaydi. */
  NB_ITEMS = {};
  shown.forEach(it => { NB_ITEMS[it.id] = it; });

  adminNumbersList.innerHTML = nbJadvalBoshi() + shown.map(item => `
    <div class="admin-row-collapsed" data-id="${item.id}">
      <div class="an-summary" data-id="${item.id}">
        ${nbSelectMode ? `<input type="checkbox" class="an-select-cb" data-id="${item.id}" ${nbSelectedIds.has(item.id) ? 'checked' : ''}>` : ''}
        <span class="anc anc-num">
          <b>${escapeHtml(item.number)}</b>
          <i>${nbQoshilgan(item)}</i>
        </span>
        <span class="anc anc-op">
          <i class="op-dot" style="background:${nbOperatorRang(item.operator)}"></i>${escapeHtml(item.operator || '—')}
        </span>
        <span class="anc anc-tag">${nbToifa(item)}</span>
        <span class="anc anc-price">
          <b>${nbNarx(item.price, item)}</b>
          <i>${nbOylik(item)}</i>
        </span>
        <span class="anc anc-state">${nbHolat(item)}</span>
        <span class="anc anc-act">
          <button type="button" class="an-ib an-ib-edit" title="Tahrirlash" aria-label="Tahrirlash"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
          <button type="button" class="an-ib an-ib-del" data-id="${item.id}" title="O'chirish" aria-label="O'chirish"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
        </span>
      </div>
      <div class="an-body" style="display:none;"></div>
    </div>
  `).join('') + (hiddenCount > 0
    ? `<div class="empty-admin">... va yana ${hiddenCount} ta raqam. Ro'yxat juda katta bo'lgani uchun faqat birinchi ${RENDER_LIMIT} tasi ko'rsatilmoqda — kerakli raqamni topish uchun yuqoridagi qidiruvdan foydalaning.</div>`
    : '');

  /* Qalam — qatorni ochadi, savat — o'chiradi. */
  adminNumbersList.querySelectorAll('.an-ib-edit').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const sum = btn.closest('.an-summary');
      if(sum) sum.click();
    });
  });
  adminNumbersList.querySelectorAll('.an-ib-del').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      if(!confirm('Rostdan ham o\'chirilsinmi?')) return;
      try{
        await db.collection('numbers').doc(btn.dataset.id).delete();
        refreshNumbers();
      }catch(err){ alert('O\'chirishda xato: ' + err.message); }
    });
  });

  adminNumbersList.querySelectorAll('.an-summary').forEach(summary=>{
    summary.addEventListener('click', ()=>{
      const wrap = summary.closest('.admin-row-collapsed');
      const body = wrap.querySelector('.an-body');
      const arrow = summary.querySelector('.an-summary-arrow');
      const isOpen = body.style.display !== 'none';
      if(!isOpen && !body.dataset.tayyor){
        body.innerHTML = nbTahrirHtml(NB_ITEMS[wrap.dataset.id] || {});
        body.dataset.tayyor = '1';
        nbTahrirBogla(body);
      }
      body.style.display = isOpen ? 'none' : 'block';
      if(arrow) arrow.textContent = isOpen ? '▾' : '▴';
      wrap.classList.toggle('an-open', !isOpen);
    });
  });

  adminNumbersList.querySelectorAll('.an-select-cb').forEach(cb=>{
    cb.addEventListener('click', (e)=> e.stopPropagation());
    cb.addEventListener('change', ()=>{
      if(cb.checked) nbSelectedIds.add(cb.dataset.id);
      else nbSelectedIds.delete(cb.dataset.id);
      updateBulkBar();
    });
  });
}

/* Ochilgan qator uchun tahrirlash formasi. Faqat KERAK BO'LGANDA
   chaqiriladi (yuqoridagi izohga qarang). */
let NB_ITEMS = {};
function nbTahrirHtml(item){
  return `
<div class="admin-row" data-id="${item.id}">
          <input class="an-number" value="${escapeHtml(item.number)}">
          <select class="an-operator">${operatorOptionsHtml(item.operator)}</select>
          <input class="an-price" type="number" value="${escapeHtml(item.price)}">
          <select class="an-currency" title="Valyuta">
            <option value="uzs" ${!nbUsd(item)?'selected':''}>so'm</option>
            <option value="usd" ${nbUsd(item)?'selected':''}>$</option>
          </select>
          <select class="an-tag">
            <option value="oddiy" ${item.tag==='oddiy'?'selected':''}>Oddiy</option>
            <option value="vip" ${item.tag==='vip'?'selected':''}>VIP</option>
          </select>
          <button class="an-save">Saqlash</button>
          <button class="an-delete">O'chirish</button>
          <div class="an-extra">
            <input class="an-oldprice" type="number" placeholder="Eski narx (aksiya)" value="${escapeHtml(item.oldPrice || '')}">
            <input class="an-monthlytariff" type="number" placeholder="Oylik tarif" value="${escapeHtml(item.monthlyTariff || '')}">
            <input class="an-tariffmonths" type="number" placeholder="Necha oy muddat" value="${escapeHtml(item.tariffMonths || '')}">
            <label class="an-installment-label">
              <input type="checkbox" class="an-installment" ${item.installment ? 'checked' : ''}>
              Bo'lib to'lash
            </label>
            <!-- ANIQ OYLIK TO'LOV. Bo'sh qoldirilsa sayt foiz
                 sozlamasidan TAXMINIY hisoblaydi va mijozga
                 "Taxminiy hisob" deb yozadi. To'ldirilsa — aynan shu
                 summa ko'rsatiladi va izoh yozilmaydi. -->
            <input class="an-m6"  type="number" placeholder="6 oy — oyiga (aniq)"  value="${escapeHtml(item.monthly6  || '')}">
            <input class="an-m12" type="number" placeholder="12 oy — oyiga (aniq)" value="${escapeHtml(item.monthly12 || '')}">
            <input class="an-m24" type="number" placeholder="24 oy — oyiga (aniq)" value="${escapeHtml(item.monthly24 || '')}">
            <select class="an-tier" title="Toifa">
              <option value="" ${!item.tier?'selected':''}>Toifasiz</option>
              <option value="vip" ${item.tier==='vip'?'selected':''}>VIP — binafsha</option>
              <option value="premium" ${item.tier==='premium'?'selected':''}>PREMIUM — platina</option>
              <option value="gold" ${item.tier==='gold'?'selected':''}>GOLD — oltin</option>
            </select>
            <label class="an-installment-label">
              <input type="checkbox" class="an-featured" ${item.featured ? 'checked' : ''}>
              Mashhur raqamlarda
            </label>
            <label class="an-installment-label">
              <input type="checkbox" class="an-dailydeal" ${item.dailyDeal ? 'checked' : ''}>
              🔥 Bugungi aksiyada
            </label>
            <label class="an-installment-label">
              <input type="checkbox" class="an-ownership" ${item.ownershipTransfer ? 'checked' : ''}>
              ✅ Nomiga chiqadi
            </label>
            <label class="an-installment-label">
              <input type="checkbox" class="an-recommended" ${item.recommended ? 'checked' : ''}>
              ⭐ ASOSIY'da "Tavsiya etiladi"da
            </label>
          </div>
        `;
}

/* Shu bitta forma uchun "Saqlash" va "O'chirish" tugmalarini bog'laydi. */
function nbTahrirBogla(body){
  const sv = body.querySelector('.an-save');
  if(sv) sv.addEventListener('click', async ()=>{
    const row = sv.closest('.admin-row');
    const id = row.dataset.id;
    let numVal = row.querySelector('.an-number').value.trim();
    if(numVal && !numVal.startsWith('+')) numVal = '+' + numVal;
    try{
      const priceVal = Number(row.querySelector('.an-price').value) || 0;
      const oldPriceVal = Number(row.querySelector('.an-oldprice').value) || 0;
      await db.collection('numbers').doc(id).update({
        number: numVal,
        operator: row.querySelector('.an-operator').value,
        price: priceVal,
        oldPrice: oldPriceVal,
        onSale: oldPriceVal > priceVal,
        currency: row.querySelector('.an-currency').value === 'usd' ? 'USD' : 'UZS',
        installment: row.querySelector('.an-currency').value === 'usd'
          ? false : row.querySelector('.an-installment').checked,
        tier: row.querySelector('.an-tier').value,
        featured: row.querySelector('.an-featured').checked || !!row.querySelector('.an-tier').value,
        dailyDeal: row.querySelector('.an-dailydeal').checked,
        monthlyTariff: Number(row.querySelector('.an-monthlytariff').value) || 0,
        tariffMonths: Number(row.querySelector('.an-tariffmonths').value) || 0,
        monthly6:  Number(row.querySelector('.an-m6').value)  || 0,
        monthly12: Number(row.querySelector('.an-m12').value) || 0,
        monthly24: Number(row.querySelector('.an-m24').value) || 0,
        ownershipTransfer: row.querySelector('.an-ownership').checked,
        recommended: row.querySelector('.an-recommended').checked,
        tag: row.querySelector('.an-tag').value
      });
      sv.textContent = '✓ Saqlandi';
      sv.classList.add('saved-flash');
      vibrate(80);
      setTimeout(()=>{ sv.textContent = 'Saqlash'; sv.classList.remove('saved-flash'); }, 1200);
    }catch(err){ alert('Saqlashda xato: ' + err.message); }
  });

  const dl = body.querySelector('.an-delete');
  if(dl) dl.addEventListener('click', async ()=>{
    const row = dl.closest('.admin-row');
    if(!confirm('Rostdan ham o\'chirilsinmi?')) return;
    try{
      await db.collection('numbers').doc(row.dataset.id).delete();
      refreshNumbers();
    }catch(err){ alert('O\'chirishda xato: ' + err.message); }
  });
}

/* ==================================================================
   "Aksiya" — o'zining alohida bo'limi (mijoz iltimosiga ko'ra
   "Raqamlar" tabidan chiqarilib, to'liq tsikl — ko'rish, qo'shish,
   tahrirlash, muddat/arxiv — shu yerga jamlandi). Raqam tanlash
   o'z qidiruv-tanlash uslubiga ega: mavjud raqamni qidirib tanlasa — o'sha raqam aksiyaga
   qo'yiladi (yangilanadi), hech narsa tanlamay yangi raqam yozsa — avvalgi
   xulq-atvor saqlanib, YANGI raqam yozuvi yaratiladi. ================== */
let aktEditingId = null;               // tahrirlanayotgan aksiya ID (null = yangi qo'shish)
let aktSelectedNumberData = null;      // qidiruvdan tanlangan MAVJUD raqam: {id, number, price, oldPrice, installment}
let aktDurationHours = 0;              // tanlangan tez-muddat (soat); 0 = tanlanmagan (o'zgarmaydi/muddatsiz)

const aktNumberSearchEl = document.getElementById('aktNumberSearch');
const aktNumberResultsEl = document.getElementById('aktNumberResults');
const aktSelectedNumberEl = document.getElementById('aktSelectedNumber');

aktNumberSearchEl.addEventListener('input', debounce(()=>{
  const q = aktNumberSearchEl.value.replace(/\D/g, '');
  if(!q){ aktNumberResultsEl.classList.remove('show'); aktNumberResultsEl.innerHTML = ''; return; }
  const matches = currentNumbersCache.filter(n => (n.number || '').replace(/\D/g,'').includes(q)).slice(0, 15);
  if(matches.length === 0){
    aktNumberResultsEl.innerHTML = `<div class="pv-number-row" style="cursor:default;color:var(--muted);">Topilmadi — "Saqlash" bosilsa shu yozilgan raqam YANGI sifatida qo'shiladi</div>`;
  }else{
    aktNumberResultsEl.innerHTML = matches.map(n => `
      <div class="pv-number-row" data-id="${n.id}" data-number="${escapeHtml(n.number)}" data-price="${n.price||0}" data-oldprice="${n.oldPrice||0}" data-installment="${n.installment ? 1 : 0}">
        <span>${escapeHtml(n.number)}${n.dailyDeal ? ' 🔥' : ''}</span>
        <span class="pvn-price">${formatPrice(n.price||0)}</span>
      </div>
    `).join('');
    aktNumberResultsEl.querySelectorAll('.pv-number-row').forEach(row=>{
      row.addEventListener('click', ()=>{
        aktSelectedNumberData = {
          id: row.dataset.id, number: row.dataset.number,
          price: Number(row.dataset.price), oldPrice: Number(row.dataset.oldprice),
          installment: row.dataset.installment === '1'
        };
        document.getElementById('aktNewPrice').value = aktSelectedNumberData.price || '';
        document.getElementById('aktOldPrice').value = aktSelectedNumberData.oldPrice || '';
        document.getElementById('aktInstallment').checked = aktSelectedNumberData.installment;
        document.getElementById('aktCurrency').value =
          String(aktSelectedNumberData.currency || '').toUpperCase() === 'USD' ? 'usd' : 'uzs';
        aktShowSelectedChip();
        aktNumberResultsEl.classList.remove('show');
        aktNumberSearchEl.value = '';
      });
    });
  }
  aktNumberResultsEl.classList.add('show');
}, 200));

function aktShowSelectedChip(){
  aktSelectedNumberEl.style.display = 'flex';
  aktSelectedNumberEl.innerHTML = `<span>✓ Tanlandi: <b>${escapeHtml(aktSelectedNumberData.number)}</b></span>`
    + (aktEditingId ? '' : `<button type="button" class="pvsel-clear" id="aktSelClear">✕</button>`);
  if(!aktEditingId){
    document.getElementById('aktSelClear').addEventListener('click', ()=>{
      aktSelectedNumberData = null;
      aktSelectedNumberEl.style.display = 'none';
    });
  }
}

document.querySelectorAll('#aktFormWrap .akt-duration-btn:not(.akt-duration-custom)').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#aktFormWrap .akt-duration-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    aktDurationHours = Number(btn.dataset.hours);
    document.getElementById('aktDurationPicked').innerHTML = `Tanlandi: <b>${btn.textContent}</b>dan keyin tugaydi (HOZIRDAN hisoblanadi).`;
  });
});
document.querySelector('#aktFormWrap .akt-duration-custom').addEventListener('click', ()=>{
  const hoursStr = prompt("Necha SOATdan keyin aksiya tugasin? (masalan: 48)");
  const hours = Number(hoursStr);
  if(!hours || hours <= 0) return;
  document.querySelectorAll('#aktFormWrap .akt-duration-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('#aktFormWrap .akt-duration-custom').classList.add('active');
  aktDurationHours = hours;
  document.getElementById('aktDurationPicked').innerHTML = `Tanlandi: <b>${hours} soat</b>dan keyin tugaydi (HOZIRDAN hisoblanadi).`;
});

function aktResetForm(){
  aktEditingId = null;
  aktSelectedNumberData = null;
  aktDurationHours = 0;
  document.getElementById('aktFormTitle').textContent = "➕ Yangi aksiya qo'shish";
  aktNumberSearchEl.value = '';
  aktNumberSearchEl.style.display = '';
  aktNumberResultsEl.classList.remove('show');
  aktNumberResultsEl.innerHTML = '';
  aktSelectedNumberEl.style.display = 'none';
  document.getElementById('aktNewPrice').value = '';
  document.getElementById('aktOldPrice').value = '';
  document.getElementById('aktInstallment').checked = false;
  document.getElementById('aktCurrency').value = 'uzs';
  document.querySelectorAll('#aktFormWrap .akt-duration-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('aktDurationPicked').innerHTML = '';
  const hint = document.getElementById('aktFormHint');
  hint.textContent = ''; hint.className = 'code-hint';
  document.getElementById('aktCancelBtn').style.display = 'none';
  const finWrap = document.getElementById('aktFinPanelWrap');
  if(finWrap) finWrap.remove();
}

document.getElementById('aktAddToggleBtn').addEventListener('click', ()=>{
  const wrap = document.getElementById('aktFormWrap');
  const addBtn = document.getElementById('aktAddToggleBtn');
  const isOpen = wrap.style.display !== 'none';
  if(isOpen && !aktEditingId){
    wrap.style.display = 'none';
    addBtn.classList.remove('akt-add-btn-active');
    return;
  }
  aktResetForm();
  wrap.style.display = 'block';
  addBtn.classList.add('akt-add-btn-active');
  wrap.scrollIntoView({ behavior:'smooth', block:'start' });
});
document.getElementById('aktCancelBtn').addEventListener('click', ()=>{
  aktResetForm();
  document.getElementById('aktFormWrap').style.display = 'none';
  document.getElementById('aktAddToggleBtn').classList.remove('akt-add-btn-active');
});

// "Bo'lib to'lash rejasi" (oyma-oy bosh to'lov/oylik to'lov, 6/12/24 oy) —
// bu customer saytida (index.html) alohida "installmentTeaser" sifatida
// ko'rsatiladigan, item.installment bayrog'idan MUSTAQIL, faqat mavjud
// aksiyalarga xos qo'shimcha imkoniyat edi — avvalgidek faqat TAHRIRLASH
// vaqtida (raqam allaqachon mavjud bo'lganda), ixtiyoriy panel sifatida saqlanadi.
function aktFinGroupHtml(item, months){
  return `
    <div class="op-fin-group">
      <div class="op-fin-group-title">${months} oy</div>
      <label>Bosh to'lov</label><input type="number" class="akt-fin-down" data-months="${months}" value="${escapeHtml(item['dealDown'+months] || 0)}">
      <label>Oylik to'lov</label><input type="number" class="akt-fin-monthly" data-months="${months}" value="${item['dealMonthly' + months] || 0}">
    </div>`;
}
function aktRenderFinPanel(item){
  const grid = document.querySelector('#aktFormWrap .akt-form-grid');
  const wrap = document.createElement('div');
  wrap.className = 'akt-field-wide';
  wrap.id = 'aktFinPanelWrap';
  wrap.innerHTML = `
    <button type="button" class="op-fin-toggle akt-fin-toggle" style="width:100%;padding:8px;display:flex;align-items:center;justify-content:center;gap:6px;">
      <span>💳 Bo'lib to'lash rejasi (oyma-oy, ixtiyoriy)</span><span>▾</span>
    </button>
    <div class="op-fin-panel akt-fin-panel" style="display:none;margin-top:8px;">
      ${aktFinGroupHtml(item, 6)}
      ${aktFinGroupHtml(item, 12)}
      ${aktFinGroupHtml(item, 24)}
    </div>`;
  grid.appendChild(wrap);
  wrap.querySelector('.akt-fin-toggle').addEventListener('click', ()=>{
    const panel = wrap.querySelector('.akt-fin-panel');
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'grid';
    wrap.querySelector('.akt-fin-toggle').classList.toggle('active', !isOpen);
  });
}

// Kartochkadagi "✏️ Tahrirlash" bosilganda — xuddi shu forma, endi
// tanlangan raqamga bog'langan holda (raqam qidiruv maydoni yashiriladi,
// o'rniga "tanlandi" chipi ko'rsatiladi) qayta ochiladi.
function aktOpenEdit(item){
  aktResetForm();
  aktEditingId = item.id;
  aktSelectedNumberData = { id: item.id, number: item.number, price: item.price, oldPrice: item.oldPrice, installment: item.installment };
  document.getElementById('aktFormTitle').textContent = '✏️ Aksiyani tahrirlash';
  aktNumberSearchEl.style.display = 'none';
  aktShowSelectedChip();
  document.getElementById('aktNewPrice').value = item.price || '';
  document.getElementById('aktOldPrice').value = item.oldPrice || '';
  document.getElementById('aktInstallment').checked = !!item.installment;
  document.getElementById('aktCurrency').value =
    String(item.currency || '').toUpperCase() === 'USD' ? 'usd' : 'uzs';
  const now = Date.now();
  if(item.dealExpiresAt){
    const hoursLeft = Math.max(0, Math.round((item.dealExpiresAt - now) / 3600000));
    document.getElementById('aktDurationPicked').innerHTML = `Hozirgi muddat: ~<b>${hoursLeft} soat</b> qoldi. Yangi muddat tanlasangiz, HOZIRDAN shuncha soatga yangilanadi (tanlamasangiz — o'zgarmaydi).`;
  }else{
    document.getElementById('aktDurationPicked').innerHTML = `Hozir <b>muddatsiz</b>. Yangi muddat tanlasangiz, HOZIRDAN shuncha soatga o'rnatiladi.`;
  }
  aktRenderFinPanel(item);
  document.getElementById('aktCancelBtn').style.display = 'inline-block';
  const wrap = document.getElementById('aktFormWrap');
  wrap.style.display = 'block';
  document.getElementById('aktAddToggleBtn').classList.add('akt-add-btn-active');
  wrap.scrollIntoView({ behavior:'smooth', block:'start' });
}

document.getElementById('aktSaveBtn').addEventListener('click', async ()=>{
  const hint = document.getElementById('aktFormHint');
  const newPrice = Number(document.getElementById('aktNewPrice').value) || 0;
  const oldPrice = Number(document.getElementById('aktOldPrice').value) || 0;
  const installment = document.getElementById('aktInstallment').checked;
  if(!newPrice){
    hint.textContent = "Aksiya narxini kiriting.";
    hint.className = 'code-hint bad';
    return;
  }
  const btn = document.getElementById('aktSaveBtn');
  btn.disabled = true;
  try{
    const aktCur = (document.getElementById('aktCurrency') || {}).value === 'usd' ? 'USD' : 'UZS';
    /* Dollarlik narxda bo'lib to'lash bo'lmaydi — hisob-kitob so'mda
       yuritiladi (raqam qo'shish formasidagi qoida bilan bir xil). */
    const installmentCur = aktCur === 'USD' ? false : installment;

    if(aktEditingId){
      // Mavjud aksiyani tahrirlash.
      const patch = { price: newPrice, oldPrice, onSale: oldPrice > newPrice, installment: installmentCur, currency: aktCur };
      if(aktDurationHours > 0) patch.dealExpiresAt = Date.now() + aktDurationHours * 3600 * 1000;
      const finWrap = document.getElementById('aktFinPanelWrap');
      if(finWrap){
        [6,12,24].forEach(m=>{
          patch['dealDown' + m] = Number(finWrap.querySelector(`.akt-fin-down[data-months="${m}"]`).value) || 0;
          patch['dealMonthly' + m] = Number(finWrap.querySelector(`.akt-fin-monthly[data-months="${m}"]`).value) || 0;
        });
      }
      await db.collection('numbers').doc(aktEditingId).update(patch);
    }else if(aktSelectedNumberData){
      // Qidiruvdan tanlangan MAVJUD raqamni aksiyaga qo'yish.
      const patch = { price: newPrice, oldPrice, onSale: oldPrice > newPrice, installment: installmentCur, currency: aktCur, dailyDeal: true };
      if(aktDurationHours > 0) patch.dealExpiresAt = Date.now() + aktDurationHours * 3600 * 1000;
      await db.collection('numbers').doc(aktSelectedNumberData.id).update(patch);
    }else{
      // Hech narsa tanlanmagan — yozilgan raqam bilan YANGI yozuv yaratiladi
      // (avvalgi #aksiyaList qo'shish formasi bilan bir xil xulq-atvor).
      let num = (aktNumberSearchEl.value || '').trim();
      if(!num){ hint.textContent = "Raqamni kiriting yoki ro'yxatdan tanlang."; hint.className = 'code-hint bad'; btn.disabled = false; return; }
      if(!num.startsWith('+')) num = '+' + num;
      /* DUBLIKAT NAZORATI — aksiyaga yangi raqam yozilayotganda ham */
      const borAks = await raqamBormi(num);
      if(borAks){
        hint.textContent = 'Bu raqam bazada allaqachon bor \u2014 ro\u2018yxatdan tanlang.';
        hint.className = 'code-hint bad';
        btn.disabled = false;
        return;
      }
      const rawDigits = num.replace(/\D/g, '').slice(-9);
      await db.collection('numbers').add({
        number: num, operator: '', price: newPrice, oldPrice, onSale: oldPrice > newPrice,
        currency: aktCur,
        installment: installmentCur, featured: false, dailyDeal: true, monthlyTariff: 0, tariffMonths: 0,
        dealExpiresAt: aktDurationHours > 0 ? Date.now() + aktDurationHours * 3600 * 1000 : null,
        dealDown6: 0, dealMonthly6: 0, dealDown12: 0, dealMonthly12: 0, dealDown24: 0, dealMonthly24: 0,
      monthly6:  Number(document.getElementById('newM6').value)  || 0,
      monthly12: Number(document.getElementById('newM12').value) || 0,
      monthly24: Number(document.getElementById('newM24').value) || 0,
        ownershipTransfer: false, recommended: false, tag: 'oddiy',
        last1: rawDigits.slice(-1), last2: rawDigits.slice(-2), last3: rawDigits.slice(-3), last4: rawDigits.slice(-4),
        addedAt: Date.now(), randomKey: Math.random()
      });
    }
    vibrate(80);
    hint.textContent = '✅ Saqlandi';
    hint.className = 'code-hint ok';
    document.getElementById('aktFormWrap').style.display = 'none';
    document.getElementById('aktAddToggleBtn').classList.remove('akt-add-btn-active');
    aktResetForm();
    refreshNumbers();
  }catch(err){ alert('Saqlashda xato: ' + err.message); }
  finally{ btn.disabled = false; }
});

document.querySelectorAll('.akt-switch-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.akt-switch-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.getElementById('aktGridActive').style.display = view === 'active' ? 'grid' : 'none';
    document.getElementById('aktGridArchive').style.display = view === 'archive' ? 'grid' : 'none';
  });
});

// Bitta aksiya kartochkasi — faol bo'lsa jonli taymer (.vz-countdown, xuddi
// "Vazifalar" bo'limidagi bilan bir xil uslub va avtomatik yangilanish),
// arxivda bo'lsa "🔁 Qayta joylash" tez tugmalari.
function aktCardHtml(item, isExpired){
  const hasDiscount = item.oldPrice && item.oldPrice > item.price;
  let timerHtml;
  if(item.dealExpiresAt && !isExpired){
    const { text, cls } = vzFormatCountdown(item.dealExpiresAt);
    timerHtml = `<div class="akt-card-timer">⏱ <span class="vz-countdown ${cls}" data-due="${escapeHtml(item.dealExpiresAt)}">${text}</span></div>`;
  }else if(isExpired){
    timerHtml = `<div class="akt-card-timer">⏱ Muddati tugagan</div>`;
  }else{
    timerHtml = `<div class="akt-card-timer">♾ Muddatsiz</div>`;
  }
  const repostBlock = isExpired ? `
    <div class="akt-repost-toggle-wrap">
      <button type="button" class="akt-repost-toggle" data-id="${item.id}">🔁 Qayta joylash</button>
    </div>
    <div class="akt-repost-row" data-id="${item.id}" style="display:none;">
      <button type="button" class="akt-repost-btn2" data-hours="1">1 soat</button>
      <button type="button" class="akt-repost-btn2" data-hours="3">3 soat</button>
      <button type="button" class="akt-repost-btn2" data-hours="12">12 soat</button>
      <button type="button" class="akt-repost-btn2" data-hours="24">24 soat</button>
      <button type="button" class="akt-repost-btn2" data-hours="72">3 kun</button>
      <button type="button" class="akt-repost-custom2">Boshqa...</button>
    </div>` : '';
  return `
    <div class="akt-card${isExpired ? ' akt-card-expired' : ''}" data-id="${item.id}">
      <div class="akt-card-top">
        <span class="akt-card-num">${escapeHtml(item.number)}</span>
        <span class="akt-card-badge ${isExpired ? 'akt-badge-expired' : 'akt-badge-active'}">${isExpired ? 'Arxiv' : 'Faol'}</span>
      </div>
      <div class="akt-card-prices">
        <span class="akt-card-price">${formatPrice(item.price)}</span>
        ${hasDiscount ? `<span class="akt-card-oldprice">${formatPrice(item.oldPrice)}</span>` : ''}
      </div>
      ${timerHtml}
      ${item.installment ? `<div class="akt-card-installment">💳 Bo'lib to'lash mavjud</div>` : ''}
      ${repostBlock}
      <div class="akt-card-actions">
        <button type="button" class="akt-edit-btn" data-id="${item.id}">✏️ Tahrirlash</button>
        <button type="button" class="akt-delete-btn" data-id="${item.id}">🗑</button>
      </div>
    </div>`;
}

// "Aksiya" tabining bosh render funksiyasi — refreshNumbers() har safar
// (Raqamlar ro'yxati yangilanganda) va shu tab ochilganda chaqiriladi,
// chunki ma'lumot bir xil 'numbers' kolleksiyasidan (dailyDeal:true) olinadi.
function renderAksiyaTab(){
  const gridActive = document.getElementById('aktGridActive');
  const gridArchive = document.getElementById('aktGridArchive');
  if(!gridActive || !gridArchive) return;
  const allItems = (currentNumbersCache || []).filter(n => n.dailyDeal);
  const now = Date.now();
  const active  = allItems.filter(n => !n.dealExpiresAt || n.dealExpiresAt > now);
  const expired = allItems.filter(n => n.dealExpiresAt && n.dealExpiresAt <= now);

  document.getElementById('aktActiveCount').textContent = active.length;
  document.getElementById('aktArchiveCount').textContent = expired.length;

  gridActive.innerHTML = active.length
    ? active.map(item => aktCardHtml(item, false)).join('')
    : `<div class="akt-empty"><b>🔥</b>Hozir faol aksiya yo'q.<br>Yangi aksiya qo'shish uchun yuqoridagi tugmani bosing.</div>`;
  gridArchive.innerHTML = expired.length
    ? expired.map(item => aktCardHtml(item, true)).join('')
    : `<div class="akt-empty"><b>🗂</b>Arxivda hali hech narsa yo'q.</div>`;

  [gridActive, gridArchive].forEach(grid=>{
    grid.querySelectorAll('.akt-edit-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const item = allItems.find(n => n.id === btn.dataset.id);
        if(item) aktOpenEdit(item);
      });
    });
    grid.querySelectorAll('.akt-delete-btn').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        if(!confirm("Ushbu aksiyani (raqamni) o'chirishni tasdiqlaysizmi?")) return;
        try{
          await db.collection('numbers').doc(btn.dataset.id).delete();
          vibrate(80);
          refreshNumbers();
        }catch(err){ alert("O'chirishda xato: " + err.message); }
      });
    });
    grid.querySelectorAll('.akt-repost-toggle').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const row = btn.closest('.akt-card').querySelector('.akt-repost-row');
        row.style.display = row.style.display === 'none' ? 'flex' : 'none';
      });
    });
    grid.querySelectorAll('.akt-repost-btn2').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.closest('.akt-repost-row').dataset.id;
        const hours = Number(btn.dataset.hours);
        if(!confirm(`Ushbu raqam yana ${hours} soatga aksiyaga qo'yilsinmi?`)) return;
        try{
          await db.collection('numbers').doc(id).update({ dealExpiresAt: Date.now() + hours * 3600 * 1000 });
          vibrate(80);
          refreshNumbers();
        }catch(err){ alert('Qayta joylashda xato: ' + err.message); }
      });
    });
    grid.querySelectorAll('.akt-repost-custom2').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.closest('.akt-repost-row').dataset.id;
        const hoursStr = prompt("Necha SOATga qayta joylansin? (masalan: 48)");
        const hours = Number(hoursStr);
        if(!hours || hours <= 0) return;
        try{
          await db.collection('numbers').doc(id).update({ dealExpiresAt: Date.now() + hours * 3600 * 1000 });
          vibrate(80);
          refreshNumbers();
        }catch(err){ alert('Qayta joylashda xato: ' + err.message); }
      });
    });
  });
}

// Har bir harf uchun butun ro'yxatni (300 tagacha murakkab qator) qayta
// chizish og'ir amal — tez yozganda sayt "qotib qolishi"ga sabab bo'lardi.
// Shuning uchun foydalanuvchi yozishni bir oz to'xtatgandan keyingina
// (180ms) qidiruv ishga tushadi — yozish esa hech qanday kechikishsiz,
// darhol ko'rinadi.

/* ==================================================================
   KUN TAVSIYASI
   Sayt (index.html) site_settings/daily_picks hujjatini o'qiydi va
   "Tanlangan VIP raqamlar" ro'yxatining 5-kartochkasidan keyin yonga
   suriladigan alohida kartochkalar qatorini chizadi.

   Hujjat ko'rinishi:
     { title, subtitle, updatedAt, items: [ ... ] }
   Element ikki xil bo'ladi:
     1) BAZADAN  -> { id:'<numbers hujjati ID>', note?, tier? }
        Narx/operator saytda jonli o'qiladi — ya'ni bazada narx
        o'zgarsa, kun tavsiyasi ham o'zi yangilanadi.
     2) JONLI/QO'LDA -> { live:true, number, operator, price, oldPrice?,
                          installment?, tier?, note? }
        Bu raqamlar Firestore'da yo'q (operator bazasida turadi), shu
        sabab ko'rsatish uchun kerakli maydonlar shu yerda SAQLANADI.
   ================================================================== */

let DAY_ITEMS = [];          // ro'yxat (saqlanmagan o'zgarishlar ham shu yerda)
let daySelected = null;      // qo'shish formasida tanlangan raqam
let daySrc = 'base';         // 'base' | 'live' | 'manual'
let dayDirty = false;

function dayHint(text, kind){
  const h = document.getElementById('dayFormHint');
  if(!h) return;
  h.textContent = text || '';
  h.className = 'code-hint' + (kind ? ' ' + kind : '');
}

async function dayLoad(){
  const box = document.getElementById('dayList');
  if(!box) return;
  if(dayDirty){ dayRender(); return; }   // saqlanmagan o'zgarishni yo'q qilmaymiz
  box.innerHTML = '<div class="wt-empty">Yuklanmoqda...</div>';
  try{
    const doc = await db.collection('site_settings').doc('daily_picks').get();
    const d = doc.exists ? (doc.data() || {}) : {};
    DAY_ITEMS = Array.isArray(d.items) ? d.items.slice() : [];
    document.getElementById('dayTitle').value = d.title || '';
    document.getElementById('daySubtitle').value = d.subtitle || '';
  }catch(e){
    box.innerHTML = '<div class="wt-empty">Yuklab bo\'lmadi: ' + escapeHtml(e.message) + '</div>';
    return;
  }
  dayDirty = false;
  dayRender();
}

/* Ro'yxatdagi elementni ko'rsatish uchun "to'liq" ko'rinishga aylantirish.
   Bazadagi element uchun ma'lumot currentNumbersCache'dan olinadi; agar
   raqam bazadan O'CHIRILGAN bo'lsa — buni admin ko'rishi kerak, shu sabab
   qatorda ogohlantirish chiqadi. */
function dayItemView(it){
  if(it && it.live){
    return { number: it.number || '—', operator: it.operator || '', price: Number(it.price) || 0,
             usd: nbUsd(it), src: 'live', srcLabel: 'JONLI', missing: false };
  }
  const n = currentNumbersCache.find(x => x.id === (it && it.id));
  if(!n) return { number: (it && it.number) || (it && it.id) || '—', operator: '', price: 0,
                  src: 'base', srcLabel: 'BAZA', missing: true };
  return { number: n.number || '—', operator: n.operator || '', price: Number(n.price) || 0,
           usd: nbUsd(n), src: 'base', srcLabel: 'BAZA', missing: false };
}

function dayRender(){
  const box = document.getElementById('dayList');
  const cnt = document.getElementById('dayCount');
  if(!box) return;
  if(cnt) cnt.textContent = DAY_ITEMS.length;
  if(!DAY_ITEMS.length){
    box.innerHTML = '<div class="wt-empty">Hozircha bo\'sh — ro\'yxat bo\'sh bo\'lsa saytda bu bo\'lim '
      + 'umuman ko\'rsatilmaydi. Yuqoridagi &laquo;Raqam qo\'shish&raquo; bilan to\'ldiring.</div>';
    return;
  }
  box.innerHTML = DAY_ITEMS.map((it, i) => {
    const v = dayItemView(it);
    const tier = (it.tier || '').toUpperCase();
    const sub = [
      v.operator ? escapeHtml(v.operator) : '',
      v.price ? (formatPrice(v.price) + (v.usd ? ' $' : " so'm")) : (v.src === 'base' ? 'narx bazadan olinadi' : ''),
      tier ? tier : '',
      it.note ? '«' + escapeHtml(it.note) + '»' : '',
      v.missing ? '⚠️ bazada topilmadi — o\'chirilgan bo\'lishi mumkin' : ''
    ].filter(Boolean).join(' · ');
    const srcCls = v.src === 'live' ? 'live' : 'base';
    return '<div class="dayadm-row">'
      + '<span class="dar-ord">' + (i + 1) + '</span>'
      + '<span class="dar-src ' + srcCls + '">' + v.srcLabel + '</span>'
      + '<span class="dar-main"><span class="dar-num">' + escapeHtml(v.number) + '</span>'
      + '<div class="dar-sub">' + sub + '</div></span>'
      + '<span class="dar-btns">'
      + '<button type="button" data-day-up="' + i + '" title="Yuqoriga">&#8593;</button>'
      + '<button type="button" data-day-down="' + i + '" title="Pastga">&#8595;</button>'
      + '<button type="button" class="dar-del" data-day-del="' + i + '" title="O\'chirish">&#10005;</button>'
      + '</span></div>';
  }).join('');
}

document.addEventListener('click', (ev)=>{
  const t = ev.target.closest('[data-day-up],[data-day-down],[data-day-del]');
  if(!t) return;
  if(t.dataset.dayUp !== undefined){
    const i = +t.dataset.dayUp;
    if(i > 0){ const x = DAY_ITEMS[i]; DAY_ITEMS[i] = DAY_ITEMS[i-1]; DAY_ITEMS[i-1] = x; }
  } else if(t.dataset.dayDown !== undefined){
    const i = +t.dataset.dayDown;
    if(i < DAY_ITEMS.length - 1){ const x = DAY_ITEMS[i]; DAY_ITEMS[i] = DAY_ITEMS[i+1]; DAY_ITEMS[i+1] = x; }
  } else {
    DAY_ITEMS.splice(+t.dataset.dayDel, 1);
  }
  dayDirty = true;
  dayRender();
  dayHint('O\'zgarish kiritildi — &laquo;Saqlash&raquo;ni bosmaguncha saytda ko\'rinmaydi.', 'warn');
});

/* ---- forma: ochish/yopish ---- */
(function(){
  const addBtn = document.getElementById('dayAddToggleBtn');
  if(!addBtn) return;
  addBtn.addEventListener('click', ()=>{
    const wrap = document.getElementById('dayFormWrap');
    const open = wrap.style.display !== 'none';
    wrap.style.display = open ? 'none' : '';
    addBtn.classList.toggle('akt-add-btn-active', !open);
    if(!open) document.getElementById('daySearch').focus();
  });
  document.getElementById('dayCancelBtn').addEventListener('click', ()=>{
    document.getElementById('dayFormWrap').style.display = 'none';
    addBtn.classList.remove('akt-add-btn-active');
    dayResetForm();
  });
})();

function dayResetForm(){
  daySelected = null;
  ['daySearch','dayLiveMask','dayMnNumber','dayMnPrice','dayMnOld','dayNote'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value = '';
  });
  document.getElementById('dayMnCurrency').value = 'uzs';
  document.getElementById('dayTier').value = '';
  const r = document.getElementById('dayResults'); r.innerHTML = ''; r.classList.remove('show');
  const lr = document.getElementById('dayLiveResults'); lr.innerHTML = ''; lr.classList.remove('show');
  document.getElementById('daySelBox').style.display = 'none';
  dayHint('');
}

/* ---- manba almashtirgich ---- */
document.querySelectorAll('#daySrcSwitch .akt-switch-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#daySrcSwitch .akt-switch-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    daySrc = btn.dataset.src;
    document.getElementById('dayBaseBox').style.display   = daySrc === 'base'   ? '' : 'none';
    document.getElementById('dayLiveBox').style.display   = daySrc === 'live'   ? '' : 'none';
    document.getElementById('dayManualBox').style.display = daySrc === 'manual' ? '' : 'none';
    daySelected = null;
    document.getElementById('daySelBox').style.display = 'none';
    dayHint('');
  });
});

function dayShowSel(){
  const box = document.getElementById('daySelBox');
  if(!daySelected){ box.style.display = 'none'; return; }
  box.style.display = 'flex';
  box.innerHTML = '<span>&#10003; Tanlandi: <b>' + escapeHtml(daySelected.number) + '</b>'
    + (daySelected.operator ? ' · ' + escapeHtml(daySelected.operator) : '')
    + (daySelected.price ? ' · ' + formatPrice(daySelected.price) : '') + '</span>';
}

/* ---- 1) bazadan qidirish ---- */
document.getElementById('daySearch').addEventListener('input', debounce(()=>{
  const el = document.getElementById('daySearch');
  const res = document.getElementById('dayResults');
  const q = el.value.replace(/\D/g, '');
  if(!q){ res.classList.remove('show'); res.innerHTML = ''; return; }
  const matches = currentNumbersCache
    .filter(n => (n.number || '').replace(/\D/g,'').includes(q))
    .slice(0, 15);
  if(!matches.length){
    res.innerHTML = '<div class="pv-number-row" style="cursor:default;color:var(--muted);">Topilmadi</div>';
  }else{
    res.innerHTML = matches.map(n =>
      '<div class="pv-number-row" data-id="' + n.id + '" data-number="' + escapeHtml(n.number) + '"'
      + ' data-operator="' + escapeHtml(n.operator || '') + '" data-price="' + (n.price || 0) + '">'
      + '<span>' + escapeHtml(n.number) + (n.reserved ? ' 🔒' : '') + '</span>'
      + '<span class="pvn-price">' + formatPrice(n.price || 0) + '</span></div>'
    ).join('');
    res.querySelectorAll('.pv-number-row[data-id]').forEach(row=>{
      row.addEventListener('click', ()=>{
        daySelected = { kind:'base', id: row.dataset.id, number: row.dataset.number,
                        operator: row.dataset.operator, price: Number(row.dataset.price) };
        res.classList.remove('show'); el.value = '';
        dayShowSel();
      });
    });
  }
  res.classList.add('show');
}, 200));

/* ---- 2) jonli bazadan qidirish (api-live-search) ---- */
document.getElementById('dayLiveBtn').addEventListener('click', async ()=>{
  const el = document.getElementById('dayLiveMask');
  const res = document.getElementById('dayLiveResults');
  // Maska AYNAN 7 belgi bo'lishi shart (funksiya shunday kutadi): yozilmagan
  // o'rinlar "_" bilan to'ldiriladi, ya'ni admin "7777" deb yozsa ham ishlaydi.
  let raw = (el.value || '').replace(/[^0-9_*]/g, '').replace(/\*/g, '_');
  if(!raw){ dayHint('Avval maskani yozing (masalan ___7777).', 'bad'); return; }
  const mask = (raw + '_______').slice(0, 7);
  el.value = mask;
  res.innerHTML = '<div class="pv-number-row" style="cursor:default;color:var(--muted);">Qidirilmoqda...</div>';
  res.classList.add('show');
  try{
    const r = await fetch('/.netlify/functions/api-live-search?limit=40&mask=' + encodeURIComponent(mask));
    const d = await r.json();
    if(d.ok !== true) throw new Error(d.error || 'Qidiruv xatosi');
    const items = d.items || [];
    if(!items.length){
      res.innerHTML = '<div class="pv-number-row" style="cursor:default;color:var(--muted);">Operatorlarda bo\'sh raqam topilmadi</div>';
      return;
    }
    res.innerHTML = items.slice(0, 30).map(x =>
      '<div class="pv-number-row" data-number="' + escapeHtml(x.number) + '"'
      + ' data-operator="' + escapeHtml(x.operator || '') + '" data-price="' + (x.price || 0) + '"'
      + ' data-inst="' + (x.installment ? 1 : 0) + '">'
      + '<span>' + escapeHtml(x.number) + ' <small style="opacity:.6;">' + escapeHtml(x.operator || '') + '</small></span>'
      + '<span class="pvn-price">' + formatPrice(x.price || 0) + '</span></div>'
    ).join('');
    res.querySelectorAll('.pv-number-row[data-number]').forEach(row=>{
      row.addEventListener('click', ()=>{
        daySelected = { kind:'live', number: row.dataset.number, operator: row.dataset.operator,
                        price: Number(row.dataset.price), installment: row.dataset.inst === '1' };
        res.classList.remove('show');
        dayShowSel();
      });
    });
    dayHint('Jonli bazadan tanlangan raqam Firestore\'da yo\'q — shu sabab narxi va operatori '
      + 'kun tavsiyasi ro\'yxatiga nusxalanib saqlanadi.', '');
  }catch(e){
    res.innerHTML = '<div class="pv-number-row" style="cursor:default;color:var(--muted);">Xato: ' + escapeHtml(e.message) + '</div>';
  }
});

/* ---- 3) ro'yxatga qo'shish ---- */
document.getElementById('dayAddBtn').addEventListener('click', ()=>{
  const note = (document.getElementById('dayNote').value || '').trim();
  const tier = document.getElementById('dayTier').value || '';
  let item = null;

  if(daySrc === 'manual'){
    const num = (document.getElementById('dayMnNumber').value || '').trim();
    const price = Number(document.getElementById('dayMnPrice').value) || 0;
    if(!num){ dayHint('Raqamni yozing.', 'bad'); return; }
    if(!price){ dayHint('Narxini yozing.', 'bad'); return; }
    item = { live:true, number: num, operator: document.getElementById('dayMnOperator').value,
             price: price, oldPrice: Number(document.getElementById('dayMnOld').value) || 0,
             currency: document.getElementById('dayMnCurrency').value === 'usd' ? 'USD' : 'UZS' };
  } else {
    if(!daySelected){ dayHint('Avval raqamni tanlang.', 'bad'); return; }
    if(daySelected.kind === 'base'){
      item = { id: daySelected.id, number: daySelected.number };
    } else {
      item = { live:true, number: daySelected.number, operator: daySelected.operator,
               price: daySelected.price, oldPrice: 0, installment: !!daySelected.installment };
    }
  }
  if(note) item.note = note;
  if(tier) item.tier = tier;

  const key = item.id ? ('id:' + item.id) : ('num:' + String(item.number).replace(/\D/g,''));
  const exists = DAY_ITEMS.some(x => (x.id ? ('id:' + x.id) : ('num:' + String(x.number||'').replace(/\D/g,''))) === key);
  if(exists){ dayHint('Bu raqam ro\'yxatda allaqachon bor.', 'bad'); return; }
  if(DAY_ITEMS.length >= 20){ dayHint('Ko\'pi bilan 20 ta raqam (saytda shuncha ko\'rsatiladi).', 'bad'); return; }

  DAY_ITEMS.push(item);
  dayDirty = true;
  dayRender();
  dayResetForm();
  dayHint('Qo\'shildi. Saytda ko\'rinishi uchun pastdagi &laquo;Saqlash&raquo;ni bosing.', 'ok');
});

/* ---- 4) saqlash ---- */
document.getElementById('daySaveBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('daySaveBtn');
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = 'Saqlanmoqda...';
  try{
    await db.collection('site_settings').doc('daily_picks').set({
      title: (document.getElementById('dayTitle').value || '').trim(),
      subtitle: (document.getElementById('daySubtitle').value || '').trim(),
      items: DAY_ITEMS.slice(0, 20),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    dayDirty = false;
    dayHint('Saqlandi — saytda ko\'rinadi.', 'ok');
  }catch(e){
    dayHint('Saqlanmadi: ' + e.message, 'bad');
  }finally{
    btn.disabled = false; btn.textContent = old;
  }
});

/* Raqamlar bazasi yangilanganda ro'yxatdagi narx/operator ham yangilanadi. */
document.addEventListener('vip:numbers-cache', ()=>{
  if(document.getElementById('paneKuntavsiyasi').classList.contains('active')) dayRender();
});

function debounce(fn, delay){
  let timer = null;
  return function(...args){
    clearTimeout(timer);
    timer = setTimeout(()=> fn.apply(this, args), delay);
  };
}

document.getElementById('numberSearchInput').addEventListener('input', debounce(()=>{
  applyNumberFilters();
}, 180));

/* ---- Raqam kiritilganda avtomatik formatlash + operatorni aniqlash ---- */
const newNumberInput = document.getElementById('newNumber');
const newOperatorSelect = document.getElementById('newOperator');
const codeHint = document.getElementById('codeHint');

/* RAQAM QO'SHISH maydoni — iPhone'da qotmaydigan usul: yozayotganda
   qiymatga TEGILMAYDI, faqat operator aniqlanadi (yengil ish).
   Format maydondan chiqqanda qo'yiladi. */
newNumberInput.setAttribute('inputmode', 'tel');
newNumberInput.addEventListener('blur', ()=>{
  const raw = extractRawDigits(newNumberInput.value);
  const formatted = raw ? formatUzNumber(raw) : '';
  if(formatted !== newNumberInput.value) newNumberInput.value = formatted;
});
newNumberInput.addEventListener('input', ()=>{
  const raw = extractRawDigits(newNumberInput.value);
  const code = raw.slice(0,2);
  if(code.length === 2){
    const found = CODE_TO_OPERATOR[code];
    if(found){
      newOperatorSelect.value = found;
      codeHint.textContent = `✓ Aniqlandi: ${found}`;
      codeHint.className = 'code-hint ok';
    }else{
      codeHint.textContent = `Kod topilmadi (${code}) — operatorni qo'lda tanlang`;
      codeHint.className = 'code-hint bad';
    }
  }else{
    codeHint.textContent = '';
    codeHint.className = 'code-hint';
  }
});

// Mijoz iltimosiga ko'ra "Aksiya" endi shu umumiy formadan OLIB TASHLANDI —
// o'zining ALOHIDA tabida ("Aksiya", Raqamlar tabidan keyin) to'liq tsikl
// bilan boshqariladi. Shu sabab bu yerdagi "onDeal"/"dailyDeal" har doim
// FALSE bo'ladi.
document.getElementById('addNumberBtn').addEventListener('click', async ()=>{
  const numberInput = document.getElementById('newNumber');
  let num = numberInput.value.trim();
  if(!num){ numberInput.focus(); return; }
  /* BIR XIL KO'RINISH. Ilgari shunchaki "+" qo'shilardi: "901234567"
     yozilsa bazaga "+901234567" tushib ketardi (998 siz) va saytda
     noto'g'ri ko'rinardi. Endi har doim "+998XXXXXXXXX". */
  const n9yangi = raqam9(num);
  if(n9yangi.length !== 9){
    alert("Raqam noto'g'ri. 9 xonali raqam kiriting, masalan: 90 123 45 67");
    numberInput.focus();
    return;
  }
  num = '+998' + n9yangi;

  /* DUBLIKAT NAZORATI — bitta raqam bazada faqat bir marta turadi. */
  const addBtn = document.getElementById('addNumberBtn');
  const aslMatn = addBtn.textContent;
  addBtn.disabled = true; addBtn.textContent = 'Tekshirilmoqda...';
  const bor = await raqamBormi(num);
  addBtn.disabled = false; addBtn.textContent = aslMatn;
  if(bor){
    alert('Bu raqam bazada ALLAQACHON bor:\n\n' + (bor.number || num) +
      (bor.operator ? '  \u00B7  ' + bor.operator : '') +
      (bor.price ? '  \u00B7  ' + Number(bor.price).toLocaleString('ru-RU') : '') +
      '\n\nBitta raqam bazada faqat bir marta turishi mumkin. ' +
      'Narx yoki boshqa ma\u2019lumotni o\u2018zgartirmoqchi bo\u2018lsangiz \u2014 ' +
      'pastdagi ro\u2018yxatdan o\u2018sha raqamni toping va tahrirlang.');
    try{
      const q = document.getElementById('numberSearchInput');
      if(q){ q.value = raqam9(num); q.dispatchEvent(new Event('input')); }
    }catch(e){}
    return;
  }

  try{
    const priceVal = Number(document.getElementById('newPrice').value) || 0;
    const rawDigits = num.replace(/\D/g, '').slice(-9); // 9 xonali mahalliy qism
    await db.collection('numbers').add({
      number: num,
      operator: document.getElementById('newOperator').value,
      price: priceVal,
      oldPrice: 0,
      onSale: false,
      currency: document.getElementById('newCurrency').value === 'usd' ? 'USD' : 'UZS',
      // Dollarlik raqamda bo'lib to'lash bo'lmaydi — hisob-kitob so'mda
      // yuritiladi, shu sabab belgilangan bo'lsa ham o'chiriladi.
      installment: document.getElementById('newCurrency').value === 'usd'
        ? false : document.getElementById('newInstallment').checked,
      tier: document.getElementById('newTier').value,
      featured: document.getElementById('newFeatured').checked || !!document.getElementById('newTier').value,
      dailyDeal: false,
      monthlyTariff: 0,
      tariffMonths: 0,
      dealExpiresAt: null,
      dealDown6: 0, dealMonthly6: 0, dealDown12: 0, dealMonthly12: 0, dealDown24: 0, dealMonthly24: 0,
      monthly6:  Number(document.getElementById('newM6').value)  || 0,
      monthly12: Number(document.getElementById('newM12').value) || 0,
      monthly24: Number(document.getElementById('newM24').value) || 0,
      ownershipTransfer: false,
      /* MUHIM (V79): bu uchta maydon ALBATTA yozilishi kerak.
         `reserved` yo'q bo'lsa — mijoz bu raqamga buyurtma bera
         OLMAYDI (Firestore qoidasi band qilishni rad etadi va mijozga
         "internetni tekshiring" degan xato chiqadi). */
      reserved: false,
      hidden: false,
      sold: false,
      recommended: document.getElementById('newRecommended').checked,
      tag: document.getElementById('newTag').value,
      last1: rawDigits.slice(-1), last2: rawDigits.slice(-2), last3: rawDigits.slice(-3), last4: rawDigits.slice(-4),
      addedAt: Date.now(),
      randomKey: Math.random()
    });
    vibrate(80);
    numberInput.value = '';
    document.getElementById('newPrice').value = '';
    const curEl = document.getElementById('newCurrency');
    curEl.value = 'uzs';
    curEl.dispatchEvent(new Event('change'));
    document.getElementById('newInstallment').checked = false;
    ['newM6','newM12','newM24'].forEach(k=>{ const e=document.getElementById(k); if(e) e.value=''; });
    const insWrap = document.getElementById('newInsWrap'); if(insWrap) insWrap.style.display='none';
    document.getElementById('newFeatured').checked = false;
    document.getElementById('newTier').value = '';
    document.getElementById('newRecommended').checked = false;
    codeHint.textContent = '';
    codeHint.className = 'code-hint';
    refreshNumbers();
  }catch(err){ alert('Qo\'shishda xato: ' + err.message); }
});

/* Valyuta tanlanganda: narx maydonining yozuvi va "bo'lib to'lash"
   belgisining holati darhol moslashadi — admin adashmasin. */
(function(){
  const cur = document.getElementById('newCurrency');
  if(!cur) return;
  const sync = ()=>{
    const usd = cur.value === 'usd';
    const price = document.getElementById('newPrice');
    if(price) price.placeholder = usd ? 'Narxi ($)' : "Narxi (so'm)";
    const ins = document.getElementById('newInstallment');
    if(ins){
      if(usd) ins.checked = false;
      ins.disabled = usd;
      const lbl = ins.closest('.checkbox-field');
      if(lbl){ lbl.style.opacity = usd ? '.45' : ''; lbl.title = usd ? "Dollarlik raqamda bo'lib to'lash yo'q" : ''; }
    }
  };
  cur.addEventListener('change', sync);
  /* "Bo'lib to'lash mumkin" belgilansa — aniq summa maydonlari ochiladi */
  const insCb = document.getElementById('newInstallment');
  const insWrap = document.getElementById('newInsWrap');
  const insSync = ()=>{ if(insWrap) insWrap.style.display = (insCb && insCb.checked && cur.value !== 'usd') ? 'block' : 'none'; };
  if(insCb) insCb.addEventListener('change', insSync);
  cur.addEventListener('change', insSync);
  sync(); insSync();
})();

/* ---- Ko'p raqamni birdan qo'shish ---- */
const bulkToggle  = document.getElementById('bulkToggle');
const bulkBox     = document.getElementById('bulkBox');
const bulkText    = document.getElementById('bulkText');
const bulkPreview = document.getElementById('bulkPreview');
let parsedBulkRows = [];

bulkToggle.addEventListener('click', ()=>{
  bulkBox.classList.toggle('open');
  bulkToggle.textContent = bulkBox.classList.contains('open')
    ? '- Ko\'p raqamni yashirish'
    : '+ Ko\'p raqamni birdan qo\'shish';
});

function parseBulkLine(line){
  const parts = line.split(',').map(p => p.trim()).filter(p => p !== '');
  if(parts.length < 2) return null;

  const raw = extractRawDigits(parts[0]);
  if(raw.length < 9) return null;

  const number = formatUzNumber(raw);
  const code = raw.slice(0,2);
  const operator = CODE_TO_OPERATOR[code] || null;
  const price = Number(parts[1].replace(/\D/g,'')) || 0;

  /* 3-chi va keyingi bo'laklar tartibsiz bo'lishi mumkin: "vip", "usd",
     "som" — qaysi biri yozilgan bo'lsa, o'shani olamiz. Yozilmasa,
     valyuta yuqoridagi umumiy tanlovdan olinadi. */
  const rest = parts.slice(2).map(x => x.toLowerCase());
  const tag = rest.includes('vip') ? 'vip' : 'oddiy';
  const umumiy = (document.getElementById('bulkCurrency') || {}).value === 'usd' ? 'USD' : 'UZS';
  let currency = umumiy;
  if(rest.includes('usd') || rest.includes('$') || rest.includes('dollar')) currency = 'USD';
  if(rest.includes('som') || rest.includes("so'm") || rest.includes('uzs')) currency = 'UZS';

  return { number, operator, price, tag, currency, raw };
}

document.getElementById('bulkCurrency').addEventListener('change', ()=>{
  if(parsedBulkRows.length) document.getElementById('bulkPreviewBtn').click();
});

document.getElementById('bulkPreviewBtn').addEventListener('click', ()=>{
  const lines = bulkText.value.split('\n').map(l => l.trim()).filter(l => l !== '');
  parsedBulkRows = lines.map(parseBulkLine).filter(r => r !== null);

  if(parsedBulkRows.length === 0){
    bulkPreview.innerHTML = `<p style="color:var(--muted);font-size:12.5px;">Hech qanday qatorni tanib bo'lmadi. Format: raqam, narx</p>`;
    return;
  }

  const PREVIEW_LIMIT = 100;
  const rowsHtml = parsedBulkRows.slice(0, PREVIEW_LIMIT).map((r, i) => `
    <div class="bp-row ${r.operator ? '' : 'bad'}">
      <span class="bp-num">${r.number}</span>
      <span class="bp-op ${r.operator ? '' : 'unknown'}">${r.operator || 'Kod topilmadi'}</span>
      <span class="bp-price">${r.price.toLocaleString('ru-RU').replace(/,/g,' ')}${r.currency === 'USD' ? ' $' : " so'm"}</span>
      <span class="bp-tag">${r.tag === 'vip' ? 'VIP' : 'Oddiy'}</span>
    </div>
  `).join('');
  const moreNote = parsedBulkRows.length > PREVIEW_LIMIT
    ? `<p style="color:var(--muted);font-size:11.5px;margin:6px 0 0;">... va yana ${parsedBulkRows.length - PREVIEW_LIMIT} ta raqam (hammasi saqlanadi, faqat ko'rinishda qisqartirildi)</p>`
    : '';

  const unknownCount = parsedBulkRows.filter(r => !r.operator).length;
  bulkPreview.innerHTML = rowsHtml + moreNote + `
    <div class="confirm-row">
      <span>${parsedBulkRows.length} ta raqam topildi${unknownCount ? `, ${unknownCount} tasida operator aniqlanmadi` : ''}</span>
      <button id="bulkConfirmBtn">✓ Hammasini bazaga qo'shish</button>
    </div>
  `;

  document.getElementById('bulkConfirmBtn').addEventListener('click', saveBulkRows);
});

async function saveBulkRows(){
  const btn = document.getElementById('bulkConfirmBtn');
  btn.disabled = true;

  /* DUBLIKAT NAZORATI — ikki tomonlama:
       1) ro'yxatning O'Z ichida bir xil raqam ikki marta yozilgan bo'lsa;
       2) bazada allaqachon mavjud bo'lsa.
     Ikkala holatda ham o'sha qator O'TKAZIB YUBORILADI (butun ro'yxat
     rad etilmaydi), oxirida nechtasi o'tkazib yuborilgani aytiladi. */
  btn.textContent = 'Dublikatlar tekshirilmoqda...';
  const bor = await mavjudRaqamlarToplami();
  const kiritilgan = new Set();
  const otkazilgan = [];
  const yoziladi = [];
  parsedBulkRows.forEach(row => {
    const k = raqam9(row.number || row.raw);
    if(k.length !== 9){ otkazilgan.push((row.number || '') + ' — raqam noto\u2018g\u2018ri'); return; }
    if(kiritilgan.has(k)){ otkazilgan.push(row.number + ' — ro\u2018yxatda takrorlangan'); return; }
    if(bor.has(k)){ otkazilgan.push(row.number + ' — bazada allaqachon bor'); return; }
    kiritilgan.add(k);
    yoziladi.push(row);
  });

  if(!yoziladi.length){
    bulkPreview.innerHTML = '<p style="color:#E5484D;font-size:12.5px;">Birorta ham yangi raqam yo\u2018q \u2014 ' +
      otkazilgan.length + ' ta qator o\u2018tkazib yuborildi (hammasi bazada bor yoki takrorlangan).</p>';
    btn.disabled = false; btn.textContent = "\u2713 Hammasini bazaga qo'shish";
    return;
  }

  const CHUNK_SIZE = 400; // Firestore'da bitta batch uchun maksimal 500 — xavfsizlik uchun 400
  const chunks = [];
  for(let i = 0; i < yoziladi.length; i += CHUNK_SIZE){
    chunks.push(yoziladi.slice(i, i + CHUNK_SIZE));
  }

  try{
    for(let i = 0; i < chunks.length; i++){
      btn.textContent = `Saqlanmoqda... ${i + 1}/${chunks.length}`;
      const batch = db.batch();
      chunks[i].forEach(row=>{
        const ref = db.collection('numbers').doc();
        batch.set(ref, {
          /* Bazada raqam HAR DOIM bir xil ko'rinishda: "+998XXXXXXXXX".
             Ilgari bu yerga "+998 93 333-44-44" kabi bo'shliq va
             chiziqchali ko'rinish tushardi — bitta raqam ikki xil
             yozilib, qidiruv va solishtiruv chalkashardi. */
          number: '+998' + raqam9(row.number || row.raw),
          operator: row.operator || 'Beeline', // aniqlanmagan bo'lsa, keyin admin ro'yxatdan tuzatadi
          price: row.price,
          oldPrice: 0,
          onSale: false,
          currency: row.currency || 'UZS',
          tier: '',
          featured: false,
          /* Dollarlik raqamda bo'lib to'lash bo'lmaydi — hisob-kitob
             so'mda yuritiladi (bitta raqam qo'shishdagi qoida bilan bir xil). */
          installment: false,
          tag: row.tag,
          /* V79: band/yashirin/sotilgan belgilaringiz ALBATTA yoziladi —
             aks holda mijoz bu raqamga buyurtma bera olmaydi (yuqoridagi
             izohga qarang). */
          reserved: false,
          hidden: false,
          sold: false,
          last1: row.raw.slice(-1), last2: row.raw.slice(-2), last3: row.raw.slice(-3), last4: row.raw.slice(-4),
          addedAt: Date.now(),
          randomKey: Math.random()
        });
      });
      await batch.commit();
    }
    bulkText.value = '';
    bulkPreview.innerHTML =
      `<p style="color:var(--green);font-size:12.5px;margin:0 0 4px;">✓ ${yoziladi.length} ta raqam qo'shildi</p>` +
      (otkazilgan.length
        ? `<p style="color:var(--muted);font-size:11.5px;margin:0;">${otkazilgan.length} ta qator o'tkazib yuborildi (bazada bor yoki takrorlangan):<br>`
          + otkazilgan.slice(0, 12).map(escapeHtml).join('<br>')
          + (otkazilgan.length > 12 ? `<br>... va yana ${otkazilgan.length - 12} ta` : '') + '</p>'
        : '');
    vibrate(80);
    parsedBulkRows = [];
    refreshNumbers();
  }catch(err){
    alert('Bazaga yozishda xato: ' + err.message);
    btn.disabled = false;
    btn.textContent = "✓ Hammasini bazaga qo'shish";
  }
}
const adminOrdersList = document.getElementById('adminOrdersList');

const orderFilterTabsEl = document.getElementById('orderFilterTabs');
if(orderFilterTabsEl){
  orderFilterTabsEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.of-tab');
    if(!btn) return;
    orderStatusFilter = btn.dataset.status;
    orderFilterTabsEl.querySelectorAll('.of-tab').forEach(t => t.classList.toggle('active', t === btn));
    renderAdminOrders(currentOrdersCache);
  });
}

let ordersUnsubscribe = null;
let ordersFirstLoad = true;
// XAVFSIZLIK/TEZLIK: bu ro'yxat FONDA (admin qaysi bo'limda turishidan
// qat'i nazar) doim jonli tinglanadi — chunki qo'ng'iroq belgisi (bell
// badge) va yangi buyurtma bildirishnomasi doim ishlashi kerak. Lekin
// avval HAR safar yangi buyurtma kelganda (yoki har qanday buyurtma
// o'zgarganda) YUZLAB kartani to'liq qayta chizib yuborar edi — bu esa
// admin boshqa bo'limda (masalan AI chat yoki kredit formasida) matn
// kiritayotganda asosiy JS oqimini (main thread) bir lahzaga to'sib,
// klaviaturadan kiritilgan harflar ekranga "yopishib qolgandek" ko'rinar
// edi. Endi og'ir DOM qayta chizish FAQAT "Buyurtmalar" bo'limi haqiqatan
// ochiq bo'lgandagina ishlaydi — boshqa hollarda faqat kesh yangilanadi,
// keyin bo'limga kirilganda tayyor keshdan darhol chiziladi.
let ordersPaneVisible = false;

// XAVFSIZLIK/TEZLIK (davomi): oldingi tuzatishdan keyin ham ba'zi
// qurilmalarda (ayniqsa AI Yordamchi chatiga mobil klaviaturadan yozganda)
// "harflar yopishib qolgandek" bo'lish davom etardi — sababi:
// updateBellBadge/updateOverview/updateStatusCounts/checkOrderBacklog
// funksiyalari HAR safar buyurtmalar bazasida ozgina o'zgarish bo'lsa ham
// (bo'lim ochiq-yopiqligidan qat'i nazar) DARHOL ishlar edi. Bu — engil
// ko'rinsa-da, arzon Android telefonlarda aynan klaviatura bosilgan
// paytda asosiy JS oqimini bir zumga to'sib, ekranga chiqishi kerak bo'lgan
// harfni "kechiktirib" yuborishi mumkin. Endi: agar foydalanuvchi HOZIR
// istalgan matn maydoniga yozayotgan bo'lsa (isUserTyping — yuqorida,
// db e'lon qilingandan keyin butun sahifa darajasida kuzatiladi), bu
// yangilanish KECHIKTIRILADI — yozishni tugatgan zahoti (fokusdan
// chiqishi bilan) darhol qo'llaniladi. Yangi buyurtma ovoz/vibratsiya
// bildirishnomasi esa baribir DARHOL ishlaydi.
let pendingOrdersUpdate = null;
document.addEventListener('focusout', (e)=>{
  if(e.target && e.target.matches && e.target.matches('input, textarea') && pendingOrdersUpdate){
    applyOrdersUpdate(pendingOrdersUpdate);
    pendingOrdersUpdate = null;
  }
});

function applyOrdersUpdate(orders){
  updateBellBadge();
  updateOverview();
  updateStatusCounts(orders);
  if(ordersPaneVisible){ renderAdminOrders(orders); }
  checkOrderBacklog(orders);
}

function refreshOrders(){
  adminOrdersList.innerHTML = `<div class="empty-admin">Yuklanmoqda...</div>`;
  if(ordersUnsubscribe) ordersUnsubscribe();
  ordersFirstLoad = true;

  ordersUnsubscribe = db.collection('orders').orderBy('createdAtSort','desc')
    .onSnapshot(snap=>{
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      currentOrdersCache = orders;

      if(isUserTyping){
        pendingOrdersUpdate = orders;
      } else {
        applyOrdersUpdate(orders);
      }

      if(!ordersFirstLoad){
        snap.docChanges().forEach(change=>{
          if(change.type === 'added'){
            notifyNewOrder({ id: change.doc.id, ...change.doc.data() });
          }
        });
      }
      ordersFirstLoad = false;
    }, err=>{
      adminOrdersList.innerHTML = `<div class="empty-admin">Bazaga ulanishda xato. Firebase sozlamalarini tekshiring.</div>`;
      console.error(err);
    });
}

/* ---- Yangi buyurtma bildirishnomasi ---- */
/* "Ko'p buyurtma to'planib qoldi" ogohlantirishi — Netlify Function orqali,
   token bu yerda ko'rinmaydi (xavfsiz saqlanadi). */
const BACKLOG_THRESHOLD = 10;
let backlogAlertSent = false;

async function checkOrderBacklog(orders){
  const pendingCount = orders.filter(o => o.status === 'Yangi').length;
  if(pendingCount > BACKLOG_THRESHOLD && !backlogAlertSent){
    backlogAlertSent = true;
    sendBacklogTelegramAlert(pendingCount);
  }else if(pendingCount <= BACKLOG_THRESHOLD){
    backlogAlertSent = false; // keyingi safar yana chegaradan oshsa, qayta xabar boradi
  }
}
async function sendBacklogTelegramAlert(count){
  try{
    await fetch('/.netlify/functions/telegram-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({
        text: `⚠️ Diqqat! ${count} ta "Yangi" buyurtma to'planib qoldi. Admin panelga kirib ko'rib chiqing.`
      })
    });
  }catch(err){ console.error('Telegram ogohlantirishida xato:', err); }
}

function vibrate(pattern){
  if(navigator.vibrate){ navigator.vibrate(pattern); }
}
function playBeep(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  }catch(e){ /* ovoz chalinmasa ham muammo emas */ }
}
function notifyNewOrder(order){
  vibrate([200, 100, 200]);
  playBeep();
  if('Notification' in window && Notification.permission === 'granted'){
    new Notification('🔔 Yangi buyurtma — VIP Raqamlar', {
      body: `${order.number} — ${order.name} (${order.region})`
    });
  }
}
if('Notification' in window && Notification.permission === 'default'){
  Notification.requestPermission();
}

function statusClass(status){
  if(status === "Bog'lanildi") return 'st-boglanildi';
  if(status === "Yo'lda") return 'st-yolda';          /* V122 */
  if(status === 'Bekor qilindi') return 'st-bekor';
  if(status === 'Yakunlandi') return 'st-yakunlandi';
  return 'st-yangi';
}

function updateStatusCounts(orders){
  const counts = { 'Yangi':0, "Bog'lanildi":0, 'Yakunlandi':0, 'Bekor qilindi':0 };
  orders.forEach(o => { if(counts[o.status] !== undefined) counts[o.status]++; else counts['Yangi']++; });
  const cntBarchasiEl = document.getElementById('cntBarchasi');
  if(cntBarchasiEl) cntBarchasiEl.textContent = orders.length;
  document.getElementById('cntYangi').textContent = counts['Yangi'];
  document.getElementById('cntBoglanildi').textContent = counts["Bog'lanildi"];
  document.getElementById('cntYakunlandi').textContent = counts['Yakunlandi'];
  document.getElementById('cntBekor').textContent = counts['Bekor qilindi'];
}

function renderAdminOrders(orders){
  updateStatusCounts(orders);

  const filtered = orderStatusFilter === 'all'
    ? orders
    : orders.filter(o => (o.status || 'Yangi') === orderStatusFilter);

  if(filtered.length === 0){
    adminOrdersList.innerHTML = `<div class="empty-admin">${orders.length === 0 ? "Hali buyurtma tushmagan." : "Bu holatda buyurtma yo'q."}</div>`;
    return;
  }
  adminOrdersList.innerHTML = filtered.map(o => `
    <div class="admin-row-collapsed order-card oc-wrap ${statusClass(o.status)}" data-id="${o.id}">
      <div class="an-summary oc-summary-grid" data-id="${o.id}">
        <div class="oc-avatar">${dashInitials(o.name)}</div>
        <div class="oc-main-info">
          <span class="an-summary-num">${buyurtmaRaqami(o.number)
            ? escapeHtml(buyurtmaRaqami(o.number))
            : '<i class="oc-nonum">Raqam ko\'rsatilmagan</i>'}</span>
          <span class="oc-summary-name">${escapeHtml(o.name)}</span>
        </div>
        <span class="oc-pay-chip ${o.paymentType === 'installment' ? 'oc-pay-installment' : 'oc-pay-cash'}">
          ${o.paymentType === 'installment' ? `💳 ${escapeHtml(o.installmentMonths || '')} oy` : '💵 Naqd'}
        </span>
        <span class="oc-price-cell">${o.price ? formatPrice(o.price) + (o.currency === 'USD' ? ' $' : '') : ''}</span>
        <span class="oc-status-badge ${statusClass(o.status)}">${escapeHtml(o.status || 'Yangi')}</span>
        <span class="oc-time-cell">${relativeTimeUz(o.createdAtSort)}</span>
        <span class="an-summary-arrow">▾</span>
      </div>
      <div class="an-body" style="display:none;">
        <div class="oc-body-inner">
          <div class="oc-top">
            <span class="oc-time">${escapeHtml(o.createdAt || '')}</span>
          </div>
          <div class="oc-row"><b>Ism:</b> ${escapeHtml(o.name)}</div>
          <div class="oc-row"><b>Viloyat:</b> ${escapeHtml(o.region)}</div>
          <div class="oc-row"><b>Telefon:</b> ${escapeHtml(o.phone)}</div>
          <div class="oc-row"><b>Narxi:</b> ${o.price ? formatPrice(o.price) + (o.currency === 'USD' ? ' $' : " so'm") : "Noma'lum"}</div>
          ${o.paymentType === 'installment'
            ? `<div class="oc-row" style="color:var(--amber);"><b>💳 To'lov:</b> Bo'lib to'lash — ${escapeHtml(o.installmentMonths)} oyga, oyiga ${formatPrice(o.monthlyPayment || 0)}dan</div>`
            : ''}
          ${o.installmentDownPayment !== undefined
            ? `<div class="oc-row" style="color:var(--amber);"><b>💰 Bosh to'lov:</b> ${formatPrice(o.installmentDownPayment)}${o.installmentTariff ? ' &middot; 📶 Tarif: ' + escapeHtml(o.installmentTariff) : ''}</div>`
            : ''}
          ${o.cashTariffName
            ? `<div class="oc-row" style="color:var(--amber);"><b>📶 Tarif:</b> ${escapeHtml(o.cashTariffName)} (${formatPrice(o.cashTariffPrice || 0)}/oy)</div>`
            : ''}
          ${o.location && typeof o.location.lat === 'number' && typeof o.location.lng === 'number'
            ? `<div class="oc-row"><a class="oc-map-link" href="${buildYandexGoLink(o.location.lat, o.location.lng)}" target="_blank" rel="noopener">🗺️ Xaritaga o'tish (Yandex Go)</a></div>`
            : ''}
          <div class="oc-row"><b>Qayerdan:</b> ${escapeHtml(o.source || 'Sayt')}</div>
          <select class="order-status">
            ${ORDER_STATUSES.map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `).join('');

  adminOrdersList.querySelectorAll('.an-summary').forEach(summary=>{
    summary.addEventListener('click', ()=>{
      const wrap = summary.closest('.admin-row-collapsed');
      const body = wrap.querySelector('.an-body');
      const arrow = summary.querySelector('.an-summary-arrow');
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      arrow.textContent = isOpen ? '▾' : '▴';
      wrap.classList.toggle('an-open', !isOpen);
    });
  });

  adminOrdersList.querySelectorAll('.order-status').forEach(sel=>{
    sel.addEventListener('click', e=> e.stopPropagation());
    sel.addEventListener('change', async ()=>{
      const card = sel.closest('.order-card');
      const id = card.dataset.id;
      const newStatus = sel.value;
      card.className = 'admin-row-collapsed order-card oc-wrap an-open ' + statusClass(newStatus);
      const badge = card.querySelector('.oc-status-badge');
      if(badge){ badge.className = 'oc-status-badge ' + statusClass(newStatus); badge.textContent = newStatus; }
      vibrate(80);

      const cached = currentOrdersCache.find(o => o.id === id);
      if(cached) cached.status = newStatus;
      updateStatusCounts(currentOrdersCache);

      try{
        /* V122: holat o'zgargan VAQT ham yoziladi — mijoz kabinetida
           "qachon" ko'rsatiladi va qaysi bosqichda qancha turgani
           bilinadi. */
        await db.collection('orders').doc(id).update({ status: newStatus, statusAt: Date.now() });

        const numberId = cached ? cached.numberId : null;
        if(numberId){
          if(newStatus === 'Bekor qilindi'){
            // Buyurtma bekor qilindi — raqam yana sotuvga qaytadi
            await db.collection('numbers').doc(numberId).update({
              reserved: false,
              reservedAt: firebase.firestore.FieldValue.delete()
            });
          }else if(newStatus === 'Yakunlandi'){
            // Sotib bo'lindi — raqam bazadan butunlay olib tashlanadi
            await db.collection('numbers').doc(numberId).delete();
            refreshNumbers();
          }
          // "Yangi" va "Bog'lanildi" holatlarida raqam hamon band bo'lib qoladi
        }

        // Agar bu buyurtma Telegram bot orqali kelgan bo'lsa, mijozga ham xabar boradi
        if(cached && cached.customerChatId){
          const idToken = await firebase.auth().currentUser.getIdToken();
          fetch('/.netlify/functions/notify-customer-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
            body: JSON.stringify({ chatId: cached.customerChatId, number: cached.number, status: newStatus })
          }).catch(()=>{ /* mijoz bildirishnomasi ishlamasa ham, status baribir yangilangan */ });
        }

        // Admin Telegram xabaridagi tugmalarni ham "tasdiqlangan" holatga o'tkazamiz
        if(cached && cached.adminMessageId){
          const idToken2 = await firebase.auth().currentUser.getIdToken();
          fetch('/.netlify/functions/update-admin-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken2 },
            body: JSON.stringify({ messageId: cached.adminMessageId, statusLabel: newStatus })
          }).catch(()=>{ /* muhim emas */ });
        }
      }catch(err){ alert('Holatni yangilashda xato: ' + err.message); }
    });
  });
}


/* ==================================================================
   TELEFON KO'RINISHI — PASTKI MENYU va BO'LIM KARTOCHKALARI
   ------------------------------------------------------------------
   Telefonda (900px dan tor ekran) pastda ilovadagidek BESHTA bo'lim
   turadi. Bittasiga bosilsa — guruhdagi bo'limlar kartochka bo'lib
   chiqadi; kartochkaga bosilsa bo'limning o'zi ochiladi.

   QANDAY ISHLAYDI: kartochka bosilganda eski yon menyudagi O'SHA
   tugmaning `click()` i chaqiriladi. Ya'ni bu qatlam panelning
   mantiqiga umuman tegmaydi — ruxsatlar, sonlar, yuklash, hammasi
   avvalgiday. Kompyuterda bu kod ishga ham tushmaydi.

   BO'LIMLARNI BOSHQA GURUHGA KO'CHIRISH: faqat quyidagi `MOBIL_GURUH`
   jadvalidagi nomni ko'chirib qo'ying — boshqa hech narsa kerak emas.
   ================================================================== */
(function(){
  const MQ = window.matchMedia('(max-width:900px)');

  const IC = {
    asosiy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5.5 10v9.5h13V10"/></svg>',
    tolov:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.5h18"/><path d="M7 15h4"/></svg>',
    buyurtma:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"/><path d="M4 7.5 12 11l8-3.5M12 11v9"/></svg>',
    stat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    profil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.2" r="3.8"/><path d="M4.5 20c.9-3.8 3.9-5.8 7.5-5.8s6.6 2 7.5 5.8"/></svg>'
  };

  const MOBIL_GURUH = [
    { id:'asosiy',   nom:'Asosiy',      yorliq:'Asosiy',   izoh:'Kundalik ish: raqamlar va kuzatuv',
      tabs:['dashboard','numbers','bazaraqam','uzex','watch','kuntavsiyasi','aksiya'] },
    { id:'tolov',    nom:"To'lovlar",   yorliq:"To'lov",   izoh:"Pul bilan bog'liq barcha bo'limlar",
      tabs:['tolov','credit','finance','personalbase'] },
    { id:'buyurtma', nom:'Buyurtmalar', yorliq:'Buyurtma', izoh:'Mijoz va hamkorlar bilan ish',
      tabs:['orders','zakaz','sellers','vakansiya'] },
    { id:'stat',     nom:'Statistika',  yorliq:'Hisobot',  izoh:'Hisobotlar, vazifalar va AI',
      tabs:['stats','sessions','vazifalar','ai','telegramai','instagram'] },
    { id:'profil',   nom:'Profil',      yorliq:'Profil',   izoh:'Sozlamalar, kontent va boshqaruv',
      tabs:['settings','management','operators','styles','xabarlar','stories','videos'] }
  ];

  /* Har bir bo'lim nima uchun kerakligi — kartochkada bitta qatorda
     yoziladi. Katta kompaniyalarning panellarida menyu faqat nom
     emas, NIMA QILISHINI ham aytadi: yangi xodim ham adashmaydi. */
  const BOLIM_IZOH = {
    dashboard:'Kunlik ko\u2018rsatkichlar', numbers:'Sotuvdagi raqamlar',
    bazaraqam:'Operator bazasidan qidirish', uzex:'Auksion raqamlari',
    watch:'Raqamni kuzatib borish', kuntavsiyasi:'Bosh sahifadagi taklif',
    aksiya:'Chegirmalar va muddat',
    tolov:'Mijoz to\u2018lovlari va eslatma', credit:'Bo\u2018lib to\u2018lash shartnomalari',
    finance:'Kirim-chiqim hisobi', personalbase:'Shaxsiy mijozlar bazasi',
    orders:'Saytdan kelgan buyurtmalar', zakaz:'Qo\u2018lda kiritilgan zakazlar',
    sellers:'Dilerlar va ularning tarifi', vakansiya:'Ish o\u2018rinlari va arizalar',
    stats:'Ko\u2018rishlar va qidiruvlar', sessions:'Kim, qachon kirgan',
    vazifalar:'Dedlayn va topshiriqlar', ai:'Savol bering, hisobot oling',
    telegramai:'Telegram bot javoblari', instagram:'Instagram javoblari',
    settings:'Sayt sozlamalari', management:'Adminlar va ruxsatlar',
    operators:'Operator narx jadvali', styles:'Sayt ko\u2018rinishi',
    xabarlar:'Mijozlarga bildirishnoma', videos:'Mijoz sharhlari',
    videos:'Sotilgan raqamlar videosi'
  };

  let JORIY = 'asosiy';
  let nav, grid, back;

  const tabTugma = (k) => document.querySelector('.tab[data-tab="' + k + '"]');
  /* Ruxsati yo'q bo'lim yon menyuda yashirilgan — kartochkada ham
     ko'rinmasligi kerak. Ruxsat mantiqi (applyAccessControl) tugmaga
     `style.display='none'` qo'yadi, shu sabab AYNAN shu tekshiriladi
     (`offsetParent` emas: yon menyu telefonda chetga surilgan bo'ladi
     va u holda hamma tugma "ko'rinmaydi" bo'lib chiqardi). */
  const korinadimi = (btn) => !!btn && btn.style.display !== 'none';

  function qur(){
    const mc = document.querySelector('.main-content');
    if(!mc || document.getElementById('mnav')) return;

    grid = document.createElement('div');
    grid.id = 'mgrid';
    /* Kartochkalar yuqoridagi qator (topbar) dan KEYIN tursin */
    const tbar = mc.querySelector('.topbar');
    if(tbar && tbar.nextSibling) mc.insertBefore(grid, tbar.nextSibling);
    else mc.appendChild(grid);

    nav = document.createElement('nav');
    nav.id = 'mnav';
    nav.setAttribute('aria-label', 'Asosiy menyu');
    nav.innerHTML = '<span class="mn-pill" id="mnPill" aria-hidden="true"></span>' +
      MOBIL_GURUH.map(g =>
        '<button type="button" data-g="' + g.id + '" aria-label="' + g.nom + '">' + IC[g.id] +
        '<b>' + (g.yorliq || g.nom) + '</b>' +
        '<i class="mn-nb" data-nb="' + g.id + '" hidden>0</i></button>').join('');
    document.body.appendChild(nav);

    nav.querySelectorAll('button').forEach(b => b.addEventListener('click', ()=> guruhOch(b.dataset.g)));

    // Yuqoridagi "orqaga" tugmasi — kartochkalar ro'yxatiga qaytaradi
    back = document.createElement('button');
    back.id = 'mback'; back.type = 'button'; back.setAttribute('aria-label','Orqaga');
    back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
    back.addEventListener('click', ()=> guruhOch(JORIY));
    const tb = document.querySelector('.topbar');
    if(tb) tb.insertBefore(back, tb.firstChild);
  }

  /* ==================================================================
     BO'LIM KARTOCHKALARI
     ------------------------------------------------------------------
     Katta kompaniyalarning panellarida menyu uch narsani beradi:
       1. QIDIRUV — 28 ta bo'limni aylantirib o'tirmaysiz, nomini
          yozasiz (hamma guruhdan birdan qidiradi);
       2. TEZ-TEZ ISHLATILADIGAN — eng ko'p ochiladigan 4 ta bo'lim
          doim eng tepada (telefonda o'zi saqlanadi);
       3. IZOH — har bir kartochkada "bu nima uchun" degan bitta
          qator, shunda yangi xodim ham adashmaydi.
     ================================================================== */
  const SON_KALIT = 'vip_adm_bolim_soni';
  function sonlarOqi(){
    try{ return JSON.parse(localStorage.getItem(SON_KALIT) || '{}') || {}; }catch(e){ return {}; }
  }
  function sonOshir(tab){
    try{
      const d = sonlarOqi(); d[tab] = (d[tab] || 0) + 1;
      localStorage.setItem(SON_KALIT, JSON.stringify(d));
    }catch(e){}
  }
  function tezTez(){
    const d = sonlarOqi();
    return Object.keys(d)
      .filter(k => korinadimi(tabTugma(k)))
      .sort((a, b) => d[b] - d[a]).slice(0, 4);
  }

  function kartaHtml(k){
    const btn = tabTugma(k);
    if(!korinadimi(btn)) return '';
    const ico = (btn.querySelector('.tab-ico') || {}).innerHTML || '';
    const nom = ((btn.querySelector('.tab-label') || {}).textContent || k).trim();
    const bdg = btn.querySelector('.task-tab-badge, .tab-count.is-alert');
    const son = (bdg && bdg.style.display !== 'none' && !bdg.hidden) ? (bdg.textContent || '').trim() : '';
    const izoh = BOLIM_IZOH[k] || '';
    return '<button type="button" class="mg-card" data-mt="' + k + '">' +
      (son && son !== '0' ? '<span class="mg-badge">' + son + '</span>' : '') +
      '<span class="mg-ico">' + ico + '</span>' +
      '<span class="mg-txt"><span class="mg-nom">' + nom + '</span>' +
        (izoh ? '<span class="mg-izoh">' + izoh + '</span>' : '') + '</span></button>';
  }

  function qidiruvHtml(){
    return '<div class="mg-search">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
      '<input id="mgQ" type="search" placeholder="Bo‘lim qidirish…" autocomplete="off" ' +
      'autocapitalize="off" spellcheck="false" value="' + (QIDIRUV || '') + '">' +
      (QIDIRUV ? '<button type="button" class="mg-x" id="mgX" aria-label="Tozalash">&#10005;</button>' : '') +
      '</div>';
  }

  let QIDIRUV = '';

  /* Guruh kartochkalarini chizish */
  function guruhOch(gid){
    const g = MOBIL_GURUH.find(x => x.id === gid) || MOBIL_GURUH[0];
    const almash = (g.id !== JORIY);        // boshqa guruhga o'tilyaptimi
    JORIY = g.id;
    QIDIRUV = '';                           // menyu bosilsa qidiruv tozalanadi
    chizGrid();

    // Bo'limlarni yashirib, kartochkalarni ko'rsatamiz
    document.querySelectorAll('.pane').forEach(x => x.classList.remove('active'));
    /* Menyudan BOSHQA guruhga o'tilsa — o'ngdan, bo'lim ichidan
       "orqaga" qaytilsa — chapdan suriladi (Instagram kabi). */
    const mc = document.querySelector('.main-content');
    if(mc){
      mc.classList.toggle('m-almash', almash);
      grid.classList.remove('on');
      void grid.offsetWidth;                 // animatsiya qayta boshlansin
    }
    grid.classList.add('on');
    back.classList.remove('on');
    belgila();
    window.scrollTo({ top:0 });
  }

  function chizGrid(){
    const g = MOBIL_GURUH.find(x => x.id === JORIY) || MOBIL_GURUH[0];
    let h = qidiruvHtml();

    if(QIDIRUV){
      /* --- QIDIRUV: hamma guruhdan birdan --- */
      const q = QIDIRUV.toLowerCase();
      const topildi = [];
      MOBIL_GURUH.forEach(gr => gr.tabs.forEach(k => {
        const btn = tabTugma(k);
        if(!korinadimi(btn)) return;
        const nom = ((btn.querySelector('.tab-label') || {}).textContent || k).toLowerCase();
        if(nom.indexOf(q) !== -1 || (BOLIM_IZOH[k] || '').toLowerCase().indexOf(q) !== -1) topildi.push(k);
      }));
      h += '<div class="mg-h">Qidiruv</div>' +
        '<div class="mg-s">' + (topildi.length ? topildi.length + ' ta bo‘lim topildi' : 'Hech narsa topilmadi') + '</div>' +
        '<div class="mg-grid">' + topildi.map(kartaHtml).join('') + '</div>';
    }else{
      const tez = (JORIY === 'asosiy') ? tezTez() : [];
      if(tez.length >= 2){
        h += '<div class="mg-h sm">Tez-tez ishlatiladigan</div>' +
             '<div class="mg-grid">' + tez.map(kartaHtml).join('') + '</div>';
      }
      const kartalar = g.tabs.map(kartaHtml).join('');
      h += '<div class="mg-h">' + g.nom + '</div>' +
           '<div class="mg-s">' + g.izoh + '</div>' +
           '<div class="mg-grid">' + (kartalar ||
             '<div class="empty-admin">Bu guruhda sizga ruxsat etilgan bo‘lim yo‘q.</div>') + '</div>';
    }

    grid.innerHTML = h;

    grid.querySelectorAll('[data-mt]').forEach(c => c.addEventListener('click', ()=>{
      const k = c.dataset.mt;
      sonOshir(k);
      const b = tabTugma(k);
      if(b) b.click();
      bolimKorsat();
    }));

    const q = grid.querySelector('#mgQ');
    if(q){
      let t;
      q.addEventListener('input', ()=>{
        clearTimeout(t);
        const v = q.value;
        t = setTimeout(()=>{
          QIDIRUV = v.trim();
          const joy = q.selectionStart;
          chizGrid();
          const yangi = grid.querySelector('#mgQ');
          if(yangi){ yangi.focus(); try{ yangi.setSelectionRange(joy, joy); }catch(e){} }
        }, 160);
      });
    }
    const x = grid.querySelector('#mgX');
    if(x) x.addEventListener('click', ()=>{ QIDIRUV = ''; chizGrid(); });
  }

  /* Kartochka bosildi — bo'lim ochildi (o'ngdan suriladi) */
  function bolimKorsat(){
    const mc = document.querySelector('.main-content');
    if(mc){ mc.classList.add('m-oldinga'); setTimeout(()=> mc.classList.remove('m-oldinga'), 260); }
    if(grid) grid.classList.remove('on');
    if(back) back.classList.add('on');
    window.scrollTo({ top:0 });
  }

  /* Guruhdagi bo'limlarning qizil sonlarini qo'shib, pastki menyuga
     chiqaradi — telefonda "qayerda yangi ish bor" darhol ko'rinadi. */
  function sonlar(){
    MOBIL_GURUH.forEach(g => {
      let n = 0;
      g.tabs.forEach(k => {
        const btn = tabTugma(k);
        if(!korinadimi(btn)) return;
        btn.querySelectorAll('.task-tab-badge, .tab-count.is-alert').forEach(x => {
          if(x.style.display === 'none' || x.hidden) return;
          n += Number(String(x.textContent || '').replace(/\D/g, '')) || 0;
        });
      });
      const el = nav.querySelector('[data-nb="' + g.id + '"]');
      if(el){ el.textContent = n > 99 ? '99+' : n; el.hidden = !(n > 0); }
    });
  }

  function belgila(){
    sonlar();
    nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.g === JORIY));
    const on = nav.querySelector('button.on'), pill = document.getElementById('mnPill');
    if(on && pill){
      const r = on.getBoundingClientRect(), nr = nav.getBoundingClientRect();
      pill.style.width = r.width + 'px';
      pill.style.transform = 'translateX(' + (r.left - nr.left) + 'px)';
      pill.classList.add('on');
    }
  }

  /* Yon menyudan (yoki kod ichidan) bo'lim ochilsa — pastki menyu
     ham o'sha guruhga o'tsin, "orqaga" tugmasi to'g'ri ishlasin. */
  function tabKuzat(){
    document.querySelectorAll('.tab[data-tab]').forEach(b => b.addEventListener('click', ()=>{
      if(!MQ.matches) return;
      const k = b.dataset.tab;
      const g = MOBIL_GURUH.find(x => x.tabs.indexOf(k) !== -1);
      if(g) JORIY = g.id;
      setTimeout(()=>{ bolimKorsat(); belgila(); }, 0);
    }, true));
  }

  function boshla(){
    if(!MQ.matches) return;
    if(!kirganmi()) return;              // login qilinmagan — menyu chiqmaydi
    qur();
    if(!nav) return;
    tabKuzat();
    klaviatura();
    JORIY = 'asosiy';
    // Boshida boshqaruv paneli ochiq turadi, "orqaga" bossa kartochkalar
    belgila();
    bolimKorsat();
  }

  /* KLAVIATURA OCHILGANDA PASTKI MENYU YASHIRINADI.
     iPhone'da pastda turgan "fixed" panel klaviatura chiqqanda
     maydonning ustini yopib qo'yishi mumkin — odam yozayotganini
     ko'rmaydi va "yozib bo'lmayapti" deb o'ylaydi. Shu sabab matn
     maydoniga kirilganda menyu vaqtincha olib turiladi. */
  function klaviatura(){
    const matnmi = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
                                  el.tagName === 'SELECT' || el.isContentEditable);
    document.addEventListener('focusin', (e)=>{
      if(MQ.matches && nav && matnmi(e.target)) nav.style.display = 'none';
    });
    document.addEventListener('focusout', ()=>{
      if(!nav) return;
      setTimeout(()=>{ if(!matnmi(document.activeElement)) nav.style.display = ''; }, 60);
    });
  }

  /* MENYU FAQAT LOGIN QILINGANDAN KEYIN CHIQADI.
     Ilgari u sahifa ochilishi bilan paydo bo'lardi — ya'ni login
     ekranining pastida menyu turardi. Endi `#dashboard` ko'rinmaguncha
     (login va ruxsat tekshiruvi tugamaguncha) menyu umuman
     yaratilmaydi; chiqilganda esa olib tashlanadi. */
  function kirganmi(){
    const d = document.getElementById('dashboard');
    return !!d && getComputedStyle(d).display !== 'none';
  }
  function ochir(){
    if(nav){ nav.remove(); nav = null; }
    if(grid){ grid.remove(); grid = null; }
    if(back){ back.remove(); back = null; }
  }
  /* `#dashboard` ko'rinishi o'zgarishini kuzatamiz — login bo'lganda
     menyu o'zi paydo bo'ladi, chiqilganda o'zi yo'qoladi. */
  function kuzat(){
    const d = document.getElementById('dashboard');
    if(!d) return;
    let oxirgi = kirganmi();
    try{
      new MutationObserver(()=>{
        const hozir = kirganmi();
        if(hozir === oxirgi) return;
        oxirgi = hozir;
        if(hozir) boshla(); else ochir();
      }).observe(d, { attributes:true, attributeFilter:['style','class'] });
    }catch(e){}
  }

  function ishgaTushir(){ kuzat(); boshla(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ishgaTushir);
  else ishgaTushir();
  window.addEventListener('resize', ()=>{ if(MQ.matches && nav) belgila(); });
  /* Kompyuterdan telefon o'lchamiga o'tilsa (ekran burilishi, oynani
     kichraytirish) — menyu o'sha payt quriladi. */
  try{ MQ.addEventListener('change', (e)=>{ if(e.matches && !nav) boshla(); }); }catch(e){}
})();

document.addEventListener('copy', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

/* ==================================================================
   XABAR LAVHASI (toast)
   Amal bajarilganini bilish uchun avval ro'yxat yangilanishini kutish
   kerak edi. Endi qisqa tasdiq chiqadi — bosdim-u, bo'ldimi degan
   noaniqlik qolmaydi.
   ================================================================== */
/* ==================================================================
   BILDIRISHNOMA (TOAST) — V112
   ------------------------------------------------------------------
   Ilgari: pastda, kulrang to'rtburchak, bitta qator matn, 2.6 soniya.
   Hech qanday sarlavha, amal tugmasi, ovoz yoki vaqt ko'rsatkichi yo'q
   edi — ya'ni muhim xabar (yangi buyurtma) bilan oddiy "saqlandi"
   xabari bir xil ko'rinardi.

   Endi:
     * yuqori o'ng burchakdan chiqadi (mobil ekranda — yuqoridan);
     * turiga qarab rang va belgi: muvaffaqiyat / xato / ogohlantirish /
       ma'lumot; muhim xabar uchun alohida "oltin" turi;
     * sarlavha + matn, amal tugmasi ("Ko'rish" kabi);
     * pastida vaqt chizig'i — qachon o'chishi ko'rinib turadi;
     * ustiga sichqoncha kelsa — hisob TO'XTAYDI (o'qib ulgurasiz);
     * OVOZ: har bir tur uchun qisqa, yoqimli signal. Hech qanday audio
       fayl yuklanmaydi — ovoz brauzerning o'zida (WebAudio) hosil
       qilinadi, ya'ni internet ham, qo'shimcha fayl ham kerak emas.
       Yuqoridagi karnay tugmasi bilan o'chiriladi (tanlov eslanadi).
     * `prefers-reduced-motion` yoqilgan bo'lsa animatsiya o'chadi.
   ================================================================== */
const PT_OVOZ_KALIT = 'vr_toast_ovoz';
let PT_OVOZ_YOQ = false;
try{ PT_OVOZ_YOQ = localStorage.getItem(PT_OVOZ_KALIT) === '0'; }catch(e){}

let PT_AUDIO = null;
function ptAudio(){
  if(PT_AUDIO) return PT_AUDIO;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    PT_AUDIO = new AC();
  }catch(e){ return null; }
  return PT_AUDIO;
}
/* Brauzerlar ovozni FOYDALANUVCHI biror narsa bosmaguncha ishlatishga
   ruxsat bermaydi. Shu sabab birinchi bosishda kontekstni "uyg'otamiz". */
['pointerdown','keydown'].forEach(t => document.addEventListener(t, function uygot(){
  const a = ptAudio();
  if(a && a.state === 'suspended') a.resume().catch(()=>{});
  document.removeEventListener(t, uygot);
}, { once: true }));

/* Har bir tur uchun ikki notali qisqa signal (ohang). Bu — "katta
   xizmatlar"dagi bildirishnoma ovozining soddalashtirilgan ko'rinishi:
   past nota, so'ng baland nota, yumshoq so'nish bilan. */
const PT_OHANG = {
  ok:    [[660, 0], [990, 0.09]],
  info:  [[520, 0], [780, 0.09]],
  warn:  [[500, 0], [500, 0.13]],
  err:   [[400, 0], [300, 0.11]],
  muhim: [[784, 0], [1047, 0.08], [1319, 0.17]]
};
function ptOvoz(turi){
  if(PT_OVOZ_YOQ) return;
  const a = ptAudio();
  if(!a || a.state !== 'running') return;
  const ohang = PT_OHANG[turi] || PT_OHANG.ok;
  const t0 = a.currentTime;
  ohang.forEach(([chastota, kechikish])=>{
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = 'sine';
    osc.frequency.value = chastota;
    /* Yumshoq kirish va so'nish — "chirt" etgan ovoz bo'lmasin */
    gain.gain.setValueAtTime(0.0001, t0 + kechikish);
    gain.gain.exponentialRampToValueAtTime(0.085, t0 + kechikish + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + kechikish + 0.26);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(t0 + kechikish);
    osc.stop(t0 + kechikish + 0.28);
  });
}

const PT_ICO = {
  ok:    '<path d="M20 6L9 17l-5-5"/>',
  err:   '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>',
  info:  '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warn:  '<path d="M12 4l9 16H3l9-16z"/><path d="M12 10v4M12 17h.01"/>',
  muhim: '<path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8 6.6 19.7l1.2-6.1L3.3 9.4l6.1-.8L12 3z"/>'
};
const PT_SARLAVHA = {
  ok: 'Bajarildi', err: 'Xato', info: "Ma'lumot", warn: 'Diqqat', muhim: 'Muhim'
};

/**
 * @param {string} matn
 * @param {string} [turi]  ok | err | info | warn | muhim
 * @param {object} [opt]   { sarlavha, davomiylik, amal:{matn, ish} }
 */
function panelToast(matn, turi, opt){
  const t = PT_ICO[turi] ? turi : 'ok';
  const o = opt || {};
  const davomiylik = Math.max(1500, Number(o.davomiylik) || (t === 'err' || t === 'muhim' ? 6000 : 3600));

  let wrap = document.querySelector('.pt-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.className = 'pt-wrap';
    document.body.appendChild(wrap);
  }

  const el = document.createElement('div');
  el.className = 'pt pt-' + t;
  el.setAttribute('role', t === 'err' ? 'alert' : 'status');
  el.innerHTML =
      '<span class="pt-ico"><svg viewBox="0 0 24 24">' + PT_ICO[t] + '</svg></span>'
    + '<span class="pt-body"><b class="pt-sarlavha"></b><span class="pt-matn"></span></span>'
    + (o.amal && o.amal.matn ? '<button type="button" class="pt-amal"></button>' : '')
    + '<button type="button" class="pt-yop" aria-label="Yopish">'
    + '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
    + '<span class="pt-vaqt"><i></i></span>';
  el.querySelector('.pt-sarlavha').textContent = o.sarlavha || PT_SARLAVHA[t];
  el.querySelector('.pt-matn').textContent = matn;
  if(o.amal && o.amal.matn){
    const ab = el.querySelector('.pt-amal');
    ab.textContent = o.amal.matn;
    ab.addEventListener('click', (e)=>{
      e.stopPropagation();
      try{ o.amal.ish && o.amal.ish(); }catch(err){}
      yop();
    });
  }

  /* Bir vaqtda 4 tadan ko'p turmasin — eng eskisi ketadi */
  while(wrap.children.length >= 4) wrap.firstElementChild.remove();
  wrap.appendChild(el);

  /* Vaqt chizig'i: animatsiya orqali (protsessor band bo'lmaydi) */
  const chiziq = el.querySelector('.pt-vaqt i');
  chiziq.style.animationDuration = davomiylik + 'ms';

  let timer = setTimeout(yop, davomiylik);
  let yopilmoqda = false;
  function yop(){
    if(yopilmoqda) return;
    yopilmoqda = true;
    clearTimeout(timer);
    if(!el.isConnected) return;
    el.classList.add('pt-ketmoqda');
    setTimeout(()=> el.remove(), 260);
  }
  el.querySelector('.pt-yop').addEventListener('click', (e)=>{ e.stopPropagation(); yop(); });

  /* Ustiga kelganda hisob to'xtaydi — uzun matnni o'qib ulgurish uchun */
  el.addEventListener('pointerenter', ()=>{
    clearTimeout(timer);
    chiziq.style.animationPlayState = 'paused';
  });
  el.addEventListener('pointerleave', ()=>{
    if(yopilmoqda) return;
    chiziq.style.animationPlayState = 'running';
    timer = setTimeout(yop, 1800);
  });

  /* Surib yuborish — butun saytdagi bir xil imo-ishora */
  if(typeof surishBogla === 'function'){
    surishBogla(el, {
      yon: 'ong',
      toxtat: ()=> { clearTimeout(timer); chiziq.style.animationPlayState = 'paused'; },
      davom:  ()=> { chiziq.style.animationPlayState = 'running'; timer = setTimeout(yop, 1800); },
      yopish: ()=> el.remove()
    });
  }

  ptOvoz(t);
  return { yop };
}
window.panelToast = panelToast;

/* Karnay tugmasi — ovozni yoqish/o'chirish */
(function ptOvozTugma(){
  const btn = document.getElementById('ptOvozBtn');
  if(!btn) return;
  const chiz = ()=>{
    btn.querySelector('.pt-ovoz-on').style.display  = PT_OVOZ_YOQ ? 'none' : '';
    btn.querySelector('.pt-ovoz-off').style.display = PT_OVOZ_YOQ ? '' : 'none';
    btn.classList.toggle('ochiq', !PT_OVOZ_YOQ);
    btn.title = PT_OVOZ_YOQ ? "Bildirishnoma ovozi: o'chiq" : 'Bildirishnoma ovozi: yoniq';
  };
  chiz();
  btn.addEventListener('click', ()=>{
    PT_OVOZ_YOQ = !PT_OVOZ_YOQ;
    try{ localStorage.setItem(PT_OVOZ_KALIT, PT_OVOZ_YOQ ? '0' : '1'); }catch(e){}
    chiz();
    if(!PT_OVOZ_YOQ){
      const a = ptAudio();
      if(a && a.state === 'suspended') a.resume().catch(()=>{});
      panelToast('Bildirishnoma ovozi yoqildi', 'ok');
    }
  });
})();

/* ==================================================================
   BILDIRISHNOMALAR MARKAZI
   Uch manbadan yig'adi: yangi buyurtmalar, kechikkan kredit to'lovlari
   va muddati yaqinlashgan vazifalar. Har biri bosilsa kerakli bo'limni
   ochadi. Ma'lumot allaqachon xotirada turgan ro'yxatlardan olinadi —
   qo'shimcha so'rov yuborilmaydi.
   ================================================================== */
(function bildirishnomalar(){
  /* `let` bilan e'lon qilingan o'zgaruvchilar window obyektiga tushmaydi,
     shuning uchun ularga shu yerda ko'prik quramiz.
     XAVFSIZLIK (V75): ilgari bu ko'prik `eval(nom)` orqali ishlardi.
     Hozirgi chaqiruvlarda nom qotirib yozilgan bo'lsa ham, panel
     ichida TIRIK `eval` turishi — xavfsizlik nuqtai nazaridan eng
     yomon odat (kelajakda biror joyda unga tashqi qiymat tushsa,
     skript ishga tushib ketadi). Endi aniq ro'yxat ishlatiladi. */
  const MANBA = {
    currentOrdersCache:    () => (typeof currentOrdersCache !== 'undefined' ? currentOrdersCache : null),
    lastSeenOrders:        () => (typeof lastSeenOrders !== 'undefined' ? lastSeenOrders : null),
    currentCreditContracts:() => (typeof currentCreditContracts !== 'undefined' ? currentCreditContracts : null)
  };
  const olish = (nom, zaxira) => {
    try{
      const f = MANBA[nom];
      const v = f ? f() : null;
      return (v === null || v === undefined) ? zaxira : v;
    }catch(e){ return zaxira; }
  };

  const ICO = {
    yangi:'<path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20.5L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    kech: '<path d="M12 3l9 16H3L12 3z"/><path d="M12 9v4M12 16h.01"/>',
    vazifa:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    bosh: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
  };

  let back, panel;
  function qur(){
    back = document.createElement('div');
    back.className = 'np-back';
    panel = document.createElement('div');
    panel.className = 'np';
    panel.innerHTML =
      '<div class="np-head">' +
        '<b>Bildirishnomalar</b>' +
        '<button type="button" class="np-clear">Hammasi o\'qildi</button>' +
      '</div>' +
      '<div class="np-body"></div>';
    document.body.appendChild(back);
    document.body.appendChild(panel);
    back.addEventListener('click', yop);
    panel.querySelector('.np-clear').addEventListener('click', () => {
      try{ markOrdersSeen(); }catch(e){}
      chiz();
      panelToast("Bildirishnomalar o'qilgan deb belgilandi", 'ok');
    });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') yop(); });
  }

  function och(){ if(!panel) qur(); chiz(); back.classList.add('is-open'); panel.classList.add('is-open'); }
  function yop(){ if(!panel) return; back.classList.remove('is-open'); panel.classList.remove('is-open'); }

  function vaqt(ts){
    const f = Date.now() - Number(ts || 0);
    if(!ts || f < 0) return '';
    const d = Math.floor(f / 60000);
    if(d < 1) return 'hozirgina';
    if(d < 60) return d + ' daqiqa oldin';
    const s = Math.floor(d / 60);
    if(s < 24) return s + ' soat oldin';
    return Math.floor(s / 24) + ' kun oldin';
  }

  function yigish(){
    const res = { yangi: [], kech: [], vazifa: [] };

    // 1) Yangi buyurtmalar
    try{
      (olish('currentOrdersCache', []) || [])
        .filter(o => (o.createdAtSort || 0) > (olish('lastSeenOrders', 0) || 0))
        .sort((a, b) => (b.createdAtSort || 0) - (a.createdAtSort || 0))
        .slice(0, 6)
        .forEach(o => res.yangi.push({
          nom: (o.number || 'Raqam'),
          izoh: (o.name || o.customerName || 'Yangi buyurtma') + ' · ' + vaqt(o.createdAtSort),
          tab: 'orders'
        }));
    }catch(e){}

    // 2) Kechikkan kredit to'lovlari
    try{
      (olish('currentCreditContracts', []) || []).forEach(d => {
        const a = qzAnalyze(d);
        if(a.state === 'overdue' && !a.archived){
          res.kech.push({
            nom: d.number || 'Shartnoma',
            izoh: (d.customerName || '') + ' · ' + a.days + ' kun kechikdi',
            tab: 'credit'
          });
        }
      });
      res.kech.sort((x, y) => y.izoh.localeCompare(x.izoh));
      res.kech = res.kech.slice(0, 6);
    }catch(e){}

    // 3) Muddati yaqin vazifalar
    try{
      const b = document.getElementById('taskTabBadge');
      const n = b ? Number((b.textContent || '').replace(/\D/g, '')) : 0;
      if(n > 0) res.vazifa.push({
        nom: n + ' ta vazifa muddati yaqin',
        izoh: 'Bajarilmagan topshiriqlar bor',
        tab: 'vazifalar'
      });
    }catch(e){}

    return res;
  }

  function qator(turi, sinf, it){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'np-item';
    b.innerHTML =
      '<span class="np-ico ' + sinf + '"><svg viewBox="0 0 24 24">' + ICO[turi] + '</svg></span>' +
      '<span class="np-tx"><b></b><span></span></span>';
    b.querySelector('b').textContent = it.nom;
    b.querySelector('.np-tx span').textContent = it.izoh;
    b.addEventListener('click', () => {
      const t = document.querySelector('.tab[data-tab="' + it.tab + '"]');
      if(t){ const g = t.closest('.tab-group'); if(g) g.classList.remove('is-collapsed'); t.click(); }
      yop();
    });
    return b;
  }

  function chiz(){
    const body = panel.querySelector('.np-body');
    const d = yigish();
    body.innerHTML = '';
    const bor = d.yangi.length + d.kech.length + d.vazifa.length;
    if(!bor){
      body.innerHTML = '<div class="np-empty">' +
        '<svg viewBox="0 0 24 24">' + ICO.bosh + '</svg>' +
        'Hammasi joyida — yangi bildirishnoma yo\'q.</div>';
      return;
    }
    const guruh = (nom, ro, turi, sinf) => {
      if(!ro.length) return;
      const h = document.createElement('div');
      h.className = 'np-group'; h.textContent = nom;
      body.appendChild(h);
      ro.forEach(it => body.appendChild(qator(turi, sinf, it)));
    };
    guruh('Kechikkan to\'lovlar', d.kech, 'kech', 'c-late');
    guruh('Yangi buyurtmalar', d.yangi, 'yangi', 'c-new');
    guruh('Vazifalar', d.vazifa, 'vazifa', 'c-task');
  }

  // Qo'ng'iroq tugmasini qayta ulaymiz
  function ulash(){
    const btn = document.getElementById('bellBtn');
    if(!btn) return;
    const yangi = btn.cloneNode(true);          // eski "Buyurtmalarga o'tish" harakati olib tashlanadi
    btn.parentNode.replaceChild(yangi, btn);
    yangi.setAttribute('title', 'Bildirishnomalar');
    yangi.addEventListener('click', (e) => {
      e.stopPropagation();
      (panel && panel.classList.contains('is-open')) ? yop() : och();
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ulash);
  else ulash();
})();

/* ==================================================================
   KO'RSATKICHLAR JONLANISHI
   Raqam birdan paydo bo'lmaydi, qisqa vaqtda sanab chiqadi. Bu
   shunchaki chiroyli emas: ko'z o'zgargan raqamni darhol ilg'aydi.
   ================================================================== */
(function sanovchi(){
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const oxirgi = new WeakMap();

  function sana(el, dan, ga){
    const boshi = performance.now(), muddat = 650;
    function qadam(t){
      const p = Math.min((t - boshi) / muddat, 1);
      const e = 1 - Math.pow(1 - p, 3);                 // sekinlashib to'xtaydi
      el.textContent = Math.round(dan + (ga - dan) * e).toLocaleString('ru-RU').replace(/,/g, ' ');
      if(p < 1) requestAnimationFrame(qadam);
    }
    requestAnimationFrame(qadam);
  }

  function kuzat(){
    document.querySelectorAll('.ov-card b, .pb-stat-card b, .zk-stat-card b').forEach(el => {
      const matn = (el.textContent || '').replace(/\s/g, '');
      if(!/^\d+$/.test(matn)) return;                   // faqat sof sonlar
      const ga = Number(matn);
      const dan = oxirgi.has(el) ? oxirgi.get(el) : 0;
      if(dan === ga) return;
      oxirgi.set(el, ga);
      if(Math.abs(ga - dan) > 0) sana(el, dan, ga);
    });
  }
  setInterval(kuzat, 1200);
  setTimeout(kuzat, 600);
})();


/* ==================================================================
   MAVZU: TUNGI / KUNDUZGI
   Tanlov brauzerda saqlanadi, shuning uchun keyingi kirishda ham
   o'sha mavzu ochiladi. Hech narsa tanlanmagan bo'lsa — qurilmaning
   o'z sozlamasiga ergashadi.
   ================================================================== */
(function mavzu(){
  const KALIT = 'vipAdminMavzu';

  function oqimi(){
    try{
      const saqlangan = localStorage.getItem(KALIT);
      if(saqlangan === 'light' || saqlangan === 'dark') return saqlangan === 'light';
    }catch(e){}
    // Yangi firma uslubi: kunduzgi (oq, zamonaviy) mavzu standart bo'ladi.
    return true;
  }

  function qoy(oq, saqla){
    document.documentElement.setAttribute('data-theme', oq ? 'light' : 'dark');
    if(saqla){ try{ localStorage.setItem(KALIT, oq ? 'light' : 'dark'); }catch(e){} }
    // tugmadagi belgi
    document.querySelectorAll('.theme-btn').forEach(b => {
      b.innerHTML = oq
        ? '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
        : '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
      b.title = oq ? "Tungi mavzuga o'tish" : "Kunduzgi mavzuga o'tish";
    });
    document.querySelectorAll('.theme-opt').forEach(o => {
      o.classList.toggle('is-on', (o.dataset.theme === 'light') === oq);
    });
  }

  // Sahifa ochilishi bilan — miltillamasligi uchun darhol
  qoy(oqimi(), false);

  function ulash(){
    // 1) Yuqori qatordagi tugma
    const tb = document.querySelector('.topbar .header-actions');
    if(tb && !tb.querySelector('.theme-btn')){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-btn';
      btn.setAttribute('aria-label', 'Mavzu');
      tb.insertBefore(btn, tb.firstChild);
      btn.addEventListener('click', () => {
        const hozirOq = document.documentElement.getAttribute('data-theme') === 'light';
        qoy(!hozirOq, true);
        if(window.panelToast) panelToast(hozirOq ? 'Tungi mavzu yoqildi' : 'Kunduzgi mavzu yoqildi', 'info');
      });
    }

    // 2) Sozlamalar bo'limidagi tanlov
    const pane = document.getElementById('paneSettings');
    if(pane && !pane.querySelector('.theme-pick')){
      const quti = document.createElement('div');
      quti.className = 'settings-form';
      quti.innerHTML =
        '<h3>Panel mavzusi</h3>' +
        '<p style="font-size:12px;color:var(--muted);margin:0 0 10px;line-height:1.5;">' +
          'Bu tanlov faqat shu brauzerga saqlanadi — mijoz saytiga ta\'sir qilmaydi.</p>' +
        '<div class="theme-pick">' +
          '<label class="theme-opt" data-theme="dark">' +
            '<span class="to-prev"><i style="width:60%;background:#0E141F"></i><i style="width:40%;background:#1A2435"></i></span>' +
            '<span><b>Tungi</b><span>Kam yorug\'likda qulay</span></span>' +
          '</label>' +
          '<label class="theme-opt" data-theme="light">' +
            '<span class="to-prev"><i style="width:60%;background:#F4F6FA"></i><i style="width:40%;background:#FFFFFF"></i></span>' +
            '<span><b>Kunduzgi</b><span>Yorug\' xonada o\'qish oson</span></span>' +
          '</label>' +
        '</div>';
      const head = pane.querySelector(':scope > .page-head');
      if(head) head.insertAdjacentElement('afterend', quti);
      else pane.insertBefore(quti, pane.firstChild);

      quti.querySelectorAll('.theme-opt').forEach(o => {
        o.addEventListener('click', () => qoy(o.dataset.theme === 'light', true));
      });
    }

    qoy(document.documentElement.getAttribute('data-theme') === 'light', false);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ulash);
  else ulash();
  // Sozlamalar bo'limi kech chizilsa ham ulanib qolsin
  setTimeout(ulash, 1200);
})();

/* ==================================================================
   SAYTGA XABAR YUBORISH
   ------------------------------------------------------------------
   Barcha xabarlar BITTA hujjatda saqlanadi: site_settings/xabarlar
   { list: [ {id,title,body,kind,link,linkText,at,until,push,active} ] }

   NEGA bitta hujjat: mijoz sayti uni ochilganda bir marta o'qiydi.
   Alohida kolleksiya bo'lganida har tashrifda o'nlab o'qish bo'lardi —
   bu baza hisobini bejiz shishirardi. Bitta hujjat = bitta o'qish.

   Saytda xabar qanday ko'rinadi:
     • tepadagi qo'ng'iroqchada o'qilmaganlar soni,
     • qo'ng'iroqcha bosilsa — xabarlar ro'yxati,
     • "push" yoqilgan bo'lsa — tepadan tushadigan kartochka
       (katta kompaniyalar ilovasidagi bildirishnoma kabi).
   ================================================================== */
let XB_LIST = [], XB_KIND = 'xabar';
const XB_IKON = { xabar:'💬', aksiya:'🔥', ogoh:'⚠️' };

function xbEsc(x){ return String(x == null ? '' : x).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function xbPreview(){
  const t = (document.getElementById('xbTitle').value || '').trim();
  const b = (document.getElementById('xbBody').value || '').trim();
  const lt = (document.getElementById('xbLinkText').value || '').trim();
  const lk = (document.getElementById('xbLink').value || '').trim();
  const bosh = t || 'Sarlavha shu yerda';
  const matn = b || "Xabar matni shu yerda ko'rinadi.";
  document.getElementById('xbPrevTitle').textContent = bosh;
  document.getElementById('xbPrevTitle2').textContent = bosh;
  document.getElementById('xbPrevBody').textContent = matn;
  document.getElementById('xbPrevBody2').textContent = matn;
  document.getElementById('xbPrevIc').textContent = XB_IKON[XB_KIND] || '💬';
  const btn = document.getElementById('xbPrevBtn');
  btn.style.display = lk ? '' : 'none';
  btn.textContent = lt || "Ko'rish";
  document.getElementById('xbPrevPush').style.display =
    document.getElementById('xbPush').checked ? '' : 'none';
  document.getElementById('xbTitleN').textContent = t.length;
  document.getElementById('xbBodyN').textContent = b.length;
}

function xbVaqt(ms){
  try{ return sanaVaqtUz(Number(ms) || 0); }
  catch(e){ return ''; }
}

async function loadXabarlar(){
  const box = document.getElementById('xbList');
  if(!box) return;
  try{
    const doc = await db.collection('site_settings').doc('xabarlar').get();
    XB_LIST = ((doc.exists ? doc.data() : {}) || {}).list || [];
  }catch(e){
    box.innerHTML = '<div class="wt-empty">Yuklab bo\'lmadi: ' + xbEsc(e.message) + '</div>';
    return;
  }
  xbRender();
}

function xbRender(){
  const box = document.getElementById('xbList');
  if(!box) return;
  if(!XB_LIST.length){ box.innerHTML = '<div class="wt-empty">Hali xabar yuborilmagan.</div>'; return; }
  box.innerHTML = XB_LIST.map((m, i) => `
    <div class="xb-row${m.active === false ? ' disabled' : ''}">
      <div class="xb-row-ic">${XB_IKON[m.kind] || '💬'}</div>
      <div style="flex:1;min-width:0">
        <b>${xbEsc(m.title)}</b>
        ${m.body ? `<p>${xbEsc(m.body)}</p>` : ''}
        <small>${xbVaqt(m.at)}${m.link ? ' · havola: ' + xbEsc(m.link) : ''}${m.push === false ? '' : ' · bildirishnoma'}${m.until ? ' · ' + xbVaqt(m.until) + ' gacha' : ''}</small>
      </div>
      <div class="xb-row-acts">
        <button type="button" data-xbtoggle="${i}">${m.active === false ? 'Yoqish' : "O'chirib turish"}</button>
        <button type="button" class="off" data-xbdel="${i}">O'chirish</button>
      </div>
    </div>`).join('');
}

async function xbSaqla(){
  /* Eng yangisi birinchi, jami 30 ta saqlanadi (hujjat kichik qolsin) */
  const list = XB_LIST.slice(0, 30);
  await db.collection('site_settings').doc('xabarlar').set({ list }, { merge: true });
  XB_LIST = list;
}

async function xbYubor(){
  const btn = document.getElementById('xbSend');
  const msg = document.getElementById('xbMsg');
  const title = (document.getElementById('xbTitle').value || '').trim();
  const body  = (document.getElementById('xbBody').value || '').trim();
  const link  = (document.getElementById('xbLink').value || '').trim();
  const linkText = (document.getElementById('xbLinkText').value || '').trim();
  const untilRaw = document.getElementById('xbUntil').value;
  const push = document.getElementById('xbPush').checked;

  msg.className = 'xb-msg';
  if(!title){ msg.className = 'xb-msg bad'; msg.textContent = 'Sarlavha yozilishi shart.'; return; }
  if(link && !/^#\//.test(link) && !/^https?:\/\//i.test(link)){
    msg.className = 'xb-msg bad';
    msg.textContent = 'Havola "#/" bilan (sayt ichi) yoki "https://" bilan boshlanishi kerak.';
    return;
  }

  btn.disabled = true; btn.textContent = 'Yuborilmoqda...';
  try{
    XB_LIST.unshift({
      id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title, body,
      kind: XB_KIND,
      link: link || '',
      linkText: linkText || '',
      at: Date.now(),
      until: untilRaw ? new Date(untilRaw + 'T23:59:59').getTime() : 0,
      push: !!push,
      active: true
    });
    await xbSaqla();
    xbRender();

    /* Telefonlarga haqiqiy bildirishnoma — alohida server funksiyasi.
       Xabar bazaga allaqachon yozilgan, shu sabab bu bosqich xato
       bersa ham xabar saytda ko'rinaveradi. */
    let pushNatija = '';
    if(document.getElementById('xbDevice').checked){
      try{
        const idToken = await firebase.auth().currentUser.getIdToken();
        const res = await fetch('/.netlify/functions/admin-send-push', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + idToken },
          body: JSON.stringify({ title, body, link: link || '/', id: XB_LIST[0].id })
        });
        const j = await res.json();
        pushNatija = j && j.ok
          ? ` · telefonlarga: ${j.yuborildi}/${j.jami}`
          : ' · telefonlarga yuborilmadi: ' + ((j && j.error) || 'xato');
      }catch(e){ pushNatija = ' · telefonlarga yuborilmadi: ' + e.message; }
    }

    document.getElementById('xbTitle').value = '';
    document.getElementById('xbBody').value = '';
    document.getElementById('xbLink').value = '';
    document.getElementById('xbLinkText').value = '';
    document.getElementById('xbUntil').value = '';
    xbPreview();
    msg.className = 'xb-msg ok';
    msg.textContent = 'Yuborildi. Mijozlar saytni ochganda ko\'radi.' + pushNatija;
  }catch(e){
    msg.className = 'xb-msg bad';
    msg.textContent = 'Saqlab bo\'lmadi: ' + e.message;
  }
  btn.disabled = false; btn.textContent = 'Xabarni yuborish';
}

/* Bildirishnoma kaliti (VAPID) site_settings/general ichida saqlanadi —
   sayt uni ochilganda shu yerdan o'qiydi, kodni tahrirlash shart emas. */
async function xbVapidYukla(){
  const inp = document.getElementById('xbVapid');
  const stat = document.getElementById('xbPushStat');
  if(!inp) return;
  try{
    const doc = await db.collection('site_settings').doc('general').get();
    const k = ((doc.exists ? doc.data() : {}) || {}).webPushKey || '';
    inp.value = k;
    if(stat) stat.textContent = k
      ? '✅ Kalit saqlangan — telefonlarga bildirishnoma yuborish yoqilgan.'
      : '⚠️ Kalit hali kiritilmagan — telefonlarga bildirishnoma yuborilmaydi.';
  }catch(e){ if(stat) stat.textContent = 'Kalitni o\'qib bo\'lmadi: ' + e.message; }
}
async function xbVapidSaqla(){
  const inp = document.getElementById('xbVapid');
  const msg = document.getElementById('xbVapidMsg');
  const k = (inp.value || '').trim();
  msg.className = 'xb-msg';
  if(k && (k.length < 40 || /\s/.test(k))){
    msg.className = 'xb-msg bad'; msg.textContent = 'Kalit noto\'g\'ri ko\'rinadi.'; return;
  }
  try{
    await db.collection('site_settings').doc('general').set({ webPushKey: k }, { merge: true });
    msg.className = 'xb-msg ok'; msg.textContent = 'Saqlandi.';
    xbVapidYukla();
  }catch(e){ msg.className = 'xb-msg bad'; msg.textContent = 'Saqlab bo\'lmadi: ' + e.message; }
}

(function xbUlash(){
  const pane = document.getElementById('paneXabarlar');
  if(!pane) return;
  const vs = document.getElementById('xbVapidSave');
  if(vs) vs.addEventListener('click', xbVapidSaqla);
  ['xbTitle','xbBody','xbLink','xbLinkText'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', xbPreview);
  });
  const pc = document.getElementById('xbPush');
  if(pc) pc.addEventListener('change', xbPreview);
  pane.querySelectorAll('.xb-kind').forEach(b=>{
    b.addEventListener('click', ()=>{
      pane.querySelectorAll('.xb-kind').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      XB_KIND = b.dataset.kind;
      xbPreview();
    });
  });
  const send = document.getElementById('xbSend');
  if(send) send.addEventListener('click', xbYubor);

  pane.addEventListener('click', async (e)=>{
    const tg = e.target.closest('[data-xbtoggle]');
    if(tg){
      const i = Number(tg.dataset.xbtoggle);
      if(!XB_LIST[i]) return;
      XB_LIST[i].active = XB_LIST[i].active === false;
      try{ await xbSaqla(); xbRender(); }catch(err){ alert('Saqlab bo\'lmadi: ' + err.message); }
      return;
    }
    const dl = e.target.closest('[data-xbdel]');
    if(dl){
      const i = Number(dl.dataset.xbdel);
      if(!XB_LIST[i]) return;
      if(!confirm('Shu xabar o\'chirilsinmi? Saytda darhol yo\'qoladi.')) return;
      XB_LIST.splice(i, 1);
      try{ await xbSaqla(); xbRender(); }catch(err){ alert('O\'chirib bo\'lmadi: ' + err.message); }
      return;
    }
  });
  xbPreview();
})();

/* ==================================================================
   RAQAM TO'LOVI
   ------------------------------------------------------------------
   Nima uchun kerak: o'zimiz kreditga (muddatli to'lovga) olgan
   raqamlarning oylik to'lovini SIM ichiga o'z vaqtida tashlab turish
   kerak. To'lov 30 KUNDAN ortiq kechiksa operator raqamni o'chirib
   yuboradi — qimmat VIP raqam yo'qoladi. Shu sabab bu bo'lim bor.

   Baza: number_payments/{id}
     number, operator, tariffName,
     tariffMonthly  — oylik tarif summasi
     creditMonthly  — muddatli to'lovning oylik summasi
     totalMonths, paidMonths
     dueDate  "YYYY-MM-DD"  — keyingi to'lov sanasi
     remindTime "HH:MM"     — eslatma vaqti (Toshkent)
     remindDays [3,1,0]     — necha kun oldin eslatilsin
     status "active" | "archived"
     payments[] — to'lov tarixi
     sent{}     — qaysi eslatma yuborilgani (takrorlanmasin)

   Eslatmani Netlify funksiyasi yuboradi:
   netlify/functions/tolov-eslatma-background.js
   ================================================================== */
let TLV = [], TLV_FILTER = 'active', TLV_EDIT = null;

const TLV_IC = {
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16v.5"/></svg>',
  bad:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4l8.5 15H3.5z"/><path d="M12 10v4M12 16.5v.5"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/></svg>',
  sim:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10 18.6h4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.3 2"/></svg>'
};

const tlvEsc = (x) => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tlvSon = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
const tlvRaqam = (v) => Number(String(v == null ? '' : v).replace(/[^\d]/g, '')) || 0;

/* Bugun — Toshkent vaqti bo'yicha "YYYY-MM-DD" */
function tlvBugun(){
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
/* Ikki sana orasidagi kun farqi (musbat = sana o'tib ketgan) */
function tlvKechikish(due){
  if(!due) return 0;
  const a = new Date(tlvBugun() + 'T00:00:00');
  const b = new Date(due + 'T00:00:00');
  return Math.round((a - b) / 86400000);
}
/* Sanani bir oy oldinga suradi (oy oxiri to'g'ri hisoblanadi) */
function tlvKeyingiOy(due){
  const d = new Date((due || tlvBugun()) + 'T00:00:00');
  const kun = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const oxiri = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(kun, oxiri));
  const p = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function tlvSana(s){
  if(!s) return '—';
  try{ return sanaUz(s + 'T00:00:00'); }
  catch(e){ return s; }
}

/* Raqamning holati: tugagan / arxiv / kechikkan / yaqinlashdi / joyida */
function tlvHolat(r){
  if(r.status === 'archived') return 'arch';
  if((r.paidMonths || 0) >= (r.totalMonths || 0) && r.totalMonths) return 'done';
  const k = tlvKechikish(r.dueDate);
  if(k > 0) return 'bad';
  if(k >= -3) return 'warn';
  return 'ok';
}

async function loadTolov(){
  const box = document.getElementById('tlvList');
  if(!box) return;
  try{
    const snap = await db.collection('number_payments').get();
    TLV = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  }catch(e){
    box.innerHTML = '<div class="wt-empty">Yuklab bo\'lmadi: ' + tlvEsc(e.message) + '</div>';
    return;
  }
  tlvRender();
}

function tlvRender(){
  tlvStats();
  const box = document.getElementById('tlvList');
  if(!box) return;
  const q = (document.getElementById('tlvSearch').value || '').replace(/\s/g, '').toLowerCase();

  let list = TLV.slice().sort((a,b) => String(a.dueDate||'').localeCompare(String(b.dueDate||'')));
  if(TLV_FILTER === 'active')   list = list.filter(r => r.status !== 'archived');
  if(TLV_FILTER === 'archived') list = list.filter(r => r.status === 'archived');
  if(TLV_FILTER === 'late')     list = list.filter(r => tlvHolat(r) === 'bad');
  if(q) list = list.filter(r =>
    String(r.number||'').replace(/\s/g,'').toLowerCase().includes(q) ||
    String(r.operator||'').toLowerCase().includes(q));

  if(!list.length){
    box.innerHTML = '<div class="wt-empty">' +
      (TLV.length ? 'Bu shart bo\'yicha raqam topilmadi.' : 'Hali raqam qo\'shilmagan. Yuqoridagi "Raqam qo\'shish" tugmasini bosing.') +
      '</div>';
    return;
  }
  box.innerHTML = list.map(tlvCard).join('');
}

function tlvCard(r){
  const h = tlvHolat(r);
  const kech = tlvKechikish(r.dueDate);
  const oylik = (Number(r.creditMonthly)||0) + (Number(r.tariffMonthly)||0);
  const jamiQarz = (Number(r.creditMonthly)||0) * (Number(r.totalMonths)||0);
  const tolangan = (Number(r.creditMonthly)||0) * (Number(r.paidMonths)||0);
  const qolgan = Math.max(0, jamiQarz - tolangan);
  const foiz = r.totalMonths ? Math.round(((r.paidMonths||0) / r.totalMonths) * 100) : 0;

  /* Qisqa qatordagi holat yozuvi — eng muhim ma'lumot: necha kun qoldi */
  const kunMatn =
    h === 'arch' ? 'Arxiv' :
    h === 'done' ? "To'liq to'langan" :
    kech > 0     ? kech + ' kun kechikdi' :
    kech === 0   ? "Bugun to'lov" :
                   (-kech) + ' kun qoldi';
  const kunSinf = (h === 'arch' || h === 'done') ? 'info' : h;
  const kunIc = (h === 'bad') ? TLV_IC.bad : (h === 'warn') ? TLV_IC.clock : TLV_IC.ok;

  let ogoh = '';
  if(h === 'bad'){
    const qoldi = 30 - kech;
    ogoh = qoldi > 0
      ? `<div class="tlv-warnbox">${TLV_IC.bad}<span>To'lov ${kech} kun kechikdi. Raqam o'chirilishiga <b>${qoldi} kun</b> qoldi — 30 kundan oshsa operator raqamni qaytarib oladi.</span></div>`
      : `<div class="tlv-warnbox">${TLV_IC.bad}<span>30 kundan oshdi! Raqam o'chirilgan bo'lishi mumkin — operator bilan zudlik bilan bog'laning.</span></div>`;
  }else if(h === 'warn'){
    ogoh = `<div class="tlv-warnbox soft">${TLV_IC.clock}<span>To'lov sanasi yaqin: <b>${tlvSana(r.dueDate)}</b>. Jami to'lanishi kerak: <b>${tlvSon(oylik)} so'm</b>.</span></div>`;
  }

  const tarix = (r.payments || []).slice(-3).reverse().map(x =>
    `<div><span>${tlvEsc(sanaUz(x.at))}</span><span>${tlvSon(x.amount)} so'm</span></div>`).join('');

  const kd = Array.isArray(r.remindDays) ? r.remindDays.slice().sort((a,b)=>b-a) : [];
  const oldin = kd.filter(x => x > 0);
  const kunlar = [oldin.length ? oldin.join(' va ') + ' kun oldin' : '', kd.indexOf(0) > -1 ? "to'lov kunida" : '']
    .filter(Boolean).join(', ') || "to'lov kunida";

  /* ===== QISQA QATOR + OCHILADIGAN TAFSILOT =====
     Ro'yxat uzun bo'lganda har bir kartochka butun ekranni egallamasin
     deb, odatda faqat eng kerakli to'rt narsa ko'rinadi: raqam, oylik
     to'lov, sana va necha kun qolgani. Bosilsa — qolgan hammasi
     yumshoq ochiladi (CSS grid 0fr -> 1fr; balandlikni JS o'lchamaydi,
     shu sabab silliq). */
  return `<div class="tlv-card s-${h}" data-tlv="${tlvEsc(r.id)}">
    <button type="button" class="tlv-qator" data-tlvtoggle aria-expanded="false">
      <span class="tlv-dot"></span>
      <span class="tlv-q1">
        <b>${tlvEsc(r.number || '—')}</b>
        <i>${tlvEsc(r.operator || '')}</i>
      </span>
      <span class="tlv-q2"><u>Oylik to'lov</u><b>${tlvSon(oylik)} so'm</b></span>
      <span class="tlv-q3"><u>Sana</u><b>${tlvSana(r.dueDate)}</b></span>
      <span class="tlv-badge ${kunSinf}">${kunIc}${tlvEsc(kunMatn)}</span>
      <span class="tlv-chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg></span>
    </button>

    <div class="tlv-ochiq"><div class="tlv-ichki">
      <div class="tlv-tar">${tlvEsc(r.tariffName || 'Tarif ko\'rsatilmagan')} · eslatma ${tlvEsc(r.remindTime || '09:00')} (${tlvEsc(kunlar)})</div>

      <div class="tlv-row">
        <div><b>Muddatli to'lov</b><i>${tlvSon(r.creditMonthly)} so'm</i></div>
        <div><b>Oylik tarif</b><i>${tlvSon(r.tariffMonthly)} so'm</i></div>
        <div><b>Umumiy qarz</b><i>${tlvSon(jamiQarz)} so'm</i></div>
        <div><b>Qolgan qarz</b><i>${tlvSon(qolgan)} so'm</i></div>
      </div>

      <div class="tlv-bar"><span style="width:${foiz}%"></span></div>
      <div class="tlv-barlbl">
        <span>${r.paidMonths || 0} / ${r.totalMonths || 0} oy to'landi · ${foiz}%</span>
        <span>Qolgan: ${Math.max(0, (Number(r.totalMonths)||0) - (Number(r.paidMonths)||0))} oy</span>
      </div>

      ${ogoh}
      ${r.note ? `<div class="tlv-note">📝 ${tlvEsc(r.note)}</div>` : ''}
      ${tarix ? `<div class="tlv-hist"><b style="display:block;margin-bottom:5px;color:var(--text);font-size:10.5px">Oxirgi to'lovlar</b>${tarix}</div>` : ''}

      <div class="tlv-acts">
        ${r.status === 'archived'
          ? `<button type="button" data-tlvunarch="${tlvEsc(r.id)}">Arxivdan chiqarish</button>`
          : `<button type="button" class="pay" data-tlvpay="${tlvEsc(r.id)}">To'landi (+1 oy)</button>
             <button type="button" data-tlvedit="${tlvEsc(r.id)}">Tahrirlash</button>
             <button type="button" data-tlvarch="${tlvEsc(r.id)}">Arxivga</button>`}
        <button type="button" class="dan" data-tlvdel="${tlvEsc(r.id)}">O'chirish</button>
      </div>
    </div></div>
  </div>`;
}

function tlvStats(){
  const box = document.getElementById('tlvStats');
  if(!box) return;
  const faol = TLV.filter(r => r.status !== 'archived');
  const oylik = faol.reduce((a,r) => a + (Number(r.creditMonthly)||0) + (Number(r.tariffMonthly)||0), 0);
  const qolgan = faol.reduce((a,r) => a + Math.max(0,
      (Number(r.creditMonthly)||0) * ((Number(r.totalMonths)||0) - (Number(r.paidMonths)||0))), 0);
  const kech = faol.filter(r => tlvHolat(r) === 'bad');
  const xavf = kech.filter(r => tlvKechikish(r.dueDate) >= 25).length;
  const yaqin = faol.filter(r => tlvHolat(r) === 'warn').length;

  /* Yon menyudagi belgi — kechikkanlar soni */
  const badge = document.getElementById('tlvTabBadge');
  if(badge){
    const n = kech.length;
    badge.style.display = n ? '' : 'none';
    badge.textContent = String(n);
  }

  const st = (cls, ic, lbl, val, sub) =>
    `<div class="tlv-st ${cls}"><div class="lbl">${ic}${lbl}</div><div class="val">${val}</div><div class="sub">${sub}</div></div>`;

  box.innerHTML =
    st('', TLV_IC.sim, 'Faol raqamlar', faol.length, TLV.length + ' tadan') +
    st('', TLV_IC.wallet, 'Oylik majburiyat', tlvSon(oylik), "so'm / oy") +
    st('', TLV_IC.wallet, 'Qolgan qarz', tlvSon(qolgan), "so'm") +
    st(yaqin ? 'warn' : '', TLV_IC.clock, 'Yaqinlashdi', yaqin, '3 kun ichida') +
    st(kech.length ? 'bad' : 'ok', TLV_IC.bad, 'Kechikkan', kech.length, kech.length ? 'tezda to\'lang' : 'hammasi joyida') +
    st(xavf ? 'bad' : 'ok', TLV_IC.warn, "O'chirilish xavfi", xavf, '25 kundan oshgan');
}

/* ---- Shakl ---- */
function tlvFormOch(r){
  TLV_EDIT = r || null;
  document.getElementById('tlvFormTitle').textContent = r ? 'Raqamni tahrirlash' : 'Yangi raqam qo\'shish';
  document.getElementById('tlvNumber').value = r ? (r.number || '') : '';
  document.getElementById('tlvOperator').value = r ? (r.operator || 'Ucell') : 'Ucell';
  document.getElementById('tlvTariff').value = r ? (r.tariffName || '') : '';
  document.getElementById('tlvTariffSum').value = r ? tlvSon(r.tariffMonthly) : '';
  document.getElementById('tlvCreditSum').value = r ? tlvSon(r.creditMonthly) : '';
  document.getElementById('tlvTotalMonths').value = r ? (r.totalMonths || '') : '';
  document.getElementById('tlvPaidMonths').value = r ? (r.paidMonths || 0) : 0;
  document.getElementById('tlvDue').value = r ? (r.dueDate || '') : tlvBugun();
  document.getElementById('tlvTime').value = r ? (r.remindTime || '09:00') : '09:00';
  document.getElementById('tlvDays').value = r && Array.isArray(r.remindDays) ? r.remindDays.join(', ') : '3, 1, 0';
  document.getElementById('tlvNote').value = r ? (r.note || '') : '';
  document.getElementById('tlvMsg').textContent = '';
  document.getElementById('tlvForm').hidden = false;
  tlvHisob();
  document.getElementById('tlvForm').scrollIntoView({ behavior:'smooth', block:'nearest' });
}
function tlvFormYop(){
  TLV_EDIT = null;
  document.getElementById('tlvForm').hidden = true;
}
function tlvHisob(){
  const cr = tlvRaqam(document.getElementById('tlvCreditSum').value);
  const tf = tlvRaqam(document.getElementById('tlvTariffSum').value);
  const jami = Number(document.getElementById('tlvTotalMonths').value) || 0;
  const tol = Number(document.getElementById('tlvPaidMonths').value) || 0;
  const qarz = cr * jami, tolangan = cr * Math.min(tol, jami);
  document.getElementById('tlvCalc').innerHTML =
    `<div><b>Jami oylik to'lov</b><i>${tlvSon(cr + tf)} so'm</i></div>
     <div><b>Umumiy qarz</b><i>${tlvSon(qarz)} so'm</i></div>
     <div><b>To'langan</b><i>${tlvSon(tolangan)} so'm</i></div>
     <div><b>Qolgan</b><i>${tlvSon(Math.max(0, qarz - tolangan))} so'm</i></div>
     <div><b>Qolgan oylar</b><i>${Math.max(0, jami - tol)} oy</i></div>`;
}

async function tlvSaqla(){
  const btn = document.getElementById('tlvSave'), msg = document.getElementById('tlvMsg');
  const number = (document.getElementById('tlvNumber').value || '').trim();
  const creditMonthly = tlvRaqam(document.getElementById('tlvCreditSum').value);
  const totalMonths = Number(document.getElementById('tlvTotalMonths').value) || 0;
  const dueDate = document.getElementById('tlvDue').value;

  msg.className = 'tlv-msg';
  if(!number){ msg.className='tlv-msg bad'; msg.textContent='Raqam yozilishi shart.'; return; }
  if(!creditMonthly){ msg.className='tlv-msg bad'; msg.textContent='Muddatli to\'lovning oylik summasi yozilishi shart.'; return; }
  if(!totalMonths){ msg.className='tlv-msg bad'; msg.textContent='Jami oylar soni yozilishi shart.'; return; }
  if(!dueDate){ msg.className='tlv-msg bad'; msg.textContent='Keyingi to\'lov sanasi tanlanishi shart.'; return; }

  const remindDays = (document.getElementById('tlvDays').value || '')
    .split(',').map(x => parseInt(x, 10)).filter(x => !isNaN(x) && x >= 0 && x <= 60);

  const data = {
    number,
    operator: document.getElementById('tlvOperator').value,
    tariffName: (document.getElementById('tlvTariff').value || '').trim(),
    tariffMonthly: tlvRaqam(document.getElementById('tlvTariffSum').value),
    creditMonthly,
    totalMonths,
    paidMonths: Math.max(0, Number(document.getElementById('tlvPaidMonths').value) || 0),
    dueDate,
    remindTime: document.getElementById('tlvTime').value || '09:00',
    remindDays: remindDays.length ? remindDays : [0],
    note: (document.getElementById('tlvNote').value || '').trim(),
    status: TLV_EDIT ? (TLV_EDIT.status || 'active') : 'active',
    sent: {},                       /* sana o'zgarsa eslatma qaytadan yuboriladi */
    updatedAt: Date.now()
  };

  btn.disabled = true; btn.textContent = 'Saqlanmoqda...';
  try{
    if(TLV_EDIT){
      await db.collection('number_payments').doc(TLV_EDIT.id).set(data, { merge: true });
      Object.assign(TLV.find(x => x.id === TLV_EDIT.id) || {}, data);
    }else{
      data.createdAt = Date.now();
      data.payments = [];
      const ref = await db.collection('number_payments').add(data);
      TLV.push(Object.assign({ id: ref.id }, data));
    }
    tlvFormYop();
    tlvRender();
  }catch(e){
    msg.className = 'tlv-msg bad';
    msg.textContent = 'Saqlab bo\'lmadi: ' + e.message;
  }
  btn.disabled = false; btn.textContent = 'Saqlash';
}

/* "To'landi" — oy +1, keyingi sana bir oy oldinga suriladi */
async function tlvTolandi(id){
  const r = TLV.find(x => x.id === id); if(!r) return;
  const oylik = (Number(r.creditMonthly)||0) + (Number(r.tariffMonthly)||0);
  if(!confirm(r.number + '\n\n' + tlvSon(oylik) + " so'm to'landi deb belgilansinmi?\nKeyingi to'lov sanasi bir oy oldinga suriladi.")) return;

  const yangi = {
    paidMonths: (Number(r.paidMonths)||0) + 1,
    dueDate: tlvKeyingiOy(r.dueDate),
    sent: {},
    updatedAt: Date.now(),
    payments: (r.payments || []).concat([{ at: Date.now(), amount: oylik, months: 1 }])
  };
  try{
    await db.collection('number_payments').doc(id).set(yangi, { merge: true });
    Object.assign(r, yangi);
    tlvRender();
  }catch(e){ alert('Saqlab bo\'lmadi: ' + e.message); }
}

async function tlvHolatYoz(id, status){
  try{
    await db.collection('number_payments').doc(id).set({ status, updatedAt: Date.now() }, { merge: true });
    const r = TLV.find(x => x.id === id); if(r) r.status = status;
    tlvRender();
  }catch(e){ alert('Saqlab bo\'lmadi: ' + e.message); }
}
async function tlvOchir(id){
  const r = TLV.find(x => x.id === id); if(!r) return;
  if(!confirm(r.number + '\n\nShu yozuv butunlay o\'chirilsinmi? Bu amalni qaytarib bo\'lmaydi.')) return;
  try{
    await db.collection('number_payments').doc(id).delete();
    TLV = TLV.filter(x => x.id !== id);
    tlvRender();
  }catch(e){ alert('O\'chirib bo\'lmadi: ' + e.message); }
}

(function tlvUlash(){
  const pane = document.getElementById('paneTolov');
  if(!pane) return;

  document.getElementById('tlvAddBtn').addEventListener('click', ()=> tlvFormOch(null));
  document.getElementById('tlvCancel').addEventListener('click', tlvFormYop);
  document.getElementById('tlvSave').addEventListener('click', tlvSaqla);
  document.getElementById('tlvSearch').addEventListener('input', tlvRender);

  ['tlvCreditSum','tlvTariffSum','tlvTotalMonths','tlvPaidMonths'].forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener('input', ()=>{
      if(el.classList.contains('tlv-num')){
        const pos = el.value.length - el.selectionStart;
        el.value = tlvSon(tlvRaqam(el.value));
        try{ el.selectionStart = el.selectionEnd = Math.max(0, el.value.length - pos); }catch(e){}
      }
      tlvHisob();
    });
  });

  pane.querySelectorAll('.tlv-seg button').forEach(b=>{
    b.addEventListener('click', ()=>{
      pane.querySelectorAll('.tlv-seg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      TLV_FILTER = b.dataset.tf;
      tlvRender();
    });
  });

  pane.addEventListener('click', (e)=>{
    const tg = e.target.closest('[data-tlvtoggle]');
    if(tg){
      const card = tg.closest('.tlv-card');
      const ochiq = card.classList.toggle('open');
      tg.setAttribute('aria-expanded', ochiq ? 'true' : 'false');
      return;
    }
    const pay = e.target.closest('[data-tlvpay]');   if(pay){ tlvTolandi(pay.dataset.tlvpay); return; }
    const ed  = e.target.closest('[data-tlvedit]');  if(ed){ tlvFormOch(TLV.find(x => x.id === ed.dataset.tlvedit)); return; }
    const ar  = e.target.closest('[data-tlvarch]');  if(ar){ tlvHolatYoz(ar.dataset.tlvarch, 'archived'); return; }
    const un  = e.target.closest('[data-tlvunarch]');if(un){ tlvHolatYoz(un.dataset.tlvunarch, 'active'); return; }
    const dl  = e.target.closest('[data-tlvdel]');   if(dl){ tlvOchir(dl.dataset.tlvdel); return; }
  });
})();


/* ==================================================================
   XAVFSIZLIK — TELEGRAM BOTLAR HIMOYASI (Sozlamalar bo'limi)
   ------------------------------------------------------------------
   Botlarning webhook manzili ochiq. Manzilni bilgan odam unga o'zi
   yasagan "xabar" yuborib, botni aldashi mumkin edi — masalan
   bosqichlarni bosib o'tib, bazaga soxta buyurtma yozdirish (ism
   o'rnida raqam, telefon o'rnida "00 000 00 00").

   Telegram buning uchun tayyor himoya beradi: `setWebhook` chaqirilganda
   maxfiy so'z (secret_token) beriladi va Telegram har bir so'rovda uni
   qaytaradi. Shu tugma o'sha himoyani bir bosishda yoqadi.
   Server: netlify/functions/admin-bot-security.js
   ================================================================== */
async function xavfCall(action){
  const idToken = await firebase.auth().currentUser.getIdToken();
  const res = await fetch('/.netlify/functions/admin-bot-security', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
    body: JSON.stringify({ action })
  });
  const j = await res.json().catch(()=>({}));
  if(!j.ok) throw new Error(j.error || 'Xatolik');
  return j;
}

function xavfChiz(botlar){
  const box = document.getElementById('xavfList');
  if(!box) return;
  if(!botlar || !botlar.length){ box.textContent = "Bot topilmadi."; return; }
  box.innerHTML = botlar.map(b => {
    if(!b.token){
      return '<div class="xavf-row"><span class="sv-pill sv-off">Sozlanmagan</span>' +
        '<b>' + escapeHtml(b.nom) + '</b><i>Bot tokeni qo‘yilmagan — bu bot ishlatilmayapti</i></div>';
    }
    const himoyali = b.bazaSirBor || b.envSirBor;
    const izoh = himoyali
      ? 'Faqat Telegram’ning o‘zi yuborgan so‘rovlar qabul qilinadi'
      : 'Manzilni bilgan odam soxta so‘rov yubora oladi — himoyani yoqing';
    return '<div class="xavf-row">' +
      '<span class="sv-pill ' + (himoyali ? 'sv-on' : 'sv-off') + '">' +
        (himoyali ? 'Himoyalangan' : 'Himoyalanmagan') + '</span>' +
      '<b>' + escapeHtml(b.nom) + '</b>' +
      '<i>' + izoh +
        (b.kutayotgan ? ' · navbatda ' + b.kutayotgan + ' ta xabar' : '') +
        (b.oxirgiXato ? ' · oxirgi xato: ' + escapeHtml(b.oxirgiXato) : '') +
      '</i></div>';
  }).join('');
}

async function xavfYukla(){
  const box = document.getElementById('xavfList');
  if(!box) return;
  box.textContent = 'Yuklanmoqda...';
  try{ xavfChiz((await xavfCall('holat')).botlar); }
  catch(e){ box.textContent = 'Xato: ' + e.message; }
  /* Kirish urinishlari tarixi — "kimdir parolni tanlab ko'rdimi?" */
  const ub = document.getElementById('xavfUrinish');
  if(ub){
    try{
      const rows = (await xavfCall('urinishlar')).urinishlar || [];
      ub.innerHTML = rows.length
        ? '<div class="xavf-urinish-bosh">Qulflangan kirish urinishlari</div>' +
          rows.map(r => '<div class="xavf-urinish">' +
            '<b>' + escapeHtml(r.login || "login ko\u2018rsatilmagan") + '</b>' +
            '<span>' + escapeHtml(r.ip || '') + '</span>' +
            '<i>' + new Date(Number(r.at) || 0).toLocaleString('ru-RU') + '</i></div>').join('')
        : '<div class="muted" style="font-size:12px">Qulflangan kirish urinishlari yo\u2018q \u2014 hammasi tinch.</div>';
    }catch(e){ ub.innerHTML = ''; }
  }
}

document.getElementById('xavfReload') && document.getElementById('xavfReload')
  .addEventListener('click', xavfYukla);

document.getElementById('xavfYoqBtn') && document.getElementById('xavfYoqBtn')
  .addEventListener('click', async ()=>{
    const msg = document.getElementById('xavfMsg');
    const btn = document.getElementById('xavfYoqBtn');
    if(!confirm("Botlar himoyasi yoqilsinmi?\n\nTelegram'ga maxfiy so'z bildiriladi. " +
                "Botlar ishlashdan to'xtamaydi, manzil o'zgarmaydi.")) return;
    btn.disabled = true; msg.textContent = 'Yoqilmoqda...';
    try{
      const j = await xavfCall('yoq');
      xavfChiz(j.botlar);
      const yaxshi = (j.natija || []).filter(x => x.ok).length;
      const yomon = (j.natija || []).filter(x => !x.ok);
      msg.textContent = yaxshi + ' ta bot himoyalandi' +
        (yomon.length ? ' · ' + yomon.map(x => x.nom + ': ' + x.sabab).join('; ') : '');
      if(typeof panelToast === 'function') panelToast('Botlar himoyalandi', 'ok');
    }catch(e){ msg.textContent = 'Xato: ' + e.message; }
    finally{ btn.disabled = false; }
  });

/* ==================================================================
   TELEGRAM KANALI UCHUN TAYYOR POST RASMI
   ------------------------------------------------------------------
   Admin raqamni (va xohlasa narx, toifa, oylik to'lov, qo'shimcha
   yozuvni) kiritadi — server saytning o'z uslubidagi 1080x1350 PNG
   rasm chizib beradi. Admin uni yuklab oladi va kanalga tashlaydi.

   NEGA SERVERDA CHIZILADI (brauzerda emas). Rasmni brauzerda
   `canvas` bilan chizsak, shrift yuklanmagan paytda boshqa shriftga
   tushib qolardi va post "arzon" ko'rinardi. Server esa shriftni
   o'zi bilan olib yuradi (netlify/functions/lib/ogShrift.js) — rasm
   har doim AYNAN bir xil chiqadi. Qolaversa, saytdagi ulashish
   kartochkasi (og-raqam) ham xuddi shu shrift va logotipni
   ishlatadi, ya'ni kanaldagi post va saytdagi kartochka bir uslubda.

   XAVFSIZLIK: funksiya faqat haqiqiy admin uchun ochiq (Authorization
   sarlavhasi bilan) — aks holda har kim bizning uslubimizdagi rasm
   yasab, sayt nomidan tarqatishi mumkin bo'lardi.
   ================================================================== */
/* ==================================================================
   KANAL POSTI — JONLI SHABLON (V107)
   ------------------------------------------------------------------
   NEGA QAYTA YOZILDI. Ilgari rasm SERVERDA chizilardi (Netlify
   funksiyasi + resvg). U yerda shriftlar alohida fayl ichida base64
   ko'rinishida turardi va o'sha fayl to'liq yetib bormasa, rasmda
   BITTA HAM YOZUV chiqmasdi — "bo'sh kartochka". Sababini topish
   qiyin, har bosganda server chaqiriladi, kutish bor.

   ENDI rasm BRAUZERDA, <canvas> da chiziladi:
     * shriftlar panelning o'zidan olinadi (allaqachon yuklangan) —
       serverdagi shrift muammosi umuman yo'q;
     * matn yoki rang o'zgarsa SHU ZAHOTI qayta chiziladi — "jonli
       shablon", tugma bosish shart emas;
     * server umuman chaqirilmaydi: tez, bepul, xatoga joy yo'q;
     * yuklab olish ham shu canvas'dan (toBlob) — sifat bir xil,
       1620 x 1021 px, plastik karta nisbati.
   ================================================================== */
const KP_EN = 1620, KP_BO = 1021;      // ISO ID-1 nisbati (1 : 1.586)

const KP_FONLAR = {
  kok:     { a:'#0A1B33', b:'#102948', c:'#03070E', nur:'#3A6FDD', nurOp:0.15, markaz:'#6E9BF0' },
  yashil:  { a:'#07231C', b:'#0C3A2B', c:'#020C09', nur:'#1F8A62', nurOp:0.16, markaz:'#44C79A' },
  kulrang: { a:'#141720', b:'#1E222C', c:'#06080C', nur:'#6A7384', nurOp:0.14, markaz:'#9AA6BA' }
};

/* ---------------- SHRIFTLAR (20 xil) ----------------
   Saytning o'z ikki shrifti darhol ishlaydi (fayl panel bilan birga
   keladi). Qolganlari Google Fonts'dan FAQAT TANLANGANDA yuklanadi —
   hammasini oldindan yuklash panelni sekinlashtirardi.

   CSP (netlify.toml) buni ataylab ruxsat etadi:
     style-src ... https://fonts.googleapis.com
     font-src  ... https://fonts.gstatic.com
   Boshqa manba qo'shib bo'lmaydi, ya'ni bu teshik ochmaydi.

   Shrift yuklanmasa (internet sekin, Google to'silgan) — canvas
   avtomatik saytning o'z shriftiga qaytadi, rasm baribir chiqadi. */
const KP_MAHALLIY = ['Space Mono', 'Inter'];
const KP_YUKLANGAN = {};

function kpShriftYukla(oila, vazn){
  if(KP_MAHALLIY.indexOf(oila) !== -1) return Promise.resolve(true);
  if(KP_YUKLANGAN[oila]) return KP_YUKLANGAN[oila];
  KP_YUKLANGAN[oila] = new Promise((bajar)=>{
    try{
      const nom = oila.replace(/ /g, '+');
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + nom + ':wght@' + vazn + '&display=swap';
      l.onerror = ()=> bajar(false);
      document.head.appendChild(l);
      /* Stylesheet kelgandan keyin shriftning O'ZI ham yuklanishi kerak */
      const kut = ()=> document.fonts.load(vazn + ' 184px "' + oila + '"')
        .then(list => bajar(list && list.length > 0))
        .catch(()=> bajar(false));
      l.onload = kut;
      setTimeout(kut, 1200);              // onload kelmasa ham urinamiz
      setTimeout(()=> bajar(false), 6000); // umuman kelmasa — zaxiraga
    }catch(e){ bajar(false); }
  });
  return KP_YUKLANGAN[oila];
}

function kpTanlanganShrift(){
  const el = document.getElementById('kpShrift');
  const q = (el && el.value) || 'Space Mono|700';
  const [oila, vazn] = q.split('|');
  return { oila: oila, vazn: vazn || '700' };
}

let KP_LOGO = null;          // <img> — bir marta yuklanadi
let KP_SHRIFT_TAYYOR = false;
let KP_NAVBAT = false;       // kadrga bir marta chizish uchun

function kpXabar(matn, yomon){
  const el = document.getElementById('kpMsg');
  if(!el) return;
  el.textContent = matn || '';
  el.style.color = yomon ? 'var(--red)' : '';
}

/* --- kichik yordamchilar (serverdagilar bilan bir xil mantiq) --- */
function kpChiroyliRaqam(v){
  const d = String(v || '').replace(/\D/g, '').replace(/^998/, '');
  if(d.length !== 9) return String(v || '').trim();
  return d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5,7) + ' ' + d.slice(7,9);
}
function kpPul(n){
  const x = Number(n) || 0;
  if(!x) return '';
  return x.toLocaleString('ru-RU').replace(/ /g, ' ');
}
function kpYumaloq(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function kpRgba(hex, op){
  const h = hex.replace('#','');
  const n = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
  return 'rgba(' + ((n>>16)&255) + ',' + ((n>>8)&255) + ',' + (n&255) + ',' + op + ')';
}

/* Guilloche — bank kartalaridagi nozik to'lqinli naqsh.
   Kichik offscreen canvas'da bir marta chiziladi, keyin naqsh (pattern)
   sifatida takrorlanadi — har kadrda qayta chizilmaydi. */
let KP_NAQSH = null;
function kpNaqsh(ctx){
  if(KP_NAQSH) return KP_NAQSH;
  const c = document.createElement('canvas');
  c.width = 46; c.height = 46;
  const g = c.getContext('2d');
  const tolqin = (y, rang, qalin)=>{
    g.beginPath();
    g.moveTo(0, y);
    g.quadraticCurveTo(11.5, y - 16, 23, y);
    g.quadraticCurveTo(34.5, y + 16, 46, y);
    g.strokeStyle = rang; g.lineWidth = qalin; g.stroke();
  };
  tolqin(23, 'rgba(240,216,152,0.045)', 1.1);
  tolqin(11.5, 'rgba(255,255,255,0.035)', 1);
  tolqin(34.5, 'rgba(255,255,255,0.03)', 1);
  KP_NAQSH = ctx.createPattern(c, 'repeat');
  return KP_NAQSH;
}

function kpQiymatlar(){
  const ol = (id)=> (document.getElementById(id) || {}).value || '';
  return {
    raqam: String(ol('kpRaqam')).trim(),
    toifa: String(ol('kpToifa')).trim().slice(0,18).toUpperCase(),
    fon: ol('kpFon') || 'kok',
    narx: Number(ol('kpNarx')) || 0,
    eskiNarx: Number(ol('kpEski')) || 0,
    oylik: Number(ol('kpOylik')) || 0,
    oylar: Number(ol('kpOylar')) || 24,
    valyuta: ol('kpValyuta') || "so'm",
    telefon: String(ol('kpTelefon')).trim().slice(0,24)
  };
}

/* ---------------- ASOSIY CHIZUVCHI ---------------- */
function kpChizKanvas(){
  const cv = document.getElementById('kpKanvas');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const o = kpQiymatlar();
  const F = KP_FONLAR[o.fon] || KP_FONLAR.kok;

  const W = KP_EN, H = KP_BO;
  const M = 44, KW = W - M*2, KH = H - M*2, R = 72;
  const P = M + 76, ICH = KW - 152;

  ctx.clearRect(0, 0, W, H);

  /* --- tashqi fon --- */
  let g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#050B16'); g.addColorStop(1, '#020611');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  /* --- karta soyasi --- */
  ctx.save();
  ctx.shadowColor = 'rgba(1,6,15,0.55)'; ctx.shadowBlur = 52; ctx.shadowOffsetY = 18;
  kpYumaloq(ctx, M, M, KW, KH, R);
  ctx.fillStyle = '#01060F'; ctx.fill();
  ctx.restore();

  /* --- karta asosi (hamma qatlam shu shakl ichida) --- */
  ctx.save();
  kpYumaloq(ctx, M, M, KW, KH, R);
  ctx.clip();

  g = ctx.createLinearGradient(M, M, M + KW*0.62, M + KH);
  g.addColorStop(0, F.a); g.addColorStop(0.42, F.b); g.addColorStop(1, F.c);
  ctx.fillStyle = g; ctx.fillRect(M, M, KW, KH);

  /* guilloche naqshi */
  ctx.save();
  ctx.translate(M, M); ctx.rotate(24 * Math.PI / 180);
  ctx.fillStyle = kpNaqsh(ctx);
  ctx.fillRect(-KH, -KW, KW + KH*2, KH + KW*2);
  ctx.restore();

  /* o'ng-tepadagi oltin nur */
  g = ctx.createRadialGradient(M + KW*1.02, M - KH*0.12, 0, M + KW*1.02, M - KH*0.12, KW*0.9);
  g.addColorStop(0, 'rgba(246,223,164,0.26)');
  g.addColorStop(0.44, 'rgba(246,223,164,0.07)');
  g.addColorStop(0.68, 'rgba(246,223,164,0)');
  ctx.fillStyle = g; ctx.fillRect(M, M, KW, KH);

  /* chap-pastdagi rangli nur */
  g = ctx.createRadialGradient(M - KW*0.08, M + KH*1.1, 0, M - KW*0.08, M + KH*1.1, KW*0.9);
  g.addColorStop(0, kpRgba(F.nur, F.nurOp));
  g.addColorStop(0.68, kpRgba(F.nur, 0));
  ctx.fillStyle = g; ctx.fillRect(M, M, KW, KH);

  /* diagonal shisha yaltirashi */
  g = ctx.createLinearGradient(M, M, M + KW*0.6, M + KH);
  g.addColorStop(0, 'rgba(255,255,255,0.055)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(M + KW*0.46, M);
  ctx.lineTo(M + KW*0.74, M);
  ctx.lineTo(M + KW*0.30, M + KH);
  ctx.lineTo(M + KW*0.04, M + KH);
  ctx.closePath(); ctx.fill();

  /* chetlardagi qorayish (vinyet) */
  g = ctx.createRadialGradient(M + KW*0.5, M + KH*0.1, 0, M + KW*0.5, M + KH*0.1, KW*0.95);
  g.addColorStop(0.36, 'rgba(1,5,13,0)');
  g.addColorStop(1, 'rgba(1,5,13,0.66)');
  ctx.fillStyle = g; ctx.fillRect(M, M, KW, KH);
  ctx.restore();

  /* --- oltin ramka va ichki nozik chiziq --- */
  g = ctx.createLinearGradient(M, M, M + KW*0.7, M + KH);
  g.addColorStop(0, 'rgba(240,216,152,0.8)');
  g.addColorStop(0.34, 'rgba(240,216,152,0.2)');
  g.addColorStop(0.62, 'rgba(255,255,255,0.07)');
  g.addColorStop(1, 'rgba(240,216,152,0.3)');
  kpYumaloq(ctx, M+2, M+2, KW-4, KH-4, R-2);
  ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.stroke();
  kpYumaloq(ctx, M+16, M+16, KW-32, KH-32, R-14);
  ctx.strokeStyle = 'rgba(240,216,152,0.14)'; ctx.lineWidth = 1.6; ctx.stroke();

  /* --- tepa chap: logotip --- */
  if(KP_LOGO && KP_LOGO.complete && KP_LOGO.naturalWidth){
    const lb = 74, le = Math.round(lb * KP_LOGO.naturalWidth / KP_LOGO.naturalHeight);
    ctx.globalAlpha = 0.96;
    ctx.drawImage(KP_LOGO, P, M + 58, le, lb);
    ctx.globalAlpha = 1;
    ctx.font = '600 15px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#6F82A0'; ctx.textAlign = 'left';
    ctx.fillText('Chiroyli va VIP telefon raqamlar', P + 2, M + 156);
  }

  /* --- tepa o'ng: toifa yorlig'i --- */
  if(o.toifa){
    ctx.font = '800 20px Inter, system-ui, sans-serif';
    const en = Math.round(ctx.measureText(o.toifa).width + o.toifa.length * 2.8) + 54;
    const x = W - P - en, y = M + 72;
    g = ctx.createLinearGradient(x, y, x + en, y + 52);
    g.addColorStop(0, '#FBF0CF'); g.addColorStop(0.4, '#EDD79A');
    g.addColorStop(0.72, '#D5B059'); g.addColorStop(1, '#B8902F');
    kpYumaloq(ctx, x, y, en, 52, 15);
    ctx.globalAlpha = 0.92; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#201702'; ctx.textAlign = 'center';
    kpHarfOraliq(ctx, o.toifa, x + en/2, y + 34, 2.8, 'center');
  }

  /* --- RAQAM: kartaning markazi --- */
  const raqam = kpChiroyliRaqam(o.raqam) || '—';
  const rSh = raqam.length > 15 ? 124 : (raqam.length > 13 ? 150 : (raqam.length > 11 ? 164 : 184));
  const OX = W / 2;
  /* vertikal markaz: sarlavha ostidan pastki chiziqqacha */
  const bosh = M + 186, oxir = H - M - 172 - 52;
  const CY = Math.round(bosh + (oxir - bosh) / 2 + rSh * 0.30);

  /* raqam ortidagi yumshoq nur */
  g = ctx.createRadialGradient(OX, CY - rSh*0.28, 0, OX, CY - rSh*0.28, Math.round(W*0.38));
  g.addColorStop(0, kpRgba(F.markaz, 0.10));
  g.addColorStop(0.45, kpRgba(F.markaz, 0.035));
  g.addColorStop(1, kpRgba(F.markaz, 0));
  ctx.save();
  kpYumaloq(ctx, M, M, KW, KH, R); ctx.clip();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(OX, CY - rSh*0.28, Math.round(W*0.38), Math.round(rSh*0.95), 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  const SH = kpTanlanganShrift();
  ctx.font = SH.vazn + ' ' + rSh + 'px "' + SH.oila + '", "Space Mono", ui-monospace, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  /* 1) to'q soya */
  ctx.save();
  ctx.shadowColor = 'rgba(1,5,14,0.62)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 7;
  ctx.fillStyle = 'rgba(1,5,14,0.62)';
  ctx.fillText(raqam, OX + 5, CY + 7);
  ctx.restore();
  /* 2) oltin folga + konturi */
  const yuq = CY - rSh*0.74, past = CY + rSh*0.12;
  g = ctx.createLinearGradient(OX, yuq, OX + rSh*0.12, past);
  g.addColorStop(0, '#FFF8E2'); g.addColorStop(0.22, '#F7E3AE');
  g.addColorStop(0.52, '#E7C473'); g.addColorStop(0.78, '#D2A747');
  g.addColorStop(1, '#B98A2B');
  const gq = ctx.createLinearGradient(OX, yuq, OX + rSh*0.12, past);
  gq.addColorStop(0, '#F3E0AC'); gq.addColorStop(0.5, '#D9AE4C'); gq.addColorStop(1, '#A97C22');
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(rSh/38));
  ctx.strokeStyle = gq; ctx.strokeText(raqam, OX, CY);
  ctx.fillStyle = g;  ctx.fillText(raqam, OX, CY);

  /* --- pastki qator --- */
  const PY = H - M - 172;
  g = ctx.createLinearGradient(P, 0, P + ICH, 0);
  g.addColorStop(0, 'rgba(240,216,152,0.55)');
  g.addColorStop(0.58, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(P, PY - 30, ICH, 2);

  const narx = kpPul(o.narx);
  ctx.textAlign = 'left';
  if(narx){
    ctx.fillStyle = '#6F82A0';
    ctx.font = '700 15px Inter, system-ui, sans-serif';
    kpHarfOraliq(ctx, 'NARXI', P, PY + 14, 2.4, 'left');
    ctx.font = SH.vazn + ' 48px "' + SH.oila + '", "Space Mono", monospace';
    ctx.fillStyle = '#DDE7F5';
    ctx.fillText(narx, P, PY + 72);
    const en = ctx.measureText(narx).width;
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#6F82A0';
    ctx.fillText(o.valyuta, P + en + 13, PY + 72);
    if(o.eskiNarx && o.eskiNarx > o.narx){
      const e = kpPul(o.eskiNarx);
      ctx.font = SH.vazn + ' 27px "' + SH.oila + '", "Space Mono", monospace';
      ctx.fillStyle = '#7C8FB0';
      ctx.fillText(e, P, PY + 108);
      const ew = ctx.measureText(e).width;
      ctx.fillRect(P, PY + 99, ew, 2);          // chizib ko'rsatish
    }
  }

  const oylikMatn = o.oylik ? (kpPul(o.oylik) + " so'mdan / " + o.oylar + ' oy') : '';
  if(oylikMatn){
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    const en = Math.round(ctx.measureText(oylikMatn).width) + 48;
    const x = narx ? (P + 420) : P;
    kpYumaloq(ctx, x, PY + 26, en, 58, 17);
    ctx.fillStyle = 'rgba(230,200,119,0.14)'; ctx.fill();
    ctx.strokeStyle = 'rgba(230,200,119,0.3)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = '#C9A85E';
    ctx.fillText(oylikMatn, x + 24, PY + 64);
  }

  ctx.textAlign = 'right';
  ctx.font = SH.vazn + ' 30px "' + SH.oila + '", "Space Mono", monospace';
  ctx.fillStyle = '#C9A85E';
  ctx.fillText('vipraqamlar.uz', W - P, PY + 36);
  if(o.telefon){
    ctx.font = SH.vazn + ' 27px "' + SH.oila + '", "Space Mono", monospace';
    ctx.fillStyle = '#C6D4E8';
    ctx.fillText(o.telefon, W - P, PY + 80);
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#6F82A0';
    ctx.fillText('Buyurtma uchun', W - P, PY + 110);
  }else{
    ctx.font = '600 17px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#6F82A0';
    ctx.fillText('Rasmiy shartnoma · Bepul yetkazib berish', W - P, PY + 76);
  }
  ctx.textAlign = 'left';
}

/* Canvas'da harflar orasini ochish (CSS'dagi letter-spacing yo'q) */
function kpHarfOraliq(ctx, matn, x, y, oraliq, joylash){
  const harflar = String(matn).split('');
  let en = 0;
  harflar.forEach(h => { en += ctx.measureText(h).width + oraliq; });
  en -= oraliq;
  let qalam = joylash === 'center' ? x - en/2 : x;
  const eski = ctx.textAlign;
  ctx.textAlign = 'left';
  harflar.forEach(h => { ctx.fillText(h, qalam, y); qalam += ctx.measureText(h).width + oraliq; });
  ctx.textAlign = eski;
}

/* Kadrga bir marta chizish — har bir harf uchun emas */
function kpJonli(){
  if(KP_NAVBAT) return;
  KP_NAVBAT = true;
  requestAnimationFrame(()=>{ KP_NAVBAT = false; kpChizKanvas(); });
}

function kpYukla(){
  const cv = document.getElementById('kpKanvas');
  if(!cv) return;
  const raqam = (document.getElementById('kpRaqam').value || '').replace(/\D/g, '').slice(-9);
  cv.toBlob((blob)=>{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vipraqamlar-' + (raqam || 'post') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
    kpXabar('✓ Yuklab olindi.');
    vibrate(60);
  }, 'image/png');
}

function kpTozala(){
  ['kpRaqam','kpToifa','kpNarx','kpEski','kpOylik','kpTelefon']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  const oy = document.getElementById('kpOylar'); if(oy) oy.value = '24';
  /* Fon rangi TOZALANMAYDI — admin odatda bitta rangda ishlaydi */
  kpXabar('');
  kpJonli();
}

/* --- ishga tushirish --- */
(function kpBoshlash(){
  const cv = document.getElementById('kpKanvas');
  if(!cv) return;

  /* Logotip bir marta yuklanadi */
  KP_LOGO = new Image();
  KP_LOGO.onload = kpJonli;
  KP_LOGO.onerror = ()=> kpXabar('Logotip yuklanmadi (assets/logo-vip.png) — qolgani ishlayveradi.', true);
  KP_LOGO.src = 'assets/logo-vip.png?v=1';

  /* Shriftlar yuklangach qayta chizamiz — aks holda birinchi chizishda
     brauzer zaxira shriftni ishlatib qo'yishi mumkin. */
  if(document.fonts && document.fonts.load){
    Promise.all([
      document.fonts.load('700 184px "Space Mono"'),
      document.fonts.load('800 20px Inter'),
      document.fonts.load('600 15px Inter')
    ]).then(()=>{ KP_SHRIFT_TAYYOR = true; kpJonli(); }).catch(()=>{});
  }

  /* Har bir maydon o'zgarganda JONLI qayta chiziladi */
  const sh = document.getElementById('kpShrift');
  if(sh){
    sh.addEventListener('change', ()=>{
      const t = kpTanlanganShrift();
      if(KP_MAHALLIY.indexOf(t.oila) !== -1){ kpJonli(); return; }
      kpXabar('Shrift yuklanmoqda\u2026');
      kpShriftYukla(t.oila, t.vazn).then(ok=>{
        kpXabar(ok ? '' : "\u26a0 \u201c" + t.oila + "\u201d yuklanmadi \u2014 saytning o'z shrifti ishlatildi.", !ok);
        kpJonli();
      });
    });
  }

  ['kpRaqam','kpToifa','kpFon','kpNarx','kpEski','kpOylik','kpOylar','kpValyuta','kpTelefon']
    .forEach(id => {
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('input', kpJonli);
      el.addEventListener('change', kpJonli);
    });

  const yk = document.getElementById('kpYuklaBtn');
  if(yk){ yk.style.display = ''; yk.addEventListener('click', kpYukla); }
  const tz = document.getElementById('kpTozaBtn');
  if(tz) tz.addEventListener('click', kpTozala);

  kpJonli();
})();


/* ==================================================================
   STORIES — bosh sahifadagi lenta (admin tomoni)
   ------------------------------------------------------------------
   V85 — bitta toifada 10 TAGACHA kadr (rasm yoki video), har biriga
   alohida "savdo bloki" (raqam + narx) qo'yish mumkin.

   TUZILISHI (Firestore `stories` hujjati):
     nom, doira (lentadagi qoplama), tartib, faol, havola,
     views, likes, likesBaza,
     kadrlar: [
       { tur:'rasm'|'video', url, yol, davomMs,
         savdo:{ raqam, narx, oyiga, eskiNarx, operator } }   // ixtiyoriy
     ]
   Eski story'larda `kadrlar` yo'q — ular bitta rasmli story sifatida
   o'qiladi, ya'ni hech narsa buzilmaydi.

   RASM: admin 9 MB gacha tanlaydi, lekin saytga o'sha kattalikda
   yuborilmaydi — brauzerning o'zida 1280 px ga siqiladi (qoplama esa
   256x256 kvadrat). VIDEO: 50 MB gacha, o'zgartirilmasdan yuklanadi
   (brauzerda videoni siqib bo'lmaydi).

   XAVFSIZLIK: yuklash faqat admin uchun (Storage qoidalari), Firestore
   qoidalari esa nom uzunligini, havola turini (faqat https:// yoki
   #/...), rasm manzilini (faqat Firebase Storage) va kadrlar sonini
   (10 tadan oshmasin) tekshiradi. Sayt tomoni ham har bir kadr
   manzilini qaytadan tekshiradi — ikki qatlam.
   ================================================================== */
let ST_ROYXAT = [];
let ST_TAHRIR = null;          // tahrirlanayotgan story id (yo'q bo'lsa — yangi)
let ST_KADRLAR = [];           // formadagi kadrlar ro'yxati
let ST_QOPLAMA = null;         // alohida tanlangan qoplama (ixtiyoriy)
let ST_OCHIR = [];             // tahrirda olib tashlangan eski fayl yo'llari

const ST_KADR_MAX = 10;
const ST_RASM_MAX = 9 * 1024 * 1024;     // 9 MB
const ST_VIDEO_MAX = 50 * 1024 * 1024;   // 50 MB

/* Boshlang'ich yurakchalar soni: 1000..3000 (mijoz so'rovi) */
const ST_LIKE_PAST = 1000, ST_LIKE_YUQORI = 3000;
function stLikeBaza(){
  try{
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return ST_LIKE_PAST + (a[0] % (ST_LIKE_YUQORI - ST_LIKE_PAST + 1));
  }catch(e){
    return ST_LIKE_PAST + Math.floor(Math.random() * (ST_LIKE_YUQORI - ST_LIKE_PAST + 1));
  }
}
/* Mijoz ekranidagi kabi — ANIQ son, minglar ajratilgan */
function stSonAniq(n){
  n = Math.max(0, Math.round(Number(n) || 0));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* Rasmni kvadrat qirqib, kerakli o'lchamga siqadi (brauzerning o'zida) */
function stRasmSiq(file, olcham, kvadrat){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onerror = ()=> reject(new Error("Rasmni o'qib bo'lmadi"));
    fr.onload = ()=>{
      const img = new Image();
      img.onerror = ()=> reject(new Error("Rasm formati tushunarsiz"));
      img.onload = ()=>{
        let w = img.width, h = img.height, sx = 0, sy = 0, sw = w, sh = h;
        if(kvadrat){
          const t = Math.min(w, h);
          sx = Math.round((w - t) / 2); sy = Math.round((h - t) / 2);
          sw = sh = t; w = h = olcham;
        }else{
          const k = Math.min(1, olcham / Math.max(w, h));
          w = Math.round(w * k); h = Math.round(h * k);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        c.toBlob(b => b ? resolve(b) : reject(new Error('Siqib bo‘lmadi')), 'image/jpeg', 0.86);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

function stXabar(matn, yomon){
  const msg = document.getElementById('stMsg');
  if(!msg) return;
  msg.textContent = matn || '';
  msg.style.color = yomon ? 'var(--red)' : '';
}

/* ---------- KADR TANLASH (bir nechta fayl birdan) ---------- */
(function stFaylTanlash(){
  const inp = document.getElementById('stFayl');
  if(!inp) return;
  inp.addEventListener('change', async ()=>{
    const fayllar = Array.from(inp.files || []);
    inp.value = '';
    if(!fayllar.length) return;
    if(ST_KADRLAR.length + fayllar.length > ST_KADR_MAX){
      stXabar('Bitta toifaga eng ko‘pi bilan ' + ST_KADR_MAX + ' ta kadr qo‘yiladi. '
        + 'Hozir ' + ST_KADRLAR.length + ' ta bor.', true);
      return;
    }
    stXabar('Fayllar tayyorlanmoqda...');
    for(const f of fayllar){
      try{
        if(/^video\//.test(f.type)){
          if(f.size > ST_VIDEO_MAX){
            stXabar('"' + f.name + '" — video 50 MB dan katta ('
              + (f.size/1048576).toFixed(1) + ' MB). Qisqarog‘ini tanlang.', true);
            continue;
          }
          ST_KADRLAR.push({ tur:'video', yangi:true, fayl:f, nom:f.name,
            oldin:URL.createObjectURL(f), olcham:f.size, savdo:null });
        }else if(/^image\//.test(f.type)){
          if(f.size > ST_RASM_MAX){
            stXabar('"' + f.name + '" — rasm 9 MB dan katta ('
              + (f.size/1048576).toFixed(1) + ' MB). Kichikrog‘ini tanlang.', true);
            continue;
          }
          const toliq = await stRasmSiq(f, 1280, false);
          const doira = await stRasmSiq(f, 256, true);
          ST_KADRLAR.push({ tur:'rasm', yangi:true, blob:toliq, qoplama:doira, nom:f.name,
            oldin:URL.createObjectURL(doira), olcham:toliq.size, savdo:null });
        }else{
          stXabar('"' + f.name + '" — faqat rasm yoki video qabul qilinadi.', true);
        }
      }catch(e){ stXabar('"' + f.name + '": ' + e.message, true); }
    }
    stKadrChiz();
    if(!document.getElementById('stMsg').style.color) stXabar('');
  });
})();

/* Alohida qoplama rasmi (ixtiyoriy) */
(function stQoplamaTanlash(){
  const inp = document.getElementById('stQoplama');
  if(!inp) return;
  inp.addEventListener('change', async ()=>{
    const f = inp.files && inp.files[0];
    if(!f) return;
    if(!/^image\//.test(f.type)){ stXabar('Qoplama faqat rasm bo‘ladi.', true); inp.value=''; return; }
    if(f.size > ST_RASM_MAX){ stXabar('Qoplama 9 MB dan katta.', true); inp.value=''; return; }
    try{
      ST_QOPLAMA = await stRasmSiq(f, 256, true);
      const im = document.getElementById('stQopImg');
      if(im){ im.src = URL.createObjectURL(ST_QOPLAMA); im.parentElement.style.display=''; }
      stXabar('');
    }catch(e){ stXabar(e.message, true); }
  });
})();

/* ---------- KADRLAR RO'YXATI (formada) ---------- */
function stKadrChiz(){
  const box = document.getElementById('stKadrlar');
  const soni = document.getElementById('stKadrSoni');
  if(!box) return;
  if(soni) soni.textContent = ST_KADRLAR.length + ' / ' + ST_KADR_MAX;
  if(!ST_KADRLAR.length){
    box.innerHTML = '<div class="wt-empty" style="padding:14px">Hali kadr qo‘shilmagan. '
      + 'Yuqoridan rasm yoki video tanlang (birdan bir nechtasini ham bo‘ladi).</div>';
    return;
  }
  box.innerHTML = ST_KADRLAR.map((k, i) => {
    const sv = k.savdo || {};
    const ochiq = !!k.savdoOchiq;
    const oldin = k.oldin || k.qoplamaUrl || (k.tur === 'rasm' ? k.url : '');
    return `
    <div class="st-kadr${ochiq ? ' ochiq' : ''}">
      <span class="st-kadr-ras">
        ${oldin ? `<img src="${escapeHtml(oldin)}" alt="">` : '<span class="st-kadr-vid">🎬</span>'}
        <i class="st-kadr-tur">${k.tur === 'video' ? 'VIDEO' : 'RASM'}</i>
      </span>
      <div class="st-kadr-mat">
        <b>${i + 1}-kadr</b>
        <span>${escapeHtml(k.nom || '')}${k.olcham ? ' · ' + (k.olcham/1024).toFixed(0) + ' KB' : ''}</span>
        ${k.savdo ? `<em class="st-kadr-sv">🛒 ${escapeHtml(k.savdo.raqam || '')} — ${stSonAniq(k.savdo.narx)} so'm</em>` : ''}
      </div>
      <div class="st-kadr-act">
        <button class="btn btn-ghost btn-sm" data-kup="${i}" ${i===0?'disabled':''} title="Yuqoriga">▲</button>
        <button class="btn btn-ghost btn-sm" data-kdown="${i}" ${i===ST_KADRLAR.length-1?'disabled':''} title="Pastga">▼</button>
        <button class="btn btn-ghost btn-sm" data-ksv="${i}">${k.savdo ? '🛒 Savdo bor' : '🛒 Savdo'}</button>
        <button class="btn btn-dan btn-sm" data-kdel="${i}">&#10005;</button>
      </div>
      <div class="st-kadr-forma" ${ochiq ? '' : 'style="display:none"'}>
        <p class="op-note" style="margin:0 0 8px">
          Shu kadr ochilganda pastda <b>buyurtma kartochkasi</b> chiqadi: raqam, narxi va
          "Buyurtma" tugmasi. Tugma bosilsa — saytning o'z buyurtma oynasi ochiladi.
          Bo'sh qoldirsangiz, kartochka ko'rsatilmaydi.
        </p>
        <div class="st-kadr-qator">
          <label>Raqam<input type="text" data-kf="raqam" data-ki="${i}" placeholder="+998 90 123 45 67" value="${escapeHtml(sv.raqam || '')}"></label>
          <label>Narxi (so'm)<input type="number" data-kf="narx" data-ki="${i}" placeholder="25000000" value="${sv.narx || ''}"></label>
        </div>
        <div class="st-kadr-qator">
          <label>Oyiga (24 oy, ixtiyoriy)<input type="number" data-kf="oyiga" data-ki="${i}" placeholder="1250000" value="${sv.oyiga || ''}"></label>
          <label>Eski narx (ixtiyoriy)<input type="number" data-kf="eskiNarx" data-ki="${i}" placeholder="30000000" value="${sv.eskiNarx || ''}"></label>
        </div>
        <div class="st-kadr-qator">
          <label>Operator (ixtiyoriy)
            <select data-kf="operator" data-ki="${i}">
              <option value="">—</option>
              ${['Beeline','Ucell','Humans','Mobiuz','Uzmobile','Perfektum'].map(o =>
                `<option value="${o}" ${sv.operator === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select></label>
          <label style="align-self:end">
            <button class="btn btn-ghost btn-sm" data-ksvoch="${i}" type="button">Savdoni olib tashlash</button>
          </label>
        </div>
      </div>
    </div>`; }).join('');

  const kochir = (i, j)=>{
    if(j < 0 || j >= ST_KADRLAR.length) return;
    const t = ST_KADRLAR[i]; ST_KADRLAR[i] = ST_KADRLAR[j]; ST_KADRLAR[j] = t;
    stKadrChiz();
  };
  box.querySelectorAll('[data-kup]').forEach(b => b.onclick = ()=> kochir(+b.dataset.kup, +b.dataset.kup - 1));
  box.querySelectorAll('[data-kdown]').forEach(b => b.onclick = ()=> kochir(+b.dataset.kdown, +b.dataset.kdown + 1));
  box.querySelectorAll('[data-kdel]').forEach(b => b.onclick = ()=>{
    const i = +b.dataset.kdel;
    const k = ST_KADRLAR[i];
    if(k && !k.yangi && k.yol) ST_OCHIR.push(k.yol);   /* saqlashda Storage'dan o'chadi */
    ST_KADRLAR.splice(i, 1);
    stKadrChiz();
  });
  box.querySelectorAll('[data-ksv]').forEach(b => b.onclick = ()=>{
    const i = +b.dataset.ksv;
    ST_KADRLAR[i].savdoOchiq = !ST_KADRLAR[i].savdoOchiq;
    if(ST_KADRLAR[i].savdoOchiq && !ST_KADRLAR[i].savdo) ST_KADRLAR[i].savdo = { raqam:'', narx:0 };
    stKadrChiz();
  });
  box.querySelectorAll('[data-ksvoch]').forEach(b => b.onclick = ()=>{
    const i = +b.dataset.ksvoch;
    ST_KADRLAR[i].savdo = null; ST_KADRLAR[i].savdoOchiq = false;
    stKadrChiz();
  });
  box.querySelectorAll('[data-kf]').forEach(el => {
    el.oninput = el.onchange = ()=>{
      const i = +el.dataset.ki, f = el.dataset.kf;
      ST_KADRLAR[i].savdo = ST_KADRLAR[i].savdo || { raqam:'', narx:0 };
      ST_KADRLAR[i].savdo[f] = (f === 'raqam' || f === 'operator') ? el.value : (Number(el.value) || 0);
    };
  });
}

/* Havolani tekshirish — Firestore qoidalari bilan AYNAN bir xil shart. */
function stHavolaOk(h){
  if(!h) return true;
  return /^https:\/\/[^\s"'<>]+$/.test(h) || /^#\/[A-Za-z0-9\/-]*$/.test(h);
}
/* Savdo bloki to'liq to'ldirilganmi */
function stSavdoToliq(sv){
  if(!sv) return null;
  const raqam = String(sv.raqam || '').replace(/\D/g, '');
  if(raqam.length < 9 || !(Number(sv.narx) > 0)) return null;
  return {
    raqam: '+998 ' + raqam.slice(-9).replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'),
    narx: Number(sv.narx) || 0,
    oyiga: Number(sv.oyiga) || 0,
    eskiNarx: Number(sv.eskiNarx) || 0,
    operator: String(sv.operator || '').slice(0, 20)
  };
}

/* Formani bo'shatish / tahrir rejimidan chiqish */
function stFormaTozala(){
  ST_TAHRIR = null; ST_KADRLAR = []; ST_QOPLAMA = null; ST_OCHIR = [];
  const q = (id)=> document.getElementById(id);
  if(q('stNom')) q('stNom').value = '';
  if(q('stHavola')) q('stHavola').value = '';
  if(q('stFayl')) q('stFayl').value = '';
  if(q('stQoplama')) q('stQoplama').value = '';
  if(q('stQop')) q('stQop').style.display = 'none';
  if(q('stYuklaBtn')) q('stYuklaBtn').textContent = '⬆️ Qo‘shish';
  if(q('stBekorBtn')) q('stBekorBtn').style.display = 'none';
  if(q('stRejim')) q('stRejim').textContent = '';
  stXabar('');
  stKadrChiz();
}

/* Tahrirlashni boshlash */
function stTahrirBoshla(id){
  const s = ST_ROYXAT.find(x => x.id === id);
  if(!s) return;
  ST_TAHRIR = id; ST_QOPLAMA = null; ST_OCHIR = [];
  document.getElementById('stNom').value = s.nom || '';
  document.getElementById('stHavola').value = s.havola || '';
  document.getElementById('stFayl').value = '';
  document.getElementById('stQoplama').value = '';

  /* Mavjud kadrlarni formaga olamiz (eski ko'rinish — bitta rasm) */
  const bor = Array.isArray(s.kadrlar) && s.kadrlar.length
    ? s.kadrlar
    : (s.rasm ? [{ tur:'rasm', url:s.rasm, yol:s.yol }] : []);
  ST_KADRLAR = bor.slice(0, ST_KADR_MAX).map((k, i) => ({
    tur: k.tur === 'video' ? 'video' : 'rasm',
    url: k.url, yol: k.yol, yangi: false,
    nom: (k.tur === 'video' ? 'video' : 'rasm') + ' ' + (i + 1),
    oldin: k.tur === 'video' ? (s.doira || '') : k.url,
    savdo: k.savdo || null, savdoOchiq: false
  }));

  const qop = document.getElementById('stQop');
  if(qop && (s.doira || s.rasm)){
    qop.style.display = '';
    document.getElementById('stQopImg').src = s.doira || s.rasm;
  }
  document.getElementById('stYuklaBtn').textContent = '💾 Saqlash';
  const bek = document.getElementById('stBekorBtn');
  if(bek) bek.style.display = '';
  const rej = document.getElementById('stRejim');
  if(rej) rej.textContent = 'Tahrirlanmoqda: ' + (s.nom || '');
  stXabar('');
  stKadrChiz();
  try{ document.getElementById('stNom').scrollIntoView({ block:'center', behavior:'smooth' }); }catch(e){}
  document.getElementById('stNom').focus();
}

/* Bitta blobni Storage'ga yuklab, manzilini qaytaradi */
async function stFaylYukla(yol, blob, tur){
  const r = storage.ref().child(yol);
  await r.put(blob, { contentType: tur, cacheControl: 'public,max-age=31536000' });
  return await r.getDownloadURL();
}

/* Qo'shish VA tahrirlash — bitta funksiya */
async function stYukla(){
  const btn = document.getElementById('stYuklaBtn');
  const nom = (document.getElementById('stNom').value || '').trim();
  const havola = (document.getElementById('stHavola').value || '').trim();
  const wrap = document.getElementById('stProgressWrap');
  const bar = document.getElementById('stProgressBar');
  stXabar('');
  if(!nom){ stXabar('Nomini yozing.', true); return; }
  if(!stHavolaOk(havola)){
    stXabar("Havola noto'g'ri. Faqat https:// bilan boshlanadigan to'liq manzil "
      + "yoki saytning o'z bo'limi (masalan #/katalog) yoziladi.", true);
    return;
  }
  if(!ST_KADRLAR.length){ stXabar('Kamida bitta rasm yoki video qo‘shing.', true); return; }
  /* Savdo bloki boshlangan, lekin to'ldirilmagan bo'lsa — ogohlantiramiz */
  const chala = ST_KADRLAR.findIndex(k => k.savdo && !stSavdoToliq(k.savdo));
  if(chala >= 0){
    stXabar((chala + 1) + '-kadrdagi savdo bloki to‘liq emas: raqam (9 xona) va narxini yozing, '
      + 'yoki "Savdoni olib tashlash" tugmasini bosing.', true);
    return;
  }
  const yuklash = ST_KADRLAR.some(k => k.yangi) || ST_QOPLAMA;
  if(yuklash && !storage){
    stXabar("Firebase Storage sozlanmagan (Firebase Console → Storage → Get started).", true);
    return;
  }

  btn.disabled = true; wrap.style.display = 'block'; bar.style.width = '4%';
  try{
    const asos = 'stories/' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    const jami = ST_KADRLAR.filter(k => k.yangi).length + (ST_QOPLAMA ? 1 : 0) || 1;
    let bajarildi = 0;
    const qadam = ()=>{ bajarildi++; bar.style.width = Math.min(92, 4 + (bajarildi/jami)*86) + '%'; };

    /* 1) Yangi kadrlarni yuklaymiz */
    const kadrlar = [];
    let birinchiQoplama = null;
    for(let i = 0; i < ST_KADRLAR.length; i++){
      const k = ST_KADRLAR[i];
      if(k.yangi){
        const yol = asos + '_' + i + (k.tur === 'video' ? '.mp4' : '.jpg');
        const url = await stFaylYukla(yol, k.tur === 'video' ? k.fayl : k.blob,
          k.tur === 'video' ? (k.fayl.type || 'video/mp4') : 'image/jpeg');
        kadrlar.push({ tur:k.tur, url, yol, davomMs:0, savdo: stSavdoToliq(k.savdo) });
        if(k.tur === 'rasm' && !birinchiQoplama) birinchiQoplama = k.qoplama;
        qadam();
      }else{
        kadrlar.push({ tur:k.tur, url:k.url, yol:k.yol || '', davomMs:0, savdo: stSavdoToliq(k.savdo) });
      }
    }

    /* 2) Qoplama: alohida tanlangan bo'lsa o'sha, bo'lmasa birinchi rasm */
    let doiraUrl = null;
    if(ST_QOPLAMA){
      doiraUrl = await stFaylYukla(asos + '_q.jpg', ST_QOPLAMA, 'image/jpeg'); qadam();
    }else if(birinchiQoplama){
      doiraUrl = await stFaylYukla(asos + '_q.jpg', birinchiQoplama, 'image/jpeg'); qadam();
    }

    /* 3) Firestore */
    const yangi = {
      nom: nom.slice(0, 16),
      havola: havola.slice(0, 300),
      kadrlar
    };
    if(doiraUrl) yangi.doira = doiraUrl;
    /* Eski maydon — eski versiyadagi sayt ham ishlayversin */
    const birRasm = kadrlar.find(k => k.tur === 'rasm');
    if(birRasm) yangi.rasm = birRasm.url;

    if(ST_TAHRIR){
      await db.collection('stories').doc(ST_TAHRIR).update(yangi);
      stXabar('✓ Saqlandi — saytda darhol ko‘rinadi.');
    }else{
      const tartib = ST_ROYXAT.length ? Math.max.apply(null, ST_ROYXAT.map(x => Number(x.tartib) || 0)) + 1 : 1;
      await db.collection('stories').add(Object.assign(yangi, {
        tartib, faol: true, views: 0, likes: 0,
        likesBaza: stLikeBaza(), createdAt: Date.now()
      }));
      stXabar('✓ Qo‘shildi — saytda darhol ko‘rinadi.');
    }

    /* 4) Olib tashlangan eski fayllarni Storage'dan o'chiramiz */
    if(storage) for(const yol of ST_OCHIR){
      try{ await storage.ref().child(yol).delete(); }catch(e){}
    }

    bar.style.width = '100%';
    stFormaTozala();
    vibrate(80);
    loadStories();
  }catch(e){
    stXabar('Xato: ' + e.message, true);
  }finally{
    btn.disabled = false;
    setTimeout(()=>{ wrap.style.display = 'none'; bar.style.width = '0%'; }, 900);
  }
}
document.getElementById('stYuklaBtn') && document.getElementById('stYuklaBtn')
  .addEventListener('click', stYukla);
document.getElementById('stBekorBtn') && document.getElementById('stBekorBtn')
  .addEventListener('click', stFormaTozala);

async function loadStories(){
  const box = document.getElementById('stList');
  if(!box) return;
  box.innerHTML = '<div class="wt-empty">Yuklanmoqda...</div>';
  try{
    const snap = await db.collection('stories').limit(100).get();
    ST_ROYXAT = snap.docs.map(d => Object.assign({ id: d.id }, d.data() || {}))
      .sort((a, b) => (Number(a.tartib) || 0) - (Number(b.tartib) || 0));
    stChiz();
    stBazaniToldir();
  }catch(e){
    box.innerHTML = '<div class="wt-empty">Xato: ' + escapeHtml(e.message) + '</div>';
  }
}

async function stBazaniToldir(){
  const kerak = ST_ROYXAT.filter(s => !(Number(s.likesBaza) > 0));
  if(!kerak.length) return;
  for(const s of kerak){
    const baza = stLikeBaza();
    try{
      await db.collection('stories').doc(s.id).update({ likesBaza: baza });
      s.likesBaza = baza;
    }catch(e){ /* ruxsat bo'lmasa — jim o'tamiz */ }
  }
  stChiz();
}

function stChiz(){
  const box = document.getElementById('stList');
  if(!box) return;
  if(!ST_ROYXAT.length){
    box.innerHTML = '<div class="wt-empty">Hali story qo‘shilmagan. Yuqoridan rasm yoki video yuklang.</div>';
    return;
  }
  box.innerHTML = ST_ROYXAT.map((s, i) => {
    const kor = Number(s.views) || 0;
    const haqiqiy = Number(s.likes) || 0;
    const baza = Number(s.likesBaza) || 0;
    const kadrlar = Array.isArray(s.kadrlar) && s.kadrlar.length
      ? s.kadrlar : (s.rasm ? [{ tur:'rasm' }] : []);
    const video = kadrlar.filter(k => k && k.tur === 'video').length;
    const savdo = kadrlar.filter(k => k && k.savdo).length;
    return `
    <div class="st-row${s.faol === false ? ' st-off' : ''}${ST_TAHRIR === s.id ? ' st-edit' : ''}">
      <span class="st-doira"><img src="${escapeHtml(s.doira || s.rasm || '')}" alt="" loading="lazy"></span>
      <div class="st-info">
        <b>${escapeHtml(s.nom || '')}</b>
        <div class="st-stat">
          <span class="st-kad" title="Ichidagi rasm/video soni">
            ▣ <b>${kadrlar.length}</b> kadr${video ? ' (' + video + ' video)' : ''}</span>
          ${savdo ? `<span class="st-sv" title="Buyurtma kartochkasi qo'yilgan kadrlar">🛒 <b>${savdo}</b> savdo</span>` : ''}
          <span class="st-kor" title="Haqiqiy ko'rishlar soni (bitta odam 6 soatda bir marta sanaladi)">
            👁 <b>${stSonAniq(kor)}</b> ko'rildi</span>
          <span class="st-lik" title="Mijozlar haqiqatan bosgan yurakchalar">
            ❤️ <b>${stSonAniq(haqiqiy)}</b> haqiqiy</span>
          <span class="st-say" title="Saytda ko'rinadigan umumiy son (boshlang'ich ${stSonAniq(baza)} + haqiqiy ${stSonAniq(haqiqiy)})">
            saytda: <b>${stSonAniq(baza + haqiqiy)}</b></span>
          ${s.havola ? '<span title="Havola">🔗 ' + escapeHtml(s.havola) + '</span>' : ''}
        </div>
      </div>
      <div class="st-act">
        <button class="btn btn-ghost btn-sm" data-stup="${i}" ${i === 0 ? 'disabled' : ''} title="Yuqoriga">▲</button>
        <button class="btn btn-ghost btn-sm" data-stdown="${i}" ${i === ST_ROYXAT.length - 1 ? 'disabled' : ''} title="Pastga">▼</button>
        <button class="btn btn-ghost btn-sm" data-sted="${escapeHtml(s.id)}" title="Tahrirlash">✏️ Tahrirlash</button>
        <button class="btn btn-ghost btn-sm" data-stfaol="${escapeHtml(s.id)}" data-now="${s.faol === false ? '0' : '1'}">
          ${s.faol === false ? 'Yoqish' : 'Yashirish'}</button>
        <button class="btn btn-dan btn-sm" data-stdel="${escapeHtml(s.id)}">&#10005;</button>
      </div>
    </div>`; }).join('');

  box.querySelectorAll('[data-sted]').forEach(b => b.onclick = ()=> stTahrirBoshla(b.dataset.sted));
  box.querySelectorAll('[data-stfaol]').forEach(b => b.onclick = async ()=>{
    try{
      await db.collection('stories').doc(b.dataset.stfaol).update({ faol: b.dataset.now !== '1' });
      loadStories();
    }catch(e){ alert(e.message); }
  });
  box.querySelectorAll('[data-stdel]').forEach(b => b.onclick = async ()=>{
    if(!confirm("Story o'chirilsinmi? Ichidagi hamma rasm/video ham o'chadi.")) return;
    const s = ST_ROYXAT.find(x => x.id === b.dataset.stdel);
    try{
      await db.collection('stories').doc(b.dataset.stdel).delete();
      /* Fayllar ham o'chadi — Storage'da keraksiz fayl qolmasin */
      if(s && storage){
        const yollar = [];
        (Array.isArray(s.kadrlar) ? s.kadrlar : []).forEach(k => { if(k && k.yol) yollar.push(k.yol); });
        if(s.yol){ yollar.push(s.yol + '_d.jpg'); yollar.push(s.yol + '_t.jpg'); }
        for(const y of yollar){ try{ await storage.ref().child(y).delete(); }catch(e){} }
      }
      if(ST_TAHRIR === b.dataset.stdel) stFormaTozala();
      loadStories();
    }catch(e){ alert(e.message); }
  });
  const kochir = async (i, j)=>{
    const a = ST_ROYXAT[i], b2 = ST_ROYXAT[j];
    if(!a || !b2) return;
    try{
      await db.collection('stories').doc(a.id).update({ tartib: Number(b2.tartib) || (j + 1) });
      await db.collection('stories').doc(b2.id).update({ tartib: Number(a.tartib) || (i + 1) });
      loadStories();
    }catch(e){ alert(e.message); }
  };
  box.querySelectorAll('[data-stup]').forEach(b => b.onclick = ()=> kochir(Number(b.dataset.stup), Number(b.dataset.stup) - 1));
  box.querySelectorAll('[data-stdown]').forEach(b => b.onclick = ()=> kochir(Number(b.dataset.stdown), Number(b.dataset.stdown) + 1));
}


/* ---- Sana maydonlarini kun.oy.yil ko'rinishiga o'tkazish (V121) ----
   Sahifa tayyor bo'lgach bir marta; keyin DOM ga yangi sana maydoni
   qo'shilsa (masalan "Kredit" bo'limidagi tahrirlash formasi) — u ham
   avtomatik o'zgaradi (kuzatuvchi). Allaqachon o'zgartirilganlariga
   ikkinchi marta tegilmaydi. */
(function(){
  function boshla(){
    try{ sanaMaydonlariniUzlashtir(); }catch(e){}
    try{
      const kuzat = new MutationObserver((lar)=>{
        for(const l of lar){
          for(const n of l.addedNodes){
            if(!(n instanceof HTMLElement)) continue;
            if(n.matches && n.matches('input[type="date"]')) { try{ sanaMaydoniUz(n); }catch(e){} }
            else if(n.querySelectorAll) { try{ sanaMaydonlariniUzlashtir(n); }catch(e){} }
          }
        }
      });
      kuzat.observe(document.body, { childList:true, subtree:true });
    }catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boshla);
  else boshla();
})();
