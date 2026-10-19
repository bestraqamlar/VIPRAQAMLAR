// SOTUVCHILAR (dilerlar) PANELI — barcha amallar shu bitta funksiyada.
//
// MAQSAD: boshqa raqam sotuvchilar o'z raqamlarini bizning saytga
// qo'ysin, biz komissiya olaylik. Baza bir necha barobar tez o'sadi.
//
// KIRISH: login + parol (hisobni ADMIN yaratadi — o'z-o'zidan ro'yxatdan
// o'tish YO'Q, bu ataylab: har bir sotuvchi tanish bo'lishi kerak).
//
// QOIDA (mijoz tanlovi): sotuvchi narxni O'ZI ERKIN belgilaydi va raqam
// DARHOL saytga chiqadi — tasdiq kutmaydi. Nazorat keyin: admin
// istalgan raqamni yashirishi/o'chirishi yoki sotuvchini bloklashi
// mumkin.
//
// Chaqirish: POST /.netlify/functions/seller-api
//   Sarlavha: Authorization: Bearer <seans tokeni>   (login'dan tashqari)
//   Tana: { "action": "...", ... }
//
// Amallar:
//   login        {username, password}      -> {token, seller}
//   me           -                         -> {seller, stats}
//   myNumbers    -                         -> {numbers:[...]}
//   addNumber    {number, operator, price, installment, note}
//   updateNumber {id, price, installment, note}
//   removeNumber {id}
//   messages     -                         -> {rows}
//   sendMessage  {text}
//
// XAVFSIZLIK: sotuvchi FAQAT o'zining (sellerId == uning id'si)
// raqamlariga teginadi — har bir amalda tekshiriladi.

const admin = require('firebase-admin');
const { verifyPassword, makeToken, requireSeller, initSecret } = require('./lib/sellerAuth');
const TARIF = require('./lib/tariflar');
const TOLOV = require('./lib/tolovlar');
const DUBL = require('./lib/dublikat');

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
const NOW = () => admin.firestore.FieldValue.serverTimestamp();

/* CORS: ilgari `*` edi — istalgan sayt kabinet API'siga murojaat
   qila olardi. Token sarlavhada yuborilgani uchun o'g'irlab bo'lmaydi,
   lekin baribir faqat O'Z saytimizga ruxsat beramiz. */
const RUXSAT = ['https://vipraqamlar.uz', 'https://www.vipraqamlar.uz'];
const H = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': RUXSAT[0],
  'Vary': 'Origin',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff'
};
/* Javob sarlavhalari. So'rov kelgan origin ro'yxatda bo'lsa aynan o'shani
   qaytaramiz (www bilan ham, www'siz ham ishlashi uchun), aks holda asosiy
   domenni. Boshqa sayt bizning API'mizga brauzerdan murojaat qila olmaydi. */
let KORS = H;
const korsHead = (event) => {
  const hh = (event && event.headers) || {};
  const o = String(hh.origin || hh.Origin || '');
  return RUXSAT.indexOf(o) !== -1 ? Object.assign({}, H, { 'Access-Control-Allow-Origin': o }) : H;
};
const ok = (o) => ({ statusCode: 200, headers: KORS, body: JSON.stringify(Object.assign({ ok: true }, o)) });
const bad = (msg, code, qosh) => ({
  statusCode: code || 400, headers: KORS,
  body: JSON.stringify(Object.assign({ ok: false, error: msg }, qosh || {}))
});

// +998901234567 ko'rinishiga keltiradi
function normNumber(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 9) return '+998' + d;
  if (d.length === 12 && d.startsWith('998')) return '+' + d;
  return null;
}
// Raqamning oxirgi N ta raqami (qidiruv maydonlari uchun)
const oxirgi = (num, n) => String(num || '').replace(/\D/g, '').slice(-n);
const money = (v) => { const n = Math.round(Number(v) || 0); return (n > 0 && n < 100000000000) ? n : 0; };
const clean = (s, max) => String(s == null ? '' : s).trim().slice(0, max || 200);

const OPERATORS = ['Beeline', 'Ucell', 'Uzmobile', 'Mobiuz', 'Humans', 'Perfektum'];
// Eski yozuvlar uchun ham qabul qilamiz (admin ro'yxatidan oldingi nomlar)
const OPERATORS_ESKI = ['UMS', 'Perfectum'];

/* Operator kodlari — admin paneldagi jadval bilan BIR XIL.
   Sotuvchi operatorni tanlamasa ham, raqamning boshiga qarab o'zi
   aniqlanadi; noto'g'ri tanlasa ham server shuni to'g'rilaydi. */
const KOD_OPERATOR = {
  '91':'Beeline', '90':'Beeline', '92':'Beeline',
  '33':'Humans',
  '50':'Ucell', '94':'Ucell', '93':'Ucell',
  '88':'Mobiuz', '97':'Mobiuz', '87':'Mobiuz',
  '77':'Uzmobile', '70':'Uzmobile', '95':'Uzmobile', '99':'Uzmobile',
  '98':'Perfektum', '80':'Perfektum'
};
function operatorAniqla(number, tanlangan) {
  const d = String(number || '').replace(/\D/g, '').replace(/^998/, '');
  const kod = KOD_OPERATOR[d.slice(0, 2)];
  if (kod) return kod;                              // prefiks aniq aytib turibdi
  if (OPERATORS.indexOf(tanlangan) !== -1) return tanlangan;
  if (OPERATORS_ESKI.indexOf(tanlangan) !== -1) return tanlangan;
  return '';
}
const VALYUTA = (v) => (String(v || '').toLowerCase() === 'usd' ? 'USD' : 'UZS');

// Bitta sotuvchi ko'pi bilan shuncha raqam qo'sha oladi (suiiste'molga qarshi)
const MAX_NUMBERS = 10000;

/* Sayt katalogi tayyor ixcham indeksdan o'qiladi (api-index.js). Raqam
   qo'shilsa/o'zgarsa shu belgi qo'yiladi — keyingi so'rovda indeks
   qaytadan quriladi va o'zgarish bir daqiqa ichida saytda ko'rinadi. */
