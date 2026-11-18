// UCELL — DILER PORTALI ORQALI RAQAM QIDIRISH.
//
// OGOHLANTIRISH: xuddi beeline-search.js dagi kabi — bu RASMIY, OCHIQ API
// EMAS, diler portaliga ulanish. Xuddi shu ehtiyot choralarini o'qing.
//
// MUHIM NOANIQLIK: topilgan kodda login so'rovi hech qanday login/parol
// yubormasdan, faqat GET so'rov bilan token olardi. Bu ikki narsani
// anglatishi mumkin: (1) bu URL ochiq, yoki (2) faqat ma'lum IP-manzillar
// (masalan ofisingiz)dan ishlaydi. Netlify serverlaridan ishlamasligi
// EHTIMOLI BOR — sinab ko'rish orqaligina aniqlanadi.
//
// Chaqirish: GET /.netlify/functions/ucell-search?pattern=***1234

const LOGIN_URL = 'https://cw-corn00.ucell.uz/ru/api/v1/services/dealer/auth/login';
const SEARCH_URL = 'https://cw-corn00.ucell.uz/api/v1/phone_number/search-mask';

// Kategoriyalar (msisdn_type) — topilgan kod asosida
const MSISDN_TYPES = [1, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 111];

let cachedToken = null;
let tokenExpiresAt = 0;

async function getNewToken() {
  const res = await fetch(LOGIN_URL);
  if (!res.ok) throw new Error(`Ucell login xatosi: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('Ucell: token topilmadi (login javobida)');
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 110 * 60 * 1000; // ~2 soat, ehtiyot uchun 110 daqiqa
  return cachedToken;
}

async function getValidToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return await getNewToken();
}

async function searchOneType(pattern, msisdnType, token) {
  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { Token: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pager: { pageNum: 0, pageSize: 20 },
      filter: { msisdn_type: msisdnType, search_type: 2, query: pattern, lang: 'uz' }
    })
  });
  if (res.status === 401) return { expired: true };
  if (!res.ok) return { data: [] };
  const data = await res.json();
  return { data: data.data || [] };
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat GET' }) };
  }

  const pattern = (event.queryStringParameters || {}).pattern;
  if (!pattern) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "pattern parametri kerak, masalan ***1234" }) };
  }

  try {
    let token = await getValidToken();

    let results = await Promise.all(MSISDN_TYPES.map(t => searchOneType(pattern, t, token)));

    // Agar token eskirgan bo'lsa — bir marta yangilab, qayta urinamiz
    if (results.some(r => r.expired)) {
      token = await getNewToken();
      results = await Promise.all(MSISDN_TYPES.map(t => searchOneType(pattern, t, token)));
    }

    const numbers = results.flatMap(r => r.data || []).map(p => ({
      number: p.msisdn || '',
      price: p.price || 0,
      priceDiscount: p.price_discount || 0
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, count: numbers.length, numbers }) };
  } catch (err) {
    console.error('ucell-search xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
