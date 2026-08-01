// SHAXSIY BOT — faqat SIZ uchun (bitta odam boshqaradi).
// Xarajat/daromad hisoblagichi + rejalar (eslatma bilan) + AI maslahatchi.
//
// Kerakli Environment variables (Netlify):
//   PERSONAL_BOT_TOKEN   — @BotFather'dan olingan yangi bot tokeni
//   PERSONAL_BOT_CHAT_ID — sizning shaxsiy Telegram chat ID'ingiz (faqat
//                          shu ID'dan kelgan xabarlarga javob beriladi —
//                          boshqa hech kim botdan foydalana olmaydi)
//   ANTHROPIC_API_KEY    — Maslahatchi AI uchun (boshqa botlaringizda
//                          allaqachon bor bo'lishi kerak)
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//
// O'RNATISH: @BotFather orqali yangi bot yarating, tokenni oling, so'ng
// bu manzilga webhook o'rnating (brauzerda oching, bir marta yetarli):
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://SIZNING-SAYTINGIZ/.netlify/functions/personal-bot-webhook

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
db.settings({ preferRest: true });

const TOKEN = process.env.PERSONAL_BOT_TOKEN;
const OWNER_CHAT_ID = String(process.env.PERSONAL_BOT_CHAT_ID || '');
const API = `https://api.telegram.org/bot${TOKEN}`;

const EXPENSE_CATEGORIES = ['Taksi', 'Ovqatlanish', "Ofis uchun", "O'zim uchun", 'Investitsiya Raqam'];
const INCOME_CATEGORIES = ['Vip raqamlar', 'Oylik xazna', 'Boshqalar'];

// ---------- Telegram yordamchi funksiyalar ----------

async function sendMessage(chatId, text, replyMarkup) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallback(callbackId, text) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text: text || '' })
  });
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '➖ Xarajat', callback_data: 'menu_expense' }, { text: '➕ Daromad', callback_data: 'menu_income' }],
      [{ text: '📊 Statistika', callback_data: 'menu_stats' }],
      [{ text: '🧠 Maslahatchi AI', callback_data: 'menu_ai' }]
    ]
  };
}

function categoryKeyboard(categories, prefix) {
  const rows = categories.map(c => [{ text: c, callback_data: `${prefix}:${c}` }]);
  rows.push([{ text: '⬅️ Orqaga', callback_data: 'menu_main' }]);
  return { inline_keyboard: rows };
}

function formatSom(n) {
  return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

// ---------- Holatni saqlash (bosqichma-bosqich suhbat uchun) ----------

async function getState() {
  const doc = await db.collection('personal_bot_state').doc('main').get();
  return doc.exists ? doc.data() : {};
}
async function setState(data) {
  await db.collection('personal_bot_state').doc('main').set(data, { merge: false });
}
async function clearState() {
  await db.collection('personal_bot_state').doc('main').set({});
}

// ---------- Asosiy handler ----------

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };
  if (!TOKEN || !OWNER_CHAT_ID) return { statusCode: 200, body: 'ok' };

  let update;
  try { update = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 200, body: 'ok' }; }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    console.error('personal-bot xato:', err);
  }

  return { statusCode: 200, body: 'ok' };
};

// ---------- Xabar (matn) kelganda ----------

async function handleMessage(msg) {
  const chatId = String(msg.chat.id);
  if (chatId !== OWNER_CHAT_ID) return; // faqat egasi ishlata oladi
  const text = (msg.text || '').trim();

  if (text === '/start' || text === '/menu') {
    await clearState();
    await sendMessage(chatId, "🤖 <b>Shaxsiy botingiz</b>\n\nQuyidagilardan birini tanlang:", mainMenuKeyboard());
    return;
  }

  const state = await getState();

  // ---- Xarajat/Daromad summasi kutilmoqda ----
  if (state.awaiting === 'expense_amount' || state.awaiting === 'income_amount') {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!amount || amount <= 0) {
      await sendMessage(chatId, "❗️ Iltimos, summani raqamda kiriting (masalan: 50000)");
      return;
    }
    if (state.awaiting === 'expense_amount') {
      await setState({ awaiting: 'expense_category', pendingAmount: amount });
      await sendMessage(chatId, `💸 Summa: <b>${formatSom(amount)}</b>\n\nQaysi toifaga?`, categoryKeyboard(EXPENSE_CATEGORIES, 'exp_cat'));
    } else {
      await setState({ awaiting: 'income_category', pendingAmount: amount });
      await sendMessage(chatId, `💰 Summa: <b>${formatSom(amount)}</b>\n\nQaysi toifaga?`, categoryKeyboard(INCOME_CATEGORIES, 'inc_cat'));
    }
    return;
  }

  // ---- Statistika uchun sana kutilmoqda ----
  if (state.awaiting === 'stats_period') {
    await sendStatistics(chatId, text);
    await clearState();
    return;
  }

  // ---- Reja matni kutilmoqda ----
  if (state.awaiting === 'plan_text') {
    await setState({ awaiting: 'plan_datetime', planType: state.planType, planText: text });
    await sendMessage(chatId, "📅 Qachon eslatib turay?\n(Sana va vaqtni shu ko'rinishda yozing: <b>25.08.2026 14:00</b>)");
    return;
  }

  // ---- Reja uchun sana/vaqt kutilmoqda ----
  if (state.awaiting === 'plan_datetime') {
    const reminderAt = parseUzDateTime(text);
    if (!reminderAt) {
      await sendMessage(chatId, "❗️ Format noto'g'ri. Masalan: <b>25.08.2026 14:00</b> ko'rinishida yozing.");
      return;
    }
    await db.collection('personal_bot_plans').add({
      planType: state.planType,
      text: state.planText,
      reminderAt,
      status: 'pending',
      createdAt: Date.now()
    });
    await clearState();
    const label = state.planType === 'long' ? 'Uzoq muddat' : 'Yaqin muddat';
    await sendMessage(chatId, `✅ <b>${label} reja</b> saqlandi:\n«${state.planText}»\n\n⏰ Belgilangan vaqtda eslataman.`, mainMenuKeyboard());
    return;
  }

  // Hech qanday kutilayotgan holat yo'q — asosiy menyuni ko'rsatamiz
  await sendMessage(chatId, "Quyidagi menyudan tanlang:", mainMenuKeyboard());
}

