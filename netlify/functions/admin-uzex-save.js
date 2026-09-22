// UZEX auksion natijasidagi bitta raqamni "Saqlash" — admin panelida
// UZEX kartochkasidagi 💾 tugmasi shu funksiyani chaqiradi. Saqlangan
// raqamlar barcha adminlarga umumiy ro'yxatda ko'rinadi (Firestore
// 'uzex_saved_numbers' kolleksiyasi), shu sabab bir admin saqlagan
// raqamni boshqasi ham UZEX bo'limida ko'radi.
//
// action: 'save'  — bitta lotni saqlaydi (id sifatida raqam ishlatiladi,
//                    shu bilan bir xil raqam ikki marta saqlanmaydi)
// action: 'unsave'— saqlangandan olib tashlaydi
// action: 'list'  — hozirgi saqlangan ro'yxatni qaytaradi (eng yangisi tepada)

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

const COLLECTION = 'uzex_saved_numbers';

function docIdFor(item) {
  const digits = String((item && item.number) || '').replace(/\D/g, '');
  return digits || null;
}

exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  let decoded;
  try {
    decoded = await requireAdmin(event, { feature: 'watch' });
  } catch (err) {
    return { statusCode: err.statusCode || 401, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri JSON' }) }; }

  try {
    if (input.action === 'list') {
      const snap = await db.collection(COLLECTION).orderBy('savedAt', 'desc').limit(300).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, items }) };
    }

    if (input.action === 'unsave') {
      const id = docIdFor(input.item) || input.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Raqam ko'rsatilmagan" }) };
      await db.collection(COLLECTION).doc(String(id)).delete();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // standart: 'save'
    const item = input.item || {};
    const id = docIdFor(item);
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Raqam ko'rsatilmagan" }) };

    await db.collection(COLLECTION).doc(id).set({
      number: item.number || '',
      price: Number(item.price) || 0,
      seller: item.seller || '',
      startDate: item.startDate || null,
      endDate: item.endDate || null,
      lotId: item.lotId || null,
      savedAt: admin.firestore.Timestamp.now(),
      savedByUid: decoded.uid,
      savedByEmail: decoded.email || ''
    }, { merge: true });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, id }) };
  } catch (err) {
    console.error('admin-uzex-save xato:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
