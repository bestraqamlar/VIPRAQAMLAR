// Admin panelidan "Zakaz" (Raqam buyurtma berish) so'roviga mijozga
// to'g'ridan-to'g'ri xabar (yoki narx) yozganda ishlaydi.
//
// - Xabar "custom_orders/{id}.messages" massiviga qo'shiladi (tarix uchun).
// - Agar mijozning Telegram chat ID'si topilgan bo'lsa, xabar shu yerdan
//   unga yuboriladi VA mijozning bot sessiyasiga "activeCustomOrderId"
//   belgilanadi — shunda mijoz botda ODDIY MATN bilan javob yozsa, u javob
//   AI'ga emas, aynan shu suhbat tariniga (va sizga, adminga) boradi.
//
// XAVFSIZLIK: faqat tizimga kirgan ADMIN chaqira oladi.

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
    const { customOrderId, text } = JSON.parse(event.body || '{}');
    if(!customOrderId || !text || !text.trim()){
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot yetarli emas" }) };
    }

    const ref = db.collection('custom_orders').doc(customOrderId);
    const doc = await ref.get();
    if(!doc.exists) return { statusCode: 200, body: JSON.stringify({ ok: false, error: "So'rov topilmadi" }) };
    const data = doc.data();

    const message = { sender: 'admin', text: text.trim(), at: Date.now() };

    // Mijozning chat ID'sini avval hujjatning o'zidan, topilmasa — "orders"
    // kolleksiyasidan telefon raqami bo'yicha izlaymiz (bir martalik topilsa,
    // keyingi safarlar uchun shu yerga saqlab qo'yamiz — tezroq bo'ladi).
    let customerChatId = data.customerChatId || null;
    if(!customerChatId){
      const phoneDigits = (data.phone || '').replace(/\D/g, '').slice(-9);
      if(phoneDigits){
        const ordersSnap = await db.collection('orders').orderBy('createdAtSort', 'desc').limit(500).get();
        const match = ordersSnap.docs
          .map(d => d.data())
          .find(o => o.customerChatId && (o.phone || '').replace(/\D/g, '').slice(-9) === phoneDigits);
        if(match) customerChatId = match.customerChatId;
      }
    }

    let delivered = false;
    if(customerChatId){
      const token = process.env.CUSTOMER_BOT_TOKEN;
      if(token){
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: customerChatId,
            text: `💬 Admindan xabar (••••${data.pattern} so'rovingiz bo'yicha):\n\n${text.trim()}\n\nJavob yozish uchun shu yerga oddiy matn yuboring.`
          })
        });
        const result = await res.json();
        delivered = !!result.ok;
        if(delivered){
          // Mijoz botda keyingi safar oddiy matn yozganda, bu javob AI'ga
          // emas, aynan shu Zakaz suhbatiga borishi uchun belgilaymiz.
          await db.collection('bot_sessions').doc(String(customerChatId)).set({
            activeCustomOrderId: customOrderId
          }, { merge: true });
        }
      }
    }

    await ref.update({
      messages: admin.firestore.FieldValue.arrayUnion(message),
      customerChatId: customerChatId || null
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true, delivered }) };
  }catch(err){
    console.error('SEND-CUSTOM-ORDER-MESSAGE XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
