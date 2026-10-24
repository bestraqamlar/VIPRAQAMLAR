# VIP RAQAMLAR — V110…V114

## Haqiqiy sabab topildi
Xato matni: `auth/firebase-app-check-token-is-invalid`.

Firebase konsolida **App Check "Enforced"** (majburiy) qilib qo'yilgan:
Authentication, Cloud Firestore va Storage endi har bir so'rovda
haqiqiy App Check tokenini talab qiladi. Token olinmasa — parol
to'g'ri bo'lsa ham kirish RAD etiladi.

App Check o'sha tokenni `www.google.com/recaptcha` dan oladi. Sizning
kompyuteringizda u olinmayapti. Telefonda esa olinadi — shuning uchun
u yerda ishlayverardi.

**Shu sabab oldingi V99 yondashuvim noto'g'ri edi** (App Check'ni
o'chirib qo'yish). Majburiy holatda o'chirish kirishni butunlay
yopadi. V100 da u olib tashlandi.

## Bu versiyada nima bor
1. App Check **har doim** yoqiladi (o'chirilmaydi).
2. Xato chiqqanda panel **aniq sababini** aytadi — uchta ehtimolni
   alohida tekshiradi: reCAPTCHA to'silganmi, kompyuter soati
   noto'g'rimi, yoki sahifa boshqa domendan ochilganmi.
3. Bu xato endi "noto'g'ri parol urinishi" deb hisoblanmaydi — ilgari
   3 marta urinib hisob 5 daqiqaga qulflanib qolardi.
4. `tekshiruv.html` ga ikkita yangi tekshiruv qo'shildi (reCAPTCHA va
   App Check manzili).
5. Bitta kompyuterni tezda ochish uchun: panelni
   `?appcheck-debug=1` bilan oching, konsolda chiqqan tokenni Firebase
   konsolida **App Check → Apps → Manage debug tokens** ga qo'shing.
   Token ro'yxatga qo'shilmaguncha hech narsa ochilmaydi, shuning uchun
   bu himoyani zaiflashtirmaydi. Ish tugagach tokenni o'chiring.

## DIQQAT: Cloud Firestore ni "Enforced" dan qaytaring
Skrinshotda Firestore ham **Enforced**, "Unverified requests 3%".
Mijoz sayti raqamlar, stories, sozlamalar va **buyurtma yaratish**
uchun Firestore'ga brauzerdan to'g'ridan-to'g'ri murojaat qiladi.
Ya'ni reklama bloklagichi yoki maxfiylik kengaytmasi bor HAR QANDAY
mijoz buyurtma bera olmaydi — xuddi siz kira olmaganingizdek.
O'sha 3% — bloklanган haqiqiy odamlar.

Mijoz brauzerini siz boshqara olmaysiz, shuning uchun:

* **Cloud Firestore → Monitor** (Unenforce) qiling. U yerdagi himoyani
  App Check emas, `firestore.rules` beradi.
* **Storage → Enforced** qolaversin (u yerga faqat admin yozadi).
* **Authentication** — xohlasangiz Enforced qolsin, endi panel xatoni
  tushunarli aytadi; lekin bir necha kun **Monitor** qilib turib,
  "Unverified requests" 0% ga tushganini ko'rgach qaytarish xavfsizroq.

## Hali qilinmagan, lekin shart
1. `firestore.rules` ni joylang (Firebase'da 447 qatorli eski nusxa,
   bu arxivda 837 qator).
2. `storage.rules` ni joylang.


---

## V101 — yangi kirish ekrani
Panelga kirish oynasi butunlay qayta chizildi:

* oltin monogramma va uning atrofida aylanuvchi yupqa halqa;
* fonda sekin suzuvchi aurora va juda xira to'r — karta "tirik" tuyiladi;
* karta va uning ichidagi elementlar birin-ketin chiqadi (stagger);
* **suzuvchi yorliqlar** — yozishni boshlaganda "Login"/"Parol" yuqoriga
  chiqib kichrayadi;
* **parolni ko'rsatish tugmasi** (ko'zcha);
* **Caps Lock ogohlantirishi** — "parol noto'g'ri" ning eng ko'p
  uchraydigan, lekin eng ko'rinmas sababi;
* tugmada **yuklanish halqasi** ("Ulanmoqda…" paytida);
* xato endi alohida chiroyli panelda, chap chetida qizil chiziq bilan;
* **Enter** bilan ishlash: loginda bosilsa parolga o'tadi, parolda
  bosilsa kiradi; sahifa ochilganda kursor o'zi login maydonida;
* yozishni boshlasa eski xato xabari o'zi yo'qoladi;
* yorug' va qorong'i mavzuning ikkalasi ham alohida sozlandi.

Tezligi o'lchandi: brauzerda 2 soniyada **121 kadr (60 FPS), 32 ms dan
uzun bitta ham kadr yo'q**. Animatsiyalar faqat `transform`/`opacity`
orqali (videokarta chizadi), `filter:blur()` ishlatilmadi — shu sabab
zaif kompyuterda ham silliq ishlaydi. `prefers-reduced-motion`
yoqilgan bo'lsa harakat butunlay o'chadi.

