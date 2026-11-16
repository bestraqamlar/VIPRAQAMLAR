# V144 — "Sayt ishlamay qoldi / xotira to'ldi" — sabab topildi va tuzatildi

## QISQACHA

Bu Netlify yoki internet muammosi emas edi. **Kodda xato bor edi** va u
bir necha oy davomida jimgina Firestore bazasini to'ldirib kelgan. Baza
to'lgach, Firestore barcha amallarni rad eta boshlaydi — tashqaridan bu
"sayt umuman ishlamay qoldi" va "kredit yuklanmayapti" bo'lib ko'rinadi.

---

## SABAB — AYNAN NIMA BO'LGAN

Saytda "hozir saytda nechta odam bor" degan sanoq bor. Eski kod:

```js
const sid = 'sess_' + tasodifiy + '_' + Date.now();
const beat = () => db.collection('active_sessions').doc(sid).set({...});
beat();
setInterval(beat, 20000);
```

Shu uch qatorda **uchta alohida xato** bor edi:

**1. Har sahifa ochilishida YANGI, ABADIY hujjat.**
`sid` har safar yangidan yasalardi. Ya'ni bitta mijoz saytni 10 marta
ochsa — bazada 10 ta hujjat. Qayta yuklash, mini ilovani ochish,
orqaga qaytib yana kirish — hammasi yangi hujjat.

**2. Bu hujjatlarni hech kim o'chirmasdi.**
Butun loyiha bo'ylab `active_sessions` to'plami **faqat bitta joyda** —
admin panelidagi sanoqda — o'qilardi. O'chiradigan bitta ham qator
yo'q edi. Ya'ni to'plam faqat o'sib bordi.

**3. Fon oynada ham yozilardi.**
Mijoz saytni ochiq qoldirsa, telefon cho'ntakda yotganda ham soatiga
180 marta yozuv ketardi — bu kunlik yozuv kvotasini yeb qo'yardi.

### O'LCHOV — eski kod vs yangi kod

| sinov | eski kod | yangi kod |
|---|---|---|
| 5 marta qayta yuklash → bazadagi hujjatlar | **5 ta** | **1 ta** |
| fon oynada 10 ta signal → yozildi | **10 ta** | **0 ta** |
| ochiq oynada 10 ta signal → yozildi | 10 ta | 10 ta |

Ya'ni eski kodda har bir tashrif bazada abadiy iz qoldirardi.

---

## QO'SHIMCHA TOPILGAN MUAMMOLAR

Bir muammoni qidirib, yana uchtasi topildi — ularning hammasi ham
kvotani yeyishga hissa qo'shgan:

**a) Admin paneli har 15 soniyada baza o'qirdi.**
"Hozir saytda" sanog'i har 15 soniyada ikkita so'rov yuborardi. Saytda
20 kishi bo'lsa — soatiga ~5000 o'qish, va bu **faqat bitta ochiq admin
oynasidan**. Admin panelni ish kuni davomida ochiq qoldirsa, bu yolg'iz
o'zi kunlik bepul kvotani tugatardi.
→ Endi **60 soniyada**, va faqat Boshqaruv paneli bo'limi ochiq
bo'lganda hamda oyna fonda bo'lmaganda.

**b) Vazifalar tekshiruvi har 30 soniyada.**
→ Endi **2 daqiqada**, fon oynada butunlay to'xtaydi.

**c) Zaxira yo'lda CHEKSIZ o'qish.**
Netlify funksiyasi ishlamagan kunlari sayt butun `numbers` to'plamini
o'qirdi — 2000 ta raqam bo'lsa, **bitta tashrif 2000 o'qishga** teng
edi.
→ Endi chegara qo'yildi: eng yomon holatda ham 1500 dan oshmaydi.

---

## NIMA QILINDI

* `assets/app.js` — sessiya raqami endi `sessionStorage` da saqlanadi
  (bitta oynaga bitta hujjat), fon oynada yozuv to'xtaydi, oraliq
  20 → 60 soniya, hujjatga `expireAt` maydoni qo'shildi;
* `assets/app.js` — zaxira yo'ldagi cheksiz o'qishga chegara;
* `assets/panel.js` — 15 s → 60 s va 30 s → 2 daqiqa, fon oynada
  butunlay to'xtaydi;
* `netlify/functions/admin-tozalash.js` — **yangi**: to'planib qolgan
  eski yozuvlarni bo'lak-bo'lak o'chiradigan funksiya (faqat bosh
  admin uchun, faqat `active_sessions` ga tegadi).

---

## SIZ NIMA QILISHINGIZ KERAK — TARTIB MUHIM

**1) Avval bazani bo'shating** (fayl yuklash buni qilmaydi):
Firebase konsoli → Firestore Database → `active_sessions` → ⋮ →
**Delete collection**. Sayt shundan keyin tiklanadi.

Bu xavfsiz: u yerda faqat vaqtinchalik sanoq turadi. Mijozlar,
buyurtmalar, shartnomalar va raqamlarga umuman tegmaydi.

**2) Keyin V144 fayllarini yuklang** — qaytib to'lmasligi uchun.

**3) Netlify → Trigger deploy → Clear cache and deploy site.**

---

## KEYINGI SAFAR OLDINI OLISH UCHUN

Firebase konsolida **Usage** bo'limini oyda bir marta ko'rib turing:
Firestore saqlash hajmi va kunlik o'qish/yozuv grafigi. Grafik doimiy
o'sib borayotgan bo'lsa — demak yana biror joyda shunga o'xshash
to'planish bor.
