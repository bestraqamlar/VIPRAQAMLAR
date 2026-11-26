// ===========================================================================
// BO'LIB TO'LASH SHARTNOMALARI REESTRI — umumiy PDF (V201: katta jadval)
// ---------------------------------------------------------------------------
// NIMA UCHUN KERAK (mijoz so'rovi): sayt yoki internet ishlamay qolganda ham
// butun bo'lib to'lash portfeli qo'lda, qog'ozda bo'lsin.
//
// V200 DA NIMA NOTO'G'RI EDI: har bir mijoz alohida "kartochka" bo'lib,
// sahifaga atigi 5-6 kishi sig'ardi. 40 kishi = 7 varaq, kerakli odamni
// topish uchun varaqlab chiqish kerak edi — "juda oddiy va noqulay"
// degani aynan shu.
//
// V201 DA QANDAY: hujjat ENDI HAQIQIY JADVAL, bank hisobvarag'i kabi.
//   1-qism. ASOSIY JADVAL — har bir mijoz BITTA qator, sahifaga ~25 kishi.
//           Ustunlar: tartib, mijoz, pasport, manzil, raqam, shartnoma,
//           oylik to'lov, to'langan/jami, qolgan qarz, keyingi to'lov,
//           holat va QO'LDA BELGILASH uchun bo'sh katak.
//           Har bo'lim oxirida YAKUN qatori (nechta va jami qancha).
//   2-qism. HAR BIR MIJOZNING TO'LIQ JADVALI — oylar katakchasi, QR kod va
//           "to'landi / sana / imzo" uchun joy. Sahifada ikkitadan.
//   3-qism. ALIFBO KO'RSATKICHI — ism va u turgan sahifa raqami.
//
// Varaq ALBOM (landscape) holatida: ustunlar keng, yozuvlar kichraymaydi.
//
// TARTIB — ishning ketma-ketligi bo'yicha:
//   1-bo'lim. MUAMMOLI QARZDORLAR   (to'lovi 30 kundan ortiq kechikkan)
//   2-bo'lim. KECHIKKAN TO'LOVLAR   (1-29 kun)
//   3-bo'lim. YAQIN 7 KUN ICHIDA
//   4-bo'lim. JADVAL BO'YICHA
// Arxiv (yakunlangan va bekor qilingan) reestrga UMUMAN kirmaydi.
//
// QR KOD: skanerlansa o'sha shartnomaning to'liq PDF'i ochiladi
// (contractPdf.js dagi bir xil imzolangan havola).
//
// MAXFIYLIK: hujjatda mijozlarning shaxsiy ma'lumotlari bor — u faqat
// adminning shaxsiy Telegram chatiga yuboriladi.
// ===========================================================================

const PDFDocument = require('pdfkit');
const { fmtMoney, fmtDate, qrHavola, qrChiz, C, SELLER_NAME, SELLER_SITE } =
  require('./contractPdf');

/* ALBOM A4 */
const PAGE_W = 841.89, PAGE_H = 595.28;
const M  = 28;
const CW = PAGE_W - M * 2;                 /* 785.89 */
const PAST = PAGE_H - 26;                  /* kolontitul chizig'i */

const KUN = 86400000;
const MUAMMO_KUN = 30;                     /* panel bilan bir xil chegara */

const BOLIMLAR = [
  { key:'muammoli', nom:'MUAMMOLI QARZDORLAR',
    izoh:"to'lovi " + MUAMMO_KUN + " kundan ortiq kechikkan", rang:'#8B1A14' },
  { key:'overdue',  nom:"KECHIKKAN TO'LOVLAR",
    izoh:'1-' + (MUAMMO_KUN - 1) + ' kun kechikkan', rang:C.overdue },
  { key:'soon',     nom:'YAQIN 7 KUN ICHIDA',
    izoh:"to'lov kuni yaqinlashgan", rang:C.accent },
  { key:'ok',       nom:"JADVAL BO'YICHA",
    izoh:"kechikish yo'q", rang:C.paid }
];
const HOLAT_NOM = { muammoli:'MUAMMOLI', overdue:'KECHIKKAN', soon:'YAQIN', ok:'JOYIDA' };

