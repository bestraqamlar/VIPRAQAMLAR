# V148 — MIJOZLAR FIKRI VA TELEFON UCHUN ADMIN PANEL

## 1. MIJOZLAR FIKRI — MEN KIRITGAN XATO TUZATILDI

### Nima bo'lgan edi

V145 da tezlik uchun videolarga `preload="none"` qo'ygandim. U
tarmoq so'rovlarini kamaytirdi, **lekin birinchi kadr ham
yuklanmay qoldi** — natijada kartochkalar qop-qora bo'sh quti
bo'lib ko'rindi, ustida xunuk brauzer tugmalari bilan. Siz
"umuman ko'rinmayapti" deganingiz aynan shu edi.

Kechirasiz — bu mening xatom.

### Endi qanday ishlaydi (tez ham, ko'rinadi ham)

1. Video **darhol yuklanmaydi** — sahifa ochilishida bitta ham
   ortiqcha so'rov ketmaydi (o'lchandi: **0 ta so'rov**).
2. Kartochka **ekranga yaqinlashganda** birinchi kadr yuklanadi
   (`IntersectionObserver`, 300px oldin). Ya'ni mijoz ko'rayotgan
   kartochkagina yuklanadi.
3. Bazada muqova rasmi bo'lsa (`posterUrl`/`thumbUrl`), u darhol
   qo'yiladi — rasm videodan ancha yengil.
4. Brauzerning xunuk tugmalari olib tashlandi. O'rniga toza
   **ijro belgisi**; bosilganda video o'ynaydi va shundagina
   tugmalar chiqadi. Bir vaqtda faqat bitta video o'ynaydi.
5. Format **vertikal 9:16** — telefonda olingan videolar aynan
   shunday, shuning uchun kesilmaydi.

### Yana bir xato tuzatildi

`videoUrl` bo'sh yozuvlar endi **tashlab ketiladi**. Ilgari ular
`<video src="#t=0.1">` bo'lib qolardi — bu manzil sifatida
**sahifaning o'zini** bildiradi, ya'ni brauzer har bir bunday
kartochka uchun butun sahifani (220 KB) "video" deb qaytadan
yuklardi.

---

## 2. ADMIN PANEL — TELEFON KO'RINISHI

Mijoz saytining **aynan o'sha dizayn tizimi** olindi: tungi ko'k
fon, shishasimon kartochkalar, bitta soch tolasidek chegara, ko'k
firma rangi.

### O'lchov bilan topilgan va tuzatilgan kamchiliklar

| muammo | sabab | yechim |
|---|---|---|
| Taqvim tugmasi katta ko'k tugmaga aylangan | `.settings-form button` qoidasi uni yutib yuborgan | `:not(.uzsana-btn)` qo'shildi |
| Tepa qator ekrandan chiqib ketardi | soat va versiya 264px joy egallardi | telefonda yashirildi (390px ga sig'di) |
| Menyu kartochkalari bo'lim ustida qolardi | `display:flex` shartsiz berilgan edi | faqat `.on` bo'lganda |
| Keraksiz kataklar har bo'limda | `#overviewRow` faol bo'limga ko'chiriladi | faqat Boshqaruv panelida |
| Shartnoma kartochkasida yozuvlar ustma-ust | nomli grid maydonlari buzilgan | tartib qayta berildi |
| Qidiruv yozuvi kesilardi | juda uzun matn | qisqartirildi |

Kompyuterdagi ko'rinish **o'zgarmadi** — bu fayl faqat 899px dan
tor ekranda ishlaydi.

---

## TEKSHIRUVLAR

Hammasi **mijozga ketadigan qisqartirilgan nusxada** o'tkazildi:

mijozlar fikri (4/4 kartochka, 0 ta ortiqcha so'rov) ·
buyurtma oqimi 10/10 · kredit formasi 15/15 · sana maydoni ·
FPS 60 · JS xato 0