async function indeksEskirdi() {
  try { await db.collection('search_index').doc('dirty').set({ at: Date.now() }, { merge: true }); }
  catch (e) {}
}

/* ---------- Kirish ---------- */
/* PAROLNI TANLAB KO'RISHDAN HIMOYA.
   Ilgari noto'g'ri urinishlar SANALARDI, lekin hech qachon
   TEKSHIRILMASDI — ya'ni parolni cheksiz marta sinab ko'rsa
   bo'lardi. Endi ketma-ket 8 ta xatodan keyin hisob 15 daqiqaga
   yopiladi. Har bir urinish serverda scrypt hisoblaydi (~100 ms),
   shu sabab bu protsessorni band qilish hujumining ham oldini oladi. */
const XATO_CHEGARA = 8;
const QULF_MS = 15 * 60 * 1000;

async function doLogin(body) {
  const username = clean(body.username, 40).toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) return bad('Login va parolni kiriting');
  if (password.length > 200) return bad("Login yoki parol noto'g'ri", 401);

  const q = await db.collection('sellers').where('username', '==', username).limit(1).get();
  // Noto'g'ri login va noto'g'ri parol uchun BIR XIL xabar — kimning
  // hisobi borligini tashqaridan bilib bo'lmasin.
  if (q.empty) return bad("Login yoki parol noto'g'ri", 401);
  const doc = q.docs[0];
  const s = Object.assign({ id: doc.id }, doc.data());

  // Qulf: parolni TEKSHIRMASDAN oldin, ya'ni scrypt ham hisoblanmaydi
  const xatolar = Number(s.failedCount) || 0;
  const oxirgi = s.failedAt && s.failedAt.toMillis ? s.failedAt.toMillis() : Number(s.failedAt) || 0;
  if (xatolar >= XATO_CHEGARA && oxirgi && Date.now() - oxirgi < QULF_MS) {
    const qoldi = Math.ceil((QULF_MS - (Date.now() - oxirgi)) / 60000);
    return bad('Ko\u2018p marta xato kiritildi. ' + qoldi + ' daqiqadan keyin urinib ko\u2018ring.', 429);
  }

  if (!verifyPassword(password, s.passwordHash)) {
    // Qulf muddati o'tgan bo'lsa hisobni noldan boshlaymiz
    const yangi = (xatolar >= XATO_CHEGARA && oxirgi && Date.now() - oxirgi >= QULF_MS) ? 1 : xatolar + 1;
    await doc.ref.update({ failedAt: NOW(), failedCount: yangi }).catch(() => {});
    return bad("Login yoki parol noto'g'ri", 401);
  }
  if (s.blocked) return bad("Hisobingiz vaqtincha to’xtatilgan. Admin bilan bog’laning.", 403);

  await doc.ref.update({ lastLoginAt: NOW(), failedCount: 0 }).catch(() => {});
  return ok({
    token: makeToken(s),
    seller: { id: s.id, name: s.name || '', username: s.username }
  });
}

/* ---------- Sotuvchining raqamlari ----------
   KATTA DILER UCHUN: 10 000 tagacha raqam.

   Muammo: 10 000 ta hujjatni oddiy JSON bilan yuborsak ~1 MB bo'ladi
   va bitta so'rov bir necha soniya ketadi — kabinet "qotib" turadi.

   Yechim (asosiy saytdagi `lib/numIndex.js` bilan bir xil g'oya):
     1. Firestore'dan FAQAT kerakli maydonlar olinadi (`select`) —
        hujjat o'qish soni o'zgarmaydi, lekin tarmoqdan o'tadigan
        ma'lumot bir necha barobar kamayadi.
     2. Javob JSON emas, QADOQLANGAN satr: bitta raqam ~55 bayt
        (JSON'da ~95). 10 000 ta = ~550 KB o'rniga ~1 MB emas,
        gzip bilan esa ~70 KB.
     3. Bir martada 1500 tadan yuboriladi (`next` kursori bilan).
        Kabinet birinchi bo'lakni olishi bilan ro'yxatni chizadi,
        qolganini orqa fonda yuklab oladi.
     4. Tartiblash `__name__` (hujjat ID'si) bo'yicha — bu Firestore'da
        QO'SHIMCHA INDEKS TALAB QILMAYDI. Ko'rsatish tartibi
        (eng yangisi birinchi) kabinetning o'zida qo'yiladi.
*/
const SAHIFA_SERVER = 1500;
const OP_IDX = ['', 'Beeline', 'Ucell', 'Uzmobile', 'Mobiuz', 'Humans', 'Perfektum'];
// Toifa qadoqda raqam bilan yuboriladi (kabinet shu ro'yxatdan ochadi)
const TOIFA_IDX = ['', 'vip', 'premium', 'gold'];

// `|` va yangi qator qadoq formatini buzmasligi uchun almashtiriladi
const qEsc = (v) => String(v == null ? '' : v).replace(/[|\r\n]/g, ' ').slice(0, 120);

function qadoqla(id, x) {
  const digits = String(x.number || '').replace(/\D/g, '').replace(/^998/, '');
  let fl = 0;
  if (x.reserved) fl |= 1;
  if (x.hidden) fl |= 2;
  if (x.sold) fl |= 4;
  if (x.installment) fl |= 8;
  if (String(x.currency || '').toUpperCase() === 'USD') fl |= 16;
  if (x.featured) fl |= 32;                       // "Mashhur" — bosh sahifa aylanmasi
  const op = OP_IDX.indexOf(x.operator || '');
  return [
    id, digits, (op < 0 ? 0 : op),
    Number(x.price) || 0,
    Number(x.oldPrice) || 0,
    fl,
    Number(x.monthly6) || 0,
    Number(x.monthly12) || 0,
    Number(x.monthly24) || 0,
    Number(x.createdAtSort) || 0,
    qEsc(x.sellerNote),
    Math.max(0, TOIFA_IDX.indexOf(String(x.tier || '').toLowerCase()))
  ].join('|');
}

