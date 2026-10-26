# VIP RAQAMLAR — V105

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
