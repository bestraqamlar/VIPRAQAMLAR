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

---

# V120 — TELEGRAM MINI ILOVA VAQTINCHA OLIB TASHLANDI

Siz aytganingizdek, hozircha olib tashlandi — keyin davom ettiramiz.

## Nima olib tashlandi
- `telegram-ilova.html` (232 KB) — mini ilovaning o'zi;
- `netlify/functions/check-my-orders-telegram.js` — faqat shu ilova
  ishlatadigan funksiya (boshqa hech kim chaqirmaydi, tekshirildi).

Ikkala fayl **o'chirilmadi**: zipning ichida, sayt papkasining YONIDA
turgan `_olib-tashlangan-v120/` papkasiga olib qo'yildi — qaytarish
kerak bo'lganda shundan olinadi (ish yo'qolmasin).
Papka ATAYLAB sayt papkasidan TASHQARIDA: aks holda u ham Netlify'ga
joylanib, ilova eski manzilda yashirincha ochiq qolib ketardi.

## Hech narsa buzilmaydi
Butun loyiha tekshirildi: saytdan ham, botdan ham, adminkadan ham mini
ilovaga **birorta havola yo'q** — kirish nuqtasi faqat BotFather'dagi
menyu tugmasi edi. Shu sabab olib tashlash boshqa hech narsaga ta'sir
qilmaydi:

- **Telegram bot to'liq ishlaydi.** "Buyurtmalarim" bo'limi botning
  O'ZIDA ishlaydi (telefon raqami bo'yicha qidiradi), mini ilovaga
  bog'liq emas.
- **Kanal posti** ham tegilmadi — undagi tugma allaqachon botning
  shaxsiy chatiga olib o'tadi, mini ilovaga emas.
- `menu-redirect.html` **qoldirildi** — bu mini ilova emas, Telegram
  menyusidan kanalga o'tkazadigan kichik yordamchi sahifa; u ishlaydi
  va o'zgartirilmadi.
- Barcha 69 ta Netlify funksiyasi sintaksis tekshiruvidan o'tdi.

## Eski havola oq ekran bermaydi
`_redirects` ga ikki qator qo'shildi: `/telegram-ilova.html` va
`/telegram-ilova` endi **saytning o'ziga** yo'naltiriladi. Ya'ni
BotFather'dagi menyu tugmasi hali eski manzilni ko'rsatayotgan bo'lsa
ham, mijoz xato emas — saytni ko'radi.

Shunga qaramay **BotFather'dan menyu tugmasini olib tashlashni
tavsiya qilaman** (`/mybots` → bot → *Bot Settings* → *Menu Button*):
shunda mijozga "ilova" degan tugma umuman ko'rinmaydi.

## Qaytarish kerak bo'lganda
1. `_olib-tashlangan-v120/` papkasidagi ikki faylni o'z joyiga qaytaring
   (`telegram-ilova.html` — ildizga, `check-my-orders-telegram.js` —
   `netlify/functions/` ichiga);
2. `_redirects` dagi o'sha ikki qatorni o'chiring;
3. BotFather'da menyu tugmasini qayta qo'ying.

`netlify.toml` dagi Telegram ruxsati (`frame-ancestors`) ataylab
qoldirildi — u faqat Telegram domenlariga berilgan, boshqa hech kim
saytni `<iframe>` ichiga sola olmaydi, va ilova qaytarilganda hech narsa
sozlash kerak bo'lmaydi.

---

# V120 — SHARTNOMADA RASMIY MUHR VA QR KOD

## 1. Rasmiy muhr ("Tomonlarning imzosi" bo'limida)
Sotuvchi imzosi CHIZIG'I USTIGA endi haqiqiy kompaniya shtampi kabi
**dumaloq ko'k muhr** bosiladi — chiziq muhrning yuqori qismidan
o'tadi, xuddi qo'lda bosilgandek:

