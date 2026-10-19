// DINAMIK SITEMAP — Google'ga "mana bizda shuncha sahifa bor" deb
// aytadigan ro'yxat. Statik sitemap.xml'da faqat bosh sahifa bor edi;
// endi har bir sotuvdagi raqam alohida manzil sifatida ko'rsatiladi.
//
// Bog'lanishi: _redirects
//     /sitemap.xml   /.netlify/functions/sitemap   200
//
// Google bitta sitemap'da 50 000 tagacha manzilni qabul qiladi — bizga
// bu yetarlidan ortiq.

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
const MAX = 20000;

exports.handler = async function () {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: SITE + '/', pri: '1.0', freq: 'daily' },
    { loc: SITE + '/#/katalog', pri: '0.9', freq: 'daily' },
    { loc: SITE + '/maxfiylik', pri: '0.3', freq: 'yearly' }
  ];

  /* TOIFA SAHIFALARI — operator, narx va naqsh bo'yicha.
     Bular Google'da "ucell vip raqamlar", "bo'lib to'lashga raqam",
     "7777 raqam" kabi so'rovlarga chiqadi. Ro'yxat seo-toifa.js
     bilan bir xil bo'lishi shart. */
  [
    'ucell-vip-raqamlar', 'beeline-vip-raqamlar', 'mobiuz-vip-raqamlar',
    'humans-vip-raqamlar', 'uzmobile-vip-raqamlar', 'perfektum-vip-raqamlar',
    'bolib-tolashga-raqamlar', 'arzon-vip-raqamlar', 'premium-vip-raqamlar',
    'bir-xil-raqamlar', 'juft-raqamlar', 'ikki-juft-raqamlar',
    'ketma-ket-raqamlar', 'yumaloq-raqamlar'
  ].forEach(slug => urls.push({ loc: SITE + '/' + slug, pri: '0.85', freq: 'daily' }));

  try {
    const snap = await db.collection('numbers').limit(MAX).get();
    snap.forEach(d => {
      const x = d.data() || {};
      if (x.reserved) return;                       // sotilgan raqam indekslanmasin
      const digits = String(x.number || '').replace(/\D/g, '');
      if (digits.length < 12) return;
      urls.push({ loc: SITE + '/raqam/' + digits, pri: x.featured ? '0.8' : '0.6', freq: 'weekly' });
    });
  } catch (e) { /* baza javob bermasa — hech bo'lmasa bosh sahifa qoladi */ }

  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u =>
      '  <url><loc>' + u.loc + '</loc><lastmod>' + today + '</lastmod>' +
      '<changefreq>' + u.freq + '</changefreq><priority>' + u.pri + '</priority></url>'
    ).join('\n') +
    '\n</urlset>\n';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600'
    },
    body
  };
};
