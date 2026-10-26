# VIP RAQAMLAR — V99 (to'liq nusxa)

Bu arxivda saytning **hamma fayli** bor. GitHub'dagi barcha fayl ustiga
shu nusxani qo'ying.

## Shu versiyada nima tuzatildi

### 1. "Kanal posti" bo'limi ko'rinmayotgani va kompyuterda kirib
bo'lmayotgani — bitta sababdan
Panel endi uch fayldan iborat: `panel-boshqaruv.html` + `assets/panel.js`
+ `assets/panel.css`. Oxirgi yuklashda HTML yangilangan, lekin `assets/`
ichidagi ikki fayl GitHub'ga tushmagan. Natijada HTML `panel.js?v=99` ni
so'raydi, server topa olmaydi — bo'lim ham yo'q, bezak ham yo'q, kirish
ham ishlamaydi.

**Shuning uchun eng muhimi:** `assets/panel.js` (568 KB) va
`assets/panel.css` (269 KB) GitHub'ga HAQIQATAN yuklanganini tekshiring.
GitHub'ning veb-sahifasi katta fayllarni ba'zan "yuklandi" deb
ko'rsatib, aslida yuklamaydi. Yuklagandan keyin:

    https://vipraqamlar.uz/assets/panel.js

manzilini oching — ekranda KOD ko'rinishi kerak. "Page not found" yoki
bosh sahifa chiqsa, fayl yuklanmagan.

### 2. App Check (reCAPTCHA) kirishni to'xtatib qo'yardi
App Check bot himoyasi `www.google.com/recaptcha` dan skript yuklaydi.
Agar kompyuterdagi antivirusning veb qalqoni yoki brauzer kengaytmasi
uni to'ssa, Firebase kirish so'rovini **umuman yubormaydi** va
"auth/network-request-failed" qaytaradi — parol to'g'ri bo'lsa ham.
Telefonda bunday to'siq yo'q, shuning uchun u yerda ishlayverardi.

Endi panel ochilishda uchta manzilni tekshiradi (kirish xizmati,
App Check, reCAPTCHA) va:

* reCAPTCHA/App Check to'silgan bo'lsa — App Check o'sha brauzerda
  **yoqilmaydi**. Panel himoyasiz qolmaydi: Netlify "ikkinchi eshigi",
  5 daqiqada 3 urinish qulfi va Firestore qoidalaridagi admin huquqi
  tekshiruvi joyida turadi.
* Google kirish xizmati to'silgan bo'lsa — so'rov **saytning o'zi**
  orqali o'tadi (yangi `netlify/functions/auth-proxy.js` +
  `_redirects` dagi ikki qoida). Sayt manzili to'silmagan, demak
  kirish ishlayveradi.

Ikkalasi ham avtomatik — mijoz yoki admin hech narsa sozlamaydi.

## HALI QILINMAGAN, LEKIN SHART
1. **`firestore.rules` ni joylang.** Firebase Console → Firestore
   Database → Rules → hammasini o'chirib, shu arxivdagi
   `firestore.rules` ni to'liq qo'ying → **Publish**.
   Hozir Firebase'da 447 qatorli ESKI nusxa turibdi (bu arxivda 837
   qator). Shu sabab: buyurtma o'tmaydi ("internetni tekshiring"),
   stories soni soxta, "Raqam to'lovi" / "Hamkor bo'lish" / "Statistika"
   bo'limlari ochilmaydi.
2. **`storage.rules` ni joylang** (Storage → Rules) — stories uchun
   video yuklash shusiz ishlamaydi.
