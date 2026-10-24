// "BAZA RAQAM" KUZATUVI — har daqiqada ishga tushadi (netlify.toml),
// muddati kelgan har bir kuzatuvni tegishli operatorda qidiradi, topilsa
// admin'ga Telegram orqali (faqat TELEGRAM_CHAT_ID'ga — hech kim boshqa
// ko'rmaydi) darhol xabar beradi.
//
// Fayl nomi "-background" bilan tugashi MUHIM: Netlify'da bu funksiyani
// "Background Function" qiladi (oddiy funksiya ~10 soniyada to'xtaydi,
// background esa bir necha daqiqagacha ishlay oladi).
//
// OPTIMALLASHTIRISH (bu versiyada): avval har bir kuzatuv (watch) UCHUN
// ALOHIDA operator so'rovi (login+qidiruv) yuborilardi — agar bitta
// operatorda (masalan Humans) o'nlab kuzatuv bo'lsa, shuncha marta
// alohida so'rov ketardi. Bu esa (operator login/sessiya sekinligi va
// navbat to'planishi tufayli) ba'zi kuzatuvlar haqiqiy paydo bo'lish
// vaqtidan SOATLAB kech tekshirilishiga olib kelardi (masalan: Humans'da
// soat 10:00 da chiqqan raqam haqida xabar 13:00 atrofida kelgan holat).
//
// Endi: muddati kelgan kuzatuvlar operator bo'yicha GURUHLANADI. Operator
// API'si buni qo'llab-quvvatlasa (Beeline, Humans, Mobiuz, Perfektum),
// HAR BIR OPERATOR uchun BOR-YO'G'I BITTA, KENG (hamma katakcha bo'sh —
// operatorda hozir mavjud bo'lgan BARCHA raqamlarni so'ragan) so'rov
// yuboriladi — operatordan bir yurishda 200 tagacha (Beeline uchun 100 —
// operator API'sining o'zi bundan ko'pini qabul qilmaydi, 400 xato
// qaytaradi) natija olinadi. Shu BITTA natija ro'yxati keyin xotirada
// (tarmoqqa chiqmasdan, darhol) o'sha operatordagi HAR BIR kuzatuvning
// naqshiga (boxes) alohida-alohida solishtiriladi.
//
// ISTISNO — UCELL: uning qidiruv API'si "hammasini ber" so'rovini
// qo'llab-quvvatlamaydi (bo'sh so'rov yuborilsa butun bazani qaytarib
// yuborishi mumkin, shu sabab lib/operators.js buni ATAYLAB rad etadi —
// qarang: searchUcell). Shu sabab Ucell kuzatuvlari eski usulda — HAR
// BIRI O'Z naqshi bilan, alohida so'rov orqali — tekshiriladi.
//
// Natijada: 50 ta kuzatuvning aksariyati (Beeline/Humans/Mobiuz/
// Perfektum) atigi 4 tagacha (operatorlar soni) haqiqiy tarmoq so'rovi
// bilan, deyarli HAR DAQIQA (cron intervali) chinakam tekshiriladi.
//
// MUHIM: natija ENDI hech qanday operator-kod (masalan "faqat 87/88/97
// Mobiuz uchun") bo'yicha FILTRLANMAYDI — operatorlar vaqti-vaqti bilan
// yangi kod olishi mumkin, shu sabab bunday "ma'lum kodlar" ro'yxati
// kelajakda haqiqiy yangi raqamlarni noto'g'ri chetlab qo'yishi mumkin
// edi. Operator nima qaytarsa, o'shani ishonib qabul qilamiz.

const admin = require('firebase-admin');
const { jadvalOk } = require('./lib/jadvalQalqon');
const { searchAll, matchesBoxes } = require('./lib/operators');

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

