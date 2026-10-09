// SHARTNOMA PDF QURUVCHISI — bo'lib to'lash (kredit) shartnomasining
// rasmiy matnini va to'lov jadvalini PDF ko'rinishida tayyorlaydi.
// Ham saytdagi "Shartnomani yuklab olish" tugmasi, ham Telegram botga
// yuboriladigan PDF shu bitta modul orqali quriladi — ikkalasi HAR DOIM
// bir xil bo'lishi uchun.
//
// DIZAYN HAQIDA: hujjat rasmiy blank ko'rinishida — tepada firma
// sarlavhasi va hujjat raqami, bo'limlar raqamlangan, shartlar va to'lov
// jadvali chinakam jadval sifatida chiziladi, har sahifa pastida
// kolontitul (shartnoma raqami, sahifa, tekshirish havolasi) turadi.
// Shriftlar PDF standartidagi Helvetica — hech qanday tashqi fayl
// kerak emas, shuning uchun Netlify'da ham doim ishlaydi.

const PDFDocument = require('pdfkit');

const SUPPORT_PHONE = '+998878880101';
const SELLER_NAME   = 'VIP RAQAMLAR';
const SELLER_SITE   = 'vipraqamlar.uz';
const VERIFY_URL    = 'vipraqamlar.uz/shartnoma';

/* ---- O'lchamlar ---- */
const PAGE_W  = 595.28;           // A4 eni (pt)
const PAGE_H  = 841.89;
const M       = 46;               // chap/o'ng chekka
const CW      = PAGE_W - M * 2;   // ish maydoni eni

/* ---- Ranglar: bosmaga ham mos, bo'yoq kam ketadigan ---- */
const C = {
  ink:     '#12161D',
  body:    '#2B3240',
  muted:   '#6B7482',
  hair:    '#D7DCE4',
  rule:    '#9AA3B2',
  zebra:   '#F4F6F9',
  head:    '#EDF0F5',
  accent:  '#B8862B',
  paid:    '#1B7A4B',
  overdue: '#B3261E'
};

/* Shartnoma so'mda ham, dollarda ham bo'lishi mumkin. `cur` berilmasa —
   so'm (eski shartnomalarda `currency` maydoni yo'q edi). */
