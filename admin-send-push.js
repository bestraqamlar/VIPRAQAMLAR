// ===================================================================
// BRAUZER BILDIRISHNOMASINI YUBORISH (admin paneldan)
// -------------------------------------------------------------------
// Admin "Saytga xabar" bo'limida "Telefonlarga ham yuborilsin"
// belgisini qo'ysa, xabar SHU YERGA keladi va saytga kirgan,
// bildirishnomaga ruxsat bergan BARCHA qurilmalarga jo'natiladi —
// mijoz saytdan chiqib ketgan bo'lsa ham telefon ekranida chiqadi.
//
// XAVFSIZLIK: faqat "Saytga xabar" ruxsati bor admin chaqira oladi.
// Aks holda har kim butun mijozlar bazasiga spam yuborishi mumkin edi.
// ===================================================================

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

const H = { 'Content-Type': 'application/json' };
const BOLAK = 500;   // Firebase bir so'rovda ko'pi bilan 500 ta token oladi

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: '{"ok":false}' };

  try {
    await requireAdmin(event, { feature: 'xabarlar' });
  } catch (err) {
    return { statusCode: err.statusCode || 401, headers: H, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch (e) {
    return { statusCode: 400, headers: H, body: '{"ok":false}' };
  }

  const title = String(b.title || '').trim().slice(0, 120);
  const body  = String(b.body  || '').trim().slice(0, 400);
  const link  = String(b.link  || '/').trim().slice(0, 300);
  const id    = String(b.id    || '').trim().slice(0, 64);
  if (!title) return { statusCode: 400, headers: H, body: JSON.stringify({ ok: false, error: 'sarlavha yoq' }) };

  try {
    const snap = await db.collection('push_tokens').get();
    const tokens = snap.docs.map(d => (d.data() || {}).token).filter(Boolean);
    if (!tokens.length) {
      return { statusCode: 200, headers: H, body: JSON.stringify({ ok: true, yuborildi: 0, jami: 0 }) };
    }

    let yuborildi = 0, xato = 0;
    const olib = [];   // yaroqsiz tokenlar — bazadan tozalanadi

    for (let i = 0; i < tokens.length; i += BOLAK) {
      const bolak = tokens.slice(i, i + BOLAK);
      /* DIQQAT: `notification` emas, `data` yuboriladi — shunda
         ko'rinishni butunlay o'zimiz boshqaramiz (ikona, bosilganda
         qayerga o'tishi) va xabar ikki marta chiqmaydi. */
      const res = await admin.messaging().sendEachForMulticast({
        tokens: bolak,
        data: { title, body, link, id },
        webpush: {
          fcmOptions: { link: link.indexOf('http') === 0 ? link : ('https://vipraqamlar.uz' + (link[0] === '/' ? link : '/' + link)) },
          headers: { Urgency: 'high', TTL: '86400' }
        },
        android: { priority: 'high' },
        apns: { payload: { aps: { alert: { title, body }, sound: 'default' } } }
      });

      res.responses.forEach((r, k) => {
        if (r.success) { yuborildi++; return; }
        xato++;
        const code = r.error && r.error.code ? String(r.error.code) : '';
        /* Qurilma ilovani o'chirgan yoki ruxsatni bekor qilgan —
           bunday token boshqa hech qachon ishlamaydi, o'chiramiz. */
        if (code.indexOf('registration-token-not-registered') > -1 ||
            code.indexOf('invalid-argument') > -1 ||
            code.indexOf('invalid-registration-token') > -1) {
          olib.push(bolak[k]);
        }
      });
    }

    /* Yaroqsiz tokenlarni tozalaymiz — baza shishib ketmasin */
    if (olib.length) {
      const crypto = require('crypto');
      const partiya = db.batch();
      olib.slice(0, 450).forEach(t => {
        const docId = crypto.createHash('sha256').update(t).digest('hex').slice(0, 40);
        partiya.delete(db.collection('push_tokens').doc(docId));
      });
      try { await partiya.commit(); } catch (e) { /* tozalanmasa ham xabar ketdi */ }
    }

    return {
      statusCode: 200, headers: H,
      body: JSON.stringify({ ok: true, yuborildi, xato, jami: tokens.length, tozalandi: olib.length })
    };
  } catch (err) {
    console.error('admin-send-push xato:', err);
    return { statusCode: 500, headers: H, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
