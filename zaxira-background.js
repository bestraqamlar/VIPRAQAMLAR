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
    const bucket = admin.storage().bucket(BUCKET);
    /* V120: ikkala papka ham tozalanadi — rasmiy eksport (`zaxira/`)
       va zaxira yo'l bilan olingan JSON nusxalar (`zaxira-json/`).
       Ilgari faqat birinchisi tozalanardi, ya'ni JSON nusxalar
       cheksiz to'planib, Storage joyini yeb borardi. */
    let ochirildi = 0;
    for (const prefix of ['zaxira/', 'zaxira-json/']) {
      const [fayllar] = await bucket.getFiles({ prefix });
      for (const f of fayllar) {
        const vaqt = Date.parse((f.metadata && f.metadata.timeCreated) || '') || 0;
        if (vaqt && vaqt < chegara) { await f.delete().catch(() => {}); ochirildi++; }
      }
    }
    return ochirildi;
  } catch (e) { return -1; }
}

/* ==================================================================
   ZAXIRA YO'L (V120) — ROLSIZ ISHLAYDIGAN JSON NUSXA
   ------------------------------------------------------------------
   MUAMMO. Yuqoridagi rasmiy eksport ("exportDocuments") xizmat
   hisobida ALOHIDA huquq talab qiladi: "Cloud Datastore Import Export
   Admin". U berilmagan bo'lsa Google "The caller does not have
   permission" deydi va zaxira UMUMAN olinmaydi. Ya'ni eng kerakli
   paytda — baza buzilganda — hech narsa yo'q bo'lardi.

   YECHIM. Rasmiy eksport ishlamasa, ZAXIRA YO'L ishga tushadi:
   muhim to'plamlar Admin SDK bilan o'qilib, JSON fayl sifatida
   Storage'ga yoziladi (`zaxira-json/<sana>/<toplam>.json`). Buning
   uchun hech qanday qo'shimcha rol KERAK EMAS — Admin SDK bazani
   o'qishga va Storage'ga yozishga allaqachon haqli.

   Bu rasmiy eksportning O'RNINI bosmaydi (uni `gcloud firestore
   import` bilan bir buyruqda tiklash mumkin, JSON'ni esa qo'lda yoki
   skript bilan tiklash kerak), LEKIN hech narsadan ko'ra ancha yaxshi:
   mijozlar, buyurtmalar, shartnomalar va narxlar saqlanib qoladi.

   ESLATMA: Firestore sana maydonlari JSON'da
   {"_seconds":...,"_nanoseconds":...} ko'rinishida saqlanadi —
   tiklashda shuni hisobga olish kerak.
   ================================================================== */
const JSON_TOPLAMLAR = [
  /* Eng muhimlari oldinda: vaqt yetmay qolsa ham shular saqlanadi */
  'credit_contracts', 'orders', 'custom_orders', 'manual_customers',
  'personal_numbers', 'number_payments', 'sellers', 'seller_messages',
  'numbers', 'number_price_categories', 'operator_config', 'site_settings',
  'promo_codes', 'admins', 'admin_tasks', 'number_watches',
  'watch_notify_recipients', 'stories', 'video_testimonials',
  'vacancies', 'job_applications', 'hamkor_arizalari',
  'seller_plan_requests', 'tolov_tranzaksiya', 'known_customers',
  /* V130: mijozning "telefon -> Telegram" bog'lanishi. Yo'qolsa har
     bir mijoz kabinetga kirish uchun qaytadan botda tasdiqlashga
     majbur bo'lardi — shuning uchun zaxiraga ham kiradi. */
  'kabinet_chatids'
];
/* Jadvalli funksiyaning umumiy muddati ~30 soniya. 20 soniyadan
   oshmaymiz — qolgani xabar yuborish va tozalashga kerak. */
const JSON_MAX_MS = 20000;
const JSON_MAX_HUJJAT = 20000;

