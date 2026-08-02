// SHAXSIY BOT UCHUN PDF QURUVCHISI — rejalar va statistikani chiroyli,
// tartibli jadval (va statistikada rangli diagramma) ko'rinishida
// tayyorlaydi. Har bir qator balandligi MATN UZUNLIGIGA QARAB hisoblanadi
// (uzun matn keyingi qatorga "bosib tushib" qolmasligi uchun).

const PDFDocument = require('pdfkit');

const BRAND = '#173ea6';
const BRAND_DARK = '#0f2a7a';
const GREEN = '#1FA97F';
const RED = '#C0392B';
const TEXT_DARK = '#1a1a1a';
const TEXT_MUTED = '#6b7280';
const ROW_ALT = '#F3F6FC';
const PAGE_MARGIN = 42;
const PAGE_WIDTH = 595.28; // A4 pt
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}
const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;
function fmtDateTime(ts) {
  const d = new Date(ts + TASHKENT_OFFSET_MS);
  const p = x => String(x).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

// Sahifa tepasida — brend rangli chiroyli sarlavha banneri
function drawHeader(doc, title, subtitle) {
  doc.rect(0, 0, PAGE_WIDTH, 86).fill(BRAND);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(19)
    .text(title, PAGE_MARGIN, 28, { width: CONTENT_WIDTH, align: 'left' });
  if (subtitle) {
    doc.font('Helvetica').fontSize(10.5).fillColor('rgba(255,255,255,0.85)')
      .text(subtitle, PAGE_MARGIN, 56, { width: CONTENT_WIDTH, align: 'left' });
  }
  doc.fillColor('#000');
  doc.y = 106;
}

// Sahifa pastida — sahifa raqami
function drawFooter(doc) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor(TEXT_MUTED)
      .text(`${i + 1} / ${range.count}`, 0, 810, { width: PAGE_WIDTH, align: 'center' });
  }
}

// Yangi sahifaga o'tish kerak bo'lsa, avtomatik o'tkazadi
function ensureSpace(doc, neededHeight) {
  const bottomLimit = 780;
  if (doc.y + neededHeight > bottomLimit) {
    doc.addPage();
    doc.y = PAGE_MARGIN;
  }
}

// ---------------- REJALAR PDF ----------------
function buildPlansPdfBuffer(todayPlans, allPlans, ownerName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawHeader(doc, `${ownerName || ''} — Rejalarim`.trim(), fmtDateTime(Date.now()));

      drawPlanTable(doc, todayPlans, 'Bugungi rejalar');
      doc.y += 18;
      drawPlanTable(doc, allPlans, "Umumiy rejalarim (barcha kutilayotgan)");

      drawFooter(doc);
      doc.end();
    } catch (err) { reject(err); }
  });
}

function drawPlanTable(doc, plans, title) {
  ensureSpace(doc, 40);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND).text(title, PAGE_MARGIN, doc.y);
  doc.y += 20;

  if (!plans || plans.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(TEXT_MUTED).text('Reja topilmadi.', PAGE_MARGIN, doc.y);
    doc.y += 18;
    doc.fillColor('#000');
    return;
  }

  const startX = PAGE_MARGIN;
  const colType = 60, colDate = 118, colText = CONTENT_WIDTH - colType - colDate;

  // ---- Jadval boshi (header) ----
  ensureSpace(doc, 26);
  const headerH = 24;
  doc.rect(startX, doc.y, CONTENT_WIDTH, headerH).fill(BRAND_DARK);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9.5);
  doc.text('TURI', startX + 10, doc.y + 8, { width: colType - 10 });
  doc.text('SANA / VAQT', startX + colType + 10, doc.y + 8, { width: colDate - 10 });
  doc.text('REJA', startX + colType + colDate + 10, doc.y + 8, { width: colText - 20 });
  doc.y += headerH;

  // ---- Qatorlar (har birining balandligi matn uzunligiga qarab) ----
  let rowIdx = 0;
  for (const p of plans) {
    const textOptions = { width: colText - 20 };
    const textHeight = doc.font('Helvetica').fontSize(9.5).heightOfString(p.text || '', textOptions);
    const rowHeight = Math.max(24, textHeight + 14);

    ensureSpace(doc, rowHeight);
    const rowY = doc.y;

    const bg = rowIdx % 2 === 0 ? ROW_ALT : '#FFFFFF';
    doc.rect(startX, rowY, CONTENT_WIDTH, rowHeight).fill(bg);

    const label = p.planType === 'long' ? 'Uzoq' : 'Yaqin';
    doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(9.5);
    doc.text(label, startX + 10, rowY + 7, { width: colType - 10 });
    doc.fillColor(TEXT_MUTED).text(fmtDateTime(p.reminderAt), startX + colType + 10, rowY + 7, { width: colDate - 10 });
    doc.fillColor(TEXT_DARK).text(p.text || '', startX + colType + colDate + 10, rowY + 7, textOptions);

    doc.y = rowY + rowHeight;
    rowIdx++;
  }
  doc.fillColor('#000');
  doc.y += 6;
}

