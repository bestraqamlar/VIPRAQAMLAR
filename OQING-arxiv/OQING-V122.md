# V122 — SANA TARTIBI (kun.oy.yil) + QR TUZATISHI + OMBOR TOZALANDI

## 1. Sana endi hamma joyda KUN.OY.YIL
### Sabab
Hamma joyda `toLocaleDateString('uz-UZ')` ishlatilardi. O'zbek lokali
muhitga qarab TURLICHA ishlaydi — brauzerda o'lchab tekshirildi:

    uz-UZ (Chrome) ->  2026-03-09     TESKARI (ISO tartibi)
    uz-UZ (Node)   ->  09/03/2026     kun oldinda, lekin chiziq bilan
    ru-RU          ->  09.03.2026     to'g'ri

Ya'ni bitta loyihada uch xil ko'rinish bor edi va admin sanani teskari
ko'rardi. Eng yomoni: buyurtma vaqti shu teskari ko'rinishda BAZAGA
yozilardi, keyin esa adminda ham, Telegram xabarida ham teskari
chiqardi.

### Tuzatish
Lokalga umuman tayanmaymiz — sanani O'ZIMIZ yig'amiz, shunda u har
qanday brauzerda, har qanday til sozlamasida bir xil chiqadi:

    admin paneli ....... assets/panel.js   -> sanaUz / sanaVaqtUz
    mijoz sayti ........ index.html        -> sanaUz / sanaVaqtUz
    diler kabineti ..... sotuvchi.html     -> sanaVaqtUz
    server funksiyalari  netlify/functions/lib/sana.js (YANGI)

Server tomonidagi modulda vaqt mintaqasi ATAYLAB ko'rsatilgan
(Asia/Tashkent): Netlify UTC bo'yicha ishlaydi, shu sabab kechqurun
yozilgan buyurtma "ertangi kun" bo'lib ketmasligi uchun.

Jami 8 ta funksiya va 3 ta sahifa shu tartibga o'tkazildi.
Shartnoma PDF'i allaqachon kun.oy.yil edi — tegilmadi.

## 2. Sana MAYDONLARI ham kun.oy.yil bo'lib ko'rinadi
`<input type="date">` ni brauzer O'ZI chizadi va qaysi tartibda
ko'rsatishni BRAUZER TILI hal qiladi. Sinab ko'rildi: elementga
`lang="ru-RU"` qo'yish ham yordam bermaydi — Chrome baribir o'z
interfeys tilidagi tartibni ishlatadi.

Yechim: asl `type="date"` maydoni DOM da QOLADI (ko'rinmaydi) — demak
uni o'qiydigan/yozadigan butun mavjud kod o'zgarmasdan ishlayveradi.
Uning ustiga oddiy MATN maydoni qo'yiladi: `kun.oy.yil` ko'rinishida,
yozilayotganda nuqtalar o'zi qo'yiladi, yonida esa taqvim tugmasi.

Nozik joy ham hal qilindi: mavjud kod ba'zan `el.value = '2026-10-26'`
deb to'g'ridan-to'g'ri yozadi (formani tozalaganda). Shu element
uchun `value` xossasi ustidan yozildi — qiymat o'zgarishi bilan matn
maydoni ham yangilanadi.

Brauzerda tekshirildi:
    boshlang'ich qiymat ....... 09.03.2026  (asl: 2026-03-09)
    qo'lda yozildi "15081990" .. 15.08.1990  (asl: 1990-08-15)
    kod orqali o'zgartirildi ... 31.12.2027  (asl: 2027-12-31)
    yarim sana + blur ......... eski qiymatga qaytdi (yarim sana saqlanmaydi)
JavaScript xatosi yo'q.

Yangi qo'shilgan sana maydonlari (masalan "Kredit" bo'limidagi
tahrirlash formasi) ham avtomatik o'zgaradi — kuzatuvchi qo'yilgan.

## 3. QR kod tuzatildi
Qarang: OQING-V121.md — `_redirects` dagi `:i`/`:k` o'rin egallari
funksiyaga yetib bormasdi. Endi yo'l butunlay funksiyaga uzatiladi va
u shartnoma raqami bilan imzoni yo'lning o'zidan o'qiydi. 7 xil
holatda tekshirildi.

## 4. Omborda 72 ta keraksiz fayl topildi
Omborning ILDIZIGA `netlify/functions/`, `netlify/functions/lib/`,
`netlify/edge-functions/` va `assets/` papkalaridagi fayllarning ESKI
nusxalari yuklab qo'yilgan ekan — jami 72 ta. Netlify ularni
ishlatmaydi (funksiyalarni faqat `netlify/functions/` dan, panelni
`assets/panel.js` dan oladi), lekin ichida eski, tuzatilmagan kod bor
edi va keyingi yuklashda adashtirishi mumkin edi.

Hammasi `_eski-nusxalar/` papkasiga ko'chirildi (nomi `_` bilan
boshlangani uchun saytga aralashmaydi). Ichida tushuntirish ham bor.

Ildizda ATAYLAB qoldirilganlar: `sw.js` (oflayn rejim — ildizdan
tashqarida ishlamaydi) va `firebase-messaging-sw.js` (push).

Shu papkada `telegram-ilova.html` ham bor: siz uni V120 da olib
tashlashni so'ragan edingiz, lekin ombor qayta yuklanganda u ildizga
qaytib kelib, yana ochiq bo'lib qolgandi. Endi yopildi.
