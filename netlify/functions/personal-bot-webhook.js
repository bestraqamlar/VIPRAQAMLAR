// SHAXSIY BOT — faqat SIZ (Asadbek) uchun.
// Xarajat/daromad hisoblagichi + rejalar (eslatma bilan) + erkin gaplashib
// buyruq beriladigan AI yordamchi.
//
// Kerakli Environment variables (Netlify):
//   PERSONAL_BOT_TOKEN, PERSONAL_BOT_CHAT_ID, ANTHROPIC_API_KEY,
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

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
const OWNER_NAME = 'Asadbek';

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

async function sendTyping(chatId) {
  try {
    await fetch(`${API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' })
    });
  } catch (e) { /* muhim emas */ }
}

async function answerCallback(callbackId, text) {
  await fetch(`${API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text: text || '' })
  });
}

// Sodda, tekis asosiy menyu — hech narsa ichma-ich yashiringan emas
function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '➖ Xarajat', callback_data: 'menu_expense' }, { text: '➕ Daromad', callback_data: 'menu_income' }],
      [{ text: '📊 Statistika', callback_data: 'menu_stats' }, { text: '📝 Rejalarim', callback_data: 'menu_plans' }]
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
  if (!text) return;

  if (text === '/start' || text === '/menu') {
    await clearState();
    await sendMessage(chatId,
      `👋 Salom, <b>${OWNER_NAME}</b>!\n\nTugmalardan foydalaning, YOKI menga oddiy so'z bilan yozing — masalan:\n«bugun taksiga 30 ming ishlatdim»\n«shu hafta hisobot topshirishim kerak, seshanba kuni eslat»\n«umumiy xarajatim qancha?»\n\nMen tushunaman va o'zim bajaraman.`,
      mainMenuKeyboard());
    return;
  }

  const state = await getState();

  // ---- Xarajat/Daromad summasi kutilmoqda ----
  if (state.awaiting === 'expense_amount' || state.awaiting === 'income_amount') {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!amount || amount <= 0) {
      await sendMessage(chatId, "❗️ Summani raqamda kiriting (masalan: 50000)");
      return;
    }
    if (state.awaiting === 'expense_amount') {
      await setState({ awaiting: 'expense_category', pendingAmount: amount });
      await sendMessage(chatId, `💸 ${formatSom(amount)} — qaysi toifaga?`, categoryKeyboard(EXPENSE_CATEGORIES, 'exp_cat'));
    } else {
      await setState({ awaiting: 'income_category', pendingAmount: amount });
      await sendMessage(chatId, `💰 ${formatSom(amount)} — qaysi toifaga?`, categoryKeyboard(INCOME_CATEGORIES, 'inc_cat'));
    }
    return;
  }

  // ---- Statistika uchun sana kutilmoqda ----
  if (state.awaiting === 'stats_period') {
    await sendStatistics(chatId, text);
    await clearState();
    return;
  }

  // ---- Reja matni kutilmoqda (tugma orqali kiritilayotgan bo'lsa) ----
  if (state.awaiting === 'plan_text') {
    await setState({ awaiting: 'plan_datetime', planType: state.planType, planText: text });
    await sendMessage(chatId, "📅 Qachon eslatib turay?\n(Masalan: <b>25.08.2026 14:00</b>)");
    return;
  }

  // ---- Reja uchun sana/vaqt kutilmoqda ----
  if (state.awaiting === 'plan_datetime') {
    const reminderAt = parseUzDateTime(text);
    if (!reminderAt) {
      await sendMessage(chatId, "❗️ Format: <b>25.08.2026 14:00</b> ko'rinishida yozing.");
      return;
    }
    if (state.replanId) {
      await db.collection('personal_bot_plans').doc(state.replanId).update({ status: 'pending', reminderAt });
      await clearState();
      await sendMessage(chatId, "✅ Yangi vaqt belgilandi.", mainMenuKeyboard());
    } else {
      await db.collection('personal_bot_plans').add({
        planType: state.planType, text: state.planText, reminderAt, status: 'pending', createdAt: Date.now()
      });
      await clearState();
      await sendMessage(chatId, `✅ Reja saqlandi: «${state.planText}»`, mainMenuKeyboard());
    }
    return;
  }

  // ---- Hech qanday kutilayotgan holat yo'q — ERKIN MATN, AI qabul qiladi ----
  await sendTyping(chatId);
  await handleFreeTextWithAI(chatId, text);
}

