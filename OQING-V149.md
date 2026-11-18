# V149 — BOTDAN ILOVAGA, TELEGRAM TUGMASI, OXIRGI KO'RILGAN

## 1. BOTDAN ILOVAGA O'TISH

### Muammo

Tekshirdim: loyihada **bitta ham** `web_app` tugmasi yo'q edi va
`startapp` ham ishlatilmagan. Ya'ni siz botda yoki kanalda raqam
ko'rsatganingizda, mijoz uni **ilovada ocha olmasdi** — ilovaga
kirib, o'sha raqamni qo'lda qidirishi kerak edi. Savdo asosan
Telegram orqali bo'lgani uchun bu to'g'ridan-to'g'ri yo'qotish edi.

### Endi

Bot raqamni ko'rsatganda eng tepada **"📱 Ilovada ochish"** tugmasi
turadi. Bosilganda mini ilova **aynan o'sha raqam kartochkasi**
bilan ochiladi.

Ilova uchta manbadan o'qiydi, chunki Telegram holatga qarab har xil
uzatadi:

| manba | qachon |
|---|---|
| `?r=<id>` | bot xabaridagi `web_app` tugmasi |
| `tgWebAppStartParam` | `t.me/bot/app?startapp=...` havolasi |
| `initDataUnsafe.start_param` | SDK yuklangach |

Qiymat `raqam_998901234567` ham, oddiy raqam ham, baza ID'si ham
bo'lishi mumkin — hammasi ishlaydi. Kartochka ochilgach manzil
tozalanadi (orqaga qaytganda qayta ochilavermaydi), lekin Telegram
belgilari saqlanadi.

### Kanal posti uchun bir martalik sozlama

Telegram **kanalda** `web_app` tugmasiga ruxsat bermaydi. Kanal
uchun BotFather'da mini ilovaga qisqa nom berish kerak
(`/myapps` → bot → qisqa nom, masalan `app`). Keyin kanal postiga:

```
https://t.me/<bot_nomi>/app?startapp=raqam_998901234567
```

**Ilova bu havolani allaqachon tushunadi** — qo'shimcha kod kerak
emas. Qisqa nomni aytsangiz, kanalga post qo'yish funksiyasiga ham
avtomatik qo'shib beraman.

---

## 2. TELEGRAM TUGMASI (MainButton)

Mini ilovada buyurtma oynasidagi asosiy tugma endi **Telegram'ning
o'z tugmasi**. Afzalliklari:

* ekranning eng pastida, **klaviatura ustida** turadi — yozayotganda
  ustiga chiqib qolmaydi;
* sahifa aylantirilganda joyida qoladi;
* mijozga ilova "haqiqiy Telegram ilovasi"dek tuyuladi.

**Mantiq takrorlanmaydi:** Telegram tugmasi bosilganda saytdagi
tugmaning o'zi bosiladi. Ya'ni buyurtma mantig'i bitta joyda qoladi
va ikkisi hech qachon bir-biridan farq qilmaydi. Saytdagi nusxa esa
shu paytda yashiriladi, aks holda ekranda ikkita bir xil tugma
turardi.

Telegramdan tashqarida hech narsa o'zgarmaydi.

---

## 3. OXIRGI KO'RILGAN RAQAMLAR

Mijoz o'nlab raqam ochib ko'radi, keyin yoqqanini **qayta topolmasdi**
— katalog har safar aralashadi. Endi bosh sahifada "Oxirgi ko'rilgan"
qatori bor (yonga aylanadi, "Tozalash" tugmasi bilan).

**Bazaga yozilmaydi** — bu mijozning shaxsiy ko'rish tarixi,
telefonning o'zida saqlanadi. Har ochilgan raqamga bitta baza yozuvi
degani bo'lardi, aynan shunday xato bazani to'ldirib qo'ygan edi
(V144 ga qarang).

Sotilgan yoki o'chirilgan raqamlar ro'yxatdan o'zi tushib qoladi.
Bitta raqamgina bo'lsa bo'lim ko'rsatilmaydi.

---

## TEKSHIRUVLAR — 11/11

`?r=` bilan kartochka ochildi · aynan o'sha raqam · `startapp` bilan
ochildi · Telegram deb tanidi · oxirgi ko'rilganlar to'g'ri tartibda
saqlandi · bo'lim ko'rindi · kartochkalar chizildi · Telegram tugmasi
chiqdi · matni bor · saytdagi tugma yashirildi

Qolgan tekshiruvlar ham **qisqartirilgan nusxada** qayta o'tkazildi:
buyurtma 10/10 · mijozlar fikri · til 5/5 · FPS 61 · JS xato 0
