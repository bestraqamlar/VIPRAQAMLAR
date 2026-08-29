// DIAGNOSTIKA: joriy tizimga kirgan hisobda HAQIQIY admin huquqi
// (custom claim: admin=true) bor-yo'qligini tekshirish uchun.
// panel-xn3vbivfp72a33.html sahifasi kirishda shuni avtomatik chaqiradi va agar
// admin huquqi yo'q bo'lsa, ogohlantirish ko'rsatadi.

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

exports.handler = async function (event) {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, admin: false, error: "Token yo'q" }) };
    }
    const decoded = await admin.auth().verifyIdToken(idToken, true);
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        admin: decoded.admin === true,
        superAdmin: decoded.superAdmin === true,
        // perms umuman yo'q (undefined) — eski/tizimdan oldingi, TO'LIQ
        // huquqli admin degani (qarang: lib/adminAuth.js). null qilib
        // yuboramiz, front-end shu holatni "hammasiga ruxsat" deb o'qiydi.
        perms: decoded.perms || null,
        uid: decoded.uid,
        email: decoded.email || null
      })
    };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ ok: false, admin: false, error: err.message }) };
  }
};
