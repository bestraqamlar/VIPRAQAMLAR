# V135 — Bot kuniga bir marta xabar beradi va sababini aytadi + Humans tezlashdi

## 1. "Ishlamayapti" xabari hadeb kelavermaydi

### Qanday edi

Bitta nosozlik haqida xabar **har 30 daqiqada** qaytarilaverardi.
Muammo bir hafta turib qolsa — bot bir haftada **300 ga yaqin bir xil
xabar** yuborardi. Natijada odam ularga umuman qaramay qo'yadi.

Xabarning o'zi ham foydasiz edi: ichida xom texnik matn turardi —
`Ucell: Ucell login: HTTP 404`. Undan **nima qilish** kerakligi
tushunarsiz.

### Qanday bo'ldi

**a) Sabab aniqlanadi.** Xato endi turkumlanadi
(`netlify/functions/lib/xatoSababi.js`) va har biriga sabab + aniq
qadam yoziladi:

| Xato | Sabab | Nima qilish | O'zi tuzaladimi |
|---|---|---|---|
| HTTP 404 / 410 | API manzili o'zgargan | Operatordan yangi manzil olib, Adminka → Operatorlar ga kiritish | yo'q |
| HTTP 401 / 403 | Login/parol yoki kalit eskirgan | Adminka → Operatorlar → login-parolni yangilash | yo'q |
| HTTP 429 | So'rovlar chegarasi | hech narsa — tizim o'zi siyraklashtiradi | **ha** |
| HTTP 5xx | Operator serverida nosozlik | hech narsa — operator tuzatgach tiklanadi | **ha** |
| timeout | Operator sekin javob beryapti | hech narsa — qayta urinadi | **ha** |
| fetch failed | Tarmoq/ulanish xatosi | hech narsa — aloqa tiklangach ishlaydi | **ha** |
| sessiya | Sessiya eskirgan | hech narsa — tizim o'zi yangilaydi | **ha** |
| login/parol yo'q | Umuman kiritilmagan | Adminka → Operatorlar → to'ldirish | yo'q |

**b) Xabar faqat kerak bo'lganda ketadi.**

Siz so'raganingizdek — **kuniga bir marta**:

* **birinchi** xabar — muammo aniqlangach **darhol** (aks holda
  nosozlik haqida bir kun bilmay yurilardi);
* keyin — muammo davom etsa ham **har 24 soatda bir marta**.

Bitta istisno: **o'zi tuzaladigan** turkumlar (timeout, 5xx, 429,
tarmoq uzilishi) odatda bir necha daqiqada o'tib ketadi — ular bo'yicha
**birinchi xabar ham darhol emas**, nosozlik **3 soatdan** oshgandagina
yuboriladi. Keyin ular ham kuniga bir marta. Ya'ni bir daqiqalik
uzilish uchun bot umuman xabar bermaydi.

Xabar oxirida shu qoida yozib qo'yiladi: *"Bu xabar kuniga BIR MARTA
keladi — muammo hal bo'lmaguncha bot sizni bezovta qilmaydi. Tuzalsa
darhol xabar beradi."*

Nosozlik tuzalsa hisoblagich nolga qaytadi — keyingi safar yana
darhol xabar keladi.

Xuddi shu qoida (kuniga bir marta) tizim sog'ligi xabarlariga ham qo'llandi
(`soglik-background.js` — "Katalog indeksi qayta qurilmayapti" kabi).

**c) Tinim aqlliroq bo'ldi.** Manzil/parol xatosida operator
**1 soat** tinimga chiqariladi (avvalgi 15 daqiqa o'rniga) — chunki
404 hech qachon o'z-o'zidan tuzalmaydi, bekorga so'rov yuborishning
ma'nosi yo'q. O'zi tuzaladigan holatlarda avvalgidek 15 daqiqa.

**d) Adminkada ham ko'rinadi.** Adminka → Kuzatuv bo'limida har bir
operator kartochkasi ostida endi **«Sababi»** va **«Nima qilish»**
yoziladi, o'zi tuzaladigan holatlarda esa *"Bu holat o'zi tuzaladi —
aralashuv shart emas"* deb turadi.

### Namuna xabar