const COLLECTION = 'number_watches';
// Har bir ANIQ topilgan raqam (masalan +998901234567) uchun: xabar berilgach,
// shu XUDDI SHU raqam qayta 12 soat ichida qayta xabar qilinmaydi — lekin
// naqshga mos boshqa (yangi) raqam chiqsa, kutmasdan darhol xabar beriladi.
// Qidiruv esa bu vaqt ichida ham to'xtamasdan, belgilangan intervalda davom etadi.
const NOTIFY_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const FINALIZE_CONCURRENCY = 6;    // Firestore yozish/Telegram xabar bosqichi uchun
const UCELL_CONCURRENCY = 4;       // Ucell va Beeline uchun (har-kuzatuv-alohida yo'l)
/* TUZATISH (V110): ilgari bu 12 DAQIQA edi, cron esa HAR DAQIQA ishga
   tushadi. Ya'ni bitta yurish tugamasdan ikkinchisi, uchinchisi...
   boshlanardi — operator API'siga bir vaqtda o'nlab bir xil so'rov
   ketib, navbat to'planardi va natijada tekshiruv "qotib qolgandek"
   sekinlashardi. Endi har bir yurish keyingi cron chaqiruvidan OLDIN
   tugaydi.

   Nega aynan 25 soniya: Netlify hujjatlarida JADVALLI funksiya uchun
   ijro chegarasi 30 soniya deb ko'rsatilgan ("background" qo'shimchasi
   bilan birga ishlatilganda qanday hisoblanishi hujjatlarda aniq
   yozilmagan). Shu sabab eng xavfsiz qiymat olindi: 25 soniya — ikkala
   holatda ham yurish o'z vaqtida tugaydi. Bizning ish hajmimiz baribir
   kichik: operator soniga teng (4 tagacha) so'rov. */
const MAX_RUN_MS = 25 * 1000;

// "Hammasini ber" so'rovini qo'llab-quvvatlamaydigan operatorlar — bular
// uchun har bir kuzatuv o'z naqshi bilan alohida so'raladi.
/* TUZATISH (V111) — BEELINE SHU RO'YXATGA QO'SHILDI.
   ------------------------------------------------------------------
   TOPILGAN TESHIK. Beeline'ning qidiruv API'si bir so'rovda ENG KO'PI
   100 ta natija qaytaradi (`?limit=100` — undan oshsa 400 xato).
   "Hammasini ber" (bo'sh naqsh) so'rovida esa u omborda mavjud
   bo'lgan MINGLAB raqamdan FAQAT BIRINCHI 100 tasini qaytaradi.
   Ya'ni kuzatilayotgan raqam ro'yxatning 101-o'rnidan keyin bo'lsa,
   u HECH QACHON ko'rinmasdi — kuzatuv shunchaki "ishlayotgandek"
   tuyulardi, lekin amalda topa olmasdi.

   Naqsh bilan (masalan 90-777-**-**) so'ralganda esa natija allaqachon
   tor bo'ladi va 100 chegarasi muammo tug'dirmaydi. Shu sabab Beeline
   endi Ucell kabi — HAR BIR KUZATUV O'Z NAQSHI bilan so'raladi.
   Bu operatorga ko'proq so'rov degani, lekin TO'G'RI natija degani. */
/* V120: MOBIUZ ham shu ro'yxatga qo'shildi.
   SABAB: "hammasini ber" (wildcard) so'rovi Mobiuz'da BUTUN ro'yxatni
   qaytaradi — bu og'ir va sekin so'rov. Kuzatuvga berilgan muddatga
   ulgurmay uzilardi va natijada ketma-ket 124 marta "javob bermadi"
   xatosi yig'ildi. Aniq naqsh bo'yicha so'rov esa yengil va tez:
   bitta kuzatuv uchun bitta kichik so'rov (bir xil naqshlar bitta
   so'rovga birlashtiriladi — qarang: finalizePerWatch dagi `kesh`).
   Sessiya keshi bilan birga (lib/operators.js) bu Mobiuz'ga ketadigan
   so'rovni ikkitadan BITTAGA tushiradi. */
const NO_WILDCARD_OPERATORS = new Set(['Ucell', 'Beeline', 'Mobiuz']);