Yana bir tuzatish: kirish ekranining **zaxira uslubi** (panel.css
yuklanmay qolsa ishlaydigan) ilgari asosiy uslubdan KEYIN turardi va
uni bosib ketardi — shu sabab tugma ko'k chiqib qolgan edi. Endi u
panel.css'dan oldin turadi va sinf selektorlaridan foydalanadi.


---

# V102 — HAQIQIY ILDIZ SABAB (telefonda ham kirmay qolgani)

## 1. CSP reCAPTCHA'ni to'sib turgan edi
`netlify.toml` dagi xavfsizlik sarlavhasi (CSP) ro'yxatida
**www.google.com YO'Q edi**. App Check (bot himoyasi) esa reCAPTCHA
skriptini aynan shu manzildan yuklaydi va `<iframe>` ochadi.

Brauzerda o'lchab tasdiqladim — eski sarlavha bilan uchtasi ham
to'siladi:

```
script-src-elem -> https://www.google.com/recaptcha/api.js
connect-src     -> https://www.google.com/recaptcha/api.js
frame-src       -> https://www.google.com
```

Yangi sarlavha bilan: **hech narsa to'silmaydi**.

Ya'ni App Check hech bir qurilmada haqiqiy token ololmasdi. Firebase'da
u "Monitor" holatida turganida bu sezilmasdi. **"Enforced" qilingan
kundan boshlab** esa kirish hamma joyda — kompyuterda ham, telefonda
ham — to'xtadi. Muammo antivirusda ham, kengaytmada ham emas, saytning
o'z sarlavhasida edi.

## 2. Zaxira yo'l App Check tokenini yo'qotardi
V99 da qo'shgan zaxira yo'l (`auth-proxy.js`) Google'ga faqat
Content-Type va Referer'ni uzatardi — `X-Firebase-AppCheck` sarlavhasi
**yo'qolardi**. App Check majburiy bo'lgani uchun tokensiz so'rov rad
etilardi. Endi bot himoyasi sarlavhalari o'zgarishsiz uzatiladi.

## 3. Zaxira yo'l "qotib qolishi"
Ilgari sahifa ochilishida Google manzili "ochiqmi" deb tekshirilardi va
tekshiruv muvaffaqiyatsiz bo'lsa zaxira yo'l darhol yoqilib, belgi
localStorage'da **abadiy** qolardi. Bitta yolg'on signal qurilmani
butunlay zaxira yo'lga o'tkazib qo'yardi. Endi:

* zaxira yo'l faqat **haqiqiy** tarmoq xatosidan keyin yoqiladi;
* zaxira yo'lda ham xato bo'lsa, belgi **o'zi o'chadi** (keyingi
  urinish to'g'ridan-to'g'ri ketadi);
* qurilma baribir qotib qolsa: panelni `?zaxira=0` bilan oching —
  belgi tozalanadi.

---

# HOZIROQ QILING (kod yuklashdan oldin, 1 daqiqa)
Firebase Console → App Check → Apps:

* **Authentication → Unenforce** (Monitor holatiga qaytaring)
* **Cloud Firestore → Unenforce**

Shundan keyin kirish **darhol** tiklanadi — kutish shart emas.
Keyin shu arxivni yuklang va Netlify qayta joylagach (1-2 daqiqa),
App Check'ni qaytadan "Enforced" qilsangiz bo'ladi. Avval bir necha
kun Monitor holatida turib, "Unverified requests" 0% ga tushganini
ko'ring — shundagina Enforce xavfsiz.

Diqqat: `netlify.toml` HAM yangilandi, uni ham yuklang — CSP tuzatishi
aynan o'sha faylda.


---

# V103 — kirish ekrani: sabab aytilmaydi, dizayn yangilandi

## Xato sababi endi ekranda ko'rsatilmaydi
Ekranda har doim bitta umumiy matn turadi:

> Kirib bo'lmadi. Login va parolni tekshirib, qayta urining.

Nega shunday:

* **Xavfsizlik.** "Bunday login yo'q" va "parol noto'g'ri" ni ajratib
  ko'rsatish hujumchiga qaysi loginlar MAVJUDLIGINI aytib beradi.
  Katta xizmatlarning hammasi shu sabab bitta umumiy matn ko'rsatadi.
* **Soddalik.** Mijozga `auth/firebase-app-check-token-is-invalid`
  kabi texnik matnning keragi yo'q.

Aniq sabab yo'qolmaydi: u **brauzer konsoliga** batafsil yoziladi
(F12 -> Console), va `/tekshiruv.html` sahifasi hammasini qatorma-qator
ko'rsatadi. Ya'ni kerak bo'lsa topasiz, lekin ekranda turmaydi.

Qulf xabari ham qisqardi: endi shunchaki `Qayta urinish: 4:58`.

