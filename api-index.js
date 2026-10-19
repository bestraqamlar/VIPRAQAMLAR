// SAYT KATALOGI — IXCHAM INDEKS (saytning eng tez yo'li).
//
// ILGARI QANDAY EDI: brauzer har tashrifda `numbers` to'plamini TO'LIQ
// o'qib olardi. 10 000 raqam = 3 MB trafik va 10 000 ta Firestore
// o'qishi — HAR BIR MIJOZ uchun alohida.
//
// ENDI: shu funksiya butun katalogni bitta ixcham satrga qadoqlab
// beradi va javob Netlify CDN'ida keshlanadi. Natijada:
//
//   * mijoz 3 MB emas, ~120 KB oladi (gzip bilan);
//   * Firestore'ga minglab mijoz emas, 1-2 daqiqada BIR MARTA murojaat
//     qilinadi — mijozlar soni qancha bo'lishidan qat'i nazar;
//   * hech narsa o'zgarmagan bo'lsa, baza UMUMAN qayta o'qilmaydi
//     (tayyor indeks `search_index` hujjatlarida saqlanadi).
//
// INDEKS QACHON QAYTA QURILADI (uchta belgidan biri o'zgarsa):
//   1. raqamlar soni (qo'shildi/o'chirildi),
//   2. eng oxirgi qo'shilgan raqamning vaqti,
//   3. `search_index/dirty` hujjati (narx tahrirlanganda admin panel
//      va seller-api shu hujjatni yangilaydi).
//
// 2026-10 — MILLIONLAB RAQAMGA MO'LJALLANGAN QAYTA QURILISH
//
// Muammo: 100 ta diler x 10 000 raqam = 1 000 000 raqam. Butun
// katalogni qadoqlab yuborish endi mumkin emas: ~55 MB bo'ladi,
// Netlify javobi 6 MB bilan cheklangan, telefon esa buni umuman
// ko'tarmaydi.
//
// Yechim — ikkita yo'l, bitta funksiyada:
//
//   1) KO'RISH indeksi (`?` siz chaqirilsa). Butun katalog emas,
//      eng kerakli CAP=8000 ta raqam: tanlangan, toifali, aksiyadagi,
//      bo'lib to'lashli va eng yangilari. Hajmi katalog qancha
//      o'sishidan qat'i nazar ~450 KB (gzip ~60 KB) bo'lib qoladi.
//      Javobda `total` — bazadagi HAQIQIY son, shunda sayt
//      "hammasini olmadim" deb bilib turadi.
//
//   2) QIDIRUV (`?p=__7777_`). Mijoz raqam tersa, butun bazadan
//      SERVERDA qidiriladi. Firestore'da `last1..last4` maydonlari
//      bor — oxirgi raqamlar bo'yicha tenglik so'rovi millionlab
//      hujjatdan ham bir zumda topadi. Qolgan naqsh (o'rtadagi
//      raqamlar) funksiya xotirasida filtrlanadi.
//      Qo'shimcha indeks (composite index) TALAB QILINMAYDI —
//      har safar FAQAT BITTA maydon bo'yicha so'rov yuboriladi.
//
// Chaqirish: GET /.netlify/functions/api-index
//            GET /.netlify/functions/api-index?p=__7777_&op=Ucell&limit=60
// Javob: { ok, v, ops:[...], rows:"...", count, total, builtAt }

const admin = require('firebase-admin');
const { buildIndex, TIERS } = require('./lib/numIndex');

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

// Firestore hujjati 1 MiB dan oshmasligi kerak — shu sabab indeks
// bo'laklarga bo'linadi. 700 000 belgi xavfsiz chegara.
const SHARD = 700000;

