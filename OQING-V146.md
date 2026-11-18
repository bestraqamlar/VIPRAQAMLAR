# V146 — SAYT TEZLIGI VA KREDIT QOIDASI

## 1. SAYT SEKIN INTERNETDA IKKI BAROBARDAN TEZ OCHILADI

### Muammo

Saytning barcha uslublari (**170 KB**) `index.html` ICHIDA edi. HTML
esa keshlanmaydi va keshlanmasligi ham kerak — yangi versiya mijozga
darhol yetib borishi shart. Natijada har bir tashrifda 170 KB uslub
qaytadan yuklanardi va **sahifa shugacha bo'm-bo'sh turardi**.

### Yechim — ikkiga bo'lish

Uslublar o'lchov bilan ikkiga ajratildi:

* **Birinchi ekran uchun keraklisi** (~64 KB) — `index.html` ichida
  qoldi, ya'ni qo'shimcha so'rov kutilmaydi;
* **Qolgani** (~65 KB: oynalar, buyurtma oqimi, kabinet, profil,
  vakansiya, kompyuter ko'rinishi) — `assets/sayt.css` fayliga
  chiqarildi. U **bloklamasdan** yuklanadi va **bir yilga**
  keshlanadi.

Kerakli uslublarni qo'lda emas, brauzerning o'zidan so'rab ajratdim:
har bir qoidani birinchi ekrandagi elementlarga solishtirib chiqdim.

### O'lchov (sekin mobil internet 3G, arzon telefon, 3 o'lchov)

| | V145 | V146 |
|---|---|---|
| birinchi ko'rinish (FCP) | 1760 ms | **772 ms** |
| HTML hajmi (siqilgan) | 62 KB | **28 KB** |

**−56%.** Sahifa ikki barobardan tez ko'rinadi.

### Ko'rinish buzilmaganini qanday tekshirdim

Eski va yangi nusxani bir xil ma'lumot bilan ochib, bosh sahifa,
katalog, profil va raqam oynasining suratlarini **piksel darajasida**
solishtirdim. Kompyuter ko'rinishi ham alohida tekshirildi (yuqori
menyu, yon panel, ustunlar) — farq yo'q.

### DIQQAT — kelajak uchun

`assets/sayt.css` yoki `index.html` dagi uslublarni o'zgartirsangiz,
`index.html` dagi `sayt.css?v=146` raqamini **albatta oshiring**.
Aks holda mijozlarda eski uslublar bir yil qolib ketadi. Xuddi shu
qoida `app.js` uchun ham amal qiladi.

---

## 2. KREDIT JADVALI — SIZ AYTGAN YANGI QOIDA

Avvalgi qoida o'zgartirildi. Endi **ikki xil**:

### Bosh to'lovsiz
Shartnoma kunida to'lov **yo'q**. To'lovlar **keyingi oydan**
boshlanadi, jami **N ta**.

```
24 oy, shartnoma 10.11.2026, to'lov kuni 10:
  1-to'lov   10.12.2026
  ...
  24-to'lov  10.11.2028
```

### Bosh to'lov bilan
Bosh to'lov **shartnoma kunida** olinadi va u **birinchi oy o'rniga**
hisoblanadi — shuning uchun oylik to'lovlar bittaga kam.

```
24 oy, shartnoma 10.11.2026, to'lov kuni 10:
  Bosh to'lov  10.11.2026
  1-to'lov     10.12.2026
  ...
  23-to'lov    10.10.2028     <-- 23 ta (siz aytganingizdek)
```

Admin formasida **ptichka** bor: yoqilsa summa maydoni chiqadi.
Jonli hisob-kitob ham shu qoida bo'yicha ishlaydi.

**Himoya:** bosh to'lov bilan muddat kamida 2 oy bo'lishi kerak —
1 oylik shartnomada oylik to'lov umuman qolmas edi va jadval bo'sh
bo'lib, hisob-kitob buzilardi.

**Qisqa oylar:** to'lov kuni 31 bo'lsa, fevralda 28 ga (kabisa
yilida 29 ga), aprelda 30 ga qisqaradi.

---

## 3. SHARTNOMA RAQAMI — XX12345

Masalan: `ZM23221`, `UT22461`, `CJ86731`.

`I`, `O`, `Q`, `S` harflari **ishlatilmaydi** — ular og'zaki
aytilganda `1`, `0`, `9`, `5` bilan adashtiriladi. Admin raqamni
telefonda mijozga aytadi, shuning uchun chalkashlik bo'lmasligi
muhim.

20 000 ta namuna sinaldi: shakl 100% to'g'ri, chalkashtiruvchi harf
yo'q. Bazadan takrorlanmaslik ham tekshiriladi.

Shartnoma raqami endi kredit ro'yxatida **telefon raqami tagida**
kichkina qilib ko'rinadi.

---

## TEKSHIRUVLAR

Kredit jadvali 19/19 · admin formasi 15/15 · buyurtma oqimi 10/10 ·
til almashtirish 5/5 · karusel ikki tomonga · FPS 61 · JS xato 0 ·
ko'rinish piksel bo'yicha solishtirildi.

---

## KEYINGI NAVBATDA (siz tanlagan, hali tugallanmagan)

* telefon uchun admin panel (mijoz sayti shablonida)
* mini ilovada Telegram tugmasi bilan buyurtma berish va botdan
  aniq raqamni ochish
