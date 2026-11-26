/* ==================================================================
   VIP RAQAMLAR — saytning asosiy kodi
   ------------------------------------------------------------------
   V136 GACHA bu kod index.html ichida, beshta <script> blokida
   JOYLASHGAN edi (jami ~363 KB). Nega ajratildi:

     1) TEZLIK. Brauzer tashqi skriptni BIR MARTA tahlil qilib
        (compile), natijasini o'z keshiga saqlaydi — keyingi
        ochilishlarda tahlil deyarli takrorlanmaydi (V8 code cache).
        HTML ichidagi skript uchun bu kesh ancha kuchsiz va HTML'ning
        bitta harfi o'zgarsa ham butunlay bekor bo'ladi.
        Telegram mini ilovasi kuniga bir necha marta ochiladi — ya'ni
        bu yerda farq eng ko'p seziladi.

     2) HTML hujjati 562 KB dan ~200 KB ga tushdi — brauzer sahifani
        tezroq o'qiydi va birinchi ko'rinish ertaroq chiqadi.

     3) Xizmat ishchisi (sw.js) endi shu bitta faylni keshlaydi,
        ya'ni internetsiz ham kod joyida turadi.

   TARTIB MUHIM: fayllar avvalgi <script> bloklari TARTIBIDA
   birlashtirilgan va `defer` bilan yuklanadi — ya'ni ijro tartibi
   avvalgidek, faqat DOM tayyor bo'lgandan keyin boshlanadi.
   ================================================================== */


/* Sayt kodi ishga tushdi — "jonsiz sayt" qalqoni shu belgiga qaraydi
   (izohi index.html da, app.js skriptidan keyin). */
try{ window.__APP_ISHLADI = true; }catch(e){}

/* ===== 1-qism (avvalgi index.html, 3808-satr) ===== */

/* ==================================================================
   VIP RAQAMLAR — mijoz sayti. Backend o'zgarmagan.
   ================================================================== */
'use strict';
history.scrollRestoration = 'manual';

/* ---------- Firebase ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAZVM_C5tRYe77j4OvQtrBhV3dpEZAxk_A",
  authDomain: "vip-raqamlar.firebaseapp.com",
  projectId: "vip-raqamlar",
  storageBucket: "vip-raqamlar.firebasestorage.app",
  messagingSenderId: "872049914686",
  appId: "1:872049914686:web:32fd7945238fdbf5eeb26f",
  measurementId: "G-SB37FEXJ0F"
};
/* ==================================================================
   FIREBASE — ENDI KECHIKTIRIB YUKLANADI (V145)
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "telegram ilova juda sekin ishlayapti, oddiy
   telefonda ham muammo qilmasin".

   O'LCHOV (6 barobar sekin protsessor, haqiqiy fayllar):
       firebase-app-compat.js          274 ms
       firebase-firestore-compat.js    258 ms
       firebase-app-check-compat.js    261 ms
       ------------------------------------
       JAMI                            793 ms

   Ya'ni sahifa ochilishida, mijoz hali hech narsa ko'rmay turib,
   ASOSIY OQIM 793 ms band bo'lardi — va bu tezkor internetdagi
   o'lchov. Haqiqiy telefonda, mobil internetda bundan ko'proq.

   NEGA BU ISROF EDI. Katalog Firestore'dan EMAS, `api-index`
   funksiyasidan keladi (oddiy `fetch`). Firestore brauzerda faqat
   KEYINROQ kerak bo'ladi: sayt sozlamalari, mijoz fikrlari,
   "hozir saytda" sanog'i, buyurtma yuborish. Bularning hech biri
   birinchi ko'rinish uchun shart emas. Shunga qaramay 793 ms'lik
   kutubxona HAMMASIDAN OLDIN yuklanardi.

   ENDI QANDAY. Uch fayl `index.html` dan olib tashlandi va bu yerga
   ko'chirildi: ular birinchi chizishdan KEYIN, fonda yuklanadi.
   `db` endi o'zgaruvchi (`let`) — kutubxona tayyor bo'lgach
   to'ldiriladi.

   XAVFSIZLIK CHORASI. `db` ga murojaat qiladigan har bir joy
   oldidan `await firebaseniKut()` chaqiriladi. U kutubxona
   allaqachon tayyor bo'lsa DARHOL qaytadi (hech qanday kechikish
   yo'q), tayyor bo'lmasa — tayyor bo'lishini kutadi. Shu sabab
   buyurtma yuborish kabi muhim amallar hech qachon "db yo'q" degan
   xatoga uchramaydi.

   Qo'shimcha: yuklash birinchi chizishdan so'ng DARHOL boshlanadi,
   ya'ni mijoz buyurtma tugmasiga yetguncha kutubxona allaqachon
   tayyor bo'ladi.
   ================================================================== */
const FB_MANBA = 'https://www.gstatic.com/firebasejs/10.13.2/';
const FB_FAYL = ['firebase-app-compat.js', 'firebase-firestore-compat.js', 'firebase-app-check-compat.js'];

let db = null;
let FV = null;
let FB_YUKLANMOQDA = null;

function fbSkript(nom){
  return new Promise((res)=>{
    const s = document.createElement('script');
    s.src = FB_MANBA + nom;
    /* `async=false` — fayllar AYNAN shu tartibda bajarilsin
       (firestore `app` dan keyin kelishi shart). */
    s.async = false;
    s.onload = res;
    s.onerror = res;     /* xato bo'lsa ham to'xtab qolmaymiz */
    document.head.appendChild(s);
  });
}

function firebaseniKut(){
  if(db) return Promise.resolve(db);
  if(FB_YUKLANMOQDA) return FB_YUKLANMOQDA;
  FB_YUKLANMOQDA = (async ()=>{
    for(const f of FB_FAYL) await fbSkript(f);
    try{
      if(!(window.firebase && firebase.initializeApp)) return null;
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      try{ firebase.appCheck().activate('6LddC2ItAAAAAPajc0NSM_wtRLb_6ik0VDVCV7ll', true); }catch(e){}
      db = firebase.firestore();
      /* Ba'zi O'zbekiston tarmoqlari Firestore streamini bloklaydi —
         bu sozlama shart */
      try{ db.settings({ experimentalAutoDetectLongPolling: true }); }catch(e){}
      FV = firebase.firestore.FieldValue;
    }catch(e){ console.error('Firebase yuklanmadi:', e); }
    return db;
  })();
  return FB_YUKLANMOQDA;
}

async function getAppCheckHeaders(){
  try{
    await firebaseniKut();
    const t = await firebase.appCheck().getToken();
    return { 'X-Firebase-AppCheck': t.token };
  }
  catch(e){ return {}; }
}

/* ---------- Holat ---------- */
let NUMBERS = [], numbersLoaded = false, SETTINGS = {}, FAVORITES = [];
let installmentRates = { 6:5, 12:10, 24:20, 36:30 };
let OPERATOR_FINANCING = { byOperator:{ Humans:{}, Ucell:{}, Beeline:{} }, tariffsByOperator:{ Humans:[], Ucell:[], Beeline:[] } };
let TESTIMONIALS = [];
/* V120: "Mijozlar fikri" bo'limi yuklandimi. Yuklanmaguncha bo'lim
   O'RNIDA skelet turadi (bo'sh joy ham, sakrash ham bo'lmasin). */
let TEST_YUKLANDI = false;
const FN = '/.netlify/functions/';

const OPERATOR_META = {
  Mobiuz:{color:'#C0392B', logo:'/assets/operators/mobiuz.png'},
  Beeline:{color:'#B8860B', logo:'/assets/operators/beeline.png'},
  Ucell:{color:'#8E5BA6', logo:'/assets/operators/ucell.png'},
  Uzmobile:{color:'#2E63C7', logo:'/assets/operators/uzmobile.png'},
  Humans:{color:'#A8791B', logo:'/assets/operators/humans.svg'},
  Perfektum:{color:'#D9541F', logo:'/assets/operators/perfektum.svg'}
};
const opMeta = (op) => OPERATOR_META[op] || { color:'#6b7280' };
const LIVE_OPERATORS = ['Beeline','Ucell','Humans','Mobiuz','Perfektum'];
const VALID_UZ_CODES = ['20','33','50','70','77','80','87','88','90','91','92','93','94','95','97','98','99'];
const REGIONS = ["Toshkent shahri","Toshkent viloyati","Andijon","Farg'ona","Namangan","Samarqand","Buxoro","Xorazm","Navoiy","Qashqadaryo","Surxondaryo","Jizzax","Sirdaryo","Qoraqalpog'iston"];
const PAGE_SIZE = 15;

/* ==================================================================
   TIL (uz / ru)
   ================================================================== */
const RU = {
  /* V162 — naqshlar */
  'Naqsh': 'Шаблон',
  'Zinapoya': 'Лесенка',
  'Bir xil raqam': 'Одинаковые цифры',
  'Beshta bir xil': 'Пять одинаковых',
  "To'rtta bir xil": 'Четыре одинаковых',
  'Uchta bir xil': 'Три одинаковых',
  'Oyna naqsh': 'Зеркальный',
  'Juftliklar': 'Парные',
  'Yumaloq raqam': 'Круглый номер',
  'Nol bilan tugaydi': 'Заканчивается на ноль',
  'Takrorlanuvchi': 'Повторяющийся',
  "Ko'zgu": 'Зеркало',
  'Ikki xil raqam': 'Две разные цифры',

  /* V158 — ulashish */
  'Ulashish': 'Поделиться',
  'Rasm sifatida': 'Картинкой',
  "Chiroyli kartochka — Telegram va Instagram uchun": 'Красивая карточка — для Telegram и Instagram',
  'Havola': 'Ссылка',
  'Raqamning sayt manzili': 'Адрес номера на сайте',

  /* V150 — narx filtri */
  "Narx oralig'i": 'Ценовой диапазон',
  'Hammasi': 'Все',
  'dan': 'от',
  'gacha': 'до',
  'ta': 'шт',
  '10 mln gacha': 'до 10 млн',
  '10\u201320 mln': '10\u201320 млн',
  '20\u201335 mln': '20\u201335 млн',
  '35 mln+': '35 млн+',
  "Dollarda narxlangan raqamlar bu filtrda ko'rinmaydi": 'Номера с ценой в долларах в этом фильтре не показываются',
  'Tasodifiy': 'Случайно',
  'mln': 'млн',
  /* --- v26: premium kartochka, bo'lib to'lash ro'yxati, xabarlar --- */
  "Bo'lib to'lashga":"В рассрочку","Premium Raqamlar":"Премиум номера",
  "Bo'lib to'lashga Premium Raqamlar":"Премиум номера в рассрочку",
  "Bo'lib to'lashga raqamlar":"Номера в рассрочку","raqam":"номеров",
  "Oldindan to'lovsiz":"Без первого взноса",
  "Oldindan to'lovsiz, rasmiy shartnoma bilan":"Без первого взноса, по официальному договору",
  "Xabarlar":"Сообщения","Xabar yo'q":"Нет сообщений","Ko'rish":"Открыть",
  "ta yangi xabar":"новых сообщений","Hammasini o'qildi":"Прочитать все","Hammasi o'qilgan":"Все прочитано",
  "Bildirishnomalarni yoqish":"Включить уведомления","Bildirishnoma yoqilgan":"Уведомления включены",
  "Bildirishnoma o'chirilgan":"Уведомления отключены","Yoqish":"Включить","Yoqilgan":"Включено","O'chirilgan":"Отключено",
  "Yangi raqamlar va aksiyalardan xabardor bo'ling":"Узнавайте о новых номерах и акциях",
  "Yangi raqamlardan xabardor bo'lasiz":"Вы будете получать уведомления о новых номерах",
  "Brauzer sozlamalaridan qayta yoqsangiz bo'ladi":"Можно включить обратно в настройках браузера",
  "Yangi raqamlardan xabardor bo'ling":"Узнавайте о новых номерах первыми",
  "Yangi VIP raqam va aksiyalar chiqqanda xabar beramiz":"Сообщим, когда появятся новые VIP номера и акции",
  "Ha, yoqing":"Да, включить","Keyinroq":"Позже",
  "Bosh ekranga qo'shsangiz ishlaydi":"Работает, если добавить сайт на экран «Домой»",
  "Bu brauzer qo'llamaydi":"Этот браузер не поддерживает","Qanday?":"Как?","Mavjud emas":"Недоступно",
  "hozir":"сейчас","daqiqa oldin":"мин. назад","soat oldin":"ч. назад",
  "kecha":"вчера","kun oldin":"дн. назад",
  "Chiroyli raqamlar":"Красивые номера","Bosh sahifa":"Главная","Katalog":"Каталог","Sevimlilar":"Избранное",
  "Sevimli":"Избранное","Buyurtmalarim":"Мои заказы","Buyurtma":"Заказ","Ma'lumot":"Информация","Yana":"Ещё",
  "Bog'lanish":"Связаться","Xush kelibsiz":"Добро пожаловать","Operatorlar":"Операторы","Hammasi":"Все",
  "Tavsiya etiladi":"Рекомендуем","Bir xil":"Одинаковые","Juft":"Парные","Ikki juft":"Две пары","Ketma-ket":"По порядку","Yumaloq":"Круглые","Yangi":"Новые","Kun tavsiyasi":"Выбор дня","KUN TAVSIYASI":"ВЫБОР ДНЯ","Sizga tavsiya qilamiz":"Рекомендуем вам","Mijozlar fikri":"Отзывы клиентов",
  "Kerakli raqamingiz yo'qmi?":"Не нашли нужный номер?","Oxirgi 4 ta raqamni ayting — biz topamiz":"Назовите последние 4 цифры — мы найдём",
  "Barcha huquqlar himoyalangan.":"Все права защищены.","Raqam bo'yicha qidirish":"Поиск по номеру",
  "keyingi 7 ta raqam":"следующие 7 цифр","Bo'sh katakcha — istalgan raqam":"Пустая ячейка — любая цифра",
  "Operatorlardan":"У операторов","Saralash":"Сортировка","Tozalash":"Очистить",
  "Buyurtma va shartnoma holati":"Статус заказа и договора","Shartnoma":"Договор",
  "Buyurtmani tekshirish":"Проверить заказ","Ishlab turgan telefon raqamingiz":"Ваш действующий номер телефона",
  "Sotib olingan raqamning oxirgi 4 ta raqami":"Последние 4 цифры купленного номера",
  "Bu — xavfsizlik uchun ikkinchi tekshiruv":"Это вторая проверка для безопасности","Tekshirish":"Проверить",
  "Kredit shartnoma holati":"Статус кредитного договора","Shartnoma ID":"ID договора",
  "Shartnomadagi telefon raqam":"Номер телефона в договоре","Holatni tekshirish":"Проверить статус",
  "Sozlamalar, yordam va aloqa":"Настройки, помощь и контакты","Ko'rinish":"Внешний вид","Mavzu":"Тема",
  "Yorug'":"Светлая","Tungi":"Тёмная","Tizim":"Системная","Til":"Язык","Aloqa va ma'lumot":"Контакты и информация",
  "Savol-javob":"Вопросы и ответы","Eng ko'p so'raladigan savollar":"Часто задаваемые вопросы",
  "Biz haqimizda":"О нас","VIP RAQAMLAR xizmati":"Сервис VIP RAQAMLAR","Bo'sh ish o'rinlari":"Вакансии",
  "Jamoamizga qo'shiling":"Присоединяйтесь к команде","Yangi raqamlar va aksiyalar":"Новые номера и акции",
  "Qo'ng'iroq":"Позвонить","Raqam":"Номер","Tasdiq":"Подтверждение",
  "O'zbekiston bo'ylab bepul yetkazib berish. Kuryer bilan birga rasmiy shartnoma va SIM-karta keladi.":"Бесплатная доставка по Узбекистану. Курьер привозит официальный договор и SIM-карту.",
  "Har kuni 9:00 – 21:00":"Ежедневно 9:00 – 21:00",
  /* dinamik */
  "so'm":"сум","Batafsil":"Подробнее","Band":"Занят","BAND":"ЗАНЯТ","VIP":"VIP",
  "PREMIUM":"ПРЕМИУМ",
  "Buyurtma berish":"Оформить заказ","Jami":"Итого","Oyiga":"В месяц","Narxi":"Цена","Raqam haqida":"О номере",
  "O'xshash raqamlar":"Похожие номера","Bo'lib to'lash":"Рассрочка","Bo'lib to'lash mavjud":"Доступна рассрочка",
  "Bo'lib to'lash hisob-kitobi":"Расчёт рассрочки","Bo'lib to'lash shartlari":"Условия рассрочки",
  "Taxminiy hisob. Aniq shartlar shartnomada ko'rsatiladi.":"Примерный расчёт. Точные условия указываются в договоре.",
  "Bu raqam allaqachon band qilingan":"Этот номер уже забронирован","oy":"мес.","oyga":"мес.",
  "Buyurtma xulosasi":"Детали заказа","Ma'lumotlaringiz":"Ваши данные","Tasdiqlash":"Подтверждение",
  "SMS tasdiq":"SMS подтверждение","To'lov usuli":"Способ оплаты","To'liq to'lov":"Полная оплата",
  "Bir martada":"Единовременно","Muddat":"Срок","Oylik to'lov":"Ежемесячный платёж","Bosh to'lov":"Первый взнос",
  "Raqam narxi":"Цена номера",
  "Yetkazib berish":"Доставка","Bepul":"Бесплатно","Davom etish":"Продолжить","Orqaga":"Назад",
  "Ism familiyangiz":"Ваше имя и фамилия","Telefon raqamingiz":"Ваш номер телефона","Viloyat":"Область","Tanlang":"Выберите",
  "Tasdiqlash uchun shu raqamga SMS kod yuboriladi":"На этот номер придёт SMS-код для подтверждения",
  "Ismingizni kiriting":"Введите ваше имя","To'g'ri raqam kiriting":"Введите корректный номер",
  "Bunday raqam mavjud emas":"Такого номера не существует","Viloyatni tanlang":"Выберите область",
  "Manzil":"Адрес","Bizning manzil":"Наш адрес","Xaritani ochish":"Открыть на карте","Yo'nalish":"Маршрут","Xaritadan belgilang":"Отметьте на карте","Yetkazib berish manzili":"Адрес доставки",
  "Mijoz":"Клиент","Ism":"Имя","Telefon":"Телефон","O'zgartirish":"Изменить","Operator":"Оператор","To'lov":"Оплата",
  "Chegirma":"Скидка","Buyurtmani yuborish":"Отправить заказ","Yuborilmoqda…":"Отправляется…",
  "Tasdiqlash kodi":"Код подтверждения","Kodni qayta yuborish":"Отправить код снова",
  "Kod kelmadi — baribir davom etish":"Код не пришёл — продолжить","Buyurtma qabul qilindi":"Заказ принят",
  "Holati":"Статус","YANGI":"НОВЫЙ","Yopish":"Закрыть","Summa":"Сумма",
  "Internet yo'q":"Нет интернета","Aloqa sekin":"Медленное соединение",
  "Aloqa tiklanishi bilan o'zi davom etadi":"Продолжится автоматически при восстановлении связи",
  "Avtomatik qayta urinilmoqda…":"Автоматически повторяем…",
  "Sevimlilarga qo'shildi":"Добавлено в избранное","Sevimlilardan olib tashlandi":"Удалено из избранного",
  "Sevimlilar bo'sh":"Избранное пусто",
  "Yoqqan raqamni yurakcha tugmasi bilan belgilang — u shu yerda saqlanadi.":"Отметьте понравившийся номер сердечком — он сохранится здесь.",
  "Katalogga o'tish":"Перейти в каталог","Raqam topilmadi":"Номер не найден",
  "Bunday raqam topilmadi":"Такой номер не найден","Maxsus buyurtma":"Особый заказ",
  "Maxsus raqam buyurtmasi":"Заказ особого номера","Arizani yuborish":"Отправить заявку",
  "Ariza qabul qilindi":"Заявка принята","Taxminiy narx":"Примерная цена",
  "Buyurtma topilmadi":"Заказ не найден","ta buyurtma":"заказ(ов)","ta natija":"результат(ов)",
  "ta raqam":"номер(ов)","ta saqlangan raqam":"сохранённых номеров","Hali hech narsa saqlanmagan":"Пока ничего не сохранено",
  "Yana ko'rsatish":"Показать ещё","Tavsiya etilgan":"Рекомендуемые","Avval arzoni":"Сначала дешёвые",
  "Avval qimmati":"Сначала дорогие","Avval yangisi":"Сначала новые","Yuklanmoqda…":"Загрузка…",
  "Operatorlardan qidirilmoqda…":"Ищем у операторов…","Natija yo'q":"Нет результатов",
  "Tekshirilmoqda…":"Проверяем…","Topilmadi":"Не найдено","Tekshirib bo'lmadi":"Не удалось проверить",
  "Qayta urinish":"Повторить","To'lovlar jadvali":"График платежей","HOLAT":"СТАТУС",
  "Shartnomani yuklab olish":"Скачать договор","Tayyorlanmoqda…":"Готовится…",
  "TO'LANDI":"ОПЛАЧЕНО","KECHIKMOQDA":"ПРОСРОЧЕНО","KUTILMOQDA":"ОЖИДАЕТСЯ","to'lov":"платёж",
  "Yordam":"Помощь","Ariza":"Заявка","Tajribangiz":"Ваш опыт","Lavozim":"Должность",
  "Hozircha bo'sh o'rin yo'q":"Сейчас вакансий нет","Arizangiz yuborildi":"Ваша заявка отправлена",
  "Tez orada siz bilan bog'lanamiz.":"Мы свяжемся с вами в ближайшее время.",
  "Profil":"Профиль","Sozlamalar va bo'limlar":"Настройки и разделы","Bo'limlar":"Разделы",
  "Shartnomalarim":"Мои договоры","Hujjatlar":"Документы","Buyurtmalar tarixi":"История заказов",
  "Sevimli raqamlarim":"Избранные номера","Saqlanganlar":"Сохранённые",
  "Bo'lib to'lashga raqamlar":"Номера в рассрочку","Imkoniyat":"Возможность",
  "Vakansiyalar":"Вакансии","Ish o'rinlari":"Рабочие места","Instagram kanal":"Instagram-канал","Postlar":"Посты",
  "Qidirish":"Найти","Qidirilmoqda…":"Идёт поиск…","Qidirilmoqda":"Идёт поиск","Hammasini tozalash":"Сбросить всё","Bilgan raqamlaringizni kiriting, qolgani bo'sh qolsin":"Введите известные цифры, остальные оставьте пустыми","Mening joylashuvim":"Моё местоположение","Aniqlanmoqda…":"Определяем…",
  "Buyurtma holatini tekshirish":"Проверка статуса заказа","Buyurtmam qayerda?":"Где мой заказ?",
  "Telefon raqamingiz va sotib olgan raqamingizning oxirgi 4 ta raqamini kiriting.":"Введите свой номер телефона и последние 4 цифры купленного номера.",
  "Kredit shartnomam":"Мой кредитный договор","To'lovlar jadvali va PDF":"График платежей и PDF",
  "Shartnoma holati":"Статус договора",
  "To'lovlar jadvalini ko'ring va shartnomani PDF holida yuklab oling.":"Посмотрите график платежей и скачайте договор в PDF.",
  "Shartnomaning yuqori o'ng burchagida yozilgan":"Указан в правом верхнем углу договора"
};
let LANG = 'uz';
function t(s){ if(LANG !== 'ru') return s; return RU[s] || s; }
function applyLang(birinchi){
  document.documentElement.lang = LANG;
  /* V137 — TUZATILGAN XATO (mijoz aytgan: "yozuvlar o'zgaryabdi").
     ------------------------------------------------------------
     V132 da tezlik uchun shunday qilingan edi: "til o'zbek bo'lsa,
     matnni qaytadan yozib chiqish shart emas — u allaqachon
     o'zbekcha". Bu BIRINCHI OCHILISHDA to'g'ri, lekin TILNI
     ALMASHTIRGANDA XATO edi:
        rus tilida turgan mijoz o'zbekchaga o'tsa, yozuvlar RUSCHA
        bo'lib qolardi (chunki almashtirish o'tkazib yuborilardi).
     Endi o'tkazib yuborish FAQAT birinchi ochilishda bo'ladi —
     tugma bilan til almashtirilganda matn HAR DOIM yangilanadi. */
  const otkazib = birinchi === true && LANG === 'uz';
  if(!otkazib){
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.getAttribute('data-t')); });
  }
  document.querySelectorAll('.langlbl').forEach(el => el.textContent = LANG.toUpperCase());
  const dl = document.getElementById('dhLang'); if(dl) dl.textContent = LANG.toUpperCase();
  document.querySelectorAll('[data-lang-val]').forEach(b => b.classList.toggle('on', b.dataset.langVal === LANG));
}
function setLang(v){ LANG = v; try{ localStorage.setItem('vip_lang', v); }catch(e){} applyLang();
  ['#oqResult','#ctResult'].forEach(id => { const el = document.querySelector(id); if(el && el.querySelector('.hintbox')) el.innerHTML = ''; });
  if(typeof initHints === 'function') initHints();
  HOME_IMZO = ''; renderAll(); renderRoute(true); }
try{ LANG = localStorage.getItem('vip_lang') || 'uz'; }catch(e){}

/* ---------- Yordamchilar ---------- */
const $  = (s, r) => (r||document).querySelector(s);
const $$ = (s, r) => Array.from((r||document).querySelectorAll(s));
const esc = (s) => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ==================================================================
   RAQAM KO'RINISHI:  xx xxx-xx-xx   (V181)
   ------------------------------------------------------------------
   Bir muddat chiziqcha bilan ("90 777-77-77") sinab ko'rildi va
   mijoz so'rovi bilan BO'SHLIQQA qaytarildi. Sabab: raqam saytning
   eng katta va eng muhim elementi, chiziqcha esa unga qo'shimcha
   "shovqin" qo'shib, toza ko'rinishini buzardi. Bo'shliq esa
   guruhlarni ajratadi, lekin o'zi ko'rinmaydi. */
function displayNumber(n){
  const d = String(n||'').replace(/\D/g,''), l = d.slice(-9);
  if(l.length !== 9) return String(n||'').replace(/-/g,' ');
  return `+998 ${l.slice(0,2)} ${l.slice(2,5)} ${l.slice(5,7)} ${l.slice(7,9)}`;
}
function shortNumber(n){
  const d = String(n||'').replace(/\D/g,'').slice(-9);
  if(d.length !== 9) return String(n||'');
  return `${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5,7)} ${d.slice(7,9)}`;
}
function extractRawDigits(v){ let d = String(v||'').replace(/\D/g,''); if(d.startsWith('998')) d = d.slice(3); return d.slice(0,9); }
function formatUzNumber(r){
  let o = '';
  if(r.length > 0) o += r.slice(0,2);
  if(r.length > 2) o += ' ' + r.slice(2,5);
  if(r.length > 5) o += ' ' + r.slice(5,7);
  if(r.length > 7) o += ' ' + r.slice(7,9);
  return o;
}
const formatPrice = (n) => Number(n||0).toLocaleString('ru-RU').replace(/,/g,' ');
const formatPriceUzs = (n) => formatPrice(n) + " so'm";
const SUM = () => t("so'm");

/* ---------- VALYUTA ----------
   Admin panelda raqamga "dollarda" belgisi qo'yilgan bo'lsa (currency:'usd'),
   uning NAQT narxi so'm emas, dollarda ko'rsatiladi. Bo'lib to'lash esa
   har doim so'mda hisoblanadi — shu sabab dollarlik raqamda bo'lib to'lash
   umuman taklif qilinmaydi (faqat naqt to'lov). */
function isUsd(item){
  const c = item && item.currency;
  return typeof c === 'string' && c.toLowerCase() === 'usd';
}
/* Narx yonidagi birlik: "so'm" yoki "$" */
function UNIT(item){ return isUsd(item) ? '$' : SUM(); }
/* Narx birligining HTML ko'rinishi.
   "so'm" — kichik va xira (u shunchaki o'lchov birligi).
   "$"    — summaning O'ZI bilan bir xil kattalikda va rangda, chunki
   dollarda narx aynan shu belgi bilan o'qiladi (750 $ — "750 dollar"). */
function UNITH(item){
  return isUsd(item) ? '<span class="cur-usd">$</span>' : `<small>${SUM()}</small>`;
}

function hasActiveDiscount(i){
  if(!i || !i.oldPrice || !(i.oldPrice > i.price)) return false;
  if(i.dailyDeal === true && i.dealExpiresAt && i.dealExpiresAt <= Date.now()) return false;
  return true;
}
const discountPct = (i) => hasActiveDiscount(i) ? Math.round((1 - i.price/i.oldPrice)*100) : 0;

function installmentMonthlyFor(item, months){
  const rate = installmentRates[months] || 0;
  return Math.ceil((item.price||0) * (1 + rate/100) / months / 1000) * 1000;
}
function installmentFinancingFor(item){
  if(!item || !item.live) return null;
  if(item.operator!=='Humans' && item.operator!=='Ucell' && item.operator!=='Beeline') return null;
  const tb = OPERATOR_FINANCING.byOperator[item.operator];
  return tb ? (tb[Number(item.operatorPrice)] || null) : null;
}
/* Bo'lib to'lash shu raqamga umuman mumkinmi?
   Faqat: admin panelda "installment" belgilangan raqamlar,
   yoki operator moliyalashtirishi bor jonli raqamlar,
   yoki kun taklifi uchun oylik to'lov kiritilgan raqamlar. */
function installmentAllowed(item){
  if(!item) return false;
  if(isUsd(item)) return false;   /* dollarlik raqam — faqat naqt to'lov */
  if(item.installment === true) return true;
  if(oylikMuddatlar(item).length) return true;
  return false;
}

/* ==================================================================
   BO'LIB TO'LASH — YAGONA MANBA
   Ilgari oylik summa to'rt xil joyda, TO'RT XIL yo'l bilan
   hisoblanardi: kartochkadagi yozuv operator jadvalidan olardi,
   raqam oynasining pastki qatori esa foizli formuladan. Natijada
   bitta raqamda ikki xil summa ko'rinardi.
   Endi hammasi shu uch funksiyadan o'tadi.

   Ustuvorlik (yuqoridagisi kuchliroq):
     1. Adminda shu raqamga QO'LDA kiritilgan summa (monthly6/12/24).
        Bu maydon avvaldan bor edi, lekin faqat BITTA joyda
        ishlatilardi — qolgan joylar uni ko'rmay formuladan
        hisoblardi. "Umuman boshqa summa" ning asosiy sababi shu.
     2. Operator moliyalashtirish jadvali (jonli raqamlar)
     3. Kun taklifining summalari         (dealMonthly6/12/24)
     4. Foizli formula                    (taxminiy)
   ================================================================== */
/* Adminda shu raqam uchun QO'LDA kiritilgan oylik summa.
   `monthly6/12/24` maydoni allaqachon indeks orqali keladi — yangi
   maydon o'ylab topilmadi, shunisi ishlatiladi. */
function insAniqSumma(item, months){
  if(!item) return 0;
  return Number(item['monthly' + months]) || 0;
}
/* Shu muddat uchun oylik to'lov. 0 — bu muddat mavjud emas. */
function oylikTolov(item, months){
  if(!item || isUsd(item)) return 0;
  const aniq = insAniqSumma(item, months);
  if(aniq) return aniq;
  const fin = installmentFinancingFor(item);
  if(fin) return Number(fin.monthly[months]) || 0;
  if(item.dailyDeal){
    const d = Number(item['dealMonthly' + months]) || 0;
    if(d) return d;
  }
  if(item.installment === true) return installmentMonthlyFor(item, months);
  return 0;
}
/* Shu muddat uchun bosh to'lov (hozircha faqat operator jadvalida bor) */
function oylikBoshTolov(item, months){
  const fin = installmentFinancingFor(item);
  return (fin && Number(fin.down[months])) || 0;
}
/* Qaysi muddatlar mavjud */
function oylikMuddatlar(item){
  if(!item || isUsd(item)) return [];
  const aniq = [6,12,24,36].filter(m => insAniqSumma(item, m));
  if(aniq.length) return aniq;
  const fin = installmentFinancingFor(item);
  if(fin) return [6,12,24].filter(m => fin.monthly[m]);
  if(item.dailyDeal){
    const l = [6,12,24].filter(m => Number(item['dealMonthly' + m]) > 0);
    if(l.length) return l;
  }
  if(item.installment === true) return [6,12,24,36];
  return [];
}
/* Kartochkada ko'rsatiladigan ASOSIY variant: 24 oy bo'lsa o'sha,
   bo'lmasa eng uzun muddat. `aniq` — summa haqiqiymi yoki formula
   bilan taxmin qilinganmi (shunga qarab izoh yoziladi). */
function oylikAsosiy(item){
  const ms = oylikMuddatlar(item);
  if(!ms.length) return null;
  const m = ms.indexOf(24) !== -1 ? 24 : ms[ms.length - 1];
  const summa = oylikTolov(item, m);
  if(!summa) return null;
  return { months:m, monthly:summa, down:oylikBoshTolov(item, m),
           aniq: !!(insAniqSumma(item, m) ||
                    installmentFinancingFor(item) ||
                    (item.dailyDeal && Number(item['dealMonthly' + m]) > 0)) };
}

function installmentTeaser(item){
  if(!item || isUsd(item)) return '';
  const a = oylikAsosiy(item);
  if(!a) return (item.live || item.installment) ? '' : '';
  return `${formatPrice(a.monthly)} ${t("so'mdan")} / ${a.months} ${t('oy')}`;
}

/* ==================================================================
   KARTOCHKADAGI NARX QATORI — RAQAM OYNASI BILAN AYNAN BIR XIL
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: bosh sahifada "Bo'lib to'lash bor" degan YOZUV
   chiqmasin — ichkaridagi 24 oylik SUMMANING O'ZI chiqsin. Naqt
   summa esa faqat raqam ochilganda (mijoz naqt to'lovni tanlaganda)
   ko'rinadi.

   Ilgari kartochka va raqam oynasi IKKI XIL qoida bilan ishlardi:
   oyna har doim oylik summani yozardi, kartochka esa summa "aniq"
   bo'lmasa naqt narx + "Bo'lib to'lash bor" yorlig'ini. Shu sabab
   bir xil raqam ikki joyda ikki xil ko'rinardi.

   Endi IKKALASI HAM shu funksiyadan o'tadi (raqam oynasidagi
   `priceCard` bilan bir xil shart) — qoida bitta joyda.
   ================================================================== */
function kartaNarx(item){
  if(installmentAllowed(item) && !isUsd(item)){
    const ins = installmentTeaser(item);
    if(ins) return { bolib: true, ins };
  }
  return { bolib: false, ins: '' };
}
RU["so'mdan"] = 'сум';
RU["Bo'lib to'lash bor"] = 'Есть рассрочка';
/* V122 — kabinet va bosqichlar */
RU['Mening kabinetim'] = 'Мой кабинет';
RU["Buyurtmalar, shartnoma va to'lovlar"] = 'Заказы, договор и платежи';
RU['Hammasi bir joyda'] = 'Всё в одном месте';
RU["Telefon raqamingiz va sotib olgan raqamingizning oxirgi 4 ta raqamini kiriting — buyurtmalaringiz, shartnomangiz va to'lov jadvalingiz shu yerda chiqadi."] = 'Введите свой номер телефона и последние 4 цифры купленного номера — здесь появятся ваши заказы, договор и график платежей.';
RU["Shartnoma ID bo'yicha qidirish"] = 'Поиск по ID договора';
RU['Masalan KR0142'] = 'Например KR0142';
RU['Shartnoma tayyorlanmadi'] = 'Договор не подготовлен';

/* ---------- SANA: KUN.OY.YIL (V121) ----------
   Brauzerda `toLocaleDateString('uz-UZ')` sanani TESKARI — ISO
   tartibida qaytaradi ("2026-03-09"). O'lchab tekshirildi. Buyurtma
   vaqti shu ko'rinishda bazaga YOZILARDI va admin panelida ham,
   Telegram xabarida ham teskari ko'rinardi. Endi sanani o'zimiz
   yig'amiz — har qanday brauzerda bir xil. */
function sanaUz(x){
  const d = (x instanceof Date) ? x : new Date(x);
  if(!d || isNaN(d.getTime())) return '';
  const q = n => String(n).padStart(2,'0');
  return q(d.getDate()) + '.' + q(d.getMonth()+1) + '.' + d.getFullYear();
}
function sanaVaqtUz(x){
  const d = (x instanceof Date) ? x : new Date(x);
  if(!d || isNaN(d.getTime())) return '';
  const q = n => String(n).padStart(2,'0');
  return sanaUz(d) + ', ' + q(d.getHours()) + ':' + q(d.getMinutes());
}

/* ---------- Tarmoq ---------- */
function withClientTimeout(p, ms){
  return Promise.race([p, new Promise((_,rej)=> setTimeout(()=> rej(new Error('Vaqt tugadi: server javob bermadi')), ms))]);
}
function kutishVaqti(base){
  try{
    const c = navigator.connection;
    if(c){
      if(c.saveData) return base*2;
      if(c.effectiveType === '2g' || c.effectiveType === 'slow-2g') return base*3;
      if(c.effectiveType === '3g') return base*2;
    }
  }catch(e){}
  return base;
}
async function withRetryClient(fn, retries, delayMs){
  retries = (retries==null)?2:retries; delayMs = delayMs || 900;
  let last;
  for(let i=0;i<=retries;i++){
    try{ return await fn(); }
    catch(err){
      if(err && err.message === 'ALREADY_RESERVED') throw err;
      last = err;
      if(i < retries) await new Promise(r => setTimeout(r, delayMs*(i+1)));
    }
  }
  throw last;
}
function xatoMatni(err){
  const m = String((err && err.message) || err || '');
  if(!navigator.onLine) return t("Aloqa tiklanishi bilan o'zi davom etadi");
  if(/Vaqt tugadi/i.test(m)) return LANG==='ru' ? 'Сервер не отвечает. Повторим автоматически.' : "Server javob bermadi — o'zi qayta urinadi.";
  if(/permission-denied/i.test(m)) return LANG==='ru' ? 'Нет доступа к этому действию.' : "Bu amalga ruxsat yo'q.";
  if(/unavailable|network|Failed to fetch|NetworkError/i.test(m)) return LANG==='ru' ? 'Связь прервана. Повторяем…' : 'Aloqa uzildi. Qayta urinilmoqda…';
  if(/ALREADY_RESERVED/.test(m)) return LANG==='ru' ? 'Увы, этот номер уже забронирован.' : 'Afsus, bu raqam allaqachon band qilindi.';
  return LANG==='ru' ? 'Что-то пошло не так. Попробуйте ещё раз.' : "Nimadir noto'g'ri ketdi. Qayta urinib ko'ring.";
}

