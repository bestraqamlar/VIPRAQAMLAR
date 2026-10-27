# V136 — Telegram mini ilova: asosiy sayt endi mini ilova

## Qaror: alohida sahifa EMAS, saytning o'zi

Eski `telegram-ilova.html` (237 KB) — bu saytning **ikkinchi nusxasi**
edi. Aynan shuning uchun xatoga to'lgandi: saytda tuzatilgan narsa u
yerda tuzalmay qolardi, va unda kabinet, Telegram kodi bilan kirish,
premium kartochka, spidometr, tezlik ishlari — hech biri yo'q edi.

Endi **bitta kod**: `index.html` Telegram ichida mini ilova sifatida
ishlaydi. Bundan keyin saytda tuzatilgan har narsa mini ilovada ham
ishlaydi. Eski fayl `_telegram-ilova-keyinga/` papkasida qoldi
(o'chirilmadi), eski manzillar esa saytga yo'naltiriladi — BotFather
menyu tugmasi eski manzilda qolgan bo'lsa ham ishlayveradi.

---

## 1. TOPILGAN ASOSIY XATO: SDK umuman yuklanmasdi

`index.html` ichida `Telegram.WebApp` bilan ishlaydigan kod bor edi —
lekin sayt **`telegram-web-app.js` ni umuman yuklamasdi**. Ya'ni o'sha
kodning hammasi **o'lik** edi: `ready()`, `expand()`, haptika — hech
biri ishlamagan.

Bu mini ilovaning "qotishi"ga ham bevosita aloqador: `ready()`
chaqirilmasa, Telegram sahifa tayyorligini bilmay, yuklanish ekranini
ortiqcha ushlab turadi.

**Tuzatildi.** Endi Telegram ichida ekanimiz **tarmoqsiz**
aniqlanadi — Telegram mini ilovani ochganda manzilga o'z belgilarini
qo'shadi (`#tgWebAppData=...`, `tgWebAppPlatform`). Shu sabab:

* SDK **faqat Telegram ichida** yuklanadi — oddiy brauzerdan kirgan
  mijoz uni umuman yuklab olmaydi (tekshirildi: 0 ta so'rov);
* `html.tg` sinfi **birinchi qatordayoq** qo'yiladi, ya'ni uslublar
  birinchi chizishdayoq amal qiladi, sahifa sakramaydi;
* `document.write` **ataylab ishlatilmadi** — brauzerlar sekin
  internetda tashqi saytdan shunday yuklangan skriptni bloklab
  qo'yishi mumkin; o'rniga aniq `onload` va'dasi.

## 2. Telegram bilan to'liq bog'landi

| Nima | Holat |
|---|---|
| `ready()` / `expand()` | ✅ chaqiriladi |
| Vertikal surib yopilishni o'chirish | ✅ |
| Sarlavha va fon rangi | ✅ saytning rangiga mos (`#0B1120`) |
| **Orqaga tugmasi** | ✅ ichki bo'limda ko'rinadi, bosilsa oynani yopadi yoki bosh sahifaga qaytaradi, bosh sahifada yashirinadi |
| Oyna balandligi (klaviatura) | ✅ `viewportChanged` kuzatiladi, `--tg-h` ga yoziladi |
| Haptika | ✅ allaqachon bor edi, endi ishlaydi |
| Tepadagi ortiqcha bo'shliq | ✅ olib tashlandi (`--top: 0`) |
| "Yopishni tasdiqlash" | ✅ **o'chirildi** — do'kon ilovasida har yopganda savol berish keraksiz |

## 3. Kabinet KODSIZ ochiladi

Telegram mini ilovaga kirgan odamni bot allaqachon taniydi: Telegram
sahifaga `initData` beradi va uni **bot kaliti bilan imzolaydi**.

Endi mini ilovada kabinet **kod so'ramasdan, o'zi ochiladi**
(`netlify/functions/api-kabinet-tg.js`).

**Xavfsizlik — imzo qat'iy tekshiriladi** (Telegram hujjatidagidek):

1. `hash` ajratiladi, qolgan maydonlar alifbo tartibida birlashtiriladi;
2. maxfiy kalit = HMAC-SHA256("WebAppData", BOT_TOKEN);
3. kutilgan imzo = HMAC-SHA256(maxfiy kalit, o'sha satr);
4. **vaqt bo'yicha teng** taqqoslanadi.

Qo'shimcha: `auth_date` **24 soatdan** eski bo'lsa rad etiladi (eski
`initData` ni qayta ishlatib bo'lmaydi); imzo faqat bot tokeni bilan
yasaladi, token esa faqat serverda — ya'ni brauzerdan soxta `initData`
yasash **mumkin emas**; IP bo'yicha soatiga 60 ta urinish.

Raqami hali botda tasdiqlanmagan mijozga bitta tugmali yo'l
ko'rsatiladi ("Botda tasdiqlash"). Eski mijozlarda bog'lanish bo'lmasa
ham, buyurtmasidagi `customerChatId` orqali topiladi va bog'lanish
o'zi yozib qo'yiladi.

---

## 4. TEZLIK — eng katta ish

### Sababi o'lchab topildi

O'lchov ko'rsatdiki, vaqtning asosiy qismi tarmoqqa emas, **sahifaning
o'zini tahlil qilishga** ketardi:

```
HTML yuklash:                     33 ms
HTML + skriptlarni tahlil qilish: 781 ms   <-- asosiy sabab
```

Sabab: `index.html` **562 KB** edi va uning **363 KB** i beshta
`<script>` blokidagi JavaScript edi.

### Tuzatildi

**a) Asosiy kod alohida faylga chiqarildi** — `assets/app.js` (362 KB).

Nega bu tezlashtiradi: brauzer **tashqi** skriptni bir marta tahlil
qilib (compile), natijasini keshiga saqlaydi — keyingi ochilishlarda
tahlil deyarli takrorlanmaydi (V8 code cache). HTML ichidagi skript
uchun bu kesh ancha kuchsiz va HTML'ning bitta harfi o'zgarsa ham
bekor bo'ladi. **Mini ilova kuniga bir necha marta ochiladi — farq
aynan shu yerda eng ko'p seziladi.**

* `index.html`: **562 KB → 202 KB**
* Fayl `defer` bilan, avvalgi bloklar **tartibida** birlashtirilgan —
  ijro tartibi o'zgarmadi
* Yo'l **ildizdan** boshlanadi (`/assets/app.js`) — `/raqam/...` kabi
  chuqur manzillarda sinmasligi uchun (ilgari shriftlarda aynan shu
  xato bo'lgan edi; tekshirildi: 404 yo'q)
* Xizmat ishchisi (`sw.js`) uni keshlaydi — internetsiz ham ishlaydi

**b) Firebase SDK'lari ham `defer` bo'ldi** — uchta skript endi
sahifa o'qilishini to'smaydi. Ijro tartibi saqlanadi (`defer`
hujjatdagi tartibni buzmaydi), shuning uchun `app.js` ular ishga
tushgandan keyin ishlaydi.

**c) Telegram ichida keraksiz ishlar o'chirildi:**

* **web-push** umuman ishga tushirilmaydi — bildirishnomani botning
  o'zi yuboradi, Telegram brauzeri esa ruxsat oynasini to'g'ri
  ko'rsatmaydi ham. Bu xizmat ishchisiga murojaat, ruxsat holatini
  tekshirish va token olishni butunlay olib tashlaydi;
* storiyalar kechroq yuklanadi (1,8 s), chunki u yerdagi brauzer
  sekinroq va birinchi ko'rinish muhimroq;
* bezaklar darhol yengillashtiriladi (`low` sinfi) — Telegram ichidagi
  brauzer telefonning o'z brauzeridan sekinroq.

### O'lchangan natija

Telegram ichida, **6 barobar sekinlashtirilgan protsessorda**
(arzon Androidga yaqin):

| Ko'rsatkich | Oldin | Endi |
|---|---|---|
| Birinchi ko'rinish (FCP) | 564 ms | **447 ms** |
| Sahifa tayyor (DCL) | 818 ms | **544 ms** |
| **Qayta ochilganda** (mini ilovaning odatiy holati) | — | **FCP 408-424 ms, DCL 454-475 ms** |
| `index.html` hajmi | 562 KB | **202 KB** |

Saytning o'zi ham tezlashdi: FCP 484 ms, DCL 738 ms (oldin 688/931).

---

## Tekshiruv

**Brauzerda** (haqiqiy sahifa):

| Holat | Natija |
|---|---|
| Telegram ichida: sinf, ready, expand, swipe | ✅ `low tg`, hammasi chaqirildi |
| Sarlavha/fon rangi | ✅ `#0B1120` |
| `viewportChanged` | ✅ kuzatilyapti, `--tg-h: 640px` |
| Tepadagi bo'shliq | ✅ `--top: 0px` |
| Orqaga tugmasi: bosh sahifa | ✅ yashirin |
| Orqaga tugmasi: katalog | ✅ ko'rinadi |
| Orqaga bosilgach | ✅ bosh sahifaga qaytdi, tugma yashirindi |
| **Oddiy brauzer** | ✅ Telegram SDK **umuman yuklanmadi** |
| **Chuqur manzil** `/raqam/...` | ✅ `app.js` topildi, 404 yo'q |

**Serverda** (imzo tekshiruvi, 10 ta holat): to'g'ri imzo → token;
token bilan kabinet ochiladi; **soxta imzo**, **buzilgan hash**,
**`user.id` almashtirilgani**, **25 soatlik eski `initData`**,
`initData` yo'qligi — hammasi **rad etildi**; bog'lanmagan
foydalanuvchiga botga havola; eski mijoz buyurtmasidagi `customerChatId`
orqali topildi va bog'lanish yozib qo'yildi — **10/10 ✅**.

**Eski testlar qayta o'tkazildi** (kabinet, to'lovlar jadvali,
karusel surish, adminka seansi, rus tili, aylantirish FPS) — hammasi
ishlayapti, JS xatosi 0 ta.

---

## Keyingi qadamlar (hali qilinmagan)

Siz tanlagan ro'yxatdan qolgani:

1. **Buyurtma oqimi** — raqam tanlash → buyurtma → tasdiq, hammasi
   ilova ichida (hozir saytdagi oqim ishlaydi, lekin Telegram'ning
   pastdagi MainButton tugmasi ishlatilmagan).
2. **Botdan ilovaga o'tish** — BotFather menyu tugmasi, botdagi
   "Ilovani ochish" tugmalari, aniq raqamga havola
   (`?startapp=raqam_909991234` → ilovada o'sha raqam ochiladi).
