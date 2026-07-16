// ADMIN AI YORDAMCHISI — admin panelidagi "AI Yordamchi" chatini boshqaradi.
// Admin tabiiy tilda yozadi, masalan:
//   "oxiri 0009 bilan tugagan raqamlarni ko'rsat"
//   "shularning hammasini o'chir"
//   "+998901234567 raqamini 900000 so'mga qo'sh"
//   "VIP raqamlarni 10% arzonlashtir"
//   "bugun nechta buyurtma tushdi"
//   "saytda jami qancha summalik raqam bor" / "eng qimmat 10 ta raqamni chiqar"
// Claude bu xabarni tushunib, kerakli vositani (tool) chaqiradi, biz esa
// o'sha vositani shu yerda, Firestore ustida bajaramiz.
//
// XAVFSIZLIK:
//  1) Har bir so'rovda Firebase ID token tekshiriladi — faqat tizimga
//     kirgan admin foydalana oladi (frontend firebase.auth().currentUser
//     orqali tokenni oladi va Authorization: Bearer <token> sifatida yuboradi).
//  2) XAVFLI amallar (raqamlarni O'CHIRISH va ko'plab raqamlarning NARXINI
//     birdaniga o'zgartirish) hech qachon avtomatik bajarilmaydi. Claude
//     tegishli vositani chaqirsa, biz DARHOL bajarmaymiz — frontendga
//     "confirm_required" holatini qaytaramiz, admin "Tasdiqlash" tugmasini
//     bosgandan keyingina amal bajariladi.
//  3) Qidirish va statistika so'rovlari (search_numbers, get_numbers_stats,
//     get_order_stats) faqat o'qiydi — xavfsiz, tasdiqsiz ishlaydi.
//     Yangi raqam qo'shish (add_numbers) ham tasdiqsiz ishlaydi, chunki u
//     mavjud ma'lumotni buzmaydi/o'chirmaydi.
//
// Kerakli Environment variables (Netlify Dashboard > Site settings >
// Environment variables bo'limida qo'shing):
//   ANTHROPIC_API_KEY      — https://console.anthropic.com dan olinadi
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//   (bular boshqa funksiyalarda ham ishlatiladi, allaqachon sozlangan bo'lishi kerak)

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

// Anthropic docs'dan eng so'nggi model nomini tekshirib turing:
// https://docs.claude.com/en/docs/about-claude/models
const CLAUDE_MODEL = 'claude-sonnet-5';
const MAX_TOOL_ROUNDS = 6;

// Bu vositalar hech qachon avtomatik bajarilmaydi — frontendda admin
// tasdiqlashi shart.
const DANGEROUS_TOOLS = ['delete_numbers', 'update_numbers_price'];

// admin.html'dagi bilan bir xil operator ro'yxati va kod jadvali
// (index.html / admin.html o'zgarsa, shu yerni ham moslang).
const OPERATORS = ['Beeline', 'Ucell', 'Uzmobile', 'Mobiuz', 'Humans', 'Perfektum'];
const CODE_TO_OPERATOR = {
  '91': 'Beeline', '90': 'Beeline', '92': 'Beeline',
  '33': 'Humans',
  '50': 'Ucell', '94': 'Ucell', '93': 'Ucell',
  '88': 'Mobiuz', '97': 'Mobiuz', '87': 'Mobiuz',
  '77': 'Uzmobile', '70': 'Uzmobile', '95': 'Uzmobile', '99': 'Uzmobile',
  '98': 'Perfektum', '80': 'Perfektum'
};
const ORDER_STATUSES = ['Yangi', "Bog'lanildi", 'Yakunlandi', 'Bekor qilindi'];