async function myNumbers(s, body) {
  const after = String((body && body.after) || '');
  let q = db.collection('numbers').where('sellerId', '==', s.id)
    .select('number', 'operator', 'price', 'oldPrice', 'currency', 'installment',
            'monthly6', 'monthly12', 'monthly24', 'reserved', 'hidden', 'sold',
            'sellerNote', 'createdAtSort', 'tier', 'featured')
    .limit(SAHIFA_SERVER);
  if (after) q = q.startAfter(await db.collection('numbers').doc(after).get());

  const snap = await q.get();
  const rows = snap.docs.map(d => qadoqla(d.id, d.data() || {}));
  const next = snap.size === SAHIFA_SERVER ? snap.docs[snap.docs.length - 1].id : '';
  return ok({ rows: rows.join('\n'), next, count: rows.length });
}

/* ---------- KO'RISHLAR VA BUYURTMALAR — FAQAT KO'RINIB TURGANLARI ----------
   Sotuvchida minglab raqam bo'lishi mumkin. Har biri uchun alohida
   statistika o'qilsa (Firestore 'in' so'rovi 10 tadan) 2000 raqam =
   200 ta so'rov — kabinet ochilishi bir necha soniya cho'ziladi.
   Shuning uchun ro'yxat statistikasiz keladi, statistika esa FAQAT
   ekranda ko'rinib turgan 50 ta raqam uchun, alohida so'ralib olinadi. */
async function numberStats(s, body) {
  const kelgan = Array.isArray(body.ids) ? body.ids.slice(0, 60).map(String) : [];
  if (!kelgan.length) return ok({ stats: {} });

  // Faqat O'Z raqamlari: boshqa sotuvchining ID'si so'ralsa — chiqarib tashlanadi
  const meniki = {};
  for (let i = 0; i < kelgan.length; i += 10) {
    const q = await db.collection('numbers')
      .where(admin.firestore.FieldPath.documentId(), 'in', kelgan.slice(i, i + 10)).get().catch(() => null);
    if (q) q.forEach(d => { if ((d.data() || {}).sellerId === s.id) meniki[d.id] = 1; });
  }
  const ids = Object.keys(meniki);
  const out = {};
  await Promise.all(bolaklar(ids, 10).map(async chunk => {
    const sn = await db.collection('stats_numbers')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk).get().catch(() => null);
    if (sn) sn.forEach(d => { const x = d.data() || {}; out[d.id] = { views: Number(x.views) || 0, orders: Number(x.orders) || 0 }; });
  }));
  return ok({ stats: out });
}

const bolaklar = (arr, n) => { const r = []; for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n)); return r; };

/* Narx bilan bog'liq barcha maydonlarni bitta joyda tekshiramiz —
   qo'shishda ham, tahrirlashda ham AYNAN bir xil qoida ishlasin. */
function narxMaydonlari(body, eski) {
  eski = eski || {};
  const valyuta = body.currency != null ? VALYUTA(body.currency) : VALYUTA(eski.currency);
  const price = body.price != null ? money(body.price) : (Number(eski.price) || 0);
  if (!price) return { xato: 'Narxni kiriting' };

  // AKSIYA: eski narx yangisidan KATTA bo'lishi shart, aks holda chegirma yo'q
  let oldPrice = body.oldPrice != null ? money(body.oldPrice) : (Number(eski.oldPrice) || 0);
  if (oldPrice && oldPrice <= price) return { xato: "Aksiya narxi: eski narx yangisidan katta bo'lishi kerak" };

  // DOLLARLIK raqamda bo'lib to'lash bo'lmaydi — hisob-kitob so'mda
  let installment = body.installment != null ? !!body.installment : !!eski.installment;
  if (valyuta === 'USD') installment = false;

  const oylik = {};
  for (const m of [6, 12, 24]) {
    const k = 'monthly' + m;
    const v = body[k] != null ? money(body[k]) : (Number(eski[k]) || 0);
    oylik[k] = installment ? v : 0;
    if (oylik[k] && oylik[k] * m < price * 0.5) {
      return { xato: m + ' oylik to\u2019lov juda kichik \u2014 tekshiring' };
    }
  }
  return { valyuta, price, oldPrice, installment, oylik };
}

/* So'ralgan toifa/"Mashhur" ni tarif va limit bilan solishtiradi.
   `eski` berilsa (tahrirlash) — allaqachon egallangan joy qayta
   hisoblanmaydi. Qaytaradi: {tier, featured} yoki {xato}. */
async function toifaTekshir(s, body, eski) {
  const tier = String((body && body.tier) || '').toLowerCase();
  const featured = !!(body && body.featured);
  if (!tier && !featured) return { tier: '', featured: false };
  if (tier && TARIF.TOIFALAR.indexOf(tier) === -1) return { xato: "Noma'lum toifa" };

  const { tarif, band } = await tarifHolat(s);
  const r = TARIF.ruxsatmi(tarif, tier, featured);
  if (r.xato) return { xato: r.xato };

  const eskiBand = !!(eski && eski.promoSeller);
  if (!eskiBand && tarif && band >= tarif.quota) {
    return { xato: tarif.name + ' tarifida ' + tarif.quota + ' raqamga ruxsat. ' +
      'Avval boshqa raqamdan toifani olib tashlang yoki tarifni oshiring.' };
  }
  return { tier, featured };
}

