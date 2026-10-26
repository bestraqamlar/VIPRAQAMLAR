# V130 — Botga bog'lash muammosi hal qilindi + 4 xonali kod

## Siz topgan kamchilik: "botga Start bosmagan bo'lsachi?"

Bu **haqiqiy va jiddiy xato edi**. V129'da sayt mijozga "botimizga
kiring, Start bosing, raqamingizni yuboring" derdi — lekin bot bu
raqamni **hech qayerga yozmasdi**. Chat ID faqat ikki holatda
saqlanardi:

* mijoz **bot orqali buyurtma** bergan bo'lsa;
* yoki shartnomasi botga bog'langan bo'lsa.

Ya'ni botga endigina kirgan mijoz Start bossa ham, raqamini yuborsa
ham, kod baribir kelmasdi. **Aylanma yo'l** — mijoz nima qilishni
bilmay qolardi.

### Qanday tuzatildi

1. **Botda yangi bosqich** (`customer-bot-webhook.js` →
   `kabinet_bind`). Sayt mijozni botga **maxsus havola** bilan
   yuboradi: `t.me/<bot>?start=kabinet`. Bot buni ko'rib darhol
   **«📱 Raqamimni yuborish»** tugmasini chiqaradi — menyuda adashib
   yurish yo'q, bir bosishda tugaydi.
2. Raqam `kabinet_chatids/<telefon>` ga yoziladi va kod shu yerdan
   topiladi (eng birinchi manba sifatida).
3. `/kabinet` buyrug'i ham shu oynani ochadi.
4. **Bepul yutuq:** endi buyurtma berayotganda ham mijoz telefon
   so'ralganda Telegram tugmasi bilan raqamini yuborsa, u ayni paytda
   kabinet uchun ham bog'lanadi.
5. **Zaxirada ham bor:** `kabinet_chatids` kunlik zaxira nusxaga
   qo'shildi va tozalash ro'yxatiga **ataylab qo'shilmadi** — u
   vaqtinchalik hisoblagich emas, doimiy bog'lanish.

### Xavfsizlik: birovning raqamini bog'lab bo'lmaydi

* Raqam **faqat** Telegram'ning o'z «kontakt yuborish» tugmasi orqali
  qabul qilinadi. Qo'lda yozilgan raqam **rad etiladi**.
* `contact.user_id` xabar yozgan odamning ID'siga **teng bo'lishi
  shart** — ya'ni birovning kontakt kartochkasini yuborib, uning
  kabinetiga kirib bo'lmaydi. (Telegram'da birovning kontaktini
  yuborish mumkin, shuning uchun bu tekshiruv majburiy.)

### Saytdagi ko'rinish

Bog'lanmagan mijozga endi **3 qadamli aniq ko'rsatma** chiqadi:
«Botni ochish» tugmasi (maxsus havola bilan) va **«Botga kirdim —
kodni yuborish»** tugmasi. Ya'ni mijoz botda bog'langach, sahifani
yangilamasdan, bir bosishda kodni oladi.

Pastda esa **zaxira yo'l** tugmasi ko'rinib turadi: «Telegram yo'qmi?
Boshqa yo'l bilan kirish» — telefon + sotib olingan raqamning oxirgi
4 ta raqami. Telegram'i umuman yo'q mijoz ham tashqarida qolmaydi.

---

## Kod endi 4 xonali

So'raganingizdek, kod **6 xonalidan 4 xonaliga** o'tdi — kiritish
osonroq.

