// STORIES HISOBLAGICHI — ko'rishlar va yurakchalar.
//
// ============================ NEGA KERAK ============================
// Ilgari brauzerning O'ZI Firestore'ga yozardi: `views: eski + 1`,
// `likes: eski ± 1`. Firestore qoidalari faqat "bir qadam" o'zgarishga
// ruxsat berardi — ya'ni bir urinishda 1 000 000 qilib yozib bo'lmasdi.
// LEKIN hech narsa SONINI cheklamasdi: oddiy skript bilan o'sha +1
// so'rovini sekundda yuzlab marta yuborib, hisobni xohlagancha
// shishirib yuborish mumkin edi. Natijada admin paneldagi "nechta
// ko'rilgan" soni YOLG'ON bo'lib qolardi.
//
// Mijoz talabi aniq: "admin panelda HAQIQIY nechta ko'rilgan bo'lsa
// o'sha ko'rsatilsin". Shuning uchun hisoblagich brauzerdan olib
// tashlandi va shu funksiyaga ko'chirildi.
//
// ============================ HIMOYA QATLAMLARI ============================
//  1. IP bo'yicha soatlik chegara (lib/tezlik.js) — bitta IP soatiga
//     400 ta so'rovdan oshsa, 429 qaytadi.
//  2. KO'RISH takrorlanmaydi: har IP + story uchun oxirgi sanalgan
//     vaqt saqlanadi; 6 soat o'tmasa qayta sanalmaydi.
//  3. YURAKCHA: har IP + story uchun holat saqlanadi — ikki marta
//     "like" yoki bosilmagan "like-ol" hisobni o'zgartirmaydi.
//  4. Yozish `FieldValue.increment` bilan — ikki odam bir vaqtda
//     bosganda ham son yo'qolmaydi (brauzerdagi "eski+1" da yo'qolardi).
//  5. Faqat POST, faqat mavjud story, id uzunligi cheklangan.
//
// Firestore qoidalarida brauzer uchun `stories` YOZISH butunlay
// yopilgan — ya'ni bu funksiyani chetlab o'tib yozish imkoni yo'q.

const admin = require('firebase-admin');
const { tezlikOk, ipOl } = require('./lib/tezlik');

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

/* Bitta ko'rish necha vaqtdan keyin qayta sanaladi */
const KOR_QAYTA_MS = 6 * 60 * 60 * 1000;
/* Bitta IP soatiga nechta so'rov yuborishi mumkin */
const SOATLIK_CHEGARA = 400;

function javob(statusCode, obj) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(obj)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return javob(204, {});
  if (event.httpMethod !== 'POST') return javob(405, { ok: false, error: 'Faqat POST' });

  if (!(await tezlikOk(db, event, 'story_stat_rate_limits', SOATLIK_CHEGARA))) {
    return javob(429, { ok: false, error: "Juda ko'p so'rov" });
  }

  let kirish;
  try { kirish = JSON.parse(event.body || '{}'); }
  catch (e) { return javob(400, { ok: false, error: "Noto'g'ri JSON" }); }

  const amal = String(kirish.amal || '');
  /* Firestore hujjat id'si: harf/raqam/tire/pastki tire, 40 belgigacha.
     MUHIM: id QIRQILMAYDI. Avval `.slice(0, 40)` qilinardi — natijada
     300 belgili soxta id ham qirqilib "to'g'ri" bo'lib qolardi va
     butunlay boshqa hujjatga tushish ehtimoli bor edi. Endi uzun yoki
     begona belgili id BUTUNLAY rad etiladi. */
  const id = String(kirish.id == null ? '' : kirish.id);
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return javob(400, { ok: false, error: "Noto'g'ri id" });
  if (!['kor', 'like', 'like-ol'].includes(amal)) return javob(400, { ok: false, error: "Noma'lum amal" });

  const ip = ipOl(event);
  const storyRef = db.collection('stories').doc(id);
  /* Bitta IP uchun bitta hujjat: ichida shu IP qaysi story'ni qachon
     ko'rgani va yurakcha bosgani turadi. Hujjat kichik va IP bo'yicha
     ajratilgani uchun yozuvlar bir-biriga urilmaydi. */
  const izRef = db.collection('story_iz').doc(ip);

  try {
    const [storySnap, izSnap] = await Promise.all([storyRef.get(), izRef.get()]);
    if (!storySnap.exists) return javob(404, { ok: false, error: 'Story topilmadi' });

    const story = storySnap.data() || {};
    const iz = izSnap.exists ? (izSnap.data() || {}) : {};
    const endi = Date.now();

    let views = Number(story.views) || 0;
    let likes = Number(story.likes) || 0;
    const likesBaza = Number(story.likesBaza) || 0;

    if (amal === 'kor') {
      const oxirgi = Number((iz.kor || {})[id]) || 0;
      if (endi - oxirgi < KOR_QAYTA_MS) {
        /* Yaqinda sanalgan — qayta sanamaymiz (lekin xato ham emas) */
        return javob(200, { ok: true, views, likes, likesBaza, yangi: false });
      }
      await Promise.all([
        storyRef.update({ views: admin.firestore.FieldValue.increment(1) }),
        /* MUHIM: `set` da nuqtali kalit ("kor.ABC") NUQTALI NOM bo'lib
           yoziladi, ichma-ich maydon bo'lmaydi. Shu sabab ichma-ich
           obyekt beramiz — `merge: true` uni to'g'ri qo'shadi. */
        izRef.set({ kor: { [id]: endi }, lastAt: endi }, { merge: true })
      ]);
      return javob(200, { ok: true, views: views + 1, likes, likesBaza, yangi: true });
    }

    /* ---- yurakcha ---- */
    const bosgan = !!(iz.like || {})[id];
    const istak = (amal === 'like');
    if (bosgan === istak) {
      /* Holat allaqachon shunday — hisob o'zgarmaydi */
      return javob(200, { ok: true, views, likes, likesBaza, yangi: false });
    }
    const qadam = istak ? 1 : -1;
    if (!istak && likes <= 0) {
      return javob(200, { ok: true, views, likes: 0, likesBaza, yangi: false });
    }
    await Promise.all([
      storyRef.update({ likes: admin.firestore.FieldValue.increment(qadam) }),
      izRef.set({ like: { [id]: istak }, lastAt: endi }, { merge: true })
    ]);
    return javob(200, {
      ok: true, views,
      likes: Math.max(0, likes + qadam), likesBaza, yangi: true
    });
  } catch (err) {
    console.error('api-story-stat xato:', err);
    /* Hisoblagich sayt ishlashiga ta'sir qilmaydi — jim 200 qaytaramiz */
    return javob(200, { ok: false });
  }
};
