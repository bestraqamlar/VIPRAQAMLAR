// BEELINE — DILER PORTALI ORQALI RAQAM QIDIRISH.
//
// OGOHLANTIRISH: bu — Beeline'ning RASMIY, OCHIQ API'si EMAS. Bu — sizning
// (yoki avvalgi loyihangizning) diler hisobingiz orqali, ularning ICHKI
// diler portaliga (rms.beeline.uz) kirish. Buni ishlatishdan oldin:
//   1) Bu login/parol HALI HAM sizning nazoratingizda ekanligiga ishonch
//      hosil qiling
//   2) Beeline diler shartnomangizda "avtomatlashtirilgan so'rov" taqiqlanmagan
//      ekanligini tekshiring — aks holda hisobingiz bloklanishi mumkin
//   3) Buni FAQAT o'zingiz sinov sifatida ishlatib ko'ring, ommaga ochiq
//      qilishdan oldin natijasi barqaror ekanligiga ishonch hosil qiling
//
// Kerakli Environment variables (Netlify):
//   BEELINE_USERNAME, BEELINE_PASSWORD
//
// Chaqirish: GET /.netlify/functions/beeline-search?mask=9989****1234

let cachedToken = null;
let tokenExpiresAt = 0;

async function loginToBeeline() {
  const res = await fetch('https://rms.beeline.uz/api/v0/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.BEELINE_USERNAME,
      password: process.env.BEELINE_PASSWORD
    })
  });
  if (!res.ok) throw new Error(`Beeline login xatosi: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('Beeline: token topilmadi (login javobida)');
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 7 * 60 * 1000; // ~8 daqiqa amal qiladi, ehtiyot uchun 7
  return cachedToken;
}

async function getValidToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return await loginToBeeline();
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8'
  };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat GET' }) };
  }

  const mask = (event.queryStringParameters || {}).mask;
  if (!mask) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'mask parametri kerak, masalan 9989****1234' }) };
  }

  try {
    let token = await getValidToken();

    let res = await fetch(
      `https://rms.beeline.uz/api/v0/phone-numbers/selection-by-mask?page=0&includeDetails=true&size=50&mask=${encodeURIComponent(mask)}`,
      { headers: { 'Content-Type': 'application/json', authorization: token } }
    );

    // Token eskirgan bo'lsa — bir marta qayta login qilib, qayta urinamiz
    if (res.status === 401) {
      token = await loginToBeeline();
      res = await fetch(
        `https://rms.beeline.uz/api/v0/phone-numbers/selection-by-mask?page=0&includeDetails=true&size=50&mask=${encodeURIComponent(mask)}`,
        { headers: { 'Content-Type': 'application/json', authorization: token } }
      );
    }

    if (!res.ok) {
      return { statusCode: 502, headers, body: JSON.stringify({ ok: false, error: `Beeline API xatosi: ${res.status}` }) };
    }

    const data = await res.json();
    const numbers = (data.content || []).map(p => ({
      number: p.phoneNumber,
      category: p.name || 'Oddiy',
      price: p.price || 0
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, total: data.totalElements || 0, numbers }) };
  } catch (err) {
    console.error('beeline-search xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