// Ko'rish indeksiga tushadigan eng ko'p raqam. Katalog 1 000 000 ga
// yetsa ham sayt shuncha oladi — qolgani QIDIRUV orqali topiladi.
const CAP = 8000;
// Indeks shu muddatdan tez-tez qayta qurilmaydi. 100 ta diler
// bir vaqtda raqam qo'shsa, imzo har soniyada o'zgaradi — himoyasiz
// qolsa har so'rovda qayta qurilib ketardi.
const MIN_REBUILD_MS = 120000;
// Bitta qidiruvda Firestore'dan olinadigan eng ko'p hujjat.
const SEARCH_CAP = 4000;

// Funksiya "issiq" turganda indeks shu yerda qoladi — bir xil imzoli
// so'rovda Firestore'ga umuman borilmaydi.
let MEM = { sig: '', body: '' };

async function signature() {
  // count() — Firestore agregat so'rovi: 1000 hujjatga 1 ta o'qish
  // sifatida hisoblanadi, ya'ni juda arzon.
  let count = 0;
  try { count = (await db.collection('numbers').count().get()).data().count; } catch (e) { count = -1; }

  // Eng oxirgi qo'shilgan raqam vaqti — IKKALA maydon bo'yicha ham
  // (admin `addedAt`, seller-api `createdAtSort` yozadi)
  let newest = 0;
  try {
    const [a, b] = await Promise.all([
      db.collection('numbers').orderBy('createdAtSort', 'desc').limit(1).get().catch(() => ({ empty: true })),
      db.collection('numbers').orderBy('addedAt', 'desc').limit(1).get().catch(() => ({ empty: true }))
    ]);
    if (!a.empty) newest = Math.max(newest, Number((a.docs[0].data() || {}).createdAtSort) || 0);
    if (!b.empty) newest = Math.max(newest, Number((b.docs[0].data() || {}).addedAt) || 0);
  } catch (e) {}

  let dirty = 0;
  try {
    const d = await db.collection('search_index').doc('dirty').get();
    if (d.exists) dirty = Number((d.data() || {}).at) || 0;
  } catch (e) {}

  return { sig: count + ':' + newest + ':' + dirty, total: count };
}

/* ======================= QIDIRUV ======================= */

/* 7 ta katakdan iborat naqsh: raqam yoki bo'sh joy.
   Masalan "__7777_" — oxirgi 7 raqamning 3..6-o'rinlari 7777. */
function naqshNorm(v) {
  const s = String(v || '').slice(0, 7);
  let out = '';
  for (let i = 0; i < 7; i++) {
    const c = s[i];
    out += (c >= '0' && c <= '9') ? c : '_';
  }
  return out;
}

/* Naqshning OXIRIDAGI uzluksiz raqamlar ketma-ketligi.
   Firestore'da `last1..last4` maydonlari shu uchun saqlanadi:
   "oxiri 7777 bilan tugaydigan" so'rovi millionlab hujjatdan ham
   bir zumda javob beradi. */
function oxirgiTutqich(p) {
  for (let k = 4; k >= 1; k--) {
    const qism = p.slice(7 - k);
    if (qism.length === k && /^[0-9]+$/.test(qism)) return { k, val: qism };
  }
  return null;
}

const mosmi = (digits, p) => {
  if (digits.length !== 7) return false;
  for (let i = 0; i < 7; i++) if (p[i] !== '_' && p[i] !== digits[i]) return false;
  return true;
};

let QMEM = new Map();   // issiq funksiyada qidiruv natijalari keshi

