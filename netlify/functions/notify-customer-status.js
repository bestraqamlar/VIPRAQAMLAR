// Admin panelidan (brauzerdan) buyurtma statusi o'zgartirilganda, mijozga
// Telegram orqali xabar yuborish uchun. CUSTOMER_BOT_TOKEN shu yerda,
// serverda ishlatiladi — brauzerga hech qachon chiqmaydi.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { chatId, number, status } = JSON.parse(event.body || '{}');
    const token = process.env.CUSTOMER_BOT_TOKEN;

    if (!token || !chatId) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true }) };
    }

    const STATUS_MESSAGES = {
      "Bog'lanildi": "📞 Operatorlarimiz siz bilan bog'landi.",
      'Yakunlandi': "✅ Haridingiz uchun rahmat! Tez orada raqamingiz yetib boradi.",
      'Bekor qilindi': "❌ Sizning buyurtmangiz bekor qilindi."
    };
    const text = `${STATUS_MESSAGES[status] || `📌 Buyurtmangiz holati: ${status}`}\n\n📱 ${number}`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
