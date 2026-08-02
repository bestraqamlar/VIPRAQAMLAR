// SHAXSIY BOT UCHUN PDF QURUVCHISI — rejalar va statistikani chiroyli,
// tartibli jadval (va statistikada oddiy diagramma) ko'rinishida tayyorlaydi.

const PDFDocument = require('pdfkit');

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}
function fmtDateTime(ts) {
  const d = new Date(ts);
  const p = x => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ---------------- REJALAR PDF ----------------
// todayPlans — bugunga tegishli rejalar, allPlans — barcha kutilayotgan rejalar
function buildPlansPdfBuffer(todayPlans, allPlans, ownerName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 42 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(17).fillColor('#1a1a1a')
        .text(`${ownerName || ''} — Bugungi rejalarim`.trim(), { align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#666')
        .text(fmtDateTime(Date.now()), { align: 'center' });
      doc.moveDown(1.2);

      drawPlanTable(doc, todayPlans, '📅 Bugungi rejalar');
      doc.moveDown(1);

      drawPlanTable(doc, allPlans, '📋 Umumiy rejalarim (barcha kutilayotgan)');

      doc.end();
    } catch (err) { reject(err); }
  });
}

function drawPlanTable(doc, plans, title) {
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#173ea6').text(title);
  doc.moveDown(0.4);

  if (!plans || plans.length === 0) {
    doc.font('Helvetica').fontSize(10).fillColor('#888').text('Reja topilmadi.');
    doc.fillColor('#000');
    return;
  }

  const startX = doc.x, colType = 46, colDate = 110, colText = 340;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff');
  doc.rect(startX, doc.y, colType + colDate + colText, 20).fill('#173ea6');
  const headerY = doc.y - 20 + 5;
  doc.fillColor('#fff').text('Turi', startX + 6, headerY, { width: colType });
  doc.text('Sana / vaqt', startX + colType + 6, headerY, { width: colDate });
  doc.text('Reja', startX + colType + colDate + 6, headerY, { width: colText });
  doc.moveDown(0.9);

  let rowIdx = 0;
  for (const p of plans) {
    const rowY = doc.y;
    const bg = rowIdx % 2 === 0 ? '#F3F6FC' : '#FFFFFF';
    const rowHeight = 22;
    doc.rect(startX, rowY, colType + colDate + colText, rowHeight).fill(bg);
    doc.fillColor('#1a1a1a').font('Helvetica').fontSize(9);
    const label = p.planType === 'long' ? 'Uzoq' : 'Yaqin';
    doc.text(label, startX + 6, rowY + 6, { width: colType });
    doc.text(fmtDateTime(p.reminderAt), startX + colType + 6, rowY + 6, { width: colDate });
    doc.text(p.text, startX + colType + colDate + 6, rowY + 6, { width: colText - 10 });
    doc.y = rowY + rowHeight;
    rowIdx++;
  }
  doc.fillColor('#000');
}

// ---------------- STATISTIKA PDF ----------------
function buildStatsPdfBuffer(summary, periodLabel, ownerName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 42 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(17).fillColor('#1a1a1a')
        .text(`${ownerName || ''} — Statistika`.trim(), { align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#666').text(periodLabel, { align: 'center' });
      doc.moveDown(1.2);

      // ---- Umumiy ko'rsatkichlar ----
      const net = summary.totalIncome - summary.totalExpense;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
      doc.text(`Jami daromad: `, { continued: true }).fillColor('#1FA97F').text(fmtMoney(summary.totalIncome));
      doc.fillColor('#000').text(`Jami xarajat: `, { continued: true }).fillColor('#C0392B').text(fmtMoney(summary.totalExpense));
      doc.fillColor('#000').text(`Sof natija: `, { continued: true }).fillColor(net >= 0 ? '#1FA97F' : '#C0392B').text(fmtMoney(net));
      doc.fillColor('#000');
      doc.moveDown(1);

      // ---- Toifalar jadvali ----
      const cats = Object.keys(summary.byCategory).sort();
      if (cats.length > 0) {
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#173ea6').text('Toifalar bo\'yicha taqsimot');
        doc.moveDown(0.4);
        const maxVal = Math.max(...cats.map(c => summary.byCategory[c]));
        const startX = doc.x;
        for (const cat of cats) {
          const val = summary.byCategory[cat];
          const barWidth = maxVal > 0 ? Math.max(4, (val / maxVal) * 320) : 4;
          const isIncome = cat.startsWith('➕');
          doc.font('Helvetica').fontSize(9).fillColor('#333').text(`${cat}: ${fmtMoney(val)}`, startX, doc.y);
          doc.moveDown(0.15);
          doc.rect(startX, doc.y, barWidth, 10).fill(isIncome ? '#1FA97F' : '#C0392B');
          doc.moveDown(0.7);
        }
      }
      doc.fillColor('#000');

      doc.end();
    } catch (err) { reject(err); }
  });
}

module.exports = { buildPlansPdfBuffer, buildStatsPdfBuffer, fmtMoney, fmtDateTime };
