// ONLAYN TO'LOV QAYTA-CHAQIRUVI (callback) — PAYME va CLICK.
//
// BU FAYL NIMA QILADI: to'lov tizimi (Payme yoki Click) puli
// o'tkazilgandan keyin SHU manzilga o'zi murojaat qiladi va "to'lov
// bo'ldi" deb aytadi. Shundan keyin dilerning tarifi avtomatik
// yoqiladi. Diler hech kimni kutib o'tirmaydi.
//
// MANZIL (ikkalasiga ham shu):
//   https://vipraqamlar.uz/.netlify/functions/tarif-callback
// Payme kabinetida "Endpoint URL", Click kabinetida "Prepare URL" va
// "Complete URL" sifatida AYNAN shu manzil ko'rsatiladi.
//
// XAVFSIZLIK — eng muhim joy:
//   * PAYME har so'rovda `Authorization: Basic base64("Paycom:KEY")`
//     yuboradi. KEY mos kelmasa — so'rov RAD etiladi. Kalit
//     Netlify muhit o'zgaruvchisida (PAYME_KEY), kodda EMAS.
//   * CLICK har so'rovda `sign_string` (md5 imzo) yuboradi. Imzo
//     o'zimizda qayta hisoblanadi va `timingSafeEqual` bilan
//     solishtiriladi. Mos kelmasa — rad etiladi.
//   * Summа ham tekshiriladi: tarif narxidan farq qilsa rad etiladi
//     (ya'ni 1 so'm to'lab 300 000 so'mlik tarifni olib bo'lmaydi).
//   * Har bir to'lov so'rovi (`seller_plan_requests` hujjati) FAQAT
//     BIR MARTA tasdiqlanadi — takroriy chaqiruvda tarif ikki marta
//     yoqilmaydi.
//
// KALITLAR QO'YILMAGAN BO'LSA: funksiya darhol "sozlanmagan" deb
// javob beradi va hech narsa o'zgartirmaydi. Ya'ni bu fayl bor
// bo'lishining o'zi hech qanday xavf tug'dirmaydi.

const crypto = require('crypto');
const admin = require('firebase-admin');
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

const J = (o, code) => ({
  statusCode: code || 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(o)
});

const teng = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/* ---------- So'rov hujjati ---------- */
async function sorovOl(id) {
  const snap = await db.collection('seller_plan_requests').doc(String(id)).get().catch(() => null);
  if (!snap || !snap.exists) return null;
  return Object.assign({ id: snap.id, ref: snap.ref }, snap.data() || {});
}

/* Tarifni yoqadi va so'rovni "to'landi" deb belgilaydi.
   Ikki marta chaqirilsa — ikkinchisida hech narsa qilmaydi. */
async function tolandi(sorov, manba, tashqiId) {
  if (sorov.status === 'tasdiqlandi') return { takror: true };
  const y = await TARIF.yoqish(db, admin, sorov.sellerId, sorov.planId, sorov.days, manba);
  if (y.xato) return { xato: y.xato };
  await sorov.ref.update({
    status: 'tasdiqlandi', closedAt: Date.now(),
    tolovManba: manba, tolovId: String(tashqiId || '')
  }).catch(() => {});
  return { until: y.until };
}

/* ================== PAYME ==================
   JSON-RPC 2.0. Xato kodlari Payme hujjatidan. */
const P_XATO = {
  auth: { code: -32504, message: 'Avtorizatsiya xatosi' },
  hisob: { code: -31050, message: { uz: 'Hisob topilmadi', ru: 'Счёт не найден', en: 'Account not found' } },
  summa: { code: -31001, message: { uz: "Summa noto'g'ri", ru: 'Неверная сумма', en: 'Wrong amount' } },
  yoq: { code: -31003, message: 'Tranzaksiya topilmadi' },
  mumkin: { code: -31008, message: 'Amalni bajarish mumkin emas' }
};

function paymeAuthOk(event) {
  const key = process.env.PAYME_KEY;
  if (!key) return false;
  const h = (event.headers || {});
  const raw = String(h.authorization || h.Authorization || '');
  const m = raw.match(/^Basic\s+(.+)$/i);
  if (!m) return false;
  let dec = '';
  try { dec = Buffer.from(m[1], 'base64').toString('utf8'); } catch (e) { return false; }
  const i = dec.indexOf(':');
  if (i < 0) return false;
  return dec.slice(0, i) === 'Paycom' && teng(dec.slice(i + 1), key);
}

