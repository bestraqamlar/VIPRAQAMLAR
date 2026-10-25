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
const crypto = require('crypto');
const QRCode = require('qrcode');

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
  overdue: '#B3261E',
  /* Muhr siyohi — haqiqiy shtamp kabi KO'K. Qora matndan ajralib
     turadi: nusxa ko'chirilganda ham "asl" ekani bilinadi. */
  muhr:    '#1B3FA0'
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
/* ==================================================================
   QR KOD HAVOLASI (V120)
   ------------------------------------------------------------------
   Shartnomaning qog'oz nusxasidagi QR kod skanerlanganda AYNAN SHU
   shartnomaning PDF'i ochilishi kerak. Lekin PDF manzili shunchaki
   "/s?i=KR001" bo'lsa, raqamni birma-bir sinab boshqa odamlarning
   shartnomasini ham ochib olish mumkin bo'lardi. Shu sabab havolaga
   IMZO (`k`) qo'shiladi: u shartnoma raqamidan maxfiy kalit bilan
   hisoblanadi (HMAC-SHA256), taxmin qilib bo'lmaydi va faqat SHU
   shartnomaga yaraydi.

   Maxfiy kalit: `CONTRACT_QR_SECRET` muhit o'zgaruvchisi bo'lsa —
   o'sha. Bo'lmasa — serverdagi Firebase xizmat kalitidan barqaror
   tarzda hosil qilinadi (u hech qachon serverdan chiqmaydi), ya'ni
   hech narsa sozlash SHART EMAS va havolalar qayta joylashdan keyin
   ham ishlayveradi.
   ================================================================== */
function qrSir(){
  if (process.env.CONTRACT_QR_SECRET) return String(process.env.CONTRACT_QR_SECRET);
  return crypto.createHash('sha256')
    .update('vipraqamlar-shartnoma-qr|' + (process.env.FIREBASE_PRIVATE_KEY || 'zaxira'))
    .digest('hex');
}
function qrKalit(id){
  return crypto.createHmac('sha256', qrSir())
    .update(String(id || '').trim().toUpperCase())
    .digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    .slice(0, 16);
}
function qrHavola(id){
  const v = String(id || '').trim().toUpperCase();
  if(!v) return '';
  /* Havola ATAYLAB qisqa: QR kod qancha qisqa bo'lsa, kataklari shuncha
     yirik bo'ladi — bosilgan qog'ozdan ham, ekrandan ham bir urinishda
     o'qiladi.
     Oxiri `.pdf` bilan tugaydi (V120): telefon skaneri va brauzerlar
     havolaning oxiriga qarab "bu fayl" deb tushunadi va PDF'ni
     DARHOL ochadi — sayt ochilib, keyin yuklab olish so'ralmaydi.
     Server ham baribir `Content-Type: application/pdf` qaytaradi, ya'ni
     himoya kengaytmaga bog'liq emas. */
  return 'https://' + SELLER_SITE + '/s/' + encodeURIComponent(v) + '/' + qrKalit(v) + '.pdf';
}

/* QR kodni RASM sifatida emas, VEKTOR kvadratchalar bilan chizamiz —
   shunda u har qanday o'lchamda (ekranda ham, bosmada ham) aniq
   chiqadi va fayl hajmi deyarli oshmaydi. */
function qrChiz(doc, matn, x, y, olcham){
  let qr;
  try{
    qr = QRCode.create(matn, { errorCorrectionLevel: 'M' });
  }catch(e){ return false; }
  const n = qr.modules.size;
  const data = qr.modules.data;
  /* Atrofida bo'sh "tinch zona" (4 katak) — standart talabi, usiz
     ba'zi skanerlar o'qimaydi. */
  const zona = 4;
  const k = olcham / (n + zona * 2);
  doc.save();
  doc.rect(x, y, olcham, olcham).fill('#FFFFFF');
  doc.fillColor(C.ink);
  for(let r = 0; r < n; r++){
    for(let c = 0; c < n; c++){
      if(data[r * n + c]){
        /* Katakchalar orasida ko'rinmas tirqish qolmasligi uchun
           o'lchamga ozgina qo'shamiz (bosmada oq chiziqlar chiqmasin). */
        doc.rect(x + (c + zona) * k, y + (r + zona) * k, k + 0.12, k + 0.12).fill();
      }
    }
  }
  doc.restore();
  return true;
}

