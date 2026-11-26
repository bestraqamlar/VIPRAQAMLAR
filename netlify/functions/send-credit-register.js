// ===========================================================================
// KREDIT REESTRINI TELEGRAMGA YUBORISH
// ---------------------------------------------------------------------------
// Admin panelidagi "PDF reestr" tugmasi shu funksiyani chaqiradi.
// Maqsadi (mijoz so'rovi): sayt yoki internet ishlamay qolganda ham butun
// bo'lib to'lash portfeli qo'lda, qog'ozda bo'lsin.
//
// XAVFSIZLIK: hujjatda BARCHA mijozlarning ismi, telefoni va qarzi bor —
// shuning uchun faqat kredit bo'limiga ruxsati bor admin chaqira oladi.
// ===========================================================================

const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');
const { buildReestrPdfBuffer, tahlil } = require('./lib/reestrPdf');

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

function pul(n){
  return new Intl.NumberFormat('ru-RU').format(Math.round(Number(n) || 0)).replace(/ /g, ' ');
}

async function buildAndSend(){
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId){
    throw new Error('Telegram sozlanmagan: TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID yo‘q');
  }

  const snap = await db.collection('credit_contracts').get();
  const contracts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const now = Date.now();
  const hisob = { jami:0, muammoli:0, overdue:0, soon:0, ok:0, qarz:0, kech:0 };
  contracts.forEach(d => {
    const a = tahlil(d, now);
    if(a.state === 'done') return;          /* arxiv reestrga kirmaydi */
    hisob.jami++; hisob[a.state]++;
    hisob.qarz += a.debt; hisob.kech += a.overdueSum;
  });

  const buffer = await buildReestrPdfBuffer(contracts, { now });

  const d0 = new Date(now);
  const ik = n => String(n).padStart(2, '0');
  const sana     = ik(d0.getDate()) + '.' + ik(d0.getMonth()+1) + '.' + d0.getFullYear();
  const faylSana = d0.getFullYear() + '-' + ik(d0.getMonth()+1) + '-' + ik(d0.getDate());

  const izoh =
    '📋 Bo‘lib to‘lash reestri — ' + sana + '\n\n'
    + 'Faol shartnoma: ' + hisob.jami + ' ta\n'
    + '⛔ Muammoli (30+ kun): ' + hisob.muammoli + ' ta\n'
    + '⚠️ Kechikkan: ' + hisob.overdue + ' ta\n'
    + '⏳ Yaqin 7 kun: ' + hisob.soon + ' ta\n'
    + '✅ Jadval bo‘yicha: ' + hisob.ok + ' ta\n\n'
    + 'Umumiy qarzdorlik: ' + pul(hisob.qarz) + ' so‘m\n'
    + 'Kechikkan summa: ' + pul(hisob.kech) + ' so‘m';

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption', izoh);
  form.append('document', new Blob([buffer], { type: 'application/pdf' }),
              'kredit-reestr-' + faylSana + '.pdf');

  const res  = await fetch('https://api.telegram.org/bot' + token + '/sendDocument',
                           { method: 'POST', body: form });
  const data = await res.json();
  if(!data.ok) throw new Error('Telegram sendDocument xatosi: ' + JSON.stringify(data));

  return { jami: hisob.jami, muammoli: hisob.muammoli, overdue: hisob.overdue,
           soon: hisob.soon, ok: hisob.ok, olcham: buffer.length };
}

async function handler(event){
  if(event.httpMethod !== 'POST'){
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try{
    await requireAdmin(event, { feature: 'credit' });
  }catch(err){
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ error: err.message }) };
  }
  try{
    const natija = await buildAndSend();
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...natija }) };
  }catch(err){
    console.error('SEND-CREDIT-REGISTER XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
}

module.exports = { handler, buildAndSend };
