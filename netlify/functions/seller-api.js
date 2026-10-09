// SOTUVCHILAR (dilerlar) PANELI — barcha amallar shu bitta funksiyada.
//
// MAQSAD: boshqa raqam sotuvchilar o'z raqamlarini bizning saytga
// qo'ysin, biz komissiya olaylik. Baza bir necha barobar tez o'sadi.
//
// KIRISH: login + parol (hisobni ADMIN yaratadi — o'z-o'zidan ro'yxatdan
// o'tish YO'Q, bu ataylab: har bir sotuvchi tanish bo'lishi kerak).
//
// QOIDA (mijoz tanlovi): sotuvchi narxni O'ZI ERKIN belgilaydi va raqam
// DARHOL saytga chiqadi — tasdiq kutmaydi. Nazorat keyin: admin
// istalgan raqamni yashirishi/o'chirishi yoki sotuvchini bloklashi
// mumkin.
//
// Chaqirish: POST /.netlify/functions/seller-api
//   Sarlavha: Authorization: Bearer <seans tokeni>   (login'dan tashqari)
//   Tana: { "action": "...", ... }
//
// Amallar:
//   login        {username, password}      -> {token, seller}
//   me           -                         -> {seller, stats}
//   myNumbers    -                         -> {numbers:[...]}
//   addNumber    {number, operator, price, installment, note}
//   updateNumber {id, price, installment, note}
//   removeNumber {id}
//   earnings     -                         -> {rows, total, paid, unpaid}
//   messages     -                         -> {rows}
//   sendMessage  {text}
//
// XAVFSIZLIK: sotuvchi FAQAT o'zining (sellerId == uning id'si)
// raqamlariga teginadi — har bir amalda tekshiriladi.

const admin = require('firebase-admin');
const { verifyPassword, makeToken, requireSeller } = require('./lib/sellerAuth');

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
const NOW = () => admin.firestore.FieldValue.serverTimestamp();

const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const ok = (o) => ({ statusCode: 200, headers: H, body: JSON.stringify(Object.assign({ ok: true }, o)) });
const bad = (msg, code) => ({ statusCode: code || 400, headers: H, body: JSON.stringify({ ok: false, error: msg }) });

// +998901234567 ko'rinishiga keltiradi
function normNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9) return '+998' + d;
  if (d.length === 12 && d.startsWith('998')) return '+' + d;
  return null;
}
const money = (v) => { const n = Math.round(Number(v) || 0); return (n > 0 && n < 100000000000) ? n : 0; };
const clean = (s, max) => String(s == null ? '' : s).trim().slice(0, max || 200);

const OPERATORS = ['Beeline', 'Ucell', 'Humans', 'Uzmobile', 'UMS', 'Mobiuz', 'Perfectum'];

// Bitta sotuvchi ko'pi bilan shuncha raqam qo'sha oladi (suiiste'molga qarshi)
const MAX_NUMBERS = 2000;

/* ---------- Kirish ---------- */
async function doLogin(body) {
  const username = clean(body.username, 40).toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) return bad('Login va parolni kiriting');

  const q = await db.collection('sellers').where('username', '==', username).limit(1).get();
  // Noto'g'ri login va noto'g'ri parol uchun BIR XIL xabar — kimning
  // hisobi borligini tashqaridan bilib bo'lmasin.
  if (q.empty) return bad("Login yoki parol noto'g'ri", 401);
  const doc = q.docs[0];
  const s = Object.assign({ id: doc.id }, doc.data());
  if (!verifyPassword(password, s.passwordHash)) {
    await doc.ref.update({ failedAt: NOW(), failedCount: admin.firestore.FieldValue.increment(1) }).catch(() => {});
    return bad("Login yoki parol noto'g'ri", 401);
  }
  if (s.blocked) return bad("Hisobingiz vaqtincha to’xtatilgan. Admin bilan bog’laning.", 403);

  await doc.ref.update({ lastLoginAt: NOW(), failedCount: 0 }).catch(() => {});
  return ok({
    token: makeToken(s),
    seller: { id: s.id, name: s.name || '', username: s.username, commissionPct: Number(s.commissionPct) || 0 }
  });
}

