// OPERATOR API ADAPTERLARI — Beeline, Ucell, Humans, Mobiuz.
//
// Har bir adapter bir xil ishlaydi: saytdagi 7 katakli mask (boxes) ni oladi,
// o'z operatorining formatiga o'giradi, so'rov yuboradi va natijani saytning
// katalog formatiga qaytaradi.
//
// MUHIM: bu yerdagi barcha URL/maydon nomlari real so'rov yuborib
// tasdiqlangan. Taxmin qilingan joy yo'q.
//
// Saytdagi mask: index.html:2280 — getLocalDigits() raqamning OXIRGI 7 ta
// raqamini oladi (+998 va 2 xonali operator kodi tashqarida qoladi).

// Bitta HTTP so'rovning eng ko'p kutish vaqti. Umumiy muddat (7s) dan
// past turishi kerak, aks holda so'rov bekorga osilib turadi.
const DEFAULT_TIMEOUT = 6500;

/* ---------- Umumiy yordamchilar ---------- */

function timeoutSignal(ms) {
  return AbortSignal.timeout(ms || DEFAULT_TIMEOUT);
}

// Raqamning oxirgi 7 xonasi — saytdagi katakchalar bilan solishtirish uchun.
// "998947483773" -> "7483773"
function localDigits(msisdn) {
  return String(msisdn).replace(/\D/g, '').slice(5);
}

// Katakchalar (7 ta, bo'shi '') raqamga mos keladimi.
function matchesBoxes(msisdn, boxes) {
  const local = localDigits(msisdn);
  if (local.length !== 7) return false;
  for (let i = 0; i < 7; i++) {
    if (boxes[i] && local[i] !== boxes[i]) return false;
  }
  return true;
}

// Katakchalardagi eng uzun UZLUKSIZ ma'lum raqamlar ketma-ketligi.
// Ucell pozitsion mask tushunmaydi — faqat "ichida bor" (search_type 2)
// qidiradi, shuning uchun unga shu bo'lakni yuboramiz, keyin o'zimiz
// pozitsiya bo'yicha filtrlaymiz.
function longestRun(boxes) {
  let best = '', cur = '';
  for (let i = 0; i < 7; i++) {
    if (boxes[i]) { cur += boxes[i]; if (cur.length > best.length) best = cur; }
    else cur = '';
  }
  return best;
}

// Set-Cookie sarlavhasidan kerakli cookie'larni ajratib olish.
// Node'ning fetch'i bir nechta Set-Cookie ni bitta satrga qo'shib yuborishi
// mumkin (sanalarda vergul bor — oddiy split ishonchsiz), shuning uchun
// nomi bo'yicha aniq qidiramiz.
function pickCookies(res, names) {
  let raw = '';
  if (typeof res.headers.getSetCookie === 'function') raw = res.headers.getSetCookie().join('\n');
  else raw = res.headers.get('set-cookie') || '';
  const out = [];
  for (const name of names) {
    const m = raw.match(new RegExp('(?:^|[\\n,;\\s])' + name + '=([^;\\n,]+)'));
    if (m) out.push(name + '=' + m[1]);
  }
  return out.join('; ');
}

/* ---------- Narx jadvallari ---------- */
//
// Chap ustun — operator so'ragan narx, o'ng ustun — saytda ko'rsatiladigan
// narx. Jadvalda yo'q qiymat kelsa, operator narxi o'z holicha qo'yiladi
// (kelishilgan qoida).

const DEFAULT_PRICES = {
  Beeline: [
    // Beeline javobida narx YO'Q — u warehouseId dan keladi (pastdagi ro'yxat).
  ],
  Ucell: [
    { operatorPrice: 0,        salePrice: 50000 },
    { operatorPrice: 100000,   salePrice: 150000 },
    { operatorPrice: 250000,   salePrice: 270000 },
    { operatorPrice: 500000,   salePrice: 300000 },
    { operatorPrice: 1000000,  salePrice: 350000 },
    { operatorPrice: 3000000,  salePrice: 400000 },
    { operatorPrice: 5000000,  salePrice: 5000000 },
    { operatorPrice: 10000000, salePrice: 10000000 },
    { operatorPrice: 20000000, salePrice: 20000000 },
    { operatorPrice: 30000000, salePrice: 30000000 }
  ],
  Humans: [
    // Humans "amount" ni TIYINDA qaytaradi — 100 ga bo'linadi (pastda).
    { operatorPrice: 0,        salePrice: 50000 },
    { operatorPrice: 54000,    salePrice: 180000 },
    // Kategoriya 2 — avval jadvalda umuman yo'q edi (operator narxida,
    // ustamasiz sotilardi). Endi qo'shildi.
    { operatorPrice: 108000,   salePrice: 308000 },
    { operatorPrice: 144000,   salePrice: 344000 },
    { operatorPrice: 288000,   salePrice: 488000 },
    { operatorPrice: 576000,   salePrice: 776000 },
    { operatorPrice: 1440000,  salePrice: 1800000 },
    { operatorPrice: 3600000,  salePrice: 3900000 },
    // Kategoriya 8 — avval 8 600 000 deb yozilgan edi, operatordagi haqiqiy
    // narxga (8 640 000) hech qachon mos kelmasdi. Tuzatildi.
    { operatorPrice: 8640000,  salePrice: 9000000 },
    { operatorPrice: 18000000, salePrice: 18000000 }
  ],
  Perfektum: [
    // BO'SH — narx jadvali hali berilmagan. Shu sababli Perfektum standart
    // holatda O'CHIRILGAN (pastdagi DEFAULT_ENABLED). Jadval kelgach
    // adminkadan to'ldiriladi va yoqiladi.
  ],
  Mobiuz: [
    // Aksiya narxlari ATAYLAB olinmadi — API ularni ajratib bermaydi
    // (SCN belgisi javobda yo'q), shuning uchun faqat oddiy narx.
    { operatorPrice: 0,        salePrice: 50000 },
    { operatorPrice: 300000,   salePrice: 450000 },
    { operatorPrice: 630000,   salePrice: 830000 },
    { operatorPrice: 840000,   salePrice: 950000 },
    { operatorPrice: 2000000,  salePrice: 2200000 },
    { operatorPrice: 5000000,  salePrice: 5100000 },
    { operatorPrice: 10000000, salePrice: 10000000 },
    { operatorPrice: 25000000, salePrice: 25000000 }
  ]
};