/* ==================================================================
   RASMIY MUHR (V120)
   ------------------------------------------------------------------
   Haqiqiy kompaniya shtampi kabi: ikki halqa, halqa bo'ylab yozuv,
   markazda yulduzcha va sayt manzili. Ko'k siyoh, yengil shaffoflik
   va bir oz qiyshiq (-11°) — qo'lda bosilgandek ko'rinadi.
   Butunlay VEKTOR: hech qanday rasm fayli yo'q, demak Netlify'da
   hech narsa yuklanmaydi va bosmada ham aniq chiqadi.
   ================================================================== */
function halqaMatn(doc, matn, cx, cy, r, boshBurchak, yonalish, oOlcham, harfOraligi){
  /* Har bir harf alohida, markaz atrofida aylantirib qo'yiladi —
     PDF'da "egri matn" boshqa yo'l bilan bo'lmaydi. */
  doc.font('Helvetica-Bold').fontSize(oOlcham);
  const harflar = String(matn).split('');
  const enlar = harflar.map(h => doc.widthOfString(h) + harfOraligi);
  const jami = enlar.reduce((a, b) => a + b, 0);
  /* Yozuvni berilgan burchakdan boshlab, O'RTASI aniq shu yo'nalishga
     to'g'ri kelishi uchun yarmiga surib qo'yamiz. */
  let burchak = boshBurchak - yonalish * (jami / r) / 2;
  harflar.forEach((h, i) => {
    const en = enlar[i];
    const o = burchak + yonalish * (en / r) / 2;
    const px = cx + r * Math.cos(o);
    const py = cy + r * Math.sin(o);
    doc.save();
    doc.translate(px, py);
    /* Harf halqaga TIK tursin: pastki yoyda teskari aylantiriladi. */
    doc.rotate((o * 180 / Math.PI) + (yonalish > 0 ? 90 : -90));
    doc.text(h, -en / 2, -oOlcham * 0.72, { lineBreak: false, width: en, align: 'center' });
    doc.restore();
    burchak += yonalish * (en / r);
  });
}

