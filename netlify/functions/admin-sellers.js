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
//
// TARIFLAR (Pro / Max — dilerdan keladigan asosiy daromad):
//   tariflar      -> {plans, sorovlar}      (narx/muddat/toifa/limit)
//   tariflarSaqla {plans:[...]}             -> narx va shartlarni o'zgartirish
//   tarifTasdiq   {id}                      -> to'lov so'rovini tasdiqlash (tarif yoqiladi)
//   tarifRad      {id, izoh}                -> so'rovni rad etish
//   tarifQoy      {sellerId, planId, days}  -> qo'lda yoqish/uzaytirish
//   tarifOchir    {sellerId}                -> tarifni darhol to'xtatish

const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');
const { hashPassword } = require('./lib/sellerAuth');
const TARIF = require('./lib/tariflar');

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
        // Ajratilgan (toifali) raqamlar soni — `promoSeller` faqat
        // ularda bo'ladi, shu sabab so'rov juda arzon.
        const promo = await db.collection('numbers').where('promoSeller', '==', d.id).count().get().catch(() => null);
        sellers.push({
          plan: x.plan || '',
          planUntil: Number(x.planUntil) || 0,
          planKun: TARIF.qolganKun(x),
          promo: promo ? Number(promo.data().count) || 0 : 0,
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
      // Tartiblash xotirada — Firestore'da qo'shimcha indeks talab
      // qilinmasligi uchun (izoh: seller-api.js, messages()).
      const q = await db.collection('seller_messages').where('sellerId', '==', id).limit(400).get();
      await db.collection('sellers').doc(id).update({ unreadForAdmin: 0 }).catch(() => {});
      return ok({ rows: q.docs.map(d => { const x = d.data() || {}; return { id: d.id, from: x.from || 'seller', text: x.text || '', at: Number(x.createdAtSort) || 0 }; }).sort((a, b) => a.at - b.at).slice(-100) });
    }

    if (action === 'reply') {
      const id = clean(body.id, 60);
      const text = clean(body.text, 1500);
      if (!text) return bad("Xabar bo'sh");
      await db.collection('seller_messages').add({ sellerId: id, from: 'admin', text, createdAt: NOW(), createdAtSort: Date.now() });
      await db.collection('sellers').doc(id).update({ unreadForSeller: admin.firestore.FieldValue.increment(1) }).catch(() => {});
      return ok({});
    }


    /* ================= TARIFLAR =================
       Narx, muddat, qaysi toifalarni ochishi va nechta raqamga
       yetishi — hammasi shu yerda, Firestore'dagi bitta hujjatda
       (`sys_config/tariflar`). Kodga tegmasdan yangi tarif
       qo'shish ham mumkin. */

    if (action === 'tariflar') {
      const plans = await TARIF.tariflarniOl(db);
      // To'lov so'rovlari (eng yangisi birinchi). Tartiblash
      // xotirada — Firestore'da qo'shimcha indeks talab qilinmasin.
      const q = await db.collection('seller_plan_requests').limit(300).get().catch(() => null);
      const sorovlar = q ? q.docs.map(d => Object.assign({ id: d.id }, d.data() || {}))
        .map(r => ({
          id: r.id, sellerId: r.sellerId || '', sellerName: r.sellerName || '',
          planId: r.planId || '', planName: r.planName || '',
          price: Number(r.price) || 0, days: Number(r.days) || 0,
          usul: r.usul || 'qolda', status: r.status || 'kutilmoqda',
          at: Number(r.createdAtSort) || 0
        })).sort((a, b) => b.at - a.at).slice(0, 100) : [];
      return ok({ plans, sorovlar, toifalar: TARIF.TOIFALAR });
    }

    if (action === 'tariflarSaqla') {
      const r = await TARIF.tariflarniSaqla(db, body.plans, 'admin');
      if (r.xato) return bad(r.xato);
      return ok({ plans: r.plans });
    }

    /* Tarifni dilerga yoqish. Muddat MAVJUD muddatning ustiga
       qo'shiladi (hali tugamagan bo'lsa) — diler oldinroq to'lasa
       kunlari yo'qolmaydi. */
    async function tarifYoq(sellerId, planId, days, manba) {
      const plans = await TARIF.tariflarniOl(db);
      const p = plans.find(x => x.id === planId);
      if (!p) return { xato: 'Tarif topilmadi: ' + planId };
      const ref = db.collection('sellers').doc(sellerId);
      const snap = await ref.get();
      if (!snap.exists) return { xato: 'Sotuvchi topilmadi' };
      const eski = snap.data() || {};
      const kun = Number(days) || p.days;
      const boshlanish = (Number(eski.planUntil) || 0) > Date.now() && eski.plan === p.id
        ? Number(eski.planUntil) : Date.now();
      const until = boshlanish + kun * 86400000;
      await ref.update({
        plan: p.id, planUntil: until, planWarnedAt: 0,
        planStartedAt: Date.now(), planSource: manba || 'admin'
      });
      await db.collection('seller_messages').add({
        sellerId, from: 'admin',
        text: p.name + ' tarifi yoqildi. Muddati: ' + new Date(until).toLocaleDateString('ru-RU') +
          '. Endi ' + p.quota + ' raqamga toifa qo\u2018yishingiz mumkin.',
        createdAt: NOW(), createdAtSort: Date.now()
      }).catch(() => {});
      await ref.update({ unreadForSeller: admin.firestore.FieldValue.increment(1) }).catch(() => {});
      return { plan: p, until };
    }

    if (action === 'tarifTasdiq') {
      const id = clean(body.id, 60);
      const ref = db.collection('seller_plan_requests').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return bad("So'rov topilmadi");
      const r = snap.data() || {};
      if (r.status !== 'kutilmoqda') return bad("Bu so'rov allaqachon ko'rib chiqilgan");
      const y = await tarifYoq(r.sellerId, r.planId, r.days, 'qolda');
      if (y.xato) return bad(y.xato);
      await ref.update({ status: 'tasdiqlandi', closedAt: Date.now() });
      return ok({ until: y.until });
    }

    if (action === 'tarifRad') {
      const id = clean(body.id, 60);
      const izoh = clean(body.izoh, 300);
      const ref = db.collection('seller_plan_requests').doc(id);
      const snap = await ref.get();
      if (!snap.exists) return bad("So'rov topilmadi");
      const r = snap.data() || {};
      await ref.update({ status: 'rad', izoh, closedAt: Date.now() });
      if (r.sellerId) {
        await db.collection('seller_messages').add({
          sellerId: r.sellerId, from: 'admin',
          text: "Tarif so'rovi rad etildi" + (izoh ? ': ' + izoh : '.'),
          createdAt: NOW(), createdAtSort: Date.now()
        }).catch(() => {});
      }
      return ok({});
    }

    if (action === 'tarifQoy') {
      const y = await tarifYoq(clean(body.sellerId, 60), clean(body.planId, 24), body.days, 'admin');
      if (y.xato) return bad(y.xato);
      return ok({ until: y.until });
    }

    /* Tarifni darhol to'xtatish. Raqamlardagi toifalar ham darhol
       olib tashlanadi (kechqurungi avtomatik tekshiruvni kutmasdan). */
    if (action === 'tarifOchir') {
      const sellerId = clean(body.sellerId, 60);
      let n = 0;
      for (let i = 0; i < 30; i++) {
        const q = await db.collection('numbers').where('promoSeller', '==', sellerId)
          .limit(300).get().catch(() => null);
        if (!q || q.empty) break;
        const batch = db.batch();
        q.docs.forEach(d => batch.update(d.ref, {
          tier: '', featured: false,
          promoSeller: admin.firestore.FieldValue.delete()
        }));
        await batch.commit();
        n += q.docs.length;
        if (q.docs.length < 300) break;
      }
      await db.collection('sellers').doc(sellerId)
        .update({ plan: '', planUntil: 0, planEndedAt: Date.now() }).catch(() => {});
      if (n) await db.collection('search_index').doc('dirty').set({ at: Date.now() }).catch(() => {});
      return ok({ raqam: n });
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
