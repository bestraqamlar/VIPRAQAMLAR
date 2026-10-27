# V137 — Sekin telefonlar uchun tezlik + yozuvlar xatosi

## 1. TUZATILGAN XATO: "yozuvlar o'zgaryabdi"

Bu men kiritgan xato edi. V132 da tezlik uchun shunday qilingandi:
*"til o'zbek bo'lsa, yozuvlarni qaytadan yozib chiqish shart emas — ular
allaqachon o'zbekcha"*. Birinchi ochilishda bu to'g'ri, lekin **tilni
almashtirganda xato**:

> rus tilida turgan mijoz o'zbekchaga o'tsa, yozuvlar **ruscha bo'lib
> qolardi** — chunki almashtirish o'tkazib yuborilardi.

**Tuzatildi:** o'tkazib yuborish endi **faqat birinchi ochilishda**
bo'ladi. Til tugmasi bilan almashtirilganda matn har doim yangilanadi.

Tekshirildi (ikki yo'nalishda ham): uz → ru → uz, va "ruscha saqlangan
holda qayta ochish → o'zbekchaga o'tish" — hammasi to'g'ri.

---

## 2. TEZLIK — sabablari o'lchab topildi

Taxmin qilmadim: har bir amal **6 barobar sekinlashtirilgan
protsessorda** (arzon Androidga yaqin) alohida o'lchandi va vaqt
nimaga ketayotgani (skript / uslub hisobi / joylashuv / chizish)
ajratib ko'rsatildi.

### Natija

| Amal | Oldin | Endi |
|---|---|---|
| **Kartochka bosish (oyna ochilishi)** | **392 ms** | **~105 ms** |
| Bosh sahifa ochilishi | 241 ms | **82 ms** |
| Bosh sahifaga qaytish | 175 ms | **89 ms** |
| Katalog ochilishi | 141 ms | **~70 ms** |
| Profil bo'limi | 97 ms | **~60 ms** |

### a) Bo'lim almashganda ekrandan tashqarisi chizilardi

**Eng katta topilma.** Bo'lim almashganda brauzer yashirin ekranni
ko'rsatadi va bu paytda uning **butun balandligini** — ekrandan ancha
pastdagi kartochkalar, "Mijozlar fikri" va boshqalarni ham —
joylashtirib, chizib chiqishi kerak edi.

O'lchandi: JS atigi **5 ms**, joylashuv va chizish esa **135 ms**.

Endi ekrandan tashqaridagi bloklarga `content-visibility:auto`
qo'yildi — brauzer ularning ichini ko'rinmaguncha umuman chizmaydi.
`contain-intrinsic-size` esa taxminiy balandlikni aytib turadi, shuning
uchun aylantirgich sakramaydi.

**Natija: 135 ms → 56 ms.**

### b) Bosh sahifa har qaytganda qaytadan chizilardi

`pickHome()` bosh sahifaga **har o'tganda** raqamlarni qaytadan
aralashtirib, butun sahifani (15 ta kartochka + karusel) qaytadan
chizardi — `renderHome()` ning o'zi **69 ms**.

Endi ma'lumot o'zgarmagan bo'lsa qaytadan chizilmaydi (o'lchandi:
**0.0 ms**, `renderHome` umuman chaqirilmaydi). Qaytadan chizish faqat
raqamlar ro'yxati yangilanganda bo'ladi.

**Qo'shimcha foyda:** bosh sahifaga qaytganda raqamlar endi "sakrab"
almashmaydi — mijoz qaysi kartochkani ko'rgan bo'lsa, o'sha joyida
turadi.

### c) Kartochkalarda blur qolib ketgan edi

`backdrop-filter` (shisha effekti) saytda 25 joyda ishlatiladi. Sekin
qurilmalar uchun uni o'chiradigan ro'yxat bor edi — lekin u faqat
menyu, panel va oynalarni qamrab olgan. **Kartochkalarning o'zi —
`.card`, `.numcard`, `.daycard`, `.tgcard`, `.ptile` — qolib ketgandi.**
Katalogda ular o'nlab bo'ladi va aylantirilganda har biri har kadrda
qaytadan xiralashtiriladi.

Endi sekin qurilmada blur **butunlay, hamma joyda** o'chadi — shu
jumladan surilib yuradigan menyu kapsulasida (`.navpill`) ham, u
harakatlanadigani uchun eng qimmati edi. Qoida yulduzcha (`*`) bilan
yozildi: bundan keyin qo'shiladigan **har qanday yangi blur ham**
sekin qurilmada o'zi o'chadi, esdan chiqib qolmaydi.

### d) Oyna ochilishi bir kadrga to'planib qolardi

Oyna ochilganda brauzer bitta kadrda: 880 ta CSS qoidasini
moslashtirish + butun ekran o'lchamidagi panelning joylashuvini
hisoblash + uni gradientlari bilan birinchi marta chizish — va ayni
paytda ochilish animatsiyasini ham boshlashi kerak edi. O'lchandi:
o'sha kadr **107 ms** (odatdagisi ~16 ms).

Endi: oyna avval **ko'rinadi** (orqa fon darhol qorayadi — bosishga
javob bor), panelning animatsiyasi esa **bir kadr** kechikadi. Brauzer
birinchi kadrda faqat joylashuv va chizishni bajaradi, animatsiya
keyingi kadrdan, tayyor panel ustida silliq boshlanadi.

Qo'shimcha: sekin qurilmada panel pastdan **sirg'almaydi**, faqat
**paydo bo'ladi** (120 ms shaffoflik). Sirg'alish butun ekran
o'lchamidagi panelni har kadrda qaytadan birlashtirishga majbur
qiladi; shaffoflik esa allaqachon chizilgan qatlam uchun eng arzon
amal. Kuchli telefonlarda sirg'alish avvalgidek qoladi.

Uslub hisoblari: **21 martadan 15 martaga** tushdi.

---

## Telegram mini ilovada

| Ko'rsatkich | V135 (oldin) | V136 | V137 |
|---|---|---|---|
| Birinchi ko'rinish | 564 ms | 447 ms | **~460 ms** |
| Sahifa tayyor | 818 ms | 544 ms | **~470 ms** |

Mini ilovaning asosiy foydasi esa **amallarda**: kartochka ochilishi
392 → 105 ms, bo'lim almashishi 135 → 56 ms.

---

## Tekshiruv

Barcha eski testlar qayta o'tkazildi:

| Nima | Natija |
|---|---|
| Til almashtirish (uz→ru→uz) | ✅ to'g'ri |
| Ruscha saqlangan holda qayta ochish | ✅ to'g'ri |
| Karusel surish (3 ta holat) | ✅ |
| Kabinet, kirish, to'lovlar jadvali | ✅ |
| Telegram: SDK, orqaga tugmasi, ranglar | ✅ |
| Oddiy brauzer: Telegram SDK yuklanmaydi | ✅ |
| Chuqur manzil `/raqam/...` | ✅ 404 yo'q |
| Aylantirishda FPS | ✅ 61 |
| JS xatosi | ✅ 0 ta |
