# V132 — "Profil" bo'limi avvalgi holatiga qaytdi + sayt tezlashtirildi

## 1. "Profil" bo'limi — yana faqat menyu

Siz aytganingizdek, u bo'limdagi profil kartochkasi va kirish olib
tashlandi. Endi "Profil" bo'limi avvalgidek: Telegram kanal
kartochkasi va bo'limlar ro'yxati (Buyurtmalarim, Shartnomalarim,
Hamkor bo'lish, Vakansiyalar, Instagram, Savol-javob va h.k.).

**Profil kartochkasi (plastik karta, spidometr, to'lov tasmasi)
o'z joyida qoldi** — "Buyurtmalarim" (kabinet) bo'limida. Kirish ham
o'sha yerda.

Shu bilan birga profil keshi (`vip_profil`) ham keraksiz bo'ldi va
olib tashlandi: kabinet ma'lumotni baribir serverdan oladi. "Chiqish"
bosilganda eski versiyalardan qolgan kesh ham tozalanadi.

---

## 2. Sayt tezlashtirildi

O'lchov sharti har safar bir xil: **6 barobar sekinlashtirilgan
protsessor** (arzon Android telefonga yaqin), 390px ekran, haqiqiy
sahifa.

| Ko'rsatkich | Oldin | Endi | Farq |
|---|---|---|---|
| Birinchi ko'rinish (FCP) | 1416 ms | **688 ms** | 2,1 barobar tez |
| Sahifa tayyor (DOMContentLoaded) | 2268 ms | **931 ms** | 2,4 barobar tez |
| To'liq yuklanish | 2459 ms | **1099 ms** | 2,2 barobar tez |
| Uzun vazifalar (>50 ms) | 7 ta, eng uzuni 341 ms | **5 ta, eng uzuni 201 ms** | — |

### Nima qilindi

**a) Xizmat ishchisi va bildirishnoma — bo'sh vaqtga ko'chirildi.**
`PWA.init()` (oflayn rejim) va `PUSH.init()` (bildirishnoma) sahifaning
birinchi ko'rinishiga umuman kerak emas, lekin ikkalasi ham brauzerni
band qilardi. Endi ular brauzer **bo'sh qolganda** ishga tushadi
(`requestIdleCallback`, eski Safari'da oddiy kechikish). Oflayn rejim
ham, bildirishnoma ham ishlashda davom etadi — faqat bir soniyacha
keyinroq ro'yxatdan o'tadi.

**b) Katalog ro'yxati bekorga chizilmaydi.** Ilgari katalogdagi 15 ta
kartochka sayt ochilishi bilan **har doim** chizilardi — hatto mijoz
bosh sahifada turganda ham, ya'ni ko'rinmaydigan narsa chizilardi.
Endi: katalog bo'limi ochiq bo'lsagina darhol, aks holda bo'sh vaqtda.
Mijoz katalogga o'tsa, bo'lim o'zi qayta chizadi — kechikish
sezilmaydi (o'lchandi: 123 ms, 6 barobar sekin protsessorda).

**c) Keraksiz tarjima aylanishi olib tashlandi.** Sahifadagi matn
allaqachon o'zbekcha yozilgan, lekin har ochilishda 54 ta tugunning
matni **qaytadan yozib chiqilardi** — har biri joylashuvni qayta
hisoblatardi. Endi bu faqat rus tilida bajariladi. (Tekshirildi: rus
tilida tarjima avvalgidek ishlayapti — «Профиль».)

**d) Ko'rinmaydigan kartochkalar chizilmaydi.**
`content-visibility:auto` — brauzer ekrandan tashqaridagi
kartochkaning ichini chizmaydi va joylashuvini hisoblamaydi. Katalog
ro'yxati, sevimlilar va to'lovlar jadvaliga qo'yildi.
`contain-intrinsic-size` bilan birga, shuning uchun aylantirgich
sakramaydi.

**e) Keraksiz kod o'chirildi** — "Profil" bo'limidagi profil
kartochkasi, uning keshi va kirish mantig'i.

