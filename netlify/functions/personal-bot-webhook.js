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
const { buildPlansPdfBuffer, buildStatsPdfBuffer, buildCreditPdfBuffer } = require('./lib/personalBotPdf');

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

// Toshkent — doim UTC+5 (yozgi vaqtga o'tish yo'q). Server odatda UTC'da
// ishlaydi, shuning uchun foydalanuvchi kiritgan "soat"ni TO'G'RI, Toshkent
// vaqti sifatida tushunish uchun aniq shu funksiya orqali hisoblaymiz.
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
function tashkentDateTime(year, month, day, hour, minute) {
  return Date.UTC(year, month - 1, day, hour || 0, minute || 0) - TASHKENT_OFFSET_MS;
}
function tashkentToday() {
  const nowTashkent = new Date(Date.now() + TASHKENT_OFFSET_MS);
  return { y: nowTashkent.getUTCFullYear(), m: nowTashkent.getUTCMonth() + 1, d: nowTashkent.getUTCDate() };
}
// Berilgan vaqtni (epoch ms) — Toshkent devor-soati bo'yicha, ko'rsatish
// uchun matnga aylantiradi (server qaysi vaqt mintaqasida ishlashidan
// qat'i nazar, HAR DOIM to'g'ri Toshkent soatini ko'rsatadi).
function formatTashkent(ts, withTime) {
  const d = new Date(ts + TASHKENT_OFFSET_MS);
  const p = x => String(x).padStart(2, '0');
  const datePart = `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  return withTime === false ? datePart : `${datePart} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// ---------- Telegram yordamchi funksiyalar ----------

async function sendDocument(chatId, buffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  if (caption) form.append('caption', caption);
  form.append('document', new Blob([buffer], { type: 'application/pdf' }), filename);
  const res = await fetch(`${API}/sendDocument`, { method: 'POST', body: form });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('Telegram sendDocument xatosi:', res.status, errBody);
  }
}

async function sendMessage(chatId, text, keyboardRows) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  body.reply_markup = keyboardRows
    ? { keyboard: keyboardRows, resize_keyboard: true }
    : { keyboard: mainMenuRows(), resize_keyboard: true };
  const res = await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    console.error('Telegram sendMessage xatosi:', res.status, errBody);
  }
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
    ['📊 Statistika', '📝 Rejalarim'],
    ['💳 Kredit shartnomalar']
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
// Foydalanuvchi kiritgan (yoki AI yozgan) matnda "<", ">", "&" bo'lsa,
// Telegram HTML formatlashni buzib, xabar YUBORILMAY qolishi mumkin edi —
// shu sabab bunday matnlarni HAR DOIM shu orqali "ekranlaymiz".
function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
      await sendMessage(chatId, "📊 Qaysi davr uchun?", stepRows([['📅 Bugungi', '🗓 1 haftalik'], ['📆 1 oylik', '✏️ Boshqa'], ['✅ Bajarilganlar']]));
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
    case 'CREDIT_MENU':
      await sendMessage(chatId, "💳 Kredit shartnomalar:", stepRows([['📋 Ro\'yxatni ko\'rish'], ['➕ Yangi shartnoma'], ['📄 Umumiy PDF']]));
      break;
    case 'CREDIT_NAME':
      await sendMessage(chatId, "👤 Mijozning ism-familiyasini kiriting:", stepRows([]));
      break;
    case 'CREDIT_PHONE':
      await sendMessage(chatId, "📱 Mijoz telefon raqamini kiriting:\n(masalan: 998901234567)", stepRows([]));
      break;
    case 'CREDIT_REGION':
      await sendMessage(chatId, "📍 Viloyatni kiriting:", stepRows([]));
      break;
    case 'CREDIT_NUMBER':
      await sendMessage(chatId, "📞 Kredit bilan olingan raqamni kiriting:", stepRows([]));
      break;
    case 'CREDIT_MONTHS':
      await sendMessage(chatId, "🗓 Necha oyga bo'lib to'lash? (raqam kiriting)", stepRows([]));
      break;
    case 'CREDIT_MONTHLY':
      await sendMessage(chatId, "💰 Har oylik to'lov summasini kiriting:", stepRows([]));
      break;
    case 'CREDIT_PAYDAY':
      await sendMessage(chatId, "📆 Har oyning nechanchi kunida to'lanadi? (1-31)", stepRows([]));
      break;
    case 'CREDIT_INFO':
      await sendMessage(chatId, "📝 Qo'shimcha izoh (bo'lmasa \"yo'q\" deb yozing):", stepRows([]));
      break;
    case 'CREDIT_CONFIRM':
      await sendMessage(chatId, buildCreditConfirmText(state.data), stepRows([['✅ Saqlash']]));
      break;
  }
}

