// MIJOZ SAYTDA shartnomasini topgandan keyin "Shartnomani yuklab olish"
// tugmasini bosganda ishlaydi — rasmiy shartnoma PDF faylini tayyorlab,
// brauzerga qaytaradi.
//
// XAVFSIZLIK: check-contract-status.js bilan bir xil — shartnoma ID'si
// VA mijozning telefon raqami ikkalasi to'g'ri kelgandagina PDF beriladi.
// App Check ham MAJBURIY (faqat haqiqiy saytimizdan chaqirilishi mumkin).

const admin = require('firebase-admin');
const { buildContractPdfBuffer } = require('./lib/contractPdf');

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

async function verifyAppCheckSoft(event){
  const token = (event.headers && (event.headers['x-firebase-appcheck'] || event.headers['X-Firebase-AppCheck'])) || '';
  if(!token) return false;
  try{ await admin.appCheck().verifyToken(token); return true; }
  catch(e){ return false; }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if(!(await verifyAppCheckSoft(event))){
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q" }) };
  }

  try{
    const { contractId, phone } = JSON.parse(event.body || '{}');
    const idVal = String(contractId || '').trim().toUpperCase();
    const numVal = String(phone || '').replace(/\D/g, '');

    if(!idVal || !numVal || numVal.length < 9){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi." }) };
    }

    const doc = await db.collection('credit_contracts').doc(idVal).get();
    if(!doc.exists) return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi." }) };

    const data = doc.data();
    const docNumDigits = (data.number || '').replace(/\D/g, '');
    if(!docNumDigits.endsWith(numVal.slice(-9))){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi." }) };
    }

    const pdfBuffer = await buildContractPdfBuffer(data);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        filename: `shartnoma-${idVal}.pdf`,
        pdfBase64: pdfBuffer.toString('base64')
      })
    };
  }catch(err){
    console.error('GENERATE-CONTRACT-PDF XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

/* ================= CORS (mobil ilova uchun) =================
   Sayt bilan bu funksiya bitta manzilda turadi, shu sabab brauzerda
   CORS kerak emas edi. Lekin Android/iOS ilovasi ichida sahifa
   `https://localhost` manzilidan ochiladi — ya'ni so'rov "boshqa
   saytdan" kelgan hisoblanadi va CORS sarlavhalarisiz brauzer uni
   bloklaydi.

   Shuning uchun asl `handler` o'rab olindi: javobga CORS sarlavhalari
   qo'shiladi va brauzerning dastlabki OPTIONS so'roviga javob beriladi.
   Funksiyaning ichki mantig'i UMUMAN o'zgarmadi. */
const __CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-firebase-appcheck, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};
const __inner = exports.handler;
exports.handler = async function (event, context) {
  if (event && event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: __CORS, body: '' };
  }
  const res = await __inner(event, context);
  return Object.assign({}, res, { headers: Object.assign({}, res && res.headers, __CORS) });
};
