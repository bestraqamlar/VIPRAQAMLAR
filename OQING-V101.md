# VIP RAQAMLAR — V101

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
