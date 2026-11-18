# V139 — Tebranish faqat kerakli joyda + yana tezlik

## 1. Tebranish (haptika) — juda ko'p joyda edi

Siz haqsiz edi. Ro'yxatda shular bor edi: `a` (har qanday havola),
`button`, `label` (yozuvlar), `select`, `summary`, `.row` (ro'yxat
qatorlari), `.tag`, `.chip`, `#nav a` (bo'lim almashtirish), `.op`
(operator tugmalari), `.ptile` va boshqalar. Ya'ni sahifadagi
**deyarli har qanday bosishda** telefon tebranardi — natijada tebranish
"ma'noli javob" bo'lishdan to'xtab, shovqinga aylangan edi.

### Endi faqat haqiqiy amallarda

| Qayerda | Nega |
|---|---|
| **Asosiy tugmalar** (`.btn`, kartochkadagi tugmalar) | buyurtma berish, tasdiqlash, kirish, yuklab olish — qaror talab qiladigan amallar |
| **Sevimlilarga qo'shish/olib tashlash** | natijasi darhol ko'rinmaydi, shuning uchun sezgi kerak |
| **Raqamdan nusxa olish** | bajarilganini bildiradigan yagona belgi |

### Olib tashlandi

Bo'lim almashtirish, oddiy havolalar, yozuvlar, yorliqlar, ro'yxat
qatorlari, saralash va operator tugmalari, til almashtirish, profil
plitkalari.

### O'zgarmagan joylar

Tebranish **natijada** ishlaydigan joylarda qoldi — aynan shuning
uchun ular o'rinli: oyna ochilganda (yengil), muvaffaqiyat/xato
xabarida (kuchliroq), buyurtma yuborilganda, kabinetga kirilganda,
kartochkani surib o'chirganda, chekkadan orqaga qaytganda.

**Tekshirildi** (haqiqiy sahifada, tebranish chaqiruvlari sanalib):

| Bosilgan narsa | Natija |
|---|---|
| Asosiy tugma | ✅ tebranadi |
| Sevimli yurakchasi | ✅ tebranadi |
| Pastki menyu | ✅ tebranmaydi |
| Operator tugmasi | ✅ tebranmaydi |
| Saralash chipi | ✅ tebranmaydi |
| Oddiy havola | ✅ tebranmaydi |
| Yozuv (label) | ✅ tebranmaydi |
| Profil plitkasi | ✅ tebranmaydi |

---

## 2. Tezlik — yana ikkita sabab topildi

### a) "Yana ko'rsatish" da 15 ta animatsiya birdan ishlardi

Tugma bosilganda 15 ta kartochka **birin-ketin**, har biri 45 ms
kechikib chiqardi — ya'ni 15 ta animatsiya bir vaqtda, deyarli bir
soniya davomida ishlab turardi. Kuchli telefonda bu chiroyli, sekin
Androidda esa aynan shu paytda ro'yxat "qotardi".

Endi sekin qurilmada animatsiya **umuman yo'q**: na sinf, na kechikish,
na tozalash taymeri qo'yiladi (15 ta kartochka uchun 30 ta ortiqcha
uslub yozuvi bajarilmaydi). Kartochkalar darhol paydo bo'ladi — bu
tezroq **va** ravonroq. Kuchli telefonlarda animatsiya avvalgidek
qoladi.

**O'lchangan: 155 ms → 33 ms.**

### b) Karusel fonda har 4 soniyada ishlab turardi

Bosh sahifadagi karusel har 4 soniyada kartochkani almashtiradi: har
o'tish ~620 ms animatsiya + yo'lakni qayta tartiblash + joylashuv
hisobi degani. Sekin Androidda bu ish mijoz boshqa narsa qilayotganda
ham fonda tezlikni yeb turardi.

Sekin qurilmada endi **7 soniyada** bir marta. Ko'rinishga ta'siri
sezilmaydi (kartochka baribir almashib turadi), fon yuki esa deyarli
ikki barobar kamayadi.

---

## Umumiy natija

Har bir amal **6 barobar sekinlashtirilgan protsessorda** (arzon
Androidga yaqin) **3 marta** o'lchandi, quyida **o'rtachasi**:

| Amal | V136 (boshlanish) | Endi |
|---|---|---|
| **Kartochka bosish (oyna ochilishi)** | 392 ms | **78 ms** (5 barobar tez) |
| Bosh sahifa ochilishi | 241 ms | **66 ms** |
| Bosh sahifaga qaytish | 175 ms | **26 ms** (6,7 barobar) |
| Katalog ochilishi | 141 ms | **40 ms** |
| "Yana ko'rsatish" (15 ta) | 155 ms | **33 ms** |
| Katalogni qayta chizish | 58 ms | **37 ms** |
| Qidiruvga yozish | 19 ms | **0 ms** |
| Oynani yopish | — | **6 ms** |

Aylantirishda **61 FPS**, JS xatosi **0 ta**.

---

## 3. Xavfsizlik — tekshirildi, o'zgarmadi

Bu versiyadagi o'zgarishlar faqat tebranish va animatsiyalarga tegdi —
xavfsizlik kodiga umuman tegilmadi. Shunga qaramay **barcha xavfsizlik
testlari qayta o'tkazildi**:

| Test | Natija |
|---|---|
| Telegram `initData` imzosi (soxta imzo, buzilgan hash, `user.id` almashtirilgani, eski ma'lumot) | ✅ 10/10 |
| Kabinetga kirish (kod, token, bir martalik kalit, chegaralar) | ✅ 15/15 |
| Botda raqam tasdiqlash (begona raqam, birovning kontakti) | ✅ 17/17 |
| Operator xatolarini turkumlash | ✅ 15/15 |
| Adminka seansi (F5, seans yo'q, Firebase javobsiz, haqiqiy kirish) | ✅ 4/4 |

Ya'ni: begona raqam bilan kod olish, soxta imzo bilan kabinetga kirish,
IP almashtirib taxmin qilish — hammasi avvalgidek **mumkin emas**.