/* ---------- Sotuvchining raqamlari ---------- */
async function myNumbers(s) {
  const q = await db.collection('numbers').where('sellerId', '==', s.id).limit(MAX_NUMBERS).get();
  const rows = q.docs.map(d => {
    const x = d.data() || {};
    return {
      id: d.id, number: x.number || '', operator: x.operator || '',
      price: Number(x.price) || 0, installment: !!x.installment,
      reserved: !!x.reserved, hidden: !!x.hidden,
      note: x.sellerNote || '',
      holat: x.sold ? 'Sotildi' : (x.reserved ? 'Band' : (x.hidden ? 'Yashirilgan' : 'Sotuvda'))
    };
  });
  // Statistika (stats_numbers) — o'z raqami necha marta ochilgani
  const ids = rows.map(r => r.id).slice(0, 150);
  const stats = {};
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    try {
      const sn = await db.collection('stats_numbers')
        .where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
      sn.forEach(d => { const x = d.data() || {}; stats[d.id] = { views: Number(x.views) || 0, orders: Number(x.orders) || 0 }; });
    } catch (e) { break; }
  }
  rows.forEach(r => { const st = stats[r.id] || {}; r.views = st.views || 0; r.orders = st.orders || 0; });
  rows.sort((a, b) => (b.views || 0) - (a.views || 0));
  return ok({ numbers: rows });
}

async function addNumber(s, body) {
  const number = normNumber(body.number);
  if (!number) return bad("Raqam noto'g'ri. Masalan: 901234567");
  const operator = clean(body.operator, 30);
  if (OPERATORS.indexOf(operator) === -1) return bad('Operatorni tanlang');
  const price = money(body.price);
  if (!price) return bad('Narxni kiriting');

  const dup = await db.collection('numbers').where('number', '==', number).limit(1).get();
  if (!dup.empty) return bad('Bu raqam bazada allaqachon bor');

  const cnt = await db.collection('numbers').where('sellerId', '==', s.id).count().get().catch(() => null);
  if (cnt && cnt.data().count >= MAX_NUMBERS) return bad('Raqamlar soni chegarasiga yetdingiz');

  const ref = await db.collection('numbers').add({
    number, operator, price,
    installment: !!body.installment,
    reserved: false, featured: false, hidden: false,
    tier: '',                                   // toifasiz — rang qo'shilmaydi
    sellerId: s.id,
    sellerName: s.name || s.username,
    sellerCommissionPct: Number(s.commissionPct) || 0,   // qo'shilgan paytdagi foiz "muzlatiladi"
    sellerNote: clean(body.note, 300),
    createdAt: NOW(),
    createdAtSort: Date.now()
  });
  return ok({ id: ref.id });
}

async function mineOrFail(s, id) {
  const ref = db.collection('numbers').doc(String(id || ''));
  const snap = await ref.get();
  if (!snap.exists) { const e = new Error('Raqam topilmadi'); e.statusCode = 404; throw e; }
  const x = snap.data() || {};
  if (x.sellerId !== s.id) { const e = new Error('Bu raqam sizniki emas'); e.statusCode = 403; throw e; }
  return { ref, data: x };
}

async function updateNumber(s, body) {
  const { ref, data } = await mineOrFail(s, body.id);
  if (data.reserved || data.sold) return bad("Band yoki sotilgan raqamni o'zgartirib bo'lmaydi");
  const patch = { updatedAt: NOW() };
  if (body.price != null) { const p = money(body.price); if (!p) return bad("Narx noto'g'ri"); patch.price = p; }
  if (body.installment != null) patch.installment = !!body.installment;
  if (body.note != null) patch.sellerNote = clean(body.note, 300);
  await ref.update(patch);
  return ok({});
}

async function removeNumber(s, body) {
  const { ref, data } = await mineOrFail(s, body.id);
  if (data.reserved || data.sold) return bad("Band yoki sotilgan raqamni o'chirib bo'lmaydi");
  await ref.delete();
  return ok({});
}

