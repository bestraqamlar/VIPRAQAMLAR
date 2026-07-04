// TELEGRAM BOT ORQALI BAZAGA RAQAM QO'SHISH (firebase-admin bilan)
// Xabar formati: 998901234567, 1500000[, vip]

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

const CODE_TO_OPERATOR = {
  '91':'Beeline', '90':'Beeline', '92':'Beeline',
  '33':'Humans',
  '50':'Ucell', '94':'Ucell', '93':'Ucell',
  '88':'Mobiuz', '97':'Mobiuz', '87':'Mobiuz',
  '77':'Uzmobile', '70':'Uzmobile', '95':'Uzmobile', '99':'Uzmobile',
  '98':'Perfektum', '80':'Perfektum'
};

function parseLine(line){
  const parts = line.split(',').map(p => p.trim()).filter(p => p !== '');
  if(parts.length < 2) return null;

  let raw = parts[0].replace(/\D/g, '');
  if(raw.startsWith('998')) raw = raw.slice(3);
  raw = raw.slice(0, 9);
  if(raw.length < 9) return null;

  const code = raw.slice(0, 2);
  const operator = CODE_TO_OPERATOR[code] || 'Beeline';
  const number = `+998 ${raw.slice(0,2)} ${raw.slice(2,5)}-${raw.slice(5,7)}-${raw.slice(7,9)}`;
  const price = parseInt(parts[1].replace(/\D/g, ''), 10) || 0;
  const tag = (parts[2] || 'oddiy').toLowerCase() === 'vip' ? 'vip' : 'oddiy';

  return { number, operator, price, tag };
}

async function replyToUser(chatId, text){
  const token = process.env.BOT_ADD_TOKEN;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  try{
    const message = update.message;
    if(!message || !message.text) return { statusCode: 200, body: 'ok' };

    const allowedChatId = process.env.TELEGRAM_CHAT_ID;
    if(String(message.chat.id) !== String(allowedChatId)){
      return { statusCode: 200, body: 'ignored' };
    }

    const lines = message.text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const parsed = lines.map(parseLine).filter(Boolean);

    if(parsed.length === 0){
      await replyToUser(message.chat.id,
        "Format tushunilmadi. Masalan shunday yozing:\n998901234567, 1500000\n998901234567, 1500000, vip");
      return { statusCode: 200, body: 'ok' };
    }

    const batch = db.batch();
    parsed.forEach(item => {
      const ref = db.collection('numbers').doc();
      batch.set(ref, {
        number: item.number,
        operator: item.operator,
        price: item.price,
        oldPrice: 0,
        onSale: false,
        featured: false,
        installment: false,
        reserved: false,
        tag: item.tag,
        addedAt: Date.now()
      });
    });
    await batch.commit();

    const summary = parsed.map(p => `• ${p.number} — ${p.operator} — ${p.price.toLocaleString('ru-RU')} so'm`).join('\n');
    await replyToUser(message.chat.id, `✅ ${parsed.length} ta raqam bazaga qo'shildi:\n\n${summary}`);
  }catch(err){
    console.error('BOT-WEBHOOK XATOSI:', err);
    try{ await replyToUser(update.message.chat.id, `❌ Xato: ${err.message}`); }catch(e){}
  }

  return { statusCode: 200, body: 'ok' };
};
