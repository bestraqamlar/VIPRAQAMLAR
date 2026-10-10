// ===================================================================
// RAQAM TO'LOVI — TELEGRAM ESLATMASI
// -------------------------------------------------------------------
// Har 5 daqiqada ishga tushadi (netlify.toml) va `number_payments`
// dagi har bir FAOL raqamni tekshiradi.
//
// Admin har raqam uchun O'ZI belgilaydi:
//   dueDate     — keyingi to'lov sanasi
//   remindTime  — eslatma vaqti (Toshkent bo'yicha, "HH:MM")
//   remindDays  — necha kun oldin eslatilsin, masalan [3, 1, 0]
//                 (0 = to'lov kunining o'zida)
//
// Bundan tashqari, sana o'tib ketsa HAR KUNI eslatib turadi va
// o'chirilishga 7 kun qolganda alohida qizil ogohlantirish yuboradi.
// NEGA: to'lov 30 kundan ortiq kechiksa operator raqamni qaytarib
// oladi — qimmat VIP raqam yo'qoladi.
//
// Har bir eslatma FAQAT BIR MARTA ketadi: yuborilgani hujjatdagi
// `sent` xaritasiga belgilanadi ("2026-10-12:d3" kabi kalit bilan).
// "To'landi" bosilganda panel bu xaritani tozalaydi.
//
// Fayl nomi "-background" bilan tugashi MUHIM — Netlify buni uzoqroq
// ishlaydigan Background Function qiladi.
// ===================================================================

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

const COLLECTION = 'number_payments';
const NOTIFY_COLLECTION = 'watch_notify_recipients';
const OCHIRISH_KUNI = 30;      // shu kundan oshsa operator raqamni oladi

/* ---------- yordamchilar ---------- */
const son = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
const esc = (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Toshkent vaqti: {sana:"YYYY-MM-DD", daqiqa: kunning boshidan daqiqa} */
function toshkent() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const p = (x) => String(x).padStart(2, '0');
  return {
    sana: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()),
    daqiqa: d.getHours() * 60 + d.getMinutes()
  };
}
function daqiqaga(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '09:00'));
  if (!m) return 9 * 60;
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]));
}
function kunFarqi(a, b) {
  return Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 86400000);
}

async function sendTelegramMessage(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
  } catch (e) { /* xabar ketmasa ham tekshiruv davom etadi */ }
}

async function notifyAdmin(text) {
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token) return;
  if (chatId) await sendTelegramMessage(token, chatId, text);
  try {
    const snap = await db.collection(NOTIFY_COLLECTION).get();
    await Promise.all(snap.docs.map(d => {
      const extra = d.data().chatId;
      return extra ? sendTelegramMessage(token, extra, text) : null;
    }));
  } catch (e) { /* qo'shimcha ro'yxat o'qilmasa ham asosiysi ketdi */ }
}

/* Xabar matni — "shu raqamni oylik to'lovini to'lab qo'ying, summa" */
function xabar(r, tur, kech) {
  const credit = Number(r.creditMonthly) || 0;
  const tarif = Number(r.tariffMonthly) || 0;
  const oylik = credit + tarif;
  const jami = credit * (Number(r.totalMonths) || 0);
  const tolangan = credit * (Number(r.paidMonths) || 0);
  const qolgan = Math.max(0, jami - tolangan);
  const oy = (Number(r.paidMonths) || 0) + 1;

  let bosh;
  if (tur === 'oldin')  bosh = `⏳ <b>To'lovga ${kech} kun qoldi</b>`;
  else if (tur === 'kun') bosh = `💳 <b>BUGUN to'lov kuni</b>`;
  else if (tur === 'xavf') bosh = `🚨 <b>DIQQAT! Raqam o'chirilishi mumkin</b>`;
  else bosh = `⚠️ <b>To'lov ${kech} kun kechikdi</b>`;

  const qator = [
    bosh,
    '',
    `📱 <b>${esc(r.number || '')}</b>${r.operator ? ' · ' + esc(r.operator) : ''}`,
    `${esc(r.tariffName || 'Tarif ko\'rsatilmagan')}`,
    '',
    `Shu raqamning oylik to'lovini to'lab qo'ying:`,
    `💰 <b>${son(oylik)} so'm</b>`,
    `     • muddatli to'lov: ${son(credit)} so'm`,
    tarif ? `     • oylik tarif: ${son(tarif)} so'm` : null,
    '',
    `🗓 To'lov sanasi: <b>${esc(r.dueDate || '')}</b>`,
    `📊 ${oy}-oy / ${Number(r.totalMonths) || 0} oy`,
    `🧾 Qolgan qarz: ${son(qolgan)} so'm`
  ];

  if (tur === 'kech' || tur === 'xavf') {
    const qoldi = OCHIRISH_KUNI - kech;
    qator.push('');
    qator.push(qoldi > 0
      ? `❗️ Raqam o'chirilishiga <b>${qoldi} kun</b> qoldi (30 kundan oshsa operator qaytarib oladi).`
      : `❗️ 30 kundan oshdi — operator bilan ZUDLIK bilan bog'laning.`);
  }
  if (r.note) { qator.push(''); qator.push(`📝 ${esc(r.note)}`); }

  return qator.filter(x => x !== null).join('\n');
}

exports.handler = async function () {
  try {
    const { sana, daqiqa } = toshkent();
    const snap = await db.collection(COLLECTION).get();

    let yuborildi = 0;
    for (const doc of snap.docs) {
      const r = doc.data() || {};
      if (r.status === 'archived') continue;
      if (!r.dueDate) continue;
      /* To'liq to'langan raqamga eslatma kerak emas */
      if ((Number(r.paidMonths) || 0) >= (Number(r.totalMonths) || 0) && Number(r.totalMonths)) continue;
      /* Admin belgilagan vaqt hali kelmagan bo'lsa — kutamiz */
      if (daqiqa < daqiqaga(r.remindTime)) continue;

      const kech = kunFarqi(sana, r.dueDate);   // musbat = kechikdi
      const sent = r.sent || {};
      let tur = null, kalit = null;

      if (kech > 0) {
        /* Kechikkan — har kuni bir marta; 23-kundan boshlab "xavf" */
        tur = (OCHIRISH_KUNI - kech) <= 7 ? 'xavf' : 'kech';
        kalit = sana + ':' + tur;
      } else {
        const kunlar = Array.isArray(r.remindDays) && r.remindDays.length ? r.remindDays : [0];
        const qoldi = -kech;                     // necha kun qoldi
        if (kunlar.indexOf(qoldi) > -1) {
          tur = qoldi === 0 ? 'kun' : 'oldin';
          kalit = r.dueDate + ':d' + qoldi;
        }
      }

      if (!tur || sent[kalit]) continue;

      await notifyAdmin(xabar(r, tur, kech > 0 ? kech : -kech));
      /* Faqat shu kalitni belgilaymiz — qolgan eslatmalar o'z vaqtida
         ketadi. DIQQAT: kalit ichida "-" va ":" bor va u raqam bilan
         boshlanadi, shu sabab oddiy "sent.KALIT" matni ishlamaydi —
         Firestore uni yo'l (path) deb noto'g'ri o'qiydi. FieldPath
         har qanday nomni xavfsiz oladi. */
      await doc.ref.update(new admin.firestore.FieldPath('sent', kalit), true);
      yuborildi++;
    }

    return { statusCode: 200, body: `ok, ${yuborildi} ta eslatma yuborildi` };
  } catch (err) {
    console.error('tolov-eslatma-background xato:', err);
    return { statusCode: 500, body: 'error' };
  }
};
