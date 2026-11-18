# V145 — TELEGRAM MINI ILOVA TEZLIGI

## SIZ NIMA SO'RAGANSIZ

> "telegram ilova juda sekin ishlayapti, to'g'irla, tez ishlasin,
> umuman oddiy telefonda ham muammo qilmasin"

---

## AVVAL O'LCHADIM — TAXMIN QILMADIM

Mini ilovani Telegram sharoitida (Android, sekin protsessor) ishga
tushirib, vaqt qayerga ketayotganini sanadim. Eng katta to'siq
topildi:

```
firebase-app-compat.js          274 ms
firebase-firestore-compat.js    258 ms
firebase-app-check-compat.js    261 ms
------------------------------------
JAMI                            793 ms
```

Mijoz hali hech narsa ko'rmay turib, asosiy oqim **793 ms** shu uch
faylga band bo'lardi. Eng achinarlisi — **ular o'sha paytda kerak
emas edi**: katalog Firestore'dan emas, `api-index` funksiyasidan
keladi. Firestore brauzerda faqat keyinroq kerak (sozlamalar, mijoz
fikrlari, buyurtma yuborish).

---

## NIMA QILINDI

### 1. Firebase endi birinchi chizishdan KEYIN yuklanadi

Uch fayl `index.html` dan olib tashlandi va `app.js` ichiga
ko'chirildi: ular sahifa chizilgandan so'ng, fonda yuklanadi.

**XAVFSIZLIK KAFOLATI.** `db` ga murojaat qiladigan **15 ta
funksiyaning har biriga** `await firebaseniKut()` qo'yildi. U
kutubxona tayyor bo'lsa **darhol** qaytadi, tayyor bo'lmasa — kutadi.

Buni ataylab eng yomon sharoitda sinadim: Firebase fayllarini
**3 soniyadan** kechiktirib berdim va o'sha paytda buyurtma
yuborishga urindim:

```
firebaseniKut() 8 592 ms kutdi -> keyin db tayyor -> buyurtma YOZILDI
```

Ya'ni buyurtma **hech qachon yo'qolmaydi** — faqat kutadi.

### 2. Mijoz fikrlari: 3000 → 12

`video_testimonials` dan har tashrifda **3000 tagacha** yozuv
o'qilardi, ekranda esa atigi **10 tasi** ko'rsatilardi. Bu ham
Firestore kvotasini, ham trafikni bekorga yeyardi.

### 3. Videolar mini ilovada oldindan yuklanmaydi

Bosh sahifadagi 10 tagacha videoga `preload="metadata"` qo'yilgan
edi — ya'ni mijoz ularni ko'rmasa ham, **o'nlab tarmoq so'rovi**
sahifa ochilishida ketardi. Endi Telegram va sekin telefonda
umuman yuklanmaydi; mijoz videoni bossa — o'shanda yuklanadi.

### 4. Kesh raqami moslashtirildi

`sw.js` ichidagi `app.js?v=...` `index.html` dagisi bilan bir xil
bo'lishi SHART — aks holda xizmat ishchisi keshi har safar
"topilmadi" deb, hammasini qaytadan yuklaydi. Ikkalasi ham `v=145`.

---

## O'LCHOV NATIJASI

**Arzon telefon + oddiy wifi** (3 ta o'lchov medianasi):

| ko'rsatkich | V144 | V145 |
|---|---|---|
| ilova foydalanishga tayyor (DCL) | **710 ms** | **384 ms** |
| birinchi ko'rinish (FCP) | 372 ms | 328 ms |

**Ilova ikki barobarga yaqin tez ochiladi (−46%).**

**Sekin mobil internetda** (3G, 300 ms kechikish) birinchi ochilish
baribir ~1,8 soniya — u yerda to'siq protsessor emas, **fayl hajmi**.
Lekin ikkinchi ochilishdan boshlab xizmat ishchisi keshi ishlaydi va
ilova deyarli bir zumda ochiladi (shuning uchun 4-banddagi kesh
moslashtirish muhim).

### Tekshiruvlar

Buyurtma oqimi 10/10 · til almashtirish 5/5 · karusel ikki tomonga ·
FPS 60 · sessiya oqishi tuzatilgan · JS xato 0.

---

## YUKLASH

`index.html`, `sw.js`, `assets/app.js` — uchalasi birga.
Keyin Netlify → **Trigger deploy → Clear cache and deploy site**.

Tekshirish: `vip-versiya` → **145**.