const TASKS = {};
function avtoQayta(nom, ishla){ TASKS[nom] = { ishla, n:0, timer:null, ok:false }; bajar(nom); }
/* Xato ALOQAGA bog'liqmi yoki yo'q?
   MUHIM (V98). Ilgari HAR QANDAY xato "aloqa sekin" deb hisoblanardi.
   Natijada aloqaga umuman aloqasi bo'lmagan xato ham (masalan bazada
   bo'lim yo'q yoki qoidalar ruxsat bermadi) tepada "Aloqa sekin —
   avtomatik qayta urinilmoqda" degan tasmani MANGU yoqib qo'yardi:
   internet zo'r bo'lsa ham. Mijoz esa saytni sekin deb o'ylardi.
   Endi faqat HAQIQIY aloqa xatosi shu tasmani yoqadi. */
function aloqaXatosimi(err){
  const kod = String((err && err.code) || '');
  const matn = String((err && err.message) || err || '');
  if(/unavailable|deadline-exceeded|internal|aborted/i.test(kod)) return true;
  if(/network|Failed to fetch|NetworkError|timeout|Vaqt tugadi|offline/i.test(matn)) return true;
  /* permission-denied, not-found, invalid-argument, unauthenticated va
     boshqalar — aloqa emas, sozlama/qoida muammosi */
  return false;
}

/* Xato ANIQ aloqaga bog'liq emasligi MA'LUMMI (taxmin emas)?
   Noma'lum xatoni "aloqa emas" deb hisoblash xavfli: lenta o'rni
   yo'qolib qolishi mumkin. Shu sabab faqat SANAB O'TILGAN kodlar
   "aniq aloqa emas" deb qabul qilinadi. */
function aniqAloqaEmas(err){
  const kod = String((err && err.code) || '');
  return /permission-denied|unauthenticated|not-found|invalid-argument|failed-precondition|already-exists|resource-exhausted/i.test(kod)
      || /Missing or insufficient permissions/i.test(String((err && err.message) || ''));
}

async function bajar(nom){
  const task = TASKS[nom]; if(!task) return;
  if(!navigator.onLine) return;
  try{ await task.ishla(); task.n = 0; task.ok = true; netMarkOk(); }
  catch(err){
    task.ok = false; task.n++;
    const aloqa = aloqaXatosimi(err);

    if(!aloqa){
      /* Aloqa emas: tasmani YOQMAYMIZ va cheksiz urinmaymiz. Uch marta
         urinib ko'rib, keyin to'xtaymiz — sabab o'zidan ketmaydi.
         Konsolga esa aniq yozamiz, muammo ko'rinmay qolmasin. */
      try{ console.error('"' + nom + "\" yuklanmadi (aloqa emas):", (err && err.code) || '', (err && err.message) || err); }catch(e){}
      if(task.n >= 3){ clearTimeout(task.timer); return; }
    }else if(task.n >= 2){
      netMarkFail();
    }

    clearTimeout(task.timer);
    task.timer = setTimeout(()=> bajar(nom), Math.min(3000*Math.pow(1.5, task.n-1), 45000) + Math.random()*800);
  }
}
function hammasiniQaytaUrin(){
  Object.keys(TASKS).forEach(n => { const task = TASKS[n]; if(task && !task.ok){ clearTimeout(task.timer); task.n = 0; bajar(n); } });
}
window.addEventListener('online', ()=>{ netBarRender(); hammasiniQaytaUrin(); });
window.addEventListener('offline', netBarRender);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) hammasiniQaytaUrin(); });

let netFail = false;
const netMarkFail = ()=>{ netFail = true; netBarRender(); };
const netMarkOk = ()=>{ if(netFail){ netFail = false; netBarRender(); } };
function netBarRender(){
  const bar = $('#netbar'); if(!bar) return;
  if(!navigator.onLine){
    $('#netTitle').textContent = t("Internet yo'q");
    $('#netSub').textContent = t("Aloqa tiklanishi bilan o'zi davom etadi");
    $('#netSpin').style.display = 'none'; bar.classList.add('on'); document.body.classList.add('netbar-on');
  }else if(netFail){
    $('#netTitle').textContent = t('Aloqa sekin');
    $('#netSub').textContent = t('Avtomatik qayta urinilmoqda…');
    $('#netSpin').style.display = ''; bar.classList.add('on'); document.body.classList.add('netbar-on');
  }else { bar.classList.remove('on'); document.body.classList.remove('netbar-on'); }
}

/* ==================================================================
   BILDIRISHNOMANI SURIB YUBORISH (Telegram / iOS uslubida)
   ------------------------------------------------------------------
   Bitta joyda yozilgan, barcha bildirishnomalarga ulanadigan imo-ishora:

     * barmoq (yoki sichqoncha) qaysi tomonga ketsa — kartochka O'SHA
       tomonga ergashadi: yonga sursa yonga, tepadagi kartochkani
       yuqoriga sursa yuqoriga (pastdagisini pastga);
     * yo'nalish birinchi 5 pikselda TANLANADI va shundan keyin
       o'zgarmaydi — shunda kartochka "qaltiramaydi";
     * teskari tomonga tortsa "rezina" kabi qarshilik qiladi (0,16);
     * qo'yib yuborilganda: masofa yetarli bo'lsa YOKI harakat tez
       bo'lsa (flick) — uchib ketadi; aks holda yumshoq "prujina"
       bilan joyiga qaytadi va taymer qaytadan ketadi;
     * surish paytida avtomatik yopilish taymeri TO'XTAYDI.

   Faqat `transform` va `opacity` o'zgaradi — ya'ni ish videokartada
   bajariladi, eski telefonda ham silliq chiqadi.
   ================================================================== */
function surishBogla(el, opt){
  opt = opt || {};
  const past = opt.yon === 'past';          /* pastdagi bildirishnoma */
  let sx = 0, sy = 0, dx = 0, dy = 0, oq = null, bosildi = false;
  /* Tezlikni OXIRGI harakatlar bo'yicha o'lchaymiz (butun surish
     bo'yicha emas): shunda "flick" — qisqa, lekin tez silkitish ham
     bildirishnomani uchirib yuboradi, xuddi telefondagidek. */
  let oVaqt = 0, oX = 0, oY = 0, vx = 0, vy = 0;
  const hozir = () => (window.performance && performance.now) ? performance.now() : Date.now();
  const en = () => Math.max(160, el.getBoundingClientRect().width || 320);
  /* Ba'zi kartochkalar CSS'da `translateX(-50%)` bilan markazlashgan —
     surishda u yo'qolmasligi uchun old qo'shimcha sifatida saqlanadi. */
  const asos = opt.asos || '';
  /* V133: yozuv kadriga bittaga tenglashtiriladi (qarang:
     kadrYozuvchi). Barmoq uzilganda `yozuvchi.tugat()` chaqiriladi. */
  const yozuvchi = kadrYozuvchi(el);
  const qoy = (x, y, o) => {
    yozuvchi.qoy(asos + 'translate3d(' + x + 'px,' + y + 'px,0)', String(o));
  };
  /* O'tish (transition) qo'yilganda yozuv DARHOL bajarilishi kerak —
     aks holda brauzer eski qiymatdan animatsiya boshlamaydi. */
  const qoyDarhol = (x, y, o) => {
    yozuvchi.tugat();
    el.style.transform = asos + 'translate3d(' + x + 'px,' + y + 'px,0)';
    el.style.opacity = String(o);
  };
  const tozala = () => { yozuvchi.tugat(); el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; };

  el.addEventListener('pointerdown', (e) => {
    if(e.button) return;
    bosildi = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; oq = null;
    oVaqt = hozir(); oX = e.clientX; oY = e.clientY; vx = vy = 0;
    el.classList.add('surilmoqda');
    el.style.transition = 'none';
    try{ el.setPointerCapture(e.pointerId); }catch(err){}
    if(opt.toxtat) opt.toxtat();
  });

  el.addEventListener('pointermove', (e) => {
    if(!bosildi) return;
    const X = e.clientX - sx, Y = e.clientY - sy;
    if(!oq){
      if(Math.abs(X) < 5 && Math.abs(Y) < 5) return;
      oq = Math.abs(X) > Math.abs(Y) ? 'x' : 'y';
    }
    /* Oniy tezlik (px/ms), yengil silliqlash bilan */
    const t = hozir(), dt = Math.max(8, t - oVaqt);
    vx = 0.6 * ((e.clientX - oX) / dt) + 0.4 * vx;
    vy = 0.6 * ((e.clientY - oY) / dt) + 0.4 * vy;
    oVaqt = t; oX = e.clientX; oY = e.clientY;
    if(oq === 'x'){ dx = X; dy = 0; }
    else {
      dx = 0;
      const togri = past ? (Y > 0) : (Y < 0);
      dy = togri ? Y : Y * 0.16;
    }
    const tik = past ? Math.max(0, dy) : Math.max(0, -dy);
    const o = Math.max(0.15, 1 - Math.abs(dx) / (en() * 0.9) - tik / 130);
    qoy(dx, dy, o);
  });

  const tugadi = () => {
    if(!bosildi) return;
    bosildi = false;
    el.classList.remove('surilmoqda');
    /* Barmoq uzilgandan beri ko'p vaqt o'tgan bo'lsa (to'xtab turgan
       edi) — tezlikni hisobga olmaymiz. */
    if(hozir() - oVaqt > 120){ vx = 0; vy = 0; }
    const tik = past ? dy : -dy;
    const tikTez = past ? vy : -vy;
    const ketsin = (oq === 'x' && (Math.abs(dx) > en() * 0.28 || (Math.abs(vx) > 0.35 && Math.abs(dx) > 12)))
                || (oq === 'y' && (tik > 42 || (tikTez > 0.3 && tik > 8)));
    if(ketsin){
      const hx = oq === 'x' ? (dx > 0 ? en() + 90 : -(en() + 90)) : 0;
      const hy = oq === 'x' ? 0 : (past ? 240 : -240);
      yozuvchi.tugat();
      el.style.transition = 'transform .22s cubic-bezier(.3,0,.7,.4), opacity .2s linear';
      qoyDarhol(hx, hy, 0);
      setTimeout(() => { if(opt.yopish) opt.yopish(true); }, 195);
      return;
    }
    yozuvchi.tugat();
    el.style.transition = 'transform .34s cubic-bezier(.2,.9,.28,1.25), opacity .2s ease';
    qoyDarhol(0, 0, 1);
    setTimeout(tozala, 360);
    if(opt.davom) opt.davom();
  };
  el.addEventListener('pointerup', tugadi);
  el.addEventListener('pointercancel', tugadi);
  el.addEventListener('lostpointercapture', tugadi);

  /* Bosish (click) va surishni ajratish uchun */
  el.surilganmi = () => (Math.abs(dx) > 6 || Math.abs(dy) > 6);
  /* Sinov uchun: oxirgi surish holati (dasturga ta'sir qilmaydi) */
  el.surishHolati = () => ({ dx: dx, dy: dy, oq: oq, vx: vx, vy: vy });
  return el;
}

/* ==================================================================
   KADRGA MOSLANGAN YOZUVCHI (V133)
   ------------------------------------------------------------------
   NEGA KERAK. Barmoq harakati haqida brauzer soniyasiga 120 martagacha
   xabar beradi (ba'zi telefonlarda 240 marta), ekran esa odatda
   soniyasiga 60 marta yangilanadi. Ya'ni bitta kadr ichida uslub
   2-4 marta yozilardi — ortiqcha ish, va aynan shu "qotgandek"
   tuyulishga olib kelardi.

   Bu yordamchi yozuvni KADRGA BITTAGA tenglashtiradi: xabarlar faqat
   qiymatni eslab qo'yadi, yozuv esa `requestAnimationFrame` ichida,
   ekran yangilanishidan sal oldin bajariladi. Natijada harakat
   barmoq ortidan silliq ergashadi.
   ================================================================== */
function kadrYozuvchi(el){
  let kadr = 0, kutayotgan = null;
  const yoz = ()=>{
    kadr = 0;
    if(!kutayotgan) return;
    const q = kutayotgan; kutayotgan = null;
    if(q.transform !== undefined) el.style.transform = q.transform;
    if(q.opacity !== undefined) el.style.opacity = q.opacity;
  };
  return {
    /* Kadr navbatiga qo'yadi */
    qoy(transform, opacity){
      kutayotgan = kutayotgan || {};
      if(transform !== undefined) kutayotgan.transform = transform;
      if(opacity !== undefined) kutayotgan.opacity = opacity;
      if(!kadr) kadr = requestAnimationFrame(yoz);
    },
    /* Barmoq uzilganda: kutayotgani darhol yoziladi va navbat
       bo'shatiladi — aks holda o'tish boshlangach eski qiymat
       yozilib, element "sakrab" ketardi. */
    tugat(){
      if(kadr){ cancelAnimationFrame(kadr); kadr = 0; }
      yoz();
    }
  };
}

/* ---------- Toast ---------- */
const ICO_OK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#3DD68C" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg>';
const ICO_BAD = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#FF8A87" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg>';
const ICO_INFO = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#8FB4FF" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5.5M12 7.8v.4"></path></svg>';
function toast(matn, turi){
  const box = $('#toasts'); if(!box) return;
  /* Bir vaqtda 3 tadan ko'p turmasin — ekran to'lib ketmasin */
  while(box.children.length >= 3) box.firstElementChild.remove();
  const el = document.createElement('div');
  el.className = 'toast toast-' + (turi || 'ok');
  el.innerHTML = '<span class="toast-ic">' +
      (turi === 'bad' ? ICO_BAD : turi === 'info' ? ICO_INFO : ICO_OK) + '</span>' +
      '<span>' + esc(matn) + '</span>';
  box.appendChild(el);

  let timer = setTimeout(yop, 3200);
  function yop(){
    clearTimeout(timer);
    if(!el.isConnected) return;
    el.classList.add('out');
    setTimeout(()=> el.remove(), 260);
  }
  /* Pastdagi bildirishnoma: pastga yoki yonga surib yuborish mumkin */
  surishBogla(el, {
    yon: 'past',
    toxtat: ()=> clearTimeout(timer),
    davom:  ()=> { timer = setTimeout(yop, 2200); },
    yopish: ()=> el.remove()
  });
  el.addEventListener('click', ()=>{ if(!el.surilganmi()) yop(); });
  try{ if(navigator.vibrate) navigator.vibrate(turi==='bad' ? [12,60,12] : 10); }catch(e){}
}


/* ==================================================================
   TEPADAN TUSHADIGAN BILDIRISHNOMA (Telegramdagi kabi)
   Bazaga yangi raqam qo'shilganda tepadan sirg'alib tushadi, yumshoq
   ovoz chaladi va 4 soniyadan keyin o'zi ketadi. Mijoz uni kutmasdan
   yuqoriga yoki yonga surib yuborishi ham mumkin; ustiga bossa —
   o'sha raqam oynasi ochiladi.
   ================================================================== */
/* Uchqun — "yangi narsa paydo bo'ldi" degan zamonaviy belgi
   (qo'ng'iroqdan ko'ra ixchamroq va chiroyliroq). */
const ICO_BELL = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l1.55 4.9 4.9 1.55-4.9 1.55L12 15.5l-1.55-4.9-4.9-1.55 4.9-1.55L12 2.6z"></path><path d="M18.6 14.2l.72 2.28 2.28.72-2.28.72-.72 2.28-.72-2.28-2.28-.72 2.28-.72.72-2.28z" opacity=".72"></path><path d="M5.6 15.6l.52 1.64 1.64.52-1.64.52-.52 1.64-.52-1.64L3.44 18.28l1.64-.52.52-1.64z" opacity=".5"></path></svg>';
const ICO_XS = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>';

/* Yumshoq "ding" ovozi — fayl kerak emas, brauzerning o'zi chaladi.
   Brauzerlar foydalanuvchi saytga TEGMAGUNCHA ovozga ruxsat bermaydi,
   shu sabab birinchi teginishda audio "uyg'otiladi". */
let __ac = null, __acReady = false;
function ovozniUygot(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    if(!__ac) __ac = new AC();
    if(__ac.state === 'suspended') __ac.resume().then(()=>{ __acReady = true; }).catch(()=>{});
    else __acReady = true;
  }catch(e){}
}
['pointerdown','touchstart','keydown'].forEach(ev =>
  document.addEventListener(ev, ovozniUygot, { once:true, passive:true }));

function bildirishnomaOvozi(){
  try{
    if(!__ac || !__acReady || __ac.state !== 'running') return;
    const t = __ac.currentTime;
    const g = __ac.createGain();
    g.connect(__ac.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
    [[880, 0], [1318.5, 0.085]].forEach(([f, d]) => {
      const o = __ac.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      o.connect(g); o.start(t + d); o.stop(t + d + 0.45);
    });
  }catch(e){}
}

/** Tepadan bildirishnoma ko'rsatadi. item — raqam obyekti (ixtiyoriy). */
function tgNote(sarlavha, item){
  const box = $('#tgnotes'); if(!box) return;
  /* Bir vaqtda ko'pi bilan 2 ta — ekran to'lib ketmasin */
  while(box.children.length >= 2) box.firstElementChild.remove();

  const kn = item ? kartaNarx(item) : null;
  const narx = item ? (kn.bolib ? kn.ins : (formatPrice(item.price) + ' ' + UNIT(item))) : '';
  const el = document.createElement('div');
  el.className = 'tgnote';
  el.innerHTML =
    '<span class="tgn-ic">' + ICO_BELL + '</span>' +
    '<span class="tgn-b">' +
      '<span class="tgn-t">' + esc(sarlavha) + '</span>' +
      (item ? '<div class="tgn-n sg">' + esc(shortNumber(item.number)) + '</div>' : '') +
      (item ? '<div class="tgn-s"><b>' + esc(narx) + '</b>' +
              (item.operator ? ' · ' + esc(item.operator) : '') + '</div>' : '') +
    '</span>' +
    '<span class="tgn-x">' + ICO_XS + '</span>' +
    '<i class="tgn-p"></i>';
  box.appendChild(el);
  bildirishnomaOvozi();
  haptic('ok');

  let timer = setTimeout(close, 4000);
  function close(){
    clearTimeout(timer);
    el.classList.add('out');
    setTimeout(()=> el.remove(), 280);
  }

  /* Barmoq bilan surib yuborish: yonga sursa yonga, yuqoriga sursa
     yuqoriga (umumiy yordamchi — butun saytda bir xil his). */
  surishBogla(el, {
    yon: 'tepa',
    toxtat: ()=>{ clearTimeout(timer); const p = el.querySelector('.tgn-p'); if(p) p.style.animationPlayState = 'paused'; },
    davom:  ()=>{ timer = setTimeout(close, 2500); const p = el.querySelector('.tgn-p'); if(p) p.style.animationPlayState = ''; },
    yopish: ()=> el.remove()
  });

  el.addEventListener('click', (e)=>{
    if(el.surilganmi()) return;                            /* surish edi, bosish emas */
    if(e.target.closest('.tgn-x')){ close(); return; }
    close();
    if(item && item.id) setTimeout(()=> openDetail(item.id), 120);
  });
}

/* ==================================================================
   NUSXA OLISH — uchta usul ketma-ket sinaladi, biri ishlashi shart:
     1. Telegram ilovasi ichida bo'lsa — uning o'z buferi
     2. Zamonaviy brauzer — navigator.clipboard
     3. Eski usul — yashirin maydon + execCommand('copy')
   Qaysi biri ishlasa ham mijozga "Raqam nusxalandi" xabari chiqadi.
   ================================================================== */
function nusxaOl(txt, xabar){
  const ok = ()=>{
    haptic('ok');
    toast(xabar || (LANG==='ru' ? 'Номер скопирован' : 'Raqam nusxalandi'), 'ok');
  };
  const xato = ()=>{
    /* Hech biri ishlamasa — matnni belgilab beramiz, mijoz o'zi
       "Nusxa olish" ni bosadi (brauzerning o'z menyusi orqali). */
    try{
      const d = document.createElement('div');
      d.setAttribute('data-nusxa','1');   /* nusxa qalqoniga istisno */
      d.textContent = txt;
      d.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;'
        + 'padding:14px 18px;border-radius:14px;font-size:19px;font-weight:700;'
        + 'background:var(--card);color:var(--ink);box-shadow:var(--sh-2);user-select:text;-webkit-user-select:text';
      document.body.appendChild(d);
      const r = document.createRange(); r.selectNodeContents(d);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      toast(LANG==='ru' ? 'Выделено — нажмите «Копировать»' : 'Belgilandi — «Nusxa olish» ni bosing', 'info');
      setTimeout(()=> d.remove(), 6000);
    }catch(e){}
  };
  /* 1 — Telegram */
  try{
    const tg = window.Telegram && window.Telegram.WebApp;
    if(tg && typeof tg.writeTextToClipboard === 'function'){ tg.writeTextToClipboard(txt); ok(); return; }
  }catch(e){}
  /* 2 — zamonaviy brauzer */
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(ok).catch(()=>{ nusxaZaxira(txt) ? ok() : xato(); });
      return;
    }
  }catch(e){}
  /* 3 — eski usul */
  nusxaZaxira(txt) ? ok() : xato();
}

/* Clipboard API ishlamasa (eski brauzer yoki HTTPS emas) — zaxira usul */
function nusxaZaxira(txt){
  try{
    const ta = document.createElement('textarea');
    ta.setAttribute('data-nusxa','1');   /* nusxa qalqoniga istisno */
    ta.value = txt; ta.setAttribute('readonly','');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, 99999);
    window.__nusxaRuxsat = 1;            /* o'z tugmamiz — ruxsat */
    const ok = document.execCommand('copy');
    window.__nusxaRuxsat = 0;
    ta.remove();
    return ok;
  }catch(e){ return false; }
}

/* ---------- Sheet ---------- */
let sheetStack = [];
function openSheet(id){
  const el = document.getElementById(id); if(!el) return;
  el.classList.remove('closing');
  /* V137: og'ir ish bir kadrga to'planib qolmasin — izohi uslublarda
     (`.sheet.tayyorlanyapti`). Panel ko'rinadi, lekin animatsiya
     keyingi kadrdan boshlanadi. */
  el.classList.add('tayyorlanyapti');
  el.classList.add('on');
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{ el.classList.remove('tayyorlanyapti'); });
  });
  /* Oyna ustiga oyna ochilsa (masalan bo'lib to'lash ro'yxatidan
     "Batafsil") — yangi oyna har doim YUQORIDA turishi kerak. DOM
     tartibiga tayanib bo'lmaydi, shu sabab qatlam raqami beriladi. */
  el.style.zIndex = String(100 + sheetStack.length);
  /* Oyna ochilganda tepadagi push bildirishnomasi yo'q bo'lsin */
  try{ if(typeof pushniYop === 'function') pushniYop(); }catch(e){}
  try{ if(typeof PUSH !== 'undefined' && PUSH.taklifYop) PUSH.taklifYop(false); }catch(e){}
  document.body.classList.add('noscroll');
  haptic('light');
  setTimeout(()=>{ if(typeof upperAll === 'function') upperAll(el); }, 0);
  if(!sheetStack.includes(id)) sheetStack.push(id);
}
/* ==================================================================
   OYNA TUGMASINI TELEGRAM TUGMASIGA KO'CHIRISH (V149)
   ------------------------------------------------------------------
   Mini ilova ichida oynaning pastidagi asosiy tugma (masalan "Davom
   etish", "Buyurtmani tasdiqlash") Telegram'ning O'Z tugmasiga
   ko'chiriladi, saytdagi nusxasi esa yashiriladi.

   NEGA bu yaxshi:
     * Telegram tugmasi ekranning eng pastida, klaviatura ustida
       turadi — yozayotganda ustiga chiqib qolmaydi;
     * sahifa aylantirilganda ham joyida qoladi;
     * mijozga ilova "haqiqiy Telegram ilovasi"dek tuyuladi.

   MANTIQ TAKRORLANMAYDI: Telegram tugmasi bosilganda saytdagi
   tugmaning O'ZI bosiladi (`click()`). Ya'ni buyurtma mantig'i bitta
   joyda qoladi va ikkisi hech qachon bir-biridan farq qilmaydi.

   Telegramdan tashqarida bu funksiya hech narsa qilmaydi. */
function tgOynaTugmasi(footSelector){
  if(!tgIchida() || !TG.bor()) return;
  try{
    const foot = document.querySelector(footSelector);
    if(!foot){ TG.tugmaYop(); return; }
    /* Faqat ASOSIY tugma ko'chiriladi (`.btn`, lekin "ghost" emas) */
    const btn = foot.querySelector('.btn:not(.ghost)');
    if(!btn || btn.disabled){ TG.tugmaYop(); foot.classList.remove('tg-yashir'); return; }
    const matn = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    const ok = TG.tugma(matn, ()=>{
      const jonli = document.querySelector(footSelector + ' .btn:not(.ghost)');
      if(jonli && !jonli.disabled) jonli.click();
    });
    /* Telegram tugmasi chiqqandagina saytdagisini yashiramiz */
    foot.classList.toggle('tg-yashir', !!ok);
  }catch(e){}
}

function closeSheet(id){
  const el = id ? document.getElementById(id) : document.getElementById(sheetStack[sheetStack.length-1]);
  if(!el) return;
  el.classList.add('closing');
  /* 240 -> 210 ms: yopilish animatsiyasi ham qisqartirildi (0,2 s),
     shu sabab kutish ham qisqardi — oyna "osilib" turmaydi (V121). */
  setTimeout(()=>{
    el.classList.remove('on','closing','tayyorlanyapti');
    el.style.zIndex = '';
    sheetStack = sheetStack.filter(s => s !== el.id);
    if(!sheetStack.length) document.body.classList.remove('noscroll');
    /* V149: oyna yopilgach Telegram tugmasi ham olib tashlanadi,
       aks holda u ekranda osilib qolardi. */
    try{ TG.tugmaYop(); document.querySelectorAll('.tg-yashir').forEach(f=>f.classList.remove('tg-yashir')); }catch(e){}
  }, 210);
}
document.addEventListener('click', (e)=>{
  const c = e.target.closest('[data-close]');
  if(c){ const sh = c.closest('.sheet'); if(sh){ e.preventDefault(); closeSheet(sh.id); } }
});
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && sheetStack.length) closeSheet(); });

/* ---------- Mavzu: FAQAT tungi ----------
   Mijoz so'roviga ko'ra yorug' mavzu va uni almashtirish tugmasi olib
   tashlandi. Quyidagi funksiyalar saqlanib qoldi (boshqa joylarda
   chaqiriladi va testlar ham ishlatadi), lekin endi doim tungi fon
   qo'yiladi — eski saqlangan tanlov ham e'tiborga olinmaydi. */
function themeNow(){ return 'dark'; }
function applyTheme(){
  document.documentElement.setAttribute('data-theme', 'dark');
  const mt = document.querySelector('meta[name="theme-color"]');
  if(mt) mt.setAttribute('content', '#0A1326');   /* V161: fon rangi bilan bir xil */
}
function setTheme(){ applyTheme(); }

/* ==================================================================
   YUMSHOQ TEBRANISH (haptic)
   ------------------------------------------------------------------
   NEGA ILGARI KO'P JOYDA ISHLAMAGAN — uchta sabab bor edi:

   1) BRAUZER RUXSATI. Chrome `navigator.vibrate()` ni sahifa bilan
      HECH QANDAY muloqot bo'lmaguncha jimgina rad etadi. Birinchi
      bosishda shu sabab hech narsa sezilmaydi. Endi birinchi
      tegishda "qulf" ochiladi (vibrate(0)) va keyin hammasi ishlaydi.

   2) IPHONE. Safari'da Vibration API UMUMAN yo'q — shu sabab
      iPhone'da tebranish hech qachon bo'lmagan. Yechim: iOS 17.4+
      da `<input type="checkbox" switch>` ni bosish TIZIM haptikasini
      beradi. Ko'rinmas shunday element qo'yildi va kerak bo'lganda
      "bosiladi" — natijada iPhone ham haqiqiy "tiq" beradi.

   3) TIZIM SOZLAMASI. Telefonning o'zida "Tegishdagi tebranish"
      o'chirilgan bo'lsa — hech bir sayt tebranmaydi. Bu brauzerdan
      boshqarilmaydi (mijozga aytib qo'yish kerak).

   Tebranish juda qisqa (6-14 ms) — "tiq" sezgisi, titroq emas.
   ================================================================== */
let HAPTIC_OFF = false;          /* mijoz o'chirsa (kelajak uchun) */
let hapOchildi = false;          /* brauzer qulfi ochildimi */
let hapOxirgi = 0;               /* ketma-ket takrorlanishdan saqlaydi */

const HAP_IOS = (()=>{ try{
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}catch(e){ return false; } })();

/* iPhone uchun ko'rinmas "switch" — uni bosish tizim haptikasini beradi */
let hapLabel = null;
function hapIosTayyorla(){
  if(!HAP_IOS || hapLabel) return;
  try{
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.setAttribute('switch', '');
    inp.id = 'hapSw';
    inp.tabIndex = -1;
    inp.setAttribute('aria-hidden', 'true');
    const lb = document.createElement('label');
    lb.setAttribute('for', 'hapSw');
    lb.setAttribute('aria-hidden', 'true');
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none';
    box.appendChild(inp); box.appendChild(lb);
    (document.body || document.documentElement).appendChild(box);
    hapLabel = lb;
  }catch(e){}
}

/* Birinchi tegishda brauzer qulfini ochamiz */
function hapQulfniOch(){
  if(hapOchildi) return;
  hapOchildi = true;
  hapIosTayyorla();
  try{ if(navigator.vibrate) navigator.vibrate(0); }catch(e){}
}
['pointerdown','touchstart','keydown'].forEach(ev =>
  addEventListener(ev, hapQulfniOch, { once:true, passive:true, capture:true }));

function haptic(kind){
  if(HAPTIC_OFF) return;
  /* 45 ms ichida ikkinchi marta chaqirilsa — o'tkazib yuboramiz
     (masalan pointerdown + click bir joyda ikki marta chaqirsa) */
  const now = Date.now();
  if(now - hapOxirgi < 45) return;
  hapOxirgi = now;

  /* 1. Telegram ilovasi ichida — o'zining haptikasi (eng yaxshisi) */
  try{
    const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback;
    if(tg){
      if(kind === 'ok' || kind === 'bad' || kind === 'warn')
        tg.notificationOccurred(kind === 'ok' ? 'success' : kind === 'bad' ? 'error' : 'warning');
      else if(kind === 'select') tg.selectionChanged();
      else tg.impactOccurred(kind === 'medium' ? 'medium' : 'light');
      return;
    }
  }catch(e){}

  /* 2. Native ilova (Capacitor) — qobiq o'zi ulanadi (native-shell.js),
        u window.__nativeHaptic ni belgilaydi. */
  try{
    if(typeof window.__nativeHaptic === 'function'){ window.__nativeHaptic(kind); return; }
  }catch(e){}

  /* 3. Android/Chrome — Vibration API */
  try{
    if(navigator.vibrate){
      const P = { light:[7], select:[6], medium:[13], ok:[9,38,14], bad:[20,55,20], warn:[14,46,14] };
      if(navigator.vibrate(P[kind] || P.light)) return;
    }
  }catch(e){}

  /* 4. iPhone — ko'rinmas switch orqali tizim haptikasi */
  try{
    if(HAP_IOS){
      if(!hapLabel) hapIosTayyorla();
      if(hapLabel) hapLabel.click();
    }
  }catch(e){}
}
applyTheme(themeNow());

/* ---------- Marshrut ---------- */
const ROUTES = { '':'home', '/':'home', '/kirish':'orders', '/katalog':'catalog', '/sevimlilar':'fav', '/buyurtmalarim':'orders', '/shartnoma':'contract', '/profil':'more', '/yana':'more' };
const ROUTE_HASH = { home:'#/', catalog:'#/katalog', fav:'#/sevimlilar', orders:'#/buyurtmalarim', contract:'#/shartnoma', more:'#/profil' };
let currentRoute = 'home';
const go = (r) => { location.hash = ROUTE_HASH[r] || '#/'; };
/* ==================================================================
   MENYU BOSILGANDA (V142) — JAVOB DARHOL, OG'IR ISH KEYINGI KADRDA
   ------------------------------------------------------------------
   MUAMMO (mijoz aytgan): "menyular bosilganda tez ishlasin, juda tez,
   yumshoq ishlasin".

   O'LCHOV NIMA KO'RSATDI (6 barobar sekin protsessor):
       menyuni bosishdan ekran ko'rinishigacha  —  53...83 ms
       24 ms dan uzun kadrlar                   —  har bosishda 1...4 ta

   SABABI. Bir marta bosilganda QUYIDAGILARNING HAMMASI BITTA ishda,
   ketma-ket bajarilardi:
       1) sahifani tepaga ko'tarish,
       2) eski bo'limni yashirib, yangisini ko'rsatish (butun
          daraxtning uslubi qayta hisoblanadi),
       3) VA DARHOL o'sha bo'limning to'liq ro'yxatini chizish
          (katalogda 15-40 ta kartochka, sevimlilarda shunga yaqin).
   Brauzer esa bitta ishning O'RTASIDA ekranga hech narsa chiqarmaydi.
   Ya'ni mijoz barmog'ini uzgandan keyin 3-banddagi og'ir ish
   tugamaguncha EKRAN O'ZGARMAY TURARDI — aynan shu "qotish" hissi.

   YECHIM — ishni IKKIGA BO'LISH:
       * 1 va 2-band DARHOL bajariladi → brauzer yangi bo'limni
         SHU ZAHOTI chiqaradi (eski ro'yxat hali ko'rinib turadi,
         ya'ni bo'sh ekran chaqnamaydi);
       * 3-band esa EKRANGA CHIQQANDAN KEYINGI kadrda bajariladi.

   Ikki marta `requestAnimationFrame` aynan shuning uchun: birinchisi
   joriy kadrning oxirida, ikkinchisi KEYINGI kadrning boshida
   ishlaydi — ya'ni orada brauzer bir marta chizib ulguradi. (Shu
   usul `openSheet` da ham qo'llanilgan.)

   NATIJA: bosishga javob ~16-20 ms ga tushadi, ro'yxat esa bir kadr
   keyin yangilanadi — ko'z buni "darhol ochildi" deb o'qiydi.

   MUHIM NOZIK JOY: bir necha bo'lim tez-tez bosilsa, faqat ENG
   OXIRGISINING ishi bajariladi (`ekranNavbat`) — aks holda mijoz
   uchta menyuni ketma-ket bossa, uchala ro'yxat ham chizilib,
   tezlik yana yo'qolardi. */
let ekranKadr = 0, ekranNavbat = '';
function ekranIshiniBajar(){
  ekranKadr = 0;
  const r = ekranNavbat; ekranNavbat = '';
  if(!r) return;
  /* Kapsula ham shu yerda suriladi: u `getBoundingClientRect` o'qiydi,
     ya'ni joylashuv hisobini majburlaydi — bosish kadrida emas,
     shu yerda bo'lgani ma'qul. */
  if(typeof moveNavPill === 'function') moveNavPill();
  if(r === 'fav') renderFavorites();
  /* V124: kabinet O'ZI ochiladi. Ilgari mijoz bu bo'limga har kirganda
     telefon raqami va oxirgi 4 ta raqamni QAYTA yozishi kerak edi —
     "kabinet" uchun bu noto'g'ri: kabinet o'zi ochilishi kerak. */
  if(r === 'orders') kabAvtoOch();
  if(r === 'catalog'){ reshuffle(); catShown = PAGE_SIZE; renderCatalog(); }
  if(r === 'home') pickHome();
}
function ekranIshiniRejalashtir(r){
  ekranNavbat = r;
  if(ekranKadr) return;                 /* allaqachon navbatda */
  ekranKadr = requestAnimationFrame(()=>{
    requestAnimationFrame(ekranIshiniBajar);
  });
}