function buildCreditConfirmText(d) {
  return `Tekshiring:\n\n👤 ${escapeHtml(d.crName)}\n📱 ${escapeHtml(d.crPhone)}\n📍 ${escapeHtml(d.crRegion)}\n📞 ${escapeHtml(d.crNumber)}\n🗓 ${d.crMonths} oy\n💰 ${formatSom(d.crMonthly)} / oyiga\n📆 Har oyning ${d.crPayDay}-kuni\n📝 ${escapeHtml(d.crInfo)}\n\nHammasi to'g'rimi?`;
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
  if (text === '💳 Kredit shartnomalar') { await goToStep(chatId, 'CREDIT_MENU'); return; }

  const state = await getState();

  // ---- Xarajat summasi ----
  if (state.step === 'EXPENSE_AMOUNT') {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!amount || amount <= 0) { await sendMessage(chatId, "❗️ Summani raqamda kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'EXPENSE_CATEGORY', { pendingAmount: amount });
    return;
  }
  if (state.step === 'EXPENSE_CATEGORY') {
    if (!EXPENSE_CATEGORIES.includes(text)) { await sendMessage(chatId, "❗️ Iltimos, tugmalardan birini tanlang.", categoryRows(EXPENSE_CATEGORIES)); return; }
    await db.collection('personal_bot_tx').add({ type: 'expense', amount: state.data.pendingAmount, category: text, ts: Date.now() });
    await saveState({ step: 'MAIN', history: [], data: {} });
    await sendMessage(chatId, `✅ -${formatSom(state.data.pendingAmount)} (${text})`);
    await checkBudgetAndWarn(chatId, text);
    return;
  }

  // ---- Daromad summasi ----
  if (state.step === 'INCOME_AMOUNT') {
    const amount = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!amount || amount <= 0) { await sendMessage(chatId, "❗️ Summani raqamda kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'INCOME_CATEGORY', { pendingAmount: amount });
    return;
  }
  if (state.step === 'INCOME_CATEGORY') {
    if (!INCOME_CATEGORIES.includes(text)) { await sendMessage(chatId, "❗️ Iltimos, tugmalardan birini tanlang.", categoryRows(INCOME_CATEGORIES)); return; }
    await db.collection('personal_bot_tx').add({ type: 'income', amount: state.data.pendingAmount, category: text, ts: Date.now() });
    await saveState({ step: 'MAIN', history: [], data: {} });
    await sendMessage(chatId, `✅ +${formatSom(state.data.pendingAmount)} (${text})`);
    return;
  }

  // ---- Statistika tez tanlovlari ----
  if (state.step === 'STATS_PERIOD') {
    const now = new Date();
    if (text === '📅 Bugungi') {
      const t = tashkentToday();
      const start = tashkentDateTime(t.y, t.m, t.d, 0, 0);
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
    if (text === '✅ Bajarilganlar') {
      await sendCompletedPlans(chatId);
      await saveState({ step: 'MAIN', history: [], data: {} });
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
      await sendMessage(chatId, `✅ Reja saqlandi: «${escapeHtml(state.data.planText)}»`);
    }
    return;
  }

  // ---- Kredit shartnomalar menyusi ----
  if (state.step === 'CREDIT_MENU') {
    if (text === "📋 Ro'yxatni ko'rish") {
      await sendTyping(chatId);
      await renderCreditList(chatId);
      await saveState({ step: 'MAIN', history: [], data: {} });
      return;
    }
    if (text === '➕ Yangi shartnoma') { await goToStep(chatId, 'CREDIT_NAME'); return; }
    if (text === '📄 Umumiy PDF') {
      await sendTyping(chatId);
      await sendCreditPdf(chatId);
      await saveState({ step: 'MAIN', history: [], data: {} });
      return;
    }
  }

  // ---- Yangi kredit shartnoma — bosqichma-bosqich ----
  if (state.step === 'CREDIT_NAME') {
    await goToStep(chatId, 'CREDIT_PHONE', { crName: text });
    return;
  }
  if (state.step === 'CREDIT_PHONE') {
    await goToStep(chatId, 'CREDIT_REGION', { crPhone: text });
    return;
  }
  if (state.step === 'CREDIT_REGION') {
    await goToStep(chatId, 'CREDIT_NUMBER', { crRegion: text });
    return;
  }
  if (state.step === 'CREDIT_NUMBER') {
    await goToStep(chatId, 'CREDIT_MONTHS', { crNumber: text });
    return;
  }
  if (state.step === 'CREDIT_MONTHS') {
    const months = parseInt(text.replace(/\D/g, ''), 10);
    if (!months || months <= 0) { await sendMessage(chatId, "❗️ Oy sonini raqamda kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'CREDIT_MONTHLY', { crMonths: months });
    return;
  }
  if (state.step === 'CREDIT_MONTHLY') {
    const monthly = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!monthly || monthly <= 0) { await sendMessage(chatId, "❗️ Summani raqamda kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'CREDIT_PAYDAY', { crMonthly: monthly });
    return;
  }
  if (state.step === 'CREDIT_PAYDAY') {
    const payDay = parseInt(text.replace(/\D/g, ''), 10);
    if (!payDay || payDay < 1 || payDay > 31) { await sendMessage(chatId, "❗️ 1 dan 31 gacha bo'lgan kunni kiriting.", stepRows([])); return; }
    await goToStep(chatId, 'CREDIT_INFO', { crPayDay: payDay });
    return;
  }
  if (state.step === 'CREDIT_INFO') {
    await goToStep(chatId, 'CREDIT_CONFIRM', { crInfo: text });
    return;
  }
  if (state.step === 'CREDIT_CONFIRM' && text === '✅ Saqlash') {
    await sendTyping(chatId);
    try {
      const d = state.data;
      const contractId = 'C' + Date.now();
      const startTs = Date.now();
      const payments = Array.from({ length: d.crMonths }, (_, i) => ({
        month: i + 1,
        dueAt: startTs + (i + 1) * 30 * 24 * 60 * 60 * 1000,
        amount: d.crMonthly,
        paid: false
      }));
      await db.collection('credit_contracts').doc(contractId).set({
        contractId, customerName: d.crName, customerPhone: d.crPhone, region: d.crRegion,
        number: d.crNumber, totalMonths: d.crMonths, monthlyPayment: d.crMonthly,
        paymentDay: d.crPayDay, additionalInfo: d.crInfo === "yo'q" ? '' : d.crInfo,
        createdAt: startTs, payments, contractStatus: 'active', customerChatId: null
      });
      await saveState({ step: 'MAIN', history: [], data: {} });
      await sendMessage(chatId, `✅ Shartnoma saqlandi.\nID: ${contractId}`);
    } catch (err) {
      console.error('Kredit shartnoma saqlashda xato:', err);
      await sendMessage(chatId, `❌ Xato: ${err.message}`, stepRows([['✅ Saqlash']]));
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
    await sendMessage(chatId, "✅ Ajoyib! Bajarilganlar ro'yxatiga qo'shildi.");
    return;
  }
  if (data.startsWith('plan_notdone:')) {
    const planId = data.split(':')[1];
    const doc = await db.collection('personal_bot_plans').doc(planId).get();
    if (doc.exists) {
      const newReminderAt = Date.now() + 24 * 60 * 60 * 1000; // ertaga, shu vaqtda
      await doc.ref.update({ status: 'pending', reminderAt: newReminderAt });
      await sendMessage(chatId, `🔁 Xo'p, ertaga yana eslataman: «${escapeHtml(doc.data().text)}»`);
    }
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
      const dateStr = formatTashkent(p.reminderAt);
      text += `${label} «${escapeHtml(p.text)}» — ${dateStr}\n`;
    }
  }
  await sendMessage(chatId, text, stepRows([['➕ Yangi reja']]));
}

// ---------- Sana/vaqt tahlili ----------

function parseUzDateTime(text) {
  const m = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, day, month, year, hour, minute] = m.map(Number);
  const ts = tashkentDateTime(year, month, day, hour, minute);
  if (isNaN(ts)) return null;
  return ts;
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

async function sendCompletedPlans(chatId) {
  const snap = await db.collection('personal_bot_plans').where('status', '==', 'done').get();
  const items = [];
  snap.forEach(doc => items.push(doc.data()));
  items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  let text = "✅ <b>Bajarilgan vazifalar</b>\n\n";
  if (items.length === 0) {
    text += "Hozircha bajarilgan vazifa yo'q.";
  } else {
    for (const p of items.slice(0, 30)) {
      const dateStr = formatTashkent(p.completedAt, false);
      text += `✔️ «${escapeHtml(p.text)}» — ${dateStr}\n`;
    }
  }
  await sendMessage(chatId, text);
}

async function fetchCreditContracts() {
  const snap = await db.collection('credit_contracts').orderBy('createdAt', 'desc').get();
  const contracts = [];
  snap.forEach(doc => contracts.push(doc.data()));
  return contracts;
}

const CREDIT_STATUS_LABELS = { active: '🟢 Faol', completed: '⚪️ Yakunlangan', cancelled: '🔴 Bekor qilingan', overdue: '🟠 Qarzdor' };

async function renderCreditList(chatId) {
  const contracts = await fetchCreditContracts();
  if (contracts.length === 0) {
    await sendMessage(chatId, "Hozircha kredit shartnoma yo'q.");
    return;
  }
  const active = contracts.filter(c => (c.contractStatus || 'active') === 'active');
  const totalMonthly = active.reduce((s, c) => s + (Number(c.monthlyPayment) || 0), 0);

  let text = `💳 <b>Kredit shartnomalar</b>\nJami: ${contracts.length} ta (${active.length} ta faol)\nOylik tushum (faol): ${formatSom(totalMonthly)}\n\n`;
  const shown = contracts.slice(0, 20);
  shown.forEach(c => {
    const statusLabel = CREDIT_STATUS_LABELS[c.contractStatus || 'active'] || c.contractStatus;
    text += `${statusLabel} <b>${escapeHtml(c.customerName)}</b>\n📞 ${escapeHtml(c.number)} — ${formatSom(c.monthlyPayment)}/oy, ${c.totalMonths} oy\n\n`;
  });
  if (contracts.length > shown.length) {
    text += `... va yana ${contracts.length - shown.length} ta. To'liq ro'yxat uchun "📄 Umumiy PDF"ni tanlang.`;
  }
  await sendMessage(chatId, text);
}

async function sendCreditPdf(chatId) {
  const contracts = await fetchCreditContracts();
  const buffer = await buildCreditPdfBuffer(contracts, OWNER_NAME);
  await sendDocument(chatId, buffer, `kredit_shartnomalar_${Date.now()}.pdf`, '📄 Barcha kredit shartnomalar');
}

async function sendPlansPdf(chatId) {
  const now = new Date();
  const t = tashkentToday();
  const dayStart = tashkentDateTime(t.y, t.m, t.d, 0, 0);
  const dayEnd = tashkentDateTime(t.y, t.m, t.d, 23, 59) + 59000;

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
  },
  {
    name: 'set_budget',
    description: "Foydalanuvchi biror toifaga oylik xarajat chegarasi (byudjet) belgilashni so'raganda ishlatiladi. Masalan: 'Ovqatlanishga oyiga 2 million dan oshmasin'.",
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: "Xarajat toifasi: Taksi, Ovqatlanish, Ofis uchun, O'zim uchun, Investitsiya Raqam" },
        monthly_limit: { type: 'number' }
      },
      required: ['category', 'monthly_limit']
    }
  },
  {
    name: 'add_recurring',
    description: "Foydalanuvchi har oy takrorlanadigan xarajat/daromadni (masalan ijara, internet) avtomatik yozib borishni so'raganda ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'number' },
        category: { type: 'string' },
        day_of_month: { type: 'number', description: 'Har oyning nechanchi kunida yozilsin (1-28 oralig\'ida)' },
        description: { type: 'string', description: "Qisqa izoh, masalan 'Ijara'" }
      },
      required: ['type', 'amount', 'category', 'day_of_month', 'description']
    }
  },
  {
    name: 'remove_recurring',
    description: "Foydalanuvchi mavjud doimiy xarajat/daromadni bekor qilishni so'raganda ishlatiladi.",
    input_schema: {
      type: 'object',
      properties: { recurring_id: { type: 'string' } },
      required: ['recurring_id']
    }
  }
];