// ---------- Tugma bosilganda ----------

async function handleCallback(cq) {
  const chatId = String(cq.message.chat.id);
  if (chatId !== OWNER_CHAT_ID) { await answerCallback(cq.id); return; }
  const data = cq.data || '';
  await answerCallback(cq.id);

  if (data === 'menu_main') {
    await clearState();
    await sendMessage(chatId, "Tanlang:", mainMenuKeyboard());
    return;
  }

  if (data === 'menu_expense') {
    await setState({ awaiting: 'expense_amount' });
    await sendMessage(chatId, "➖ Summani kiriting:");
    return;
  }

  if (data === 'menu_income') {
    await setState({ awaiting: 'income_amount' });
    await sendMessage(chatId, "➕ Summani kiriting:");
    return;
  }

  if (data.startsWith('exp_cat:') || data.startsWith('inc_cat:')) {
    const isExpense = data.startsWith('exp_cat:');
    const category = data.split(':')[1];
    const state = await getState();
    const amount = state.pendingAmount;
    if (!amount) { await sendMessage(chatId, "Xatolik, qaytadan urinib ko'ring.", mainMenuKeyboard()); return; }

    await db.collection('personal_bot_tx').add({
      type: isExpense ? 'expense' : 'income', amount, category, ts: Date.now()
    });
    await clearState();
    const sign = isExpense ? '-' : '+';
    await sendMessage(chatId, `✅ ${sign}${formatSom(amount)} (${category})`, mainMenuKeyboard());
    return;
  }

  if (data === 'menu_stats') {
    await setState({ awaiting: 'stats_period' });
    await sendMessage(chatId, "📊 Davrni yozing:\nOy: <b>08.2026</b>\nOraliq: <b>01.08.2026-31.08.2026</b>");
    return;
  }

  if (data === 'menu_plans') {
    await showPlansList(chatId);
    return;
  }

  if (data === 'plan_new') {
    await sendMessage(chatId, "Qaysi turdagi reja?", {
      inline_keyboard: [
        [{ text: '🎯 Uzoq muddat', callback_data: 'plan_long' }, { text: '⏱ Yaqin muddat', callback_data: 'plan_short' }],
        [{ text: '⬅️ Orqaga', callback_data: 'menu_main' }]
      ]
    });
    return;
  }

  if (data === 'plan_long' || data === 'plan_short') {
    await setState({ awaiting: 'plan_text', planType: data === 'plan_long' ? 'long' : 'short' });
    await sendMessage(chatId, "✍️ Rejangizni yozing:");
    return;
  }

  if (data.startsWith('plan_done:')) {
    const planId = data.split(':')[1];
    await db.collection('personal_bot_plans').doc(planId).update({ status: 'done', completedAt: Date.now() });
    await sendMessage(chatId, "✅ Bajarildi deb belgilandi.", mainMenuKeyboard());
    return;
  }

  if (data.startsWith('plan_notdone:')) {
    const planId = data.split(':')[1];
    await setState({ awaiting: 'plan_datetime', replanId: planId });
    await sendMessage(chatId, "📅 Yangi sana va vaqt (masalan: 25.08.2026 14:00):");
    return;
  }
}

// ---------- Rejalar ro'yxati (alohida, mustaqil bo'lim) ----------

async function showPlansList(chatId) {
  const snap = await db.collection('personal_bot_plans').where('status', '==', 'pending').get();
  const plans = [];
  snap.forEach(doc => plans.push({ id: doc.id, ...doc.data() }));
  plans.sort((a, b) => a.reminderAt - b.reminderAt);

  let text = "📝 <b>Rejalaringiz</b>\n\n";
  if (plans.length === 0) {
    text += "Hozircha reja yo'q.";
  } else {
    for (const p of plans) {
      const label = p.planType === 'long' ? '🎯' : '⏱';
      const d = new Date(p.reminderAt);
      const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      text += `${label} «${p.text}» — ${dateStr}\n`;
    }
  }
  await sendMessage(chatId, text, {
    inline_keyboard: [
      [{ text: '➕ Yangi reja', callback_data: 'plan_new' }],
      [{ text: '⬅️ Bosh menyu', callback_data: 'menu_main' }]
    ]
  });
}

