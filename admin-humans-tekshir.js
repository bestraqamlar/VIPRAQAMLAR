// ==================================================================
// HUMANS API TEKSHIRGICHI  (V154)
// ==================================================================
// NEGA BU FUNKSIYA KERAK BO'LDI.
//
// Mijoz aytgan nosozlik: "Humans o'zining bazasi bilan bir xil
// ishlamayapti — bizda KAMROQ raqam ko'rsatadi; sahifani bir necha
// marta yangilasa, qolganlarini ham ko'rsatadi; Humans'ning o'z
// saytida esa qidiruv bosilsa darhol hammasi chiqadi."
//
// Bu uch xil sababdan bo'lishi mumkin va ularni TAXMIN bilan
// ajratib bo'lmaydi:
//
//   1) BIZNING CHEKLOV. `api-live-search` har bir operatordan
//      ko'pi bilan `limit` ta (standart 40) raqam oladi. Humans'da
//      naqshga mos 200 ta raqam bo'lsa, biz 40 tasini ko'rsatamiz.
//
//   2) SO'ROV PARAMETRI. Biz so'rovga `poolNumberRegion: '1726'`
//      va `isPhantom: false` yuboramiz. Agar Humans'ning o'z sayti
//      mintaqani umuman yubormasa (yoki boshqa qiymat yuborsa),
//      bizning so'rov ataylab torroq natija oladi.
//
//   3) SERVER TOMONDAN SAHIFALASH. API bir so'rovda ro'yxatning
//      faqat bir qismini (aylanma tartibda) qaytarayotgan bo'lishi
//      mumkin — "yangilasa qolganlari chiqadi" degani aynan shunga
//      o'xshaydi.
//
// Shu funksiya AYNAN SHU UCHTASINI o'lchab beradi: bir xil naqsh
// bilan bir nechta parametr to'plamini sinab ko'radi, har birida
// nechta raqam kelganini sanaydi va bir xil so'rovni bir necha marta
// takrorlab, natija o'zgaradimi yo'qmi — ko'rsatadi.
//
// HECH NARSANI O'ZGARTIRMAYDI: faqat o'qiydi va hisobot qaytaradi.
// Shuning uchun uni xotirjam ishga tushirsa bo'ladi.
//
// ============ QANDAY ISHGA TUSHIRILADI ============
// Admin panelida "Kuzatuv" bo'limidagi tugma orqali, yoki qo'lda:
//   POST /.netlify/functions/admin-humans-tekshir
//   Authorization: Bearer <admin id token>
//   { "mask": "7777777" }          // ixtiyoriy, standart "_______"
// ==================================================================

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

const CORS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const javob = (kod, obj) => ({ statusCode: kod, headers: CORS, body: JSON.stringify(obj, null, 2) });

/* --- Humans so'rovining qismlari (operators.js dagi bilan bir xil) --- */
const API = 'https://hf-api-prod-web.humans-it.dev';
const APP = 'net.humans.fintech_uz.web/1.2.730 (GraphQL/SCHEMA) // apollo/client/3.4.10';
const UA  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const PREFIX = '99833';

function H(extra) {
  const t = Date.now().toString(36);
  return Object.assign({
    'content-type': 'application/json',
    origin: 'https://humans.uz',
    referer: 'https://humans.uz/',
    'user-agent': UA,
    'x-humans-avatar-type': 'WEB',
    'x-humans-locale': 'uz-UZ',
    'x-humans-name': 'unknown',
    'x-humans-trace': t + ':' + t + ':0:1',
    'x-user-agent': 'net.humans.fintech_uz.web/1.2.730 // wretch/1.7.4'
  }, extra || {});
}
const JOIN =
  'mutation JoinAnonymous($app: String!, $deviceInfo: DeviceInfo!, $avatar: String) {'
  + ' joinAnonymous(input: { app: $app, deviceInfo: $deviceInfo, avatar: $avatar })'
  + ' { __typename ... on JoinAnonymousResult { userID } } }';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
  });
}
function kutish(ms) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }

async function sessiya() {
  const r = await fetch(API + '/graphql', {
    method: 'POST',
    headers: H({ 'x-humans-host': 'im' }),
    body: JSON.stringify({
      operationName: 'JoinAnonymous', query: JOIN,
      variables: {
        app: APP,
        deviceInfo: { web: { userAgent: UA, meta: { locale: 'uz-UZ' }, deviceID: uuid() } },
        avatar: 'enterprise_default'
      }
    }),
    signal: kutish(9000)
  });
  const token = r.headers.get('x-humans-session-token');
  const j = await r.json().catch(() => ({}));
  const userID = j && j.data && j.data.joinAnonymous && j.data.joinAnonymous.userID;
  if (!token || !userID) {
    const sabab = (j && j.errors && j.errors[0] && j.errors[0].message) || ('HTTP ' + r.status);
    throw new Error('Sessiya olinmadi: ' + sabab);
  }
  return { token, userID };
}