async function payme(event, body) {
  const id = body.id;
  const xato = (e) => J({ jsonrpc: '2.0', id, error: e });
  if (!paymeAuthOk(event)) return xato(P_XATO.auth);

  const m = String(body.method || '');
  const p = body.params || {};
  const hisobId = String((p.account || {}).hisob || (p.account || {}).order_id || '');

  if (m === 'CheckPerformTransaction') {
    const s = await sorovOl(hisobId);
    if (!s) return xato(P_XATO.hisob);
    if (s.status !== 'kutilmoqda') return xato(P_XATO.mumkin);
    if (Math.round(Number(s.price) * 100) !== Number(p.amount)) return xato(P_XATO.summa);
    return J({ jsonrpc: '2.0', id, result: { allow: true } });
  }

  if (m === 'CreateTransaction') {
    const s = await sorovOl(hisobId);
    if (!s) return xato(P_XATO.hisob);
    if (Math.round(Number(s.price) * 100) !== Number(p.amount)) return xato(P_XATO.summa);
    const tref = db.collection('tolov_tranzaksiya').doc('payme_' + String(p.id));
    const bor = await tref.get();
    if (bor.exists) {
      const t = bor.data() || {};
      if (t.state !== 1) return xato(P_XATO.mumkin);
      return J({ jsonrpc: '2.0', id, result: { create_time: t.create_time, transaction: tref.id, state: 1 } });
    }
    if (s.status !== 'kutilmoqda') return xato(P_XATO.mumkin);
    const create_time = Date.now();
    await tref.set({
      tizim: 'payme', tashqiId: String(p.id), hisob: hisobId,
      sellerId: s.sellerId || '', planId: s.planId || '',
      amount: Number(p.amount), state: 1, create_time
    });
    return J({ jsonrpc: '2.0', id, result: { create_time, transaction: tref.id, state: 1 } });
  }

  if (m === 'PerformTransaction') {
    const tref = db.collection('tolov_tranzaksiya').doc('payme_' + String(p.id));
    const snap = await tref.get();
    if (!snap.exists) return xato(P_XATO.yoq);
    const t = snap.data() || {};
    if (t.state === 2) {
      return J({ jsonrpc: '2.0', id, result: { transaction: tref.id, perform_time: t.perform_time, state: 2 } });
    }
    if (t.state !== 1) return xato(P_XATO.mumkin);
    const s = await sorovOl(t.hisob);
    if (!s) return xato(P_XATO.hisob);
    const r = await tolandi(s, 'payme', p.id);
    if (r.xato) return xato(P_XATO.mumkin);
    const perform_time = Date.now();
    await tref.update({ state: 2, perform_time });
    return J({ jsonrpc: '2.0', id, result: { transaction: tref.id, perform_time, state: 2 } });
  }

  if (m === 'CancelTransaction') {
    const tref = db.collection('tolov_tranzaksiya').doc('payme_' + String(p.id));
    const snap = await tref.get();
    if (!snap.exists) return xato(P_XATO.yoq);
    const t = snap.data() || {};
    const cancel_time = Number(t.cancel_time) || Date.now();
    const yangi = t.state === 2 ? -2 : -1;
    if (t.state > 0) await tref.update({ state: yangi, cancel_time, reason: Number(p.reason) || 0 });
    return J({ jsonrpc: '2.0', id, result: { transaction: tref.id, cancel_time, state: t.state > 0 ? yangi : t.state } });
  }

  if (m === 'CheckTransaction') {
    const tref = db.collection('tolov_tranzaksiya').doc('payme_' + String(p.id));
    const snap = await tref.get();
    if (!snap.exists) return xato(P_XATO.yoq);
    const t = snap.data() || {};
    return J({ jsonrpc: '2.0', id, result: {
      create_time: Number(t.create_time) || 0,
      perform_time: Number(t.perform_time) || 0,
      cancel_time: Number(t.cancel_time) || 0,
      transaction: tref.id, state: Number(t.state) || 0, reason: t.reason == null ? null : Number(t.reason)
    } });
  }

  if (m === 'GetStatement') return J({ jsonrpc: '2.0', id, result: { transactions: [] } });
  return xato(P_XATO.mumkin);
}