// Operatorning o'zidan BIR SO'ROVDA so'ralishi mumkin bo'lgan eng ko'p
// natija soni. Beeline'ning o'ziga xos, qattiq 100 chegarasi bor (undan
// oshsa 400 xato qaytaradi — bu avval bir marta boshimizga muammo bo'lib
// kelgan, qarang: api-live-search.js izohi) — u HAQIQIY GET so'rov
// parametriga (?limit=) ketadi, shu sabab qat'iy 100'da qoldirilishi
// SHART. Lekin Beeline'da 7 ta ombor (warehouse) bor va hammasi PARALLEL
// so'raladi — demak Beeline'dan jami 700 tagacha natija kelishi mumkin.
//
// Humans va Mobiuz'ning API'siga esa BIZNING limit'imiz umuman
// yuborilmaydi (ular o'zlari qancha natija bersa, o'shani qaytaradi) —
// bizning kodimizdagi "limit" faqat OLINGAN natijani KEYIN qanchasini
// SAQLAB QOLISHNI belgilaydi. Shu sabab bu ikkalasi uchun juda katta
// (amalda "kesilmasin" degani) qiymat qo'yiladi — mijoz "200 va undan
// ko'p birdaniga chiqsin" desa, operator o'zi qancha bersa, o'shanchasi
// TO'LIQ saqlanadi, sun'iy ravishda 200'da kesilib qolmaydi.
/* TUZATISH (V111): ilgari 2000 edi. Humans/Mobiuz/Perfektum API'si
   bizning limit'imizni QABUL QILMAYDI — ular o'zlari qancha bersa,
   shuncha keladi; bizdagi "limit" esa olingan natijadan qanchasini
   SAQLAB QOLISHNI belgilaydi. Operatorda 2000 tadan ko'p raqam bo'lsa,
   2001-o'rindagi kuzatilayotgan raqam shunchaki tashlab ketilardi.
   Endi amalda "kesilmasin" degan qiymat. */
const BULK_LIMIT_DEFAULT = 50000;
const BULK_LIMIT_BY_OPERATOR = {};
const PER_WATCH_LIMIT = 300; // Ucell yo'li uchun (avval 20 edi) — bu ham faqat bizning saqlash chegaramiz

// Katakchalarning barchasi bo'sh — "operatorda hozir mavjud bo'lgan
// BARCHA raqamlarni ber" degani.
const WILDCARD_BOXES = ['', '', '', '', '', '', ''];

function formatNumber(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 12) return raw;
  return `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,10)} ${digits.slice(10,12)}`;
}

// "Sozlamalar" bo'limida qo'shilgan qo'shimcha Telegram ID'lar (qarang:
// admin-number-watch.js -> listNotifyIds/addNotifyId) — asosiy botdan
// TASHQARI, shu ID'larning HAR BIRIGA ham xabar yuboriladi. Bir nechta
// admin/bot qo'shilsa, hammasi bir vaqtda xabardor bo'ladi.
const NOTIFY_COLLECTION = 'watch_notify_recipients';

/* TUZATISH (V111): ilgari yuborish natijasi UMUMAN tekshirilmasdi
   (`catch` bo'sh edi). Telegram javob bermagan bir lahzada xabar
   yo'qolardi, raqam esa "xabar qilingan" deb belgilanib, 12 soat
   davomida qayta yuborilmasdi — ya'ni raqam butunlay o'tkazib
   yuborilardi. Endi: bir marta qayta urinadi va MUVAFFAQIYATNI
   qaytaradi; raqam faqat haqiqatan yuborilgandan keyin "xabar
   qilingan" deb belgilanadi. */
async function sendTelegramMessage(token, chatId, text, qayta) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    if (res.ok) return true;
    /* 429 (juda ko'p so'rov) va 5xx — vaqtinchalik, qayta urinamiz */
    if (!qayta && (res.status === 429 || res.status >= 500)) {
      await new Promise(r => setTimeout(r, 1200));
      return sendTelegramMessage(token, chatId, text, true);
    }
    console.error('Telegram xabar yuborilmadi: HTTP ' + res.status);
    return false;
  } catch (e) {
    if (!qayta) {
      await new Promise(r => setTimeout(r, 1200));
      return sendTelegramMessage(token, chatId, text, true);
    }
    console.error('Telegram xabar yuborilmadi:', e && e.message);
    return false;
  }
}