// Beeline omborlari: har bir warehouseId = bitta kategoriya = bitta narx.
const DEFAULT_BEELINE_WAREHOUSES = [
  { id: 393, name: 'Oddiy',     operatorPrice: 0,        salePrice: 50000 },
  { id: 394, name: 'Bronze',    operatorPrice: 100000,   salePrice: 150000 },
  { id: 395, name: 'Silver',    operatorPrice: 250000,   salePrice: 190000 },
  { id: 396, name: 'Gold',      operatorPrice: 500000,   salePrice: 400000 },
  { id: 397, name: 'Platinum',  operatorPrice: 1500000,  salePrice: 890000 },
  { id: 413, name: 'Platinum+', operatorPrice: 10000000, salePrice: 5000000 },
  { id: 409, name: '20 mln',    operatorPrice: 20000000, salePrice: 10000000 }
];

// Operator narxini sotuv narxiga o'girish. Jadvalda topilmasa — operator
// narxi o'zgarishsiz qaytadi.
function toSalePrice(table, operatorPrice) {
  const row = (table || []).find(r => Number(r.operatorPrice) === Number(operatorPrice));
  return row ? Number(row.salePrice) : Number(operatorPrice);
}

/* ---------- BEELINE ---------- */
//
// Login:   POST /dealer/api/v1/auth/login   (multipart/form-data!)
// Qidiruv: GET  /dealer/api/v1/phone-numbers/search?limit&hlrId&warehouseId&mask
// Javobda narx yo'q — narx qidirilgan warehouseId dan olinadi.

const BEELINE_BASE = 'https://rms-backend.beeline.uz/dealer/api/v1';

async function beelineLogin(username, password) {
  const form = new FormData();
  form.append('username', username);
  form.append('password', password);

  const res = await fetch(BEELINE_BASE + '/auth/login', {
    method: 'POST',
    body: form,
    headers: { origin: 'https://rms.beeline.uz', referer: 'https://rms.beeline.uz/' },
    signal: timeoutSignal()
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 200);
    try { detail = JSON.parse(text).detail || detail; } catch (_) {}
    throw new Error('Beeline login (' + res.status + '): ' + detail);
  }
  const data = JSON.parse(text);
  if (!data.token) throw new Error('Beeline: javobda token yo\'q');
  return data.token;
}

// Beeline mask: "998" + 9 xonali mahalliy qism, noma'lum joyda "*".
// Beeline kodlari 90/91 — ikkalasi ham "9" bilan boshlanadi, shuning uchun
// kod o'rniga "9*" qo'yamiz.
function beelineMask(boxes) {
  return '9989*' + boxes.map(b => b || '*').join('');
}

async function searchBeeline(boxes, cfg, limit) {
  const username = (cfg.username || '').trim();
  const password = cfg.password || '';
  if (!username || !password) throw new Error('Beeline: login/parol kiritilmagan (adminka → Operatorlar)');

  const warehouses = (cfg.warehouses && cfg.warehouses.length) ? cfg.warehouses : DEFAULT_BEELINE_WAREHOUSES;
  const mask = beelineMask(boxes);

  // Bitta ombordan raqam olish. 401/403 kelsa — token eskirgan degani:
  // tokenni yangilab, AYNAN SHU so'rovni bir marta qayta yuboramiz. Aks
  // holda token muddati tugagan paytdagi qidiruvda Beeline bo'sh chiqardi.
  async function fetchWarehouse(wh, token, retried) {
    const url = BEELINE_BASE + '/phone-numbers/search'
      + '?limit=' + limit + '&hlrId=1&warehouseId=' + wh.id + '&mask=' + encodeURIComponent(mask);

    const res = await fetch(url, {
      headers: { authorization: 'Bearer ' + token, origin: 'https://rms.beeline.uz' },
      signal: timeoutSignal()
    });

    if (res.status === 401 || res.status === 403) {
      beelineTokenCache = null;
      if (retried) throw new Error('Beeline: ruxsat yo\'q (' + res.status + ') — login/parolni tekshiring');
      const fresh = await getBeelineToken(username, password);
      return fetchWarehouse(wh, fresh, true);
    }
    if (res.status === 429) throw new Error('Beeline: so\'rovlar chegarasi (429) — biroz kuting');
    if (!res.ok) {
      // MUHIM: avval faqat "HTTP 400" deb yozardik — aynan NIMA sabab
      // ko'rsatilganini (Beeline javobining o'zi) ko'rmasdan aniq
      // tashxis qo'yib bo'lmasdi. Endi javob matnini ham (qisqartirib)
      // xato xabariga qo'shamiz — konsol/Telegram xabarida sabab aniq
      // ko'rinadi.
      let detail = '';
      try { detail = (await res.text()).slice(0, 200); } catch (_) {}
      throw new Error('Beeline warehouse ' + wh.id + ': HTTP ' + res.status + (detail ? ' — ' + detail : ''));
    }

    const data = await res.json();
    return (data.content || [])
      .filter(x => x.status === 'available')
      .map(x => ({
        number: '+' + String(x.phoneNumber).replace(/\D/g, ''),
        operator: 'Beeline',
        category: wh.name || '',
        operatorPrice: Number(wh.operatorPrice) || 0,
        price: Number(wh.salePrice) || 0
      }));
  }

  const token = await getBeelineToken(username, password);
  const perWarehouse = await Promise.allSettled(warehouses.map(wh => fetchWarehouse(wh, token, false)));

  return collectSettled(perWarehouse, 'Beeline');
}

// Beeline tokeni bir necha daqiqa saqlanadi — har qidiruvda qayta login
// qilish shart emas. 401 kelsa yuqorida tozalanadi.
let beelineTokenCache = null;
const BEELINE_TOKEN_TTL = 5 * 60 * 1000;

