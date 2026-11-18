// SANA FORMATI — KUN.OY.YIL (V121)
// ================================
// NEGA ALOHIDA MODUL. Hamma joyda `toLocaleString('uz-UZ')`
// ishlatilardi. Muammo shundaki, o'zbek lokali muhitga qarab turlicha
// ishlaydi:
//   * brauzerda (Chrome)  -> "2026-03-09"   (TESKARI, ISO tartibi)
//   * Node'da             -> "09/03/2026"   (kun oldinda, lekin chiziq)
// Ya'ni bitta loyihada uch xil ko'rinish paydo bo'lardi va admin
// sanani teskari ko'rardi. Endi sana O'ZIMIZDA yig'iladi — qayerda
// ishlashidan qat'i nazar BIR XIL: kun.oy.yil.
//
// Vaqt mintaqasi: Toshkent (UTC+5). Server Netlify'da UTC bo'yicha
// ishlaydi, shu sabab mintaqa ATAYLAB ko'rsatiladi — aks holda
// kechqurun yozilgan buyurtma "ertangi kun" bo'lib ketardi.

const MINTAQA = 'Asia/Tashkent';

function qismlar(x) {
  const d = (x instanceof Date) ? x : new Date(x);
  if (!d || isNaN(d.getTime())) return null;
  /* en-GB ataylab: u har doim kun/oy/yil beradi va Node'da ham,
     brauzerda ham bir xil ishlaydi. Keyin chiziqni nuqtaga almashtiramiz. */
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: MINTAQA, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d).reduce((a, x2) => (a[x2.type] = x2.value, a), {});
  return p;
}

/** "09.03.2026" */
function sanaUz(x) {
  const p = qismlar(x);
  return p ? (p.day + '.' + p.month + '.' + p.year) : '';
}

/** "09.03.2026, 14:30" */
function sanaVaqtUz(x) {
  const p = qismlar(x);
  return p ? (p.day + '.' + p.month + '.' + p.year + ', ' + p.hour + ':' + p.minute) : '';
}

module.exports = { sanaUz, sanaVaqtUz, MINTAQA };
