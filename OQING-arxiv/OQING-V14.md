# VIP RAQAMLAR — v14

## Shu versiyada nima o'zgardi

### 1. Mavzu tanlash bo'limi butunlay olib tashlandi
- Profil > "Ko'rinish" bo'limi yo'q.
- Yuqoridagi oq/qora tugmalar (mobil apbar va kompyuter header) olib tashlandi.

### 2. Faqat tungi (dark) mavzu
- `<html data-theme="dark">` — sayt doimo tungi rejimda ochiladi.
- `color-scheme`, `theme-color` ham dark.
- Mavzu JS tizimi (localStorage, Telegram colorScheme) olib tashlandi.
- Kontrast tekshiruvi: 31 ta element, 0 ta xato (WCAG).

### 3. Instagram kanal — hamma joyda `vipraqamlar.uz`
- Profildagi Instagram plitkasi: `https://instagram.com/vipraqamlar.uz`, `@vipraqamlar.uz`.
- `netlify/functions/order-status-webhook.js` ichidagi kanal havolasi ham yangilandi.

### 4. Buyurtma va shartnoma oynalari zamonaviylashtirildi
**Buyurtmalarim:**
- Yuqorida tushuntirish bannери + ko'rsatma bloki (qidiruvdan oldin).
- Natijalar: chap tomonida rangli holat chizig'i bo'lgan kartochka, holat tegi
  (Yangi / Bog'lanildi / Yakunlandi / Bekor qilindi — har biri o'z rangida),
  katta raqam, to'lov turi va summa.

**Shartnomalarim:**
- SVG aylana progress (necha oydan nechtasi to'langan, foizda).
- Holat bloki va to'lovlar jadvali yangi `.payrow` ko'rinishida.
- Qidiruvdan oldin ko'rsatma bloki.

### 5. "Bo'lib to'lashga raqamlar" plitkasi olib tashlandi
- Profil bo'limidan plitka va unga tegishli `[data-installgo]` handler o'chirildi.
- Bo'lib to'lash filtri katalogda saqlanib qoldi (saralashda birinchi turadi).

## Tekshiruvlar
- JS sintaksis: 0 xato
- CSS qavslar balansi: 0
- Kontrast (WCAG): 0 xato
- Qidiruv oqimi, karusel surish, xarita, bo'lib to'lash filtri, ruscha til: hammasi OK

## Backend
Backend (Netlify funksiyalari, Firestore qoidalari, admin panel, Telegram ilova)
o'zgartirilmadi — faqat yuqoridagi Instagram havolasi yangilandi.

## Joylash
Bu papkani Netlify'ga deploy qiling. Sayt deploy qilingandan keyin o'zgaradi.

---

## v14.1 — qidiruv kataklari

- Raqam yozilgan katak endi **ko'k fonda** turadi (gradient + ko'k chegara + yengil nur),
  bo'sh katak esa qorong'i — nechta raqam kiritilgani darrov ko'rinadi.
- Katak ustida turganda (focus) fon yanada yorqinroq.
- Kataklar tagida **to'lish chizig'i** (0→100%) qo'shildi, har bir raqamda o'sib boradi.
- Ajratuvchi "–" belgilari ham o'sha qismga yetganda ko'k rangga o'tadi.
- Katak yonidagi **"x" (tozalash) tugmasi butunlay olib tashlandi** — kataklar
  butun kenglikni egallaydi va kattaroq bo'ldi.

## v14.3 — operatorlar qatori
- Har bir operator chipida endi **o'z logotipi** turadi (`assets/operators/*`),
  oq yumaloq plitka ichida; logotip topilmasa — avvalgi rangli harfli belgi.
- Chiplar kichraytirildi va zamonaviylashtirildi (balandlik 36→32px, matn 12.5→11.5px,
  oraliq 7→6px) — bir qatorda ko'proq operator ko'rinadi.
- `beeline.png`, `ucell.png`, `uzmobile.png` fayllaridagi shaffoflik o'rniga
  "shaxmat" naqshi tozalandi (endi haqiqiy shaffof PNG).
- "Hammasi" tanlanganda qator chap chekkadan boshlanadi (avval kesilib qolardi).

## v14.4
- Kataklar tagidagi **to'lish chizig'i olib tashlandi** (keraksiz edi) — katakning
  o'z ko'k foni to'lganini ko'rsatadi.
- Operatorlar qatori endi **kartochkalar bilan bir chiziqda** boshlanadi
  (avval ekran chetiga chiqib, "Hammasi" kesilib turardi). O'ng tomonda yana
  davom etishini bildiruvchi yengil soya qoldi.

## v14.5 — mavzu tanlash qaytarildi
- Profil > **Ko'rinish** bo'limida yana ikkita variant: **Tungi** va **Yorug'**.
- **Standart — tungi.** Hech qachon tanlamagan mijoz doim qora fonda ochadi.
- Mijoz "Yorug'"ni tanlasa — sayt oqaradi va bu tanlov eslab qolinadi
  (`localStorage: vip_theme`), keyingi kirishda ham o'sha mavzuda ochiladi.
  Qaytadan "Tungi"ni bossa — tungiga qaytadi.
- `<head>` ichida kichik skript bor: sahifa chizilishidan oldin mavzu qo'yiladi,
  shuning uchun ochilishda "oq chaqnash" bo'lmaydi.
- `theme-color` (telefon status paneli rangi) ham mavzuga qarab o'zgaradi.
- Yorug' mavzuda qidiruv kataklaridagi raqamlar rangi tuzatildi (avval oq edi).
- Kontrast: ikkala mavzuda ham 34 element, 0 xato.

## v14.6 — pastki menyu (Instagram uslubida)
- Menyu endi ekran chetlariga yopishgan panel emas, **suzib turuvchi kapsula**:
  chetlardan 14px, pastdan 10px uzilgan, to'liq dumaloq (999px), yengil soya bilan.
- **Yozuvlar olib tashlandi** — faqat ikonkalar (kattaroq, 24px). Faol bo'lim
  ikonkasi ostida yumshoq kapsula belgisi paydo bo'ladi (animatsiya bilan).
- Yangi ranglar: tungida to'q ko'k shaffof fon + oq ikonka, yorug'da oq fon + to'q ikonka.
- Sevimlilar soni belgisi (badge) ikonka ustida, menyu foni rangida halqa bilan.
