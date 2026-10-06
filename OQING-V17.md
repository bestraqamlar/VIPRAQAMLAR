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