function renderRoute(keepScroll){
  const r = ROUTES[location.hash.replace(/^#/,'')] || 'home';
  if(r !== 'fav') FAV_EDIT = false;
  currentRoute = r;
  /* Sahifani tepaga ko'tarish ANIMATSIYADAN OLDIN bajariladi — aks holda
     yangi bo'lim ochilayotganda ekran "sakrab" tushardi. */
  if(!keepScroll) window.scrollTo(0,0);
  $$('.screen').forEach(s => s.classList.toggle('on', s.dataset.route === r));
  const navKey = (r === 'orders' || r === 'contract') ? 'more' : r;
  $$('#nav a, .dh-nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === navKey));
  /* Og'ir ish — ekranga chiqqandan keyin (yuqoridagi izohga qarang) */
  ekranIshiniRejalashtir(r);
}
window.addEventListener('hashchange', ()=> renderRoute());
document.addEventListener('click', (e)=>{
  const g = e.target.closest('[data-go]');
  if(g){ e.preventDefault(); go(g.dataset.go); }
});

/* ---------- Sevimlilar ---------- */
function loadFavorites(){ try{ FAVORITES = JSON.parse(localStorage.getItem('vip_favorites')||'[]')||[]; }catch(e){ FAVORITES=[]; } loadFavItems(); updateFavBadge(); }
function saveFavorites(){ try{ localStorage.setItem('vip_favorites', JSON.stringify(FAVORITES)); }catch(e){} updateFavBadge(); }
const isFav = (id) => FAVORITES.indexOf(id) !== -1;
/* Jonli (serverdan kelgan) raqamlar bazamizda yo'q — shuning uchun
   sevimliga qo'shilganda raqamning o'zi ham saqlab qo'yiladi. */
let FAV_ITEMS = {};
let FAV_EDIT = false;   /* sevimlilarda "o'chirish" rejimi */
function loadFavItems(){ try{ FAV_ITEMS = JSON.parse(localStorage.getItem('vip_fav_items')||'{}')||{}; }catch(e){ FAV_ITEMS={}; } }
function saveFavItems(){ try{ localStorage.setItem('vip_fav_items', JSON.stringify(FAV_ITEMS)); }catch(e){} }
function favSnapshot(id){
  let it = null;
  try{ it = (typeof findItem === 'function') ? findItem(id) : null; }catch(e){}
  if(!it) return;
  FAV_ITEMS[id] = {
    id: it.id, number: it.number, operator: it.operator || '',
    price: it.price || 0, oldPrice: it.oldPrice || 0,
    installment: !!it.installment, featured: !!it.featured,
    reserved: !!it.reserved, live: !!it.live,
    dealMonthly6: it.dealMonthly6, dealMonthly12: it.dealMonthly12, dealMonthly24: it.dealMonthly24,
    dailyDeal: !!it.dailyDeal, monthly6: it.monthly6, monthly12: it.monthly12, monthly24: it.monthly24
  };
  saveFavItems();
}
function favItem(id){
  let it = null;
  try{ it = (typeof NUMBERS !== 'undefined') ? NUMBERS.find(n => n.id === id) : null; }catch(e){}
  return it || FAV_ITEMS[id] || null;
}
function toggleFav(id){
  if(!id) return false;
  const i = FAVORITES.indexOf(id);
  if(i === -1){ FAVORITES.push(id); favSnapshot(id); saveFavorites(); return true; }
  FAVORITES.splice(i,1); delete FAV_ITEMS[id]; saveFavItems(); saveFavorites(); return false;
}
/* Sevimlilar SONI endi hech qayerda ko'rsatilmaydi (mijoz so'rovi).
   Avval pastki menyudagi yurakcha ustida son turardi va u SAQLANGAN
   ID'lar sonini sanardi — ro'yxatning o'zi esa faqat MA'LUMOTI BOR
   raqamlarni ko'rsatardi. Sotilgan/o'chirilgan raqam qolib ketsa,
   "Sevimlilar bo'sh" yozilib turib, menyuda "5" chiqardi. Ikkita
   manbaning biri olib tashlandi — endi bunday nomuvofiqlik yo'q.
   Funksiya o'rnida qoldi: uni chaqiradigan joylar ko'p, ustiga
   eski brauzerda sahifada qolib ketgan belgini yashiradi. */
function updateFavBadge(){
  ['#navFavBadge','#dhFavBadge','#profFavBadge'].forEach(sel => {
    const b = $(sel); if(b) b.style.display = 'none';
  });
}

/* ---------- Sevimlilarni tozalash ----------
   Katalog YUKLANGANDAN KEYIN chaqiriladi. Ikki ish qiladi:
     1. Na katalogda, na zaxira nusxada bo'lgan ID'ni o'chiradi —
        bunday raqam ro'yxatda hech qachon ko'rinmaydi, faqat
        xotirani band qilib yotadi.
     2. Sevimlilardan chiqarilgan raqamlarning zaxira nusxasini
        o'chiradi (localStorage behuda to'lib ketmasin).
   Katalog yuklanmagan bo'lsa (internet uzilgan) — HECH NARSA
   o'chirilmaydi, aks holda mijozning sevimlilari yo'qolardi. */
function favTozala(){
  try{
    if(typeof NUMBERS === 'undefined' || !NUMBERS.length) return;
    const bor = new Map(NUMBERS.map(n => [n.id, n]));
    /* Zaxira nusxani YANGILAYMIZ: narx tushgan yoki raqam band
       bo'lgan bo'lsa, Sevimlilarda eski ma'lumot turib qolmasin. */
    FAVORITES.forEach(id => { if(bor.has(id)) favSnapshot(id); });
    const oldin = FAVORITES.length;
    FAVORITES = FAVORITES.filter(id => bor.has(id) || FAV_ITEMS[id]);
    const qoldi = new Set(FAVORITES);
    let tozalandi = false;
    Object.keys(FAV_ITEMS).forEach(id => { if(!qoldi.has(id)){ delete FAV_ITEMS[id]; tozalandi = true; } });
    if(tozalandi) saveFavItems();
    if(FAVORITES.length !== oldin){
      saveFavorites();
      if(currentRoute === 'fav' && typeof renderFavorites === 'function') renderFavorites();
    }
  }catch(e){}
}

/* ================= ANALITIKA =================
   Ikki qatlam:
   1) Yandex Metrika — umumiy tashriflar, qaysi sahifa, qayerdan kelgan.
      BEPUL va O'zbekistonda eng ishonchli ishlaydi (Google Analytics'dan
      farqli, bu yerda tezroq yuklanadi).
   2) Ichki hisoblagich — qaysi RAQAM ko'p ko'rilgan/bosilgan va qaysi
      qidiruv natija bermagan. Bu ma'lumot admin panelda ko'rinadi va
      "qaysi raqamni oldinga chiqarish kerak", "qanaqa raqam yetishmayapti"
      degan savollarga javob beradi.

   MUHIM: hech qanday shaxsiy ma'lumot yuborilmaydi. Hodisalar brauzerda
   yig'iladi va 30 soniyada bir marta (yoki sahifa yopilganda) BITTA
   so'rovda jo'natiladi — shu sabab sayt sekinlashmaydi. */
const TRACK_URL = FN + 'api-track';
let TRACK_Q = [];
let trackTimer = null;

function trackFlush(useBeacon){
  if(!TRACK_Q.length) return;
  const payload = JSON.stringify({ events: TRACK_Q.slice(0, 60) });
  TRACK_Q = [];
  try{
    /* sahifa yopilayotganda oddiy fetch bekor qilinadi — sendBeacon esa
       brauzer tomonidan oxirigacha yuboriladi */
    if(useBeacon && navigator.sendBeacon){
      navigator.sendBeacon(TRACK_URL, new Blob([payload], { type:'application/json' }));
      return;
    }
    fetch(TRACK_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:payload, keepalive:true }).catch(()=>{});
  }catch(e){}
}
function trackPush(ev){
  if(location.protocol === 'file:') return;      /* mahalliy sinovda yubormaymiz */
  TRACK_Q.push(ev);
  if(TRACK_Q.length >= 40){ trackFlush(false); return; }
  clearTimeout(trackTimer);
  trackTimer = setTimeout(()=> trackFlush(false), 30000);
}

/* Yandex Metrika hodisasi (maqsadlar) + ichki hisoblagich */
function track(name, params){
  try{ if(window.ym && window.YM_ID) window.ym(window.YM_ID, 'reachGoal', name, params || {}); }catch(e){}
}
/* Raqam ko'rildi (ro'yxatda ko'rindi emas — OCHILDI) */
function trackNumView(item){
  if(!item || !item.id) return;
  trackPush({ t:'view', id:item.id, n:item.number });
  track('raqam_ochildi');
}
/* "Batafsil" bosildi */
function trackNumClick(item){
  if(!item || !item.id) return;
  trackPush({ t:'click', id:item.id, n:item.number });
}
/* Buyurtma berildi */
function trackNumOrder(item){
  if(!item || !item.id) return;
  trackPush({ t:'order', id:item.id, n:item.number });
  track('buyurtma_berildi');
  trackFlush(false);
}
/* BUYURTMA YO'LI (V119) — mijoz qayerda to'xtab qolganini bilish uchun.
   Ilgari faqat uchta nuqta sanalardi: raqam ochildi -> batafsil bosildi
   -> buyurtma berildi. Oradagi ikki qadam ko'rinmasdi, ya'ni "formani
   ochdi-yu, yubormadi" bilan "formani umuman ochmadi" farqlanmasdi —
   dizayn haqidagi har qanday qaror taxminga asoslanardi.
   Endi besh qadam: ochildi -> batafsil -> FORMA -> URINISH -> buyurtma,
   ustiga XATO (yuborish ishlamagani) ham alohida sanaladi. */
function trackQadam(qadam, item){
  const e = { t: qadam };
  if(item && item.id){ e.id = item.id; if(item.number) e.n = item.number; }
  trackPush(e);
}
/* Buyurtma formasi ochildi */
function trackFormaOchildi(item){ trackQadam('forma', item); }
/* "Yuborish" bosildi (natija hali noma'lum) */
function trackYuborishUrinishi(item){ trackQadam('urinish', item); }
/* Yuborish muvaffaqiyatsiz tugadi — bu RAQAM YO'QOTILISHI degani */
function trackYuborishXatosi(item){ trackQadam('xato', item); trackFlush(false); }

/* Qidiruv natija bermadi — ENG QIMMATLI ma'lumot: mijoz nimani
   qidiryapti-yu, bizda yo'q */
function trackMiss(q){
  const s = String(q||'').replace(/[^0-9*]/g,'');
  if(s.length < 2) return;
  trackPush({ t:'miss', q:s });
  track('qidiruv_natijasiz');
}
window.addEventListener('pagehide', ()=> trackFlush(true));
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') trackFlush(true); });



/* ===== 2-qism (avvalgi index.html, 5007-satr) ===== */

'use strict';

/* ==================================================================
   MA'LUMOT YUKLASH
   ================================================================== */
/* ---------- IXCHAM INDEKS ----------
   Katalog endi Firestore'dan to'g'ridan-to'g'ri emas, /api-index
   orqali keladi: butun baza bitta qadoqlangan satrda, Netlify CDN'ida
   keshlangan holda. Bitta raqam ~319 bayt o'rniga ~55 bayt (gzip bilan
   yana 5 barobar kam). Format izohi: netlify/functions/lib/numIndex.js

   Firestore'dan o'qish YO'Q QILINMADI — u zaxira yo'l bo'lib qoldi:
   indeks biror sababga ko'ra kelmasa, sayt eski usulda ishlayveradi. */
const IDX_TIERS = ['', 'premium', 'gold', 'vip', 'silver', 'bronze'];
const IDX_EXTRA = { m6:'monthly6', m12:'monthly12', m24:'monthly24',
                    d6:'dealMonthly6', d12:'dealMonthly12', d24:'dealMonthly24',
                    c:'currency', op:'operatorPrice', nt:'note', de:'dealExpiresAt',
                    sid:'sellerId' };
const IDX_NUM = { monthly6:1, monthly12:1, monthly24:1, dealMonthly6:1, dealMonthly12:1,
                  dealMonthly24:1, operatorPrice:1, dealExpiresAt:1 };

/* Ochish — eng tez usul: satrni bo'lakchalarga BO'LMASDAN (split
   o'rniga indexOf) o'qiydi. O'lchandi: 50 000 raqam uchun 39 ms —
   bu hatto brauzerning o'z JSON.parse'idan ham tez (63 ms), ustiga
   trafik 6 barobar kam. */
function indeksniOch(pack){
  const ops = pack.ops || [];
  const rows = String(pack.rows || '');
  const out = [];
  const L = rows.length;
  let p = 0;
  while(p < L){
    let e = rows.indexOf('\n', p); if(e < 0) e = L;
    if(e > p){
      /* satr ichidagi 7 ta ajratgichni topamiz */
      const q = []; let k = p, bad = false;
      for(let i = 0; i < 7; i++){
        const j = rows.indexOf('|', k);
        if(j < 0 || j > e){ bad = true; break; }
        q.push(j); k = j + 1;
      }
      if(!bad){
        const fl = +rows.slice(q[4] + 1, q[5]) || 0;
        const d9 = rows.slice(q[0] + 1, q[1]);     /* 9 xonali raqam */
        const item = {
          id:        rows.slice(p, q[0]),
          d9:        d9,                            /* naqsh qidiruvi uchun tayyor */
          number:    '+998' + d9,
          operator:  ops[+rows.slice(q[1] + 1, q[2])] || '',
          price:     +rows.slice(q[2] + 1, q[3]) || 0,
          oldPrice:  +rows.slice(q[3] + 1, q[4]) || 0,
          reserved:    !!(fl & 1),
          installment: !!(fl & 2),
          featured:    !!(fl & 4),
          dailyDeal:   !!(fl & 8),
          tier: IDX_TIERS[+rows.slice(q[5] + 1, q[6]) || 0] || ''
        };
        /* qo'shimcha maydonlar — raqamlarning ozchiligida bo'ladi */
        if(q[6] + 1 < e){
          for(const kv of rows.slice(q[6] + 1, e).split(',')){
            const z = kv.indexOf('=');
            if(z < 1) continue;
            const key = IDX_EXTRA[kv.slice(0, z)];
            if(!key) continue;
            const raw = decodeURIComponent(kv.slice(z + 1));
            item[key] = IDX_NUM[key] ? (Number(raw) || 0) : raw;
          }
        }
        out.push(item);
      }
    }
    p = e + 1;
  }
  return out;
}

async function raqamlarniYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  /* 1-yo'l (asosiy): ixcham indeks — tez va arzon */
  try{
    /* So'rov <head> da, sahifa yuklanishi bilanoq boshlangan — shu
       sabab bu yerga kelganda ko'pincha javob allaqachon tayyor. */
    const so = (typeof window !== 'undefined' && window.__idxP)
      ? window.__idxP
      : fetch(FN + 'api-index').then(x => x.json());
    const r = await withClientTimeout(so, kutishVaqti(9000));
    if(r && r.ok && typeof r.rows === 'string'){
      NUMBERS = indeksniOch(r);
      numbersLoaded = true;
      /* `total` — bazadagi HAQIQIY raqam soni. U bizdagidan katta
         bo'lsa, demak katalog to'liq yuklanmagan (server eng kerakli
         8000 tasini berdi) — bunday holda qidiruv SERVERDA bajariladi.
         Katalog kichik bo'lsa hammasi avvalgidek, brauzerda. */
      KATALOG_JAMI = Number(r.total) || NUMBERS.length;
      /* kesh ham qadoqlangan holda saqlanadi — 6 barobar kam joy
         egallaydi, ya'ni localStorage chegarasiga tezda urilmaydi */
      try{ localStorage.setItem('raqamuz_pack', JSON.stringify({ ops:r.ops, rows:r.rows, at:Date.now() })); }catch(e){}
      try{ localStorage.removeItem('raqamuz_cache'); }catch(e){}
      reshuffle(); pickHome(); renderAll();
      return;
    }
  }catch(e){ /* pastdagi zaxira yo'lga o'tamiz */ }

  /* 2-yo'l (zaxira): to'g'ridan-to'g'ri Firestore.
     `hidden: true` — admin yashirgan raqam, saytda ko'rinmaydi. */
  /* V144: `.limit()` QO'SHILDI. Ilgari bu yerda butun `numbers`
     to'plami o'qilardi. Odatda bu yo'l ishlamaydi (yuqoridagi tezkor
     yo'l ishlaydi), LEKIN Netlify funksiyasi ishlamay qolgan kunlari
     HAR BIR TASHRIF butun katalogni o'qirdi — ya'ni 2000 ta raqam
     bo'lsa, bitta mijoz 2000 ta o'qishga teng edi. Kunlik o'qish
     kvotasi shunda bir necha soatda tugaydi va sayt butunlay
     to'xtaydi. Chegara qo'yilgandan keyin eng yomon holatda ham
     bitta tashrif 1500 o'qishdan oshmaydi. */
  const snap = await withClientTimeout(db.collection('numbers').limit(1500).get(), kutishVaqti(10000));
  NUMBERS = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(n => !n.hidden);
  numbersLoaded = true;
  try{ localStorage.setItem('raqamuz_cache', JSON.stringify(NUMBERS)); }catch(e){}
  reshuffle(); pickHome(); renderAll();
}

/* Keshning eng uzoq yaroqlilik muddati. Undan oshsa ko'rsatilmaydi:
   bir oy kirmagan mijozga allaqachon SOTILGAN raqamlar chiqib
   turmasin. Yangi ro'yxat baribir shu zahoti tarmoqdan keladi. */
const KESH_UMRI = 14 * 24 * 60 * 60 * 1000;   /* 14 kun */

function keshdanOqi(){
  try{
    const p = localStorage.getItem('raqamuz_pack');
    if(p){
      const o = JSON.parse(p) || {};
      if(o.at && (Date.now() - o.at) > KESH_UMRI){
        try{ localStorage.removeItem('raqamuz_pack'); }catch(e){}
        return false;
      }
      NUMBERS = indeksniOch(o);
      if(NUMBERS.length){ reshuffle(); pickHome(); renderAll(); return true; }
    }
  }catch(e){}
  try{
    const c = localStorage.getItem('raqamuz_cache');
    if(c){ NUMBERS = JSON.parse(c)||[]; if(NUMBERS.length){ reshuffle(); pickHome(); renderAll(); return true; } }
  }catch(e){}
  return false;
}
async function sozlamalarniYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const doc = await withClientTimeout(db.collection('site_settings').doc('general').get(), kutishVaqti(9000));
  if(!doc.exists) return;
  const s = doc.data() || {}; SETTINGS = s;
  if(s.installmentRates){
    installmentRates = {
      6:Number(s.installmentRates[6])||installmentRates[6], 12:Number(s.installmentRates[12])||installmentRates[12],
      24:Number(s.installmentRates[24])||installmentRates[24], 36:Number(s.installmentRates[36])||installmentRates[36]
    };
  }
  /* Havolalar admin paneldan kelsa ham to'g'ri ko'rinishga keltiriladi.
     Namuna qiymatlar ("kanalingiz", "sahifangiz") e'tiborga olinmaydi. */
  const tgA = $('#moreTg');
  const tgUrl = tidyLink(s.telegramLink, 't.me', 'vip_raqamlar_uz');
  if(tgA && tgUrl) tgA.href = tgUrl;

  /* Instagram — HAR DOIM rasmiy kanal. Admin paneldagi qiymat qanday
     bo'lishidan qat'i nazar, boshqa sahifaga olib ketmaydi. */
  const ig = $('#moreInsta');
  if(ig){
    ig.href = 'https://instagram.com/vip.raqam.uz';
    const sub = ig.querySelector('i');
    if(sub) sub.textContent = '@vip.raqam.uz';
  }
  if(s.deliveryText){ const d=$('#moreDelivery'); d.textContent = s.deliveryText; d.removeAttribute('data-t'); }
  /* Bildirishnoma kaliti shu hujjatda keladi — qator endi ko'rinishi
     mumkin (kalit bo'lmasa, yoqish baribir ishlamaydi). */
  try{ if(typeof PUSH !== 'undefined') PUSH.belgini(); }catch(e){}
  renderAll();
}
/* "@nik", "nik", "https://instagram.com/nik" — hammasini to'g'ri havolaga aylantiradi.
   Bo'sh yoki namuna qiymat bo'lsa — standart manzil qaytariladi. */
function tidyLink(raw, host, fallbackHandle){
  const BAD = /^(sahifangiz|kanalingiz|username|sizning_username|admin_username|nik|example|test)$/i;
  let v = String(raw || '').trim();
  v = v.replace(/^@+/, '');
  if(/^https?:\/\//i.test(v)){
    try{
      const u = new URL(v);
      if(!u.hostname.includes(host.split('.')[0])) v = '';
      else v = u.pathname.replace(/^\/+|\/+$/g, '');
    }catch(e){ v = ''; }
  }else{
    v = v.replace(new RegExp('^(www\\.)?' + host.replace('.', '\\.') + '/?', 'i'), '');
    v = v.replace(/^\/+|\/+$/g, '');
  }
  if(!v || BAD.test(v) || /[\s?#]/.test(v)) v = fallbackHandle;
  return 'https://' + host + '/' + v;
}

async function moliyalashYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const doc = await withClientTimeout(db.collection('site_settings').doc('operator_financing').get(), kutishVaqti(9000));
  if(!doc.exists) return;
  const d = doc.data() || {}, by = { Humans:{}, Ucell:{}, Beeline:{} };
  ['Humans','Ucell','Beeline'].forEach(op => {
    ((d.byOperator && d.byOperator[op]) || []).forEach(row => {
      const k = Number(row.operatorPrice); if(!k) return;
      by[op][k] = {
        down:{ 6:Number(row.down6)||0, 12:Number(row.down12)||0, 24:Number(row.down24)||0 },
        monthly:{ 6:Number(row.monthly6)||0, 12:Number(row.monthly12)||0, 24:Number(row.monthly24)||0 }
      };
    });
  });
  const tb = d.tariffsByOperator || { Humans:(d.tariffs||[]), Ucell:[], Beeline:[] };
  OPERATOR_FINANCING = { byOperator:by, tariffsByOperator:{ Humans:tb.Humans||[], Ucell:tb.Ucell||[], Beeline:tb.Beeline||[] } };
}
async function fikrlarniYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const snap = await withClientTimeout(db.collection('video_testimonials').limit(12).get(), kutishVaqti(12000));
  TESTIMONIALS = snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b)=> (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  TEST_YUKLANDI = true;
  renderTestimonials();
}
async function tashrifHisobi(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  try{
    if(!localStorage.getItem('raqamuz_counted')){
      db.collection('site_stats').doc('counter').set({ totalVisitors: FV.increment(1) }, { merge:true })
        .then(()=> localStorage.setItem('raqamuz_counted','1')).catch(()=>{});
    }
  }catch(e){}
  /* ==================================================================
     "HOZIR SAYTDA" SIGNALI — V144 DA TO'LIQ QAYTA YOZILDI
     ------------------------------------------------------------------
     BU YERDA JIDDIY XATO BOR EDI VA U BAZANI TO'LDIRIB QO'YGAN.

     ESKI KOD:
         const sid = 'sess_' + tasodifiy + '_' + Date.now();
         beat(); setInterval(beat, 20000);

     UCHTA ALOHIDA MUAMMO:

     1) HAR SAHIFA OCHILISHIDA YANGI HUJJAT.
        `sid` har safar yangidan yasalardi — ya'ni bitta mijoz saytni
        10 marta ochsa, bazada 10 ta ABADIY hujjat paydo bo'lardi.
        Qayta yuklash, mini ilovani ochish, boshqa bo'limga o'tib
        qaytish — hammasi yangi hujjat.

     2) HECH KIM O'CHIRMASDI.
        Butun loyihada `active_sessions` to'plami FAQAT bitta joyda —
        admin panelidagi "hozir saytda" sanog'ida — O'QILARDI.
        O'chiradigan kod umuman yo'q edi. Ya'ni to'plam oylar davomida
        faqat o'sib bordi va Firestore'ning bepul saqlash joyini
        to'ldirib qo'ydi. Saqlash joyi to'lgach, Firestore BARCHA
        amallarni rad eta boshlaydi — sayt ham, admin panel ham
        "ishlamay qoladi".

     3) 20 SONIYADA BIR MARTA YOZISH, FON OYNADA HAM.
        Mijoz saytni ochiq qoldirsa, telefon cho'ntakda yotganda ham
        soatiga 180 marta yozuv ketardi — bu kunlik yozuv kvotasini
        yeb qo'yardi.

     YANGI KOD QUYIDAGICHA ISHLAYDI:
       * sessiya raqami `sessionStorage` da saqlanadi — bitta oynada
         necha marta yangilanmasin, hujjat BITTA bo'lib qoladi;
       * signal faqat sahifa KO'RINIB TURGANDA yuboriladi (fon
         oynada butunlay to'xtaydi);
       * oraliq 20 soniyadan 60 soniyaga uzaytirildi — "hozir saytda"
         sanog'i 40 soniyalik oyna bilan ishlagani uchun sanoq
         aniqligiga ta'sir qilmaydi (pastdagi `tirik` izohiga qarang);
       * hujjatga `expireAt` yoziladi — eski yozuvlarni tozalaydigan
         funksiya aynan shu maydon bo'yicha ishlaydi.
     ================================================================== */
  let sid = '';
  try{ sid = sessionStorage.getItem('raqamuz_sid') || ''; }catch(e){}
  if(!sid){
    sid = 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now();
    try{ sessionStorage.setItem('raqamuz_sid', sid); }catch(e){}
  }

  const beat = ()=>{
    /* Fon oynada yozmaymiz — mijoz saytni ko'rmayotgan bo'lsa,
       "hozir saytda" ro'yxatida turishi ham noto'g'ri. */
    if(document.hidden) return;
    db.collection('active_sessions').doc(sid).set({
      lastSeen: FV.serverTimestamp(),
      /* Tozalash funksiyasi shu maydonga qaraydi (24 soatdan keyin
         yozuv keraksiz — "hozir saytda" sanog'i 40 soniyalik). */
      expireAt: Date.now() + 86400000
    }, { merge:true }).catch(()=>{});
  };
  beat();
  setInterval(beat, 60000);
  /* Fon oynadan qaytganda darhol bitta signal — sanoq kechikmasin */
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) beat(); });
}
let __nnFirst = true;
async function yangiRaqamKuzatuvi(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  try{
    db.collection('numbers').orderBy('addedAt','desc').limit(1).onSnapshot(snap => {
      if(__nnFirst){ __nnFirst = false; return; }
      snap.docChanges().forEach(ch => {
        if(ch.type === 'added'){
          const item = { id:ch.doc.id, ...ch.doc.data() };
          if(item.hidden) return;
          if(!NUMBERS.some(n => n.id === item.id)){ NUMBERS.unshift(item); renderAll(); }
          /* Pastdagi kichik "toast" emas — tepadan tushadigan to'liq
             bildirishnoma: raqam, narxi va operatori bilan. */
          tgNote(LANG==='ru' ? 'Добавлен новый номер' : "Yangi raqam qo'shildi", item);
        }
      });
    }, ()=>{});
  }catch(e){}
}

/* ==================================================================
   KARTOCHKA
   ================================================================== */
const ICO_HEART = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6c0 4.8-7 9.4-7 9.4z"></path></svg>';

/* V174: toj belgisi toifa yorlig'idan OLIB TASHLANDI (mijoz so'rovi).
   O'zgaruvchi saqlanib qoldi — boshqa joyda kerak bo'lsa tayyor turadi. */
const ICO_CROWN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7.5 7 11l5-6.5L17 11l4-3.5-1.6 10.5H4.6L3 7.5z"></path></svg>';
const ICO_ARR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6.5 18.5 12 13 17.5"></path></svg>';
function opChip(op){
  const m = opMeta(op);
  return `<span class="nc-op"><i style="background:${m.color}"></i>${esc(op||'')}</span>`;
}
/* Toifa: FAQAT admin paneldagi `tier` maydoni — vip | premium | gold.
   MIJOZ SO'ROVI: admin "Toifasiz (oddiy)" ni tanlasa, kartochkaga hech
   qanday rang va yorliq QO'SHILMASIN. Avval bu yerda "featured (Mashhur)
   bo'lsa — GOLD" degan zaxira qoida bor edi; aynan o'sha sabab toifasiz
   raqam ham o'zi oltin rangga o'tib qolardi. Endi u olib tashlandi:
   "Mashhur" belgisi faqat bosh sahifadagi karuselga tushishini bildiradi,
   rangga umuman ta'sir qilmaydi. */
const TIERS = { vip:'VIP', premium:'PREMIUM', gold:'GOLD' };
function tierOf(item){
  const tRaw = String(item && item.tier || '').trim().toLowerCase();
  return TIERS[tRaw] ? tRaw : '';
}
/* ==================================================================
   RAQAM NAQSHINI ANIQLASH  (V162)
   ------------------------------------------------------------------
   NEGA KERAK. Mijoz 24 million so'm to'laydigan narsa — raqamning
   O'ZI emas, uning NAQSHI: 777, 12-21, 100-10-20. Lekin saytda
   raqam shunchaki matn bo'lib turardi va nega qimmatligini faqat
   tushunadigan odam ko'rardi. Endi dastur buni o'zi topib aytadi.

   QANDAY ISHLAYDI. Operator kodidan keyingi 7 raqam tahlil qilinadi.
   Topilgan naqshlar KUCH bo'yicha tartiblanadi va eng kuchlisi
   kartochkada yorliq bo'lib chiqadi.

   TEZLIK. Faqat satr ustida ishlaydi, bitta raqam uchun ~10 ta
   taqqoslash. 1000 ta raqam uchun ham sezilmaydi. Natija eslab
   qolinadi (NAQSH_KESH) — ro'yxat qayta chizilganda qayta
   hisoblanmaydi.
   ================================================================== */
const NAQSH_KESH = Object.create(null);

function naqshAniqla(xomRaqam){
  const r = String(xomRaqam || '').replace(/\D/g, '');
  if(r.length < 7) return [];
  if(NAQSH_KESH[r]) return NAQSH_KESH[r];

  const t = r.slice(-7);                 /* operator kodidan keyingi 7 raqam */
  const topildi = [];

  /* --- 1. Bir xil raqamlar ketma-ketligi (777, 7777...) --- */
  let engUzun = 1, joriy = 1, qaysi = t[0];
  for(let i = 1; i < t.length; i++){
    if(t[i] === t[i-1]){ joriy++; if(joriy > engUzun){ engUzun = joriy; qaysi = t[i]; } }
    else joriy = 1;
  }
  if(engUzun >= 7)      topildi.push({ kuch:100, kalit:'birxil',  matn:'Bir xil raqam' });
  else if(engUzun >= 5) topildi.push({ kuch:92,  kalit:'beshlik', matn:'Beshta ' + qaysi });
  else if(engUzun === 4)topildi.push({ kuch:80,  kalit:'tortlik', matn:"To'rtta " + qaysi });
  else if(engUzun === 3)topildi.push({ kuch:62,  kalit:'uchlik',  matn:'Uchta ' + qaysi });

  /* --- 2. Oyna (teskari o'qiganda ham bir xil) --- */
  if(t === t.split('').reverse().join('')) topildi.push({ kuch:88, kalit:'oyna', matn:'Oyna naqsh' });

  /* --- 3. Zinapoya (1234567 yoki 7654321) --- */
  let osadi = true, kamayadi = true;
  for(let i = 1; i < t.length; i++){
    if(+t[i] !== +t[i-1] + 1) osadi = false;
    if(+t[i] !== +t[i-1] - 1) kamayadi = false;
  }
  if(osadi || kamayadi) topildi.push({ kuch:95, kalit:'zina', matn:'Zinapoya' });

  /* --- 4. Juftliklar (11 22 33 ...) --- */
  const oxirgi6 = t.slice(-6);
  if(/^(\d)\1(\d)\2(\d)\3$/.test(oxirgi6)) topildi.push({ kuch:84, kalit:'juft', matn:'Juftliklar' });

  /* --- 5. Takror (oxirgi to'rtta: 1212, 7878) --- */
  const oxirgi4 = t.slice(-4);
  if(/^(\d\d)\1$/.test(oxirgi4) && oxirgi4[0] !== oxirgi4[1])
    topildi.push({ kuch:70, kalit:'takror', matn:'Takrorlanuvchi' });

  /* --- 6. Yumaloq (nollar bilan tugaydi) --- */
  if(/0000$/.test(t))      topildi.push({ kuch:86, kalit:'yumaloq', matn:'Yumaloq raqam' });
  else if(/000$/.test(t))  topildi.push({ kuch:72, kalit:'yumaloq', matn:'Yumaloq raqam' });
  else if(/00$/.test(t))   topildi.push({ kuch:52, kalit:'yumaloq', matn:'Nol bilan tugaydi' });

  /* --- 7. Ko'zguli juftlik (oxirgi 4 ta: 1221, 3443) --- */
  if(/^(\d)(\d)\2\1$/.test(oxirgi4) && oxirgi4[0] !== oxirgi4[1])
    topildi.push({ kuch:66, kalit:'kozgu', matn:'Ko\'zgu' });

  /* --- 8. Faqat ikki xil raqamdan iborat --- */
  if(new Set(t.split('')).size === 2) topildi.push({ kuch:58, kalit:'ikkixil', matn:'Ikki xil raqam' });

  topildi.sort((a, b) => b.kuch - a.kuch);
  /* Bir xil kalit ikki marta tushmasin */
  const korilgan = Object.create(null);
  const toza = topildi.filter(x => korilgan[x.kalit] ? false : (korilgan[x.kalit] = true));
  NAQSH_KESH[r] = toza;
  return toza;
}

/* Kartochkaga tushadigan ENG KUCHLI naqsh (yoki bo'sh) */
function naqshEngKuchli(item){
  const n = naqshAniqla(item && item.number);
  return n.length ? n[0] : null;
}

/* V165: naqsh YORLIG'I kartochkadan olib tashlandi (mijoz so'rovi:
   "bunaqa so'z kerak emas"). Naqsh bo'yicha SARALASH filtr oynasida
   qoldi — u foydali va kartochkaga ortiqcha yozuv qo'shmaydi. */
function numCard(item){
  const fav = isFav(item.id), disc = discountPct(item);
  const res = !!item.reserved;
  /* Narx qatori raqam oynasi bilan AYNAN bir xil qoidada (kartaNarx) */
  const kn = kartaNarx(item), showCash = !kn.bolib;
  const tier = tierOf(item), vip = !!tier;
  let price = '';
  if(showCash){
    price = `<div class="p sg">${formatPrice(item.price)} ${UNITH(item)}</div>`;
    if(hasActiveDiscount(item)) price += `<div class="old sg">${formatPrice(item.oldPrice)}</div>`;
  }else{
    price = `<div class="ins solo" style="margin-top:0">${esc(kn.ins)}</div>`;
  }
  const cls = res ? ' res' : (vip ? ' vipc t-' + tier : (installmentAllowed(item) ? ' insc' : ''));
  return `<article class="numcard${cls}" data-card="${esc(item.id)}">
    <div class="nc-top">
      <div style="flex:1;min-width:0">
        <div class="nc-num sg">${esc(shortNumber(item.number))}</div>
        <div class="nc-meta">
          ${vip ? `<span class="tag vip">${TIERS[tier]}</span>` : ''}
          ${opChip(item.operator)}
          ${disc && showCash ? `<span class="tag off">−${disc}%</span>` : ''}
          ${res ? `<span class="tag grey">${t('BAND')}</span>` : ''}
        </div>
      </div>
      <button class="nc-fav${fav?' on':''}" data-fav="${esc(item.id)}" aria-label="Sevimlilar">${ICO_HEART}</button>
    </div>
    <div class="nc-sep"></div>
    <div class="nc-bot">
      <div class="nc-price">${price}</div>
      <span class="nc-cta${res?' off':''}">${res?t('Band'):t('Batafsil')}${res?'':ICO_ARR}</span>
    </div>
  </article>`;
}
function skPrf(){
  /* Kartochka bir butun yuza — ichini chizish shart emas, chunki
     o'lchami aniq va joylashuv baribir sakramaydi. */
  return '<div class="sk-prf shim" aria-hidden="true"></div>';
}

function skeletons(n){ let h=''; for(let i=0;i<n;i++) h += '<div class="sk shim"><b></b><i></i><div class="rw"><u></u><s></s></div></div>'; return h; }

/* ---------- SKELET YORDAMCHILARI (V120) ----------
   Har bir bo'lim o'z shaklidagi skelet bilan to'ladi. Maqsad: internet
   sekin yoki umuman yo'q bo'lsa ham sahifa "buzilgandek" emas,
   "yuklanayotgandek" ko'rinsin — va yuklangach joylashuv SAKRAMASIN
   (skelet o'lchamlari haqiqiy elementnikiga teng). */
function skHero(n){
  let h = '';
  for(let i=0;i<(n||2);i++){
    h += '<div class="sk-hero shim" aria-hidden="true">'
       +   '<div><span class="sk-l sm w30"></span><span class="sk-l big w70"></span></div>'
       +   '<div><span class="sk-l w40"></span></div>'
       + '</div>';
  }
  /* Haqiqiy karusel kabi YONMA-YON (`hero-track` — flex qator), aks
     holda skelet kartochkalari ustma-ust tushib, sahifa cho'zilib
     ketardi va yuklangach joylashuv sakrardi. */
  return '<div class="hero-track" aria-hidden="true">' + h + '</div>';
}
function skVideos(n){
  let h = '';
  for(let i=0;i<(n||4);i++){
    h += '<div class="sk-v shim" aria-hidden="true">'
       +   '<span class="sk-l w55"></span><span class="sk-l sm w85"></span>'
       + '</div>';
  }
  return '<div class="sk-vrow">' + h + '</div>';
}
function skTiles(n){
  let h = '';
  for(let i=0;i<(n||3);i++){
    h += '<div class="sk-tile shim" aria-hidden="true">'
       +   '<span class="sk-l w55"></span><span class="sk-l sm w30"></span>'
       + '</div>';
  }
  return h;
}
/* Sarlavha ostidagi YOZUV o'rniga — "Yuklanmoqda…" so'zi emas, skelet
   chizig'i (mijoz so'rovi: "hattoki yozuvlarigacha"). */
function skSub(el){
  if(!el) return;
  el.innerHTML = '<span class="sk-sub shim" aria-hidden="true"></span>';
}
/* ==================================================================
   BO'SH HOLATLAR UCHUN ILLUSTRATSIYALAR
   ------------------------------------------------------------------
   Ilgari bo'sh holatda kichkina kulrang ikonka turardi ("quti", "lupa")
   — ekran quruq va "buzilgandek" ko'rinardi. Endi har bir holat uchun
   o'z rasmi bor: brend ranglarida, ikkala mavzuda ham to'g'ri
   ko'rinadi va mayin "suzadi" (faqat transform — telefonni band
   qilmaydi). Rasm SVG — hech qanday fayl yuklanmaydi, ya'ni sayt
   tezligiga ta'sir qilmaydi.
   ================================================================== */
const ILL = {
  /* Lupa + raqam kartochkalari — "topilmadi" */
  qidiruv: `<svg viewBox="0 0 160 120" aria-hidden="true">
    <rect class="i-card" x="16" y="30" width="78" height="22" rx="7"/>
    <rect class="i-card" x="16" y="60" width="62" height="22" rx="7"/>
    <rect class="i-card i-dim" x="16" y="90" width="44" height="18" rx="6"/>
    <circle class="i-ring" cx="112" cy="54" r="27"/>
    <path class="i-ring" d="M132 74l16 16" stroke-linecap="round"/>
    <path class="i-acc" d="M103 54h18" stroke-linecap="round"/>
  </svg>`,
  /* Yurakcha + kartochka — "sevimlilar bo'sh" */
  sevimli: `<svg viewBox="0 0 160 120" aria-hidden="true">
    <rect class="i-card" x="26" y="34" width="108" height="56" rx="14"/>
    <path class="i-dim" d="M42 56h44M42 70h28" stroke-linecap="round"/>
    <path class="i-heart" d="M112 46c-6-6-16-2-16 7 0 11 16 21 16 21s16-10 16-21c0-9-10-13-16-7z"/>
  </svg>`,
  /* Quti + chek — "buyurtma yo'q" */
  quti: `<svg viewBox="0 0 160 120" aria-hidden="true">
    <path class="i-ring" d="M44 44l36-14 36 14v38l-36 14-36-14z"/>
    <path class="i-dim" d="M44 44l36 14 36-14M80 58v38" stroke-linecap="round"/>
    <rect class="i-acc-f" x="92" y="64" width="34" height="42" rx="6"/>
    <path class="i-on-acc" d="M100 76h18M100 86h12" stroke-linecap="round"/>
  </svg>`,
  /* Ogohlantirish — "xatolik" */
  xato: `<svg viewBox="0 0 160 120" aria-hidden="true">
    <path class="i-warn" d="M80 28l34 62H46z"/>
    <path class="i-on-warn" d="M80 52v18M80 78v2" stroke-linecap="round"/>
    <circle class="i-dim" cx="40" cy="38" r="5"/>
    <circle class="i-dim" cx="124" cy="46" r="4"/>
  </svg>`
};

