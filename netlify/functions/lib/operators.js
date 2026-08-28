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
    { operatorPrice: 144000,   salePrice: 344000 },
    { operatorPrice: 288000,   salePrice: 488000 },
    { operatorPrice: 576000,   salePrice: 776000 },
    { operatorPrice: 1440000,  salePrice: 1800000 },
    { operatorPrice: 3600000,  salePrice: 3900000 },
    { operatorPrice: 8600000,  salePrice: 9000000 },
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

// MUHIM (401/400 xatolarining haqiqiy sababi shu edi): sync-beeline.js 10 ta
// raqamni (0..9) BIR VAQTDA, parallel qidiradi. Agar token hali yo'q yoki
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
// POST https://perfectum.uz/numbers/data — kalit/login talab qilmaydi.
// So'rov: { sku, page, size, cells } — "cells" AYNAN saytdagi 7 katak.
// Javob: { categories:[{sku,name,price}], numbers:[{number,price}], totalPages }
// Raqam formati: "(80) 333-34-33" -> 998803333433

const PERFEKTUM_URL = 'https://perfectum.uz/numbers/data';

async function searchPerfektum(boxes, cfg, limit) {
  const res = await fetch(PERFEKTUM_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      origin: 'https://perfectum.uz',
      referer: 'https://perfectum.uz/numbers'
    },
    body: JSON.stringify({ sku: '', page: 1, size: Math.max(limit, 28), cells: boxes.map(b => b || '') }),
    signal: timeoutSignal()
  });
  if (!res.ok) throw new Error('Perfektum qidiruv: HTTP ' + res.status);

  const data = await res.json();
  const table = (cfg.prices && cfg.prices.length) ? cfg.prices : DEFAULT_PRICES.Perfektum;

  // Kategoriya nomi shu javobning O'ZIDAGI ro'yxatdan olinadi (narx bo'yicha
  // mos keladigani). Taxmin yo'q — ma'lumot API'ning o'zidan.
  const byPrice = {};
  (data.categories || []).forEach(c => {
    if (c.price !== null && c.price !== undefined) byPrice[Number(c.price)] = c.name;
  });

  const items = (data.numbers || [])
    .map(x => {
      const digits = String(x.number).replace(/\D/g, '');
      const op = Number(x.price) || 0;
      return {
        number: '+998' + digits,
        operator: 'Perfektum',
        category: byPrice[op] || '',
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
  // exclude — ba'zi operatorlarni bu YERDA (jonli) qidirmasdan, chetlab
  // o'tish uchun. Beeline uchun ishlatiladi: u endi mijozning har bir
  // so'rovida jonli so'ralmaydi, buning o'rniga davriy sinxronizatsiya
  // (sync-beeline.js) orqali oldindan yig'ilgan Firestore keshidan
  // o'qiladi (qarang: api-live-search.js) — operatorga haddan tashqari
  // ko'p so'rov borib, "429" xatosiga yoki hisobning bloklanishiga sabab
  // bo'lmasligi uchun.
  const exclude = opts.exclude || [];

  const names = Object.keys(ADAPTERS).filter(name => {
    if (only && only !== name) return false;
    if (exclude.includes(name)) return false;
    const cfg = (config && config[name]) || {};
    if (typeof cfg.enabled === 'boolean') return cfg.enabled;
    return DEFAULT_ENABLED[name] !== false;
  });

  const results = await Promise.allSettled(names.map(name => {
    const cfg = (config && config[name]) || {};
    const run = ADAPTERS[name](boxes, cfg, limit)
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
  DEFAULT_BEELINE_WAREHOUSES
};