function fmtMoney(n, cur){
  const belgi = String(cur || '').toUpperCase() === 'USD' ? ' $' : " so'm";
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + belgi;
}
function fmtNum(n){
  return Number(n || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
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

/* ---------- chizish yordamchilari ---------- */

function hair(doc, y, x1, x2, color){
  doc.save().lineWidth(0.6).strokeColor(color || C.hair)
     .moveTo(x1 == null ? M : x1, y).lineTo(x2 == null ? M + CW : x2, y).stroke().restore();
}

/* Raqamlangan bo'lim sarlavhasi: "3 · To'lov tartibi" + ostida ingichka chiziq */
function sectionTitle(doc, n, text){
  const y = doc.y;
  doc.save();
  doc.roundedRect(M, y, 15, 15, 3).fillColor(C.ink).fill();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
     .text(String(n), M, y + 4, { width: 15, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.ink)
     .text(text.toUpperCase(), M + 22, y + 3, { width: CW - 22, characterSpacing: 0.6 });
  doc.restore();
  doc.y = y + 20;
  hair(doc, doc.y, M, M + CW, C.rule);
  doc.y += 10;
}

function para(doc, text, opts){
  doc.font('Helvetica').fontSize(9.3).fillColor(C.body)
     .text(text, M, doc.y, Object.assign({ width: CW, align: 'justify', lineGap: 2.2 }, opts || {}));
  doc.y += 4;
}

/* Ikki ustunli "kalit → qiymat" bloki (shartnoma shartlari uchun) */
function termsTable(doc, rows){
  const colW  = CW / 2;
  const rowH  = 26;
  const perCol = Math.ceil(rows.length / 2);
  const top = doc.y;

  doc.save().lineWidth(0.6).strokeColor(C.hair)
     .rect(M, top, CW, perCol * rowH).stroke().restore();

  rows.forEach((r, i) => {
    const col = Math.floor(i / perCol);
    const idx = i % perCol;
    const x = M + col * colW;
    const y = top + idx * rowH;

    if (idx > 0) hair(doc, y, x + 1, x + colW - 1);
    doc.font('Helvetica').fontSize(7.6).fillColor(C.muted)
       .text(r[0].toUpperCase(), x + 10, y + 5, { width: colW - 20, characterSpacing: 0.5 });
    doc.font(r[2] ? 'Helvetica-Bold' : 'Helvetica').fontSize(r[2] ? 10.5 : 9.6)
       .fillColor(r[2] ? C.ink : C.body)
       .text(r[1], x + 10, y + 14, { width: colW - 20, lineBreak: false });
  });

  doc.save().lineWidth(0.6).strokeColor(C.hair)
     .moveTo(M + colW, top).lineTo(M + colW, top + perCol * rowH).stroke().restore();

  doc.y = top + perCol * rowH + 14;
}

/* Yonma-yon ikkita tomon kartochkasi */
function partyBoxes(doc, left, right){
  const gap = 12;
  const w   = (CW - gap) / 2;
  const top = doc.y;
  const h   = 74;

  [[M, left], [M + w + gap, right]].forEach(([x, p]) => {
    doc.save().lineWidth(0.6).strokeColor(C.hair).rect(x, top, w, h).stroke();
    doc.rect(x, top, w, 2.5).fillColor(p.bar).fill();
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(7.6).fillColor(C.muted)
       .text(p.role.toUpperCase(), x + 11, top + 11, { width: w - 22, characterSpacing: 0.7 });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.ink)
       .text(p.name, x + 11, top + 24, { width: w - 22, lineBreak: false });
    doc.font('Helvetica').fontSize(8.6).fillColor(C.body)
       .text(p.lines.join('\n'), x + 11, top + 40, { width: w - 22, lineGap: 1.5 });
  });

  doc.y = top + h + 14;
}

/* Raqamlangan band ro'yxati: "3.1", "3.2" ... */
function numberedList(doc, section, items){
  items.forEach((t, i) => {
    if (doc.y > PAGE_H - 90) { doc.addPage(); doc.y = M + 10; }
    const y0 = doc.y;
    doc.font('Helvetica-Bold').fontSize(8.6).fillColor(C.muted)
       .text(`${section}.${i + 1}`, M, y0 + 0.6, { width: 24 });
    doc.font('Helvetica').fontSize(9.3).fillColor(C.body)
       .text(t, M + 26, y0, { width: CW - 26, align: 'justify', lineGap: 2 });
    doc.y += 5;
  });
}

/* Sahifa tepasidagi firma blanki */
function letterhead(doc, contract){
  doc.save();
  doc.rect(M, 30, CW, 3).fillColor(C.accent).fill();
  doc.restore();

  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.ink)
     .text(SELLER_NAME, M, 46, { characterSpacing: 1.2 });
  doc.font('Helvetica').fontSize(8.4).fillColor(C.muted)
     .text(`Mobil raqamlar savdosi  ·  ${SELLER_SITE}  ·  ${SUPPORT_PHONE}`, M, 65, { width: CW * 0.6 });

  // o'ng tomonda hujjat raqami
  const bx = M + CW - 176, by = 44;
  doc.save().lineWidth(0.6).strokeColor(C.hair).rect(bx, by, 176, 40).stroke().restore();
  doc.font('Helvetica').fontSize(7.4).fillColor(C.muted)
     .text('SHARTNOMA RAQAMI', bx + 10, by + 7, { width: 156, characterSpacing: 0.6 });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.ink)
     .text(String(contract.contractId || '—'), bx + 10, by + 19, { width: 156, lineBreak: false });

  doc.y = 100;
  hair(doc, doc.y, M, M + CW, C.rule);
  doc.y += 16;
}

