# V140 — Rasmiy ko'rinish: sodda va aniq

## Qanday tushundim

*"Soddaroq, lekin rasmiy katta kompaniyanikidek"* — katta
kompaniyalar (banklar, aloqa operatorlari) saytini chiroyli qiladigan
narsa **bezak emas, INTIZOM**: tekis va toza yuzalar, bitta soch
tolasidek chegara, bitta yumshoq soya, aniq ierarxiya va **bo'sh joy**.
Bezak esa faqat **bitta** joyda — ko'z birinchi tushadigan kartochkada.

## Nima o'zgardi

| Oldin | Endi |
|---|---|
| Har bir kartochkada **ikkita rangli nur** (ko'k va siyoh gradient) + gradient asos | **Tekis yuza** + 1px chegara + bitta yumshoq soya |
| Burchaklar 22px — "pufakchali" | 18px — hujjatdek qat'iy |
| "Batafsil" tugmasi to'ldirilgan ko'k | Chegarali, sokin |
| Asosiy tugma yaltiroq gradient | Tekis firma rangi |
| Bo'lim sarlavhalari zich | Harflari ajratilgan, oraliq kengroq |

**Bosh sahifadagi premium kartochka o'z holicha qoldi** — tilla
aksenti, boyroq yuzasi bilan. Qoida shunday: bitta showpiece, qolgani
sokin. Shunda ko'z aynan kerakli joyga tushadi.

## Bu AYNI PAYTDA tezlikni ham oshiradi

Ilgari **har bir** kartochkada beshta chizish qatlami bor edi:

```
radial-gradient (ko'k nur)
  + radial-gradient (siyoh nur)
  + gradient asos
  + tashqi soya
  + ichki chiziq
```

Katalogda 15-40 ta kartochka bo'ladi — ya'ni brauzer **yuzlab**
gradient qatlamini chizardi, aylantirilganda esa ularni qayta-qayta.

Endi: bitta tekis rang + 1px chegara + bitta soya. Ya'ni **ko'rinish
rasmiyroq, chizish esa ancha arzon** — bitta o'zgarish ikkala
muammoni ham hal qiladi.

### Qo'shimcha: sekin qurilmada o'tishlar qisqartirildi

Kartochkada `box-shadow` ham o'tish (transition) bilan edi: bosilganda
brauzer soyani **qayta chizishga** majbur bo'lardi, ro'yxatda esa
kartochkalar ko'p. Endi sekin qurilmada faqat `transform` o'tishi
qoladi — u videokartada bajariladi, ya'ni bepul. `filter`/`saturate`
ham butunlay o'chirildi (u butun kartochkani piksel-piksel qayta
hisoblaydi). Kuchli telefonlarda hammasi avvalgidek.

---

## ⚠️ MUHIM: tezlikni hali SEZMAYSIZ

V137 va V139 dagi barcha tezlik ishlari (kartochka ochilishi
392 → 78 ms, bosh sahifaga qaytish 175 → 26 ms va h.k.) **sizning
saytingizga hali chiqmagan** — chunki Netlify'da **build daqiqalari
tugagan** va yangi versiya yig'ilmayapti.

Ya'ni hozir ko'rib turganingiz — hali **eski** sayt. Shuning uchun u
"qotib" ishlayapti.

**Nima qilish kerak:**

1. Netlify'da build daqiqalari tiklanishini kuting (oy boshi) —
   aniq sanani Netlify → Billing bo'limi ko'rsatadi;
2. keyin **Deploys → Trigger deploy → "Clear cache and deploy site"**
   bosing (o'zi yangilanmaydi — buni alohida tekshirdim);
3. telefonda saytni majburan yangilang, Telegram'da botni yopib
   qaytadan oching.

Shundan keyingina bu versiyalardagi tezlik seziladi.

Tekshirish: saytni ochib `Ctrl+U` → `vip-versiya` → **140** bo'lishi
kerak.

---

## Tekshiruv

| Nima | Natija |
|---|---|
| Katalog, bosh sahifa ko'rinishi | ✅ suratga olib solishtirildi |
| Kabinet, kirish, to'lovlar jadvali | ✅ |
| Karusel surish (3 ta holat) | ✅ |
| Tebranish faqat kerakli joyda | ✅ |
| Til almashtirish | ✅ |
| Telegram integratsiyasi | ✅ |
| Chuqur manzil `/raqam/...` | ✅ 404 yo'q |
| Aylantirishda FPS | ✅ 61 |
| JS xatosi | ✅ 0 ta |
