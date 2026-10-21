// TELEGRAM KANALI UCHUN TAYYOR POST RASMI.
//
// ============================ NIMA QILADI ============================
// Admin panelda raqamni (va xohlasa narxini, toifasini, qo'shimcha
// yozuvini) kiritadi — shu funksiya o'sha ma'lumotni SAYTNING O'Z
// uslubidagi chiroyli kartochkaga joylab, tayyor PNG rasm qaytaradi.
// Admin uni yuklab oladi va kanalga tashlaydi. Har safar qo'lda
// dizayn qilish shart emas: bitta shablon, ma'lumot esa o'zi joyini
// topadi.
//
// NEGA SERVERDA CHIZILADI (brauzerda emas). Rasm `resvg` kutubxonasi
// bilan chiziladi va shriftlar fayl ichida (lib/ogShrift.js) turadi —
// natijada rasm HAR DOIM bir xil chiqadi: admin qaysi telefon yoki
// brauzerdan ochganidan qat'i nazar, shrift almashib ketmaydi.
// Brauzerda chizilganda (canvas) shrift yuklanmagan bo'lsa, boshqa
// shriftga tushib qolardi va post "arzon" ko'rinardi.
//
// Bu funksiya og-raqam.js bilan BIR XIL shrift va logotipni
// ishlatadi — shu sabab kanaldagi post va saytdagi ulashish kartochkasi
// bir xil uslubda bo'ladi.
//
// ============================ XAVFSIZLIK ============================
//  • Faqat HAQIQIY admin chaqira oladi (requireAdmin, 'settings' yoki
//    'numbers' huquqi) — aks holda har kim o'zi xohlagan matn bilan
//    bizning uslubimizdagi rasm yasab, saytimiz nomidan tarqatishi
//    mumkin edi.
//  • Har bir matn uzunligi cheklanadi va XML belgilari ekranlanadi
//    (SVG ichiga tushadigan matn — `esc`).
//  • Rasm bazaga TEGMAYDI: faqat kelgan matndan chiziladi.

const { Resvg } = require('@resvg/resvg-js');
const { LOGO_URI, SHRIFT_SOZ, SHRIFT_TASHXIS, shriftSozlama } = require('./lib/ogShrift');
const { requireAdmin } = require('./lib/adminAuth');

/* ---------- Yordamchilar ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function qirq(s, n) { return String(s == null ? '' : s).slice(0, n).trim(); }

/* "998901234567" / "90 123 45 67" -> "90 123 45 67" */
function chiroyliRaqam(v) {
  const d = String(v || '').replace(/\D/g, '');
  const oxirgi = d.length > 9 ? d.slice(-9) : d;
  if (oxirgi.length !== 9) return qirq(v, 24);
  return oxirgi.slice(0, 2) + ' ' + oxirgi.slice(2, 5) + ' ' + oxirgi.slice(5, 7) + ' ' + oxirgi.slice(7);
}
/* 25000000 -> "25 000 000" */
function pul(n) {
  const x = Math.round(Number(n) || 0);
  if (!x) return '';
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}


/* ---------------------- FON RANGLARI ----------------------
   Admin uchta fondan birini tanlaydi. Har birining o'z gradienti,
   "nur" rangi va chetdagi qorayishi bor — oltin raqam uchalasida ham
   to'g'ri ko'rinishi uchun alohida sozlangan.

   `kok`  — hozirgi, to'q ko'k (standart)
   `yashil` — to'q yashil (zumrad)
   `kulrang` — to'q kulrang (grafit)                                 */
const FONLAR = {
  kok: {
    a: '#0A1B33', b: '#102948', c: '#03070E',
    nur: '#3A6FDD', nurOp: 0.15, markaz: '#6E9BF0'
  },
  yashil: {
    a: '#07231C', b: '#0C3A2B', c: '#020C09',
    nur: '#1F8A62', nurOp: 0.16, markaz: '#44C79A'
  },
  kulrang: {
    a: '#141720', b: '#1E222C', c: '#06080C',
    nur: '#6A7384', nurOp: 0.14, markaz: '#9AA6BA'
  }
};

