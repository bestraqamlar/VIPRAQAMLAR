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

const { webhookTekshir } = require('./lib/webhookSirri');
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

async function replyToUser(chatId, text, tugmalar){
  const token = process.env.BOT_ADD_TOKEN;
  const tana = { chat_id: chatId, text };
  if (tugmalar) tana.reply_markup = { inline_keyboard: tugmalar };
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tana)
  });
}

/* ==================================================================
   /holat — KUZATUV HOLATI SO'RALGANDA KO'RSATILADI  (V153)
   ------------------------------------------------------------------
   NEGA KERAK BO'LDI. Avval kuzatuv boti "⚠️ Ucell ishlamayapti" /
   "✅ Ucell tiklandi" degan xabarlarni O'ZI yuborib turardi. Mijoz
   so'rovi: "ishladi-ishlamadi deb hadeb xabar kelavermasin, undan
   ko'ra yangilanib tursin — holatni ko'rmoqchi bo'lganda bosib
   ko'rsin". Shu sabab o'sha xabarlar olib tashlandi, holat esa
   Firestore'ga yozilishda davom etadi va MANA SHU yerda ko'rsatiladi.

   Ko'rsatiladi: har bir operator ishlayaptimi, ishlamasa sababi va
   nima qilish kerakligi, o'rtacha javob tezligi, faol kuzatuvlar soni
   va oxirgi tekshiruv qachon bo'lgani.
   ================================================================== */
function qanchaOldin(ms){
  if (!ms) return "noma'lum";
  const f = Math.max(0, Date.now() - Number(ms));
  const d = Math.round(f / 60000);
  if (d < 1) return 'hozirgina';
  if (d < 60) return d + ' daqiqa oldin';
  const soat = Math.round(d / 60);
  if (soat < 24) return soat + ' soat oldin';
  return Math.round(soat / 24) + ' kun oldin';
}