function emptyBox(icon, title, body, btnText, btnAttr, isErr){
  /* Eski chaqiruvlar kichik ikonka yuborishi mumkin — ularni mos
     illustratsiyaga almashtiramiz (kod bir joyda o'zgaradi). */
  const rasm = (typeof icon === 'string' && icon.indexOf('viewBox="0 0 160 120"') !== -1)
    ? icon
    : (isErr ? ILL.xato
      : icon === IC_SEARCH ? ILL.qidiruv
      : icon === IC_HEART_B ? ILL.sevimli
      : ILL.quti);
  return `<div class="empty${isErr?' err':''}" style="grid-column:1/-1">
    <span class="ill">${rasm}</span><h3>${esc(title)}</h3><p>${esc(body)}</p>
    ${btnText ? `<button class="btn" ${btnAttr||''}>${esc(btnText)}</button>` : ''}</div>`;
}
const IC_SEARCH = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>';
const IC_HEART_B = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6c0 4.8-7 9.4-7 9.4z"></path></svg>';
const IC_WARN = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l8.5 15H3.5z"></path><path d="M12 10v4M12 16.5v.5"></path></svg>';
const IC_BOX = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"></path><path d="M4 7.5 12 11l8-3.5M12 11v9"></path></svg>';

/* ==================================================================
   BOSH SAHIFA
   ================================================================== */
function renderAll(){
  applyLang();
  /* Katalog kelgach sevimlilarni tozalaymiz: ko'rsatib bo'lmaydigan
     ID'lar qolib ketmasin (pastki menyudagi "5" xatosining sababi). */
  try{ if(typeof favTozala === 'function') favTozala(); }catch(e){}
  renderHome();
  if(currentRoute === 'catalog') renderCatalog();
  if(currentRoute === 'fav') renderFavorites();
  /* yangi kartochkalar chizilgach — yaltirashni kuzatuvga qo'shamiz */
  requestAnimationFrame(shineWatch);
}

let HOME_PICKS = [], HERO_PICKS = [];
function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}
/* ==================================================================
   BOSH SAHIFADAGI YAGONA PREMIUM KARTOCHKA
   ------------------------------------------------------------------
   Mijoz so'rovi: karusel emas, FAQAT BITTA kartochka. Ichida bazadagi
   bo'lib to'lashga chiqadigan raqamlarning qisqa naqshlari (oxirgi 4
   xona: 7777, 0000, 0707...) jonli almashib turadi. Naqshlar har
   yangilanishda tasodifiy tanlanadi.
   ================================================================== */
function heroTanla(avail){
  const prem = avail.filter(n => n.featured);
  return shuffled(prem.length >= 3 ? prem : avail.slice().sort((a,b)=>(b.price||0)-(a.price||0)).slice(0,12))
    .slice(0, 6).map(n => n.id);
}
/* Karusel raqamlari hali ham o'rinlimi?
   MUHIM: karusel ro'yxati har safar qayta aralashtirilsa, u qayta
   chizilib BOSHIGA qaytardi — mijoz buni "kartochka o'tayotganda
   qotib, orqaga sakrab ketyapti" deb ko'rardi. Endi ro'yxat faqat
   HAQIQATAN kerak bo'lganda yangilanadi: biror raqam sotilib ketsa
   yoki bazadan yo'qolsa. */
function heroHaliYaroqli(avail){
  if(!HERO_PICKS.length) return false;
  const bor = new Set(avail.map(n => n.id));
  return HERO_PICKS.every(id => bor.has(id));
}

/* Bosh sahifadagi tanlov — pastdagi 15 ta ro'yxat har safar yangi
   tasodifiy bo'ladi, karusel esa O'ZGARMAY turadi. */
/* Bosh sahifa oxirgi marta QAYSI ma'lumot bilan chizilgani.
   Qarang: pickHome() izohi. */
let HOME_IMZO = '';
function homeImzo(avail){
  /* Arzon "barmoq izi": soni + birinchi va oxirgi raqam identifikatori.
     Ro'yxat o'zgarsa bu ham o'zgaradi. */
  return avail.length + '|' + ((avail[0] && avail[0].id) || '') + '|' + ((avail[avail.length-1] && avail[avail.length-1].id) || '');
}

function pickHome(majburiy){
  const avail = NUMBERS.filter(n => !n.reserved);
  if(!avail.length){ HOME_PICKS = []; HERO_PICKS = []; HOME_IMZO = ''; return; }

  /* ============ V137 — TEZLIK (o'lchangan) ============
     MUAMMO. `pickHome()` bosh sahifaga HAR O'TGANDA chaqirilardi va
     har safar: raqamlarni qaytadan aralashtirardi, keyin butun bosh
     sahifani (15 ta kartochka + karusel) QAYTADAN chizardi.
     O'lchandi: 6 barobar sekin protsessorda `renderHome()` ning o'zi
     69 ms, butun o'tish esa 221 ms. Mijoz bosh sahifaga kuniga
     o'nlab marta qaytadi — ya'ni bu eng ko'p seziladigan sekinlik edi.

     YECHIM. Ma'lumot o'zgarmagan bo'lsa qaytadan chizilmaydi: sahifa
     allaqachon chizilgan holda turadi, uni ko'rsatish esa BEPUL.
     Qaytadan chizish faqat:
       * raqamlar ro'yxati o'zgarganda (bazadan yangisi kelsa),
       * yoki ataylab so'ralganda (`pickHome(true)` — masalan til
         almashtirilganda).
     Qo'shimcha foyda: bosh sahifaga qaytganda raqamlar endi
     "sakrab" almashmaydi — mijoz qaysi kartochkani ko'rgan bo'lsa,
     o'sha joyida turadi. */
  const imzo = homeImzo(avail);
  if(!majburiy && imzo === HOME_IMZO && HOME_PICKS.length && $('#homeFeatured') && $('#homeFeatured').children.length){
    return;
  }
  HOME_IMZO = imzo;

  HOME_PICKS = shuffled(avail).slice(0, 15).map(n => n.id);
  if(!heroHaliYaroqli(avail)) HERO_PICKS = heroTanla(avail);
  renderHome();
}

/* ==================================================================
   STORIES — bosh sahifadagi lenta (mijoz tomoni)
   ------------------------------------------------------------------
   Admin o'zi qo'yadi: nomi, rasmi va (xohlasa) havolasi. Ramka
   TO'RTBURCHAK (saytning uslubi), halqa esa jonli aylanib turadi.

   Bosilganda to'liq ekran ochiladi:
     • tepada vaqt chizig'i (5 soniya), keyingisiga o'zi o'tadi;
     • o'ng/chap tomonni bossa — keyingi/oldingi;
     • pastga sursa yoki ✕ bossa — yopiladi;
     • yurakcha yoki IKKI MARTA bosish — "yoqdi";
     • ko'rilgani bir marta hisoblanadi.

   TEZLIK. Lenta qayta kirganda DARHOL chiqadi: ro'yxat telefonning
   o'zida (localStorage) saqlanadi va avval o'shandan chiziladi, keyin
   bazadan yangilanadi ("stale-while-revalidate"). Ya'ni mijoz
   "yuklanmoqda" holatini ko'rmaydi.

   HISOBLAGICHLAR. Ko'rishlar va yurakchalar endi bazaga TO'G'RIDAN
   yozilmaydi — server funksiyasi orqali o'tadi (api-story-stat).
   Sabab: brauzerdan yozilganda bir odam skript bilan hisobni
   cheksiz shishirib yuborishi mumkin edi, admin esa yolg'on raqamni
   ko'rardi. Server IP bo'yicha cheklaydi va bitta ko'rishni bir
   necha soatda bir marta sanaydi — admin paneldagi son HAQIQIY.
   ================================================================== */
let STORIES = [];
let ST_IDX = 0, ST_TIMER = null, ST_BOSH = 0;
const ST_KOR_KEY = 'vip_st_kor';      // shu seansda ko'rilganlari
const ST_LIKE_KEY = 'vip_st_like';    // yoqtirganlari (uzoq muddatli)
const ST_KESH_KEY = 'vip_st_kesh';    // lenta darhol chiqishi uchun

function stSet(key){
  try{ return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }catch(e){ return new Set(); }
}
function stSaqla(key, set){
  try{ localStorage.setItem(key, JSON.stringify(Array.from(set).slice(-300))); }catch(e){}
}
function stKorilgan(){
  try{ return new Set(JSON.parse(sessionStorage.getItem(ST_KOR_KEY) || '[]')); }catch(e){ return new Set(); }
}

/* Mijozga KO'RINADIGAN yurakchalar soni.
   `likesBaza` — admin story qo'shganda bir marta beriladigan boshlang'ich
   son (1000-3000). `likes` — haqiqiy mijozlar bosgani. Mijoz ikkisining
   yig'indisini ko'radi; admin panelda esa haqiqiysi alohida ko'rinadi. */
function stLikeSoni(s){
  return (Number(s && s.likesBaza) || 0) + (Number(s && s.likes) || 0);
}
/* Yurakchalar soni ANIQ ko'rsatiladi (mijoz so'rovi: "K" emas).
   Minglar nozik bo'shliq bilan ajratiladi: 1 840, 12 507. */
function stSonAniq(n){
  n = Math.max(0, Math.round(Number(n) || 0));
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

/* ---------- KADRLAR (bitta toifada 10 tagacha rasm/video) ----------
   Admin bitta story ichiga 10 tagacha rasm yoki video qo'ya oladi.
   Eski story'larda `kadrlar` yo'q — ular bitta rasmli story sifatida
   o'qiladi (shu sabab eskisi ham ishlayveradi).

   XAVFSIZLIK: kadr manzili FAQAT Firebase Storage'dan bo'lishi
   mumkin. Admin hisobi o'g'irlansa ham lentaga begona manba
   (`javascript:`, boshqa sayt, kuzatuvchi piksel) joylab bo'lmaydi.
   Bu tekshiruv Firestore qoidalaridan MUSTAQIL ishlaydi — ikki qatlam. */
function stManbaOk(u){
  return typeof u === 'string'
    && /^https:\/\/(firebasestorage\.googleapis\.com|storage\.googleapis\.com)\//.test(u);
}
/* Sinov va mahalliy ishlatish uchun `data:`/`blob:` rasmga ham ruxsat
   (ular tashqariga so'rov yubormaydi, ya'ni xavfsiz). */
function stRasmOk(u){
  return stManbaOk(u) || (typeof u === 'string' && /^(data:image\/|blob:)/.test(u));
}

function stKadrlar(s){
  const r = (s && Array.isArray(s.kadrlar)) ? s.kadrlar : null;
  if(r && r.length){
    return r.filter(k => k && stRasmOk(k.url)).slice(0, 10).map(k => ({
      tur: k.tur === 'video' ? 'video' : 'rasm',
      url: k.url,
      davomMs: Math.min(30000, Math.max(1500, Number(k.davomMs) || 0)) || 0,
      savdo: stSavdoOk(k.savdo) ? k.savdo : null
    }));
  }
  /* Eski ko'rinish — bitta rasm */
  const u = (s && (s.rasm || s.doira)) || '';
  return stRasmOk(u) ? [{ tur:'rasm', url:u, davomMs:0, savdo: stSavdoOk(s && s.savdo) ? s.savdo : null }] : [];
}

/* Savdo bloki — admin kiritgan raqam va narx */
function stSavdoOk(v){
  if(!v || typeof v !== 'object') return false;
  const raqam = String(v.raqam || '').replace(/\D/g, '');
  return raqam.length >= 9 && Number(v.narx) > 0;
}

/* Faqat kerakli maydonlarni saqlaymiz — kesh kichik bo'lsin */
function stKeshYoz(){
  try{
    localStorage.setItem(ST_KESH_KEY, JSON.stringify({
      t: Date.now(),
      r: STORIES.slice(0, 20).map(s => ({
        id:s.id, nom:s.nom, doira:s.doira, rasm:s.rasm, havola:s.havola,
        tartib:s.tartib, likes:s.likes, likesBaza:s.likesBaza,
        /* Kadrlar ham keshda — internet yo'q paytda story OCHILAVERADI
           (rasmlar brauzer keshidan keladi) */
        kadrlar: Array.isArray(s.kadrlar) ? s.kadrlar.slice(0, 10) : undefined
      }))
    }));
  }catch(e){}
}
function stKeshdanOch(){
  try{
    const k = JSON.parse(localStorage.getItem(ST_KESH_KEY) || 'null');
    if(!k || !Array.isArray(k.r) || !k.r.length) return false;
    /* 7 kundan eski keshni ishlatmaymiz */
    if(Date.now() - (Number(k.t) || 0) > 7 * 864e5) return false;
    STORIES = k.r;
    renderStories();
    return true;
  }catch(e){ return false; }
}

/* Baza javob berdimi. FAQAT shu `true` bo'lganda lenta yashirilishi
   mumkin (admin hammasini yashirgan bo'lsa). Internet yo'q bo'lsa
   `false` qolaveradi — demak skelet kartochkalar turaveradi. */
let ST_YUKLANDI = false;

/* Firestore'dan stories ro'yxati. Avval kesh, keyin yangisi.
   Internet bo'lmasa — qayta-qayta uriniladi (avtoQayta), ya'ni aloqa
   tiklanishi bilan lenta o'zi to'ladi. */
async function storiesYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  if(stKeshdanOch()) ST_YUKLANDI = true;
  else renderStories();                 /* skelet darhol ko'rinsin */
  try{
    const snap = await db.collection('stories').limit(50).get();
    STORIES = snap.docs.map(d => Object.assign({ id: d.id }, d.data() || {}))
      .filter(x => x.faol !== false && stKadrlar(x).length)
      .sort((a, b) => (Number(a.tartib) || 0) - (Number(b.tartib) || 0));
    ST_YUKLANDI = true;
    stKeshYoz();
    renderStories();
    stOldinYukla();
  }catch(e){
    /* Bazaga ulanmadi: keshdagi lenta (yoki skelet) TURAVERADI.
       MUHIM (V98): xato ALOQAGA bog'liq bo'lsagina yuqoriga uzatamiz —
       shunda `avtoQayta` qayta urinadi. Agar sabab boshqa bo'lsa
       (masalan Firestore qoidalari `stories` ga ruxsat bermayapti yoki
       bo'lim hali yaratilmagan), qayta urinishning foydasi yo'q va
       eng yomoni — tepada "Aloqa sekin" tasmasi mangu yonib turardi,
       internet zo'r bo'lsa ham. Bunday holatda lenta shunchaki
       ko'rsatilmaydi, sayt esa bemalol ishlayveradi. */
    /* SABAB ANIQ aloqaga bog'liq emasmi (masalan qoidalar ruxsat
       bermadi)? Unda qayta urinishdan foyda yo'q: lenta yashiriladi,
       sayt bemalol ishlayveradi. Noma'lum xatoda esa skelet O'Z JOYIDA
       QOLADI (mijoz so'rovi: "lenta yo'qolib qolmasin") va xato
       yuqoriga uzatiladi — `avtoQayta` qayta urinib ko'radi. */
    if(typeof aniqAloqaEmas === 'function' && aniqAloqaEmas(e)){
      try{ console.error('Stories yuklanmadi (aloqa emas):', (e && e.code) || '', (e && e.message) || e); }catch(x){}
      ST_YUKLANDI = true;      /* skelet mangu aylanib turmasin */
      renderStories();
      return;
    }
    renderStories();
    throw e;
  }
}

/* Birinchi 2 ta to'liq rasmni oldindan yuklaymiz — mijoz bosganda
   oyna DARHOL rasm bilan ochiladi (kutish yo'q).
   MUHIM (V84): lenta endi karusel ostida, ya'ni ASOSIY narsa —
   premium raqamlar. Shu sabab oldindan yuklash sahifa bo'shashganda
   boshlanadi (`requestIdleCallback`), raqamlar rasmlari bilan
   internet uchun TALASHMAYDI. */
function stOldinYukla(){
  const ish = ()=>{
    STORIES.slice(0, 2).forEach(s => {
      /* Faqat RASM oldindan yuklanadi — videoni oldindan yuklash
         mijozning internetini behuda yeydi. */
      const k = stKadrlar(s)[0];
      if(!k || k.tur !== 'rasm') return;
      const im = new Image(); im.decoding = 'async'; im.src = k.url;
    });
  };
  if(typeof requestIdleCallback === 'function') requestIdleCallback(ish, { timeout: 2500 });
  else setTimeout(ish, 1500);
}

/* Skelet kartochkalar — internet yo'q yoki hali yuklanmagan payt.
   Mijoz so'rovi: lenta SHU JOYDA doim tursin, yo'qolib qolmasin. */
function stSkelet(n){
  let h = '';
  for(let i = 0; i < n; i++){
    h += '<span class="story st-sk" aria-hidden="true">'
       + '<span class="story-ring"><span class="story-in"></span></span><b></b></span>';
  }
  return h;
}

function renderStories(){
  const box = $('#homeStories');
  if(!box) return;

  /* 1) Ro'yxat bo'sh. Ikki XIL holat:
        • baza hali javob bermagan (internet yo'q) -> SKELET turadi;
        • baza javob berdi, lekin faol story yo'q -> lenta yashiriladi
          (admin ataylab hammasini yashirgan). */
  if(!STORIES.length){
    if(ST_YUKLANDI){ box.innerHTML = ''; box.classList.remove('on'); }
    else{ box.innerHTML = stSkelet(5); box.classList.add('on'); }
    return;
  }

  const kor = stKorilgan();
  box.classList.add('on');
  /* MUHIM (mijoz so'rovi): nom oldida/ketida YURAKCHA yo'q —
     faqat nomning o'zi turadi. */
  box.innerHTML = STORIES.map((s, i) => {
    const qop = stRasmOk(s.doira) ? s.doira : (stRasmOk(s.rasm) ? s.rasm : '');
    const kn = stKadrlar(s).length;
    return `
    <button class="story st-c${(i % 6) + 1}${kor.has(s.id) ? ' korilgan' : ''}"
            data-story="${esc(s.id)}" data-sti="${i}" type="button"
            aria-label="${esc(s.nom || '')}${kn > 1 ? ', ' + kn + ' ta' : ''}">
      <span class="story-ring"><span class="story-in">
        ${qop ? `<img src="${esc(qop)}" alt="" width="66" height="66" loading="lazy" decoding="async">` : ''}
      </span></span>
      <b>${esc(s.nom || '')}</b>
    </button>`; }).join('');
}

function renderHome(){
  renderStories();
  const avail = NUMBERS.filter(n => !n.reserved);
  if(!HOME_PICKS.length && avail.length){
    HOME_PICKS = shuffled(avail).slice(0,15).map(n => n.id);
    if(!heroHaliYaroqli(avail)) HERO_PICKS = heroTanla(avail);
  }

  /* --- Premium tanlov karuseli --- */
  const hb = $('#homeHero');
  const heroes = HERO_PICKS.map(id => NUMBERS.find(n => n.id === id)).filter(Boolean);
  if(heroes.length){
    const card = (h) => {
      /* NARX QATORI — raqam oynasidagi bilan AYNAN bir xil.
         Mijoz so'rovi: "Bo'lib to'lash bor" degan yozuv emas,
         ichkaridagi 24 oylik summaning O'ZI chiqsin. Naqt summa
         faqat raqam ochilganda ko'rinadi. */
      const kn = kartaNarx(h);
      return `<div class="herocard" data-card="${esc(h.id)}">
        <div class="hc-top">
          <span class="hc-badge">${t('PREMIUM')}</span>
          ${opChip(h.operator)}
        </div>
        <div class="num sg">${esc(shortNumber(h.number))}</div>
        <div class="hc-bot">
          <div class="hc-price${kn.bolib ? ' keng' : ''}">
            ${kn.bolib
              ? `<div class="pv ins2 sg">${esc(kn.ins)}</div>`
              : `<div class="pv sg">${formatPrice(h.price)} ${UNITH(h)}</div>`}
          </div>
          <span class="hc-cta"><b>${t('Batafsil')}</b>${ICO_ARR}</span>
        </div>
      </div>`;
    };
    /* ===== KARUSEL QAYTA CHIZILMAYDI =====
       Bosh sahifa bir necha sabab bilan qayta chiziladi (sozlamalar
       kelganda, jonli baza yangilanganda...). Har safar karusel HTML'i
       almashtirilsa, u BOSHIGA qaytib ketardi — mijoz buni "kartochka
       o'tayotganda qotib, orqaga sakrab ketyapti" deb ko'rardi.
       Endi karusel faqat RO'YXAT O'ZGARGANDA qayta quriladi. */
    /* IMZOGA BO'LIB TO'LASH SUMMASI HAM KIRADI.
       Avval imzo faqat id/narx/band dan tuzilardi. Operator
       moliyalashtirish jadvali va sozlamalar esa karusel
       chizilgandan KEYIN kelardi — imzo o'zgarmagani uchun karusel
       qayta chizilmasdi va premium kartochkada eski (taxminiy yoki
       umuman yo'q) summa turib qolardi. Endi summaning o'zi imzoda:
       haqiqiy raqam kelishi bilan karusel yangilanadi. */
    const imzo = heroes.map(h => h.id + ':' + h.price + ':' + (h.reserved?1:0)
                   + ':' + installmentTeaser(h)).join(',') + '|' + LANG;
    if(hb.dataset.sig !== imzo){
      hb.dataset.sig = imzo;
      /* Kartochkalar ichki "yo'lak" (track) ichida — uni butunlay
         transform bilan siljitamiz. Lenta cheksiz aylanishi uchun
         kamida 4 ta kartochka kerak (chapda zaxira + ko'rinadigan +
         o'ngda keyingisi), shu sabab ro'yxat yetmasa takrorlanadi. */
      let lenta = heroes.slice();
      while(lenta.length < 4) lenta = lenta.concat(heroes);
      heroJami = heroes.length;
      hb.innerHTML = '<div class="hero-track" id="heroTrack">' +
        lenta.map(card).join('') + '</div>';
      $('#heroDots').innerHTML = heroes.map((_,i) => `<i class="${i===0?'on':''}"></i>`).join('');
      startHeroLoop();
    }
  }else{
    /* V120: karusel skeleti endi haqiqiy kartochkaga o'xshaydi —
       ichida sarlavha va narx o'rinlari ham bor. */
    hb.innerHTML = numbersLoaded ? '' : skHero(2);
    $('#heroDots').innerHTML = '';
  }

  /* --- Tanlangan VIP raqamlar: bazadan 15 ta tasodifiy.
         5-kartochkadan keyin "Kun tavsiyasi" qatori qo'yiladi. --- */
  const picks = HOME_PICKS.map(id => NUMBERS.find(n => n.id === id)).filter(Boolean);
  let html;
  if(!numbersLoaded){
    html = skeletons(3);
  }else if(!picks.length){
    html = emptyBox(IC_BOX, t('Raqam topilmadi'), LANG==='ru'?'Каталог пока пуст.':"Hozircha katalog bo'sh.", null);
  }else{
    const cards = picks.map(n => `<div class="rise">${numCard(n)}</div>`);
    const day = dayRowHtml();
    if(day && cards.length > 5) cards.splice(5, 0, day);
    else if(day) cards.push(day);
    html = cards.join('');
  }
  $('#homeFeatured').innerHTML = html;

  renderOxirgi();
  renderTestimonials();
}

/* ==================================================================
   OXIRGI KO'RILGAN RAQAMLAR (V149)
   ------------------------------------------------------------------
   MUAMMO. Mijoz o'nlab raqam ochib ko'radi, keyin yoqqanini QAYTA
   TOPOLMAYDI — katalog har safar aralashadi, qidiruvda esa raqamni
   eslab qolish kerak. Ko'p mijoz shu yerda ketib qolardi.

   YECHIM. Ochilgan raqamlarning ID'si telefonning o'zida saqlanadi
   (localStorage) va bosh sahifada alohida qatorda ko'rsatiladi.

   NEGA SERVERGA YOZILMAYDI: bu mijozning shaxsiy ko'rish tarixi,
   uni bazaga yozish na kerak, na to'g'ri — ustiga har ochilgan
   raqamga bitta yozuv degani bo'lardi (aynan shunday xato bazani
   to'ldirib qo'ygan edi, V144 ga qarang).

   Eng ko'pi 12 ta saqlanadi; ro'yxatda 10 tasi ko'rsatiladi. */
const OXIRGI_KALIT = 'vip_oxirgi_korilgan';
const OXIRGI_MAX = 12;

function oxirgiOqi(){
  try{ const a = JSON.parse(localStorage.getItem(OXIRGI_KALIT) || '[]'); return Array.isArray(a) ? a : []; }
  catch(e){ return []; }
}
function oxirgiQosh(id){
  if(!id) return;
  try{
    let a = oxirgiOqi().filter(x => x !== id);
    a.unshift(id);
    if(a.length > OXIRGI_MAX) a = a.slice(0, OXIRGI_MAX);
    localStorage.setItem(OXIRGI_KALIT, JSON.stringify(a));
  }catch(e){}
}
function renderOxirgi(){
  const wrap = $('#homeOxirgiWrap'), box = $('#homeOxirgi');
  if(!wrap || !box) return;
  const list = (typeof NUMBERS !== 'undefined' && NUMBERS) ? NUMBERS : [];
  /* Sotilgan yoki o'chirilgan raqamlar tarixdan o'zi tushib qoladi */
  const bor = oxirgiOqi().map(id => list.find(n => n.id === id)).filter(Boolean).slice(0, 10);
  if(bor.length < 2){ wrap.style.display = 'none'; return; }   /* bitta bo'lsa — ma'nosiz */
  wrap.style.display = '';
  box.innerHTML = bor.map(numCard).join('');
}
/* "Tozalash" */
document.addEventListener('click', (e)=>{
  const b = e.target.closest && e.target.closest('#oxirgiTozala');
  if(!b) return;
  try{ localStorage.removeItem(OXIRGI_KALIT); }catch(err){}
  renderOxirgi();
});

/* ==================================================================
   KUN TAVSIYASI — admin panelda tanlangan raqamlar.
   Bazadagi raqam ham, jonli (qo'lda kiritilgan) raqam ham bo'lishi mumkin.
   ================================================================== */
let DAY_PICKS = { title:'', subtitle:'', items:[] };
/* Kun tavsiyasidagi kartochkalar — ID bo'yicha. Jonli bazadan qo'shilgan
   raqam NUMBERS'da ham, LIVE_RESULTS'da ham YO'Q, shu sabab ustiga
   bosilganda findItem() uni topa olmasdi va kartochka "o'lik" bo'lib
   qolardi. Endi shu ro'yxat ham tekshiriladi (qarang: findItem). */
const DAY_OBJS = {};

async function kunTavsiyasiYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  try{
    const doc = await withClientTimeout(
      db.collection('site_settings').doc('daily_picks').get(), kutishVaqti(9000));
    if(!doc.exists) return;
    const d = doc.data() || {};
    DAY_PICKS = {
      title: d.title || '',
      subtitle: d.subtitle || '',
      items: Array.isArray(d.items) ? d.items.slice(0, 20) : [],
    };
    renderHome();
    dayPicksLiveSync();
  }catch(e){ /* bo'lmasa — bo'lim ko'rsatilmaydi */ }
}

/* ---------- JONLI BAZADAN OLINGAN TAVSIYALARNI TEKSHIRISH ----------
   Admin "jonli bazadan" qo'shgan raqam operator bazasida band qilinib
   ketishi mumkin — u holda saytda ham ko'rinmasligi kerak. Shu sabab
   har yuklanishda operatordan AYNAN o'sha 7 ta raqam bo'yicha so'raymiz
   (bitta operator bilan cheklanadi — arzon so'rov):
     • topilmasa  → ro'yxatdan olib tashlanadi;
     • topilsa    → narxi/operatori yangilanadi;
     • server javob bermasa → HECH NARSA o'chirilmaydi (xato tufayli
       raqam yo'qolib qolmasin).
   Bazadagi (Firestore) tavsiyalar bu yerda tekshirilmaydi — ular
   allaqachon NUMBERS bilan jonli bog'langan. */
async function dayPicksLiveSync(){
  const live = (DAY_PICKS.items || []).filter(x => x && x.live && x.number);
  if(!live.length) return;
  await Promise.all(live.slice(0, 8).map(async (it) => {
    const d7 = String(it.number).replace(/\D/g, '').slice(-7);
    if(d7.length !== 7) return;
    let url = FN + 'api-live-search?limit=8&mask=' + encodeURIComponent(d7);
    if(it.operator) url += '&operator=' + encodeURIComponent(it.operator);
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), kutishVaqti(9000));
    try{
      const res = await fetch(url, { signal: ctrl.signal });
      const data = await res.json();
      if(data.ok !== true) return;
      const hit = (data.items || []).find(x =>
        String(x.number || '').replace(/\D/g, '').slice(-7) === d7);
      if(!hit){ it.__gone = true; return; }
      if(Number(hit.price) > 0) it.price = Number(hit.price);
      if(hit.operator) it.operator = hit.operator;
    }catch(e){ /* tarmoq xatosi — o'chirmaymiz */ }
    finally{ clearTimeout(tm); }
  }));
  const oldLen = DAY_PICKS.items.length;
  DAY_PICKS.items = DAY_PICKS.items.filter(x => !x.__gone);
  if(DAY_PICKS.items.length !== oldLen) renderHome();
  else renderHome();   /* narx yangilangan bo'lishi mumkin */
}

/** Kun tavsiyasidagi bitta yozuvni to'liq raqam obyektiga aylantiradi */
function dayItemToNumber(it){
  if(!it) return null;
  if(it.live){
    const price = Number(it.price) || 0;
    return {
      id: 'day:' + (it.number || Math.random()),
      number: it.number, operator: it.operator || '',
      price, oldPrice: Number(it.oldPrice) || 0,
      installment: !!it.installment, featured: !!it.featured,
      tier: it.tier || '', reserved: !!it.reserved, live: true,
      monthly24: Number(it.monthly24) || 0,
      currency: it.currency || 'UZS',
      note: it.note || '',
    };
  }
  const n = NUMBERS.find(x => x.id === it.id);
  if(!n) return null;
  return Object.assign({}, n, { note: it.note || '' });
}

const ICO_STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.2l2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.2 6.8 19.1 8 13.3l-4.4-4 5.9-.7z"></path></svg>';

function dayCard(item){
  const res = !!item.reserved;
  /* Toifa yorlig'i oddiy kartochkadagi bilan AYNAN bir xil rangda bo'lsin */
  const dTier = tierOf(item);
  /* Zaxira shart olib tashlandi: `monthly24` endi `oylikTolov()`
     ichida, ya'ni `installmentTeaser()` uni allaqachon hisobga oladi.
     Ikki xil yo'l qolsa — yana ikki xil summa chiqardi. */
  const kn = kartaNarx(item);
  const showCash = !kn.bolib && (item.price > 0);
  return `<article class="daycard${res?' res':''}" data-card="${esc(item.id)}">
    <span class="dc-rib">${ICO_STAR}${t('KUN TAVSIYASI')}</span>
    <div class="dc-num sg">${esc(shortNumber(item.number))}</div>
    <div class="dc-meta">
      ${dTier ? `<span class="tag vip">${TIERS[dTier]}</span>` : ''}
      ${opChip(item.operator)}
      ${res ? `<span class="tag grey">${t('BAND')}</span>` : ''}
    </div>
    ${item.note ? `<div style="margin-top:9px;font-size:11.5px;color:var(--text-3);font-weight:600;line-height:1.45">${esc(item.note)}</div>` : ''}
    <div class="dc-sep"></div>
    <div class="dc-bot">
      <div class="dc-price">
        ${showCash ? `<b class="sg">${formatPrice(item.price)} ${UNITH(item)}</b>` : ''}
        ${kn.bolib ? `<i>${esc(kn.ins)}</i>` : ''}
      </div>
      <span class="dc-go">${res ? t('Band') : t('Batafsil')}${res ? '' : ICO_ARR}</span>
    </div>
  </article>`;
}

/** Bo'limni HTML sifatida qaytaradi (hech narsa bo'lmasa — bo'sh satr) */
function dayRowHtml(){
  const items = (DAY_PICKS.items || []).map(dayItemToNumber).filter(Boolean);
  Object.keys(DAY_OBJS).forEach(k => { delete DAY_OBJS[k]; });
  items.forEach(n => { DAY_OBJS[n.id] = n; });
  if(!items.length) return '';
  const title = DAY_PICKS.title || t('Kun tavsiyasi');
  const sub = DAY_PICKS.subtitle || '';
  /* MUHIM: bu bo'lim "Tavsiya etiladi" ro'yxatining ICHIGA qo'yiladi.
     Kompyuterda u ro'yxat 3-4 ustunli GRID bo'ladi — shu sabab bo'lim
     alohida klass oladi va CSS'da butun qatorni egallaydi (grid-column:1/-1),
     aks holda u bitta katak ichiga tiqilib, kartochkalar ustma-ust tushardi. */
  return `<section class="sect dayrow-sect">
    <div class="sect-h">
      <h2>${esc(title)}</h2>
      ${sub ? `<span style="font-size:12px;color:var(--muted-2);font-weight:650">${esc(sub)}</span>` : ''}
    </div>
    <div class="dayrow"><div class="dayrow-in">${items.map(dayCard).join('')}</div></div>
  </section>`;
}

/* ================= YALTIRASHNI FAQAT KO'RINGANIDA ISHLATISH =================
   Karuselda premium kartochkaning 12 ta nusxasi bor (uzluksiz aylanish
   uchun). Ilgari yaltirash animatsiyasi HAMMASIDA bir vaqtda ishlardi —
   ekranda bittasi ko'rinib tursa ham. iPhone buni sezmasdi, Android esa
   sezilarli sekinlashardi.

   Endi: karusel kartochkasi INDEKS bo'yicha aniq ma'lum, shu sabab uni
   kuzatish (IntersectionObserver) shart emas — to'g'ridan-to'g'ri
   belgilanadi. Kun tavsiyasi kartochkalari esa yonma-yon suriladi,
   ularni kuzatuvchi aniqlaydi. */
const SHINE_OFF = (()=>{
  try{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    if((navigator.hardwareConcurrency || 8) <= 2) return true;
    if((navigator.deviceMemory || 8) <= 2) return true;
  }catch(e){}
  return false;
})();

let shineIO = null;
function shineWatch(){
  if(SHINE_OFF) return;
  if(!('IntersectionObserver' in window)) return;
  if(!shineIO){
    shineIO = new IntersectionObserver((rows)=>{
      rows.forEach(r => r.target.classList.toggle('shine-on', r.isIntersecting));
    }, { threshold: 0.55 });
  } else {
    shineIO.disconnect();
  }
  $$('.daycard').forEach(el => shineIO.observe(el));
  heroShine();
}

/* ==================================================================
   PREMIUM KARTOCHKA — MOTION
   ------------------------------------------------------------------
   Faqat bitta juda arzon ish bajariladi: har 1,8 soniyada BITTA
   plastinkaga `sw` klassi qo'yiladi, CSS esa uni transform/opacity
   bilan aylantiradi (videokartada). Matn animatsiyaning o'rtasida
   (46%-54% orasida, ko'rinmayotgan lahzada) almashtiriladi.

   Animatsiya FAQAT quyidagi hollarda ishlaydi:
     • kartochka ekranda ko'rinib turgan bo'lsa (.shine-on),
     • bosh sahifa ochiq bo'lsa,
     • ilova/brauzer old planda bo'lsa,
     • qurilma past quvvatli yoki "harakatni kamaytir" yoqilmagan bo'lsa.
   Shu sabab u batareyani ham, kadrlarni ham yemaydi.
   ================================================================== */
/* Yaltirash — faqat hozir ko'rinib turgan kartochkada.
   Karusel aylanuvchi bo'lgani uchun "ko'rinadigan" kartochka HAR DOIM
   yo'lakdagi 2-bola (1-indeks): 0-chisi chap chetda "turib turadi"
   (orqaga surish uchun zaxira). */
function heroShine(){
  /* Yaltirash mijoz so'rovi bilan o'chirildi (02-css izohiga qarang).
     Shu sabab bu yerda endi hech narsa qilinmaydi — surish paytida
     bitta ham qo'shimcha sinf almashmaydi, ya'ni brauzer kartochkani
     qayta tekshirmaydi ham. */
  return;
}

/* ================= CHEKSIZ PREMIUM KARUSEL =================
   MUHIM O'ZGARISH: karusel endi "oxiriga borib qaytmaydi". U HAR DOIM
   bir tomonga yuraveradi va hech qachon tugamaydi.

   Qanday ishlaydi (klassik "cheksiz lenta" usuli):
     • Yo'lak doim bitta kartochka kengligiga chapga surilgan turadi
       (-w). Ya'ni chap chetda ko'rinmaydigan bitta kartochka "zaxira"
       bo'lib turadi — shu sabab orqaga surganda ham bo'sh joy chiqmaydi.
     • Oldinga: yo'lak -2w ga YUMSHOQ suriladi, o'tish tugashi bilan
       o'tish o'chiriladi, BIRINCHI kartochka OXIRIGA ko'chiriladi va
       yo'lak yana -w ga qo'yiladi. Ko'z buni sezmaydi — natijada
       lenta cheksiz aylanaveradi.
     • Orqaga: avval OXIRGI kartochka BOSHIGA ko'chiriladi, keyin
       yo'lak 0 ga yumshoq qaytariladi.
   Shu sabab "oxiri" degan narsa umuman yo'q — sakrash ham, qaytish
   ham bo'lmaydi.

   Harakatning hammasi `transform` + CSS o'tishi bilan — ya'ni
   videokartada chiziladi, JS har kadrda hech narsa hisoblamaydi. */
let heroTimer = null, heroPaused = 0, heroIdx = 0, heroJami = 1, heroBusy = false;

function heroEl(){ return document.getElementById('heroTrack'); }

/* KARTOCHKA KENGLIGI KESHLANADI (V142)
   ------------------------------------------------------------------
   MUAMMO (mijoz aytgan): "asosiy bo'limda o'tib turuvchi kartochka
   qotganday bo'ladi".

   SABABLARDAN BIRI shu yer edi. `offsetWidth` o'qilishi brauzerni
   joylashuvni MAJBURAN, O'SHA ZAHOTI qayta hisoblashga undaydi
   (forced reflow). Avtomatik o'tishda u har safar, harakat
   BOSHLANISHIDAN oldin chaqirilardi — ya'ni animatsiyaning birinchi
   kadri kechikardi. Ko'zga bu "boshida bir qotib, keyin ketdi" bo'lib
   ko'rinadi.

   Kenglik faqat ekran o'lchami o'zgarganda o'zgaradi, shuning uchun u
   BIR MARTA o'lchanib keshlanadi; ekran burilganda yoki o'lcham
   o'zgarganda kesh bekor qilinadi.

   `majburiy = true` — keshni e'tiborsiz qoldirib, qaytadan o'lchash
   (karusel yangi qurilganda va barmoq tekkanda shunday qilinadi). */
