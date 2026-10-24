# V120 — BUYURTMA HECH QACHON YO'QOLMAYDI

## Muammo
Adminda "⚠ 14 ta mijoz yubormoqchi bo'ldi, lekin xato tufayli uddalay
olmadi" degan ogohlantirish chiqdi. Sababi: buyurtmani MIJOZ BRAUZERI
to'g'ridan-to'g'ri Firestore'ga yozardi va bu bir vaqtda uchta narsaga
bog'liq edi:

1. Firestore qoidalari to'g'ri joylangan bo'lishi;
2. App Check tokeni olinishi (reklama bloklagichi bo'lsa — olinmaydi);
3. mijoz tarmog'idan `firestore.googleapis.com` ochilishi.

Bittasi ishlamasa — buyurtma butunlay yo'qolardi.

## Yechim — UCHTA MUSTAQIL YO'L

| # | Yo'l | Nimaga bog'liq | Xato bo'lsa |
|---|------|----------------|-------------|
| 1 | **Server** — `api-buyurtma.js`, Admin SDK bilan yozadi | faqat saytning o'zi ochilishiga | 2-yo'lga o'tadi |
| 2 | **Zaxira** — brauzer o'zi Firestore'ga yozadi (eski yo'l) | qoidalar + App Check + Firestore | 3-yo'lga o'tadi |
| 3 | **Navbat** — brauzer xotirasida saqlanadi | hech narsaga | o'zi qayta yuboriladi |

Admin SDK Firestore qoidalaridan ham, App Check'dan ham o'tmaydi —
ya'ni 1-yo'lda yuqoridagi uchala sabab ham yo'qoladi.

**Navbat** (3-yo'l) — oxirgi himoya: buyurtma `localStorage`'ga yoziladi
va o'zi qayta yuborilib turadi — aloqa tiklanganda, sahifa qayta
ochilganda, ko'rinadigan holatga qaytganda va har 30 sekundda. Mijozga
"Buyurtmangiz saqlandi — aloqa tiklanishi bilan o'zi yuboriladi" deb
yoziladi; yuborilgach "Buyurtmangiz yuborildi ✓". 3 kundan oshgan yozuv
o'chiriladi.

## Takrorlanish bo'lmaydi
Har bir buyurtma urinishiga bitta `sorovId` beriladi. Server shu belgi
bo'yicha avval yozilganini topadi va IKKINCHI nusxani yaratmaydi. Shu
sababli qayta yuborish (server yo'li 1 marta, navbat esa cheksiz)
mutlaqo xavfsiz.

## Himoya
- IP bo'yicha soatlik chegara: 30 ta buyurtma (`order_create_rate_limits`);
- maydonlar ro'yxati va shakli `firestore.rules` dagi bilan AYNAN bir xil
  mantiq bilan tekshiriladi (ism harfli, telefon haqiqiy operator kodi
  bilan, narx son, ortiqcha maydon qabul qilinmaydi);
- raqam band bo'lsa tranzaksiya rad etadi — bitta raqam ikki kishiga
  sotilmaydi (jonli raqamlar uchun `live_reservations` qulfi);
- raqamni band qilib bo'lmasa ham BUYURTMA BARIBIR yoziladi
  (`bandQilinmadi: true`) — savdo yo'qolmaydi, admin raqamni qo'lda
  band qiladi.

## O'zgargan fayllar
- `netlify/functions/api-buyurtma.js` — YANGI
- `index.html` (+ `build/parts/06-js-order.html`, `08-js-boot.html`)
- `assets/panel.js` — adminning "yo'l" ogohlantirishi matni yangilandi
- `firestore.rules` — `sorovId` maydoniga ruxsat (zaxira yo'l uchun)
- `panel-boshqaruv.html` — `?v=120`

## SIZDAN KERAK
1. **`firestore.rules` ni Firebase'ga joylash** — hali joylanmagan
   (eng muhim ish). `.github/workflows/firebase-qoidalar.yml` +
   `FIREBASE_TOKEN` sekreti qo'yilsa, bu o'zi bo'ladi.
2 Netlify muhit o'zgaruvchilari `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` turgani tekshirilsin
   — 1-yo'l aynan shularga bog'liq (ular allaqachon boshqa funksiyalar
   uchun qo'yilgan, ya'ni odatda hech narsa qilish kerak emas).

## Tekshirildi
Serverda (soxta Firestore bilan): oddiy buyurtma, `sorovId` bo'yicha
takror (bitta buyurtma qoldi), band raqamga buyurtma → 409, jonli raqam
qulfi, ruxsatsiz maydon → 400, noto'g'ri telefon → 400.
Saytda (soxta tarmoq bilan): server ishlaganda, server 503 bo'lganda,
tarmoq uzilganda, raqam band bo'lganda, ikki yo'l ham ishlamaganda
(navbatga tushdi) va navbat aloqa tiklanganda yuborilganda — hammasi
kutilganidek.
