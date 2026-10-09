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
// Chaqirish: GET /.netlify/functions/api-index
// Javob: { ok, v, ops:[...], rows:"...", count, builtAt }

const admin = require('firebase-admin');
const { buildIndex } = require('./lib/numIndex');

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

// Funksiya "issiq" turganda indeks shu yerda qoladi — bir xil imzoli
// so'rovda Firestore'ga umuman borilmaydi.
let MEM = { sig: '', body: '' };

async function signature() {
  // count() — Firestore agregat so'rovi: 1000 hujjatga 1 ta o'qish
  // sifatida hisoblanadi, ya'ni juda arzon.
  let count = 0;
  try { count = (await db.collection('numbers').count().get()).data().count; } catch (e) { count = -1; }

  let newest = 0;
  try {
    const q = await db.collection('numbers').orderBy('createdAtSort', 'desc').limit(1).get();
    if (!q.empty) newest = Number((q.docs[0].data() || {}).createdAtSort) || 0;
  } catch (e) {}

  let dirty = 0;
  try {
    const d = await db.collection('search_index').doc('dirty').get();
    if (d.exists) dirty = Number((d.data() || {}).at) || 0;
  } catch (e) {}

  return count + ':' + newest + ':' + dirty;
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

async function rebuild(sig) {
  const snap = await db.collection('numbers').get();
  const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
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

exports.handler = async function () {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    // CDN 60 soniya keshlaydi; undan keyin ham ESKI nusxa darhol
    // beriladi va yangisi FONDA olinadi — mijoz hech qachon kutmaydi.
    'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const sig = await signature();
    if (MEM.sig === sig && MEM.body) {
      return { statusCode: 200, headers: Object.assign({ 'X-Index': 'mem' }, headers), body: MEM.body };
    }

    const metaSnap = await db.collection('search_index').doc('meta').get();
    const meta = metaSnap.exists ? (metaSnap.data() || {}) : {};

    let head, rows, count, builtAt, src;
    if (meta.sig === sig) {
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
    const body = JSON.stringify({ ok: true, v: 1, ops: h.ops || [], rows, count, builtAt });
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
