// SHAXSIY BOT — faqat SIZ (Asadbek) uchun.
// Xarajat/daromad hisoblagichi + rejalar (eslatma bilan) + erkin gaplashib
// buyruq beriladigan AI yordamchi.
//
// Barcha tugmalar — pastda DOIM TURADIGAN menyu ko'rinishida (inline emas).
// Har bir bosqichda "Orqaga" (bitta qadam ortga) va "Bekor qilish" (asosiy
// sahifaga) tugmalari bor.
//
// Kerakli Environment variables (Netlify):
//   PERSONAL_BOT_TOKEN, PERSONAL_BOT_CHAT_ID, ANTHROPIC_API_KEY,
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const admin = require('firebase-admin');
const { buildPlansPdfBuffer, buildStatsPdfBuffer } = require('./lib/personalBotPdf');

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

const BACK = '🔙 Orqaga';
const CANCEL = '❌ Bekor qilish';

// ---------- Telegram yordamchi funksiyalar ----------

async function sendDocument(chatId, buffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), filename);
  await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
}

async function sendMessage(chatId, text, keyboardRows) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  body.reply_markup = keyboardRows
    ? { keyboard: keyboardRows, resize_keyboard: true }
    : { keyboard: mainMenuRows(), resize_keyboard: true };
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

// Asosiy menyu — doim pastda turadi
function mainMenuRows() {
  return [
    ['➖ Xarajat', '➕ Daromad'],
    ['📊 Statistika', '📝 Rejalarim']
  ];
}
// Har bir ichki bosqichda — tanlov tugmalari + Orqaga/Bekor qilish
function stepRows(optionRows) {
  const rows = optionRows.map(r => Array.isArray(r) ? r : [r]);
  rows.push([BACK, CANCEL]);
  return rows;
}
function categoryRows(categories) {
  const rows = [];
  for (let i = 0; i < categories.length; i += 2) rows.push(categories.slice(i, i + 2));
  return stepRows(rows);
}

