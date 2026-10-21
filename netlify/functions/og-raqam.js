// ULASHISH KARTOCHKASI — har bir raqam uchun rasm (Open Graph image)
//
// MUAMMO: mijoz raqam havolasini Telegramga yoki Instagramga tashlasa,
// u yerda saytning UMUMIY logotipi va umumiy yozuvi chiqardi. Do'sti
// qaysi raqam ekanini ham, narxini ham ko'rmasdi — havolani ochishi
// kerak edi. Ko'pchilik ochmaydi.
//
// YECHIM: /og/raqam/998901234567.png manzili shu funksiyaga keladi.
// Funksiya bazadan raqamni topib, 1200x630 o'lchamdagi PNG rasm
// CHIZADI: raqamning o'zi katta qilib, operatori, toifasi, narxi,
// bo'lib to'lash summasi va sayt nomi bilan. seo-number.js o'sha
// manzilni `og:image` tegiga qo'yadi.
//
// Qayerda ishlaydi: Telegram, WhatsApp, Instagram DM, Facebook,
// Twitter/X, Google qidiruv natijalari — hammasi bir xil standart.
//
// NEGA SHRIFTLAR SHU FAYL ICHIDA: rasm chizuvchi kutubxona (resvg)
// faqat .ttf o'qiydi, saytdagi .woff2 ni emas. Uchta shriftni alohida
// fayl qilib qo'yish o'rniga (Netlify'ga yuklanadigan fayllar soni
// cheklangan) ular shu yerda base64 ko'rinishida saqlanadi. Faqat
// lotin harflari va raqamlar qoldirilgan — 276 KB dan 80 KB ga tushdi.
//
// Bog'lanishi: _redirects faylida
//     /og/raqam/*   /.netlify/functions/og-raqam   200

const admin = require('firebase-admin');
const { Resvg } = require('@resvg/resvg-js');

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

/* ---------- Shriftlar va logotip (base64) ---------- */
const { LOGO_URI, shriftSozlama } = require('./lib/ogShrift');

/* ---------- Yordamchilar ---------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const pul = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/[, ]/g, ' ');

// +998901234567 -> "90 123 45 67"
function chiroyli(num) {
  const d = String(num || '').replace(/\D/g, '').replace(/^998/, '');
  if (d.length !== 9) return String(num || '');
  return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
}

const OP_RANG = {
  Ucell: '#FFC800', Beeline: '#FFCC00', Humans: '#7B4EFF',
  Mobiuz: '#00B8A9', Uzmobile: '#2E9BFF', Perfektum: '#FF5C5C'
};
const TOIFA_NOM = { premium: 'PREMIUM', gold: 'GOLD', vip: 'VIP', silver: 'SILVER', bronze: 'BRONZE' };

/* XAVFSIZLIK: bu funksiya ochiq (kalitsiz) va har chaqirishda PNG
   chizadi — ya'ni ~0.5 s protsessor vaqti. Shu sabab Firestore'ga
   TEGMASDAN OLDIN raqam qat'iy tekshiriladi: faqat 9 xonali yoki
   998 bilan boshlanadigan 12 xonali raqam o'tadi. Tasodifiy
   satrlar baza so'rovini ham, rasm chizishni ham boshlamaydi. */
function raqamTogrimi(digits) {
  if (digits.length === 9) return true;
  if (digits.length === 12) return digits.slice(0, 3) === '998';
  return false;
}

async function topRaqam(raw) {
  const digits = String(raw || '').slice(0, 24).replace(/\D/g, '');
  if (!raqamTogrimi(digits)) return null;
  const full = '+' + (digits.length === 9 ? '998' + digits : digits);
  try {
    const q = await db.collection('numbers').where('number', '==', full).limit(1).get();
    if (!q.empty) {
      const d = q.docs[0]; const x = d.data() || {};
      if (x.hidden) return null;          // admin yashirgan raqam ulashilmaydi
      return Object.assign({ id: d.id }, x);
    }
  } catch (e) {}
  return null;
}

/* ---------- Bo'lib to'lash summasi ----------
   MUHIM: saytdagi `oylikTolov()` bilan BIR XIL tartibda ishlaydi —
   avval adminda qo'lda kiritilgan summa, keyin kun taklifi, oxirida
   foizli formula. Ikki xil summa chiqib qolmasligi uchun. */
async function oylikTolov(item) {
  if (!item) return '';
  if (String(item.currency || '').toLowerCase() === 'usd') return '';
  for (const m of [24, 12, 6]) {
    const aniq = Number(item['monthly' + m]) || 0;
    if (aniq) return pul(aniq) + " so'mdan / " + m + ' oy';
  }
  if (item.dailyDeal) {
    for (const m of [24, 12, 6]) {
      const d = Number(item['dealMonthly' + m]) || 0;
      if (d) return pul(d) + " so'mdan / " + m + ' oy';
    }
  }
  if (item.installment === true && item.price) {
    let foiz = 20;
    try {
      const s = await db.collection('site_settings').doc('general').get();
      const r = (s.exists && s.data() && s.data().installmentRates) || null;
      if (r && Number(r[24])) foiz = Number(r[24]);
    } catch (e) {}
    const oy = Math.ceil((Number(item.price) * (1 + foiz / 100)) / 24 / 1000) * 1000;
    return pul(oy) + " so'mdan / 24 oy";
  }
  return '';
}