function muhrChiz(doc, cx, cy, r){
  doc.save();
  try{ doc.opacity(0.88); }catch(e){}
  doc.translate(cx, cy);
  doc.rotate(-11);
  doc.translate(-cx, -cy);

  doc.lineWidth(1.9).strokeColor(C.muhr).circle(cx, cy, r).stroke();
  doc.lineWidth(0.8).strokeColor(C.muhr).circle(cx, cy, r - 5.5).stroke();
  doc.lineWidth(0.6).strokeColor(C.muhr).circle(cx, cy, r - 17).stroke();

  doc.fillColor(C.muhr);
  /* Tepada — kompaniya nomi, pastda — asos. */
  /* O'lchamlar SINOV asosida tanlangan: yozuv yoyi 140 darajadan
     oshmasin — aks holda tepadagi va pastdagi yozuvlar yon tomonlarda
     bir-biriga kirib ketadi (birinchi urinishda aynan shunday bo'ldi). */
  halqaMatn(doc, 'VIP RAQAMLAR', cx, cy, r - 12, -Math.PI / 2, 1, 7.2, 1.2);
  halqaMatn(doc, 'RASMIY SHARTNOMA ASOSIDA', cx, cy, r - 11.5, Math.PI / 2, -1, 4.6, 0.5);

  /* Yon tomonlardagi ikki nuqta — tepa va pastki yozuvni ajratadi
     (haqiqiy muhrlarda shunday). */
  [0, Math.PI].forEach(a => {
    doc.circle(cx + (r - 12) * Math.cos(a), cy + (r - 12) * Math.sin(a), 1.25).fill(C.muhr);
  });

  /* Markaz: kichik yulduzcha va uning OSTIDA bitta qator (sayt
     manzili). Ilgari bu yerda ikki qator bor edi — ichki halqa
     (diametri ~50 pt) ularga tor kelib, yozuvlar yulduzcha bilan
     ustma-ust tushib ketgan edi. Endi faqat bitta, kichik qator. */
  doc.save();
  doc.translate(cx, cy - 7.5);
  const yulduz = [];
  for(let i = 0; i < 10; i++){
    const rr = (i % 2 === 0) ? 6 : 2.6;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    yulduz.push([rr * Math.cos(a), rr * Math.sin(a)]);
  }
  doc.moveTo(yulduz[0][0], yulduz[0][1]);
  yulduz.slice(1).forEach(pq => doc.lineTo(pq[0], pq[1]));
  doc.closePath().fill(C.muhr);
  doc.restore();

  /* Yozuv ikki qatorga bo'linib ketmasligi uchun o'lcham KICHIK va
     quti KENG (ichki halqaga baribir sig'adi — sinovda o'lchandi). */
  doc.font('Helvetica-Bold').fontSize(5).fillColor(C.muhr)
     .text(SELLER_SITE.toUpperCase(), cx - 40, cy + 2.5,
           { width: 80, align: 'center', lineBreak: false });

  try{ doc.opacity(1); }catch(e){}
  doc.restore();
}

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
      /* V120: endi bu blokda MUHR va QR KOD ham bor, shuning uchun
         joy talabi oshdi (150 -> 235). Aks holda muhr sahifa chekkasiga
         chiqib ketardi. */
      if (doc.y > PAGE_H - 250) { doc.addPage(); doc.y = M + 10; }
      sectionTitle(doc, 6, 'Tomonlarning imzosi');
      /* V120: imzo chizig'i pastroqqa surildi (24 -> 46). Sabab: muhr
         endi AYNAN SHU CHIZIQ USTIGA bosiladi (mijoz so'rovi), ya'ni
         uning yuqori qismi chiziqdan tepada turadi — bo'lim
         sarlavhasiga tegib ketmasligi uchun joy kerak. */
      const sgY = doc.y + 46;
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

      /* ---- V120: RASMIY MUHR va QR KOD ----
         Muhr — Sotuvchi ustunining tagida, imzo chizig'iga biroz
         tegib turadi (haqiqiy hujjatlarda shunday bosiladi).
         QR kod — o'ng tomonda, Xaridor ustuni ostida; yonida nima
         uchun kerakligi yozilgan. */
      const muhrR = 42;
      /* Muhr SOTUVCHI IMZOSI CHIZIG'I USTIGA bosiladi — haqiqiy
         hujjatlardagidek: chiziq muhrning yuqori qismidan o'tadi.
         Gorizontal joyi "VIP RAQAMLAR" yozuvidan keyin boshlanadi,
         shunda nom o'qilishicha qoladi. */
      const muhrCx = M + 120;
      const muhrCy = sgY + 16;
      try{ muhrChiz(doc, muhrCx, muhrCy, muhrR); }catch(e){ /* muhr chizilmasa ham hujjat buziladi deb hisoblamaymiz */ }

      /* 84 pt = ~30 mm. Sinovda o'lchandi: shu o'lchamda bitta katak
         ~0,8 mm bo'ladi va telefon kamerasi bosilgan qog'ozdan ham,
         ekrandan ham bir urinishda o'qiydi (76 pt da past sifatli
         suratda ba'zan o'qilmasdi). */
      const qrOlcham = 84;
      const qrX = M + CW - qrOlcham;
      const qrY = sgY + 24;
      const havola = qrHavola(contract.contractId);
      let qrBor = false;
      if(havola){
        try{ qrBor = qrChiz(doc, havola, qrX, qrY, qrOlcham); }catch(e){ qrBor = false; }
      }
      /* QR kod OSTIDA izoh yozuvi ATAYLAB YO'Q (mijoz so'rovi).
         QR kodning o'zi tushunarli — ortiqcha yozuv hujjatni
         chalkashtiradi. */

      doc.y = Math.max(sgY + 42, muhrCy + muhrR + 14, qrY + qrOlcham + 16);

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

module.exports = { buildContractPdfBuffer, paymentState, STATE_LABELS, fmtMoney, fmtDate, qrKalit, qrHavola };
