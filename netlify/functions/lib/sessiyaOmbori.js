// OPERATOR SESSIYALARI UCHUN UMUMIY OMBOR (V134)
// ==============================================
// NEGA KERAK. Humans'da qidiruvdan oldin anonim sessiya ochish shart
// (joinAnonymous) — ya'ni ikkita ketma-ket so'rov. Ilgari sessiya
// faqat funksiyaning O'Z XOTIRASIDA saqlanardi, Netlify funksiyasi
// esa har safar deyarli yangidan ishga tushadi (cold start). Natijada
// mijoz uchun kesh deyarli har doim bo'sh bo'lardi va har qidiruv
// ikkita to'liq borib-kelishga teng edi — "Humans sekin" degan
// shikoyatning sababi aynan shu.
//
// Endi sessiya Firestore'ga ham yoziladi: bitta hujjatni o'qish
// ~20-40 ms, Humans'dan sessiya olish esa ~300-800 ms.
//
// XAVFSIZLIK. Bu to'plam brauzerdan UMUMAN o'qilmaydi (Firestore
// qoidalarida ro'yxatga olinmagan yo'llar to'liq yopiq). Ichida
// faqat operatorning vaqtinchalik anonim sessiya tokeni bor —
// mijozga ham, bizga ham tegishli shaxsiy ma'lumot emas.
//
// MUHIM: `lib/operators.js` ataylab Firestore'ni bilmaydi (u faqat
// operator API'lari bilan ishlaydi va testda mustaqil ishga tushishi
// kerak). Shuning uchun ombor unga TASHQARIDAN beriladi:
//     const { sessiyaOmbori } = require('./lib/sessiyaOmbori');
//     sessiyaOmboriQoy(sessiyaOmbori(db));

const TOPLAM = 'operator_sessions';

function sessiyaOmbori(db) {
  if (!db) return null;
  return {
    async ol(nom) {
      const snap = await db.collection(TOPLAM).doc(String(nom)).get();
      if (!snap.exists) return null;
      const d = snap.data() || {};
      if (!(Number(d.expiresAt) > Date.now())) return null;
      return d;
    },
    async yoz(nom, qiymat, ttlMs) {
      const q = qiymat || {};
      await db.collection(TOPLAM).doc(String(nom)).set({
        token: String(q.token || ''),
        userID: String(q.userID || ''),
        /* Muddat qiymatning o'zidan olinadi; berilmagan bo'lsa ttl'dan */
        expiresAt: Number(q.expiresAt) || (Date.now() + (Number(ttlMs) || 240000)),
        at: Date.now()
      });
    },
    async ochir(nom) {
      await db.collection(TOPLAM).doc(String(nom)).delete();
    }
  };
}

module.exports = { sessiyaOmbori, SESSIYA_TOPLAMI: TOPLAM };