async function notifyAdmin(text) {
  // Alohida "kuzatuv" boti — asosiy admin botidan AJRATILGAN, shu bilan
  // bu xabarlar boshqa xabarlar orasida yo'qolib qolmaydi. Agar
  // WATCH_BOT_TOKEN/WATCH_CHAT_ID hali sozlanmagan bo'lsa, asosiy admin
  // botiga (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID) tushib qoladi — shu bilan
  // sozlash tugallanmagan bo'lsa ham xabar butunlay yo'qolib ketmaydi.
  const token = process.env.WATCH_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.WATCH_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  let yetdi = false;
  if (token && chatId) yetdi = await sendTelegramMessage(token, chatId, text);

  // Qo'shimcha, Sozlamalardan qo'shilgan ID'lar — xuddi shu bot tokeni
  // bilan, lekin HAR BIR ID'ga alohida xabar sifatida.
  if (!token) return yetdi;
  try {
    const snap = await db.collection(NOTIFY_COLLECTION).get();
    await Promise.all(snap.docs.map(d => {
      const extraChatId = d.data().chatId;
      if (!extraChatId) return null;
      return sendTelegramMessage(token, extraChatId, text);
    }));
  } catch (e) { /* qo'shimcha ro'yxat o'qilmasa ham, asosiy xabar allaqachon ketgan */ }
  return yetdi;
}

async function loadOperatorConfig() {
  try {
    const doc = await db.collection('operator_config').doc('main').get();
    return (doc.exists && doc.data()) || {};
  } catch (e) { return {}; }
}

// Bitta operator uchun BITTA, keng so'rov — shu operatordagi hozir
// mavjud bo'lgan (limit tagacha) barcha raqamlarni qaytaradi. Xato
// bo'lsa (operator vaqtincha ishlamasa) bo'sh ro'yxat qaytadi — shu
// operatordagi kuzatuvlar shu safar "natija yo'q" deb hisoblanadi,
// lekin navbatdagi tekshiruvlari (nextCheckAt, pastda) baribir oldinga
// suriladi, ya'ni "abadiy qotib qolish" yo'q.
/* TUZATISH (V111): ilgari operator xatosi YUTILARDI — funksiya bo'sh
   ro'yxat qaytarardi va kuzatuv "tekshirildi, hech narsa topilmadi"
   deb belgilanardi. Ya'ni Humans bir hafta javob bermasa ham, panelda
   "so'nggi tekshiruv: hozir" deb turaverardi va hech kim buzilganini
   bilmasdi. Endi xato ALOHIDA qaytariladi va yuqorida hisobga olinadi. */
async function fetchOperatorPool(operatorName, config) {
  const limit = BULK_LIMIT_BY_OPERATOR[operatorName] || BULK_LIMIT_DEFAULT;
  const boshlandi = Date.now();
  try {
    const out = await searchAll(WILDCARD_BOXES, config, { operator: operatorName, limit, deadline: 10000 });
    const items = out.items || [];
    /* searchAll operator xatosini `errors` ichida ham qaytarishi mumkin */
    const xato = (out.errors && out.errors.length) ? String(out.errors[0].message || out.errors[0]) : '';
    const ms = Date.now() - boshlandi;
    if (!items.length && xato) return { items: [], xato, ms };
    return { items, xato: '', ms };
  } catch (e) {
    return { items: [], xato: (e && e.message) || 'nomalum xato', ms: Date.now() - boshlandi };
  }
}

/* Kuzatuv tekshirilmay qolganda (operator javob bermadi) — hujjatga
   FAQAT xato yoziladi. `lastCheckedAt` ATAYLAB tegilmaydi: aks holda
   panel "tekshirildi" deb yolg'on ko'rsatardi. */
async function nishonlaXato(doc, xato) {
  try {
    await doc.ref.update({
      lastErrorAt: admin.firestore.Timestamp.now(),
      lastError: String(xato).slice(0, 300),
      errorStreak: (doc.data().errorStreak || 0) + 1
    });
  } catch (e) { /* yozilmasa ham tekshiruv davom etadi */ }
}

/* OPERATOR SOG'LIG'I — ketma-ket xatolar sanaladi va 3 martadan keyin
   adminga BIR MARTA (30 daqiqada) ogohlantirish yuboriladi. Shu bilan
   "kuzatuv jim qolib ketdi" holati sezdirmay o'tmaydi. */
const SOGLIQ_COLLECTION = 'watch_health';
const OGOH_SOVISH_MS = 30 * 60 * 1000;
const OGOH_CHEGARA = 3;

