// HAR KUNI AVTOMATIK ISHLAYDI — kredit shartnomalaridagi to'lovlarni
// tekshirib: (1) admin Telegram botiga xabar yuboradi (avvalgidek),
// (2) MIJOZNING O'ZIGA ham Telegram orqali eslatma yuboradi:
//     - to'lov kuniga 2 kun qolganda
//     - to'lov kuni kelganda
//     - to'lov kechikkan bo'lsa, HAR KUNI (necha kun o'tganini aytib)
// Netlify Scheduled Function (netlify.toml'da "schedule" bilan sozlangan,
// bir necha soatda bir marta ishga tushadi — shuning uchun har bir
// eslatma FAQAT kuniga bir marta yuborilishi uchun "lastReminderDay"
// bilan qayta yuborilishning oldi olinadi).

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

const MS_DAY = 24 * 60 * 60 * 1000;
const SUPPORT_PHONE = '+998878880101';

function dayNumber(ts){ return Math.floor(ts / MS_DAY); }

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

async function notifyCustomer(chatId, text){
  const token = process.env.CUSTOMER_BOT_TOKEN;
  if(!token || !chatId) return false;
  try{
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const data = await res.json();
    return !!data.ok;
  }catch(e){ return false; }
}

function buildReminderText(data, daysUntil){
  const name = data.customerName || 'mijoz';
  const contractId = data.contractId || '';
  const number = data.number || '';
  let situationLine;
  if(daysUntil > 0){
    situationLine = `to'lov kuningizga ${daysUntil} kun qoldi.`;
  }else if(daysUntil === 0){
    situationLine = `to'lov kuni keldi.`;
  }else{
    situationLine = `to'lov kuningiz ${Math.abs(daysUntil)} kun o'tib ketdi.`;
  }
  return `Hurmatli ${name},\n\n${contractId} shartnoma va xarid qilingan ${number} raqami uchun ${situationLine}\n\nMurojaat uchun: ${SUPPORT_PHONE}`;
}

exports.handler = async function () {
  try{
    const snap = await db.collection('credit_contracts').get();
    const now = Date.now();
    const today = dayNumber(now);

    for(const doc of snap.docs){
      const data = doc.data();
      if(data.contractStatus === 'cancelled' || data.contractStatus === 'completed') continue;

      let changed = false;
      const payments = [];
      for(const p of data.payments){
        let updatedP = p;

        if(p.status === 'pending'){
          // --- (1) Admin uchun — bir martalik "vaqti keldi" xabari (avvalgidek) ---
          if(p.dueDate < now && !p.overdueNotified){
            changed = true;
            await notifyAdmin(
              `⏰ To'lov vaqti keldi!\n\n👤 ${data.customerName}\n📱 ${data.number}\n🗓 ${p.month}-oy to'lovi\n💰 ${data.monthlyPayment.toLocaleString('ru-RU')} so'm`
            );
            updatedP = { ...updatedP, overdueNotified: true };
          }

          // --- (2) Mijozning o'ziga — 2 kun oldin / bugun / har kuni (kechiksa) ---
          if(data.customerChatId){
            const daysUntil = dayNumber(p.dueDate) - today;
            const shouldRemind = daysUntil === 2 || daysUntil === 0 || daysUntil < 0;
            if(shouldRemind && updatedP.lastReminderDay !== today){
              const sent = await notifyCustomer(data.customerChatId, buildReminderText(data, daysUntil));
              if(sent){
                changed = true;
                updatedP = { ...updatedP, lastReminderDay: today };
              }
            }
          }
        }

        payments.push(updatedP);
      }

      // --- (3) 30 KUNDAN KO'P KECHIKKAN TO'LOV — shartnoma AVTOMATIK bekor qilinadi ---
      // (Shartnomada yozilgan huquqiy shartga muvofiq: 30 kundan ortiq
      // kechiksa, shartnoma bir tomonlama bekor hisoblanadi, raqam qaytarib
      // berilmaydi.)
      const hasSeriousOverdue = payments.some(p => p.status === 'pending' && (now - p.dueDate) > 30 * MS_DAY);
      if(hasSeriousOverdue && data.contractStatus !== 'cancelled'){
        changed = true;
        await notifyAdmin(
          `🚫 Shartnoma AVTOMATIK BEKOR QILINDI (30 kundan ortiq to'lov kechikkani uchun)\n\n📄 ${data.contractId}\n👤 ${data.customerName}\n📱 ${data.number}`
        );
        if(data.customerChatId){
          await notifyCustomer(data.customerChatId,
            `Hurmatli ${data.customerName || 'mijoz'},\n\n${data.contractId} shartnoma va xarid qilingan ${data.number} raqami bo'yicha to'lov 30 kundan ortiq kechikkani sababli, shartnoma shartlariga muvofiq ushbu shartnoma bekor qilindi.\n\nMurojaat uchun: ${SUPPORT_PHONE}`
          );
        }
        await db.collection('credit_contracts').doc(doc.id).update({ payments, contractStatus: 'cancelled' });
        continue;
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
