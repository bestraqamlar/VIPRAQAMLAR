// "BAZA RAQAM" KUZATUVI — admin xohlagan raqamni (yoki naqshni) tanlangan
// operatorda vaqti-vaqti bilan avtomatik qidirib turadi, sotuvga chiqsa
// darhol Telegram orqali xabar beradi.
//
// XAVFSIZLIK: bu kolleksiya (number_watches) firestore.rules'da UMUMAN
// ro'yxatga OLINMAGAN — demak brauzerdan (Client SDK orqali) unga hech kim
// (hatto tizimga kirgan admin ham) to'g'ridan-to'g'ri kira olmaydi.
// Yagona yo'l — shu funksiya, u esa har bir so'rovda requireAdmin() orqali
// HAQIQIY admin custom claim'ini tekshiradi. Shu bilan qaysi raqamlar
// kuzatilayotgani (bu — tijorat siri, raqobatchi bilishi mumkin emas)
// faqat admin panelidan, faqat haqiqiy admin tomonidan ko'rinadi.

const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');

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

const COLLECTION = 'number_watches';
const ALLOWED_OPERATORS = ['Beeline', 'Ucell', 'Humans', 'Mobiuz', 'Perfektum'];
const ALLOWED_INTERVALS = [1, 3, 5, 30, 60, 120];

function validateBoxes(boxes) {
  if (!Array.isArray(boxes) || boxes.length !== 7) return false;
  let filled = 0;
  for (const b of boxes) {
    if (b === '' || b === null || b === undefined) continue;
    if (typeof b !== 'string' || !/^[0-9]$/.test(b)) return false;
    filled++;
  }
  return filled > 0;
}

async function createWatch(body, adminUid) {
  const boxes = (body.boxes || []).map(b => (b === undefined || b === null) ? '' : String(b));
  if (!validateBoxes(boxes)) {
    const err = new Error("Kamida bitta katak to'ldirilgan bo'lishi kerak (7 ta katak, bo'sh joy = istalgan raqam)");
    err.statusCode = 400;
    throw err;
  }
  const operator = String(body.operator || '');
  if (!ALLOWED_OPERATORS.includes(operator)) {
    const err = new Error("Noto'g'ri operator");
    err.statusCode = 400;
    throw err;
  }
  const intervalMinutes = Number(body.intervalMinutes);
  if (!ALLOWED_INTERVALS.includes(intervalMinutes)) {
    const err = new Error("Noto'g'ri vaqt oralig'i");
    err.statusCode = 400;
    throw err;
  }

  const now = admin.firestore.Timestamp.now();
  const doc = {
    boxes,
    operator,
    intervalMinutes,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: adminUid,
    // Tasdiqlashdan so'ng SHU ZAHOTIYOQ birinchi qidiruv boshlanishi uchun
    // nextCheckAt ni hozirgi vaqtga qo'yamiz — keyingi cron tikida darhol ushlanadi.
    nextCheckAt: now,
    lastCheckedAt: null,
    lastFoundAt: null,
    lastFoundNumbers: [],
    // Har bir aniq topilgan raqam (masalan +998901234567) uchun oxirgi marta
    // qachon xabar yuborilgani — shu bilan bitta raqam qayta-qayta emas,
    // faqat 12 soatda bir marta xabar qilinadi (pastda NOTIFY_COOLDOWN_MS,
    // number-watch-check-background.js). Boshqa (yangi) raqam chiqsa esa
    // darhol, kutmasdan xabar beriladi.
    notifiedNumbers: {},
    checkCount: 0
  };
  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id };
}

async function listWatches() {
  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      boxes: data.boxes || [],
      operator: data.operator || '',
      intervalMinutes: data.intervalMinutes || null,
      active: data.active !== false,
      lastCheckedAt: data.lastCheckedAt ? data.lastCheckedAt.toMillis() : null,
      nextCheckAt: data.nextCheckAt ? data.nextCheckAt.toMillis() : null,
      lastFoundAt: data.lastFoundAt ? data.lastFoundAt.toMillis() : null,
      lastFoundNumbers: data.lastFoundNumbers || [],
      // Hozircha "sovish" (12 soat) muddati tugamagan, ya'ni yaqinda xabar
      // qilingan va shu sabab hozircha qayta yuborilmaydigan raqamlar soni.
      notifiedCount: Object.keys(data.notifiedNumbers || {}).length,
      checkCount: data.checkCount || 0
    };
  });
}

async function toggleWatch(body) {
  const id = String(body.id || '');
  if (!id) { const err = new Error('id kerak'); err.statusCode = 400; throw err; }
  await db.collection(COLLECTION).doc(id).update({ active: !!body.active });
  return { ok: true };
}

async function deleteWatch(body) {
  const id = String(body.id || '');
  if (!id) { const err = new Error('id kerak'); err.statusCode = 400; throw err; }
  await db.collection(COLLECTION).doc(id).delete();
  return { ok: true };
}

// Bir nechta kuzatuvni bittada o'chirish — admin panelda "belgilanganlarni
// o'chirish" tugmasi uchun. Firestore batch bitta yozuvda 500 tagacha
// amalni qo'llab-quvvatlaydi, shuning uchun ehtiyot shart 400 tadan bo'lib
// yuboramiz (amalda kuzatuvlar soni bundan ancha kam bo'ladi).
async function deleteManyWatches(body) {
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  if (!ids.length) { const err = new Error('ids kerak'); err.statusCode = 400; throw err; }
  const CHUNK = 400;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const batch = db.batch();
    chunk.forEach(id => batch.delete(db.collection(COLLECTION).doc(id)));
    await batch.commit();
  }
  return { ok: true, deleted: ids.length };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let decoded;
  try {
    decoded = await requireAdmin(event, { feature: 'watch' });
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: err.message }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  try {
    let result;
    switch (body.action) {
      case 'create': result = await createWatch(body, decoded.uid); break;
      case 'list':   result = { watches: await listWatches() }; break;
      case 'toggle': result = await toggleWatch(body); break;
      case 'delete': result = await deleteWatch(body); break;
      case 'deleteMany': result = await deleteManyWatches(body); break;
      default: {
        const err = new Error("Noma'lum amal");
        err.statusCode = 400;
        throw err;
      }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (err) {
    console.error('ADMIN-NUMBER-WATCH XATOSI:', err);
    return { statusCode: err.statusCode || 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