/* ============ V120: TINIM (backoff) ============
   MUAMMO: Ucell dilerlik API manzili o'zgarib HTTP 404 bera boshlaganda,
   bu funksiya HAR DAQIQADA qayta-qayta so'rov yuborib turdi va natijada
   ketma-ket 12 459 marta xato yig'ildi. Bu uch narsani buzadi:
     * har daqiqada bekorga so'rov — funksiya vaqti va operator yuki;
     * xato soni ma'nosiz kattalashadi (12 459 soni hech narsa aytmaydi);
     * bitta o'lik operator butun yurgizishning vaqtini yeb qo'yadi,
       ya'ni ISHLAYDIGAN operatorlar ham kechikadi.
   YECHIM: operator ketma-ket 10 martadan ko'p xato bersa, u 15 daqiqa
   TINIM oladi — bu vaqt ichida unga umuman so'rov yuborilmaydi va
   kuzatuvlariga xato ham yozilmaydi (holat allaqachon ma'lum). Tinim
   tugagach bir marta sinab ko'riladi: javob bersa — hammasi odatdagicha
   davom etadi (va "✅ Kuzatuv tiklandi" xabari ketadi), bermasa —
   yana 15 daqiqa tinim. Ishlaydigan operatorlar bundan ta'sirlanmaydi. */
const TINIM_CHEGARA = 10;
const TINIM_MS = 15 * 60 * 1000;

/* Tinimda bo'lgan operatorlar ro'yxati (bitta yurgizish uchun). */
async function tinimdagilar(operatorNomlari) {
  const chiqim = {};
  await Promise.all(operatorNomlari.map(async (op) => {
    try {
      const snap = await db.collection(SOGLIQ_COLLECTION).doc(op).get();
      const d = snap.exists ? (snap.data() || {}) : {};
      chiqim[op] = Number(d.backoffUntil || 0) > Date.now();
    } catch (e) { chiqim[op] = false; }
  }));
  return chiqim;
}

/* V120: TEZLIK O'LCHOVI. "Operator tez ishlayaptimi?" degan savolga
   taxmin bilan emas, SON bilan javob berish uchun har bir so'rovning
   davomiyligi yozib boriladi: oxirgi so'rov (lastMs) va silliqlangan
   o'rtacha (avgMs — har safar 80% eski + 20% yangi, ya'ni bitta
   tasodifiy sekin javob o'rtachani buzmaydi). Admin panelning
   "Kuzatuv" bo'limida ko'rinadi. */
async function sogliqYangila(operatorName, xato, ms) {
  const ref = db.collection(SOGLIQ_COLLECTION).doc(operatorName);
  try {
    const snap = await ref.get();
    const d = snap.exists ? (snap.data() || {}) : {};
    const now = Date.now();
    /* Tezlik — xato bo'lsa ham yoziladi (sekinlik sababini ko'rish uchun) */
    const tezlik = {};
    if (Number(ms) > 0) {
      tezlik.lastMs = Number(ms);
      const eski = Number(d.avgMs) || 0;
      tezlik.avgMs = eski ? Math.round(eski * 0.8 + Number(ms) * 0.2) : Number(ms);
      tezlik.lastMsAt = Date.now();
    }
    if (!xato) {
      /* Tiklandi — oldin ogohlantirilgan bo'lsa, "tuzaldi" deb aytamiz */
      if ((d.streak || 0) >= OGOH_CHEGARA && d.alertedAt) {
        await notifyAdmin('✅ Kuzatuv tiklandi\n\n📶 ' + operatorName + ' yana javob beryapti.');
      }
      await ref.set(Object.assign({ streak: 0, alertedAt: null, backoffUntil: null, lastOkAt: now }, tezlik), { merge: true });
      return;
    }
    const streak = (d.streak || 0) + 1;
    const yoz = { streak, lastError: String(xato).slice(0, 300), lastErrorAt: now };
    /* Ketma-ket ko'p xato — operator tinimga chiqariladi (yuqoridagi izoh) */
    if (streak >= TINIM_CHEGARA) yoz.backoffUntil = now + TINIM_MS;
    if (streak >= OGOH_CHEGARA && (!d.alertedAt || now - d.alertedAt > OGOH_SOVISH_MS)) {
      const yetdi = await notifyAdmin(
        '⚠️ Kuzatuv ishlamayapti\n\n' +
        '📶 ' + operatorName + '\n' +
        '🔁 ketma-ket ' + streak + ' marta xato\n' +
        '❗ ' + String(xato).slice(0, 180) +
        (streak >= TINIM_CHEGARA
          ? '\n\n⏸ Bekorga so\'rov yubormaslik uchun bu operator '
            + (TINIM_MS / 60000) + ' daqiqa tinimga chiqarildi — keyin o\'zi qayta sinab ko\'radi.'
          : '')
      );
      if (yetdi) yoz.alertedAt = now;
    }
    await ref.set(Object.assign(yoz, tezlik), { merge: true });
  } catch (e) { /* sog'liq yozuvi ishlamasa ham, asosiy ish davom etadi */ }
}