// ---------- Sana/vaqt tahlili ----------

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
    await sendMessage(chatId, "❗️ Masalan: <b>08.2026</b> yoki <b>01.08.2026-31.08.2026</b>");
    return;
  }

  const summary = await computeSummary(startTs, endTs);
  let text = `📊 <b>Statistika</b> — ${periodText}\n\n`;
  if (Object.keys(summary.byCategory).length === 0) {
    text += "Bu davrda yozuv topilmadi.\n";
  } else {
    for (const k of Object.keys(summary.byCategory).sort()) {
      text += `${k}: <b>${formatSom(summary.byCategory[k])}</b>\n`;
    }
  }
  text += `\n💰 Daromad: <b>${formatSom(summary.totalIncome)}</b>`;
  text += `\n💸 Xarajat: <b>${formatSom(summary.totalExpense)}</b>`;
  text += `\n📈 Sof: <b>${formatSom(summary.totalIncome - summary.totalExpense)}</b>`;

  await sendMessage(chatId, text, mainMenuKeyboard());
}

async function computeSummary(startTs, endTs) {
  const snap = await db.collection('personal_bot_tx').where('ts', '>=', startTs).where('ts', '<=', endTs).get();
  const byCategory = {};
  let totalIncome = 0, totalExpense = 0;
  snap.forEach(doc => {
    const d = doc.data();
    const key = `${d.type === 'income' ? '➕' : '➖'} ${d.category}`;
    byCategory[key] = (byCategory[key] || 0) + d.amount;
    if (d.type === 'income') totalIncome += d.amount; else totalExpense += d.amount;
  });
  return { byCategory, totalIncome, totalExpense };
}

// ================================================================
// ERKIN MATN — AI orqali tushunish va harakat qilish (asosiy yangilik)
// ================================================================
//
// Foydalanuvchi oddiy so'z bilan yozganda ("shu hafta hisobot topshirishim
// kerak, seshanba eslat", "umumiy xarajatim qancha?", "palov yeb 30 ming
// ishlatdim"), AI xabarni tushunadi va quyidagilardan birini bajaradi:
//  - reja qo'shish (add_plan)
//  - rejani bekor qilish/o'chirish (remove_plan)
//  - xarajat/daromad qo'shish (add_transaction)
//  - savolga (masalan umumiy xarajat) qisqa javob berish (just_reply)

const TOOLS = [
  {
    name: 'add_plan',
    description: "Foydalanuvchi biror ish/vazifani rejaga qo'shishni so'raganda ishlatiladi. Masalan: 'shu hafta hisobot topshirishim kerak'.",
    input_schema: {
      type: 'object',
      properties: {
        plan_type: { type: 'string', enum: ['long', 'short'], description: "'long' = uzoq muddat (oy/yildan keyin), 'short' = yaqin muddat (kun/hafta ichida)" },
        text: { type: 'string', description: 'Reja matni, qisqa va aniq' },
        reminder_datetime: { type: 'string', description: "Eslatma sanasi va vaqti 'YYYY-MM-DD HH:MM' formatida. Agar aniq vaqt aytilmagan bo'lsa, mos vaqtni o'zing tanla (masalan 'seshanba' desa, eng yaqin seshanba kuni, soat 10:00)." }
      },
      required: ['plan_type', 'text', 'reminder_datetime']
    }
  },
  {
    name: 'remove_plan',
    description: "Foydalanuvchi mavjud rejani bekor qilish/o'chirishni so'raganda ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: { plan_id: { type: 'string', description: "O'chiriladigan rejaning ID'si (berilgan ro'yxatdan)" } },
      required: ['plan_id']
    }
  },
  {
    name: 'add_transaction',
    description: "Foydalanuvchi xarajat yoki daromad haqida gapirsa (masalan 'taksiga 30 ming ishlatdim') ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'number' },
        category: { type: 'string', description: "Eng mos toifa: xarajat uchun (Taksi, Ovqatlanish, Ofis uchun, O'zim uchun, Investitsiya Raqam), daromad uchun (Vip raqamlar, Oylik xazna, Boshqalar)" }
      },
      required: ['type', 'amount', 'category']
    }
  }
];