function formatSom(n) {
  return Number(n).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

// ---------- Holat va "orqaga" tarixi ----------
// state.step — hozirgi bosqich nomi
// state.history — o'tilgan bosqichlar ro'yxati (Orqaga bosilsa oxirgisiga qaytamiz)
// state.data — shu bosqichlar davomida yig'ilgan vaqtinchalik ma'lumot

async function getState() {
  const doc = await db.collection('personal_bot_state').doc('main').get();
  return doc.exists ? doc.data() : { step: 'MAIN', history: [], data: {} };
}
async function saveState(state) {
  await db.collection('personal_bot_state').doc('main').set(state);
}
async function goToStep(chatId, newStep, data) {
  const state = await getState();
  state.history = state.history || [];
  state.history.push(state.step || 'MAIN');
  state.step = newStep;
  state.data = Object.assign({}, state.data, data || {});
  await saveState(state);
  await renderStep(chatId, state);
}
async function goBack(chatId) {
  const state = await getState();
  const prevStep = (state.history && state.history.pop()) || 'MAIN';
  state.step = prevStep;
  await saveState(state);
  await renderStep(chatId, state);
}
async function goCancel(chatId) {
  await saveState({ step: 'MAIN', history: [], data: {} });
  await sendMessage(chatId, "Asosiy menyu:");
}

// Har bir bosqichga kirganda, mos xabar+tugmalarni ko'rsatish
async function renderStep(chatId, state) {
  switch (state.step) {
    case 'MAIN':
      await sendMessage(chatId, "Tanlang:");
      break;
    case 'EXPENSE_AMOUNT':
      await sendMessage(chatId, "➖ Xarajat summasini kiriting:", stepRows([]));
      break;
    case 'EXPENSE_CATEGORY':
      await sendMessage(chatId, `💸 ${formatSom(state.data.pendingAmount)} — qaysi toifaga?`, categoryRows(EXPENSE_CATEGORIES));
      break;
    case 'INCOME_AMOUNT':
      await sendMessage(chatId, "➕ Daromad summasini kiriting:", stepRows([]));
      break;
    case 'INCOME_CATEGORY':
      await sendMessage(chatId, `💰 ${formatSom(state.data.pendingAmount)} — qaysi toifaga?`, categoryRows(INCOME_CATEGORIES));
      break;
    case 'STATS_PERIOD':
      await sendMessage(chatId, "📊 Qaysi davr uchun?", stepRows([['📅 Bugungi', '🗓 1 haftalik'], ['📆 1 oylik', '✏️ Boshqa']]));
      break;
    case 'STATS_CUSTOM':
      await sendMessage(chatId, "Davrni yozing:\nOy: <b>08.2026</b>\nOraliq: <b>01.08.2026-31.08.2026</b>", stepRows([]));
      break;
    case 'PLANS_FORMAT':
      await sendMessage(chatId, "Qanday ko'rinishda ko'rsataylik?", stepRows([['📝 Matn orqali', '📄 PDF orqali']]));
      break;
    case 'PLANS_LIST':
      await renderPlansList(chatId, state);
      break;
    case 'PLAN_TYPE':
      await sendMessage(chatId, "Qaysi turdagi reja?", stepRows([['🎯 Uzoq muddat', '⏱ Yaqin muddat']]));
      break;
    case 'PLAN_TEXT':
      await sendMessage(chatId, "✍️ Rejangizni yozing:", stepRows([]));
      break;
    case 'PLAN_DATETIME':
      await sendMessage(chatId, "📅 Qachon eslatib turay?\n(Masalan: <b>25.08.2026 14:00</b>)", stepRows([]));
      break;
    case 'STATS_FORMAT':
      await sendMessage(chatId, "Qanday ko'rinishda ko'rsataylik?", stepRows([['📝 Matn orqali', '📄 PDF orqali']]));
      break;
  }
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

// ---------- Xabar (matn/tugma) kelganda ----------

async function handleMessage(msg) {
  const chatId = String(msg.chat.id);
  if (chatId !== OWNER_CHAT_ID) return; // faqat egasi ishlata oladi
  const text = (msg.text || '').trim();
  if (!text) return;

  if (text === '/start' || text === '/menu') {
    await saveState({ step: 'MAIN', history: [], data: {} });
    await sendMessage(chatId,
      `👋 Salom, <b>${OWNER_NAME}</b>!\n\nTugmalardan foydalaning, YOKI menga oddiy so'z bilan yozing — masalan:\n«bugun taksiga 30 ming ishlatdim»\n«shu hafta hisobot topshirishim kerak, seshanba eslat»\n«umumiy xarajatim qancha?»`);
    return;
  }

  // ---- Universal: Orqaga / Bekor qilish — istalgan bosqichda ishlaydi ----
  if (text === BACK) { await goBack(chatId); return; }
  if (text === CANCEL) { await goCancel(chatId); return; }

  // ---- Asosiy menyu tugmalari ----
  if (text === '➖ Xarajat') { await goToStep(chatId, 'EXPENSE_AMOUNT'); return; }
  if (text === '➕ Daromad') { await goToStep(chatId, 'INCOME_AMOUNT'); return; }
  if (text === '📊 Statistika') { await goToStep(chatId, 'STATS_PERIOD'); return; }
  if (text === '📝 Rejalarim') { await goToStep(chatId, 'PLANS_FORMAT'); return; }

  const state = await getState();

  // ---- Xarajat summasi ----
  if (state.step === 'EXPENSE_AMOUNT') {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!amount || amount <= 0) { await sendMessage(chatId, "❗️ Summani raqamda kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'EXPENSE_CATEGORY', { pendingAmount: amount });
    return;
  }
  if (state.step === 'EXPENSE_CATEGORY' && EXPENSE_CATEGORIES.includes(text)) {
    await db.collection('personal_bot_tx').add({ type: 'expense', amount: state.data.pendingAmount, category: text, ts: Date.now() });
    await saveState({ step: 'MAIN', history: [], data: {} });
    await sendMessage(chatId, `✅ -${formatSom(state.data.pendingAmount)} (${text})`);
    return;
  }

  // ---- Daromad summasi ----
  if (state.step === 'INCOME_AMOUNT') {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!amount || amount <= 0) { await sendMessage(chatId, "❗️ Summani raqamda kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'INCOME_CATEGORY', { pendingAmount: amount });
    return;
  }
  if (state.step === 'INCOME_CATEGORY' && INCOME_CATEGORIES.includes(text)) {
    await db.collection('personal_bot_tx').add({ type: 'income', amount: state.data.pendingAmount, category: text, ts: Date.now() });
    await saveState({ step: 'MAIN', history: [], data: {} });
    await sendMessage(chatId, `✅ +${formatSom(state.data.pendingAmount)} (${text})`);
    return;
  }

  // ---- Statistika tez tanlovlari ----
  if (state.step === 'STATS_PERIOD') {
    const now = new Date();
    if (text === '📅 Bugungi') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
      await goToStep(chatId, 'STATS_FORMAT', { statsStart: start, statsEnd: now.getTime(), statsLabel: 'Bugun' });
      return;
    }
    if (text === '🗓 1 haftalik') {
      const start = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      await goToStep(chatId, 'STATS_FORMAT', { statsStart: start, statsEnd: now.getTime(), statsLabel: 'Oxirgi 7 kun' });
      return;
    }
    if (text === '📆 1 oylik') {
      const start = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      await goToStep(chatId, 'STATS_FORMAT', { statsStart: start, statsEnd: now.getTime(), statsLabel: 'Oxirgi 30 kun' });
      return;
    }
    if (text === '✏️ Boshqa') {
      await goToStep(chatId, 'STATS_CUSTOM');
      return;
    }
  }

  // ---- Statistika davri (qo'lda kiritilgan) ----
  if (state.step === 'STATS_CUSTOM') {
    const range = parsePeriodText(text);
    if (!range) { await sendMessage(chatId, "❗️ Masalan: <b>08.2026</b> yoki <b>01.08.2026-31.08.2026</b>", stepRows([])); return; }
    await goToStep(chatId, 'STATS_FORMAT', { statsStart: range.startTs, statsEnd: range.endTs, statsLabel: text });
    return;
  }

  // ---- Statistika format tanlovi ----
  if (state.step === 'STATS_FORMAT') {
    const { statsStart, statsEnd, statsLabel } = state.data;
    if (text === '📝 Matn orqali') {
      await sendStatisticsRange(chatId, statsStart, statsEnd, statsLabel);
      await saveState({ step: 'MAIN', history: [], data: {} });
      return;
    }
    if (text === '📄 PDF orqali') {
      await sendTyping(chatId);
      await sendStatsPdf(chatId, statsStart, statsEnd, statsLabel);
      await saveState({ step: 'MAIN', history: [], data: {} });
      return;
    }
  }

  // ---- Rejalar format tanlovi ----
  if (state.step === 'PLANS_FORMAT') {
    if (text === '📝 Matn orqali') { await goToStep(chatId, 'PLANS_LIST'); return; }
    if (text === '📄 PDF orqali') {
      await sendTyping(chatId);
      await sendPlansPdf(chatId);
      await saveState({ step: 'MAIN', history: [], data: {} });
      return;
    }
  }

  // ---- Rejalar ro'yxati ekranida — "Yangi reja" tugmasi ----
  if (state.step === 'PLANS_LIST' && text === '➕ Yangi reja') {
    await goToStep(chatId, 'PLAN_TYPE');
    return;
  }

  // ---- Reja turi ----
  if (state.step === 'PLAN_TYPE' && (text === '🎯 Uzoq muddat' || text === '⏱ Yaqin muddat')) {
    await goToStep(chatId, 'PLAN_TEXT', { planType: text === '🎯 Uzoq muddat' ? 'long' : 'short' });
    return;
  }

  // ---- Reja matni ----
  if (state.step === 'PLAN_TEXT') {
    await goToStep(chatId, 'PLAN_DATETIME', { planText: text });
    return;
  }

  // ---- Reja sana/vaqti ----
  if (state.step === 'PLAN_DATETIME') {
    const reminderAt = parseUzDateTime(text);
    if (!reminderAt) { await sendMessage(chatId, "❗️ Format: <b>25.08.2026 14:00</b>", stepRows([])); return; }
    if (state.data.replanId) {
      await db.collection('personal_bot_plans').doc(state.data.replanId).update({ status: 'pending', reminderAt });
      await saveState({ step: 'MAIN', history: [], data: {} });
      await sendMessage(chatId, "✅ Yangi vaqt belgilandi.");
    } else {
      await db.collection('personal_bot_plans').add({
        planType: state.data.planType, text: state.data.planText, reminderAt, status: 'pending', createdAt: Date.now()
      });
      await saveState({ step: 'MAIN', history: [], data: {} });
      await sendMessage(chatId, `✅ Reja saqlandi: «${state.data.planText}»`);
    }
    return;
  }

  // ---- Hech biriga mos kelmadi — ERKIN MATN, AI qabul qiladi ----
  await sendTyping(chatId);
  await handleFreeTextWithAI(chatId, text);
}

// ---------- Inline tugma bosilganda (faqat eslatma Ha/Yo'q uchun) ----------

async function handleCallback(cq) {
  const chatId = String(cq.message.chat.id);
  if (chatId !== OWNER_CHAT_ID) { await answerCallback(cq.id); return; }
  const data = cq.data || '';
  await answerCallback(cq.id);

  if (data.startsWith('plan_done:')) {
    const planId = data.split(':')[1];
    await db.collection('personal_bot_plans').doc(planId).update({ status: 'done', completedAt: Date.now() });
    await sendMessage(chatId, "✅ Bajarildi deb belgilandi.");
    return;
  }
  if (data.startsWith('plan_notdone:')) {
    const planId = data.split(':')[1];
    await goToStep(chatId, 'PLAN_DATETIME', { replanId: planId });
    return;
  }
}

// ---------- Rejalar ro'yxati (alohida, mustaqil bo'lim) ----------

async function renderPlansList(chatId, state) {
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
  await sendMessage(chatId, text, stepRows([['➕ Yangi reja']]));
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

async function sendStatisticsRange(chatId, startTs, endTs, label) {
  const summary = await computeSummary(startTs, endTs);
  let text = `📊 <b>Statistika</b> — ${label}\n\n`;
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
  await sendMessage(chatId, text);
}

function parsePeriodText(periodText) {
  const rangeMatch = periodText.match(/(\d{2})\.(\d{2})\.(\d{4})-(\d{2})\.(\d{2})\.(\d{4})/);
  const monthMatch = periodText.match(/^(\d{1,2})\.(\d{4})$/);

  if (rangeMatch) {
    const [, d1, m1, y1, d2, m2, y2] = rangeMatch.map(Number);
    return {
      startTs: new Date(y1, m1 - 1, d1, 0, 0, 0).getTime(),
      endTs: new Date(y2, m2 - 1, d2, 23, 59, 59).getTime()
    };
  }
  if (monthMatch) {
    const [, mo, yr] = monthMatch.map(Number);
    return {
      startTs: new Date(yr, mo - 1, 1, 0, 0, 0).getTime(),
      endTs: new Date(yr, mo, 0, 23, 59, 59).getTime()
    };
  }
  return null;
}

async function sendPlansPdf(chatId) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

  const snap = await db.collection('personal_bot_plans').where('status', '==', 'pending').get();
  const allPlans = [];
  snap.forEach(doc => allPlans.push(doc.data()));
  allPlans.sort((a, b) => a.reminderAt - b.reminderAt);
  const todayPlans = allPlans.filter(p => p.reminderAt >= dayStart && p.reminderAt <= dayEnd);

  const buffer = await buildPlansPdfBuffer(todayPlans, allPlans, OWNER_NAME);
  await sendDocument(chatId, buffer, `rejalar_${now.toISOString().slice(0, 10)}.pdf`, '📄 Rejalaringiz');
}

async function sendStatsPdf(chatId, startTs, endTs, label) {
  const summary = await computeSummary(startTs, endTs);
  const buffer = await buildStatsPdfBuffer(summary, label, OWNER_NAME);
  await sendDocument(chatId, buffer, `statistika_${Date.now()}.pdf`, `📄 Statistika — ${label}`);
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
// ERKIN MATN — AI orqali tushunish va harakat qilish
// ================================================================

const TOOLS = [
  {
    name: 'add_plan',
    description: "Foydalanuvchi biror ish/vazifani rejaga qo'shishni so'raganda ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: {
        plan_type: { type: 'string', enum: ['long', 'short'] },
        text: { type: 'string' },
        reminder_datetime: { type: 'string', description: "'YYYY-MM-DD HH:MM' formatida. Aniq vaqt aytilmagan bo'lsa, o'zing mos vaqt tanla." }
      },
      required: ['plan_type', 'text', 'reminder_datetime']
    }
  },
  {
    name: 'remove_plan',
    description: "Foydalanuvchi mavjud rejani bekor qilish/o'chirishni so'raganda ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: { plan_id: { type: 'string' } },
      required: ['plan_id']
    }
  },
  {
    name: 'add_transaction',
    description: "Foydalanuvchi xarajat yoki daromad haqida gapirsa ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'number' },
        category: { type: 'string', description: "Xarajat: Taksi, Ovqatlanish, Ofis uchun, O'zim uchun, Investitsiya Raqam. Daromad: Vip raqamlar, Oylik xazna, Boshqalar." }
      },
      required: ['type', 'amount', 'category']
    }
  },
  {
    name: 'remove_transaction',
    description: "Foydalanuvchi adashib kiritgan yoki noto'g'ri yozilgan xarajat/daromadni o'chirishni so'raganda ishlatiladi. Agar u aniq qaysi yozuvni aytmasa (masalan shunchaki 'adashib yozdim, o'chir'), ENG OXIRGI qo'shilgan yozuvni o'chir.",
    input_schema: {
      type: 'object',
      properties: {
        which: { type: 'string', enum: ['last', 'match'], description: "'last' = eng oxirgi yozuv, 'match' = summasi/toifasi mos keladigan yozuv" },
        amount: { type: 'number', description: "'match' tanlansa, o'chiriladigan yozuvning summasi" },
        category: { type: 'string', description: "'match' tanlansa, o'chiriladigan yozuvning toifasi" }
      },
      required: ['which']
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
        system: `Sen ${OWNER_NAME}ning shaxsiy yordamchisisan. Xabarni tushunib, mos vositani (tool) chaqir. Agar shunchaki savol/suhbat bo'lsa, hech qanday tool chaqirmasdan, JUDA QISQA (maksimal 20 so'z), aniq javob ber — o'zbek tilida, lo'nda.`,
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
      await sendMessage(chatId, words);
    } else {
      await sendMessage(chatId, "Tushunmadim, qaytadan yozing.");
    }
  } catch (err) {
    console.error('AI erkin matn xatosi:', err);
    await sendMessage(chatId, "❗️ Xatolik yuz berdi, qayta urinib ko'ring.");
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
    await sendMessage(chatId, `✅ Rejaga qo'shildi: «${input.text}» — ${dateStr}`);
    return;
  }

  if (toolUse.name === 'remove_plan') {
    await db.collection('personal_bot_plans').doc(input.plan_id).delete();
    await sendMessage(chatId, "✅ Reja o'chirildi.");
    return;
  }

  if (toolUse.name === 'add_transaction') {
    await db.collection('personal_bot_tx').add({
      type: input.type, amount: input.amount, category: input.category, ts: Date.now()
    });
    const sign = input.type === 'expense' ? '-' : '+';
    await sendMessage(chatId, `✅ ${sign}${formatSom(input.amount)} (${input.category})`);
    return;
  }

  if (toolUse.name === 'remove_transaction') {
    const snap = await db.collection('personal_bot_tx').orderBy('ts', 'desc').limit(20).get();
    let target = null;
    if (input.which === 'match' && (input.amount || input.category)) {
      snap.forEach(doc => {
        if (target) return;
        const d = doc.data();
        const amountOk = !input.amount || d.amount === input.amount;
        const catOk = !input.category || d.category === input.category;
        if (amountOk && catOk) target = doc;
      });
    }
    if (!target && !snap.empty) target = snap.docs[0]; // eng oxirgisi

    if (!target) { await sendMessage(chatId, "❗️ O'chiriladigan yozuv topilmadi."); return; }
    const d = target.data();
    await target.ref.delete();
    const sign = d.type === 'expense' ? '-' : '+';
    await sendMessage(chatId, `✅ O'chirildi: ${sign}${formatSom(d.amount)} (${d.category})`);
    return;
  }
}