/* ==========================================================================
   Shartnomani tahlil qilish — admin paneldagi `qzAnalyze` bilan AYNAN bir xil.
   ========================================================================== */
function tahlil(d, now){
  const payments = Array.isArray(d.payments) ? d.payments : [];
  const monthly  = Number(d.monthlyPayment) || 0;
  const total    = Number(d.totalMonths) || payments.length || 0;
  const paid     = payments.filter(p => p.status === 'paid').length;
  const left     = Math.max(0, total - paid);
  const pending  = payments.filter(p => p.status !== 'paid')
                           .sort((a,b) => a.dueDate - b.dueDate);
  const overdue  = pending.filter(p => p.dueDate < now);
  const next     = pending[0] || null;
  const archived = d.contractStatus === 'cancelled' || d.contractStatus === 'completed';

  let state = 'ok', days = 0;
  if(left === 0 || archived){
    state = 'done';
  }else if(overdue.length){
    days = Math.floor((now - overdue[0].dueDate) / KUN);
    state = (days >= MUAMMO_KUN) ? 'muammoli' : 'overdue';
  }else if(next && (next.dueDate - now) <= 7 * KUN){
    state = 'soon';
    days = Math.max(0, Math.ceil((next.dueDate - now) / KUN));
  }
  return {
    state, days, paid, total, left, monthly, next, payments,
    debt: left * monthly,
    overdueCount: overdue.length,
    overdueSum: overdue.length * monthly
  };
}

/* Helvetica (WinAnsi) hamma belgini bilmaydi: o'zbekcha `oʻ`, `gʻ`
   (U+02BB/U+02BC) va `№` unda YO'Q. Mijozdan kelgan har qanday matn shu
   yerdan o'tkaziladi, aks holda PDF buziladi. */
