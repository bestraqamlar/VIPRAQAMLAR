// KIRISH XIZMATI — ZAXIRA YO'L (V99)
//
// ============================ NEGA KERAK ============================
// Admin panelga kirish Google'ning "Identity Toolkit" xizmati orqali
// amalga oshadi: brauzer to'g'ridan-to'g'ri
//   https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
// manziliga murojaat qiladi. Ba'zi KOMPYUTERLARDA aynan shu manzil
// to'siladi — sabablari:
//   * antivirusning "veb/HTTPS qalqoni" (Kaspersky, Avast, ESET...),
//   * reklama bloklagich yoki maxfiylik kengaytmasi,
//   * korporativ/uy routeridagi DNS filtri,
//   * provayder darajasidagi to'siq.
// Natija: sayt ochiladi (chunki u vipraqamlar.uz'dan keladi), lekin
// kirish ishlamaydi va Firebase "auth/network-request-failed" beradi.
// Telefonda esa ishlayveradi — chunki u yerda antivirus/kengaytma yo'q.
// Bizda aynan shunday holat bo'ldi: bitta tarmoqda telefon kiradi,
// kompyuter kirmaydi.
//
// ============================ YECHIM ============================
// Brauzer Google'ga TO'G'RIDAN-TO'G'RI bormaydi, so'rovni SAYTNING
// O'ZIGA (vipraqamlar.uz) yuboradi, sayt esa uni Google'ga uzatadi.
// Sayt manzili to'silmagan (sayt ochilyapti), shuning uchun bu yo'l
// ishlaydi. Panelda bu avtomatik ishga tushadi — qarang: panel.js
// ichidagi `authZaxira` (Google manzili ochilmasa, Firebase SDK shu
// funksiyaga yo'naltiriladi).
//
// ============================ XAVFSIZLIK ============================
//  1. FAQAT ro'yxatdagi manzillar uzatiladi (kirish, token yangilash,
//     hisob ma'lumoti). Ya'ni bu "istalgan joyga so'rov yuboruvchi"
//     ochiq proksi EMAS — faqat Google'ning kirish xizmati.
//  2. Faqat identitytoolkit.googleapis.com va securetoken.googleapis.com.
//  3. IP bo'yicha chegara (xotirada): 60 soniyada 20 ta so'rov. Parol
//     tanlashga urinish esa alohida, qattiqroq himoyada — admin-login-lock
//     funksiyasi 5 daqiqada 3 marta qoidasini qo'llaydi.
//  4. So'rov hajmi cheklangan (8 KB) — katta ma'lumot uzatib bo'lmaydi.
//  5. Hech qanday maxfiy kalit ishlatilmaydi: Firebase Web API kaliti
//     allaqachon ommaviy (u brauzerda ochiq turadi). Ya'ni bu funksiya
//     hech qanday yangi sir ochmaydi.
//  6. Parol faqat o'tib ketadi — hech qayerga yozilmaydi, log'ga ham
//     tushmaydi (quyida ataylab hech narsa console.log qilinmaydi).

const RUXSAT = {
  'identitytoolkit.googleapis.com': [
    '/v1/accounts:signInWithPassword',
    '/v1/accounts:signInWithCustomToken',
    '/v1/accounts:lookup',
    '/v1/accounts:sendOobCode',
    '/v1/accounts:resetPassword',
    '/v1/accounts:update',
    '/v1/accounts:signUp',
    '/v2/accounts/mfaSignIn:start',
    '/v2/accounts/mfaSignIn:finalize'
  ],
  'securetoken.googleapis.com': [
    '/v1/token'
  ]
};

/* IP bo'yicha oddiy chegara. Firestore ishlatilmaydi — kirish yo'li
   hech qanday qo'shimcha xizmatga BOG'LIQ BO'LMASLIGI kerak (aks holda
   o'sha xizmat ishlamasa, zaxira yo'l ham ishlamay qolardi). */
const HISOB = new Map();
const OYNA_MS = 60000;
const CHEGARA = 20;

