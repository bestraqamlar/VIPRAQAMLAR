// EXCEL HISOBOTNI HOZIROQ YUBORISH (admin panelidagi tugma orqali)
// ---------------------------------------------------------------------------
// Bu fayl hisobotning ASOSIY mantig'ini o'z ichiga oladi:
//   - "Kreditlar" varag'i (barcha shartnomalar)
//   - "Raqamlar bazasi" varag'i (bazadagi BARCHA raqamlar, narxi bilan)
//   - Har bir shartnoma uchun alohida varaq (KR001, KR002, ...)
// credit-excel-report.js (kunlik avtomatik) ham aynan shu mantiqni chaqiradi.

const admin = require('firebase-admin');
const ExcelJS = require('exceljs');

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

const STATUS_LABELS = {
  active:    "To'lov muvaffaqiyatli bajarilmoqda",
  trouble:   "To'lov uzilishlari ko'p",
  cancelling:"Shartnoma bekor qilish jarayonida",
  cancelled: "Shartnoma bekor bo'ldi",
  completed: "Shartnoma muvaffaqiyatli yakunlandi"
};

const GREEN = 'FF33E28C';
const RED   = 'FFFF5C5C';
const GREY  = 'FFE8ECF2';
const NAVY  = 'FF1D4ED8';
const WHITE = 'FFFFFFFF';
const DARK  = 'FF0B1220';

function fmtDate(ts){
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
}

function styleHeader(row){
  row.font = { bold: true, color: { argb: WHITE } };
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  });
  row.height = 20;
}

