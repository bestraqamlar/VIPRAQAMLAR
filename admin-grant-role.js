// BIR MARTALIK / KAM ISHLATILADIGAN QUROL: bir Firebase hisobiga
// haqiqiy ADMIN huquqini (custom claim: admin=true) berish uchun.
//
// NEGA KERAK: Firebase Authentication'da "ro'yxatdan o'tgan" bo'lish
// bilan "admin" bo'lish bir xil narsa emas. Ilgari bu loyihada har
// qanday tizimga kirgan (verifyIdToken muvaffaqiyatli o'tgan) hisob
// AVTOMATIK admin deb hisoblanardi — bu og'ir xavfsizlik kamchiligi
// edi. Endi faqat shu funksiya orqali, MAXFIY SIRDAN (ADMIN_BOOTSTRAP_SECRET)
// foydalanib, aniq belgilangan hisoblarga admin huquqi beriladi.
//
// QANDAY ISHLATISH (bir martalik sozlash):
//   1. Netlify saytingiz sozlamalarida (Site settings → Environment
//      variables) yangi o'zgaruvchi qo'shing:
//         ADMIN_BOOTSTRAP_SECRET = <o'zingiz o'ylab topgan uzun, tasodifiy
//                                    parol, masalan 40+ belgili>
//      Buni hech kimga aytmang, kodga yozmang — faqat Netlify
//      muhitida saqlanadi.
//   2. panel-boshqaruv.html orqali (yoki Firebase konsolida) admin bo'lishi kerak
//      bo'lgan hisobni oddiy foydalanuvchi sifatida ro'yxatdan o'tkazing
//      (agar hali yo'q bo'lsa).
//   3. Terminal yoki Postman orqali quyidagi so'rovni yuboring:
//
//      curl -X POST https://SIZNING-SAYTINGIZ.netlify.app/.netlify/functions/admin-grant-role \
//        -H "Content-Type: application/json" \
//        -H "x-bootstrap-secret: <1-qadamda qo'ygan parolingiz>" \
//        -d '{"email":"admin-hisobingiz-emaili@070.uz"}'
//
//   "BOSHQARUV" bo'limi (admin qo'shish, ruxsatlar) faqat ENG KATTA
//   (bosh/super) adminga ochiq. O'zingizning asosiy hisobingizni bosh
//   admin qilish uchun so'rovga qo'shimcha "superAdmin":true yuboring:
//
//      curl -X POST https://SIZNING-SAYTINGIZ.netlify.app/.netlify/functions/admin-grant-role \
//        -H "Content-Type: application/json" \
//        -H "x-bootstrap-secret: <1-qadamda qo'ygan parolingiz>" \
//        -d '{"email":"admin-hisobingiz-emaili@070.uz","superAdmin":true}'
//
//   Bu huquqni FAQAT shu yo'l bilan (qo'lda, maxfiy kalit orqali) berish
//   mumkin — "Boshqaruv" bo'limi orqali yaratilgan hech qanday sub-admin
//   bu huquqqa hech qachon ega bo'lolmaydi.
//
//      (panel-boshqaruv.html'da login "070xxxxxxx@070.uz" ko'rinishida email
//      sifatida ishlatilishini unutmang — panel-boshqaruv.html:1498-1508 qarang.)
//
//   4. Javobda "ok": true kelsa — tayyor. LEKIN: agar bu hisob allaqachon
//      brauzerda tizimga kirgan bo'lsa, u chiqib qayta kirishi (yoki
//      sahifani to'liq yangilashi) kerak — Firebase ID token faqat
//      qayta autentifikatsiyada yangi huquqni "his qiladi".
//
//   5. XAVFSIZLIK UCHUN: barcha kerakli adminlarga huquq berib
//      bo'lgach, ADMIN_BOOTSTRAP_SECRET o'zgaruvchisini Netlify'dan
//      O'CHIRIB TASHLANG (yoki qiymatini boshqasiga almashtiring) —
//      shunda bu funksiya boshqa hech kim tomonidan ishlatilmaydi.
//      Kerak bo'lganda keyinchalik qayta qo'shib, yangi admin
//      qo'shishingiz mumkin.

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

function timingSafeEqualStr(a, b) {
  const crypto = require('crypto');
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'ADMIN_BOOTSTRAP_SECRET sozlanmagan. Netlify environment variables bo\'limiga qo\'shing (fayl ichidagi izohga qarang).' })
    };
  }

  const providedSecret = event.headers['x-bootstrap-secret'] || event.headers['X-Bootstrap-Secret'] || '';
  if (!providedSecret || !timingSafeEqualStr(providedSecret, bootstrapSecret)) {
    return { statusCode: 403, body: JSON.stringify({ ok: false, error: "Noto'g'ri maxfiy so'z" }) };
  }

  try {
    const { email, uid, revoke, superAdmin } = JSON.parse(event.body || '{}');
    if (!email && !uid) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "email yoki uid ko'rsatilishi shart" }) };
    }

    const userRecord = uid ? await admin.auth().getUser(uid) : await admin.auth().getUserByEmail(email);

    // Mavjud claim'larni (masalan "Boshqaruv" orqali berilgan `perms`)
    // saqlab qolamiz — setCustomUserClaims BUTUN obyektni ALMASHTIRADI,
    // shu sabab uni o'qib, ustiga qo'shib yozamiz.
    const existingClaims = userRecord.customClaims || {};
    const newClaims = revoke
      ? { ...existingClaims, admin: false, superAdmin: false }
      : {
          ...existingClaims,
          admin: true,
          // ENG KATTA (bosh) admin huquqi — FAQAT shu maxfiy-kalit-bilan
          // himoyalangan yo'ldan, aniq so'ralganda beriladi. Ilova ichidan
          // (Boshqaruv bo'limidan) bu huquqni HECH KIMGA berib bo'lmaydi.
          superAdmin: superAdmin === true ? true : (existingClaims.superAdmin === true)
        };
    await admin.auth().setCustomUserClaims(userRecord.uid, newClaims);

    // Huquq bekor qilinganda (revoke) — eski, hali muddati o'tmagan
    // tokenlarni ham DARHOL bekor qilamiz, aks holda hisob 10 daqiqagacha
    // ishlashda davom etishi mumkin edi.
    if (revoke) {
      await admin.auth().revokeRefreshTokens(userRecord.uid);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        uid: userRecord.uid,
        email: userRecord.email,
        admin: !revoke,
        superAdmin: newClaims.superAdmin === true,
        note: revoke
          ? 'Bu hisobning huquqi darhol bekor qilindi.'
          : 'Bu hisob keyingi safar tizimga kirganda (yoki tokenni yangilaganda) admin huquqiga ega bo\'ladi.'
      })
    };
  } catch (err) {
    console.error('ADMIN-GRANT-ROLE XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
