# V138 — "Menda eski ishlayapti" — sababi topildi

## Nima bo'lgan

Siz haqsiz: saytingizda **eski mini ilova** ochilayotgan edi. Sabab
mening nusxamda emas — **yuklash usulida**.

**GitHub'ga fayl yuklaganda eski fayllar O'CHMAYDI**, faqat qo'shiladi
va bir xil nomlilari almashtiriladi. Men V136 da eski
`telegram-ilova.html` ni `_telegram-ilova-keyinga/` papkasiga
ko'chirgandim — lekin bu **faqat mening nusxamda** bajarildi. Sizning
saytingizda eski fayl **o'z joyida qolgan**.

Netlify esa **haqiqiy faylni** oddiy yo'naltirish qoidasidan **ustun**
qo'yadi. Ya'ni:

```
Bot menyusidagi tugma → /telegram-ilova.html
   → Netlify: "bu nomli fayl bor-ku" → ESKI SAHIFANI beradi
   → _redirects dagi qoida umuman ishlamaydi
```

Shuning uchun siz eski ilovani ko'rgansiz.

## Tuzatildi — endi eski faylni o'chirish SHART EMAS

Yo'naltirish qoidalari **majburiy** qilindi — oxiriga undov belgisi
qo'yildi:

```
/telegram-ilova.html   /index.html   200!
/telegram-ilova        /index.html   200!
/ilova                 /index.html   200!
/app                   /index.html   200!
```

`200!` — bu "fayl mavjud bo'lsa ham qoida ustun" degani. Endi eski
`telegram-ilova.html` saytda qolsa ham **hech qachon ochilmaydi**:
bot menyusidagi tugma bosilganda yangi sayt (mini ilova) chiqadi.

> Xohlasangiz baribir tozalab qo'yishingiz mumkin: GitHub'da
> `telegram-ilova.html` faylini ochib, o'ng yuqoridagi axlat qutisi
> belgisini bosing. Lekin bu endi majburiy emas.

## Ikkinchi, KAFOLATLI chora: eski faylning o'zi almashtirildi

`200!` qoidasi ishlaydi — lekin u **faqat yangi `_redirects` fayli
yuklangandan keyin**. Shuning uchun ishonchliroq yo'l ham qo'shildi:

**Eski `telegram-ilova.html` faylining O'ZI yo'naltirish sahifasi bilan
almashtirildi.** GitHub bir xil nomli faylni almashtiradi — ya'ni
237 KB'lik eski ilova o'rniga 1 KB'lik yo'naltirish qoladi. Endi bu
manzil qanday ochilmasin, mijoz yangi mini ilovaga tushadi.

**Muhim nozik joy:** Telegram mini ilovani ochganda manzilga o'z
belgilarini qo'shadi (`#tgWebAppData=...`). Yo'naltirishda ular
**saqlanadi** — aks holda sayt "Telegram ichidaman" deb bilmay
qolardi va kodsiz kirish ishlamasdi. `?startapp=...` ham o'tkaziladi.

Tekshirildi (uchala holatda ham yangi sayt ochildi, eski yozuvlar
yo'qoldi, versiya 138):

| Havola | Natija |
|---|---|
| `/telegram-ilova.html#tgWebAppData=...` | ✅ `/#tgWebAppData=...`, `tg` sinfi joyida |
| `/telegram-ilova.html?startapp=raqam_909991234` | ✅ `?startapp=...` saqlandi |
| `/telegram-ilova.html` (belgisiz) | ✅ `/` |

---

## Qaysi versiya turganini tekshirish

"Eski ishlayapti" degan holat yana takrorlanmasligi uchun saytga
**versiya belgisi** qo'yildi. Tekshirish:

* kompyuterda: saytni oching, `Ctrl+U` bosing va `vip-versiya` so'zini
  qidiring;
* yoki shunchaki sahifani yangilab (`Ctrl+Shift+R`) ko'ring.

Ko'rsatilgan son yuklagan arxivingiz raqamiga teng bo'lishi kerak.
Hozirgisi: **138**.

## "Jonsiz sayt" qalqoni

Sayt qo'lda, papka-papka yuklanadi. Agar `assets/app.js` yuklanmay
qolsa, sahifa **ochiladi** — kartochkalar, menyu, hammasi ko'rinadi —
lekin hech narsa **ishlamaydi**, sababi esa ko'rinmaydi.

Endi bunday holatda sayt jim turmaydi: 6 soniyadan keyin aniq xabar
chiqadi — *"Sayt to'liq yuklanmadi: assets/app.js topilmadi. GitHub'ga
yuklashda assets papkasi ichidagi app.js fayli tashlanmagan bo'lishi
mumkin"*.

Tekshirildi: fayl joyida bo'lsa xabar **chiqmaydi**, 404 bo'lsa
**chiqadi**.

---

## Yuklashda nimaga e'tibor berish kerak

1. **`assets/app.js`** — V136 dan beri saytning asosiy kodi shu
   faylda. 1-qism ichida, `assets` papkasida.
2. **`_redirects`** — majburiy yo'naltirish shu faylda. U ham 1-qism
   ichida, ildizda.
3. Yuklagandan keyin telefonda saytni **majburan yangilang** (sahifani
   pastga tortib qo'yib yuboring) — brauzer eski nusxani ko'rsatmasin.
   Telegram'da: botni yopib, qaytadan oching.
