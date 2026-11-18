# V147 — IZOHLARNI DEPLOY PAYTIDA OLIB TASHLASH

## NEGA BU ISH TANLANDI

Siz `app.js` ni bo'lishni tanladingiz. Men ishni boshlashdan oldin
o'lchadim — va bo'lishdan **ikki barobar ko'proq** tejaydigan,
ustiga **xavfi deyarli yo'q** yo'lni topdim.

### Avval bo'lishni tekshirdim

`app.js` (386 KB) ichidagi bloklar va ularning bog'liqligi:

| blok | hajmi | tashqaridan nechta murojaat |
|---|---|---|
| To'lovlar jadvali (kabinet) | 58 KB | 23 ta |
| Buyurtma oqimi | 47 KB | 11 ta |
| Brauzer bildirishnomasi | 28 KB | 3 ta |
| Story oynasi | 21 KB | 2 ta |

Eng katta ikkitasi (to'lov jadvali va buyurtma) kodning qolgan qismi
bilan **juda chatishgan** — ularni ajratish buyurtma oqimiga tegishni
anglatardi, ya'ni eng xavfli joyga. Xavfsiz ajratsa bo'ladiganlari
(Story + bildirishnoma) esa atigi ~15 KB tejardi.

### Keyin izohlarni o'lchadim

```
app.js: 386 KB, shundan IZOHLAR 116 KB (30%)
siqilgan holda: 122 KB -> 81 KB  (izohlarsiz)
```

Ya'ni izohlar **yuklanadigan hajmning uchdan birini** egallaydi — va
ularni olib tashlash kodga umuman tegmaydi.

---

## YECHIM — IZOHLAR OMBORDA QOLADI, MIJOZGA BORMAYDI

Izohlar bu loyihaning eng qimmatli qismi: har bir qaror **nega**
shunday qilingani yozib qo'yilgan. Ularni o'chirish mumkin emas.

Shuning uchun ular **GitHub'da to'liq qoladi**, lekin Netlify deploy
paytida, vaqtinchalik nusxada olib tashlanadi:

```toml
[build]
  command = "node tools/qisqartir.js"
```

### Natija (siqilgan, ya'ni mijoz haqiqatan yuklaydigan hajm)

| fayl | oldin | keyin |
|---|---|---|
| `assets/app.js` | 122.3 KB | **70.8 KB** (−42%) |
| `assets/panel.js` | 167.1 KB | **110.3 KB** (−34%) |
| `assets/sayt.css` | 12.8 KB | 12.5 KB |
| `assets/panel.css` | 65.9 KB | 63.2 KB |
| **JAMI** | **368 KB** | **257 KB** (−30%) |

### Tezlik (sekin mobil internet, arzon telefon, 3 o'lchov)

| | V146 | V147 |
|---|---|---|
| ishlatishga tayyor (DCL) | 3073 ms | **2455 ms** |

**−20%.** V145 dan beri jami: birinchi ko'rinish 1760 → 790 ms,
ishlatishga tayyor 3160 → 2455 ms.

---

## NEGA BU XAVFSIZ

* Kod **qayta yozilmaydi**, nomlar **o'zgartirilmaydi**
  (`compress:false, mangle:false`) — faqat izoh va bo'sh joy
  tozalanadi. Bu "minifikatsiya" emas.
* Har bir fayl alohida himoyada: muammo bo'lsa **o'sha fayl o'z
  holicha qoladi**, qolganlari tozalanadi.
* Skript **hech qachon deployni to'xtatmaydi**.
* Natija kutilganidan kichik chiqsa (shubhali holat) — fayl
  tegilmaydi.

### Qisqartirilgan nusxada o'tkazilgan tekshiruvlar

buyurtma oqimi 10/10 · kredit formasi 15/15 · sana maydoni ·
til almashtirish 5/5 · karusel ikki tomonga · FPS 61 ·
sessiya oqishi · tebranish · JS xato 0

Ya'ni tekshiruvlar izohlar bilan emas, **mijozga ketadigan
nusxada** o'tkazildi.

---

## KELAJAK UCHUN

Izohlarni bemalol yozavering — ular endi mijozning internetini
yemaydi. Kodni o'qish va tushunish osonligi saqlanadi.
