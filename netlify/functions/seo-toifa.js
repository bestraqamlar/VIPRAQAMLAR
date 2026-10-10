// ===================================================================
// TOIFA SAHIFALARI (SEO)
// -------------------------------------------------------------------
// MUAMMO: Google'da odamlar "ucell vip raqamlar", "bo'lib to'lashga
// raqam", "7777 raqam" deb qidiradi — bitta raqam nomi bilan emas.
// Bizda esa har raqamga alohida sahifa bor (seo-number.js), lekin
// TOIFA sahifasi yo'q edi — ya'ni aynan shu qidiruvlarda ko'rinmasdik.
//
// YECHIM: /ucell-vip-raqamlar kabi manzillar shu funksiyaga keladi.
// U index.html ni oladi, sarlavha/tavsif/canonical ni o'sha toifaga
// moslaydi, ichiga Google o'qiydigan tayyor ro'yxat (raqam + narx)
// va ItemList ma'lumotini qo'yadi. Mijoz uchun esa odatdagi sayt
// ochiladi — faqat katalog darhol o'sha filtr bilan chiqadi.
//
// TEZLIK/XARAJAT: raqamlar Firestore'dan EMAS, o'zimizning
// /api-index funksiyasidan olinadi — u CDN'da keshlangan, ya'ni bot
// tashriflari baza hisobini oshirmaydi. Javobning o'zi ham 10 daqiqa
// CDN'da turadi.
//
// Bog'lanishi: _redirects
// ===================================================================

const fs = require('fs');
const path = require('path');

const SITE = 'https://vipraqamlar.uz';
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pul = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ').replace(/,/g, ' ');

/* "901234567" -> "90 123 45 67" */
function chiroyli(d9) {
  const d = String(d9 || '').replace(/\D/g, '').slice(-9);
  if (d.length !== 9) return String(d9 || '');
  return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5, 7) + ' ' + d.slice(7);
}

/* ---- Naqshlar (saytdagi bilan AYNAN bir xil bo'lishi shart) ---- */
const NAQSH = {
  aaaa:  (d) => d[0] === d[1] && d[1] === d[2] && d[2] === d[3],
  abab:  (d) => d[0] === d[2] && d[1] === d[3] && d[0] !== d[1],
  aabb:  (d) => d[0] === d[1] && d[2] === d[3] && d[0] !== d[2],
  ketma: (d) => { const a=+d[0],b=+d[1],c=+d[2],e=+d[3];
                  return (b===a+1&&c===b+1&&e===c+1) || (b===a-1&&c===b-1&&e===c-1); },
  nol:   (d) => d[2] === '0' && d[3] === '0'
};

/* ---- Toifalar jadvali ---- */
const OPERATORLAR = ['Ucell', 'Beeline', 'Mobiuz', 'Humans', 'Uzmobile', 'Perfektum'];

const TOIFA = {};
OPERATORLAR.forEach(op => {
  const s = op.toLowerCase();
  TOIFA[s + '-vip-raqamlar'] = {
    h1: op + ' VIP raqamlar',
    title: op + ' VIP raqamlar — narxi va bo‘lib to‘lash | VIP RAQAMLAR',
    desc: op + ' operatorining chiroyli va VIP telefon raqamlari. Narxlari, bo‘lib to‘lash imkoniyati, rasmiy shartnoma va O‘zbekiston bo‘ylab bepul yetkazib berish.',
    kirish: op + ' operatorining eng chiroyli raqamlari shu yerda. Har bir raqam rasmiy shartnoma bilan rasmiylashtiriladi, ko‘pchiligiga bo‘lib to‘lash ham mavjud.',
    filtr: (n) => n.operator === op,
    spa: { op }
  };
});

