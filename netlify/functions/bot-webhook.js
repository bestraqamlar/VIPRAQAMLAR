// TELEGRAM BOT ORQALI BAZAGA RAQAM QO'SHISH
// ---------------------------------------------------------------------------
// Bu funksiya Telegram'dan kelgan xabarlarni qabul qiladi va ularni
// to'g'ridan-to'g'ri Firestore bazasiga yozadi. Faqat siz (TELEGRAM_CHAT_ID
// da ko'rsatilgan hisob) yuborgan xabarlar qabul qilinadi — boshqa hech kim
// bu bot orqali bazaga yoza olmaydi.
//
// XABAR FORMATI (botga shunday yozing):
//   998901234567, 1500000
//   998901234567, 1500000, vip
// Bir xabarda bir nechta qatorni birga yuborsangiz ham bo'ladi (har biri
// alohida qatorda), hammasi birdan qo'shiladi.
//
// KERAKLI SOZLAMALAR (Netlify → Environment variables):
//   BOT_ADD_TOKEN        — yangi botning tokeni (@BotFather dan)
//   TELEGRAM_CHAT_ID     — sizning chat_id raqamingiz (faqat shu ruxsat etiladi)
//   FIREBASE_PROJECT_ID  — Firebase loyiha ID (masalan: vip-raqamlar)
//   FIREBASE_CLIENT_EMAIL— xizmat hisobi emaili (service account JSON'dan)
//   FIREBASE_PRIVATE_KEY — xizmat hisobi maxfiy kaliti (service account JSON'dan)
//
// O'RNATISH (bir martalik, deploy qilingandan keyin):
// brauzerda shu havolani oching (BOT_ADD_TOKEN va SAYT manzilingizni almashtirib):
//   https://api.telegram.org/bot<BOT_ADD_TOKEN>/setWebhook?url=https://SAYTINGIZ.netlify.app/.netlify/functions/bot-webhook

const crypto = require('crypto');

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

async function getGoogleAccessToken(){
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: process.env.FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64url(header)}.${b64url(claimSet)}`;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const data = await res.json();
  if(!data.access_token) throw new Error('Google token olinmadi: ' + JSON.stringify(data));
  return data.access_token;
}

async function addNumberToFirestore(accessToken, item){
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/numbers`;
  const body = {
    fields: {
      number: { stringValue: item.number },
      operator: { stringValue: item.operator },
      price: { integerValue: String(item.price) },
      tag: { stringValue: item.tag },
      addedAt: { integerValue: String(Date.now()) },
      reserved: { booleanValue: false },
      oldPrice: { integerValue: '0' },
      installment: { booleanValue: false },
      featured: { booleanValue: false }
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const errText = await res.text();
    throw new Error('Firestore xato: ' + errText);
  }
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
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  const message = update.message;
  if(!message || !message.text){
    return { statusCode: 200, body: 'ok' };
  }

  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  if(String(message.chat.id) !== String(allowedChatId)){
    // Ruxsatsiz foydalanuvchi — xabar e'tiborsiz qoldiriladi, hech narsa yozilmaydi
    return { statusCode: 200, body: 'ignored' };
  }

  const lines = message.text.split('\n').map(l => l.trim()).filter(l => l !== '');
  const parsed = lines.map(parseLine).filter(Boolean);

  if(parsed.length === 0){
    await replyToUser(message.chat.id,
      "Format tushunilmadi. Masalan shunday yozing:\n998901234567, 1500000\n998901234567, 1500000, vip");
    return { statusCode: 200, body: 'ok' };
  }

  try{
    const accessToken = await getGoogleAccessToken();
    for(const item of parsed){
      await addNumberToFirestore(accessToken, item);
    }
    const summary = parsed.map(p => `• ${p.number} — ${p.operator} — ${p.price.toLocaleString('ru-RU')} so'm`).join('\n');
    await replyToUser(message.chat.id, `✅ ${parsed.length} ta raqam bazaga qo'shildi:\n\n${summary}`);
  }catch(err){
    await replyToUser(message.chat.id, `❌ Xato yuz berdi: ${err.message}`);
  }

  return { statusCode: 200, body: 'ok' };
};