async function qidir(s, mask, qoshimcha) {
  const tana = Object.assign({
    salesChannel: 'WEB_AUTH',
    bookingResourceId: s.userID,
    bookingResourceIdType: 'SESSION_ID',
    poolNumberRegion: '1726',
    isPhantom: false,
    msisdnPattern: mask,
    prefix: PREFIX
  }, qoshimcha || {});
  /* `undefined` qiymatli maydonlar JSON'ga umuman tushmaydi —
     "bu parametrni YUBORMASLIK" holatini shunday sinaymiz. */
  const t0 = Date.now();
  let r, txt;
  try {
    r = await fetch(API + '/ftuz/api/v1/msisdns/retail/available', {
      method: 'POST',
      headers: H({ 'x-humans-host': 'im', 'x-humans-session-token': s.token }),
      body: JSON.stringify(tana),
      signal: kutish(9000)
    });
    txt = await r.text();
  } catch (e) {
    return { xato: String((e && e.message) || e), ms: Date.now() - t0 };
  }
  let j = null;
  try { j = JSON.parse(txt); } catch (e) {}
  if (!Array.isArray(j)) {
    return { status: r.status, xato: 'ro\'yxat emas', javob: txt.slice(0, 300), ms: Date.now() - t0 };
  }
  return {
    status: r.status,
    soni: j.length,
    raqamlar: j.map(x => String(x.msisdn || '')),
    ms: Date.now() - t0
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return javob(405, { ok: false, error: 'Faqat POST' });

  /* --- Faqat bosh admin --- */
  try {
    const authHeader = (event.headers.authorization || event.headers.Authorization || '');
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) return javob(401, { ok: false, error: 'Token yo\'q' });
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (decoded.superAdmin !== true) return javob(403, { ok: false, error: 'Faqat bosh admin' });
  } catch (e) {
    return javob(401, { ok: false, error: 'Token tekshirilmadi' });
  }

  let kirish = {};
  try { kirish = JSON.parse(event.body || '{}'); } catch (e) {}
  /* Naqsh: 7 ta belgi. Bo'sh joy "_" (istalgan raqam) bilan to'ldiriladi. */
  let mask = String(kirish.mask || '').replace(/[^0-9_]/g, '').slice(0, 7);
  while (mask.length < 7) mask += '_';

  let s;
  try { s = await sessiya(); }
  catch (e) { return javob(200, { ok: false, bosqich: 'sessiya', error: String(e.message || e) }); }

  /* 1-QISM: parametr variantlari — qaysi biri KO'PROQ raqam beradi? */
  const variantlar = [
    ['hozirgi kod',            {}],
    ['mintaqasiz',             { poolNumberRegion: undefined }],
    ['isPhantom: true',        { isPhantom: true }],
    ['salesChannel: WEB',      { salesChannel: 'WEB' }],
    ['salesChannel: SELF_SERVICE', { salesChannel: 'SELF_SERVICE' }],
    ['limit: 500',             { limit: 500 }],
    ['size: 500',              { size: 500 }],
    ['pageSize: 500',          { pageSize: 500 }],
    ['mintaqasiz + limit 500', { poolNumberRegion: undefined, limit: 500 }]
  ];
  const parametrlar = [];
  for (const [nom, q] of variantlar) {
    const r = await qidir(s, mask, q);
    parametrlar.push(Object.assign({ variant: nom }, r, { raqamlar: undefined }));
    await new Promise(x => setTimeout(x, 150));
  }

  /* 2-QISM: bir xil so'rov bir necha marta — natija o'zgaradimi?
     Agar har safar BOSHQA raqamlar kelsa, demak API sahifalab/
     aylantirib qaytaryapti va yechim — natijalarni to'plab borish. */
  const takror = [];
  const toplam = new Set();
  for (let i = 0; i < 5; i++) {
    const r = await qidir(s, mask, {});
    takror.push(r.soni != null ? r.soni : ('xato: ' + r.xato));
    (r.raqamlar || []).forEach(x => toplam.add(x));
    await new Promise(x => setTimeout(x, 300));
  }

  const birinchi = parametrlar[0] || {};
  const engKop = parametrlar.reduce((a, b) => ((b.soni || 0) > (a.soni || 0) ? b : a), parametrlar[0] || {});

  return javob(200, {
    ok: true,
    naqsh: mask,
    xulosa: {
      'hozirgi kod nechta beradi': birinchi.soni != null ? birinchi.soni : birinchi.xato,
      'eng ko\'p bergan variant': engKop.variant,
      'eng ko\'p nechta': engKop.soni,
      'bir xil so\'rovda har safar': takror.join(', '),
      '5 ta so\'rovdagi noyob raqamlar': toplam.size,
      'natija har safar o\'zgaradimi': toplam.size > (birinchi.soni || 0)
        ? 'HA — API aylanma/qisman javob qaytaryapti'
        : 'YO\'Q — javob barqaror'
    },
    parametrlar,
    izoh: 'Bu hisobotni Claude ga yuboring — qaysi parametr natijani '
        + 'kesayotgani shundan aniq ko\'rinadi.'
  });
};