/* ---------- Rasmni chizish ---------- */
function svgKarta(o) {
  const W = 1200, H = 630;
  const opRang = OP_RANG[o.operator] || '#9FB4D4';
  const opEni = Math.round(String(o.operator || '').length * 11.2) + 54;
  const toifaEni = Math.round(String(o.toifa || '').length * 12.4) + 44;
  const toifaX = W - 72 - toifaEni;
  const opX = toifaX - 16 - opEni;
  // Raqam uzun bo'lsa shriftni kichraytiramiz — chekkadan chiqib ketmasin
  const raqamShrift = String(o.raqam).length > 13 ? 88 : 104;

  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'
+ '<defs>'
+ '<linearGradient id="asos" x1="0" y1="0" x2="0.62" y2="1"><stop offset="0" stop-color="#102548"/><stop offset="0.42" stop-color="#1A3A6B"/><stop offset="1" stop-color="#060E1E"/></linearGradient>'
+ '<radialGradient id="oltin" cx="1.04" cy="-0.14" r="0.95"><stop offset="0" stop-color="#F6DFA4" stop-opacity="0.42"/><stop offset="0.44" stop-color="#F6DFA4" stop-opacity="0.11"/><stop offset="0.68" stop-color="#F6DFA4" stop-opacity="0"/></radialGradient>'
+ '<radialGradient id="kok" cx="-0.14" cy="1.16" r="1"><stop offset="0" stop-color="#467EF5" stop-opacity="0.26"/><stop offset="0.68" stop-color="#467EF5" stop-opacity="0"/></radialGradient>'
+ '<radialGradient id="vinyet" cx="0.5" cy="0.12" r="0.95"><stop offset="0.38" stop-color="#020814" stop-opacity="0"/><stop offset="1" stop-color="#020814" stop-opacity="0.62"/></radialGradient>'
+ '<pattern id="setka" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">'
+ '<path d="M0 0H34M0 17H34" stroke="#FFFFFF" stroke-opacity="0.030" stroke-width="1"/>'
+ '<path d="M0 0V34M17 0V34" stroke="#F0D898" stroke-opacity="0.026" stroke-width="1"/></pattern>'
+ '<linearGradient id="raqamRang" x1="0" y1="0" x2="0.08" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.46" stop-color="#FFFFFF"/><stop offset="0.74" stop-color="#FCF1D8"/><stop offset="1" stop-color="#F0DCAC"/></linearGradient>'
+ '<linearGradient id="folga" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF0CF"/><stop offset="0.4" stop-color="#EDD79A"/><stop offset="0.72" stop-color="#D5B059"/><stop offset="1" stop-color="#B8902F"/></linearGradient>'
+ '<linearGradient id="ramka" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#F0D898" stop-opacity="0.75"/><stop offset="0.34" stop-color="#F0D898" stop-opacity="0.18"/><stop offset="0.62" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="1" stop-color="#F0D898" stop-opacity="0.26"/></linearGradient>'
+ '<linearGradient id="chiziq" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F0D898" stop-opacity="0.55"/><stop offset="0.58" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
+ '</defs>'
+ '<rect width="' + W + '" height="' + H + '" fill="url(#asos)"/>'
+ '<rect width="' + W + '" height="' + H + '" fill="url(#setka)"/>'
+ '<rect width="' + W + '" height="' + H + '" fill="url(#oltin)"/>'
+ '<rect width="' + W + '" height="' + H + '" fill="url(#kok)"/>'
+ '<rect width="' + W + '" height="' + H + '" fill="url(#vinyet)"/>'
+ '<rect x="1.5" y="1.5" width="' + (W - 3) + '" height="' + (H - 3) + '" fill="none" stroke="url(#ramka)" stroke-width="3"/>'
+ '<image x="72" y="60" width="76" height="76" xlink:href="' + LOGO_URI + '"/>'
+ '<text x="166" y="96" font-family="Plus Jakarta Sans" font-size="30" font-weight="800" letter-spacing="4.2" fill="#FFFFFF">VIP RAQAMLAR</text>'
+ '<text x="166" y="124" font-family="Plus Jakarta Sans" font-size="16" font-weight="600" fill="#9FB4D4">Chiroyli va VIP telefon raqamlar</text>'
+ (o.toifa
   ? '<rect x="' + toifaX + '" y="78" width="' + toifaEni + '" height="46" rx="14" fill="url(#folga)"/>'
   + '<text x="' + (toifaX + toifaEni / 2) + '" y="108" font-family="Plus Jakarta Sans" font-size="17" font-weight="800" letter-spacing="2.6" fill="#201702" text-anchor="middle">' + esc(o.toifa) + '</text>'
   : '')
+ (o.operator
   ? '<rect x="' + opX + '" y="78" width="' + opEni + '" height="46" rx="14" fill="#FFFFFF" fill-opacity="0.08" stroke="#F0D898" stroke-opacity="0.26" stroke-width="1.5"/>'
   + '<circle cx="' + (opX + 26) + '" cy="101" r="7" fill="' + opRang + '"/>'
   + '<text x="' + (opX + 42) + '" y="108" font-family="Plus Jakarta Sans" font-size="19" font-weight="700" fill="#E3EBF8">' + esc(o.operator) + '</text>'
   : '')
+ '<text x="72" y="356" font-family="Space Grotesk" font-size="' + raqamShrift + '" font-weight="700" letter-spacing="1.2" fill="url(#raqamRang)">' + esc(o.raqam) + '</text>'
+ '<rect x="72" y="412" width="' + (W - 144) + '" height="1.5" fill="url(#chiziq)"/>'
+ (o.band
   ? '<text x="72" y="470" font-family="Plus Jakarta Sans" font-size="16" font-weight="700" letter-spacing="1.6" fill="#9FB4D4">HOLATI</text>'
   + '<text x="72" y="520" font-family="Plus Jakarta Sans" font-size="40" font-weight="800" fill="#9FB4D4">BAND QILINGAN</text>'
   : '<text x="72" y="470" font-family="Plus Jakarta Sans" font-size="16" font-weight="700" letter-spacing="1.6" fill="#9FB4D4">NARXI</text>'
   + '<text x="72" y="520" font-family="Space Grotesk" font-size="46" font-weight="700" fill="#FFFFFF">' + esc(o.narx)
   + '<tspan font-family="Plus Jakarta Sans" font-size="22" font-weight="600" fill="#9FB4D4" dx="12">' + esc(o.valyuta) + '</tspan></text>'
   + (o.oylik
      ? '<rect x="72" y="540" width="' + (Math.round(o.oylik.length * 10.4) + 32) + '" height="42" rx="12" fill="#E6C877" fill-opacity="0.14"/>'
      + '<text x="88" y="568" font-family="Plus Jakarta Sans" font-size="19" font-weight="700" fill="#F0D898">' + esc(o.oylik) + '</text>'
      : ''))
+ '<text x="' + (W - 72) + '" y="524" font-family="Space Grotesk" font-size="28" font-weight="700" fill="#F0D898" text-anchor="end">vipraqamlar.uz</text>'
+ '<text x="' + (W - 72) + '" y="556" font-family="Plus Jakarta Sans" font-size="17" font-weight="600" fill="#9FB4D4" text-anchor="end">Rasmiy shartnoma · Bepul yetkazib berish</text>'
+ '</svg>';
}

