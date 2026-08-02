// HAR KUNI SOAT 23:00 (Toshkent vaqti) DA AVTOMATIK ISHLAYDI —
// ertangi kunni rejalashtirish haqida chiroyli eslatma yuboradi.
// netlify.toml'da "schedule = 0 18 * * *" (UTC 18:00 = Toshkent 23:00).

const TOKEN = process.env.PERSONAL_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.PERSONAL_BOT_CHAT_ID;
const OWNER_NAME = 'Asadbek';

exports.handler = async function () {
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };

  const text =
    `🌙 Xayrli kech, <b>${OWNER_NAME}</b>.\n\n` +
    `Kun yakunlanmoqda — ertangi kuningizni rejalashtiring. ` +
    `Nima qilish kerakligini menga oddiy so'z bilan yozing, men rejalaringizga qo'shib qo'yaman.`;

  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text, parse_mode: 'HTML' })
    });
  } catch (e) {
    console.error('Kechki eslatma yuborishda xato:', e);
  }

  return { statusCode: 200, body: 'ok' };
};