- tashqi halqa bo'ylab — **VIP RAQAMLAR**
- ichki halqa bo'ylab — **RASMIY SHARTNOMA ASOSIDA**
- markazda — yulduzcha va **VIPRAQAMLAR.UZ**
- ikki halqa, yon tomonlarda ajratuvchi nuqtalar, ko'k siyoh
  (`#1B3FA0`), yengil shaffoflik va 11 daraja qiyshiqlik — qo'lda
  bosilgandek ko'rinadi.

Muhr **butunlay vektor** (chiziqlar va shakllar bilan chiziladi): hech
qanday rasm fayli yuklanmaydi, bosmada istalgan o'lchamda aniq chiqadi
va PDF hajmi deyarli oshmaydi (11 KB).

## 2. QR kod — skanerlasa SHU shartnomaning PDF'i ochiladi
Xaridor ustuni ostida — faqat QR kodning o'zi, ortiqcha yozuvsiz
(mijoz so'rovi: izoh kerak emas, QR kod o'zi tushunarli).

**Qanday ishlaydi.** QR ichida qisqa havola bor:
`https://vipraqamlar.uz/s/KR0142/<imzo>.pdf`. Skanerlanganda **sayt
emas, PDF'ning O'ZI ochiladi** — server `Content-Type: application/pdf`
va `Content-Disposition: inline` qaytaradi
(`netlify/functions/shartnoma-pdf.js`).

Havola ATAYLAB `.pdf` bilan tugaydi: telefon skaneri va brauzerlar
havolaning oxiriga qarab "bu fayl" deb tushunadi va darhol ochadi.
Himoya esa kengaytmaga bog'liq emas — server baribir imzoni tekshiradi.

MUHIM: bu ishlashi uchun yangi versiya **joylanishi kerak**. Hozir
`/s/...` manzili hali mavjud emas, shu sabab u saytning umumiy
qoidasi bo'yicha bosh sahifaga tushadi — siz ko'rgan narsa aynan shu.
Joylangandan keyin PDF to'g'ridan-to'g'ri ochiladi.
Yana bir eslatma: men yuborgan NAMUNA PDF'dagi QR sinov kaliti bilan
yasalgan, shu sabab u joylangandan keyin ham ishlamaydi — haqiqiy
shartnomalarda to'g'ri imzo bo'ladi.

**Nega telefon raqami so'ralmaydi.** Mavjud "Shartnomani yuklab olish"
yo'li POST + telefon raqami + App Check talab qiladi — QR skaneri
bunday so'rov yubora olmaydi. Shu sabab bu alohida, QR uchun yo'l.

**Xavfsizlik — havolani taxmin qilib bo'lmaydi.** Agar manzil shunchaki
`/s?i=KR0142` bo'lsa, raqamni birma-bir sinab (KR0001, KR0002 ...)
boshqa odamlarning shartnomasini ochib olish mumkin bo'lardi. Shuning
uchun havolada **imzo** (`k`) bor: u shartnoma raqamidan maxfiy kalit
bilan hisoblanadi (HMAC-SHA256, 96 bit) va faqat shu shartnomaga
yaraydi. Qo'shimcha: IP bo'yicha soatiga 60 ta urinish chegarasi —
imzolarni ketma-ket sinab ko'rish darhol to'xtatiladi. Shartnoma
bor-yo'qligi ham oshkor qilinmaydi (ikkala holatda bir xil javob).

Ya'ni PDF'ni faqat qog'oz nusxa qo'lida bo'lgan odam ocha oladi — u esa
allaqachon shartnomaning egasi.

**Sozlash kerak emas.** Maxfiy kalit `CONTRACT_QR_SECRET` muhit
o'zgaruvchisidan olinadi; qo'yilmagan bo'lsa serverdagi Firebase xizmat
kalitidan barqaror tarzda hosil qilinadi (u hech qachon serverdan
chiqmaydi). Ya'ni hozircha hech narsa qo'shish shart emas. Keyinchalik
kalitni alohida qo'ymoqchi bo'lsangiz — Netlify'ga
`CONTRACT_QR_SECRET` qo'shing (lekin shundan keyin ESKI qog'ozlardagi
QR kodlar ishlamay qoladi, chunki imzo o'zgaradi).