**Lekin 4 xonali kod 100 barobar zaif** (10 000 kombinatsiya,
1 000 000 o'rniga). Shuning uchun himoya kuchaytirildi:

| Chegara | V129 (6 xonali) | V130 (4 xonali) |
|---|---|---|
| Bitta kodga urinish | 5 ta | **3 ta** |
| Telefon bo'yicha soatiga xato | yo'q edi | **10 ta** |
| Telefonga kuniga kod | yo'q edi | **15 ta** |
| Telefonga daqiqasiga kod | 1 ta | 1 ta |
| IP bo'yicha soatiga kod / tekshiruv | 10 / 30 | 10 / 30 |

Eng muhimi — **telefon bo'yicha soatlik xato chegarasi**. Ilgari faqat
IP bo'yicha chegara bor edi, IP'ni esa almashtirib bo'ladi; yangi
hisob esa telefonga bog'langan va **kod o'chirilsa ham saqlanib
qoladi**. Ya'ni "yangi kod so'rab, yana 3 marta taxmin qilish" yo'li
ham yopiq: bir soatda ko'pi bilan 10 ta taxmin = 10 000
kombinatsiyadan **0,1%**. To'g'ri kod kiritilsa hisob nolga tushadi —
haqiqiy egasi jazolanib qolmaydi.

---

## Topilgan va tuzatilgan boshqa kamchiliklar

1. **Ikki marta yuborish.** Oxirgi katak to'lganda ham, Enter
   bosilganda ham, yopishtirilganda ham tekshiruv ishga tushardi —
   bitta kod uchun ikkita urinish sarflanishi mumkin edi. Endi bayroq
   qo'yildi.
2. **Telefon o'zgartirilsa** eski kod maydoni ochiq qolardi — mijoz
   boshqa raqam yozib, eski kodni kiritib, "nega ishlamayapti" deb
   o'ylardi. Endi raqam o'zgarishi bilan kod holati tozalanadi.
3. **Tokenli kirishda telefon maydoni bo'sh bo'lsa** kabinet "telefon
   kiriting" deb to'xtab qolardi (brauzer maydonni tozalab yuborsa).
   Endi token bo'lsa telefon tekshirilmaydi — u tokenning ichida.
4. **Bog'lanmagan holatda kod maydoni ochiq qolardi** — mijoz kelmagan
   kodni kutib o'tirardi. Endi yopiladi.
5. **«Botga kirdim» tugmasi taymerga ilinib qolardi** (60 soniya
   kutish). Endi bu holatda taymer bekor qilinadi — kod hali umuman
   yuborilmagan-ku.
6. **Kirish kodlari hech qachon o'chmasdi** — tekshirilmagan kodlar
   bazada yotib qolardi. Endi kunlik zaxira bilan 3 kundan eskisi
   o'chiriladi.
7. **Ko'rsatma matnlari** 6 xonali deb yozilgan edi — hammasi
   yangilandi.

---

## Sozlash (bir marta)

Netlify → Site settings → Environment variables:

* `KABINET_TOKEN_SECRET` — uzun tasodifiy satr (kamida 32 belgi).
* `CUSTOMER_BOT_USERNAME` — bot nomi (@siz). **Endi bu muhimroq:**
  mijozga beriladigan `t.me/<bot>?start=kabinet` havolasi shundan
  yig'iladi. Noto'g'ri bo'lsa havola ishlamaydi.

`CUSTOMER_BOT_TOKEN` allaqachon bor — tegmaysiz.

---

## Tekshiruv

**Botda** (soxta Telegram, 11 ta holat):

| Holat | Natija |
|---|---|
| `?start=kabinet` havolasi | ✅ darhol «Raqamimni yuborish» tugmasi |
| Tugma turi | ✅ `request_contact` |
| Qo'lda yozilgan raqam | ✅ qabul qilinmaydi |
| **Birovning kontakti** | ✅ rad etildi |
| O'z kontakti | ✅ bog'landi, chat ID to'g'ri |
| Tasdiq xabari | ✅ «saytga qayting» deb aytadi |
| `/kabinet` buyrug'i | ✅ ishlaydi |
| Oddiy `/start` | ✅ buzilmadi |

**Serverda** (soxta Firestore va Telegram, 22 ta holat): oldingi 18 tasi
+ yangilari —

| Holat | Natija |
|---|---|
| Buyurtmasiz, faqat botda tasdiqlagan | ✅ kod ketdi |
| Umuman bog'lanmagan | ✅ `t.me/...?start=kabinet` havolasi berildi |
| **IP almashtirib taxmin qilish** | ✅ telefon bo'yicha to'sildi |
| Kunlik kod chegarasi | ✅ ishlaydi |
| 4 xonali kod | ✅ |
| 3 xatodan keyin kod bekor | ✅ |

**Brauzerda** (haqiqiy sahifa, 390px, 8 ta holat): oldingilari +

| Holat | Natija |
|---|---|
| Bog'lanmagan: 3 qadamli kartochka | ✅ havola to'g'ri |
| Kod maydoni yopiq | ✅ |
| Zaxira tugmasi ko'rinadi | ✅ |
| «Botga kirdim» | ✅ darhol qayta so'rov ketdi |
| Telefon o'zgardi | ✅ kod holati tozalandi |

Hammasi: **22 + 11 + 8 ta holat**, JS xatosi 0 ta. Kartochka o'lchami
354×223 (1.586) o'zgarmadi, 6 barobar sekin protsessorda qayta chizish
**13.6 ms**, aylantirishda **60 FPS**.