async function addNumber(s, body) {
  const number = normNumber(body.number);
  if (!number) return bad("Raqam noto'g'ri. Masalan: 901234567");
  const operator = operatorAniqla(number, clean(body.operator, 30));
  if (!operator) return bad('Operatorni tanlang');
  const n = narxMaydonlari(body, null);
  if (n.xato) return bad(n.xato);
  const price = n.price;

  /* DUBLIKAT: bitta raqam butun bazada faqat bir marta turadi.
     Oddiy `number == ...` yetmaydi — admin panel raqamni boshqa
     ko'rinishda ("+998 90 111-22-33") saqlagan bo'lishi mumkin.
     `DUBL.bormi` har qanday ko'rinishni 9 xonaga keltirib solishtiradi. */
  const dup = await DUBL.bormi(db, number);
  if (dup) return bad('Bu raqam bazada allaqachon bor');

  /* ---- TARIF MAJBURIY ----
     Raqam joylash endi tarif orqali: tarif yo'q bo'lsa javobda
     `tarifKerak: true` keladi va kabinet "Tarifni faollashtiring"
     ekranini chiqaradi. Tarif bor bo'lsa — raqam limiti tekshiriladi
     (Pro 100, Max 150, Ultra 500 — admin o'zgartira oladi). */
  const cnt = await db.collection('numbers').where('sellerId', '==', s.id).count().get().catch(() => null);
  const borSoni = cnt ? Number(cnt.data().count) || 0 : 0;
  if (borSoni >= MAX_NUMBERS) return bad('Raqamlar soni chegarasiga yetdingiz');
  const th = await tarifHolat(s);
  const lt = TARIF.limitTekshir(th.tarif, borSoni, 1);
  if (lt.xato) return bad(lt.xato, 400, { tarifKerak: !!lt.tarifKerak, limitTugadi: !!lt.limitTugadi });

  // Toifa so'ralgan bo'lsa — tarif va limit tekshiriladi
  const tv = await toifaTekshir(s, body);
  if (tv.xato) return bad(tv.xato);

  const ref = await db.collection('numbers').add({
    number, operator, price,
    oldPrice: n.oldPrice,
    onSale: n.oldPrice > price,
    currency: n.valyuta,
    installment: n.installment,
    monthly6: n.oylik.monthly6, monthly12: n.oylik.monthly12, monthly24: n.oylik.monthly24,
    reserved: false, hidden: false,
    /* TOIFA va "MASHHUR" — faqat faol tarifda va faqat limit ichida.
       Tarif yo'q yoki joy tugagan bo'lsa, so'rov ANIQ xato bilan
       rad etiladi (yuqoridagi `toifaTekshir`) — raqam "jimgina
       oddiy bo'lib" qo'shilmaydi, aks holda diler toifa qo'ydim
       deb o'ylab qolardi. Toifa so'ralmagan bo'lsa — oddiy raqam. */
    tier: tv.tier, featured: tv.featured,
    sellerId: s.id,
    sellerName: s.name || s.username,
    sellerNote: clean(body.note, 300),
    // OXIRGI RAQAMLAR — qidiruv uchun SHART. Saytdagi qidiruv
    // (api-index?p=...) aynan shu maydonlar bo'yicha ishlaydi:
    // ularsiz diler qo'shgan raqam qidiruvda UMUMAN topilmaydi.
    // (Admin panel buni allaqachon yozadi, seller-api esa yozmasdi.)
    last1: oxirgi(number, 1), last2: oxirgi(number, 2),
    last3: oxirgi(number, 3), last4: oxirgi(number, 4),
    createdAt: NOW(),
    createdAtSort: Date.now()
  });
  if (tv.tier || tv.featured) await ref.update({ promoSeller: s.id }).catch(() => {});
  await indeksEskirdi();
  return ok({ id: ref.id });
}

/* ---------- KO'P RAQAMNI BIRDANIGA JOYLASH ----------
   10 000 ta raqamni bittalab kiritib bo'lmaydi. Diler ro'yxatni
   nusxalab qo'yadi, kabinet uni tahlil qiladi va shu yerga
   200 tadan yuboradi.
   Har bir qator alohida tekshiriladi: xatosi bo'lgani o'tkazib
   yuboriladi, qolganlari yoziladi — butun ro'yxat bitta xato
   tufayli rad etilmaydi. */
async function addBulk(s, body) {
  const kelgan = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
  if (!kelgan.length) return bad("Ro'yxat bo'sh");

  const cnt = await db.collection('numbers').where('sellerId', '==', s.id).count().get().catch(() => null);
  const bor = cnt ? Number(cnt.data().count) || 0 : 0;
  if (bor + kelgan.length > MAX_NUMBERS) {
    return bad('Chegara: ' + MAX_NUMBERS + ' ta. Sizda ' + bor + ' ta bor.');
  }
  /* Tarif va raqam limiti — bittalab qo'shishda ham, ro'yxat bilan
     qo'shishda ham bir xil qoida. */
  const thb = await tarifHolat(s);
  const ltb = TARIF.limitTekshir(thb.tarif, bor, kelgan.length);
  if (ltb.xato) return bad(ltb.xato, 400, { tarifKerak: !!ltb.tarifKerak, limitTugadi: !!ltb.limitTugadi });

  // 1-bosqich: tekshirish
  const tayyor = [], xatolar = [];
  const korilgan = new Set();
  kelgan.forEach((r, i) => {
    const number = normNumber(r && r.number);
    if (!number) { xatolar.push({ i, number: String((r && r.number) || ''), xato: "Raqam noto'g'ri" }); return; }
    if (korilgan.has(number)) { xatolar.push({ i, number, xato: "Ro'yxatda takrorlangan" }); return; }
    const operator = operatorAniqla(number, '');
    if (!operator) { xatolar.push({ i, number, xato: 'Operator aniqlanmadi' }); return; }
    const n = narxMaydonlari({ price: r.price, oldPrice: r.oldPrice, currency: r.currency,
                               installment: r.installment, monthly24: r.monthly24 }, null);
    if (n.xato) { xatolar.push({ i, number, xato: n.xato }); return; }
    korilgan.add(number);
    tayyor.push({ number, operator, n, note: clean(r.note, 300) });
  });

  /* 2-bosqich: bazada bor-yo'qligini tekshirish.
     `number` bo'yicha to'g'ridan-to'g'ri solishtirish YETARLI EMAS —
     admin panel yoki bot raqamni boshqa ko'rinishda saqlagan bo'lishi
     mumkin ("+998 90 111-22-33"). Shu sabab oxirgi 4 raqam bo'yicha
     qidirib, 9 xonali ko'rinishda solishtiramiz (lib/dublikat.js). */
  const bazada = new Set();
  const oxirgi4 = Array.from(new Set(tayyor.map(t => DUBL.raqam9(t.number).slice(-4))));
  await Promise.all(oxirgi4.map(async l4 => {
    const q = await db.collection('numbers').where('last4', '==', l4)
      .select('number').limit(200).get().catch(() => null);
    if (q) q.forEach(d => bazada.add(DUBL.raqam9((d.data() || {}).number)));
  }));

  // 3-bosqich: yozish
  const batch = db.batch();
  let yozildi = 0;
  for (const t of tayyor) {
    if (bazada.has(DUBL.raqam9(t.number))) { xatolar.push({ number: t.number, xato: 'Bazada allaqachon bor' }); continue; }
    const ref = db.collection('numbers').doc();
    batch.set(ref, {
      number: t.number, operator: t.operator,
      price: t.n.price, oldPrice: t.n.oldPrice, onSale: t.n.oldPrice > t.n.price,
      currency: t.n.valyuta, installment: t.n.installment,
      monthly6: t.n.oylik.monthly6, monthly12: t.n.oylik.monthly12, monthly24: t.n.oylik.monthly24,
      reserved: false, featured: false, hidden: false, tier: '',
      sellerId: s.id, sellerName: s.name || s.username,
      sellerNote: t.note,
      last1: oxirgi(t.number, 1), last2: oxirgi(t.number, 2),
      last3: oxirgi(t.number, 3), last4: oxirgi(t.number, 4),
      createdAt: NOW(), createdAtSort: Date.now(),
      randomKey: Math.random()
    });
    yozildi++;
  }
  if (yozildi) { await batch.commit(); await indeksEskirdi(); }
  return ok({ yozildi, xatolar: xatolar.slice(0, 50), xatoSoni: xatolar.length });
}