async function buildAndSendReport(){
  const now = Date.now();

  /* ---- Ma'lumotlarni o'qish ---- */
  const contractsSnap = await db.collection('credit_contracts').orderBy('createdAt', 'desc').get();
  const contracts = contractsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const numbersSnap = await db.collection('numbers').get();
  const numbers = numbersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  numbers.sort((a, b) => {
    const opCmp = String(a.operator || '').localeCompare(String(b.operator || ''));
    if(opCmp !== 0) return opCmp;
    return (b.price || 0) - (a.price || 0);
  });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId){
    throw new Error("TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan");
  }

  if(contracts.length === 0 && numbers.length === 0){
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: "📊 Hisobot: baza hozircha bo'sh (na shartnoma, na raqam yo'q)." })
    });
    return { contracts: 0, numbers: 0 };
  }

  const wb = new ExcelJS.Workbook();

  /* ---------- 1-varaq: Kreditlar (umumiy jadval) ---------- */
  if(contracts.length > 0){
    const ws = wb.addWorksheet('Kreditlar');
    ws.columns = [
      { header: 'ID',              key: 'id',      width: 9  },
      { header: 'Ism',             key: 'name',    width: 24 },
      { header: 'Telefon',         key: 'phone',   width: 19 },
      { header: 'Manzil',          key: 'region',  width: 17 },
      { header: 'Raqam',           key: 'number',  width: 20 },
      { header: 'Muddat (oy)',     key: 'months',  width: 12 },
      { header: "Oylik to'lov",    key: 'monthly', width: 14 },
      { header: "To'landi",        key: 'paid',    width: 10 },
      { header: 'Qoldi',           key: 'left',    width: 9  },
      { header: "Kechikkan to'lov",key: 'overdue', width: 16 },
      { header: 'Holat',           key: 'status',  width: 34 },
      { header: "Keyingi to'lov",  key: 'next',    width: 14 }
    ];
    styleHeader(ws.getRow(1));

    for(const c of contracts){
      const paid = c.payments.filter(p => p.status === 'paid').length;
      const overdueCount = c.payments.filter(p => p.status === 'pending' && p.dueDate < now).length;
      const nextPending = c.payments.find(p => p.status === 'pending');
      const row = ws.addRow({
        id: c.contractId,
        name: c.customerName,
        phone: c.customerPhone,
        region: c.region,
        number: c.number,
        months: c.totalMonths,
        monthly: c.monthlyPayment,
        paid: paid,
        left: c.totalMonths - paid,
        overdue: overdueCount > 0 ? overdueCount + ' ta' : "yo'q",
        status: STATUS_LABELS[c.contractStatus || 'active'],
        next: nextPending ? fmtDate(nextPending.dueDate) : '—'
      });
      row.getCell('monthly').numFmt = '#,##0';
      if(overdueCount > 0){
        row.getCell('overdue').fill = { type:'pattern', pattern:'solid', fgColor:{ argb: RED } };
        row.getCell('overdue').font = { bold: true, color: { argb: WHITE } };
      }
    }
  }

  /* ---------- 2-varaq: Raqamlar bazasi (to'liq, narxi bilan) ---------- */
  if(numbers.length > 0){
    const ns = wb.addWorksheet('Raqamlar bazasi');
    ns.columns = [
      { header: '№',            key: 'idx',      width: 6  },
      { header: 'Raqam',        key: 'number',   width: 20 },
      { header: 'Operator',     key: 'operator', width: 12 },
      { header: 'Narxi',        key: 'price',    width: 13 },
      { header: 'Eski narx',    key: 'oldPrice', width: 13 },
      { header: 'Teg',          key: 'tag',      width: 9  },
      { header: 'Mashhur',      key: 'featured', width: 10 },
      { header: 'Aksiyada',     key: 'onSale',   width: 10 },
      { header: 'Holati',       key: 'reserved', width: 10 },
      { header: "Qo'shilgan",   key: 'added',    width: 13 }
    ];
    styleHeader(ns.getRow(1));

    numbers.forEach((n, i) => {
      const row = ns.addRow({
        idx: i + 1,
        number: n.number || '',
        operator: n.operator || '',
        price: n.price || 0,
        oldPrice: n.oldPrice || 0,
        tag: (n.tag === 'vip') ? 'VIP' : 'Oddiy',
        featured: n.featured ? 'Ha' : '—',
        onSale: n.onSale ? 'Ha' : '—',
        reserved: n.reserved ? 'Band' : "Bo'sh",
        added: n.addedAt ? fmtDate(n.addedAt) : ''
      });
      row.getCell('price').numFmt = '#,##0';
      row.getCell('oldPrice').numFmt = '#,##0';
      if(n.reserved){
        row.getCell('reserved').fill = { type:'pattern', pattern:'solid', fgColor:{ argb: RED } };
        row.getCell('reserved').font = { bold: true, color: { argb: WHITE } };
      }
      if(n.tag === 'vip'){
        row.getCell('tag').font = { bold: true };
      }
    });
  }

  /* ---------- Har bir mijoz uchun alohida varaq ---------- */
  for(const c of contracts){
    const s = wb.addWorksheet(c.contractId);
    s.getColumn(1).width = 18;
    s.getColumn(2).width = 26;
    s.getColumn(3).width = 18;
    s.getColumn(4).width = 16;

    const info = [
      ['Shartnoma ID', c.contractId],
      ['Mijoz', c.customerName],
      ['Telefon', c.customerPhone],
      ['Manzil', c.region],
      ['Kreditga olingan raqam', c.number],
      ['Muddat', c.totalMonths + ' oy'],
      ["Oylik to'lov", (c.monthlyPayment || 0).toLocaleString('ru-RU') + " so'm"],
      ["To'lov kuni", "har oyning " + c.paymentDay + "-sanasida"],
      ['Holat', STATUS_LABELS[c.contractStatus || 'active']],
      ["Qo'shimcha", c.additionalInfo || '—']
    ];
    info.forEach(pair => {
      const r = s.addRow(pair);
      r.getCell(1).font = { bold: true };
    });

    s.addRow([]);
    const th = s.addRow(['Oy', "To'lov sanasi", 'Holat', "To'langan sana"]);
    styleHeader(th);

    for(const p of c.payments){
      const isOverdue = p.status === 'pending' && p.dueDate < now;
      const statusText = p.status === 'paid' ? "To'landi ✓" : (isOverdue ? 'KECHIKMOQDA ⚠' : 'Kutilmoqda');
      const r = s.addRow([
        p.month + '-oy',
        fmtDate(p.dueDate),
        statusText,
        p.paidAt ? fmtDate(p.paidAt) : ''
      ]);
      const cell = r.getCell(3);
      if(p.status === 'paid'){
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: GREEN } };
        cell.font = { bold: true, color: { argb: DARK } };
      }else if(isOverdue){
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: RED } };
        cell.font = { bold: true, color: { argb: WHITE } };
      }else{
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: GREY } };
        cell.font = { color: { argb: DARK } };
      }
    }
  }

  /* ---------- Telegram'ga yuborish ---------- */
  const buffer = await wb.xlsx.writeBuffer();
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
  const fileDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('caption',
    `📊 Hisobot — ${dateStr}\n\n💳 Kredit shartnomalari: ${contracts.length} ta\n📱 Bazadagi raqamlar: ${numbers.length} ta`);
  form.append('document', new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }), `hisobot-${fileDate}.xlsx`);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: form
  });
  const data = await res.json();
  if(!data.ok){
    throw new Error('Telegram sendDocument xatosi: ' + JSON.stringify(data));
  }

  return { contracts: contracts.length, numbers: numbers.length };
}

async function handler(event){
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try{
    const result = await buildAndSendReport();
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  }catch(err){
    console.error('SEND-EXCEL-NOW XATOSI:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
}

module.exports = { handler, buildAndSendReport };