## 3. O'lchangan natijalar
- QR kod **30 mm** (84 pt), bitta katak ~0,8 mm. Haqiqiy o'qish sinovi
  (`pyzbar` dekoderi bilan): **64, 72, 90, 100 va 150 dpi** — hammasida
  o'qildi. Avvalgi 76 pt o'lchamda past sifatli suratda o'qilmasdi, shu
  sabab kattalashtirildi.
- Dekoder qaytargan matn to'g'ri havola ekani tasdiqlandi.
- Funksiya sinovi: to'g'ri imzo → PDF (200), soxta imzo → 404,
  imzosiz → 400, yo'q shartnoma → 404, POST → 405, 61-urinishdan
  boshlab → 429.
- Muhr yozuvlari yoyi 140 darajadan oshmaydi — birinchi urinishda
  tepadagi va pastdagi yozuv yon tomonlarda bir-biriga kirib ketgan
  edi, o'lchamlar shunga qarab tanlandi.

## 4. O'zgargan fayllar
- `netlify/functions/lib/contractPdf.js` — muhr, QR va imzo hisoblash
- `netlify/functions/shartnoma-pdf.js` — YANGI (QR havolasi shu yerga tushadi)
- `_redirects` — `/s` qisqa manzili
- `package.json` — `qrcode` kutubxonasi qo'shildi

Muhr va QR **har ikkala yo'lda** ham chiqadi: saytdagi "Shartnomani
yuklab olish" tugmasida ham, Telegram botga yuboriladigan PDF'da ham —
ikkalasi bitta quruvchidan foydalanadi.

---

# V120 — SHRIFT XATOSI TOPILDI VA TUZATILDI

