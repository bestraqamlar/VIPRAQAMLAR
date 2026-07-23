// ADMIN yangi kredit shartnoma yaratganda (agar mijozning Telegram
// chat ID'si topilgan bo'lsa), shartnoma PDF faylini AVTOMATIK ravishda
// mijozning botiga yuboradi — mijoz shartnomasini darhol, botning o'zida
// yuklab ola oladi.
//
// XAVFSIZLIK: faqat tizimga kirgan ADMIN chaqira oladi (Firebase ID token
// tekshiriladi) — aks holda har kim istalgan shartnomani, istalgan
// mijozga (chatId'ni bilsa) yubortirib qo'yishi mumkin edi.

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

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) throw new Error("Token yo'q");
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q. Iltimos, qaytadan tizimga kiring." }) };
  }

  try{
    const { contractId } = JSON.parse(event.body || '{}');
    const idVal = String(contractId || '').trim().toUpperCase();
    if(!idVal) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'ID kiritilmagan' }) };

    const doc = await db.collection('credit_contracts').doc(idVal).get();
    if(!doc.exists) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Shartnoma topilmadi' }) };

    const data = doc.data();
    if(!data.customerChatId){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Mijozning Telegram ID topilmagan — PDF yuborilmadi' }) };
    }

    const token = process.env.CUSTOMER_BOT_TOKEN;
    if(!token) return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'CUSTOMER_BOT_TOKEN sozlanmagan' }) };

    const pdfBuffer = await buildContractPdfBuffer(data);
    const form = new FormData();
    form.append('chat_id', String(data.customerChatId));
    form.append('caption', `📄 Sizning shartnomangiz: ${idVal}\n\nRaqam: ${data.number || ''}\nOylik to'lov: ${(data.monthlyPayment || 0).toLocaleString('ru-RU')} so'm`);
    form.append('document', new Blob([pdfBuffer], { type: 'application/pdf' }), `shartnoma-${idVal}.pdf`);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form });
    const result = await res.json();
    if(!result.ok){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'Telegram xatosi: ' + (result.description || '') }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }catch(err){
    console.error('SEND-CONTRACT-PDF XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