// ESLATMA: quyidagi izoh ESKI dilerlik (RMS) oqimiga tegishli. Hozir fon
// sinxronizatsiyasi ochiq API'dan foydalanadi va login/parol TALAB QILMAYDI
// (qarang: sync-beeline-background.js), ya'ni bu muammo endi yuzaga
// kelmaydi. Quyidagi qulf RMS yo'li hali ham ishlatilishi mumkinligi uchun
// (masalan Platinum toifalari) saqlanib turibdi.
//
// MUHIM (401/400 xatolarining haqiqiy sababi shu edi): eski sync 10 ta
// raqamni (0..9) BIR VAQTDA, parallel qidirardi. Agar token hali yo'q yoki
// endigina eskirgan bo'lsa, ESKI kodda HAR BIR parallel so'rov o'zicha
// alohida login qilishga urinardi — ya'ni bitta dilerlik hisobiga bir necha
// login so'rovi BIR VAQTDA ketardi. Beeline (ko'p operator API'lari kabi)
// "faqat bitta faol sessiya" siyosatini tutadi: yangi login eskisini
// BEKOR qiladi. Natijada bir-birini ketma-ket bekor qilib turgan
// tokenlar bilan ishlagan boshqa so'rovlar 401 yoki hatto 400 (noto'g'ri/
// bekor qilingan sessiya bilan yuborilgan so'rov) bilan qulab tushardi.
// YECHIM: bir vaqtning o'zida FAQAT BITTA login so'rovi "parvozda" bo'lishi
// mumkin — token kerak bo'lgan barcha parallel chaqiruvlar SHU BITTA
// natijani kutib oladi, o'zlaridan alohida login yubormaydi.
let beelineLoginInFlight = null;

async function getBeelineToken(username, password) {
  const now = Date.now();
  if (beelineTokenCache
      && beelineTokenCache.username === username
      && beelineTokenCache.expiresAt > now) {
    return beelineTokenCache.token;
  }
  if (beelineLoginInFlight) return beelineLoginInFlight;
  beelineLoginInFlight = (async () => {
    try {
      const token = await beelineLogin(username, password);
      beelineTokenCache = { token, username, expiresAt: Date.now() + BEELINE_TOKEN_TTL };
      return token;
    } finally {
      beelineLoginInFlight = null;
    }
  })();
  return beelineLoginInFlight;
}

/* ---------- BEELINE — OCHIQ (PUBLIC) API ---------- */
//
// NEGA: yuqoridagi dilerlik (RMS) API'si login/parol talab qiladi, bitta
// qidiruv uchun 7 ta omborga 7 ta so'rov yuboradi va Beeline tomonida
// sekin ishlaydi (o'lchangan: keng mask bilan 7-8 soniya). Hisob bloklanish
// xavfi ham bor edi.
//
// Ochiq API — nomer.beeline.uz saytining O'ZI ishlatadigan API. Login/parol
// KERAK EMAS, faqat "Session-Id" sarlavhasi talab qilinadi.
//
// HAMMASI REAL SO'ROV BILAN TASDIQLANGAN (2026-09-17):
//   1) Sessiya:  GET /msapi/web/rms/v2/categories?language=uz
//                sarlavha: "E-Sim: true"
//                -> javob SARLAVHASIDA "session-id" keladi (tanasida emas).
//                -> tanasida kategoriyalar: [{id:393,name:"Oddiy",price:0}, ...]
//   2) Qidiruv:  GET /msapi/web/rms/v2/phone-numbers/search
//                ?categoryId=<id>&hlrId=1&mask=<12 belgi>&includeDetails=true
//                &language=uz&page=0&size=90
//                sarlavha: "Session-Id: <sessiya>"
//                -> {content:[{phoneNumber:"998905988009", categoryId:395,
//                    phoneNumberPrice:250000.0, categoryNameLocalized:"Silver"}]}
//
// ANIQLANGAN CHEKLOVLAR (tekshirilgan, taxmin emas):
//   - categoryId MAJBURIY. Usiz HTTP 400. Shuning uchun 4 kategoriyaga
//     4 ta parallel so'rov yuboriladi.
//   - size 90 dan oshmaydi (size=200 -> HTTP 422).
//   - page ishlamaydi: page=1 aynan page=0 dagi 90 tani qaytardi
//     (totalPages doim 1). Ya'ni bir mask + bir kategoriya = MAX 90 ta.
//   - Ochiq API'da faqat 4 kategoriya bor (0 / 100k / 250k / 500k so'm).
//     RMS'dagi Platinum (1.5 mln) va undan qimmatlari bu yerda YO'Q.
//   - Sessiya kamida 10 daqiqa yashaydi (tekshirilgan) — keshlaymiz.
//   - Parallel yuborilganda goho HTTP 500 qaytadi (5 tadan 2 marta) —
//     shu sabab bir marta qayta urinish qo'yilgan.

const BEELINE_PUBLIC_BASE = 'https://nomer.beeline.uz/msapi/web/rms/v2';

// Beeline ochiq API'sining O'Z javob vaqti kategoriyaga qarab keskin farq
// qiladi (real o'lchov, bir xil mask bilan):
//   393 Oddiy  ~0.3s    394 Bronze ~2.9s
//   395 Silver ~7-9s    396 Gold   ~5-7s
// Umumiy DEFAULT_TIMEOUT (6.5s) Silver'ni KESIB tashlaydi — ya'ni eng ko'p
// sotiladigan toifa natijasiz qolardi. Shu sabab bu API uchun alohida,
// uzunroq chegara. Mijoz buni KUTMAYDI: qidiruvda Firestore keshi
// ishlatiladi (qarang: sync-beeline-background.js), bu chegara faqat fon
// sinxronizatsiyasi va kesh bo'sh qolgan holat uchun.
const BEELINE_PUBLIC_TIMEOUT = 12000;

// Ochiq API'dagi kategoriyalar. "price" — Beeline'ning O'Z narxi (operator
// narxi); sotuv narxi admin paneldagi jadval orqali hisoblanadi (toSalePrice).
// Bu ro'yxat categories endpointidan olingan javobning aynan o'zi.
const BEELINE_PUBLIC_CATEGORIES = [
  { id: 393, name: 'Oddiy',  operatorPrice: 0 },
  { id: 394, name: 'Bronze', operatorPrice: 100000 },
  { id: 395, name: 'Silver', operatorPrice: 250000 },
  { id: 396, name: 'Gold',   operatorPrice: 500000 }
];

