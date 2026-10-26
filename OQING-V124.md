# V124 — KABINET ENDI O'ZI OCHILADI

## Siz haqsiz — noqulaylik bor edi
Oldingi versiyada kabinet to'g'ri ishlardi, lekin mijoz bo'limga
HAR KIRGANDA telefon raqamini va raqamning oxirgi 4 ta raqamini
QAYTA yozishi kerak edi. "Kabinet" deb atalgan narsa uchun bu
noto'g'ri: kabinet o'zi ochilishi kerak, har safar "kim ekaningizni
isbotlang" demasligi kerak.

Bu mening xatoyim edi — xavfsizlikni to'g'ri qildim-u, qulaylikni
unutdim.

## Nima o'zgardi
**Bir marta kirsangiz — bo'ldi.** Keyingi safar bo'lim o'zi, hech
narsa so'ramasdan ochiladi: buyurtmalar bosqichlari bilan,
shartnoma to'lov jadvali bilan.

- Kirish formasi va "telefon raqamingizni kiriting" degan tushuntirish
  kartochkasi YASHIRILADI — kirgan mijozga ular faqat chalkashtiradi.
- Ularning o'rnida ixcham sarlavha: telefon raqami va **"Chiqish"**
  tugmasi.
- Agar eslab qolingan ma'lumot endi ishlamasa (masalan mijoz boshqa
  raqam kiritgan), u avtomatik tozalanadi va forma qaytadi — aks
  holda bo'lim har ochilganda xato chiqaverardi.

## Xavfsizlik pasaymadi
Saqlanadigan narsa — mijozning O'ZI kiritgan, o'zining telefon raqami
va o'zi sotib olgan raqamning 4 ta raqami. Hech qanday parol, token
yoki hujjat ma'lumoti saqlanmaydi.

Ma'lumotning O'ZI (buyurtma, shartnoma, jadval) saqlanmaydi — u har
safar serverdan, o'sha ikki bosqichli tekshiruvdan o'tib keladi.
Ya'ni telefonni boshqa odam olsa ham, u faqat "Chiqish" tugmasi
turgan sahifani ko'radi va bir bosishda hammasi tozalanadi.

## Tekshirildi (brauzerda, haqiqiy sahifada)
    1-kirish (qo'lda) ...... forma yashirildi, sarlavhada +998 93 111 22 33,
                             eslab qolindi
    2-kirish (sahifa TO'LIQ qayta yuklandi)
                           . kabinet O'ZI ochildi: 1 buyurtma (bosqichlari
                             bilan) + 1 shartnoma, forma ko'rinmaydi
    "Chiqish" bosilgach ... forma qaytdi, natija tozalandi, xotira
                             o'chirildi
    JavaScript xatosi ..... yo'q
