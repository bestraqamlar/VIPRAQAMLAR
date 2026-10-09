// RAQAMLAR INDEKSINING IXCHAM FORMATI.
//
// MUAMMO: sayt ochilganda brauzer butun `numbers` to'plamini JSON
// ko'rinishida yuklab olardi — bitta raqam ~319 bayt. 10 000 raqam = 3 MB,
// va bu HAR BIR tashrifda qaytadan yuklanardi (ham sekin, ham Firestore
// o'qish hisobi).
//
// YECHIM: raqamlar bitta qatorga "qadoqlanadi" — har raqam ~55 bayt
// (6 barobar kichik), ustiga gzip tushadi (yana ~5 barobar). Natijada
// 10 000 raqam ~120 KB bo'lib keladi.
//
// Format (har satr bitta raqam, "\n" bilan ajratilgan):
//
//   id | 9ta raqam | operatorIndeksi | narx | eskiNarx | bayroqlar | toifa | qo'shimcha
//
//   bayroqlar — bitlar: 1=band, 2=bo'lib to'lash, 4=tanlangan, 8=kun tavsiyasi
//   toifa     — ro'yxatdagi indeks ('' , premium, gold, vip, silver)
//   qo'shimcha — faqat KERAK BO'LGANDA to'ldiriladi: m6/m12/m24 (oylik),
//                d6/d12/d24 (kun tavsiyasi oyligi), c (valyuta),
//                op (operator narxi), nt (izoh)
//
// Shu fayl HAM serverda (api-index.js), HAM brauzerda ishlatiladi —
// format bir joyda turishi uchun. Brauzerdagi nusxasi index.html ichiga
// qo'yilgan; o'zgartirsangiz IKKALASINI ham yangilang.

const TIERS = ['', 'premium', 'gold', 'vip', 'silver', 'bronze'];

const ESC = (s) => encodeURIComponent(String(s == null ? '' : s));

/** Bitta Firestore hujjatini bitta satrga aylantiradi. */
function packRow(id, x, opIdx) {
  let flags = 0;
  if (x.reserved) flags |= 1;
  if (x.installment) flags |= 2;
  if (x.featured) flags |= 4;
  if (x.dailyDeal) flags |= 8;

  const extra = [];
  const put = (k, v) => { if (v != null && v !== '' && v !== 0 && v !== false) extra.push(k + '=' + ESC(v)); };
  put('m6', x.monthly6); put('m12', x.monthly12); put('m24', x.monthly24);
  put('d6', x.dealMonthly6); put('d12', x.dealMonthly12); put('d24', x.dealMonthly24);
  put('c', x.currency); put('op', x.operatorPrice); put('nt', x.note);
  put('de', x.dealExpiresAt);

  const ti = Math.max(0, TIERS.indexOf(String(x.tier || '').toLowerCase()));
  const digits = String(x.number || '').replace(/\D/g, '').slice(-9);

  return [
    id,
    digits,
    opIdx,
    Math.round(Number(x.price) || 0),
    Math.round(Number(x.oldPrice) || 0) || '',
    flags || '',
    ti || '',
    extra.join(',')
  ].join('|');
}

/**
 * Hujjatlar ro'yxatidan to'liq indeks hosil qiladi.
 * docs: [{id, data}]
 */
function buildIndex(docs) {
  const ops = [];
  const opIdx = (name) => {
    const n = String(name || '');
    let i = ops.indexOf(n);
    if (i === -1) { ops.push(n); i = ops.length - 1; }
    return i;
  };
  const rows = [];
  for (const d of docs) {
    const x = d.data || {};
    if (x.hidden) continue;                 // admin yashirgan raqam saytda ko'rinmaydi
    rows.push(packRow(d.id, x, opIdx(x.operator)));
  }
  return { ops, rows: rows.join('\n'), count: rows.length };
}

module.exports = { buildIndex, packRow, TIERS };