async function handleFreeTextWithAI(chatId, userText) {
  try {
    const now = new Date();
    const plansSnap = await db.collection('personal_bot_plans').where('status', '==', 'pending').get();
    const plans = [];
    plansSnap.forEach(doc => plans.push({ id: doc.id, text: doc.data().text }));
    plans.splice(50); // AI kontekstiga yuborishdan oldin, cheksiz o'sib ketmasligi uchun chegara

    const since = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    const summary = await computeSummary(since, now.getTime());

    const budgetsSnap = await db.collection('personal_bot_budgets').get();
    const budgets = [];
    budgetsSnap.forEach(doc => budgets.push(`${doc.id}: ${doc.data().limit} so'm/oy`));

    const recurringSnap = await db.collection('personal_bot_recurring').get();
    const recurring = [];
    recurringSnap.forEach(doc => {
      const r = doc.data();
      recurring.push(`[${doc.id}] ${r.description} — ${r.amount} so'm, har oyning ${r.dayOfMonth}-kunida (${r.type})`);
    });

    const tashkentNow = new Date(now.getTime() + TASHKENT_OFFSET_MS);
    const context = `Bugungi sana va vaqt (Toshkent): ${tashkentNow.toISOString().slice(0, 16).replace('T', ' ')}
Foydalanuvchi ismi: ${OWNER_NAME}
Oxirgi 30 kun — Daromad: ${summary.totalIncome} so'm, Xarajat: ${summary.totalExpense} so'm
Toifalar: ${JSON.stringify(summary.byCategory)}
Kutilayotgan rejalar: ${plans.map(p => `[${p.id}] ${p.text}`).join('; ') || "yo'q"}
Byudjet chegaralari: ${budgets.join('; ') || "yo'q"}
Doimiy (takrorlanuvchi) xarajat/daromadlar: ${recurring.join('; ') || "yo'q"}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: `Sen ${OWNER_NAME}ning shaxsiy yordamchisisan. Xabarni tushunib, mos vositani (tool) chaqir. Agar shunchaki savol/suhbat bo'lsa, hech qanday tool chaqirmasdan, JUDA QISQA (maksimal 20 so'z), aniq javob ber — o'zbek tilida, lo'nda.

KATTA VAZIFALAR: agar foydalanuvchi tasvirlagan ish katta/murakkab bo'lib tuyulsa (bir necha kun/hafta talab qiladigan loyiha, masalan "yangi loyiha boshlashim kerak"), DARHOL add_plan chaqirmang — buning o'rniga, oddiy matn bilan so'rang: "Buni kichikroq qadamlarga bo'lib beraymi?" Agar foydalanuvchi KEYINGI xabarida rozi bo'lsa ("ha", "bo'ling" va h.k.), o'sha safar add_plan'ni BIR NECHA MARTA (har bir kichik qadam uchun alohida) chaqiring, mantiqiy ketma-ketlik va oqilona sanalar bilan. Oddiy, kichik vazifalar uchun (masalan "dukonga bor") buni qilmang — to'g'ridan-to'g'ri add_plan chaqiring.`,
        tools: TOOLS,
        messages: [{ role: 'user', content: context + `\n\n${OWNER_NAME} yozdi: "${userText}"` }]
      })
    });
    const data = await res.json();

    if (!data.content) { await sendMessage(chatId, "❗️ Xatolik yuz berdi."); return; }

    const toolUses = data.content.filter(b => b.type === 'tool_use');
    const textBlock = data.content.find(b => b.type === 'text');

    if (toolUses.length > 0) {
      // Bir nechta vosita chaqirilgan bo'lishi mumkin — masalan katta
      // vazifa bir necha kichik rejaga bo'lib qo'shilganda.
      for (const toolUse of toolUses) {
        await executeTool(chatId, toolUse);
      }
    } else if (textBlock) {
      const words = escapeHtml(textBlock.text.trim().split(/\s+/).slice(0, 25).join(' '));
      await sendMessage(chatId, words);
    } else {
      await sendMessage(chatId, "Tushunmadim, qaytadan yozing.");
    }
  } catch (err) {
    console.error('AI erkin matn xatosi:', err);
    await sendMessage(chatId, "❗️ Xatolik yuz berdi, qayta urinib ko'ring.");
  }
}