async function qidir(qs) {
  const p = naqshNorm(qs.p);
  const op = String(qs.op || '').slice(0, 20);
  const minP = Number(qs.min) || 0;
  const maxP = Number(qs.max) || 0;
  const ins = String(qs.ins || '') === '1';
  const limit = Math.min(200, Math.max(10, Number(qs.limit) || 60));

  const kalit = [p, op, minP, maxP, ins, limit].join('|');
  const keshda = QMEM.get(kalit);
  if (keshda && Date.now() - keshda.at < 60000) return keshda.javob;

  const tutqich = oxirgiTutqich(p);
  let docs = [];
  let toliq = true;

  if (tutqich) {
    // Eng kuchli tutqich: oxirgi k ta raqam bo'yicha TENGLIK so'rovi
    const snap = await db.collection('numbers')
      .where('last' + tutqich.k, '==', tutqich.val)
      .limit(SEARCH_CAP).get();
    docs = snap.docs.map(d => ({ id: d.id, data: d.data() || {} }));
    toliq = snap.docs.length < SEARCH_CAP;
  } else {
    /* XAVFSIZLIK: naqshda oxirgi raqamlar yo'q (masalan "7______").
       ILGARI bu yo'l `yigib(CAP)` ni chaqirardi — bitta so'rov
       uchun ~14 700 Firestore o'qishi. Naqshni o'zgartirib turgan
       bot CDN keshini ham chetlab o'tib, hisobni ko'tarib
       yuborishi mumkin edi. ENDI: allaqachon QURILGAN saqlangan
       indeksdan o'qiymiz — jami 1-2 o'qish, qancha so'rov
       kelishidan qat'i nazar. Natija to'liq emas (`toliq:false`),
       sayt buni bilib turadi va foydalanuvchini aniqroq
       (oxirgi raqamlarni kiriting) terishga undaydi. */
    docs = await storedDocs();
    toliq = false;
  }

  const chiq = [];
  for (const d of docs) {
    const x = d.data;
    if (x.hidden) continue;
    const digits = String(x.number || '').replace(/\D/g, '').slice(-7);
    if (!mosmi(digits, p)) continue;
    if (op && x.operator !== op) continue;
    const narx = Number(x.price) || 0;
    if (minP && narx < minP) continue;
    if (maxP && narx > maxP) continue;
    if (ins && !x.installment) continue;
    chiq.push(d);
  }

  // Band bo'lmaganlar oldinda, so'ng arzonidan qimmatiga
  chiq.sort((a, b) => {
    const ar = a.data.reserved ? 1 : 0, br = b.data.reserved ? 1 : 0;
    if (ar !== br) return ar - br;
    return (Number(a.data.price) || 0) - (Number(b.data.price) || 0);
  });

  const kesilgan = chiq.slice(0, limit);
  const idx = buildIndex(kesilgan);
  const javob = JSON.stringify({
    ok: true, v: 1, ops: idx.ops, rows: idx.rows,
    count: idx.count, topildi: chiq.length,
    toliq: toliq                         // false bo'lsa: natija kesilgan bo'lishi mumkin
  });
  QMEM.set(kalit, { at: Date.now(), javob });
  if (QMEM.size > 300) QMEM = new Map();
  return javob;
}

/* Saqlangan indeksni (search_index/meta + s0..sN) o'qib, qidiruv
   filtri tushunadigan hujjat ko'rinishiga qaytaradi. Faqat filtrga
   kerak bo'lgan maydonlar ochiladi. Issiq funksiyada 2 daqiqa
   keshlanadi — shunda ketma-ket qidiruvlar bazaga tegmaydi. */
let SMEM = { at: 0, docs: null };