async function jsonZaxira(sana) {
  const db = admin.firestore();
  const bucket = admin.storage().bucket(BUCKET);
  const boshlandi = Date.now();
  const saqlandi = [], otkazildi = [];

  for (const nom of JSON_TOPLAMLAR) {
    if (Date.now() - boshlandi > JSON_MAX_MS) { otkazildi.push(nom); continue; }
    try {
      const snap = await db.collection(nom).limit(JSON_MAX_HUJJAT).get();
      if (snap.empty) { saqlandi.push(nom + ':0'); continue; }
      const rows = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      const buf = Buffer.from(JSON.stringify(rows), 'utf8');
      await bucket.file('zaxira-json/' + sana + '/' + nom + '.json')
        .save(buf, { contentType: 'application/json; charset=utf-8', resumable: false });
      saqlandi.push(nom + ':' + rows.length);
    } catch (e) {
      otkazildi.push(nom + '(xato)');
      console.error('ZAXIRA-JSON', nom, (e && e.message) || e);
    }
  }
  return { saqlandi, otkazildi, ms: Date.now() - boshlandi };
}

/* Xizmat hisobining manzili — xabarda ko'rsatiladi, shunda admin uni
   Google Cloud Console'ga nusxalab qo'yadi (bu maxfiy ma'lumot emas). */
function xizmatHisobi() {
  return process.env.FIREBASE_CLIENT_EMAIL || '(FIREBASE_CLIENT_EMAIL sozlanmagan)';
}

function yoriqnoma() {
  return '\n\n──────────'
    + '\nRASMIY EKSPORTNI YOQISH (bir martalik, 2 daqiqa):'
    + '\n1. console.cloud.google.com → loyiha: ' + LOYIHA
    + '\n2. IAM & Admin → IAM → "Grant access"'
    + '\n3. Principal: ' + xizmatHisobi()
    + '\n4. Role: Cloud Datastore Import Export Admin'
    + '\n5. Save. Ertangi zaxiradan boshlab rasmiy eksport ishlaydi.';
}

/* ==================================================================
   TEZLIK HISOBLAGICHLARINI TOZALASH (V124)
   ------------------------------------------------------------------
   Sayt bir nechta joyda IP bo'yicha soatlik hisoblagich yuritadi
   (buyurtma, SMS, kabinet, QR, stories). Ularning har biri uchun
   Firestore'da HAR BIR IP manzilga alohida hujjat yaratiladi —
   lekin hech kim ularni O'CHIRMASDI. Ya'ni bir yilda o'n minglab
   keraksiz hujjat to'planib qolardi: zarar qilmaydi (o'qish aniq
   hujjat ID bo'yicha boradi), lekin joy va pul yeydi, zaxira
   nusxasini ham shishiradi.
   Endi kunlik zaxira bilan birga 3 kundan eski hisoblagichlar
   o'chiriladi. Hisoblagichning o'zi SOATLIK, ya'ni 3 kundan eskisi
   hech qanday himoya bermaydi. */
const HISOBLAGICH_TOPLAMLAR = [
  'order_lookup_rate_limits',
  'order_create_rate_limits',
  'sms_verifications_ip',
  'contract_qr_rate_limits',
  'story_stat_rate_limits',
  'kabinet_code_rate_limits',
  'kabinet_code_check_limits',
  'kabinet_tg_rate_limits',
  /* Kirish kodlari — 5 daqiqalik, lekin tekshirilmagani o'chmasdan
     qoladi. 3 kundan eskisi aniq keraksiz. */
  'kabinet_login_codes',
  'kabinet_login_nonces',
  'kabinet_login_keys'
  /* DIQQAT: `kabinet_chatids` bu ro'yxatda YO'Q va bo'lmasligi ham
     kerak — u vaqtinchalik hisoblagich emas, mijozning doimiy
     "telefon -> Telegram" bog'lanishi. O'chirilsa mijoz qaytadan
     botda tasdiqlashga majbur bo'lardi.
     `kabinet_login_fails` ham yo'q: u kunlik/soatlik kalit bilan
     ishlaydi va hajmi kichik, lekin o'chirilsa chegara nolga
     tushib, taxmin qilish yo'li ochilardi. */
];