function wa(x){
  return String(x == null ? '' : x)
    .replace(/[ʻʼ′´`]/g, "'")
    .replace(/№/g, 'No.')
    .replace(/[−‒]/g, '-')
    .replace(/[^\x20-\x7E -ÿ‘’“”–—•…]/g, '');
}

/* Uzun matnni ustunga sig'adigan qilib qisqartiradi. */
function qisqart(doc, matn, en, shrift, olcham){
  doc.font(shrift).fontSize(olcham);
  let s = wa(matn);
  if(doc.widthOfString(s) <= en) return s;
  while(s.length > 1 && doc.widthOfString(s + '…') > en) s = s.slice(0, -1);
  return s + '…';
}

function pulQisqa(n){
  const v = Math.round(Number(n) || 0);
  if(v >= 1000000) return (v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace('.', ',') + ' mln';
  if(v >= 1000)    return Math.round(v / 1000) + ' ming';
  return String(v);
}

/* ==========================================================================
   ASOSIY JADVAL USTUNLARI
   Kengliklar yig'indisi CW ga teng bo'lishi SHART.
   ========================================================================== */
const UST = [
  /* `№` Helvetica'da yo'q — "T/R" (tartib raqami) yoziladi. */
  { k:'n',       nom:'T/R',               en:20,  tekis:'center' },
  { k:'ism',     nom:'MIJOZ',             en:116, tekis:'left'   },
  { k:'pasport', nom:'PASPORT',           en:62,  tekis:'left'   },
  { k:'manzil',  nom:'MANZIL',            en:104, tekis:'left'   },
  { k:'raqam',   nom:'RAQAM',             en:84,  tekis:'left'   },
  { k:'shart',   nom:'SHARTNOMA',         en:54,  tekis:'left'   },
  { k:'oylik',   nom:"OYLIK TO'LOV",      en:62,  tekis:'right'  },
  { k:'oy',      nom:"TO'LANGAN",         en:50,  tekis:'center' },
  { k:'qarz',    nom:'QOLGAN QARZ',       en:70,  tekis:'right'  },
  { k:'keyingi', nom:"KEYINGI TO'LOV",    en:62,  tekis:'center' },
  { k:'holat',   nom:'HOLATI',            en:64,  tekis:'center' },
  { k:'belgi',   nom:'BELGI',             en:37,  tekis:'center' }
];
const JADVAL_EN = UST.reduce((s,u) => s + u.en, 0);

function ustunX(i){
  let x = M;
  for(let k = 0; k < i; k++) x += UST[k].en;
  return x;
}

function jadvalBosh(doc, y){
  doc.save();
  doc.rect(M, y, JADVAL_EN, 16).fill(C.head);
  doc.font('Helvetica-Bold').fontSize(5.9).fillColor(C.body);
  UST.forEach((u, i) => {
    doc.text(u.nom, ustunX(i) + 3, y + 5.4,
      { width: u.en - 6, align: u.tekis === 'right' ? 'right' : (u.tekis === 'center' ? 'center' : 'left'),
        lineBreak:false, ellipsis:true, characterSpacing:0.3 });
  });
  doc.lineWidth(0.5).strokeColor(C.rule).moveTo(M, y + 16).lineTo(M + JADVAL_EN, y + 16).stroke();
  doc.restore();
  return y + 16;
}

function jadvalQator(doc, y, qiy, rang, zebra, now){
  const bal = 15;
  doc.save();
  if(zebra) doc.rect(M, y, JADVAL_EN, bal).fill(C.zebra);
  /* chap chekkadagi holat chizig'i */
  doc.rect(M, y, 2, bal).fill(rang);
  UST.forEach((u, i) => {
    const x = ustunX(i) + 3, en = u.en - 6;
    let matn = qiy[u.k] == null ? '' : String(qiy[u.k]);
    const qalin = (u.k === 'ism' || u.k === 'qarz' || u.k === 'oylik');
    const rangi = (u.k === 'qarz' && qiy.__qarzRang) ? qiy.__qarzRang
                : (u.k === 'holat' ? rang : C.body);
    if(u.k === 'belgi'){
      /* qo'lda belgilash uchun bo'sh katak */
      doc.lineWidth(0.5).strokeColor(C.rule)
         .rect(x + en / 2 - 5, y + 4, 10, 8).stroke();
      return;
    }
    if(u.k === 'holat'){
      const o = 5.4;
      doc.font('Helvetica-Bold').fontSize(o);
      const w = Math.min(en, doc.widthOfString(matn) + 8);
      doc.roundedRect(x + (en - w) / 2, y + 3.2, w, 8.6, 2).fill(rang);
      doc.fillColor('#FFFFFF').text(matn, x + (en - w) / 2, y + 5.4,
        { width: w, align:'center', lineBreak:false });
      return;
    }
    doc.font(qalin ? 'Helvetica-Bold' : 'Helvetica').fontSize(6.6).fillColor(rangi);
    matn = qisqart(doc, matn, en, qalin ? 'Helvetica-Bold' : 'Helvetica', 6.6);
    doc.text(matn, x, y + 4.6,
      { width: en, align: u.tekis === 'right' ? 'right' : (u.tekis === 'center' ? 'center' : 'left'),
        lineBreak:false });
  });
  doc.lineWidth(0.35).strokeColor(C.hair)
     .moveTo(M, y + bal).lineTo(M + JADVAL_EN, y + bal).stroke();
  doc.restore();
  return y + bal;
}

function yakunQator(doc, y, bol, soni, summa, kechSumma){
  const bal = 17;
  doc.save();
  doc.rect(M, y, JADVAL_EN, bal).fill('#EFF2F6');
  doc.rect(M, y, 2, bal).fill(bol.rang);
  doc.font('Helvetica-Bold').fontSize(6.8).fillColor(C.ink)
     .text('YAKUN — ' + bol.nom + ': ' + soni + ' ta shartnoma', M + 8, y + 5.6,
           { width: 340, lineBreak:false });
  doc.font('Helvetica-Bold').fontSize(6.8).fillColor(bol.rang)
     .text('Jami qarz: ' + fmtMoney(summa)
         + (kechSumma ? '      Kechikkan: ' + fmtMoney(kechSumma) : ''),
           M + 350, y + 5.6, { width: JADVAL_EN - 358, align:'right', lineBreak:false });
  doc.lineWidth(0.6).strokeColor(C.rule)
     .moveTo(M, y + bal).lineTo(M + JADVAL_EN, y + bal).stroke();
  doc.restore();
  return y + bal + 6;
}

function bolimQator(doc, y, bol, soni){
  doc.save();
  doc.rect(M, y, JADVAL_EN, 15).fill(bol.rang);
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF')
     .text(bol.nom + '   (' + soni + ' ta)', M + 8, y + 4.6, { width: 400, lineBreak:false });
  doc.font('Helvetica').fontSize(6.2).fillColor('#FFFFFF')
     .text(bol.izoh, M + JADVAL_EN - 260, y + 5, { width: 252, align:'right', lineBreak:false });
  doc.restore();
  return y + 15;
}

/* ---- Sarlavha (1-sahifa) ---------------------------------------------- */
function sarlavha(doc, hisob, sana){
  doc.save();
  doc.rect(M, M, CW, 40).fill(C.ink);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#FFFFFF')
     .text(SELLER_NAME, M + 12, M + 9);
  doc.font('Helvetica').fontSize(7).fillColor('#C9D0DC')
     .text(SELLER_SITE + '   ·   bo‘lib to‘lash bo‘limi', M + 12, M + 25);
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#FFFFFF')
     .text('BO‘LIB TO‘LASH SHARTNOMALARI REESTRI', M + 190, M + 10,
           { width: CW - 200, align:'right' });
  doc.font('Helvetica').fontSize(7).fillColor('#C9D0DC')
     .text('Tuzilgan: ' + sana + '   ·   faqat faol shartnomalar', M + 190, M + 25,
           { width: CW - 200, align:'right' });
  doc.restore();

  let y = M + 48;
  /* Umumiy ko'rsatkichlar — bitta qatorda 8 ta katak */
  const kataklar = [
    ['JAMI SHARTNOMA', String(hisob.jami), C.ink],
    ['MUAMMOLI',       String(hisob.muammoli), '#8B1A14'],
    ['KECHIKKAN',      String(hisob.overdue), C.overdue],
    ['YAQIN 7 KUN',    String(hisob.soon), C.accent],
    ['JADVAL BO‘YICHA', String(hisob.ok), C.paid],
    ['UMUMIY QARZDORLIK', fmtMoney(hisob.jamiQarz), C.ink],
    ['KECHIKKAN SUMMA',   fmtMoney(hisob.kechSumma), C.overdue],
    ['OYLIK TUSHUM',      fmtMoney(hisob.oylik), C.paid]
  ];
  const kEn = (CW - 7 * 5) / 8;
  kataklar.forEach((k, i) => {
    const x = M + i * (kEn + 5);
    doc.save();
    doc.roundedRect(x, y, kEn, 32, 3).fill('#F5F7FA');
    doc.roundedRect(x, y, 2, 32, 1).fill(k[2]);
    doc.font('Helvetica').fontSize(5.4).fillColor(C.muted)
       .text(k[0], x + 6, y + 5.5, { width: kEn - 10, lineBreak:false, ellipsis:true });
    doc.font('Helvetica-Bold').fontSize(i < 5 ? 13 : 9).fillColor(k[2])
       .text(k[1], x + 6, y + (i < 5 ? 13 : 16), { width: kEn - 10, lineBreak:false, ellipsis:true });
    doc.restore();
  });
  y += 38;
  doc.font('Helvetica').fontSize(6).fillColor(C.muted)
     .text('Yakunlangan va bekor qilingan shartnomalar reestrga kiritilmaydi. '
         + '"BELGI" ustuni — qog‘ozda qo‘lda belgilash uchun. '
         + 'Har bir mijozning to‘liq oylik jadvali va QR kodi hujjatning 2-qismida.',
           M, y, { width: CW });
  return y + 12;
}

/* ==========================================================================
   2-QISM: har bir mijozning to'liq jadvali (sahifada ikkitadan)
   ========================================================================== */
function oylarChiz(doc, a, x, y, en, now){
  const n = Math.max(1, a.total);
  const qatorda = n <= 12 ? 12 : 18;
  const kat = Math.min(15, (en - (qatorda - 1) * 1.6) / qatorda);
  doc.save();
  for(let i = 0; i < n; i++){
    const p = a.payments[i] || {};
    const r = Math.floor(i / qatorda), c = i % qatorda;
    const cx = x + c * (kat + 1.6), cy = y + r * (kat + 1.6);
    let fon = '#EEF1F6', ink = C.muted;
    if(p.status === 'paid'){ fon = '#DCF0E5'; ink = C.paid; }
    else if(p.dueDate && p.dueDate < now){ fon = '#FBE2E0'; ink = C.overdue; }
    doc.roundedRect(cx, cy, kat, kat, 1.6).fill(fon);
    doc.font('Helvetica-Bold').fontSize(kat * 0.45).fillColor(ink)
       .text(String(i + 1), cx, cy + kat * 0.27, { width: kat, align:'center', lineBreak:false });
  }
  doc.restore();
  return Math.ceil(n / qatorda) * (kat + 1.6);
}

function tafsilotBloki(doc, d, a, tartib, x, y, en, now){
  const qrO = 38;
  const matnEn = en - qrO - 20;
  const bol = BOLIMLAR.find(b => b.key === a.state) || BOLIMLAR[3];

  doc.font('Helvetica-Bold').fontSize(8.4).fillColor(C.ink)
     .text(tartib + '. ' + qisqart(doc, d.customerName || 'Nomsiz mijoz', matnEn - 60,
           'Helvetica-Bold', 8.4).toUpperCase(), x + 7, y + 6, { lineBreak:false });

  const holatMatn = HOLAT_NOM[a.state] + (a.days ? ' · ' + a.days + ' kun' : '');
  doc.font('Helvetica-Bold').fontSize(5.6);
  const hw = doc.widthOfString(holatMatn) + 8;
  doc.save().roundedRect(x + 7 + matnEn - hw, y + 5.5, hw, 9, 2).fill(bol.rang);
  doc.fillColor('#FFFFFF').text(holatMatn, x + 7 + matnEn - hw, y + 7.6,
     { width: hw, align:'center', lineBreak:false });
  doc.restore();

  doc.font('Helvetica').fontSize(6.2).fillColor(C.muted)
     .text(qisqart(doc, [d.number, d.customerPhone,
            d.contractId ? 'Shartnoma ' + d.contractId : ''].filter(Boolean).join('  ·  '),
            matnEn, 'Helvetica', 6.2), x + 7, y + 18, { lineBreak:false });

  const u = [
    ["Oylik", fmtMoney(a.monthly, d.currency)],
    ["To'langan", a.paid + ' / ' + a.total],
    ['Qolgan', a.left + ' oy'],
    ['Qarz', fmtMoney(a.debt, d.currency)]
  ];
  const uEn = matnEn / 4;
  u.forEach((it, i) => {
    const ux = x + 7 + i * uEn;
    doc.font('Helvetica').fontSize(5.2).fillColor(C.muted)
       .text(it[0].toUpperCase(), ux, y + 29, { width: uEn - 4, lineBreak:false });
    doc.font('Helvetica-Bold').fontSize(7.2).fillColor(i === 3 && a.state !== 'ok' ? bol.rang : C.ink)
       .text(qisqart(doc, it[1], uEn - 4, 'Helvetica-Bold', 7.2), ux, y + 36, { lineBreak:false });
  });

  const jy = y + 47;
  const jBal = oylarChiz(doc, a, x + 7, jy, matnEn, now);

  const ky = jy + jBal + 4;
  let keyingi = a.next
    ? 'Keyingi: ' + fmtDate(a.next.dueDate) + ' — ' + fmtMoney(a.monthly, d.currency)
      + (a.overdueCount > 1 ? '  (' + a.overdueCount + ' oy to‘lanmagan)' : '')
    : 'Barcha oylar to‘langan.';
  doc.font('Helvetica').fontSize(6).fillColor(a.state === 'ok' ? C.muted : bol.rang)
     .text(qisqart(doc, keyingi, matnEn, 'Helvetica', 6), x + 7, ky, { lineBreak:false });

  /* Qo'lda to'ldirish uchun joy */
  const iy = ky + 10;
  doc.font('Helvetica').fontSize(5.6).fillColor(C.muted);
  doc.text('To‘landi:', x + 7, iy, { lineBreak:false });
  doc.text('Sana:',     x + 7 + matnEn * 0.34, iy, { lineBreak:false });
  doc.text('Imzo:',     x + 7 + matnEn * 0.66, iy, { lineBreak:false });
  doc.save().lineWidth(0.4).strokeColor(C.hair);
  [[0.09, 0.32],[0.42, 0.63],[0.74, 0.99]].forEach(([a1, a2]) => {
    doc.moveTo(x + 7 + matnEn * a1, iy + 6.5).lineTo(x + 7 + matnEn * a2, iy + 6.5).stroke();
  });
  doc.restore();

  const havola = qrHavola(d.contractId || d.id);
  if(havola) qrChiz(doc, havola, x + en - qrO - 7, y + 6, qrO);

  const bal = Math.max(iy + 14 - y, qrO + 14);
  doc.save().lineWidth(0.5).strokeColor(C.hair).roundedRect(x, y, en, bal, 4).stroke();
  doc.roundedRect(x, y, 2.2, bal, 1.1).fill(bol.rang);
  doc.restore();
  return bal;
}

/* ---- Kolontitul -------------------------------------------------------- */
function kolontitul(doc, sahifa, jami, sana){
  doc.save().lineWidth(0.5).strokeColor(C.hair)
     .moveTo(M, PAST).lineTo(M + CW, PAST).stroke();
  doc.font('Helvetica').fontSize(6).fillColor(C.muted);
  doc.text(SELLER_NAME + ' · bo‘lib to‘lash reestri · ' + sana
         + ' · shaxsiy ma’lumotlar — faqat xizmat uchun',
           M, PAST + 6, { width: CW * 0.7, lineBreak:false });
  doc.text(sahifa + ' / ' + jami, M + CW * 0.7, PAST + 6,
           { width: CW * 0.3, align:'right', lineBreak:false });
  doc.restore();
}

/* ==========================================================================
   ASOSIY
   ========================================================================== */
function buildReestrPdfBuffer(contracts, opts){
  const now = (opts && opts.now) || Date.now();
  return new Promise((bajar, rad) => {
    try{
      const ro = [];
      (Array.isArray(contracts) ? contracts : []).forEach(d => {
        const a = tahlil(d, now);
        if(a.state === 'done') return;         /* arxiv reestrga kirmaydi */
        ro.push({ d, a });
      });

      const hisob = { jami: ro.length, muammoli:0, overdue:0, soon:0, ok:0,
                      jamiQarz:0, kechSumma:0, oylik:0 };
      ro.forEach(({a}) => {
        hisob[a.state]++;
        hisob.jamiQarz += a.debt;
        hisob.kechSumma += a.overdueSum;
        hisob.oylik += a.monthly;
      });

      const d0 = new Date(now);
      const ik = n => String(n).padStart(2, '0');
      const sana = ik(d0.getDate()) + '.' + ik(d0.getMonth()+1) + '.' + d0.getFullYear()
                 + '  ' + ik(d0.getHours()) + ':' + ik(d0.getMinutes());

      const doc = new PDFDocument({ size:[PAGE_W, PAGE_H], margin:0, bufferPages:true,
        info:{ Title:'Bo‘lib to‘lash reestri', Author:SELLER_NAME } });
      const boshlar = [];
      doc.on('data', c => boshlar.push(c));
      doc.on('end', () => bajar(Buffer.concat(boshlar)));

      /* ---------- 1-QISM: ASOSIY JADVAL ---------- */
      let y = sarlavha(doc, hisob, sana);
      let tartib = 0;
      const guruhlar = {};
      BOLIMLAR.forEach(bol => {
        guruhlar[bol.key] = ro.filter(x => x.a.state === bol.key);
        guruhlar[bol.key].sort((x, yy) => {
          if(bol.key === 'soon') return x.a.days - yy.a.days;
          if(bol.key === 'ok')   return yy.a.debt - x.a.debt;
          return yy.a.days - x.a.days;
        });
      });

      const kochir = ()=>{ doc.addPage(); return M; };

      BOLIMLAR.forEach(bol => {
        const g = guruhlar[bol.key];
        if(!g.length) return;
        if(y + 60 > PAST) y = kochir();
        y = bolimQator(doc, y, bol, g.length);
        y = jadvalBosh(doc, y);
        let bQarz = 0, bKech = 0;
        g.forEach((x, idx) => {
          if(y + 16 > PAST){ y = kochir(); y = jadvalBosh(doc, y); }
          tartib++;
          x.__tartib = tartib;
          bQarz += x.a.debt; bKech += x.a.overdueSum;
          jadvalQator(doc, y, {
            n: tartib,
            ism: x.d.customerName || '—',
            pasport: x.d.passportNumber || '—',
            manzil: x.d.permanentAddress || '—',
            raqam: x.d.number || '—',
            shart: x.d.contractId || '—',
            oylik: fmtMoney(x.a.monthly, x.d.currency),
            oy: x.a.paid + ' / ' + x.a.total,
            qarz: fmtMoney(x.a.debt, x.d.currency),
            keyingi: x.a.next ? fmtDate(x.a.next.dueDate) : '—',
            holat: HOLAT_NOM[x.a.state] + (x.a.days ? ' ' + x.a.days + 'k' : ''),
            __qarzRang: x.a.state === 'ok' ? C.body : bol.rang
          }, bol.rang, idx % 2 === 1, now);
          y += 15;
        });
        if(y + 24 > PAST) y = kochir();
        y = yakunQator(doc, y, bol, g.length, bQarz, bKech);
      });

      /* ---------- 2-QISM: HAR BIR MIJOZNING TO'LIQ JADVALI ---------- */
      const sahifada = {};            /* ism -> sahifa raqami (ko'rsatkich uchun) */
      if(ro.length){
        doc.addPage();
        y = M;
        doc.save();
        doc.rect(M, y, CW, 18).fill(C.ink);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text('2-QISM. HAR BIR MIJOZNING TO‘LIQ TO‘LOV JADVALI',
                 M + 8, y + 5.6, { width: CW - 16, lineBreak:false });
        doc.restore();
        y += 24;

        const ustunEn = (CW - 10) / 2;
        let ustun = 0, qatorBal = 0;
        BOLIMLAR.forEach(bol => {
          guruhlar[bol.key].forEach(x => {
            const oylar = Math.max(1, x.a.total);
            const qatorlar = Math.ceil(oylar / (oylar <= 12 ? 12 : 18));
            const taxmin = 75 + qatorlar * 17;
            if(ustun === 0 && y + taxmin > PAST){ doc.addPage(); y = M; qatorBal = 0; }
            const bx = M + ustun * (ustunEn + 10);
            const bal = tafsilotBloki(doc, x.d, x.a, x.__tartib, bx, y, ustunEn, now);
            qatorBal = Math.max(qatorBal, bal);
            sahifada[x.__tartib] = doc.bufferedPageRange().count;
            ustun++;
            if(ustun === 2){ ustun = 0; y += qatorBal + 7; qatorBal = 0; }
          });
        });
        if(ustun === 1) y += qatorBal + 7;
      }

      /* ---------- 3-QISM: ALIFBO KO'RSATKICHI ---------- */
      if(ro.length){
        doc.addPage();
        y = M;
        doc.save();
        doc.rect(M, y, CW, 18).fill(C.ink);
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF')
           .text('3-QISM. ALIFBO KO‘RSATKICHI — ism bo‘yicha qidirish',
                 M + 8, y + 5.6, { width: CW - 16, lineBreak:false });
        doc.restore();
        y += 24;

        const hammasi = [];
        BOLIMLAR.forEach(bol => guruhlar[bol.key].forEach(x => hammasi.push(x)));
        hammasi.sort((a1, a2) =>
          wa(a1.d.customerName || '').localeCompare(wa(a2.d.customerName || '')));

        const ustunlar = 4;
        const uEn = (CW - (ustunlar - 1) * 10) / ustunlar;
        const qatorBalandlik = 11;
        const sigadi = Math.floor((PAST - y - 6) / qatorBalandlik);
        /* Ro'yxat to'rtta ustunga TENG bo'linadi. Ilgari birinchi ustun
           to'lguncha yozardi — 40 ta ism bitta ustunda qolib, qolgan
           uchtasi bo'sh turardi (sinovda ko'rindi). */
        const ustunda = Math.max(1, Math.min(sigadi, Math.ceil(hammasi.length / ustunlar)));
        let i = 0;
        while(i < hammasi.length){
          for(let c = 0; c < ustunlar && i < hammasi.length; c++){
            const x = M + c * (uEn + 10);
            for(let r = 0; r < ustunda && i < hammasi.length; r++, i++){
              const it = hammasi[i];
              const yy = y + r * qatorBalandlik;
              if(r % 2 === 1) doc.save().rect(x, yy, uEn, qatorBalandlik).fill(C.zebra).restore();
              doc.font('Helvetica').fontSize(6.4).fillColor(C.body)
                 .text(qisqart(doc, it.d.customerName || '—', uEn - 54, 'Helvetica', 6.4),
                       x + 4, yy + 3, { lineBreak:false });
              doc.font('Helvetica-Bold').fontSize(6.4).fillColor(C.muted)
                 .text('T/R ' + it.__tartib + '  ·  ' + (sahifada[it.__tartib] || '—') + '-bet',
                       x + uEn - 54, yy + 3, { width: 50, align:'right', lineBreak:false });
            }
          }
          if(i < hammasi.length){ doc.addPage(); y = M; }
          else break;
        }
      }

      if(!ro.length){
        doc.font('Helvetica').fontSize(10).fillColor(C.muted)
           .text('Hozircha faol shartnoma yo‘q.', M, y + 30, { width: CW, align:'center' });
      }

      const range = doc.bufferedPageRange();
      for(let i = 0; i < range.count; i++){
        doc.switchToPage(range.start + i);
        kolontitul(doc, i + 1, range.count, sana);
      }
      doc.end();
    }catch(e){ rad(e); }
  });
}

module.exports = { buildReestrPdfBuffer, tahlil, MUAMMO_KUN };
