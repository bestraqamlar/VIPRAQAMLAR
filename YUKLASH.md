# Netlify'ga yuklash

Bu papka to'g'ridan-to'g'ri sayt ildizi. GitHub'ga shu papkaning
**ichidagi hamma narsa** qo'yiladi (papkaning o'zi emas).

## 1. GitHub'ga qo'yish

```bash
git init
git add .
git commit -m "Sayt: offline va avtomatik qayta urinish"
git branch -M main
git remote add origin https://github.com/SIZNING-ISMINGIZ/vipraqamlar-sayt.git
git push -u origin main
```

## 2. Netlify'ga ulash

1. app.netlify.com -> **Add new site** -> **Import an existing project**
2. GitHub'ni tanlang, omborxonani tanlang
3. Sozlamalar (netlify.toml'dan o'zi oladi, tegmang):
   - Build command: `npm install`
   - Publish directory: `.` (bo'sh qoldiring)
   - Functions directory: `netlify/functions`
4. **Deploy**

## 3. Muhit o'zgaruvchilari — MAJBURIY

Site settings -> Environment variables. Bularsiz funksiyalar ishlamaydi.
Qiymatlarni HECH QAYERGA, jumladan GitHub'ga yozmang.

### Firebase (shartnoma PDF, admin funksiyalari)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`  — `\n` belgilarini o'zgartirmasdan, butunligicha

### Telegram
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_CHANNEL_ID`
- `TELEGRAM_BUSINESS_BOT_TOKEN`
- `BUSINESS_BOT_WEBHOOK_SECRET`
- `CUSTOMER_BOT_TOKEN`
- `CUSTOMER_BOT_WEBHOOK_SECRET`
- `PERSONAL_BOT_TOKEN`
- `PERSONAL_BOT_CHAT_ID`
- `PERSONAL_BOT_WEBHOOK_SECRET`
- `ADMIN_BOT_WEBHOOK_SECRET`
- `WATCH_BOT_TOKEN`
- `WATCH_CHAT_ID`
- `BOT_ADD_TOKEN`

### SMS (Eskiz)
- `ESKIZ_EMAIL`
- `ESKIZ_PASSWORD`

### Instagram
- `IG_APP_SECRET`
- `IG_PAGE_ACCESS_TOKEN`
- `IG_VERIFY_TOKEN`

### Boshqa
- `ANTHROPIC_API_KEY`      — AI yordamchi uchun
- `MOBILE_API_KEY`         — mobil ilova uchun
- `ADMIN_BOOTSTRAP_SECRET` — birinchi adminni yaratish uchun

`URL` va `DEPLOY_PRIME_URL` — Netlify o'zi beradi, qo'lda kiritilmaydi.

## 4. Admin panel paroli

`netlify/edge-functions/admin-gate.js` panelga kirishdan oldin
HTTP login/parol so'raydi. Uning o'zgaruvchilari shu fayl ichida
izohlangan — o'qib chiqing va Netlify'da o'rnating.

## 5. Yuklangandan keyin tekshirish

- [ ] Sayt ochildi, raqamlar ko'rinyapti
- [ ] Qidiruv ishlayapti
- [ ] Telefonda internetni o'chirib ko'ring — tepada sariq chiziq chiqishi
      va "saqlangan ro'yxat" deyishi kerak
- [ ] Internetni qayta yoqing — yashil "aloqa tiklandi" chiqib, ro'yxat
      o'zi yangilanishi kerak
- [ ] Admin panel ochildi (panel-boshqaruv.html)
- [ ] Kredit bo'limida shartnoma yopish va Arxiv ishlayapti
- [ ] Shartnoma PDF yuklab olinyapti va yangi 4-bo'lim bor

## Bu versiyada nima o'zgardi

**Mijoz sayti (index.html)**
- Internet uzilganda tepada xabar chiqadi, keshdagi ma'lumot eski ekani
  aytiladi; aloqa tiklanganda o'zi yangilanadi
- Yuklanmagan narsa o'zi qayta urinadi (3s -> 45s), offline'da urinmaydi,
  aloqa qaytganda yoki sahifaga qaytilganda darhol urinadi
- Sekin aloqada serverga ko'proq vaqt beriladi (3G: 20s, 2G: 30s)
- Qidiruv xatosi endi "raqam topilmadi" deb ko'rsatilmaydi
- Xato xabarlari o'zbekcha va tushunarli
- Barmoq bilan kattalashtirish ochildi
- "Ma'lumotni tejash" rejimida video oldindan yuklanmaydi

**Admin panel (panel-boshqaruv.html)**
- Kredit: shartnomani yopish -> Arxiv; yopilgani summalarga qo'shilmaydi
- Shartnoma holati tugmalari ixcham to'rda
- Telefon ko'rinishi tuzatildi

**Shartnoma PDF (netlify/functions/lib/contractPdf.js)**
- Rasmiy blank ko'rinishi
- Yangi 4-bo'lim: raqamni xaridor nomiga o'tkazish
