// UZEX (mobilraqam.uzex.uz) AUKSION API'GA UMUMIY MIJOZ — bir necha
// funksiya shu bitta joydan foydalanadi:
//   - admin-uzex-search.js   (admin panelidagi qo'lda qidiruv formasi)
//   - admin-ai-assistant.js  (AI yordamchining "search_uzex_auction" vositasi)
//   - uzex-watch-check-background.js (fonda ishlaydigan kuzatuv)
// Avval bu mantiq admin-uzex-search.js ichida yolg'iz edi — endi
// takrorlanmasin va barcha joyda BIR XIL ishlasin deb shu yerga
// ko'chirildi.
//
// API TAFSILOTLARI (real so'rov bilan tasdiqlangan, 2026-09-17):
//   POST https://api-mobilraqam.uzex.uz/api/Lot/Filter
//   Majburiy sarlavha: user-agent (usiz 403). Auth/token KERAK EMAS.
//   fullNumbers — AYNAN 9 belgi, noma'lum joyda "x" (pozitsion mos keladi).
//   Javob: { items: [ { number_Prefix, number_Code, number_Body,
//     start_Price, start_Date, end_Date, seller_Company_Name, records, ... } ] }
//
// MIJOZ TALABI: "yuridik bo'lgan raqamlarni chiqarmasin, faqat jismoniy
// shaxs uchun keladigan raqamni chiqarsin" — shu sabab bu klient HAR
// DOIM faqat jismoniy shaxslarga tegishli lotlarni so'raydi
// (isAllowedIndividual:true, isAllowedJuridic:false). Bu ixtiyoriy EMAS,
// har bir chaqiruvchida (qo'lda qidiruv, AI, kuzatuv) bir xil ishlaydi.

const UZEX_URL = 'https://api-mobilraqam.uzex.uz/api/Lot/Filter';
const UZEX_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
  + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';

const REQUEST_TIMEOUT = 15000;
// Mijoz: "filtrda 500 ta raqam chiqarar ekan, 2000 ta raqam chiqarsin,
// eng ko'pi" — natijani saqlashda kesish chegarasi oshirildi.
const MAX_ITEMS = 2000;

// Mask: 9 belgi. Raqam bo'lmagan har qanday belgi (bo'shliq, "_", "*")
// "x" (noma'lum) deb qabul qilinadi.
function normalizeMask(raw) {
  const s = String(raw || '');
  const out = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') out.push(ch);
    else if (ch === 'x' || ch === 'X' || ch === '_' || ch === '*') out.push('x');
  }
  if (out.length !== 9) return null;
  return out.join('');
}

function pick(obj, ...keys) {
  for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]; }
  return '';
}

// Xom UZEX elementini bizning standart shaklimizga o'giradi (turli
// maydon nomi variantlariga chidamli — qarang: admin-uzex-search.js
// tarixidagi izoh).
function normalizeItem(x) {
  const prefix = pick(x, 'number_Prefix', 'numberPrefix', 'Number_Prefix');
  const code = pick(x, 'number_Code', 'numberCode', 'Number_Code');
  const body = pick(x, 'number_Body', 'numberBody', 'Number_Body');
  const singleNumber = pick(x, 'number', 'phoneNumber', 'fullNumber');
  const digits = String(prefix + code + body || singleNumber).replace(/\D/g, '');
  const num9 = digits.length === 12 ? digits.slice(3) : digits;
  return {
    number: '+998' + num9,
    prefix: String(prefix || ''),
    price: Number(pick(x, 'start_Price', 'startPrice', 'Start_Price')) || 0,
    startDate: pick(x, 'start_Date', 'startDate', 'Start_Date') || null,
    endDate: pick(x, 'end_Date', 'endDate', 'End_Date') || null,
    seller: pick(x, 'seller_Company_Name', 'sellerCompanyName', 'Seller_Company_Name'),
    lotId: x.id || null,
    displayId: String(pick(x, 'display_Id', 'displayId', 'Display_Id')).trim()
  };
}

