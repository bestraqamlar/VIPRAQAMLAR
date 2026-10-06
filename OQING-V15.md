# VIP RAQAMLAR — v15

## 1. Mavzu tugmasi yana eng tepaga qaytdi
- Bosh sahifaning yuqori qatorida, **UZ tugmasi yonida** quyosh/oy tugmasi.
- Kompyuter versiyasida ham o'ng yuqori burchakda.
- Tungida — quyosh (yorug'ga o'tish), yorug'da — oy ikonkasi.
- Profil bo'limidagi "Ko'rinish" kartochkalari **olib tashlandi**.
- Standart baribir tungi; tanlov eslab qolinadi.

## 2. Yumshoq ochilish + tebranish (haptic)
- Oynalar (buyurtma, shartnoma, raqam ko'rish...) endi **yumshoq**, pastdan
  yengil masshtab bilan chiqadi (0.62s, tabiiy sekinlashuv) — avval qattiq edi.
- Orqa fon xiralashuvi ham yumshoqroq.
- **Har qanday amalda yengil tebranish**: tugma, kartochka, menyu, operator,
  filtr, mavzu almashtirish, sevimliga qo'shish, qidiruv boshlanishi va
  tugashi (muvaffaqiyat/xato alohida).
- Telegram ichida ochilsa — Telegram'ning o'z HapticFeedback'i ishlatiladi,
  oddiy brauzerda — `navigator.vibrate`. Qo'llab-quvvatlamasa, hech narsa buzilmaydi.

## 3. Bo'sh kataklarda "Qidirish" — tasodifiy raqamlar
- Hech narsa yozmasdan Qidirish bosilsa, endi ogohlantirish chiqmaydi:
  **bazadan har safar boshqa-boshqa tasodifiy raqamlar** chiqariladi.
- Hech qanday bildirishnoma (toast) chiqmaydi — raqamlar jimgina almashadi.

## 4. Qidiruv paytida eski raqamlar ko'rinmaydi
- Avval eski kartochkalar xiralashib turardi — endi ular **butunlay almashtiriladi**:
  o'rnida zamonaviy "yuklanmoqda" kartochkalari (raqam, operator, narx va tugma
  shaklidagi bloklar) oq yorug'lik yugurib o'tadigan animatsiya bilan turadi.
- Natija faqat server javobi kelgandan keyin, bir marta chiqadi.

## Tekshiruvlar
JS 0 xato · CSS balans 0 · kontrast (yorug'+tungi) 0 xato ·
tasodifiy qidiruv 3 marta — 3 xil natija · qidiruv paytida eski raqamlar: 0 ta ·
vibratsiya chaqiriqlari ishlayapti · ruscha til OK.

## Backend
O'zgartirilmadi.