```
⚠️ Ucell ishlamayapti

❓ SABABI: Ucell API manzili ishlamayapti (HTTP 404). Odatda bu
manzil O'ZGARGANINI bildiradi — operator yangi manzilga ko'chgan.

🛠 NIMA QILISH: Operatordan yangi API manzilini oling va
Adminka → Operatorlar → Ucell bo'limiga kiriting.

🔁 ketma-ket 12 marta xato
⏸ Bekorga so'rov yubormaslik uchun tinimga chiqarildi (60 daqiqa)

🔕 Bu xabar kuniga BIR MARTA keladi — muammo hal bo'lmaguncha bot
sizni bezovta qilmaydi. Tuzalsa darhol xabar beradi.
📄 Texnik xato: Ucell login: HTTP 404
```

---

## 2. Humans tezlashdi

### Sababi topildi

Humans'da qidiruvdan **oldin** anonim sessiya ochish shart
(`joinAnonymous`) — ya'ni **ikkita ketma-ket so'rov**: avval sessiya
(~300-800 ms), keyin qidiruv (~250 ms).

Sessiya funksiyaning **o'z xotirasida** 4 daqiqa saqlanardi. Lekin
Netlify funksiyasi deyarli har safar **yangidan** ishga tushadi (cold
start) — shuning uchun mijoz uchun kesh **deyarli har doim bo'sh**
bo'lardi. Aynan shu "saytda ochilsa darhol kelmayapti" degan
holatning sababi edi.

### Tuzatildi

Sessiya endi **umumiy omborga** (Firestore,
`lib/sessiyaOmbori.js`) ham yoziladi:

* Firestore'dan bitta hujjat o'qish — **~20-40 ms**;
* Humans'dan sessiya olish — **~300-800 ms**.

Ya'ni funksiya qaysi nusxada ishga tushmasin, sessiya **tayyor**
turadi va mijoz uchun qidiruv **bitta** borib-kelishga qisqaradi.

Qo'shimcha: kuzatuv funksiyasi har daqiqada ishlagani uchun sessiyani
**isitib** turadi (`humansIsitish`) — muddati tugashiga 90 soniya
qolganda yangilab qo'yadi. Demak mijoz qidirganda u amalda **doim**
tayyor.

Ombordagi sessiya eskirgan bo'lsa — bir marta xato bo'lib, kesh
tozalanadi va yangisi olinadi (avvalgidek). Timeout bo'lsa qayta
urinilmaydi (V120 dagi tuzatish saqlandi).

**XAVFSIZLIK:** `operator_sessions` to'plami brauzerdan **umuman**
o'qilmaydi (Firestore qoidalarida ro'yxatga olinmagan yo'llar to'liq
yopiq; izoh `firestore.rules` ga yozildi). Ichida faqat operatorning
vaqtinchalik **anonim** sessiya tokeni bor — shaxsiy ma'lumot emas.

### O'lchangan natija

Soxta Humans API bilan (sessiya 400 ms, qidiruv 250 ms deb
belgilangan):

| Holat | Vaqt |
|---|---|
| Sovuq nusxa, **omborsiz** (eski holat) | **658 ms** |
| Sovuq nusxa, ombor bo'sh (birinchi marta) | 653 ms |
| Sovuq nusxa, **ombor to'la** (mijoz ko'radigan holat) | **251 ms** |

Ya'ni **2,6 barobar tez**. Haqiqiy Humans serverida sessiya 300-800 ms
olgani uchun farq bundan ham kattaroq bo'lishi mumkin.

---

## Tekshiruv

**Xato turkumlagich** (15 ta holat): 404 → manzil, 401 → parol,
429 → limit, 5xx → server, timeout → sekin, fetch failed → tarmoq,
sessiya, sozlama; "o'zi tuzaladi" belgisi; qadam matni;
oraliqlar: birinchi xabar darhol, keyingilari **har safar 24 soat**
(ko'paymaydi ham, kamaymaydi ham); o'zi tuzaladigan turkum uchun
birinchi xabar 3 soatdan keyin, keyingilari 24 soat —
**hammasi ✅** (15 ta holat).

**Humans sessiyasi** (7 ta holat): omborsiz sovuq nusxa sessiya
oladi; ombor bo'sh bo'lganda sessiya olinadi va **omborga yoziladi**;
yangi sovuq nusxa sessiya **so'ramaydi**, lekin qidiruvni bajaradi va
natija qaytaradi; ombordagi sessiya eskirgan bo'lsa yangisi olinadi —
**hammasi ✅**.

Barcha o'zgargan fayllarning sintaksisi tekshirildi, saytning
yuklanishi va kabineti qayta sinaldi — JS xatosi yo'q.
