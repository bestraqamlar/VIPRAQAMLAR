# VIP RAQAMLAR — sayt yangilanishi (v8)

Faqat `index.html`.

## 1. Buyurtma va shartnoma — alohida ekranlar

Avval ikkalasi bitta sahifada, yorliq (tab) bilan edi — shuning uchun
Profildan "Buyurtmalarim" bosilganda ba'zan shartnoma yorlig'i ochiq
qolardi. Endi ular **butunlay alohida ekran**:

| Qayerdan | Manzil | Nima ochiladi |
|---|---|---|
| Profil → Buyurtmalarim | `#/buyurtmalarim` | faqat buyurtma tekshirish |
| Profil → Shartnomalarim | `#/shartnoma` | faqat shartnoma holati |

Ikkalasi ham qaytadan, zamonaviy qilib chizildi:
- tepada rangli sarlavha kartochkasi (buyurtma — ko'k, shartnoma — oltin)
  va qisqa tushuntirish
- orqaga qaytish tugmasi
- buyurtmada oxirgi 4 ta raqam endi **alohida kataklar** bilan
  (1 2 3 4 ko'rsatmasi, avtomatik keyingi katakka o'tadi, Enter — tekshiradi)
- buyurtma ekranining pastida "Kredit shartnomam" havolasi

## 2. Saralashda "Bo'lib to'lash"

"Avval yangisi" olib tashlandi, o'rniga **"Bo'lib to'lash"** qo'yildi.
Bosilganda ro'yxatda **faqat bo'lib to'lashga beriladigan raqamlar** qoladi
(v7 dagi qoida bo'yicha: `installment` belgisi, operator moliyalashtirishi
yoki kun taklifi oylik to'lovi).

## 3. Bo'lib to'lashda umumiy summa ko'rinmaydi

Buyurtma oynasida to'lov turi "Bo'lib to'lash" bo'lsa, raqamning
**to'liq narxi hech qayerda chiqmaydi** — faqat oylik to'lov va
(bo'lsa) bosh to'lov ko'rsatiladi.
