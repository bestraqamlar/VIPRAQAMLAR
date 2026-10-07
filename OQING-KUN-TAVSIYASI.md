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