// Kuzatuv hujjatini (topilgan raqamlar ro'yxati asosida) yakunlaydi:
// kerak bo'lsa Telegram xabar yuboradi va Firestore'ni yangilaydi.
async function finalizeWatch(doc, items) {
  const watch = doc.data();
  const ref = doc.ref;
  const now = Date.now();

  const update = {
    lastError: null,
    lastErrorAt: null,
    errorStreak: 0,
    lastCheckedAt: admin.firestore.Timestamp.now(),
    nextCheckAt: admin.firestore.Timestamp.fromMillis(now + watch.intervalMinutes * 60000),
    checkCount: (watch.checkCount || 0) + 1
  };

  // Avval xabar qilingan raqamlar ro'yxatidan muddati (12 soat) o'tganlarini
  // tozalab boramiz — shunda ular yana "yangidek" xabar qilinishi mumkin
  // bo'ladi, va hujjat vaqt o'tishi bilan cheksiz kattalashib ketmaydi.
  const prevNotified = watch.notifiedNumbers || {};
  const keptNotified = {};
  for (const num in prevNotified) {
    const ts = prevNotified[num];
    if (typeof ts === 'number' && (now - ts) < NOTIFY_COOLDOWN_MS) keptNotified[num] = ts;
  }

  if (items.length > 0) {
    update.lastFoundAt = admin.firestore.Timestamp.now();
    update.lastFoundNumbers = items.slice(0, 5).map(x => x.number);

    // Faqat hali "sovish" muddati tugamagan ro'yxatda YO'Q raqamlarga xabar
    // yuboramiz — xuddi shu raqam qayta-qayta tashlanmaydi, lekin naqshga
    // mos boshqa (hali xabar qilinmagan) raqam chiqsa, darhol xabar ketadi.
    const freshItems = items.filter(it => !keptNotified[it.number]);
    for (const item of freshItems) {
      const priceText = item.price ? `${Number(item.price).toLocaleString('ru-RU')} so'm` : "narxi ko'rsatilmagan";
      const yetdi = await notifyAdmin(
        `🟢 Sotuvga qo'yildi\n\n` +
        `📱 ${formatNumber(item.number)} - ${priceText}\n` +
        `📶 ${watch.operator}`
      );
      /* Faqat HAQIQATAN yuborilgan bo'lsa "xabar qilingan" deb
         belgilaymiz — aks holda keyingi yurishda qayta uriniladi. */
      if (yetdi) keptNotified[item.number] = now;
    }
  }

  update.notifiedNumbers = keptNotified;

  await ref.update(update);
}

// --- Operator "hammasini ber"ni qo'llab-quvvatlaydigan yo'l: bitta keng
//     pool, keyin har bir kuzatuv shu pooldan mahalliy filtrlanadi. ---
async function finalizePooled(docsWithPool) {
  let idx = 0;
  async function worker() {
    while (idx < docsWithPool.length) {
      const { doc, poolItems } = docsWithPool[idx++];
      const items = poolItems.filter(it => matchesBoxes(it.number, doc.data().boxes));
      await finalizeWatch(doc, items);
      if (Date.now() - START_TIME > MAX_RUN_MS) return;
    }
  }
  const workers = Array(Math.min(FINALIZE_CONCURRENCY, docsWithPool.length)).fill(0).map(worker);
  await Promise.all(workers);
}

