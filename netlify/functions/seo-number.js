// HAR BIR RAQAM UCHUN ALOHIDA SAHIFA (SEO)
//
// MUAMMO: sayt bitta HTML faylda ishlaydi (SPA). Google uchun bu bitta
// sahifa — ya'ni "998 90 777 77 77" deb qidirgan odam bizni HECH QACHON
// topmaydi. Ijtimoiy tarmoqqa tashlangan havola ham quruq "VIP RAQAMLAR"
// bo'lib ko'rinadi, raqam ham, narx ham ko'rinmaydi.
//
// YECHIM: /raqam/998901234567 manzili shu funksiyaga keladi. Funksiya
// bazadan o'sha raqamni topadi, index.html ichidagi <title>, tavsif,
// OG-teglar va Schema.org ma'lumotini O'SHA RAQAMGA moslab almashtiradi
// va shu ko'rinishda qaytaradi. Foydalanuvchi uchun hech narsa
// o'zgarmaydi — ilova odatdagidek ochiladi va raqam kartochkasi darhol
// chiqadi (buni index.html ichidagi JS bajaradi).
//
// Bog'lanishi: _redirects faylida
//     /raqam/*   /.netlify/functions/seo-number   200
//
// MUHIM: netlify.toml ichida included_files ro'yxatiga "index.html"
// qo'shilgan — aks holda funksiya uni o'qiy olmaydi.

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

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

const SITE = 'https://vipraqamlar.uz';

let SHELL = null;             // index.html bir marta o'qiladi va eslab qolinadi
function shell() {
  if (SHELL) return SHELL;
  for (const p of [
    path.join(process.cwd(), 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(__dirname, '..', '..', 'index.html')
  ]) {
    try { SHELL = fs.readFileSync(p, 'utf8'); return SHELL; } catch (e) {}
  }
  return null;
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// +998901234567 -> "90 123 45 67"
function chiroyli(num) {
  const d = String(num || '').replace(/\D/g, '').replace(/^998/, '');
  if (d.length !== 9) return String(num || '');
  return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
}
const pul = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ');

async function topRaqam(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  const full = '+' + (digits.length === 9 ? '998' + digits : digits);
  try {
    const q = await db.collection('numbers').where('number', '==', full).limit(1).get();
    if (!q.empty) { const d = q.docs[0]; return Object.assign({ id: d.id }, d.data()); }
  } catch (e) {}
  return null;
}

exports.handler = async function (event) {
  const html = shell();
  // index.html topilmasa — oddiy yo'naltirish, sayt baribir ishlayveradi
  if (!html) return { statusCode: 302, headers: { Location: '/' }, body: '' };

  const raw = decodeURIComponent((event.path || '').replace(/^.*\/raqam\//, '')).trim();
  const item = await topRaqam(raw);

  // Bazada yo'q raqam — Google indekslamasin, lekin mijozga sayt ochilsin
  if (!item) {
    const out = html.replace('</head>', '<meta name="robots" content="noindex">\n</head>');
    return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }, body: out };
  }

  const nice = chiroyli(item.number);
  const op = esc(item.operator || '');
  const narx = item.price ? pul(item.price) + " so'm" : '';
  const url = SITE + '/raqam/' + String(item.number || '').replace(/\D/g, '');

  const title = nice + (op ? ' — ' + op : '') + ' VIP raqam' + (narx ? ' | ' + narx : '') + ' | VIP RAQAMLAR';
  const desc = nice + ' — ' + (op ? op + ' operatori ' : '') + 'VIP telefon raqami' +
    (narx ? '. Narxi: ' + narx : '') +
    (item.installment ? '. Bo’lib to’lash mumkin' : '') +
    '. Rasmiy shartnoma, O‘zbekiston bo‘ylab bepul yetkazib berish.';

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: nice + ' VIP raqam',
    description: desc,
    sku: item.id,
    brand: { '@type': 'Brand', name: op || 'VIP RAQAMLAR' },
    image: SITE + '/assets/og-image.jpg',
    url,
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: (String(item.currency || '').toLowerCase() === 'usd') ? 'USD' : 'UZS',
      price: Number(item.price) || 0,
      availability: item.reserved ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'VIP RAQAMLAR' }
    }
  };

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, '<title>' + esc(title) + '</title>');
  out = out.replace(/<meta name="description" content="[^"]*">/i, '<meta name="description" content="' + esc(desc) + '">');
  out = out.replace(/<link rel="canonical" href="[^"]*">/i, '<link rel="canonical" href="' + esc(url) + '">');
  out = out.replace(/<meta property="og:title" content="[^"]*">/i, '<meta property="og:title" content="' + esc(title) + '">');
  out = out.replace(/<meta property="og:description" content="[^"]*">/i, '<meta property="og:description" content="' + esc(desc) + '">');
  out = out.replace(/<meta property="og:url" content="[^"]*">/i, '<meta property="og:url" content="' + esc(url) + '">');
  out = out.replace('</head>',
    '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n' +
    // Ilova ochilganda shu raqam kartochkasi darhol ochilishi uchun
    '<script>window.__SEO_NUMBER=' + JSON.stringify(String(item.number || '')) + ';</script>\n' +
    '</head>');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 5 daqiqa CDN keshi — narx o'zgarsa tez yangilanadi, lekin har
      // bir bot tashrifi uchun Firestore o'qilmaydi
      'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate'
    },
    body: out
  };
};