let heroKenglik = 0;
function heroW(majburiy){
  if(!majburiy && heroKenglik > 1) return heroKenglik;
  const tr = heroEl(); if(!tr) return heroKenglik || 1;
  const c = tr.querySelector('.herocard');
  if(c) heroKenglik = c.offsetWidth + 14;
  return heroKenglik || 1;
}
try{
  window.addEventListener('resize', ()=>{ heroKenglik = 0; }, { passive:true });
  window.addEventListener('orientationchange', ()=>{ heroKenglik = 0; }, { passive:true });
}catch(e){}
/* Yo'lakning tinch holatdagi o'rni — doim bitta kartochka chapda */
function heroBazaga(){
  const tr = heroEl(); if(!tr) return;
  tr.classList.remove('glide','snapback');
  tr.style.transition = '';
  tr.style.transform = 'translate3d(' + (-heroW()) + 'px,0,0)';
}
function heroQoy(x, sinf){
  const tr = heroEl(); if(!tr) return;
  tr.classList.remove('glide','snapback');
  tr.style.transition = '';
  if(sinf) tr.classList.add(sinf);
  tr.style.transform = 'translate3d(' + x + 'px,0,0)';
}

/* ==================================================================
   BARMOQ UZILGANDAN KEYINGI HARAKAT
   ------------------------------------------------------------------
   MUAMMO (mijoz aytgan): qo'l bilan surganda kartochkaning joyiga
   o'tirishi noqulay edi. Sababi — qancha masofa qolganidan va
   barmoq qanchalik tez harakatlanganidan QAT'I NAZAR har doim bir
   xil 0,62 s ishlatilardi. Ya'ni:
     • deyarli oxirigacha surilgan bo'lsa ham yana 0,62 s kutilardi
       (sust tuyuladi),
     • tez silkitilganda esa oxirida keskin to'xtardi.

   KATTA ILOVALARDA QANDAY: davomiylik QOLGAN MASOFA / TEZLIK dan
   hisoblanadi va chegaralanadi, egri chiziq esa oxirida yumshoq
   so'nadi. Shuni qildik:
     davomiylik = qolgan masofa / barmoq tezligi,  260...540 ms
     egri chiziq = cubic-bezier(.25,1,.5,1)  (oxiri silliq so'nadi)
   Natijada harakat barmoq tezligining davomidek tuyuladi. */
const HERO_EGRI = 'cubic-bezier(.25,1,.5,1)';

/* AVTOMATIK O'TISH UCHUN ALOHIDA EGRI VA VAQT (V142)
   ------------------------------------------------------------------
   Ilgari avtomatik o'tish ham barmoq uzilgandagi egri chiziq bilan
   (`HERO_EGRI`) va 620 ms da bajarilardi. SHU IKKALASI BIRGA
   "qotganday" hissini berardi:

     * `cubic-bezier(.25,1,.5,1)` — INERTSIYA egrisi. U masofaning
       90% ini vaqtning dastlabki yarmida bosib o'tadi, qolgan yarmida
       esa kartochka deyarli JOYIDA TURADI. Barmoq uzilganda bu
       to'g'ri (harakat barmoqning davomidek tuyuladi), lekin
       o'z-o'zidan boshlangan harakatda ko'z buni "sudralib to'xtadi"
       deb o'qiydi.
     * 620 ms — qo'lda surishda sezilmaydi, lekin avtomatik harakat
       uchun uzoq. Zamonaviy ilovalarda bunday siljish 350-450 ms.

   Shuning uchun avtomatik o'tish endi 420 ms va ikki tomoni ham
   bir xil yumshoq bo'lgan egri chiziq bilan bajariladi: boshida
   yumshoq tezlashadi, oxirida yumshoq so'nadi, orada esa TO'XTAB
   QOLMAYDI. Barmoq uzilgandagi egri esa o'zgarmadi — u joyida
   to'g'ri ishlayapti. */
const HERO_EGRI_AVTO = 'cubic-bezier(.4,0,.2,1)';
const HERO_AVTO_MS = 420;
function heroVaqt(masofa, tezlik){
  const m = Math.abs(masofa);
  /* Pastki chegara ataylab baland: barmoq sekin uzilganda ham
     kartochka "sudralib" bormaydi, o'rtacha tezlikda o'tiradi. */
  const v = Math.max(0.45, Math.abs(tezlik || 0));   /* px/ms */
  /* V133: pastki chegara 240 -> 265 ms. Shu 25 ms harakatning
     oxiridagi "to'satdan to'xtash" hissini yo'qotadi — kartochka
     joyiga yumshoq o'tiradi. Yuqori chegara ham 460 -> 500 ms:
     uzoq masofada harakat shoshmasin. */
  return Math.max(265, Math.min(500, Math.round(m / v)));
}
/* Berilgan davomiylik bilan siljitish (sinf emas — aniq vaqt) */
function heroSur(x, ms, egri){
  const tr = heroEl(); if(!tr) return;
  tr.classList.remove('glide','snapback');
  tr.style.transition = 'transform ' + ms + 'ms ' + (egri || HERO_EGRI);
  /* brauzer boshlang'ich holatni bir marta hisoblab olsin */
  void tr.offsetWidth;
  tr.style.transform = 'translate3d(' + x + 'px,0,0)';
}
/* O'tish tugaganini kutadi. Agar `transitionend` kelmay qolsa
   (sahifa fonda qolsa shunday bo'ladi) — zaxira taymer ishga tushadi,
   shu bilan karusel hech qachon "osilib" qolmaydi. */
function heroKut(tr, ish, ms){
  let tugadi = false;
  const bajar = ()=>{
    if(tugadi) return; tugadi = true;
    tr.removeEventListener('transitionend', tinglovchi);
    ish();
  };
  const tinglovchi = (e)=>{ if(e.propertyName === 'transform') bajar(); };
  tr.addEventListener('transitionend', tinglovchi);
  setTimeout(bajar, ms || 900);
}

/* ms berilmasa — avtomatik o'tish (tinch, 620 ms).
   ms berilsa — barmoq uzilgandan keyingi hisoblangan vaqt. */
function heroOldinga(ms){
  const tr = heroEl(); if(!tr || tr.children.length < 3 || heroBusy) return;
  heroBusy = true;
  const w = heroW();                      /* keshdan — o'lchov yo'q */
  /* `ms` berilgan bo'lsa — barmoq uzildi (inertsiya egrisi bilan).
     Berilmagan bo'lsa — avtomatik o'tish (qat'iy egri, 420 ms). */
  const dav = ms || HERO_AVTO_MS;
  heroSur(-2 * w, dav, ms ? HERO_EGRI : HERO_EGRI_AVTO);
  heroKut(tr, ()=>{
    tr.classList.remove('glide','snapback');
    tr.style.transition = '';
    tr.appendChild(tr.firstElementChild);     /* birinchisi oxiriga */
    tr.style.transform = 'translate3d(' + (-w) + 'px,0,0)';
    /* V142: bu yerda `void tr.offsetWidth` bor edi — OLIB TASHLANDI.
       U brauzerni majburan joylashuv hisobiga undaydi, va aynan
       harakat TUGAGAN paytda, kadr chegarasida bajarilardi — ko'zga
       oxiridagi "silkinish" bo'lib ko'rinardi. Bu yerda uning hojati
       ham yo'q edi: o'tish allaqachon o'chirilgan (`transition=''` va
       `glide`/`snapback` sinflari olib tashlangan), ya'ni yangi
       `transform` baribir animatsiyasiz qo'yiladi. */
    heroBusy = false;
    heroIdx = (heroIdx + 1) % heroJami;
    syncDots(); heroShine();
  }, dav + 240);
}
/* ORQAGA — ENDI OLDINGA BILAN AYNAN BIR XIL (V143)
   ------------------------------------------------------------------
   MUAMMO (mijoz aytgan): "o'ngdan chapga yaxshi o'tyapti qo'l bilan,
   lekin chapdan o'ngga umuman g'alati — kartochka o'zi bilan
   qaytgani yo'q".

   SABABI TOPILDI VA U HAQIQATAN HAM JIDDIY EDI. Ikki tomon ikki xil
   usulda yozilgan edi:

     OLDINGA (chapga surish) — TO'G'RI usul:
         yo'lak barmoq qayerda uzilgan bo'lsa O'SHA YERDAN -2w ga
         yumshoq suriladi, va FAQAT animatsiya TUGAGANDAN KEYIN
         kartochkalar qayta tartiblanadi. Ya'ni harakat barmoqning
         to'xtagan joyidan uzluksiz davom etadi.

     ORQAGA (o'ngga surish) — NOTO'G'RI usul:
         animatsiyadan OLDIN oxirgi kartochka boshiga ko'chirilar va
         yo'lak darhol -2w ga QO'YILARDI. Barmoq esa -w + dx da
         uzilgan edi. Ya'ni:
             1) kartochka avval o'sha `dx` masofaga ORQAGA SAKRARDI
                (barmoqni "tashlab ketardi"),
             2) keyin to'liq bir kartochka masofasini qaytadan bosib
                o'tardi.
         Aynan shu "o'zi bilan qaytmadi" degani.

   YECHIM — ORQAGA ham OLDINGA ning KO'ZGUDAGI AKSI qilindi:
       yo'lak barmoq uzilgan joydan 0 ga yumshoq suriladi (chapdagi
       ko'rinmay turgan zaxira kartochka shunda ko'rinadi), va faqat
       animatsiya tugagach oxirgi kartochka boshiga ko'chirilib,
       yo'lak yana -w ga qo'yiladi. Ko'z buni sezmaydi.

   Natijada ikkala tomonda ham harakat barmoqning davomidek tuyuladi,
   sakrash umuman yo'q. Qo'shimcha foyda: endi bu yerda animatsiyadan
   oldin DOM qayta tartiblanmaydi va majburiy joylashuv hisobi ham
   yo'q — ya'ni orqaga surish oldingisidan tezroq boshlanadi. */
function heroOrqaga(ms){
  const tr = heroEl(); if(!tr || tr.children.length < 3 || heroBusy) return;
  heroBusy = true;
  const w = heroW();                      /* keshdan — o'lchov yo'q */
  const dav = ms || HERO_AVTO_MS;
  /* Barmoq uzilgan joydan 0 ga — uzluksiz */
  heroSur(0, dav, ms ? HERO_EGRI : HERO_EGRI_AVTO);
  heroKut(tr, ()=>{
    tr.classList.remove('glide','snapback');
    tr.style.transition = '';
    tr.insertBefore(tr.lastElementChild, tr.firstElementChild);  /* oxirgisi boshiga */
    tr.style.transform = 'translate3d(' + (-w) + 'px,0,0)';
    heroBusy = false;
    heroIdx = (heroIdx - 1 + heroJami) % heroJami;
    syncDots(); heroShine();
  }, dav + 240);
}

function startHeroLoop(){
  const box = $('#homeHero'); if(!box) return;
  const tr = heroEl(); if(!tr) return;

  heroIdx = 0;
  heroBusy = false;
  heroKenglik = 0;        /* karusel yangi qurildi — qaytadan o'lchansin */
  heroW(true);
  heroBazaga();
  syncDots();
  requestAnimationFrame(()=>{ shineWatch(); });
  heroTimerniQur();

  if(box.dataset.loop) return;      /* imo-ishora tinglovchilari bir marta */
  box.dataset.loop = '1';

  let down = false, sx = 0, sy = 0, dx = 0, lock = '';
  let lastX = 0, lastT = 0, vel = 0;
  /* V133 — SILLIQLIK.
     MUAMMO (mijoz aytgan): kartochkani qo'l bilan surganda yaxshi
     telefonda ham "qotgandek" sudralardi.

     SABABI ikkita edi:
       1) Har bir `pointermove` da `heroW()` chaqirilardi, u esa
          `offsetWidth` o'qiydi — bu brauzerni MAJBURAN joylashuvni
          qayta hisoblashga undaydi (forced reflow). Barmoq soniyasiga
          120 marta xabar beradi, ya'ni soniyasiga 120 ta ortiqcha
          hisob-kitob.
       2) Transform har bir xabarda yozilardi. Telefonda xabarlar
          kadrdan TEZROQ keladi (120 Hz sensor, 60 Hz ekran), shu
          sabab bitta kadr uchun bir necha marta yozilib, keraksiz
          ish bajarilardi.

     YECHIM:
       1) kenglik barmoq tushganda BIR MARTA o'lchanadi va keshlanadi;
       2) transform `requestAnimationFrame` ichida, kadriga BIR MARTA
          yoziladi (xabarlar esa faqat koordinatani eslab qo'yadi). */
  let dragW = 1;              /* keshlangan kartochka kengligi */
  let ramKadr = 0;            /* rAF identifikatori */
  let kutayotganX = null;     /* kadrda yoziladigan oxirgi holat */

  function kadrdaYoz(){
    ramKadr = 0;
    if(kutayotganX === null) return;
    const t = heroEl();
    if(t) t.style.transform = 'translate3d(' + kutayotganX + 'px,0,0)';
    kutayotganX = null;
  }
  function surishniRejalashtir(x){
    kutayotganX = x;
    if(!ramKadr) ramKadr = requestAnimationFrame(kadrdaYoz);
  }

  box.addEventListener('pointerdown', (e)=>{
    if(heroBusy) return;
    down = true; lock = ''; dx = 0;
    sx = e.clientX; sy = e.clientY;
    lastX = e.clientX; lastT = performance.now(); vel = 0;
    heroPaused = Date.now() + 6000;
    /* Kenglik SHU YERDA, bir marta o'lchanadi (barmoq tekkanda
       aniqligi muhim, shuning uchun keshni e'tiborsiz qoldiramiz). */
    dragW = heroW(true);
    const t = heroEl();
    /* O'tishni ham shu yerda bir marta o'chiramiz — surish paytida
       har safar emas. */
    if(t){ t.classList.remove('glide','snapback'); t.style.transition = 'none'; }
    box.classList.add('drag');
    try{ box.setPointerCapture(e.pointerId); }catch(err){}
  }, { passive:true });

  box.addEventListener('pointermove', (e)=>{
    if(!down) return;
    const mx = e.clientX - sx, my = e.clientY - sy;
    /* yo'nalishni bir marta aniqlaymiz: gorizontal bo'lsa karusel,
       vertikal bo'lsa sahifa aylansin (barmoqni ushlab qolmaymiz) */
    if(!lock){
      if(Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if(lock === 'y'){ down = false; box.classList.remove('drag'); return; }
    }
    dx = mx;
    const now = performance.now(), dt = now - lastT;
    if(dt > 0){
      vel = vel * 0.55 + ((e.clientX - lastX) / dt) * 0.45;
      lastX = e.clientX; lastT = now;
    }
    /* Ikki tomonda ham kartochka bor — shu sabab rezina qarshilik
       kerak emas, barmoq ortidan 1:1 ergashadi.
       DIQQAT: bu yerda HECH QANDAY o'lchov o'qilmaydi va uslub
       darhol yozilmaydi — faqat kadr navbatiga qo'yiladi. */
    surishniRejalashtir(-dragW + dx);
  }, { passive:true });

  const up = ()=>{
    if(!down) return;
    down = false;
    box.classList.remove('drag');
    heroPaused = Date.now() + 5000;
    /* Kutayotgan kadr bo'lsa — darhol yozib qo'yamiz, aks holda
       o'tish boshlangandan KEYIN eski holat yozilib, kartochka
       "sakrab" ketardi. */
    if(ramKadr){ cancelAnimationFrame(ramKadr); ramKadr = 0; }
    if(kutayotganX !== null){
      const t0 = heroEl();
      if(t0) t0.style.transform = 'translate3d(' + kutayotganX + 'px,0,0)';
      kutayotganX = null;
    }
    /* Barmoq to'xtab turib uzilgan bo'lsa — tezlik hisobga olinmaydi */
    if(performance.now() - lastT > 140) vel = 0;

    const w = dragW || heroW();
    const FLICK = 0.18;                       /* px/ms — sezgirroq */
    const chegara = w * 0.18;                 /* masofa chegarasi */

    /* Oldinga (chapga surilgan) */
    if(vel <= -FLICK || dx <= -chegara){
      heroOldinga(heroVaqt(w + dx, vel));     /* qolgan masofa = w - |dx| */
      return;
    }
    /* Orqaga (o'ngga surilgan) */
    if(vel >= FLICK || dx >= chegara){
      heroOrqaga(heroVaqt(w - dx, vel));
      return;
    }
    /* Yetmadi — joyiga qaytadi. Bu ham qolgan masofaga qarab. */
    heroSur(-w, heroVaqt(dx, vel * 0.6));
  };
  box.addEventListener('pointerup', up, { passive:true });
  box.addEventListener('pointercancel', up, { passive:true });
  box.addEventListener('pointerleave', up, { passive:true });

  /* Ekran kengligi o'zgarsa (burilish, kompyuterda oyna) — yo'lakni
     yangi kenglikka moslab qo'yamiz. */
  let olch = null;
  addEventListener('resize', ()=>{
    clearTimeout(olch);
    olch = setTimeout(()=>{ if(!heroBusy && !down) heroBazaga(); }, 160);
  }, { passive:true });
}

function heroTimerniQur(){
  clearInterval(heroTimer);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  /* Har 4 soniyada bitta kartochka o'tadi — to'xtamasdan, cheksiz.
     V139: sekin qurilmada 7 soniyada bir marta. Nega: har o'tish
     ~620 ms animatsiya + yo'lakni qayta tartiblash + joylashuv
     hisobi degani. Sekin Androidda bu ish har 4 soniyada qaytarilib,
     mijoz boshqa narsa qilayotganda ham fonda tezlikni yeb turardi.
     7 soniya — ko'rinishga ta'siri sezilmaydi (kartochka baribir
     almashib turadi), fon yuki esa deyarli ikki barobar kamayadi. */
  const oraliq = document.documentElement.classList.contains('low') ? 7000 : 4000;
  heroTimer = setInterval(()=>{
    if(Date.now() < heroPaused || document.hidden) return;
    const home = document.getElementById('sc-home');
    if(!home || !home.classList.contains('on')) return;
    if(!heroEl()) return;
    heroOldinga();
  }, oraliq);
}

function syncDots(){
  const dots = $$('#heroDots i');
  if(!dots.length) return;
  const i = ((heroIdx % dots.length) + dots.length) % dots.length;
  dots.forEach((d,k) => d.classList.toggle('on', k === i));
}

/* ==================================================================
   VIDEO KO'RUVCHI (V163)
   ------------------------------------------------------------------
   Kartochka bosilganda to'liq ekranli oyna ochiladi. Video faqat shu
   yerda o'ynaydi — ya'ni bir vaqtda bitta video, ovozi bilan.
   ================================================================== */
function videoOch(manba, raqam, izoh){
  const ov = document.getElementById('vidOv');
  const v  = document.getElementById('vidOvV');
  const m  = document.getElementById('vidOvM');
  if(!ov || !v || !manba) return;
  v.src = manba;
  v.muted = false;
  v.currentTime = 0;
  if(m){
    const qism = [];
    if(raqam) qism.push(`<b class="sg">${esc(shortNumber(raqam))}</b>`);
    if(izoh)  qism.push(`<i>${esc(izoh)}</i>`);
    m.innerHTML = qism.join('');
    m.style.display = qism.length ? '' : 'none';
  }
  ov.classList.add('on');
  document.body.classList.add('noscroll');
  try{ haptic('light'); }catch(e){}
  const p = v.play();
  if(p && p.catch) p.catch(()=>{ /* avtomatik o'ynash taqiqlangan — tugma bor */ });
}
function videoYop(){
  const ov = document.getElementById('vidOv');
  const v  = document.getElementById('vidOvV');
  if(!ov) return;
  ov.classList.remove('on');
  if(v){ try{ v.pause(); }catch(e){} v.removeAttribute('src'); try{ v.load(); }catch(e){} }
  if(!document.querySelector('.sheet.on')) document.body.classList.remove('noscroll');
}
document.addEventListener('click', (e)=>{
  if(e.target.closest && e.target.closest('[data-vclose]')){ videoYop(); return; }
  const ov = document.getElementById('vidOv');
  if(ov && ov.classList.contains('on') && e.target === ov){ videoYop(); return; }
  const k = e.target.closest && e.target.closest('.vcard[data-video]');
  if(!k) return;
  e.preventDefault();
  videoOch(k.dataset.video, k.dataset.vnum, k.dataset.vcap);
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    const ov = document.getElementById('vidOv');
    if(ov && ov.classList.contains('on')){ e.stopPropagation(); videoYop(); }
  }
}, true);

/* ---------- Mijozlar video fikrlari ---------- */
function renderTestimonials(){
  const wrap = $('#homeTestWrap'), box = $('#homeTest');
  if(!wrap || !box) return;
  /* V120: hali yuklanmagan bo'lsa — bo'limni YASHIRMAYMIZ, skelet
     ko'rsatamiz. Ilgari internet sekin bo'lsa bu joy umuman yo'q edi
     va sahifa "kalta" ko'rinardi; yuklangach esa to'satdan paydo
     bo'lib, sahifa sakrardi. */
  if(!TEST_YUKLANDI){ wrap.style.display = ''; box.innerHTML = skVideos(4); return; }
  if(!TESTIMONIALS.length){ wrap.style.display = 'none'; return; }
  wrap.style.display = '';

  /* ==================================================================
     MIJOZLAR FIKRI — V148 DA TUZATILDI
     ------------------------------------------------------------------
     NIMA BUZILGAN EDI (men kiritgan xato). V145 da tezlik uchun
     `preload="none"` qo'ygandim. U tarmoq so'rovlarini kamaytirdi,
     LEKIN birinchi kadr ham yuklanmay qoldi — natijada kartochkalar
     QOP-QORA bo'sh quti bo'lib ko'rindi, ustida xunuk brauzer
     tugmalari bilan. Mijoz "umuman ko'rinmayapti" degani aynan shu.

     ENDI QANDAY ISHLAYDI — ikkalasi ham bor: tez ham, ko'rinadi ham.

       1) Video DARHOL yuklanmaydi (`preload="none"`) — sahifa
          ochilishida bitta ham ortiqcha so'rov ketmaydi.
       2) Kartochka EKRANGA YAQINLASHGANDA (IntersectionObserver)
          `preload` "metadata" ga o'tadi va birinchi kadr chiqadi.
          Ya'ni mijoz ko'rayotgan kartochkagina yuklanadi.
       3) Agar bazada muqova rasmi bo'lsa (`posterUrl`/`thumbUrl`),
          u DARHOL qo'yiladi — rasm videodan ancha yengil.
       4) Brauzerning xunuk tugmalari olib tashlandi. O'rniga toza
          "ijro" belgisi; bosilganda video o'ynaydi va shundagina
          tugmalar chiqadi.

     YANA BIR XATO TUZATILDI: `videoUrl` bo'sh bo'lgan yozuvlar endi
     TASHLAB KETILADI. Ilgari ular `<video src="#t=0.1">` bo'lib
     qolardi, bu esa manzil sifatida SAHIFANING O'ZINI bildiradi —
     brauzer har bir bunday kartochka uchun butun sahifani (220 KB)
     "video" deb qaytadan yuklardi. */
  const royxat = TESTIMONIALS.filter(v => v && String(v.videoUrl || '').trim()).slice(0, 10);
  if(!royxat.length){ wrap.style.display = 'none'; return; }

  /* ==================================================================
     V163 — "VIDEO UMUMAN OCHILMAYAPTI" TUZATILDI
     ------------------------------------------------------------------
     Ikki xato bor edi:
       1) `preload="none"` tufayli birinchi kadr ham yuklanmasdi —
          kartochka qop-qora quti bo'lib turardi. Mijoz u yerda
          QANDAY video borligini umuman ko'rmasdi.
       2) Video kartochkaning ICHIDA o'ynardi. Brauzer tugmalari
          kartochka bosilishi bilan urishib, ko'pincha video darhol
          to'xtab qolardi — "ochilmayapti" degani shu.

     ENDI:
       - Birinchi TO'RTTA kartochka `preload="metadata"` bilan
         chiziladi: birinchi kadr darhol ko'rinadi, ya'ni qanday
         video ekani DOIM bilinadi. Qolganlari ekranga yaqinlashganda
         yuklanadi (tarmoq tejaladi).
       - Bosilganda TO'LIQ EKRANLI ko'ruvchi ochiladi: katta, ovozi
         bilan, oddiy tugmalar bilan. Bu yerda hech narsa urishmaydi.
     ================================================================== */
  box.innerHTML = royxat.map((v, i) => {
    const muqova = String(v.posterUrl || v.thumbUrl || v.poster || '').trim();
    const oldin  = i < 4 ? 'metadata' : 'none';
    const sarlavha = String(v.caption || '').trim();
    return `
    <div class="vcard" data-video="${esc(v.videoUrl)}" data-vnum="${esc(v.number || '')}" data-vcap="${esc(sarlavha)}">
      <div class="vwrap">
        <video src="${esc(v.videoUrl)}#t=0.1" preload="${oldin}" playsinline muted
               ${muqova ? `poster="${esc(muqova)}"` : ''}></video>
        <span class="vshade" aria-hidden="true"></span>
        <button class="vplay" type="button" aria-label="${esc(t('Ko\'rish'))}">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"></path></svg>
        </button>
        ${v.number ? `<span class="vnum sg">${esc(shortNumber(v.number))}</span>` : ''}
      </div>
      <div class="vm">
        ${sarlavha ? `<i>${esc(sarlavha)}</i>` : `<i>${esc(t('Mijoz fikri'))}</i>`}
      </div>
    </div>`; }).join('');

  fikrlarKuzatuvi(box);
}

/* Ekranga yaqinlashgan kartochkaning birinchi kadrini yuklaydi.
   Bir marta yuklangach kuzatuvdan chiqariladi — keraksiz ish yo'q. */
let FIKR_KUZ = null;
function fikrlarKuzatuvi(box){
  try{
    if(!('IntersectionObserver' in window)){
      /* Eski brauzer — hammasini oddiy yo'l bilan ko'rsatamiz */
      box.querySelectorAll('video').forEach(v => { v.preload = 'metadata'; });
      return;
    }
    if(FIKR_KUZ) FIKR_KUZ.disconnect();
    FIKR_KUZ = new IntersectionObserver((yozuvlar, kuz)=>{
      yozuvlar.forEach(y=>{
        if(!y.isIntersecting) return;
        const v = y.target.querySelector('video');
        if(v && v.preload !== 'metadata'){ v.preload = 'metadata'; try{ v.load(); }catch(e){} }
        kuz.unobserve(y.target);
      });
    }, { root:null, rootMargin:'300px', threshold:0 });
    box.querySelectorAll('.vcard').forEach(c => FIKR_KUZ.observe(c));
  }catch(e){}
}
function videoPreload(){
  try{
    const c = navigator.connection;
    if(c && (c.saveData || /2g/.test(c.effectiveType||''))) return 'none';
  }catch(e){}
  /* V145 — SEKIN TELEFON VA TELEGRAM UCHUN.
     `preload="metadata"` har bir video uchun ALOHIDA tarmoq so'rovi
     yuboradi va fayl boshidan bir necha yuz kilobayt tortadi. Bosh
     sahifada 10 tagacha video bor — ya'ni mijoz ularni ko'rmasa ham
     o'nlab so'rov va megabaytlab trafik ketardi.

     Mini ilova va sekin telefonda bu eng sezilarli yuklardan biri
     edi: videolar ekranning pastida, lekin tarmoqni va protsessorni
     SAHIFA OCHILISHIDA band qilardi.

     Endi u yerda umuman oldindan yuklanmaydi — mijoz videoni bossa,
     o'shanda yuklanadi. Kuchli telefonda avvalgidek qoladi. */
  try{
    const d = document.documentElement.classList;
    if(d.contains('low') || d.contains('tg')) return 'none';
  }catch(e){}
  return 'metadata';
}

/* ==================================================================
   KATALOG (qidiruv + ro'yxat bitta bo'limda)
   ================================================================== */
let catOp = '', catSort = 'default', catShown = PAGE_SIZE, catOnlyInstallment = false, catNaqsh = '';
/* Bosh sahifadagi toifalar lentasidan ("stories") keladigan filtrlar */
let catToifa = '', catYangi = false;

/* ==================================================================
   NAQSH BO'YICHA QIDIRUV
   ------------------------------------------------------------------
   Mijozlar raqamni ko'pincha "ko'rinishi" bo'yicha tanlaydi:
   7777 (bir xil), 0707 (juft), 7788 (ikki juft), 1234 (ketma-ket),
   oxiri 00 (yumaloq). Bu hammasi oxirgi 4 xonaga qaraydi.

   TEZLIK: raqamning 9 xonasi indeks ochilayotganda allaqachon
   `d9` maydoniga yozib qo'yilgan — shu sabab bu yerda hech narsa
   qayta hisoblanmaydi, faqat 4 ta belgi tekshiriladi. 5000 raqam
   uchun ~1 ms.
   ================================================================== */
const NAQSHLAR = [
  { k:'aaaa', nom:'7777', izoh:'Bir xil',     ok:(d)=> d[0]===d[1] && d[1]===d[2] && d[2]===d[3] },
  { k:'abab', nom:'0707', izoh:'Juft',        ok:(d)=> d[0]===d[2] && d[1]===d[3] && d[0]!==d[1] },
  { k:'aabb', nom:'7788', izoh:'Ikki juft',   ok:(d)=> d[0]===d[1] && d[2]===d[3] && d[0]!==d[2] },
  { k:'ketma',nom:'1234', izoh:'Ketma-ket',   ok:(d)=>{
      const a=+d[0],b=+d[1],c=+d[2],e=+d[3];
      return (b===a+1 && c===b+1 && e===c+1) || (b===a-1 && c===b-1 && e===c-1); } },
  { k:'nol',  nom:'00',   izoh:'Yumaloq',     ok:(d)=> d[2]==='0' && d[3]==='0' }
];
const NAQSH_MAP = Object.fromEntries(NAQSHLAR.map(x => [x.k, x]));

/* Raqamning oxirgi 4 xonasi (indeksda tayyor bo'lmasa — hisoblanadi) */
function oxirgi4(n){
  const d = n.d9 || String(n.number || '').replace(/\D/g, '').slice(-9);
  return d.slice(-4);
}
function naqshMos(n, k){
  const t = NAQSH_MAP[k];
  if(!t) return true;
  const d = oxirgi4(n);
  return d.length === 4 && t.ok(d);
}
let RK = {};
function reshuffle(){ RK = {}; NUMBERS.forEach(n => { RK[n.id] = Math.random(); }); }
/* Tartib kaliti. MUHIM: ilgari ro'yxatda bo'lmagan raqam uchun
   `Math.random()` TO'G'RIDAN-TO'G'RI solishtirishda chaqirilardi —
   ya'ni har solishtirishda boshqa son chiqib, tartib BEQAROR bo'lardi.
   Natijada "Yana ko'rsatish" bosilganda butun ro'yxat qaytadan
   aralashib ketardi. Endi kalit bir marta beriladi va eslab qolinadi. */
function rkOf(n){
  const id = n && n.id;
  if(!id) return 0;
  if(RK[id] == null) RK[id] = Math.random();
  return RK[id];
}
let LIVE_RESULTS = [], liveBusy = false;
/* Bazadagi jami raqam soni va "katalog to'liq yuklanganmi" belgisi */
let KATALOG_JAMI = 0;
const katalogKesilgan = () => KATALOG_JAMI > NUMBERS.length + 50;
/* Qidiruv FAQAT tugma bosilganda ishga tushadi.
   COMMITTED — tasdiqlangan naqsh; kiritish paytida ro'yxat o'zgarmaydi. */
let COMMITTED = null;

function typedPattern(){ return $$('#digits input').map(b => b.value.trim()); }
function currentMask(){ return typedPattern().map(d => d || '_').join(''); }
function patternActive(){ return !!COMMITTED; }
function localMatch(list){
  const p = COMMITTED;
  if(!p || p.every(d => !d)) return list;
  return list.filter(n => {
    const d = String(n.number||'').replace(/\D/g,'').slice(-7);
    if(d.length !== 7) return false;
    return p.every((ch,i) => !ch || d[i] === ch);
  });
}
let SERVER_TOPILDI = [], SERVER_SONI = 0;
function catalogItems(){
  let list = localMatch(NUMBERS.slice());
  /* Serverdan kelgan natijalar — bazamizdagilar bilan birlashtiriladi
     (takrorlanmasligi uchun raqam bo'yicha tekshiriladi) */
  if(SERVER_TOPILDI.length){
    const bor = new Set(list.map(n => String(n.number).replace(/\D/g,'').slice(-9)));
    list = list.concat(SERVER_TOPILDI.filter(x => !bor.has(String(x.number).replace(/\D/g,'').slice(-9))));
  }
  if(LIVE_RESULTS.length){
    const have = new Set(list.map(n => String(n.number).replace(/\D/g,'').slice(-9)));
    list = list.concat(LIVE_RESULTS.filter(l => !have.has(String(l.number).replace(/\D/g,'').slice(-9))));
  }
  if(catOp) list = list.filter(n => n.operator === catOp);
  if(catOnlyInstallment || catSort === 'installment') list = list.filter(n => installmentAllowed(n));
  if(catNaqsh) list = list.filter(n => naqshMos(n, catNaqsh));
  if(catToifa) list = list.filter(n => tierOf(n) === catToifa);
  if(catYangi){
    /* "Yangi" — oxirgi 14 kun ichida qo'shilganlar (qadoqda `addedAt`) */
    const chek = Date.now() - 14 * 86400000;
    list = list.filter(n => Number(n.addedAt || 0) > chek);
  }
  /* V150: narx oralig'i */
  if(narxFiltrBor()) list = list.filter(narxMos);
  /* V162: naqsh turi */
  if(catNaqshTur) list = list.filter(n => naqshAniqla(n.number).some(x => x.kalit === catNaqshTur));
  list.sort((a,b)=>{
    if(!!a.reserved !== !!b.reserved) return a.reserved ? 1 : -1;
    if(catSort === 'cheap') return (a.price||0)-(b.price||0);
    if(catSort === 'expensive') return (b.price||0)-(a.price||0);
    /* standart tartib — har safar bo'limga kirganda tasodifiy */
    return rkOf(a) - rkOf(b);
  });
  return list;
}
const SORTS = [['default','Tasodifiy'],['cheap','Avval arzoni'],['expensive','Avval qimmati'],['installment',"Bo'lib to'lash"]];

/* ==================================================================
   NARX BO'YICHA FILTR (V150)
   ------------------------------------------------------------------
   MUAMMO. Katalogda operator, toifa va "bo'lib to'lash" filtri bor
   edi, lekin NARX bo'yicha filtr yo'q edi. Raqamlar 9 mln dan 42 mln
   gacha — mijoz "20 mln gacha" deb qidira olmasdi va o'nlab
   kartochkani qo'lda ko'rib chiqishiga to'g'ri kelardi.

   QIYMAT SO'MDA SAQLANADI, lekin mijozga MLN da ko'rsatiladi:
   "20 000 000" emas, "20 mln" — telefonda yozish ham, o'qish ham
   osonroq.

   NOZIK JOY — DOLLARLI RAQAMLAR. Ba'zi raqamlar dollarda
   narxlanadi. Ularni so'mdagi oraliq bilan solishtirib bo'lmaydi
   (kurs yo'q), shuning uchun narx filtri YOQILGANDA ular
   ko'rsatilmaydi. Bazada dollarli raqam bo'lsa, filtr oynasida
   bu haqda bitta qator izoh chiqadi — mijoz nega kamayganini
   bilib turadi. */
let catNarxMin = 0, catNarxMax = 0;        /* so'mda; 0 = qo'yilmagan */
/* V162: naqsh turi bo'yicha filtr ('' = hammasi) */
let catNaqshTur = '';
const narxFiltrBor = () => catNarxMin > 0 || catNarxMax > 0;

/* Tayyor oraliqlar — faqat ichida raqam BORLARI ko'rsatiladi */
const NARX_TAYYOR = [
  [0,        10000000, '10 mln gacha'],
  [10000000, 20000000, '10–20 mln'],
  [20000000, 35000000, '20–35 mln'],
  [35000000, 0,        '35 mln+']
];
/* Raqam shu oraliqqa tushadimi */
function narxMos(n){
  if(!narxFiltrBor()) return true;
  if(isUsd(n)) return false;              /* yuqoridagi izohga qarang */
  const v = Number(n.price) || 0;
  if(catNarxMin && v < catNarxMin) return false;
  if(catNarxMax && v > catNarxMax) return false;
  return true;
}
/* "20000000" -> "20",  "1500000" -> "1,5" */
const mlnMatn = (v) => {
  if(!v) return '';
  const m = v / 1000000;
  return (Math.round(m * 10) / 10).toString().replace('.', ',');
};
const mlnSon = (matn) => {
  const x = parseFloat(String(matn || '').replace(',', '.').replace(/[^\d.]/g, ''));
  return (isFinite(x) && x > 0) ? Math.round(x * 1000000) : 0;
};