const SYSTEM_PROMPT = `Sen RAQAM.UZ saytining admin paneli uchun ichki yordamchisan. Admin senga o'zbek tilida (ba'zan lotin/kirill aralash) buyruq beradi. Sening ixtiyoringda quyidagi vositalar bor:

- search_numbers — raqamlarni filtr bo'yicha qidirish (oxiri/boshi/tarkibi, operator, tag, narx oralig'i)
- delete_numbers — topilgan raqamlarni o'chirish
- add_numbers — yangi raqam(lar) qo'shish
- update_numbers_price — topilgan raqamlarning narxini o'zgartirish (yangi narx yoki foizli chegirma/qimmatlashtirish)
- get_numbers_stats — bazadagi raqamlar bo'yicha umumiy hisobot: jami nechta raqam, umumiy summasi, o'rtacha narxi, operator/tag bo'yicha taqsimot, eng qimmat yoki eng arzon N ta raqam
- get_order_stats — buyurtmalar statistikasi: status bo'yicha son (Yangi/Bog'lanildi/Yakunlandi/Bekor qilindi), berilgan davr (bugun/hafta/oy/hammasi) uchun, xohlasa so'nggi buyurtmalar ro'yxati bilan
- get_credit_info — kredit (bo'lib to'lash) shartnomalari haqida: kimning qarzi (kechikkan to'lovi) borligi, umumiy statistika (jami shartnoma, qarzdorlik summasi, oylik tushum), yoki mijoz ismi/shartnoma ID bo'yicha qidirish

Qoidalar:
1. Qidirish so'ralsa — search_numbers. Natijadagi ID'lar keyingi "o'chir" yoki "narxini o'zgartir" buyrug'ida ishlatiladi. Agar hali hech narsa qidirilmagan bo'lsa, avval search_numbers bilan qidir, keyin natijadagi ID'lar bilan kerakli vositani chaqir.
2. "Hammasini/shularni o'chir" — delete_numbers.
3. "Narxini X qil / X foizga arzonlashtir/qimmatlashtir" — update_numbers_price. Foizli o'zgarish uchun percentChange (masalan -10 = 10% arzonlashtirish, +15 = 15% qimmatlashtirish), aniq narx uchun price maydonidan foydalan.
4. Yangi raqam qo'shish — add_numbers. Narxi aytilmagan bo'lsa, vosita chaqirmasdan avval narxini so'ra.
5. "Jami qancha summalik raqam bor", "eng qimmat/arzon N ta raqam", "operator bo'yicha nechtadan raqam bor" kabi savollar — get_numbers_stats.
6. "Nechta buyurtma bor/tushdi", "bugungi/shu haftadagi/shu oydagi buyurtmalar", "yangi buyurtmalar qanaqa" kabi savollar — get_order_stats.
7. "Kimning qarzi bor", "qarzdorlar kim", "kredit bo'yicha kim to'lamayapti" kabi savollar — get_credit_info, onlyDebtors:true bilan chaqir. "Kredit bo'limida nima bor", "jami qancha kredit shartnomasi bor", "oylik tushum qancha" kabi umumiy savollar — get_credit_info, filtrsiz yoki mos filtr bilan chaqir. Aniq mijoz haqida so'ralsa — customerName yoki contractId bilan qidir.
8. Har bir javobing qisqa, aniq va o'zbek tilida bo'lsin, summalarni "so'm" bilan o'qilishi qulay tarzda yoz (masalan 1 250 000 so'm).
9. delete_numbers yoki update_numbers_price chaqirilgandan keyin, tizim buni avtomatik ravishda adminga tasdiqlash uchun ko'rsatadi — sen bu haqda alohida ogohlantirish yozishing shart emas, shunchaki vositani chaqir.
10. Agar so'rov noaniq bo'lsa (masalan qaysi raqamlar yoki qanday narx nazarda tutilgani aniq bo'lmasa), vosita chaqirmasdan aniqlashtiruvchi savol ber.`;

