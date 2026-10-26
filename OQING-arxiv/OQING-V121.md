# V121 — TEZLIK (sekin Android telefonlar uchun)

Mijoz xabari: sekin Android telefonda kartochka bosilganda oyna
"qotib" ochiladi; orqa fon qimirlashi shart emas.

## 1. Orqa fon harakati BUTUNLAY olib tashlandi
Fon endi STATIK — bir marta chiziladi va umuman tegilmaydi. Ko'rinishi
o'zgarmadi (bitta burchak ochroq, chiziqlar faqat chetlarda), faqat
aylanish yo'q. Zaif qurilmalar uchun alohida qoida ham kerak emas
bo'lib qoldi.

## 2. Yangi oyna (sheet) ochilishi — eng katta sabab shu edi
Ikkita muammo topildi:

**a) Fon parda `backdrop-filter: blur(4px)` ishlatardi.** Bu butun
sahifa tasvirini o'qib, HAR KADRDA qaytadan xiralashtirishni talab
qiladi — eng qimmat amal aynan shu. Blur butunlay olib tashlandi,
o'rniga biroz to'qroq parda qo'yildi (ko'zga deyarli bir xil, lekin
videokarta uchun bepul).

**b) Animatsiya juda uzoq edi** — 0,62 s. Zaif telefonda bu "sekin
ochilyapti" emas, "osilib qoldi" bo'lib tuyiladi. Qisqartirildi:
oyna 0,62 -> 0,28 s, parda 0,5 -> 0,16 s, yopilish 0,34 -> 0,2 s.

## 3. Zaif qurilmada blur UMUMAN o'chadi
Ilgari `html.low` da blur faqat KAMAYTIRILARDI (30px -> 14px). Lekin
pastki menyu va tepa panel ekranga MAHKAMLANGAN, ya'ni aylantirganda
ham, oyna ochilganda ham ortidagi tasvir qaytadan hisoblanardi. Endi
bunday qurilmada blur yo'q — o'rniga qattiq (shaffof bo'lmagan) fon.

## 4. Kuchli telefonlarda ham blur arzonlashtirildi
Menyu 30px -> 18px, tepa panel 26px -> 16px. Blur narxi radiusga
KVADRATIK bog'liq, ya'ni bu ~2,7 barobar arzon; ko'zga esa farq
deyarli bilinmaydi. Shisha effekti o'z joyida qoldi.

## O'LCHANGAN NATIJA
Brauzerda, protsessor 6 barobar sekinlashtirilgan holda (sekin
Androidga taqlid), 24 ta kartochkali sahifada oyna ochib:

    ZAIF QURILMA (low)
      ochilish vaqti ......... 553 ms  ->  394 ms
      animatsiya silliqligi ... 15-20 FPS  ->  49-53 FPS
      oyna ichida aylantirish . 23 FPS  ->  61 FPS

    KUCHLI QURILMA
      animatsiya silliqligi ... 42-43 FPS  ->  44-51 FPS

Ya'ni "qotib qolish" tuyg'usining asosiy sababi — 15-20 FPS lik
animatsiya — yo'qoldi.

## Qo'shimcha
Service Worker keshi `v11` -> `v12` ga oshirildi, shunda telefonlarda
eski nusxa qolib ketmaydi.

---

# V121 — QR KOD ENDI TO'G'RIDAN-TO'G'RI PDF OCHADI

## Sabab
QR havolasi `/s/KR0142/<imzo>.pdf` ko'rinishida edi va `_redirects` da
`:i`/`:k` "o'rin egallari" ishlatilardi:

    /s/:i/:k  ->  /.netlify/functions/shartnoma-pdf?i=:i&k=:k

Amalda bu qiymatlar funksiyaga YETIB BORMADI. Funksiya bo'sh parametr
olib, "Havola to'liq emas" sahifasini ko'rsatardi va mijoz saytga
tushib ketardi — siz ko'rgan holat aynan shu.

## Tuzatish
O'rin egallari UMUMAN ishlatilmaydi. Endi butun yo'l funksiyaga
uzatiladi (`/s/*`), funksiya esa shartnoma raqami va imzoni
**yo'lning o'zidan** o'qiydi. Yo'l har doim keladi: `rawUrl` (to'liq
manzil) yoki `path`. Shu bilan Netlify o'rin egallarini qanday
uzatishiga umuman bog'liq bo'lmay qoldi.

## Tekshirildi (7 xil holat)
    rawUrl bilan (haqiqiy Netlify ko'rinishi) ... 200, application/pdf
    faqat path bilan ........................... 200, application/pdf
    eski ?i=&k= ko'rinishi ..................... 200, application/pdf
    o'rin egallari ishlagan holat .............. 200, application/pdf
    kichik harf bilan yozilgan ID .............. 200, application/pdf
    soxta imzo ................................. 404
    bo'sh havola ............................... 400

Javobning haqiqatan PDF ekani ham tekshirildi (fayl `%PDF-` bilan
boshlanadi), ya'ni brauzer uni darhol ochadi — sayt ochilmaydi.
