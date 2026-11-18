// MINI ILOVADA KODSIZ KIRISH (V136)
// =================================
// Telegram mini ilovaga kirgan odamni bot ALLAQACHON taniydi. Telegram
// sahifaga `initData` beradi va uni BOT KALITI bilan IMZOLAYDI. Ya'ni
// imzoni serverda tekshirib, "bu haqiqatan ham Telegram'dagi falon
// foydalanuvchi" deb ishonch hosil qilsa bo'ladi.
//
// Shu sabab mini ilovada kabinet uchun KOD SO'RASH SHART EMAS: imzo
// to'g'ri bo'lsa, chat ID bo'yicha telefon topiladi va kabinet darhol
// ochiladi.
//
// ===================== XAVFSIZLIK =====================
// Bu funksiyaning butun ishonchi IMZOGA tayanadi, shuning uchun
// tekshiruv Telegram hujjatidagidek, qat'iy bajariladi:
//
//   1) `initData` — URL ko'rinishidagi satr. `hash` maydoni ajratib
//      olinadi, qolgan maydonlar kalit bo'yicha alifbo tartibida
//      "kalit=qiymat" ko'rinishida \n bilan birlashtiriladi.
//   2) Maxfiy kalit: HMAC-SHA256(kalit="WebAppData", ma'lumot=BOT_TOKEN).
//   3) Kutilgan imzo: HMAC-SHA256(kalit=maxfiy kalit, ma'lumot=1-banddagi satr).
//   4) Kelgan `hash` bilan VAQT BO'YICHA TENG taqqoslanadi.
//
// Qo'shimcha:
//   * `auth_date` 24 soatdan eski bo'lsa — rad etiladi (eski
//     `initData` ni qayta ishlatib bo'lmasin);
//   * imzo faqat BOT TOKENI bilan yasaladi, token esa faqat serverda —
//     ya'ni brauzerdan soxta `initData` yasash MUMKIN EMAS;
//   * chat ID bo'yicha telefon topilmasa, kabinet OCHILMAYDI — mijozdan
//     avval botda raqamini tasdiqlash so'raladi (kabinet_chatids).
//
// MUHIM: bu yerda `user.id` ga ISHONILADI, lekin u FAQAT imzo
// to'g'ri bo'lgandagina ishlatiladi. Imzosiz hech narsa qaytarilmaydi.

const admin = require('firebase-admin');
const crypto = require('crypto');
const { tezlikOk } = require('./lib/tezlik');
const { kabinetToken } = require('./lib/kabinetToken');

let ULANISH_XATOSI = null;
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  } catch (e) { ULANISH_XATOSI = (e && e.message) || "sabab noma'lum"; }
}
let db = null;
if (!ULANISH_XATOSI && admin.apps.length) {
  db = admin.firestore();
  try { db.settings({ preferRest: true }); } catch (e) {}
}

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-firebase-appcheck, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const javob = (kod, obj) => ({ statusCode: kod, headers: CORS, body: JSON.stringify(obj) });

const BOT_NOMI = String(process.env.CUSTOMER_BOT_USERNAME || 'vip_raqamlar_bot').replace(/[^\w]/g, '');
const ENG_KOP_YOSH_MS = 24 * 60 * 60 * 1000;

/* Telegram imzosini tekshiradi. To'g'ri bo'lsa foydalanuvchini
   qaytaradi, aks holda null. */
