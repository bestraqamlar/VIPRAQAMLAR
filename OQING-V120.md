# V120 — BUYURTMA HECH QACHON YO'QOLMAYDI

## Muammo
Adminda "⚠ 14 ta mijoz yubormoqchi bo'ldi, lekin xato tufayli uddalay
olmadi" degan ogohlantirish chiqdi. Sababi: buyurtmani MIJOZ BRAUZERI
to'g'ridan-to'g'ri Firestore'ga yozardi va bu bir vaqtda uchta narsaga
bog'liq edi:

1. Firestore qoidalari to'g'ri joylangan bo'lishi;
2. App Check tokeni olinishi (reklama bloklagichi bo'lsa — olinmaydi);
3. mijoz tarmog'idan `firestore.googleapis.com` ochilishi.

Bittasi ishlamasa — buyurtma butunlay yo'qolardi.

## Yechim — UCHTA MUSTAQIL YO'L

| # | Yo'l | Nimaga bog'liq | Xato bo'lsa |
|---|------|----------------|-------------|
| 1 | **Server** — `api-buyurtma.js`, Admin SDK bilan yozadi | faqat saytning o'zi ochilishiga | 2-yo'lga o'tadi |
| 2 | **Zaxira** — brauzer o'zi Firestore'ga yozadi (eski yo'l) | qoidalar + App Check + Firestore | 3-yo'lga o'tadi |
| 3 | **Navbat** — brauzer xotirasida saqlanadi | hech narsaga | o'zi qayta yuboriladi |

Admin SDK Firestore qoidalaridan ham, App Check'dan ham o'tmaydi —
ya'ni 1-yo'lda yuqoridagi uchala sabab ham yo'qoladi.

**Navbat** (3-yo'l) — oxirgi himoya: buyurtma `localStorage`'ga yoziladi
va o'zi qayta yuborilib turadi — aloqa tiklanganda, sahifa qayta
ochilganda, ko'rinadigan holatga qaytganda va har 30 sekundda. Mijozga
"Buyurtmangiz saqlandi — aloqa tiklanishi bilan o'zi yuboriladi" deb
yoziladi; yuborilgach "Buyurtmangiz yuborildi ✓". 3 kundan oshgan yozuv
o'chiriladi.

## Takrorlanish bo'lmaydi
Har bir buyurtma urinishiga bitta `sorovId` beriladi. Server shu belgi
bo'yicha avval yozilganini topadi va IKKINCHI nusxani yaratmaydi. Shu
sababli qayta yuborish (server yo'li 1 marta, navbat esa cheksiz)
mutlaqo xavfsiz.

## Himoya
- IP bo'yicha soatlik chegara: 30 ta buyurtma (`order_create_rate_limits`);
- maydonlar ro'yxati va shakli `firestore.rules` dagi bilan AYNAN bir xil
  mantiq bilan tekshiriladi (ism harfli, telefon haqiqiy operator kodi
  bilan, narx son, ortiqcha maydon qabul qilinmaydi);
- raqam band bo'lsa tranzaksiya rad etadi — bitta raqam ikki kishiga
  sotilmaydi (jonli raqamlar uchun `live_reservations` qulfi);
- raqamni band qilib bo'lmasa ham BUYURTMA BARIBIR yoziladi
  (`bandQilinmadi: true`) — savdo yo'qolmaydi, admin raqamni qo'lda
  band qiladi.

## O'zgargan fayllar
- `netlify/functions/api-buyurtma.js` — YANGI
- `index.html` (+ `build/parts/06-js-order.html`, `08-js-boot.html`)
- `assets/panel.js` — adminning "yo'l" ogohlantirishi matni yangilandi
- `firestore.rules` — `sorovId` maydoniga ruxsat (zaxira yo'l uchun)
- `panel-boshqaruv.html` — `?v=120`

## SIZDAN KERAK
1. **`firestore.rules` ni Firebase'ga joylash** — hali joylanmagan
   (eng muhim ish). `.github/workflows/firebase-qoidalar.yml` +
   `FIREBASE_TOKEN` sekreti qo'yilsa, bu o'zi bo'ladi.
2 Netlify muhit o'zgaruvchilari `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` turgani tekshirilsin
   — 1-yo'l aynan shularga bog'liq (ular allaqachon boshqa funksiyalar
   uchun qo'yilgan, ya'ni odatda hech narsa qilish kerak emas).

## Tekshirildi
Serverda (soxta Firestore bilan): oddiy buyurtma, `sorovId` bo'yicha
takror (bitta buyurtma qoldi), band raqamga buyurtma → 409, jonli raqam
qulfi, ruxsatsiz maydon → 400, noto'g'ri telefon → 400.
Saytda (soxta tarmoq bilan): server ishlaganda, server 503 bo'lganda,
tarmoq uzilganda, raqam band bo'lganda, ikki yo'l ham ishlamaganda
(navbatga tushdi) va navbat aloqa tiklanganda yuborilganda — hammasi
kutilganidek.

---

# V120 — XAVFSIZLIK TEKSHIRUVI (zip ichidagi hamma narsa ko'rildi)

## 1. `.github` papkasi — ichida sir YO'Q
Ichida bitta fayl bor: `.github/workflows/firebase-qoidalar.yml` —
Firestore/Storage qoidalarini avtomatik joylaydigan ish. Kalitning
O'ZI u yerda yo'q, faqat `secrets.FIREBASE_TOKEN` ga havola bor
(kalit GitHub Secrets ichida turadi, kodga tushmaydi).

Shunga qaramay uchta joyi qattiqlashtirildi:
- `permissions: contents: read` — bu ishga berilgan GitHub tokeni endi
  omborga HECH NARSA YOZA OLMAYDI (standart holatda yozishga ham
  ruxsatli bo'lishi mumkin edi);
- `pull_request` triggeri ATAYLAB yo'q — aks holda begona odam "pull
  request" ochib, o'z kodini shu ish ichida yurgizib `FIREBASE_TOKEN`
  ni o'g'irlashi mumkin bo'lardi;
- kalit endi `run:` buyruq satriga qo'shilmaydi, `env:` orqali beriladi
  (jurnalga tushmaydi).

Qo'shimcha: omborga `.gitignore` qo'shildi — `.env`, `*.pem`, `*.p8`,
`*.p12`, `*.jks`, keystore, `serviceAccount*.json`, `google-services.json`
kabi fayllar endi xato bilan ham GitHubga tushmaydi.

## 2. TOPILGAN VA YOPILGAN HAQIQIY TESHIKLAR

### a) Storage: stories va videolarni HAR QANDAY ro'yxatdan o'tgan odam o'chirib/almashtira olardi — YOPILDI
`storage.rules` da `allow write`/`allow delete` sharti
`request.auth != null` edi — ya'ni "tizimga kirgan HAR QANDAY odam".
Izohda "faqat admin" deb yozilgan, lekin qoida buni tekshirmasdi.
Firebase Authentication'da o'z-o'zini ro'yxatdan o'tkazish yoqilgan
bo'lsa (odatiy standart holat), begona odam ochiq Web API kaliti bilan
o'ziga hisob ochib, bosh sahifadagi stories rasmlarini almashtirib
yoki o'chirib yuborishi mumkin edi.

Endi `admin`/`superAdmin` maxsus huquqi (custom claim) talab qilinadi —
u faqat server tomonidan beriladi. Qolgan hamma fayl yo'li uchun aniq
`allow read, write: if false` qo'shildi.

### b) Jadvalli funksiyalarning qalqoni aylanib o'tiladigan edi — YOPILDI
`lib/jadvalQalqon.js` so'rov tanasida `next_run` bo'lsa yoki
`x-nf-event: schedule` sarlavhasi bo'lsa — o'tkazib yuborardi. Ikkisini
ham har kim qo'lbola so'rov bilan soxtalashtira oladi, ya'ni oddiy
`curl` bilan zaxira nusxani qayta-qayta yuritib xarajat chiqarish,
`release-stale-reservations` ni chaqirib band raqamlarni bo'shatib
yuborish yoki operator API'lariga minglab so'rov yuborish mumkin edi.

Endi ikki qatlam: **haqiqiy `CRON_SECRET` kaliti** bilan kelgan chaqiruv
cheklovsiz o'tadi (admin paneldagi "Hozir tekshirish" shu yo'ldan),
kalitsiz chaqiruvga esa **"eng kam oraliq" qo'riqchisi** qo'llanadi —
har bir ish o'z jadvalidan tez-tez bajarilmaydi (har daqiqalik ish 40 s,
kunlik ish 16 soat). Soxta chaqiruvdan hech qanday foyda qolmadi.
19 ta funksiya shu tartibga o'tkazildi.

### c) Ochiq qidiruv funksiyasini cheksiz chaqirib bo'lardi — YOPILDI
`api-index.js` (mijoz qidiruvi) ataylab ochiq. Keshlari ko'p, lekin
har xil naqsh bilan ketma-ket chaqirilsa har biri keshdan o'tib
Firestore'ga haqiqiy o'qish ketardi — skript bilan hisobni xarajatga
ko'mish mumkin edi. Endi IP bo'yicha daqiqasiga 120 so'rov chegarasi
bor. Chegara XOTIRADA — ya'ni himoyaning o'zi bir tiyin ham
qo'shimcha xarajat qilmaydi.

## 3. KO'RILDI — JOYIDA, TEGILMADI
- **Kodda hech qanday sir qolmagan.** Butun zip qaraldi: `.env`, `.pem`,
  `.p8`, `.p12`, keystore, xizmat hisobi JSON, bot tokeni, Payme/Click
  kaliti, Chatplace kaliti — biri ham yo'q. Hamma sir
  `process.env` orqali (Netlify muhit o'zgaruvchilari) o'qiladi.
- **`apiKey: "AIzaSy..."`** — bu Firebase Web API kaliti. U SIR EMAS,
  Google'ning o'zi uni brauzerga ochiq qo'yishni talab qiladi (bu
  shunchaki loyiha manzili). Himoya qoidalar va App Check bilan
  qilinadi. Shunga qaramay tavsiya pastda (4-bo'lim, 3-band).
- **`auth-proxy.js`** — faqat ikki manzilga va aniq yo'llar ro'yxatiga
  so'rov o'tkazadi, daqiqasiga 20 ta, `cookie`/`authorization`
  sarlavhalari ATAYLAB uzatilmaydi. Ochiq proksiga aylanmaydi.
- **`send-sms-code.js`** — faqat O'zbekiston raqamlari va faqat
  haqiqiy operator kodlari, bitta raqamga daqiqada 1 va kunda 8 SMS,
  IP bo'yicha soatiga 60. Pullik SMS suiiste'moli yopiq.
- **`admin-grant-role.js`** — `ADMIN_BOOTSTRAP_SECRET` kaliti bilan
  ishlaydi, kalit sozlanmagan bo'lsa umuman ishlamaydi.
- **`check-my-orders-telegram.js`** — Telegram imzosi (HMAC) tekshiriladi.
- **`tarif-callback.js`** — Click imzosi tekshiriladi, kalit yo'q bo'lsa
  rad etadi.
- **`panel-boshqaruv.html` / `sotuvchi.html`** — `robots.txt` da yopilgan,
  haqiqiy himoya esa Firebase Auth + `requireAdmin` (sahifaning o'zi
  ko'rinishi hech narsa bermaydi).
- **`tekshiruv.html`** — `noindex`, ichida sir ko'rsatmaydi.

## 4. QOLGAN, BILIB TURIB QOLDIRILGAN RISKLAR (past, lekin aytib qo'yaman)
1. **"Band qilish" spamı.** Anonim mijoz raqamni band qila oladi (buyurtma
   formasi uchun shart). Himoya: `release-stale-reservations` har 10
   daqiqada orqasida buyurtma yo'q "band"larni bo'shatadi. To'liq yopish
   uchun band qilishni ham serverga ko'chirish kerak — endi
   `api-buyurtma.js` borligi uchun bu oson, keyingi versiyada qilsa
   bo'ladi.
2. **Ko'rishlar sonini shishirish.** `numbers.views` va
   `site_stats/counter` ni brauzer +1 qila oladi. Zarari yo'q, faqat
   son chiroyli bo'lmaydi.
3. **Promo-kodni "ishlatilgan" qilib belgilash.** `promo_usage` ga
   brauzerdan yozish ochiq (buyurtma yo'li uchun kerak). Nazariy jihatdan
   kimdir oldindan belgilab, chegirmani ishlamas qilib qo'yishi mumkin.
   Qoidalarning o'zida izoh bor; to'g'ri yechim — bu yozuvni ham
   `api-buyurtma.js` ichiga olish.
4. **Anonim forma spamı** (`job_applications`, `hamkor_arizalari`) —
   qoidalar darajasida so'rov sonini cheklab bo'lmaydi. Kerak bo'lsa
   ularni ham server funksiyasi orqali o'tkazamiz.

## 5. SIZ QILADIGAN ISHLAR (eng muhimdan)
1. **`firestore.rules` VA `storage.rules` ni Firebase'ga joylash.**
   Siz yuborgan nusxa — HALI ESKI: unda `premium_number_videos` bloki
   bor (bo'lim V118 da o'chirilgan) va `sorovId` yo'q. Ya'ni Firebase'da
   eski qoidalar turgani tasdiqlandi. Storage qoidasidagi teshik ham
   faqat joylangandan keyin yopiladi.
2. **Netlify'da `CRON_SECRET`** o'zgaruvchisini qo'yish (uzun, tasodifiy
   satr). Shundan keyin jadvalli funksiyalar tashqi chaqiruvlardan
   butunlay yopiladi.
3. **Google Cloud'da Web API kalitini cheklash**: Console → APIs &
   Services → Credentials → o'sha kalit → Application restrictions →
   HTTP referrers → `https://vipraqamlar.uz/*` va
   `https://*.netlify.app/*`. Kalit o'zi sir emas, lekin shundan keyin
   uni boshqa saytdan ishlatib bo'lmaydi.
4. **Gmail / GitHub / Netlify / Firebase hisoblariga 2FA** va adminka
   uchun alohida, takrorlanmaydigan parol.

---

# V120 — IKKI OGOHLANTIRISH SABABI TOPILDI

## 1. "Katalog indeksi qayta qurilmayapti" — YOLG'ON OGOHLANTIRISH edi
Indeks aslida ishlayotgan edi. Sabab kodda: `search_index/dirty`
("indeks eskirdi") belgisini **hech kim tozalamasdi**. Nazoratchi esa
faqat shu belgining YOSHIGA qarardi — shu sabab belgi qo'yilgan kundan
boshlab har soat bir xil ogohlantirish chiqib turdi. 2251 daqiqa — bu
"indeks 37 soat qurilmagan" degani emas, "belgi 37 soat oldin
qo'yilgan" degani.

To'g'rilandi:
- `api-index.js` — `dirty` endi imzo (signature) ichiga qo'shilmaydi,
  `meta.builtAt` bilan solishtiriladi: belgi oxirgi qurilishdan KEYIN
  qo'yilgan bo'lsa — indeks haqiqatan eskirgan, aks holda hammasi
  joyida. Hech narsani tozalash kerak emas, ya'ni "tozalashni
  unutish" xatosi qaytib kelmaydi.
- `soglik-background.js` — nazoratchi ham xuddi shu taqqoslashni
  qiladi va xabarda endi "oxirgi qurilish qachon bo'lgani" ham
  ko'rinadi.
- Qayta qurish bo'roni bo'lmasligi uchun 2 daqiqalik qo'riqchi
  saqlandi (ko'p so'rov bir vaqtda kelganda baza qayta-qayta
  o'qilmaydi).

Tekshirildi: belgi 2251 daqiqa oldin + indeks 5 daqiqa oldin qurilgan →
ogohlantirish CHIQMAYDI. Belgi 3 soat oldin + indeks 10 soat oldin →
ogohlantirish CHIQADI. Ya'ni haqiqiy nosozlik baribir aytiladi.

## 2. "Ucell: login HTTP 404" — HAQIQIY nosozlik, operator tomonida
Ucell dilerlik API manzili (`cw-corn00.ucell.uz/...`) endi mavjud emas —
tekshirdim, hozir butun host xato qaytaryapti. Bu login/parol muammosi
EMAS va bizning kodda xato ham emas: operator manzilni o'zgartirgan.

Uchta ish qilindi:

**a) Manzil endi adminkadan kiritiladi.** Ilgari manzil kodda qotib
turgan edi — o'zgarsa, saytni qayta joylash kerak bo'lardi. Endi
*Adminka → Operatorlar → Ucell* da ikki yangi maydon bor: "Token
(login) manzili" va "Qidiruv manzili". Ucell yangi manzilni bersa, shu
yerga qo'yib saqlasangiz — kuzatuv o'sha zahoti ishlaydi. Bo'sh
qoldirilsa standart manzil ishlatiladi. Xavfsizlik uchun faqat `https`
va faqat `ucell.uz` domeni qabul qilinadi (noto'g'ri manzil kiritilsa
so'rov begona serverga ketmaydi).

**b) Xabar matni aniqlashtirildi.** 404/410 holatida endi "Ucell
dilerlik API manzili ishlamayapti — manzil o'zgargan ko'rinadi,
adminkadan yangisini kiriting (login/parolda muammo yo'q)" deb
yoziladi. Ilgari quruq "HTTP 404" deyilardi va bu login/parolga shubha
tug'dirardi.

**c) TINIM (backoff) qo'shildi — 12 459 xatoning asl sababi.**
Operator o'lgan bo'lsa ham, funksiya HAR DAQIQADA qayta-qayta so'rov
yuborib turardi. Bu uch narsani buzardi: bekorga so'rov ketardi, xato
soni ma'nosiz kattalashardi, va bitta o'lik operator butun
yurgizishning vaqtini yeb, ISHLAYDIGAN operatorlarni kechiktirardi.

Endi: ketma-ket 10 martadan ko'p xato bersa, operator **15 daqiqa
tinim** oladi — unga so'rov yuborilmaydi va kuzatuvlariga xato ham
yozilmaydi (holat allaqachon ma'lum). Tinim tugagach bir marta sinab
ko'riladi; javob bersa hammasi odatdagicha davom etadi va
"✅ Kuzatuv tiklandi" xabari keladi. Ishlaydigan operatorlarga bu
umuman ta'sir qilmaydi.

O'lchandi: 2 soat davomida o'lik operatorga **120 ta so'rov o'rniga 17
ta** ketadi. Ya'ni 12 459 ta xato yig'ilishi uchun kunlar emas, oylar
kerak bo'ladi — va Telegram xabarida endi "tinimga chiqarildi" deb ham
yoziladi.

## SIZDAN KERAK (bu ikki ogohlantirish uchun)
1. **Ucell'dan yangi dilerlik API manzilini so'rang** (token/login va
   qidiruv manzili). Olgach — *Adminka → Operatorlar → Ucell* ga qo'yib
   saqlang, tamom. Qayta joylash kerak emas.
2. Indeks ogohlantirishi — hech narsa qilish kerak emas, bu versiya
   joylanishi bilan o'zi yo'qoladi.

---

# V120 — "Mobiuz: javob bermadi" (124 marta) — SABABI VA TUZATISHI

## Sabab — bizning so'rovimiz juda og'ir edi
Kuzatuv Mobiuz'ga "hammasini ber" (wildcard) so'rovini yuborardi — ya'ni
BUTUN raqamlar ro'yxatini. Bunday so'rov sekin. Ustiga-ustak har bir
qidiruv uchun **ikki** so'rov ketardi: avval butun `/uz/app` HTML
sahifasi (cookie va CSRF token olish uchun), keyin qidiruvning o'zi.
Ikkisining yig'indisi kuzatuvga berilgan muddatdan oshib ketganda
so'rov uzilardi — natijada ketma-ket 124 marta
"The operation was aborted due to timeout".

Shuni ham aytaman: bu xabar ESKI (hali joylanmagan) versiyadan keldi.
Oldingi tuzatishdagi "tinim" (backoff) joylanganda bu son 124 ga
yetmasdan to'xtaydi.

## Nima qilindi

**1. Mobiuz sessiyasi 4 daqiqa saqlanadi.** Endi odatda FAQAT BITTA
so'rov ketadi (sahifa qayta-qayta yuklanmaydi). Sessiya eskirsa — kesh
tozalanib bir marta qaytadan urinib ko'riladi. O'lchandi: ketma-ket 4
ta qidiruvda sahifa so'rovi **4 tadan 1 taga** tushdi.

**2. Mobiuz og'ir "hammasini ber" so'rovidan olib tashlandi.** Endi u
Ucell va Beeline kabi ANIQ NAQSH bo'yicha so'rov yuboradi — yengil va
tez. Bir xil naqshli kuzatuvlar bitta so'rovga birlashtiriladi, ya'ni
so'rov soni ham ko'paymaydi.

**3. Muddat 8 → 11 sekund.** Sessiya yangilanishi kerak bo'lgan safar
ikki so'rov ketadi va 8 sekund unga yetmasdi. Butun yurgizish chegarasi
(25 sekund) buzilmaydi.

**4. Xato xabarlari endi odam tilida.** Ilgari Telegram'ga Node'ning
o'z xabari tushardi — "The operation was aborted due to timeout" —
bundan nima qilish kerakligi ko'rinmaydi. Endi:
- "operator belgilangan vaqtda javob bermadi (sekinlashgan yoki
  ishlamayapti). Bu bizning tomondagi xato emas."
- "operator serveriga ulanib bo'lmadi (manzil javob bermayapti)."

Yana bir mayda narsa tuzatildi: xabar operator nomini ikki marta
yozardi ("Mobiuz: Mobiuz qidiruv: HTTP 400") — endi bir marta.

## Sizdan kerak
Hech narsa. Bu versiya joylanishi bilan Mobiuz kuzatuvi yengil so'rovga
o'tadi. Agar shundan keyin ham "javob bermadi" chiqsa — demak Mobiuz
serverining o'zi ishlamayapti, va xabar buni endi aniq aytadi.

---

# V120 — "Humans tez ishlayaptimi?" — endi TAXMIN emas, SON

Rostini aytsam: shu yerdan turib Humans'ning hozirgi tezligini
o'lchay olmayman — operator API'siga sizning serveringiz murojaat
qiladi, men emas. Shuning uchun savolga bir martalik taxmin bilan
javob berish o'rniga, uni DOIMIY ko'rinadigan qildim.

## Kodda nima ko'rindi (buni tekshira olaman)
Humans kuzatuvda eng arzon yo'lda ishlaydi: sessiya 4 daqiqa
saqlanadi va BARCHA Humans kuzatuvlari uchun bitta "hammasini ber"
so'rovi ketadi — ya'ni har bir kuzatuv uchun alohida so'rov yo'q.
Bu to'g'ri tuzilma.

Lekin bitta HAQIQIY kamchilik topildi va tuzatildi: xato bo'lganda
Humans sessiyani yangilab QAYTA urinardi — **muddat tugashida ham**.
Ya'ni operator sekinlashgan paytda 6,5 s + sessiya + yana 6,5 s
ketardi va kuzatuvga berilgan 10 sekundni oshib ketardi — natijada
aslida ISHLAYOTGAN operator ham "javob bermadi" deb belgilanardi.
Mobiuz'da aynan shu xato bor edi, Humans'da ham bor ekan. Endi
muddat tugashida qayta urinilmaydi.

## Endi tezlik O'LCHANADI va panelda ko'rinadi
Har bir so'rovning davomiyligi yozib boriladi: oxirgi so'rov va
silliqlangan o'rtacha (80% eski + 20% yangi — bitta tasodifiy sekin
javob o'rtachani buzmaydi). Keshdan olingan javob hisobga olinmaydi,
aks holda ko'rsatkich asossiz yaxshi chiqardi.

*Adminka → Kuzatuv* bo'limining tepasida har bir operator uchun
kartochka paydo bo'ladi:
- **yashil** — 3 sekundgacha (1,5 s gacha "tez", keyin "yaxshi");
- **sariq** — 3–7 sekund ("sekinroq");
- **qizil** — 7 sekunddan yuqori yoki xato bor;
- **kulrang** — "tinimda" (ketma-ket ko'p xato bergani uchun vaqtincha
  so'rovdan chiqarilgan, qancha vaqtdan keyin qayta sinalishi yoziladi).

Brauzerda tekshirildi: beshta operator uchun to'g'ri rang, to'g'ri
matn, JS xatosiz.

Ya'ni bu versiya joylangach, "Humans tez ishlayaptimi?" degan savolga
panelning o'zi aniq son bilan javob beradi — va qaysi operator
sekinlashayotgani ham darhol ko'rinadi.

---

# V120 — FON NAQSHI ALMASHTIRILDI (yulduzcha → "signal to'lqinlari")

## Ikki muammo bor edi
**1. Naqsh kartochkalar USTIDAN ko'rinardi.** Sababi: naqsh `body`
foniga qo'yilgan edi, kartochkalarning bir qismi esa YARIM SHAFFOF
(mijoz saytida `--nc-bg` to'q mavzuda atigi 14% shaffofmaslik;
adminkada holat ranglari — "bog'lanildi", "yakunlandi", "muhim",
"muddati o'tgan", kuzatuv qatorlari va h.k.). Shaffof yuza ostidan fon
o'tib ketardi. Bu dizayn xatosi, siz to'g'ri sezgansiz.

**2. "Yulduzcha + xoch" naqshi juda ko'p saytda uchraydi** — ya'ni
o'ziga xoslik bermasdi, shablon taassurotini berardi.

## Nima qilindi

**Yangi naqsh — "signal to'lqinlari".** Ekranning o'ng yuqori
burchagidan tarqaladigan juda ingichka (1 piksel) halqalar; pastki chap
burchakdan esa ikkinchi, siyrakroq to'plam. Nega aynan shunday:

- **TAKRORLANMAYDI.** Plitka emas — ekranga bir marta chiziladi. Shu
  sabab ko'zga tashlanadigan plitka chokkasi yo'q, va "tayyor shablon"
  tuyg'usi ham yo'q. Aynan takrorlanish naqshni "hamma joyda bir xil"
  qilib ko'rsatadi.
- **Mazmuni bor.** Tarqalayotgan to'lqin — aloqa va signal belgisi,
  ya'ni aynan bizning ishimiz. Yulduzcha esa hech narsani anglatmasdi.
- **Arzon.** `position:fixed` qatlam faqat ekran o'lchamida va
  animatsiyasiz chiziladi.

**Kartochkalar endi qattiq (shaffof bo'lmagan).** Mijoz saytida
`--nc-base` o'zgaruvchisi qo'shildi, adminkada esa 15 ta holat rangi
"tint + qattiq asos" ko'rinishiga o'tkazildi
(`linear-gradient(tint,tint), var(--panel)`). Kartochkalarning
KO'RINISHI o'zgarmadi — asos aynan fon rangiga teng — lekin fon endi
ularning ichidan o'tmaydi.

## Tekshirildi
- Mijoz sayti — yorug' va to'q mavzuda surat olindi: naqsh faqat bo'sh
  joyda, kartochkalar toza.
- Adminka — buyurtma kartochkalari (3 xil holat), vazifa qatorlari
  (muhim / muddati o'tgan), kuzatuv qatori, operator bloki va tezlik
  kartochkalari: hammasining foni endi qattiq (o'lchandi:
  `rgb(14,20,31)` to'qda, `rgb(255,255,255)` yorug'da — ya'ni
  shaffoflik qolmadi).
- Aylantirish tezligi: **60 FPS** (dasturiy chizish rejimida, 60 ta
  kartochka bilan) — ya'ni yangi fon sekinlashtirmaydi.

---

# V120 — YUKLANISH HOLATI (skeletlar) VA INSTAGRAM HAVOLASI

## 1. Skeletlar — endi HAMMA joyda
Ilgari faqat raqam kartochkalari va stories lentasida skelet bor edi.
Qolgan joylar yuklanmaguncha BO'SH turardi va internet sekin yoki
umuman yo'q bo'lsa sayt "buzilgandek" ko'rinardi.

Endi stories bo'limi kabi — har bir joy o'z shaklidagi yaltirovchi
skelet bilan to'ladi:

- **tepadagi karusel** — haqiqiy kartochka shaklida (ichida sarlavha va
  narx o'rinlari ham bor), yonma-yon, haqiqiy karusel kabi;
- **stories lentasi** — avvalgidek (shu yerdan namuna olindi);
- **"Tavsiya etiladi"** raqam kartochkalari;
- **"Mijozlar fikri"** — bo'lim endi YASHIRILMAYDI, video kartochkalar
  skeleti turadi (ilgari bu joy umuman yo'q edi, yuklangach to'satdan
  paydo bo'lib sahifa sakrardi);
- **katalog** ro'yxati va **sarlavha ostidagi yozuv** — "Yuklanmoqda…"
  so'zi o'rniga skelet chizig'i (siz so'raganingizdek — "hattoki
  yozuvlarigacha");
- **sevimlilar** — katalog kelmaguncha skelet. Bu ayni paytda XATONI
  ham tuzatadi: ilgari katalog yuklanmagan bo'lsa "Sevimlilar bo'sh"
  deb ko'rsatilardi, ya'ni mijoz saqlagan raqamlari YO'QOLGAN deb
  o'ylardi.

**Internet bo'lmasa** bu holat shunchaki QOLAVERADI — xato ekrani
chiqmaydi, tepada "Internet yo'q" tasmasi turadi, aloqa tiklanishi
bilan skelet haqiqiy mazmun bilan almashadi. Skelet o'lchamlari
haqiqiy elementnikiga teng, shuning uchun yuklangach sahifa
SAKRAMAYDI.

**Tezlik:** yaltirash faqat `transform` bilan — sahifa qayta
chizilmaydi. Zaif qurilmada va telefonda "harakatni kamaytirish"
yoqilgan bo'lsa yaltirash butunlay o'chadi.

**Tekshirildi:** brauzerda internet butunlay to'silgan holatda ikkala
mavzuda ham surat olindi — 2 ta karusel skeleti, 5 ta story halqasi,
9 ta kartochka skeleti, 4 ta video skeleti, sarlavha ostida skelet
chizig'i; JavaScript xatosi yo'q.

## 2. Instagram havolasi almashtirildi
Yangi manzil: **instagram.com/vip.raqam.uz** (@vip.raqam.uz).
O'zgargan joylar:
- saytdagi "Instagram kanal" plitkasi (havola va @nik);
- Telegram **mijoz boti** (`customer-bot-webhook.js`);
- **kanal posti**dagi Instagram havolasi (`order-status-webhook.js`).

Eski `vipnumbers_uz` hech qayerda qolmadi (tekshirildi).

Eslatma: saytdagi Instagram havolasi ATAYLAB kodda qat'iy yozilgan —
adminkadagi qiymat qanday bo'lishidan qat'i nazar, mijoz boshqa
sahifaga olib ketilmaydi. Shuning uchun uni adminkadan o'zgartirish
kerak emas.
