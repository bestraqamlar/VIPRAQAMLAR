// UZEX AUKSION QIDIRUVI — FAQAT ADMIN PANELI UCHUN.
//
// NIMA: mobilraqam.uzex.uz (UZEX birjasi) auksionida hozir sotuvda turgan
// raqamlarni mask bo'yicha qidiradi. Natijada har bir lot uchun: raqam,
// boshlang'ich narx, savdo boshlanish va tugash vaqti, sotuvchi kompaniya.
//
// NEGA SERVER ORQALI: UZEX API'si brauzerdan to'g'ridan-to'g'ri chaqirilsa
// CORS bilan bloklanadi. Bundan tashqari so'rov "user-agent" sarlavhasisiz
// HTTP 403 qaytaradi (tekshirilgan) — brauzer bu sarlavhani o'zgartirishga
// ruxsat bermaydi. Shu sabab so'rov shu yerdan, serverdan yuboriladi.
//
// XAVFSIZLIK: bu ma'lumot SAYTGA CHIQARILMAYDI — faqat admin paneli uchun.
// Shu sabab requireAdmin() bilan himoyalangan: oddiy foydalanuvchi (hatto
// Firebase'da hisobi bo'lsa ham) bu funksiyani chaqira olmaydi.
//
// API TAFSILOTLARI (real so'rov bilan tasdiqlangan, 2026-09-17):
//   POST https://api-mobilraqam.uzex.uz/api/Lot/Filter
//   Majburiy sarlavha: user-agent (usiz 403). Auth/token KERAK EMAS.
//   So'rov tanasi:
//     { from, to, startPrice, endPrice, isAllowedJuridic, isAllowedIndividual,
//       fullNumbers, isToday, isMyOffer }
//   fullNumbers — AYNAN 9 belgi: raqamning operator kodisiz qismi,
//     noma'lum joyda "x" (masalan "xxxxxx444"). Pozitsion ishlaydi.
//   Javob: { items: [ { number_Prefix, number_Code, number_Body,
//     start_Price, start_Date, end_Date, seller_Company_Name, records, ... } ] }
//   Raqam = number_Prefix + number_Code + number_Body (jami 9 xona).
//
// ESLATMA (from/to): bu maydonlar oddiy sahifalash kabi ishlamaydi —
// "to:12" so'ralganda ham 54 ta, "to:200" da 338 ta qaytdi (o'lchangan).
// Ko'rinishidan UZEX ularni sotuvchi guruhlari bo'yicha qo'llaydi. Shu
// sabab biz keng oraliq so'rab, keraklisini SHU YERDA kesamiz.

// MUHIM TUZATISH: bu fayl avval Firebase Admin SDK'ni HECH QACHON
// ishga tushirmagan edi (admin.initializeApp() chaqirilmagan) — Netlify
// har bir funksiyani ALOHIDA to'plam (bundle) sifatida joylashtirgani
// uchun, boshqa funksiyalarda ishga tushirilgan bo'lishi bu yerga
// UMUMAN ta'sir qilmaydi. Natijada requireAdmin() ichidagi
// `admin.auth().verifyIdToken()` HAR DOIM ("default Firebase app
// mavjud emas" xato bilan) muvaffaqiyatsiz tugardi — token chindan ham
// yaroqli bo'lsa ham — va bu chalkash "Token yaroqsiz, muddati o'tgan
// yoki hisob to'xtatilgan" xabari sifatida ko'rinardi. Boshqa barcha
// admin-*.js fayllaridagi BIR XIL naqsh bilan endi bu yerda ham
// to'g'rilandi.
const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

const UZEX_URL = 'https://api-mobilraqam.uzex.uz/api/Lot/Filter';
const UZEX_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT = 15000;
const MAX_ITEMS = 500;

