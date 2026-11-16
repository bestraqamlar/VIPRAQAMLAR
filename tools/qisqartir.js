#!/usr/bin/env node
/* ==================================================================
   DEPLOY PAYTIDA FAYLLARNI QISQARTIRISH (V147)
   ==================================================================

   MUAMMO. Kod ichidagi izohlar — bu loyihaning eng qimmatli qismi:
   har bir qaror NEGA shunday qilingani yozib qo'yilgan. Lekin ular
   mijozning telefoniga ham yuklanadi va joy egallaydi.

   O'LCHOV (siqilgan holda, ya'ni mijoz haqiqatan yuklaydigan hajm):
       assets/app.js      122.3 KB  ->   70.8 KB   (-42%)
       assets/panel.js    167.1 KB  ->  110.3 KB   (-34%)
       assets/sayt.css     12.8 KB  ->   12.5 KB
       assets/panel.css    65.9 KB  ->   63.2 KB
       ------------------------------------------------
       JAMI               368.1 KB  ->  256.7 KB   (-30%)

   YECHIM. Izohlar OMBORDA (GitHub'da) to'liq qoladi — ular o'chmaydi.
   Bu skript faqat NETLIFY DEPLOY paytida, vaqtinchalik nusxada
   ishlaydi va izohlar bilan bo'sh joyni olib tashlaydi.

   NIMA QILINMAYDI. Kod QAYTA YOZILMAYDI va nomlar QISQARTIRILMAYDI
   (`compress:false, mangle:false`). Ya'ni bu "minifikatsiya" emas,
   faqat izoh va bo'sh joy tozalash — xatti-harakat 100% o'zgarmaydi.
   Shu sabab xatolik ehtimoli deyarli yo'q.

   XAVFSIZLIK. Har bir fayl alohida `try/catch` ichida. Biror fayl
   bilan muammo bo'lsa — U FAYL O'Z HOLICHA QOLADI va deploy davom
   etadi. Skript hech qachon deployni to'xtatmaydi (har doim 0 bilan
   tugaydi).
   ================================================================== */

const fs = require('fs');
const path = require('path');

const JS_FAYL  = ['assets/app.js', 'assets/panel.js'];
const CSS_FAYL = ['assets/sayt.css', 'assets/panel.css', 'assets/panel-mobil.css'];
/* `index.html` ichidagi <style> bloklari ham tozalanadi */
const HTML_FAYL = ['index.html'];

const KB = (n) => (n / 1024).toFixed(1) + ' KB';
let tejov = 0, xato = 0;

function oqi(f) { return fs.readFileSync(f, 'utf8'); }
function yoz(f, t, oldin) {
  fs.writeFileSync(f, t);
  const farq = Buffer.byteLength(oldin) - Buffer.byteLength(t);
  tejov += farq;
  console.log('  ' + f.padEnd(20) + KB(Buffer.byteLength(oldin)).padStart(10) +
              '  ->' + KB(Buffer.byteLength(t)).padStart(10));
}

async function main() {
  let terser = null, CleanCSS = null;
  try { terser = require('terser'); } catch (e) { console.log('  (terser yo\'q — JS tegilmaydi)'); }
  try { CleanCSS = require('clean-css'); } catch (e) { console.log('  (clean-css yo\'q — CSS tegilmaydi)'); }

  /* ---- JS ---- */
  if (terser) {
    for (const f of JS_FAYL) {
      try {
        if (!fs.existsSync(f)) continue;
        const s = oqi(f);
        const r = await terser.minify(s, {
          compress: false,      /* kodni QAYTA YOZMAYDI */
          mangle: false,        /* nomlarni O'ZGARTIRMAYDI */
          format: { comments: false },
          sourceMap: false
        });
        if (r.error || !r.code || r.code.length < s.length * 0.3) {
          /* Natija shubhali darajada kichik bo'lsa — tegmaymiz */
          console.log('  ' + f + ': natija shubhali, o\'z holicha qoldirildi');
          xato++; continue;
        }
        yoz(f, r.code, s);
      } catch (e) { console.log('  ' + f + ': ' + e.message + ' — o\'z holicha qoldirildi'); xato++; }
    }
  }

  /* ---- CSS ---- */
  if (CleanCSS) {
    for (const f of CSS_FAYL) {
      try {
        if (!fs.existsSync(f)) continue;
        const s = oqi(f);
        const o = new CleanCSS({ level: 0, format: false }).minify(s);
        if (o.errors && o.errors.length) { console.log('  ' + f + ': xato, tegilmadi'); xato++; continue; }
        if (!o.styles || o.styles.length < s.length * 0.3) { xato++; continue; }
        yoz(f, o.styles, s);
      } catch (e) { console.log('  ' + f + ': ' + e.message); xato++; }
    }
  }

  /* ---- HTML ichidagi <style> bloklari ----
     FAQAT uslublar tozalanadi. HTML va ichki <script> larga TEGILMAYDI:
     ular bilan ishlash xavfliroq, foydasi esa kichik. */
  if (CleanCSS) {
    for (const f of HTML_FAYL) {
      try {
        if (!fs.existsSync(f)) continue;
        const s = oqi(f);
        const t = s.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, a, ichi, b) => {
          try {
            const o = new CleanCSS({ level: 0, format: false }).minify(ichi);
            if (o.errors && o.errors.length) return m;
            if (!o.styles || o.styles.length < ichi.length * 0.3) return m;
            return a + o.styles + b;
          } catch (e) { return m; }
        });
        if (t !== s) yoz(f, t, s);
      } catch (e) { console.log('  ' + f + ': ' + e.message); xato++; }
    }
  }

  console.log('  ------------------------------------------------');
  console.log('  Jami tejaldi: ' + KB(tejov) + (xato ? ('   (' + xato + ' ta fayl tegilmadi)') : ''));
}

main().catch(e => {
  /* Hech qanday holatda deployni to'xtatmaymiz */
  console.log('  Qisqartirish bajarilmadi: ' + (e && e.message));
}).then(() => process.exit(0));