## Sabab — nisbiy (relative) manzil
Shriftlar allaqachon o'z serverimizda edi, lekin manzil NISBIY yozilgan
edi: `assets/fonts/jakarta.woff2` (boshida `/` yo'q).

Sayt faqat `/` manzilida emas, CHUQUR manzillarda ham ochiladi —
masalan `/raqam/90-777-77-77` (SEO sahifasi; ulashilgan havola, QR kod
yoki qidiruv natijasi aynan shunday manzilga olib keladi). Bunday
sahifada brauzer nisbiy manzilni JORIY papkaga nisbatan hisoblaydi:

    /raqam/assets/fonts/jakarta.woff2

Bunday fayl yo'q. Saytning umumiy qoidasi esa topilmagan manzilga
`index.html` qaytaradi — ya'ni brauzer "shrift" deb HTML sahifani
oladi, uni o'qiy olmaydi va TIZIM shriftiga o'tadi. Mijoz raqamlarni
xunuk, monospace shriftda ko'radi. Siz ko'rgan narsa aynan shu.

**Isbot (brauzerda o'lchandi):**
- eski ko'rinish, `/raqam/...` sahifasi:
  `/raqam/assets/fonts/jakarta.woff2 -> 200 text/html` va
  `Plus Jakarta Sans=error, Space Grotesk=error` — ikkala shrift ham
  YUKLANMAGAN;
- yangi ko'rinish, xuddi shu sahifa: `200 font/woff2` va
  `Plus Jakarta Sans=loaded, Space Grotesk=loaded`.

## Nima tuzatildi
1. **Barcha manzillar endi ILDIZDAN** (`/assets/...`) — shriftlar,
   ikonkalar, logotip, operator belgilari, `manifest.json`. Sayt qaysi
   manzilda ochilishidan qat'i nazar hammasi topiladi.
   Tekshirildi: `/`, `/raqam/90-777-77-77`, `/toifa/oltin` va
   `/qandaydir/chuqur/manzil` — to'rttasida ham ikkala shrift yuklandi.
2. **`format('woff2-variations')` -> `format('woff2')`.** Birinchisi
   standartga kirmagan, eski yozuv; ba'zi brauzerlar (ayniqsa
   iPhone'dagi ilova ichidagi brauzerlar — skaner, Telegram, Instagram)
   uni tanimaydi va manbani butunlay o'tkazib yuboradi. `woff2` esa
   hamma joyda tushuniladi; o'zgaruvchan (variable) shrift shu nom
   bilan ham to'g'ri ishlaydi.
3. **Ikkala shrift ham oldindan yuklanadi** (`preload`). Ilgari faqat
   Jakarta yuklanardi — shu sabab RAQAMLAR shrifti (Space Grotesk)
   kechikib kelardi va bir lahza boshqa shriftda ko'rinardi.

## Internetsiz ham ishlaydi — tekshirildi
Ikkala shrift Service Worker'ning "shell" ro'yxatida. Brauzerda
o'lchandi: sayt bir marta ochilgandan keyin internet BUTUNLAY uzildi va
sahifa qayta yuklandi —

    Keshda: /index.html, /manifest.json, /assets/logo-circle.png,
            /assets/fonts/jakarta.woff2, /assets/fonts/grotesk.woff2
    Natija: Plus Jakarta Sans=loaded, Space Grotesk=loaded

Ya'ni shrift bir marta yuklanadi va keyin internetsiz ham o'sha shrift
ishlatiladi — siz so'raganingizdek.

Kesh nomi `vipraqamlar-v10` dan `v11` ga oshirildi: eski keshdagi
nusxalar almashishi uchun (aks holda ba'zi telefonlarda eski holat
qolib ketardi).

---

# V120 — "Zaxira nusxa OLINMADI" — ENDI NUSXA BARIBIR OLINADI

## Sabab
Rasmiy Firestore eksporti (`exportDocuments`) xizmat hisobida ALOHIDA
huquq talab qiladi — "Cloud Datastore Import Export Admin". U
berilmagan, shuning uchun Google "The caller does not have permission"
deydi.

Eng yomoni shunda edi: **hech qanday nusxa olinmasdi**. Ya'ni eng
kerakli paytda — baza buzilganda yoki kimdir xato bilan o'chirganda —
qaytaradigan hech narsa bo'lmasdi.

## Nima qilindi — ZAXIRA YO'L (rolsiz ishlaydi)
Rasmiy eksport ishlamasa, endi ZAXIRA YO'L ishga tushadi: muhim
to'plamlar Admin SDK bilan o'qilib, JSON fayl sifatida Storage'ga
yoziladi — `zaxira-json/<sana>/<toplam>.json`. Buning uchun **hech
qanday qo'shimcha rol kerak emas**: Admin SDK bazani o'qishga va
Storage'ga yozishga allaqachon haqli.

Saqlanadigan to'plamlar (eng muhimi oldinda, vaqt yetmay qolsa ham
shular saqlanadi): shartnomalar, buyurtmalar, zakazlar, mijozlar,
shaxsiy baza, raqam to'lovlari, dilerlar va ularning yozishmalari,
katalog raqamlari, narx kategoriyalari, operator sozlamalari, sayt
sozlamalari, promo-kodlar, adminlar, vazifalar, kuzatuvlar, stories,
video sharhlar, vakansiyalar va arizalar — jami 25 ta.

Bu rasmiy eksportning o'rnini BOSMAYDI (uni `gcloud firestore import`
bilan bitta buyruqda tiklash mumkin, JSON'ni esa skript bilan tiklash
kerak), lekin hech narsadan ko'ra ancha yaxshi.

## Telegram xabari endi aniq yo'riqnoma beradi
Xabarda sizning xizmat hisobingiz manzili va 5 qadamlik yo'riqnoma
chiqadi — nusxalab qo'yish kifoya:

    1. console.cloud.google.com -> loyiha: vip-raqamlar
    2. IAM & Admin -> IAM -> "Grant access"
    3. Principal: firebase-adminsdk-...@vip-raqamlar.iam.gserviceaccount.com
    4. Role: Cloud Datastore Import Export Admin
    5. Save

