# V126 — PROFIL BO'LIMI

## Muammo

"Profil" bo'limi bor edi, lekin ichida profil YO'Q edi — faqat menyu:
Telegram, Buyurtmalarim, Shartnomalarim, Hamkor bo'lish, Vakansiyalar,
Instagram, Savol-javob. Mijoz o'zini ko'rmasdi.

Kabinet ham xuddi shunday: to'g'ridan-to'g'ri buyurtmalar ro'yxatidan
boshlanardi, ya'ni "kabinet" emas, "qidiruv natijasi" edi.

## Endi

**Profil kartochkasi IKKI joyda ko'rinadi:** "Profil" bo'limining eng
tepasida va kabinetning eng tepasida. Ichida:

* ism harflari bilan avatar (rasm emas — yuklanmaydi, sinmaydi);
* ism va telefon raqami;
* daraja belgisi: **MIJOZ** → **DOIMIY MIJOZ** (2+ raqam) →
  **VIP MIJOZ** (5+ raqam). Hech qanday huquq bermaydi, faqat belgi;
* 4 ta raqam: buyurtma, yakunlangan, shartnoma, qolgan qarz
  (eng kerakligi oldinda; bo'sh ko'rsatkich umuman chiqmaydi);
* pastda eslatma: **keyingi to'lov sanasi**, kechikish bo'lsa —
  qizil ogohlantirish va necha oy kechikkani.

### Ma'lumot qayerdan

Hammasi mijozning O'ZI kiritgan ma'lumotdan: buyurtma bergandagi ism
va hudud, yoki shartnomadagi shu maydonlar. Yangi so'rov qo'shilmadi —
`api-kabinet` allaqachon o'qiydigan hujjatlardan hisoblanadi.

**Passport, tug'ilgan sana va yashash joyi profilga HAM qo'shilmadi.**
Brauzerga yuborilmaydi (xavfsizlik izohi `api-kabinet.js` boshida).

Ikki bosqichli tekshiruv o'zgarmadi: telefon + raqamning oxirgi 4 ta
raqami to'g'ri kelmasa, profil ham, buyurtma ham, shartnoma ham
berilmaydi. Tekshirildi: noto'g'ri kalit bilan javobda `profile`
umuman yo'q.

### Internet sekin yoki yo'q bo'lsa

Oxirgi profil mijozning O'Z telefonida saqlanadi (`vip_profil`), va
"Profil" bo'limi ochilganda DARHOL shundan chiziladi — bo'sh joy
ko'rinmaydi. Keyin fon rejimida serverdan yangilanadi. Internet
umuman bo'lmasa va kesh ham bo'lmasa: telefon raqami va
"Aloqa yo'q — ma'lumot keyin yangilanadi" degan xotirjam qator,
xato emas. Saqlanadigan narsa — ism va hisob-kitob; parol, token yoki
hujjat ma'lumoti EMAS.

Kabinetga hali kirmagan mijoz uchun "Kabinetga kirish" kartochkasi
ko'rinadi — bitta bosishda kabinetga olib boradi.

"Chiqish" bosilganda profil keshi ham tozalanadi.

### Tezlik

Kartochkada `backdrop-filter` YO'Q (sekin Androidda eng qimmat narsa
shu edi) va hech qanday harakat yo'q — faqat gradient va chiziq.
Yuklanayotgan paytdagi skeletning o'lchamlari haqiqiy kartochkanikiga
teng, shuning uchun ma'lumot kelganda sahifa SAKRAMAYDI.

## Tekshiruv

Brauzerda (390px, haqiqiy sahifa, soxta server javobi bilan):