## Caps Lock ogohlantirishi olib tashlandi
So'rovingiz bo'yicha butunlay o'chirildi (HTML, CSS va mantiq).

## Dizayn yanada zamonaviylashdi
* sarlavha endi oltin gradient bilan, ostida **harflari ajratilgan
  katta harfli** kichik yozuv (BOSHQARUV PANELI);
* maydon fokus olganda pastdan **nozik oltin chiziq** o'sib chiqadi —
  qalin ramkadan ko'ra tinchroq signal;
* karta ustida kursor ortidan yuradigan **yumshoq yorug'lik** (shisha
  tuyg'usi). Qiymat kadrga bir marta yangilanadi, shu sabab arzon;
* kartada juda xira **donador tekstura** — statik SVG, hech qanday
  hisoblash yo'q, qimmat bosma qog'oz tuyg'usini beradi.

Tezlik yana o'lchandi: **2 soniyada 121 kadr (60 FPS), 32 ms dan uzun
bitta ham kadr yo'q.** Ko'zcha, Enter bilan o'tish, suzuvchi yorliqlar
va xatoning yozishda yo'qolishi — hammasi haqiqiy brauzerda sinaldi.


---

# V104 — qora fon va haqiqiy logo

* Kirish ekrani **qora fonda**. Logoning o'z foni ham qora, shuning
  uchun logo karta bilan bir butun bo'lib ko'rinadi.
* "VR" monogrammasi olib tashlandi — o'rniga **haqiqiy logo**
  (`assets/logo-vip.png`). Logo shaffof fonli qilib tayyorlandi, shu
  sabab karta ustida to'rtburchak dog' qoldirmaydi.
* Ramka sifatida to'liq chiziq emas, **to'rtta burchak** ishlatilgan —
  zamonaviy, "texnologik" ko'rinish beradi va logoni qisib qo'ymaydi.
  Burchaklar sahifa ochilganda birin-ketin joyiga chiqadi.