// --- Ucell yo'li: har bir kuzatuv o'z naqshi bilan ALOHIDA so'raladi
//     (operator API'si "hammasini ber"ni qo'llamaydi). ---
async function finalizePerWatch(docs, config) {
  let idx = 0;
  /* BITTA YURISH ICHIDAGI TAKRORNI OLDINI OLISH (V111).
     Bir nechta kuzatuv bir xil naqsh + bir xil operatorga tegishli
     bo'lishi mumkin (masalan admin bitta naqshni ikki marta qo'shgan).
     Ilgari har biri uchun ALOHIDA so'rov ketardi — operatorda bu
     keraksiz yuk va 429 ("so'rovlar chegarasi") xavfi. Endi so'rov
     bir marta yuboriladi, natija esa baham ko'riladi. */
  /* V120: tinimda bo'lgan operatorning kuzatuvlari umuman tekshirilmaydi
     (yuqoridagi TINIM izohiga qarang). Ucell aynan shu yo'ldan yuradi —
     12 459 ketma-ket xato shu yerda yig'ilgan edi. */
  const tinim = await tinimdagilar([...new Set(docs.map(d => d.data().operator))]);
  docs = docs.filter(d => !tinim[d.data().operator]);
  if (!docs.length) return;

  const kesh = new Map();
  /* Natija bilan birga SO'ROV DAVOMIYLIGINI ham qaytaradi. Keshdan
     olingan javob uchun ms = 0 — unga so'rov umuman ketmagan, va uni
     tezlik o'lchoviga qo'shish ko'rsatkichni asossiz yaxshi qilib
     ko'rsatardi. */
  function qidir(operator, boxes) {
    const kalit = operator + '|' + boxes.join(',');
    if (kesh.has(kalit)) return kesh.get(kalit).then(r => ({ out: r.out, ms: 0 }));
    /* V120: muddat 8s -> 11s. Sessiya keshi bor (Mobiuz/Humans), ya'ni
       odatda bitta so'rov ketadi; lekin kesh yangilanishi kerak bo'lgan
       safar ikki so'rov ketadi va 8 sekund unga yetmasdi. Butun
       yurgizish chegarasi (MAX_RUN_MS = 25s) buzilmaydi. */
    const boshlandi = Date.now();
    const vada = searchAll(boxes, config, { operator, limit: PER_WATCH_LIMIT, deadline: 11000 })
      .then(out => ({ out, ms: Date.now() - boshlandi }));
    kesh.set(kalit, vada);
    return vada;
  }
  async function worker() {
    while (idx < docs.length) {
      const doc = docs[idx++];
      const watch = doc.data();
      let items = null;
      let xato = '';
      let ms = 0;
      try {
        const r = await qidir(watch.operator, watch.boxes);
        const out = r.out;
        ms = r.ms;
        items = out.items || [];
        if (!items.length && out.errors && out.errors.length) {
          xato = String(out.errors[0].message || out.errors[0]);
          items = null;
        }
      } catch (e) { xato = (e && e.message) || 'nomalum xato'; }

      if (items === null) {
        /* Tekshirib bo'lmadi — "tekshirildi" deb belgilamaymiz */
        await nishonlaXato(doc, xato);
        await sogliqYangila(watch.operator, xato, ms);
      } else {
        await sogliqYangila(watch.operator, '', ms);
        await finalizeWatch(doc, items);
      }
      if (Date.now() - START_TIME > MAX_RUN_MS) return;
    }
  }
  const workers = Array(Math.min(UCELL_CONCURRENCY, docs.length)).fill(0).map(worker);
  await Promise.all(workers);
}

let START_TIME = 0;