| Holat | Natija |
|---|---|
| VIP mijoz, ism bor | ✅ ism, nishon, 4 katak, keyingi to'lov sanasi |
| Kechikkan to'lov | ✅ qizil ogohlantirish, "2 oy" |
| Ismsiz mijoz | ✅ ism o'rnida telefon, avatarda oxirgi 2 raqam |
| Eski server (`profile` yo'q) | ✅ sinmaydi — telefon va "Chiqish" |
| Kabinetga kirmagan | ✅ "Kabinetga kirish" kartochkasi |
| Internetsiz, kesh bor | ✅ profil to'liq ko'rinadi |
| Internetsiz, kesh yo'q | ✅ telefon + xotirjam qator |

Hamma holatda: JS xatosi 0 ta, gorizontal aylantirish yo'q.

Serverda (soxta Firestore, 3 ta buyurtma + 1 ta shartnoma):
ism, buyurtma soni, yakunlangan, jarayonda, xarid summasi, faol
shartnoma, qolgan qarz, daraja, mijozlik sanasi va keyingi to'lov
sanasi — hammasi to'g'ri hisoblandi; javobda passport yo'q.

---

## V127 — PLASTIK KARTOCHKA

Siz so'raganingizdek: tepada **bitta** kartochka, **haqiqiy plastik
kartochka o'lchamida**, premium ko'rinishda. Ko'rsatkichlar to'ri va
alohida eslatma qatori olib tashlandi — kerakli hammasi kartochkaning
o'z ichiga joylashtirildi.

### O'lcham

`aspect-ratio: 1.586` — bu **ID-1 standarti**, ya'ni bank
kartochkasining aniq nisbati (85.6 x 54 mm). Eni ekranga moslashadi,
balandligi o'zi hisoblanadi. O'lchangani: 390px ekranda
**354 x 223 px, nisbat 1.586** — aniq mos.

### Kartochkada nima bor

| Joy | Nima |
|---|---|
| Tepa chap | **VIP RAQAMLAR** · "Shaxsiy karta" (VIP uchun tilla gradient harflar) |
| Tepa o'ng | "Chiqish" tugmasi (mayda ikona) |
| O'rta | tilla **chip** va kontaktsiz to'lov belgisi — ikkalasi ham toza CSS, rasm emas |
| Katta qator | telefon raqami, kartochka raqami uslubida (harflari ajratilgan, `tabular-nums`) |
| Past chap | ISM (katta harflarda) va ostida mijozlik sanasi |
| Past o'ng | daraja belgisi (**VIP** yulduz bilan / **DOIMIY** tasdiq belgisi bilan / **MIJOZ**) va ostida bitta eng muhim qator |

Pastdagi mayda qator ustuvorlik bilan tanlanadi: **kechikish bo'lsa
kechikish** (qizil) → bo'lmasa **keyingi to'lov sanasi** → u ham
bo'lmasa nechta raqam olingani. Kartochkada joy oz, shuning uchun
faqat bittasi ko'rinadi.

Kabinetga hali kirmaganlar uchun ham xuddi shu o'lchamdagi kartochka,
lekin ichi sodda: ikona va "Kabinetga kirish".

### Tezlik

Bezakning hammasi gradient va chiziq: `backdrop-filter` yo'q,
`filter`/`blur` yo'q, animatsiya yo'q, rasm yo'q. Chip ham, kontaktsiz
belgisi ham CSS va inline SVG — hech narsa yuklanmaydi. Juda sust
telefonlarda (`html.low`) naqsh va yorug'lik tasmasi butunlay
o'chiriladi.

**O'lchangan** (6 barobar sekinlashtirilgan protsessor, 390px):
kartochkani to'liq qayta chizish **13 ms** (oldingi, ko'rsatkichli
variantda 38 ms edi), aylantirishda **61 FPS**.

### Tekshiruv

