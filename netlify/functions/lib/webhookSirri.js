// TELEGRAM WEBHOOK MAXFIY SO'ZI — "soxta so'rov" hujumidan himoya.
//
// MUAMMO. Har bir bot uchun Netlify'da ochiq manzil bor, masalan:
//   https://vipraqamlar.uz/.netlify/functions/customer-bot-webhook
// Bu manzilni bilgan HAR KIM unga o'zi yasagan "Telegram xabarini"
// yuborishi mumkin edi: botga o'zini mijoz qilib ko'rsatib, bosqichlarni
// bosib o'tib, bazaga soxta buyurtma yozdirib yuborardi (ism o'rnida
// raqam, telefon o'rnida "00 000 00 00" va h.k.). Telegram'ning o'zi
// buning uchun tayyor himoya beradi: `setWebhook` chaqirilayotganda
// `secret_token` ko'rsatiladi va Telegram har bir so'rovda uni
// `X-Telegram-Bot-Api-Secret-Token` sarlavhasida qaytaradi. Boshqa
// hech kim bu so'zni bilmaydi — demak boshqa hech kim so'rov yubora
// olmaydi.
//
// ILGARI bu tekshiruv faqat Netlify muhit o'zgaruvchisi (masalan
// CUSTOMER_BOT_WEBHOOK_SECRET) sozlangan bo'lsagina ishlardi; sozlanmasa
// "eskicha" (ya'ni himoyasiz) ishlayverardi. Endi maxfiy so'zni admin
// panelning "Xavfsizlik" bo'limidagi bitta tugma bilan yoqish mumkin:
// u tasodifiy so'z yasaydi, Telegram'ga `setWebhook` orqali bildiradi va
// Firestore'ning `sys_config/bot_secrets` hujjatiga yozib qo'yadi.
// Shundan keyin SO'ZSIZ kelgan har qanday so'rov rad etiladi.
//
// NEGA Firestore: Netlify muhit o'zgaruvchisini o'zgartirish uchun saytni
// qaytadan joylash (redeploy) kerak bo'ladi — admin buni qila olmaydi.
// Firestore'dagi hujjat esa darhol kuchga kiradi. `sys_config` to'plami
// brauzer uchun qoidalarda BUTUNLAY yopiq (allow read, write: if false) —
// ya'ni maxfiy so'zni saytdan o'qib bo'lmaydi, faqat server funksiyalari
// (Admin SDK) ko'radi.

const TOPLAM = 'sys_config';
const HUJJAT = 'bot_secrets';

/* Har bir "sovuq" funksiya chaqiruvida bazaga bormaslik uchun kichik
   xotira keshi (60 soniya). Netlify funksiyasi "issiq" turganda shu
   keshdan o'qiladi — ya'ni bitta xabar uchun qo'shimcha o'qish bo'lmaydi. */
let KESH = { at: 0, data: null };

async function sirlarniOl(db) {
  if (KESH.data && (Date.now() - KESH.at) < 60000) return KESH.data;
  try {
    const d = await db.collection(TOPLAM).doc(HUJJAT).get();
    KESH = { at: Date.now(), data: (d.exists ? (d.data() || {}) : {}) };
  } catch (e) {
    /* Baza javob bermasa — eski keshni ishlatamiz (bo'lmasa bo'sh). */
    KESH = { at: Date.now(), data: KESH.data || {} };
  }
  return KESH.data;
}

function sarlavhadanOl(event) {
  const h = (event && event.headers) || {};
  return h['x-telegram-bot-api-secret-token']
      || h['X-Telegram-Bot-Api-Secret-Token']
      || '';
}

/**
 * Webhook so'rovi HAQIQATAN Telegram'dan kelganini tasdiqlaydi.
 *
 * @param db        Firestore (Admin SDK)
 * @param event     Netlify event
 * @param kalit     shu webhook'ning nomi, masalan 'customer-bot-webhook'
 * @param envNomi   eski/zaxira muhit o'zgaruvchisi nomi (ixtiyoriy)
 * @returns {ok:true, himoya:'env'|'baza'|'yoq'} yoki {ok:false}
 *
 * Qoida:
 *   • env yoki bazada maxfiy so'z bor bo'lsa — sarlavhadagi so'z
 *     ulardan BIRIGA mos kelishi SHART, aks holda so'rov rad etiladi;
 *   • ikkalasi ham yo'q bo'lsa — eskicha ishlayveradi (bot to'xtab
 *     qolmasligi uchun), lekin javobda `himoya:'yoq'` qaytadi va admin
 *     panelida "Himoyalanmagan" deb ko'rsatiladi.
 */
async function webhookTekshir(db, event, kalit, envNomi) {
  const envSir = envNomi ? (process.env[envNomi] || '') : '';
  let bazaSir = '';
  try {
    const sirlar = await sirlarniOl(db);
    bazaSir = String((sirlar && sirlar[kalit]) || '');
  } catch (e) {}

  const kelgan = String(sarlavhadanOl(event) || '');

  if (!envSir && !bazaSir) return { ok: true, himoya: 'yoq' };
  if (envSir && kelgan === envSir) return { ok: true, himoya: 'env' };
  if (bazaSir && kelgan === bazaSir) return { ok: true, himoya: 'baza' };
  return { ok: false, himoya: bazaSir ? 'baza' : 'env' };
}

/* Admin panel tugmasi yozadi (admin-bot-security.js). */
async function sirniSaqla(db, kalit, sir) {
  await db.collection(TOPLAM).doc(HUJJAT).set(
    { [kalit]: String(sir), updatedAt: Date.now() }, { merge: true }
  );
  KESH = { at: 0, data: null };   // kesh darhol eskiradi
}

async function sirBormi(db, kalit) {
  const sirlar = await sirlarniOl(db);
  return !!(sirlar && sirlar[kalit]);
}

module.exports = { webhookTekshir, sirniSaqla, sirBormi, TOPLAM, HUJJAT };