async function storedDocs() {
  if (SMEM.docs && Date.now() - SMEM.at < MIN_REBUILD_MS) return SMEM.docs;
  let metaSnap;
  try { metaSnap = await db.collection('search_index').doc('meta').get(); } catch (e) { return []; }
  const meta = metaSnap && metaSnap.exists ? (metaSnap.data() || {}) : {};
  let rows = null;
  try { rows = await readStored(meta); } catch (e) { rows = null; }
  if (rows == null) return SMEM.docs || [];

  let ops = [];
  try { ops = JSON.parse(meta.head || '{}').ops || []; } catch (e) { ops = []; }

  const out = [];
  for (const satr of rows.split('\n')) {
    if (!satr) continue;
    const f = satr.split('|');
    const flags = Number(f[5]) || 0;
    const extra = {};
    for (const kv of String(f[7] || '').split(',')) {
      if (!kv) continue;
      const i = kv.indexOf('=');
      if (i > 0) extra[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
    }
    out.push({
      id: f[0],
      data: {
        number: f[1] || '',
        operator: ops[Number(f[2]) || 0] || '',
        price: Number(f[3]) || 0,
        oldPrice: Number(f[4]) || 0,
        reserved: !!(flags & 1),
        installment: !!(flags & 2),
        featured: !!(flags & 4),
        dailyDeal: !!(flags & 8),
        tier: TIERS[Number(f[6]) || 0] || '',
        currency: extra.c || '',
        monthly6: Number(extra.m6) || 0,
        monthly12: Number(extra.m12) || 0,
        monthly24: Number(extra.m24) || 0,
        dealMonthly6: Number(extra.d6) || 0,
        dealMonthly12: Number(extra.d12) || 0,
        dealMonthly24: Number(extra.d24) || 0,
        operatorPrice: Number(extra.op) || 0,
        note: extra.nt || ''
      }
    });
  }
  SMEM = { at: Date.now(), docs: out };
  return out;
}

async function readStored(meta) {
  const n = Number(meta.shards) || 0;
  if (!n) return null;
  const refs = [];
  for (let i = 0; i < n; i++) refs.push(db.collection('search_index').doc('s' + i));
  const snaps = await db.getAll(...refs);
  let out = '';
  for (const s of snaps) {
    if (!s.exists) return null;
    out += (s.data() || {}).data || '';
  }
  return out;
}

/* Ko'rish indeksiga tushadigan raqamlarni yig'ish.
   MUHIM: `collection('numbers').get()` — ya'ni HAMMASINI o'qish —
   endi ishlatilmaydi. Uning o'rniga bir nechta KICHIK so'rov
   parallel yuboriladi va natijalar birlashtiriladi. Har bir so'rov
   faqat BITTA maydon bo'yicha — qo'shimcha indeks kerak emas. */
async function yigib(cap) {
  const bosh = { docs: [] };
  const C = () => db.collection('numbers');
  /* DIQQAT: admin panel raqamga `addedAt` yozadi, seller-api esa
     `createdAtSort`. Firestore'da `orderBy(maydon)` o'sha maydoni
     YO'Q hujjatlarni butunlay tashlab ketadi — shu sabab IKKALASI
     bo'yicha ham so'raymiz, ustiga tartibsiz zaxira so'rov qo'shamiz.
     Shunda qaysi yo'l bilan qo'shilganidan qat'i nazar hech bir
     raqam indeksdan tushib qolmaydi. */
  const [tanlangan, toifali, aksiya, bolib, yangi1, yangi2, zaxira] = await Promise.all([
    C().where('featured', '==', true).limit(2000).get().catch(() => bosh),
    C().where('tier', 'in', ['premium', 'gold', 'vip']).limit(2000).get().catch(() => bosh),
    C().where('onSale', '==', true).limit(1200).get().catch(() => bosh),
    C().where('installment', '==', true).limit(2500).get().catch(() => bosh),
    C().orderBy('createdAtSort', 'desc').limit(cap).get().catch(() => bosh),
    C().orderBy('addedAt', 'desc').limit(cap).get().catch(() => bosh),
    C().limit(cap).get().catch(() => bosh)
  ]);

  const seen = new Map();
  const qoy = (snap) => {
    for (const d of (snap.docs || [])) {
      if (seen.size >= cap) return;
      if (seen.has(d.id)) continue;
      const x = d.data() || {};
      if (x.hidden) continue;
      seen.set(d.id, x);
    }
  };
  // Tartib muhim: eng qimmatli raqamlar indeksga ALBATTA tushsin
  qoy(tanlangan); qoy(toifali); qoy(aksiya); qoy(bolib);
  qoy(yangi1); qoy(yangi2); qoy(zaxira);
  return Array.from(seen, ([id, data]) => ({ id, data }));
}

async function rebuild(sig) {
  const docs = await yigib(CAP);
  const idx = buildIndex(docs);

  const payload = JSON.stringify({ ops: idx.ops, count: idx.count });
  const parts = [];
  for (let i = 0; i < idx.rows.length; i += SHARD) parts.push(idx.rows.slice(i, i + SHARD));
  if (!parts.length) parts.push('');

  const batch = db.batch();
  parts.forEach((p, i) => batch.set(db.collection('search_index').doc('s' + i), { data: p }));
  batch.set(db.collection('search_index').doc('meta'), {
    sig, shards: parts.length, head: payload, builtAt: Date.now(), count: idx.count
  });
  // Eski, endi keraksiz bo'laklarni tozalash (raqamlar kamayib ketgan bo'lsa)
  for (let i = parts.length; i < parts.length + 5; i++) {
    batch.delete(db.collection('search_index').doc('s' + i));
  }
  await batch.commit();

  return { head: payload, rows: idx.rows, count: idx.count, builtAt: Date.now() };
}

exports.handler = async function (event) {
  const qs = (event && event.queryStringParameters) || {};

  // --- QIDIRUV shoxi ---
  if (qs.p) {
    try {
      const body = await qidir(qs);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300',
          'Access-Control-Allow-Origin': '*'
        },
        body
      };
    } catch (e) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
        body: JSON.stringify({ ok: false, error: String((e && e.message) || e) })
      };
    }
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    // CDN 60 soniya keshlaydi; undan keyin ham ESKI nusxa darhol
    // beriladi va yangisi FONDA olinadi — mijoz hech qachon kutmaydi.
    'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const { sig, total } = await signature();
    if (MEM.sig === sig && MEM.body) {
      return { statusCode: 200, headers: Object.assign({ 'X-Index': 'mem' }, headers), body: MEM.body };
    }

    const metaSnap = await db.collection('search_index').doc('meta').get();
    const meta = metaSnap.exists ? (metaSnap.data() || {}) : {};

    let head, rows, count, builtAt, src;
    // Imzo o'zgargan bo'lsa ham, oxirgi qurilishdan MIN_REBUILD_MS
    // o'tmagan bo'lsa — saqlangan indeks beriladi. 100 ta diler bir
    // vaqtda raqam qo'shsa ham baza har so'rovda qayta o'qilmaydi.
    const yaqinda = meta.builtAt && (Date.now() - Number(meta.builtAt) < MIN_REBUILD_MS);
    if (meta.sig === sig || yaqinda) {
      const stored = await readStored(meta);
      if (stored != null) {
        const h = JSON.parse(meta.head || '{}');
        head = meta.head; rows = stored; count = h.count || 0; builtAt = meta.builtAt || 0; src = 'store';
      }
    }
    if (rows == null) {
      const r = await rebuild(sig);
      head = r.head; rows = r.rows; count = r.count; builtAt = r.builtAt; src = 'build';
    }

    const h = JSON.parse(head || '{}');
    // `total` — bazadagi haqiqiy son. `count` dan katta bo'lsa, sayt
    // katalogni to'liq olmaganini biladi va qidiruvni SERVERGA yuboradi.
    const body = JSON.stringify({ ok: true, v: 1, ops: h.ops || [], rows, count, total, builtAt });
    MEM = { sig, body };
    return { statusCode: 200, headers: Object.assign({ 'X-Index': src }, headers), body };
  } catch (e) {
    // Xato bo'lsa sayt eski yo'l bilan (to'g'ridan-to'g'ri Firestore'dan)
    // ishlashda davom etadi — shu sabab bu yerda yiqilish xavfsiz.
    return {
      statusCode: 500,
      headers: Object.assign({}, headers, { 'Cache-Control': 'no-store' }),
      body: JSON.stringify({ ok: false, error: String((e && e.message) || e) })
    };
  }
};