async function mineOrFail(s, id) {
  const ref = db.collection('numbers').doc(String(id || ''));
  const snap = await ref.get();
  if (!snap.exists) { const e = new Error('Raqam topilmadi'); e.statusCode = 404; throw e; }
  const x = snap.data() || {};
  if (x.sellerId !== s.id) { const e = new Error('Bu raqam sizniki emas'); e.statusCode = 403; throw e; }
  return { ref, data: x };
}

async function updateNumber(s, body) {
  const { ref, data } = await mineOrFail(s, body.id);
  if (data.reserved || data.sold) return bad("Band yoki sotilgan raqamni o'zgartirib bo'lmaydi");
  const n = narxMaydonlari(body, data);
  if (n.xato) return bad(n.xato);
  const patch = {
    updatedAt: NOW(),
    price: n.price,
    oldPrice: n.oldPrice,
    onSale: n.oldPrice > n.price,
    currency: n.valyuta,
    installment: n.installment,
    monthly6: n.oylik.monthly6, monthly12: n.oylik.monthly12, monthly24: n.oylik.monthly24
  };
  if (body.note != null) patch.sellerNote = clean(body.note, 300);

  /* Toifa/"Mashhur" shu so'rovda ham o'zgartirilishi mumkin —
     kabinetdagi tahrirlash oynasi bitta tugma bilan saqlasin. */
  if (body.tier != null || body.featured != null) {
    const tv = await toifaTekshir(s, {
      tier: body.tier != null ? body.tier : data.tier,
      featured: body.featured != null ? body.featured : data.featured
    }, data);
    if (tv.xato) return bad(tv.xato);
    patch.tier = tv.tier;
    patch.featured = tv.featured;
    patch.promoSeller = (tv.tier || tv.featured) ? s.id : admin.firestore.FieldValue.delete();
  }

  await ref.update(patch);
  await indeksEskirdi();
  return ok({});
}

async function removeNumber(s, body) {
  const { ref, data } = await mineOrFail(s, body.id);
  if (data.reserved || data.sold) return bad("Band yoki sotilgan raqamni o'chirib bo'lmaydi");
  await ref.delete();
  await indeksEskirdi();
  return ok({});
}

/* ---------- KOMISSIYA OLIB TASHLANDI (V70) ----------
   Daromad modeli o'zgardi: biz dilerdan FOIZ olmaymiz — daromad
   faqat tarif obunasidan (Pro / Max / Ultra). Shu sabab "earnings"
   amali, `sellerCommissionPct` maydoni va kabinetdagi "Komissiya"
   bo'limi butunlay olib tashlandi. Eski raqamlarda qolib ketgan
   `sellerCommissionPct` maydoni hech qayerda o'qilmaydi. */

/* ---------- UMUMIY STATISTIKA ----------
   Bitta so'rovda kabinetning yuqorisidagi barcha ko'rsatkichlar.
   Raqamlar ro'yxati baribir o'qiladi, shu sabab qo'shimcha xarajat
   deyarli yo'q. */
async function umumiy(s) {
  // Faqat hisob uchun kerakli maydonlar — 10 000 raqamda ham javob yengil
  const q = await db.collection('numbers').where('sellerId', '==', s.id)
    .select('number', 'price', 'oldPrice', 'currency', 'installment', 'reserved', 'hidden', 'sold')
    .limit(MAX_NUMBERS).get();
  const nums = q.docs.map(d => Object.assign({ id: d.id }, d.data() || {}));

  // Ko'rishlar va buyurtmalar — stats_numbers hujjatlaridan
  let views = 0, orders = 0;
  const raqamNomi = {};
  nums.forEach(n => { raqamNomi[n.id] = n.number || ''; });
  const hammaStat = [];     // eng ko'p ko'rilgan/buyurtma olganlarni shu yerdan topamiz
  // Ketma-ket emas, PARALLEL o'qiymiz — 600 ta raqam ham bir soniyadan
  // kam vaqt oladi. Undan ortig'i bo'lsa, qamrov UI'da aytiladi.
  const QAMROV = 600;
  const ids = nums.map(n => n.id).slice(0, QAMROV);
  await Promise.all(bolaklar(ids, 10).map(async chunk => {
    const sn = await db.collection('stats_numbers')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk).get().catch(() => null);
    if (sn) sn.forEach(d => {
      const x = d.data() || {};
      const v = Number(x.views) || 0, o = Number(x.orders) || 0;
      views += v; orders += o;
      if (v || o) hammaStat.push({ number: raqamNomi[d.id] || '', views: v, orders: o });
    });
  }));

  // Eng yuqori 6 talik ro'yxatlar SERVERDA tuziladi — kabinet faqat
  // ko'rinib turgan 50 ta raqamning statistikasini biladi, shu sabab
  // "eng ko'p ko'rilgan" ni o'zi to'g'ri hisoblay olmaydi.
  const top6 = (kalit) => hammaStat.slice()
    .sort((a, b) => b[kalit] - a[kalit]).filter(x => x[kalit] > 0).slice(0, 6);

  const sotuvda = nums.filter(n => !n.sold && !n.reserved && !n.hidden).length;
  const band    = nums.filter(n => n.reserved && !n.sold).length;
  const sotilgan= nums.filter(n => n.sold).length;
  const aksiya  = nums.filter(n => Number(n.oldPrice) > Number(n.price)).length;
  const bolib   = nums.filter(n => n.installment).length;
  // Sotuvdagi raqamlarning jami qiymati (faqat so'mdagilar)
  const qiymat  = nums.filter(n => !n.sold && String(n.currency || 'UZS').toUpperCase() !== 'USD')
                      .reduce((a, n) => a + (Number(n.price) || 0), 0);

  // Hali ko'rilmagan buyurtmalar — pastki menyudagi qizil belgi uchun
  const yangiBuyurtma = await yangiBuyurtmaSoni(s);

  return ok({ stats: { jami: nums.length, sotuvda, band, sotilgan, aksiya, bolib, views, orders, qiymat,
                       qamrov: ids.length, yangiBuyurtma,
                       topViews: top6('views'), topOrders: top6('orders') } });
}

