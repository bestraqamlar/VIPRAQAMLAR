// SOTUVCHILARNI BOSHQARISH (admin tomoni).
//
// Sotuvchi o'z-o'zidan ro'yxatdan o'ta OLMAYDI — hisobni faqat admin
// yaratadi va login/parolni unga o'zi beradi. Bu ataylab: har bir
// sotuvchi tanish, kelishilgan odam bo'lishi kerak.
//
// Chaqirish: POST /.netlify/functions/admin-sellers
//   Sarlavha: Authorization: Bearer <Firebase ID token>  (admin)
//   Tana: { action: "...", ... }
//
// Amallar:
//   list          -> {sellers:[...]}
//   create        {name, username, password, phone, commissionPct}
//   update        {id, name, phone, commissionPct, blocked}
//   resetPassword {id, password}
//   remove        {id}          (raqamlari bo'lsa — rad etiladi)
//   numbers       {id}          -> o'sha sotuvchining raqamlari
//   messages      {id}          -> yozishma
//   reply         {id, text}
//   markPaid      {orderId, paid}   -> komissiya to'landi/to'lanmadi

const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');
const { hashPassword } = require('./lib/sellerAuth');

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

const H = { 'Content-Type': 'application/json' };
const ok = (o) => ({ statusCode: 200, headers: H, body: JSON.stringify(Object.assign({ ok: true }, o)) });
const bad = (m, c) => ({ statusCode: c || 400, headers: H, body: JSON.stringify({ ok: false, error: m }) });
const clean = (s, n) => String(s == null ? '' : s).trim().slice(0, n || 200);

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return bad('Faqat POST', 405);
  try { await requireAdmin(event, { feature: 'numbers' }); }
  catch (e) { return bad(String((e && e.message) || e), (e && e.statusCode) || 401); }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return bad("Noto'g'ri JSON"); }
  const action = String(body.action || '');

  try {
    if (action === 'list') {
      const q = await db.collection('sellers').orderBy('createdAtSort', 'desc').limit(500).get();
      const sellers = [];
      for (const d of q.docs) {
        const x = d.data() || {};
        const cnt = await db.collection('numbers').where('sellerId', '==', d.id).count().get().catch(() => null);
        sellers.push({
          id: d.id, name: x.name || '', username: x.username || '', phone: x.phone || '',
          commissionPct: Number(x.commissionPct) || 0, blocked: !!x.blocked,
          numbers: cnt ? cnt.data().count : 0,
          unread: Number(x.unreadForAdmin) || 0,
          lastLoginAt: x.lastLoginAt && x.lastLoginAt.toDate ? x.lastLoginAt.toDate().toISOString() : null
        });
      }
      return ok({ sellers });
    }

    if (action === 'create') {
      const name = clean(body.name, 80);
      const username = clean(body.username, 40).toLowerCase();
      const password = String(body.password || '');
      if (!name) return bad('Ismni kiriting');
      if (!/^[a-z0-9_.]{4,40}$/.test(username)) return bad('Login: 4-40 ta kichik lotin harfi, raqam, _ yoki .');
      if (password.length < 8) return bad("Parol kamida 8 ta belgi bo'lsin");
      const dup = await db.collection('sellers').where('username', '==', username).limit(1).get();
      if (!dup.empty) return bad('Bu login band');
      const pct = Math.max(0, Math.min(90, Number(body.commissionPct) || 0));
      const ref = await db.collection('sellers').add({
        name, username, phone: clean(body.phone, 30),
        passwordHash: hashPassword(password),
        commissionPct: pct, blocked: false,
        unreadForAdmin: 0, unreadForSeller: 0,
        createdAt: NOW(), createdAtSort: Date.now()
      });
      return ok({ id: ref.id });
    }

    if (action === 'update') {
      const ref = db.collection('sellers').doc(clean(body.id, 60));
      const patch = { updatedAt: NOW() };
      if (body.name != null) patch.name = clean(body.name, 80);
      if (body.phone != null) patch.phone = clean(body.phone, 30);
      if (body.commissionPct != null) patch.commissionPct = Math.max(0, Math.min(90, Number(body.commissionPct) || 0));
      if (body.blocked != null) patch.blocked = !!body.blocked;
      await ref.update(patch);
      return ok({});
    }

    if (action === 'resetPassword') {
      const password = String(body.password || '');
      if (password.length < 8) return bad("Parol kamida 8 ta belgi bo'lsin");
      await db.collection('sellers').doc(clean(body.id, 60)).update({ passwordHash: hashPassword(password), updatedAt: NOW() });
      return ok({});
    }

    if (action === 'remove') {
      const id = clean(body.id, 60);
      const cnt = await db.collection('numbers').where('sellerId', '==', id).count().get().catch(() => null);
      if (cnt && cnt.data().count > 0) return bad("Avval shu sotuvchining raqamlarini o'chiring yoki boshqasiga o'tkazing");
      await db.collection('sellers').doc(id).delete();
      return ok({});
    }

    if (action === 'numbers') {
      const q = await db.collection('numbers').where('sellerId', '==', clean(body.id, 60)).limit(2000).get();
      return ok({ numbers: q.docs.map(d => Object.assign({ id: d.id }, d.data())) });
    }

    if (action === 'messages') {
      const id = clean(body.id, 60);
      const q = await db.collection('seller_messages').where('sellerId', '==', id).orderBy('createdAtSort', 'desc').limit(100).get();
      await db.collection('sellers').doc(id).update({ unreadForAdmin: 0 }).catch(() => {});
      return ok({ rows: q.docs.map(d => { const x = d.data() || {}; return { id: d.id, from: x.from || 'seller', text: x.text || '', at: Number(x.createdAtSort) || 0 }; }).reverse() });
    }

    if (action === 'reply') {
      const id = clean(body.id, 60);
      const text = clean(body.text, 1500);
      if (!text) return bad("Xabar bo'sh");
      await db.collection('seller_messages').add({ sellerId: id, from: 'admin', text, createdAt: NOW(), createdAtSort: Date.now() });
      await db.collection('sellers').doc(id).update({ unreadForSeller: admin.firestore.FieldValue.increment(1) }).catch(() => {});
      return ok({});
    }

    if (action === 'markPaid') {
      await db.collection('orders').doc(clean(body.orderId, 60)).update({ sellerPaid: !!body.paid, sellerPaidAt: NOW() });
      return ok({});
    }

    return bad("Noma'lum amal");
  } catch (e) {
    return bad(String((e && e.message) || e), 500);
  }
};