async function handleFreeTextWithAI(chatId, userText) {
  try {
    const now = new Date();
    const plansSnap = await db.collection('personal_bot_plans').where('status', '==', 'pending').get();
    const plans = [];
    plansSnap.forEach(doc => plans.push({ id: doc.id, text: doc.data().text }));

    const since = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const summary = await computeSummary(since, now.getTime());

    const context = `Bugungi sana: ${now.toISOString().slice(0, 16).replace('T', ' ')}
Foydalanuvchi ismi: ${OWNER_NAME}
Oxirgi 30 kun — Daromad: ${summary.totalIncome} so'm, Xarajat: ${summary.totalExpense} so'm
Toifalar: ${JSON.stringify(summary.byCategory)}
Kutilayotgan rejalar: ${plans.map(p => `[${p.id}] ${p.text}`).join('; ') || "yo'q"}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: `Sen ${OWNER_NAME}ning shaxsiy yordamchisisan — moliya va rejalarni boshqarasan. Xabarni tushunib, mos vositani (tool) chaqir. Agar bu shunchaki savol yoki suhbat bo'lsa (masalan "umumiy xarajatim qancha"), hech qanday tool chaqirmasdan, TO'G'RIDAN-TO'G'RI, JUDA QISQA (maksimal 20 so'z), aniq javob ber — o'zbek tilida, do'stona, lekin lo'nda. Hech qachon uzun tushuntirish yozma.`,
        tools: TOOLS,
        messages: [{ role: 'user', content: context + `\n\n${OWNER_NAME} yozdi: "${userText}"` }]
      })
    });
    const data = await res.json();

    if (!data.content) { await sendMessage(chatId, "❗️ Xatolik yuz berdi."); return; }

    const toolUse = data.content.find(b => b.type === 'tool_use');
    const textBlock = data.content.find(b => b.type === 'text');

    if (toolUse) {
      await executeTool(chatId, toolUse);
    } else if (textBlock) {
      const words = textBlock.text.trim().split(/\s+/).slice(0, 25).join(' ');
      await sendMessage(chatId, words, mainMenuKeyboard());
    } else {
      await sendMessage(chatId, "Tushunmadim, qaytadan yozing.", mainMenuKeyboard());
    }
  } catch (err) {
    console.error('AI erkin matn xatosi:', err);
    await sendMessage(chatId, "❗️ Xatolik yuz berdi, qayta urinib ko'ring.", mainMenuKeyboard());
  }
}

async function executeTool(chatId, toolUse) {
  const input = toolUse.input || {};

  if (toolUse.name === 'add_plan') {
    const reminderAt = new Date(input.reminder_datetime.replace(' ', 'T')).getTime();
    if (isNaN(reminderAt)) { await sendMessage(chatId, "❗️ Vaqtni aniqlay olmadim, qaytadan urining."); return; }
    await db.collection('personal_bot_plans').add({
      planType: input.plan_type, text: input.text, reminderAt, status: 'pending', createdAt: Date.now()
    });
    const d = new Date(reminderAt);
    const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    await sendMessage(chatId, `✅ Rejaga qo'shildi: «${input.text}» — ${dateStr}`, mainMenuKeyboard());
    return;
  }

  if (toolUse.name === 'remove_plan') {
    await db.collection('personal_bot_plans').doc(input.plan_id).delete();
    await sendMessage(chatId, "✅ Reja o'chirildi.", mainMenuKeyboard());
    return;
  }

  if (toolUse.name === 'add_transaction') {
    await db.collection('personal_bot_tx').add({
      type: input.type, amount: input.amount, category: input.category, ts: Date.now()
    });
    const sign = input.type === 'expense' ? '-' : '+';
    await sendMessage(chatId, `✅ ${sign}${formatSom(input.amount)} (${input.category})`, mainMenuKeyboard());
    return;
  }
}