/* ============================ KARTOCHKA ============================
   V89 (mijoz so'rovi): post endi PLASTIK KARTA o'lchamida.

   O'LCHAM. Bank kartasining xalqaro standarti (ISO/IEC 7810 ID-1) —
   85.60 x 53.98 mm, ya'ni nisbat 1 : 1.586. Rasm 1620 x 1021 px qilib
   olindi: aynan shu nisbat va Telegram uchun yetarli aniqlik.

   NEGA KARTA ICHKARIDA TURADI. Rasmning o'zi karta bo'lsa, yumaloq
   burchaklar KO'RINMAY qolardi (Telegram rasmni to'rtburchak qilib
   ko'rsatadi). Shu sabab tashqarida to'q fon, ichkarida esa yumaloq
   burchakli karta — xuddi stolga qo'yilgan haqiqiy karta kabi,
   ostida yumshoq soya bilan.

   PREMIUM KO'RINISH nimalardan yig'ilgan:
     • oltin "folga" ramka va ichki nozik chiziq;
     • guilloche — bank kartalaridagi kabi nozik to'lqinli naqsh;
     • raqam OLTIN folga rangida, ostida TO'Q soya (ochiq fonda
       keskin ajralib tursin) va kontur bilan qalinlik;
     • diagonal "shisha" yaltirashi.
   ================================================================== */