// KAMYOB (va shu sababli SEKIN) toifalar — bular fon sinxronizatsiyasida
// oldindan yig'ilib keshlanadi (qarang: sync-beeline-background.js).
//
// Nega aynan shular: Beeline'ning javob vaqti kategoriyadagi raqam soniga
// TESKARI bog'liq — raqam kam bo'lsa, u butun bazani skanerlab uzoq
// qidiradi. O'lchangan (bir xil mask, 3 martadan):
//   393 Oddiy  ~36 000 ta -> 0.3-0.5 s  (keshlanmaydi: tez, hajmi katta)
//   394 Bronze  ~1 700 ta -> 3.0-3.4 s
//   395 Silver  ~1 600 ta -> 8.3-9.4 s
//   396 Gold    ~1 600 ta -> 4.8-4.9 s
const BEELINE_PUBLIC_RARE_IDS = [394, 395, 396];

// Sessiya keshi. Sessiya bir necha daqiqa amal qiladi, shuning uchun har
// qidiruvda qaytadan olinmaydi. Bir vaqtda ko'p so'rov kelganda faqat BITTA
// sessiya so'rovi ketishi uchun "inFlight" qulfi ishlatiladi (xuddi
// yuqoridagi getBeelineToken kabi).
let beelinePublicSession = null;
const BEELINE_PUBLIC_SESSION_TTL = 5 * 60 * 1000;
let beelinePublicSessionInFlight = null;

async function fetchBeelinePublicSession() {
  const res = await fetch(BEELINE_PUBLIC_BASE + '/categories?language=uz', {
    headers: { 'E-Sim': 'true', Language: 'uz' },
    signal: timeoutSignal(BEELINE_PUBLIC_TIMEOUT)
  });
  if (!res.ok) throw new Error('Beeline (ochiq): sessiya olinmadi, HTTP ' + res.status);

  // Sessiya javob SARLAVHASIDA keladi.
  const sid = res.headers.get('session-id') || res.headers.get('Session-Id');
  if (!sid) throw new Error('Beeline (ochiq): javobda session-id sarlavhasi yo\'q');

  // Kategoriyalarni ham o'sha javobdan olamiz — narx o'zgarsa, kodga
  // tegmasdan avtomatik yangilanadi.
  let categories = BEELINE_PUBLIC_CATEGORIES;
  try {
    const list = await res.json();
    if (Array.isArray(list) && list.length) {
      categories = list
        .filter(c => c && c.id !== undefined && c.id !== null)
        .map(c => ({
          id: Number(c.id),
          name: c.name || '',
          operatorPrice: Number(c.price) || 0
        }));
    }
  } catch (_) { /* javob o'qilmasa — yuqoridagi tasdiqlangan ro'yxat ishlatiladi */ }

  return { sid, categories };
}

async function getBeelinePublicSession() {
  if (beelinePublicSession && Date.now() < beelinePublicSession.expiresAt) {
    return beelinePublicSession;
  }
  if (beelinePublicSessionInFlight) return beelinePublicSessionInFlight;

  beelinePublicSessionInFlight = (async () => {
    try {
      const { sid, categories } = await fetchBeelinePublicSession();
      beelinePublicSession = {
        sid,
        categories,
        expiresAt: Date.now() + BEELINE_PUBLIC_SESSION_TTL
      };
      return beelinePublicSession;
    } finally {
      beelinePublicSessionInFlight = null;
    }
  })();
  return beelinePublicSessionInFlight;
}

// Ochiq API mask: 12 belgi = "998" + 9 xonali mahalliy qism, noma'lum
// joyda "*". Beeline kodlari 90/91 — ikkalasi ham "9" bilan boshlanadi,
// shuning uchun kod o'rniga "9*" qo'yamiz (xuddi RMS'dagi kabi).
// 7 katak -> "9989*" + 7 = 12 belgi. Tasdiqlangan: mask=99890*****09 ishladi.
function beelinePublicMask(boxes) {
  return '9989*' + boxes.map(b => b || '*').join('');
}

// Bitta kategoriyadan bitta mask bo'yicha raqam olish.
//
// Xatolar bilan ishlash: 400/401/403 -> sessiya eskirgan bo'lishi mumkin,
// yangilab AYNAN shu so'rovni bir marta qayta yuboramiz. 5xx -> Beeline
// tomonidagi vaqtinchalik xato (parallel so'rovlarda "JWT token invalid"
// ko'rinishida kuzatilgan), bu ham bir marta qayta uriniladi.
//
// Bu funksiya sync-beeline-background.js dan ham chaqiriladi (fon sinxronizatsiyasi),
// shuning uchun searchBeelinePublic ichida emas, alohida turadi.
async function beelinePublicFetchCategory(opts, retried) {
  const sid = opts.sid;
  const url = BEELINE_PUBLIC_BASE + '/phone-numbers/search'
    + '?categoryId=' + opts.categoryId
    + '&hlrId=1'
    + '&mask=' + encodeURIComponent(opts.mask)
    + '&includeDetails=true&language=uz&page=0&size=90';

  const res = await fetch(url, {
    headers: { 'Session-Id': sid, 'E-Sim': 'true' },
    signal: timeoutSignal(opts.timeout || BEELINE_PUBLIC_TIMEOUT)
  });

  if (!res.ok) {
    const retryable = (res.status === 400 || res.status === 401
      || res.status === 403 || res.status >= 500);
    if (retryable && !retried) {
      beelinePublicSession = null;                   // sessiyani yangilaymiz
      const fresh = await getBeelinePublicSession();
      return beelinePublicFetchCategory(
        Object.assign({}, opts, { sid: fresh.sid }), true
      );
    }
    if (res.status === 429) {
      throw new Error('Beeline: so\'rovlar chegarasi (429) — biroz kuting');
    }
    let detail = '';
    try { detail = (await res.text()).slice(0, 150); } catch (_) {}
    throw new Error('Beeline kategoriya ' + opts.categoryId + ': HTTP ' + res.status
      + (detail ? ' — ' + detail : ''));
  }

  const data = await res.json();
  return (data.content || []).map(x => {
    // Narx javobning O'ZIDAN keladi (phoneNumberPrice), kategoriyadan emas
    // — bu RMS'dan farqi. Javobda bo'lmasa kategoriya narxiga tushamiz.
    const op = (x.phoneNumberPrice !== undefined && x.phoneNumberPrice !== null)
      ? Number(x.phoneNumberPrice)
      : Number(opts.categoryPrice) || 0;
    return {
      number: '+' + String(x.phoneNumber).replace(/\D/g, ''),
      operator: 'Beeline',
      category: x.categoryNameLocalized || opts.categoryName || '',
      operatorPrice: op,
      price: op   // sotuv narxi chaqiruvchi tomonda hisoblanadi
    };
  });
}

