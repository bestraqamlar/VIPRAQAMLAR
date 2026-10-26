// SHARTNOMA PDF — QR KOD ORQALI OCHILADIGAN NUSXA (V120)
// =======================================================
// NEGA KERAK. Shartnomaning qog'oz nusxasidagi QR kod skanerlanganda
// AYNAN SHU shartnomaning PDF'i ochilishi kerak. Telefon kamerasi
// havolani oddiy GET so'rovi bilan ochadi — ya'ni:
//   * mijozdan telefon raqami so'rab bo'lmaydi (hech kim yozmaydi),
//   * App Check tokeni ham bo'lmaydi (u faqat saytimiz ichida bor).
// Shu sabab mavjud `generate-contract-pdf.js` (POST + telefon +
// App Check) bu ish uchun yaramaydi — bu alohida, QR uchun yo'l.
//
// XAVFSIZLIK — havolani TAXMIN QILIB BO'LMAYDI.
// Agar manzil shunchaki `/s?i=KR0142` bo'lganda edi, raqamni birma-bir
// sinab (KR0001, KR0002 ...) BOSHQA odamlarning shartnomasini ham ochib
// olish mumkin bo'lardi. Shuning uchun havolada IMZO (`k`) bor: u
// shartnoma raqamidan maxfiy kalit bilan hisoblanadi (HMAC-SHA256,
// 16 belgi = 96 bit). Imzosiz yoki noto'g'ri imzo bilan hech narsa
// berilmaydi. Imzo FAQAT shu shartnomaga yaraydi.
//
// Ya'ni PDF'ni faqat qog'oz nusxa (yoki PDF'ning o'zi) qo'lida bo'lgan
// odam ocha oladi — bu esa allaqachon shartnomaning egasi.
//
// QO'SHIMCHA HIMOYA: IP bo'yicha soatlik chegara — kimdir imzolarni
// ketma-ket sinab ko'rmoqchi bo'lsa, darhol to'xtatiladi.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { buildContractPdfBuffer, qrKalit } = require('./lib/contractPdf');
const { tezlikOk } = require('./lib/tezlik');

let ULANISH_XATOSI = null;
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
      })
    });
  } catch (e) { ULANISH_XATOSI = (e && e.message) || "sabab noma'lum"; }
}
let db = null;
if (!ULANISH_XATOSI && admin.apps.length) {
  db = admin.firestore();
  try { db.settings({ preferRest: true }); } catch (e) {}
}

/* Oddiy `===` o'rniga vaqt bo'yicha barqaror solishtirish: imzoni
   belgima-belgi "topib olish" hujumiga yo'l qoldirmaydi. */
function imzoMos(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8');
  const y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length || !x.length) return false;
  try { return crypto.timingSafeEqual(x, y); } catch (e) { return false; }
}

