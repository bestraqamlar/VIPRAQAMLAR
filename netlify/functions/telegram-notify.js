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
    const { text } = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return { statusCode: 500, body: JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan' }) };
    }
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'text maydoni kerak' }) };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const data = await res.json();

    return { statusCode: 200, body: JSON.stringify({ ok: data.ok === true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