/* Har sahifa pastidagi kolontitul */
function footer(doc, contract, pageNo){
  // Kolontitul pastki chekkadan HAM pastroqqa yoziladi; shuning uchun
  // pdfkit'ning "sahifa to'ldi, yangisini och" qoidasini vaqtincha
  // o'chiramiz — aks holda har kolontituldan keyin bo'sh sahifa qo'shilib
  // ketadi va matnning o'zi ko'rinmay qoladi.
  doc.page.margins.bottom = 0;
  const y = PAGE_H - 46;
  hair(doc, y, M, M + CW);
  doc.font('Helvetica').fontSize(7.4).fillColor(C.muted)
     .text(`Shartnoma ${contract.contractId || ''}  ·  ${SELLER_SITE}`, M, y + 7, { width: CW * 0.6 })
     .text(`${pageNo}-bet`, M, y + 7, { width: CW, align: 'right' });
  doc.font('Helvetica').fontSize(7).fillColor(C.muted)
     .text(`Hujjat haqiqiyligini ${VERIFY_URL} sahifasida tekshirish mumkin.`, M, y + 18, { width: CW, align: 'center' });
}

/* ---------- asosiy quruvchi ---------- */

function buildContractPdfBuffer(contract){
  return new Promise((resolve, reject)=>{
    try{
      const doc = new PDFDocument({ size: 'A4', margin: M, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const now        = Date.now();
      const payments   = contract.payments || [];
      const months     = contract.totalMonths || payments.length || 0;
      const monthly    = contract.monthlyPayment || 0;
      const total      = monthly * months;
      const paidCount  = payments.filter(p => p.status === 'paid').length;
      const paidSum    = paidCount * monthly;
      const leftSum    = Math.max(total - paidSum, 0);
      const overdueCnt = payments.filter(p => paymentState(p, now) === 'overdue').length;

      letterhead(doc, contract);

      /* ---- Hujjat nomi ---- */
      doc.font('Helvetica-Bold').fontSize(13.5).fillColor(C.ink)
         .text("BO'LIB TO'LASH SHARTI BILAN RAQAM SOTISH SHARTNOMASI",
               M, doc.y, { width: CW, align: 'center', characterSpacing: 0.4, lineGap: 2 });
      doc.y += 6;
      doc.font('Helvetica').fontSize(8.8).fillColor(C.muted)
         .text(`Tuzilgan sana: ${fmtDate(contract.createdAt)}        Amal qilish muddati: ${months} oy`,
               M, doc.y, { width: CW, align: 'center' });
      doc.y += 20;

      /* ---- 1. Tomonlar ---- */
      sectionTitle(doc, 1, 'Shartnoma tomonlari');
      partyBoxes(doc,
        { role: 'Sotuvchi', bar: C.ink, name: SELLER_NAME,
          lines: [SELLER_SITE, SUPPORT_PHONE] },
        { role: 'Xaridor (mijoz)', bar: C.accent, name: contract.customerName || '—',
          lines: [ contract.customerPhone || '—', contract.region || '—' ] }
      );

      /* ---- 2. Shartnoma predmeti ---- */
      sectionTitle(doc, 2, 'Shartnoma predmeti va shartlari');
      para(doc, `Sotuvchi Xaridorga quyida ko'rsatilgan mobil telefon raqamini bo'lib to'lash sharti bilan sotadi, `
              + `Xaridor esa raqamni qabul qilib, to'lovlarni jadvalga muvofiq amalga oshirish majburiyatini oladi.`);
      doc.y += 4;
      termsTable(doc, [
        ['Sotilayotgan raqam', contract.number || '—', true],
        ["Umumiy summa",       fmtMoney(total, contract.currency), true],
        ["To'lov muddati",     `${months} oy`],
        ["Oylik to'lov",       fmtMoney(monthly, contract.currency), true],
        ["To'lov kuni",        `Har oyning ${contract.paymentDay || 1}-sanasi`],
        ["Hozirgi holat",      `${paidCount} / ${months} oy to'langan`]
      ]);

      /* ---- 3. To'lov tartibi ---- */
      sectionTitle(doc, 3, "To'lov tartibi va tomonlarning majburiyatlari");
      const rules = [
        `Xaridor har oy, ushbu shartnomada ko'rsatilgan sanada, belgilangan summani to'liq to'lab borishi shart.`,
        `Sotuvchi to'lov qabul qilingandan so'ng, tegishli oy uchun to'lovni "To'landi" deb belgilaydi.`,
        `Agar navbatdagi to'lov muddati o'tgan bo'lsa va hali to'lanmagan bo'lsa, u "Kechikmoqda" holatida hisoblanadi.`,
        `Agar to'lov muddatidan 30 (o'ttiz) kun va undan ortiq kechiksa, ushbu shartnoma bir tomonlama tarzda bekor hisoblanadi. `
          + `Bunday holatda to'langan mablag' va/yoki raqamning o'zi qaytarib berilmaydi.`,
        `Barcha to'lovlar shartnomada ko'rsatilgan raqam(lar) orqali amalga oshiriladi. `
          + `Savol va murojaatlar ${SUPPORT_PHONE} raqamiga yo'naltiriladi.`
      ];
      numberedList(doc, 3, rules);
      doc.y += 6;

      /* ---- 4. Raqamni Xaridor nomiga o'tkazish ----
         Mijozning asosiy savoli: "to'lab bo'lsam raqam menga o'tadimi?".
         Shuning uchun bu alohida, raqamlangan bo'lim sifatida yoziladi —
         og'zaki va'da emas, shartnomaning bir qismi. */
      if (doc.y > PAGE_H - 230) { doc.addPage(); doc.y = M + 10; }
      sectionTitle(doc, 4, "Raqamni Xaridor nomiga o'tkazish");
      numberedList(doc, 4, [
        `Raqam bo'yicha abonent shartnomasi Xaridor nomiga ushbu shartnoma bo'yicha BARCHA to'lovlar `
          + `to'liq amalga oshirilgandan keyin rasmiylashtiriladi.`,
        `So'nggi to'lov qabul qilingan kundan boshlab 5 (besh) ish kuni ichida Sotuvchi raqamni uyali aloqa `
          + `operatorining rasmiy xizmat ko'rsatish shoxobchasida Xaridor nomiga o'tkazib berish majburiyatini oladi.`,
        `Rasmiylashtirish uchun Xaridor pasporti (yoki uni almashtiruvchi hujjat) asl nusxasi bilan shaxsan hozir `
          + `bo'lishi shart. Operator tomonidan belgilangan davlat yig'imi yoki xizmat haqi mavjud bo'lsa, u Xaridor `
          + `hisobidan qoplanadi.`,
        `To'lovlar to'liq yakunlanmaguncha raqam Sotuvchining nomida qoladi. Bu muddat ichida Xaridor raqamni uchinchi `
          + `shaxsga sotishi, hadya qilishi, garovga qo'yishi yoki boshqa shaxs nomiga o'tkazishi mumkin emas.`,
        `Raqam Xaridor nomiga o'tkazilgandan so'ng tomonlar o'rtasida qabul qilish dalolatnomasi imzolanadi va shu `
          + `paytdan e'tiboran ushbu shartnoma to'liq bajarilgan hisoblanadi, tomonlarning bir-biriga da'vosi qolmaydi.`
      ]);
      doc.y += 6;

      /* ---- 4. To'lov jadvali ---- */
      if (doc.y > PAGE_H - 220) { doc.addPage(); doc.y = M + 10; }
      sectionTitle(doc, 5, "To'lov jadvali");

      const col = { m: M, date: M + 56, sum: M + 180, st: M + 330 };
      const rowH = 17;

      function tableHead(){
        const y = doc.y;
        doc.save().rect(M, y, CW, 20).fillColor(C.head).fill().restore();
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.ink);
        doc.text('OY',           col.m + 8,  y + 6.5, { width: 44, characterSpacing: 0.5 });
        doc.text("TO'LOV SANASI", col.date,  y + 6.5, { width: 120, characterSpacing: 0.5 });
        doc.text('SUMMASI',      col.sum,    y + 6.5, { width: 140, align: 'right', characterSpacing: 0.5 });
        doc.text('HOLATI',       col.st + 30, y + 6.5, { width: CW - (col.st - M) - 38, align: 'right', characterSpacing: 0.5 });
        doc.y = y + 20;
      }
      tableHead();

      payments.forEach((p, i) => {
        if (doc.y > PAGE_H - 80) {
          doc.addPage(); doc.y = M + 10;
          tableHead();
        }
        const y = doc.y;
        const state = paymentState(p, now);
        if (i % 2 === 1) doc.save().rect(M, y, CW, rowH).fillColor(C.zebra).fill().restore();

        doc.font('Helvetica-Bold').fontSize(8.8).fillColor(C.ink)
           .text(`${p.month}`, col.m + 8, y + 4.6, { width: 44 });
        doc.font('Helvetica').fontSize(8.8).fillColor(C.body)
           .text(fmtDate(p.dueDate), col.date, y + 4.6, { width: 120 });
        doc.font('Helvetica-Bold').fontSize(8.8).fillColor(C.ink)
           .text(fmtNum(monthly), col.sum, y + 4.6, { width: 140, align: 'right' });

        const stColor = state === 'paid' ? C.paid : (state === 'overdue' ? C.overdue : C.muted);
        doc.font(state === 'upcoming' ? 'Helvetica' : 'Helvetica-Bold').fontSize(8.6).fillColor(stColor)
           .text(STATE_LABELS[state], col.st, y + 4.8, { width: CW - (col.st - M) - 8, align: 'right' });

        hair(doc, y + rowH);
        doc.y = y + rowH;
      });

      /* jamlovchi qator */
      const ty = doc.y;
      doc.save().rect(M, ty, CW, 22).fillColor(C.head).fill().restore();
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.ink)
         .text("JAMI", col.m + 8, ty + 7, { width: 160 })
         .text(fmtNum(total), col.sum, ty + 7, { width: 140, align: 'right' })
         .text(`${paidCount} / ${months} oy to'langan`, col.st - 40, ty + 7,
               { width: CW - (col.st - M) + 32, align: 'right' });
      doc.y = ty + 32;

      /* qisqa hisob */
      if (doc.y > PAGE_H - 170) { doc.addPage(); doc.y = M + 10; }
      const sw = (CW - 24) / 3;
      const sy = doc.y;
      [
        ["To'langan",  fmtNum(paidSum),  C.paid],
        ['Qolgan qarz', fmtNum(leftSum), C.ink],
        ['Kechikkan oylar', String(overdueCnt), overdueCnt ? C.overdue : C.muted]
      ].forEach((s, i) => {
        const x = M + i * (sw + 12);
        doc.save().lineWidth(0.6).strokeColor(C.hair).rect(x, sy, sw, 44).stroke().restore();
        doc.font('Helvetica').fontSize(7.6).fillColor(C.muted)
           .text(s[0].toUpperCase(), x + 10, sy + 9, { width: sw - 20, characterSpacing: 0.5 });
        doc.font('Helvetica-Bold').fontSize(13).fillColor(s[2])
           .text(s[1], x + 10, sy + 22, { width: sw - 20, lineBreak: false });
      });
      doc.y = sy + 60;

      /* ---- 5. Imzolar ---- */
      if (doc.y > PAGE_H - 150) { doc.addPage(); doc.y = M + 10; }
      sectionTitle(doc, 6, 'Tomonlarning imzosi');
      const sgY = doc.y + 24;
      const half = (CW - 40) / 2;
      [[M, 'Sotuvchi', SELLER_NAME], [M + half + 40, 'Xaridor', contract.customerName || '']].forEach(([x, role, name]) => {
        hair(doc, sgY, x, x + half, C.rule);
        doc.font('Helvetica-Bold').fontSize(8.6).fillColor(C.ink)
           .text(role, x, sgY + 6, { width: half });
        doc.font('Helvetica').fontSize(8.4).fillColor(C.muted)
           .text(name, x, sgY + 18, { width: half, lineBreak: false });
        doc.font('Helvetica').fontSize(7.6).fillColor(C.muted)
           .text('imzo / sana', x + half - 60, sgY + 6, { width: 60, align: 'right' });
      });
      doc.y = sgY + 42;

      doc.font('Helvetica').fontSize(7.8).fillColor(C.muted)
         .text('Ushbu hujjat vipraqamlar.uz tizimi tomonidan avtomatik shakllantirilgan va elektron nusxa sifatida kuchga ega.',
               M, doc.y, { width: CW, align: 'center' });

      /* ---- kolontitullar (hamma sahifaga) ---- */
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++){
        doc.switchToPage(range.start + i);
        footer(doc, contract, i + 1);
      }

      doc.end();
    }catch(e){
      reject(e);
    }
  });
}

module.exports = { buildContractPdfBuffer, paymentState, STATE_LABELS, fmtMoney, fmtDate };
