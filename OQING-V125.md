# V125 — Hisoblagichlar tozalanadi

## Savolga javob: kabinetga kirganda AKKAUNT YARATILMAYDI

Tekshirildi:

- `index.html` ichida Firebase Auth **0 marta** ishlatiladi
  (`firebase.auth`, `signInAnonymously`, `createUser` — hech biri yo'q).
  Ya'ni mijoz saytga kirganda na oddiy, na "anonim" akkaunt ochilmaydi.
- `netlify/functions/api-kabinet.js` ichida **bitta** yozuv bor:
  `order_lookup_rate_limits` to'plamiga **IP manzil** bo'yicha soatlik
  hisoblagich (`{hourKey, count, lastAttemptAt}`). Bu akkaunt emas —
  bu "soatiga 20 ta urinish" himoyasi. Mijozning ismi, telefoni yoki
  boshqa ma'lumoti u yerga yozilmaydi.
- "Eslab qolish" faqat mijozning **o'z telefonida** saqlanadi
  (localStorage: telefon + 4 raqam). Serverga hech narsa qo'shilmaydi.

## Lekin bitta narsa to'planib yotgan edi

Himoya hisoblagichlari 5 ta to'plamda (`order_lookup_rate_limits`,
`order_create_rate_limits`, `sms_verifications_ip`,
`contract_qr_rate_limits`, `story_stat_rate_limits`) har bir IP uchun
bitta hujjat yaratadi va **hech qachon o'chirilmasdi**. Zarar
qilmaydi (o'qish aniq ID bo'yicha), lekin yillar o'tib o'n minglab
keraksiz hujjat to'planadi: joy, pul va zaxira nusxa hajmi.

Endi kunlik zaxira nusxa bilan birga **3 kundan eski** hisoblagichlar
o'chiriladi (`zaxira-background.js` → `hisoblagichlarniTozala()`).
Hisoblagichning o'zi soatlik, demak 3 kundan eskisi hech qanday
himoya bermaydi. Telegramdagi zaxira xabariga yangi qator qo'shildi:
`🧽 N ta eski hisoblagich o'chirildi`. Rasmiy eksport ham, JSON
zaxira yo'li ham tozalaydi.

---

## Ombor tozalandi (eski nusxalar o'chirildi)

`_eski-nusxalar/` papkasi **butunlay o'chirildi**. Undagi 78 ta
faylning har biri uchun `netlify/functions/`, `netlify/functions/lib/`,
`netlify/edge-functions/` yoki `assets/` ichida haqiqiy, yangi nusxasi
borligi bitta-bitta tekshirildi — hammasida bor edi. Qolaversa,
hammasi GitHub tarixida saqlanib turadi, kerak bo'lsa qaytarib olinadi.

Ildizdan yana shu keraksizlar o'chirildi:

| Fayl | Nega keraksiz |
|---|---|
| `panel.css` | Panel `assets/panel.css` ni yuklaydi, ildizdagini emas |
| `grotesk.woff2`, `jakarta.woff2` | Barcha havolalar `/assets/fonts/...` ga ketadi |
| `download` | Aslida macOS'ning `.DS_Store` fayli — tasodifan yuklangan |
| `vip-raqamlar-sayt (9).zip`, `(10).zip` | 2026-yil iyuldagi eski arxivlar (o'sha paytdagi `index.html` 41 KB edi) |
| barcha `.DS_Store` | macOS axlati |

**Saqlab qolinganlar:**

* `_telegram-ilova-keyinga/telegram-ilova.html` — Telegram mini
  ilovasi. "Keyin davom ettiramiz" degan edingiz, shuning uchun
  o'chirmadim; qaytarish yo'li shu papkadagi `OQING.txt` da.
* `sw.js`, `firebase-messaging-sw.js` — ildizda TURISHI SHART
  (oflayn rejim va push bildirishnoma boshqa joyda ishlamaydi).
* Operator rasmlari (`beeline.png`, `ucell.png`, `mobiuz.png`,
  `uzmobile.png`, `humans.svg`, `perfektum.svg`) — `index.html` ularni
  ildizdan (`/beeline.png`) oladi.

Eski `OQING-*.md` qo'llanmalar `OQING-arxiv/` papkasiga ko'chirildi —
ildizda faqat oxirgi uchtasi (V123, V124, V125) qoldi.

Tekshiruv: barcha sahifa va uslub fayllaridagi rasm/font/skript
havolalari skript bilan qayta tekshirildi — **sinib qolgan havola yo'q**.

---

## GitHub'ga yuklash (3 qismga bo'lindi)

GitHub'ning veb-saytiga bir martada ko'pi bilan **100 ta fayl**
tashlash mumkin. Shuning uchun V125 uchta arxivga bo'lindi — har
birida 99 tadan kam fayl:

| Arxiv | Fayl | Nima bor |
|---|---|---|
| `1-qism-sahifa-va-assets.zip` | 97 | `index.html`, `panel-boshqaruv.html`, barcha sahifalar, `assets/`, rasmlar, `_redirects`, `netlify.toml`, qoidalar, `OQING-arxiv/` |
| `2-qism-funksiyalar-A.zip` | 40 | `netlify/functions/` ning 1-yarmi |
| `3-qism-funksiyalar-B-va-lib.zip` | 60 | `netlify/functions/` ning 2-yarmi + `netlify/functions/lib/` + `netlify/edge-functions/` |

**Yuklash tartibi.** Har bir arxivni kompyuterda ochasiz (unzip), keyin
GitHub'da omborni ochib `Add file → Upload files` bosasiz va ochilgan
papka ichidagi narsalarni tashlaysiz. Papka tuzilishi arxiv ichida
saqlangan, ya'ni `netlify/functions/...` o'z joyiga tushadi. Uchtasini
ketma-ket yuklaysiz — GitHub fayllarni **qo'shib boradi**, oldingisini
o'chirmaydi. Tartibi muhim emas, lekin 1-qismdan boshlash qulay.

Tekshirildi: uchta arxiv birga ochilganda natija asl papka bilan
**bayt-baytga bir xil** (197 ta fayl, `diff -r` farq topmadi).

Yana bitta eski nusxa topildi va o'chirildi:
`netlify/functions/netlify/functions/admin-credit.js` — ichma-ich
tushib qolgan eski nusxa (295 qator, haqiqiysi 369 qator). Netlify uni
hech qachon ishlatmasdi.