exports.handler = async function (event) {
  /* XAVFSIZLIK (V73): bu funksiya jadval bo'yicha ishlaydi —
     tashqaridan chaqirilishi kerak emas. Qarang: lib/jadvalQalqon.js */
  if (!(await jadvalOk(event, 'number-watch-check-background', 40))) return { statusCode: 403, body: 'forbidden' };

  START_TIME = Date.now();
  try {
    const snap = await db.collection(COLLECTION).where('active', '==', true).get();
    if (snap.empty) return { statusCode: 200, body: 'ok: kuzatuv yoq' };

    const now = admin.firestore.Timestamp.now();

    /* ============ V110: INTERVAL ENDI POOL YO'LIGA TA'SIR QILMAYDI ============
       MUAMMO. Admin kuzatuvni yaratganda interval tanlardi (standart —
       5 daqiqa) va tekshiruv AYNAN o'sha intervalda bo'lardi. Ya'ni
       raqam sotuvga chiqqanidan keyin xabar 5 daqiqagacha kechikardi
       ("raqam ochilgan bo'lsa ham, keyin qidirib tashlab beryabdi").

       Nega endi kerak emas. Beeline/Humans/Mobiuz/Perfektum uchun
       operatorga HAR BIR KUZATUV uchun emas, HAR BIR OPERATOR uchun
       BITTA keng so'rov yuboriladi (qarang: fetchOperatorPool). Ya'ni
       10 ta kuzatuvni tekshirish ham, 1 tasini tekshirish ham operator
       uchun BIR XIL — bitta so'rov. Demak kutib turishning ma'nosi yo'q.

       Endi: bu operatorlardagi kuzatuvlar HAR DAQIQA (cron oralig'i)
       tekshiriladi. Interval faqat UCELL uchun kuch saqlaydi — u yerda
       har bir kuzatuv o'z so'rovini talab qiladi, shu sabab ularni
       cheklab turish hamon to'g'ri.

       `nextCheckAt` baribir yozib boriladi — admin panelda "keyingi
       tekshiruv" ko'rsatkichi o'sha maydondan o'qiydi. */
    const pooledAll = snap.docs.filter(d => !NO_WILDCARD_OPERATORS.has(d.data().operator));
    const perWatchAll = snap.docs.filter(d => NO_WILDCARD_OPERATORS.has(d.data().operator));

    const pooledDue = pooledAll;                       // har doim — har daqiqada
    const perWatchDue = perWatchAll.filter(d => {      // Ucell — intervalga qarab
      const nc = d.data().nextCheckAt;
      return !nc || nc.toMillis() <= now.toMillis();
    });
    const due = pooledDue.concat(perWatchDue);
    if (due.length === 0) return { statusCode: 200, body: 'ok: hozircha muddati kelgani yoq' };

    const config = await loadOperatorConfig();

    // "Hammasini ber"ga mos operatorlarni guruhlab, har biridan BITTA
    // keng so'rov — PARALLEL.
    const byOperator = {};
    for (const doc of pooledDue) {
      const op = doc.data().operator;
      if (!byOperator[op]) byOperator[op] = [];
      byOperator[op].push(doc);
    }
    const barchaOperatorlar = Object.keys(byOperator);
    const tinim = await tinimdagilar(barchaOperatorlar);
    const operatorNames = barchaOperatorlar.filter(op => !tinim[op]);
    const otkazilgan = barchaOperatorlar.filter(op => tinim[op]);
    const pools = await Promise.all(
      operatorNames.map(async (op) => {
        const r = await fetchOperatorPool(op, config);
        return { op, items: r.items, xato: r.xato, ms: r.ms };
      })
    );
    const poolByOperator = {};
    const xatoByOperator = {};
    const msByOperator = {};
    pools.forEach(p => { poolByOperator[p.op] = p.items; xatoByOperator[p.op] = p.xato; msByOperator[p.op] = p.ms; });

    /* Operator sog'ligini va TEZLIGINI yangilaymiz */
    await Promise.all(operatorNames.map(op => sogliqYangila(op, xatoByOperator[op], msByOperator[op])));

    /* Operator javob bermagan bo'lsa, uning kuzatuvlari "tekshirildi"
       deb BELGILANMAYDI — faqat xato yoziladi. */
    const docsWithPool = [];
    for (const doc of pooledDue) {
      const op = doc.data().operator;
      /* Tinimda — so'rov ham yuborilmadi, xato ham yozilmaydi
         (holat allaqachon ma'lum, xato sonini shishirishdan foyda yo'q) */
      if (tinim[op]) continue;
      if (xatoByOperator[op]) { await nishonlaXato(doc, xatoByOperator[op]); continue; }
      docsWithPool.push({ doc, poolItems: poolByOperator[op] || [] });
    }

    await Promise.all([
      finalizePooled(docsWithPool),
      finalizePerWatch(perWatchDue, config)
    ]);

    return {
      statusCode: 200,
      body: `ok: ${due.length} ta kuzatuv (${pooledDue.length} pool orqali / ${operatorNames.length} operator`
        + (otkazilgan.length ? `, tinimda: ${otkazilgan.join(', ')}` : '')
        + `, ${perWatchDue.length} alohida), jami ${snap.size} ta faol`
    };
  } catch (err) {
    console.error('NUMBER-WATCH-CHECK XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