Shuni qilsangiz — ertangi zaxiradan boshlab yana rasmiy, to'liq eksport
ishlaydi va JSON yo'liga umuman ehtiyoj qolmaydi.

## Tekshirildi (soxta Firestore va Storage bilan)
- rasmiy eksport **403** qaytarganda: 25 ta to'plam JSON sifatida
  saqlandi (4200 ta raqam = 183 KB), sog'liq vaqti yangilandi va
  Telegram'ga yo'riqnomali xabar ketdi;
- rasmiy eksport **ishlaganda**: JSON yo'li umuman ishga tushmadi
  (ortiqcha ish qilinmaydi);
- **ikkalasi ham** ishlamaganda: aniq xato xabari va 500.

Yana bir tuzatish: eski nusxalarni tozalash endi `zaxira-json/`
papkasini ham qamrab oladi — ilgari faqat `zaxira/` tozalanardi, ya'ni
JSON nusxalar cheksiz to'planib, Storage joyini yeb borardi.

## Muhim: nusxalar OCHIQ EMAS
`storage.rules` da hamma qolgan yo'l uchun `allow read, write: if false`
turadi (V120 da qo'shilgan), ya'ni zaxira fayllarini saytdan o'qib
bo'lmaydi — ularga faqat server (Admin SDK) va siz Google Cloud
konsolidan kira olasiz.

---

# V120 — ORQA FON QAYTA ISHLANDI (kartochka birinchi o'rinda)

## 1. Chiziq endi kartochkada ham, o'rtada ham ko'rinmaydi
Ikki ish qilindi:

**a) Qolgan shaffof kartochka yopildi.** "Kun tavsiyasi" kartochkasi
(`.daycard`) hamon yarim shaffof edi — fon uning ichidan ko'rinib
turardi. Endi unga ham qattiq asos qo'yildi (`--day-base`), xuddi
raqam kartochkalaridagi kabi.