function ipOl(event) {
  const h = (event && event.headers) || {};
  const ip = h['x-nf-client-connection-ip']
    || h['client-ip']
    || ((h['x-forwarded-for'] || '').split(',')[0].trim())
    || 'unknown';
  return String(ip).replace(/[^\w.:-]/g, '_').slice(0, 60) || 'unknown';
}

function tezlikOk(ip) {
  const now = Date.now();
  if (HISOB.size > 5000) HISOB.clear();            // xotira o'smasin
  const y = HISOB.get(ip);
  if (!y || now - y.boshi > OYNA_MS) { HISOB.set(ip, { boshi: now, soni: 1 }); return true; }
  if (y.soni >= CHEGARA) return false;
  y.soni++;
  return true;
}

const JAVOB_SARLAVHA = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Cache-Control': 'no-store'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Allow': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: JAVOB_SARLAVHA, body: JSON.stringify({ error: { code: 405, message: 'METHOD_NOT_ALLOWED' } }) };
  }

  /* Asl manzil: /identitytoolkit.googleapis.com/v1/accounts:signInWithPassword
     (_redirects shu funksiyaga yo'naltiradi, lekin yo'l o'zgarmaydi). */
  const NAQSH = /^\/((?:identitytoolkit|securetoken)\.googleapis\.com)(\/.+)$/;
  let m = String(event.path || '').match(NAQSH);
  if (!m) {
    /* Zaxira: ba'zi hollarda Netlify `path` o'rniga faqat to'liq manzilni
       beradi — o'shanda yo'lni rawUrl'dan ajratamiz. */
    try { m = new URL(event.rawUrl).pathname.match(NAQSH); } catch (e) { m = null; }
  }
  if (!m) {
    return { statusCode: 404, headers: JAVOB_SARLAVHA, body: JSON.stringify({ error: { code: 404, message: 'NOT_FOUND' } }) };
  }
  const host = m[1];
  const path = m[2];
  if (!(RUXSAT[host] || []).includes(path)) {
    return { statusCode: 403, headers: JAVOB_SARLAVHA, body: JSON.stringify({ error: { code: 403, message: 'PATH_NOT_ALLOWED' } }) };
  }

  const tana = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : (event.body || '');
  if (tana.length > 8192) {
    return { statusCode: 413, headers: JAVOB_SARLAVHA, body: JSON.stringify({ error: { code: 413, message: 'TOO_LARGE' } }) };
  }

  if (!tezlikOk(ipOl(event))) {
    return { statusCode: 429, headers: JAVOB_SARLAVHA, body: JSON.stringify({ error: { code: 429, message: 'TOO_MANY_REQUESTS' } }) };
  }

  /* So'rov qatori (?key=...) o'zgarishsiz uzatiladi — Firebase Web API
     kaliti o'sha yerda keladi. */
  const qs = event.rawQuery
    || new URLSearchParams(event.queryStringParameters || {}).toString();
  const manzil = 'https://' + host + path + (qs ? '?' + qs : '');

  try {
    const javob = await fetch(manzil, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        /* API kalitiga "faqat shu saytdan" cheklovi qo'yilgan bo'lsa,
           Google aynan shu sarlavhaga qaraydi. Brauzer so'rovida u
           avtomatik qo'yilardi, server so'rovida — qo'lda. */
        'Referer': 'https://vipraqamlar.uz/',
        'X-Client-Version': String((event.headers || {})['x-client-version'] || 'Web/JsCore/10.13.2/FirebaseCore-web').slice(0, 120)
      },
      body: tana
    });
    const matn = await javob.text();
    return {
      statusCode: javob.status,
      headers: JAVOB_SARLAVHA,
      body: matn
    };
  } catch (e) {
    /* Google'ga SERVERDAN ham ulanib bo'lmadi — bu juda kam uchraydi.
       Firebase SDK buni o'zining tarmoq xatosi deb qabul qiladi. */
    return {
      statusCode: 502,
      headers: JAVOB_SARLAVHA,
      body: JSON.stringify({ error: { code: 502, message: 'UPSTREAM_UNREACHABLE' } })
    };
  }
};
