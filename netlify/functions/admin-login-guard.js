// ADMIN PANELGA KIRISH QULFI — 5 daqiqada 3 marta urinish.
//
// NEGA ALOHIDA FUNKSIYA. Admin paneli Firebase Authentication orqali
// kiradi (parolni Firebase o'zi tekshiradi) — ya'ni "parol noto'g'ri"
// javobi bizning serverimizdan o'tmaydi. Agar urinishlarni faqat
// brauzerda sanasak, hujumchi sahifani yangilab yoki "Incognito" ochib
// hisobni nolga qaytarib yuboradi. Shu sabab urinishlar SERVERDA,
// Firestore'da sanaladi (lib/kirishQulf.js) — brauzerdan tozalab
// bo'lmaydi.
//
// Qanday ishlaydi (panel-boshqaruv.html -> doLogin()):
//   1. "Kirish" bosilganda — `tekshir`: qulflangan bo'lsa Firebase'ga
//      UMUMAN murojaat qilinmaydi, ekranda sanoq ko'rsatiladi;
//   2. parol noto'g'ri bo'lsa — `xato`: hisoblagich +1, 3-chi xatodan
//      keyin 5 daqiqaga qulf va adminga Telegram xabari;
//   3. muvaffaqiyatli kirishda — `ok`: hisoblagich tozalanadi.
//
// Bu funksiya ANONIM chaqiriladi (kirishdan OLDIN ishlaydi), shu sabab
// o'zi ham himoyalangan: IP bo'yicha soatlik chegara (lib/tezlik.js) va
// hech qanday maxfiy ma'lumot qaytarmaydi — faqat "qulf bormi, qancha
// qoldi, nechta urinish qoldi".
//
// MUHIM: Firebase'ning O'Z himoyasi (auth/too-many-requests) ham joyida
// qolaveradi — bu qulf uning o'rniga emas, USTIGA qo'shiladi.

const admin = require('firebase-admin');
const QULF = require('./lib/kirishQulf');
const { tezlikOk } = require('./lib/tezlik');

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

async function telegramga(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  } catch (e) {}
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }
  /* Funksiyaning o'zini "sog'ib olishdan" himoya */
  if (!(await tezlikOk(db, event, 'login_guard_rate_limits', 120))) {
    return { statusCode: 429, headers, body: JSON.stringify({ ok: false, error: "Juda ko'p so'rov" }) };
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Noto'g'ri JSON" }) }; }

  const login = String(input.login || '').trim().toLowerCase().slice(0, 80);
  const ip = QULF.ipOl(event);
  /* Login yozilmagan bo'lsa ham IP bo'yicha hisob yuritiladi */
  const kalitlar = login ? ['admin:' + login, 'ip:' + ip] : ['ip:' + ip];

  try {
    if (input.action === 'tekshir') {
      const h = await QULF.qulfHolati(db, kalitlar);
      return { statusCode: 200, headers, body: JSON.stringify({
        ok: true, qulf: h.qulf, qoldiMs: h.qoldiMs,
        qolganUrinish: h.qolganUrinish, matn: QULF.qoldiMatn(h.qoldiMs)
      }) };
    }

    if (input.action === 'xato') {
      const n = await QULF.xatoQayd(db, kalitlar);
      if (n.endiQulflandi) {
        await telegramga("🚨 Admin panelga kirishga urinish\n" +
          'Login: ' + (login || "ko'rsatilmagan") + '\nIP: ' + ip +
          '\n3 marta xato parol — 5 daqiqaga qulflandi.');
        /* Keyin ko'rib chiqish uchun qisqa yozuv (ism/parol SAQLANMAYDI) */
        try {
          await db.collection('login_attempts').doc('__log__').set({
            [Date.now().toString()]: { login: login || '', ip, at: Date.now() }
          }, { merge: true });
        } catch (e) {}
      }
      return { statusCode: 200, headers, body: JSON.stringify({
        ok: true, qulf: n.qulf, qoldiMs: n.qoldiMs,
        qolganUrinish: n.qolganUrinish, matn: QULF.qoldiMatn(n.qoldiMs)
      }) };
    }

    if (input.action === 'ok') {
      await QULF.tozala(db, kalitlar);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Noma'lum amal" }) };
  } catch (err) {
    console.error('admin-login-guard xato:', err);
    /* Xato bo'lsa kirishni to'smaymiz (Firebase himoyasi baribir bor) */
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, qulf: false, qoldiMs: 0, qolganUrinish: 3 }) };
  }
};