### Boshqa o'lchovlar (hammasi 6 barobar sekin protsessorda)

| Nima | Natija |
|---|---|
| Bosh sahifa ochilishi | 42 ms |
| Katalog ochilishi | 123 ms |
| Sevimlilar | 35 ms |
| Buyurtmalarim (kabinet) | 57 ms |
| Profil | 65 ms |
| Aylantirishda FPS | **61** |
| Kabinet kartochkasini qayta chizish | 14 ms |

JS xatosi 0 ta. Kirish, spidometr, to'lov tasmasi va to'lovlar
jadvali — hammasi qayta tekshirildi, ishlayapti.

---

## 3. Adminka: sahifa yangilanganda login ekraniga chiqib ketmaydi

### Xato nimada edi

Adminka'da **`onAuthStateChanged` umuman yo'q edi**. Ya'ni panel
sahifa ochilganda "admin kirganmi?" degan savolni hech qachon
so'ramasdi — har safar to'g'ridan-to'g'ri login ekranini ko'rsatardi.

Firebase seansni brauzerda o'zi saqlaydi va u **o'chmagan edi** —
shunchaki panel uni **o'qimasdi**. Shuning uchun admin har F5
bosganda login va parolni qaytadan yozishga majbur bo'lardi.

### Qanday tuzatildi

1. Kirgandan keyingi qadamlar (`loadLastSeen`, `checkAdminClaimStatus`,
   dashboard'ni ko'rsatish, bo'limlarni yuklash) alohida
   **`panelniOch()`** funksiyasiga ajratildi.
2. Sahifa ochilganda **`seansniTikla()`** ishga tushadi: Firebase'dan
   seansni so'raydi va seans bor bo'lsa panelni o'zi ochadi.
3. `setPersistence(LOCAL)` ataylab yozib qo'yildi — kelajakda kimdir
   o'zgartirib qo'ymasin.

**Muhim nozik joy:** Firebase seansni **asinxron** o'qiydi — sahifa
ochilgan lahzada `currentUser` hali `null` bo'ladi. Agar shu lahzada
login ekranini ko'rsatsak, aynan o'sha xato takrorlanardi. Shuning
uchun Firebase javobi kutiladi va kutish paytida login ekrani EMAS,
**«Ruxsatlar tekshirilmoqda...»** ekrani turadi — admin login
formasini bir lahzaga ham ko'rmaydi.

**Himoya:** Firebase javob bermay qolsa (internet yo'q, CDN to'silgan)
3 soniyadan keyin login ekrani ko'rsatiladi — admin kutib qolmaydi.

**Seans jurnali buzilmadi:** sahifani yangilash "yangi kirish" deb
yozilmaydi (aks holda jurnal bir kunda o'nlab keraksiz yozuv bilan
to'lardi) — faqat haqiqiy kirish yoziladi.

**Xavfsizlik o'zgarmadi:** dashboard baribir faqat ruxsatlar
SERVERDAN tasdiqlangandan keyin ko'rsatiladi
(`checkAdminClaimStatus()`), shu sabab cheklangan sub-admin uchun
yopiq bo'limlar bir lahzaga ham "chaqnab" ko'rinmaydi. Haqiqiy himoya
esa avvalgidek Firestore qoidalari va funksiyalardagi
`requireAdmin()` da.

### Tekshiruv (haqiqiy panel sahifasi, brauzerda)

| Holat | Natija |
|---|---|
| Seans BOR, sahifa yangilandi | ✅ login ko'rinmadi → tekshiruv ekrani → dashboard |
| Seans YO'Q | ✅ login ekrani ko'rsatildi |
| Firebase javob bermadi | ✅ 3 soniyadan keyin login ekrani |
| Haqiqiy kirish | ✅ dashboard ochildi, jurnalga `login` yozildi |
| Sahifa yangilanganda jurnal | ✅ keraksiz yozuv YO'Q |

JS xatosi 0 ta. `panel.js` va `panel.css` manzillaridagi versiya
`v=132` ga oshirildi — brauzer eski nusxani ishlatmasin.