function renderCatalog(){
  /* Qidiruv ketayotganda: ro'yxat o'zgarmaydi — faqat oqaradi,
     tepada esa "Qidirilmoqda" animatsiyasi turadi. Natija FAQAT
     server javob bergandan keyin, bir marta almashadi. */
  if(liveBusy){
    setSearchBusy(true);
    $('#searchInfo').innerHTML = '';
    const lst = $('#catList');
    if(lst){
      /* eski raqamlar umuman ko'rinmasin — faqat "yuklanmoqda" kartochkalari */
      const n = Math.min(Math.max(lst.querySelectorAll('.numcard').length || 6, 4), 8);
      if(!lst.dataset.skel){ lst.innerHTML = skeletons(n); lst.dataset.skel = '1'; }
      lst.classList.remove('is-loading');
    }
    $('#catMore').style.display = 'none';
    return;
  }
  { const lst = $('#catList'); if(lst) delete lst.dataset.skel; }
  setSearchBusy(false);
  $('#catList').classList.remove('is-loading');

  const all = localMatch(NUMBERS);
  const counts = {};
  all.forEach(n => { if(n.operator) counts[n.operator] = (counts[n.operator]||0)+1; });
  LIVE_RESULTS.forEach(n => { if(n.operator) counts[n.operator] = (counts[n.operator]||0)+1; });
  const ops = Object.keys(counts).sort((a,b)=> counts[b]-counts[a]);
  const total = all.length + LIVE_RESULTS.length;
  const opAv = (op) => {
    const m = opMeta(op), ini = esc(String(op||'?').slice(0,2).toUpperCase());
    /* XAVFSIZLIK (V75): ilgari bu yerda inline `onerror="...'${ini}'..."`
       ishlatilardi — ya'ni ma'lumot HTML atributi ICHIDAGI JS satriga
       tushardi (u yerda `esc()` himoya qilmaydi: `&#39;` brauzerda
       yana apostrofga aylanadi). Endi inline hodisa YO'Q: rasm
       yuklanmasa, zaxira ko'rinish CSS klassi bilan hal qilinadi. */
    return m.logo
      ? `<span class="av logo" style="--av-rang:${m.color}" data-ini="${ini}"><img src="${m.logo}" alt="${esc(op||'')}" loading="lazy" decoding="async" onerror="this.remove()"></span>`
      : `<span class="av" style="background:${m.color}">${ini}</span>`;
  };
  $('#catOps').innerHTML =
    `<button class="op${catOp?'':' on'}" data-catop="">
       <span class="av" style="background:linear-gradient(140deg,#2457E6,#1B44B5)">
         <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
       </span>
       <span>${t('Hammasi')}</span><span class="cnt sg">${total}</span>
     </button>` +
    ops.map(op => `<button class="op${catOp===op?' on':''}" data-catop="${esc(op)}">
       ${opAv(op)}<span>${esc(op)}</span><span class="cnt sg">${counts[op]}</span>
     </button>`).join('');
  /* tanlangan operator ko'rinib tursin */
  requestAnimationFrame(()=>{
    const on = $('#catOps .op.on');
    if(!catOp){ const bx = $('#catOps'); if(bx) bx.scrollTo({left:0}); return; }
    if(on && on.parentElement.scrollWidth > on.parentElement.clientWidth){
      const box = on.parentElement;
      const l = on.offsetLeft - (box.clientWidth - on.offsetWidth)/2;
      box.scrollTo({ left: Math.max(0, l), behavior:'smooth' });
    }
  });

  const ds = $('#deskSort');
  if(ds) ds.innerHTML = SORTS.map(s => `<button class="chip${catSort===s[0]?' on':''}" data-sort="${s[0]}" style="justify-content:center">${t(s[1])}</button>`).join('');

  const list = catalogItems();
  /* V120: yuklanmagan bo'lsa "Yuklanmoqda…" SO'ZI emas, skelet
     chizig'i turadi — mijoz so'rovi: "hattoki yozuvlarigacha". */
  /* V163 (mijoz so'rovi): bazadagi raqamlar soni KO'RSATILMAYDI.
     Sabab: son qancha raqam borligini oshkor qiladi va sarlavhani
     "ombor hisoboti"ga o'xshatadi — premium taassurotni buzadi. */
  $('#filterDot').style.display = (catOp || catSort!=='default' || narxFiltrBor() || catNaqshTur) ? '' : 'none';

  $('#searchInfo').innerHTML = (patternActive() && !liveBusy)
    ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
         <span class="eyebrow" style="flex:1">${list.length ? list.length + ' ' + t('ta natija') : t("Natija yo'q")}</span>
         <button class="chip" id="searchReset" style="padding:7px 12px;font-size:12px">${t('Tozalash')}</button>
       </div>` : '';

  if(!numbersLoaded && !list.length){ $('#catList').innerHTML = skeletons(6); $('#catMore').style.display='none'; return; }
  if(!list.length){
    $('#catList').innerHTML = emptyBox(IC_SEARCH, t('Bunday raqam topilmadi'),
      LANG==='ru' ? 'Нет подходящего номера. Измените комбинацию или закажите особый номер.'
                  : "Mos raqam yo'q. Boshqa kombinatsiya kiriting yoki maxsus buyurtma bering.",
      t('Maxsus buyurtma'), 'data-sheet="custom"');
    $('#catMore').style.display='none'; return;
  }
  /* ===== RO'YXAT: QAYTA QURILMAYDI, QO'SHILADI =====
     "Yana ko'rsatish" bosilganda ilgari butun ro'yxat qaytadan
     chizilardi: mijoz o'qiyotgan joyi yo'qolib, kartochkalar boshidan
     paydo bo'lardi. Endi filtr o'zgarmagan bo'lsa FAQAT yangi 15 ta
     kartochka oxiriga qo'shiladi — ko'z o'sha joyda qoladi, yangilari
     esa birin-ketin yumshoq chiqadi. */
  const lst = $('#catList');
  const kesim = list.slice(0, catShown);
  const imzo = [catOp, catSort, catNaqsh, catToifa, catYangi ? 1 : 0, catOnlyInstallment ? 1 : 0,
                (COMMITTED || []).join(''), list.length, LIVE_RESULTS.length].join('|');

  if(lst.dataset.sig === imzo && lst.children.length && kesim.length > lst.children.length){
    const bor = lst.children.length;
    const yangi = kesim.slice(bor);
    const vaqt = document.createElement('div');
    vaqt.innerHTML = yangi.map(n => numCard(n)).join('');
    const frag = document.createDocumentFragment();
    /* V139: sekin qurilmada animatsiya umuman qo'yilmaydi — na sinf,
       na kechikish, na tozalash taymeri. Shunda 15 ta kartochka uchun
       30 ta ortiqcha uslub yozuvi va bir soniyalik animatsiya
       bajarilmaydi (izohi uslublarda: `html.low .numcard.yangi`). */
    const sust = document.documentElement.classList.contains('low');
    let i = 0;
    while(vaqt.firstElementChild){
      const el = vaqt.firstElementChild;
      if(!sust){
        el.classList.add('yangi');
        /* bir-biridan 45 ms kechikib chiqadi — "to'kilib tushgan" emas,
           ketma-ket ochilgandek ko'rinadi */
        el.style.animationDelay = (i++ * 45) + 'ms';
      }
      frag.appendChild(el);
    }
    lst.appendChild(frag);
    /* animatsiya tugagach sinf olib tashlanadi, aks holda keyingi
       chizishda qaytadan o'ynardi */
    if(!sust) setTimeout(()=>{
      lst.querySelectorAll('.numcard.yangi').forEach(el => {
        el.classList.remove('yangi'); el.style.animationDelay = '';
      });
    }, 700 + yangi.length * 45);
  }else{
    lst.dataset.sig = imzo;
    lst.innerHTML = kesim.map(n => numCard(n)).join('');
    /* BIRINCHI CHIZISHDA HAM kartochkalar birin-ketin chiqadi (ilgari
       bu faqat "Yana ko'rsatish"da bor edi — natijada filtr
       almashganda ro'yxat "birdan tarsillab" paydo bo'lardi).
       Faqat ko'rinadigan dastlabki 8 tasi animatsiyalanadi: pastdagilar
       baribir ekrandan tashqarida, ularga vaqt sarflash shart emas. */
    if(!document.documentElement.classList.contains('low')){
      const birinchi = Array.prototype.slice.call(lst.children, 0, 8);
      birinchi.forEach((el, i) => {
        el.classList.add('yangi');
        el.style.animationDelay = (i * 38) + 'ms';
      });
      setTimeout(()=>{
        birinchi.forEach(el => { el.classList.remove('yangi'); el.style.animationDelay = ''; });
      }, 700 + birinchi.length * 38);
    }
  }

  const more = list.length > catShown;
  $('#catMore').style.display = more ? '' : 'none';
  if(more) $('#catMore').textContent = `${t("Yana ko'rsatish")} (${Math.min(PAGE_SIZE, list.length - catShown)})`;
}

function renderFavorites(){
  /* V120: katalog hali yuklanmagan bo'lsa, saqlangan ID'lar bo'yicha
     raqamni TOPIB bo'lmaydi — ilgari bunday paytda "Sevimlilar bo'sh"
     deb ko'rsatilardi, ya'ni mijoz saqlagan raqamlari YO'QOLGAN deb
     o'ylardi. Endi skelet turadi. */
  if(!numbersLoaded && FAVORITES.length){
    skSub($('#favCount'));
    const eb0 = $('#favEdit'); if(eb0) eb0.style.display = 'none';
    $('#favList').innerHTML = skeletons(Math.min(FAVORITES.length, 4));
    return;
  }
  const items = FAVORITES.map(id => favItem(id)).filter(Boolean);
  $('#favCount').textContent = items.length ? `${items.length} ${t('ta saqlangan raqam')}` : t('Hali hech narsa saqlanmagan');
  const eb = $('#favEdit'); if(eb) eb.style.display = items.length ? 'flex' : 'none';
  if(!items.length) FAV_EDIT = false;
  const DEL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4.5h6V7"></path></svg>';
  const wrap = (n) => `<div class="swipe${FAV_EDIT?' open':''}" data-sw="${esc(n.id)}">
      <button class="swipe-del" data-unfav="${esc(n.id)}" aria-label="${t("O'chirish")}">${DEL}<span>${t("O'chirish")}</span></button>
      <div class="swipe-in">${numCard(n)}</div>
    </div>`;
  $('#favList').innerHTML = items.length ? items.map(wrap).join('')
    : emptyBox(IC_HEART_B, t("Sevimlilar bo'sh"), t("Yoqqan raqamni yurakcha tugmasi bilan belgilang — u shu yerda saqlanadi."), t('Katalogga o\'tish'), 'data-go="catalog"');
}

/* Nusxalab qo'yilgan raqamni kataklarga joylaydi */
function fillQuick(digits){
  const boxes = $$('#digits input');
  boxes.forEach(b => { b.value = ''; });
  const d = String(digits||'').replace(/\D/g,'');
  for(let i=0;i<d.length && i<7;i++) boxes[7 - d.length + i].value = d[i];
  syncDigits();
  const next = boxes.find(b => !b.value);
  (next || boxes[6]).focus();
}
/* katakchalar holati: to'lganmi, tozalash tugmasi ko'rinsinmi */
function syncDigits(){
  const boxes = $$('#digits input');
  let n = 0;
  boxes.forEach(b => {
    const v = !!b.value;
    if(v) n++;
    b.classList.toggle('has', v);
    /* Raqam <input> da emas, ustidagi qatlamda chiziladi — shunda u
       barcha brauzerlarda aniq markazda turadi (yuqoridagi CSS izohi). */
    const cl = b.parentElement, g = cl && cl.querySelector('.cl-g');
    if(cl) cl.classList.toggle('has', v);
    if(g) g.textContent = v ? b.value : (g.dataset.ph || '');
  });
  $$('.srch-cells .srch-dash').forEach((d, i) => d.classList.toggle('on', n > (i === 0 ? 2 : 4)));
}

/* "Qidirish" tugmasining o'zi "Qidirilmoqda…" ga aylanadi */
function setSearchBusy(on){
  const b = $('#btnLive'); if(!b) return;
  if(on){
    if(b.classList.contains('busy')) return;
    b.dataset.html = b.innerHTML;
    b.classList.add('busy');
    b.innerHTML = `<span class="bspin"></span><span>${t('Qidirilmoqda')}<span class="bdots"></span></span>`;
  }else{
    if(!b.classList.contains('busy')) return;
    b.classList.remove('busy');
    if(b.dataset.html) b.innerHTML = b.dataset.html;
  }
}

/* ---------- Qidiruv: avval server, keyin bazamiz qo'shiladi ---------- */
async function liveSearch(){
  const mask = currentMask();
  if(mask === '_______'){
    /* raqam kiritilmagan bo'lsa — har safar bazadan tasodifiy raqamlar */
    COMMITTED = null; LIVE_RESULTS = []; SERVER_TOPILDI = []; SERVER_SONI = 0;
    catSort = 'default'; catOnlyInstallment = false; catNaqsh = ''; reshuffle(); catShown = PAGE_SIZE;
    haptic('light');
    liveBusy = true; renderCatalog();
    await new Promise(r => setTimeout(r, 600));
    liveBusy = false; renderCatalog();
    haptic('ok');
    return;
  }
  haptic('light');
  liveBusy = true; LIVE_RESULTS = []; SERVER_TOPILDI = []; SERVER_SONI = 0;
  COMMITTED = null; catShown = PAGE_SIZE; renderCatalog();
  const started = Date.now();
  const url = FN + 'api-live-search?limit=40&mask=' + encodeURIComponent(mask);
  const once = async ()=>{
    const ctrl = new AbortController();
    const tm = setTimeout(()=> ctrl.abort(), kutishVaqti(9000));
    try{
      const res = await fetch(url, { signal: ctrl.signal });
      const data = await res.json();
      if(data.ok !== true) throw new Error(data.error || 'Qidiruv xatosi');
      return data.items || [];
    } finally { clearTimeout(tm); }
  };
  let items = [];
  try{
    try{ items = await once(); }
    catch(e){ await new Promise(r => setTimeout(r, 700)); items = await once(); }
    netMarkOk();
  }catch(err){
    toast(xatoMatni(err),'bad');   /* server javob bermasa ham bazamizdan ko'rsatamiz */
  }

  /* ---- KATTA KATALOG: qidiruv serverda ----
     Katalog 8000 tadan oshsa, brauzerda hammasi bo'lmaydi. Shu sabab
     naqsh bo'yicha qidiruv SERVERGA yuboriladi: u millionlab raqam
     ichidan `last1..last4` indeksi orqali bir zumda topadi va
     natijani o'sha qadoqlangan formatda qaytaradi. */
  if(katalogKesilgan()){
    try{
      const u = FN + 'api-index?p=' + encodeURIComponent(mask) + '&limit=80'
              + (catOp ? '&op=' + encodeURIComponent(catOp) : '')
              + (catOnlyInstallment ? '&ins=1' : '');
      const sr = await withClientTimeout(fetch(u).then(x=>x.json()), kutishVaqti(9000));
      if(sr && sr.ok && typeof sr.rows === 'string'){
        SERVER_TOPILDI = indeksniOch(sr);
        SERVER_SONI = Number(sr.topildi) || SERVER_TOPILDI.length;
      }
    }catch(e){ /* topilmasa bazamizdagidan ko'rsatamiz */ }
  }else{ SERVER_TOPILDI = []; SERVER_SONI = 0; }
  /* animatsiya "lip etib" o'tib ketmasligi uchun kamida 900 ms ko'rsatiladi */
  const wait = 900 - (Date.now() - started);
  if(wait > 0) await new Promise(r => setTimeout(r, wait));
  LIVE_RESULTS = items;
  COMMITTED = typedPattern();     /* endi bazamizdan ham mos raqamlar qo'shiladi */
  liveBusy = false; catShown = PAGE_SIZE;
  renderCatalog();
  const total = catalogItems().length;
  haptic(total ? 'ok' : 'warn');
  if(!total){
    /* Pastdan chiqadigan xabar YO'Q — mijoz so'rovi. Ro'yxat
       o'rnida "topilmadi" oynasi allaqachon chiqadi, ikki marta
       aytish shart emas. Analitika esa ishlayveradi. */
    try{ trackMiss(typedPattern()); }catch(e){}
  }
}


/* ===== 3-qism (avvalgi index.html, 6694-satr) ===== */

'use strict';

/* ==================================================================
   RAQAM TAFSILOTI
   ================================================================== */
let CURRENT = null;
const findItem = (id) =>
  NUMBERS.find(n => n.id === id) ||
  LIVE_RESULTS.find(n => n.id === id) ||
  /* Kun tavsiyasidagi jonli raqam — faqat shu ro'yxatda bo'ladi */
  (typeof DAY_OBJS !== 'undefined' ? DAY_OBJS[id] : null) ||
  /* Story ichidagi savdo bloki raqami (admin kiritgan) */
  (typeof STORY_OBJS !== 'undefined' ? STORY_OBJS[id] : null) ||
  FAV_ITEMS[id] || null;

function openDetail(id){
  try{ oxirgiQosh(id); }catch(e){}   /* V149: oxirgi ko'rilganlar ro'yxati */
  const item = findItem(id); if(!item) return;
  CURRENT = item;
  /* analitika: qaysi raqam qancha ochildi */
  try{ trackNumClick(item); trackNumView(item); }catch(e){}
  try{ if(window.PWA) PWA.seen(); }catch(e){}
  const m = opMeta(item.operator), fav = isFav(item.id), disc = discountPct(item);
  const fin = installmentFinancingFor(item);

  $('#dtHead').innerHTML = `
  <div style="background:var(--navy-grad);padding:calc(var(--top) + 16px) 20px 24px;position:relative;overflow:hidden;flex:none">
    <div style="position:absolute;right:-50px;top:-50px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(230,200,119,.2),transparent 68%)"></div>
    <div style="position:relative;display:flex;align-items:center;gap:10px">
      <button class="iconbtn" data-close aria-label="Yopish" style="background:rgba(255,255,255,.12);border-color:transparent;color:#fff">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"></path></svg></button>
      <span style="flex:1"></span>
      <!-- ULASHISH. Havola do'stga yuborilganda Telegram/Instagram
           shu raqamning kartochkasini (raqam, operator, narx) chizib
           ko'rsatadi — netlify/functions/og-raqam.js.
           "Nusxa olish" tugmasi esa mijoz so'roviga ko'ra yo'q:
           raqamning O'ZIGA bosilsa baribir nusxalanadi. -->
      <button class="iconbtn" data-share aria-label="Ulashish" style="background:rgba(255,255,255,.12);border-color:transparent;color:#fff;margin-right:8px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-7"></path><path d="M12 3v12M8 6.5 12 3l4 3.5"></path></svg></button>
      <button class="iconbtn" data-fav="${esc(item.id)}" aria-label="Sevimlilar" style="background:rgba(230,200,119,.18);border-color:transparent;color:#E6C877">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="${fav?'currentColor':'none'}" stroke="#E6C877" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6c0 4.8-7 9.4-7 9.4z"></path></svg></button>
    </div>
    <div style="position:relative;margin-top:26px">
      <div class="sg dt-num" data-copy>${esc(shortNumber(item.number))}</div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#C9D6E8;font-weight:600"><i style="width:7px;height:7px;border-radius:2px;background:${m.color};display:inline-block"></i>${esc(item.operator||'')}</span>
      </div>
    </div>
  </div>`;

  /* `item.installment` emas, `installmentAllowed` — operator
     moliyalashtirishi yoki kun taklifi bo'lgan raqamda ham
     bo'lib to'lash ko'rsatilsin. */
  const priceCard = (installmentAllowed(item) && !isUsd(item))
    ? `<div class="card">
        <div class="eyebrow">${t("Bo'lib to'lash")}</div>
        <div class="sg" style="margin-top:8px;font-size:23px;font-weight:700;color:var(--blue-text)">${esc(installmentTeaser(item))}</div>
       </div>`
    : `<div class="card" style="display:flex;align-items:center;gap:14px">
        <div style="flex:1">
          <div class="eyebrow">${t('Narxi')}</div>
          <div class="sg" style="margin-top:7px;font-size:25px;font-weight:700">${formatPrice(item.price)} ${isUsd(item)?'<span class="cur-usd">$</span>':`<span style="font-family:'Plus Jakarta Sans';font-size:13px;color:var(--muted-2);font-weight:600">${SUM()}</span>`}</div>
        </div>
        ${disc ? `<div style="text-align:right">
          <div class="sg" style="font-size:13px;color:var(--muted-2);text-decoration:line-through">${formatPrice(item.oldPrice)}</div>
          <span class="tag green" style="display:inline-block;margin-top:6px;font-size:10.5px">−${disc}%</span></div>` : ''}
       </div>`;

  /* Muddatlar jadvali — endi BITTA yo'l bilan quriladi (yagona manba).
     Summa aniq bo'lsa "Taxminiy hisob" izohi YOZILMAYDI. */
  let insCard = '';
  const muddatlar = oylikMuddatlar(item);
  if(muddatlar.length){
    const asos = oylikAsosiy(item);
    const aniqmi = !!(asos && asos.aniq);
    insCard = `<div class="card" style="margin-top:12px">
      <div class="eyebrow">${aniqmi ? t("Bo'lib to'lash shartlari") : t("Bo'lib to'lash hisob-kitobi")}</div>
      <div style="margin-top:11px;display:flex;flex-direction:column;gap:11px">
        ${muddatlar.map(mo => {
          const d = oylikBoshTolov(item, mo);
          return `<div style="display:flex;align-items:center;gap:10px">
          <span style="flex:1;font-size:13.5px;font-weight:700">${mo} ${t('oy')}</span>
          ${d?`<span style="font-size:11.5px;color:var(--muted-2);font-weight:600">${t('Bosh to\'lov')} ${formatPrice(d)}</span>`:''}
          <span class="sg" style="font-size:13.5px;font-weight:700;color:var(--blue-text)">${formatPrice(oylikTolov(item,mo))}/${t('oy')}</span>
        </div>`; }).join('')}
      </div>
      ${aniqmi ? '' : `<div style="margin-top:11px;font-size:11px;color:var(--muted-2);font-weight:600">${t('Taxminiy hisob. Aniq shartlar shartnomada ko\'rsatiladi.')}</div>`}</div>`;
  }

  $('#dtBody').innerHTML = `${priceCard}${insCard}
    <div class="card" style="margin-top:12px">
      <div class="eyebrow">${t('Raqam haqida')}</div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:11px">
        ${numberFacts(item).map(f => `<div style="display:flex;align-items:center;gap:10px">
          <span class="sg" style="width:28px;height:28px;border-radius:9px;background:${f.bg};color:${f.fg};display:flex;align-items:center;justify-content:center;flex:none;font-size:11px;font-weight:700">${f.icon}</span>
          <span style="font-size:13px;color:var(--text-2);font-weight:600">${esc(f.text)}</span></div>`).join('')}
      </div>
    </div>
    <div style="height:8px"></div>`;

  /* Pastki qatordagi summa kartochkadagi bilan AYNAN BIR XIL bo'lishi
     uchun o'sha `oylikAsosiy()` dan olinadi (avval foizli formuladan
     olinardi — shuning uchun ikki xil summa chiqardi). */
  const dtAsos = oylikAsosiy(item);
  $('#dtFoot').innerHTML = item.reserved
    ? `<div style="flex:1;text-align:center;font-size:13.5px;font-weight:700;color:var(--muted)">${t('Bu raqam allaqachon band qilingan')}</div>`
    : `<div style="flex:none">
         <div style="font-size:10.5px;color:var(--muted-2);font-weight:600">${dtAsos?t('Oyiga'):t('Jami')}</div>
         <div class="sg" style="font-size:17px;font-weight:700">${dtAsos ? formatPrice(dtAsos.monthly) : formatPrice(item.price) + (isUsd(item)?' $':'')}</div>
       </div>
       <button class="btn" data-order="${esc(item.id)}" style="flex:1">${t('Buyurtma berish')}</button>`;
  openSheet('shDetail');
  /* Mijoz raqamlarga qiziqyapti — bildirishnoma taklifi uchun belgi */
  try{ if(typeof PUSH !== 'undefined' && PUSH.qiziqdi) PUSH.qiziqdi(); }catch(e){}
}

function numberFacts(item){
  /* MIJOZ SO'ROVI: "falon ketma-ketlik — eslab qolish oson" kabi
     sun'iy tavsiyalar olib tashlandi. Faqat ANIQ, foydali ma'lumot
     qoldirildi: mavjudligi, rasmiy shartnoma va yetkazib berish. */
  const f = [];
  f.push({ icon:'1', bg:'var(--blue-tint)', fg:'var(--blue-text)',
    text: item.live ? (LANG==='ru'?'Напрямую от оператора, с новой SIM':"Operatordan to'g'ridan-to'g'ri, yangi SIM bilan")
                    : (LANG==='ru'?'Есть в наличии, оформляется сразу':'Bazamizda mavjud, darhol rasmiylashtiriladi') });
  f.push({ icon:'✓', bg:'var(--green-tint)', fg:'var(--green)',
    text: LANG==='ru' ? 'Официальный договор, после оплаты переходит на ваше имя' : "Rasmiy shartnoma bilan, to'lov tugagach nomingizga o'tkaziladi" });
  /* V143: "O'zbekiston bo'ylab bepul yetkazib berish" qatori MIJOZ
     SO'ROVI bilan olib tashlandi. */
  return f.slice(0,4);
}

/* ==================================================================
   IKKINCHI QISMNI KECHIKTIRIB YUKLASH  (V157)
   ------------------------------------------------------------------
   Bu yerda turgan ~3100 qator kod (buyurtma, kabinet, shartnoma,
   xabarlar, story oynasi) `assets/app2.js` ga ko'chirildi — sabab
   o'sha faylning boshida yozilgan.

   Quyidagi "o'rinbosar" funksiyalar shu bo'limlarning KIRISH
   nuqtalari. Mijoz ulardan birini bossa: avval ikkinchi qism
   yuklanadi, keyin HAQIQIY funksiya ishga tushadi. app2.js
   yuklangach uning e'lonlari o'rinbosarlarni almashtiradi, ya'ni
   keyingi chaqiriqlar to'g'ridan-to'g'ri ketadi.
   ================================================================== */
let IKKINCHI_QISM = null;
function ikkinchiQism(){
  if(IKKINCHI_QISM) return IKKINCHI_QISM;
  IKKINCHI_QISM = new Promise((bajarildi, xato)=>{
    const s = document.createElement('script');
    s.src = '/assets/app2.js?v=206';   /* V202: sw.js dagi V bilan BIR XIL bo'lishi SHART — aks holda oflayn rejimda bu fayl umuman yuklanmaydi */
    s.async = true;
    s.onload = ()=> bajarildi(true);
    s.onerror = ()=>{ IKKINCHI_QISM = null; xato(new Error('app2 yuklanmadi')); };
    document.head.appendChild(s);
  });
  return IKKINCHI_QISM;
}

/* O'rinbosar: ikkinchi qismni yuklaydi va haqiqiy funksiyani chaqiradi.
   Yuklanmasa (internet uzilgan) — mijozga xabar beriladi, jim
   qolmaydi. */
function qism2(nom, args){
  return ikkinchiQism().then(()=>{
    const f = window[nom];
    if(typeof f !== 'function' || f.__orinbosar){
      throw new Error(nom + ': ikkinchi qism yuklanmadi');
    }
    return f.apply(null, args);
  }).catch((e)=>{
    console.error(e);
    if(typeof toast === 'function') toast(t("Yuklab bo'lmadi — internetni tekshiring"));
    return undefined;
  });
}

function downloadContractPdf(){ return qism2('downloadContractPdf', arguments); }
downloadContractPdf.__orinbosar = true;
function kabAvtoOch(){ return qism2('kabAvtoOch', arguments); }
kabAvtoOch.__orinbosar = true;
function kirishKaliti(){ return qism2('kirishKaliti', arguments); }
kirishKaliti.__orinbosar = true;
function loadCustomPrice(){ return qism2('loadCustomPrice', arguments); }
loadCustomPrice.__orinbosar = true;
function lookupContract(){ return qism2('lookupContract', arguments); }
lookupContract.__orinbosar = true;
function lookupOrders(){ return qism2('lookupOrders', arguments); }
lookupOrders.__orinbosar = true;
function msgBos(){ return qism2('msgBos', arguments); }
msgBos.__orinbosar = true;
function msgHammasi(){ return qism2('msgHammasi', arguments); }
msgHammasi.__orinbosar = true;
function navbatIshgaTushir(){ return qism2('navbatIshgaTushir', arguments); }
navbatIshgaTushir.__orinbosar = true;
function openAbout(){ return qism2('openAbout', arguments); }
openAbout.__orinbosar = true;
function openCustom(){ return qism2('openCustom', arguments); }
openCustom.__orinbosar = true;
function openFaq(){ return qism2('openFaq', arguments); }
openFaq.__orinbosar = true;
function openHamkor(){ return qism2('openHamkor', arguments); }
openHamkor.__orinbosar = true;
function openJobs(){ return qism2('openJobs', arguments); }
openJobs.__orinbosar = true;
function openOrder(){ return qism2('openOrder', arguments); }
openOrder.__orinbosar = true;
function openVacForm(){ return qism2('openVacForm', arguments); }
openVacForm.__orinbosar = true;
function openXabarlar(){ return qism2('openXabarlar', arguments); }
openXabarlar.__orinbosar = true;
function pushniYop(){ return qism2('pushniYop', arguments); }
pushniYop.__orinbosar = true;
function recalcMonthly(){ return qism2('recalcMonthly', arguments); }
recalcMonthly.__orinbosar = true;
function renderBolib(){ return qism2('renderBolib', arguments); }
renderBolib.__orinbosar = true;
function renderCustom(){ return qism2('renderCustom', arguments); }
renderCustom.__orinbosar = true;
function renderOrder(){ return qism2('renderOrder', arguments); }
renderOrder.__orinbosar = true;
function sendSms(){ return qism2('sendSms', arguments); }
sendSms.__orinbosar = true;
function stvOch(){ return qism2('stvOch', arguments); }
stvOch.__orinbosar = true;
function submitCustom(){ return qism2('submitCustom', arguments); }
submitCustom.__orinbosar = true;
function submitHamkor(){ return qism2('submitHamkor', arguments); }
submitHamkor.__orinbosar = true;
function submitOrder(){ return qism2('submitOrder', arguments); }
submitOrder.__orinbosar = true;
function submitVac(){ return qism2('submitVac', arguments); }
submitVac.__orinbosar = true;
function useMyLocation(){ return qism2('useMyLocation', arguments); }
useMyLocation.__orinbosar = true;
function validateStep2(){ return qism2('validateStep2', arguments); }
validateStep2.__orinbosar = true;
function verifySms(){ return qism2('verifySms', arguments); }
verifySms.__orinbosar = true;
function xabarlarKeshdan(){ return qism2('xabarlarKeshdan', arguments); }
xabarlarKeshdan.__orinbosar = true;
function xabarlarniYukla(){ return qism2('xabarlarniYukla', arguments); }
xabarlarniYukla.__orinbosar = true;
function ulashRasm(){ return qism2('ulashRasm', arguments); }
ulashRasm.__orinbosar = true;

/* Birinchi chizish tugagach — bo'sh vaqtda o'zi yuklab qo'yadi,
   shunda mijoz bosganda kutish bo'lmaydi. */
(function ikkinchiniOldindanYukla(){
  const boshla = ()=>{
    if(window.requestIdleCallback) requestIdleCallback(()=> ikkinchiQism().catch(()=>{}), { timeout:2500 });
    else setTimeout(()=> ikkinchiQism().catch(()=>{}), 1200);
  };
  if(document.readyState === 'complete') boshla();
  else window.addEventListener('load', boshla, { once:true });
})();


/* ==================================================================
   BRAUZER BILDIRISHNOMASI
   ------------------------------------------------------------------
   Maqsad: admin xabar yuborganda, mijoz SAYTDAN CHIQIB KETGAN
   bo'lsa ham telefon ekranida bildirishnoma chiqsin.

   Qanday ishlaydi:
     1. Mijoz ruxsat beradi (Profil -> "Bildirishnomalarni yoqish",
        yoki saytda biroz yurgandan keyin bir marta so'raladi).
     2. Brauzer shu qurilma uchun "manzil" (token) beradi.
     3. Token serverga yuboriladi (api-push-token) va push_tokens
        to'plamida saqlanadi — brauzerdan o'qib bo'lmaydi.
     4. Admin xabar yuborsa, server o'sha tokenlarga jo'natadi.

   MUHIM, MIJOZGA AYTILADIGAN NARSA:
     • Android/Chrome va kompyuterda to'liq ishlaydi.
     • iPhone'da Apple buni FAQAT saytni "Bosh ekranga qo'shish"
       orqali o'rnatgan odamlarga beradi. Shu sabab iPhone'da
       bildirishnoma tugmasi ko'rinadi, lekin o'rnatilmagan bo'lsa
       brauzer o'zi rad etadi — biz buni mijozga tushuntiramiz.

   Kalit (VAPID) admin paneldan kiritiladi va site_settings/general
   ichida saqlanadi — kodni tahrirlash shart emas.
   ================================================================== */
const PUSH = (function(){
  let sdk = null, token = null;

  const qollabQuvvat = ()=>{
    try{
      /* Tekshiruv ATAYLAB qat'iy: ba'zi brauzerlarda (ayniqsa
         iPhone Safari'ning oddiy oynasida) `Notification` nomi bor,
         lekin ishlamaydi. Shu sabab nomning borligi emas, FUNKSIYA
         borligi tekshiriladi — aks holda mijozga "yoqib bo'lmadi"
         degan tushunarsiz xato chiqardi.
         `isSecureContext` — brauzerning o'zi qo'yadigan shart
         (localhost ham xavfsiz hisoblanadi). */
      return typeof Notification !== 'undefined'
          && typeof Notification.requestPermission === 'function'
          && ('serviceWorker' in navigator)
          && typeof PushManager !== 'undefined'
          && window.isSecureContext !== false;
    }catch(e){ return false; }
  };
  /* Apple qurilmasi (iPhone/iPad). Faqat YO'RIQNOMA matnini
     tanlash uchun kerak — imkoniyatni bu emas, brauzer hal qiladi. */
  const appleQurilma = ()=>{ try{
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }catch(e){ return false; } };
  const holat = ()=>{ try{ return Notification.permission; }catch(e){ return 'default'; } };

  /* Messaging SDK faqat KERAK BO'LGANDA yuklanadi — sayt ochilishini
     sekinlashtirmasligi uchun. */
  function sdkniYukla(){
    if(sdk) return sdk;
    sdk = new Promise((bajar, rad)=>{
      if(window.firebase && firebase.messaging){ bajar(); return; }
      const sc = document.createElement('script');
      sc.src = 'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js';
      sc.async = true;
      sc.onload = bajar;
      sc.onerror = ()=> rad(new Error('messaging yuklanmadi'));
      document.head.appendChild(sc);
    });
    return sdk;
  }

  async function tokenOl(){
    const kalit = (SETTINGS && SETTINGS.webPushKey) ? String(SETTINGS.webPushKey).trim() : '';
    if(!kalit) throw new Error('kalit sozlanmagan');
    await sdkniYukla();
    const reg = await navigator.serviceWorker.ready;
    const t = await firebase.messaging().getToken({ vapidKey: kalit, serviceWorkerRegistration: reg });
    if(!t) throw new Error('token olinmadi');
    return t;
  }

  async function serverga(t){
    try{
      await fetch(FN + 'api-push-token', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
        body: JSON.stringify({ token: t, platform: 'web' })
      });
      try{ localStorage.setItem('vip_push_token', t); }catch(e){}
    }catch(e){}
  }

  /* Mijoz tugmani bosganda */
  async function yoq(){
    /* MUHIM: qurilma nomiga qarab OLDINDAN taqiqlamaymiz.
       Safari (Mac'da) bildirishnomani oddiy oynada ham qo'llaydi,
       iPhone'da esa faqat sayt "Bosh ekranga qo'shish" orqali
       o'rnatilgan bo'lsa. Buni brauzerning o'zi bildiradi — shu
       sabab faqat haqiqiy imkoniyat tekshiriladi. */
    if(!qollabQuvvat()){
      /* iPhone — qisqa toast yetarli emas: mijoz nima qilishni
         bilmay qoladi. Shu sabab rasmli, qadamba-qadam yo'riqnoma
         ochiladi. Boshqa brauzerlarda oddiy xabar. */
      if(appleQurilma()){ iphoneIzoh(); return false; }
      toast(LANG==='ru' ? 'Этот браузер не поддерживает уведомления'
                        : 'Bu brauzer bildirishnomani qo\'llamaydi', 'warn');
      return false;
    }
    /* Kalit admin paneldan kelmagan bo'lsa — brauzerdan ruxsat
       so'rashning ma'nosi yo'q: baribir token olinmaydi. Mijozga
       "yoqib bo'lmadi" deb tushunarsiz xabar chiqarmaymiz. */
    if(!(SETTINGS && SETTINGS.webPushKey)){
      toast(LANG==='ru' ? 'Уведомления пока не настроены' : 'Bildirishnoma hali sozlanmagan', 'warn');
      try{ if(typeof track==='function') track('push_kalit_yoq'); }catch(e){}
      return false;
    }
    try{
      const r = await Notification.requestPermission();
      if(r !== 'granted'){
        toast(LANG==='ru' ? 'Уведомления не разрешены' : 'Bildirishnomaga ruxsat berilmadi', 'warn');
        belgini();
        return false;
      }
      token = await tokenOl();
      await serverga(token);
      haptic('ok');
      toast(LANG==='ru' ? 'Готово — вы будете получать уведомления'
                        : 'Tayyor — endi xabarlarni olib turasiz', 'ok');
      belgini();
      try{ if(typeof track==='function') track('push_yoqildi'); }catch(e){}
      return true;
    }catch(e){
      /* Sababini yashirmaymiz — admin nimani tuzatish kerakligini
         bilishi uchun xato matni ham ko'rsatiladi. */
      const sabab = String((e && e.message) || '').slice(0, 60);
      toast((LANG==='ru' ? 'Не получилось включить' : 'Yoqib bo\'lmadi') + (sabab ? ': ' + sabab : ''), 'bad');
      try{ if(typeof track==='function') track('push_xato'); }catch(e2){}
      return false;
    }
  }

  /* Allaqachon ruxsat bergan qurilmada tokenni jimgina yangilaymiz
     (token vaqti-vaqti bilan o'zgaradi). */
  async function jimYangila(){
    if(!qollabQuvvat() || holat() !== 'granted') return;
    try{
      const t = await tokenOl();
      let eski = null;
      try{ eski = localStorage.getItem('vip_push_token'); }catch(e){}
      if(t && t !== eski) await serverga(t);
    }catch(e){}
  }

  /* Profil bo'limidagi qatorning ko'rinishi */
  function belgini(){
    const row = document.getElementById('pushRow');
    if(!row) return;
    const b = row.querySelector('b'), i = row.querySelector('i'), btn = row.querySelector('.tg-btn span');

    /* MUHIM: matnni shunchaki textContent bilan qo'yish YETARLI EMAS.
       applyLang() keyinroq ishlaganda `data-t` dagi asl matnni qayta
       tiklab, bizning yozuvimizni o'chirib yuborardi. Shu sabab
       `data-t` ning O'ZI ham yangilanadi. */
    const qoy = (el, kalit)=>{
      if(!el) return;
      el.setAttribute('data-t', kalit);
      el.textContent = t(kalit);
    };

    /* ALLAQACHON YOQILGAN bo'lsa — karta UMUMAN ko'rsatilmaydi
       (mijoz so'rovi). Ish bajarilgan, qayta eslatishning hojati yo'q.
       Qolgan barcha holatlarda (yoqilmagan, rad etilgan, iPhone,
       brauzer qo'llamaydi) karta ko'rinadi — profil bo'limidan
       istalgan vaqtda yoqa olishi yoki nima qilish kerakligini
       bilishi uchun. */
    if(holat() === 'granted'){ row.style.display = 'none'; return; }
    row.style.display = '';

    if(!qollabQuvvat()){
      qoy(b, 'Bildirishnomalarni yoqish');
      qoy(i, appleQurilma() ? "Bosh ekranga qo'shsangiz ishlaydi" : "Bu brauzer qo'llamaydi");
      qoy(btn, appleQurilma() ? 'Qanday?' : 'Mavjud emas');
      row.classList.remove('on');
      return;
    }

    const h = holat();
    if(h === 'denied'){
      qoy(b, "Bildirishnoma o'chirilgan");
      qoy(i, "Brauzer sozlamalaridan qayta yoqsangiz bo'ladi");
      qoy(btn, "O'chirilgan");
      row.classList.remove('on');
    }else{
      qoy(b, 'Bildirishnomalarni yoqish');
      qoy(i, "Yangi raqamlar va aksiyalardan xabardor bo'ling");
      qoy(btn, 'Yoqish');
      row.classList.remove('on');
    }
  }

  /* iPhone uchun QISQA izoh.
     Ilgari bu yerda uch qadamli katta oyna ochilardi — mijoz uni
     o'qimasdan yopib yuborardi. Endi bir qatorli xabar: nima qilish
     kerakligi aytiladi, xolos. Android va kompyuterda esa tugma
     bosilishi bilan bildirishnoma DARHOL yoqiladi (bu yergacha
     umuman yetib kelinmaydi). */
  function iphoneIzoh(){
    toast(LANG==='ru'
      ? 'На iPhone: «Поделиться» → «На экран «Домой»», затем включите здесь'
      : "iPhone'da: “Ulashish” → “Bosh ekranga qo'shish”, so'ng shu yerdan yoqing", 'warn');
    try{ if(typeof track==='function') track('push_iphone_izoh'); }catch(e){}
  }

  /* ================= AVTOMATIK TAKLIF =================
     Savol: "hamma saytga kirganga o'zi yoqib qo'ysak bo'lmaydimi?"
     Javob: brauzer bunga YO'L QO'YMAYDI. Ruxsat so'rash oynasi faqat
     odam biror narsani bosgandan keyin ochiladi — aks holda Chrome
     ham, Safari ham so'rovni jimgina rad etadi (spamning oldini
     olish uchun shunday qilingan).

     Shu sabab qonuniy va eng samarali yo'l: BIZ o'zimiz chiroyli
     kichik taklif chiqaramiz, mijoz "Ha" bossa — brauzer oynasi
     ochiladi. Amalda odamlarning katta qismi shu yo'l bilan yoqadi.

     Taklif bezor qilmasligi uchun:
       • mijoz saytda biroz yurgandan keyin chiqadi (2 ta raqam ochsa
         yoki 40 soniya o'tsa),
       • bir sessiyada bir marta,
       • "Keyinroq" bosilsa 14 kun ko'rinmaydi,
       • allaqachon yoqilgan yoki rad etilgan bo'lsa umuman chiqmaydi.
     ================================================================= */
  const K_KEYIN = 'vip_push_keyin';
  let korildi = false, ochilgan = 0;

  function taklifBormi(){
    if(korildi) return false;
    if(!qollabQuvvat()) return false;
    if(holat() !== 'default') return false;          /* yoqilgan yoki rad etilgan */
    if(!(SETTINGS && SETTINGS.webPushKey)) return false;
    /* Qurilma turiga qarab taqiq yo'q — brauzer qo'llasa, taklif
       chiqaveradi (qollabQuvvat() yuqorida allaqachon tekshirildi). */
    try{
      const k = +localStorage.getItem(K_KEYIN) || 0;
      if(k && Date.now() < k) return false;
    }catch(e){}
    try{ if(sessionStorage.getItem('vip_push_tak')) return false; }catch(e){}
    return true;
  }

  function taklifKorsat(){
    if(!taklifBormi()) return;
    korildi = true;
    try{ sessionStorage.setItem('vip_push_tak','1'); }catch(e){}
    const box = document.getElementById('pushAsk');
    if(!box) return;
    box.style.display = 'flex';
    void box.offsetWidth;
    setTimeout(()=> box.classList.add('show'), 40);
    try{ if(typeof track==='function') track('push_taklif_korsatildi'); }catch(e){}
  }
  function taklifYop(keyinroq){
    const box = document.getElementById('pushAsk');
    if(!box) return;
    box.classList.remove('show');
    setTimeout(()=>{ box.style.display = 'none'; }, 520);
    if(keyinroq){
      try{ localStorage.setItem(K_KEYIN, String(Date.now() + 14*24*3600*1000)); }catch(e){}
      try{ if(typeof track==='function') track('push_keyinroq'); }catch(e){}
    }
  }
  /* Raqam ochilganda chaqiriladi — qiziqish belgisi */
  function qiziqdi(){
    ochilgan++;
    if(ochilgan >= 2) setTimeout(taklifKorsat, 1200);
  }

  function init(){
    belgini();
    const row = document.getElementById('pushRow');
    if(row) row.addEventListener('click', ()=>{
      if(holat() === 'granted') return;
      if(!qollabQuvvat() && appleQurilma()){ iphoneIzoh(); return; }
      yoq();
    });

    const ha = document.getElementById('pushAskYes');
    if(ha) ha.addEventListener('click', async ()=>{ taklifYop(false); await yoq(); });
    const yoqq = document.getElementById('pushAskNo');
    if(yoqq) yoqq.addEventListener('click', ()=> taklifYop(true));

    /* Ruxsat bor bo'lsa — tokenni jimgina yangilab qo'yamiz */
    setTimeout(jimYangila, 3000);
    /* Hech narsa bosmagan mijozga ham — 40 soniyadan keyin */
    setTimeout(taklifKorsat, 40000);
  }

  return { init, yoq, belgini, holat, qollabQuvvat, qiziqdi, taklifYop };
})();



/* ===== 5-qism (avvalgi index.html, 10165-satr) ===== */

'use strict';

/* ---------- Avtomatik KATTA HARF ----------
   Shartnoma ID va ma'lumot to'ldirish maydonlari o'z-o'zidan katta harfga
   o'tadi (o'zbekcha harflar ham: ʻ/' belgisi saqlanadi). */
function toUpperUz(v){
  return String(v)
    .replace(/[ʻʼ‘’`]/g, "'")
    .toLocaleUpperCase('uz-Latn');
}
document.addEventListener('input', (e)=>{
  const el = e.target;
  if(!el || !el.matches || !el.matches('input[data-upper]')) return;
  const up = toUpperUz(el.value);
  if(up === el.value) return;
  const s = el.selectionStart, f = el.selectionEnd;
  el.value = up;
  try{ el.setSelectionRange(s, f); }catch(x){}
}, true);
/* Avtomatik to'ldirilgan (saqlangan) qiymatlar ham katta harfga o'tsin */
function upperAll(root){
  (root || document).querySelectorAll('input[data-upper]').forEach(el => {
    if(el.value) el.value = toUpperUz(el.value);
  });
}

