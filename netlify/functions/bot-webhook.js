// TELEGRAM BOT ORQALI BAZAGA RAQAM QO'SHISH (firebase-admin bilan)
//
// Xabar formati (vergul bilan ajratib yozing, tartib muhim emas — faqat
// birinchi ikkitasi RAQAM va NARX bo'lishi kerak):
//   998901234567, 1500000
//   998901234567, 1500000, vip
//   998901234567, 1500000, vip, 2000000, mashhur     <- 2000000 = eski narx (aksiya)
//   998901234567, 1500000, mashhur
//
// So'zlar (istalgan tartibda, ixtiyoriy):
//   vip                -> tegi VIP bo'ladi (yozilmasa "oddiy")
//   mashhur / premium   -> "Mashhur raqamlar"ga qo'shiladi
//   (raqam, narxdan katta bo'lsa) -> eski narx sifatida olinadi, aksiya bo'ladi

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
db.settings({ preferRest: true }); // Netlify Functions'da gRPC ulanish muammosini oldini oladi

async function withRetry(fn, retries = 3, delayMs = 1500){
  for(let i = 0; i <= retries; i++){
    try{ return await fn(); }
    catch(err){
      const msg = String(err && err.message || err);
      if(i === retries || !msg.includes('Quota exceeded')) throw err;
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
}

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

  let tag = 'oddiy';
  let featured = false;
  let oldPrice = 0;

  for(const extra of parts.slice(2)){
    const low = extra.toLowerCase();
    if(low === 'vip'){ tag = 'vip'; continue; }
    if(low === 'mashhur' || low === 'premium'){ featured = true; continue; }
    if(low === 'aksiya' || low === 'oddiy') continue; // kalit so'z, alohida ta'sir qilmaydi
    const num = parseInt(extra.replace(/\D/g, ''), 10);
    if(num && num > price){ oldPrice = num; }
  }

  return {
    number, operator, price, tag, featured,
    oldPrice, onSale: oldPrice > 0,
    last1: raw.slice(-1), last2: raw.slice(-2), last3: raw.slice(-3), last4: raw.slice(-4)
  };
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

  // XAVFSIZLIK: bu bot bazaga to'g'ridan-to'g'ri raqam qo'shadi — shu sababli
  // maxfiy token tekshiruvi juda muhim (pastdagi izohga qarang).
  const expectedSecret = process.env.ADMIN_BOT_WEBHOOK_SECRET;
  if(expectedSecret){
    const got = (event.headers && (event.headers['x-telegram-bot-api-secret-token'] || event.headers['X-Telegram-Bot-Api-Secret-Token'])) || '';
    if(got !== expectedSecret) return { statusCode: 401, body: 'unauthorized' };
  }

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
        "Format tushunilmadi. Masalan shunday yozing:\n998901234567, 1500000\n998901234567, 1500000, vip\n998901234567, 1500000, vip, 2000000, mashhur");
      return { statusCode: 200, body: 'ok' };
    }

    const batch = db.batch();
    parsed.forEach(item => {
      const ref = db.collection('numbers').doc();
      batch.set(ref, {
        number: item.number,
        operator: item.operator,
        price: item.price,
        oldPrice: item.oldPrice,
        onSale: item.onSale,
        featured: item.featured,
        installment: false,
        reserved: false,
        tag: item.tag,
        last1: item.last1, last2: item.last2, last3: item.last3, last4: item.last4,
        addedAt: Date.now()
      });
    });
    await withRetry(() => batch.commit());

    const summary = parsed.map(p => {
      let line = `• ${p.number} — ${p.operator} — ${p.price.toLocaleString('ru-RU')} so'm`;
      if(p.tag === 'vip') line += ' — VIP';
      if(p.featured) line += ' — Mashhur';
      if(p.onSale) line += ` — Aksiya (eski narx: ${p.oldPrice.toLocaleString('ru-RU')})`;
      return line;
    }).join('\n');
    await replyToUser(message.chat.id, `✅ ${parsed.length} ta raqam bazaga qo'shildi:\n\n${summary}`);
  }catch(err){
    console.error('BOT-WEBHOOK XATOSI:', err);
    try{ await replyToUser(update.message.chat.id, `❌ Xato: ${err.message}`); }catch(e){}
  }

  return { statusCode: 200, body: 'ok' };
};
