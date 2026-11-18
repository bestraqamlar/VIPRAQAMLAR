// AVTOMATIK STATISTIKA YANGILOVCHI — Netlify'ning o'zi (bizning serverimiz,
// hech qanday tashqi cheklovsiz) belgilangan vaqt oralig'ida (netlify.toml
// ichidagi "schedule" bo'yicha, pastga qarang) shu faylni o'zi ishga
// tushiradi va Chatplace'dan yangi raqamlarni o'qib, Firestore'ga
// ("adminStats/instagram") yozadi — ADMIN HECH NARSA QILMASDAN, panelni
// ochganda har doim so'nggi (avtomatik yangilangan) raqamlarni ko'radi.
//
// MUHIM CHEKINISH: Chatplace'ning bu funksiya yozilgan paytda OCHIQ,
// rasmiy hujjatlashtirilgan REST API sxemasi (aniq manzil/format) topib
// bo'lmadi — quyidagi so'rov manzillari ularning API-kalit sahifasidagi
// ruxsat toifalari (Avtomatizatsiyalar/Botlar/Chatlar) asosida ENG
// EHTIMOLIY (odatiy REST konvensiyasi) shaklda yozilgan. Agar birinchi
// avtomatik urinish muvaffaqiyatsiz bo'lsa (masalan noto'g'ri manzil
// sababli), buni FOYDALANUVCHI PANELDA KO'RADI ("lastError" maydoni) va
// Claude'ga xabar berib, bitta tuzatishdan so'ng butunlay avtomatik
// ishlab ketadi — hech qachon "jim" muvaffaqiyatsizlikka uchramaydi.

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

const CHATPLACE_API_BASE = process.env.CHATPLACE_API_BASE || 'https://api.chatplace.io/v1';
const CHATPLACE_API_KEY = process.env.CHATPLACE_API_KEY || '';
const CHATPLACE_BOT_ID = process.env.CHATPLACE_BOT_ID || '01a0db92-1b59-729f-9114-d1fc030f210c';

async function cpFetch(path) {
  const res = await fetch(CHATPLACE_API_BASE + path, {
    headers: { Authorization: 'Bearer ' + CHATPLACE_API_KEY, Accept: 'application/json' }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* javob JSON emas — pastda xato sifatida qaytariladi */ }
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' ' + path + ': ' + text.slice(0, 300));
  }
  return json;
}

function startOfTodayUnix() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

exports.handler = async () => {
  if (!CHATPLACE_API_KEY) {
    await db.collection('adminStats').doc('instagram').set(
      { lastError: "CHATPLACE_API_KEY Netlify muhit o'zgaruvchisi sozlanmagan", lastAttemptAt: Date.now() },
      { merge: true }
    );
    return { statusCode: 200, body: 'no api key configured' };
  }

  try {
    const [totalReport, chats] = await Promise.all([
      cpFetch('/automations/total-report'),
      cpFetch('/chats?limit=100')
    ]);

    const todayStart = startOfTodayUnix();
    const chatItems = (chats && (chats.items || chats.data || [])) || [];
    const todayMessages = chatItems.filter(c => (c.lastMessageAt || 0) >= todayStart).length;
    const activeChats = (totalReport && totalReport.activeChats) || 0;
    const totalClients = (totalReport && totalReport.totalClients && totalReport.totalClients.current) || 0;

    const stats = {
      today: {
        messages: todayMessages,
        replied: todayMessages, // avtojavob har doim darhol javob beradi
        converted: 0 // aniq "silkadan o'tish" ko'rsatkichi endi bot bo'yicha alohida hisoblanishi kerak
      },
      activeChats,
      totalClients,
      weekVideos: 0,
      videos: [],
      updatedAt: Date.now(),
      lastError: null,
      autoSynced: true
    };
    await db.collection('adminStats').doc('instagram').set(stats, { merge: false });
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    await db.collection('adminStats').doc('instagram').set(
      { lastError: err.message || String(err), lastAttemptAt: Date.now() },
      { merge: true }
    );
    return { statusCode: 200, body: 'sync failed, recorded lastError' };
  }
};
