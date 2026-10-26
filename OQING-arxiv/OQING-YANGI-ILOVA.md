# VIP RAQAMLAR — mijoz sayti ilova ko'rinishida

`index.html` 0 dan qaytadan yozildi. **Backend umuman o'zgartirilmadi** —
barcha Netlify funksiyalari, Firestore qoidalari, panel va Telegram ilovasi
avvalgidek qoldi.

## Nima o'zgardi

Faqat bitta fayl: **`index.html`** (677 KB → 162 KB).

Sayt endi mobil ilova ko'rinishida ishlaydi:
- pastda 5 ta bo'limli navigatsiya (Bosh sahifa, Qidiruv, Raqamlar, Sevimli, Yana)
- har bir bo'lim alohida ekran (hash-marshrut: `#/qidiruv`, `#/raqamlar`, …)
- raqam tafsiloti va buyurtma — pastdan chiqadigan oynalarda
- buyurtma 3 bosqichda: raqam → ma'lumot → tasdiq → SMS → tayyor
- yorug' va tungi mavzu (Yana → Mavzu), tanlov `localStorage`da saqlanadi
- internet yo'q yoki sekin bo'lsa — tepada chiziq chiqadi va sayt
  o'zini o'zi qayta urinadi (3s → 45s gacha uzayadigan oraliq bilan)

## Qaysi backend ishlatilgan (o'zgarishsiz)

Firestore (mijoz uchun ruxsat berilgan to'plamlar):
- `numbers` — katalog o'qiladi, buyurtmada `reserved`+`reservedAt` yoziladi
- `orders` — buyurtma yoziladi (tranzaksiya ichida, `status: 'Yangi'`, ≤24 maydon)
- `live_reservations`, `promo_usage` — qulf va promokod belgisi
- `custom_orders`, `number_price_categories` — maxsus raqam buyurtmasi
- `site_settings/general`, `site_settings/operator_financing` — sozlamalar
- `vacancies`, `job_applications` — ish o'rinlari (qoidalar talab qilgan 8 ta maydon aynan)
- `site_stats/counter`, `active_sessions` — tashrif hisobi va sessiya

Netlify funksiyalari:
- `api-live-search` — operatorlardan jonli qidiruv (mask, 9s, 1 marta jim qayta urinish)
- `check-promo-code` — promokod
- `send-sms-code` / `verify-sms-code` — SMS tasdiq (ishlamasa buyurtma baribir o'tadi)
- `check-my-orders` — buyurtma holati
- `check-contract-status` — kredit shartnoma holati
- `generate-contract-pdf` — shartnoma PDF
- `telegram-notify` — admin Telegramga xabar (matn formati AYNAN eski kabi)

## Tuzatilgan eski xato

Eski saytda shartnoma PDF **hech qachon yuklanmasdi**: `check-contract-status`
javobida `contractId` qaytmaydi, lekin `generate-contract-pdf` ga aynan
`data.contractId` (ya'ni `undefined`) yuborilardi. Endi foydalanuvchi
kiritgan ID ishlatiladi.

## Deploy

Avvalgidek — GitHub'ga yuklab, Netlify o'zi yig'adi. Hech qanday yangi
muhit o'zgaruvchisi kerak emas.