async function kuzatuvHolati(){
  const satr = [];
  let faol = 0, oxirgiTekshiruv = 0;
  try {
    const kuz = await db.collection('number_watches').where('active', '==', true).get();
    faol = kuz.size;
    kuz.docs.forEach(d => {
      const t = d.data().lastCheckedAt;
      const ms = t && typeof t.toMillis === 'function' ? t.toMillis() : 0;
      if (ms > oxirgiTekshiruv) oxirgiTekshiruv = ms;
    });
  } catch (e) { /* o'qib bo'lmasa — quyida shunchaki ko'rsatilmaydi */ }

  try {
    const sog = await db.collection('watch_health').get();
    const qatorlar = sog.docs.map(d => {
      const v = d.data() || {};
      const nosoz = Number(v.streak || 0) > 0;
      const tinim = Number(v.backoffUntil || 0) > Date.now();
      let q = (nosoz ? '🔴 ' : '🟢 ') + d.id;
      if (!nosoz) {
        if (v.avgMs) q += '  ·  ' + (Number(v.avgMs) / 1000).toFixed(1) + ' s';
      } else {
        q += '\n   ❓ ' + (v.sababMatn || 'sabab aniqlanmadi');
        if (v.sababQadam) q += '\n   🛠 ' + v.sababQadam;
        q += '\n   🔁 ketma-ket ' + v.streak + ' marta xato';
        if (v.lastOkAt) q += '\n   ⏱ oxirgi marta ishlagan: ' + qanchaOldin(v.lastOkAt);
        if (tinim) q += '\n   ⏸ ' + Math.max(1, Math.round((Number(v.backoffUntil) - Date.now()) / 60000)) + ' daqiqa tinimda';
      }
      return q;
    });
    /* Avval nosozlari — muhimi tepada tursin */
    qatorlar.sort((a, b) => (a.startsWith('🔴') ? 0 : 1) - (b.startsWith('🔴') ? 0 : 1));
    satr.push(...qatorlar);
  } catch (e) { satr.push("Holatni o'qib bo'lmadi."); }

  const bosh = '📊 KUZATUV HOLATI\n\n'
    + '👁 Faol kuzatuv: ' + faol + ' ta\n'
    + '⏱ Oxirgi tekshiruv: ' + qanchaOldin(oxirgiTekshiruv) + '\n'
    + '🔄 Tekshiruv har daqiqada avtomatik bo\'ladi.\n\n';
  return bosh + (satr.length ? satr.join('\n\n') : 'Operator holati hali yozilmagan.');
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  /* XAVFSIZLIK (V73): so'rov HAQIQATAN Telegram'dan kelganini
     tasdiqlaymiz. Maxfiy so'z Netlify muhit o'zgaruvchisida YOKI
     Firestore'da (admin panel -> Xavfsizlik -> "Botlarni himoyalash")
     bo'lsa — sarlavhadagi so'z unga mos kelishi SHART. Ikkalasi ham
     yo'q bo'lsa bot eskicha ishlayveradi (to'xtab qolmasligi uchun),
     lekin admin panelida "Himoyalanmagan" deb ko'rsatiladi.
     Qarang: netlify/functions/lib/webhookSirri.js */
  {
    const himoya = await webhookTekshir(db, event, 'bot-webhook', 'ADMIN_BOT_WEBHOOK_SECRET');
    if(!himoya.ok) return { statusCode: 401, body: 'unauthorized' };
  }

  let update;
  try{ update = JSON.parse(event.body || '{}'); }catch(e){ return { statusCode: 200, body: 'ok' }; }

  try{
    const allowedChatId = process.env.TELEGRAM_CHAT_ID;

    /* --- Tugma bosilgan bo'lsa (V153: "🔄 Yangilash") --- */
    if(update.callback_query){
      const cq = update.callback_query;
      const token = process.env.BOT_ADD_TOKEN;
      const chatId = cq.message && cq.message.chat && cq.message.chat.id;
      /* Telegram "soat"ini darhol to'xtatamiz — aks holda tugma
         bosilgandan keyin bir necha soniya "kutmoqda" bo'lib turadi. */
      try{
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ callback_query_id: cq.id, text: 'Yangilandi' })
        });
      }catch(e){}
      if(String(chatId) !== String(allowedChatId)) return { statusCode: 200, body: 'ignored' };
      if(cq.data === 'holat'){
        await replyToUser(chatId, await kuzatuvHolati(), [[{ text:'🔄 Yangilash', callback_data:'holat' }]]);
      }
      return { statusCode: 200, body: 'ok' };
    }

    const message = update.message;
    if(!message || !message.text) return { statusCode: 200, body: 'ok' };

    if(String(message.chat.id) !== String(allowedChatId)){
      return { statusCode: 200, body: 'ignored' };
    }

    /* --- /holat: kuzatuv holatini SO'RALGANDA ko'rsatamiz --- */
    {
      const buyruq = message.text.trim().toLowerCase().split(/[\s@]/)[0];
      if(buyruq === '/holat' || buyruq === '/status' || buyruq === '/start'){
        if(buyruq === '/start'){
          await replyToUser(message.chat.id,
            "Bazaga raqam qo'shish uchun shunday yozing:\n" +
            "998901234567, 1500000\n998901234567, 1500000, vip\n\n" +
            "Kuzatuv holatini ko'rish uchun — /holat",
            [[{ text:'📊 Kuzatuv holati', callback_data:'holat' }]]);
          return { statusCode: 200, body: 'ok' };
        }
        await replyToUser(message.chat.id, await kuzatuvHolati(),
          [[{ text:'🔄 Yangilash', callback_data:'holat' }]]);
        return { statusCode: 200, body: 'ok' };
      }
    }

    const lines = message.text.split('\n').map(l => l.trim()).filter(l => l !== '');
    const parsed = lines.map(parseLine).filter(Boolean);

    if(parsed.length === 0){
      await replyToUser(message.chat.id,
        "Format tushunilmadi. Masalan shunday yozing:\n998901234567, 1500000\n998901234567, 1500000, vip\n998901234567, 1500000, vip, 2000000, mashhur");
      return { statusCode: 200, body: 'ok' };
    }

    /* DUBLIKAT NAZORATI — bitta raqam bazada faqat bir marta turadi.
       Bazada bor bo'lgan (yoki xabarda ikki marta yozilgan) raqam
       o'tkazib yuboriladi, qolgani yoziladi; oxirida bot nechtasi
       o'tkazib yuborilganini aytadi. */
    const DUB = require('./lib/dublikat');
    const { yangi, dublikat } = await DUB.ajrat(db, parsed);
    if (!yangi.length) {
      await replyToUser(message.chat.id,
        'Birorta ham yangi raqam yo\u2018q \u2014 ' + dublikat.length +
        ' ta raqam bazada allaqachon bor yoki takrorlangan.');
      return { statusCode: 200, body: 'ok' };
    }

    const batch = db.batch();
    yangi.forEach(item => {
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

    const summary = yangi.map(p => {
      const _usd = String(p.currency || '').toLowerCase() === 'usd';
      let line = `• ${p.number} — ${p.operator} — ${p.price.toLocaleString('ru-RU')}${_usd ? ' $' : " so'm"}`;
      if(p.tag === 'vip') line += ' — VIP';
      if(p.featured) line += ' — Mashhur';
      if(p.onSale) line += ` — Aksiya (eski narx: ${p.oldPrice.toLocaleString('ru-RU')})`;
      return line;
    }).join('\n');
    await replyToUser(message.chat.id,
      `✅ ${yangi.length} ta raqam bazaga qo'shildi:\n\n${summary}` +
      (dublikat.length
        ? `\n\n⚠️ ${dublikat.length} ta o'tkazib yuborildi (bazada bor yoki takrorlangan):\n` +
          dublikat.slice(0, 10).map(d => `• ${d.number} — ${d.sabab}`).join('\n') +
          (dublikat.length > 10 ? `\n... va yana ${dublikat.length - 10} ta` : '')
        : ''));
  }catch(err){
    console.error('BOT-WEBHOOK XATOSI:', err);
    try{ await replyToUser(update.message.chat.id, `❌ Xato: ${err.message}`); }catch(e){}
  }

  return { statusCode: 200, body: 'ok' };
};
