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
const { searchAll, testBeelineLogin } = require('./lib/operators');

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
  if (params.action === 'test-beeline') {
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
    const result = await searchAll(boxes, config, { limit, operator });

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
      // boshlanadi. Bu raqamlar Firestore'da yo'q — faqat ko'rsatiladi.
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
      category: x.category || ''
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