/* ================== CLICK ==================
   Ikki qadam: Prepare (action=0) va Complete (action=1).
   Imzo: md5(ketma-ket qo'shilgan maydonlar + SECRET_KEY). */
const C_XATO = { OK: 0, IMZO: -1, SUMMA: -2, YOQ: -5, TAKROR: -4, BEKOR: -9, SOZLANMAGAN: -8 };

function clickImzoOk(p, qadam) {
  const key = process.env.CLICK_SECRET_KEY;
  if (!key) return false;
  const bits = qadam === 1
    ? [p.click_trans_id, p.service_id, key, p.merchant_trans_id, p.merchant_prepare_id, p.amount, p.action, p.sign_time]
    : [p.click_trans_id, p.service_id, key, p.merchant_trans_id, p.amount, p.action, p.sign_time];
  const kutilgan = crypto.createHash('md5').update(bits.join(''), 'utf8').digest('hex');
  return teng(kutilgan, String(p.sign_string || '').toLowerCase());
}

async function click(p) {
  const qadam = Number(p.action);
  const javob = (err, qo) => J(Object.assign({
    click_trans_id: p.click_trans_id,
    merchant_trans_id: p.merchant_trans_id,
    error: err, error_note: err === 0 ? 'Success' : 'Error ' + err
  }, qo || {}));

  if (!process.env.CLICK_SECRET_KEY) return javob(C_XATO.SOZLANMAGAN);
  if (!clickImzoOk(p, qadam)) return javob(C_XATO.IMZO);

  const s = await sorovOl(p.merchant_trans_id);
  if (!s) return javob(C_XATO.YOQ);
  if (Math.round(Number(p.amount)) !== Math.round(Number(s.price))) return javob(C_XATO.SUMMA);

  if (qadam === 0) {
    if (s.status !== 'kutilmoqda') return javob(C_XATO.TAKROR);
    await db.collection('tolov_tranzaksiya').doc('click_' + String(p.click_trans_id)).set({
      tizim: 'click', tashqiId: String(p.click_trans_id), hisob: String(p.merchant_trans_id),
      sellerId: s.sellerId || '', planId: s.planId || '',
      amount: Number(p.amount), state: 1, create_time: Date.now()
    });
    return javob(C_XATO.OK, { merchant_prepare_id: Date.now() });
  }

  if (qadam === 1) {
    if (Number(p.error) < 0) {
      await db.collection('tolov_tranzaksiya').doc('click_' + String(p.click_trans_id))
        .set({ state: -1, cancel_time: Date.now() }, { merge: true }).catch(() => {});
      return javob(C_XATO.BEKOR);
    }
    const r = await tolandi(s, 'click', p.click_trans_id);
    if (r.xato) return javob(C_XATO.YOQ);
    await db.collection('tolov_tranzaksiya').doc('click_' + String(p.click_trans_id))
      .set({ state: 2, perform_time: Date.now() }, { merge: true }).catch(() => {});
    return javob(C_XATO.OK, { merchant_confirm_id: Date.now() });
  }

  return javob(C_XATO.IMZO);
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return J({ ok: false, error: 'Faqat POST' }, 405);
  const tur = String(((event.headers || {})['content-type']) || '').toLowerCase();
  const xom = event.body || '';

  try {
    // CLICK form-urlencoded yuboradi, PAYME esa JSON
    if (tur.indexOf('application/json') === -1) {
      const p = {};
      new URLSearchParams(xom).forEach((v, k) => { p[k] = v; });
      if (p.click_trans_id != null) return await click(p);
      return J({ ok: false, error: "Noma'lum so'rov" }, 400);
    }
    const body = JSON.parse(xom || '{}');
    if (body.click_trans_id != null) return await click(body);
    if (body.method) return await payme(event, body);
    return J({ ok: false, error: "Noma'lum so'rov" }, 400);
  } catch (e) {
    return J({ ok: false, error: String((e && e.message) || e) }, 500);
  }
};
