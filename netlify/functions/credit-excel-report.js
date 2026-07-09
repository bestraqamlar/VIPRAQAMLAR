// HAR KUNI AVTOMATIK — kredit shartnomalarini chiroyli Excel faylga yig'ib,
// admin Telegram botiga yuboradi.
// Tuzilishi: 1-varaq "Umumiy" (barcha mijozlar jadvali) + har bir mijoz uchun
// alohida varaq (KR001, KR002, ...) — oyma-oy to'lov holati rangli ko'rinishda.

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

exports.handler = async function () {
  try{
    const snap = await db.collection('credit_contracts').orderBy('createdAt', 'desc').get();
    if(snap.empty){
      return { statusCode: 200, body: 'shartnoma yo\'q' };
    }
    const contracts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const now = Date.now();

    const wb = new ExcelJS.Workbook();

    /* ---------- 1-varaq: Umumiy jadval ---------- */
    const ws = wb.addWorksheet('Umumiy');
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
    const headRow = ws.getRow(1);
    headRow.font = { bold: true, color: { argb: WHITE } };
    headRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    headRow.height = 20;

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
        ["Oylik to'lov", c.monthlyPayment.toLocaleString('ru-RU') + " so'm"],
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
      th.font = { bold: true, color: { argb: WHITE } };
      th.eachCell(cell => {
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: NAVY } };
      });

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
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if(!token || !chatId){
      return { statusCode: 500, body: 'TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID yo\'q' };
    }

    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`;
    const fileDate = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', `📊 Kredit shartnomalari hisoboti — ${dateStr}\n\nJami: ${contracts.length} ta shartnoma`);
    form.append('document', new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }), `kreditlar-${fileDate}.xlsx`);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    if(!data.ok){
      console.error('Telegram sendDocument xatosi:', JSON.stringify(data));
      return { statusCode: 500, body: 'telegram xatosi' };
    }

    return { statusCode: 200, body: 'ok' };
  }catch(err){
    console.error('CREDIT-EXCEL-REPORT XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