// Mask: 9 belgi. Raqam bo'lmagan har qanday belgi (bo'shliq, "_", "*")
// "x" (noma'lum) deb qabul qilinadi — adminkadagi "xx xxx xx xx"
// ko'rinishidagi maydon aynan shunday yuboradi.
function normalizeMask(raw) {
  const s = String(raw || '');
  const out = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') out.push(ch);
    else if (ch === 'x' || ch === 'X' || ch === '_' || ch === '*') out.push('x');
    // bo'shliq, tire va boshqa bezak belgilari tashlab yuboriladi
  }
  if (out.length !== 9) return null;
  return out.join('');
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  // FAQAT admin. 'watch' — "Baza raqam" bo'limiga yaqin funksiya bo'lgani
  // uchun shu ruxsat guruhidan foydalanamiz.
  try {
    await requireAdmin(event, { feature: 'watch' });
  } catch (err) {
    return {
      statusCode: err.statusCode || 401,
      headers,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri JSON' }) }; }

  const mask = normalizeMask(input.mask);
  if (!mask) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ ok: false, error: 'Mask 9 ta belgidan iborat bo\'lishi kerak (masalan: xxxxxx444)' })
    };
  }

  const startPrice = Number(input.startPrice) > 0 ? Number(input.startPrice) : 1;
  const endPrice = Number(input.endPrice) > 0 ? Number(input.endPrice) : 300000000;

  // XAVFSIZLIK/BARQARORLIK: UZEX ba'zan (ayniqsa ko'p so'rov ketganda)
  // bir zumlik xato/vaqtinchalik javob bermaslik holatini ko'rsatishi
  // mumkin — endi bitta so'rov o'rniga, birinchisi muvaffaqiyatsiz
  // bo'lsa (tarmoq xatosi yoki HTTP xato), 900ms kutib YANA BIR MARTA
  // avtomatik qayta so'raladi, darhol xato qaytarish o'rniga.
  async function callUzex() {
    const res = await fetch(UZEX_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': UZEX_UA,
        accept: 'application/json',
        'accept-language': 'ru-RU,ru;q=0.9,uz;q=0.8,en;q=0.7',
        // Ba'zi API'lar "brauzerdan kelmoqda" deb ishonishi uchun shu
        // ikki sarlavhani ham tekshiradi — zarar qilmaydi, faqat foyda.
        origin: 'https://mobilraqam.uzex.uz',
        referer: 'https://mobilraqam.uzex.uz/'
      },
      body: JSON.stringify({
        from: 0,
        to: 200,
        startPrice,
        endPrice,
        isAllowedJuridic: true,
        isAllowedIndividual: true,
        fullNumbers: mask,
        isToday: false,
        isMyOffer: false
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.text()).slice(0, 150); } catch (_) {}
      const err = new Error('UZEX javob bermadi (HTTP ' + res.status + ')' + (detail ? ': ' + detail : ''));
      err.httpStatus = res.status;
      throw err;
    }
    return res;
  }

  try {
    let res;
    try {
      res = await callUzex();
    } catch (firstErr) {
      await new Promise(r => setTimeout(r, 900));
      res = await callUzex();
    }

    const rawText = await res.text();
    let data;
    try { data = JSON.parse(rawText); } catch (e) { data = {}; }

    // MUHIM TASHXIS: UZEX javobi turli shaklda kelishi mumkin (masalan
    // {items:[...]}, {Items:[...]}, {data:{items:[...]}} va h.k.) —
    // avval FAQAT `data.items` tekshirilar edi, agar UZEX buni
    // o'zgartirgan bo'lsa, natija JIM ravishda bo'sh qaytardi (xato
    // ko'rsatilmasdan). Endi bir nechta odatiy variant sinab ko'riladi.
    const raw = Array.isArray(data.items) ? data.items
      : Array.isArray(data.Items) ? data.Items
      : Array.isArray(data.result) ? data.result
      : (data.data && Array.isArray(data.data.items)) ? data.data.items
      : [];

    // Har bir maydonni bir nechta mumkin bo'lgan nom variant bilan o'qiydi
    // (UZEX camelCase yoki PascalCase'ga o'tgan bo'lsa ham ishlashi uchun).
    function pick(obj, ...keys) {
      for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]; }
      return '';
    }

    const items = raw.slice(0, MAX_ITEMS).map(x => {
      const prefix = pick(x, 'number_Prefix', 'numberPrefix', 'Number_Prefix');
      const code = pick(x, 'number_Code', 'numberCode', 'Number_Code');
      const body = pick(x, 'number_Body', 'numberBody', 'Number_Body');
      const singleNumber = pick(x, 'number', 'phoneNumber', 'fullNumber');
      const digits = String(prefix + code + body || singleNumber)
        .replace(/\D/g, '');
      // 9 xona = operator kodisiz raqam (masalan 901234567), ba'zan
      // to'liq 12 xonali ("998901234567") kelishi ham mumkin.
      const num9 = digits.length === 12 ? digits.slice(3) : digits;
      return {
        number: '+998' + num9,
        prefix: String(prefix || ''),
        price: Number(pick(x, 'start_Price', 'startPrice', 'Start_Price')) || 0,
        startDate: pick(x, 'start_Date', 'startDate', 'Start_Date') || null,
        endDate: pick(x, 'end_Date', 'endDate', 'End_Date') || null,
        seller: pick(x, 'seller_Company_Name', 'sellerCompanyName', 'Seller_Company_Name'),
        lotId: x.id || null,
        // UZEX lot sahifasiga havola uchun (adminda kerak bo'lsa ishlatiladi)
        displayId: String(pick(x, 'display_Id', 'displayId', 'Display_Id')).trim()
      };
    }).filter(x => x.number.replace(/\D/g, '').length === 12);

    // Eng arzonidan boshlab — adminka ro'yxati shu tartibda ko'rsatiladi.
    items.sort((a, b) => a.price - b.price);

    // MUHIM TASHXIS: agar UZEX'dan xom ma'lumot kelgan bo'lsa-yu, lekin
    // bizning "tozalashimizdan" keyin 0 ta chiqsa (masalan UZEX maydon
    // nomlarini o'zgartirgan bo'lsa) — buni JIM o'tkazib yubormaymiz,
    // birinchi xom elementning haqiqiy kalitlarini debug sifatida
    // qaytaramiz, shunda muammoni ANIQ ko'rib, tezda tuzatish mumkin.
    const debugInfo = (raw.length > 0 && items.length === 0)
      ? { rawSampleKeys: Object.keys(raw[0] || {}), rawSample: JSON.stringify(raw[0]).slice(0, 500) }
      : undefined;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        mask,
        count: items.length,
        // UZEX'ning o'zi ko'rsatgan umumiy topilma soni (biz kesganimizdan
        // ko'p bo'lishi mumkin) — adminkada "416 tadan 338 tasi" deb
        // ko'rsatish uchun.
        totalFound: raw.length ? (Number(pick(raw[0], 'records', 'Records')) || items.length) : 0,
        debug: debugInfo,
        items
      })
    };
  } catch (err) {
    console.error('admin-uzex-search xato:', err.message);
    const isTimeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      statusCode: isTimeout ? 504 : 502,
      headers,
      body: JSON.stringify({
        ok: false,
        error: isTimeout ? 'UZEX javob berishga juda ko\'p vaqt oldi' : err.message
      })
    };
  }
};