/* ---------- Admin bilan yozishma ---------- */
async function messages(s) {
  /* DIQQAT: `where(...) + orderBy(boshqa maydon)` Firestore'da QO'SHIMCHA
     indeks (composite index) talab qiladi — ya'ni siz Firebase konsolida
     qo'lda indeks yaratmasangiz, yozishma umuman ochilmaydi. Shuni
     talab qilmaslik uchun tartiblash SERVER XOTIRASIDA bajariladi:
     bitta dilerning yozishmasi ko'pi bilan bir necha yuz xabar — bu
     mutlaqo arzon. Natijada Firestore'da hech narsa sozlash kerak emas. */
  const q = await db.collection('seller_messages')
    .where('sellerId', '==', s.id).limit(400).get();
  const rows = q.docs.map(d => {
    const x = d.data() || {};
    return { id: d.id, from: x.from || 'seller', text: x.text || '', at: Number(x.createdAtSort) || 0 };
  }).sort((a, b) => a.at - b.at).slice(-100);
  await db.collection('sellers').doc(s.id).update({ unreadForSeller: 0 }).catch(() => {});
  return ok({ rows });
}

async function sendMessage(s, body) {
  const text = clean(body.text, 1500);
  if (!text) return bad('Xabar bo’sh');
  await db.collection('seller_messages').add({
    sellerId: s.id, sellerName: s.name || s.username,
    from: 'seller', text, createdAt: NOW(), createdAtSort: Date.now()
  });
  await db.collection('sellers').doc(s.id).update({
    unreadForAdmin: admin.firestore.FieldValue.increment(1),
    lastMessageAt: NOW()
  }).catch(() => {});
  return ok({});
}


/* ==================================================================
   TARIFLAR (Pro / Max) — DILERDAN KELADIGAN ASOSIY DAROMAD
   ------------------------------------------------------------------
   Oddiy raqam qo'yish BEPUL. Raqamni ajratib ko'rsatish (VIP /
   Premium / Gold rang-yorliq va bosh sahifadagi "Mashhur" aylanma)
   pullik obuna orqali ishlaydi.

   HISOB-KITOB BITTA JOYDA. "Nechta ajratilgan raqamim bor" degan son
   HECH QAYERDA alohida saqlanmaydi — har safar bazadan sanaladi.
   Shu sabab u hech qachon haqiqatdan chetlashib qolmaydi (sanoqni
   qo'lda oshirib-kamaytirish eng ko'p xato chiqaradigan joy).

   Sanoq ARZON: `promoSeller` maydoni FAQAT ajratilgan raqamlarda
   bo'ladi, ya'ni 10 000 raqamli dilerda ham so'rov 15 ta hujjatga
   tegadi, ustiga Firestore'ning `count()` agregati ishlatiladi
   (1000 hujjat = 1 o'qish). Qo'shimcha indeks ham kerak emas —
   so'rov BITTA maydon bo'yicha.
   ================================================================== */

async function ishlatilgan(sellerId) {
  const c = await db.collection('numbers').where('promoSeller', '==', sellerId)
    .count().get().catch(() => null);
  return c ? Number(c.data().count) || 0 : 0;
}

/* Dilerning tarif holati: faol tarif, muddat, sarflangan joy. */
async function tarifHolat(s) {
  const plans = await TARIF.tariflarniOl(db);
  const tarif = TARIF.faolTarif(s, plans);
  const band = await ishlatilgan(s.id);
  return { plans, tarif, band };
}

/* Diler kabineti "Tarif" bo'limini shundan chizadi. */
async function tariflar(s) {
  const { plans, tarif, band } = await tarifHolat(s);
  /* Diler hozir nechta raqam joylagan — tarif kartochkasida
     "100 tadan 37 tasi band" ko'rinishida ko'rsatiladi. */
  const jc = await db.collection('numbers').where('sellerId', '==', s.id)
    .count().get().catch(() => null);
  const jami = jc ? Number(jc.data().count) || 0 : 0;
  // Kutilayotgan so'rov bormi (admin hali tasdiqlamagan)
  let sorov = null;
  const q = await db.collection('seller_plan_requests')
    .where('sellerId', '==', s.id).limit(20).get().catch(() => null);
  if (q && !q.empty) {
    const rows = q.docs.map(d => Object.assign({ id: d.id }, d.data() || {}))
      .sort((a, b) => (Number(b.createdAtSort) || 0) - (Number(a.createdAtSort) || 0));
    const kut = rows.find(r => r.status === 'kutilmoqda');
    if (kut) sorov = { id: kut.id, planId: kut.planId, price: Number(kut.price) || 0, at: Number(kut.createdAtSort) || 0 };
  }
  return ok({
    plans,
    my: {
      plan: tarif ? tarif.id : '',
      name: tarif ? tarif.name : '',
      until: Number(s.planUntil) || 0,
      kun: TARIF.qolganKun(s),
      quota: tarif ? tarif.quota : 0,
      limit: tarif ? (Number(tarif.limit) || 0) : 0,
      jami,
      band,
      tiers: tarif ? tarif.tiers : [],
      featured: tarif ? !!tarif.featured : false
    },
    sorov,
    usullar: TOLOV.usullar()
  });
}