function sahifa(kod, sarlavha, matn) {
  /* Xato holatida ham mijoz tushunarli sahifa ko'rsin — quruq
     "403 Forbidden" emas. */
  const html = '<!doctype html><html lang="uz"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex,nofollow">'
    + '<title>' + sarlavha + ' — VIP RAQAMLAR</title><style>'
    + 'body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;'
    + 'background:#0B1220;color:#EDEFF3;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}'
    + '.k{max-width:380px;text-align:center;background:#121B2E;border:1px solid #263450;'
    + 'border-radius:16px;padding:26px 22px}'
    + 'h1{margin:0 0 10px;font-size:18px}p{margin:0 0 16px;font-size:14px;line-height:1.6;color:#98A2B3}'
    + 'a{display:inline-block;background:#1546D6;color:#fff;text-decoration:none;'
    + 'padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px}'
    + '</style></head><body><div class="k"><h1>' + sarlavha + '</h1><p>' + matn + '</p>'
    + '<a href="https://vipraqamlar.uz/">Saytga o\'tish</a></div></body></html>';
  return {
    statusCode: kod,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    body: html
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    return sahifa(405, 'Mumkin emas', 'Bu havola faqat ochish uchun.');
  }
  if (!db) {
    console.error('SHARTNOMA-PDF: Firebase ulanmagan:', ULANISH_XATOSI);
    return sahifa(503, "Hozir ochib bo'lmadi", "Server vaqtincha javob bermayapti. Birozdan keyin qayta urinib ko'ring.");
  }

  /* ============ PARAMETRLARNI O'QISH (V121 da TUZATILDI) ============
     QR kod havolasi `/s/KR0142/<imzo>.pdf` ko'rinishida.
     ILGARI shartnoma raqami va imzo `_redirects` dagi `:i`/`:k` o'rin
     egallari orqali olinardi. Amalda ular funksiyaga YETIB BORMADI —
     parametrlar bo'sh bo'lib, "Havola to'liq emas" sahifasi chiqardi
     va mijoz saytga tushib ketardi (mijoz xabar bergan holat).
     ENDI: avval oddiy so'rov parametrlari qaraladi (eski `?i=&k=`
     ko'rinishi uchun), bo'lmasa — YO'LNING O'ZIDAN o'qiladi. Yo'l esa
     har doim keladi: `rawUrl` (to'liq manzil) yoki `path`. Shu bilan
     Netlify o'rin egallarini qanday uzatishiga umuman bog'liq
     bo'lmay qoldi. */
  const qs = (event && event.queryStringParameters) || {};
  let id = String(qs.i || qs.id || '').trim();
  let kalit = String(qs.k || '').trim();

  if (!id || !kalit) {
    let yol = '';
    try {
      if (event && event.rawUrl) yol = new URL(event.rawUrl).pathname;
      else if (event && event.path) yol = String(event.path);
    } catch (e) { yol = String((event && event.path) || ''); }

    /* `/s/KR0142/abc123.pdf`  ->  ['s','KR0142','abc123.pdf'] */
    const bolak = yol.split('?')[0].split('/').filter(Boolean);
    const sIdx = bolak.indexOf('s');
    const dan = (sIdx >= 0) ? sIdx + 1 : (bolak.length >= 2 ? bolak.length - 2 : 0);
    if (!id) id = bolak[dan] || '';
    if (!kalit) kalit = bolak[dan + 1] || '';
  }

  id = id.trim().toUpperCase().slice(0, 40);
  /* Oxiridagi `.pdf` faqat brauzer uchun — imzoning bir qismi emas. */
  kalit = kalit.trim().replace(/\.pdf$/i, '').slice(0, 40);

  if (!id || !kalit) {
    return sahifa(400, "Havola to'liq emas", "QR kodni qaytadan skanerlang yoki saytdagi “Shartnomani tekshirish” bo'limidan foydalaning.");
  }

  /* Imzolarni ketma-ket sinab ko'rishga yo'l qo'ymaymiz */
  if (!(await tezlikOk(db, event, 'contract_qr_rate_limits', 60))) {
    return sahifa(429, "Juda ko'p urinish", 'Biroz kuting va qayta urinib ko’ring.');
  }

  if (!imzoMos(kalit, qrKalit(id))) {
    /* Shartnoma bor-yo'qligini OSHKOR QILMAYMIZ: ikkala holatda ham
       bir xil javob (aks holda qaysi raqamlar mavjudligini bilib
       olish mumkin bo'lardi). */
    return sahifa(404, 'Shartnoma topilmadi', "Havola noto'g'ri yoki eskirgan. QR kodni qaytadan skanerlab ko'ring.");
  }

  try {
    const doc = await db.collection('credit_contracts').doc(id).get();
    if (!doc.exists) {
      return sahifa(404, 'Shartnoma topilmadi', "Havola noto'g'ri yoki eskirgan. QR kodni qaytadan skanerlab ko'ring.");
    }

    const pdf = await buildContractPdfBuffer(doc.data());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        /* `inline` — telefon brauzeri PDF'ni DARHOL ko'rsatadi
           (yuklab olishni so'ramaydi). Aynan shu kerak edi. */
        'Content-Disposition': 'inline; filename="shartnoma-' + id + '.pdf"',
        'Cache-Control': 'private, max-age=0, no-store',
        'X-Robots-Tag': 'noindex, nofollow'
      },
      body: pdf.toString('base64'),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error('SHARTNOMA-PDF XATOSI:', err);
    return sahifa(500, "Hozir ochib bo'lmadi", "Texnik nosozlik. Birozdan keyin qayta urinib ko'ring.");
  }
};
