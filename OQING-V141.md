# V141 — SHISHASIMON KARTOCHKA (zamonaviy, lekin tezroq)

## SIZ NIMA SO'RAGANSIZ

> "kartochka oldiga chiziq qo'yma, undan ko'ra kartochkani zamonaviy
> qil, shishali mi, lekin tez ishlasin, juda tez"

## NIMA QILINDI

**1. Kartochkaning o'zi shishasimon bo'ldi.**
Endi har bir kartochka yuzasida yuqoridan pastga so'nadigan nozik
yorug'lik bor, yuqori chekkasida bir piksellik yorug' qirra, pastki
chekkasida esa ingichka soya — ya'ni shisha plastinkaning qalinligi
ko'rinadi. Kartochka fonidan sal "ko'tarilib" turadi.

**2. Kartochka oldidagi chiziq YO'Q.**
Siz aytganingizdek, chap chekkadagi toifa chizig'i qo'yilmadi. Toifa
baribir ko'rinib turadi — kartochka ustidagi yorliq (VIP / PREMIUM /
GOLD) o'sha ma'lumotni beradi.

**3. Raqamlar va narxlar ustun bo'lib tekis tizildi.**
Shriftda "1" ingichka, "0" keng bo'lgani uchun ro'yxatdagi raqamlar
sal qalqib turardi. Endi har bir raqam bir xil kenglikda — bu bank va
aloqa operatori saytlarini "aniq" qilib ko'rsatadigan mayda, lekin eng
kuchli belgilardan biri.

## ENG MUHIMI: TEZLIK OSHDI, PASAYMADI

"Shisha" deganda odatda `blur` (orqa fonni xiralashtirish) tushuniladi.
**Aynan shu narsa saytni sekinlashtirgan edi** — `blur` har kadrda
elementning ortidagi piksellarni qayta hisoblaydi, oddiy Android
telefonining videokartasi esa buni ro'yxatdagi 15-40 ta kartochka
uchun ko'tarolmaydi.

Shuning uchun shisha boshqacha yasaldi: **bitta chiziqli gradient va
bitta soya to'plami** — ikkalasi ham STATIK, ya'ni brauzer kartochkani
bir marta chizadi va keyin faqat xotiradan ko'chiradi. Aylantirishda
qo'shimcha hisob yo'q. `blur`, `filter`, `backdrop-filter` va yangi
animatsiya — umuman yo'q.

### Yo'l-yo'lakay topilgan va tuzatilgan narsa

Birinchi urinishda shisha ranglari CSS o'zgaruvchisi qilib `:root` ga
qo'yilgan edi. O'lchov ko'rsatdi: **uslub qayta hisoblanishi 14-20% ga
oshdi**. Sababi — `:root` dagi o'zgaruvchi sahifadagi har bir elementga
meros bo'lib o'tadi. Sayt faqat tungi mavzuda ishlagani uchun
o'zgaruvchining foydasi yo'q edi, shuning uchun qiymatlar to'g'ridan-
to'g'ri yozildi. Shundan keyin ko'rsatkich joyiga tushdi.

Shuningdek klaviatura uchun ko'rinadigan halqa (`:focus-visible`) ham
qo'shilgan edi — u ham uslub hisobini 14% ga oshirdi va **olib
tashlandi**, chunki sizning birinchi talabingiz tezlik.

### O'LCHOV (6 barobar sekin protsessor, 4 ta o'lchov medianasi)

| ko'rsatkich | V140 | V141 |
|---|---|---|
| uslub hisobi | 186.0 ms | 173.5 ms |
| joylashuv hisobi | 76.9 ms | 76.6 ms |
| jami ish vaqti | 763.7 ms | 734.6 ms |
| aylantirishda FPS | 60 | 60 |
| JS xatolar | 0 | 0 |

Ya'ni ko'rinish zamonaviyroq bo'ldi, tezlik esa **pasaymadi — bir oz
yaxshilandi**.

## QAYSI FAYL O'ZGARDI

Atigi **2 ta fayl**:

* `index.html` — shisha uslublari (V141 bloki)
* `sw.js` — kesh raqami `v30` ga ko'tarildi (telefon eski ko'rinishni
  ko'rsatib qolmasligi uchun)

## QANDAY YUKLASH

`VIP-V141-FAQAT-2-FAYL.zip` ichidagi ikkala faylni GitHub'da eski
fayllar ustiga tashlang (bir xil nomdagi fayl almashadi) va **bitta
commit** qiling.

## ESLATMA — DEPLOY

Netlify'da qurilish daqiqalari tugagani sababli so'nggi o'zgarishlar
hali saytga chiqmagan bo'lishi mumkin. Daqiqalar tiklangach:
**Deploys → Trigger deploy → Clear cache and deploy site**. Shu
bo'lmaguncha tezlikni ham, yangi ko'rinishni ham telefonda sezib
bo'lmaydi.
