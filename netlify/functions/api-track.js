// ICHKI ANALITIKA — "qaysi raqamga ko'p qiziqishyapti" va "qaysi qidiruv
// natija bermayapti" degan ikki savolga javob beradi.
//
// NEGA ALOHIDA FUNKSIYA: hisoblagichlarni to'g'ridan-to'g'ri brauzerdan
// Firestore'ga yozib bo'lmaydi — unda har kim istalgan raqamning sonini
// shishirib yuborishi mumkin edi. Shu sabab yozuv faqat shu yerdan,
// server tomonidan amalga oshiriladi.
//
// Chaqirish: POST /.netlify/functions/api-track
// Tana (JSON): { "events": [ {t:'view', id:'abc'}, {t:'click', id:'abc'},
//                             {t:'miss', q:'7777'}, {t:'order', id:'abc'} ] }
//
// Brauzer bularni YIG'IB, 30 soniyada bir marta (yoki sahifa yopilganda)
// bitta so'rovda yuboradi — shu sabab funksiya chaqiriqlari kam bo'ladi.
//
// Ma'lumot qayerda saqlanadi:
//   stats_numbers/{raqamId}  -> { views, clicks, orders, number, updatedAt }
//   stats_searches/{kalit}   -> { q, count, lastAt }     (natijasiz qidiruvlar)
//   stats_daily/{YYYY-MM-DD} -> { views, clicks, orders, misses }
//
// HECH QANDAY SHAXSIY MA'LUMOT yozilmaydi: IP ham, qurilma ham, ism ham yo'q.

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
const INC = (n) => admin.firestore.FieldValue.increment(n);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Bir so'rovda ko'pi bilan shuncha hodisa qabul qilinadi (suiiste'molga qarshi)
const MAX_EVENTS = 60;

// Firestore hujjat nomida "/" va bo'sh satr bo'lmasligi kerak
const safeKey = (s) => String(s || '').replace(/[^0-9a-zA-Z_-]/g, '').slice(0, 40);

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: '{"ok":false}' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: CORS, body: '{"ok":false}' }; }

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (!events.length) return { statusCode: 200, headers: CORS, body: '{"ok":true,"saved":0}' };

  // Avval xotirada yig'amiz — bitta raqam uchun 10 ta hodisa kelsa ham
  // Firestore'ga BITTA yozuv ketadi.
  const nums = {};       // id -> {views, clicks, orders, number}
  const misses = {};     // kalit -> {q, count}
  const day = { views: 0, clicks: 0, orders: 0, misses: 0 };

  for (const e of events) {
    const t = e && e.t;
    if (t === 'view' || t === 'click' || t === 'order') {
      const id = safeKey(e.id);
      if (!id) continue;
      const n = nums[id] || (nums[id] = { views: 0, clicks: 0, orders: 0, number: '' });
      if (typeof e.n === 'string' && e.n.length <= 20) n.number = e.n;
      n[t + 's'] += 1;
      day[t + 's'] += 1;
    } else if (t === 'miss') {
      const q = String(e.q || '').replace(/[^0-9*]/g, '').slice(0, 12);
      if (q.length < 2) continue;
      const k = 'q' + q.replace(/\*/g, 'x');
      const m = misses[k] || (misses[k] = { q, count: 0 });
      m.count += 1;
      day.misses += 1;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  let writes = 0;

  for (const id of Object.keys(nums)) {
    const n = nums[id];
    const patch = { updatedAt: now };
    if (n.views)  patch.views  = INC(n.views);
    if (n.clicks) patch.clicks = INC(n.clicks);
    if (n.orders) patch.orders = INC(n.orders);
    if (n.number) patch.number = n.number;
    batch.set(db.collection('stats_numbers').doc(id), patch, { merge: true });
    writes++;
  }
  for (const k of Object.keys(misses)) {
    const m = misses[k];
    batch.set(db.collection('stats_searches').doc(k), { q: m.q, count: INC(m.count), lastAt: now }, { merge: true });
    writes++;
  }
  if (day.views || day.clicks || day.orders || day.misses) {
    const patch = { date: today, updatedAt: now };
    for (const k of ['views', 'clicks', 'orders', 'misses']) if (day[k]) patch[k] = INC(day[k]);
    batch.set(db.collection('stats_daily').doc(today), patch, { merge: true });
    writes++;
  }

  // 500 — Firestore'ning bitta batch'dagi amal chegarasi; yuqoridagi
  // MAX_EVENTS bilan bunga hech qachon yetib bormaymiz, lekin baribir
  // tekshirib qo'yamiz.
  if (writes > 450) return { statusCode: 200, headers: CORS, body: '{"ok":true,"saved":0}' };

  try { await batch.commit(); } catch (e) {
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: false, error: String(e && e.message || e) }) };
  }
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, saved: writes }) };
};