const TOOLS = [
  {
    name: 'search_numbers',
    description:
      "Bazadagi telefon raqamlarini filtrlar bo'yicha qidiradi. Natijada topilgan raqamlar ro'yxati (id, number, operator, price, tag) va jami nechta mos kelgani qaytadi. Keyingi xabarda admin \"hammasini o'chir\" yoki \"narxini o'zgartir\" desa, aynan shu natijadagi ID'lardan foydalaniladi.",
    input_schema: {
      type: 'object',
      properties: {
        suffix: { type: 'string', description: "Raqam shu ketma-ketlik bilan TUGASHI kerak, masalan '0009'" },
        prefix: { type: 'string', description: "Raqam shu ketma-ketlik bilan BOSHLANISHI kerak (operator kodi bilan birga), masalan '99890' yoki '90'" },
        contains: { type: 'string', description: "Raqam ICHIDA shu ketma-ketlik uchrashi kerak" },
        operator: { type: 'string', enum: OPERATORS },
        tag: { type: 'string', enum: ['oddiy', 'vip'] },
        minPrice: { type: 'number' },
        maxPrice: { type: 'number' },
        limit: { type: 'number', description: "Qaytariladigan natijalar soni (standart 200, maksimal 500)" }
      }
    }
  },
  {
    name: 'delete_numbers',
    description:
      "Berilgan ID'lar bo'yicha raqamlarni bazadan BUTUNLAY o'chiradi. Faqat search_numbers orqali topilgan haqiqiy ID'larni bering.",
    input_schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: "O'chiriladigan raqamlarning Firestore hujjat ID'lari" }
      },
      required: ['ids']
    }
  },
  {
    name: 'add_numbers',
    description: "Yangi raqam(lar)ni bazaga qo'shadi.",
    input_schema: {
      type: 'object',
      properties: {
        numbers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              number: { type: 'string', description: "Masalan '+998901234567' yoki '998901234567'" },
              operator: { type: 'string', enum: OPERATORS, description: "Berilmasa, raqam kodidan avtomatik aniqlanadi" },
              price: { type: 'number' },
              oldPrice: { type: 'number', description: 'Aksiya bo\'lsa eski narx' },
              tag: { type: 'string', enum: ['oddiy', 'vip'] },
              installment: { type: 'boolean' },
              featured: { type: 'boolean' },
              dailyDeal: { type: 'boolean' }
            },
            required: ['number', 'price']
          }
        }
      },
      required: ['numbers']
    }
  },
  {
    name: 'update_numbers_price',
    description:
      "Berilgan ID'lar bo'yicha raqamlarning narxini o'zgartiradi. price berilsa — barcha tanlangan raqamlarga aynan shu narx qo'yiladi. percentChange berilsa — har bir raqamning JORIY narxi shu foizga o'zgaradi (masalan -10 = 10% arzonlashtirish, +20 = 20% qimmatlashtirish). Ikkalasidan faqat bittasini bering.",
    input_schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: "Narxi o'zgaradigan raqamlarning Firestore ID'lari" },
        price: { type: 'number', description: "Barcha tanlangan raqamlar uchun yagona yangi narx" },
        percentChange: { type: 'number', description: "Har bir raqam uchun joriy narxga nisbatan foizli o'zgarish, masalan -10 yoki 15" }
      },
      required: ['ids']
    }
  },
  {
    name: 'get_numbers_stats',
    description:
      "Bazadagi raqamlar bo'yicha umumiy hisobot qaytaradi: jami nechta raqam, ularning umumiy summasi (so'm), o'rtacha narxi, operator va tag (oddiy/vip) bo'yicha taqsimot. Xohlasa eng qimmat yoki eng arzon N ta raqamni ham qaytaradi. Filtrlar berilsa, hisobot faqat o'sha qismga chiqadi.",
    input_schema: {
      type: 'object',
      properties: {
        operator: { type: 'string', enum: OPERATORS },
        tag: { type: 'string', enum: ['oddiy', 'vip'] },
        minPrice: { type: 'number' },
        maxPrice: { type: 'number' },
        topExpensive: { type: 'number', description: "Eng qimmat N ta raqamni qaytarish" },
        topCheapest: { type: 'number', description: "Eng arzon N ta raqamni qaytarish" }
      }
    }
  },
  {
    name: 'get_order_stats',
    description:
      "Buyurtmalar statistikasini qaytaradi: berilgan davr (bugun/hafta/oy/hammasi) va (ixtiyoriy) status bo'yicha nechta buyurtma borligi, hamda status bo'yicha to'liq taqsimot. Xohlasa so'nggi buyurtmalar ro'yxatini ham (mijoz, raqam, narx, status) qaytaradi.",
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ORDER_STATUSES, description: "Faqat shu statusdagi buyurtmalarni hisoblash" },
        period: { type: 'string', enum: ['today', 'week', 'month', 'all'], description: "Davr filtri, standart 'all'" },
        listLimit: { type: 'number', description: "So'nggi buyurtmalar ro'yxatidan nechtasini qaytarish (0 bo'lsa, faqat sonlar qaytadi)" }
      }
    }
  },
  {
    name: 'get_credit_info',
    description:
      "Kredit (bo'lib to'lash) shartnomalari haqida ma'lumot beradi: kimning qarzi (kechikkan/muddati o'tgan to'lovi) borligini, umumiy statistikani (jami shartnomalar, umumiy qarzdorlik summasi, oylik tushum), yoki mijoz ismi/shartnoma ID bo'yicha aniq shartnomani qidiradi. \"Kimning qarzi bor\", \"qarzdorlar kim\" kabi savollar uchun onlyDebtors:true bilan chaqir.",
    input_schema: {
      type: 'object',
      properties: {
        onlyDebtors: { type: 'boolean', description: "true bo'lsa, faqat kechikkan to'lovi bor (qarzdor) mijozlarni qaytaradi" },
        customerName: { type: 'string', description: "Mijoz ismi bo'yicha qidirish" },
        contractId: { type: 'string', description: "Shartnoma ID (masalan KR001) bo'yicha qidirish" },
        contractStatus: { type: 'string', enum: ['active', 'trouble', 'cancelling', 'cancelled', 'completed'] }
      }
    }
  }
];