/* Bosishdan OLDIN matn belgilangan edimi? Brauzer bosilganda belgilashni
   darhol tozalaydi, shu sabab uni aynan shu yerda eslab qolamiz — aks
   holda mijoz raqamni belgilab, nusxa olmoqchi bo'lganda kartochka
   ochilib ketardi. */
let __selOldin = '';
document.addEventListener('pointerdown', (e)=>{
  try{ __selOldin = ((window.getSelection && window.getSelection().toString()) || '').trim(); }catch(err){ __selOldin = ''; }
}, {passive:true, capture:true});

/* ================= HAR QANDAY AMALDA YUMSHOQ TEBRANISH =================
   Ro'yxat ataylab keng: mijoz "ba'zi joyda ishlamaydi" deganida sabab
   shu edi — tanlagich faqat bir nechta elementni qamrab olardi.
   Endi bosiladigan HAMMA narsa qamrab olingan. Takrorlanishdan
   haptic() ichidagi 45 ms himoyasi saqlaydi. */
/* ==================================================================
   TEBRANISH (haptika) — FAQAT KERAKLI JOYDA (V139)
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "yumshoq vibratsiyani juda ko'p joyda qo'yvoribsan,
   kerakli joyda qo'y."

   Haqiqatan shunday edi: ro'yxatda `a`, `button`, `label`, `.row`,
   `.tag`, `.chip`, `#nav a` va boshqalar bor edi — ya'ni sahifadagi
   DEYARLI HAR QANDAY bosishda telefon tebranardi. Bo'lim almashtirish,
   havolani bosish, hatto yozuvga tegish ham. Natijada tebranish
   "ma'noli javob" bo'lishdan to'xtab, shovqinga aylangan edi.

   ENDI FAQAT HAQIQIY AMALLARDA:
     * `.btn` va kartochkadagi asosiy tugmalar — buyurtma berish,
       tasdiqlash, kirish, yuklab olish kabi qaror talab qiladigan
       amallar;
     * sevimlilarga qo'shish/olib tashlash — natijasi ko'rinmaydigan,
       shuning uchun sezgi kerak bo'ladigan amal;
     * raqamdan nusxa olish — bajarilganini bildiradigan yagona belgi.

   OLIB TASHLANGANLAR: bo'lim almashtirish (`#nav a`), oddiy
   havolalar, yozuvlar, yorliqlar, ro'yxat qatorlari, saralash va
   operator tugmalari, til almashtirish.

   QOLGAN JOYLAR O'ZGARMADI — ular bosishda emas, NATIJADA ishlaydi
   va aynan shuning uchun o'rinli:
     * oyna ochilganda (`openSheet`) — yengil;
     * muvaffaqiyat/xato xabari chiqqanda — kuchliroq;
     * buyurtma yuborilganda, kabinetga kirilganda;
     * kartochkani surib o'chirganda, chekkadan orqaga qaytganda.
   ================================================================== */
const HAP_SEL = [
  '.btn', '.nc-cta', '.hc-cta',
  '[data-fav]', '[data-unfav]', '[data-copy]'
].join(',');
document.addEventListener('pointerdown', (e)=>{
  if(e.target.closest(HAP_SEL)) haptic('select');
}, {passive:true, capture:true});
/* Sichqoncha/klaviatura bilan ishlaganda ham (pointerdown kelmasa) */
document.addEventListener('keydown', (e)=>{
  if((e.key === 'Enter' || e.key === ' ') && e.target.closest(HAP_SEL)) haptic('light');
}, {passive:true});

document.addEventListener('click', (e)=>{

  const uf = e.target.closest('[data-unfav]');
  if(uf){
    e.preventDefault(); e.stopPropagation();
    const row = uf.closest('.swipe');
    toggleFav(uf.dataset.unfav);
    haptic('bad');
    if(row){
      row.style.transition = 'height .26s ease, opacity .2s, margin .26s ease';
      row.style.height = row.offsetHeight + 'px'; void row.offsetHeight;
      row.style.overflow = 'hidden'; row.style.opacity = '0';
      row.style.height = '0'; row.style.marginTop = '0';
      setTimeout(()=> renderFavorites(), 280);
    } else renderFavorites();
    /* Xabar (toast) YO'Q — mijoz so'rovi. Kartochka ro'yxatdan
       chiqib ketishining o'zi ko'rinib turibdi, ustiga vibratsiya
       bor. Pastdan chiqadigan yozuv faqat ASOSIY ishlarda
       (buyurtma, nusxa olish, xatolik) qoladi. */
    return;
  }
  if(e.target.closest('#favEdit')){ FAV_EDIT = !FAV_EDIT; haptic('select'); renderFavorites(); return; }

  const f = e.target.closest('[data-fav]');
  if(f){
    e.preventDefault(); e.stopPropagation();
    const on = toggleFav(f.dataset.fav);
    f.classList.toggle('on', on);
    const svg = f.querySelector('svg'); if(svg) svg.setAttribute('fill', on ? 'currentColor' : 'none');
    haptic(on ? 'ok' : 'light');
    /* Xabar YO'Q — yurakchaning to'lishi/bo'shashi va yumshoq
       vibratsiya yetarli javob. */
    if(currentRoute === 'fav') renderFavorites();
    return;
  }

  /* Mijoz matnni belgilagan bo'lsa (nusxa olmoqchi) — bu bosish faqat
     belgilashni bekor qiladi, kartochka ochilmaydi. */
  let __sel = '';
  try{ __sel = (window.getSelection && window.getSelection().toString()) || ''; }catch(err){}
  if(__sel.trim().length > 2 || __selOldin.length > 2){ __selOldin = ''; return; }

  const cp = e.target.closest('[data-copy]');
  if(cp && CURRENT){
    e.preventDefault(); e.stopPropagation();
    nusxaOl(displayNumber(CURRENT.number));
    return;
  }

  const c = e.target.closest('[data-card]');
  if(c){
    /* tez bosish allaqachon ochgan bo'lsa — ikkinchi marta ochmaymiz */
    if(Date.now() - (window.__tezOchildi || 0) < 700) return;
    openDetail(c.dataset.card);
    return;
  }

  const o = e.target.closest('[data-order]');
  if(o){ closeSheet('shDetail'); setTimeout(()=> openOrder(o.dataset.order), 180); return; }

  if(e.target.closest('[data-ulash]')){
    const tur = e.target.closest('[data-ulash]').dataset.ulash;
    const it = CURRENT;
    closeSheet('shGen');
    if(!it) return;
    haptic('light');
    if(tur === 'rasm'){ setTimeout(()=> ulashRasm(it), 160); return; }
    /* havola */
    const raqamli = String(it.number || '').replace(/\D/g,'');
    const havola  = location.origin + '/raqam/' + raqamli;
    const txt = `${shortNumber(it.number)} — ${formatPriceUzs(it.price)} · VIP RAQAMLAR`;
    if(navigator.share){ navigator.share({ title:'VIP RAQAMLAR', text:txt, url:havola }).catch(()=>{}); }
    else { try{ navigator.clipboard.writeText(havola); toast(LANG==='ru'?'Ссылка скопирована':'Havola nusxalandi'); }catch(err){} }
    return;
  }

  if(e.target.closest('[data-share]') && CURRENT){
    /* V162: TANLOV SO'RALMAYDI.
       Avval "rasmmi yoki havolami" deb oyna chiqardi — bu ortiqcha
       bir bosish edi. Endi darhol RASM ketadi, havola esa uning
       TAGIDA imzo bo'lib boradi (qarang: app2.js -> ulashRasm).
       Ya'ni mijoz bitta tugma bosadi va do'stiga ham rasm, ham
       bosiladigan havola boradi. */
    haptic('light');
    ulashRasm(CURRENT);
    return;
  }

  /* Bosh sahifadagi stories lentasi — to'liq ekranda ochiladi */
  const sty = e.target.closest('[data-story]');
  if(sty){
    /* Bosilgan kartochkaning JOYINI ham beramiz — oyna aynan o'sha
       joydan ochiladi (qarang: stvOch). */
    stvOch(sty.dataset.sti, sty.querySelector('.story-ring') || sty);
    return;
  }

  const og = e.target.closest('[data-opgo]');
  if(og){ catOp = og.dataset.opgo; catShown = PAGE_SIZE; go('catalog'); return; }

  const co = e.target.closest('[data-catop]');
  if(co){ catOp = co.dataset.catop; catShown = PAGE_SIZE; renderCatalog(); window.scrollTo({top:0,behavior:'smooth'}); return; }

  const nt = e.target.closest('[data-naqshtur]');
  if(nt){
    catNaqshTur = nt.dataset.naqshtur || '';
    $$('#genBody [data-naqshtur]').forEach(b => b.classList.toggle('on', b.dataset.naqshtur === catNaqshTur));
    catShown = PAGE_SIZE; renderCatalog();
    narxHolatiYangila();
    return;
  }

  const nx = e.target.closest('[data-narx]');
  if(nx){
    const [a,b] = String(nx.dataset.narx).split(':').map(Number);
    catNarxMin = a || 0; catNarxMax = b || 0;
    const mi = $('#nfMin'), ma = $('#nfMax');
    if(mi) mi.value = mlnMatn(catNarxMin);
    if(ma) ma.value = mlnMatn(catNarxMax);
    narxHolatiYangila();
    return;
  }

  const so = e.target.closest('[data-sort]');
  if(so){ catSort = so.dataset.sort; catShown = PAGE_SIZE; renderCatalog(); closeSheet('shGen'); return; }

  const st = e.target.closest('[data-ostep]');
  if(st){
    const n = Number(st.dataset.ostep);
    if(n === 3 && !validateStep2()) return;
    ORD.step = n; renderOrder();
    const sc = $('#ordBody'); if(sc) sc.scrollTop = 0;
    return;
  }

  const pay = e.target.closest('[data-pay]');
  if(pay){ ORD.paymentType = pay.dataset.pay; recalcMonthly(); renderOrder(); return; }
  const mon = e.target.closest('[data-mon]');
  if(mon){ ORD.months = Number(mon.dataset.mon); recalcMonthly(); renderOrder(); return; }

  if(e.target.closest('#geoBtn')){ useMyLocation(); return; }

  if(e.target.closest('#ordSubmit')){
    (async ()=>{
      const btn = $('#ordSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
      const r = await sendSms();
      if(r.ok){ ORD.step = 4; renderOrder(); }
      else await submitOrder(false);   /* SMS ishlamasa ham buyurtma to'xtamaydi */
    })();
    return;
  }
  if(e.target.closest('#smsVerify')){ verifySms(); return; }
  if(e.target.closest('#smsSkip')){ submitOrder(false); return; }
  if(e.target.closest('#smsResend')){
    (async ()=>{
      const b = $('#smsResend'); b.disabled = true; b.textContent = t('Yuborilmoqda…');
      const r = await sendSms();
      toast(r.ok ? (LANG==='ru'?'Код отправлен снова':'Kod qayta yuborildi') : (r.error === 'timeout' ? xatoMatni(new Error('Vaqt tugadi')) : r.error), r.ok ? 'ok' : 'bad');
      b.disabled = false; b.textContent = t('Kodni qayta yuborish');
    })();
    return;
  }

  const gr = e.target.closest('[data-goroute]');
  if(gr){ e.preventDefault(); go(gr.dataset.goroute); return; }
  if(e.target.closest('#oqRetry')){ lookupOrders(); return; }
  if(e.target.closest('#ctBtn')){ lookupContract(); return; }
  if(e.target.closest('#ctPdf')){ downloadContractPdf(); return; }

  if(e.target.closest('#homeCustom')){ openCustom(); return; }
  const coop = e.target.closest('[data-coop]');
  if(coop){ CO.operator = coop.dataset.coop; if(CO.pattern.length===4) loadCustomPrice(); else renderCustom(); return; }
  if(e.target.closest('#coSubmit')){ submitCustom(); return; }

  const sh = e.target.closest('[data-sheet]');
  if(sh){
    const k = sh.dataset.sheet;
    if(k === 'faq') openFaq();
    else if(k === 'about') openAbout();
    else if(k === 'jobs') openJobs();
    else if(k === 'hamkor') openHamkor();
    else if(k === 'custom'){ closeSheet('shGen'); setTimeout(openCustom, 160); }
    return;
  }
  const vac = e.target.closest('[data-vac]');
  if(vac){ openVacForm(vac.dataset.vac); return; }
  if(e.target.closest('#vfSubmit')){ submitVac(); return; }
  if(e.target.closest('#hkSubmit')){ submitHamkor(); return; }

  const acc = e.target.closest('[data-acc] .q');
  if(acc){
    const box = acc.closest('[data-acc]'), open = box.classList.contains('on');
    $$('[data-acc]').forEach(b => { b.classList.remove('on'); const v = b.querySelector('.vb'); if(v) v.style.display=''; });
    if(!open){ box.classList.add('on'); const v = box.querySelector('.vb'); if(v) v.style.display='none'; }
    return;
  }

  if(e.target.closest('#catMore')){ catShown += PAGE_SIZE; renderCatalog(); return; }

  const tp = e.target.closest('[data-theme-val]');
  if(tp){ setTheme(tp.dataset.themeVal); return; }

  const lp = e.target.closest('[data-lang-val]');
  if(lp){ setLang(lp.dataset.langVal); return; }
  if(e.target.closest('[data-lang-toggle]')){ setLang(LANG === 'uz' ? 'ru' : 'uz'); return; }

  if(e.target.closest('#btnLive')){ liveSearch(); return; }
  if(e.target.closest('#searchReset') || e.target.closest('[data-clearall]')){
    $$('#digits input').forEach(b => b.value = '');
    LIVE_RESULTS = []; COMMITTED = null; catOp = ''; catOnlyInstallment = false;
    catSort = 'default'; catShown = PAGE_SIZE;
    catNaqsh = ''; catNarxMin = 0; catNarxMax = 0; catNaqshTur = '';
    reshuffle(); renderCatalog(); closeSheet('shGen');
    /* Xabar YO'Q — ro'yxatning o'zi yangilanib ko'rinadi. */
    return;
  }
  if(e.target.closest('#insMore')){ INS_SHOWN += PAGE_SIZE; renderBolib(); return; }
  if(e.target.closest('#btnFilter')){ openFilter(); return; }
  /* Tepadagi qo'ng'iroqcha -> xabarlar */
  if(e.target.closest('#bellBtn, #bellBtn2')){ openXabarlar(); return; }
  const mo = e.target.closest('[data-msgopen]');
  if(mo){ msgBos(mo.dataset.msgopen); return; }
  if(e.target.closest('#msgAll')){ msgHammasi(); return; }
  const ml = e.target.closest('[data-msglink]');
  if(ml){
    const u = ml.dataset.msglink || '';
    if(/^https?:\/\//i.test(u)) window.open(u, '_blank', 'noopener');
    else if(u) location.hash = u;
    closeSheet('shGen');
    return;
  }
});

/* ==================================================================
   NAQSH BO'YICHA FILTR  (V162)
   ------------------------------------------------------------------
   Mijoz ko'pincha ANIQ raqamni emas, "shunaqaroq" raqamni qidiradi:
   "uchta bir xil bo'lsin", "nol bilan tugasin", "oyna bo'lsin".
   Katakchaga raqam yozish bu holda yordam bermaydi. Endi bitta
   bosishda topiladi.

   Faqat bazada HAQIQATAN mavjud naqshlar ko'rsatiladi va yonida
   nechtaligi yoziladi — bo'sh tugmani bosib "0 ta" ni ko'rish
   mijozga foyda bermaydi. */
const NAQSH_TURLAR = [
  ['zina',    'Zinapoya'],
  ['birxil',  'Bir xil raqam'],
  ['beshlik', 'Beshta bir xil'],
  ['tortlik', "To'rtta bir xil"],
  ['uchlik',  'Uchta bir xil'],
  ['oyna',    'Oyna naqsh'],
  ['juft',    'Juftliklar'],
  ['yumaloq', 'Yumaloq raqam'],
  ['takror',  'Takrorlanuvchi'],
  ['kozgu',   "Ko'zgu"],
  ['ikkixil', 'Ikki xil raqam']
];
function naqshBolimiHtml(){
  const eski = catNaqshTur;
  const sanoq = (k)=>{ catNaqshTur = k; const n = catalogItems().length; return n; };
  catNaqshTur = '';
  const hammasi = catalogItems().length;

  const tugma = [`<button class="chip${!eski ? ' on' : ''}" data-naqshtur="">${t('Hammasi')} <i class="nfn">${hammasi}</i></button>`];
  NAQSH_TURLAR.forEach(([k, nom])=>{
    const n = sanoq(k);
    if(!n) return;
    tugma.push(`<button class="chip${eski === k ? ' on' : ''}" data-naqshtur="${k}">${esc(t(nom))} <i class="nfn">${n}</i></button>`);
  });
  catNaqshTur = eski;

  if(tugma.length <= 1) return '';          /* naqshli raqam yo'q — bo'limni ko'rsatmaymiz */
  return `<div class="nf nf-naqsh">
    <div class="nf-top"><b>${t('Naqsh')}</b></div>
    <div class="nf-chips">${tugma.join('')}</div>
  </div>`;
}

/* Narx bo'limi HTML — faqat ICHIDA RAQAM BOR oraliqlar ko'rsatiladi,
   bo'sh tugmani bosib "0 ta raqam" ni ko'rish mijoz uchun foyda emas. */
function narxBolimiHtml(){
  const eskiMin = catNarxMin, eskiMax = catNarxMax;
  const sanoq = (lo, hi) => { catNarxMin = lo; catNarxMax = hi; const n = catalogItems().length; return n; };

  const tugmalar = [];
  catNarxMin = 0; catNarxMax = 0;
  const hammasi = catalogItems().length;
  tugmalar.push(`<button class="chip${!eskiMin && !eskiMax ? ' on' : ''}" data-narx="0:0">${t('Hammasi')} <i class="nfn">${hammasi}</i></button>`);
  NARX_TAYYOR.forEach(o => {
    const n = sanoq(o[0], o[1]);
    if(!n) return;                                   /* bo'sh oraliq ko'rsatilmaydi */
    const tanlangan = (eskiMin === o[0] && eskiMax === o[1]);
    tugmalar.push(`<button class="chip${tanlangan ? ' on' : ''}" data-narx="${o[0]}:${o[1]}">${esc(t(o[2]))} <i class="nfn">${n}</i></button>`);
  });

  /* dollarli raqamlar borligini aytamiz — ro'yxat nega qisqarganini bilsin */
  catNarxMin = 0; catNarxMax = 0;
  const usd = catalogItems().filter(isUsd).length;
  catNarxMin = eskiMin; catNarxMax = eskiMax;

  return `<div class="nf" id="nfNarx">
    <div class="nf-top"><b>${t("Narx oralig'i")}</b><span class="nf-cnt" id="nfCount">${catalogItems().length} ${t('ta')}</span></div>
    <div class="nf-chips">${tugmalar.join('')}</div>
    <div class="nf-in">
      <label><input id="nfMin" type="text" inputmode="decimal" autocomplete="off" placeholder="${t('dan')}" value="${mlnMatn(catNarxMin)}"><span>${t('mln')}</span></label>
      <label><input id="nfMax" type="text" inputmode="decimal" autocomplete="off" placeholder="${t('gacha')}" value="${mlnMatn(catNarxMax)}"><span>${t('mln')}</span></label>
    </div>
    ${usd ? `<div class="nf-note">${t("Dollarda narxlangan raqamlar bu filtrda ko'rinmaydi")}: ${usd}</div>` : ''}
  </div>`;
}

/* Oynani butunlay qayta qurmaymiz: aks holda mijoz yozib turgan
   maydondan fokus uchib ketadi va klaviatura yopiladi. Faqat
   tugmalarning holati va sanoq yangilanadi. */
function narxHolatiYangila(){
  const box = $('#genBody'); if(!box) return;
  const kalit = catNarxMin + ':' + catNarxMax;
  box.querySelectorAll('[data-narx]').forEach(b =>
    b.classList.toggle('on', b.dataset.narx === (narxFiltrBor() ? kalit : '0:0')));
  const c = $('#nfCount'); if(c) c.textContent = catalogItems().length + ' ' + t('ta');
  catShown = PAGE_SIZE; renderCatalog();
}

/* ==================================================================
   ULASHISH TANLOVI  (V158)
   ------------------------------------------------------------------
   Ikki yo'l: RASM yoki HAVOLA.
     * Rasm  — kartochka telefonning o'zida chiziladi (app2.js ->
       ulashRasmYasa) va tizim ulashish oynasiga beriladi. Telegramda
       suhbatda darhol ko'rinadi, Instagram stories ga ham mos.
     * Havola — avvalgidek: raqamning o'z manzili. Telegram/Instagram
       uni ochganda server chizgan kartochkani ko'rsatadi
       (netlify/functions/og-raqam.js).
   ================================================================== */
function ulashOynasi(item){
  if(!item) return;
  $('#genTitle').textContent = t('Ulashish');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = `
    <div class="rows">
      <button class="row" data-ulash="rasm">
        <span class="rt"><b>${esc(t('Rasm sifatida'))}</b>
          <i>${esc(t("Chiroyli kartochka — Telegram va Instagram uchun"))}</i></span>
      </button>
      <button class="row" data-ulash="havola">
        <span class="rt"><b>${esc(t('Havola'))}</b>
          <i>${esc(t('Raqamning sayt manzili'))}</i></span>
      </button>
    </div>
    <div style="height:6px"></div>`;
  openSheet('shGen');
}

function openFilter(){
  $('#genTitle').textContent = t('Saralash');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = naqshBolimiHtml() + narxBolimiHtml() + `<div class="rows">${SORTS.map(o => `
    <button class="row" data-sort="${o[0]}"><span class="rt"><b>${esc(t(o[1]))}</b></span>
      ${catSort===o[0] ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg>' : ''}
    </button>`).join('')}</div>
    <button class="btn ghost" data-clearall style="margin-top:14px">${t('Hammasini tozalash')}</button>
    <div style="height:6px"></div>`;
  /* "dan"/"gacha" maydonlari: yozilgan zahoti emas, 350 ms jim
     turgandan keyin qo'llanadi — har bosilgan raqamda ro'yxatni
     qayta chizish sekinlik beradi. */
  let nfTimer = 0;
  const nfOqi = ()=>{
    clearTimeout(nfTimer);
    nfTimer = setTimeout(()=>{
      let a = mlnSon($('#nfMin') && $('#nfMin').value), b = mlnSon($('#nfMax') && $('#nfMax').value);
      if(a && b && a > b){ const x = a; a = b; b = x; }   /* teskari kiritilsa almashtiramiz */
      catNarxMin = a; catNarxMax = b; narxHolatiYangila();
    }, 350);
  };
  ['#nfMin','#nfMax'].forEach(sel => { const el = $(sel); if(el) el.addEventListener('input', nfOqi); });
  openSheet('shGen');
}

/* qidiruv kataklari */
(function(){
  const boxes = $$('#digits input'), field = $('.srch-field');
  boxes.forEach((b,i)=>{
    b.addEventListener('input', ()=>{
      b.value = b.value.replace(/\D/g,'').slice(0,1);
      if(b.value && boxes[i+1]) boxes[i+1].focus();
      syncDigits();
      /* ro'yxat o'zgarmaydi — qidiruv faqat tugma bosilganda */
    });
    b.addEventListener('keydown', (e)=>{
      if(e.key === 'Backspace' && !b.value && boxes[i-1]){ boxes[i-1].focus(); boxes[i-1].value=''; syncDigits(); e.preventDefault(); }
      if(e.key === 'ArrowLeft' && boxes[i-1]) boxes[i-1].focus();
      if(e.key === 'ArrowRight' && boxes[i+1]) boxes[i+1].focus();
      if(e.key === 'Enter') liveSearch();
    });
    b.addEventListener('paste', (e)=>{
      const d = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(-7);
      if(d){ e.preventDefault(); fillQuick(d); }
    });
    b.addEventListener('focus', ()=>{ b.select(); if(field) field.classList.add('focus'); });
    b.addEventListener('blur', ()=>{ setTimeout(()=>{ if(field && !$$('#digits input').some(x=>x===document.activeElement)) field.classList.remove('focus'); }, 40); });
  });
  if(field) field.addEventListener('click', (e)=>{
    if(e.target.tagName === 'INPUT') return;
    const next = boxes.find(x => !x.value) || boxes[6];
    next.focus();
  });
})();

['oqPhone','ctPhone'].forEach(id => {
  const el = document.getElementById(id);
  /* iPhone: yozayotganda tegilmaydi, format maydondan chiqishda */
  if(el){ el.setAttribute('inputmode','tel');
    el.addEventListener('blur', ()=>{ el.value = formatUzNumber(extractRawDigits(el.value)); }); }
});
/* V131: "raqamning oxirgi 4 ta raqami" kataklari olib tashlandi —
   kabinetga endi faqat Telegram kodi bilan kiriladi. */

/* Buyurtma va shartnoma ekranlarida boshlang'ich ko'rsatma */
function hintBox(icon, title, body){
  return `<div class="hintbox"><span class="hi">${icon}</span><h4>${esc(title)}</h4><p>${esc(body)}</p></div>`;
}
function initHints(){
  const o = $('#oqResult'), c = $('#ctResult');
  if(o && !o.innerHTML.trim()) o.innerHTML = hintBox(
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z"></path><path d="M4 7.5 12 11l8-3.5M12 11v9"></path></svg>',
    LANG==='ru' ? 'Здесь появятся ваши заказы' : 'Buyurtmalaringiz shu yerda chiqadi',
    LANG==='ru' ? 'Введите номер телефона — отправим 4-значный код в Telegram.'
                : "Telefon raqamingizni kiriting — Telegram'ga 4 xonali kod yuboramiz.");
  if(c && !c.innerHTML.trim()) c.innerHTML = hintBox(
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h3"></path></svg>',
    LANG==='ru' ? 'Статус договора и график' : "Shartnoma holati va to'lovlar jadvali",
    LANG==='ru' ? 'Введите ID договора и номер телефона — покажем график платежей и дадим скачать PDF.'
                : "Shartnoma ID va telefon raqamini kiriting — to'lovlar jadvalini ko'rsatamiz va PDF ni yuklab olasiz.");
}

/* ==================================================================
   TELEGRAM MINI ILOVA (V136)
   ------------------------------------------------------------------
   Sayt endi Telegram ichida MINI ILOVA sifatida ishlaydi. Alohida
   sahifa (telegram-ilova.html) qilinmadi — ataylab: u saytning
   IKKINCHI NUSXASI edi va aynan shu sabab xatoga to'lgandi (bir
   joyda tuzatilgan narsa ikkinchisida tuzalmay qolardi). Endi bitta
   kod: saytda tuzatilgan har narsa mini ilovada ham ishlaydi.

   BU YERDA NIMA QILINADI:
     * `ready()` — Telegram'ga "sahifa tayyor" deb aytiladi. Busiz
       Telegram yuklanish ekranini ortiqcha ushlab turadi (mini ilova
       "qotgandek" tuyulishining sabablaridan biri);
     * `expand()` — ilova to'liq balandlikka ochiladi;
     * mavzu ranglari — Telegram sarlavhasi va foni saytning o'z
       ranglariga moslashtiriladi, aks holda tepada boshqa rangdagi
       chiziq ko'rinib turardi;
     * ORQAGA tugmasi — Telegram'ning o'z tugmasi saytning
       bo'limlari bilan bog'lanadi (oyna ochiq bo'lsa — oynani
       yopadi, ichki bo'limda bo'lsa — bosh sahifaga qaytaradi);
     * balandlik — Telegram oynasi o'lchami o'zgarsa (klaviatura
       ochilsa) sayt moslashadi.

   ATAYLAB QILINMAGANI: "yopishni tasdiqlash" (enableClosingConfirmation).
   Ilgari yoqilgan edi — natijada mijoz ilovani yopmoqchi bo'lganda
   har safar ortiqcha savol chiqardi. Do'kon ilovasida bu keraksiz.
   ================================================================== */
const TG = (function(){
  let W = null;
  const bor = () => !!W;
  return {
    ulan(wa){ W = wa || null; },
    get obyekt(){ return W; },
    bor,
    /* Haptika — tugma bosilganda yengil tebranish */
    tebrat(tur){
      try{
        if(!W || !W.HapticFeedback) return false;
        if(tur === 'ok' || tur === 'error' || tur === 'warning'){
          W.HapticFeedback.notificationOccurred(tur === 'ok' ? 'success' : tur);
        }else{
          W.HapticFeedback.impactOccurred(tur || 'light');
        }
        return true;
      }catch(e){ return false; }
    },
    orqaKorsat(korinsin){
      try{
        if(!W || !W.BackButton) return;
        if(korinsin) W.BackButton.show(); else W.BackButton.hide();
      }catch(e){}
    },

    /* ==============================================================
       TELEGRAM'NING O'Z TUGMASI — MainButton (V149)
       --------------------------------------------------------------
       Telegram mini ilovaning PASTIDA, klaviatura ustida turadigan
       katta tugmani o'zi chizadi. Uning ikkita afzalligi bor:
         * u ilovaning bir qismi emas, TELEGRAM'niki — shuning uchun
           har doim ko'rinadi, sahifa aylantirilsa ham joyida turadi
           va klaviatura ochilganda ustiga chiqib qolmaydi;
         * mijozga ilova "haqiqiy Telegram ilovasi"dek tuyuladi.

       Saytdagi o'z tugmamiz esa shu paytda YASHIRILADI, aks holda
       ekranda ikkita bir xil tugma turardi.

       `bos` — bosilganda chaqiriladigan funksiya. Har safar eskisi
       olib tashlanadi, aks holda tugma bir necha marta ishlab
       ketardi (Telegram tinglovchilarni to'plab boradi). */
    tugma(matn, bos, kutilmoqda){
      try{
        if(!W || !W.MainButton) return false;
        const mb = W.MainButton;
        if(this._bos){ try{ mb.offClick(this._bos); }catch(e){} }
        this._bos = bos;
        mb.setParams({ text: String(matn || '').slice(0, 64), is_active: !kutilmoqda, is_visible: true });
        if(kutilmoqda){ try{ mb.showProgress(true); }catch(e){} }
        else { try{ mb.hideProgress(); }catch(e){} }
        if(bos) mb.onClick(bos);
        mb.show();
        return true;
      }catch(e){ return false; }
    },
    tugmaYop(){
      try{
        if(!W || !W.MainButton) return;
        if(this._bos){ try{ W.MainButton.offClick(this._bos); }catch(e){} this._bos = null; }
        W.MainButton.hide();
      }catch(e){}
    },
    _bos: null
  };
})();

/* Telegram ichidamizmi — tez tekshiruv (CSS sinfi birinchi qatorda
   qo'yilgan, qarang: sahifa boshidagi skript). */
const tgIchida = () => document.documentElement.classList.contains('tg');

(async function tgIshgaTushir(){
  if(!tgIchida()) return;
  try{ await (window.__TG_TAYYOR || Promise.resolve()); }catch(e){}
  const wa = window.Telegram && window.Telegram.WebApp;
  if(!wa) return;                       /* SDK kelmadi — sayt odatdagidek ishlaydi */
  TG.ulan(wa);

  try{ wa.ready(); }catch(e){}
  try{ wa.expand(); }catch(e){}
  try{ if(wa.disableVerticalSwipes) wa.disableVerticalSwipes(); }catch(e){}
  /* Yopishni tasdiqlash ATAYLAB o'chirilgan (yuqoridagi izoh). */
  try{ if(wa.disableClosingConfirmation) wa.disableClosingConfirmation(); }catch(e){}

  /* Sarlavha va fon rangi — saytning o'z rangi bilan bir xil bo'lsin.
     Rang CSS o'zgaruvchisidan olinadi, ya'ni mavzu o'zgarsa bu ham
     o'zgaradi va ikki joyda alohida yozib qo'yilmaydi. */
  try{
    const uslub = getComputedStyle(document.documentElement);
    const fon = (uslub.getPropertyValue('--bg') || '#0B1120').trim();
    if(/^#[0-9a-f]{3,8}$/i.test(fon)){
      if(wa.setHeaderColor) wa.setHeaderColor(fon);
      if(wa.setBackgroundColor) wa.setBackgroundColor(fon);
    }
  }catch(e){}

  /* Telegram oynasining haqiqiy balandligi — klaviatura ochilganda
     ham sayt to'g'ri joylashsin (100dvh Telegram ichida har doim ham
     to'g'ri ishlamaydi). */
  const balandlik = ()=>{
    try{
      const h = wa.viewportStableHeight || wa.viewportHeight;
      if(h > 200) document.documentElement.style.setProperty('--tg-h', h + 'px');
    }catch(e){}
  };
  balandlik();
  try{ wa.onEvent('viewportChanged', balandlik); }catch(e){}

  /* ORQAGA tugmasi — Telegram'ning o'z tugmasi.
     Mantiq saytnikiga mos: oyna ochiq bo'lsa oynani yopadi, ichki
     bo'limda bo'lsa bosh sahifaga qaytaradi, bosh sahifada esa
     tugma umuman ko'rinmaydi. */
  const orqaYangila = ()=>{
    try{
      const oynaOchiq = (typeof sheetStack !== 'undefined') && sheetStack.length > 0;
      const ichki = (typeof currentRoute !== 'undefined') && currentRoute !== 'home';
      TG.orqaKorsat(oynaOchiq || ichki);
    }catch(e){}
  };
  try{
    wa.BackButton.onClick(()=>{
      if((typeof sheetStack !== 'undefined') && sheetStack.length){ closeSheet(); }
      else { go('home'); }
      setTimeout(orqaYangila, 60);
    });
  }catch(e){}
  window.addEventListener('hashchange', ()=> setTimeout(orqaYangila, 0));
  /* Oyna ochilib-yopilganda ham yangilanadi */
  document.addEventListener('click', ()=> setTimeout(orqaYangila, 120), { passive:true });
  orqaYangila();
})();

/* ================= PWA: "Ilovani o'rnating" =================
   Qoida: HECH QACHON zo'rlamaymiz. Taklif faqat mijoz saytga haqiqatan
   qiziqqanidan keyin chiqadi (kamida 3 ta raqam ko'rgan YOKI ikkinchi
   marta kirgan va 25 soniya qolgan bo'lsa). "Keyinroq" bosilsa 21 kun
   ko'rinmaydi, o'rnatilsa butunlay o'chadi.
   Telegram mini-ilovada va allaqachon o'rnatilgan holatda chiqmaydi. */
/* HOZIRCHA O'CHIRILGAN (mijoz so'rovi: "saytdan ilovalarni olib tasha").
   Kod joyida qoldirildi — keyin qaytarish uchun shu bitta qatorni
   `false` ga o'zgartirish yetarli. Taklif chizig'i va profildagi
   "Ilovani yuklab olish" plitkasi HTML'dan ham olib tashlangan. */
const PWA_OCHIQ = false;

const PWA = (function(){
  const K_OFF='vip_pwa_off', K_SNOOZE='vip_pwa_snooze', K_VISITS='vip_pwa_visits', K_SEEN='vip_pwa_views';
  let deferred = null, shown = false;

  const inTelegram = ()=>{ try{ return !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData); }catch(e){ return false; } };
  const installed = ()=>{
    try{
      if(window.matchMedia('(display-mode: standalone)').matches) return true;
      if(window.navigator.standalone) return true;
    }catch(e){}
    return false;
  };
  const isIos = ()=>/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const get = (k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } };
  const set = (k,v)=>{ try{ localStorage.setItem(k,String(v)); }catch(e){} };

  function blocked(){
    if(installed() || inTelegram()) return true;
    if(get(K_OFF)) return true;
    const sn = +get(K_SNOOZE,0);
    if(sn && Date.now() < sn) return true;
    return false;
  }

  /* Mijoz so'rovi: taklif BIRINCHI tashrifdayoq chiqsin. Lekin
     darhol emas — odam avval saytni ko'rsin, keyin taklif qilamiz.
     8 soniya: shu vaqt ichida bosh sahifa yuklanib, bir-ikki raqam
     ko'zga tashlanadi. */
  function earned(){ return true; }

  function hide(){
    const el = document.getElementById('pwaBox'); if(!el) return;
    el.classList.remove('show');
    setTimeout(()=>{ el.style.display='none'; }, 520);
  }

  function show(){
    if(!PWA_OCHIQ) return;
    if(shown || blocked()) return;
    const el = document.getElementById('pwaBox'); if(!el) return;
    /* Android/Chrome: brauzer ruxsat bergan bo'lsa haqiqiy o'rnatish.
       iOS Safari: qo'lda yo'riqnoma. Boshqa holatda umuman chiqarmaymiz. */
    if(!deferred && !isIos()) return;
    shown = true;
    /* Androidda: "O'rnatish" tugmasi. iPhone'da: qisqa yo'riqnoma
       (Apple avtomatik o'rnatishni qo'llamaydi). Ikkalasida ham
       yonida yopish belgisi turadi. */
    const yes = document.getElementById('pwaYes');
    const ios = document.getElementById('pwaIos');
    const nom = document.querySelector('.pwa-t');
    if(deferred){
      if(yes) yes.style.display = '';
      if(ios) ios.style.display = 'none';
    }else{
      if(yes) yes.style.display = 'none';
      if(ios) ios.style.display = 'inline-flex';
      if(nom) nom.style.display = 'none';
    }
    el.style.display='flex';
    requestAnimationFrame(()=> requestAnimationFrame(()=> el.classList.add('show')));
    try{ if(typeof track==='function') track('pwa_taklif_korsatildi'); }catch(e){}
  }

  function bindNo(){
    const no = document.getElementById('pwaNo'); if(!no) return;
    no.onclick = ()=>{
      set(K_SNOOZE, Date.now() + 21*24*3600*1000);
      hide();
      try{ if(typeof haptic==='function') haptic('light'); }catch(e){}
      try{ if(typeof track==='function') track('pwa_keyinroq'); }catch(e){}
    };
  }

  function init(){
    if(!PWA_OCHIQ) return;
    /* tashriflar sonini oshirish (bir sessiyada bir marta) */
    if(!sessionStorage.getItem('vip_pwa_v')){
      try{ sessionStorage.setItem('vip_pwa_v','1'); }catch(e){}
      set(K_VISITS, (+get(K_VISITS,0)) + 1);
    }
    bindNo();
    const row2 = document.getElementById('pwaRow2');
    if(row2) row2.addEventListener('click', ()=> PWA.och());
    const yes = document.getElementById('pwaYes');
    if(yes) yes.onclick = async ()=>{
      try{ if(typeof haptic==='function') haptic('medium'); }catch(e){}
      if(!deferred){ hide(); return; }
      hide();
      try{
        deferred.prompt();
        const res = await deferred.userChoice;
        if(res && res.outcome === 'accepted'){ set(K_OFF,'1'); }
        else { set(K_SNOOZE, Date.now() + 21*24*3600*1000); }
        try{ if(typeof track==='function') track('pwa_tanlov_' + ((res&&res.outcome)||'?')); }catch(e){}
      }catch(e){}
      deferred = null;
    };

    window.addEventListener('beforeinstallprompt', (e)=>{
      /* Brauzerning o'z (xunuk, pastdagi) taklifini to'xtatamiz va
         o'zimizning chiroyli taklifni ko'rsatamiz. */
      e.preventDefault(); deferred = e;
      setTimeout(show, 8000);
    });
    window.addEventListener('appinstalled', ()=>{ set(K_OFF,'1'); hide(); mavjudlikni(); });

    /* iPhone'da `beforeinstallprompt` YO'Q (Safari uni qo'llamaydi) —
       shu sabab u yerda taklif shunchaki vaqt bo'yicha chiqadi va
       "Ulashish -> Bosh ekranga qo'shish" yo'riqnomasini ko'rsatadi. */
    setTimeout(show, 8500);
    mavjudlikni();
  }

  /* Profil bo'limidagi doimiy "Ilovani o'rnatish" qatori — taklifni
     yopib yuborgan odam ham keyin istalgan vaqtda o'rnata olsin. */
  function mavjudlikni(){
    const row = document.getElementById('pwaRow2');
    if(!row) return;
    row.style.display = (installed() || inTelegram()) ? 'none' : '';
  }

  return {
    init,
    mavjudlikni,
    /* Profil bo'limidagi tugma bosilganda */
    och(){
      shown = false;
      try{ localStorage.removeItem(K_SNOOZE); }catch(e){}
      show();
      if(!deferred && !isIos()){
        /* Kompyuter brauzerida yoki taklif hali tayyor bo'lmaganda */
        try{ toast(LANG==='ru'
          ? 'Откройте сайт в Chrome на телефоне, чтобы установить приложение'
          : "Ilovani o'rnatish uchun saytni telefon brauzerida oching", 'info'); }catch(e){}
      }
    },
    /* har bir raqam ochilganda chaqiriladi — qiziqishni o'lchaydi */
    seen(){
      const n = (+get(K_SEEN,0)) + 1; set(K_SEEN, n);
      if(n === 3 && deferred) setTimeout(show, 900);
    }
  };
})();

/* Service worker — internet umuman yo'q bo'lsa ham sayt ochiladi */
if('serviceWorker' in navigator && location.protocol === 'https:'){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('/sw.js').catch(()=>{}));
}