async function hisoblagichlarniTozala() {
  const db = admin.firestore();
  const chegara = Date.now() - 3 * 24 * 60 * 60 * 1000;
  let ochirildi = 0;
  for (const nom of HISOBLAGICH_TOPLAMLAR) {
    try {
      /* Bir yurishda ko'pi bilan 2000 ta — funksiya muddatiga
         sig'ishi uchun. Qolgani ertangi kuni o'chiriladi. */
      const snap = await db.collection(nom).limit(2000).get();
      let paket = db.batch(), n = 0;
      for (const d of snap.docs) {
        const x = d.data() || {};
        const oxirgi = Number(x.lastAttemptAt || x.lastAt || x.sentAt || x.expiresAt || 0);
        if (oxirgi && oxirgi < chegara) {
          paket.delete(d.ref); n++; ochirildi++;
          /* Firestore bitta paketga 500 tadan ko'p amal qabul qilmaydi */
          if (n >= 450) { await paket.commit(); paket = db.batch(); n = 0; }
        }
      }
      if (n) await paket.commit();
    } catch (e) {
      console.error('HISOBLAGICH TOZALASH', nom, (e && e.message) || e);
    }
  }
  return ochirildi;
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
      console.error('ZAXIRA (rasmiy eksport) XATOSI:', sabab);

      /* V120: rasmiy eksport ishlamadi — ZAXIRA YO'L bilan JSON nusxa
         olamiz, ya'ni baribir nusxa bo'ladi. Ilgari bu yerda shunchaki
         xato yozilib, HECH QANDAY nusxa olinmasdi. */
      const z = await jsonZaxira(sana);
      if (z.saqlandi.length) {
        try {
          await admin.firestore().collection('watch_health').doc('soglik_zaxira_vaqt')
            .set({ at: Date.now(), manzil: 'gs://' + BUCKET + '/zaxira-json/' + sana, usul: 'json' }, { merge: true });
        } catch (e) {}
        const ochirildi = await eskilarniTozala();
        const hisoblagichJ = await hisoblagichlarniTozala();
        await telegram('💾 Zaxira nusxa olindi (JSON usuli)\n\n'
          + '📁 gs://' + BUCKET + '/zaxira-json/' + sana + '\n'
          + '📦 ' + z.saqlandi.length + ' ta to\'plam saqlandi'
          + (z.otkazildi.length ? '\n⏭ o\'tkazib yuborildi: ' + z.otkazildi.join(', ') : '')
          + (ochirildi > 0 ? '\n🧹 ' + ochirildi + ' ta eski fayl tozalandi' : '')
          + (hisoblagichJ > 0 ? '\n🧽 ' + hisoblagichJ + ' ta eski hisoblagich o\'chirildi' : '')
          + '\n\n⚠️ Rasmiy (to\'liq) eksport ishlamadi: ' + sabab
          + yoriqnoma());
        return { statusCode: 200, body: 'ok(json): ' + z.saqlandi.join(', ') };
      }

      await telegram('⚠️ Zaxira nusxa OLINMADI\n\n' + sabab
        + '\n\nZaxira yo\'l (JSON) ham ishlamadi: '
        + (z.otkazildi.length ? z.otkazildi.join(', ') : 'to\'plamlar bo\'sh')
        + yoriqnoma());
      return { statusCode: 500, body: 'zaxira xatosi: ' + sabab };
    }

    /* Sog'liq tekshiruvi (soglik-background.js) shu vaqtga qarab
       "zaxira olinmayapti" deb ogohlantiradi. */
    try{
      await admin.firestore().collection('watch_health').doc('soglik_zaxira_vaqt')
        .set({ at: Date.now(), manzil }, { merge: true });
    }catch(e){}

    const ochirildi = await eskilarniTozala();
    const hisoblagich = await hisoblagichlarniTozala();
    await telegram('💾 Zaxira nusxa olindi\n\n📁 ' + manzil
      + (ochirildi > 0 ? '\n🧹 ' + ochirildi + ' ta eski fayl tozalandi' : '')
      + (hisoblagich > 0 ? '\n🧽 ' + hisoblagich + ' ta eski hisoblagich o\'chirildi' : ''));
    return { statusCode: 200, body: 'ok: ' + manzil };
  } catch (err) {
    console.error('ZAXIRA XATOSI:', err);
    await telegram('⚠️ Zaxira nusxa olinmadi: ' + (err && err.message));
    return { statusCode: 500, body: 'error' };
  }
};