function svgPost(o) {
  const W = 1620, H = 1021;          // ISO ID-1 nisbati (1 : 1.586)
  const M = 44;                      // karta atrofidagi fon
  const KW = W - M * 2, KH = H - M * 2;
  const R = 72;                      // burchak radiusi
  const P = M + 76;                  // karta ichidagi chekinish
  const ICH = KW - 152;              // ishchi kenglik

  const raqam = chiroyliRaqam(o.raqam);
  /* V92: raqam MARKAZDA — butun ichki kenglik ochiq, shu sabab
     kattaroq qilib qo'yildi. Uzun raqamda kichrayadi (chetdan
     chiqmasin): ichki kenglik 1380 px, Space Grotesk raqamining
     kengligi ~0.6 em — ya'ni 11 ta belgi 184 px da 1214 px joy oladi. */
  const rShrift = raqam.length > 15 ? 124 : (raqam.length > 13 ? 150 : (raqam.length > 11 ? 164 : 184));
  const qalin = Math.max(3, Math.round(rShrift / 38));

  /* Tanlangan fon (noto'g'ri qiymat kelsa — standart ko'k) */
  const F = FONLAR[o.fon] || FONLAR.kok;

  const narx = pul(o.narx);
  const oylikMatn = o.oylik ? (pul(o.oylik) + " so'mdan / " + (Number(o.oylar) || 24) + ' oy') : '';

  let q = [];

  /* ---------- 1) Karta asosi ---------- */
  q.push(
    /* soya */
    '<rect x="' + (M + 10) + '" y="' + (M + 18) + '" width="' + KW + '" height="' + KH + '" rx="' + R + '" fill="#01060F" fill-opacity="0.55" filter="url(#soya)"/>'
    + '<rect x="' + M + '" y="' + M + '" width="' + KW + '" height="' + KH + '" rx="' + R + '" fill="url(#asos)"/>'
    + '<rect x="' + M + '" y="' + M + '" width="' + KW + '" height="' + KH + '" rx="' + R + '" fill="url(#guilloche)"/>'
    + '<rect x="' + M + '" y="' + M + '" width="' + KW + '" height="' + KH + '" rx="' + R + '" fill="url(#oltin)"/>'
    + '<rect x="' + M + '" y="' + M + '" width="' + KW + '" height="' + KH + '" rx="' + R + '" fill="url(#kok)"/>'
    /* diagonal shisha yaltirashi */
    + '<path d="M' + (M + KW * 0.46) + ' ' + M + ' L' + (M + KW * 0.74) + ' ' + M
      + ' L' + (M + KW * 0.30) + ' ' + (M + KH) + ' L' + (M + KW * 0.04) + ' ' + (M + KH) + ' Z" fill="url(#yaltir)"/>'
    + '<rect x="' + M + '" y="' + M + '" width="' + KW + '" height="' + KH + '" rx="' + R + '" fill="url(#vinyet)"/>'
    /* oltin ramka + ichki nozik chiziq */
    + '<rect x="' + (M + 2) + '" y="' + (M + 2) + '" width="' + (KW - 4) + '" height="' + (KH - 4) + '" rx="' + (R - 2) + '" fill="none" stroke="url(#ramka)" stroke-width="4"/>'
    + '<rect x="' + (M + 16) + '" y="' + (M + 16) + '" width="' + (KW - 32) + '" height="' + (KH - 32) + '" rx="' + (R - 14) + '" fill="none" stroke="#F0D898" stroke-opacity="0.14" stroke-width="1.6"/>'
  );

  /* ---------- 2) Tepa chap: logotip va nom ---------- */
  q.push(
    '<image x="' + P + '" y="' + (M + 66) + '" width="68" height="68" opacity="0.92" xlink:href="' + LOGO_URI + '"/>'
    + '<text x="' + (P + 84) + '" y="' + (M + 100) + '" font-family="Plus Jakarta Sans" font-size="27" font-weight="800" letter-spacing="5" fill="#C9D7EC">VIP RAQAMLAR</text>'
    + '<text x="' + (P + 84) + '" y="' + (M + 128) + '" font-family="Plus Jakarta Sans" font-size="15" font-weight="600" letter-spacing="1" fill="#6F82A0">Chiroyli va VIP telefon raqamlar</text>'
  );

  /* ---------- 3) Tepa o'ng: toifa yorlig'i ---------- */
  if (o.toifa) {
    const en = Math.round(o.toifa.length * 14.4) + 54;
    const x = W - P - en;
    q.push(
      '<rect x="' + x + '" y="' + (M + 72) + '" width="' + en + '" height="52" rx="15" fill="url(#folga)" fill-opacity="0.9"/>'
      + '<text x="' + (x + en / 2) + '" y="' + (M + 105) + '" font-family="Plus Jakarta Sans" font-size="20" font-weight="800" letter-spacing="2.8" fill="#201702" text-anchor="middle">' + esc(o.toifa) + '</text>'
    );
  }

  /* ---------- 4) RAQAM (kartaning markazi) ----------
     V90 (mijoz so'rovi): "soyasi to'qroq bo'lsin, och emas — orqa fon
     ochiq-ku; premium bo'lsin, oltinroq".

     Avval orqada OLTIN RANGLI yorug'lik (nur) turardi. Karta foni
     ham yorug' ko'kimtir bo'lgani uchun u yorug'likning ustiga
     yorug'lik bo'lib tushardi — raqam ajralib turmasdi, "yuvilgan"
     ko'rinardi.

     Endi teskarisi: orqada TO'Q soya (deyarli qora), raqamning o'zi
     esa OLTIN folga rangida. To'q soya ochiq fonda raqamni keskin
     ajratib turadi — bosma kartalardagi oltin bosma (hot stamping)
     effekti aynan shunday ishlaydi.

     Uch qatlam: to'q soya -> kontur bilan qalinlik -> oltin gradient. */
  /* O'rta guruh (raqam) y=0 dan chiziladi, keyin
     HAMMASI BIRGA markazga suriladi — chip olib tashlangandan keyin
     o'rtada bo'sh joy qolib ketmasin (ekran surati bilan). */
  const orta = [];
  const OX = W / 2;                  // markaz o'qi
  const rY = rShrift * 0.74;
  orta.push(
    /* 0) raqam ortidagi yumshoq nur — ko'z shu yerga tortiladi */
    '<ellipse cx="' + OX + '" cy="' + (rY - rShrift * 0.28) + '" rx="' + Math.round(W * 0.38) + '" ry="' + Math.round(rShrift * 0.95) + '" fill="url(#markaz)"/>'
    /* 1) to'q soya — biroz pastga va o'ngga surilgan */
    + '<text x="' + (OX + 5) + '" y="' + (rY + 7) + '" font-family="Space Grotesk" font-size="' + rShrift + '" font-weight="700" letter-spacing="1" fill="#01050E" fill-opacity="0.62" filter="url(#soyaRaqam)" text-anchor="middle">' + esc(raqam) + '</text>'
    /* 2) + 3) oltin matn, konturi bilan qalinlashtirilgan */
    + '<text x="' + OX + '" y="' + rY + '" font-family="Space Grotesk" font-size="' + rShrift + '" font-weight="700" letter-spacing="1" fill="url(#raqamRang)" stroke="url(#raqamQirra)" stroke-width="' + qalin + '" stroke-linejoin="round" paint-order="stroke" text-anchor="middle">' + esc(raqam) + '</text>'
  );

  let y = rY + 38;

  /* O'rta guruhni markazga surish: sarlavha ostidan (M+176) pastki
     ajratuvchi chiziqqacha (PY-52) bo'lgan joyning o'rtasiga. */
  {
    const bosh = M + 176, oxir = H - M - 172 - 52;
    const joy = oxir - bosh;
    /* `y` — guruhning balandligi; raqamning tepasi taxminan rY*0.78
       ustida boshlanadi, shuni hisobga olamiz. */
    const bal = y + rShrift * 0.24;
    const surish = Math.round(bosh + Math.max(0, (joy - bal) / 2));
    q.push('<g transform="translate(0,' + surish + ')">' + orta.join('') + '</g>');
  }

  /* ---------- 7) Pastki qator: chapda narx, o'ngda sayt ---------- */
  /* Pastki blok. Eski narx karta chetiga juda yaqin qolmasligi uchun
     butun blok biroz yuqoriroqqa ko'chirildi (ekran surati bilan). */
  const PY = H - M - 172;            // pastki blok boshlanishi
  q.push('<rect x="' + P + '" y="' + (PY - 30) + '" width="' + ICH + '" height="2" fill="url(#chiziq)"/>');

  if (narx) {
    q.push(
      '<text x="' + P + '" y="' + (PY + 14) + '" font-family="Plus Jakarta Sans" font-size="15" font-weight="700" letter-spacing="2.4" fill="#6F82A0">NARXI</text>'
      + '<text x="' + P + '" y="' + (PY + 72) + '" font-family="Space Grotesk" font-size="48" font-weight="700" fill="#DDE7F5">' + esc(narx)
      + '<tspan font-family="Plus Jakarta Sans" font-size="22" font-weight="600" fill="#6F82A0" dx="13">' + esc(o.valyuta || "so'm") + '</tspan></text>'
    );
    if (o.eskiNarx && Number(o.eskiNarx) > Number(o.narx)) {
      q.push('<text x="' + P + '" y="' + (PY + 108) + '" font-family="Space Grotesk" font-size="27" font-weight="700" fill="#7C8FB0" text-decoration="line-through">' + esc(pul(o.eskiNarx)) + '</text>');
    }
  }
  if (oylikMatn) {
    const en = Math.round(oylikMatn.length * 12.4) + 48;
    /* Narx bor bo'lsa oylik undan o'ngroqda, bo'lmasa chapda */
    const x = narx ? (P + 420) : P;
    q.push(
      '<rect x="' + x + '" y="' + (PY + 26) + '" width="' + en + '" height="58" rx="17" fill="#E6C877" fill-opacity="0.14" stroke="#E6C877" stroke-opacity="0.3" stroke-width="1.4"/>'
      + '<text x="' + (x + 24) + '" y="' + (PY + 64) + '" font-family="Plus Jakarta Sans" font-size="20" font-weight="700" fill="#C9A85E">' + esc(oylikMatn) + '</text>'
    );
  }

  q.push(
    '<text x="' + (W - P) + '" y="' + (PY + 36) + '" font-family="Space Grotesk" font-size="30" font-weight="700" fill="#C9A85E" text-anchor="end">vipraqamlar.uz</text>'
    + (o.telefon
      ? '<text x="' + (W - P) + '" y="' + (PY + 80) + '" font-family="Space Grotesk" font-size="27" font-weight="700" fill="#C6D4E8" text-anchor="end">' + esc(o.telefon) + '</text>'
      + '<text x="' + (W - P) + '" y="' + (PY + 110) + '" font-family="Plus Jakarta Sans" font-size="16" font-weight="600" fill="#6F82A0" text-anchor="end">Buyurtma uchun</text>'
      : '<text x="' + (W - P) + '" y="' + (PY + 76) + '" font-family="Plus Jakarta Sans" font-size="17" font-weight="600" fill="#6F82A0" text-anchor="end">Rasmiy shartnoma · Bepul yetkazib berish</text>')
  );

  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">'
    + '<defs>'
    /* V91 (mijoz so'rovi): karta foni TO'QROQ. Oltin raqam to'q fonda
       ancha yorqin ko'rinadi — shu sabab ko'k ohang pasaytirildi va
       chetlardagi qorayish (vinyet) kuchaytirildi. */
    + '<linearGradient id="asos" x1="0" y1="0" x2="0.62" y2="1"><stop offset="0" stop-color="' + F.a + '"/><stop offset="0.42" stop-color="' + F.b + '"/><stop offset="1" stop-color="' + F.c + '"/></linearGradient>'
    + '<linearGradient id="fon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#050B16"/><stop offset="1" stop-color="#020611"/></linearGradient>'
    + '<radialGradient id="oltin" cx="1.02" cy="-0.12" r="0.9"><stop offset="0" stop-color="#F6DFA4" stop-opacity="0.26"/><stop offset="0.44" stop-color="#F6DFA4" stop-opacity="0.07"/><stop offset="0.68" stop-color="#F6DFA4" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="kok" cx="-0.08" cy="1.1" r="0.9"><stop offset="0" stop-color="' + F.nur + '" stop-opacity="' + F.nurOp + '"/><stop offset="0.68" stop-color="' + F.nur + '" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="vinyet" cx="0.5" cy="0.1" r="0.95"><stop offset="0.36" stop-color="#01050D" stop-opacity="0"/><stop offset="1" stop-color="#01050D" stop-opacity="0.66"/></radialGradient>'
    + '<linearGradient id="yaltir" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.055"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
    /* GUILLOCHE — bank kartalaridagi nozik to'lqinli naqsh */
    + '<pattern id="guilloche" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">'
    + '<path d="M0 23q11.5 -16 23 0t23 0" fill="none" stroke="#F0D898" stroke-opacity="0.045" stroke-width="1.1"/>'
    + '<path d="M0 11.5q11.5 -16 23 0t23 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.035" stroke-width="1"/>'
    + '<path d="M0 34.5q11.5 -16 23 0t23 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.03" stroke-width="1"/></pattern>'
    /* OLTIN FOLGA — yuqoridan pastga: yorug' oltin -> to'yingan oltin
       -> to'q oltin. Shu uch bosqich "metall" tuyg'usini beradi. */
    + '<linearGradient id="raqamRang" x1="0" y1="0" x2="0.12" y2="1">'
    + '<stop offset="0" stop-color="#FFF8E2"/><stop offset="0.22" stop-color="#F7E3AE"/>'
    + '<stop offset="0.52" stop-color="#E7C473"/><stop offset="0.78" stop-color="#D2A747"/>'
    + '<stop offset="1" stop-color="#B98A2B"/></linearGradient>'
    /* Qirra (kontur) biroz to'qroq — harf cheti aniq ko'rinsin */
    + '<linearGradient id="raqamQirra" x1="0" y1="0" x2="0.12" y2="1">'
    + '<stop offset="0" stop-color="#F3E0AC"/><stop offset="0.5" stop-color="#D9AE4C"/>'
    + '<stop offset="1" stop-color="#A97C22"/></linearGradient>'
    + '<linearGradient id="folga" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF0CF"/><stop offset="0.4" stop-color="#EDD79A"/><stop offset="0.72" stop-color="#D5B059"/><stop offset="1" stop-color="#B8902F"/></linearGradient>'
    + '<linearGradient id="ramka" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="#F0D898" stop-opacity="0.8"/><stop offset="0.34" stop-color="#F0D898" stop-opacity="0.2"/><stop offset="0.62" stop-color="#FFFFFF" stop-opacity="0.07"/><stop offset="1" stop-color="#F0D898" stop-opacity="0.3"/></linearGradient>'
    + '<linearGradient id="chiziq" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F0D898" stop-opacity="0.55"/><stop offset="0.58" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
    /* Raqam ortidagi yumshoq markaziy nur — ko'z avvalo shu yerga
       tushadi (e'tibor raqamda bo'lsin). */
    + '<radialGradient id="markaz" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="' + F.markaz + '" stop-opacity="0.17"/><stop offset="0.55" stop-color="' + F.markaz + '" stop-opacity="0.06"/><stop offset="1" stop-color="' + F.markaz + '" stop-opacity="0"/></radialGradient>'
    + '<filter id="soyaRaqam" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="13"/></filter>'
    + '<filter id="soya" x="-15%" y="-15%" width="130%" height="140%"><feGaussianBlur stdDeviation="26"/></filter>'
    + '</defs>'
    + '<rect width="' + W + '" height="' + H + '" fill="url(#fon)"/>'
    + q.join('')
    + '</svg>';
}

