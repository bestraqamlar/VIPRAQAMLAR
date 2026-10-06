# VIP RAQAMLAR — v17

## Promokod olib tashlandi
**Saytdan (`index.html`):**
- Buyurtma oynasining 1-bosqichidagi promokod kiritish kartochkasi.
- Xulosadagi "Promokod chegirmasi" qatori.
- `applyPromo()` funksiyasi va `check-promo-code` so'rovi.
- `promo_usage` kolleksiyasiga yozish.
- `ORD.promo` / `ORD.discount` holatlari va ruscha tarjimalari.
- Yakuniy narx endi faqat raqam narxi.

**Admin paneldan (`panel-boshqaruv.html`):**
- Sozlamalardagi "Promokodlar" bo'limi yashirildi.

## Tariflar olib tashlandi
**Saytdan:**
- "Tarif tanlang" (naqt to'lov) va "Tarif" (bo'lib to'lash) tanlovlari.
- Xulosa va tasdiqlash bosqichidagi tarif qatorlari.
- Buyurtma payloadidan `cashTariffName`, `cashTariffPrice`, `installmentTariff`.
- Telegram xabaridagi "📶 Tarif" qatorlari.
- Buyurtmalar ro'yxatida tarif nomi ko'rsatilmaydi.
- `tariffsFor()` va tarifga oid tarjimalar.

**Admin paneldan:**
- 6 ta "Tariflar — <operator>" bloki (Humans, Ucell, Beeline, Mobiuz,
  Uzmobile, Perfektum) yashirildi.

## Tegilmagan joylar (ataylab)
- `netlify/functions/check-promo-code.js` va `api-check-promo.js` fayllari
  o'chirilmadi — endi hech kim chaqirmaydi, lekin kerak bo'lsa oson qaytariladi.
- Firestore'dagi `promo_codes` / `promo_usage` qoidalari va ma'lumotlari saqlanib qoldi.
- Admin paneldagi bloklar o'chirilmadi, faqat `display:none` qilindi —
  qaytarish uchun o'sha bitta satrni olib tashlash kifoya.
- Raqamning o'z "oylik tarif" narxi (bo'lib to'lash hisob-kitobi uchun ishlatiladi)
  o'z holicha qoldi — bu mijoz tanlaydigan tarif emas.

## Tekshiruvlar
JS 0 xato · CSS 0 · buyurtmaning 3 bosqichida ham "promokod"/"tarif" so'zlari yo'q ·
kontrast 0 xato · toshish 0 · xarita, til, katta harf testlari o'tdi.

---

## v17.1 — kartochkalar "shisha" (glass) ko'rinishida
Tuzilish, o'lchamlar va joylashuv **umuman o'zgarmadi** — faqat yuzasi almashtirildi.

- **Shaffof shisha yuza**: to'q rang o'rniga yarim shaffof qatlam +
  `backdrop-filter: blur(18px) saturate(150%)` — orqadagi fon kartochka ostidan
  xira ko'rinib turadi.
- **Ichki yorug' chiziq** (yuqori chekkada) va yupqaroq chegara — shisha qirrasi effekti.
- **Orqa fonga rangli shu'lalar** kuchaytirildi (ko'k, binafsha, oltin) —
  shisha nimanidir sindirishi uchun; ularsiz shaffoflik bilinmaydi.
- Xuddi shu yuza qo'llandi: raqam kartochkalari, oddiy kartochkalar (`.card`),
  profil plitalari, qidiruv maydoni va operator chiplari — sayt bo'ylab bitta uslub.
- VIP / PREMIUM / GOLD toifa ranglari shisha ustida ham ishlaydi.

Eslatma: `backdrop-filter` barcha zamonaviy brauzerlarda bor; qo'llab-quvvatlamagan
eski brauzerda kartochka oddiy yarim shaffof fon bilan ko'rinadi — buziladigan joyi yo'q.

Tekshiruvlar: kontrast ikkala mavzuda 0 xato · toshish 0 · toifalar, buyurtma,
qidiruv oqimlari OK.

## v17.2
- **Kartochka ichida rangli nur** qo'shildi: yuqori-chapda ko'k, pastki-o'ngda
  binafsha shu'la — shisha yuza "jonlanadi". Oddiy kartochkalar va profil
  plitalarida ham bor (yengilroq).
- **Qidiruv maydoni (7 ta katak) va operator chiplari shishadan qaytarildi** —
  ular endi avvalgidek to'q (qattiq) fonda. Shisha faqat kartochkalarda.

## v17.3
- **Pastki menyu ham shisha** bo'ldi: shaffofroq fon + kuchliroq xiralashtirish
  (blur 26px), ichki yorug' chiziq va ikki burchakda ko'k/binafsha shu'la.
  Kontent menyu ostidan xira ko'rinib o'tadi — chinakam "suzib turuvchi shisha".

## v17.4
- **Tepadagi doimiy panel ham shisha** bo'ldi — pastki menyu bilan bir xil:
  shaffofroq fon, blur 26px, ichki yorug' chiziq va ikki burchakda ko'k/binafsha shu'la.
  Mobil (`.apbar`) va kompyuter (`#deskhead`) ikkalasida ham.
- Kontent panel ostidan xira ko'rinib o'tadi, sahifa "bir butun shisha" uslubida.

## v17.5 — sevimlilarda surib o'chirish + suriluvchi menyu kapsulasi

### Surib o'chirish (iOS uslubida)
- Sevimlilardagi kartochkani **o'ngdan chapga ozgina sursangiz**, yonida qizil
  "O'chirish" tugmasi chiqadi. Bosilsa — raqam sevimlilardan o'chadi,
  kartochka yumshoq yig'ilib yo'qoladi.
- Surish paytida kartochka barmoq ortidan yuradi; yarmidan oshsa ochiq qoladi,
  oshmasa o'z joyiga qaytadi. Vertikal aylantirishga xalaqit bermaydi
  (gorizontal/vertikal harakat avtomatik ajratiladi).
- Ochiq kartochkaga bosilsa — avval yopiladi (tasodifan ochilib ketmaydi).
- Bir vaqtda faqat bitta kartochka ochiq turadi.

### Tepadagi o'chirish tugmasi
- "Sevimlilar" sarlavhasi yonida **savat ikonkasi** paydo bo'ldi (ro'yxat bo'sh
  bo'lsa ko'rinmaydi).
- Bosilsa — **barcha kartochkalar o'sha surilgan holatga o'tadi**, har birida
  "O'chirish" tugmasi turadi. Yana bossa — rejim o'chadi.
- Boshqa bo'limga o'tilsa rejim avtomatik yopiladi.

### Pastki menyu — Instagramdagidek suriluvchi kapsula
- Avval har bir ikonkaning o'z kapsulasi paydo bo'lib yo'qolardi.
  Endi **bitta kapsula** tanlangan bo'limga **silliq surilib** boradi
  (0.42s, tabiiy sekinlashuv).
- Kapsula fonining o'zi ham **shisha**: yarim shaffof, blur bilan, nozik chegara
  va ichki yorug' chiziq.
- Harakatni kamaytirish rejimida surilish o'chadi.

## v17.6
- Kartochka bilan qizil "O'chirish" tugmasi orasida **10px oraliq** qoldirildi —
  avval yopishib turardi. Tugma burchaklari ham kartochkaga moslandi.
