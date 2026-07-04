// Admin panel (veb-sayt)dan buyurtma statusi o'zgartirilganda, mos Telegram
// xabaridagi tugmalarni ham "tasdiqlangan holat"ga almashtirish uchun.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { messageId, statusLabel } = JSON.parse(event.body || '{}');
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId || !messageId || !statusLabel) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: true }) };
    }

    await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: `✅ ${statusLabel}`, callback_data: 'noop' }]] }
      })
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
