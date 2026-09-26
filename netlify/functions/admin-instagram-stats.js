// "STATISTIKA" (Instagram/Chatplace faolligi) — admin panelidagi yangi bo'lim.
//
// MUHIM CHEKLOV: Chatplace'ning tashqi dasturlar (bizning sayt/server) uchun
// ochiq va hujjatlashtirilgan REST API'si topilmadi (faqat AI agentlar uchun
// MCP-konnektor bor, u to'g'ridan-to'g'ri Netlify funksiyasidan chaqirib
// bo'lmaydi). Shu sabab bu funksiya Chatplace'ga O'ZI ULANMAYDI — u faqat
// Firestore'dagi ("adminStats/instagram" hujjati) so'nggi saqlangan
// statistikani o'qiydi (GET) va yozadi (SAVE).
//
// Yangilash oqimi: admin Claude'ga (suhbatda) "Instagram statistikasini
// yangila" deydi -> Claude Chatplace'dan (o'zining MCP-ulanishi orqali)
// jonli ma'lumot o'qib, tayyor JSON beradi -> admin uni panel ichidagi
// "Qo'lda yangilash" qutisiga joylab saqlaydi -> shu funksiya (action:'save')
// Firestore'ga yozadi -> keyingi safar panel ochilganda (action:'get')
// o'sha saqlangan holat ko'rsatiladi ("oxirgi yangilanish" vaqti bilan).
//
// Kelajakda Chatplace rasman API hujjatini bersa (yoki ular bilan
// bog'lanib olinsa), shu funksiyaga to'g'ridan-to'g'ri Chatplace'ga
// ulanadigan (fetch bilan) qism qo'shish mumkin bo'ladi — hozircha
// "qo'lda ko'prik" (manual bridge) orqali ishlaydi.

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
      await DOC_REF().set(clean, { merge: false });
      return { statusCode: 200, body: JSON.stringify({ ok: true, stats: clean }) };
    }

    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Noma'lum amal" }) };
  } catch (err) {
    const code = err.statusCode || 500;
    return { statusCode: code, body: JSON.stringify({ ok: false, error: err.message || 'Server xatosi' }) };
  }
};