function normalizeNumber(raw) {
  let num = String(raw || '').trim();
  if (!num) return '';
  if (!num.startsWith('+')) num = '+' + num.replace(/\D/g, '');
  return num;
}

async function getFilteredNumbers(input) {
  const snap = await db.collection('numbers').get();
  let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (input.suffix) {
    const s = String(input.suffix).replace(/\D/g, '');
    if (s) items = items.filter(it => (it.number || '').replace(/\D/g, '').endsWith(s));
  }
  if (input.prefix) {
    const p = String(input.prefix).replace(/\D/g, '');
    if (p) items = items.filter(it => (it.number || '').replace(/\D/g, '').includes(p));
  }
  if (input.contains) {
    const c = String(input.contains).replace(/\D/g, '');
    if (c) items = items.filter(it => (it.number || '').replace(/\D/g, '').includes(c));
  }
  if (input.operator) items = items.filter(it => it.operator === input.operator);
  if (input.tag) items = items.filter(it => it.tag === input.tag);
  if (typeof input.minPrice === 'number') items = items.filter(it => (it.price || 0) >= input.minPrice);
  if (typeof input.maxPrice === 'number') items = items.filter(it => (it.price || 0) <= input.maxPrice);
  return items;
}

async function execSearch(input) {
  const items = await getFilteredNumbers(input);
  const total = items.length;
  const limit = Math.min(input.limit || 200, 500);
  const shown = items.slice(0, limit).map(it => ({ id: it.id, number: it.number, operator: it.operator, price: it.price, tag: it.tag }));
  return { total, returned: shown.length, items: shown };
}

async function execAdd(input) {
  const results = [];
  for (const n of (input.numbers || [])) {
    const num = normalizeNumber(n.number);
    if (!num) { results.push({ ok: false, error: "Raqam bo'sh yoki noto'g'ri", input: n }); continue; }
    const rawDigits = num.replace(/\D/g, '').slice(-9);
    const code = rawDigits.slice(0, 2);
    const doc = {
      number: num,
      operator: OPERATORS.includes(n.operator) ? n.operator : (CODE_TO_OPERATOR[code] || 'Beeline'),
      price: Number(n.price) || 0,
      oldPrice: Number(n.oldPrice) || 0,
      onSale: (Number(n.oldPrice) || 0) > (Number(n.price) || 0),
      installment: !!n.installment,
      featured: !!n.featured,
      dailyDeal: !!n.dailyDeal,
      tag: n.tag === 'vip' ? 'vip' : 'oddiy',
      last1: rawDigits.slice(-1), last2: rawDigits.slice(-2), last3: rawDigits.slice(-3), last4: rawDigits.slice(-4),
      addedAt: Date.now(),
      randomKey: Math.random()
    };
    try {
      const ref = await db.collection('numbers').add(doc);
      results.push({ ok: true, id: ref.id, number: num });
    } catch (err) {
      results.push({ ok: false, error: err.message, input: n });
    }
  }
  return { added: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length, results };
}