// ---------------- STATISTIKA PDF ----------------
function buildStatsPdfBuffer(summary, periodLabel, ownerName) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawHeader(doc, `${ownerName || ''} — Statistika`.trim(), periodLabel);

      // ---- Umumiy ko'rsatkich kartalari ----
      const net = summary.totalIncome - summary.totalExpense;
      const cardW = (CONTENT_WIDTH - 20) / 3;
      const cards = [
        { label: 'DAROMAD', value: summary.totalIncome, color: GREEN },
        { label: 'XARAJAT', value: summary.totalExpense, color: RED },
        { label: 'SOF NATIJA', value: net, color: net >= 0 ? GREEN : RED }
      ];
      cards.forEach((c, i) => {
        const x = PAGE_MARGIN + i * (cardW + 10);
        doc.roundedRect(x, doc.y, cardW, 60, 6).fillAndStroke('#F7F9FC', '#E5E9F2');
        doc.font('Helvetica').fontSize(8.5).fillColor(TEXT_MUTED).text(c.label, x + 12, doc.y + 10);
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(c.color).text(fmtMoney(c.value), x + 12, doc.y + 27, { width: cardW - 22 });
      });
      doc.y += 76;

      // ---- Toifalar bo'yicha diagramma ----
      const cats = Object.keys(summary.byCategory).sort();
      if (cats.length > 0) {
        ensureSpace(doc, 30);
        doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND).text("Toifalar bo'yicha taqsimot", PAGE_MARGIN, doc.y);
        doc.y += 22;

        const maxVal = Math.max(...cats.map(c => summary.byCategory[c]));
        const labelWidth = 130, valueWidth = 95, gap = 8;
        const barMaxWidth = CONTENT_WIDTH - labelWidth - valueWidth - gap * 2;

        for (const cat of cats) {
          ensureSpace(doc, 26);
          const val = summary.byCategory[cat];
          const isIncome = cat.startsWith('➕');
          const barWidth = maxVal > 0 ? Math.max(6, (val / maxVal) * barMaxWidth) : 6;
          const cleanLabel = cat.replace('➕ ', '').replace('➖ ', '');
          const barX = PAGE_MARGIN + labelWidth + gap;

          const rowY = doc.y;
          doc.font('Helvetica').fontSize(9.5).fillColor(TEXT_DARK)
            .text(cleanLabel, PAGE_MARGIN, rowY + 3, { width: labelWidth });
          doc.roundedRect(barX, rowY, barMaxWidth, 14, 3).fill('#EEF1F7');
          doc.roundedRect(barX, rowY, barWidth, 14, 3).fill(isIncome ? GREEN : RED);
          doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK)
            .text(fmtMoney(val), barX + barMaxWidth + gap, rowY + 3, { width: valueWidth, align: 'right' });

          doc.y = rowY + 24;
        }
      }
      doc.fillColor('#000');

      drawFooter(doc);
      doc.end();
    } catch (err) { reject(err); }
  });
}

module.exports = { buildPlansPdfBuffer, buildStatsPdfBuffer, fmtMoney, fmtDateTime };