/* "Pro olish" tugmasi. Qo'lda to'lov: so'rov admin panelga tushadi.
   Onlayn: Payme/Click sahifasining manzili qaytariladi. */
async function tarifSorov(s, body) {
  const plans = await TARIF.tariflarniOl(db);
  const p = plans.find(x => x.id === String(body.planId || ''));
  if (!p) return bad('Tarif topilmadi');

  // Bitta vaqtda bitta kutilayotgan so'rov — admin chalkashmasin
  const bor = await db.collection('seller_plan_requests')
    .where('sellerId', '==', s.id).limit(20).get().catch(() => null);
  if (bor && !bor.empty) {
    const kut = bor.docs.map(d => d.data() || {}).find(r => r.status === 'kutilmoqda');
    if (kut) return bad("Oldingi so'rovingiz hali tasdiqlanmagan. Admin bilan bog'laning.");
  }

  const ref = await db.collection('seller_plan_requests').add({
    sellerId: s.id, sellerName: s.name || s.username,
    planId: p.id, planName: p.name, price: p.price, days: p.days,
    usul: String(body.usul || 'qolda') === 'online' ? 'online' : 'qolda',
    status: 'kutilmoqda',
    createdAt: NOW(), createdAtSort: Date.now()
  });

  // Adminga Telegram orqali xabar (token qo'yilgan bo'lsa)
  xabarAdminga("\uD83D\uDCB3 Tarif so'rovi\n" + (s.name || s.username) +
    " \u2014 " + p.name + " (" + p.price.toLocaleString('ru-RU') + " so'm)").catch(() => {});

  const javob = { id: ref.id, plan: p };
  if (String(body.usul || '') === 'online') {
    javob.payme = TOLOV.paymeUrl(ref.id, p.price);
    javob.click = TOLOV.clickUrl(ref.id, p.price);
    if (!javob.payme && !javob.click) {
      javob.ogohlantirish = "Onlayn to'lov hali yoqilmagan \u2014 admin tasdiqlashini kuting.";
    }
  }
  return ok(javob);
}

async function xabarAdminga(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text })
  }).catch(() => {});
}

/* Raqamga toifa / "Mashhur" belgisini qo'yish yoki olib tashlash.
   Tekshiruvlar ketma-ketligi MUHIM: avval arzonlari (qoida), keyin
   bazaga tegadigani (joy sanog'i). */
async function toifaQoy(s, body) {
  const { ref, data } = await mineOrFail(s, body.id);
  if (data.sold) return bad("Sotilgan raqamni o'zgartirib bo'lmaydi");

  const tier = String(body.tier || '').toLowerCase();
  if (tier && TARIF.TOIFALAR.indexOf(tier) === -1) return bad("Noma'lum toifa");
  const featured = !!body.featured;

  const { tarif, band } = await tarifHolat(s);
  const r = TARIF.ruxsatmi(tarif, tier, featured);
  if (r.xato) return bad(r.xato);

  const eskiBand = !!data.promoSeller;
  const yangiBand = !!(tier || featured);

  // Yangi joy egallanayotgan bo'lsa — limit tekshiriladi
  if (yangiBand && !eskiBand && tarif && band >= tarif.quota) {
    return bad(tarif.name + ' tarifida ' + tarif.quota + ' raqamga ruxsat. ' +
      'Avval boshqa raqamdan toifani olib tashlang yoki tarifni oshiring.');
  }

  const patch = {
    tier: tier || '',
    featured: featured,
    updatedAt: NOW()
  };
  patch.promoSeller = yangiBand ? s.id : admin.firestore.FieldValue.delete();
  await ref.update(patch);
  await indeksEskirdi();
  return ok({ band: yangiBand ? (eskiBand ? band : band + 1) : Math.max(0, band - (eskiBand ? 1 : 0)) });
}


/* ==================================================================
   BUYURTMALAR — DILERGA HAM TUSHADI
   ------------------------------------------------------------------
   Mijoz saytda raqamga buyurtma bersa, u endi ikki joyga tushadi:
   admin paneliga va O'SHA RAQAM EGASI bo'lgan dilerning kabinetiga.

   QANDAY TOPILADI. Buyurtma hujjatida `sellerId` bor (saytni o'zi
   yozadi — raqamning egasi indeksda ko'rsatilgan). Shu sabab so'rov
   BITTA maydon bo'yicha ketadi va bir zumda javob beradi. Aks holda
   dilerning 10 000 raqam ID'sini bo'lak-bo'lak solishtirish kerak
   bo'lardi — bu 1000 ta so'rov degani.

   XAVFSIZLIK. `sellerId` brauzerdan keladi, ya'ni unga KO'R-KO'RONA
   ishonib bo'lmaydi. Shu sabab ro'yxat chizilishidan oldin har bir
   buyurtmaning `numberId` si HAQIQATAN shu dilerniki ekani bazadan
   qayta tekshiriladi (10 tadan guruhlab). Mos kelmagani tashlab
   yuboriladi — ya'ni maydonni o'zgartirib boshqa dilerning mijozini
   ko'rib bo'lmaydi.
   ================================================================== */
const BUYURTMA_CAP = 300;     // bazadan olinadigan eng ko'p buyurtma
const BUYURTMA_SAHIFA = 60;   // kabinetga yuboriladigan son