/* ---------- Daromad ----------
   Buyurtma "Yakunlandi" bo'lgan raqamlar bo'yicha komissiya hisoblanadi.
   Foiz raqam qo'shilgan paytdagi foiz (sellerCommissionPct) — keyin
   o'zgartirilsa, eski kelishuvlar buzilmaydi. */
async function earnings(s) {
  const nums = await db.collection('numbers').where('sellerId', '==', s.id).limit(MAX_NUMBERS).get();
  const byId = {};
  nums.forEach(d => { byId[d.id] = d.data() || {}; });
  const ids = Object.keys(byId);
  if (!ids.length) return ok({ rows: [], total: 0, paid: 0, unpaid: 0 });

  const rows = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const q = await db.collection('orders')
      .where('numberId', 'in', chunk)
      .where('status', '==', 'Yakunlandi')
      .limit(500).get().catch(() => null);
    if (!q) continue;
    q.forEach(d => {
      const o = d.data() || {};
      const n = byId[o.numberId] || {};
      const pct = Number(n.sellerCommissionPct) || 0;
      const price = Number(o.price) || Number(n.price) || 0;
      rows.push({
        orderId: d.id,
        number: o.number || n.number || '',
        price,
        pct,
        commission: Math.round(price * pct / 100),
        paid: !!o.sellerPaid,
        date: o.createdAt && o.createdAt.toDate ? o.createdAt.toDate().toISOString().slice(0, 10) : ''
      });
    });
  }
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const total = rows.reduce((a, r) => a + r.commission, 0);
  const paid = rows.filter(r => r.paid).reduce((a, r) => a + r.commission, 0);
  return ok({ rows, total, paid, unpaid: total - paid });
}

/* ---------- Admin bilan yozishma ---------- */
async function messages(s) {
  const q = await db.collection('seller_messages')
    .where('sellerId', '==', s.id).orderBy('createdAtSort', 'desc').limit(100).get();
  const rows = q.docs.map(d => {
    const x = d.data() || {};
    return { id: d.id, from: x.from || 'seller', text: x.text || '', at: Number(x.createdAtSort) || 0 };
  }).reverse();
  await db.collection('sellers').doc(s.id).update({ unreadForSeller: 0 }).catch(() => {});
  return ok({ rows });
}

async function sendMessage(s, body) {
  const text = clean(body.text, 1500);
  if (!text) return bad('Xabar bo’sh');
  await db.collection('seller_messages').add({
    sellerId: s.id, sellerName: s.name || s.username,
    from: 'seller', text, createdAt: NOW(), createdAtSort: Date.now()
  });
  await db.collection('sellers').doc(s.id).update({
    unreadForAdmin: admin.firestore.FieldValue.increment(1),
    lastMessageAt: NOW()
  }).catch(() => {});
  return ok({});
}

/* ---------- Kirish nuqtasi ---------- */
exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return bad('Faqat POST', 405);
  if (!process.env.SELLER_SECRET) return bad('Tizim hali sozlanmagan (SELLER_SECRET)', 503);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return bad("Noto'g'ri JSON"); }
  const action = String(body.action || '');

  try {
    if (action === 'login') return await doLogin(body);

    const s = await requireSeller(event, db);
    switch (action) {
      case 'me':           return ok({ seller: { id: s.id, name: s.name || '', username: s.username, commissionPct: Number(s.commissionPct) || 0, unread: Number(s.unreadForSeller) || 0 } });
      case 'myNumbers':    return await myNumbers(s);
      case 'addNumber':    return await addNumber(s, body);
      case 'updateNumber': return await updateNumber(s, body);
      case 'removeNumber': return await removeNumber(s, body);
      case 'earnings':     return await earnings(s);
      case 'messages':     return await messages(s);
      case 'sendMessage':  return await sendMessage(s, body);
      default:             return bad("Noma'lum amal");
    }
  } catch (e) {
    return bad(String((e && e.message) || e), (e && e.statusCode) || 500);
  }
};
