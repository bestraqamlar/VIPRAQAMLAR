# VIP RAQAMLAR — v16 · kartochkalar yangi dizayn

## Raqam kartochkasi (butunlay qayta ishlangan)
- **Yangi yuza**: tekis rang o'rniga yumshoq gradient + ichki yorug' chiziq,
  22px burchak, chuqurroq soya. Tungida ham, yorug'da ham alohida sozlangan.
- **Chap tomonda rangli chiziq** — kartochka turini bir qarashda bildiradi:
  oltin = VIP, yashil = bo'lib to'lash bor, ko'k = oddiy, kulrang = band.
- **Operator endi logotipli chip** bilan ko'rsatiladi (avval kichkina rangli nuqta edi) —
  operatorlar qatoridagi uslub bilan bir xil.
- **VIP raqam** o'zi oltin tusli gradient bilan yoziladi.
- Raqam va narx o'rtasida ingichka ajratuvchi chiziq — tartib aniqroq.
- **Narx** kattaroq, "so'm" yonida mayda; bo'lib to'lash matni endi ko'k pill ichida.
- **"Ko'rish" tugmasi** — gradient, ko'k nur soyasi va strelka ikonkasi;
  ustiga borilganda strelka siljiydi.
- **Sevimli tugmasi** dumaloq bo'ldi, chegarasi yumshoq.
- Chegirma belgisi burchakka yopishgan to'rtburchak emas, suzib turuvchi pill.

## Premium karusel kartochkasi
- Boyroq uch rangli gradient fon, ikki tomonda yumshoq nur (oltin va ko'k).
- Yuqorida "PREMIUM TANLOV" belgisi yoniga operator logotipi qo'shildi.
- Narx bloki ajratuvchi chiziq ostida; bo'lib to'lash matni endi kesilmaydi.
- Oltin "Ko'rish" tugmasi strelka bilan.

## Profil plitalari va umumiy kartochkalar
- Plitalar yangi gradient yuza, burchakda yumshoq ko'k nur, ikonka atrofida nozik halqa.
- Barcha oddiy kartochkalar (`.card`) va buyurtma/shartnoma natijalari
  ham shu yangi yuzaga o'tkazildi — sayt bo'ylab bitta uslub.

## Tekshiruvlar
JS 0 xato · CSS balans 0 · kontrast (yorug'+tungi) 0 xato ·
telefon va kompyuterda gorizontal toshish 0 · oqimlar (qidiruv, filtr, buyurtma) OK.

## Backend
O'zgartirilmadi.

---

## v16.1

### Raqam kartochkasida kompaniya logosi olib tashlandi
- Operator yana oddiy rangli nuqta + nom ko'rinishida (logotip faqat yuqoridagi
  operatorlar qatorida qoldi).

### Yurakcha endi jonli (serverdan kelgan) raqamlarda ham ishlaydi
- Avval jonli raqam bazamizda bo'lmagani uchun sevimlilarga tushmas edi.
- Endi yurakcha bosilganda raqamning o'zi ham saqlanadi
  (`localStorage: vip_fav_items`), shuning uchun u **Sevimlilar bo'limida
  ko'rinadi** va sahifa qayta yuklangandan keyin ham joyida qoladi.
- O'sha kartochkadan buyurtma berish ham ishlaydi (`findItem` saqlangan nusxani
  ham qidiradi). Yurakcha o'chirilsa, nusxa ham o'chadi.