async function buyurtmalar(s, body) {
  const q = await db.collection('orders')
    .where('sellerId', '==', s.id).limit(BUYURTMA_CAP).get().catch(() => null);
  if (!q || q.empty) return ok({ rows: [], jami: 0, yangi: 0 });

  const hammasi = q.docs.map(d => Object.assign({ id: d.id }, d.data() || {}))
    .sort((a, b) => (Number(b.createdAtSort) || 0) - (Number(a.createdAtSort) || 0));
  const kesilgan = hammasi.slice(0, BUYURTMA_SAHIFA);

  /* --- Egalik tekshiruvi --- */
  const idlar = Array.from(new Set(kesilgan.map(o => o.numberId).filter(Boolean)));
  const meniki = {};
  for (let i = 0; i < idlar.length; i += 10) {
    const chunk = idlar.slice(i, i + 10);
    const r = await db.collection('numbers')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .select('sellerId').get().catch(() => null);
    if (r) r.forEach(d => { if ((d.data() || {}).sellerId === s.id) meniki[d.id] = 1; });
  }

  const rows = kesilgan.filter(o => o.numberId && meniki[o.numberId]).map(o => ({
    id: o.id,
    number: o.number || '',
    name: o.name || '',
    phone: o.phone || '',
    region: o.region || '',
    price: Number(o.price) || 0,
    currency: o.currency === 'USD' ? 'USD' : 'UZS',
    status: o.status || 'Yangi',
    paymentType: o.paymentType === 'installment' ? 'installment' : 'cash',
    months: Number(o.installmentMonths) || 0,
    monthly: Number(o.monthlyPayment) || 0,
    down: Number(o.installmentDownPayment) || 0,
    source: o.source || 'Sayt',
    at: Number(o.createdAtSort) || 0,
    sana: o.createdAt || ''
  }));

  /* "Yangi" (hali ko'rilmagan) sanog'i — pastki menyudagi belgi uchun */
  const korilgan = Number(s.ordersSeenAt) || 0;
  const yangi = rows.filter(o => o.at > korilgan).length;

  // Diler ro'yxatni ochdi — belgini so'ndiramiz
  if (body && body.korildi) {
    await db.collection('sellers').doc(s.id)
      .update({ ordersSeenAt: Date.now() }).catch(() => {});
  }
  return ok({ rows, jami: hammasi.length, yangi });
}

/* Pastki menyudagi belgi uchun yengil sanoq (ro'yxat yuklanmasdan).
   FAQAT yangi (hali ko'rilmagan) buyurtmalar tekshiriladi — ular
   odatda bir nechta, shu sabab egalik tekshiruvi ham shu yerda
   arzonga tushadi va belgi ro'yxat bilan BIR XIL sonni ko'rsatadi. */
async function yangiBuyurtmaSoni(s) {
  const korilgan = Number(s.ordersSeenAt) || 0;
  try {
    const q = await db.collection('orders').where('sellerId', '==', s.id)
      .select('createdAtSort', 'numberId').limit(BUYURTMA_CAP).get();
    const yangilar = [];
    q.forEach(d => {
      const x = d.data() || {};
      if ((Number(x.createdAtSort) || 0) > korilgan && x.numberId) yangilar.push(x.numberId);
    });
    if (!yangilar.length) return 0;
    const idlar = Array.from(new Set(yangilar)).slice(0, 60);
    const meniki = {};
    for (let i = 0; i < idlar.length; i += 10) {
      const r = await db.collection('numbers')
        .where(admin.firestore.FieldPath.documentId(), 'in', idlar.slice(i, i + 10))
        .select('sellerId').get().catch(() => null);
      if (r) r.forEach(d => { if ((d.data() || {}).sellerId === s.id) meniki[d.id] = 1; });
    }
    return yangilar.filter(id => meniki[id]).length;
  } catch (e) { return 0; }
}

/* ---------- Kirish nuqtasi ---------- */
exports.handler = async function (event) {
  KORS = korsHead(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: KORS, body: '' };
  if (event.httpMethod !== 'POST') return bad('Faqat POST', 405);

  // Imzo kalitini tayyorlash. Netlify'da SELLER_SECRET qo'yilgan bo'lsa
  // o'sha, bo'lmasa tizim birinchi ishlaganda o'zi hosil qilib,
  // Firestore'ga saqlab qo'yadi — qo'lda sozlash shart emas.
  try { await initSecret(db); }
  catch (e) { return bad('Imzo kalitini tayyorlab bo\u2019lmadi: ' + String((e && e.message) || e), 503); }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return bad("Noto'g'ri JSON"); }
  const action = String(body.action || '');

  try {
    if (action === 'login') return await doLogin(body);

    const s = await requireSeller(event, db);
    switch (action) {
      case 'me': {
        /* Kabinet ochilishi bilan tarif holatini ham oladi — "Tarif"
           bo'limiga kirmasdan ham yuqorida ko'rinib turadi. */
        const plans = await TARIF.tariflarniOl(db);
        const t = TARIF.faolTarif(s, plans);
        return ok({ seller: {
          id: s.id, name: s.name || '', username: s.username,
          unread: Number(s.unreadForSeller) || 0,
          plan: t ? t.id : '', planName: t ? t.name : '',
          planUntil: Number(s.planUntil) || 0, planKun: TARIF.qolganKun(s),
          quota: t ? t.quota : 0,
          limit: t ? (Number(t.limit) || 0) : 0,
          tiers: t ? (t.tiers || []) : [],
          featured: t ? !!t.featured : false
        } });
      }
      case 'myNumbers':    return await myNumbers(s, body);
      case 'stats':        return await umumiy(s);
      case 'numberStats':  return await numberStats(s, body);
      case 'addNumber':    return await addNumber(s, body);
      case 'addBulk':      return await addBulk(s, body);
      case 'updateNumber': return await updateNumber(s, body);
      case 'removeNumber': return await removeNumber(s, body);
      case 'tariflar':     return await tariflar(s);
      case 'tarifSorov':   return await tarifSorov(s, body);
      case 'toifaQoy':     return await toifaQoy(s, body);
      case 'buyurtmalar':  return await buyurtmalar(s, body);
      case 'messages':     return await messages(s);
      case 'sendMessage':  return await sendMessage(s, body);
      default:             return bad("Noma'lum amal");
    }
  } catch (e) {
    return bad(String((e && e.message) || e), (e && e.statusCode) || 500);
  }
};
