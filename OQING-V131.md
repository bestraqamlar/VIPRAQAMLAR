# V131 — Spidometr + bitta kirish yo'li

## 1. Kredit holati endi SPIDOMETR

Svetofor o'rniga — mashinaning tezlik o'lchagichi: **180 gradusli
yarim aylana**, uchta zona va **strelka** qayerda turganini ko'rsatadi.

```
      yashil ─╮   ╭─ qizil
              ╰─┬─╯
              sariq
```

* **chapda yashil** — kechikish yo'q;
* **o'rtada sariq** — 1 oy kechikkan;
* **o'ngda qizil** — 2 va undan ko'p oy kechikkan.

O'ngga siljigani sari yomon — xuddi tezlik oshgani sari qizilga
kirgani kabi. Faol zona yorqin, qolgan ikkitasi xira turadi.

**«OGOH» degan yozuv olib tashlandi.** O'rniga ostida mayda
`TO'LOV` yozuvi va kartochka ichida **bitta qator rasmiy izoh**:
«To'lov shkalasi: yashil — kechikish yo'q, qizil — to'lov ko'p
qoldirilgan.» To'liq tushuntirish (uch rangning ma'nosi) to'lovlar
jadvali oynasining tepasida chiqadi — spidometr bosilsa ochiladi.

Chizmaning hammasi SVG: 64×34 px, rasm yuklanmaydi, animatsiya yo'q.

---

## 2. Kirish — BITTA YO'L

Siz aytganingizdek, endi **faqat bitta yo'l**: Telegram boti.
«Raqamning oxirgi 4 ta raqami» degan zaxira yo'l **butunlay olib
tashlandi** — nafaqat saytdan, serverdan ham (u yerda ochiq qolishi
xavfsizlik teshigi edi).

### Mijoz nima qiladi

1. Telefon raqamini yozadi.
2. **«Kodni olish»** ni bosadi.
3. Telegram boti **o'zi ochiladi va «Start» o'zi bosiladi** — mijoz
   botda hech narsa yozmaydi.
4. Bot 4 xonali kodni `<code>` ichida yuboradi — **bosilsa o'zi
   nusxalanadi**.
5. Kodni saytdagi 4 ta katakka joylashtiradi (bitta
   joylashtirishda to'rttasiga tarqaladi) — kabinet ochiladi.

Forma endi shunday: telefon maydoni, 4 ta katak, **«Kodni olish»** va
**«Kabinetga kirish»**. Boshqa hech narsa yo'q.

### Botda ish qilayotgan bo'lsa

Mijoz botda buyurtma berayotgan bo'lsa ham kod keladi: o'sha bosqich
**saqlanadi** va kod yuborilgandan keyin **joyiga qaytariladi**
(«Davom etamiz — to'xtagan joyingizdan»). Ishi buzilmaydi.

---

## 3. Xavfsizlik — eng ko'p e'tibor berilgan joy

**Asosiy xavf:** kimdir **begona** raqamni saytga yozib, havolani
**o'z** Telegram'ida ochadi va kodni oladi — shunda u begona
kabinetga kirib qolardi.

**Yechim:** bot kodni yuborishdan oldin raqam **egasini** tekshiradi:

1. Agar `kabinet_chatids` da shu raqam **aynan shu Telegram hisobi**
   orqali tasdiqlangan bo'lsa — darhol kod.
2. Aks holda Telegram'ning o'z «📱 Raqamimni yuborish» tugmasi
   so'raladi va **ikkita shart** tekshiriladi:
   * `contact.user_id` xabar yozgan odamning ID'siga **teng** bo'lishi
     (birovning kontakt kartochkasi o'tmaydi — Telegram'da birovning
     kontaktini yuborish mumkin, shuning uchun bu shart majburiy);
   * yuborilgan raqam **saytda kiritilgan raqam bilan bir xil**
     bo'lishi.

Hujumchi begona raqamni yozsa, Telegram unga faqat **o'z** raqamini
beradi — mos kelmaydi, **kod yuborilmaydi** va urinish jurnalga
yoziladi. Qo'lda yozilgan raqam umuman qabul qilinmaydi.

Qolgan himoyalar:

| Nima | Chegara |
|---|---|
| Botga havola (nonce) | bir martalik, 10 daqiqa |
| Kod | bir martalik, 5 daqiqa, **3** xato urinish |
| Kodning o'zi bazada | **yo'q** — faqat SHA-256 xeshi |
| Telefon bo'yicha xato | soatiga **10 ta** (IP almashtirish yordam bermaydi) |
| Telefonga kod | kuniga **15 ta** |
| IP bo'yicha | soatiga 20 ta havola, 30 ta tekshiruv |
| Kod taqqoslash | vaqt bo'yicha teng (`timingSafeEqual`) |
| «Bir bosishda kirish» kaliti | bir martalik, 10 daqiqa |

Yangi to'plamlar (`kabinet_login_nonces`, `kabinet_login_keys`,
`kabinet_login_codes`, `kabinet_login_fails`) brauzerdan **umuman**
o'qilmaydi va eskirganlari kunlik zaxira bilan o'chiriladi.
`kabinet_chatids` esa o'chirilmaydi va zaxiraga kiradi — u doimiy
bog'lanish.

---

## 4. Kirish SAQLANIB QOLADI

Token endi **1 yil** amal qiladi (30 kun emas) va **ikki joyga**
yoziladi:

1. **localStorage** — asosiy joy;
2. **cookie** (1 yil) — zaxira.

Nega ikkita: ba'zi brauzerlar (xususan iOS Safari) saytlar
ma'lumotini tozalaganda localStorage'ni o'chiradi, cookie esa qoladi —
yoki aksincha. Biri yo'qolsa, ikkinchisidan **o'zi tiklanadi**.
Tekshirildi: localStorage butunlay bo'sh, faqat cookie turgan holatda
ham kabinet ochildi va localStorage qayta tiklandi.

### Boshqa brauzer (Chrome → Safari)

Buni ochiq aytaman: **brauzerlar bir-birining ma'lumotini ko'ra
olmaydi** — bu ularning xavfsizlik qoidasi va uni aylanib o'tib
bo'lmaydi (aks holda istalgan sayt sizning boshqa brauzeringizdagi
ma'lumotni o'qiy olardi). Shuning uchun yangi brauzerda bir marta
kirish kerak.