// Beeline uchun sotuv narxini aniqlash.
//
// MUHIM: bu funksiyasiz "Oddiy" toifadagi raqamlar saytda "0 so'm" bo'lib
// chiqadi (brauzer sinovida aynan shunday bo'ldi) — chunki ochiq API
// operator narxini 0 deb qaytaradi va uni shundoq ko'rsatib bo'lmaydi.
// Eski dilerlik (RMS) yo'lida narx DEFAULT_BEELINE_WAREHOUSES jadvalidagi
// "salePrice" dan olinardi (Oddiy -> 50 000 so'm), shu xulq saqlanadi.
//
// Tartib: 1) adminkadagi narx jadvali, 2) kodagi standart ombor jadvali,
// 3) ikkalasida ham topilmasa — operator narxi o'z holicha.
function beelineSalePrice(table, operatorPrice) {
  if (table && table.length) {
    const row = table.find(r => Number(r.operatorPrice) === Number(operatorPrice));
    if (row) return Number(row.salePrice);
  }
  const wh = DEFAULT_BEELINE_WAREHOUSES
    .find(w => Number(w.operatorPrice) === Number(operatorPrice));
  if (wh && wh.salePrice !== undefined) return Number(wh.salePrice);
  return Number(operatorPrice) || 0;
}

async function searchBeelinePublic(boxes, cfg, limit, options) {
  const opts = options || {};
  const session = await getBeelinePublicSession();
  const table = (cfg && cfg.prices && cfg.prices.length) ? cfg.prices : null;
  const mask = beelinePublicMask(boxes);

  async function fetchCategory(cat) {
    const items = await beelinePublicFetchCategory({
      sid: session.sid,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryPrice: cat.operatorPrice,
      mask
    });
    return items.map(x => Object.assign({}, x, {
      price: beelineSalePrice(table, x.operatorPrice)
    }));
  }

  let categories = (session.categories && session.categories.length)
    ? session.categories
    : BEELINE_PUBLIC_CATEGORIES;

  // onlyCategoryIds — keshda bor toifalarni qayta so'ramaslik uchun
  // (api-live-search kamyob toifalarni keshdan oladi, qolganini jonli).
  if (opts.onlyCategoryIds && opts.onlyCategoryIds.length) {
    categories = categories.filter(c => opts.onlyCategoryIds.includes(c.id));
  }
  if (opts.excludeCategoryIds && opts.excludeCategoryIds.length) {
    categories = categories.filter(c => !opts.excludeCategoryIds.includes(c.id));
  }
  if (!categories.length) return { items: [], errors: [] };

  // MUHIM: ochiq API parallel so'rovni KO'TARMAYDI — 4 ta bir vaqtda
  // yuborilganda "JWT token invalid" (HTTP 500) qaytadi (o'lchangan:
  // 2 parallel xatosiz, 4 parallel 1/4 xato, 8 parallel 2/8 xato).
  // Shu sabab kategoriyalar JUFT-JUFT yuboriladi: xato ham yo'q,
  // ketma-ketdan ~2 barobar tez.
  const settled = [];
  for (let i = 0; i < categories.length; i += 2) {
    const pair = categories.slice(i, i + 2);
    const res = await Promise.allSettled(pair.map(cat => fetchCategory(cat)));
    settled.push(...res);
  }

  // MUHIM (limitni kategoriyalar orasida ADOLATLI taqsimlash):
  // natijalar kategoriya tartibida keladi (Oddiy -> Bronze -> Silver -> Gold)
  // va har biridan 90 tagacha chiqadi. Agar hammasini birlashtirib oddiygina
  // slice(limit) qilsak, limit=40 da mijoz FAQAT "Oddiy" raqamlarni ko'radi —
  // Silver va Gold butunlay yo'qoladi (real sinovda aynan shunday bo'ldi).
  // Shu sabab avval har kategoriyadan navbat bilan bittadan olamiz
  // (round-robin), shunda har toifadan vakil bo'ladi.
  const perCategory = settled.map(r => {
    if (r.status !== 'fulfilled') return [];
    return r.value.filter(x => matchesBoxes(x.number, boxes));
  });

  const items = [];
  const maxLen = perCategory.reduce((mx, arr) => Math.max(mx, arr.length), 0);
  for (let i = 0; i < maxLen && items.length < limit; i++) {
    for (let c = 0; c < perCategory.length && items.length < limit; c++) {
      if (perCategory[c][i]) items.push(perCategory[c][i]);
    }
  }

  const errors = [];
  settled.forEach(r => {
    if (r.status === 'rejected') errors.push(labelError('Beeline', r.reason));
  });

  return { items, errors: [...new Set(errors)].slice(0, 3) };
}

/* ---------- UCELL ---------- */
//
// Token: GET /ru/api/v1/services/dealer/auth/login  (login/parol kerak emas)
// Qidiruv: POST /api/v1/phone_number/search-mask
// msisdn_type MAJBURIY va har kategoriya alohida so'rov talab qiladi
// (msisdn_type=0 faqat "Simple" ni qaytaradi — tekshirilgan).

const UCELL_LOGIN = 'https://cw-corn00.ucell.uz/ru/api/v1/services/dealer/auth/login';
const UCELL_SEARCH = 'https://cw-corn00.ucell.uz/api/v1/phone_number/search-mask';
const UCELL_TYPES = [1, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 111];

// Ucell serveri BEQAROR: bir xil so'rovga ba'zan natija qaytaradi, ba'zan
// bo'sh (taxminan 50/50 — 8 marta ketma-ket sinab tasdiqlangan). Bu bizning
// kodimizdagi xato emas, operator tomonidagi xulq. Shu sabab har kategoriya
// uchun bir necha urinish PARALLEL yuboriladi va natijalar birlashtiriladi —
// vaqt deyarli o'zgarmaydi, lekin raqamni "yo'qotish" ehtimoli keskin tushadi.
const UCELL_ATTEMPTS = 3;

