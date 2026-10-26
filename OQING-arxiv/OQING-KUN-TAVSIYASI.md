# Kun tavsiyasi — yangi bo'lim

## Saytda (`index.html`)
- "Tanlangan VIP raqamlar" ro'yxatining **5-kartochkasidan keyin** yonga suriladigan
  (gorizontal, barmoq bilan surib o'tiladigan) **alohida ko'rinishdagi** kartochkalar
  qatori chiqadi. Agar ro'yxatda 5 tadan kam kartochka bo'lsa — qator eng oxirida turadi.
- Kartochka dizayni oddiy raqam kartochkasidan boshqacha: yashil-firuza shisha fon,
  "★ KUN TAVSIYASI" lentasi, katta raqam, operator, izoh qatori, narx va "Ko'rish →" tugmasi.
- Ro'yxat bo'sh bo'lsa bo'lim **umuman ko'rsatilmaydi** (sayt hech qanday bo'sh joy chiqarmaydi).
- Ma'lumot `site_settings/daily_picks` hujjatidan o'qiladi, boshqa bo'limlar kabi
  avtomatik yangilanadi.

## Admin panelda (`panel-boshqaruv.html`)
Yon menyu → **Kontent → 🌟 Kun tavsiyasi**.

Raqam uchta usulda qo'shiladi:
1. **🗄 Bazadan** — saytdagi raqamlar bazasidan qidirib tanlanadi.
   Bu holda narx va operator saytda **jonli** o'qiladi: bazada narx o'zgarsa,
   kun tavsiyasi ham o'zi yangilanadi. Raqam bazadan o'chirilgan bo'lsa,
   ro'yxatda "⚠️ bazada topilmadi" ogohlantirishi chiqadi.
2. **📡 Jonli bazadan** — operator API'laridan (`api-live-search`) 7 belgili maska
   bo'yicha qidiradi (masalan `___7777`; yozilmagan o'rinlar o'zi `_` bilan to'ldiriladi).
   Bu raqamlar Firestore'da yo'q, shuning uchun narx/operator ro'yxatga **nusxalanib**
   saqlanadi.
3. **✍️ Qo'lda** — raqam, operator, narx (va ixtiyoriy eski narx) qo'lda kiritiladi.

Har bir raqamga ixtiyoriy **izoh** (kartochkadagi bitta qator) va **toifa**
(VIP / PREMIUM / GOLD) berish mumkin.

Ro'yxatda tartibni ↑ ↓ bilan o'zgartirish, ✕ bilan o'chirish mumkin.
O'zgarishlar faqat **💾 Saqlash** bosilgandan keyin saytga chiqadi.
Ko'pi bilan 20 ta raqam.