* Karta ramkasi: tepada oltin, pastda qizil — logoning o'z ranglari.
* Fon auroralari ham qizil-oltin-oq qilib o'zgartirildi.
* Yorug' mavzu uchun alohida kirish ko'rinishi saqlanmadi: kirish
  ekrani endi har doim qora (panelning qolgan qismiga ta'sir qilmaydi).

**YANGI FAYL:** `assets/logo-vip.png` — uni ham yuklashni unutmang,
aks holda logo o'rnida bo'sh joy qoladi.

Yana bir tuzatish: kirish ekranining zaxira uslubi `.lm-b` burchaklarini
`display:none` bilan yashirib turgan edi — endi to'g'ri ko'rinadi.

Tezlik yana o'lchandi: **60 FPS, 32 ms dan uzun bitta ham kadr yo'q.**


---

# V105 — "Kanal posti: Token yaroqsiz (app/no-app)"

Bu xato **tokenga umuman aloqasi yo'q** edi. `app/no-app` — Firebase
Admin SDK'ning "ilova ishga tushirilmagan" degan xatosi.

Sabab: `admin-post-rasm.js` (kanal posti rasmini chizadigan funksiya)
`requireAdmin` ni chaqirardi, lekin Admin SDK'ni ishga tushirmasdi.
Loyihadagi 66 ta funksiyaning har biri buni O'ZI qilardi — yangi
funksiya yozilganda unutish juda oson, va aynan shu yerda unutilgan
edi. Natijada `admin.auth()` "app/no-app" tashlardi, tekshiruv esa uni
"token yaroqsiz" deb tarjima qilardi va siz bekorga parolni/hisobni
tekshirardingiz.

Tuzatish markaziy: Admin SDK endi `lib/adminAuth.js` ning O'ZIDA ishga
tushiriladi (`admin.apps.length` qalqoni bilan — ikki marta ishga
tushmaydi). Ya'ni `requireAdmin` ni chaqirgan HAR QANDAY funksiya,
shu jumladan kelajakda yoziladiganlari ham, avtomatik to'g'ri ishlaydi.

Qo'shimcha: muhit o'zgaruvchilari (FIREBASE_PROJECT_ID / CLIENT_EMAIL /
PRIVATE_KEY) yo'q yoki noto'g'ri bo'lsa, endi funksiya 500 bilan
qulamaydi — aniq xabar qaytaradi: "Server Firebase'ga ulanmagan —
FIREBASE_* muhit o'zgaruvchilarini tekshiring".

Sinovdan o'tkazildi: SDK yuklanganda `admin.apps.length` 0 dan 1 ga
o'tdi, xato matnida esa `app/no-app` umuman yo'q.

**O'zgargan fayl:** `netlify/functions/lib/adminAuth.js`


---

# V106 — "bo'sh kartochka, ma'lumot yo'q"

Loyihadagi kodni shu yerda haqiqiy rasm chizuvchi kutubxona bilan ishga
tushirib ko'rdim: sizning ma'lumotlaringiz bilan rasm **to'liq va
to'g'ri** chiqdi (raqam, PREMIUM yorlig'i, narx, eski narx, oylik
to'lov, aloqa raqami). Ya'ni kodning o'zida xato yo'q — muammo
serverdagi SHRIFT faylida.

## Nega aynan "bo'sh kartochka"
Shriftlar `netlify/functions/lib/ogShrift.js` ichida base64 ko'rinishida
turadi (128 KB). Agar bu fayl to'liq yuklanmagan bo'lsa,
`Buffer.from(...)` **xato bermaydi** — shunchaki yaroqsiz baytlar
qaytaradi. Keyin chizuvchi kutubxona shriftni topa olmaydi va
**bironta ham yozuv chizmaydi**: ramka, chiziq, logotip bor, matn esa
yo'q. Tashqaridan bu aynan "bo'sh kartochka" bo'lib ko'rinadi, sababini
esa topib bo'lmaydi.

## Endi nima o'zgardi
1. **Har bir shrift tekshiriladi.** TTF/OTF fayli ma'lum "imzo" bilan
   boshlanadi; imzo to'g'ri kelmasa shrift yaroqsiz deb belgilanadi.
2. **Zaxira yo'l:** yaroqsiz bo'lsa, chizuvchi tizim shriftlariga
   o'tadi — yozuv ko'rinishi biroz boshqacha bo'ladi, lekin **chiqadi**.
   Sinab ko'rildi: shriftni ataylab buzganimda ham rasm to'liq chiqdi.
3. **Aniq xabar:** panelda "Shriftlar yaroqsiz (pj600:YAROQSIZ/16b,
   pj800:ok/25488b, ...) — lib/ogShrift.js faylini qayta yuklang"
   deb yoziladi. Ya'ni qaysi shrift buzilganini aniq ko'rasiz.
4. Bu tekshiruv `og-raqam.js` (ulashish kartochkasi) uchun ham ishlaydi —
   ikkala chizuvchi endi bitta umumiy sozlamadan foydalanadi.

## Siz nima qilasiz
`netlify/functions/lib/ogShrift.js` ni **qayta yuklang** (128 KB —
GitHub'da yuklagandan keyin hajmini tekshiring). Shu bilan birga:

* `netlify/functions/admin-post-rasm.js`
* `netlify/functions/og-raqam.js`
* `netlify/functions/lib/adminAuth.js`
* `assets/panel.js`
* `panel-boshqaruv.html`

Keyin "Rasmni tayyorlash" ni bosing: rasm chiqadi. Agar shrift hali ham
yaroqsiz bo'lsa, panel buni ochiq aytadi.


---

# V107 — Kanal posti endi JONLI va serversiz

Siz aytganingizdek: har safar "yaratish" shart emas, bitta shablon
bo'lsin, matn yoki rang almashsa — rasm o'zi yangilansin.

## Nima o'zgardi
Rasm endi **serverda emas, brauzerda** (`<canvas>`) chiziladi:

* **Jonli** — raqamni yozayotganingizda, rangni almashtirganingizda
  pastdagi namuna **shu zahoti** yangilanadi. "Rasmni tayyorlash"
  tugmasi umuman olib tashlandi, faqat "Rasmni yuklab olish" qoldi.
* **Shrift muammosi butunlay yo'qoldi** — shriftlar panelning o'zidan
  olinadi (ular allaqachon yuklangan). Serverdagi base64 shrift fayli
  endi umuman ishlatilmaydi, ya'ni "bo'sh kartochka" takrorlanmaydi.
* **Tez va bepul** — server chaqirilmaydi, kutish yo'q, funksiya
  chaqiruvi sarflanmaydi.
* O'lcham va sifat o'sha-o'sha: **1620 x 1021 px**, plastik karta
  nisbati, PNG.

Dizayn ham o'sha: oltin folga raqam, guilloche naqsh, oltin ramka,
diagonal yaltirash, PREMIUM yorlig'i, narx/eski narx/oylik to'lov,
aloqa raqami. Qo'shimcha: tepa-chapda endi **haqiqiy logo** turadi.

## Sinovdan o'tkazildi
Haqiqiy brauzerda: canvas 1620x1021 chiqdi, fon rangini "to'q
kulrang"dan "to'q yashil"ga o'zgartirganda surat darhol yangilandi
(piksellar o'zgargani tekshirildi), yozuvlarning hammasi joyida.

## Eslatma
`netlify/functions/admin-post-rasm.js` endi ishlatilmaydi (o'chirmadim,
zarar qilmaydi). V106 dagi shrift tekshiruvi esa `og-raqam.js`
(ulashish kartochkasi) uchun kerak bo'lib qoladi — u hali ham serverda
chiziladi. Agar ulashish kartochkasi ham bo'sh chiqsa, o'sha
`lib/ogShrift.js` ni qayta yuklash kerak.


---

# V108 — Raqam shrifti: 23 ta tanlov, jonli

"Raqam shrifti" ro'yxati qo'shildi. Tanlaysiz — rasm **shu zahoti**
o'sha shriftda qayta chiziladi.

Guruhlarga ajratilgan:

* **Saytning o'z shriftlari (tezkor)** — Space Grotesk (hozirgi),
  Plus Jakarta Sans. Bular panel bilan birga keladi, internetsiz ham
  darhol ishlaydi.
* **Zamonaviy — geometrik:** Outfit, Poppins, Montserrat, Manrope,
  Lexend, Sora, Syne, Unbounded.
* **Qalin — e'lon uslubi:** Archivo Black, Anton, Bebas Neue,
  Russo One, Big Shoulders.
* **Tor — uzun raqamlar uchun:** Oswald, Teko, Barlow Condensed,
  Saira Condensed.
* **Texnologik:** Orbitron, Chakra Petch, Michroma, JetBrains Mono.

## Qanday ishlaydi
Hamma shrift oldindan yuklanmaydi — bu panelni sekinlashtirardi.
Shrift **faqat tanlanganda** Google Fonts'dan olinadi (bir marta, keyin
brauzer keshida qoladi). Shrift yuklanmasa — internet sekin yoki Google
to'silgan bo'lsa — panel buni ochiq aytadi va rasmni saytning o'z
shriftida chizadi, ya'ni hech qachon bo'sh qolmaydi.

`netlify.toml` dagi CSP buni ataylab ruxsat etadi (`fonts.googleapis.com`
va `fonts.gstatic.com`), boshqa manba qo'shib bo'lmaydi.

Shrift tanlovi raqamga, narxga, sayt nomiga va aloqa raqamiga qo'llanadi;
kichik yorliqlar (NARXI, "Buyurtma uchun") bir xil qoladi — shunda karta
uslubi buzilmaydi.

## Sinovdan o'tkazildi
Haqiqiy brauzerda: 23 ta variant ro'yxatda; Orbitron tanlanganda rasm
o'zgardi; Plus Jakarta Sans'ga qaytganda yana o'zgardi; Google to'silgan
holatda esa "yuklanmadi — saytning o'z shrifti ishlatildi" xabari chiqdi
va rasm baribir chizildi.


---

# V109 — kirish maydonidagi yozuv to'liq o'qiladi

Siz aytgan "oq ustiga oq" muammosi tuzatildi. Sabab: panelning mavzu
(theme) qoidalari yoki brauzerning avtomatik to'ldirishi (autofill)
maydon fonini oqartirib yuborganda, matn ham oq bo'lgani uchun u
butunlay ko'rinmay qolardi.

Endi rang **qotirib qo'yildi** (`!important` bilan): maydon har doim
to'q (#0E0E12), matn har doim oq, harflar biroz qalinroq (600).
Kirish oynasi qaysi mavzuda ochilsa ham natija bir xil.

Qo'shimcha:

* **Autofill** endi maydonni oqartira olmaydi (ichki soya bilan to'q
  holida ushlab turiladi).
* Kursor rangi oltin, yorliqlar (`Login`, `Parol`) yorqinroq kulrang.
* Zaxira uslub (panel.css yuklanmay qolgan holat) ham xuddi shunday
  qilib moslandi.

O'lchab tekshirildi: matn va fon orasidagi kontrast **19.3 : 1**
(qulaylik standarti 4.5 : 1 talab qiladi) — qorong'i va yorug'
mavzularning ikkalasida ham.


---

# V110 — Kuzatuv: raqam chiqishi bilan darhol botga

## Asosiy sabab topildi: INTERVAL
Kuzatuv yaratilganda interval tanlanardi (standart — **5 daqiqa**) va
tekshiruv aynan o'sha intervalda bo'lardi. Cron esa har daqiqada
ishlab, "muddati kelmagan" kuzatuvlarni shunchaki o'tkazib yuborardi.
Shu sabab raqam sotuvga chiqqach xabar 5 daqiqagacha (uzunroq interval
tanlangan bo'lsa — soatlab) kechikardi. "Qotib qolgandek" tuyulgani
shundan.

**Endi:** Beeline, Humans, Mobiuz va Perfektum kuzatuvlari **har
daqiqada** tekshiriladi — interval ularga umuman ta'sir qilmaydi.

Nega bu xavfsiz: bu operatorlarga har bir kuzatuv uchun emas, **har bir
operator uchun bitta umumiy so'rov** ketadi (hamma katakcha bo'sh —
"hozir mavjud bo'lgan hamma raqamni ber"). Ya'ni 1 ta kuzatuvni
tekshirish ham, 40 tasini tekshirish ham operator uchun bir xil — bitta
so'rov. Demak kutib turishning hech qanday ma'nosi yo'q edi.

Interval faqat **Ucell** uchun kuch saqlaydi: uning API'si "hammasini
ber"ni qo'llamaydi, shu sabab u yerda har bir kuzatuv o'z so'rovini
talab qiladi.

## Ikkinchi sabab: yurishlar bir-birining ustiga chiqardi
Bitta yurish uchun chegara **12 daqiqa** edi, cron esa har daqiqada
ishga tushadi. Ya'ni oldingisi tugamasdan yangisi boshlanib, operator
API'siga bir vaqtda o'nlab bir xil so'rov ketardi va navbat
to'planardi. Endi chegara **50 soniya** — har bir yurish keyingisidan
oldin tugaydi.

## Uchinchi: Humans har safar yangi sessiya ochardi
Har bir qidiruvdan oldin yangi anonim sessiya olinardi — qo'shimcha
tarmoq so'rovi va kutish. Endi sessiya **4 daqiqa** saqlanadi. Agar
saqlangan sessiya eskirgan bo'lsa, kesh tozalanib **bir marta qaytadan**
urinib ko'riladi — ya'ni "kesh tufayli qidirmay qolish" holati o'zini
o'zi tuzatadi.

## Yangi: "⚡ Hozir tekshir" tugmasi
Kuzatuv bo'limida, ro'yxat ustida. Bosilganda:

1. barcha faol kuzatuvlarning navbati "hoziroq" qilinadi;
2. fon funksiyasi **darhol** ishga tushadi — keyingi daqiqa kutilmaydi.

Ya'ni operator bazasi endigina yangilangan bo'lsa yoki tekshiruv
to'xtaganga o'xshasa, bir tugma bilan majburan tekshirtirasiz.

## Sinovdan o'tkazildi
Soxta baza va soxta operator bilan uchta holat:

* Humans kuzatuvi — intervali 2 soat, navbati 2 soatdan keyin bo'lsa
  ham **tekshirildi** (to'g'ri);
* Ucell kuzatuvi — navbati kelmagani uchun **tekshirilmadi** (to'g'ri);
* topilgan raqam darhol botga ketdi; ikkinchi yurishda **takroriy xabar
  yuborilmadi**; uchinchi yurishda yangi raqam chiqqanda esa **faqat
  yangisi** uchun xabar ketdi.

## O'zgargan fayllar
* `netlify/functions/number-watch-check-background.js`
* `netlify/functions/admin-number-watch.js`
* `netlify/functions/lib/operators.js`
* `assets/panel.js`, `assets/panel.css`, `panel-boshqaruv.html`


---

# V111 — kuzatuvdagi yashirin teshiklar

Butun kuzatuv yo'lini qayta ko'rib chiqdim. To'rtta jiddiy kamchilik
topildi — har biri "ishlayotgandek tuyulib, aslida ishlamaydigan"
turdagi, ya'ni eng xavflisi.

## 1. Beeline kuzatuvi amalda ishlamasdi
Beeline API'si bir so'rovda **eng ko'pi 100 ta** natija qaytaradi
(undan oshsa 400 xato). Biz esa unga "hammasini ber" (bo'sh naqsh)
so'rovini yuborardik — u omborda mavjud **minglab** raqamdan faqat
**birinchi 100 tasini** qaytarardi. Kuzatilayotgan raqam ro'yxatning
101-o'rnidan keyin bo'lsa, u **hech qachon** ko'rinmasdi.

**Tuzatildi:** Beeline endi Ucell kabi — har bir kuzatuv **o'z naqshi**
bilan so'raladi. Naqsh natijani allaqachon toraytiradi, shu sabab 100
chegarasi muammo qilmaydi. Sinovda tekshirildi: so'rovga endi
kuzatuvning haqiqiy naqshi ketyapti, bo'sh naqsh emas.

## 2. Natija 2000 tada kesilardi
Humans/Mobiuz/Perfektum bizning limitimizni qabul qilmaydi — ular
o'zlari qancha bersa, shuncha keladi; bizdagi "limit" esa olingan
natijadan **qanchasini saqlab qolishni** belgilardi va u **2000** edi.
Operatorda 2000 tadan ko'p raqam bo'lsa, 2001-o'rindagi kuzatilayotgan
raqam shunchaki tashlab yuborilardi. Endi amalda kesilmaydi.

## 3. Operator xatosi butunlay yashirilardi
Operator javob bermasa, funksiya bo'sh ro'yxat qaytarardi va kuzatuv
"tekshirildi, hech narsa topilmadi" deb belgilanardi. Ya'ni Humans bir
hafta ishlamasa ham, panelda "so'nggi tekshiruv: hozir" deb turaverardi
va hech kim buzilganini bilmasdi. **Aynan shu "qotib qolgandek"
tuyg'usini berardi.**

**Endi:**

* tekshirib bo'lmagan kuzatuvda `so'nggi tekshiruv` vaqti **tegilmaydi**
  (yolg'on ko'rsatmaydi);
* panelda qizil qatorda sabab yoziladi: "⚠ Operator javob bermadi: ...";
* ketma-ket **3 marta** xato bo'lsa, botga ogohlantirish ketadi:
  "⚠️ Kuzatuv ishlamayapti — Humans, ketma-ket 3 marta xato";
* operator tiklanganda "✅ Kuzatuv tiklandi" xabari keladi.
  Ogohlantirish 30 daqiqada bir martadan ko'p takrorlanmaydi.

## 4. Telegram xabari yo'qolsa, raqam butunlay o'tkazib yuborilardi
Xabar yuborish natijasi **umuman tekshirilmasdi**. Telegram javob
bermagan bir lahzada xabar yo'qolardi, raqam esa "xabar qilingan" deb
belgilanib, **12 soat** davomida qayta yuborilmasdi.

**Endi:** yuborish muvaffaqiyatsiz bo'lsa (429 yoki 5xx) bir marta
qayta uriniladi; baribir ketmasa — raqam "xabar qilingan" deb
belgilanmaydi va **keyingi daqiqadagi yurishda qayta yuboriladi**.
Sinovda tekshirildi: Telegram "503" qaytarganda raqam belgilanmadi,
tiklangach xabar yetib bordi.

## Qo'shimcha
* Bitta yurish ichida bir xil operator + bir xil naqsh uchun so'rov
  **bir marta** yuboriladi (operatorda keraksiz yuk va 429 xavfi
  kamayadi).
* Muvaffaqiyatli tekshiruvda xato hisoblagichi nolga tushadi.

**Eslatma:** Beeline kuzatuvlari ko'p bo'lsa (o'nlab), operator
"so'rovlar chegarasi (429)" qaytarishi mumkin. Endi bu **yashirilmaydi**
— panelda ham, botda ham ko'rasiz. O'shanda Beeline kuzatuvlari sonini
kamaytirish yoki ularni kamroq intervalda tekshirish kerak bo'ladi.


---

# V112 — bildirishnomalar va Vazifalar bo'limi

## 1. Vazifalar bo'limi bo'sh ko'rinardi — IKKITA sabab bor edi

**a) Eng muhim vazifalar KO'RINMASDI.** Muddati yaqin ("urgent")
vazifalar qatoriga `taskUrgentGlow` animatsiyasi berilgan edi va u
qatorni ko'rinadigan qiladigan `fadeSlideUp` animatsiyasini
**butunlay almashtirib** qo'yardi. `fadeSlideUp` esa `opacity: 0` dan
1 ga chiqaradi — u o'chgach, qator **`opacity: 0` holida qolib
ketardi**. Ya'ni ro'yxatda eng shoshilinch vazifalar o'rnida bo'sh joy
turardi. Tuzatildi: endi ikkala animatsiya birga ishlaydi, hamda
animatsiya umuman ishlamagan holat uchun ham qalqon qo'yildi.

**b) Ro'yxat yashirin edi.** Bo'lim ochilganda faqat raqamli kartalar
chiqardi, vazifalar ro'yxati esa "Vazifalarni ko'rish" kartochkasi
bosilmaguncha ko'rinmasdi — pastda katta oq maydon qolardi. Endi
ro'yxat bo'lim ochilishi bilan **darhol** ko'rinadi, tezkor amal
kartochkalari esa joyida qoladi.

## 2. Bildirishnomalar — butunlay qayta ishlandi
Ilgari: pastda kulrang to'rtburchak, bitta qator matn, 2.6 soniya.
Muhim xabar (yangi buyurtma) bilan oddiy "saqlandi" xabari bir xil
ko'rinardi.

Endi:

* **yuqori o'ng burchakdan** chiqadi (mobil ekranda yuqoridan), yengil
  "spring" animatsiya bilan;
* **beshta tur**, har biri o'z rangi va belgisi bilan: Bajarildi (yashil),
  Xato (qizil), Diqqat (sariq), Ma'lumot (ko'k) va **Muhim** (oltin,
  atrofida yorug'lik bilan — yangi buyurtma kabi xabarlar uchun);
* **sarlavha + matn**, hamda **amal tugmasi** ("Ko'rish" kabi) —
  bosilsa kerakli bo'limga olib boradi;
* pastida **vaqt chizig'i** — qachon o'chishi ko'rinib turadi;
* **ustiga sichqoncha kelsa hisob to'xtaydi**, olib ketilsa davom etadi;
* yonga surib yoki × bilan yopiladi; bir vaqtda 4 tagacha turadi.

## 3. OVOZ
Har bir tur uchun qisqa, yoqimli signal: ikki nota (muhim xabar uchun
uchta, ko'tarilib boradigan ohang), yumshoq kirish va so'nish bilan.

**Hech qanday audio fayl yuklanmaydi** — ovoz brauzerning o'zida
(WebAudio) hosil qilinadi. Ya'ni qo'shimcha fayl ham, internet ham
kerak emas, sayt ham og'irlashmaydi.

Yuqori panelga **karnay tugmasi** qo'shildi: bosib o'chirasiz/yoqasiz,
tanlov brauzerda eslanadi. Brauzerlar ovozni foydalanuvchi biror narsa
bosmaguncha ishlatishga ruxsat bermaydi — shu sabab birinchi bosishda
ovoz "uyg'otiladi".

## Sinovdan o'tkazildi (haqiqiy brauzerda)
* Vazifalar bo'limi: ro'yxat o'zi ochildi, **uchala** vazifa ham
  ko'rindi (ilgari muddati yaqini ko'rinmasdi) — `opacity` 0 dan 1 ga
  o'tgani o'lchab tekshirildi.
* To'rtala tur bildirishnoma bir vaqtda, yuqori o'ngda, to'g'ri rang va
  belgilari bilan chiqdi; "Muhim" turida amal tugmasi ham.
* Ovoz: "muhim" xabarida **3 ta nota** hosil bo'ldi; karnay tugmasi
  bosilgach yangi xabarda **bironta ham** nota hosil bo'lmadi; tanlov
  localStorage'ga saqlandi.


---

# V113 — muddati o'tgan vazifalar

Tahrirlash va o'chirish tugmalari **har doim bor edi** — lekin muddati
o'tgan vazifalarni KO'RIB bo'lmasdi: ular "muddati yaqin" turiga
tushib, V112 gacha `opacity: 0` holida, ya'ni ko'rinmas edi. Endi
ko'rinadi, ustiga aniq ajratib ko'rsatiladi.

## Qo'shildi
* **"Muddati o'tgan" alohida holat** — binafsha rang va "Muddati
  o'tgan" belgisi bilan. U "muddati yaqin"dan farq qiladi: porlamaydi
  (shoshilishning ma'nosi yo'q), lekin ko'zdan qochmaydi.
* **Filtr chiplari:** Hammasi / Faol / Muddati o'tgan / Bajarilgan —
  har birida soni ko'rsatilgan. Muddati o'tganlari bo'lsa, o'sha chip
  binafsha rangda ajralib turadi.
* **"🗑 Muddati o'tganlarni tozalash"** tugmasi — bir yo'la hammasini
  o'chiradi (tasdiqlash so'raladi). Yuzlab eski vazifa yig'ilib qolsa,
  bittalab o'chirish shart emas. Firestore partiyalari bilan ishlaydi,
  ya'ni 500 tadan ko'p bo'lsa ham uzilib qolmaydi.
* Vazifa ustiga bosilsa ochiladi va u yerda **Tahrirlash** (matn,
  muddat, "muhim" belgisi), **Bajarildi** va **O'chirish** tugmalari
  turadi — muddati o'tgan vazifalar uchun ham, bajarilganlari uchun ham.

## Sinovdan o'tkazildi
6 ta vazifa (2 tasi muddati o'tgan, 1 tasi bajarilgan) bilan:
chiplar to'g'ri sanadi (Hammasi 6 / Faol 3 / Muddati o'tgan 2 /
Bajarilgan 1); "Muddati o'tgan" filtri aynan o'sha ikkitasini qoldirdi;
muddati o'tgan vazifa ochilganda **Tahrirlash, Bajarildi va O'chirish**
tugmalari joyida ekani tekshirildi; hamma qator `opacity: 1` bilan
ko'rindi.

Yo'l-yo'lakay: filtr chiplari panel ichidagi umumiy "to'liq kenglikdagi
tugma" qoidasiga tushib, ko'k bloklar bo'lib cho'zilib ketgan edi —
chiplar shu qoidadan chiqarildi.


---

# V114 — admin foni

Namunadagi uslub olindi: to'q asos, burchaklarda yumshoq rangli
yorug'lik (chapda ko'k, o'ngda ko'k-yashil, pastda juda xira pushti) va
juda xira "yulduzcha" naqsh.

Siz aytganingizdek, fon **e'tiborni tortmaydi**: naqsh deyarli
sezilmaydi, yorug'lik faqat burchaklarda. Yorug' mavzuda asos ham
**biroz to'qlashtirildi** (#EBF0FA → #E2E8F4) — shunda oq kartochkalar
fondan ajralib, "suzib turgandek" ko'rinadi.

## Tezlik — uchta usul o'lchab solishtirildi
Bir xil sahifada, ketma-ket, sahifani aylantirib turib:

| Usul | FPS |
|---|---|
| Fonsiz (taqqoslash uchun) | ~53 |
| Yorug'lik `position:fixed` qatlamda | ~45 |
| Yorug'lik `body` fonida (suriluvchi) | ~25 |

Sabab: `body` foni **butun hujjat balandligida** chiziladi — uzun
sahifada bu juda katta maydon. `position:fixed` qatlam esa faqat ekran
o'lchamida bo'ladi va brauzer uni alohida qatlab saqlaydi.

Shu sabab yakuniy yechim: **yorug'lik — fixed qatlamda**, **naqsh —
oddiy takrorlanuvchi kichik plitka** (132px, takrorlash arzon).
Animatsiya, `mask` va `background-attachment:fixed` umuman
ishlatilmadi — dastlab shu uchtasi sinab ko'rilgan edi va aynan ular
aylantirishni 22 FPS gacha tushirgan edi.

(Eslatma: bu o'lchovlar videokartasiz, dasturiy chizish rejimida
olingan — haqiqiy kompyuterda raqamlar ancha yuqori, farq esa
kichikroq bo'ladi.)