| Holat | Natija |
|---|---|
| VIP mijoz | ✅ tilla brend, tilla chip, "★ VIP", "to'lov 15.11.2026" |
| Kechikkan to'lov | ✅ "DOIMIY" + qizil "2 OY KECHIKDI" |
| Ismsiz mijoz | ✅ "Mijoz" + telefon raqami |
| Eski server (`profile` yo'q) | ✅ sinmaydi |
| Kabinetga kirmagan | ✅ bir xil o'lchamdagi "Kabinetga kirish" kartochkasi |
| Internetsiz, kesh bor | ✅ kartochka to'liq ko'rinadi |
| Internetsiz, kesh yo'q | ✅ telefon raqami bilan sodda kartochka |

Hamma holatda: nisbat 1.586, JS xatosi 0 ta, gorizontal aylantirish yo'q.

---

## V128 — kartochka soddalashtirildi, to'lovlar ichiga kirdi

Siz so'raganlar bajarildi:

**1. Sariq chip va "SHAXSIY KARTA" yozuvi olib tashlandi.**
Tepada endi faqat tilla **VIP RAQAMLAR** yozuvi turadi. Kontaktsiz
to'lov belgisi ham olib tashlandi — u bu yerda ma'nosiz edi.

**2. Pastdagi barcha oylik to'lovlar kartochkaning ichiga kirdi.**
Pastdagi shartnoma kartochkasidan "To'lovlar jadvali" bo'limi butunlay
olib tashlandi (endi u yerda takrorlanmaydi).

Kartochkada to'lovlar **tasma** ko'rinishida: har bir oy bitta ustun —

* **to'langan** — baland va yorqin (VIP'da tilla, boshqada yashil);
* **kechikkan** — baland va qizil;
* **kutilmoqda** — past va xira.

Ostida bitta qator: **6/12 OY TO'LANDI** va o'ng tomonda
**QOLDI 7 200 000 SO'M ›**.

Nega ro'yxat emas, tasma: kartochka plastik o'lchamida qolishi kerak
(1.586), 12 ta qatorni u yerga sig'dirib bo'lmaydi. Tasma esa bir
qarashda "qancha to'ladim, qancha qoldi" degan javobni beradi, va
ustunlar teng bo'linganligi uchun 3 oy ham, 60 oy ham bir xil joyga
sig'adi.

**To'liq jadval** — kartochkani bosganda oynada ochiladi: har bir
shartnoma bo'yicha "to'langan / qoldi" sarlavhasi va oyma-oy ro'yxat
(oy raqami, sana, summa, holat belgisi). Klaviaturadan Enter/Probel
bilan ham ochiladi. "Chiqish" tugmasi kartochka ichida bo'lgani uchun
uni bosganda jadval ochilmaydi — alohida tekshirildi.

Shartnomasi yo'q mijozda tasma umuman chiqmaydi — bo'sh joy
ko'rinmaydi.

Shartnomalar profil keshiga ham yoziladi (ko'pi bilan 5 tasi), ya'ni
**tasma internetsiz ham ko'rinadi**.

### Tekshiruv

| Nima | Natija |
|---|---|
| Chip va "Shaxsiy karta" | ✅ yo'q |
| Tasma ustunlari | ✅ 12 ta; 6 ta to'langan, 1 ta qizil (kechikkan) |
| Tasma ostidagi qator | ✅ "6/12 oy to'landi · qoldi 7 200 000 so'm" |
| Kartochkani bosish | ✅ jadval oynasi ochiladi, 12 oyning HAMMASI ko'rinadi |
| "Chiqish" bosish | ✅ jadval ochilmaydi, profil tozalanadi |
| Pastdagi takroriy jadval | ✅ olib tashlandi |
| Shartnomasiz mijoz | ✅ tasma chiqmaydi, kartochka buzilmaydi |
| Internetsiz, kesh bor | ✅ tasma to'liq ko'rinadi |

Kartochka o'lchami hamma holatda **354 × 223 (1.586)**, JS xatosi
0 ta, gorizontal aylantirish yo'q.

**Tezlik** (6 barobar sekinlashtirilgan protsessor): kartochkani
to'liq qayta chizish **16 ms**, aylantirishda **60 FPS** — tasma
qo'shilgani sezilarli yuk bermadi (ustunlar oddiy `div`, gradient
bilan).
