// PUSH-BILDIRISHNOMA TOKENINI QABUL QILISH
//
// Ilova o'rnatilgan har bir telefon o'zining "pochta manzili" (token)
// ni shu yerga yuboradi. Keyin admin paneldan yoki boshqa funksiyadan
// o'sha tokenlarga xabar jo'natiladi:
//   "Yangi VIP raqam qo'shildi", "Buyurtmangiz tayyor" va h.k.
//
// Chaqirish: POST /.netlify/functions/api-push-token
// Tana: { "token": "...", "platform": "android" | "ios" }
//
// XAVFSIZLIK: token shaxsiy ma'lumot emas (ism, telefon, joylashuv
// yo'q) — u faqat "shu telefonga xabar yuborish" uchun kalit. Shunga
// qaramay `push_tokens` to'plami brauzerdan O'QIB ham, YOZIB ham
// bo'lmaydi (firestore.rules) — faqat server funksiyalari orqali.

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

const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: H, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: '{"ok":false}' };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) {
    return { statusCode: 400, headers: H, body: '{"ok":false}' };
  }

  const token = String(body.token || '').trim();
  const platform = String(body.platform || '').toLowerCase();

  // Token uzunligi odatda 140-200 belgi. Chegaralar — axlat yozuvlardan himoya.
  if (token.length < 64 || token.length > 400) {
    return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'token notogri' }) };
  }
  if (platform !== 'android' && platform !== 'ios') {
    return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'platform notogri' }) };
  }

  // Hujjat nomi — tokenning o'zidan hosil qilingan qisqa xesh.
  // Shunda bir telefon qayta-qayta yuborsa ham bitta yozuv qoladi.
  const crypto = require('crypto');
  const id = crypto.createHash('sha256').update(token).digest('hex').slice(0, 40);

  try {
    await db.collection('push_tokens').doc(id).set({
      token, platform,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtSort: Date.now()
    }, { merge: true });
  } catch (e) {
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false }) };
  }
  return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true }) };
};