async function checkBudgetAndWarn(chatId, category) {
  try {
    const budgetDoc = await db.collection('personal_bot_budgets').doc(category).get();
    if (!budgetDoc.exists) return;
    const limit = budgetDoc.data().limit;

    const t = tashkentToday();
    const monthStart = tashkentDateTime(t.y, t.m, 1, 0, 0);
    const snap = await db.collection('personal_bot_tx').where('category', '==', category).get();
    let total = 0;
    snap.forEach(doc => {
      const d = doc.data();
      if (d.type === 'expense' && d.ts >= monthStart) total += d.amount;
    });

    if (total > limit) {
      await sendMessage(chatId, `⚠️ Diqqat! <b>${escapeHtml(category)}</b> byudjetidan oshib ketdingiz: ${formatSom(total)} / ${formatSom(limit)}`);
    } else if (total >= limit * 0.85) {
      await sendMessage(chatId, `⚠️ <b>${escapeHtml(category)}</b> byudjetining 85%i sarflandi: ${formatSom(total)} / ${formatSom(limit)}`);
    }
  } catch (err) {
    console.error('checkBudgetAndWarn xatosi:', err);
  }
}

async function executeTool(chatId, toolUse) {
  const input = toolUse.input || {};

  if (toolUse.name === 'add_plan') {
    const m = (input.reminder_datetime || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!m) { await sendMessage(chatId, "❗️ Vaqtni aniqlay olmadim, qaytadan urining."); return; }
    const [, yr, mo, dy, hr, mi] = m.map(Number);
    const reminderAt = tashkentDateTime(yr, mo, dy, hr, mi);
    if (isNaN(reminderAt)) { await sendMessage(chatId, "❗️ Vaqtni aniqlay olmadim, qaytadan urining."); return; }
    await db.collection('personal_bot_plans').add({
      planType: input.plan_type, text: input.text, reminderAt, status: 'pending', createdAt: Date.now()
    });
    const dateStr = formatTashkent(reminderAt);
    await sendMessage(chatId, `✅ Rejaga qo'shildi: «${escapeHtml(input.text)}» — ${dateStr}`);
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
    if (input.type === 'expense') await checkBudgetAndWarn(chatId, input.category);
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

  if (toolUse.name === 'set_budget') {
    await db.collection('personal_bot_budgets').doc(input.category).set({ category: input.category, limit: input.monthly_limit });
    await sendMessage(chatId, `✅ Byudjet belgilandi: ${escapeHtml(input.category)} — oyiga maksimal ${formatSom(input.monthly_limit)}`);
    return;
  }

  if (toolUse.name === 'add_recurring') {
    const day = Math.min(28, Math.max(1, Math.round(input.day_of_month)));
    await db.collection('personal_bot_recurring').add({
      type: input.type, amount: input.amount, category: input.category,
      dayOfMonth: day, description: input.description, lastRunKey: null, createdAt: Date.now()
    });
    await sendMessage(chatId, `✅ Doimiy ${input.type === 'expense' ? 'xarajat' : 'daromad'} qo'shildi: «${escapeHtml(input.description)}» — ${formatSom(input.amount)}, har oyning ${day}-kunida.`);
    return;
  }

  if (toolUse.name === 'remove_recurring') {
    await db.collection('personal_bot_recurring').doc(input.recurring_id).delete();
    await sendMessage(chatId, "✅ Doimiy yozuv bekor qilindi.");
    return;
  }
}
