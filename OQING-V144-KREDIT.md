# V144 — NETLIFY KREDITINI ENG KAM SARFLASH

## AVVAL HALOL GAP

**"Umuman kredit ishlatmaydigan" kod bo'lishi mumkin emas.** Netlify
saytni ochib berishning o'ziga ham kredit oladi. Lekin uni shunchalik
kam qilish mumkinki, 3000 kredit sizga bemalol yetadi va hech qachon
tugamaydi. Quyida aniq raqamlar bilan ko'rsataman.

---

## KREDIT NIMAGA KETADI (Netlify narxlari)

| nima | narxi |
|---|---|
| bitta deploy (commit) | **15 kredit** |
| trafik | **20 kredit / 1 GB** |
| funksiyalar hisoblashi | **10 kredit / 1 GB-soat** |
| veb so'rovlar | 2 kredit / 10 000 so'rov |

Diqqat: **funksiya chaqiruvi alohida sanalmaydi** — u ishlagan vaqt va
xotira bo'yicha hisoblanadi.

---

## NEGA BEPUL REJA TUGAB QOLDI — HISOB

Bepul rejada oyiga **300 kredit** bor edi.

Fon ishlari (cron) oyiga **91 775 marta** ishlardi. Har biri ~2 soniya
va ~1 GB xotira olsa:

```
91 775 × 2 s = 50,99 GB-soat × 10 = ~510 kredit/oy
```

**Ya'ni faqat fon ishlarining o'zi 300 kreditdan ikki baravar ko'p
talab qilardi.** Bitta mijoz kirmasa ham, bitta deploy qilmasangiz ham
kredit tugardi. Ustiga deploylar (har biri 15) va trafik qo'shilgan.

Eng og'iri — `number-watch-check-background` **har daqiqada** ishlardi:
yolg'iz o'zi oyiga 43 200 chaqiruv.

---

## NIMA QILINDI

### 1. Fon ishlari 83% kamaytirildi

| funksiya | oldin | endi |
|---|---|---|
| `number-watch` | har daqiqada | har 10 daqiqada |
| `tolov-eslatma` | har 5 daq | har 30 daq |
| `personal-bot-reminder` | har 5 daq | har 30 daq |
| `uzex-saved-expiry` | har 5 daq | soatiga |
| `admin-tasks` | har 5 daq | har 30 daq |
| `sync-beeline` | har 10 daq | soatiga |
| `uzex-watch` | har 10 daq | har 30 daq |
| `soglik` | soatiga | 6 soatda |
| `release-stale-reservations` | har 10 daq | **o'zgarmadi** (siz so'radingiz) |

**91 775 → 16 295 chaqiruv/oy** = ~510 kredit o'rniga **~91 kredit**.

### 2. `app.js` endi bir yilga keshlanadi

Saytning eng katta fayli (380 KB) atigi **bir soatga** keshlanar edi —
ya'ni mijoz kuniga besh marta kirsa, uni besh marta qayta yuklardi.
`panel.js` allaqachon bir yilga keshlanardi, `app.js` esa e'tibordan
chetda qolgan ekan.

Endi mijoz uni **bir marta** yuklaydi. Qaytgan mijoz uchun trafik —
deyarli **nol**.

Rasm va ovoz fayllari ham 1 soatdan **30 kunga** o'tkazildi.

### 3. Kesh qoidalari tartibi tuzatildi

Umumiy qoida (`/assets/*`) endi aniq fayl qoidalaridan **oldin**
turadi. Teskari bo'lsa, umumiy qoida bir yillik keshni 30 kunga
tushirib qo'yardi — ko'zga ko'rinmaydigan, lekin trafik yeydigan xato.

---

## ENDI OYIGA QANCHA KETADI

```
Fon ishlari (cron)          ~91 kredit
10 ta deploy (15 × 10)      150 kredit
                            -----------
                            241 kredit

Qolgan 2759 kredit trafikka  = 138 GB
                             = ~726 000 ta YANGI tashrif
```

Bitta yangi tashrif siqilgan holda ~199 KB (index.html 61 KB +
app.js 119 KB + belgilar). **1 GB = ~5 200 ta yangi tashrif.**
Qaytgan mijoz keshdan oladi — trafik nol.

**Xulosa: 3000 kredit sizga oyiga 700 000 dan ortiq tashrifga yetadi.**

---

## KREDITNI BEKORGA SARFLAMASLIK UCHUN 3 TA QOIDA

**1. Bitta o'zgarish — bitta commit.**
Har bir deploy 15 kredit. GitHub'ga 10 ta faylni 10 marta alohida
yuklasangiz — 150 kredit. Birdaniga yuklasangiz — 15 kredit.

**2. Netlify'da "Deploy previews" va "Branch deploys" ni o'chiring.**
Netlify → Project configuration → Build & deploy → Branches and deploy
contexts. Har bir qo'shimcha deploy ham 15 kredit oladi.

**3. `?v=` raqamini oshirishni unutmang.**
`assets/app.js` yoki `assets/panel.js` ni o'zgartirsangiz,
`index.html` / `panel-boshqaruv.html` dagi `?v=144` raqamini
oshiring. Aks holda mijozlarda eski nusxa bir yil qolib ketadi.

---

## TEKSHIRIB TURISH

Netlify → **Usage & billing** → oyiga bir marta qarang. Agar kredit
kutilganidan tez kamayayotgan bo'lsa, menga ayting — qaysi qism
yeyayotganini topaman.
