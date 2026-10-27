# V142 — MENYU VA KARUSEL SILLIQLIGI

## SIZ NIMA SO'RAGANSIZ

> "menyular bosilganda tez ishlasin, juda tez, yumshoq ishlasin, va
> asosiy bo'limda o'tib turuvchi kartochka yumshoq, tez bo'lsin —
> hozir qotganday bo'ladi"

---

## 1. ASOSIY BO'LIMDAGI O'TIB TURUVCHI KARTOCHKA

### Nega "qotganday" edi — uchta sabab topildi

**a) Egri chiziq noto'g'ri edi.** Avtomatik o'tish barmoq uzilgandagi
INERTSIYA egrisi bilan bajarilardi: `cubic-bezier(.25,1,.5,1)`. Bu egri
masofaning 90% ini vaqtning dastlabki yarmida bosib o'tadi, qolgan
yarmida esa kartochka deyarli **joyida turadi**. Barmoq uzilganda bu
to'g'ri — harakat barmoqning davomidek tuyuladi. Lekin o'z-o'zidan
boshlangan harakatda ko'z buni "sudralib to'xtadi" deb o'qiydi.

Endi avtomatik o'tish uchun alohida egri: ikki tomoni ham bir xil
yumshoq, orada esa to'xtab qolmaydi.

**b) 620 ms uzoq edi.** Zamonaviy ilovalarda bunday siljish 350-450 ms.
Endi **420 ms**.

**c) Har o'tishda brauzer majburan joylashuv hisoblardi.** Kartochka
kengligi (`offsetWidth`) har safar, harakat boshlanishidan oldin
o'qilardi — bu brauzerni o'sha zahoti hamma narsani qayta o'lchashga
undaydi, ya'ni animatsiyaning birinchi kadri kechikardi. Kenglik esa
faqat ekran o'lchami o'zgarganda o'zgaradi.

Endi kenglik bir marta o'lchanib keshlanadi; ekran burilsa kesh bekor
bo'ladi. Harakat **tugaganda** ham bitta shunday majburiy hisob bor edi
(oxiridagi "silkinish" sababi) — u ham olib tashlandi.

**O'lchov:** har o'tishdagi majburiy joylashuv hisobi **3 tadan 1 taga**
tushdi.

---

## 2. MENYULAR BOSILGANDA

### Nega sekin edi

Bitta bosishda quyidagilarning hammasi **bitta ishda, ketma-ket**
bajarilardi:

1. sahifani tepaga ko'tarish,
2. eski bo'limni yashirib yangisini ko'rsatish,
3. **va darhol** o'sha bo'limning to'liq ro'yxatini chizish
   (katalogda 15-40 ta kartochka).

Brauzer esa bitta ishning **o'rtasida** ekranga hech narsa chiqarmaydi.
Ya'ni barmoq uzilgandan keyin 3-banddagi og'ir ish tugamaguncha ekran
o'zgarmay turardi — aynan shu "qotish" hissi.

### Yechim: ishni ikkiga bo'lish

* 1 va 2-band **darhol** bajariladi → yangi bo'lim shu zahoti chiqadi
  (eski ro'yxat hali ko'rinib turadi, bo'sh ekran chaqnamaydi);
* 3-band esa **ekranga chiqqandan keyingi kadrda** bajariladi.

Bir necha menyu tez-tez bosilsa, faqat **eng oxirgisining** ro'yxati
chiziladi — aks holda uchta bo'limning ro'yxati ham chizilib, tezlik
yana yo'qolardi.

### Ikkinchi sabab: bo'lim 55% xiralikdan boshlanardi

Bo'lim almashganda `opacity: 0.55 -> 1` animatsiyasi 160 ms davom
etardi. Ya'ni bosilgandan keyin bo'lim bir necha kadr **yarim
ko'rinmas** turardi va to'liq o'qiladigan holatga ~120 ms da yetardi.
Animatsiyaning o'zi "hali ochilmadi" hissini berardi.

Endi: **0.86 dan boshlanadi va 110 ms**. Yumshoqlik saqlanadi, lekin
mazmun darhol o'qiladi. **Sekin telefonda esa umuman yo'q** — u yerda
`opacity` butun bo'limni (40 tagacha kartochkani) alohida chizish
qatlamiga ko'chirib, bosishga javobni kechiktiradi.

---

## O'LCHOV (6 barobar sekin protsessor, 3 ta o'lchov medianasi)

| amal | V141 | V142 | farq |
|---|---|---|---|
| Katalog ochish | 32.2 ms | 24.3 ms | **−25%** |
| Sevimlilar ochish | 30.8 ms | 21.2 ms | **−31%** |
| Profil ochish | 33.5 ms | 29.1 ms | **−13%** |
| Bosh sahifaga qaytish | 30.9 ms | 28.1 ms | −9% |
| Karusel: majburiy joylashuv hisobi | 3 ta | **1 ta** | −67% |
| Karusel: avtomatik o'tish | 620 ms | 420 ms | − |
| Aylantirishda FPS | 60-61 | 60-61 | o'zgarmadi |
| JS xatolar | 0 | 0 | — |

### To'g'rilik tekshiruvi — 12/12 o'tdi

Katalog chizildi · to'g'ri ekran ochildi · sevimlilar chizildi · profil
ochildi · kabinet ochildi · karusel bor · tavsiya ro'yxati bor ·
**tez-tez bosgandan keyin ham to'g'ri bo'lim va to'liq ro'yxat** ·
pastki menyu kapsulasi joyida · karusel avtomatik o'tdi · karusel
joyiga yumshoq o'tirdi.

Shuningdek eski tekshiruvlar qayta o'tkazildi: qo'l bilan surish
(majburiy joylashuv hisobi — 0), til almashtirish (5/5), tebranish
(faqat kerakli joylarda), FPS 61.

---

## QAYSI FAYL O'ZGARDI

**3 ta fayl:**

* `index.html` — bo'lim almashish animatsiyasi
* `assets/app.js` — karusel va menyu mantig'i
* `sw.js` — kesh raqami `v31`

## QANDAY YUKLASH

`VIP-V142-FAQAT-3-FAYL.zip` ichidagi fayllarni GitHub'da eski fayllar
ustiga tashlang (`assets/app.js` — `assets` papkasi ichiga) va **bitta
commit** qiling.

Keyin Netlify: **Deploys → Trigger deploy → Clear cache and deploy
site**. Shu bo'lmaguncha telefonda hech narsa o'zgarmaydi.

Tekshirish: sayt ochilgach manzil qatoriga
`javascript:alert(document.querySelector('meta[name=vip-versiya]').content)`
— **142** chiqishi kerak.