async function ucellToken() {
  const res = await fetch(UCELL_LOGIN, { signal: timeoutSignal() });
  if (!res.ok) throw new Error('Ucell login: HTTP ' + res.status);
  const data = await res.json();
  if (!data.token) throw new Error('Ucell: javobda token yo\'q');
  return data.token;
}

async function searchUcell(boxes, cfg, limit) {
  const query = longestRun(boxes);
  // Hech qanday raqam kiritilmagan bo'lsa Ucell'ga so'rov yuborishning
  // ma'nosi yo'q — u butun bazani qaytaradi.
  if (!query) return { items: [], errors: [] };

  const token = await ucellToken();
  const table = (cfg.prices && cfg.prices.length) ? cfg.prices : DEFAULT_PRICES.Ucell;

  const jobs = [];
  for (const type of UCELL_TYPES) {
    for (let attempt = 0; attempt < UCELL_ATTEMPTS; attempt++) jobs.push(type);
  }

  const perType = await Promise.allSettled(jobs.map(async type => {
    const res = await fetch(UCELL_SEARCH, {
      method: 'POST',
      headers: { Token: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pager: { pageNum: 0, pageSize: 100 },
        filter: { msisdn_type: type, search_type: 2, query, lang: 'uz' }
      }),
      signal: timeoutSignal()
    });
    if (!res.ok) throw new Error('Ucell type ' + type + ': HTTP ' + res.status);

    const data = await res.json();
    return (data.data || [])
      .filter(x => matchesBoxes(x.msisdn, boxes))   // pozitsiya bo'yicha o'zimiz filtrlaymiz
      .map(x => {
        const op = Number(x.price) || 0;
        return {
          number: '+' + String(x.msisdn).replace(/\D/g, ''),
          operator: 'Ucell',
          category: x.type_name || '',
          operatorPrice: op,
          price: toSalePrice(table, op)
        };
      });
  }));

  const out = collectSettled(perType, 'Ucell');
  // Urinishlar takrorlangani uchun bir xil raqam bir necha marta kelishi mumkin
  const seen = new Set();
  out.items = out.items.filter(x => {
    if (seen.has(x.number)) return false;
    seen.add(x.number);
    return true;
  }).slice(0, limit);
  return out;
}

/* ---------- HUMANS ---------- */
//
// Sessiya: POST /graphql  (JoinAnonymous) -> javob SARLAVHASIDA
//          x-humans-session-token, javob ichida userID (= bookingResourceId)
// Qidiruv: POST /ftuz/api/v1/msisdns/retail/available
// Narx tiyinda keladi — 100 ga bo'linadi.

const HUMANS_API = 'https://hf-api-prod-web.humans-it.dev';
const HUMANS_APP = 'net.humans.fintech_uz.web/1.2.730 (GraphQL/SCHEMA) // apollo/client/3.4.10';
const HUMANS_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const HUMANS_PREFIX = '99833';   // saytda faqat shu prefiks ishlatiladi

function humansHeaders(extra) {
  const t = Date.now();
  return Object.assign({
    'content-type': 'application/json',
    origin: 'https://humans.uz',
    referer: 'https://humans.uz/',
    'user-agent': HUMANS_UA,
    'x-humans-avatar-type': 'WEB',
    'x-humans-locale': 'uz-UZ',
    'x-humans-name': 'unknown',
    'x-humans-trace': t + ':' + t + ':0:1',
    'x-user-agent': 'net.humans.fintech_uz.web/1.2.730 // wretch/1.7.4'
  }, extra || {});
}

const HUMANS_JOIN_QUERY =
  'mutation JoinAnonymous($app: String!, $deviceInfo: DeviceInfo!, $avatar: String) {'
  + ' joinAnonymous(input: { app: $app, deviceInfo: $deviceInfo, avatar: $avatar })'
  + ' { __typename ... on JoinAnonymousResult { userID } } }';

async function humansSession() {
  const deviceID = randomUuid();
  const res = await fetch(HUMANS_API + '/graphql', {
    method: 'POST',
    headers: humansHeaders({ 'x-humans-host': 'im' }),
    body: JSON.stringify({
      operationName: 'JoinAnonymous',
      query: HUMANS_JOIN_QUERY,
      variables: {
        app: HUMANS_APP,
        deviceInfo: { web: { userAgent: HUMANS_UA, meta: { locale: 'uz-UZ' }, deviceID } },
        avatar: 'enterprise_default'
      }
    }),
    signal: timeoutSignal()
  });

  const token = res.headers.get('x-humans-session-token');
  const data = await res.json();
  const userID = data && data.data && data.data.joinAnonymous && data.data.joinAnonymous.userID;
  if (!token || !userID) {
    const msg = (data && data.errors && data.errors[0] && data.errors[0].message) || ('HTTP ' + res.status);
    throw new Error('Humans sessiya olinmadi: ' + msg);
  }
  return { token, userID };
}

async function searchHumans(boxes, cfg, limit) {
  const { token, userID } = await humansSession();
  const table = (cfg.prices && cfg.prices.length) ? cfg.prices : DEFAULT_PRICES.Humans;

  const res = await fetch(HUMANS_API + '/ftuz/api/v1/msisdns/retail/available', {
    method: 'POST',
    headers: humansHeaders({ 'x-humans-host': 'im', 'x-humans-session-token': token }),
    body: JSON.stringify({
      salesChannel: 'WEB_AUTH',
      bookingResourceId: userID,
      bookingResourceIdType: 'SESSION_ID',
      poolNumberRegion: '1726',
      isPhantom: false,
      msisdnPattern: boxes.map(b => b || '_').join(''),
      prefix: HUMANS_PREFIX
    }),
    signal: timeoutSignal()
  });
  if (!res.ok) throw new Error('Humans qidiruv: HTTP ' + res.status);

  const list = await res.json();
  const items = (Array.isArray(list) ? list : [])
    .filter(x => matchesBoxes(x.msisdn, boxes))
    .slice(0, limit)
    .map(x => {
      const amount = x.priceForMsisdn && x.priceForMsisdn.default && x.priceForMsisdn.default.amount;
      const op = Math.round((Number(amount) || 0) / 100);   // tiyin -> so'm
      return {
        number: '+' + String(x.msisdn).replace(/\D/g, ''),
        operator: 'Humans',
        category: x.category ? ('Kategoriya ' + x.category) : '',
        // Xom kategoriya raqami (masalan 2, 8) — "Bo'lib to'lash" (rasrochka)
        // funksiyasi shu bo'yicha, admin panelda kategoriyaga bog'lab
        // kiritilgan bosh to'lov/oylik to'lovni topadi (index.html,
        // HUMANS_FINANCING). Matnli "category" maydoni faqat ko'rsatish
        // uchun, hisoblash uchun esa aynan shu xom raqam ishlatiladi.
        categoryNum: x.category || null,
        operatorPrice: op,
        price: toSalePrice(table, op)
      };
    });

  return { items, errors: [] };
}

