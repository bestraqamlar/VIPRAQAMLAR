// "STATISTIKA" (Instagram/Chatplace faolligi) — admin panelidagi bo'lim.
//
// AVTOMATIK: raqamlarni haqiqiy avtomatik yangilab turadigan qism —
// netlify/functions/instagram-stats-sync-background.js — Netlify'ning
// o'zi (bizning kod emas, ADMIN HAM emas) har 30 daqiqada ishga tushirib,
// Chatplace'dan o'qib, shu yerdagi bilan BIR XIL hujjatga
// ("adminStats/instagram") yozadi. Shu funksiya (admin-instagram-stats.js)
// faqat: (GET) panelga o'sha hujjatni ko'rsatish uchun o'qiydi, va
// (SAVE) — agar avtomatik sinxronizatsiya biror sababga ko'ra hali
// ishlamasa (masalan Chatplace API manzili hali aniqlanmagan bo'lsa) —
// ZAXIRA sifatida qo'lda kiritishga ruxsat beradi.

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

const DOC_REF = () => db.collection('adminStats').doc('instagram');

// Qo'lda kiritiladigan JSON juda katta/xato bo'lib ketmasligi uchun
// oddiy, yengil tekshiruv — bu maxfiy moliyaviy ma'lumot emas, shu sabab
// personal_bot_tx kabi og'ir validatsiya shart emas.
function sanitizeStats(input) {
  const s = input && typeof input === 'object' ? input : {};
  const today = s.today && typeof s.today === 'object' ? s.today : {};
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  };
  const videos = Array.isArray(s.videos) ? s.videos.slice(0, 50).map(v => ({
    title: String((v && v.title) || (v && v.mediaId) || '').slice(0, 200),
    mediaId: String((v && v.mediaId) || '').slice(0, 200),
    subscribers: num(v && v.subscribers)
  })) : [];
  return {
    today: {
      messages: num(today.messages),
      replied: num(today.replied),
      converted: num(today.converted)
    },
    activeChats: num(s.activeChats),
    totalClients: num(s.totalClients),
    weekVideos: num(s.weekVideos),
    videos
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }
  try {
    await requireAdmin(event, { feature: 'statistika' });
    const body = JSON.parse(event.body || '{}');
    const action = body.action;

    if (action === 'get') {
      const snap = await DOC_REF().get();
      const data = snap.exists ? snap.data() : null;
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          stats: data ? Object.assign({}, data, { updatedAt: data.updatedAt || null }) : null
        })
      };
    }

    if (action === 'save') {
      const clean = sanitizeStats(body.stats);
      clean.updatedAt = Date.now();
      clean.lastError = null;
      clean.autoSynced = false;
      await DOC_REF().set(clean, { merge: false });
      return { statusCode: 200, body: JSON.stringify({ ok: true, stats: clean }) };
    }

    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Noma'lum amal" }) };
  } catch (err) {
    const code = err.statusCode || 500;
    return { statusCode: code, body: JSON.stringify({ ok: false, error: err.message || 'Server xatosi' }) };
  }
};
