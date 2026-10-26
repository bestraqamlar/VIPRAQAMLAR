# V129 — Kredit svetofori + Telegram kodi bilan kirish

## 1. Kredit holati: yashil / sariq / qizil

Banklardagi kabi oddiy "svetofor" — profil kartochkasining **o'ng
yuqori burchagida**, "Chiqish" tugmasining yonida. Ko'zga birinchi
tushadigan joy, lekin raqam va ismga xalaqit bermaydi.

| Rang | Qachon | Yozuv |
|---|---|---|
| 🟢 yashil | kechikkan to'lov yo'q | JOYIDA |
| 🟡 sariq | **1 oy** kechikkan | OGOH |
| 🔴 qizil | **2 va undan ko'p** oy kechikkan | QARZDOR |

Shartnomasi yo'q mijozda svetofor umuman ko'rinmaydi — baholaydigan
narsa yo'q.

Rangning o'ziga tayanmadim: rang ko'rmaydigan odamlar bor, shuning
uchun yonida qisqa so'z ham yoziladi va `title` da to'liq izoh bor.

Holat **serverda** hisoblanadi (`api-kabinet.js` → `kreditHolat`),
brauzer faqat chizadi — ya'ni qoidani o'zgartirish uchun saytni emas,
bitta funksiyani tahrirlash kifoya.

---

## 2. Kabinetga Telegram kodi bilan kirish

### Nega

Ilgari kirish uchun telefon + sotib olingan raqamning oxirgi 4 ta
raqami yetardi. Bu ishlardi, lekin: mijoz o'sha 4 ta raqamni eslab
qolishi kerak edi, va 4 ta raqam = 10 000 kombinatsiya, ya'ni "parol"
darajasidagi himoya emas.

### Endi

1. Mijoz telefon raqamini kiritadi → **"Telegramga kod yuborish"**.
2. Botimiz unga 6 xonali kod yuboradi.
3. Kodni kiritadi → kabinet ochiladi.

**SMS ATAYLAB ISHLATILMADI** — SMS xizmati uchun to'lanmagan, shuning
uchun kod faqat Telegram boti orqali yuboriladi.

Keyingi safar hech narsa so'ralmaydi: mijozga **30 kun amal qiladigan
imzolangan token** beriladi va u mijozning o'z telefonida saqlanadi.

### Botga kirmagan mijoz uchun

Kod yuborib bo'lmaydi (chat ID'si yo'q), shuning uchun unga:

* botga kirish yo'li ko'rsatiladi ("Botni ochish" tugmasi bilan);
* va **zaxira yo'l** ochiladi — eski usul, telefon + raqamning oxirgi
  4 ta raqami. Formada u "Telegramda yo'qmisiz? Boshqa yo'l bilan
  kiring" tugmasi ostida yashirin turadi.

Ya'ni hech bir mijoz tashqarida qolmaydi.

### Xavfsizlik

* Kodning O'ZI bazaga yozilmaydi — faqat SHA-256 xeshi (telefon bilan
  birga xeshlanadi, ya'ni xesh boshqa telefonga yaramaydi).
* Kod **5 daqiqa** amal qiladi va **bir martalik** — ishlatilgach
  darhol o'chiriladi.
* **5 ta** xato urinishdan keyin kod butunlay bekor bo'ladi.
* Bitta telefonga **daqiqasiga 1 ta** kod — Telegram'ni spam bilan
  to'ldirib bo'lmaydi.
* IP bo'yicha: soatiga 10 ta kod, 30 ta tekshiruv.
* Kod taqqoslash **vaqt bo'yicha teng** (`timingSafeEqual`).
* Token HMAC-SHA256 bilan imzolanadi; ichida faqat telefonning oxirgi
  9 raqami va muddati bor — shaxsiy ma'lumot yo'q, admin huquqi yo'q.
  Tekshirish uchun bazaga murojaat qilinmaydi (tezroq va arzonroq).
* Yangi to'plamlar (`kabinet_login_codes`,
  `kabinet_code_rate_limits`, `kabinet_code_check_limits`) brauzerdan
  **umuman** o'qilmaydi — Firestore qoidalarida ro'yxatga olinmagan
  yo'llar to'liq yopiq, bu `firestore.rules` izohida ham yozildi.
  Eskirganlari kunlik zaxira bilan o'chiriladi.

### Sozlash (bir marta)

Netlify → Site settings → Environment variables:

* `KABINET_TOKEN_SECRET` — uzun tasodifiy satr (kamida 32 belgi).
  Qo'ymasangiz ham ishlaydi (xizmat hisobining kalitidan hosil
  qilinadi), lekin qo'yish afzal: xizmat hisobi almashtirilsa
  mijozlarning kirishi bekor bo'lmaydi.
* `CUSTOMER_BOT_USERNAME` — bot nomi (@siz), xabarlarda ko'rsatish
  uchun. Qo'yilmasa `vip_raqamlar_bot` ishlatiladi.
* `CUSTOMER_BOT_TOKEN` — allaqachon bor (mijoz boti shu bilan
  ishlayapti), qo'shimcha hech narsa kerak emas.

---

## Tekshiruv

**Serverda** (soxta Firestore va soxta Telegram, 18 ta holat):

| Holat | Natija |
|---|---|
| Botga kirmagan mijoz | ✅ kod yuborilmaydi, yo'l ko'rsatiladi |
| Kod yuborish | ✅ Telegram'ga to'g'ri chat ID bilan ketdi |
| Kod 6 xonali | ✅ |
| Kod bazada ochiq saqlanmaydi | ✅ faqat xesh |
| Daqiqasiga 1 ta (spam) | ✅ to'sildi |
| Noto'g'ri kod | ✅ rad etildi, token berilmadi |
| To'g'ri kod | ✅ token berildi |
| Kod bir martalik | ✅ darhol o'chirildi |
| 5 xato urinish | ✅ kod bekor |
| Token bilan kabinet | ✅ ochildi, 4 raqam so'ralmadi |
| Buzilgan token | ✅ rad etildi, "qaytadan kiring" |
| Zaxira yo'l (4 raqam) | ✅ hamon ishlaydi |
| Noto'g'ri 4 raqam | ✅ rad etildi |
| Svetofor: 0 / 1 / 3 oy kechikkan | ✅ yashil / sariq / qizil |
| Shartnomasiz mijoz | ✅ svetofor yo'q |

**Brauzerda** (haqiqiy sahifa, 390px):

| Holat | Natija |
|---|---|
| Telefonsiz kod so'rash | ✅ so'rov ketmaydi, ogohlantiradi |
| Telefon bilan | ✅ kod maydoni ochiladi, 60 soniyalik taymer |
| Noto'g'ri kod | ✅ kataklar tozalanadi, token saqlanmaydi |
| Kodni YOPISHTIRISH | ✅ 6 katakka tarqaladi va o'zi kiradi |
| Kirgandan keyin | ✅ kabinet token bilan ochildi, svetofor "OGOH" |
| Sahifani qayta ochish | ✅ kod so'ralmadi, token bilan kirdi |
| Zaxira yo'l tugmasi | ✅ ochiladi, havola yashirinadi |

JS xatosi 0 ta. Kartochka o'lchami 354×223 (1.586) — o'zgarmadi.
Tezlik: 6 barobar sekin protsessorda qayta chizish **11.8 ms**,
aylantirishda **60 FPS**.