function chiz(svg) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: shriftSozlama()      // qarang: lib/ogShrift.js (shrift tekshiruvi + zaxira)
  });
  return r.render().asPng();
}

/* ---------- Handler ---------- */
/* Issiq funksiyada chizilgan rasmlar 10 daqiqa saqlanadi — bir xil
   raqam qayta so'ralsa protsessor umuman ishlatilmaydi. */
let PMEM = new Map();

exports.handler = async function (event) {
  let raw = '';
  try {
    raw = decodeURIComponent((event.path || '').slice(0, 200)
      .replace(/^.*\/og\/raqam\//, '').replace(/\.png$/i, '')).trim();
  } catch (e) { raw = ''; }

  const item = await topRaqam(raw);

  /* Raqam topilmasa — saytning umumiy rasmiga yo'naltiramiz, bot
     bo'sh qolmasin. MUHIM: bu javob ham KESHLANADI. Aks holda
     mavjud bo'lmagan raqamlarni ketma-ket so'rab turgan bot har
     safar funksiyani ishga tushirib turardi. */
  if (!item) return {
    statusCode: 302,
    headers: {
      Location: '/assets/og-image.jpg',
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=86400'
    },
    body: ''
  };

  const kalit = item.id + ':' + item.price + ':' + (item.reserved ? 1 : 0);
  const keshda = PMEM.get(kalit);
  if (keshda && Date.now() - keshda.at < 600000) return rasmJavob(keshda.png);

  const usd = String(item.currency || '').toLowerCase() === 'usd';
  const png = chiz(svgKarta({
    raqam: chiroyli(item.number),
    operator: item.operator || '',
    toifa: TOIFA_NOM[String(item.tier || '').toLowerCase()] || (item.featured ? 'VIP' : ''),
    narx: pul(item.price),
    valyuta: usd ? '$' : "so'm",
    oylik: await oylikTolov(item),
    band: !!item.reserved
  }));

  PMEM.set(kalit, { at: Date.now(), png });
  if (PMEM.size > 200) PMEM = new Map();

  return rasmJavob(png);
};

function rasmJavob(png) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'image/png',
      // Rasm bir marta chizilib, CDN'da 1 soat turadi. Narx o'zgarsa
      // bir soat ichida yangilanadi, lekin har bir ulashishda qaytadan
      // chizilmaydi — sayt sekinlashmaydi.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff'
    },
    body: png.toString('base64'),
    isBase64Encoded: true
  };
}