async function execDelete(ids) {
  const validIds = (ids || []).filter(Boolean);
  let deleted = 0;
  for (let i = 0; i < validIds.length; i += 400) {
    const chunk = validIds.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach(id => batch.delete(db.collection('numbers').doc(id)));
    await batch.commit();
    deleted += chunk.length;
  }
  return { deleted };
}

// Narx o'zgarishini HISOBLAYDI (bazaga yozmasdan) — tasdiqlash oynasida
// ko'rsatish uchun ham, haqiqiy yozish uchun ham shu funksiya ishlatiladi.
async function computePriceUpdates(input) {
  const ids = (input.ids || []).filter(Boolean);
  const docs = await Promise.all(ids.map(id => db.collection('numbers').doc(id).get()));
  return docs.filter(d => d.exists).map(d => {
    const data = d.data();
    const oldPrice = Number(data.price) || 0;
    let newPrice;
    if (typeof input.price === 'number') {
      newPrice = Math.round(input.price);
    } else if (typeof input.percentChange === 'number') {
      newPrice = Math.round(oldPrice * (1 + input.percentChange / 100));
    } else {
      newPrice = oldPrice;
    }
    return { id: d.id, number: data.number, oldPrice, newPrice: Math.max(0, newPrice) };
  });
}

async function execUpdatePrice(input) {
  const updates = await computePriceUpdates(input);
  let updated = 0;
  for (const u of updates) {
    await db.collection('numbers').doc(u.id).update({ price: u.newPrice });
    updated++;
  }
  return { updated, updates };
}

async function execNumbersStats(input) {
  const items = await getFilteredNumbers(input);
  const count = items.length;
  const totalValue = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
  const avgPrice = count ? Math.round(totalValue / count) : 0;

  const byOperator = {};
  const byTag = {};
  items.forEach(it => {
    const op = it.operator || "Noma'lum";
    const tg = it.tag === 'vip' ? 'vip' : 'oddiy';
    byOperator[op] = byOperator[op] || { count: 0, totalValue: 0 };
    byOperator[op].count++;
    byOperator[op].totalValue += Number(it.price) || 0;
    byTag[tg] = (byTag[tg] || 0) + 1;
  });

  const result = { count, totalValue, avgPrice, byOperator, byTag };

  if (input.topExpensive) {
    result.topExpensiveItems = [...items]
      .sort((a, b) => (b.price || 0) - (a.price || 0))
      .slice(0, Math.min(input.topExpensive, 50))
      .map(it => ({ id: it.id, number: it.number, operator: it.operator, price: it.price, tag: it.tag }));
  }
  if (input.topCheapest) {
    result.topCheapestItems = [...items]
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .slice(0, Math.min(input.topCheapest, 50))
      .map(it => ({ id: it.id, number: it.number, operator: it.operator, price: it.price, tag: it.tag }));
  }
  return result;
}

function periodCutoff(period) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (period === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === 'week') return now - 7 * day;
  if (period === 'month') return now - 30 * day;
  return 0; // 'all'
}