// ---------- Tugma bosilganda ----------

async function handleCallback(cq) {
  const chatId = String(cq.message.chat.id);
  if (chatId !== OWNER_CHAT_ID) { await answerCallback(cq.id); return; }
  const data = cq.data || '';
  await answerCallback(cq.id);

  if (data === 'menu_main') {
    await clearState();
    await sendMessage(chatId, "Quyidagilardan birini tanlang:", mainMenuKeyboard());
    return;
  }

  if (data === 'menu_expense') {
    await setState({ awaiting: 'expense_amount' });
    await sendMessage(chatId, "➖ Xarajat summasini kiriting (masalan: 50000):");
    return;
  }

  if (data === 'menu_income') {
    await setState({ awaiting: 'income_amount' });
    await sendMessage(chatId, "➕ Daromad summasini kiriting (masalan: 500000):");
    return;
  }

  if (data.startsWith('exp_cat:') || data.startsWith('inc_cat:')) {
    const isExpense = data.startsWith('exp_cat:');
    const category = data.split(':')[1];
    const state = await getState();
    const amount = state.pendingAmount;
    if (!amount) { await sendMessage(chatId, "Xatolik: summa topilmadi, qaytadan urinib ko'ring.", mainMenuKeyboard()); return; }

    await db.collection('personal_bot_tx').add({
      type: isExpense ? 'expense' : 'income',
      amount,
      category,
      ts: Date.now()
    });
    await clearState();

    const sign = isExpense ? '-' : '+';
    await sendMessage(chatId, `✅ Saqlandi: <b>${sign}${formatSom(amount)}</b> (${category})`, mainMenuKeyboard());
    return;
  }

  if (data === 'menu_stats') {
    await setState({ awaiting: 'stats_period' });
    await sendMessage(chatId,
      "📊 Qaysi davr uchun statistika kerak?\n\n" +
      "Oy uchun: <b>08.2026</b>\n" +
      "Sanalar oralig'i uchun: <b>01.08.2026-31.08.2026</b>\n\n" +
      "ko'rinishida yozing.");
    return;
  }

  if (data === 'menu_plans') {
    await sendMessage(chatId, "📝 Qaysi turdagi reja?", {
      inline_keyboard: [
        [{ text: '🎯 Uzoq muddat reja', callback_data: 'plan_long' }],
        [{ text: '⏱ Yaqin muddat reja', callback_data: 'plan_short' }],
        [{ text: '⬅️ Orqaga', callback_data: 'menu_main' }]
      ]
    });
    return;
  }

  if (data === 'plan_long' || data === 'plan_short') {
    const planType = data === 'plan_long' ? 'long' : 'short';
    await setState({ awaiting: 'plan_text', planType });
    await sendMessage(chatId, "✍️ Rejangizni yozing:");
    return;
  }

  if (data.startsWith('plan_done:')) {
    const planId = data.split(':')[1];
    await db.collection('personal_bot_plans').doc(planId).update({ status: 'done', completedAt: Date.now() });
    await sendMessage(chatId, "✅ Ajoyib! Reja bajarildi deb belgilandi va statistikaga qo'shildi.", mainMenuKeyboard());
    return;
  }

  if (data.startsWith('plan_notdone:')) {
    const planId = data.split(':')[1];
    await setState({ awaiting: 'plan_datetime', planType: null, planText: null, replanId: planId });
    await sendMessage(chatId, "📅 Yangi sana va vaqtni kiriting (masalan: 25.08.2026 14:00):");
    return;
  }

  if (data === 'menu_ai') {
    await sendMessage(chatId, "🧠 Tahlil qilinmoqda...");
    const advice = await getAiAdvice();
    await sendMessage(chatId, advice, mainMenuKeyboard());
    return;
  }
}

