# V123 — BUYURTMA HOLATI KUZATUVI + MIJOZ KABINETI

Siz tanlagan ikkita ish bajarildi.

## 1. BUYURTMA HOLATI KUZATUVI

### Yangi bosqich: "Yo'lda"
Ilgari zanjir shunday edi: Yangi → Bog'lanildi → Yakunlandi. Ya'ni
mijoz kuryer yo'lga chiqqanini BILMASDI va "qani mening raqamim?"
deb qo'ng'iroq qilardi. Endi oraliq bosqich bor:

    Yangi  ->  Bog'lanildi  ->  Yo'lda  ->  Yakunlandi
    (Bekor qilindi — zanjirdan tashqarida)

Adminka: holat ro'yxatiga, "Zakaz" bo'limiga, statistik kartochkalarga
va ranglarga qo'shildi (binafsha-ko'k — sariq "Bog'lanildi" bilan
yashil "Yakunlandi" orasidagi oraliq ekani bir qarashda bilinadi).

### Mijoz saytda BOSQICHLARNI ko'radi
Har bir buyurtma kartochkasi ostida tik zanjir chiqadi: o'tilgan
bosqich yashil belgili, joriysi ko'k va ajralib turadi, keyingilari
xira. Bosqich nomlari ATAYLAB mijoz tilida:

    bazada            mijoz ko'radi
    ---------------   -------------------------------------
    Yangi             Qabul qilindi  / Buyurtmangiz tizimga tushdi
    Bog'lanildi       Tasdiqlandi    / Operator siz bilan bog'landi
    Yo'lda            Kuryer yo'lda  / Raqamingiz yo'lga chiqdi
    Yakunlandi        Yetkazildi     / Raqam sizga topshirildi

### Har bosqichda xabar keladi
`notify-customer-status.js` xabarlari to'ldirildi — jumladan
"🚚 Kuryerimiz yo'lga chiqdi. Raqamingiz bugun-ertaga yetib boradi."

Holat o'zgargan VAQT ham yoziladi (`statusAt`) — qaysi bosqichda
qancha turgani bilinadi.

## 2. MIJOZ KABINETI

### Muammo
Mijoz uchun ikkita alohida bo'lim bor edi: "Buyurtmalarim" (telefon +
oxirgi 4 raqam) va "Shartnomani tekshirish" (shartnoma ID + telefon).
Ya'ni mijoz shartnoma ID'sini ESLAB QOLISHI kerak edi — hech kim
eslab qolmaydi — va hamma narsani ko'rish uchun ikki marta, ikki xil
ma'lumot bilan qidirishi kerak edi.

### Endi
BITTA so'rov: telefon + raqamning oxirgi 4 ta raqami. Javobda:
  * barcha buyurtmalar — bosqichlari bilan;
  * barcha shartnomalar — to'langan/qolgan summa, progress chizig'i,
    keyingi to'lov sanasi, kechikkan oylar soni;
  * to'liq to'lov jadvali (ochiladigan ro'yxat: to'langan — yashil,
    kechikkan — qizil, kutilayotgan — oddiy);
  * "Shartnomani yuklab olish" tugmasi — shartnoma ID'si va telefon
    allaqachon bizda, mijozdan hech narsa so'ralmaydi.

Yangi funksiya: `netlify/functions/api-kabinet.js`.

### Xavfsizlik — ilgarigidek IKKI bosqichli
  * Telefon raqamining o'zi YETARLI EMAS: ustiga raqamning oxirgi 4
    ta raqami to'g'ri kelishi kerak (shartnoma ID'si o'rniga shu
    "ikkinchi kalit"). Birovning telefonini bilgan odam uning
    ma'lumotini ko'ra olmaydi.
  * IP bo'yicha soatiga 20 urinish — "taxmin qilib topish" yopiq
    (4 raqam = 10 000 kombinatsiya, chegarasiz bo'lsa skript bilan
    topish mumkin edi).
  * PASSPORT, TUG'ILGAN SANA va YASHASH JOYI javobga ATAYLAB
    QO'SHILMAYDI — ular shartnomada bor, lekin brauzerga
    yuborilmaydi. Tekshirildi: javobda bu maydonlar yo'q.
  * Xato xabari HAR DOIM bir xil ("Ma'lumot topilmadi") — telefon
    bazada bor-yo'qligini bilib olish mumkin emas.

### Shartnomani telefon bo'yicha topish
Firestore faqat ANIQ moslik bo'yicha qidiradi, telefon esa turli
ko'rinishda yozilgan bo'lishi mumkin. Shu sabab shartnomaga ikkita
qidiruv maydoni qo'shildi (`phoneNormalized`, `numberNormalized`) —
xuddi buyurtmalardagi kabi. Busiz kabinet butun to'plamni o'qishga
majbur bo'lardi (qimmat va sekin).

**ESKI shartnomalar uchun bir martalik ish kerak:** adminka →
"Kredit" → bosh admin uchun mavjud bo'lgan `migrate` amali endi
eski shartnomalarga ham shu maydonlarni qo'shadi. Ya'ni bir marta
ishga tushirsangiz, eski shartnomalar ham kabinetda ko'rinadi.
Yangi shartnomalarda bu avtomatik.

## TEKSHIRILDI
Server (soxta baza bilan):
    to'g'ri kalit ........... 200, 2 ta buyurtma + 1 ta shartnoma
    hisob-kitob ............. 2/12 oy, 1 oy kechikkan, qolgan 15 000 000
    maxfiy maydonlar ........ javobda YO'Q
    noto'g'ri kalit ......... "Ma'lumot topilmadi"
    kalitsiz ................ "Ma'lumot topilmadi"
    shartnomasiz mijoz ...... 200, faqat buyurtmalar
    25-urinish .............. 429

Brauzerda (haqiqiy sahifada, soxta javob bilan):
    bosqich zanjiri ......... 2 ta buyurtmada ham chizildi
    joriy bosqich ........... "Kuryer yo'lda" / "Yetkazildi" — to'g'ri
    o'tilgan bosqichlar ..... 5 ta yashil belgi
    shartnoma kartochkasi ... progress, keyingi to'lov, PDF tugmasi
    to'lov jadvali .......... 12 oy, kechikkani qizil
    JavaScript xatosi ....... yo'q
