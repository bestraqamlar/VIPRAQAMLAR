// JONLI QIDIRUV — operator API'laridan to'g'ridan-to'g'ri raqam qidiradi.
//
// Saytdagi 7 katakli qidiruv shu funksiyani chaqiradi. Katalogdagi (Firestore)
// raqamlar o'z joyida qoladi — bu funksiya ularning USTIGA operatorda hozir
// bo'sh turgan raqamlarni qo'shadi.
//
// Chaqirish: GET /.netlify/functions/api-live-search?mask=___1222
//   mask     — 7 belgi. Ma'lum raqam = raqamning o'zi, noma'lum = "_" yoki "*"
//   operator — ixtiyoriy: faqat bitta operator (Beeline|Ucell|Humans|Mobiuz)
//   limit    — ixtiyoriy, standart 40
//
// Javob: { ok: true, count, items: [...], errors: [...], cached: bool }
//
// Sozlamalar Firestore'dagi operator_config/main hujjatidan o'qiladi
// (adminka → "Operatorlar" bo'limi). Hujjat bo'lmasa kodadagi standart
// qiymatlar ishlatiladi — ya'ni sozlamasdan ham ishlayveradi.

const admin = require('firebase-admin');
const {
  searchAll,
  testBeelineLogin,
  searchBeelinePublic,
  matchesBoxes,
  BEELINE_PUBLIC_RARE_IDS
} = require('./lib/operators');
const { requireAdmin } = require('./lib/adminAuth');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();
db.settings({ preferRest: true });

// Bir qidiruvda ~20 ta tashqi so'rov ketadi. Bir necha mijoz bir vaqtda bir xil
// maskani qidirsa operatorlarni bekorga charchatmaslik uchun qisqa kesh.
// Funksiya konteyneri "issiq" turganda ishlaydi; sovuq startda bo'sh bo'ladi —
// bu normal, shunchaki qayta so'raladi.
const CACHE_TTL = 45 * 1000;
const cache = new Map();

function fromCache(key) {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) cache.delete(key);
  return null;
}