TOIFA['bolib-tolashga-raqamlar'] = {
  h1: 'Bo‘lib to‘lashga VIP raqamlar',
  title: 'Bo‘lib to‘lashga VIP raqamlar — oldindan to‘lovsiz | VIP RAQAMLAR',
  desc: 'Bo‘lib to‘lashga beriladigan VIP telefon raqamlari. Oldindan to‘lovsiz, 6, 12, 24 va 36 oyga, rasmiy shartnoma bilan.',
  kirish: 'Quyidagi raqamlarni bo‘lib to‘lab olish mumkin — oldindan to‘lovsiz, rasmiy shartnoma asosida. Oylik to‘lov har raqam yonida ko‘rsatilgan.',
  filtr: (n) => n.installment,
  spa: { ins: true }
};
TOIFA['arzon-vip-raqamlar'] = {
  h1: 'Arzon VIP raqamlar',
  title: 'Arzon VIP raqamlar — 3 mln so‘mgacha | VIP RAQAMLAR',
  desc: 'Hamyonbop narxdagi chiroyli telefon raqamlari — 3 million so‘mgacha. Bo‘lib to‘lash va bepul yetkazib berish bilan.',
  kirish: 'Hamyonbop narxdagi chiroyli raqamlar. Narxi 3 million so‘mgacha bo‘lgan barcha raqamlar arzonidan boshlab tartiblangan.',
  filtr: (n) => n.price > 0 && n.price <= 3000000,
  tartib: 'arzon',
  spa: { sort: 'cheap' }
};
TOIFA['premium-vip-raqamlar'] = {
  h1: 'Premium VIP raqamlar',
  title: 'Premium VIP raqamlar — eng nodir raqamlar | VIP RAQAMLAR',
  desc: 'Eng nodir va qimmatbaho VIP telefon raqamlari. Premium toifa, rasmiy shartnoma, shaxsiy xizmat.',
  kirish: 'Eng nodir raqamlar to‘plami. Bunday raqamlar kam uchraydi va tez sotiladi.',
  filtr: (n) => n.featured || ['premium', 'gold', 'vip'].indexOf(n.tier) > -1,
  spa: { sort: 'expensive' }
};

const NAQSH_SAHIFA = [
  ['bir-xil-raqamlar', 'aaaa', 'Bir xil raqamlar (7777)',
   'Oxiri to‘rtta bir xil raqam bilan tugaydigan VIP raqamlar: 7777, 8888, 0000. Eng ko‘p izlanadigan va eng oson eslab qolinadigan toifa.'],
  ['juft-raqamlar', 'abab', 'Juft raqamlar (0707)',
   'Takrorlanuvchi juftlikdan iborat raqamlar: 0707, 1212, 5656. Ritmli va chiroyli ko‘rinadi.'],
  ['ikki-juft-raqamlar', 'aabb', 'Ikki juft raqamlar (7788)',
   'Ikki juftlikdan iborat raqamlar: 7788, 1122, 5566. Eslab qolish oson, narxi esa bir xil raqamlardan hamyonbop.'],
  ['ketma-ket-raqamlar', 'ketma', 'Ketma-ket raqamlar (1234)',
   'Ketma-ket keladigan raqamlar: 1234, 4567, 9876. Biznes uchun ko‘p tanlanadi.'],
  ['yumaloq-raqamlar', 'nol', 'Yumaloq raqamlar (00 bilan tugaydi)',
   'Oxiri ikki nol bilan tugaydigan raqamlar: 2500, 7700, 1900. Aytish ham, yozish ham qulay.']
];
NAQSH_SAHIFA.forEach(([slug, k, h1, desc]) => {
  TOIFA[slug] = {
    h1,
    title: h1 + ' — VIP telefon raqamlari | VIP RAQAMLAR',
    desc,
    kirish: desc,
    filtr: (n) => { const d = String(n.d9 || '').slice(-4); return d.length === 4 && NAQSH[k](d); },
    spa: { naqsh: k }
  };
});

const SLUGLAR = Object.keys(TOIFA);

/* ---- index.html (bir marta o'qiladi) ---- */
let SHELL = null;
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

/* ---- Indeksni ochish (lib/numIndex.js formatidagi satrlar) ---- */
const TIERS = ['', 'premium', 'gold', 'vip', 'silver', 'bronze'];
function ochish(pack) {
  const ops = pack.ops || [];
  const out = [];
  for (const row of String(pack.rows || '').split('\n')) {
    if (!row) continue;
    const q = row.split('|');
    if (q.length < 7) continue;
    const fl = +q[5] || 0;
    out.push({
      id: q[0],
      d9: q[1],
      operator: ops[+q[2]] || '',
      price: +q[3] || 0,
      reserved: !!(fl & 1),
      installment: !!(fl & 2),
      featured: !!(fl & 4),
      tier: TIERS[+q[6] || 0] || ''
    });
  }
  return out;
}

