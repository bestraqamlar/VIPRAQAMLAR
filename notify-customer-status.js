// HAR KUNI AVTOMATIK ISHLAYDI — kredit shartnomalaridagi muddati o'tgan
// to'lovlarni tekshirib, admin Telegram botiga xabar yuboradi.
// Netlify Scheduled Function (netlify.toml'da "schedule" bilan sozlangan).

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

async function notifyAdmin(text){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

exports.handler = async function () {
  try{
    const snap = await db.collection('credit_contracts').get();
    const now = Date.now();

    for(const doc of snap.docs){
      const data = doc.data();
      if(data.contractStatus === 'cancelled' || data.contractStatus === 'completed') continue;

      let changed = false;
      const payments = [];
      for(const p of data.payments){
        if(p.status === 'pending' && p.dueDate < now && !p.overdueNotified){
          changed = true;
          await notifyAdmin(
            `⏰ To'lov vaqti keldi!\n\n👤 ${data.customerName}\n📱 ${data.number}\n🗓 ${p.month}-oy to'lovi\n💰 ${data.monthlyPayment.toLocaleString('ru-RU')} so'm`
          );
          payments.push({ ...p, overdueNotified: true });
        }else{
          payments.push(p);
        }
      }

      if(changed){
        await db.collection('credit_contracts').doc(doc.id).update({ payments });
      }
    }

    return { statusCode: 200, body: 'ok' };
  }catch(err){
    console.error('CHECK-CREDIT-PAYMENTS XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
