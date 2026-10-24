// BAZANING KUNLIK ZAXIRA NUSXASI (V119)
// =====================================
// NEGA KERAK. Butun tovar, buyurtmalar, mijozlar va moliya yozuvlari
// bitta Firestore bazasida. Agar kimdir xato bilan o'chirsa, qoidalarda
// teshik topilsa yoki hisob bloklansa — ularni QAYTARIB BO'LMAYDI.
// Saytning kodi GitHub'da saqlanadi, bazaniki esa hech qayerda edi.
//
// NIMA QILADI. Har kuni kechasi Firestore'ning o'z "export" imkoniyatini
// ishga tushiradi: butun baza Firebase Storage'ga, `zaxira/<sana>/`
// papkasiga yoziladi. Bu Google'ning rasmiy mexanizmi — nusxadan
// bazani to'liq tiklash mumkin.
//
// TIKLASH (kerak bo'lib qolsa):
//   gcloud firestore import gs://<bucket>/zaxira/2026-10-24T03-00-00
//
// ESLATMA: eksport Firestore o'qish limitidan hisoblanmaydi, lekin
// Storage joyini egallaydi. Quyida 30 kundan eski nusxalar avtomatik
// o'chiriladi.

const admin = require('firebase-admin');
const { jadvalOk } = require('./lib/jadvalQalqon');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'vip-raqamlar.firebasestorage.app'
  });
}

const LOYIHA = process.env.FIREBASE_PROJECT_ID || 'vip-raqamlar';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'vip-raqamlar.firebasestorage.app';
const SAQLASH_KUN = 30;        // 30 kundan eski nusxalar o'chiriladi

async function telegram(matn) {
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: matn })
    });
  } catch (e) { /* xabar ketmasa ham, zaxira baribir olingan */ }
}

/* Google API uchun kirish tokeni — xizmat hisobidan olinadi
   (qo'shimcha kutubxona kerak emas). */
async function kirishTokeni() {
  const t = await admin.app().options.credential.getAccessToken();
  return t && (t.access_token || t.accessToken);
}

/* 30 kundan eski zaxira papkalarini o'chiradi. Xato bo'lsa — asosiy
   ishga xalaqit bermaydi. */
async function eskilarniTozala() {
  try {
    const chegara = Date.now() - SAQLASH_KUN * 24 * 60 * 60 * 1000;
    const [fayllar] = await admin.storage().bucket(BUCKET).getFiles({ prefix: 'zaxira/' });
    let ochirildi = 0;
    for (const f of fayllar) {
      const vaqt = Date.parse((f.metadata && f.metadata.timeCreated) || '') || 0;
      if (vaqt && vaqt < chegara) { await f.delete().catch(() => {}); ochirildi++; }
    }
    return ochirildi;
  } catch (e) { return -1; }
}

exports.handler = async function (event) {
  if (!(await jadvalOk(event, 'zaxira-background', 60000))) return { statusCode: 403, body: 'forbidden' };

  const sana = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const manzil = 'gs://' + BUCKET + '/zaxira/' + sana;

  try {
    const token = await kirishTokeni();
    if (!token) throw new Error('Xizmat hisobi tokeni olinmadi (FIREBASE_* tekshiring)');

    const res = await fetch(
      'https://firestore.googleapis.com/v1/projects/' + LOYIHA + '/databases/(default):exportDocuments',
      {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputUriPrefix: manzil })
      }
    );
    const javob = await res.json().catch(() => ({}));

    if (!res.ok) {
      const sabab = (javob.error && javob.error.message) || ('HTTP ' + res.status);
      await telegram('⚠️ Zaxira nusxa OLINMADI\n\n' + sabab
        + '\n\nSabab odatda: xizmat hisobida "Cloud Datastore Import Export Admin"'
        + ' huquqi yo\'q. Google Cloud Console → IAM → shu hisobga o\'sha rolni bering.');
      console.error('ZAXIRA XATOSI:', sabab);
      return { statusCode: 500, body: 'zaxira xatosi: ' + sabab };
    }

    /* Sog'liq tekshiruvi (soglik-background.js) shu vaqtga qarab
       "zaxira olinmayapti" deb ogohlantiradi. */
    try{
      await admin.firestore().collection('watch_health').doc('soglik_zaxira_vaqt')
        .set({ at: Date.now(), manzil }, { merge: true });
    }catch(e){}

    const ochirildi = await eskilarniTozala();
    await telegram('💾 Zaxira nusxa olindi\n\n📁 ' + manzil
      + (ochirildi > 0 ? '\n🧹 ' + ochirildi + ' ta eski fayl tozalandi' : ''));
    return { statusCode: 200, body: 'ok: ' + manzil };
  } catch (err) {
    console.error('ZAXIRA XATOSI:', err);
    await telegram('⚠️ Zaxira nusxa olinmadi: ' + (err && err.message));
    return { statusCode: 500, body: 'error' };
  }
};
