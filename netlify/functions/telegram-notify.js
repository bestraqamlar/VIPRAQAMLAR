// Bu fayl serverda ishlaydi (Netlify Functions) — bot tokeni mijoz brauzeriga
// hech qachon yuborilmaydi, shuning uchun sayt manba kodida ko'rinmaydi.
//
// Ishlashi uchun Netlify saytida ikkita "Environment variable" qo'shishingiz kerak:
//   TELEGRAM_BOT_TOKEN = sizning bot tokeningiz
//   TELEGRAM_CHAT_ID   = sizning chat_id raqamingiz
//
// Qanday qo'shiladi: Netlify → sayt paneli → Site configuration →
// Environment variables → "Add a variable" → ikkalasini alohida-alohida kiriting.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { text, orderId } = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan' }) };
    }
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'text maydoni kerak' }) };
    }

    // Buyurtma ID mavjud bo'lsa, xabar ostiga status tugmalari qo'shiladi —
    // admin panelidagidek, Telegram'dan bevosita bosib status o'zgartirish uchun.
    const body = { chat_id: chatId, text };
    if (orderId) {
      body.reply_markup = {
        inline_keyboard: [
          [{ text: "📞 Bog'lanildi", callback_data: `st|${orderId}|B` }],
          [{ text: '✅ Yakunlandi', callback_data: `st|${orderId}|Y` }],
          [{ text: '❌ Bekor qilindi', callback_data: `st|${orderId}|C` }]
        ]
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    return { statusCode: 200, body: JSON.stringify({ ok: data.ok === true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