### VIP kartochkalar — hashamatli ko'rinish
- VIP raqam kartochkasining **foni alohida**: oltin tusli gradient
  (tungida to'q oltin→ko'k, yorug'da krem→oltin), oltin chegara,
  burchakda yumshoq oltin nur, ichki yorug' chiziq.
- "VIP" belgisi oltin gradient va to'q matn bilan, "Ko'rish" tugmasi ham oltin.
- **Matn o'qishga qulay**: raqam va narx bir xil to'q/oq rangda (gradient yozuv
  olib tashlandi). O'lchangan kontrast: tungida ~14:1, yorug'da ~15:1,
  "VIP" belgisi ~11:1 — hammasi WCAG AAA darajasida.

Tekshiruvlar: JS 0 xato · CSS 0 · kontrast 0 xato · jonli sevimli testi o'tdi.

---

## v16.2 — VIP kartochka chinakam premium bo'ldi
- **Boy ko'p qatlamli fon**: tungida oltin→binafsha→ko'k gradient,
  yorug'da krem→oltin; ustida juda nozik diagonal naqsh (guilloche effekti)
  va ikki burchakda oltin nur.
- **Oltin halqa**: tashqi oltin chegara + ichki yorug' chiziq, pastda yumshoq
  oltin yorug'lik soyasi (kartochka "ko'tarilib" turadi).
- **Sekin o'tuvchi yorug'lik** (sheen) — har 5-6 soniyada kartochka ustidan
  yengil nur yugurib o'tadi. Harakatni kamaytirish rejimida o'chadi.
- **VIP belgisi** endi toj ikonkasi bilan, uch bosqichli oltin gradientda.
- "Ko'rish" tugmasi, bo'lib to'lash yozuvi, operator chipi, chegirma belgisi —
  hammasi oltin uyg'unlikda.
- Chap chetdagi chiziq qalinroq va yorqinroq oltin.

**O'qish qulayligi tekshirildi** (kontrast nisbati):
raqam/narx — tungida 13.2–14.8:1, yorug'da 14.8–17.4:1;
operator — 10.3:1 va 7.5:1; "VIP" belgisi — 9.6:1. Hammasi WCAG AAA.

---

## v16.3 — VIP: faqat tepa qismi premium
Avvalgi to'liq oltin kartochka olib tashlandi. Endi:
- **Narxdan yuqorisi** (raqam, VIP belgisi, operator, yurakcha) oltin "shapka"
  ichida: yumshoq oltin gradient, juda nozik diagonal naqsh, burchakda yengil nur,
  pastida ingichka oltin chegara.
- **Narx va "Ko'rish" tugmasi — eskicha**, oddiy kartochkadagidek ko'k.
- Yurib o'tuvchi yorug'lik (sheen) olib tashlandi.
- VIP belgisi toj ikonkasi bilan qoldi.
- Chap chetdagi oltin chiziq butun kartochka bo'ylab.

Kontrast: ikkala mavzuda ham 0 xato.

## v16.4
- Oltin shapka bilan kartochkaning qolgan qismi orasidagi **keskin chegara olib
  tashlandi**: oltin qatlam pastga qarab asta so'nib, kartochka rangiga qo'shilib
  ketadi (CSS mask bilan yumshoq o'tish). Naqsh va nur ham birga so'nadi.

## v16.5
- Oltin rang **ancha kamaytirildi** — endi to'q sariq fon emas, kartochkaning o'z
  rangi ustida juda yengil oltin shu'la (tepada ~13%, pastga qarab yo'qoladi).
- Naqsh va burchakdagi nur ham ikki barobar yumshatildi.
- Raqam endi oltin tusda emas, oddiy kartochkadagidek oq/to'q rangda.
- "VIP" belgisi va chap chetdagi chiziq yumshoqroq oltinda — premium tuyg'u
  qoladi, lekin ko'zga urilmaydi.

## v16.6
- Oltin to'qroq, chuqurroq tusga o'tkazildi (och sariq emas, bronza-oltin):
  tungida 30%, yorug'da 26% — baribir pastga qarab butunlay so'nadi.
- "VIP" belgisi ham to'qroq oltin gradientda.
- Kontrast: ikkala mavzuda 0 xato.

## v16.7
- Oltin yana bir oz quyuqlashtirildi (tungida 39%, yorug'da 34%).

## v16.8
- Oltin so'nish chizig'i yuqoriroqqa ko'tarildi — sariq endi faqat raqam va
  belgilar atrofida qoladi, narx qatoriga yetib bormaydi.