function toCache(key, value) {
  // Kesh cheksiz o'smasin
  if (cache.size > 200) cache.clear();
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

/* ---- Operator bo'yicha "oxirgi yaxshi natija" ----
   Beeline serveri beqaror: goho 1 soniyada javob beradi, goho 27 soniya
   kutdiradi yoki umuman javob bermaydi (o'lchangan). Shunday paytda
   mijozga bo'sh ro'yxat ko'rsatgandan ko'ra, o'sha maska bo'yicha oxirgi
   MUVAFFAQIYATLI natijani ko'rsatgan ma'qul.
   MUHIM: bu faqat operator XATO qaytarganda ishlaydi. Operator "raqam yo'q"
   desa — kesh ishlatilmaydi, ya'ni sotilgan raqam qayta chiqib qolmaydi. */
const STALE_TTL = 10 * 60 * 1000;
const lastGood = new Map();

function lastGoodKey(name, boxes) { return name + '|' + boxes.join(''); }

function rememberGood(name, boxes, items) {
  if (lastGood.size > 500) lastGood.clear();
  lastGood.set(lastGoodKey(name, boxes), { items, at: Date.now() });
}

function recallGood(name, boxes) {
  const hit = lastGood.get(lastGoodKey(name, boxes));
  if (!hit) return null;
  if (Date.now() - hit.at > STALE_TTL) { lastGood.delete(lastGoodKey(name, boxes)); return null; }
  return hit.items;
}

// Sozlamalarni o'qish. Firestore yiqilsa ham qidiruv to'xtamasin —
// standart qiymatlar bilan davom etadi.
let configCache = null;
const CONFIG_TTL = 60 * 1000;

// force=true — keshni chetlab o'tadi. Adminkada saqlab DARHOL "Tekshirish"
// bosilganda eski qiymat ishlatilmasligi uchun kerak.
async function loadConfig(force) {
  if (!force && configCache && configCache.expiresAt > Date.now()) return configCache.value;
  let value = {};
  try {
    const doc = await db.collection('operator_config').doc('main').get();
    if (doc.exists) value = doc.data() || {};
  } catch (err) {
    console.error('operator_config o\'qilmadi:', err.message);
  }
  configCache = { value, expiresAt: Date.now() + CONFIG_TTL };
  return value;
}

/* ==================== BEELINE: KESH + JONLI ARALASH ====================

   Beeline ochiq API'sining javob vaqti kategoriyadagi raqam soniga TESKARI
   bog'liq — raqam kam bo'lsa, u butun bazani skanerlab uzoq qidiradi.
   Real o'lchov (bir xil mask, 3 martadan):

     393 Oddiy  ~36 000 ta raqam -> 0.3-0.5 s   <- tez
     394 Bronze  ~1 700 ta       -> 3.0-3.4 s
     395 Silver  ~1 600 ta       -> 8.3-9.4 s   <- eng sekin
     396 Gold    ~1 600 ta       -> 4.8-4.9 s

   Bundan tashqari ochiq API parallel so'rovni ko'tarmaydi (4 ta bir vaqtda
   -> "JWT token invalid"), ya'ni to'rtala toifani jonli so'rash 14-17 soniya.

   YECHIM: uchta kamyob toifa (Bronze/Silver/Gold) fonda oldindan yig'ilib
   Firestore'ga yoziladi (sync-beeline-background.js), bu yerda esa keshdan
   O'QILADI. Faqat "Oddiy" jonli so'raladi — u allaqachon tez.

   O'lchangan natija: 14 192 ms -> 359 ms.

   Kesh bo'sh yoki eskirgan bo'lsa (sync hali ishlamagan/yiqilgan) —
   hammasi jonli so'raladi, ya'ni sayt baribir ishlaydi, faqat sekinroq. */

// Kesh shuncha vaqtdan eski bo'lsa, unga ishonmaymiz va jonli so'raymiz.
// sync har 10 daqiqada ishlaydi, shuning uchun 35 daqiqa = 3 marta
// o'tkazib yuborilgan yurishga chidaydi (vaqtinchalik uzilishda kesh
// baribir ishlatiladi — bo'sh ro'yxatdan ko'ra eskiroq ma'lumot yaxshi).
const BEELINE_CACHE_MAX_AGE = 35 * 60 * 1000;

let beelineCacheMem = null;
const BEELINE_CACHE_MEM_TTL = 60 * 1000;

// live_cache/Beeline hujjatini o'qiydi. Konteyner "issiq" turganda
// Firestore'ga har qidiruvda bormaslik uchun xotirada 1 daqiqa saqlanadi.
async function loadBeelineCache() {
  if (beelineCacheMem && beelineCacheMem.expiresAt > Date.now()) {
    return beelineCacheMem.value;
  }
  let value = null;
  try {
    const doc = await db.collection('live_cache').doc('Beeline').get();
    if (doc.exists) {
      const d = doc.data() || {};
      const updatedAt = d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0;
      if (Array.isArray(d.items) && d.items.length && updatedAt
          && (Date.now() - updatedAt) < BEELINE_CACHE_MAX_AGE) {
        value = {
          items: d.items,
          updatedAt,
          categoryIds: Array.isArray(d.cachedCategoryIds)
            ? d.cachedCategoryIds
            : BEELINE_PUBLIC_RARE_IDS
        };
      }
    }
  } catch (err) {
    console.error('live_cache/Beeline o\'qilmadi:', err.message);
  }
  beelineCacheMem = { value, expiresAt: Date.now() + BEELINE_CACHE_MEM_TTL };
  return value;
}

// Beeline uchun adapter: kamyob toifalar keshdan, qolgani jonli.
// Imzo searchAll kutganidek: (boxes, cfg, limit) -> { items, errors }
function makeBeelineAdapter(cached) {
  return async function beelineCachedAdapter(boxes, cfg, limit) {
    // Kesh yo'q/eskirgan — hammasini jonli so'raymiz (sekinroq, lekin ishlaydi).
    if (!cached) return searchBeelinePublic(boxes, cfg, limit);

    const fromCacheItems = cached.items.filter(x => matchesBoxes(x.number, boxes));

    // Keshda YO'Q toifalarni jonli so'raymiz (odatda faqat "Oddiy").
    let liveItems = [];
    let liveErrors = [];
    try {
      const live = await searchBeelinePublic(boxes, cfg, limit, {
        excludeCategoryIds: cached.categoryIds
      });
      liveItems = live.items;
      liveErrors = live.errors;
    } catch (err) {
      // Jonli qism yiqilsa ham keshdagi natija ko'rsatiladi.
      liveErrors = ['Beeline: ' + err.message];
    }

    // Kesh va jonli natijalarni ARALASHTIRIB beramiz — aks holda limit
    // birinchi ro'yxatni to'ldirib, ikkinchisi umuman ko'rinmay qoladi.
    const merged = [];
    const seen = new Set();
    const maxLen = Math.max(fromCacheItems.length, liveItems.length);
    for (let i = 0; i < maxLen && merged.length < limit; i++) {
      for (const arr of [liveItems, fromCacheItems]) {
        const x = arr[i];
        if (x && !seen.has(x.number) && merged.length < limit) {
          seen.add(x.number);
          merged.push(x);
        }
      }
    }
    return { items: merged, errors: liveErrors };
  };
}

// "___1222" yoki "***1222" -> ['','','','1','2','2','2']
function parseMask(raw) {
  const s = String(raw || '').trim();
  if (s.length !== 7) return null;
  const boxes = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') boxes.push(ch);
    else if (ch === '_' || ch === '*' || ch === '-' || ch === 'x' || ch === 'X') boxes.push('');
    else return null;
  }
  return boxes;
}