Bo'lim sarlavhasi va qo'shimcha matnini ham shu yerdan o'zgartirish mumkin
(bo'sh qoldirilsa — "Kun tavsiyasi").

## Ruxsat
Bo'lim "Aksiya" ruxsatiga bog'langan — ya'ni Aksiya bo'limiga ruxsati bor admin
Kun tavsiyasini ham boshqaradi. Bosh admin uchun doim ochiq.

## Firestore qoidasi (`firestore.rules`) — YANGILANDI
`site_settings/daily_picks` hujjatiga yozishga ruxsat qo'shildi:
```
|| (doc == 'daily_picks' && (hasPerm('aksiya') || hasPerm('numbers') || hasPerm('settings')))
```
**Deploy qilgandan keyin `firestore.rules` faylini Firebase'ga ham yuklang**
(Firebase Console → Firestore → Rules → nusxa ko'chirib "Publish"),
aks holda saqlashda "permission denied" chiqadi.

## Hujjat ko'rinishi
```js
site_settings/daily_picks = {
  title: "Kun tavsiyasi",
  subtitle: "Bugun biz tanlagan raqamlar",
  items: [
    { id: "<numbers hujjati ID>", note?: "...", tier?: "gold" },
    { live: true, number: "+998917777777", operator: "Humans",
      price: 9000000, oldPrice?: 0, installment?: true, note?: "...", tier?: "vip" }
  ],
  updatedAt: <serverTimestamp>
}
```

## Tekshiruvlar
Sayt: JS 6 blok / 0 xato · kontrast 0 xato · toshish 0 ·
qator 5-kartochkadan keyin, 4 kartochka, suriladi (`day.cjs`).
Admin: bo'lim ochiladi, bazadan/jonli/qo'lda qo'shish, dublikat nazorati,
tartib o'zgartirish, o'chirish, saqlash — hammasi o'tdi, 0 konsol xatosi (`dayadm.cjs`).

---

# Keyingi tuzatishlar (shu yangilanishda)

## 1. Dollarda narx (faqat naqt to'lov)
Adminka → **Raqamlar → Raqam qo'shish** oynasida narx yonida **valyuta**
tanlovi paydo bo'ldi: `so'm (UZS)` yoki `dollar ($)`.

- Dollar tanlansa — narx maydoni «Narxi ($)» ga o'zgaradi, **«Bo'lib to'lash»
  belgisi o'chadi va bloklanadi** (bo'lib to'lash hisob-kitobi faqat so'mda
  yuritiladi, shuning uchun dollarlik raqam **faqat naqt to'lovga** chiqadi).
- O'ng tomondagi «Saytda shunday ko'rinadi» namunasi ham darhol `$` ni ko'rsatadi.
- Mavjud raqamni tahrirlashda ham (qalam → qator ichida) narx yonida shu tanlov bor.
- Ro'yxatda dollarlik raqam narxi `1 200 $` ko'rinishida chiqadi.

**Saytda:** kartochkada, raqam oynasida, buyurtma xulosasida va «Jami» qatorida
birlik `so'm` o'rniga `$` bo'ladi; bu raqamga bo'lib to'lash umuman taklif
qilinmaydi. Buyurtma hujjatiga `currency: 'USD'` yoziladi, Telegram xabariga
`💲 Summa: 1 200 $` qatori qo'shiladi, adminkadagi buyurtma ro'yxati va
kartochkasida ham `$` ko'rinadi. «Kun tavsiyasi»ga qo'lda qo'shilgan raqam
uchun ham valyuta tanlanadi.

## 2. Olib tashlangan joylar
- Raqam oynasidagi sun'iy tavsiyalar: «… ketma-ketligi — eslab qolish oson»
  va «Juft takrorlanuvchi raqamlar». Endi faqat aniq ma'lumot qoladi
  (mavjudligi, rasmiy shartnoma, bepul yetkazib berish).
- Premium kartochkadagi «Nomingizga rasmiylashtiriladi» qatori
  (raqam oynasining sarlavhasidan ham — pastda allaqachon yozilgan).
- Profil sahifasi pastidagi «Ish vaqti …» va «© 2026 VIP RAQAMLAR
  (vipraqamlar.uz)» qatorlari.

## 3. Yozuvlar
- Premium kartochka yorlig'i: `PREMIUM TANLOV` → **`PREMIUM`**.
- Bosh sahifadagi bo'lim sarlavhasi: `Tanlangan VIP raqamlar` → **`Tavsiya etiladi`**.
- Ruscha tarjimalar ham moslashtirildi (`ПРЕМИУМ`, `Рекомендуем`).

## Tekshiruvlar
Sayt: JS 0 xato · kontrast 0 xato (light + dark) · toshish 0 ·
16 ta harness (day, tiers, fav, nav, prof, lang, map, caret, cells, ops,
upper, noprom, usd …) — hammasi o'tdi, 0 konsol xatosi.
Admin: valyuta tanlovi, dollarda saqlash, bo'lib to'lashning avtomatik
o'chishi, ro'yxatdagi `$`, tahrir qatoridagi tanlov — tekshirildi.

---

# Yana uchta tuzatish

## 1. Telegram botda ham dollar
Mijoz boti (`customer-bot-webhook.js`) endi raqamning `currency` maydonini
o'qiydi:
- Raqam kartochkasida «💵 Narxi» va «Eski narxi» `$` bilan chiqadi.
- Dollarlik raqamda «bo'lib to'lash mumkin» qatori umuman ko'rsatilmaydi.
- Tasdiqlash xulosasida ham `$` ko'rinadi.
- Buyurtma hujjatiga `currency: 'USD'` yoziladi va adminga ketadigan
  bildirishnomaga `💲 Summa: 1 200 $` qatori qo'shiladi.
Admin boti (`bot-webhook.js`) ro'yxatida ham dollarlik raqam `$` bilan chiqadi.

## 2. Kun tavsiyasi kartochkasi chekkaga chiqib ketmaydi
Avval qator sahifa chekkasigacha «chiqib» ketardi (`margin:0 -18px`) —
kartochka boshqalaridan kengroq ko'rinardi. Endi qator aynan o'sha
chegaradan boshlanib, o'sha chegarada tugaydi; keyingi kartochkadan bir
chekkasi ko'rinib turadi (surish mumkinligi bilinishi uchun).

## 3. Jonli bazadagi tavsiyalar o'zi yangilanadi
Admin «jonli bazadan» qo'shgan raqam operatorda band qilinib ketishi
mumkin. Endi sayt har yuklanishda aynan o'sha 7 raqam bo'yicha operatordan
so'raydi (bitta operator bilan cheklangan — arzon so'rov):

| Holat | Natija |
|---|---|
| Operatorda topilmadi | Kun tavsiyasidan **avtomatik olib tashlanadi** |
| Topildi, narxi o'zgargan | **Narxi va operatori yangilanadi** |
| Server/operator javob bermadi | **Hech narsa o'chirilmaydi** (xato tufayli raqam yo'qolib qolmasin) |