function chiz(svg) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1620 },
    font: shriftSozlama()      // qarang: lib/ogShrift.js (shrift tekshiruvi + zaxira)
  });
  return r.render().asPng();
}

exports.handler = async function (event) {
  const bosh = { 'Cache-Control': 'no-store' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: bosh, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: bosh, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  /* FAQAT admin: aks holda har kim bizning uslubimizdagi rasm yasab,
     saytimiz nomidan tarqatishi mumkin bo'lardi. */
  try {
    await requireAdmin(event, { feature: 'numbers' });
  } catch (err) {
    return {
      statusCode: err.statusCode || 401, headers: bosh,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }

  let kirish;
  try { kirish = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers: bosh, body: JSON.stringify({ ok: false, error: "Noto'g'ri JSON" }) }; }

  const raqam = qirq(kirish.raqam, 24);
  if (!raqam.replace(/\D/g, '')) {
    return { statusCode: 400, headers: bosh, body: JSON.stringify({ ok: false, error: 'Raqam yozilmagan' }) };
  }

  try {
    const png = chiz(svgPost({
      raqam,
      fon: ['kok', 'yashil', 'kulrang'].includes(String(kirish.fon)) ? String(kirish.fon) : 'kok',
      toifa: qirq(kirish.toifa, 18).toUpperCase(),
      narx: Number(kirish.narx) || 0,
      eskiNarx: Number(kirish.eskiNarx) || 0,
      valyuta: qirq(kirish.valyuta, 8) || "so'm",
      oylik: Number(kirish.oylik) || 0,
      oylar: Number(kirish.oylar) || 24,
      telefon: qirq(kirish.telefon, 24)
    }));

    return {
      statusCode: 200,
      headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, bosh),
      /* `ogoh` — shriftlar bilan muammo bo'lsa, panel buni ekranda
         aytadi. Aks holda admin "bo'sh kartochka" ning sababini
         umuman bila olmasdi. */
      body: JSON.stringify(Object.assign(
        { ok: true, png: 'data:image/png;base64,' + png.toString('base64') },
        SHRIFT_SOZ ? {} : { ogoh: "Shriftlar yaroqsiz (" + SHRIFT_TASHXIS + ") \u2014 "
          + "netlify/functions/lib/ogShrift.js faylini qayta yuklang." }
      ))
    };
  } catch (err) {
    console.error('admin-post-rasm xato:', err);
    return { statusCode: 500, headers: bosh, body: JSON.stringify({ ok: false,
      error: 'Rasm chizilmadi' + (SHRIFT_SOZ ? '' : ' (shrift muammosi: ' + SHRIFT_TASHXIS + ')') }) };
  }
};