function initDataTekshir(initData, botToken) {
  if (!initData || !botToken) return null;
  let p;
  try { p = new URLSearchParams(String(initData)); } catch (e) { return null; }

  const hash = p.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return null;
  p.delete('hash');
  /* `signature` maydoni (yangi Telegram versiyalarida) hisobga
     KIRMAYDI — Telegram hujjatida shunday. */
  p.delete('signature');

  const qatorlar = [];
  for (const [k, v] of p.entries()) qatorlar.push(k + '=' + v);
  qatorlar.sort();
  const matn = qatorlar.join('\n');

  const maxfiy = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const kutilgan = crypto.createHmac('sha256', maxfiy).update(matn).digest('hex');

  const a = Buffer.from(kutilgan, 'utf8');
  const bb = Buffer.from(String(hash).toLowerCase(), 'utf8');
  if (a.length !== bb.length || !crypto.timingSafeEqual(a, bb)) return null;

  /* Eski `initData` ni qayta ishlatishning oldini olamiz */
  const authDate = Number(p.get('auth_date')) || 0;
  if (!authDate || (Date.now() - authDate * 1000) > ENG_KOP_YOSH_MS) return null;

  let user = null;
  try { user = JSON.parse(p.get('user') || 'null'); } catch (e) {}
  if (!user || !/^\d{3,20}$/.test(String(user.id || ''))) return null;

  return { id: String(user.id), ism: String(user.first_name || '').slice(0, 64) };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return javob(405, { ok: false, error: 'Faqat POST' });
  if (!db) {
    console.error('API-KABINET-TG: Firebase ulanmagan:', ULANISH_XATOSI);
    return javob(503, { ok: false, error: "Hozir ochib bo'lmadi. Birozdan keyin qayta urining." });
  }
  if (!(await tezlikOk(db, event, 'kabinet_tg_rate_limits', 60))) {
    return javob(429, { ok: false, error: "Juda ko'p urinish. Birozdan so'ng urinib ko'ring." });
  }

  let kirish = {};
  try { kirish = JSON.parse(event.body || '{}'); } catch (e) {}

  const botToken = process.env.CUSTOMER_BOT_TOKEN;
  if (!botToken) {
    console.error('API-KABINET-TG: CUSTOMER_BOT_TOKEN sozlanmagan');
    return javob(503, { ok: false, error: "Sozlama to'liq emas" });
  }

  const user = initDataTekshir(kirish.initData, botToken);
  if (!user) {
    /* Imzo noto'g'ri yoki eskirgan — hech narsa aytmaymiz, mijoz
       oddiy (kod bilan) yo'ldan kiradi. */
    return javob(200, { ok: false, error: "Telegram ma'lumoti tasdiqlanmadi" });
  }

  /* Chat ID bo'yicha telefonni topamiz. `kabinet_chatids` hujjatining
     ID'si — telefon, ichida esa chatId. Shu sabab teskari qidiruv. */
  let tel9 = '';
  try {
    const snap = await db.collection('kabinet_chatids').where('chatId', '==', String(user.id)).limit(1).get();
    if (!snap.empty) tel9 = String(snap.docs[0].id || '').replace(/\D/g, '').slice(-9);
  } catch (e) {
    console.error('API-KABINET-TG qidiruv xatosi:', (e && e.message) || e);
  }

  /* Zaxira yo'l: eski mijozlarda bog'lanish bo'lmasligi mumkin, lekin
     buyurtmasida `customerChatId` bor. Shuni topib, bog'lanishni ham
     yozib qo'yamiz — keyingi safar birinchi qidiruvdayoq topiladi. */
  if (!tel9) {
    try {
      const b = await db.collection('orders').where('customerChatId', '==', String(user.id)).limit(5).get();
      for (const d of b.docs) {
        const t = String((d.data() || {}).phoneNormalized || '').replace(/\D/g, '').slice(-9);
        if (/^\d{9}$/.test(t)) { tel9 = t; break; }
      }
      if (tel9) {
        await db.collection('kabinet_chatids').doc(tel9).set({
          chatId: String(user.id), at: Date.now(), source: 'miniapp'
        }, { merge: true });
      }
    } catch (e) {}
  }

  if (!/^\d{9}$/.test(tel9)) {
    /* Raqam hali bog'lanmagan — mijoz botda bir marta tasdiqlashi
       kerak. Mini ilovadan botga o'tish havolasi beriladi. */
    return javob(200, {
      ok: false, bogla: true, botNomi: BOT_NOMI,
      havola: 'https://t.me/' + BOT_NOMI + '?start=kabinet',
      error: "Telefon raqamingiz hali tasdiqlanmagan. Botda bir marta «📱 Raqamimni yuborish» tugmasini bosing."
    });
  }

  return javob(200, { ok: true, token: kabinetToken.yarat(tel9), phone: tel9 });
};
