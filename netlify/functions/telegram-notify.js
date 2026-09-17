// Bu fayl serverda ishlaydi (Netlify Functions) — bot tokeni mijoz brauzeriga
// hech qachon yuborilmaydi, shuning uchun sayt manba kodida ko'rinmaydi.
//
// Kerakli Environment variables: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

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
const db = admin.firestore();
db.settings({ preferRest: true });

/* XAVFSIZLIK: ilgari bu funksiyada HECH QANDAY tekshiruv yo'q edi — istalgan
   kishi to'g'ridan-to'g'ri chaqirib, botimiz nomidan ixtiyoriy xabar
   yuborishi (spam yoki soxta "buyurtma" bildirishnomasi, hatto soxta
   inline tugmali xabar) mumkin edi. Endi ikki xil qonuniy chaqiruvchi
   ruxsat etiladi:
   1) Saytning O'ZI (index.html, panel-boshqaruv.html) — App Check tokeni
      bilan (xuddi check-my-orders.js, check-promo-code.js'dagi kabi bir
      xil naqsh), token HAQIQIY bo'lishi shart.
   2) SERVER-SERVERGA chaqiruvlar (masalan api-create-order.js — mobil
      ilova uchun) — App Check tokeni bo'lishi shart emas (mobil ilova
      brauzer emas), o'rniga xuddi api-create-order.js'dagi bilan bir xil
      "x-api-key" (MOBILE_API_KEY muhit o'zgaruvchisi) qabul qilinadi.
   Ikkalasi ham bo'lmasa — so'rov rad etiladi. */
async function verifyCaller(event){
  const apiKey = (event.headers && (event.headers['x-api-key'] || event.headers['X-Api-Key'])) || '';
  const expectedApiKey = process.env.MOBILE_API_KEY;
  if(expectedApiKey && apiKey === expectedApiKey) return true;

  const token = (event.headers && (event.headers['x-firebase-appcheck'] || event.headers['X-Firebase-AppCheck'])) || '';
  if(!token) return false;
  try{
    await admin.appCheck().verifyToken(token);
    return true;
  }catch(e){
    return false;
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if(!(await verifyCaller(event))){
    return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Ruxsat yo'q" }) };
  }

  try {
    const { text, orderId, mapUrl } = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan' }) };
    }
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'text maydoni kerak' }) };
    }

    const body = { chat_id: chatId, text };
    if (orderId) {
      const inline_keyboard = [
        [{ text: "📞 Bog'lanildi", callback_data: `st|${orderId}|B` }],
        [{ text: '✅ Yakunlandi', callback_data: `st|${orderId}|Y` }],
        [{ text: '❌ Bekor qilindi', callback_data: `st|${orderId}|C` }]
      ];
      // YANGI (mijoz so'roviga ko'ra): mijoz saytda xaritada aniq
      // joylashuvini belgilagan bo'lsa — endi bu oddiy MATN havolasi
      // sifatida emas, alohida TUGMA sifatida chiqadi, bosilganda
      // to'g'ridan-to'g'ri Yandex Go ochiladi.
      if (typeof mapUrl === 'string' && /^https:\/\//.test(mapUrl)) {
        inline_keyboard.push([{ text: "🗺️ Xaritaga o'tish", url: mapUrl }]);
      }
      body.reply_markup = { inline_keyboard };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    // Xabar ID sini buyurtmaga saqlaymiz — shunda admin panelidan status
    // o'zgartirilganda, aynan shu Telegram xabarini topib yangilay olamiz.
    if (data.ok && orderId && data.result && data.result.message_id) {
      try{
        await db.collection('orders').doc(orderId).update({ adminMessageId: data.result.message_id });
      }catch(e){ /* muhim emas, asosiy xabar baribir yuborildi */ }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: data.ok === true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