// ---------- Sana/vaqt tahlili (25.08.2026 14:00 ko'rinishida) ----------

function parseUzDateTime(text) {
  const m = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, day, month, year, hour, minute] = m.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (isNaN(date.getTime())) return null;
  return date.getTime();
}

// ---------- Statistika ----------

async function sendStatistics(chatId, periodText) {
  let startTs, endTs;
  const rangeMatch = periodText.match(/(\d{2})\.(\d{2})\.(\d{4})-(\d{2})\.(\d{2})\.(\d{4})/);
  const monthMatch = periodText.match(/^(\d{1,2})\.(\d{4})$/);

  if (rangeMatch) {
    const [, d1, m1, y1, d2, m2, y2] = rangeMatch.map(Number);
    startTs = new Date(y1, m1 - 1, d1, 0, 0, 0).getTime();
    endTs = new Date(y2, m2 - 1, d2, 23, 59, 59).getTime();
  } else if (monthMatch) {
    const [, mo, yr] = monthMatch.map(Number);
    startTs = new Date(yr, mo - 1, 1, 0, 0, 0).getTime();
    endTs = new Date(yr, mo, 0, 23, 59, 59).getTime();
  } else {
    await sendMessage(chatId, "❗️ Format tushunarsiz. Masalan: <b>08.2026</b> yoki <b>01.08.2026-31.08.2026</b>");
    return;
  }

  const snap = await db.collection('personal_bot_tx')
    .where('ts', '>=', startTs).where('ts', '<=', endTs).get();

  const byCategory = {};
  let totalIncome = 0, totalExpense = 0;

  snap.forEach(doc => {
    const d = doc.data();
    const key = `${d.type === 'income' ? '➕' : '➖'} ${d.category}`;
    byCategory[key] = (byCategory[key] || 0) + d.amount;
    if (d.type === 'income') totalIncome += d.amount; else totalExpense += d.amount;
  });

  let text = `📊 <b>Statistika</b>\n${periodText}\n\n`;
  const sortedKeys = Object.keys(byCategory).sort();
  if (sortedKeys.length === 0) {
    text += "Bu davrda yozuv topilmadi.\n";
  } else {
    for (const k of sortedKeys) {
      text += `${k}: <b>${formatSom(byCategory[k])}</b>\n`;
    }
  }
  text += `\n💰 Jami daromad: <b>${formatSom(totalIncome)}</b>`;
  text += `\n💸 Jami xarajat: <b>${formatSom(totalExpense)}</b>`;
  text += `\n📈 Sof: <b>${formatSom(totalIncome - totalExpense)}</b>`;

  await sendMessage(chatId, text, {
    inline_keyboard: [
      [{ text: '📝 Rejalarim', callback_data: 'menu_plans' }],
      [{ text: '⬅️ Bosh menyu', callback_data: 'menu_main' }]
    ]
  });
}

// ---------- Maslahatchi AI ----------

async function getAiAdvice() {
  try {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000; // oxirgi 30 kun
    const txSnap = await db.collection('personal_bot_tx').where('ts', '>=', since).get();
    const plansSnap = await db.collection('personal_bot_plans').where('status', '==', 'pending').get();

    let totalIncome = 0, totalExpense = 0;
    const byCategory = {};
    txSnap.forEach(doc => {
      const d = doc.data();
      byCategory[d.category] = (byCategory[d.category] || 0) + d.amount;
      if (d.type === 'income') totalIncome += d.amount; else totalExpense += d.amount;
    });
    const plans = [];
    plansSnap.forEach(doc => plans.push(doc.data().text));

    const context = `Oxirgi 30 kunlik moliyaviy ma'lumot:
Jami daromad: ${totalIncome} so'm
Jami xarajat: ${totalExpense} so'm
Toifalar bo'yicha: ${JSON.stringify(byCategory)}
Kutilayotgan rejalar: ${plans.join('; ') || 'yo\'q'}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: "Sen shaxsiy moliyaviy maslahatchisan. FAQAT berilgan ma'lumot asosida, o'zbek tilida, ANIQ va LO'NDA maslahat ber. Javob 15 qatordan OSHMASIN. Umumiy gap yo'q, faqat shu odamning real raqamlariga asoslangan aniq tavsiya.",
        messages: [{ role: 'user', content: context + "\n\nShu ma'lumot asosida menga maslahat ber." }]
      })
    });
    const data = await res.json();
    const text = data.content && data.content[0] ? data.content[0].text : "Xatolik yuz berdi, keyinroq urinib ko'ring.";

    // Xavfsizlik: 15 qatordan oshsa, kesib tashlaymiz
    const lines = text.split('\n').filter(l => l.trim());
    return "🧠 <b>Maslahatchi AI</b>\n\n" + lines.slice(0, 15).join('\n');
  } catch (err) {
    console.error('AI maslahat xatosi:', err);
    return "❗️ AI maslahat olishda xatolik yuz berdi.";
  }
}