/* ---------- MOBIUZ ---------- */
//
// booking.mobi.uz — Yii2 ilovasi, POST uchun sessiya cookie + CSRF token
// kerak. Ikkalasi ham /uz/app sahifasidan olinadi.
// DIQQAT: aksiya (SCN) belgisi bu API'da YO'Q — faqat oddiy narx.

const MOBIUZ_BASE = 'https://booking.mobi.uz';
const MOBIUZ_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

async function mobiuzSession() {
  const res = await fetch(MOBIUZ_BASE + '/uz/app', {
    headers: { 'user-agent': MOBIUZ_UA },
    signal: timeoutSignal()
  });
  if (!res.ok) throw new Error('Mobiuz sahifa: HTTP ' + res.status);

  const cookie = pickCookies(res, ['main_session', '_csrf', '_language']);
  const html = await res.text();
  const m = html.match(/csrf-token"\s+content="([^"]+)"/);
  if (!m || !cookie) throw new Error('Mobiuz: CSRF token yoki cookie topilmadi');
  return { cookie, csrf: m[1] };
}

async function searchMobiuz(boxes, cfg, limit) {
  const { cookie, csrf } = await mobiuzSession();
  const table = (cfg.prices && cfg.prices.length) ? cfg.prices : DEFAULT_PRICES.Mobiuz;

  const form = new URLSearchParams();
  form.append('language', 'uz');
  form.append('SearchForm[category]', '');
  form.append('SearchForm[prefix]', '');
  for (let i = 0; i < 7; i++) form.append('SearchForm[input_' + (i + 1) + ']', boxes[i] || '');
  form.append('SearchForm[time]', String(Math.floor(Date.now() / 1000)));

  const res = await fetch(MOBIUZ_BASE + '/uz/app/search', {
    method: 'POST',
    headers: {
      'user-agent': MOBIUZ_UA,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      cookie,
      'x-csrf-token': csrf,
      'x-requested-with': 'XMLHttpRequest',
      referer: MOBIUZ_BASE + '/uz/app',
      origin: MOBIUZ_BASE
    },
    body: form.toString(),
    signal: timeoutSignal()
  });
  if (!res.ok) throw new Error('Mobiuz qidiruv: HTTP ' + res.status);

  const data = await res.json();
  const items = (data.list || [])
    .map(x => {
      const msisdn = '998' + String(x.value).replace(/\D/g, '');
      const op = Number(x.price) || 0;
      return {
        number: '+' + msisdn,
        operator: 'Mobiuz',
        category: x.salability_label || '',
        operatorPrice: op,
        price: toSalePrice(table, op)
      };
    })
    .filter(x => matchesBoxes(x.number, boxes))
    .slice(0, limit);

  return { items, errors: [] };
}

/* ---------- PERFEKTUM ---------- */
//
// POST https://perfectum.uz/api/v1/numbers — kalit/login talab qilmaydi.
//
// DIQQAT: eski manzil (/numbers/data) endi ISHLAMAYDI — HTTP 404 qaytaradi
// (tekshirilgan). Perfektum API'ni yangiladi, so'rov va javob formati ham
// o'zgardi. Quyidagilar real so'rov bilan tasdiqlangan (2026-09-17):
//
//   So'rov:  { sku:"", page:1, size:40, mask:"80***0890" }
//            "mask" — AYNAN 9 belgi: "80" (Perfektum prefiksi) + 7 katak,
//            noma'lum joyda "*". 8 yoki 10 belgi -> HTTP 422
//            ("The mask field format is invalid").
//            Eski format ("cells" massivi) endi qabul qilinmaydi.
//
//   Javob:   { data: { categories:[{sku,price}], numbers:[{number,price}],
//                      page, totalPages } }
//            Ya'ni hammasi "data" ICHIDA (eski API'da tashqarida edi).
//
//   MUHIM: "user-agent" sarlavhasi MAJBURIY — usiz HTTP 403 qaytadi.
//
//   Kategoriya nomi: yangi API "name" maydonini BERMAYDI (faqat sku+price).
//   Shu sabab toifa nomi narx bo'yicha adminkadagi jadvaldan olinadi;
//   jadval bo'sh bo'lsa nom bo'sh qoladi (raqam va narx baribir to'g'ri).
//
// Raqam formati: "(80) 333-34-33" -> 803333433 -> +998803333433

const PERFEKTUM_URL = 'https://perfectum.uz/api/v1/numbers';
const PERFEKTUM_PREFIX = '80';

// 7 katak -> Perfektum maskasi (9 belgi): "80" + katak (bo'shi "*").
function perfektumMask(boxes) {
  return PERFEKTUM_PREFIX + boxes.map(b => b || '*').join('');
}

async function searchPerfektum(boxes, cfg, limit) {
  const res = await fetch(PERFEKTUM_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      origin: 'https://perfectum.uz',
      referer: 'https://perfectum.uz/numbers'
    },
    body: JSON.stringify({
      sku: '',
      page: 1,
      size: Math.max(limit, 28),
      mask: perfektumMask(boxes)
    }),
    signal: timeoutSignal()
  });
  if (!res.ok) throw new Error('Perfektum qidiruv: HTTP ' + res.status);

  const body = await res.json();
  const data = (body && body.data) || {};
  const table = (cfg.prices && cfg.prices.length) ? cfg.prices : DEFAULT_PRICES.Perfektum;

  // Toifa nomi narx bo'yicha adminka jadvalidan (yangi API nom bermaydi).
  const nameByPrice = {};
  (table || []).forEach(row => {
    if (row && row.name) nameByPrice[Number(row.operatorPrice)] = row.name;
  });

  const items = (data.numbers || [])
    .map(x => {
      const digits = String(x.number).replace(/\D/g, '');
      const op = Number(x.price) || 0;
      return {
        number: '+998' + digits,
        operator: 'Perfektum',
        category: nameByPrice[op] || '',
        operatorPrice: op,
        price: toSalePrice(table, op)
      };
    })
    .filter(x => matchesBoxes(x.number, boxes))
    .slice(0, limit);

  return { items, errors: [] };
}