**b) Chiziqlar ekranning O'RTASIDA umuman chizilmaydi.** `mask` bilan
o'rta qism kesib tashlandi — chiziq faqat chetlarga yaqin joyda,
bilinar-bilinmas chiqadi. Siz aytganingizdek: yonlarida bo'lsa mayli,
lekin o'rtada — kartochkalar turgan joyda — hech narsa bo'lmasin.
Mask `position:fixed` va animatsiyasiz qatlamda, ya'ni bir marta
hisoblanadi — aylantirish tezligiga ta'siri yo'q (o'lchandi).

## 2. Fon endi "jonli" — sekin aylanadi
- **Bitta burchak ochroq** (o'ng yuqori). Yorug'lik manbai bitta
  bo'lgani uchun surat tinch ko'rinadi va ko'z kartochkaga tushadi.
- **Bir aylanish 140 soniya** (sekundiga ~2,6 daraja). Ko'z buni
  harakat sifatida ilg'amaydi, lekin sahifa "muzlab qolgandek" ham
  tuyilmaydi — aynan siz so'ragan "bilinmasdan, sekin" holat.
- Qatlam 1,18 barobar kattalashtirilgan — aylanganda chetlarida bo'sh
  burchak ochilib qolmaydi.
- Rang ozgina **ochroq va ko'kroq** qilindi (`#061020` -> `#07162B`).
  Kartochka baribir fondan ochiq bo'lib qoladi, chunki u shu rang
  ustiga yorug' parda qo'yadi.

## 3. Sekinlashmaydi — o'lchandi
Faqat `transform` o'zgaradi, ya'ni harakatni VIDEOKARTA bajaradi va
sahifa qayta chizilmaydi. 60 ta kartochka bilan aylantirib o'lchandi:

    Kuchli qurilma, aylanish yoqilgan ......... 60 FPS
    Zaif qurilma (low), aylanish 240 soniya ... 60 FPS

(O'lchov dasturiy chizish rejimida — haqiqiy telefonda bundan ham
yaxshi.)

Ilgari zaif qurilmada harakat BUTUNLAY o'chirilardi. Endi u yerda ham
qoladi, faqat ikki barobar sekinroq (240 soniya) — ya'ni fon hamma
joyda "tirik". Faqat foydalanuvchining O'ZI telefonda "harakatni
kamaytirish"ni yoqsa, harakat to'liq to'xtaydi (bu uning tanlovi).

## Savolingizga javob
"Orqa fon jonli bo'lsa, odam saytdan chiqib ketmaydimi?" — aksincha,
sekin va bilinar-bilinmas harakat sahifani "tirik" qiladi va odam
uzoqroq qoladi. MUHIMI — harakat e'tiborni TORTMASLIGI kerak: shuning
uchun 140 soniya (ko'z ilg'amaydigan tezlik), bitta yorug' burchak va
o'rtada chiziq yo'q. Ko'z birinchi navbatda kartochkaga tushadi.

---

# V120 — SHRIFT ENDI UMUMAN O'ZGARMAYDI (sekin internetda ham)

Oldingi tuzatishda shrift MANZILI to'g'rilandi. Lekin yana bitta
noqulaylik qolgan edi: sekin internetda matn avval TIZIM shriftida
chiqib, shrift kelgach ALMASHARDI — ya'ni mijoz bir lahza boshqa
shriftni ko'rardi. Siz aytgan "umuman o'zgarmasin" talabiga shu
mos kelmasdi.

## Nima o'zgardi

**1. `font-display: swap` -> `font-display: block`.**
- `swap` — matn DARHOL tizim shriftida chiqadi, shrift kelgach almashadi
  (ko'zga tashlanadigan sakrash).
- `block` — matn shrift kelguncha ko'rinmaydi (joyi band turadi, sahifa
  sakramaydi), kelgach BIRDANIGA to'g'ri shriftda chiqadi. Ya'ni mijoz
  HECH QACHON boshqa shriftni ko'rmaydi.

**2. Shriftlar endi `<head>` ning ENG BOSHIDA.** Ilgari ular Firebase
`preconnect`/`preload` qatorlaridan keyin turardi, ya'ni navbatda
orqaroqda edi. Endi brauzer boshqa hech narsani kutmasdan ularni
birinchi bo'lib yuklaydi.

## O'lchangan natija (brauzerda, sun'iy sekin internet bilan)

    Sekin 3G (700 kbit/s, 300 ms kechikish):
        matn paydo bo'ldi ...... 3999 ms
        shrift tayyor bo'ldi ... 3999 ms
        farq ................... 0 ms

    O'rtacha tezlik (2,5 Mbit/s):
        matn paydo bo'ldi ...... 1156 ms
        shrift tayyor bo'ldi ... 1156 ms
        farq ................... 0 ms

Ya'ni **noto'g'ri shrift ko'rinadigan oraliq UMUMAN YO'Q**. Sababi
oddiy: shrift fayllari juda kichik (22 va 27 KB) va eng birinchi
so'rov bo'lib ketadi — ular sahifaning o'zidan (475 KB) ancha oldin
keladi.

## Agar shrift umuman kelmasa
Sinab ko'rildi: shrift so'rovi BUTUNLAY to'sildi — matn 3 soniyadan
keyin baribir chiqdi (tizim shriftida). Ya'ni sahifa hech qachon
"bo'sh" bo'lib qolmaydi; bu faqat shrift mutlaqo yetib kelmagan
holatda bo'ladi.

## Ikkinchi kirishdan boshlab
Shriftlar Service Worker keshida — internet umuman bo'lmasa ham
darhol o'sha shriftda ochiladi (oldingi bo'limda o'lchab tekshirilgan).