/* ---------- Ishga tushirish ---------- */
/* ===== /raqam/998901234567 manzili bilan kelgan mijoz =====
   Bu sahifani netlify/functions/seo-number.js tayyorlaydi: u <head>
   ichiga window.__SEO_NUMBER ni yozib qo'yadi. Bazа yuklangach o'sha
   raqam kartochkasi O'ZI ochiladi, manzil esa chiroyli ko'rinishda
   qoladi (Google ham, mijoz ham shu havolani ulashadi). */
function seoRaqamniOch(){
  const want = String(window.__SEO_NUMBER || '').replace(/\D/g,'');
  if(!want) return;
  window.__SEO_NUMBER = '';
  let n = 0;
  const urin = ()=>{
    const list = (typeof NUMBERS !== 'undefined' && NUMBERS) ? NUMBERS : [];
    const hit = list.find(x => String(x.number||'').replace(/\D/g,'') === want);
    if(hit){ try{ openDetail(hit.id); }catch(e){} return; }
    if(++n < 25) setTimeout(urin, 240);
  };
  urin();
}

/* ==================================================================
   BOTDAN KELGAN MIJOZ — AYNAN O'SHA RAQAM OCHILADI (V149)
   ------------------------------------------------------------------
   MUAMMO. Savdo asosan Telegram orqali ketadi, lekin botdagi yoki
   kanaldagi raqamni mijoz ILOVADA ochib ko'ra olmasdi — ilovaga
   kirib, o'sha raqamni QO'LDA qidirishi kerak edi. Ko'p mijoz shu
   yerda yo'qolardi.

   ENDI bot xabaridagi "Ilovada ochish" tugmasi bosilganda mini ilova
   AYNAN o'sha raqam kartochkasi bilan ochiladi.

   UCHTA MANBADAN O'QIYMIZ, chunki Telegram holatga qarab har xil
   yo'l bilan uzatadi:
     1) `?r=...`  — bot xabaridagi `web_app` tugmasi shunday ochadi
        (tugmaga to'g'ridan-to'g'ri manzil beriladi);
     2) `tgWebAppStartParam=...` — `t.me/bot/app?startapp=...`
        havolasi orqali kelganda Telegram manzil hashiga yozadi
        (kanal postidagi tugma shunday ishlaydi);
     3) `initDataUnsafe.start_param` — SDK yuklangach o'sha qiymat.

   QIYMAT KO'RINISHI: `raqam_998901234567` yoki shunchaki raqam, yoki
   bazadagi hujjat ID'si. Hammasi qo'llab-quvvatlanadi.

   Kartochka ochilgach manzil TOZALANADI — mijoz orqaga qaytsa yoki
   sahifani yangilasa, o'sha oyna qayta-qayta ochilavermaydi. */
function botdanRaqamOch(){
  let p = '';
  try{
    const q = new URLSearchParams(location.search || '');
    p = q.get('r') || q.get('raqam') || '';
  }catch(e){}
  if(!p){
    try{
      const m = String(location.hash || '').match(/[?&#]tgWebAppStartParam=([^&]+)/);
      if(m) p = decodeURIComponent(m[1]);
    }catch(e){}
  }
  if(!p){
    try{
      const u = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe;
      if(u && u.start_param) p = String(u.start_param);
    }catch(e){}
  }
  if(!p) return;

  /* `raqam_`, `id_`, `n_` kabi oldqo'shimchalar olib tashlanadi */
  const toza = String(p).replace(/^(raqam|id|n)[_-]/i, '').trim();
  const raqamli = toza.replace(/\D/g, '');

  /* Manzilni darhol tozalaymiz — Telegram belgilari (tgWebAppData)
     SAQLANADI, aks holda ilova "Telegram ichidaman" deb bilmay
     qolardi. */
  try{
    const h = String(location.hash || '').replace(/[?&#]tgWebAppStartParam=[^&]*/, '');
    history.replaceState(null, '', location.pathname + h);
  }catch(e){}

  let n = 0;
  const urin = ()=>{
    const list = (typeof NUMBERS !== 'undefined' && NUMBERS) ? NUMBERS : [];
    let hit = null;
    if(toza) hit = list.find(x => String(x.id) === toza);
    if(!hit && raqamli.length >= 7){
      hit = list.find(x => String(x.number||'').replace(/\D/g,'').slice(-9) === raqamli.slice(-9));
    }
    if(hit){ try{ openDetail(hit.id); }catch(e){} return; }
    /* Baza hali yuklanmagan bo'lishi mumkin — 6 soniyagacha kutamiz */
    if(++n < 25) setTimeout(urin, 240);
  };
  urin();
}

/* Toifa sahifasidan kelgan bo'lsa (masalan /ucell-vip-raqamlar),
   katalogni darhol o'sha filtr bilan ochamiz. Server sahifani
   Google uchun tayyorlab beradi, bu yerda esa mijoz uchun ilova
   to'g'ri holatda ishga tushadi. */
function seoToifaniOch(){
  const t = window.__SEO_TOIFA;
  if(!t || typeof t !== 'object') return;
  window.__SEO_TOIFA = null;
  if(t.op)    catOp = t.op;
  if(t.naqsh) catNaqsh = t.naqsh;
  if(t.ins)   catOnlyInstallment = true;
  if(t.sort)  catSort = t.sort;
  catShown = PAGE_SIZE;
  if(!location.hash || location.hash === '#/') location.hash = '#/katalog';
  /* Serverda chizilgan ro'yxat endi kerak emas */
  const el = document.getElementById('seoToifa');
  if(el) el.remove();
}

/* Brauzer bo'sh qolganda bajariladigan ish. Birinchi chizishni
   kechiktirmaydi. */
function bosh(ish, kechikish){
  if(typeof requestIdleCallback === 'function'){
    requestIdleCallback(ish, { timeout: kechikish || 1500 });
  }else{
    setTimeout(ish, kechikish || 300);
  }
}

(function boot(){
  applyLang(true);   /* birinchi ochilish — qarang: applyLang() izohi */
  loadFavorites();
  seoToifaniOch();

  /* FIREBASE'NI BIRINCHI CHIZISHDAN KEYIN YUKLASHNI BOSHLAYMIZ (V145).
     ------------------------------------------------------------------
     Ikki marta `requestAnimationFrame` — ya'ni brauzer sahifani BIR
     MARTA chizib ulgurgandan keyin. Shundan so'ng 793 ms'lik kutubxona
     fonda yuklanadi va mijoz buyurtma tugmasiga yetguncha allaqachon
     tayyor bo'ladi.

     MUHIM: bu yerda `await` yo'q — yuklash BOSHLANADI, lekin hech kim
     uni kutib turmaydi. Kutish faqat `db` haqiqatan kerak bo'lgan
     joyda (`await firebaseniKut()`) bo'ladi. */
  try{
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ firebaseniKut(); }); });
  }catch(e){ setTimeout(firebaseniKut, 80); }
  /* V132 — TEZLIK.
     PWA (xizmat ishchisi) va PUSH (bildirishnoma) sahifaning
     BIRINCHI KO'RINISHIGA umuman kerak emas, lekin ikkalasi ham
     brauzerni band qiladi (SW ro'yxatdan o'tkazish, ruxsat holatini
     tekshirish). Shuning uchun ular endi brauzer BO'SH QOLGANDA
     ishga tushadi — sahifa avval chiziladi, keyin shular.
     `requestIdleCallback` bo'lmasa (eski Safari) — oddiy kechikish. */
  bosh(()=>{
    try{ PWA.init(); }catch(e){}
    /* V136 — TELEGRAM TEZLIGI. Mini ilova ichida web-push UMUMAN
       kerak emas: bildirishnomalarni botning o'zi yuboradi, Telegram
       brauzeri esa ruxsat oynasini ham to'g'ri ko'rsatmaydi. Shu
       sabab u yerda PUSH butunlay o'tkazib yuboriladi — bu Telegram
       ichida bir nechta ortiqcha ishni (xizmat ishchisiga murojaat,
       ruxsat holatini tekshirish, token olish) olib tashlaydi. */
    if(!tgIchida()){ try{ PUSH.init(); }catch(e){} }
  }, 1200);
  netBarRender();
  /* Kompyuterda sayt birinchi marta Katalog bo'limi bilan ochiladi */
  if(!location.hash && window.matchMedia('(min-width:900px)').matches){
    location.replace('#/katalog');
  }
  /* V131: Telegram'dagi «Bir bosishda kirish» tugmasi bilan
     kelgan bo'lsa — kalitni tokenga almashtiramiz va kabinetni
     ochamiz. Kalit manzildan darhol tozalanadi. */
  if(/[?&]k=[\w-]{16,}/.test(String(location.hash||''))){
    kirishKaliti().then((ok)=>{ renderRoute(); if(ok) go('orders'); });
  }else{
    renderRoute();
  }
  seoRaqamniOch();

  botdanRaqamOch();   /* V149: botdan kelgan raqamni ochish */
  if(!keshdanOqi()){
    /* V120: sahifa ochilishi bilanoq HAR BIR bo'lim o'z skeletini
       ko'rsatadi — tepadagi karusel, raqam kartochkalari, "Mijozlar
       fikri" va sarlavha ostidagi yozuvlar. Internet bo'lmasa shu
       holat QOLAVERADI (xato ekrani chiqmaydi), tepada esa "Internet
       yo'q" tasmasi turadi. Baza javob bergach skelet haqiqiy
       mazmun bilan almashadi. */
    $('#homeFeatured').innerHTML = skeletons(3);
    $('#homeHero').innerHTML = skHero(2);
    try{ renderTestimonials(); }catch(e){}
  }
  xabarlarKeshdan();
  syncDigits();
  /* V132: "Buyurtmalarim" va "Shartnoma" bo'limlaridagi boshlang'ich
     ko'rsatmalar — ular ko'rinmaydigan bo'limlarda, shuning uchun
     bo'sh vaqtda chiziladi. */
  bosh(()=>{ try{ initHints(); }catch(e){} }, 1500);
  /* V132: KATALOG. Ilgari katalog ro'yxati sayt ochilishi bilan
     HAR DOIM chizilardi — hatto mijoz bosh sahifada turgan bo'lsa
     ham, ya'ni ko'rinmaydigan 15 ta kartochka bekorga chizilardi.
     Endi: katalog bo'limi ochiq bo'lsagina darhol, aks holda brauzer
     bo'sh qolganda (mijoz katalogga o'tsa — renderRoute o'zi
     chaqiradi, kechikish sezilmaydi). */
  if(currentRoute === 'catalog') renderCatalog();
  else bosh(()=>{ try{ renderCatalog(); }catch(e){} }, 2000);

  avtoQayta('raqamlar', raqamlarniYukla);
  avtoQayta('sozlamalar', sozlamalarniYukla);
  avtoQayta('moliyalash', moliyalashYukla);
  avtoQayta('kuntavsiyasi', kunTavsiyasiYukla);
  setTimeout(()=> avtoQayta('fikrlar', fikrlarniYukla), 1200);
  /* Xabarlar — bitta hujjat o'qiladi, shu sabab juda arzon. Sayt
     ochilishini sekinlatmasligi uchun 1,5 soniyadan keyin. */
  setTimeout(()=> avtoQayta('xabarlar', xabarlarniYukla), 1500);
  /* Stories (bosh sahifadagi dumaloq lenta) — katalogdan keyin,
     sayt ochilishini sekinlashtirmasligi uchun kechikib yuklanadi. */
  /* V136: Telegram ichida storiyalar kechroq — u yerdagi brauzer
     sekinroq, birinchi ko'rinish esa muhimroq. */
  setTimeout(()=> avtoQayta('stories', storiesYukla), tgIchida() ? 1800 : 900);
  setTimeout(()=>{ tashrifHisobi(); yangiRaqamKuzatuvi(); }, 1800);
  /* V120: yuborilmay qolgan buyurtmalar navbati — sahifa ochilishi
     bilan o'zi qayta yuboriladi (buyurtma yo'qolmaydi). */
  try{ navbatIshgaTushir(); }catch(e){}
})();

/* ---------- Sevimlilar: kartani chapga surib o'chirish ---------- */
(function(){
  const W = 86;
  let el=null, x0=0, y0=0, dx=0, lock='', justSwiped=0;
  function closeAll(except){
    document.querySelectorAll('#favList .swipe.open').forEach(s=>{ if(s!==except) s.classList.remove('open'); });
  }
  document.addEventListener('pointerdown', (e)=>{
    if(e.clientX <= 24) return;          /* chap chekka — "orqaga" imo-ishorasi uchun */
    const sw = e.target.closest('#favList .swipe'); if(!sw){ closeAll(null); return; }
    if(e.target.closest('.swipe-del')) return;
    el = sw; x0 = e.clientX; y0 = e.clientY; dx = 0; lock='';
  }, {passive:true});
  document.addEventListener('pointermove', (e)=>{
    if(!el) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if(!lock){
      if(Math.abs(mx) > 8 || Math.abs(my) > 8) lock = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if(lock === 'y'){ el = null; return; }
    }
    if(lock !== 'x') return;
    const base = el.classList.contains('open') ? -W : 0;
    dx = Math.max(-W - 18, Math.min(0, base + mx));
    el.classList.add('drag');
    /* V133: yozuv kadriga bittaga tenglashtiriladi — barmoq
       xabarlari kadrdan tezroq kelganda ortiqcha ish bajarilmasin. */
    if(!el._yoz) el._yoz = kadrYozuvchi(el.querySelector('.swipe-in'));
    el._yoz.qoy('translateX(' + dx + 'px)');
  }, {passive:true});
  function end(){
    if(!el) return;
    if(el._yoz) el._yoz.tugat();
    const inn = el.querySelector('.swipe-in');
    el.classList.remove('drag');
    if(inn) inn.style.transform = '';
    if(lock === 'x'){
      const open = dx < -W/2;
      closeAll(el);
      el.classList.toggle('open', open);
      if(open) haptic('select');
      justSwiped = Date.now();
    }
    el = null; dx = 0; lock = '';
  }
  document.addEventListener('pointerup', end, {passive:true});
  document.addEventListener('pointercancel', end, {passive:true});
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('#favList')) return;
    if(e.target.closest('.swipe-del')) return;
    /* surishdan keyingi "soxta" klik — e'tiborsiz qoldiriladi */
    if(Date.now() - justSwiped < 400){ e.preventDefault(); e.stopPropagation(); return; }
    const sw = e.target.closest('#favList .swipe.open');
    if(sw){ e.preventDefault(); e.stopPropagation(); sw.classList.remove('open'); }
  }, true);
})();

/* ---------- Pastki menyu: kapsula tanlangan bo'limga suriladi ---------- */
function moveNavPill(){
  const nav = document.getElementById('nav'), pill = document.getElementById('navPill');
  if(!nav || !pill) return;
  const on = nav.querySelector('a.on');
  if(!on){ pill.classList.remove('on'); return; }
  const r = on.getBoundingClientRect(), nr = nav.getBoundingClientRect();
  pill.style.width = r.width + 'px';
  pill.style.transform = 'translateX(' + (r.left - nr.left) + 'px)';
  pill.classList.add('on');
}
window.addEventListener('resize', moveNavPill);
window.addEventListener('hashchange', ()=> setTimeout(moveNavPill, 0));

/* ==================================================================
   MENYUNI BARMOQ BILAN SURISH  (V178)
   ------------------------------------------------------------------
   Mijoz so'rovi: "ustiga bosib turib sekin yursa, xuddi shishaday
   yurishi kerak".

   Ya'ni kapsula bosilgan joyda QOTIB turmaydi — barmoq bilan birga
   siljiydi, barmoq ostidagi bo'lim esa yorishib boradi. Barmoq
   ko'tarilganda kapsula eng yaqin bo'limga "qo'nadi" va o'sha bo'lim
   ochiladi.

   TEZLIK QOIDALARI (shuning uchun u sekinlashtirmaydi):
     * harakat davomida FAQAT `transform` yoziladi — joylashuv
       qaytadan hisoblanmaydi;
     * yozuv kadrga BITTA marta tushadi (`kadrYozuvchi`), ya'ni
       barmoq sekundiga 120 marta xabar bersa ham, ekran 60 marta
       yangilanadi;
     * o'lchamlar faqat bosish boshida bir marta o'lchanadi;
     * kenglik faqat eng yaqin bo'lim O'ZGARGANDA yoziladi.

   Oddiy bosish (surilmasdan) hech narsaga tegmaydi — havola o'zi
   ishlayveradi, ya'ni eski xulq buzilmagan. */
(function(){
  const nav = document.getElementById('nav');
  const pill = document.getElementById('navPill');
  if(!nav || !pill) return;

  const BOSHLASH = 7;          /* shuncha px dan keyin "surish" deb hisoblanadi */
  let links = [], navR = null;
  let bosildi = false, surilyapti = false, x0 = 0, oxirgi = null, yoz = null;

  function olcha(){
    navR = nav.getBoundingClientRect();
    links = Array.prototype.map.call(nav.querySelectorAll('a[data-nav]'), (a)=>{
      const r = a.getBoundingClientRect();
      return { a:a, chap:r.left - navR.left, ken:r.width, markaz:r.left - navR.left + r.width/2 };
    });
  }
  function yaqini(x){
    let eng = links[0], masofa = Infinity;
    for(const l of links){
      const d = Math.abs(l.markaz - x);
      if(d < masofa){ masofa = d; eng = l; }
    }
    return eng;
  }

  nav.addEventListener('pointerdown', (e)=>{
    if(e.pointerType === 'mouse' && e.button !== 0) return;
    olcha();
    if(!links.length) return;
    bosildi = true; surilyapti = false; x0 = e.clientX; oxirgi = null;
  });

  window.addEventListener('pointermove', (e)=>{
    if(!bosildi) return;
    if(!surilyapti){
      if(Math.abs(e.clientX - x0) < BOSHLASH) return;
      surilyapti = true;
      pill.style.transition = 'none';     /* barmoqqa 1:1 ergashsin */
      nav.classList.add('surilmoqda');
      if(!yoz) yoz = kadrYozuvchi(pill);
    }
    const x = Math.max(navR.left, Math.min(navR.right, e.clientX)) - navR.left;
    const l = yaqini(x);
    if(l !== oxirgi){
      oxirgi = l;
      pill.style.width = l.ken + 'px';    /* faqat bo'lim almashganda */
      links.forEach(o => o.a.classList.toggle('yaqin', o === l));
    }
    yoz.qoy('translateX(' + (x - l.ken / 2) + 'px)');
  }, { passive:true });

  function qoyvor(e){
    if(!bosildi) return;
    bosildi = false;
    nav.classList.remove('surilmoqda');
    links.forEach(o => o.a.classList.remove('yaqin'));
    if(!surilyapti) return;               /* oddiy bosish — havola o'zi ishlaydi */
    surilyapti = false;
    if(yoz) yoz.tugat();
    pill.style.transition = '';           /* qo'nish animatsiyasi qaytadi */
    const x = Math.max(navR.left, Math.min(navR.right, e.clientX)) - navR.left;
    const l = yaqini(x);
    try{ haptic('light'); }catch(err){}
    if(l && l.a && !l.a.classList.contains('on')) l.a.click();
    moveNavPill();                        /* aniq joyiga qo'nadi */
  }
  window.addEventListener('pointerup', qoyvor);
  window.addEventListener('pointercancel', ()=>{
    if(!bosildi) return;
    bosildi = false; surilyapti = false;
    nav.classList.remove('surilmoqda');
    links.forEach(o => o.a.classList.remove('yaqin'));
    if(yoz) yoz.tugat();
    pill.style.transition = '';
    moveNavPill();
  });
})();

/* ==================================================================
   CHAP CHEKKADAN SURIB ORQAGA QAYTISH
   Telegram/iOS'dagi kabi: barmoqni ekranning chap chekkasidan o'ngga
   sursa — orqaga qaytadi. Oyna (sheet) ochiq bo'lsa avval o'sha
   yopiladi, keyin sahifa tarixi bo'yicha orqaga o'tiladi.
   Chekka zonasi 22px — oddiy surish va kartochkadagi "o'chirish"
   imo-ishorasiga xalaqit bermaydi.
   ================================================================== */
(function(){
  const EDGE = 22;       /* chekka zonasi (px) */
  const NEED = 74;       /* orqaga qaytish uchun kerakli masofa */
  const hint = document.getElementById('edgeBack');
  let act = false, x0 = 0, y0 = 0, dx = 0, lock = '';

  /* V133: kadriga bitta yozuv (qarang: kadrYozuvchi) */
  const yoz = hint ? kadrYozuvchi(hint) : null;
  function qoy(d){
    if(!hint) return;
    const k = Math.min(1, d / NEED);
    yoz.qoy('translate(' + (Math.min(d, 118) - 46) + 'px,-50%) scale(' + (0.8 + k * 0.28) + ')');
    hint.classList.toggle('on', d > 6);
  }
  function tozala(){
    act = false; lock = ''; dx = 0;
    if(hint){ if(yoz) yoz.tugat(); hint.classList.remove('on'); hint.style.transform = 'translate(-100%,-50%) scale(.8)'; }
  }

  document.addEventListener('pointerdown', (e)=>{
    if(e.pointerType === 'mouse') return;          /* faqat barmoq uchun */
    if(e.clientX > EDGE) return;
    if(document.querySelector('.sheet.on .bodyscroll') && e.target.closest('.srch-cells')) return;
    act = true; x0 = e.clientX; y0 = e.clientY; dx = 0; lock = '';
  }, {passive:true, capture:true});

  document.addEventListener('pointermove', (e)=>{
    if(!act) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if(!lock){
      if(Math.abs(mx) < 10 && Math.abs(my) < 10) return;
      lock = (mx > Math.abs(my)) ? 'x' : 'y';
      if(lock === 'y'){ tozala(); return; }
    }
    dx = Math.max(0, mx);
    /* V133: kadriga bitta yozuv */
    qoy(dx);
  }, {passive:true, capture:true});

  const tugadi = ()=>{
    if(!act) return;
    const yetarli = lock === 'x' && dx >= NEED;
    tozala();
    if(!yetarli) return;
    haptic('light');
    if(typeof sheetStack !== 'undefined' && sheetStack.length){ closeSheet(); return; }
    if(history.length > 1) history.back();
    else location.hash = '#/';
  };
  document.addEventListener('pointerup', tugadi, {passive:true, capture:true});
  document.addEventListener('pointercancel', ()=> tozala(), {passive:true, capture:true});
})();

/* ================= KARTOCHKANI TEZ OCHISH =================
   MUAMMO (Androidda): barmoq bilan tez pastga tushib, so'ng kartochkaga
   bosilganda u ochilmay qolardi. Sabab — `click` hodisasi: brauzer uni
   barmoq uzilgandan keyin yuboradi va aylantirish inertsiyasi davom
   etayotgan bo'lsa UMUMAN yubormasligi mumkin. iPhone'da bu kamroq
   seziladi, Androidda esa aniq "bosdim — ochilmadi" bo'lib chiqadi.

   YECHIM: kartochka `pointerup` da ochiladi — ya'ni barmoq uzilishi
   bilanoq. Tasodifan ochilib ketmasligi uchun uchta shart:
     • barmoq 12 px dan ko'p siljimagan bo'lsin (aylantirish emas),
     • bosish 600 ms dan qisqa bo'lsin (uzoq bosish emas),
     • sahifa aylanayotgan bo'lmasin.
   Keyin kelgan `click` takrorlamasligi uchun yuqorida 700 ms himoya bor. */
(function kartochkaTezOchilsin(){
  let x0=0, y0=0, t0=0, nishon=null;
  addEventListener('pointerdown', (e)=>{
    nishon = null;
    if(e.pointerType === 'mouse') return;        /* sichqonchada `click` yaxshi ishlaydi */
    const c = e.target.closest('[data-card]');
    if(!c) return;
    /* kartochka ichidagi tugmalar o'z ishini qilsin */
    if(e.target.closest('button, a, [data-fav], [data-order], [data-copy]')) return;
    nishon = c; x0 = e.clientX; y0 = e.clientY; t0 = Date.now();
  }, { passive:true });

  addEventListener('pointermove', (e)=>{
    if(!nishon) return;
    if(Math.abs(e.clientX - x0) > 12 || Math.abs(e.clientY - y0) > 12) nishon = null;
  }, { passive:true });

  const bekor = ()=>{ nishon = null; };
  addEventListener('pointercancel', bekor, { passive:true });

  addEventListener('pointerup', (e)=>{
    const c = nishon; nishon = null;
    if(!c) return;
    if(Date.now() - t0 > 600) return;
    if(document.documentElement.classList.contains('scrolling')) return;
    if(document.querySelector('.sheet.on')) return;
    try{
      const sel = (window.getSelection && window.getSelection().toString()) || '';
      if(sel.trim().length > 2) return;
    }catch(err){}
    window.__tezOchildi = Date.now();

    /* "Arvoh klik" muammosi: barmoq uzilgach brauzer `click` ni ham
       yuboradi. Oyna shu zahoti ochilgani uchun u klik endi oynaning
       ORQA FONIGA tushadi va oynani darhol yopib yuboradi — mijoz
       "bosdim, ochildi-yu yopilib ketdi" deb ko'radi.
       Shuning uchun keyingi BITTA klikni butunlay yutib yuboramiz. */
    const yut = (ev)=>{ ev.preventDefault(); ev.stopPropagation(); };
    addEventListener('click', yut, { capture:true, once:true });
    setTimeout(()=> removeEventListener('click', yut, { capture:true }), 700);

    openDetail(c.dataset.card);
  }, { passive:true });
})();

/* ================= AYLANTIRISH HOLATI =================
   Aylantirish boshlanganda <html> ga `scrolling` sinfi qo'yiladi,
   tugaganda olinadi. CSS shu paytda menyu blurini o'chiradi —
   izohi 02-css.html da.

   Hodisa `passive` va ishi minimal: faqat sinf qo'yiladi/olinadi,
   hech qanday o'lchov yoki qayta chizish so'ralmaydi. */
(function aylantirishHolati(){
  const el = document.documentElement;
  let t = 0, on = false;
  const tugadi = ()=>{ on = false; el.classList.remove('scrolling'); };
  addEventListener('scroll', ()=>{
    if(!on){ on = true; el.classList.add('scrolling'); }
    clearTimeout(t);
    t = setTimeout(tugadi, 160);
  }, { passive:true });
  /* barmoq uzilsa — darhol qaytarmaymiz, inertsiya hali davom etishi mumkin */
  addEventListener('pointercancel', ()=>{ clearTimeout(t); t = setTimeout(tugadi, 160); }, { passive:true });
})();

setTimeout(moveNavPill, 60);
setTimeout(moveNavPill, 400);

/* ==================================================================
   NUSXA OLISH VA ZOOM QALQONI
   Mijoz so'rovi: saytdagi hech narsani nusxa olib bo'lmasin va
   sayt yaqinlashtirilmasin (ilovadek qat'iy tursin).

   Qoidalar:
     - kiritish maydonlari (input/textarea) TEGILMAYDI — ularsiz
       qidiruv, telefon kiritish va buyurtma ishlamaydi;
     - saytning o'z "Nusxa olish" tugmasi ishlayveradi
       (`window.__nusxaRuxsat` va `[data-nusxa]` istisnolari).
   ================================================================== */
(function(){
  /* Kiritish maydonimi? */
  function kiritish(el){
    if(!el || !el.closest) return false;
    return !!el.closest('input,textarea,select,[contenteditable="true"],[data-nusxa]');
  }

  /* --- 1. Belgilash (selection) --- */
  document.addEventListener('selectstart', function(e){
    if(!kiritish(e.target)) e.preventDefault();
  });

  /* --- 2. Nusxa olish / kesish --- */
  ['copy','cut'].forEach(function(nom){
    document.addEventListener(nom, function(e){
      if(window.__nusxaRuxsat) return;          /* o'z tugmamiz */
      if(kiritish(e.target)) return;            /* maydon ichida — mayli */
      e.preventDefault();
      try{ e.clipboardData && e.clipboardData.setData('text/plain',''); }catch(err){}
    });
  });
  /* "Qo'yish" (paste) TAQIQLANMAYDI — telefon raqamini qo'yish kerak. */

  /* --- 3. O'ng tugma / uzoq bosish menyusi --- */
  document.addEventListener('contextmenu', function(e){
    if(!kiritish(e.target)) e.preventDefault();
  });

  /* --- 4. Rasm va havolani sudrab olish --- */
  document.addEventListener('dragstart', function(e){ e.preventDefault(); });

  /* --- 5. Klaviatura: Ctrl/Cmd + C, X, A, S, U, P va F12 --- */
  document.addEventListener('keydown', function(e){
    const mod = e.ctrlKey || e.metaKey;
    if(!mod) return;
    const k = (e.key || '').toLowerCase();
    if(kiritish(e.target) && (k === 'c' || k === 'x' || k === 'a' || k === 'v')) return;
    if(['c','x','a','s','u','p'].indexOf(k) !== -1) e.preventDefault();
    /* Ctrl +, Ctrl -, Ctrl 0 — brauzer zoomi */
    if(k === '+' || k === '-' || k === '=' || k === '0') e.preventDefault();
  });

  /* --- 6. Zoom: iPhone `user-scalable=no` ni mensimaydi --- */
  ['gesturestart','gesturechange','gestureend'].forEach(function(nom){
    document.addEventListener(nom, function(e){ e.preventDefault(); }, { passive:false });
  });
  /* Ikki barmoq bilan chimdish */
  document.addEventListener('touchmove', function(e){
    if(e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive:false });
  /* Ikki marta bosib yaqinlashtirish `body{touch-action:manipulation}`
     bilan allaqachon o'chirilgan. Bu yerda touchend'ni to'xtatmaymiz:
     to'xtatilsa ketma-ket tez bosilgan tugma "bosilmay" qolardi. */
  /* Kompyuterda Ctrl + g'ildirak */
  document.addEventListener('wheel', function(e){
    if(e.ctrlKey) e.preventDefault();
  }, { passive:false });
})();