async function execOrderStats(input) {
  const snap = await db.collection('orders').get();
  const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const cutoff = periodCutoff(input.period);
  const inPeriod = cutoff ? all.filter(o => (o.createdAtSort || 0) >= cutoff) : all;

  const byStatus = {};
  ORDER_STATUSES.forEach(s => { byStatus[s] = 0; });
  inPeriod.forEach(o => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

  const matching = input.status ? inPeriod.filter(o => o.status === input.status) : inPeriod;
  const totalValue = matching.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

  const result = {
    period: input.period || 'all',
    totalMatching: matching.length,
    totalValue,
    byStatus
  };

  const listLimit = Math.min(input.listLimit || 0, 50);
  if (listLimit > 0) {
    result.recent = [...matching]
      .sort((a, b) => (b.createdAtSort || 0) - (a.createdAtSort || 0))
      .slice(0, listLimit)
      .map(o => ({ id: o.id, number: o.number, name: o.name, price: o.price, status: o.status, createdAt: o.createdAt }));
  }
  return result;
}

async function execCreditInfo(input) {
  const snap = await db.collection('credit_contracts').get();
  let items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (input.customerName) {
    const q = String(input.customerName).toLowerCase();
    items = items.filter(d => (d.customerName || '').toLowerCase().includes(q));
  }
  if (input.contractId) {
    const q = String(input.contractId).toLowerCase();
    items = items.filter(d => (d.contractId || '').toLowerCase().includes(q));
  }
  if (input.contractStatus) {
    items = items.filter(d => (d.contractStatus || 'active') === input.contractStatus);
  }

  const now = Date.now();
  const enriched = items.map(d => {
    const payments = Array.isArray(d.payments) ? d.payments : [];
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const overdueCount = payments.filter(p => p.status !== 'paid' && (p.dueDate || 0) < now).length;
    return {
      contractId: d.contractId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      number: d.number,
      totalMonths: d.totalMonths,
      monthlyPayment: d.monthlyPayment,
      paidCount,
      overdueCount,
      overdueAmount: overdueCount * (Number(d.monthlyPayment) || 0),
      contractStatus: d.contractStatus || 'active'
    };
  });

  const totalOverdueAmount = enriched.reduce((sum, d) => sum + d.overdueAmount, 0);
  const totalMonthlyIncome = enriched
    .filter(d => d.contractStatus === 'active')
    .reduce((sum, d) => sum + (Number(d.monthlyPayment) || 0), 0);

  const result = input.onlyDebtors ? enriched.filter(d => d.overdueCount > 0) : enriched;

  return {
    totalContracts: enriched.length,
    matchingCount: result.length,
    totalOverdueAmount,
    totalMonthlyIncome,
    contracts: result.slice(0, 50).map(d => ({
      contractId: d.contractId,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      number: d.number,
      progress: `${d.paidCount}/${d.totalMonths}`,
      overdueCount: d.overdueCount,
      overdueAmount: d.overdueAmount,
      status: d.contractStatus
    }))
  };
}

async function callClaude(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Claude API xatosi');
  return data;
}

// Xavfli vosita chaqirilganda, admin uchun tasdiqlash oynasida ko'rsatiladigan
// qisqa preview (nima o'zgarishini) tayyorlaydi.
async function buildConfirmationPreview(toolUse) {
  if (toolUse.name === 'delete_numbers') {
    const ids = toolUse.input.ids || [];
    const details = ids.length
      ? await Promise.all(ids.map(async id => {
          const doc = await db.collection('numbers').doc(id).get();
          return doc.exists ? { id, number: doc.data().number, price: doc.data().price } : { id, number: '(topilmadi)' };
        }))
      : [];
    return { summary: `${details.length} ta raqamni BUTUNLAY o'chirishni tasdiqlaysizmi?`, details };
  }
  if (toolUse.name === 'update_numbers_price') {
    const updates = await computePriceUpdates(toolUse.input || {});
    return {
      summary: `${updates.length} ta raqamning narxini o'zgartirishni tasdiqlaysizmi?`,
      details: updates.map(u => ({ id: u.id, number: u.number, oldPrice: u.oldPrice, price: u.newPrice }))
    };
  }
  return { summary: 'Amalni tasdiqlaysizmi?', details: [] };
}

async function executeConfirmedTool(toolName, toolInput) {
  if (toolName === 'delete_numbers') return execDelete(toolInput.ids || []);
  if (toolName === 'update_numbers_price') return execUpdatePrice(toolInput || {});
  return { error: "Noma'lum vosita: " + toolName };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY sozlanmagan (Netlify environment variables bo\'limida qo\'shing).' }) };
  }

  // --- Autentifikatsiya: faqat tizimga kirgan admin foydalana oladi ---
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const idToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!idToken) throw new Error('Token yo\'q');
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Ruxsat yo\'q. Iltimos, qaytadan tizimga kiring.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let messages = Array.isArray(body.messages) ? body.messages : [];

    if (body.userMessage) {
      messages = [...messages, { role: 'user', content: body.userMessage }];
    }

    // Admin oldin taklif qilingan xavfli amalni (o'chirish / narx o'zgartirish)
    // tasdiqladi yoki bekor qildi.
    if (body.decision && body.pendingToolUseId && body.pendingToolName) {
      const toolResultContent = body.decision === 'confirm'
        ? JSON.stringify(await executeConfirmedTool(body.pendingToolName, body.pendingToolInput || {}))
        : JSON.stringify({ cancelled: true, note: 'Admin amalni bekor qildi.' });

      messages = [...messages, {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: body.pendingToolUseId, content: toolResultContent }]
      }];
    }

    // Joriy so'rov davomida topilgan qidiruv/statistika natijalari — frontendda
    // chiroyli ro'yxat qilib ko'rsatish uchun.
    let resultsList = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const data = await callClaude(messages);
      const assistantContent = data.content || [];
      messages = [...messages, { role: 'assistant', content: assistantContent }];

      const toolUse = assistantContent.find(b => b.type === 'tool_use');
      if (!toolUse) {
        const text = assistantContent.filter(b => b.type === 'text').map(b => b.text).join('\n');
        return { statusCode: 200, body: JSON.stringify({ status: 'done', reply: text, messages, resultsList }) };
      }

      if (DANGEROUS_TOOLS.includes(toolUse.name)) {
        const preview = await buildConfirmationPreview(toolUse);
        return {
          statusCode: 200,
          body: JSON.stringify({
            status: 'confirm_required',
            action: toolUse.name,
            toolUseId: toolUse.id,
            toolInput: toolUse.input,
            summary: preview.summary,
            details: preview.details,
            messages
          })
        };
      }

      let toolResult;
      try {
        if (toolUse.name === 'search_numbers') {
          toolResult = await execSearch(toolUse.input || {});
          resultsList = { title: 'Qidiruv natijasi', total: toolResult.total, items: toolResult.items.map(it => ({ number: it.number, price: it.price, label: it.tag === 'vip' ? 'VIP' : '' })) };
        } else if (toolUse.name === 'add_numbers') {
          toolResult = await execAdd(toolUse.input || {});
        } else if (toolUse.name === 'get_numbers_stats') {
          toolResult = await execNumbersStats(toolUse.input || {});
          const topList = toolResult.topExpensiveItems || toolResult.topCheapestItems;
          if (topList) {
            resultsList = {
              title: toolResult.topExpensiveItems ? 'Eng qimmat raqamlar' : 'Eng arzon raqamlar',
              total: topList.length,
              items: topList.map(it => ({ number: it.number, price: it.price, label: it.tag === 'vip' ? 'VIP' : '' }))
            };
          }
        } else if (toolUse.name === 'get_order_stats') {
          toolResult = await execOrderStats(toolUse.input || {});
          if (toolResult.recent && toolResult.recent.length) {
            resultsList = {
              title: "So'nggi buyurtmalar",
              total: toolResult.recent.length,
              items: toolResult.recent.map(o => ({ number: o.number, price: o.price, label: o.status }))
            };
          }
        } else if (toolUse.name === 'get_credit_info') {
          toolResult = await execCreditInfo(toolUse.input || {});
          if (toolResult.contracts && toolResult.contracts.length) {
            resultsList = {
              title: toolUse.input && toolUse.input.onlyDebtors ? 'Qarzdor mijozlar' : 'Kredit shartnomalari',
              total: toolResult.contracts.length,
              items: toolResult.contracts.map(c => ({
                number: `${c.customerName} (${c.contractId})`,
                price: c.overdueAmount || 0,
                label: c.overdueCount > 0 ? `${c.overdueCount} oy qarzdor` : c.progress
              }))
            };
          }
        } else {
          toolResult = { error: "Noma'lum vosita: " + toolUse.name };
        }
      } catch (err) {
        toolResult = { error: err.message };
      }

      messages = [...messages, {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(toolResult) }]
      }];
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'done', reply: "Kechirasiz, so'rov juda murakkab bo'lib ketdi. Iltimos, qayta va aniqroq so'rang.", messages })
    };
  } catch (err) {
    console.error('ADMIN-AI-ASSISTANT XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