Lekin bu **eng qisqa qilib qo'yildi**: Telegram'dagi kod xabarida
**«⚡️ Bir bosishda kirish»** tugmasi bor — u yangi brauzerda saytni
ochadi va **kodni ham kiritmasdan** kabinetga kiritadi. Ya'ni boshqa
brauzerda: botni ochish → tugmani bosish → kirdingiz.

**Ma'lumotning o'zi** (buyurtmalar, shartnoma, to'lovlar) serverda
turadi — qaysi brauzerdan kirmasin, hammasi joyida.

---

## 5. Sozlash (bir marta)

Netlify → Site settings → Environment variables:

| O'zgaruvchi | Nima |
|---|---|
| `KABINET_TOKEN_SECRET` | uzun tasodifiy satr (kamida 32 belgi) |
| `CUSTOMER_BOT_USERNAME` | bot nomi (@siz) — `t.me/<bot>?start=k_...` havolasi shundan yig'iladi |
| `SITE_URL` | sayt manzili, masalan `https://vipraqamlar.uz` — «Bir bosishda kirish» tugmasi shundan yasaladi |

`CUSTOMER_BOT_TOKEN` allaqachon bor — tegmaysiz.

---

## 6. Tekshiruv

**Botda** (soxta Telegram, 17 ta holat):

| Holat | Natija |
|---|---|
| Deep link → kontakt so'raladi | ✅ |
| Nonce bir martalik | ✅ |
| **BEGONA raqam yuborilsa** | ✅ kod yuborilmadi, bog'lanmadi |
| **BIROVNING kontakt kartochkasi** | ✅ rad etildi |
| To'g'ri raqam | ✅ 4 xonali kod keldi |
| Kodning o'zi bazada | ✅ yo'q, faqat xesh |
| «Bir bosishda kirish» tugmasi | ✅ bor, bir martalik kalit bilan |
| Tasdiqlangan mijoz | ✅ darhol kod, kontakt so'ralmaydi |
| **Boshqa Telegram hisobi** | ✅ darhol kod berilmaydi |
| Botdagi buyurtma jarayoni | ✅ saqlandi va qaytarildi |
| Yaroqsiz / eski nonce | ✅ rad etildi |
| Oddiy `/start` | ✅ buzilmadi |

**Serverda** (soxta Firestore, 15 ta holat): deep link yasash, nonce
bog'lanishi, `boshla` kod yubormasligi, noto'g'ri kod, to'g'ri kod,
token muddati ~1 yil, token bilan kirish, **eski 4 raqamli yo'l endi
ishlamasligi**, buzilgan token, bir martalik kalit, kalitning ikkinchi
marta ishlamasligi, muddati o'tgan kalit, kunlik va soatlik
chegaralar — **hammasi ✅**.

**Brauzerda** (haqiqiy sahifa, 390px):

| Holat | Natija |
|---|---|
| Spidometr: 0 / 1 / 3 oy kechikkan | ✅ yashil / sariq / qizil, strelka 14 → 32 → 50 px |
| «OGOH» yozuvi | ✅ yo'q |
| Forma: faqat 4 katak + 2 tugma | ✅ zaxira yo'l yo'q |
| «Kodni olish» | ✅ so'rov ketdi, bot oynasi ochildi |
| Kodni yopishtirish | ✅ kirdi, token localStorage + cookie'ga yozildi |
| **Faqat cookie qolgan holat** | ✅ kabinet ochildi, localStorage tiklandi |
| «Bir bosishda kirish» havolasi | ✅ kirdi, manzildan kalit tozalandi |
| Yaroqsiz kalit | ✅ sayt buzilmadi |

JS xatosi 0 ta. Kartochka 354×223 (1.586). 6 barobar sekin
protsessorda qayta chizish **8.9 ms**, aylantirishda **61 FPS**.
