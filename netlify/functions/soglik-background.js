// TIZIM SOG'LIG'I — JIM TO'XTAB QOLISHNI PAYQAYDI (V119)
// =====================================================
// NEGA KERAK. Eng xavfli nosozlik — "xato bermaydigan" nosozlik.
// Masalan Beeline sinxronizatsiyasi to'xtab qolsa, sayt eski raqamlarni
// ko'rsatib turaveradi: xato yo'q, ogohlantirish yo'q, lekin mijoz
// allaqachon sotilgan raqamni buyurtma qiladi. Kuzatuv to'xtasa ham
// shunday — "hech narsa topilmadi" bilan "umuman qidirilmadi" tashqi
// tomondan bir xil ko'rinadi.
//
// NIMA QILADI. Soatiga bir marta bir nechta "hayot belgisi"ni
// tekshiradi: oxirgi marta qachon yangilangan? Agar juda eskirib
// ketgan bo'lsa — Telegram'ga ogohlantirish yuboradi. Tiklanganda
// "tuzaldi" xabari keladi. Takroriy xabar 6 soatda bir martadan ko'p
// yuborilmaydi.

const admin = require('firebase-admin');
const { jadvalOk } = require('./lib/jadvalQalqon');

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

const HOLAT = 'watch_health';          // sog'liq yozuvlari shu yerda
const SOVISH_MS = 6 * 60 * 60 * 1000;  // bir xil ogohlantirish 6 soatda bir marta

async function telegram(matn) {
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const r = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: matn })
    });
    return r.ok;
  } catch (e) { return false; }
}

function daqiqa(ms) { return Math.round(ms / 60000); }

/* Bitta tekshiruv natijasini qayd etadi va kerak bo'lsa xabar yuboradi. */
async function qayd(kalit, nom, soz, izoh) {
  const ref = db.collection(HOLAT).doc('soglik_' + kalit);
  let oldin = {};
  try { const s = await ref.get(); if (s.exists) oldin = s.data() || {}; } catch (e) {}
  const now = Date.now();

  if (soz) {
    if (oldin.alertedAt) {
      await telegram('✅ Tiklandi\n\n' + nom + ' yana ishlayapti.');
      await ref.set({ soz: true, alertedAt: null, lastOkAt: now }, { merge: true }).catch(() => {});
    } else {
      await ref.set({ soz: true, lastOkAt: now }, { merge: true }).catch(() => {});
    }
    return;
  }

  const yoz = { soz: false, lastBadAt: now, izoh: String(izoh).slice(0, 300) };
  if (!oldin.alertedAt || now - oldin.alertedAt > SOVISH_MS) {
    const yetdi = await telegram('⚠️ Tizimda nosozlik\n\n' + nom + '\n' + izoh);
    if (yetdi) yoz.alertedAt = now;
  }
  await ref.set(yoz, { merge: true }).catch(() => {});
}

/* Hujjatdagi vaqt maydonini millisekundga keltiradi (Timestamp ham,
   oddiy son ham bo'lishi mumkin). */
function vaqtMs(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  return 0;
}

exports.handler = async function (event) {
  if (!jadvalOk(event)) return { statusCode: 403, body: 'forbidden' };
  const natija = [];

  /* 1) BEELINE KESHI — har 10 daqiqada yangilanishi kerak.
        90 daqiqadan oshsa, demak jadval ishlamayapti. */
  try {
    const s = await db.collection('live_cache').doc('Beeline').get();
    const t = s.exists ? vaqtMs(s.data().updatedAt) : 0;
    const yosh = t ? Date.now() - t : Infinity;
    const soz = yosh < 90 * 60 * 1000;
    await qayd('beeline', 'Beeline keshi yangilanmayapti',
      soz, t ? ('Oxirgi yangilanish: ' + daqiqa(yosh) + ' daqiqa oldin (10 daqiqada bir bo\'lishi kerak)')
             : 'Kesh hujjati umuman yo\'q');
    natija.push('beeline:' + (soz ? 'ok' : daqiqa(yosh) + 'daq'));
  } catch (e) { natija.push('beeline:tekshirilmadi'); }

  /* 2) KUZATUV — faol kuzatuv bo'lsa, har daqiqada tekshirilishi kerak.
        30 daqiqadan oshsa, demak fon funksiyasi ishlamayapti. */
  try {
    const snap = await db.collection('number_watches').where('active', '==', true).get();
    if (snap.empty) {
      natija.push('kuzatuv:yoq');
    } else {
      let engYangi = 0;
      snap.docs.forEach(d => { engYangi = Math.max(engYangi, vaqtMs(d.data().lastCheckedAt)); });
      const yosh = engYangi ? Date.now() - engYangi : Infinity;
      const soz = yosh < 30 * 60 * 1000;
      await qayd('kuzatuv', 'Raqam kuzatuvi tekshirmayapti',
        soz, engYangi ? ('Oxirgi tekshiruv: ' + daqiqa(yosh) + ' daqiqa oldin (har daqiqada bo\'lishi kerak)')
                      : 'Hech qachon tekshirilmagan');
      natija.push('kuzatuv:' + (soz ? 'ok' : daqiqa(yosh) + 'daq'));
    }
  } catch (e) { natija.push('kuzatuv:tekshirilmadi'); }

  /* 3) KATALOG INDEKSI — narx tahrirlanganda "eskirdi" belgisi qo'yiladi.
        Belgi 2 soatdan beri turgan bo'lsa, demak indeks qayta qurilmayapti. */
  try {
    const s = await db.collection('search_index').doc('dirty').get();
    const t = s.exists ? (Number(s.data().at) || 0) : 0;
    const yosh = t ? Date.now() - t : 0;
    const soz = !t || yosh < 2 * 60 * 60 * 1000;
    await qayd('indeks', 'Katalog indeksi qayta qurilmayapti',
      soz, 'Eskirgan deb belgilangan: ' + daqiqa(yosh) + ' daqiqa oldin');
    natija.push('indeks:' + (soz ? 'ok' : daqiqa(yosh) + 'daq'));
  } catch (e) { natija.push('indeks:tekshirilmadi'); }

  /* 4) ZAXIRA NUSXA — kuniga bir marta olinadi. 30 soatdan oshsa xabar. */
  try {
    const s = await db.collection(HOLAT).doc('soglik_zaxira_vaqt').get();
    const t = s.exists ? (Number(s.data().at) || 0) : 0;
    /* Birinchi ishga tushishda vaqt yo'q — shikoyat qilmaymiz */
    const soz = !t || (Date.now() - t) < 30 * 60 * 60 * 1000;
    await qayd('zaxira', 'Bazaning zaxira nusxasi olinmayapti',
      soz, 'Oxirgi zaxira: ' + daqiqa(Date.now() - t) + ' daqiqa oldin');
    natija.push('zaxira:' + (soz ? 'ok' : 'eski'));
  } catch (e) { natija.push('zaxira:tekshirilmadi'); }

  return { statusCode: 200, body: 'ok: ' + natija.join(', ') };
};