async function raqamlar(host) {
  const url = 'https://' + host + '/.netlify/functions/api-index';
  const res = await fetch(url, { headers: { 'User-Agent': 'vip-seo-toifa' } });
  if (!res.ok) throw new Error('api-index ' + res.status);
  const j = await res.json();
  if (!j || !j.ok) throw new Error('api-index javobi bo‘sh');
  return ochish(j);
}

exports.handler = async function (event) {
  const html = shell();
  if (!html) return { statusCode: 302, headers: { Location: '/' }, body: '' };

  const slug = decodeURIComponent(String(event.path || '').split('/').filter(Boolean).pop() || '')
    .toLowerCase().replace(/\.html?$/, '');
  const t = TOIFA[slug];
  if (!t) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      body: html.replace('</head>', '<meta name="robots" content="noindex">\n</head>')
    };
  }

  let list = [];
  try {
    const host = (event.headers && (event.headers['x-forwarded-host'] || event.headers.host)) || 'vipraqamlar.uz';
    const hammasi = await raqamlar(host);
    list = hammasi.filter(n => !n.reserved).filter(t.filtr);
    list.sort((a, b) => t.tartib === 'arzon' ? (a.price - b.price) : (b.price - a.price));
  } catch (e) { /* ro'yxatsiz ham sahifa ochiladi */ }

  const son = list.length;
  const korsat = list.slice(0, 60);
  const url = SITE + '/' + slug;
  const title = t.title;
  const desc = (son ? son + ' ta raqam. ' : '') + t.desc;

  /* Google o'qiydigan tayyor ro'yxat. Mijoz buni ko'rmaydi: ilova
     ochilishi bilan #app ichidagi tarkib ustidan chiziladi. */
  const royxat = korsat.map(n =>
    '<li><a href="/raqam/998' + esc(n.d9) + '">' + esc(chiroyli(n.d9)) + '</a> — ' +
    esc(n.operator) + (n.price ? ', ' + pul(n.price) + " so'm" : '') +
    (n.installment ? ", bo'lib to'lash mavjud" : '') + '</li>'
  ).join('');

  const boshqaToifa = SLUGLAR.filter(x => x !== slug).slice(0, 12)
    .map(x => '<a href="/' + x + '">' + esc(TOIFA[x].h1) + '</a>').join(' · ');

  const seoBlok =
    '<div id="seoToifa" style="position:absolute;left:-10000px;top:0;width:1px;height:1px;overflow:hidden">' +
    '<h1>' + esc(t.h1) + '</h1>' +
    '<p>' + esc(t.kirish) + '</p>' +
    (son ? '<p>Jami ' + son + ' ta raqam mavjud.</p>' : '') +
    (royxat ? '<ul>' + royxat + '</ul>' : '') +
    '<nav>' + boshqaToifa + '</nav>' +
    '</div>';

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t.h1,
    description: t.desc,
    url,
    numberOfItems: son,
    itemListElement: korsat.slice(0, 30).map((n, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: SITE + '/raqam/998' + n.d9,
      name: chiroyli(n.d9) + (n.operator ? ' — ' + n.operator : '')
    }))
  };
  const nonYoli = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Katalog', item: SITE + '/#/katalog' },
      { '@type': 'ListItem', position: 3, name: t.h1, item: url }
    ]
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
    '<script type="application/ld+json">' + JSON.stringify(nonYoli) + '</script>\n' +
    '<script>window.__SEO_TOIFA=' + JSON.stringify(t.spa) + ';</script>\n' +
    '</head>');
  out = out.replace('<body>', '<body>\n' + seoBlok);

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400'
    },
    body: out
  };
};

exports.SLUGLAR = SLUGLAR;
exports.TOIFA = TOIFA;