async function callUzexOnce(body) {
  const res = await fetch(UZEX_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': UZEX_UA,
      accept: 'application/json',
      'accept-language': 'ru-RU,ru;q=0.9,uz;q=0.8,en;q=0.7',
      origin: 'https://mobilraqam.uzex.uz',
      referer: 'https://mobilraqam.uzex.uz/'
    },
    body: JSON.stringify(body),
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

// XAVFSIZLIK/BARQARORLIK: bitta so'rov muvaffaqiyatsiz bo'lsa, 900ms
// kutib avtomatik yana bir marta uriniladi.
async function callUzexWithRetry(body) {
  try {
    return await callUzexOnce(body);
  } catch (firstErr) {
    await new Promise(r => setTimeout(r, 900));
    return await callUzexOnce(body);
  }
}

// opts: { mask, startPrice, endPrice, seller, dateFrom, dateTo, limit }
//   mask       — 9 belgi (normalizeMask'dan o'tgan yoki xom, ichkarida tekshiriladi)
//   seller     — kompaniya nomi bo'yicha qism-moslik (case-insensitive), UZEX
//                bu bo'yicha rasmiy filtr parametrini bermagani uchun natija
//                keyin SHU YERDA (serverda) kesiladi.
//   dateFrom/dateTo — savdo BOSHLANISH sanasi (ISO yoki "YYYY-MM-DD") oralig'i,
//                UZEX'da rasmiy parametr yo'q, natija keyin kesiladi.
//   limit      — nechta natija qaytarilsin (standart/maksimal MAX_ITEMS)
async function searchUzex(opts) {
  const mask = normalizeMask(opts.mask);
  if (!mask) {
    const err = new Error("Mask 9 ta belgidan iborat bo'lishi kerak (masalan: xxxxxx444)");
    err.statusCode = 400;
    throw err;
  }

  const startPrice = Number(opts.startPrice) > 0 ? Number(opts.startPrice) : 1;
  const endPrice = Number(opts.endPrice) > 0 ? Number(opts.endPrice) : 300000000;
  const limit = Math.max(1, Math.min(Number(opts.limit) || MAX_ITEMS, MAX_ITEMS));

  const res = await callUzexWithRetry({
    from: 0,
    to: 2000,
    startPrice,
    endPrice,
    // Mijoz talabi: FAQAT jismoniy shaxs lotlari — yuridik shaxslarniki
    // hech qachon qaytarilmaydi.
    isAllowedJuridic: false,
    isAllowedIndividual: true,
    fullNumbers: mask,
    isToday: false,
    isMyOffer: false
  });

  const rawText = await res.text();
  let data;
  try { data = JSON.parse(rawText); } catch (e) { data = {}; }

  const raw = Array.isArray(data.items) ? data.items
    : Array.isArray(data.Items) ? data.Items
    : Array.isArray(data.result) ? data.result
    : (data.data && Array.isArray(data.data.items)) ? data.data.items
    : [];

  let items = raw.map(normalizeItem).filter(x => x.number.replace(/\D/g, '').length === 12);

  // Kompaniya (sotuvchi) bo'yicha ixtiyoriy filtr — qism-moslik, katta/kichik
  // harf farqisiz.
  if (opts.seller) {
    const q = String(opts.seller).trim().toLowerCase();
    if (q) items = items.filter(x => (x.seller || '').toLowerCase().includes(q));
  }

  // Sana oralig'i (savdo boshlanish sanasi) bo'yicha ixtiyoriy filtr.
  const fromMs = opts.dateFrom ? Date.parse(opts.dateFrom) : NaN;
  const toMs = opts.dateTo ? Date.parse(opts.dateTo) : NaN;
  if (!Number.isNaN(fromMs)) items = items.filter(x => { const t = Date.parse(x.startDate || ''); return !Number.isNaN(t) && t >= fromMs; });
  if (!Number.isNaN(toMs)) items = items.filter(x => { const t = Date.parse(x.startDate || ''); return !Number.isNaN(t) && t <= toMs; });

  items.sort((a, b) => a.price - b.price);

  const debug = (raw.length > 0 && items.length === 0)
    ? { rawSampleKeys: Object.keys(raw[0] || {}), rawSample: JSON.stringify(raw[0]).slice(0, 500) }
    : undefined;

  const totalFound = raw.length ? (Number(pick(raw[0], 'records', 'Records')) || items.length) : 0;

  return { items: items.slice(0, limit), totalFound, debug, mask };
}

module.exports = { searchUzex, normalizeMask, normalizeItem, pick, MAX_ITEMS };
