# V133 — Surish silliqlashtirildi (karusel va barcha oynalar)

## Muammo

Bosh sahifadagi yurib turuvchi kartochkani qo'l bilan surganda — hatto
yaxshi telefonda ham — "qotgandek" sudralardi va joyiga qattiq
o'tirardi.

## Sababi (o'lchab topildi)

Ikkita aniq sabab bor edi, ikkalasi ham karusel kodida:

**1) Har bir barmoq xabarida MAJBURIY joylashuv hisobi.**
`pointermove` ichida `heroW()` chaqirilardi, u esa `offsetWidth`
o'qiydi. Brauzer uchun bu "hozir hamma narsani qayta o'lchab ber"
degani (forced reflow). Barmoq esa soniyasiga 120 martagacha xabar
beradi.

O'lchandi: **bitta kadr ichida 80 ta barmoq xabari → 78 ta majburiy
joylashuv hisobi.**

**2) Uslub kadrdan tez-tez yozilardi.** Telefon sensori 120 Hz,
ekran 60 Hz — ya'ni bitta kadr uchun transform 2-4 marta yozilardi.
Ortiqcha ish, va aynan shu "sudralish" hissini berardi.

## Qanday tuzatildi

**a) Kartochka kengligi barmoq tushganda BIR MARTA o'lchanadi** va
keshlanadi. Surish paytida hech qanday o'lchov o'qilmaydi.

**b) Yozuv kadrga bittaga tenglashtirildi.** Barmoq xabarlari endi
faqat koordinatani eslab qo'yadi, yozuv esa `requestAnimationFrame`
ichida — ekran yangilanishidan sal oldin, kadriga bitta marta.

O'lchandi: **bitta kadr ichida 80 ta xabar → 0 ta joylashuv hisobi,
0 ta ortiqcha yozuv.**

| Nima | Oldin | Endi |
|---|---|---|
| 80 ta tez xabarda majburiy joylashuv | **78 ta** | **0 ta** |
| Kadr ichida uslub yozuvi | 2-4 ta | **1 ta** |

**c) `will-change: transform` faqat barmoq tegib turganda** beriladi
(doimiy emas — doimiysi xotira yeydi, foyda bermaydi). Videokartaga
"shu element harakatlanadi" deb oldindan aytib qo'yish siljishni
sezilarli silliqlashtiradi.

**d) Joyiga o'tirish yumshatildi.** Davomiylikning pastki chegarasi
240 → **265 ms**, yuqorigisi 460 → **500 ms**. O'sha 25 ms harakat
oxiridagi "to'satdan to'xtash" hissini yo'qotadi; uzoq masofada esa
harakat shoshmaydi. Egri chiziq avvalgidek oxirida silliq so'nadi va
davomiylik barmoq tezligidan hisoblanadi.

## "Sayt ko'p oynalari ham shunday"

Xuddi shu tuzatish saytdagi **barcha surilsadigan joylarga** qo'llandi
— buning uchun umumiy yordamchi (`kadrYozuvchi`) yozildi:

| Joy | Nima |
|---|---|
| Bosh sahifa karuseli | kenglik keshlandi + kadriga bitta yozuv |
| **Storiyalar** (eng ko'p surilsadigan joy) | yonga va pastga surish — kadriga bitta yozuv |
| Sevimlilardagi "chapga surib o'chirish" | kadriga bitta yozuv |
| Bildirishnoma/toast kartochkalari | kadriga bitta yozuv |
| Chekkadan surib orqaga qaytish | kadriga bitta yozuv |

Barmoq uzilganda kutayotgan yozuv **darhol** bajariladi — aks holda
o'tish (transition) boshlangandan keyin eski qiymat yozilib, element
"sakrab" ketardi. Bu alohida hisobga olindi.

**Oynalar ichidagi aylantirish ham tuzatildi:** `overscroll-behavior:
contain` qo'shildi — ro'yxat oxiriga yetganda ortidagi sahifa siljib
ketardi va bu ham "qotgan"dek tuyulardi. Endi oyna ichidagi
aylantirish sahifaga o'tib ketmaydi. `overflow-anchor:none` esa
ro'yxatga yangi qator qo'shilganda brauzerning o'zi aylantirib
yuborishining oldini oladi.

## Tekshiruv

Haqiqiy sahifa, 390px, **6 barobar sekinlashtirilgan protsessor**:

| Nima | Natija |
|---|---|
| Chapga surish | ✅ keyingi kartochkaga o'tdi, nuqta siljidi |
| O'ngga surish | ✅ oldingisiga qaytdi |
| Sekin, ozgina surish | ✅ joyiga qaytdi (kartochka almashmadi) |
| 80 ta tez xabar | ✅ 0 ta majburiy joylashuv, 0 ta ortiqcha yozuv |
| Aylantirishda FPS | ✅ 61 |
| JS xatosi | ✅ yo'q |

Sayt yuklanishi ham tekshirildi — V132 dagi natijalar saqlanib qoldi
(birinchi ko'rinish ~750 ms, to'liq yuklanish ~1040 ms). Kirish,
kabinet, to'lovlar jadvali va adminka seansi — hammasi qayta
tekshirildi, ishlayapti.