/* ---------- Yig'uvchi ---------- */

// Xato matnida operator nomi ikki marta takrorlanmasin
function labelError(opName, reason) {
  const msg = (reason && reason.message) ? reason.message : String(reason);
  return msg.startsWith(opName + ':') ? msg : (opName + ': ' + msg);
}

function collectSettled(settled, opName) {
  const items = [];
  const errors = [];
  settled.forEach(r => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push(labelError(opName, r.reason));
  });
  // Bir xil xatolik bir necha bor takrorlanmasin
  return { items, errors: [...new Set(errors)].slice(0, 3) };
}

function randomUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return require('crypto').randomUUID();
}

const ADAPTERS = {
  Beeline: searchBeeline,
  Ucell: searchUcell,
  Humans: searchHumans,
  Mobiuz: searchMobiuz,
  Perfektum: searchPerfektum
};

// Sozlamada aniq ko'rsatilmagan bo'lsa qaysi operator ishlaydi.
// Perfektum narx jadvali kelmagunicha O'CHIQ turadi.
const DEFAULT_ENABLED = {
  Beeline: true, Ucell: true, Humans: true, Mobiuz: true, Perfektum: false
};

// Barcha (yoki tanlangan) operatorlarda parallel qidiruv.
// Bitta operator yiqilsa qolganlari baribir natija qaytaradi.
// Bitta operator sekinlashsa — butun qidiruv u bilan birga kutib qolmasin.
// Beeline tomonida billing xatosi bo'lganda so'rov 45 SONIYA osilib turadi
// (o'lchangan), Netlify funksiyasining chegarasi esa 10 soniya. Shu sabab
// har operatorga qat'iy muddat qo'yamiz: ulgurmasa — tashlab ketamiz,
// qolganlarining natijasi baribir mijozga boradi.
function withDeadline(promise, ms, name) {
  let timer;
  const guard = new Promise(resolve => {
    timer = setTimeout(() => resolve({ items: [], errors: [name + ': javob bermadi (' + (ms / 1000) + 's)'] }), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

async function searchAll(boxes, config, options) {
  const opts = options || {};
  const limit = opts.limit || 40;
  const only = opts.operator;
  const deadline = opts.deadline || 7000;
  const exclude = opts.exclude || [];

  // adapterOverrides — chaqiruvchi ayrim operator uchun O'ZINING qidiruv
  // funksiyasini berishi mumkin (imzo bir xil: (boxes, cfg, limit)).
  // Buning sababi: Beeline'ning kamyob toifalari Firestore keshidan
  // o'qiladi (qarang: api-live-search.js), Firestore bog'liqligini esa shu
  // faylga olib kirmaslik kerak — bu fayl faqat operator API'lari bilan
  // ishlaydi va testda mustaqil ishga tushishi lozim.
  const overrides = opts.adapterOverrides || {};
  const adapters = Object.assign({}, ADAPTERS, overrides);

  const names = Object.keys(adapters).filter(name => {
    if (only && only !== name) return false;
    if (exclude.includes(name)) return false;
    const cfg = (config && config[name]) || {};
    if (typeof cfg.enabled === 'boolean') return cfg.enabled;
    return DEFAULT_ENABLED[name] !== false;
  });

  const results = await Promise.allSettled(names.map(name => {
    const cfg = (config && config[name]) || {};
    const run = adapters[name](boxes, cfg, limit)
      .then(out => ({ items: out.items, errors: out.errors }));
    return withDeadline(run, deadline, name).then(out => ({ name, items: out.items, errors: out.errors }));
  }));

  const items = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      items.push(...r.value.items);
      errors.push(...r.value.errors);
    } else {
      errors.push(labelError(names[i], r.reason));
    }
  });

  // Bir xil raqam ikki marta chiqmasin
  const seen = new Set();
  const unique = items.filter(x => {
    if (seen.has(x.number)) return false;
    seen.add(x.number);
    return true;
  });
  unique.sort((a, b) => a.price - b.price);

  // byOperator — har operator alohida: kim natija berdi, kim xato qaytardi.
  // Yuqoridagi qatlam shu asosda "sekinlashgan operatorning oxirgi yaxshi
  // natijasini" ishlatadi.
  const byOperator = {};
  results.forEach((r, i) => {
    const name = names[i];
    byOperator[name] = (r.status === 'fulfilled')
      ? { items: r.value.items, errors: r.value.errors }
      : { items: [], errors: [labelError(name, r.reason)] };
  });

  return { items: unique, errors, byOperator };
}

// Faqat login tekshiruvi — qidiruv qilmaydi. Adminkadagi "Tekshirish"
// tugmasi shuni chaqiradi: keng mask bilan qidiruv Beeline tomonda juda
// sekin ketib timeout beradi, login esa yarim soniyada javob qaytaradi.
async function testBeelineLogin(username, password) {
  if (!username || !password) return { ok: false, error: 'Login yoki parol bo\'sh' };
  try {
    beelineTokenCache = null;              // keshni chetlab, rostdan login qilamiz
    const token = await beelineLogin(username, password);
    return { ok: true, token: token.slice(0, 12) + '...' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = {
  searchAll,
  searchBeeline,
  testBeelineLogin,
  DEFAULT_ENABLED,
  localDigits,
  matchesBoxes,
  DEFAULT_PRICES,
  DEFAULT_BEELINE_WAREHOUSES,
  // Beeline ochiq (public) API — login/parolsiz. sync-beeline-background.js va
  // api-live-search.js shulardan foydalanadi.
  searchBeelinePublic,
  getBeelinePublicSession,
  beelinePublicFetchCategory,
  BEELINE_PUBLIC_CATEGORIES,
  BEELINE_PUBLIC_RARE_IDS,
  beelineSalePrice,
  toSalePrice
};
