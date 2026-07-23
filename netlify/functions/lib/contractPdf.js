// SHARTNOMA PDF QURUVCHISI — bo'lib to'lash (kredit) shartnomasining
// rasmiy matnini va to'lov jadvalini PDF ko'rinishida tayyorlaydi.
// Ham saytdagi "Shartnomani yuklab olish" tugmasi, ham Telegram botga
// yuboriladigan PDF shu bitta modul orqali quriladi — ikkalasi HAR DOIM
// bir xil bo'lishi uchun.

const PDFDocument = require('pdfkit');

const SUPPORT_PHONE = '+998878880101';
const SELLER_NAME = "VIP RAQAMLAR (vipraqamlar.uz)";

function fmtMoney(n){
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}
function fmtDate(ts){
  if(!ts) return '—';
  const d = new Date(ts);
  const pad = x => String(x).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/* Har bir oy uchun 3 ta rasmiy holatdan birini qaytaradi:
   'paid'      — to'landi
   'overdue'   — kechikmoqda (muddati o'tgan, hali to'lanmagan)
   'upcoming'  — muddati kelmagan (hali vaqti bo'lmagan) */
function paymentState(p, now){
  if(p.status === 'paid') return 'paid';
  if(p.dueDate < now) return 'overdue';
  return 'upcoming';
}
const STATE_LABELS = {
  paid: "To'landi",
  overdue: 'Kechikmoqda',
  upcoming: 'Muddati kelmagan'
};

function buildContractPdfBuffer(contract){
  return new Promise((resolve, reject)=>{
    try{
      const doc = new PDFDocument({ size: 'A4', margin: 42 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const now = Date.now();
      const paidCount = (contract.payments || []).filter(p => p.status === 'paid').length;

      // ---- Sarlavha ----
      doc.font('Helvetica-Bold').fontSize(15).text("BO'LIB TO'LASH SHARTIDA RAQAM SOTISH SHARTNOMASI", { align: 'center' });
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(10).fillColor('#555')
        .text(`Shartnoma № ${contract.contractId}          Tuzilgan sana: ${fmtDate(contract.createdAt)}`, { align: 'center' });
      doc.fillColor('#000');
      doc.moveDown(1.2);

      // ---- Tomonlar ----
      doc.font('Helvetica-Bold').fontSize(11).text('1. Shartnoma tomonlari');
      doc.font('Helvetica').fontSize(10).moveDown(0.3);
      doc.text(`Sotuvchi: ${SELLER_NAME}. Bog'lanish uchun: ${SUPPORT_PHONE}.`);
      doc.text(`Xaridor (Mijoz): ${contract.customerName || '—'}, telefon: ${contract.customerPhone || '—'}, manzil: ${contract.region || '—'}.`);
      doc.moveDown(0.8);

      // ---- Shartnoma predmeti ----
      doc.font('Helvetica-Bold').fontSize(11).text('2. Shartnoma predmeti');
      doc.font('Helvetica').fontSize(10).moveDown(0.3);
      doc.text(`Sotuvchi Xaridorga ${contract.number || '—'} raqamli mobil telefon raqamini bo'lib to'lash sharti bilan sotadi. `
        + `Umumiy narx: ${fmtMoney((contract.monthlyPayment || 0) * (contract.totalMonths || 0))}. `
        + `To'lov muddati: ${contract.totalMonths || 0} oy. Oylik to'lov: ${fmtMoney(contract.monthlyPayment)}, har oyning ${contract.paymentDay || 1}-sanasida to'lanadi.`);
      doc.moveDown(0.8);

      // ---- To'lov tartibi (huquqiy shartlar) ----
      doc.font('Helvetica-Bold').fontSize(11).text("3. To'lov tartibi va tomonlarning majburiyatlari");
      doc.font('Helvetica').fontSize(10).moveDown(0.3);
      doc.list([
        `Xaridor har oy, ushbu shartnomada ko'rsatilgan sanada, belgilangan summani to'liq to'lab borishi shart.`,
        `Sotuvchi to'lov qabul qilingandan so'ng, tegishli oy uchun to'lovni "To'landi" deb belgilaydi.`,
        `Agar navbatdagi to'lov muddati o'tgan bo'lsa va hali to'lanmagan bo'lsa, u "Kechikmoqda" holatida hisoblanadi.`,
        `Muhim: agar to'lov muddatidan 30 (o'ttiz) kun va undan ortiq kechiksa, ushbu shartnoma BIR TOMONLAMA TARZDA BEKOR HISOBLANADI. Bunday holatda xaridorga qaytarilgan mablag' va/yoki raqamning o'zi qaytarib berilmaydi.`,
        `Barcha to'lovlar, shartnomada ko'rsatilgan raqam(lar) orqali amalga oshiriladi. Savol va muammolar bo'yicha ${SUPPORT_PHONE} raqamiga murojaat qilinadi.`
      ], { bulletRadius: 2, textIndent: 10, bulletIndent: 0 });
      doc.moveDown(0.8);

      // ---- To'lov jadvali ----
      doc.font('Helvetica-Bold').fontSize(11).text("4. To'lov jadvali");
      doc.moveDown(0.4);

      const tableTop = doc.y;
      const colX = { month: 42, date: 110, amount: 220, status: 350 };
      doc.font('Helvetica-Bold').fontSize(9.5);
      doc.text('Oy', colX.month, tableTop);
      doc.text('To\'lov sanasi', colX.date, tableTop);
      doc.text('Summasi', colX.amount, tableTop);
      doc.text('Holati', colX.status, tableTop);
      doc.moveTo(42, tableTop + 14).lineTo(553, tableTop + 14).strokeColor('#999').stroke();

      let y = tableTop + 20;
      doc.font('Helvetica').fontSize(9.5);
      (contract.payments || []).forEach(p=>{
        if(y > 760){ doc.addPage(); y = 42; }
        const state = paymentState(p, now);
        const color = state === 'paid' ? '#1a8a4c' : (state === 'overdue' ? '#c0392b' : '#555555');
        doc.fillColor('#000').text(`${p.month}-oy`, colX.month, y);
        doc.text(fmtDate(p.dueDate), colX.date, y);
        doc.text(fmtMoney(contract.monthlyPayment), colX.amount, y);
        doc.fillColor(color).text(STATE_LABELS[state], colX.status, y);
        doc.fillColor('#000');
        y += 16;
      });

      doc.y = y + 10;
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(10).text(`Jami to'langan: ${paidCount} / ${contract.totalMonths || 0} oy`);
      doc.moveDown(1.2);

      // ---- Imzo joyi ----
      doc.font('Helvetica-Bold').fontSize(11).text('5. Tomonlarning imzosi');
      doc.font('Helvetica').fontSize(10).moveDown(0.6);
      doc.text('Sotuvchi: _____________________', 42, doc.y, { continued: false });
      doc.text('Xaridor: _____________________', 320, doc.y - doc.currentLineHeight());

      doc.moveDown(2);
      doc.fontSize(8).fillColor('#888')
        .text('Ushbu hujjat vipraqamlar.uz tizimi tomonidan avtomatik shakllantirilgan.', { align: 'center' });

      doc.end();
    }catch(e){
      reject(e);
    }
  });
}

module.exports = { buildContractPdfBuffer, paymentState, STATE_LABELS, fmtMoney, fmtDate };