const OPERATORS = ['Beeline', 'Ucell', 'Humans', 'Mobiuz', 'Perfektum'];

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat GET' }) };
  }

  const params = event.queryStringParameters || {};

  // Adminkadagi "Login/parolni tekshirish" tugmasi — faqat Beeline login'ini
  // sinaydi, qidiruvga tegmaydi.
  // XAVFSIZLIK: bu amal saqlangan Beeline login/parolidan foydalanib
  // operatorga ulanadi — agar ochiq qolsa, har kim shu URL'ni takroran
  // chaqirib, Beeline hisobini bloklanishiga (ko'p noto'g'ri urinish/
  // haddan tashqari so'rov) sabab bo'lishi mumkin edi. Shu sabab faqat
  // HAQIQIY admin (custom claim) chaqira oladi.
  if (params.action === 'test-beeline') {
    try {
      await requireAdmin(event, { feature: 'operators' });
    } catch (err) {
      return { statusCode: err.statusCode || 401, headers, body: JSON.stringify({ ok: false, error: err.message }) };
    }
    const cfg = (await loadConfig(true)).Beeline || {};
    const out = await testBeelineLogin((cfg.username || '').trim(), cfg.password || '');
    return { statusCode: 200, headers, body: JSON.stringify(out) };
  }

  const boxes = parseMask(params.mask);
  if (!boxes) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ ok: false, error: 'mask 7 belgidan iborat bo\'lishi kerak (masalan: ___1222)' })
    };
  }
  // Bo'sh mask bilan qidiruv = butun bazani so'rash. Buni qilmaymiz.
  if (!boxes.some(b => b !== '')) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, count: 0, items: [], errors: [] }) };
  }

  const operator = OPERATORS.includes(params.operator) ? params.operator : null;
  const limit = Math.min(Math.max(parseInt(params.limit, 10) || 40, 1), 100);

  const cacheKey = boxes.join('') + '|' + (operator || 'all') + '|' + limit;
  const cached = fromCache(cacheKey);
  if (cached) {
    return { statusCode: 200, headers, body: JSON.stringify(Object.assign({}, cached, { cached: true })) };
  }

  try {
    const config = await loadConfig();

    // Beeline — kamyob toifalar Firestore keshidan, "Oddiy" jonli
    // (qarang: yuqoridagi "BEELINE: KESH + JONLI ARALASH" izohi).
    const beelineCache = await loadBeelineCache();

    const result = await searchAll(boxes, config, {
      limit,
      operator,
      adapterOverrides: { Beeline: makeBeelineAdapter(beelineCache) }
    });

    // Xato qaytargan operatorlar uchun oxirgi yaxshi natijani qo'shamiz,
    // muvaffaqiyatlilarining natijasini esa keyingi safar uchun saqlaymiz.
    const merged = result.items.slice();
    const known = new Set(merged.map(x => x.number));
    Object.entries(result.byOperator || {}).forEach(([name, r]) => {
      if (r.errors && r.errors.length) {
        const old = recallGood(name, boxes);
        if (old) {
          old.forEach(x => { if (!known.has(x.number)) { known.add(x.number); merged.push(x); } });
          result.errors.push(name + ': oxirgi saqlangan natija ko\'rsatilmoqda');
        }
      } else if (r.items && r.items.length) {
        rememberGood(name, boxes, r.items);
      }
    });
    merged.sort((a, b) => a.price - b.price);
    result.items = merged;

    const items = result.items.map(x => ({
      // Katalogdagi hujjatlar bilan chalkashmasligi uchun ID "live:" bilan
      // boshlanadi. Bu raqamlar Firestore'da yo'q. "STANDART TOIFA"da
      // (index.html) bularga ham to'liq buyurtma berish mumkin — lekin
      // buyurtma yozilganda 'numbers' hujjati YANGILANMAYDI (chunki u
      // mavjud emas), faqat 'orders' bazasiga yoziladi.
      id: 'live:' + x.number,
      number: x.number,
      operator: x.operator,
      price: x.price,
      oldPrice: 0,
      onSale: false,
      installment: false,
      featured: false,
      dailyDeal: false,
      reserved: false,
      live: true,
      category: x.category || '',
      // Faqat Humans uchun to'ldiriladi (qarang: lib/operators.js) — hozircha
      // faqat ko'rsatish uchun (masalan "Kategoriya 2" yorlig'i), hisoblash
      // uchun ishlatilmaydi.
      categoryNum: x.categoryNum || null,
      // "Bo'lib to'lash" (rasrochka) — Humans va Ucell uchun — AYNAN shu
      // operatorPrice bo'yicha admin panelda kiritilgan qatorga bog'lanadi
      // (qarang: index.html, installmentFinancingFor()).
      operatorPrice: (typeof x.operatorPrice === 'number') ? x.operatorPrice : null
    }));

    const payload = { ok: true, count: items.length, items, errors: result.errors };
    toCache(cacheKey, payload);
    return { statusCode: 200, headers, body: JSON.stringify(payload) };

  } catch (err) {
    console.error('api-live-search xato:', err);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ ok: false, error: err.message, items: [], errors: [err.message] })
    };
  }
};