Bazadagi (Firestore) tavsiyalar bu yerda tekshirilmaydi — ular allaqachon
raqamlar bazasi bilan jonli bog'langan.

## Tekshiruvlar
Sayt: JS 0 xato · kontrast 0 · 16 ta harness o'tdi.
Jonli tekshiruv alohida sinaldi: band bo'lgan raqam yo'qoldi, narxi
o'zgargani yangilandi, server xato bergan holatda hech narsa o'chmadi.
Botlar: sintaksis tekshiruvi (`node --check`) toza.

---

# «Toifasiz» endi rostdan ham rangsiz

Sabab topildi: kodda «agar raqam *Mashhur* (featured) bo'lsa — uni GOLD deb
hisobla» degan ZAXIRA qoida bor edi. Shuning uchun admin «Toifasiz (oddiy)»
ni tanlasa ham, «Mashhur raqamlarga qo'shish» belgilangan bo'lsa (yoki eski
raqamda shu belgi qolgan bo'lsa) kartochka o'zi oltin rangga o'tib qolardi.

O'sha qoida olib tashlandi. Endi:

- **Toifasiz** → hech qanday rang, hech qanday yorliq. Oddiy kartochka.
- **VIP / PREMIUM / GOLD** → faqat admin shu toifani tanlaganda.
- **«Mashhur raqamlarga qo'shish»** endi faqat bosh sahifadagi yuqori
  karuselga tushishini bildiradi — rangga umuman ta'sir qilmaydi.

Eslatma: «Bo'lib to'lash» belgilangan raqamda chap chekkada ingichka
ko'kish-yashil chiziq qoladi — bu toifa rangi emas, «bo'lib to'lash bor»
degan belgi (pastdagi «450 000 so'mdan / 24 oy» yorlig'i bilan bir xil
rangda). Kerak bo'lmasa, uni ham olib tashlash mumkin.

---

# Kun tavsiyasi kartochkasi endi oddiy kartochkadek ishlaydi

Sabab: jonli bazadan qo'shilgan tavsiya raqami Firestore'da ham, saytdagi
jonli qidiruv natijalarida ham YO'Q edi — shuning uchun ustiga bosilganda
`findItem()` uni topa olmay, kartochka "o'lik" bo'lib qolardi.

Endi kun tavsiyasidagi raqamlar alohida ro'yxatda saqlanadi va `findItem()`
shuni ham tekshiradi. Natijada:

- Kartochka ustiga bosilsa — **raqam oynasi ochiladi** (narxi, shartlari,
  ulashish va sevimlilarga qo'shish bilan).
- **«Buyurtma berish»** tugmasi to'liq ishlaydi: ism, telefon, manzil, SMS
  tasdiq — hammasi odatdagidek.
- Jonli raqam buyurtmasi `live_reservations` qulfi bilan yoziladi (ikki
  mijoz bir raqamni band qila olmaydi), bazadagi raqam esa odatdagidek
  tranzaksiya bilan band qilinadi.

Bazadan qo'shilgan tavsiyalar avvaldan ishlardi — ular ham tekshirildi.

---

# RANG TIZIMI — «A» varianti

Oldin bitta ekranda 8 ga yaqin rang bir vaqtda gapirardi. Endi rang
oilasi 3 ta: **neytral** (fon va matn), **metall** (toifa), **qizil**
(faqat chegirma).

| Nima o'zgardi | Avval | Hozir |
|---|---|---|
| Toifali kartochka ichi | oltin / binafsha / platina fon | **neytral** — oddiy kartochka bilan bir xil |
| Toifa qanday bilinadi | butun kartochka rangi | **yorliq + chap chekkadagi 3px chiziq** |
| Toifasiz kartochka | ko'k chiziq | chiziq yo'q |
| «Bo'lib to'lash» | ko'kish-yashil chiziq + ko'k yorliq | chiziq yo'q, yorliq neytral |
| Operator | rangli nuqta (sariq/qizil/pushti…) | **nuqtasiz**, neytral chip |
| Ro'yxatdagi «Ko'rish» | to'q ko'k tugma | **to'q ko'k** (o'zgarmadi) — endi u yagona urg'u |
| Kun tavsiyasi | firuza shisha kartochka | **tegilmadi** — mijoz so'roviga ko'ra eski holicha qoldi |

To'q ko'k endi butun saytda FAQAT BITTA narsani bildiradi: **harakat**
(«Ko'rish» va «Buyurtma berish»). Kartochka ichi neytral bo'lgani uchun
u hech narsa bilan kurashmaydi — ko'z avval raqamga, keyin tugmaga tushadi.

Tegilmagan joylar (ataylab): bosh sahifadagi PREMIUM karusel va raqam
oynasining sarlavhasi — ular to'q ko'k + oltin, ya'ni brendning bitta
«hashamat» yuzasi; operator filtri qatori — u yerda logotiplar bor.

Tekshirildi: kontrast 0 xato (oq va qora fonda), 16 ta harness o'tdi,
JS 0 xato, uch toifa va toifasiz kartochka ikkala mavzuda ko'zdan kechirildi.

---

# Raqam kattaroq + oq fonda kartochka ajralib turadi

**1. Raqam — kartochkaning bosh qahramoni**
Telefonda 21px → **23.5px**, kompyuterda 21px → **25px**. Kun tavsiyasi
kartochkasida ham bir xil. Kattalashtirish ataylab ozgina — kartochka
balandligi deyarli o'zgarmadi, lekin ko'z endi birinchi navbatda raqamga
tushadi.

**2. Oq fon: kartochka va orqa fon ajralmasdi**
Sabab aniq edi — orqa fon `#E4EAF4`, kartochka esa yarim shaffof oq
(82%) bo'lgani uchun ikkalasi deyarli bir xil oqish chiqardi. Endi:

| | Avval | Hozir |
|---|---|---|
| Orqa fon | `#E4EAF4` | **`#D9E1EF`** (biroz to'qroq, salqin kulrang-ko'k) |
| Kartochka foni | oq 82% / 62% | **oq 99% / 93%** — amalda toza oq |
| Chegara | 9% | 11% |
| Soya | yengil | biroz chuqurroq va kengroq |

Natijada kartochka fonda "suzib" turgandek ko'rinadi — zamonaviy
ilovalardagidek. Qora mavzuga tegilmadi, u allaqachon to'g'ri edi.

Tekshirildi: kontrast 0 xato (oq va qora fonda), toshish 0, 14 ta harness
o'tdi; telefon va kompyuter ko'rinishlari ko'zdan kechirildi.

---

# «Ko'rish» — ikkilamchi tugma

Ro'yxatda tugma va ko'k rang QOLDI, lekin to'ldirilgan emas:
**ochiq ko'k fon + to'q ko'k matn + strelka, porlashsiz.**

Sabab: ro'yxatda hamma element teng. 15 ta bir xil to'q ko'k tugma
qo'yilsa, «asosiy» degan tushuncha yo'qoladi va ko'z har kartochkada
raqamdan tugmaga sakraydi. Katta kompaniyalar (Airbnb, Apple, Amazon,
Zillow) ro'yxatda umuman to'ldirilgan tugma qo'ymaydi; Booking.com
qo'yadi, lekin u konversiyaga sozlangan, nafislikka emas.

To'ldirilgan to'q ko'k endi butun saytda **bitta joyda** — raqam
oynasidagi «Buyurtma berish». Ya'ni qaror qabul qilinadigan nuqtada.

Kun tavsiyasi kartochkasidagi yashil tugma tegilmadi — o'sha bo'lim
ataylab ajralib turishi kerak.

Kontrast: oq fonda 8.1:1, qora fonda ~6.2:1 — ikkalasi ham AA dan ancha
yuqori.

---

# Bosh sahifadagi PREMIUM kartochka — qimmatbaho karta ko'rinishi

Yurib turuvchi (karusel) kartochka endi oddiy to'q ko'k to'rtburchak emas.
Unga bank/kolleksion kartalar tilidan olingan oltita qatlam qo'shildi:

1. **Oltin soch chiziq ramka** — tepada yorqin, pastga qarab so'nadi
   (`mask-composite` bilan chizilgan 1px gradient ramka, oddiy border emas).
2. **Giloshe to'qima** — pul va bank kartalaridagi kabi ingichka yoy naqsh,
   zo'rg'a sezilarli: naqsh emas, "material" bo'lib turadi.
3. **Vinyetka** — chekkalar to'qlashadi, kartochka og'ir va chuqur ko'rinadi.
4. **Metall yaltirashi** — har ~7.5 soniyada ingichka yorug'lik yuzadan
   sekin o'tadi. `prefers-reduced-motion` yoqilgan qurilmada o'chadi.
5. **O'yib yozilgan raqam** — ustidan oq, pastdan sutli oltin o'tadigan
   gradient + chuqur soya va yuqorida yorug'lik qirrasi.
6. **Qabariq oltin folga** — yorliq va "Ko'rish" tugmasida: ichki yorug'lik
   qirrasi, pastda to'q qirra va ko'ndalang yaltirash chizig'i.

Ajratgich ham oddiy chiziq emas — o'rtasi oltin, ikki chekkasi so'nadi.
Operator chipi shisha + oltin soch chiziq.

Natijada ierarxiya aniq: tepada bitta **hashamat yuzasi**, pastda esa tinch
neytral ro'yxat. Oltin saytda faqat shu yerda va toifa yorlig'ida qoladi.

Tekshirildi: kontrast 0 xato, 12 ta harness o'tdi, telefon va kompyuter
ko'rinishlari ko'zdan kechirildi.

---

# Kompyuterda raqam to'liq ko'rinadi

Muammo: katalogda ustunlar soni QAT'IY 3 ta edi. 1050px atrofidagi ekranda
yon panel (392px) joyni yeb, kartochka 180px gacha siqilardi — raqam esa
25px da qolib, «33 072 07 …» bo'lib kesilardi.

Uchta yo'nalishda tuzatildi:

1. **Raqam o'lchami kartochkaga qarab o'zi moslashadi** (container query):
   tor ustunda kichrayadi, keng kartochkada 25px gacha kattalashadi.
   Ya'ni raqam endi HECH QACHON kesilmaydi. Eski brauzerlarda avvalgi
   qiymat zaxira bo'lib qoladi.
2. **Katalog ustunlari soni joyga qarab tanlanadi** (`auto-fill`), kartochka
   hech qachon ~260px dan tor bo'lmaydi.
3. **Yon panel** endi qat'iy 392px emas — kichik ekranda 270px gacha torayadi.
   Bosh sahifada esa 4 ta ustun 3 taga tushirildi: sahifa kengligi 1240px
   bilan cheklangani uchun 4 ta kartochka 280px gacha siqilardi, endi
   ~380px va raqam to'liq 25px.

Tekshiruv: 900 / 1000 / 1054 / 1100 / 1200 / 1280 / 1400 / 1500 / 1700 px
kengliklarda, bosh sahifa va katalogda — **hech bir raqam kesilmadi**
(avval 9 tadan 9 tasi kesilardi).

---

# Dollar belgisi summa bilan bir xil kattalikda

Avval `$` belgisi `so'm` bilan bir xil uslubda — kichik va xira — chiqardi.
Lekin bu ikkisi bir xil narsa emas: «so'm» shunchaki o'lchov birligi, `$`
esa summaning o'qilishiga kiradi («750 $» = «750 dollar»).

Endi `$` **narx bilan aynan bir xil kattalikda, qalinlikda va rangda**
chiqadi; `so'm` esa avvalgidek kichik va xira qoladi. Bu qoida saytning
barcha joyida ishlaydi: kartochka, bosh sahifadagi premium karusel, kun
tavsiyasi, raqam oynasi, pastki «Jami» qatori va buyurtma xulosasi.

---

# Tepadan tushadigan bildirishnoma, chekka imo-ishorasi, kun tavsiyasi

## 1. Yangi raqam qo'shilganda — Telegramdagi kabi bildirishnoma
Avval pastda kichkina kulrang "toast" chiqardi. Endi **tepadan sirg'alib
tushadigan to'liq kartochka**:

- Kichik sarlavha: «YANGI RAQAM QO'SHILDI»
- Yirik raqam, tagida **narxi va operatori** to'liq
- Oltin qo'ng'iroq belgisi, shisha fon, pastda vaqt chizig'i
- **Yumshoq ovoz** chaladi (fayl kerak emas — brauzerning o'zi chaladi;
  brauzer qoidasiga ko'ra birinchi teginishdan keyin ishlaydi) va titratish
- **4 soniyadan keyin o'zi ketadi**; mijoz kutmasdan **yuqoriga yoki yonga
  surib** yuborishi, yoki ✕ bosishi mumkin
- Ustiga bossa — o'sha raqam oynasi ochiladi
- Bir vaqtda ko'pi bilan 2 ta ko'rinadi, ekran to'lib ketmaydi

## 2. Chap chekkadan surib orqaga qaytish
Telegram/iOS'dagi kabi: barmoqni ekranning **chap chekkasidan o'ngga**
sursa — orqaga qaytadi. Surish paytida chekkada kichik strelka chiqib,
barmoq bilan birga suriladi.

- Oyna (raqam oynasi, buyurtma, savol-javob…) ochiq bo'lsa — **avval o'sha
  yopiladi**
- Aks holda sahifa tarixi bo'yicha orqaga o'tiladi
- Chekka zonasi 22px va faqat barmoq uchun — sichqoncha bilan ishlamaydi,
  shuning uchun oddiy surishga va sevimlilardagi "o'chirish" imo-ishorasiga
  xalaqit bermaydi

## 3. Kun tavsiyasi
- O'ng chekkadagi **qora soya butunlay olib tashlandi** — kartochka kam
  bo'lganda u bo'sh joyda xunuk ko'rinardi.
- O'rniga kartochkaning o'zida **sekin yurib turuvchi oq yaltirash** paydo
  bo'ldi (bosh sahifadagi premium kartochkadagi kabi, lekin yumshoqroq).

Tekshirildi: bildirishnoma ikkala mavzuda chiqdi va 4 soniyada ketdi, yonga
surilganda darhol yo'qoldi; chekka imo-ishorasi oynani yopdi va sahifani
orqaga qaytardi; 16 ta harness o'tdi, kontrast 0 xato, JS 0 xato.

---

# Nusxa olish, yaqinlashtirish va yangi bildirishnoma belgisi

## 1. Yaqinlashtirish/uzoqlashtirish ochildi
Sahifa sozlamasida `user-scalable=no, maximum-scale=1` turgandi — shuning
uchun ikki barmoq bilan kattalashtirib bo'lmasdi. Endi **5 barobargacha**
yaqinlashtirish mumkin.

Yonidagi tuzatish: forma maydonlari (ism, telefon, manzil) 14.5px edi —
iPhone 16px dan kichik maydonga bosilganda sahifani o'zi kattalashtirib
yuboradi. Shu sabab ular **16px** ga o'tkazildi. Ikki marta bosganda
sakrab zoom bo'lishi esa avvalgidek o'chirilgan, ya'ni faqat ikki barmoq
bilan ishlaydi.

## 2. Nusxa olish ishlaydi
- Matn (raqam, narx, shartlar) endi **barmoq bilan belgilanadi va
  nusxalanadi**. Tugmalar, yorliqlar va menyu belgilanmaydi — ular
  bosiladi, o'qilmaydi.
- Mijoz matnni belgilagan bo'lsa, keyingi bosish **faqat belgilashni bekor
  qiladi** — kartochka ochilib ketmaydi (avval shunday bo'lardi).
- Raqam oynasiga **«Nusxa olish» tugmasi** qo'shildi (yuqorida, ulashish
  belgisi yonida): bosilsa to'liq raqam (`+998 90 777 00 00`) buferga
  tushadi va «Raqam nusxalandi» xabari chiqadi. HTTPS bo'lmagan yoki eski
  brauzerlar uchun zaxira usul ham bor.

## 3. Bildirishnoma belgisi
Katta va oddiy oltin qo'ng'iroq o'rniga endi **ixcham (34px) uchqun belgisi**:
shaffof oltin fon, ingichka oltin halqa va yumshoq porlash. Bildirishnoma
balandligi ham shunga mos ravishda kichrayadi.

Tekshirildi: raqamni sichqoncha bilan belgilash ishladi («90 777 00 00»),
belgilangandan keyingi bosish kartochkani ochmadi, keyingisi ochdi; nusxa
tugmasi buferga `+998 90 777 00 00` yozdi; 17 ta harness o'tdi.

---

# «Biz haqimizda» — manzil va xarita; nusxa olish mustahkamlandi

## 1. Ofis manzili va «Xaritani ochish»
Profil → «Biz haqimizda» oynasiga manzil kartochkasi qaytarildi:

- Manzil matni, pastida kichik xarita tasviri va urib turgan qizil nuqta
- **«Xaritani ochish»** — telefonda Yandex Xarita / Yandex Go ilovasini
  ochadi va VIP RAQAMLAR nuqtasini ko'rsatadi (ilova bo'lmasa brauzerda)
- **«Yo'nalish»** — darhol shu manzilgacha yo'l quradi

Koordinata admin paneldagi **Sozlamalar → «Ofis manzili — kenglik /
uzunlik»** maydonlaridan olinadi (allaqachon bor edi). Yangi qo'shilgani:
**«Ofis manzili (matn)»** maydoni — saytda ko'rinadigan yozuv. Bo'sh
qoldirilsa «Toshkent shahri» yoziladi, koordinata kiritilmagan bo'lsa
standart nuqta ishlatiladi — ya'ni bo'lim har doim ishlaydi.

## 2. Nusxa olish — endi uchta usul ketma-ket sinaladi
Avval faqat bitta usul (`navigator.clipboard`) ishlatilardi; Telegram ichida
yoki ba'zi brauzerlarda u jim qolardi. Endi:

1. Telegram ilovasi ichida bo'lsa — uning o'z buferi
2. Zamonaviy brauzer — `navigator.clipboard`
3. Eski usul — yashirin maydon + `execCommand('copy')`
4. Hech biri ishlamasa — raqam katta qilib chiqadi va **o'zi belgilanadi**,
   mijoz brauzerning «Nusxa olish»ini bosadi

Va eng muhimi: **raqam oynasidagi katta raqamning o'ziga bosish ham
nusxalaydi** — yonida kichik nusxa belgisi turadi, ya'ni tugmani qidirish
shart emas. Yuqoridagi nusxa tugmasi ham joyida qoldi.

---

# 7 ta katak — raqam endi hech qachon pastga tushmaydi

Muammo qayta-qayta qaytib kelardi, chunki ildizi chuqurroq edi: raqam
`<input>` ning O'ZIDA chizilardi, demak uning vertikal o'rni brauzerga
(Android Chrome, iOS Safari, Telegram ichidagi brauzer) va shrift
metrikasiga bog'liq bo'lib qolardi. Shuning uchun "xira" ko'rsatkich
raqam bilan yozilgan raqam bir xil turmasdi va ba'zi kataklarda pastga
siljirdi. `line-height` bilan tuzatish faqat ba'zi brauzerlarda ishlardi.

**Yechim — tubdan boshqacha:** `<input>` ning matni endi butunlay
ko'rinmaydi (`color:transparent`), raqam esa uning ustidagi alohida
qatlamda chiziladi va **flexbox bilan markazlashadi**. Flexbox
markazlashuvi barcha brauzerlarda bir xil ishlaydi va shriftga umuman
bog'liq emas — ya'ni muammo butunlay yopildi.

Yon ta'sir sifatida: xira ko'rsatkich raqam ham, yozilgan raqam ham
**aynan bitta joyda** chiziladi, shuning uchun yozganda raqam joyidan
qimirlamaydi. Kursor ko'rinmasligi (avvalgi tuzatish) saqlanib qoldi.

Tekshirildi: to'lgan va bo'sh kataklar yonma-yon — oq va qora fonda
raqamlar bir chiziqda; kataklarga yozish, o'chirish, chiziqchalar va
qidiruv jarayoni (`cells`, `caret`, `flow`) testlari o'tdi.

---

# Raqam oynasi sarlavhasi — soddalashtirildi

Mijoz so'roviga ko'ra olib tashlandi:

- «Nusxa olish» tugmasi (yuqoridagi belgi)
- «Ulashish» tugmasi
- Raqam yonidagi kichik nusxa belgisi
- «VIP RAQAM» yorlig'i

Qoldi: orqaga qaytish, sevimlilar (yurakcha), raqam va operator — ya'ni
avvalgi sodda ko'rinish.

Raqamning **O'ZIGA bosilsa baribir nusxalanadi** — hech qanday belgi
ko'rinmaydi, lekin mijoz raqamga bossa buferga tushadi va «Raqam
nusxalandi» xabari chiqadi. Matnni barmoq bilan belgilab nusxalash ham
ishlayveradi. Agar bu ham keraksiz bo'lsa — ayting, bir daqiqada olaman.

---

# «Ko'rish» → «Batafsil»

Ro'yxatdagi tugma yozuvi uchchala joyda ham o'zgartirildi: raqam
kartochkasi, bosh sahifadagi premium karusel va kun tavsiyasi.
Ruscha tarjimasi — «Подробнее».

Sabab: «Ko'rish» og'zaki va noaniq; «Batafsil» rasmiy, qisqa va halol —
bosilganda rostdan ham batafsil ma'lumot oynasi ochiladi.

Ierarxiya tiniq bo'ldi:
- Ro'yxatda — **Batafsil** (jim, tiniq ko'k): «qarab chiqaman»
- Raqam oynasida — **Buyurtma berish** (to'q ko'k): «olaman»

«Band» yozuvi band raqamlarda avvalgidek qoladi.

## «Ko'rish» saytdan butunlay olib tashlandi

Kartochkalardan tashqari yana uchta joyda qolgan edi — ular ham rasmiy
ohangga keltirildi (ma'nosiga mos so'z bilan):

| Qayerda | Avval | Hozir | Ruscha |
|---|---|---|---|
| Raqam kartochkasi, premium karusel, kun tavsiyasi | Ko'rish | **Batafsil** | Подробнее |
| Buyurtmalarim — holat tugmasi | Holatni ko'rish | **Holatni tekshirish** | Проверить статус |
| Profil — Buyurtmalarim plitkasi | Tarixni ko'rish | **Buyurtmalar tarixi** | История заказов |
| Sevimlilar bo'sh ekrani | Raqamlarni ko'rish | **Katalogga o'tish** | Перейти в каталог |

Tekshiruv: beshta ekranda (bosh sahifa, katalog, qidiruv natijasi,
sevimlilar, profil, buyurtmalarim) o'zbekcha va ruscha rejimda
«Ko'rish» / «Смотреть» so'zi **0 marta** uchraydi.

---

# Yorug' mavzu olib tashlandi — sayt faqat tungi

Mijoz so'roviga ko'ra:

- Mavzu almashtirish tugmasi **ikkala sarlavhadan ham** (telefon va
  kompyuter) olib tashlandi
- Sahifa **doim tungi fonda** ochiladi: tizim (telefon) yorug' rejimda
  bo'lsa ham, mijozda eski «light» tanlovi saqlangan bo'lsa ham
- Brauzer paneli rangi (`theme-color`) doim `#07152B`

Yorug' mavzuning CSS qoidalari **o'chirilmadi** — kerak bo'lsa tugmani
qaytarish uchun bir necha satr yetarli. Kontrast testi ham ikkala mavzuni
tekshirishda davom etadi, ya'ni yorug' mavzu buzilmay turadi.

Eski `theme.cjs` testi (tugmani tekshirardi) yangisi bilan almashtirildi:
endi u saytning **har doim tungi** qolishini tekshiradi.

---

# Jonli orqa fon — SINALDI VA BEKOR QILINDI

Orqa fonda sekin suzadigan nur qatlamlari qo'shilgandi, lekin:

- nurning cheti to'q fonda sezilarli chiziq (banding) hosil qilardi;
  uni yumshatish uchun qo'shilgan "don" qatlami esa
- aylantirishdagi kadr tezligini ~53 FPS dan ~38 FPS gacha tushirdi

Shu sabab mijoz so'roviga ko'ra **butunlay bekor qilindi** — orqa fon
avvalgi holida qoldi: statik, qimirlamaydigan nurlar. Aylantirish yana
~53 FPS.

---

# Tezlik: shisha effekti ro'yxatdan olib tashlandi

O'lchov (30 ta kartochkali ro'yxatni aylantirganda):

| Holat | FPS |
|---|---|
| Avval | **44** |
| Kartochkadagi `backdrop-filter` olib tashlangach | **61** |

Sabab: `backdrop-filter` (shisha xiralik) har bir kartochkada ALOHIDA
qatlam yaratadi. Ro'yxatda 30 ta kartochka bo'lsa — 30 ta qatlam, va
brauzer aylantirishning har bir kadrida ularning hammasini qayta
hisoblaydi. Arzon Android telefonlarda bu yanada og'ir.

Olib tashlandi: `.numcard`, `.daycard`, `.card`, `.ptile`, `.tgcard` va
premium kartochka ichidagi operator chipidan.
Qoldi (takrorlanmaydigan, bittadan): tepa panel, pastki menyu, menyu
kapsulasi, oynalar foni, bildirishnoma, chekka belgisi.

**Ko'rinishda farq yo'q** — kartochka foni allaqachon deyarli to'liq to'q
edi, xiralik orqasidan hech narsa ko'rinmasdi. Oq va qora fonda
solishtirildi.

Yon tekshiruv: `container-type` ni olib tashlash FPS ni 51 ga TUSHIRADI,
ya'ni u aksincha yordam beryapti — joyida qoldirildi. Premium kartochka
va kun tavsiyasidagi yaltirash animatsiyalari endi tezlikka ta'sir
qilmaydi (shisha olinganidan keyin ikkalasi ham 60 FPS beradi), shuning
uchun ular saqlandi.

---

# Menyu bosilganda bo'lim YUMSHOQ ochiladi

Animatsiya avval ham bor edi, lekin u **0 shaffoflikdan** boshlanardi:
ekran bir lahza butunlay bo'sh qolib, keyin "sakrab" paydo bo'lardi —
aynan shuning uchun qattiq tuyulardi.

O'zgarishlar:

| Nima | Avval | Hozir |
|---|---|---|
| Boshlang'ich shaffoflik | 0 (bo'sh ekran) | **0.42** (ko'rinib turadi) |
| Davomiyligi | 0.40 s | **0.58 s** |
| Harakat | 8px ko'tarilish | **16px ko'tarilish + ozgina kattalashish** |
| Egri chiziq | o'rtacha | yumshoqroq (`cubic-bezier(.22,.9,.26,1)`) |

Yana ikkita nozik joy tuzatildi:

1. **Sahifa tepaga ko'tarilishi** endi animatsiyadan OLDIN bajariladi —
   avval o'rtasida bajarilib, ekran "sakrab" tushardi.
2. **Menyu belgisi** keskin almashmaydi: to'ldirilgan belgi ichkaridan
   yumshoq "chiqadi", chiziqlisi esa ozgina kattalashib so'nadi.
3. Kartochkalarning ketma-ket chiqish kechikishi biroz qisqartirildi
   (0.42 s → 0.32 s), shunda ekran bilan birga tinchlanadi.

Tezlikka ta'siri yo'q: aylantirishda baribir **61 FPS**.
