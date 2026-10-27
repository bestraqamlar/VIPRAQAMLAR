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
firebase.initializeApp(firebaseConfig);
try{ firebase.appCheck().activate('6LddC2ItAAAAAPajc0NSM_wtRLb_6ik0VDVCV7ll', true); }catch(e){}
const db = firebase.firestore();
/* Ba'zi O'zbekiston tarmoqlari Firestore streamini bloklaydi — bu sozlama shart */
try{ db.settings({ experimentalAutoDetectLongPolling: true }); }catch(e){}
const FV = firebase.firestore.FieldValue;
async function getAppCheckHeaders(){
  try{ const t = await firebase.appCheck().getToken(); return { 'X-Firebase-AppCheck': t.token }; }
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
  if(mt) mt.setAttribute('content', '#07152B');
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
  const snap = await withClientTimeout(db.collection('numbers').get(), kutishVaqti(10000));
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
  const snap = await withClientTimeout(db.collection('video_testimonials').limit(3000).get(), kutishVaqti(12000));
  TESTIMONIALS = snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b)=> (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  TEST_YUKLANDI = true;
  renderTestimonials();
}
function tashrifHisobi(){
  try{
    if(!localStorage.getItem('raqamuz_counted')){
      db.collection('site_stats').doc('counter').set({ totalVisitors: FV.increment(1) }, { merge:true })
        .then(()=> localStorage.setItem('raqamuz_counted','1')).catch(()=>{});
    }
  }catch(e){}
  const sid = 'sess_' + Math.random().toString(36).slice(2) + '_' + Date.now();
  const beat = ()=> db.collection('active_sessions').doc(sid).set({ lastSeen: FV.serverTimestamp() }).catch(()=>{});
  beat(); setInterval(beat, 20000);
}
let __nnFirst = true;
function yangiRaqamKuzatuvi(){
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
          ${vip ? `<span class="tag vip">${ICO_CROWN}${TIERS[tier]}</span>` : ''}
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

  renderTestimonials();
}

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
      ${dTier ? `<span class="tag vip">${ICO_CROWN}${TIERS[dTier]}</span>` : ''}
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
function heroOrqaga(ms){
  const tr = heroEl(); if(!tr || tr.children.length < 3 || heroBusy) return;
  heroBusy = true;
  const w = heroW();                      /* keshdan — o'lchov yo'q */
  const dav = ms || HERO_AVTO_MS;
  tr.classList.remove('glide','snapback');
  tr.style.transition = '';
  tr.insertBefore(tr.lastElementChild, tr.firstElementChild);  /* oxirgisi boshiga */
  tr.style.transform = 'translate3d(' + (-2 * w) + 'px,0,0)';
  /* V142: bu yerdagi `void tr.offsetWidth` ham olib tashlandi —
     `heroSur()` ning o'zi boshlang'ich holatni bir marta hisoblab
     oladi, ya'ni ikkinchi marta majburlashning keragi yo'q. */
  heroSur(-w, dav, ms ? HERO_EGRI : HERO_EGRI_AVTO);
  heroKut(tr, ()=>{
    tr.classList.remove('glide','snapback');
    tr.style.transition = '';
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
  box.innerHTML = TESTIMONIALS.slice(0, 10).map(v => `
    <div class="vcard">
      <video src="${esc(v.videoUrl)}#t=0.1" preload="${videoPreload()}" playsinline muted loop controls></video>
      <div class="vm">
        ${v.number ? `<b class="sg">${esc(shortNumber(v.number))}</b>` : ''}
        ${v.caption ? `<i>${esc(v.caption)}</i>` : ''}
      </div>
    </div>`).join('');
}
function videoPreload(){
  try{
    const c = navigator.connection;
    if(c && (c.saveData || /2g/.test(c.effectiveType||''))) return 'none';
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
  if(numbersLoaded) $('#catCount').textContent = `${formatPrice(list.length)} ${t('ta raqam')}`;
  else skSub($('#catCount'));
  $('#filterDot').style.display = (catOp || catSort!=='default') ? '' : 'none';

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
  f.push({ icon:'→', bg:'var(--card-2)', fg:'var(--text-3)',
    text: LANG==='ru' ? 'Бесплатная доставка по Узбекистану' : "O'zbekiston bo'ylab bepul yetkazib berish" });
  return f.slice(0,4);
}

/* ==================================================================
   BUYURTMA
   ================================================================== */
const ORD = {
  item:null, step:1, paymentType:'cash', months:6, monthly:0, down:0,
  name:'', phoneRaw:'', region:'', location:null, orderId:null
};
const STEP_TITLES = ['Buyurtma xulosasi',"Ma'lumotlaringiz",'Tasdiqlash','SMS tasdiq','Buyurtma qabul qilindi'];

function openOrder(id){
  const item = findItem(id); if(!item || item.reserved) return;
  /* TUZATISH (V119): bu yerda ilgari `trackNumOrder` turardi — ya'ni
     mijoz formani shunchaki OCHSA ham "buyurtma berildi" deb
     sanalardi. Natijada buyurtma soni haqiqatdan katta chiqardi va
     "formani ochdi-yu yubormadi" degan holat umuman ko'rinmasdi.
     Endi bu yerda FORMA OCHILDI qadami sanaladi; haqiqiy buyurtma esa
     faqat yozuv muvaffaqiyatli bo'lgandan keyin (pastda). */
  try{ trackFormaOchildi(item); }catch(e){}
  Object.assign(ORD, { item, step:1, paymentType: (item.installment && installmentAllowed(item)) ? 'installment' : 'cash',
    months:6, monthly:0, down:0, location:null, orderId:null, sorovId:null });
  try{
    ORD.name = localStorage.getItem('vip_name') || '';
    ORD.phoneRaw = localStorage.getItem('vip_phone') || '';
    ORD.region = localStorage.getItem('vip_region') || '';
  }catch(e){}
  recalcMonthly(); $('#ordStepsWrap').style.display = '';
  renderOrder(); openSheet('shOrder');
}
function recalcMonthly(){
  const it = ORD.item; if(!it) return;
  ORD.monthly = oylikTolov(it, ORD.months);
  ORD.down    = oylikBoshTolov(it, ORD.months);
}
function finalPrice(){ return Math.max(0, (ORD.item.price||0)); }

function setSteps(n){
  $$('#ordSteps .s').forEach((s,i)=>{
    s.classList.toggle('on', i === n-1); s.classList.toggle('ok', i < n-1);
    s.querySelector('b').innerHTML = i < n-1
      ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg>'
      : String(i+1);
  });
}

function renderOrder(){
  const it = ORD.item; if(!it) return;
  if(ORD.step <= 3) setSteps(ORD.step);
  $('#ordTitle').textContent = t(STEP_TITLES[ORD.step-1] || 'Buyurtma');
  const body = $('#ordBody'), foot = $('#ordFoot');

  /* ---- 1: raqam va to'lov turi ---- */
  if(ORD.step === 1){
    const fin = installmentFinancingFor(it);
    const canIns = installmentAllowed(it);
    const months = oylikMuddatlar(it);
    body.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="width:46px;height:46px;border-radius:14px;background:var(--navy-grad);display:flex;align-items:center;justify-content:center;flex:none">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#E6C877" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 17 21H7a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 7 3z"></path><path d="M10.5 18h3"></path></svg>
          </span>
          <div style="flex:1;min-width:0">
            <div class="sg" style="font-size:21px;font-weight:700">${esc(shortNumber(it.number))}</div>
            <div style="margin-top:7px;display:flex;align-items:center;gap:8px">
              ${it.featured?`<span class="tag vip">${t('VIP')}</span>`:''}
              <span class="nc-op"><i style="background:${opMeta(it.operator).color}"></i>${esc(it.operator||'')}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="eyebrow">${t("To'lov usuli")}</div>
        <div style="margin-top:12px;display:flex;gap:9px">
          ${(canIns ? ['cash','installment'] : ['cash']).map(p => `<button data-pay="${p}" style="flex:1;padding:13px 10px;border-radius:14px;border:1.5px solid ${ORD.paymentType===p?'var(--blue)':'var(--line-2)'};background:${ORD.paymentType===p?'var(--blue-tint)':'var(--card)'};text-align:center">
            <span style="display:block;font-size:13.5px;font-weight:${ORD.paymentType===p?'800':'700'};color:${ORD.paymentType===p?'var(--blue-ink)':'var(--text-2)'}">${p==='cash'?t("To'liq to'lov"):t("Bo'lib to'lash")}</span>
            <span style="display:block;margin-top:3px;font-size:10.5px;font-weight:650;color:var(--muted-2)">${p==='cash'?t('Bir martada'):months[0]+'–'+months[months.length-1]+' '+t('oy')}</span>
          </button>`).join('')}
        </div>
        ${canIns ? '' : `<div style="margin-top:10px;font-size:11.5px;color:var(--muted-2);font-weight:600">${LANG==='ru'?'Для этого номера рассрочка не предусмотрена.':"Bu raqam uchun bo'lib to'lash ko'zda tutilmagan."}</div>`}
        ${(canIns && ORD.paymentType==='installment') ? `
        <div style="margin-top:14px">
          <div class="eyebrow">${t('Muddat')}</div>
          <div style="margin-top:10px;display:grid;grid-template-columns:repeat(${months.length},minmax(0,1fr));gap:8px">
            ${months.map(m => `<button data-mon="${m}" style="padding:11px 4px;border-radius:12px;border:1.5px solid ${ORD.months===m?'var(--blue)':'var(--line-2)'};background:${ORD.months===m?'var(--blue-tint)':'var(--card)'};font-size:13px;font-weight:${ORD.months===m?'800':'650'};color:${ORD.months===m?'var(--blue-ink)':'var(--text-2)'}">${m} ${t('oy')}</button>`).join('')}
          </div>
          <div style="margin-top:13px;background:var(--card-2);border-radius:13px;padding:13px 14px">
            <div style="display:flex;align-items:baseline"><span style="flex:1;font-size:12.5px;color:var(--text-3);font-weight:650">${t("Oylik to'lov")}</span><span class="sg" style="font-size:17px;font-weight:700;color:var(--blue-text)">${formatPrice(ORD.monthly)} ${SUM()}</span></div>
            ${ORD.down?`<div style="margin-top:8px;display:flex;align-items:baseline"><span style="flex:1;font-size:12.5px;color:var(--text-3);font-weight:650">${t("Bosh to'lov")}</span><span class="sg" style="font-size:14px;font-weight:700">${formatPrice(ORD.down)} ${SUM()}</span></div>`:''}
          </div>
        </div>` : ''}
      </div>


      <div class="card" style="margin-top:12px">
        <div style="display:flex;flex-direction:column;gap:10px">
          ${ORD.paymentType === 'installment' ? '' : `<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Raqam narxi')}</span><span class="sg" style="font-size:13.5px;font-weight:700">${formatPrice(it.price)}${isUsd(it)?' $':''}</span></div>`}
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Yetkazib berish')}</span><span class="sg" style="font-size:13.5px;font-weight:700;color:var(--green)">${t('Bepul')}</span></div>
          <div style="height:1px;background:var(--line-3)"></div>
          <div style="display:flex;align-items:baseline"><span style="flex:1;font-size:14.5px;font-weight:800">${ORD.paymentType==='installment'?t('Oyiga'):t('Jami')}</span><span class="sg" style="font-size:20px;font-weight:700">${ORD.paymentType==='installment'?formatPrice(ORD.monthly):formatPrice(finalPrice())} ${(ORD.paymentType!=='installment'&&isUsd(ORD.item))?'<span class="cur-usd">$</span>':`<span style="font-family:'Plus Jakarta Sans';font-size:12px;color:var(--muted-2);font-weight:600">${SUM()}</span>`}</span></div>
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn" data-ostep="2">${t('Davom etish')}
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"></path></svg></button>`;
    return;
  }

  /* ---- 2: mijoz ma'lumotlari + xarita ---- */
  if(ORD.step === 2){
    body.innerHTML = `
      <div style="background:var(--blue-tint);border-radius:14px;padding:12px 14px;display:flex;gap:10px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--blue-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:1px"><path d="M12 3l7 3.2v5.1c0 4.3-2.9 7.3-7 8.7-4.1-1.4-7-4.4-7-8.7V6.2z"></path><path d="M9.3 12.2l1.9 1.9 3.6-3.8"></path></svg>
        <div style="font-size:11.5px;color:var(--blue-ink);font-weight:600;line-height:1.5">${LANG==='ru'?'Данные используются только для оформления официального договора и не передаются третьим лицам.':"Ma'lumotlaringiz faqat rasmiy shartnomani to'ldirish uchun ishlatiladi va uchinchi shaxslarga berilmaydi."}</div>
      </div>

      <div class="fld" style="margin-top:14px" id="fName">
        <label for="inName">${t('Ism familiyangiz')}</label>
        <div class="inp">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.4"></circle><path d="M5 20c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2"></path></svg>
          <input id="inName" type="text" placeholder="ASADBEK RUSTAMOV" value="${esc(ORD.name)}" autocomplete="name" data-upper autocapitalize="characters" spellcheck="false">
        </div>
        <div class="err"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg><span>${t('Ismingizni kiriting')}</span></div>
      </div>

      <div class="fld" style="margin-top:12px" id="fPhone">
        <label for="inPhone">${t('Ishlab turgan telefon raqamingiz')}</label>
        <div class="inp">
          <span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span>
          <span style="width:1px;height:22px;background:var(--line-2)"></span>
          <input id="inPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67" value="${esc(formatUzNumber(ORD.phoneRaw))}" autocomplete="tel">
        </div>
        <div class="hint">${t('Tasdiqlash uchun shu raqamga SMS kod yuboriladi')}</div>
        <div class="err"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg><span id="phoneErr">${t("To'g'ri raqam kiriting")}</span></div>
      </div>

      <div class="fld" style="margin-top:12px" id="fRegion">
        <label for="inRegion">${t('Viloyat')}</label>
        <div class="inp">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"></path><circle cx="12" cy="10" r="2.3"></circle></svg>
          <select id="inRegion"><option value="">${t('Tanlang')}</option>${REGIONS.map(r => `<option value="${esc(r)}"${ORD.region===r?' selected':''}>${esc(r)}</option>`).join('')}</select>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--faint)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
        </div>
        <div class="err"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg><span>${t('Viloyatni tanlang')}</span></div>
      </div>

      <div id="mapWrap" style="margin-top:14px;display:none">
        <div class="eyebrow">${t('Yetkazib berish manzili')}</div>
        <div style="margin-top:9px;font-size:11.5px;color:var(--muted-2);font-weight:600">${LANG==='ru'?'Двигайте карту — метка в центре. Или нажмите «Моё местоположение».':"Xaritani suring — belgi markazda turadi. Yoki «Mening joylashuvim»ni bosing."}</div>
        <div id="mapBox" style="margin-top:10px"></div>
        <button type="button" class="btn ghost" id="geoBtn" style="margin-top:10px;height:48px;font-size:14px">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"></path><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.6" fill="currentColor"></circle></svg>
          ${t('Mening joylashuvim')}
        </button>
        <div id="mapAddr" style="margin-top:9px;font-size:12.5px;font-weight:650;color:var(--text-2)"></div>
      </div>

      <div class="card" style="margin-top:14px;display:flex;gap:11px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:1px"><rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h3"></path></svg>
        <div style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.55">${LANG==='ru'?'Курьер привезёт <b>официальный договор</b> и SIM-карту. Подготовьте паспорт.':"Kuryer bilan birga <b>rasmiy shartnoma</b> va SIM-karta keladi. Pasportingizni tayyorlab qo'ying."}</div>
      </div>`;
    foot.innerHTML = `<button class="btn ghost" data-ostep="1" style="flex:none;width:100px">${t('Orqaga')}</button>
      <button class="btn" data-ostep="3" style="flex:1">${t('Davom etish')}</button>`;
    setTimeout(()=>{ bindPhoneMask(); bindRegion(); if(typeof upperAll === 'function') upperAll(); }, 0);
    return;
  }

  /* ---- 3: tasdiqlash ---- */
  if(ORD.step === 3){
    body.innerHTML = `
      <div class="card">
        <div class="eyebrow">${t('Buyurtma')}</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:11px">
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Raqam')}</span><span class="sg" style="font-size:14.5px;font-weight:700">${esc(shortNumber(ORD.item.number))}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Operator')}</span><span style="font-size:13.5px;font-weight:700">${esc(ORD.item.operator||'—')}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t("To'lov")}</span><span style="font-size:13.5px;font-weight:700">${ORD.paymentType==='cash'?t("To'liq to'lov"):ORD.months+' '+t('oyga')}</span></div>
          ${ORD.paymentType==='installment'?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t("Oylik to'lov")}</span><span class="sg" style="font-size:14px;font-weight:700;color:var(--blue-text)">${formatPrice(ORD.monthly)} ${SUM()}</span></div>`:''}
          ${ORD.paymentType==='installment'&&ORD.down?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t("Bosh to'lov")}</span><span class="sg" style="font-size:14px;font-weight:700">${formatPrice(ORD.down)}</span></div>`:''}
          ${ORD.discount?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Chegirma')}</span><span class="sg" style="font-size:14px;font-weight:700;color:var(--green)">−${formatPrice(ORD.discount)}</span></div>`:''}
          <div style="height:1px;background:var(--line-3)"></div>
          <div style="display:flex;align-items:baseline"><span style="flex:1;font-size:14.5px;font-weight:800">${ORD.paymentType==='installment'?t('Oyiga'):t('Jami')}</span><span class="sg" style="font-size:19px;font-weight:700">${ORD.paymentType==='installment'?formatPrice(ORD.monthly):formatPrice(finalPrice())} ${ORD.paymentType==='installment'?SUM():UNIT(ORD.item)}</span></div>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <div style="display:flex;align-items:center"><span class="eyebrow" style="flex:1">${t('Mijoz')}</span><button data-ostep="2" style="font-size:12.5px;font-weight:700;color:var(--blue-text)">${t("O'zgartirish")}</button></div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Ism')}</span><span style="font-size:13.5px;font-weight:700">${esc(ORD.name)}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Telefon')}</span><span class="sg" style="font-size:13.5px;font-weight:700">+998 ${esc(formatUzNumber(ORD.phoneRaw))}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Viloyat')}</span><span style="font-size:13.5px;font-weight:700">${esc(ORD.region)}</span></div>
          ${ORD.location?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Manzil')}</span><span class="sg" style="font-size:12.5px;font-weight:700">${ORD.location.lat.toFixed(5)}, ${ORD.location.lng.toFixed(5)}</span></div>`:''}
        </div>
      </div>
      <div style="margin-top:14px;display:flex;align-items:flex-start;gap:10px">
        <span style="width:22px;height:22px;border-radius:7px;background:var(--blue);display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg></span>
        <span style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">${LANG==='ru'?'Оформляя заказ, вы соглашаетесь с условиями публичной оферты. Менеджер свяжется в течение 15 минут.':"Buyurtma berish orqali <b>ommaviy oferta</b> shartlariga rozilik bildirasiz. Menejerimiz 15 daqiqa ichida bog'lanadi."}</span>
      </div>`;
    foot.innerHTML = `<button class="btn ghost" data-ostep="2" style="flex:none;width:100px">${t('Orqaga')}</button>
      <button class="btn" id="ordSubmit" style="flex:1">${t('Buyurtmani yuborish')}</button>`;
    return;
  }

  /* ---- 4: SMS ---- */
  if(ORD.step === 4){
    body.innerHTML = `
      <div style="text-align:center;padding:10px 0 4px">
        <span style="width:64px;height:64px;border-radius:22px;background:var(--blue-tint);color:var(--blue-text);display:inline-flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L5 20l1.3-4.1A7.5 7.5 0 1 1 20 12z"></path></svg></span>
        <h3 style="margin-top:14px;font-size:18px">${t('Tasdiqlash kodi')}</h3>
        <p style="margin:8px auto 0;font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.55;max-width:280px">
          <b class="sg" style="color:var(--ink)">+998 ${esc(formatUzNumber(ORD.phoneRaw))}</b> ${LANG==='ru'?'— отправили 4-значный код.':'raqamiga 4 xonali kod yubordik.'}</p>
      </div>
      <div class="digits" style="margin-top:18px;max-width:240px;margin-left:auto;margin-right:auto" id="smsDigits">
        <input type="text" inputmode="numeric" maxlength="1" placeholder="1" data-s="0" aria-label="1"><input type="text" inputmode="numeric" maxlength="1" placeholder="2" data-s="1" aria-label="2">
        <input type="text" inputmode="numeric" maxlength="1" placeholder="3" data-s="2" aria-label="3"><input type="text" inputmode="numeric" maxlength="1" placeholder="4" data-s="3" aria-label="4">
      </div>
      <div id="smsMsg" style="margin-top:12px;text-align:center;font-size:12px;font-weight:700;color:var(--red);display:none"></div>
      <div style="margin-top:18px;text-align:center"><button id="smsResend" style="font-size:12.5px;font-weight:700;color:var(--blue-text)">${t('Kodni qayta yuborish')}</button></div>
      <div style="margin-top:10px;text-align:center"><button id="smsSkip" style="font-size:12px;font-weight:650;color:var(--muted)">${t('Kod kelmadi — baribir davom etish')}</button></div>`;
    foot.innerHTML = `<button class="btn" id="smsVerify" disabled>${t('Tasdiqlash')}</button>`;
    setTimeout(()=>{ bindSmsDigits(); const f = $('#smsDigits input'); if(f) f.focus(); }, 60);
    return;
  }

  /* ---- 5: tayyor ---- */
  if(ORD.step === 5){
    $('#ordStepsWrap').style.display = 'none';
    body.innerHTML = `
      <div style="text-align:center;padding:16px 0 4px">
        <span style="width:92px;height:92px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
          <span style="width:64px;height:64px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
        <h3 style="margin-top:18px;font-size:21px">${t('Buyurtma qabul qilindi')}</h3>
        <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:300px">${LANG==='ru'?'Менеджер свяжется с вами в течение 15 минут и расскажет об условиях оформления.':"Menejerimiz 15 daqiqa ichida siz bilan bog'lanadi va rasmiylashtirish shartlarini tushuntiradi."}</p>
      </div>
      <div class="card" style="margin-top:18px">
        <div style="display:flex;flex-direction:column;gap:11px">
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Raqam')}</span><span class="sg" style="font-size:15px;font-weight:700">${esc(shortNumber(ORD.item.number))}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${ORD.paymentType==='installment'?t("Oylik to'lov"):t('Summa')}</span><span class="sg" style="font-size:15px;font-weight:700">${ORD.paymentType==='installment'?formatPrice(ORD.monthly):formatPrice(finalPrice())} ${ORD.paymentType==='installment'?SUM():UNIT(ORD.item)}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Holati')}</span><span class="tag blue">${t('YANGI')}</span></div>
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn ghost" data-close style="flex:none;width:110px">${t('Yopish')}</button>
      <a class="btn" href="#/buyurtmalarim" data-close style="flex:1">${t('Buyurtmalarim')}</a>`;
    return;
  }
}

function bindPhoneMask(){
  const inp = $('#inPhone'); if(!inp) return;
  /* IPHONE: yozayotganda maydon qiymatiga TEGILMAYDI.
     Har bir harfda `inp.value` qayta yozilsa, iOS kursorni ko'chiradi
     va klaviatura ustidagi bashorat paneli bilan sinxronlash
     kechikadi — mijoz buni "qotib qoldi, harf kech chiqyapti" deb
     his qiladi va ba'zan buyurtmani tashlab ketadi.
     Endi yozish erkin; bo'shliqlar maydondan CHIQQANDA qo'yiladi.
     `ORD.phoneRaw` esa avvalgiday har harfda yangilanadi (u faqat
     raqamlarni saqlaydi, ko'rinishga ta'sir qilmaydi). */
  inp.setAttribute('inputmode', 'tel');
  inp.addEventListener('input', (e)=>{
    ORD.phoneRaw = extractRawDigits(inp.value);
    $('#fPhone').classList.remove('bad');
    /* "+998" va bo'shliqlarni maydon O'ZI qo'yadi. iPhone qotmasligi
       uchun: qiymat faqat haqiqatan o'zgarganda, faqat kursor OXIRIDA
       bo'lganda qayta yoziladi; o'chirishda esa faqat oxirida qolgan
       ajratgich olinadi (Backspace tabiiy ishlaydi). */
    const ochirish = !!(e && e.inputType && e.inputType.indexOf('delete') === 0);
    const y = ORD.phoneRaw ? formatUzNumber(ORD.phoneRaw) : '';
    if(y === inp.value) return;
    if(ochirish){
      const t2 = inp.value.replace(/[\s-]+$/, '');
      if(t2 !== inp.value){ inp.value = t2; try{ inp.setSelectionRange(t2.length, t2.length); }catch(e2){} }
      return;
    }
    if(inp.selectionStart != null && inp.selectionStart < inp.value.length) return;
    inp.value = y;
    try{ inp.setSelectionRange(y.length, y.length); }catch(e2){}
  });
  inp.addEventListener('blur', ()=>{
    const raw = extractRawDigits(inp.value);
    const f = formatUzNumber(raw);
    if(f !== inp.value) inp.value = f;
    ORD.phoneRaw = raw;
  });
}
function bindRegion(){
  const sel = $('#inRegion'); if(!sel) return;
  const upd = ()=>{
    ORD.region = sel.value;
    $('#fRegion').classList.remove('bad');
    const w = $('#mapWrap');
    if(sel.value === 'Toshkent shahri' && SETTINGS.yandexApiKey){ w.style.display = ''; initMap(); }
    else { w.style.display = 'none'; ORD.location = null; }
  };
  sel.addEventListener('change', upd);
  if(sel.value) upd();
}
function validateStep2(){
  let ok = true;
  const name = ($('#inName').value||'').trim(), region = $('#inRegion').value, raw = extractRawDigits($('#inPhone').value);
  $('#fName').classList.toggle('bad', name.length < 2); if(name.length < 2) ok = false;
  let pOk = true;
  if(raw.length !== 9){ pOk = false; $('#phoneErr').textContent = t("To'g'ri raqam kiriting"); }
  else if(VALID_UZ_CODES.indexOf(raw.slice(0,2)) === -1){ pOk = false; $('#phoneErr').textContent = t('Bunday raqam mavjud emas'); }
  $('#fPhone').classList.toggle('bad', !pOk); if(!pOk) ok = false;
  $('#fRegion').classList.toggle('bad', !region); if(!region) ok = false;
  if(ok){
    ORD.name = name; ORD.phoneRaw = raw; ORD.region = region;
    try{ localStorage.setItem('vip_name',name); localStorage.setItem('vip_phone',raw); localStorage.setItem('vip_region',region); }catch(e){}
  }
  return ok;
}

/* ---------- Yandex xarita (faqat Toshkent shahri uchun) ---------- */
let ymapsLoaded = false, ymapObj = null;
function loadYmaps(){
  if(ymapsLoaded) return Promise.resolve();
  const key = SETTINGS.yandexApiKey;
  if(!key) return Promise.reject(new Error('no key'));
  return new Promise((res, rej)=>{
    const s = document.createElement('script');
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=${LANG==='ru'?'ru_RU':'uz_UZ'}`;
    s.onload = ()=> { ymapsLoaded = true; window.ymaps.ready(res); };
    s.onerror = ()=> rej(new Error('ymaps'));
    document.head.appendChild(s);
  });
}
async function initMap(){
  const box = $('#mapBox'); if(!box || box.dataset.ready) return;
  const lat = Number(SETTINGS.officeLat) || 41.311081, lng = Number(SETTINGS.officeLng) || 69.240562;
  try{
    await loadYmaps();
    box.dataset.ready = '1';
    ymapObj = new window.ymaps.Map(box, { center:[lat,lng], zoom:13, controls:['zoomControl','geolocationControl'] });
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#2457E6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"></path><circle cx="12" cy="10" r="2.6" fill="#2457E6"></circle></svg>';
    box.appendChild(pin);
    const sync = ()=>{
      const c = ymapObj.getCenter();
      ORD.location = { lat:Number(c[0].toFixed(6)), lng:Number(c[1].toFixed(6)) };
      $('#mapAddr').textContent = `${ORD.location.lat.toFixed(5)}, ${ORD.location.lng.toFixed(5)}`;
    };
    ymapObj.events.add('boundschange', sync); sync();
  }catch(e){
    box.innerHTML = `<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--muted);font-weight:600">${LANG==='ru'?'Карта недоступна. Менеджер уточнит адрес по телефону.':"Xarita ochilmadi. Manzilni menejer telefon orqali aniqlaydi."}</div>`;
  }
}

/* ---------- "Mening joylashuvim" ---------- */
function useMyLocation(){
  const btn = $('#geoBtn'); if(!btn) return;
  if(!navigator.geolocation){
    toast(LANG==='ru'?'Устройство не поддерживает геолокацию':"Qurilma joylashuvni aniqlay olmaydi",'bad'); return;
  }
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin" style="border-color:var(--line-2);border-top-color:var(--blue)"></span> ${t('Aniqlanmoqda…')}`;
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      ORD.location = { lat:Number(lat.toFixed(6)), lng:Number(lng.toFixed(6)) };
      const a = $('#mapAddr'); if(a) a.textContent = `${ORD.location.lat.toFixed(5)}, ${ORD.location.lng.toFixed(5)}`;
      if(ymapObj){ try{ ymapObj.setCenter([lat,lng], 17, { duration:420 }); }catch(e){} }
      toast(LANG==='ru'?'Местоположение определено':'Joylashuv aniqlandi');
      btn.disabled = false; btn.innerHTML = old;
    },
    (err)=>{
      btn.disabled = false; btn.innerHTML = old;
      const msg = (err && err.code === 1)
        ? (LANG==='ru'?'Доступ к геолокации запрещён. Отметьте адрес вручную.':"Joylashuvga ruxsat berilmadi. Manzilni qo'lda belgilang.")
        : (LANG==='ru'?'Не удалось определить место. Отметьте вручную.':"Joylashuvni aniqlab bo'lmadi. Qo'lda belgilang.");
      toast(msg, 'bad');
    },
    { enableHighAccuracy:true, timeout:12000, maximumAge:60000 }
  );
}

/* ---------- SMS ---------- */
function bindSmsDigits(){
  const boxes = $$('#smsDigits input');
  boxes.forEach((b,i)=>{
    b.addEventListener('input', ()=>{
      b.value = b.value.replace(/\D/g,'').slice(0,1);
      if(b.value && boxes[i+1]) boxes[i+1].focus();
      const code = boxes.map(x=>x.value).join('');
      $('#smsVerify').disabled = code.length !== 4;
      $('#smsMsg').style.display = 'none';
      if(code.length === 4) verifySms();
    });
    b.addEventListener('keydown', e => { if(e.key==='Backspace' && !b.value && boxes[i-1]) boxes[i-1].focus(); });
  });
}
async function sendSms(){
  try{
    const res = await withClientTimeout(fetch(FN + 'send-sms-code', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ phone: '+998' + ORD.phoneRaw })
    }), 7000);
    const data = await res.json();
    return data.ok ? { ok:true } : { ok:false, error:data.error };
  }catch(e){ return { ok:false, error:'timeout' }; }
}
async function verifySms(){
  const boxes = $$('#smsDigits input'), code = boxes.map(x=>x.value).join('');
  if(code.length !== 4) return;
  const btn = $('#smsVerify'); btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  try{
    const res = await fetch(FN + 'verify-sms-code', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ phone:'+998' + ORD.phoneRaw, code })
    });
    const data = await res.json();
    if(data.ok){ await submitOrder(true); return; }
    $('#smsMsg').style.display='block'; $('#smsMsg').textContent = data.error || "Kod noto'g'ri";
    boxes.forEach(b => b.value=''); boxes[0].focus();
  }catch(err){ $('#smsMsg').style.display='block'; $('#smsMsg').textContent = xatoMatni(err); }
  finally{ const b = $('#smsVerify'); if(b){ b.disabled=false; b.textContent = t('Tasdiqlash'); } }
}


/* ================= BUYURTMA NAVBATI (V120) =================
   OXIRGI HIMOYA. Yuqoridagi ikki yo'l (server va to'g'ridan-to'g'ri
   Firestore) ham ishlamasa — ilgari buyurtma shu yerda BUTUNLAY
   yo'qolardi: mijoz xato ko'rib chiqib ketardi, bizda esa uning
   nomi ham, telefoni ham qolmasdi.
   Endi bunday buyurtma brauzer xotirasiga (localStorage) yoziladi va
   o'zi qayta yuborilib turadi: aloqa tiklanganda, sahifa qayta
   ochilganda va har 30 sekundda. `sorovId` borligi uchun ikkinchi
   nusxa YARATILMAYDI — server takrorni o'zi tanib oladi.
   Ya'ni: mijoz "Yuborish"ni bosgan bo'lsa, buyurtma YO'QOLMAYDI. */
const NAVBAT_KALIT = 'vip_buyurtma_navbat';
function navbatOqi(){ try{ return JSON.parse(localStorage.getItem(NAVBAT_KALIT) || '[]') || []; }catch(e){ return []; } }
function navbatYoz(a){ try{ localStorage.setItem(NAVBAT_KALIT, JSON.stringify(a.slice(-20))); }catch(e){} }
function navbatQosh(rec){
  const a = navbatOqi();
  if(a.some(x => x && x.sorovId === rec.sorovId)) return;
  rec.qoshildi = Date.now(); a.push(rec); navbatYoz(a);
}
let NAVBAT_ISHLAYDI = false, NAVBAT_TAYMER = null;
async function navbatYubor(){
  if(NAVBAT_ISHLAYDI) return;
  let a = navbatOqi();
  if(!a.length){ if(NAVBAT_TAYMER){ clearInterval(NAVBAT_TAYMER); NAVBAT_TAYMER = null; } return; }
  if(!navigator.onLine) return;
  NAVBAT_ISHLAYDI = true;
  try{
    for(const rec of a.slice()){
      /* 3 kundan oshgan yozuv — tashlab yuboriladi (abadiy qolmasin) */
      if(rec && rec.qoshildi && Date.now() - rec.qoshildi > 3*24*3600*1000){
        a = a.filter(x => x !== rec); navbatYoz(a); continue;
      }
      let tugadi = false, ok = false;
      try{
        const res = await fetch(FN + 'api-buyurtma', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ payload: rec.payload, numberId: rec.numberId || '', live: !!rec.live, sorovId: rec.sorovId })
        });
        let data = null; try{ data = await res.json(); }catch(e){}
        if(res.ok && data && data.ok){ tugadi = true; ok = true; rec.orderId = data.orderId; }
        /* 400 (ma'lumot noto'g'ri) va 409 (raqam band) — qayta yuborishdan
           foyda yo'q, navbatdan olib tashlanadi. */
        else if(res.status === 400 || res.status === 409) tugadi = true;
      }catch(e){}
      if(tugadi){
        a = a.filter(x => x !== rec); navbatYoz(a);
        if(ok){
          if(rec.xabar){
            try{
              fetch(FN + 'telegram-notify', {
                method:'POST', headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
                body: JSON.stringify({ text: rec.xabar, orderId: rec.orderId, mapUrl: rec.xaritaUrl })
              }).catch(()=>{});
            }catch(e){}
          }
          try{ toast(LANG==='ru' ? 'Ваш заказ отправлен \u2713' : "Buyurtmangiz yuborildi \u2713", 'good'); }catch(e){}
        }
      }
    }
  } finally { NAVBAT_ISHLAYDI = false; }
  if(navbatOqi().length && !NAVBAT_TAYMER){
    NAVBAT_TAYMER = setInterval(()=>{ navbatYubor(); }, 30000);
  }
}
function navbatIshgaTushir(){
  try{
    window.addEventListener('online', ()=> navbatYubor());
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) navbatYubor(); });
  }catch(e){}
  setTimeout(()=> navbatYubor(), 2500);
}

/* Telegram xabari matni — bir joyda (navbat ham shu matndan foydalanadi) */
function buyurtmaXabari(payload, orderTime){
  let paymentLine;
  if(payload.paymentType === 'installment'){
    paymentLine = `\u{1F4B3} To'lov turi: Bo'lib to'lash \u2014 ${payload.installmentMonths} oyga, oyiga ${formatPriceUzs(payload.monthlyPayment)}dan`;
    if(payload.installmentDownPayment !== undefined) paymentLine += "\n\u{1F4B0} Bosh to'lov: " + formatPriceUzs(payload.installmentDownPayment);
  }else{
    paymentLine = "\u{1F4B5} To'lov turi: Naqt to'lov";
    if(payload.currency === 'USD') paymentLine += "\n\u{1F4B2} Summa: " + formatPrice(payload.price) + " $";
  }
  const text = `\u{1F514} Yangi buyurtma\n\n\u{1F4F1} Buyurtma raqami: ${payload.number}\n\u{1F464} Mijoz ismi: ${payload.name}\n\u260E\uFE0F Ishlab turgan raqami: ${payload.phone}\n\u{1F4CD} Manzil: ${payload.region}\n${paymentLine}\n\u{1F550} Vaqti: ${orderTime}\n\u{1F310} Qayerdan: ${payload.source}`;
  const mapUrl = payload.location ? `https://yandex.uz/maps/?pt=${payload.location.lng},${payload.location.lat}&z=17&l=map` : undefined;
  return { text, mapUrl };
}

/* ---------- Buyurtmani yozish ---------- */
function buildPayload(){
  const it = ORD.item;
  const p = {
    number: displayNumber(it.number),
    price: finalPrice(),
    name: ORD.name,
    region: ORD.region,
    phone: '+998 ' + formatUzNumber(ORD.phoneRaw),
    phoneNormalized: ORD.phoneRaw.slice(-9),
    source: 'Sayt',
    paymentType: ORD.paymentType,
    operator: it.operator || '',
    catalogType: it.live ? 'Standart' : 'VIP'
  };
  /* Dollarlik raqam — adminka va Telegram xabari summani $ bilan ko'rsatishi uchun */
  if(isUsd(it)) p.currency = 'USD';
  /* RAQAM DILERNIKI bo'lsa — buyurtma uning kabinetiga ham tushsin.
     Serverda diler ro'yxatni ko'rganda har bir buyurtmaning raqami
     HAQIQATAN o'ziniki ekani qayta tekshiriladi (seller-api.js,
     `buyurtmalar`) — ya'ni bu maydonni o'zgartirib boshqa dilerning
     buyurtmasini ko'rib bo'lmaydi. */
  if(it.sellerId) p.sellerId = String(it.sellerId).slice(0, 60);
  if(ORD.paymentType === 'installment'){
    p.installmentMonths = ORD.months;
    p.monthlyPayment = ORD.monthly;
    if(installmentFinancingFor(it)){
      p.installmentDownPayment = ORD.down;
    }
  }
  if(ORD.location && typeof ORD.location.lat === 'number' && typeof ORD.location.lng === 'number'){
    p.location = { lat:Number(ORD.location.lat.toFixed(6)), lng:Number(ORD.location.lng.toFixed(6)) };
  }
  return p;
}

async function submitOrder(smsVerified){
  const it = ORD.item, payload = buildPayload();
  payload.smsVerified = !!smsVerified;
  const orderTime = sanaVaqtUz(new Date());
  let orderId = null, blocked = null;

  /* SO'ROV BELGISI (V120). Bitta buyurtma urinishi uchun BITTA belgi.
     Javob yo'lda yo'qolsa va qayta yuborilsa, server shu belgi bo'yicha
     eski buyurtmani topadi va IKKINCHISINI YARATMAYDI. */
  if(!ORD.sorovId){
    try{
      ORD.sorovId = (crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g,'').slice(0,32)
                                                  : (Date.now().toString(36) + Math.random().toString(36).slice(2,10));
    }catch(e){ ORD.sorovId = Date.now().toString(36) + Math.random().toString(36).slice(2,10); }
  }

  /* ASOSIY YO'L (V120) — BUYURTMA SERVER ORQALI YOZILADI.
     ------------------------------------------------------------------
     Ilgari brauzer o'zi Firestore'ga yozardi va bu uchta narsaga bir
     vaqtda bog'liq edi: qoidalar joylangani, App Check tokeni olingani,
     firestore.googleapis.com mijoz tarmog'idan ochilgani. Bittasi
     ishlamasa — buyurtma YO'QOLARDI (adminda "N ta mijoz yubormoqchi
     bo'ldi, uddalay olmadi" degan ogohlantirish aynan shundan edi).
     Endi so'rov saytning O'Z manziliga ketadi, server esa Admin SDK
     bilan yozadi — qoidalar ham, App Check ham yo'lni to'smaydi.
     Server javob bermasa — pastdagi ESKI yo'l zaxira sifatida qoladi,
     ya'ni ikkita mustaqil yo'ldan biri ishlasa buyurtma o'tadi. */
  payload.sorovId = ORD.sorovId;

  const serverYoz = async ()=>{
    const res = await withClientTimeout(fetch(FN + 'api-buyurtma', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        payload, numberId: (!it.live && it.id) ? it.id : '',
        live: !!it.live, sorovId: ORD.sorovId
      })
    }), kutishVaqti(12000));
    let data = null;
    try{ data = await res.json(); }catch(e){}
    if(res.status === 409 || (data && data.band)) throw new Error('ALREADY_RESERVED');
    if(res.ok && data && data.ok && data.orderId){
      if(data.bandQilinmadi){ try{ window.__BAND_XATO = 'server: band qilinmadi'; }catch(e){} }
      return data.orderId;
    }
    const e = new Error('SERVER_YOZMADI: ' + res.status + ' ' + ((data && data.error) || ''));
    e.serverdan = true;
    throw e;
  };

  const zaxiraYoz = async ()=>{
    if(!it.live && it.id){
      const numberRef = db.collection('numbers').doc(it.id), newRef = db.collection('orders').doc();
      try{
        await db.runTransaction(async (tx)=>{
          const snap = await tx.get(numberRef);
          if(snap.exists && snap.data().reserved === true) throw new Error('ALREADY_RESERVED');
          tx.set(newRef, { ...payload, numberId: it.id, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
          tx.update(numberRef, { reserved:true, reservedAt: FV.serverTimestamp() });
        });
        return newRef.id;
      }catch(err){
        if(err && err.message === 'ALREADY_RESERVED') throw err;
        /* ZAXIRA YO'L (V79). Tranzaksiya ikki ish qiladi: buyurtmani
           yozadi VA raqamni "band" qiladi. Agar aynan BAND QILISH qadami
           rad etilsa (masalan raqamda `reserved` maydoni umuman yo'q
           bo'lsa — eski raqamlarda shunday edi), ilgari BUTUN buyurtma
           yo'qolardi va mijoz "internetni tekshiring" degan xato ko'rardi.
           Endi bunday holatda buyurtmaning O'ZI baribir yoziladi — savdo
           yo'qolmaydi, admin raqamni panelda o'zi band qiladi. */
        const r = await db.collection('orders').add({
          ...payload, numberId: it.id, status:'Yangi',
          createdAt: orderTime, createdAtSort: Date.now()
        });
        try{ window.__BAND_XATO = String((err && (err.code || err.message)) || err); }catch(e){}
        return r.id;
      }
    }
    const liveKey = (payload.number||'').replace(/\D/g,''), newRef = db.collection('orders').doc();
    if(liveKey){
      const lockRef = db.collection('live_reservations').doc(liveKey);
      try{
        await db.runTransaction(async (tx)=>{
          const lock = await tx.get(lockRef);
          if(lock.exists) throw new Error('ALREADY_RESERVED');
          tx.set(newRef, { ...payload, numberId:null, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
          tx.set(lockRef, { reservedAt: FV.serverTimestamp() });
        });
        return newRef.id;
      }catch(err){
        if(err && err.message === 'ALREADY_RESERVED') throw err;
        const ref = await db.collection('orders').add({ ...payload, numberId:null, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
        return ref.id;
      }
    }
    const ref = await db.collection('orders').add({ ...payload, numberId:null, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
    return ref.id;
  };

  const writeOrder = async ()=>{
    try{
      try{
        return await serverYoz();
      }catch(e1){
        if(e1 && e1.message === 'ALREADY_RESERVED') throw e1;
        /* Server yo'li `sorovId` sababli TAKRORLANMAYDI — shuning uchun
           bir marta qayta urinish mutlaqo xavfsiz. Aynan shu "javob
           yo'lda yo'qoldi" holatini hal qiladi: agar birinchi so'rov
           allaqachon yozilgan bo'lsa, server o'sha buyurtmaning ID'sini
           qaytaradi, ikkinchisini YARATMAYDI. */
        await new Promise(r => setTimeout(r, 700));
        return await serverYoz();
      }
    }catch(err){
      if(err && err.message === 'ALREADY_RESERVED') throw err;
      /* Server yo'li ishlamadi — sababni yo'qotmaymiz, lekin mijozga
         ko'rsatmaymiz. Darhol zaxira yo'lga o'tamiz. */
      try{ console.warn('Server yo\'li ishlamadi, zaxira yo\'lga o\'tildi:', err && err.message); }catch(e){}
      try{ window.__SERVER_YOL_XATO = String((err && err.message) || err); }catch(e){}
      return await zaxiraYoz();
    }
  };

  const btn = $('#ordSubmit') || $('#smsVerify');
  if(btn){ btn.disabled = true; btn.textContent = t('Yuborilmoqda…'); }

  let xatoObj = null;
  try{ trackYuborishUrinishi(it); }catch(e){}
  try{ orderId = await withRetryClient(writeOrder, 2, 900); }
  catch(err){
    xatoObj = err;
    blocked = (err && err.message === 'ALREADY_RESERVED') ? 'ALREADY_RESERVED' : 'ERROR';
    /* Sababini yashirmaymiz: konsolda ham, o'zgaruvchida ham qoladi —
       shunda muammoni aniqlash uchun taxmin qilish shart emas. */
    try{ console.error('Buyurtma yozilmadi:', err && err.code, err && err.message, err); }catch(e){}
    try{ window.__SONGGI_XATO = { kod: (err && err.code) || '', matn: (err && err.message) || String(err), vaqt: new Date().toISOString() }; }catch(e){}
  }

  if(blocked){
    /* Yuborish ishlamadi — bu RAQAM YO'QOTILISHI. Alohida sanaladi,
       shunda admin "necha mijoz yubormoqchi bo'lib, uddalay olmadi"
       degan raqamni ko'radi (ilgari bu umuman bilinmasdi). */
    try{ trackYuborishXatosi(it); }catch(e){}
    if(btn){ btn.disabled=false; btn.textContent = ORD.step===4 ? t('Tasdiqlash') : t('Buyurtmani yuborish'); }
    if(blocked === 'ALREADY_RESERVED'){
      toast(xatoMatni(new Error('ALREADY_RESERVED')), 'bad');
      if(!it.live){ const n = NUMBERS.find(x => x.id === it.id); if(n){ n.reserved = true; renderAll(); } }
      closeSheet('shOrder');
    }else{
      /* XABAR MATNI (V79 -> V81).
         V79'da haqiqiy sabab mijozga ham ko'rsatilardi
         ("permission-denied", "App Check" kabi). Mijoz so'roviga ko'ra
         bunday TEXNIK so'zlar endi mijozga UMUMAN ko'rsatilmaydi —
         ekranda oddiy, tushunarli gap turadi.
         Texnik sabab yo'qolib ketmaydi: brauzer konsoliga yoziladi va
         `window.__SONGGI_XATO` da saqlanadi (admin/dasturchi ko'rishi
         uchun), ya'ni muammoni aniqlash imkoni saqlanib qoladi. */
      const kod = String((xatoObj && xatoObj.code) || '');
      const matn = String((xatoObj && xatoObj.message) || '');
      try{
        window.__SONGGI_XATO = kod + ' | ' + matn;
        console.error('Buyurtma yuborilmadi (texnik sabab):', kod, matn);
      }catch(e){}

      /* ENG MUHIMI (V120): BUYURTMANI YO'QOTMAYMIZ.
         Ikki yo'l ham ishlamadi — demak buyurtma navbatga yoziladi va
         o'zi qayta yuborilib turadi (aloqa tiklanganda, sahifa qayta
         ochilganda, har 30 sekundda). Mijoz hech narsa qilishi shart
         emas. `sorovId` sababli ikkinchi nusxa yaratilmaydi. */
      let navbatga = false;
      try{
        const xb = buyurtmaXabari(payload, orderTime);
        navbatQosh({
          payload, numberId: (!it.live && it.id) ? it.id : '', live: !!it.live,
          sorovId: ORD.sorovId, xabar: xb.text, xaritaUrl: xb.mapUrl
        });
        navbatga = true;
        navbatYubor();
      }catch(e){}

      let xabar;
      if(navbatga){
        xabar = LANG==='ru'
          ? 'Заказ сохранён и будет отправлен автоматически, как только появится связь.'
          : "Buyurtmangiz saqlandi \u2014 aloqa tiklanishi bilan o'zi yuboriladi.";
        toast(xabar, 'good');
        return;
      }
      if(kod === 'unavailable' || kod === 'deadline-exceeded'
         || /network|offline|Failed to fetch/i.test(matn)){
        xabar = LANG==='ru' ? 'Заказ не отправлен. Проверьте интернет.'
                            : 'Buyurtma yuborilmadi. Internetni tekshirib, qayta urining.';
      }else{
        /* Qolgan HAMMA holat (ruxsat, tekshiruv, kutilmagan xato) uchun
           bitta xotirjam xabar — mijozga kod/sabab ko'rsatilmaydi. */
        xabar = LANG==='ru'
          ? 'Заказ пока не удалось оформить. Попробуйте ещё раз немного позже или свяжитесь с нами.'
          : "Buyurtmani hozir qabul qilib bo'lmadi. Birozdan keyin qayta urinib ko'ring yoki biz bilan bog'laning.";
      }
      toast(xabar, 'bad');
    }
    return;
  }

  ORD.orderId = orderId;
  /* HAQIQIY buyurtma — faqat yozuv muvaffaqiyatli bo'lgandan keyin */
  try{ trackNumOrder(it); }catch(e){}
  if(!it.live){ const n = NUMBERS.find(x => x.id === it.id); if(n) n.reserved = true; }
  try{ localStorage.setItem('raqamuz_cache', JSON.stringify(NUMBERS)); }catch(e){}
  renderAll();

  /* Telegram — matn formati AYNAN eski kabi */
  try{
    const { text, mapUrl } = buyurtmaXabari(payload, orderTime);
    fetch(FN + 'telegram-notify', {
      method:'POST', headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ text, orderId, mapUrl })
    }).catch(()=>{});
  }catch(e){}

  ORD.step = 5; renderOrder();
  try{ if(navigator.vibrate) navigator.vibrate([12,50,12]); }catch(e){}
}


/* ===== 4-qism (avvalgi index.html, 7590-satr) ===== */

'use strict';

/* ==================================================================
   BUYURTMANI TEKSHIRISH (check-my-orders)
   ================================================================== */
const ORDER_STATUS = {
  'Yangi':          { tag:'blue',  label:'QABUL QILINDI' },
  "Bog'lanildi":    { tag:'vip',   label:'TASDIQLANDI' },
  "Yo'lda":         { tag:'vip',   label:"KURYER YO'LDA" },
  'Yakunlandi':     { tag:'green', label:'YETKAZILDI' },
  'Bekor qilindi':  { tag:'red',   label:'BEKOR QILINDI' }
};

/* ==================================================================
   BUYURTMA BOSQICHLARI (V122)
   ------------------------------------------------------------------
   Mijoz buyurtma bergach "endi nima bo'ladi?" degan savolga javob
   topa olmasdi — faqat quruq status so'zi turardi. Endi to'rt
   bosqichli zanjir ko'rinadi va mijoz qaysi bosqichda ekanini bir
   qarashda tushunadi.
   Bosqich nomlari ATAYLAB mijoz tilida: bazada "Bog'lanildi" deb
   turadi, mijoz esa "Tasdiqlandi" deb ko'radi.
   ================================================================== */
const BOSQICHLAR = [
  { kalit:'Yangi',        nom:'Qabul qilindi', izoh:'Buyurtmangiz tizimga tushdi' },
  { kalit:"Bog'lanildi",  nom:'Tasdiqlandi',   izoh:"Operator siz bilan bog'landi" },
  { kalit:"Yo'lda",       nom:"Kuryer yo'lda", izoh:'Raqamingiz yo\'lga chiqdi' },
  { kalit:'Yakunlandi',   nom:'Yetkazildi',    izoh:'Raqam sizga topshirildi' }
];
const BOSQICH_RU = {
  'Qabul qilindi':'Принят', 'Tasdiqlandi':'Подтверждён',
  "Kuryer yo'lda":'Курьер в пути', 'Yetkazildi':'Доставлен',
  'Buyurtmangiz tizimga tushdi':'Заказ поступил в систему',
  "Operator siz bilan bog'landi":'Оператор связался с вами',
  "Raqamingiz yo'lga chiqdi":'Номер в пути',
  'Raqam sizga topshirildi':'Номер передан вам'
};
const bq = (x) => (LANG === 'ru' ? (BOSQICH_RU[x] || x) : x);

function bosqichlarHtml(status){
  /* Bekor qilingan buyurtmada zanjir ko'rsatilmaydi — u zanjirdan
     tashqaridagi holat. */
  if(status === 'Bekor qilindi') return '';
  let joriy = BOSQICHLAR.findIndex(b => b.kalit === status);
  if(joriy < 0) joriy = 0;
  return '<div class="bsq">' + BOSQICHLAR.map((b, i) => {
    const holat = i < joriy ? 'ok' : (i === joriy ? 'on' : '');
    return '<div class="bsq-q ' + holat + '">'
      + '<span class="bsq-nuqta">' + (i < joriy
          ? '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
          : '') + '</span>'
      + '<div class="bsq-matn"><b>' + esc(bq(b.nom)) + '</b><i>' + esc(bq(b.izoh)) + '</i></div>'
      + '</div>';
  }).join('') + '</div>';
}

/* ==================================================================
   PROFIL KARTOCHKASI (V126)
   ------------------------------------------------------------------
   Serverdan kelgan `profile` obyektidan kabinetning yuqori qismini
   yasaydi. Hech qanday qo'shimcha so'rov qilinmaydi — hammasi
   allaqachon kelgan javobdan.
   ================================================================== */
/* V132: "Profil" bo'limi avvalgi holatiga qaytarildi — u yerda
   kabinet kartochkasi ham, kirish ham yo'q, faqat menyu (mijoz
   so'rovi). Shu sabab profil keshi va qo'shimcha so'rov olib
   tashlandi: bo'lim ochilganda endi HECH QANDAY tarmoq so'rovi
   ketmaydi. Kartochka faqat kabinetda ("Buyurtmalarim") ko'rinadi. */

function prfHarflar(ism, tel){
  const sozlar = String(ism||'').trim().split(/\s+/).filter(Boolean);
  if(sozlar.length >= 2) return (sozlar[0][0] + sozlar[1][0]).toUpperCase();
  if(sozlar.length === 1 && sozlar[0].length) return sozlar[0].slice(0,2).toUpperCase();
  /* Ism yo'q bo'lsa — telefonning oxirgi 2 raqami, bo'sh doira emas */
  return String(tel||'').replace(/\D/g,'').slice(-2) || '—';
}

function prfSana(ms, matn){
  if(!matn) return '';
  return matn;
}

function profilHtml(pr, tel, shartnomalar){
  if(!pr) pr = {};
  const ru = LANG === 'ru';
  const ism = String(pr.ism||'').trim();
  const nishonMatn = { vip: ru?'VIP':'VIP',
                       doimiy: ru?'Постоянный':'DOIMIY',
                       yangi: ru?'Клиент':'MIJOZ' }[pr.daraja] || (ru?'Клиент':'MIJOZ');
  const nishonSinf = ['vip','doimiy','yangi'].indexOf(pr.daraja) >= 0 ? pr.daraja : 'yangi';
  const nishonIc = nishonSinf === 'vip'
    ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="m12 2.6 2.6 6.1 6.6.55-5 4.33 1.5 6.45L12 16.6l-5.7 3.43 1.5-6.45-5-4.33 6.6-.55z"/></svg>'
    : (nishonSinf === 'doimiy'
      ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'
      : '');

  /* ---- KREDIT HOLATI: SPIDOMETR (V131) ----
     Mashinaning tezlik o'lchagichi kabi: 180 gradusli yarim aylana,
     chapda yashil, o'rtada sariq, o'ngda qizil, va strelka qayerda
     turganini ko'rsatadi. O'ngga siljigani sari yomon — to'lov ko'p
     qoldirilgan.

     Strelka burchagi KECHIKKAN OYLAR soniga qarab:
        0 oy  -> chap chekka (yashil)
        1 oy  -> o'rta (sariq)
        2 oy  -> qizilning boshi
        3+ oy -> o'ng chekka (qizil)
     Bosilsa to'lovlar jadvali ochiladi (u yerda rasmiy tushuntirish
     ham bor). */
  const spidHolat = ['yashil','sariq','qizil'].indexOf(pr.kreditHolat) >= 0 ? pr.kreditHolat : '';
  let spid = '';
  if(spidHolat){
    const kech = Math.max(0, Number(pr.kechikkanOy) || 0);
    /* 0 -> 0.08 (chap chekkaga yaqin, lekin tirkalmagan), 3+ -> 0.92 */
    const n = kech === 0 ? 0.08 : (kech === 1 ? 0.5 : (kech === 2 ? 0.72 : 0.92));
    const burchak = -90 + 180 * n;                 // -90° .. +90°
    const rad = burchak * Math.PI / 180;
    const Cx = 32, Cy = 28, R = 23;                // markaz va radius
    const ux = Cx + Math.sin(rad) * (R - 4.5);
    const uy = Cy - Math.cos(rad) * (R - 4.5);
    /* Yoy bo'laklari: har biri 60 gradus (3 x 60 = 180) */
    const yoy = (a1, a2) => {
      const p1 = [Cx + Math.sin(a1*Math.PI/180)*R, Cy - Math.cos(a1*Math.PI/180)*R];
      const p2 = [Cx + Math.sin(a2*Math.PI/180)*R, Cy - Math.cos(a2*Math.PI/180)*R];
      return `M ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} A ${R} ${R} 0 0 1 ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    };
    const izohTooltip = ru
      ? 'Состояние платежей: зелёный — без просрочки, жёлтый — 1 мес., красный — 2 и более мес.'
      : "To'lov holati: yashil — kechikish yo'q, sariq — 1 oy, qizil — 2 va undan ko'p oy kechikkan";
    spid = `<span class="prf-spid ${spidHolat}" data-prfjadval role="button" tabindex="0" title="${izohTooltip}">
      <svg viewBox="0 0 64 34" width="64" height="34" aria-hidden="true">
        <path d="${yoy(-90,-30)}" fill="none" stroke="#4FBF8E" stroke-width="5.5" stroke-linecap="round" opacity="${spidHolat==='yashil'?1:.28}"/>
        <path d="${yoy(-28,28)}"  fill="none" stroke="#F5B942" stroke-width="5.5" stroke-linecap="round" opacity="${spidHolat==='sariq'?1:.28}"/>
        <path d="${yoy(30,90)}"   fill="none" stroke="#F2644E" stroke-width="5.5" stroke-linecap="round" opacity="${spidHolat==='qizil'?1:.28}"/>
        <line x1="${Cx}" y1="${Cy}" x2="${ux.toFixed(2)}" y2="${uy.toFixed(2)}"
              stroke="#fff" stroke-width="2.3" stroke-linecap="round"/>
        <circle cx="${Cx}" cy="${Cy}" r="3.1" fill="#fff"/>
      </svg>
      <span class="prf-spid-y">${ru?'платежи':"to'lov"}</span>
    </span>`;
  }

  /* ---- TO'LOV TASMASI (V128) ----
     Pastdagi "to'lovlar jadvali" endi shu kartochkaning ichida.
     Har bir oy — bitta ustun; to'langani yorqin, kechikkani qizil,
     kutilayotgani xira. Kartochka bosilsa to'liq jadval ochiladi.
     Shartnoma bo'lmasa tasma umuman chiqmaydi (bo'sh joy ko'rinmaydi,
     o'rniga ism qatori pastga suriladi). */
  const shList = Array.isArray(shartnomalar) ? shartnomalar : [];
  const barchaOylar = [];
  for(const c of shList){
    for(const o of (c.oylar || [])) barchaOylar.push(o);
  }
  barchaOylar.sort((a,b)=> (a.sanaMs||0) - (b.sanaMs||0));

  let tasma = '';
  if(barchaOylar.length){
    const tolangan = barchaOylar.filter(o => o.holat === 'tolandi').length;
    const jamiOy = barchaOylar.length;
    const qolgan = shList.reduce((a,c)=> a + (Number(c.qolganSumma)||0), 0);
    const valyuta = shList[0] && shList[0].currency === 'USD' ? ' $' : ' ' + SUM();
    /* Ustun soni ko'p bo'lsa (masalan 60 oy) har biri 1px'gacha
       ingichkalashadi — shunda ham o'qiladi, chunki rang bloklari
       yonma-yon turadi. */
    const ustunlar = barchaOylar.map(o =>
      `<s class="${o.holat === 'tolandi' ? 'ok' : (o.holat === 'kechikdi' ? 'kech' : '')}"></s>`).join('');
    tasma = `<div class="prf-jad" data-prfjadval role="button" tabindex="0"
        aria-label="${ru?'График платежей':"To'lovlar jadvali"}">
      <div class="prf-tasma" aria-hidden="true">${ustunlar}</div>
      <div class="prf-jad-t">
        <span><b>${tolangan}/${jamiOy}</b> ${ru?'мес. оплачено':"oy to'landi"}</span>
        <em>${qolgan > 0
            ? `${ru?'остаток':'qoldi'} <b>${formatPrice(qolgan)}${esc(valyuta)}</b>`
            : `<b>${ru?'погашен':"to'liq to'landi"}</b>`}
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </em>
      </div>
    </div>`;
  }

  /* Daraja ostidagi mayda qator. Ustuvorlik: kechikish > keyingi
     to'lov > nechta raqam olingani. Kartochkada joy oz, shuning uchun
     FAQAT BITTASI ko'rinadi — eng muhimi. */
  let izoh = '', izohOgoh = false;
  if(pr.kechikkanOy){
    izoh = pr.kechikkanOy + ' ' + (ru?'мес. просрочка':'oy kechikdi');
    izohOgoh = true;
  }else if(pr.keyingiSana){
    izoh = (ru?'платёж ':"to'lov ") + pr.keyingiSana;
  }else if(pr.yakunlangan){
    izoh = pr.yakunlangan + ' ' + (ru?'номер':'ta raqam');
  }else if(pr.jamiBuyurtma){
    izoh = pr.jamiBuyurtma + ' ' + (ru?'заказ':'ta buyurtma');
  }

  /* Pastki chap burchak: ism, uning ostida mijozlik sanasi (bank
     kartochkasidagi "valid thru" o'rnida). Ism bo'lmasa — telefon
     tepaga chiqadi, pastda esa shunchaki "mijoz". */
  const pastIzoh = pr.mijozlikSana
    ? (ru?'клиент с ':'mijoz ') + pr.mijozlikSana
    : (ru?'клиент':'mijoz');

  return `<div class="prf ${nishonSinf}">
    <div class="prf-top">
      <div class="prf-brend">
        <b>VIP RAQAMLAR</b>
      </div>
      ${spid}
      <button type="button" class="prf-chiq" data-kabchiq aria-label="${ru?'Выйти':'Chiqish'}" title="${ru?'Выйти':'Chiqish'}">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 17l5-5-5-5"></path><path d="M20 12H9"></path><path d="M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"></path></svg>
      </button>
    </div>

    <div class="prf-raqam">+998 ${esc(formatUzNumber(tel))}</div>
    ${tasma}
    ${spidHolat ? `<div class="prf-izohlash">${ru
        ? 'Шкала платежей: зелёный — без просрочки, красный — есть просроченные месяцы.'
        : "To'lov shkalasi: yashil — kechikish yo'q, qizil — to'lov ko'p qoldirilgan."}</div>` : ''}

    <div class="prf-past">
      <div class="prf-ism">
        <b>${ism ? esc(ism) : (ru?'Клиент':'Mijoz')}</b>
        <i>${esc(pastIzoh)}</i>
      </div>
      <div class="prf-ong">
        <span class="prf-nishon ${nishonSinf}">${nishonIc}${nishonMatn}</span>
        ${izoh ? `<span class="prf-izoh${izohOgoh?' ogoh':''}">${esc(izoh)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

async function lookupOrders(kirishToken){
  const box = $('#oqResult');
  /* V131: kabinet FAQAT token bilan ochiladi (Telegram kodi orqali
     olingan). Telefon va "raqamning oxirgi 4 ta raqami" endi
     so'ralmaydi — bitta, ishonchli yo'l. */
  const tok = kirishToken || kabTokenOl();
  if(!tok){ return; }
  const phone = (kabEslaganni() || {}).tel || extractRawDigits(($('#oqPhone')||{}).value || '');
  const btn = $('#oqKirBtn'); btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  /* V126: avval profil skeleti, keyin buyurtma skeletlari — kelgan
     ma'lumot shu joylarning o'rniga tushadi, sahifa sakramaydi. */
  box.innerHTML = skPrf() + skeletons(2);
  try{
    /* V122: MIJOZ KABINETI. Ilgari bu yerda faqat buyurtmalar
       olinardi (`check-my-orders`), shartnoma esa BOSHQA bo'limda,
       shartnoma ID'si bilan qidirilardi — mijoz uni eslab qolmasdi.
       Endi bitta so'rov: buyurtmalar HAM, shartnomalar HAM keladi. */
    const res = await withClientTimeout(fetch(FN + 'api-kabinet', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ token: tok })
    }), kutishVaqti(14000));
    const data = await res.json();
    const buyurtmalar = (data && data.orders) || [];
    const shartnomalar = (data && data.contracts) || [];

    if(!data.ok || (!buyurtmalar.length && !shartnomalar.length)){
      /* Eslab qolingan ma'lumot endi ishlamayapti (masalan mijoz
         boshqa raqam kiritgan) — uni tozalaymiz va formani qaytaramiz,
         aks holda bo'lim har ochilganda shu xato chiqaverardi. */
      try{ localStorage.removeItem(KAB_KALIT); }catch(e){}
      const f2 = $('#oqForma'); if(f2) f2.style.display = '';
      const t2 = $('#oqTushuntirish'); if(t2) t2.style.display = '';
      if(data && data.qaytaKirish){
        box.innerHTML = emptyBox(IC_WARN, t('Qaytadan kiring'),
          LANG==='ru' ? 'Срок входа истёк. Запросите новый код.' : "Kirish muddati tugadi. Yangi kod so'rang.", null);
        return;
      }
      box.innerHTML = emptyBox(IC_BOX, t('Buyurtma topilmadi'), data.error || (LANG==='ru'?'По этим номерам заказов нет. Проверьте телефон и последние 4 цифры.':"Bu raqamlar bo'yicha buyurtma yo'q. Telefon va oxirgi 4 ta raqamni tekshiring."), null);
      return;
    }

    KAB_TEL = phone;
    KAB_SHARTNOMALAR = shartnomalar;
    /* V124: bir marta kirgandan keyin eslab qolamiz — keyingi safar
       kabinet o'zi ochiladi. */
    kabEslab(phone.slice(-9), tok);
    const forma = $('#oqForma'); if(forma) forma.style.display = 'none';
    /* Kirgan mijozga "telefon raqamingizni kiriting" degan tushuntirish
       kerak emas — u faqat chalkashtiradi. */
    const tush = $('#oqTushuntirish'); if(tush) tush.style.display = 'none';

    /* V126: kabinet endi PROFILDAN boshlanadi — kim kirgan, qancha
       vaqtdan beri mijoz, nechta buyurtma va qachon to'lov. */
    let html = profilHtml(data.profile, phone, shartnomalar);

    /* ---------- BUYURTMALAR (bosqichlar bilan) ---------- */
    if(buyurtmalar.length){
      const COL = { 'Yangi':'var(--blue)', "Bog'lanildi":'var(--gold)', "Yo'lda":'#7C5CFF', 'Yakunlandi':'var(--green)', 'Bekor qilindi':'var(--red)' };
      html += `<div class="eyebrow" style="padding:0 4px;margin-bottom:10px">${buyurtmalar.length} ${t('ta buyurtma')}</div>`;
      html += buyurtmalar.map(o => {
        const st = ORDER_STATUS[o.status] || { tag:'grey', label: String(o.status||'—').toUpperCase() };
        const bar = COL[o.status] || 'var(--line-2)';
        return `<div class="rescard">
          <span class="rb" style="background:${bar}"></span>
          <div class="rh">
            <span class="id sg">${esc(o.createdAt||'')}</span>
            <span class="tag ${st.tag}" style="margin-left:auto">${esc(st.label)}</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:12px">
            <div style="flex:1;min-width:0">
              <div class="big sg">${esc(shortNumber(o.number))}</div>
              <div class="sub">${o.paymentType === 'installment'
                  ? `${t("Bo'lib to'lash")}${o.installmentMonths?' · '+esc(o.installmentMonths)+' '+t('oy'):''}${o.monthlyPayment?' · '+formatPrice(o.monthlyPayment)+' '+SUM()+'/'+t('oy'):''}`
                  : t("To'liq to'lov")}</div>
            </div>
            <div class="amt sg">${formatPrice(o.price)}${o.currency==='USD'?' $':''}</div>
          </div>
          ${bosqichlarHtml(o.status)}
        </div>`;
      }).join('');
    }

    /* ---------- SHARTNOMALAR (to'lov jadvali bilan) ---------- */
    if(shartnomalar.length){
      html += `<div class="eyebrow" style="padding:0 4px;margin:18px 0 10px">${shartnomalar.length} ${LANG==='ru'?'договор':'ta shartnoma'}</div>`;
      html += shartnomalar.map(c => kabShartnomaHtml(c)).join('');
    }

    box.innerHTML = html;
  }catch(err){
    box.innerHTML = emptyBox(IC_WARN, t("Tekshirib bo'lmadi"), xatoMatni(err), t('Qayta urinish'), 'id="oqRetry"', true);
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = t('Kabinetga kirish'); }
  }
}

/* ==================================================================
   KABINETGA KIRISH — BITTA YO'L: TELEGRAM BOTI (V131)
   ------------------------------------------------------------------
   1. Mijoz telefon raqamini yozadi va «Kodni olish» ni bosadi.
   2. Sayt serverdan botga MAXSUS HAVOLA oladi va uni ochadi.
      Telegram havolani ochishi bilan «Start» ni O'ZI bosadi —
      mijoz hech narsa yozmaydi.
   3. Bot raqam egasini tekshiradi va 4 xonali kodni bosib
      nusxalanadigan ko'rinishda yuboradi.
   4. Mijoz kodni shu yerga joylashtiradi — kabinet ochiladi va
      1 yilga eslab qolinadi.

   Telegram xabarida «⚡️ Bir bosishda kirish» tugmasi ham bor: u
   saytni ochib, kodni ham kiritmasdan kiritadi (boshqa brauzerdan
   kirish uchun eng qulay yo'l).

   SMS YO'Q, "raqamning oxirgi 4 ta raqami" degan zaxira yo'l ham
   YO'Q — ataylab olib tashlandi (xavfsizlik uchun).
   ================================================================== */

/* Botga havola olish va uni ochish. */
async function kodYubor(){
  const phone = extractRawDigits($('#oqPhone').value);
  if(phone.length < 9){
    toast(LANG==='ru'?'Введите полный номер телефона':"To'liq telefon raqamini kiriting",'bad');
    const el = $('#oqPhone'); if(el) el.focus();
    return;
  }
  const btn = $('#oqKodBtn');
  const asl = btn.innerHTML;
  btn.disabled = true; btn.textContent = t('Ochilmoqda…');

  /* MUHIM: yangi oynani so'rovdan OLDIN ochamiz. Brauzerlar
     "popup"ni faqat odam bosgan paytda ochishga ruxsat beradi;
     so'rov javobini kutib tursak, oyna BLOKLANADI. Shuning uchun
     bo'sh oyna darhol ochiladi va manzili keyin qo'yiladi. */
  let oyna = null;
  try{ oyna = window.open('', '_blank'); }catch(e){}

  try{
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-kod', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ action:'boshla', phone })
    }), kutishVaqti(14000));
    const data = await res.json();

    if(data && data.ok && data.havola){
      /* Telefon raqamini shu yerda eslab qo'yamiz — kodni
         tekshirishda kerak bo'ladi (mijoz maydonni tozalab yuborsa
         ham ishlasin). */
      KOD_TEL = phone.slice(-9);
      if(oyna){ oyna.location.href = data.havola; }
      else { location.href = data.havola; }   /* popup bloklangan bo'lsa */
      const h = $('#oqKodHint');
      if(h) h.textContent = LANG==='ru'
        ? 'Бот открыт. Скопируйте код и вставьте сюда.'
        : "Bot ochildi. Kodni nusxalab shu yerga joylashtiring.";
      const b0 = $$('#oqKod input')[0]; if(b0) b0.focus();
      return;
    }
    if(oyna) { try{ oyna.close(); }catch(e){} }
    toast((data && data.error) || t("Hozir ochib bo'lmadi"), 'bad');
  }catch(err){
    if(oyna) { try{ oyna.close(); }catch(e){} }
    toast(xatoMatni(err), 'bad');
  }finally{
    btn.disabled = false; btn.innerHTML = asl;
  }
}

/* «Kodni olish» bosilgan telefon — kodni tekshirishda ishlatiladi. */
let KOD_TEL = '';

let KOD_TEKSHIRILMOQDA = false;
async function kodTekshir(){
  /* Oxirgi katak to'lganda ham, Enter bosilganda ham, yopishtirilganda
     ham shu funksiya chaqiriladi — ikki marta yuborilib ketmasin
     (aks holda bitta kod uchun ikkita urinish sarflanardi). */
  if(KOD_TEKSHIRILMOQDA) return;
  const phone = KOD_TEL || extractRawDigits($('#oqPhone').value).slice(-9);
  const kod = ($('#oqKodVal').value || '').replace(/\D/g,'');
  if(phone.length !== 9){
    toast(LANG==='ru'?'Введите полный номер телефона':"To'liq telefon raqamini kiriting",'bad');
    return;
  }
  if(kod.length !== 4){
    toast(LANG==='ru'?'Введите 4-значный код':'4 xonali kodni kiriting','bad');
    return;
  }
  KOD_TEKSHIRILMOQDA = true;
  const btn = $('#oqKirBtn');
  const asl = btn.innerHTML;
  btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  try{
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-kod', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ action:'tekshir', phone, code: kod })
    }), kutishVaqti(14000));
    const data = await res.json();
    if(data && data.ok && data.token){
      kabEslab(phone, data.token);
      $$('#oqKod input').forEach(b => b.value = '');
      $('#oqKodVal').value = '';
      haptic('medium');
      await lookupOrders(data.token);
      return;
    }
    toast((data && data.error) || t("Kod noto'g'ri"), 'bad');
    $$('#oqKod input').forEach(b => b.value = '');
    $('#oqKodVal').value = '';
    const b0 = $$('#oqKod input')[0]; if(b0) b0.focus();
  }catch(err){
    toast(xatoMatni(err), 'bad');
  }finally{
    btn.disabled = false; btn.innerHTML = asl;
    KOD_TEKSHIRILMOQDA = false;
  }
}

/* ------------------------------------------------------------------
   «BIR BOSISHDA KIRISH» — Telegram xabaridagi tugma
   Bot yuborgan havola: /#/kirish?k=<bir martalik kalit>
   Kalit tokenga almashtiriladi va kabinet darhol ochiladi. Bu BOSHQA
   BRAUZERDAN (Safari, Chrome) kirishning eng qisqa yo'li — kod ham
   kiritilmaydi.
   Kalit BIR MARTALIK va 10 daqiqa yashaydi: havola chat tarixida
   qolsa ham ikkinchi marta ishlamaydi.
   ------------------------------------------------------------------ */
async function kirishKaliti(){
  const h = String(location.hash || '');
  const m = h.match(/[?&]k=([\w-]{16,64})/);
  if(!m) return false;
  const kalit = m[1];
  /* Manzilni darhol tozalaymiz — kalit brauzer tarixida qolmasin. */
  try{ history.replaceState(null, '', location.pathname + location.search + '#/buyurtmalarim'); }catch(e){}
  try{
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-kod', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ action:'kalit', key: kalit })
    }), kutishVaqti(14000));
    const data = await res.json();
    if(data && data.ok && data.token){
      kabEslab(String(data.phone || data.token.split('.')[0]), data.token);
      KAB_YUKLANDI = false;
      toast(LANG==='ru' ? 'Вы вошли' : 'Kabinetga kirdingiz', 'ok');
      return true;
    }
    toast((data && data.error) || t('Havola yaroqsiz'), 'bad');
  }catch(err){ toast(xatoMatni(err), 'bad'); }
  return false;
}

(function(){
  const kb = $('#oqKodBtn');  if(kb) kb.addEventListener('click', kodYubor);
  const kr = $('#oqKirBtn');  if(kr) kr.addEventListener('click', ()=> kodTekshir());

  /* 4 ta katak: avtomatik keyingisiga o'tish, Backspace bilan orqaga,
     va butun kodni bir marta joylashtirish (Telegram'dan nusxa olib
     qo'yganda hamma katakka tarqaladi). */
  const boxes = $$('#oqKod input'), hidden = $('#oqKodVal');
  if(boxes.length && hidden){
    const sync = ()=> hidden.value = boxes.map(b=>b.value).join('');
    boxes.forEach((b,i)=>{
      b.addEventListener('input', ()=>{
        b.value = b.value.replace(/\D/g,'').slice(0,1);
        if(b.value && boxes[i+1]) boxes[i+1].focus();
        sync();
        if(hidden.value.length === 4) kodTekshir();
      });
      b.addEventListener('keydown', (e)=>{
        if(e.key === 'Backspace' && !b.value && boxes[i-1]) boxes[i-1].focus();
        if(e.key === 'Enter') kodTekshir();
      });
      b.addEventListener('focus', ()=> b.select());
      b.addEventListener('paste', (e)=>{
        const matn = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g,'');
        if(!matn) return;
        e.preventDefault();
        boxes.forEach((x,j)=> x.value = matn[j] || '');
        sync();
        const oxirgi = boxes[Math.min(matn.length, boxes.length) - 1];
        if(oxirgi) oxirgi.focus();
        if(hidden.value.length === 4) kodTekshir();
      });
    });
  }
})();

/* Kabinet so'rovi uchun ishlatilgan telefon — PDF yuklab olishda
   qaytadan so'ramaslik uchun eslab qolinadi. */
let KAB_TEL = '';

/* ==================================================================
   KABINETNI ESLAB QOLISH (V124)
   ------------------------------------------------------------------
   MUAMMO. Oldingi versiyada kabinet to'g'ri ishlardi, lekin mijoz
   bo'limga HAR KIRGANDA telefon raqamini va oxirgi 4 ta raqamni
   QAYTA yozishi kerak edi. "Kabinet" deb atalgan narsa uchun bu
   noto'g'ri — kabinet o'zi ochilishi kerak.

   YECHIM. Bir marta muvaffaqiyatli kirgandan keyin telefon va 4 ta
   raqam SHU TELEFONNING O'ZIDA saqlanadi (localStorage) va keyingi
   safar bo'lim o'zi, hech narsa so'ramasdan ochiladi.

   XAVFSIZLIK. Saqlanadigan narsa — mijozning O'ZI kiritgan, o'zining
   telefon raqami va o'zi sotib olgan raqamning 4 ta raqami. Hech
   qanday parol, token yoki shaxsiy hujjat ma'lumoti saqlanmaydi.
   Ma'lumotning O'ZI (buyurtma, shartnoma) saqlanmaydi — u har safar
   serverdan, o'sha ikki bosqichli tekshiruvdan o'tib keladi.
   Boshqa odamning telefoniga o'tib qolmasligi uchun "Chiqish" tugmasi
   ko'rinib turadi. */
const KAB_KALIT = 'vip_kabinet';
const KAB_COOKIE = 'vipkab';

/* ------------------------------------------------------------------
   KIRISHNI SAQLASH — IKKI YO'L BILAN (V131)
   Mijoz so'rovi: saytdan chiqib ketib qaytsa ham, kabinet saqlanib
   qolsin. Shuning uchun token IKKI joyga yoziladi:
     1) localStorage — asosiy joy;
     2) cookie (1 yil) — zaxira. Ba'zi brauzerlar (xususan iOS Safari
        "Private" yoki saytlar ma'lumotini tozalash sozlamasi)
        localStorage'ni o'chirib yuboradi, cookie esa qoladi — yoki
        aksincha. Biri yo'qolsa, ikkinchisidan tiklanadi.
   BOSHQA BRAUZER (Chrome -> Safari) — bu boshqa qurilma kabi:
   brauzerlar bir-birining ma'lumotini KO'RA OLMAYDI (bu ularning
   xavfsizlik qoidasi, aylanib o'tib bo'lmaydi). Shuning uchun u
   yerda bir marta kod olinadi — yoki Telegram'dagi «Bir bosishda
   kirish» tugmasi bosiladi, u o'sha brauzerda darhol kiritadi.
   MA'LUMOTNING O'ZI (buyurtma, shartnoma, to'lovlar) serverda —
   qaysi brauzerdan kirmasin, hammasi joyida turadi.
   ------------------------------------------------------------------ */
function kukiYoz(nom, qiymat, kun){
  try{
    const muddat = new Date(Date.now() + (kun||365)*864e5).toUTCString();
    document.cookie = nom + '=' + encodeURIComponent(qiymat)
      + '; expires=' + muddat + '; path=/; SameSite=Lax'
      + (location.protocol === 'https:' ? '; Secure' : '');
  }catch(e){}
}
function kukiOl(nom){
  try{
    const m = document.cookie.match(new RegExp('(?:^|; )' + nom + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }catch(e){ return ''; }
}
function kukiOchir(nom){
  try{ document.cookie = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; }catch(e){}
}

const TOKEN_SHAKLI = /^\d{9}\.\d{10,16}\.[\w-]{8,64}$/;

/* Tokenni qayerdan topsa — o'shandan oladi, va ikkinchi joyga
   qaytarib yozib qo'yadi (biri yo'qolgan bo'lsa tiklanadi). */
function kabTokenOl(){
  let t = '', tel = '';
  try{
    const o = JSON.parse(localStorage.getItem(KAB_KALIT) || 'null');
    if(o && TOKEN_SHAKLI.test(String(o.token||''))){ t = o.token; tel = String(o.tel||''); }
  }catch(e){}
  if(!t){
    const c = kukiOl(KAB_COOKIE);
    if(TOKEN_SHAKLI.test(c)){ t = c; tel = c.split('.')[0]; }
  }
  if(t){
    /* Ikkala joyda ham turishini ta'minlaymiz */
    try{ localStorage.setItem(KAB_KALIT, JSON.stringify({ tel: tel || t.split('.')[0], token: t, at: Date.now() })); }catch(e){}
    if(kukiOl(KAB_COOKIE) !== t) kukiYoz(KAB_COOKIE, t, 365);
  }
  return t;
}

function kabEslaganni(){
  const t = kabTokenOl();
  if(!t) return null;
  return { tel: t.split('.')[0], token: t };
}
function kabEslab(tel, token){
  if(!TOKEN_SHAKLI.test(String(token||''))) return;
  try{ localStorage.setItem(KAB_KALIT, JSON.stringify({ tel, token, at: Date.now() })); }catch(e){}
  kukiYoz(KAB_COOKIE, token, 365);
}
function kabUnut(){
  kukiOchir(KAB_COOKIE);
  try{ localStorage.removeItem(KAB_KALIT); }catch(e){}
  /* V132: eski versiyalardan qolgan profil keshi ham tozalansin
     (u endi ishlatilmaydi, lekin mijozning telefonida yotib
     qolgan bo'lishi mumkin). */
  try{ localStorage.removeItem('vip_profil'); }catch(e){}
  KAB_SHARTNOMALAR = [];
  KAB_TEL = '';
  const box = $('#oqResult'); if(box) box.innerHTML = '';
  const tel = $('#oqPhone'); if(tel) tel.value = '';
  $$('#oqKod input').forEach(b => { b.value = ''; });
  const kv = $('#oqKodVal'); if(kv) kv.value = '';
  const forma = $('#oqForma'); if(forma) forma.style.display = '';
  const tush = $('#oqTushuntirish'); if(tush) tush.style.display = '';
  toast(LANG==='ru' ? 'Вы вышли из кабинета' : 'Kabinetdan chiqdingiz');
}

/* Bo'lim ochilganda: eslab qolingan bo'lsa — o'zi yuklanadi. */
let KAB_YUKLANDI = false;
/* ==================================================================
   MINI ILOVADA KODSIZ KIRISH (V136)
   ------------------------------------------------------------------
   Telegram mini ilovaga kirgan odamni bot ALLAQACHON taniydi:
   Telegram sahifaga `initData` beradi va uni BOT KALITI bilan
   imzolaydi. Serverda imzo tekshiriladi va chat ID bo'yicha telefon
   topiladi (qarang: netlify/functions/api-kabinet-tg.js).

   Ya'ni mini ilovada kabinet KOD SO'RAMASDAN, o'zi ochiladi.
   Imzo tekshirilmasa yoki raqam hali bog'lanmagan bo'lsa — mijoz
   odatdagi (kod bilan) yo'ldan kiradi, hech narsa buzilmaydi.
   ================================================================== */
let TG_KIRISH_URINDI = false;
async function tgKabinetgaKir(){
  if(TG_KIRISH_URINDI) return false;
  TG_KIRISH_URINDI = true;
  try{
    const wa = TG.obyekt;
    const initData = wa && wa.initData;
    if(!initData) return false;
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-tg', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ initData })
    }), kutishVaqti(12000));
    const data = await res.json();
    if(data && data.ok && data.token){
      kabEslab(String(data.phone || data.token.split('.')[0]), data.token);
      return true;
    }
    /* Raqam hali botda tasdiqlanmagan — mijozga bitta tugmali,
       tushunarli yo'l ko'rsatamiz. */
    if(data && data.bogla){
      const box = $('#oqResult');
      const nom = String(data.botNomi || 'vip_raqamlar_bot').replace(/[^\w_]/g,'');
      if(box) box.innerHTML = `<div class="card" style="background:var(--navy-grad);border-color:transparent;color:#fff">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;flex:none">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" aria-hidden="true"><path d="M21.6 4.3 2.9 11.5c-.9.35-.88 1.63.03 1.95l4.6 1.6 1.78 5.3c.23.68 1.1.86 1.58.33l2.5-2.75 4.7 3.45c.6.44 1.45.11 1.6-.62l3.2-15c.17-.78-.6-1.44-1.3-1.16zM9.5 14.3l-.3 3.2-1.2-3.6 8.9-5.6-7.4 6z"></path></svg>
          </span>
          <div style="flex:1;min-width:0">
            <b style="display:block;font-size:14.5px;font-weight:800">${LANG==='ru'?'Подтвердите номер':'Raqamingizni tasdiqlang'}</b>
            <div style="margin-top:6px;font-size:12px;color:#A9BCD6;font-weight:600;line-height:1.55">${esc(data.error||'')}</div>
          </div>
        </div>
        <a class="btn" href="https://t.me/${nom}?start=kabinet" style="margin-top:14px">
          <span>${LANG==='ru'?'Подтвердить в боте':'Botda tasdiqlash'}</span>
        </a>
      </div>`;
      const f2 = $('#oqForma'); if(f2) f2.style.display = 'none';
      const t2 = $('#oqTushuntirish'); if(t2) t2.style.display = 'none';
      return 'bogla';
    }
  }catch(e){ /* jim — mijoz kod bilan kiradi */ }
  return false;
}

async function kabAvtoOch(){
  let o = kabEslaganni();
  /* V136: Telegram ichida bo'lsak va hali kirmagan bo'lsak — avval
     kodsiz kirishni sinab ko'ramiz. */
  if(!o && tgIchida() && TG.bor()){
    const f0 = $('#oqForma'); if(f0) f0.style.display = 'none';
    const t00 = $('#oqTushuntirish'); if(t00) t00.style.display = 'none';
    const box0 = $('#oqResult'); if(box0) box0.innerHTML = skPrf();
    const natija = await tgKabinetgaKir();
    if(natija === 'bogla') return;          /* xabar ko'rsatildi */
    o = kabEslaganni();
    if(!o && box0) box0.innerHTML = '';
  }
  if(!o){
    const f = $('#oqForma'); if(f) f.style.display = '';
    const t0 = $('#oqTushuntirish'); if(t0) t0.style.display = '';
    return;
  }
  /* Forma yashiriladi — mijoz uni ko'rib "yana yozishim kerakmi?"
     deb o'ylamasin. "Chiqish" tugmasi natija ustida turadi. */
  const f = $('#oqForma'); if(f) f.style.display = 'none';
  const t0 = $('#oqTushuntirish'); if(t0) t0.style.display = 'none';
  const tel = $('#oqPhone'); if(tel && !tel.value) tel.value = formatUzNumber(o.tel);
  if(KAB_YUKLANDI) return;      /* bir marta — keyin qayta so'rov yubormaymiz */
  KAB_YUKLANDI = true;
  lookupOrders();
}
document.addEventListener('click', (e)=>{
  if(e.target.closest('[data-kabchiq]')){ e.preventDefault(); KAB_YUKLANDI = false; kabUnut(); }
});

function kabShartnomaHtml(c){
  const val = c.currency === 'USD' ? ' $' : (' ' + SUM());
  const foiz = c.jamiOy ? Math.round(c.tolanganOy / c.jamiOy * 100) : 0;
  const kech = Number(c.kechikkanOy) || 0;

  return `<div class="rescard">
    <span class="rb" style="background:${kech ? 'var(--red)' : 'var(--gold)'}"></span>
    <div class="rh">
      <span class="id sg">${esc(c.contractId)}</span>
      <span class="tag ${kech ? 'red' : (c.qolganSumma === 0 ? 'green' : 'vip')}" style="margin-left:auto">
        ${kech ? (LANG==='ru' ? kech+' мес. просрочка' : kech + ' oy kechikdi')
               : (c.qolganSumma === 0 ? (LANG==='ru'?'ПОГАШЕН':'TO\'LANDI') : (LANG==='ru'?'АКТИВЕН':'AMALDA'))}
      </span>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px">
      <div style="flex:1;min-width:0">
        <div class="big sg">${esc(shortNumber(c.number))}</div>
        <div class="sub">${esc(c.tolanganOy)} / ${esc(c.jamiOy)} ${t('oy')} ${LANG==='ru'?'оплачено':'to\'langan'}</div>
      </div>
      <div class="amt sg">${formatPrice(c.qolganSumma)}${esc(val)}</div>
    </div>

    <div class="kab-bar" aria-hidden="true"><i style="width:${foiz}%"></i></div>

    <div class="kab-qator">
      <span>${LANG==='ru'?'Оплачено':'To\'langan'}</span>
      <b>${formatPrice(c.tolanganSumma)}${esc(val)}</b>
    </div>
    ${c.keyingiSana ? `<div class="kab-qator">
      <span>${LANG==='ru'?'Следующий платёж':'Keyingi to\'lov'}</span>
      <b${kech ? ' style="color:var(--red)"' : ''}>${esc(c.keyingiSana)} · ${formatPrice(c.monthlyPayment)}${esc(val)}</b>
    </div>` : ''}

    <!-- V128: to'lovlar jadvali endi TEPADAGI kartochkadan ochiladi
         (mijoz so'rovi). Bu yerda takrorlanmaydi. -->

    <button class="btn ghost kab-pdf" data-kabpdf="${esc(c.contractId)}" style="margin-top:12px">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M8 11.5l4 4 4-4"></path><path d="M5 19h14"></path></svg>
      <span>${t('Shartnomani yuklab olish')}</span>
    </button>
  </div>`;
}

/* ==================================================================
   TO'LOVLAR JADVALI OYNASI (V128)
   ------------------------------------------------------------------
   Tepadagi kartochka bosilganda ochiladi. Ichida har bir shartnoma
   bo'yicha: jami/to'langan/qolgan va oyma-oy ro'yxat (sana, summa,
   holat). Ilgari bu jadval pastdagi shartnoma kartochkasining ichida
   edi — mijoz so'roviga ko'ra u yerdan olib tashlandi va shu yerga
   ko'chirildi.
   ================================================================== */
function prfJadvalOch(){
  const shList = (KAB_SHARTNOMALAR && KAB_SHARTNOMALAR.length) ? KAB_SHARTNOMALAR : [];
  if(!shList.length) return;
  const ru = LANG === 'ru';

  const boliklar = shList.map(c => {
    const val = c.currency === 'USD' ? ' $' : (' ' + SUM());
    const qatorlar = (c.oylar || []).map(o => {
      const belgi = o.holat === 'tolandi' ? '✓' : (o.holat === 'kechikdi' ? '!' : '·');
      return `<div class="kab-oy kab-${esc(o.holat)}">
        <span class="kab-oy-n">${esc(o.oy)}</span>
        <span class="kab-oy-s">${esc(o.sana)}</span>
        <span class="kab-oy-p">${formatPrice(o.summa)}${esc(val)}</span>
        <span class="kab-oy-b">${belgi}</span>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:20px">
      <div class="eyebrow" style="padding:0 4px;margin-bottom:10px">
        ${esc(c.contractId || '')} · ${esc(shortNumber(c.number || ''))}
      </div>
      <div class="prf-sh-bosh">
        <div><span>${ru?'Оплачено':"To'langan"}</span><b>${esc(c.tolanganOy)}/${esc(c.jamiOy)} ${t('oy')}</b></div>
        <div style="text-align:right"><span>${ru?'Остаток':'Qoldi'}</span>
          <b${Number(c.kechikkanOy) ? ' style="color:var(--red)"' : ''}>${formatPrice(c.qolganSumma)}${esc(val)}</b></div>
      </div>
      <div class="kab-oylar prf-jadval-sh">${qatorlar}</div>
    </div>`;
  }).join('');

  $('#genTitle').textContent = ru ? 'График платежей' : "To'lovlar jadvali";
  const ft = $('#genFoot'); if(ft) ft.style.display = 'none';
  /* Rasmiy tushuntirish — kartochkadagi spidometr nimani bildirishini
     aytadi. Kartochkada joy oz, shuning uchun to'liq izoh shu yerda. */
  const legend = `<div class="prf-legend">
    <div><i style="background:#4FBF8E"></i>${ru?'Без просрочки':"Kechikish yo'q"}</div>
    <div><i style="background:#F5B942"></i>${ru?'1 месяц просрочки':'1 oy kechikkan'}</div>
    <div><i style="background:#F2644E"></i>${ru?'2 и более месяцев':'2 va undan ko\'p oy'}</div>
  </div>`;
  $('#genBody').innerHTML = legend + boliklar;
  openSheet('shGen');
}

/* Kartochka bosilganda yoki klaviaturadan Enter/Probel bosilganda */
document.addEventListener('click', (e)=>{
  /* "Chiqish" tugmasi kartochka ichida — uning bosilishi jadvalni
     ochmasligi kerak. */
  if(e.target.closest('[data-kabchiq]')) return;
  if(e.target.closest('[data-prfjadval]')){ e.preventDefault(); prfJadvalOch(); }
});
document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target && e.target.closest && e.target.closest('[data-prfjadval]');
  if(el){ e.preventDefault(); prfJadvalOch(); }
});

/* Kabinetdan kelgan shartnomalar — jadval oynasi uchun eslab qolinadi. */
let KAB_SHARTNOMALAR = [];

/* Kabinetdagi "Shartnomani yuklab olish" — shartnoma ID'si allaqachon
   bizda, telefon ham: mijozdan hech narsa so'ralmaydi. */
document.addEventListener('click', async (e)=>{
  const b = e.target.closest('[data-kabpdf]');
  if(!b) return;
  const id = b.dataset.kabpdf;
  const asl = b.innerHTML;
  b.disabled = true; b.textContent = t('Tayyorlanmoqda…');
  try{
    const res = await withClientTimeout(fetch(FN + 'generate-contract-pdf', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ contractId: id, phone: KAB_TEL })
    }), kutishVaqti(20000));
    const r = await res.json();
    if(!r.ok || !r.pdfBase64){ toast(r.error || t('Shartnoma tayyorlanmadi'), 'bad'); return; }
    const chars = atob(r.pdfBase64);
    const bytes = new Uint8Array(chars.length);
    for(let i=0;i<chars.length;i++) bytes[i] = chars.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(()=> URL.revokeObjectURL(url), 60000);
    toast(LANG==='ru'?'Договор скачан':'Shartnoma yuklab olindi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
  }finally{
    b.disabled = false; b.innerHTML = asl;
  }
});

/* ==================================================================
   SHARTNOMA HOLATI (check-contract-status + generate-contract-pdf)
   ================================================================== */
const CONTRACT_STATUS = {
  active:     { label:"To'lov muvaffaqiyatli bajarilmoqda", tag:'green' },
  trouble:    { label:"To'lov uzilishlari ko'p",            tag:'vip' },
  cancelling: { label:'Shartnoma bekor qilish jarayonida',  tag:'red' },
  cancelled:  { label:"Shartnoma bekor bo'ldi",             tag:'red' },
  completed:  { label:'Shartnoma muvaffaqiyatli yakunlandi',tag:'green' }
};
let lastContractId = '';

async function lookupContract(){
  const idVal = ($('#ctId').value||'').trim().toUpperCase();
  const phone = extractRawDigits($('#ctPhone').value);
  const box = $('#ctResult');
  if(!idVal){ toast(LANG==='ru'?'Введите ID договора':'Shartnoma ID sini kiriting','bad'); return; }
  if(phone.length < 9){ toast(LANG==='ru'?'Введите полный номер телефона':"To'liq telefon raqamini kiriting",'bad'); return; }
  const btn = $('#ctBtn'); btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  box.innerHTML = skeletons(2);
  try{
    const res = await withClientTimeout(fetch(FN + 'check-contract-status', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ contractId: idVal, phone })
    }), kutishVaqti(12000));
    const r = await res.json();
    if(!r.ok || !r.data){
      box.innerHTML = emptyBox(IC_WARN, t('Topilmadi'), r.error || "Ma'lumot topilmadi. ID va raqamni tekshiring.", null, null, true);
      return;
    }
    lastContractId = idVal;      /* MUHIM: server contractId qaytarmaydi — PDF uchun shuni ishlatamiz */
    const d = r.data;
    const st = CONTRACT_STATUS[d.contractStatus] || { label: d.contractStatus || '—', tag:'grey' };
    const pays = Array.isArray(d.payments) ? d.payments : [];
    const paid = pays.filter(p => p.status === 'paid').length;
    const pct = pays.length ? Math.round(paid / pays.length * 100) : 0;
    const now = Date.now();

    const R = 40, C = 2 * Math.PI * R;
    box.innerHTML = `
      <div class="card" style="background:var(--navy-grad);border-color:transparent;color:#fff;position:relative;overflow:hidden">
        <div style="position:absolute;right:-40px;top:-50px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(230,200,119,.22),transparent 68%)"></div>
        <div style="position:relative" class="ringwrap">
          <div class="ring">
            <svg viewBox="0 0 92 92" width="92" height="92" aria-hidden="true">
              <circle cx="46" cy="46" r="${R}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="8"></circle>
              <circle cx="46" cy="46" r="${R}" fill="none" stroke="#E6C877" stroke-width="8" stroke-linecap="round"
                      stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct/100)).toFixed(1)}"></circle>
            </svg>
            <span class="mid"><b class="sg" style="color:#fff">${pct}%</b><i style="color:#A9BCD6">${paid}/${pays.length}</i></span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:.12em;color:#8EA3C0;text-transform:uppercase">${t('Shartnoma')}</div>
            <div class="sg" style="margin-top:5px;font-size:19px;font-weight:700;color:#E6C877">${esc(idVal)}</div>
            <div style="margin-top:7px;font-size:12.5px;color:#C9D6E8;font-weight:650">${esc(d.customerName||'')}</div>
            <div class="sg" style="margin-top:3px;font-size:12.5px;color:#A9BCD6;font-weight:600">${esc(shortNumber(d.number||''))}</div>
          </div>
        </div>
      </div>

      <div class="rescard" style="margin-top:11px">
        <span class="rb" style="background:${st.tag==='green'?'var(--green)':st.tag==='red'?'var(--red)':'var(--gold)'}"></span>
        <div style="display:flex;align-items:center;gap:11px">
          <span class="tag ${st.tag}">${t('HOLAT')}</span>
          <span style="flex:1;font-size:13px;font-weight:700">${esc(st.label)}</span>
        </div>
      </div>

      <div class="rescard" style="margin-top:11px">
        <div style="display:flex;align-items:center">
          <span class="eyebrow" style="flex:1">${t("To'lovlar jadvali")}</span>
          <span class="sg" style="font-size:12.5px;font-weight:700;color:var(--text-3)">${formatPrice(d.monthlyPayment)} ${SUM()}/${t('oy')}</span>
        </div>
        <div style="margin-top:8px">
          ${pays.map(p => {
            const over = p.status === 'pending' && p.dueDate && p.dueDate < now;
            const done = p.status === 'paid';
            const dd = p.dueDate ? sanaUz(p.dueDate) : '—';
            return `<div class="payrow">
              <span class="pn" style="background:${done?'var(--green)':over?'var(--red)':'var(--card-3)'};color:${done||over?'#fff':'var(--muted)'}">${done?'✓':(p.month||'•')}</span>
              <span class="pt">${p.month?p.month+'-'+t("to'lov"):t("to'lov")} · ${esc(dd)}</span>
              <span class="tag ${done?'green':over?'red':'grey'}">${done?t("TO'LANDI"):over?t('KECHIKMOQDA'):t('KUTILMOQDA')}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <button class="btn" id="ctPdf" style="margin-top:12px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M8 11.5l4 4 4-4"></path><path d="M5 19h14"></path></svg>
        ${t('Shartnomani yuklab olish')}</button>`;
  }catch(err){
    box.innerHTML = emptyBox(IC_WARN, t("Tekshirib bo'lmadi"), xatoMatni(err), null, null, true);
  }finally{
    btn.disabled = false; btn.textContent = t('Holatni tekshirish');
  }
}

async function downloadContractPdf(){
  const btn = $('#ctPdf'); if(!btn) return;
  const phone = extractRawDigits($('#ctPhone').value);
  btn.disabled = true; btn.textContent = t('Tayyorlanmoqda…');
  try{
    const res = await withClientTimeout(fetch(FN + 'generate-contract-pdf', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ contractId: lastContractId, phone })
    }), kutishVaqti(20000));
    const r = await res.json();
    if(!r.ok || !r.pdfBase64){ toast(r.error || 'Shartnoma tayyorlanmadi', 'bad'); return; }
    const chars = atob(r.pdfBase64);
    const bytes = new Uint8Array(chars.length);
    for(let i=0;i<chars.length;i++) bytes[i] = chars.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(()=> URL.revokeObjectURL(url), 60000);
    toast(LANG==='ru'?'Договор скачан':'Shartnoma yuklab olindi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
  }finally{
    btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M8 11.5l4 4 4-4"></path><path d="M5 19h14"></path></svg> ${t('Shartnomani yuklab olish')}`;
  }
}

/* ==================================================================
   MAXSUS RAQAM BUYURTMASI (number_price_categories + custom_orders)
   ================================================================== */
const CO = { pattern:'', operator:'', data:null, loading:false };

function openCustom(){
  CO.pattern = ''; CO.operator = ''; CO.data = null;
  $('#genTitle').textContent = t('Maxsus raqam buyurtmasi');
  $('#genFoot').style.display = 'none';
  renderCustom();
  openSheet('shGen');
}
function renderCustom(){
  const ops = ['Ucell','Humans','Beeline','Mobiuz','Uzmobile','Perfektum'];
  const d = CO.data;
  let priceBox = '';
  if(CO.loading) priceBox = '<div class="sk shim" style="height:90px;margin-top:12px"></div>';
  else if(CO.pattern.length === 4 && CO.operator){
    if(d){
      const price = (d.onSale && d.salePrice ? d.salePrice : (d.fullPrice||0))
                  + (d.onSale && d.saleMonthlyTariff ? d.saleMonthlyTariff : (d.monthlyTariff||0));
      priceBox = `<div class="card" style="margin-top:12px">
        <div class="eyebrow">Taxminiy narx</div>
        <div class="sg" style="margin-top:8px;font-size:23px;font-weight:700">${formatPrice(price)} <span style="font-family:'Plus Jakarta Sans';font-size:12px;color:var(--muted-2);font-weight:600">so'm</span></div>
        ${d.installmentAvailable && d.installmentMonthly ? `<div style="margin-top:7px;font-size:12.5px;color:var(--blue-text);font-weight:700">${formatPrice(d.installmentMonthly)} so'mdan / ${d.installmentMonths||0} oy${d.downPayment?` · bosh to'lov ${formatPrice(d.downPayment)}`:''}</div>` : ''}
        ${d.ownershipTransfer ? '<div style="margin-top:7px;font-size:11.5px;color:var(--green);font-weight:700">Raqam nomingizga rasmiylashtiriladi</div>' : ''}
      </div>`;
    }else{
      priceBox = `<div class="card" style="margin-top:12px;display:flex;gap:11px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="margin-top:1px"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5.5M12 7.8v.4"></path></svg>
        <div style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">Bu kombinatsiya uchun narx hali belgilanmagan. Ariza qoldiring — menejer narxni aytadi.</div>
      </div>`;
    }
  }

  $('#genBody').innerHTML = `
    <div style="font-size:12.5px;color:var(--text-2);font-weight:600;line-height:1.55">Kerakli raqamning <b>oxirgi 4 ta</b> raqamini va operatorni tanlang — biz siz uchun qidiramiz.</div>
    <div class="digits" style="margin-top:14px;max-width:230px" id="coDigits">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="1" data-c="0" aria-label="1-raqam">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="2" data-c="1" aria-label="2-raqam">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="3" data-c="2" aria-label="3-raqam">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="4" data-c="3" aria-label="4-raqam">
    </div>
    <div class="eyebrow" style="margin-top:16px">Operator</div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      ${ops.map(op => `<button class="chip${CO.operator===op?' on':''}" data-coop="${esc(op)}"><i class="dotc" style="background:${opMeta(op).color}"></i>${esc(op)}</button>`).join('')}
    </div>
    ${priceBox}
    <div class="fld" style="margin-top:16px" id="coName"><label for="coInName">Ism familiyangiz</label>
      <div class="inp"><input id="coInName" type="text" placeholder="ASADBEK RUSTAMOV" data-upper autocapitalize="characters" spellcheck="false"></div></div>
    <div class="fld" style="margin-top:12px" id="coPhone"><label for="coInPhone">Telefon raqamingiz</label>
      <div class="inp"><span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span><span style="width:1px;height:22px;background:var(--line-2)"></span><input id="coInPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67"></div></div>
    <div class="fld" style="margin-top:12px" id="coRegion"><label for="coInRegion">Viloyat</label>
      <div class="inp"><select id="coInRegion"><option value="">Tanlang</option>${REGIONS.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--faint)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></div></div>
    <button class="btn" id="coSubmit" style="margin-top:16px">Arizani yuborish</button>
    <div style="height:6px"></div>`;

  setTimeout(()=>{
    const boxes = $$('#coDigits input');
    boxes.forEach((b,i)=>{
      b.value = CO.pattern[i] || '';
      b.addEventListener('input', ()=>{
        b.value = b.value.replace(/\D/g,'').slice(0,1);
        if(b.value && boxes[i+1]) boxes[i+1].focus();
        CO.pattern = boxes.map(x=>x.value).join('');
        if(CO.pattern.length === 4 && CO.operator) loadCustomPrice();
      });
      b.addEventListener('keydown', e => { if(e.key==='Backspace' && !b.value && boxes[i-1]) boxes[i-1].focus(); });
    });
    const p = $('#coInPhone');
    /* iPhone: yozayotganda tegilmaydi, format chiqishda qo'yiladi */
    if(p){ p.setAttribute('inputmode','tel');
      p.addEventListener('input', ()=>{ $('#coPhone').classList.remove('bad'); });
      p.addEventListener('blur', ()=>{ p.value = formatUzNumber(extractRawDigits(p.value)); }); }
  }, 0);
}
async function loadCustomPrice(){
  CO.loading = true; renderCustom();
  try{
    const doc = await withClientTimeout(db.collection('number_price_categories').doc(`${CO.operator}_${CO.pattern}`).get(), kutishVaqti(8000));
    CO.data = doc.exists ? doc.data() : null;
  }catch(e){ CO.data = null; }
  CO.loading = false; renderCustom();
}
async function submitCustom(){
  const name = ($('#coInName').value||'').trim();
  const raw = extractRawDigits($('#coInPhone').value);
  const region = $('#coInRegion').value;
  let ok = true;
  $('#coName').classList.toggle('bad', name.length < 2); if(name.length < 2) ok = false;
  $('#coPhone').classList.toggle('bad', raw.length !== 9); if(raw.length !== 9) ok = false;
  $('#coRegion').classList.toggle('bad', !region); if(!region) ok = false;
  if(CO.pattern.length !== 4){ toast(LANG==='ru'?'Введите все 4 цифры':"4 ta raqamni to'liq kiriting",'bad'); ok = false; }
  if(!CO.operator){ toast(LANG==='ru'?'Выберите оператора':'Operatorni tanlang','bad'); ok = false; }
  if(!ok) return;

  const btn = $('#coSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
  const d = CO.data;
  try{
    await db.collection('custom_orders').add({
      pattern: CO.pattern,
      operator: CO.operator,
      name, region, phone: '+998 ' + formatUzNumber(raw),
      status:'Yangi', source:'Sayt',
      fullPrice:            d ? (d.fullPrice||0) : 0,
      monthlyTariff:        d ? (d.monthlyTariff||0) : 0,
      onSale:               d ? !!d.onSale : false,
      salePrice:            d ? (d.salePrice||0) : 0,
      saleMonthlyTariff:    d ? (d.saleMonthlyTariff||0) : 0,
      installmentAvailable: d ? !!d.installmentAvailable : false,
      installmentMonths:    d ? (d.installmentMonths||0) : 0,
      installmentMonthly:   d ? (d.installmentMonthly||0) : 0,
      downPayment:          d ? (d.downPayment||0) : 0,
      ownershipTransfer:    d ? !!d.ownershipTransfer : false,
      tariffMonths:         d ? (d.tariffMonths||0) : 0,
      createdAt: sanaVaqtUz(new Date()),
      createdAtSort: Date.now()
    });
    $('#genBody').innerHTML = `<div style="text-align:center;padding:26px 0">
      <span style="width:80px;height:80px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
        <span style="width:56px;height:56px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
      <h3 style="margin-top:16px;font-size:19px">Ariza qabul qilindi</h3>
      <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:280px">
        <b class="sg" style="color:var(--ink)">•••• ${esc(CO.pattern)}</b> (${esc(CO.operator)}) bo'yicha qidiramiz va tez orada bog'lanamiz.</p>
      <button class="btn" data-close style="margin-top:20px">Yopish</button>
    </div>`;
    toast(LANG==='ru'?'Заявка отправлена':'Ariza yuborildi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
    btn.disabled = false; btn.textContent = t('Arizani yuborish');
  }
}

/* ==================================================================
   FAQ / BIZ HAQIMIZDA / ISH O'RINLARI
   ================================================================== */
const FAQ = [
  ["Raqam qanday nomimga o'tkaziladi?",
   "To'lovlar to'liq yakunlangandan so'ng 5 (besh) ish kuni ichida operator ofisida abonent shartnomasi sizning nomingizga rasmiylashtiriladi. Buning uchun pasportingiz asl nusxasi bilan shaxsan hozir bo'lishingiz shart. Rasmiylashtirilgandan so'ng tomonlar qabul qilish dalolatnomasini imzolaydi."],
  ["Bo'lib to'lash uchun nima kerak?",
   "Pasportingiz va JSHSHIR raqamingiz yetarli. Menejer siz bilan bog'lanib, muddat (6, 12, 24 yoki 36 oy) va oylik to'lov miqdorini kelishib oladi, so'ng rasmiy shartnoma tuziladi."],
  ["To'lovni kechiktirsam nima bo'ladi?",
   "To'lov muddatidan 30 (o'ttiz) kun va undan ortiq kechikilsa, shartnoma bir tomonlama tarzda bekor hisoblanadi. Shu sababli to'lov qiyinchiligi tug'ilsa, oldindan menejerga xabar bering — ko'p holatlarda muddatni qayta kelishish mumkin."],
  ["Yetkazib berish qancha turadi?",
   "O'zbekiston bo'ylab yetkazib berish bepul. Toshkent shahri bo'yicha odatda shu kuni, viloyatlarga 1–3 ish kunida yetkaziladi. Kuryer bilan birga shartnoma va SIM-karta keladi."],
  ["Buyurtmam holatini qanday bilaman?",
   "«Buyurtma» bo'limida telefon raqamingiz va sotib olingan raqamning oxirgi 4 ta raqamini kiriting — barcha buyurtmalaringiz holati ko'rinadi."],
  ["Shartnomani qayerdan yuklab olaman?",
   "«Buyurtma» bo'limidagi «Shartnoma» yorlig'iga o'ting, shartnoma ID va telefon raqamingizni kiriting. Holat bilan birga shartnomaning PDF nusxasini ham yuklab olasiz."]
];
function openFaq(){
  $('#genTitle').textContent = t('Savol-javob');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = `<div class="list">${FAQ.map((f,i)=>`
    <div class="acc${i===0?' on':''}" data-acc>
      <button class="q"><b>${esc(f[0])}</b>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" style="margin-top:2px;color:var(--muted-2)"><path class="vb" d="M12 6v12"></path><path d="M6 12h12"></path></svg>
      </button>
      <div class="a">${esc(f[1])}</div>
    </div>`).join('')}</div>
    <div class="card" style="margin-top:12px;background:var(--blue-tint);border-color:transparent;display:flex;align-items:center;gap:12px">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L5 20l1.3-4.1A7.5 7.5 0 1 1 20 12z"></path></svg>
      <span style="flex:1;font-size:12.5px;color:var(--blue-ink);font-weight:650;line-height:1.5">Javob topmadingizmi? Operatorga yozing.</span>
      <a class="btn sm" href="${esc(SETTINGS.telegramLink || 'https://t.me/Vip_raqamlar_admin')}" target="_blank" rel="noopener" style="flex:none">Yozish</a>
    </div><div style="height:6px"></div>`;
  openSheet('shGen');
}

/* ==================================================================
   OFIS MANZILI  ("Biz haqimizda" oynasida)
   Koordinata admin panelning "Sozlamalar" bo'limidan olinadi
   (site_settings/general → officeLat / officeLng). Kiritilmagan bo'lsa
   standart qiymat ishlatiladi — ya'ni blok har doim ishlaydi.
   "Xaritani ochish" telefonda Yandex Xarita / Yandex Go ilovasini
   ochadi (o'rnatilmagan bo'lsa — brauzerdagi xaritani).
   ================================================================== */
function ofisKoord(){
  const la = parseFloat(SETTINGS.officeLat), ln = parseFloat(SETTINGS.officeLng);
  return {
    lat: Number.isFinite(la) ? la : 41.289757,
    lng: Number.isFinite(ln) ? ln : 69.201657
  };
}
function ofisBloki(){
  const { lat, lng } = ofisKoord();
  const manzil = esc(SETTINGS.officeAddress || (LANG==='ru' ? 'г. Ташкент' : 'Toshkent shahri'));
  const nom = encodeURIComponent('VIP RAQAMLAR');
  const xarita = `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map&text=${nom}`;
  const yol    = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
  return `
    <div class="card ofis" style="margin-top:12px">
      <div class="ofis-top">
        <span class="ofis-pin">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"></path><circle cx="12" cy="10" r="2.6"></circle></svg>
        </span>
        <span class="ofis-txt">
          <b>${t('Bizning manzil')}</b>
          <i>${manzil}</i>
        </span>
      </div>
      <div class="ofis-map" aria-hidden="true">
        <span class="ofis-dot"></span>
      </div>
      <div class="ofis-btns">
        <a class="btn" href="${xarita}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4.5 3.5 6.8v13L9 17.5l6 3 5.5-2.3v-13L15 7.5z"></path><path d="M9 4.5v13M15 7.5v13"></path></svg>
          ${t('Xaritani ochish')}
        </a>
        <a class="btn ghost" href="${yol}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h7a3 3 0 0 0 3-3V7"></path><path d="M13 4.5 16 7l-3 2.5"></path><circle cx="5" cy="17" r="2.4"></circle><path d="M7.4 17H18a3 3 0 0 0 0-6"></path></svg>
          ${t("Yo'nalish")}
        </a>
      </div>
    </div>`;
}

function openAbout(){
  $('#genTitle').textContent = t('Biz haqimizda');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = `
    <div class="card" style="background:var(--navy-grad);border-color:transparent;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-40px;top:-50px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,rgba(230,200,119,.2),transparent 68%)"></div>
      <div style="position:relative">
        <div style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#E6C877">VIP RAQAMLAR</div>
        <div style="margin-top:10px;font-size:13px;color:#C9D6E8;font-weight:600;line-height:1.65">O'zbekiston bo'ylab chiroyli, oltin va VIP telefon raqamlarini tanlash va sotib olish xizmati.</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div style="font-size:13px;color:var(--text-2);font-weight:600;line-height:1.65">Biz mijozlarimizga barcha operatorlar (Beeline, Ucell, Uzmobile, Mobiuz, Humans, Perfektum) raqamlarini keng katalog orqali taqdim etamiz, O'zbekiston bo'ylab bepul yetkazib berish va bo'lib to'lash (kredit) imkoniyatini beramiz.</div>
    </div>
    ${ofisBloki()}
    <div class="rows" style="margin-top:12px">
      <a class="row" href="tel:+998878880101"><span class="ri" style="background:var(--green-tint);color:var(--green)"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.7 1.5A16.5 16.5 0 0 1 5 5.2 1.5 1.5 0 0 1 6.5 3.5z"></path></svg></span><span class="rt"><b>Qo'ng'iroq</b><i class="sg">+998 87 888 01 01</i></span></a>
      <a class="row" href="${esc(SETTINGS.telegramLink || 'https://t.me/Vip_raqamlar_admin')}" target="_blank" rel="noopener"><span class="ri" style="background:var(--blue-tint);color:var(--blue)"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5L10.5 13.5 3.5 10.5z"></path><path d="M21 5l-7 15-3.5-6.5"></path></svg></span><span class="rt"><b>Telegram</b><i>@Vip_raqamlar_admin</i></span></a>
      <a class="row" href="https://vipraqamlar.uz"><span class="ri"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"></path></svg></span><span class="rt"><b>Veb-sayt</b><i>vipraqamlar.uz</i></span></a>
    </div>
    <div style="margin-top:18px;text-align:center;font-size:10.5px;color:var(--muted-2);font-weight:600;line-height:1.7">© 2026 VIP RAQAMLAR (vipraqamlar.uz)<br>Barcha huquqlar himoyalangan.</div>
    <div style="height:6px"></div>`;
  openSheet('shGen');
}

let VACANCIES = [], vacPick = null;
async function openJobs(){
  $('#genTitle').textContent = t("Bo'sh ish o'rinlari");
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = skeletons(3);
  openSheet('shGen');
  try{
    const snap = await withClientTimeout(db.collection('vacancies').where('active','==',true).get(), kutishVaqti(9000));
    VACANCIES = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b)=> (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
  }catch(e){ VACANCIES = []; }
  renderJobs();
}
function renderJobs(){
  if(!VACANCIES.length){
    $('#genBody').innerHTML = emptyBox(IC_BOX, t("Hozircha bo'sh o'rin yo'q"), "Yangi vakansiyalar chiqqanda shu yerda ko'rinadi. Telegram kanalimizni kuzatib boring.", null);
    return;
  }
  $('#genBody').innerHTML = `<div class="list">${VACANCIES.map(v => `
    <div class="card">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="width:38px;height:38px;border-radius:12px;background:var(--blue-tint);color:var(--blue);display:flex;align-items:center;justify-content:center;flex:none"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7.5" width="17" height="12" rx="2"></rect><path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2"></path></svg></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:800">${esc(v.title||'')}</div>
          ${(v.salaryMin||v.salaryMax)?`<div class="sg" style="margin-top:5px;font-size:12.5px;color:var(--green);font-weight:700">${formatPrice(v.salaryMin||0)}${v.salaryMax?' – '+formatPrice(v.salaryMax):''} so'm</div>`:''}
        </div>
      </div>
      ${v.description?`<div style="margin-top:11px;font-size:12.5px;color:var(--text-2);font-weight:600;line-height:1.6;white-space:pre-line">${esc(v.description)}</div>`:''}
      <button class="btn sm" data-vac="${esc(v.id)}" style="margin-top:13px;width:100%;background:var(--blue);color:#fff">Ariza qoldirish</button>
    </div>`).join('')}</div><div style="height:6px"></div>`;
}
function openVacForm(id){
  vacPick = VACANCIES.find(v => v.id === id); if(!vacPick) return;
  $('#genTitle').textContent = t('Ariza');
  $('#genBody').innerHTML = `
    <div class="card"><div class="eyebrow">Lavozim</div><div style="margin-top:6px;font-size:15px;font-weight:800">${esc(vacPick.title||'')}</div></div>
    <div class="fld" style="margin-top:14px" id="vfName"><label for="vfInName">Ism familiyangiz</label><div class="inp"><input id="vfInName" type="text" placeholder="ASADBEK RUSTAMOV" data-upper autocapitalize="characters" spellcheck="false"></div></div>
    <div class="fld" style="margin-top:12px" id="vfPhone"><label for="vfInPhone">Telefon raqamingiz</label><div class="inp"><span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span><span style="width:1px;height:22px;background:var(--line-2)"></span><input id="vfInPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67"></div></div>
    <div class="fld" style="margin-top:12px"><label for="vfInExp">Tajribangiz</label><div class="inp" style="align-items:flex-start"><textarea id="vfInExp" rows="4" placeholder="Qisqacha yozing (ixtiyoriy)"></textarea></div></div>
    <label style="margin-top:14px;display:flex;align-items:flex-start;gap:10px">
      <input id="vfConsent" type="checkbox" style="width:20px;height:20px;margin-top:1px;accent-color:var(--blue)">
      <span style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">Shaxsiy ma'lumotlarim ishga qabul qilish maqsadida qayta ishlanishiga roziman</span>
    </label>
    <button class="btn" id="vfSubmit" style="margin-top:16px" disabled>Arizani yuborish</button><div style="height:6px"></div>`;
  setTimeout(()=>{
    const p = $('#vfInPhone');
    p.setAttribute('inputmode','tel');
    p.addEventListener('input', ()=>{ $('#vfPhone').classList.remove('bad'); });
    p.addEventListener('blur', ()=>{ p.value = formatUzNumber(extractRawDigits(p.value)); });
    $('#vfConsent').addEventListener('change', e => { $('#vfSubmit').disabled = !e.target.checked; });
  }, 0);
}
async function submitVac(){
  const name = ($('#vfInName').value||'').trim();
  const raw = extractRawDigits($('#vfInPhone').value);
  const exp = ($('#vfInExp').value||'').trim().slice(0, 2900);
  let ok = true;
  $('#vfName').classList.toggle('bad', name.length < 2); if(name.length < 2) ok = false;
  $('#vfPhone').classList.toggle('bad', raw.length !== 9); if(raw.length !== 9) ok = false;
  if(!ok) return;
  const btn = $('#vfSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
  try{
    /* DIQQAT: firestore.rules bu yerda ANIQ shu 8 ta maydonni talab qiladi */
    await db.collection('job_applications').add({
      vacancyId: vacPick.id,
      vacancyTitle: vacPick.title || '',
      fullName: name,
      phone: '+998 ' + formatUzNumber(raw),
      experience: exp,
      consentGiven: true,
      status: 'new',
      createdAt: FV.serverTimestamp()
    });
    try{
      const text = `💼 Yangi ish uchun ariza\n\n📋 Lavozim: ${vacPick.title}\n👤 Ism: ${name}\n☎️ Telefon: +998 ${formatUzNumber(raw)}\n${exp?`📝 Tajriba: ${exp}\n`:''}🕐 Vaqti: ${sanaVaqtUz(new Date())}`;
      fetch(FN + 'telegram-notify', { method:'POST', headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) }, body: JSON.stringify({ text }) }).catch(()=>{});
    }catch(e){}
    $('#genBody').innerHTML = `<div style="text-align:center;padding:26px 0">
      <span style="width:80px;height:80px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
        <span style="width:56px;height:56px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
      <h3 style="margin-top:16px;font-size:19px">Arizangiz yuborildi</h3>
      <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:280px">Tez orada siz bilan bog'lanamiz.</p>
      <button class="btn" data-close style="margin-top:20px">Yopish</button></div>`;
    toast(LANG==='ru'?'Заявка отправлена':'Ariza yuborildi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
    btn.disabled = false; btn.textContent = t('Arizani yuborish');
  }
}

/* ==================================================================
   HAMKOR BO'LISH — raqam sotuvchilar uchun ariza
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "diler bo'limini qo'sh, faqat to'liq ma'lumot
   berilmasin — hamkor bo'lish, ariza berish bo'lsin".

   Shu sabab bu yerda NARX, TARIF, FOIZ va boshqa shartlar
   KO'RSATILMAYDI. Faqat qisqa taklif va ariza formasi. Shartlarni
   admin arizani ko'rib chiqqandan keyin, odam bilan gaplashib
   aytadi — bu ham savdo nuqtai nazaridan to'g'riroq: narx oldindan
   ko'rinmasa, odam avval bog'lanadi.

   Ariza `hamkor_arizalari` to'plamiga tushadi va admin panelning
   "Sotuvchilar" bo'limida ko'rinadi. Telegram'ga ham xabar ketadi.
   ================================================================== */
function openHamkor(){
  $('#genTitle').textContent = t('Hamkor bo‘lish');
  $('#genBody').innerHTML = `
    <div class="card" style="display:flex;gap:12px;align-items:flex-start">
      <span style="width:40px;height:40px;border-radius:13px;background:var(--gold-tint);color:var(--gold-ink);display:flex;align-items:center;justify-content:center;flex:none">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 20v-1.8a3.2 3.2 0 0 0-3.2-3.2H6.2A3.2 3.2 0 0 0 3 18.2V20"></path><circle cx="9.5" cy="7.8" r="3.3"></circle><path d="M17 11.5h4M19 9.5v4"></path></svg></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:15.5px;font-weight:800;line-height:1.3">${t('Raqamlaringizni biz orqali soting')}</div>
        <div style="margin-top:7px;font-size:12.5px;color:var(--text-2);font-weight:600;line-height:1.6">${t('Sizga shaxsiy kabinet ochib beramiz: raqamlaringizni o‘zingiz joylaysiz, narxini o‘zingiz belgilaysiz, buyurtmalar to‘g‘ridan-to‘g‘ri sizga tushadi.')}</div>
      </div>
    </div>

    <div class="list" style="margin-top:12px">
      ${[
        [t('Shaxsiy kabinet'), t('Raqam joylash, narx o‘zgartirish, statistika')],
        [t('Buyurtmalar sizga keladi'), t('Mijozning ismi va telefoni bilan')],
        [t('Nazorat sizda'), t('Qaysi raqamni qachon sotishni o‘zingiz hal qilasiz')]
      ].map(([a,b]) => `
      <div class="card" style="display:flex;gap:11px;align-items:flex-start;padding:13px 14px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--green)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:2px;flex:none"><path d="M5 13l4.5 4.5L19 8"></path></svg>
        <div style="min-width:0"><div style="font-size:13.5px;font-weight:700">${a}</div>
        <div style="margin-top:3px;font-size:12px;color:var(--muted);font-weight:600;line-height:1.5">${b}</div></div>
      </div>`).join('')}
    </div>

    <div class="eyebrow" style="margin-top:20px">${t('Ariza qoldiring')}</div>
    <div style="margin-top:6px;font-size:12px;color:var(--muted);font-weight:600;line-height:1.55">${t('Shartlarni telefon orqali tushuntiramiz.')}</div>

    <div class="fld" style="margin-top:13px" id="hkName"><label for="hkInName">${t('Ism yoki firma nomi')}</label>
      <div class="inp"><input id="hkInName" type="text" placeholder="ASADBEK RUSTAMOV" data-upper autocapitalize="characters" spellcheck="false"></div></div>

    <div class="fld" style="margin-top:12px" id="hkPhone"><label for="hkInPhone">${t('Telefon raqamingiz')}</label>
      <div class="inp"><span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span><span style="width:1px;height:22px;background:var(--line-2)"></span><input id="hkInPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67"></div></div>

    <div class="fld" style="margin-top:12px" id="hkRegion"><label for="hkInRegion">${t('Viloyat')}</label>
      <div class="inp"><select id="hkInRegion" style="width:100%;background:transparent;border:none;color:inherit;font-family:inherit;font-size:14.5px;font-weight:600;outline:none">
        <option value="">${t('Tanlang')}</option>
        ${["Toshkent shahri","Toshkent viloyati","Andijon","Farg'ona","Namangan","Samarqand","Buxoro","Xorazm","Navoiy","Qashqadaryo","Surxondaryo","Jizzax","Sirdaryo","Qoraqalpog'iston"].map(r=>`<option>${r}</option>`).join('')}
      </select></div></div>

    <div class="fld" style="margin-top:12px"><label for="hkInCount">${t('Nechta raqamingiz bor')}</label>
      <div class="inp"><select id="hkInCount" style="width:100%;background:transparent;border:none;color:inherit;font-family:inherit;font-size:14.5px;font-weight:600;outline:none">
        <option value="1-10">1 – 10</option>
        <option value="10-50">10 – 50</option>
        <option value="50-200">50 – 200</option>
        <option value="200+">200 ${t('dan ko‘p')}</option>
      </select></div></div>

    <div class="fld" style="margin-top:12px"><label for="hkInNote">${t('Izoh')}</label>
      <div class="inp" style="align-items:flex-start"><textarea id="hkInNote" rows="3" placeholder="${t('Ixtiyoriy')}"></textarea></div></div>

    <label style="margin-top:14px;display:flex;align-items:flex-start;gap:10px">
      <input id="hkConsent" type="checkbox" style="width:20px;height:20px;margin-top:1px;accent-color:var(--blue)">
      <span style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">${t('Shaxsiy ma’lumotlarim hamkorlik bo‘yicha bog‘lanish maqsadida qayta ishlanishiga roziman')}</span>
    </label>

    <button class="btn" id="hkSubmit" style="margin-top:16px" disabled>${t('Arizani yuborish')}</button>
    <div style="height:6px"></div>`;

  setTimeout(()=>{
    const p = $('#hkInPhone');
    if(p){
      p.setAttribute('inputmode','tel');
      p.addEventListener('input', (e)=>{
        $('#hkPhone').classList.remove('bad');
        /* Bo'shliqlarni maydon o'zi qo'yadi (+998 chapda turadi).
           iPhone uchun: kursor oxirida bo'lsa va qiymat haqiqatan
           o'zgarsa; o'chirishda faqat oxirgi ajratgich olinadi. */
        const ochirish = !!(e && e.inputType && e.inputType.indexOf('delete') === 0);
        const y = formatUzNumber(extractRawDigits(p.value));
        if(y === p.value) return;
        if(ochirish){
          const t2 = p.value.replace(/\s+$/, '');
          if(t2 !== p.value){ p.value = t2; try{ p.setSelectionRange(t2.length, t2.length); }catch(e2){} }
          return;
        }
        if(p.selectionStart != null && p.selectionStart < p.value.length) return;
        p.value = y;
        try{ p.setSelectionRange(y.length, y.length); }catch(e2){}
      });
      p.addEventListener('blur', ()=>{ p.value = formatUzNumber(extractRawDigits(p.value)); });
    }
    const c = $('#hkConsent');
    if(c) c.addEventListener('change', e => { $('#hkSubmit').disabled = !e.target.checked; });
    /* Avval kiritgan ismi/telefoni bo'lsa — qayta yozmasin */
    try{
      const nm = localStorage.getItem('vip_name') || '';
      const ph = localStorage.getItem('vip_phone') || '';
      if(nm && $('#hkInName')) $('#hkInName').value = nm;
      if(ph && p) p.value = formatUzNumber(ph);
    }catch(e){}
  }, 0);
  openSheet('shGen');
}

async function submitHamkor(){
  const name = ($('#hkInName').value || '').trim();
  const raw  = extractRawDigits($('#hkInPhone').value);
  const reg  = ($('#hkInRegion').value || '').trim();
  const cnt  = ($('#hkInCount').value || '').trim();
  const note = ($('#hkInNote').value || '').trim().slice(0, 900);

  let ok = true;
  $('#hkName').classList.toggle('bad', name.length < 2);   if(name.length < 2) ok = false;
  $('#hkPhone').classList.toggle('bad', raw.length !== 9);  if(raw.length !== 9) ok = false;
  $('#hkRegion').classList.toggle('bad', !reg);             if(!reg) ok = false;
  if(!ok) return;

  const btn = $('#hkSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
  try{
    /* DIQQAT: firestore.rules bu yerda ANIQ shu 8 ta maydonni talab qiladi */
    await db.collection('hamkor_arizalari').add({
      fullName: name,
      phone: '+998 ' + formatUzNumber(raw),
      region: reg,
      numbersCount: cnt,
      note: note,
      consentGiven: true,
      status: 'new',
      createdAt: FV.serverTimestamp()
    });
    try{
      const text = '\u{1F91D} Yangi hamkorlik arizasi\n\n\u{1F464} ' + name +
        '\n☎️ +998 ' + formatUzNumber(raw) +
        '\n\u{1F4CD} ' + reg + '\n\u{1F522} Raqamlari: ' + cnt +
        (note ? '\n\u{1F4DD} ' + note : '') +
        '\n\u{1F550} ' + sanaVaqtUz(new Date());
      fetch(FN + 'telegram-notify', { method:'POST',
        headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
        body: JSON.stringify({ text }) }).catch(()=>{});
    }catch(e){}
    try{ localStorage.setItem('vip_name', name); localStorage.setItem('vip_phone', raw); }catch(e){}

    $('#genBody').innerHTML = `<div style="text-align:center;padding:26px 0">
      <span style="width:80px;height:80px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
        <span style="width:56px;height:56px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
      <h3 style="margin-top:16px;font-size:19px">${t('Arizangiz yuborildi')}</h3>
      <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:290px">${t('Tez orada siz bilan bog‘lanamiz va shartlarni tushuntiramiz.')}</p>
      <button class="btn" data-close style="margin-top:20px">${t('Yopish')}</button></div>`;
    toast(LANG === 'ru' ? 'Заявка отправлена' : 'Ariza yuborildi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
    btn.disabled = false; btn.textContent = t('Arizani yuborish');
  }
}

/* ==================================================================
   BO'LIB TO'LASHGA RAQAMLAR (bosh sahifadagi premium kartochka ->)
   ------------------------------------------------------------------
   Kartochkalar KATALOGDAGI bilan AYNAN bir xil (numCard) — shu sabab
   "Batafsil", sevimlilar, buyurtma — hammasi avvalgidek ishlaydi.
   Har 15 tadan keyin "Yana ko'rsatish" tugmasi qoladi (PAGE_SIZE).
   ================================================================== */
let INS_SHOWN = PAGE_SIZE;

function bolibRoyxat(){
  return NUMBERS
    .filter(n => !n.reserved && installmentAllowed(n))
    .sort((a,b) => (a.price || 0) - (b.price || 0));
}

function openBolib(){
  INS_SHOWN = PAGE_SIZE;
  $('#genTitle').textContent = t("Bo'lib to'lashga raqamlar");
  $('#genFoot').style.display = 'none';
  renderBolib();
  openSheet('shGen');
  try{ if(typeof track === 'function') track('bolib_tolash_royxati'); }catch(e){}
}

const IC_WALLET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>';

function renderBolib(){
  const list = bolibRoyxat();
  const body = $('#genBody');
  if(!body) return;
  if(!list.length){
    body.innerHTML = emptyBox(IC_BOX, t('Raqam topilmadi'),
      LANG === 'ru' ? 'Сейчас нет номеров в рассрочку.' : "Hozircha bo'lib to'lashga raqam yo'q.", null);
    return;
  }
  const bor = list.slice(0, INS_SHOWN);
  const qoldi = list.length - INS_SHOWN;
  body.innerHTML =
    `<div class="ins-head">
       <span class="ic">${IC_WALLET}</span>
       <div style="flex:1;min-width:0">
         <b>${esc(list.length + ' ' + t('raqam'))}</b>
         <i>${esc(t("Oldindan to'lovsiz, rasmiy shartnoma bilan"))}</i>
       </div>
     </div>
     <div class="list">${bor.map(n => numCard(n)).join('')}</div>` +
    (qoldi > 0
      ? `<button class="btn ghost" id="insMore" style="margin-top:16px">${t("Yana ko'rsatish")} (${Math.min(PAGE_SIZE, qoldi)})</button>`
      : '');
  requestAnimationFrame(()=>{ if(typeof upperAll === 'function') upperAll(body); });
}

/* ==================================================================
   XABARLAR (admin paneldan yuborilgan bildirishnomalar)
   ------------------------------------------------------------------
   Qanday ishlaydi:
     • Admin panel "Saytga xabar" bo'limida xabar yozadi va u
       site_settings/xabarlar hujjatiga yoziladi (BITTA hujjat —
       shu sabab mijoz brauzeri uchun BITTA o'qish, baza xarajati
       deyarli nol).
     • Sayt ochilganda shu hujjat o'qiladi. O'qilmagan xabarlar
       soni tepadagi qo'ng'iroqchada chiqadi.
     • Yangi va "muhim" xabar bo'lsa — tepadan katta kompaniyalar
       ilovasidagi push bildirishnoma kabi kartochka tushadi.
     • Qaysi xabar o'qilgani telefonning o'zida saqlanadi
       (localStorage) — hech qanday shaxsiy ma'lumot yuborilmaydi.
   ================================================================== */
let MSGS = [];
const MSG_KEY = 'vip_xabar_oqildi';

function msgOqilgan(){
  try{ return JSON.parse(localStorage.getItem(MSG_KEY) || '[]') || []; }catch(e){ return []; }
}
function msgOqilganYoz(ids){
  try{ localStorage.setItem(MSG_KEY, JSON.stringify(ids.slice(-200))); }catch(e){}
}
function msgOqilmagan(){
  const o = new Set(msgOqilgan());
  return MSGS.filter(m => !o.has(m.id));
}
function msgVaqt(ms){
  const d = Number(ms) || 0;
  if(!d) return '';
  const farq = Date.now() - d;
  const daq = Math.floor(farq / 60000);
  if(daq < 1) return t('hozir');
  if(daq < 60) return daq + ' ' + t('daqiqa oldin');
  const soat = Math.floor(daq / 60);
  if(soat < 24) return soat + ' ' + t('soat oldin');
  const kun = Math.floor(soat / 24);
  if(kun === 1) return t('kecha');
  if(kun < 7) return kun + ' ' + t('kun oldin');
  try{
    /* V121: `uz-UZ` lokali brauzerda sanani ISO tartibida beradi, shu
       sabab o'zbekcha ko'rinish O'ZIMIZDA yig'iladi. Ruscha esa
       lokalning o'zidan olinadi (u to'g'ri ishlaydi). */
    if(LANG === 'ru') return new Date(d).toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
    const OYLAR = ['yan','fev','mar','apr','may','iyn','iyl','avg','sen','okt','noy','dek'];
    const dd = new Date(d);
    return dd.getDate() + '-' + OYLAR[dd.getMonth()];
  }catch(e){ return ''; }
}

/* Faqat yoqilgan va muddati o'tmagan xabarlar */
function msgFiltr(list){
  const hozir = Date.now();
  return (list || [])
    .filter(m => m && m.id && m.title)
    .filter(m => m.active !== false)
    .filter(m => !m.until || Number(m.until) > hozir)
    .sort((a,b) => (Number(b.at) || 0) - (Number(a.at) || 0))
    .slice(0, 30);
}

async function xabarlarniYukla(){
  try{
    const doc = await withClientTimeout(
      db.collection('site_settings').doc('xabarlar').get(), kutishVaqti(9000));
    if(!doc.exists) return;
    MSGS = msgFiltr((doc.data() || {}).list);
    try{ localStorage.setItem('vip_xabar_kesh', JSON.stringify(MSGS)); }catch(e){}
    msgBelginiYangila();
    msgPushniKorsat();
  }catch(e){}
}
function xabarlarKeshdan(){
  try{
    const c = localStorage.getItem('vip_xabar_kesh');
    if(c){ MSGS = msgFiltr(JSON.parse(c)); msgBelginiYangila(); }
  }catch(e){}
}

function msgBelginiYangila(){
  const n = msgOqilmagan().length;
  [['bellCnt','bellBtn'],['bellCnt2','bellBtn2']].forEach(([c])=>{
    const cnt = document.getElementById(c);
    if(!cnt) return;
    /* Tugmaga HECH QANDAY sinf qo'shilmaydi — u joyida qimirlamay
       turadi. Faqat kichik son ko'rinadi/yo'qoladi. */
    cnt.style.display = n ? '' : 'none';
    cnt.textContent = n > 9 ? '9+' : String(n);
  });
}

const IC_MSG   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5h16v11H8.5L4 20.5z"/></svg>';
const IC_OGOH  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l8.5 15H3.5z"/><path d="M12 10v4M12 16.5v.5"/></svg>';
const IC_FIRE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 3.2 5.5 5.6 5.5 9a5.5 5.5 0 0 1-11 0c0-1.7.8-3 2-4.3.3 1.3 1.1 2 2.2 2 .8-2.6.4-4.6 1.3-6.7z"/></svg>';

function msgIkon(kind){
  if(kind === 'ogoh') return IC_OGOH;
  if(kind === 'aksiya') return IC_FIRE;
  return IC_MSG;
}

function openXabarlar(){
  pushniYop();                       /* tepadagi bildirishnoma yo'q bo'lsin */
  $('#genTitle').textContent = t('Xabarlar');
  $('#genFoot').style.display = 'none';
  renderXabarlar();
  openSheet('shGen');
  /* DIQQAT: oyna ochilgani bilan hammasi "o'qilgan" bo'lib
     QOLMAYDI. Katta ilovalardagi kabi: har bir xabar BOSILGANDA
     ochiladi va aynan o'sha o'qilgan hisoblanadi. Shunda mijoz
     qaysinisini ko'rganini aniq biladi. */
  try{ if(typeof track === 'function') track('xabarlar_ochildi'); }catch(e){}
}

/* Bitta xabarni ochish/yopish */
function msgBos(id){
  const karta = document.querySelector('.msg[data-msg="' + CSS.escape(id) + '"]');
  if(!karta) return;
  const ochiq = karta.classList.toggle('open');
  if(ochiq && karta.classList.contains('unread')){
    karta.classList.remove('unread');
    const o = msgOqilgan();
    if(o.indexOf(id) === -1){ o.push(id); msgOqilganYoz(o); }
    msgBelginiYangila();
    try{ haptic('light'); }catch(e){}
  }
}

function renderXabarlar(){
  const body = $('#genBody'); if(!body) return;
  if(!MSGS.length){
    body.innerHTML = emptyBox(IC_MSG, t('Xabar yo\'q'),
      LANG === 'ru' ? 'Новых сообщений пока нет.' : "Hozircha yangi xabar yo'q.", null);
    return;
  }
  const oqilgan = new Set(msgOqilgan());
  const yangiSon = MSGS.filter(m => !oqilgan.has(m.id)).length;

  /* Tepada qisqa sarhisob — nechtasi o'qilmagani darhol ko'rinadi */
  const bosh = yangiSon
    ? `<div class="msg-head"><span class="msg-nuq"></span>${esc(yangiSon + ' ' + t('ta yangi xabar'))}
         <button type="button" class="msg-all" id="msgAll">${t('Hammasini o\'qildi')}</button></div>`
    : `<div class="msg-head done">${IC_OK_S}${esc(t('Hammasi o\'qilgan'))}</div>`;

  body.innerHTML = bosh + MSGS.map(m => {
    const yangi = !oqilgan.has(m.id);
    const kind = String(m.kind || 'xabar');
    return `<div class="msg k-${esc(kind)}${yangi ? ' unread' : ''}" data-msg="${esc(m.id)}">
      <button type="button" class="msg-qator" data-msgopen="${esc(m.id)}">
        <span class="msg-ic">${m.image ? `<img src="${esc(m.image)}" alt="" loading="lazy" decoding="async">` : msgIkon(kind)}</span>
        <span class="msg-b">
          <span class="msg-t">${esc(m.title)}</span>
          ${m.body ? `<span class="msg-p">${esc(m.body)}</span>` : ''}
          <span class="msg-d">${esc(msgVaqt(m.at))}</span>
        </span>
        <span class="msg-dot" aria-hidden="true"></span>
        <span class="msg-chev" aria-hidden="true">${IC_CHEV}</span>
      </button>
      <div class="msg-ochiq"><div class="msg-ichki">
        ${m.body ? `<div class="msg-x">${esc(m.body)}</div>` : ''}
        ${m.link ? `<button class="msg-go" data-msglink="${esc(m.link)}">${esc(m.linkText || t("Ko'rish"))}</button>` : ''}
      </div></div>
    </div>`;
  }).join('');
}

const IC_OK_S = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IC_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>';

/* "Hammasini o'qildi" */
function msgHammasi(){
  msgOqilganYoz(MSGS.map(m => m.id));
  msgBelginiYangila();
  renderXabarlar();
  try{ haptic('ok'); }catch(e){}
}

/* ---- Telefonga tushadigan push ko'rinishi ----
   Faqat BIR MARTA, faqat eng yangi o'qilmagan xabar uchun va faqat
   admin "muhim" belgisini qo'ygan bo'lsa chiqadi. */
let pushTimer = null;
function msgPushniKorsat(){
  const box = document.getElementById('pushBox'); if(!box) return;
  const oqilmagan = msgOqilmagan().filter(m => m.push !== false);
  const m = oqilmagan[0];
  if(!m) return;
  try{
    const k = 'vip_push_' + m.id;
    if(sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
  }catch(e){}

  const nom = document.getElementById('pushTitle');
  const mat = document.getElementById('pushBody');
  const vaq = document.getElementById('pushWhen');
  if(nom) nom.textContent = m.title || '';
  if(mat) mat.textContent = m.body || '';
  if(vaq) vaq.textContent = msgVaqt(m.at);

  box.style.display = 'flex';
  /* `display` qo'yilgach, o'tish (transition) ishlashi uchun brauzer
     boshlang'ich holatni bir marta hisoblab olishi kerak. Ilgari bu
     ikkita requestAnimationFrame bilan qilinardi — lekin telefon band
     bo'lsa rAF sekinlashadi va bildirishnoma bir necha soniya kechikib
     chiqardi. Endi qisqa taymer: band telefonda ham o'z vaqtida. */
  void box.offsetWidth;
  setTimeout(()=>{
    box.classList.add('show');
    try{ haptic('ok'); }catch(e){}
  }, 40);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushniYop, 7000);

  box.onclick = ()=>{ if(box.surilganmi && box.surilganmi()) return; pushniYop(); setTimeout(openXabarlar, 180); };

  /* Surib yuborish — saytdagi boshqa bildirishnomalar bilan BIR XIL:
     yonga sursa yonga, yuqoriga sursa yuqoriga uchib ketadi. */
  if(!box.__surish){
    box.__surish = 1;
    surishBogla(box, {
      yon: 'tepa',
      asos: 'translateX(-50%) ',
      toxtat: ()=> clearTimeout(pushTimer),
      davom:  ()=> { clearTimeout(pushTimer); pushTimer = setTimeout(pushniYop, 4000); },
      yopish: ()=>{
        /* Qo'lda uchirilganda `transform` biz qo'ygan holatda qoladi —
           shu sabab avval tozalab, keyin yashiramiz. */
        clearTimeout(pushTimer);
        box.classList.remove('show');
        box.style.transition = ''; box.style.transform = ''; box.style.opacity = '';
        box.style.display = 'none';
      }
    });
  }
}
function pushniYop(){
  const box = document.getElementById('pushBox'); if(!box) return;
  clearTimeout(pushTimer);
  box.classList.remove('show'); box.classList.add('go');
  setTimeout(()=>{ box.classList.remove('go'); box.style.display = 'none'; }, 560);
}

/* ==================================================================
   STORY KO'RISH OYNASI
   ------------------------------------------------------------------
   Boshqaruv:
     • o'ng tomonni bossa — keyingisi, chap tomonni — oldingisi;
     • 5 soniyada o'zi keyingisiga o'tadi (tepadagi chiziq bilan);
     • bosib turganda TO'XTAYDI, qo'yib yuborganda QOLGAN vaqtdan
       davom etadi (ilgari har doim 1.8 s qo'yilardi — noto'g'ri edi);
     • pastga sursa yoki ✕ — yopiladi;
     • yurakcha yoki IKKI MARTA bosish — "yoqdi" (telefonda eslanadi);
     • keyingi rasm oldindan yuklanadi — o'tish paytida kutish yo'q.

   HISOBLAGICHLAR server funksiyasi orqali (api-story-stat): brauzer
   bazaga to'g'ridan yozmaydi, shu sabab hisobni soxtalashtirib
   bo'lmaydi. Server javobida yangi sonlar qaytadi.
   ================================================================== */
const ST_DAVOM = 5000;        // bitta RASM kadri necha millisekund turadi
let ST_QOLDI = ST_DAVOM;      // to'xtatilganda qolgan vaqt
let ST_YURDI = 0;             // hozirgi kadr qachon boshlangan
let ST_KADR = 0;              // hozirgi story ichidagi kadr raqami
let ST_OVOZ = false;          // video ovozi yoqilganmi (mijoz tanlaydi)
let ST_NAVBAT = 0;            // yuklash navbati (eskisi bekor qilinadi)
const STORY_OBJS = {};        // savdo raqamlari — buyurtma oynasi uchun

/* Server funksiyasiga so'rov. Javob kelmasa — jim o'tib ketamiz
   (hisoblagich sayt ishlashiga ta'sir qilmaydi). */
async function stStat(amal, id){
  try{
    const r = await fetch(FN + 'api-story-stat', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ amal, id })
    });
    if(!r.ok) return null;
    const j = await r.json();
    return (j && j.ok) ? j : null;
  }catch(e){ return null; }
}

/* Hozirgi story'ning kadrlari */
function stvKadrlar(){
  const s = STORIES[ST_IDX];
  return s ? stKadrlar(s) : [];
}

function stvVideoni(toxtat){
  const vd = $('#stvVid');
  if(!vd) return;
  try{ if(toxtat) vd.pause(); else if(vd.src) vd.play().catch(()=>{}); }catch(e){}
}

function stvYop(){
  clearTimeout(ST_TIMER);
  ST_NAVBAT++;                /* kutayotgan yuklash bekor bo'lsin */
  const yk = $('#stvYuk'); if(yk) yk.style.display = 'none';
  const vd = $('#stvVid');
  if(vd){ try{ vd.pause(); vd.removeAttribute('src'); vd.load(); }catch(e){} }
  const v = $('#stView');
  if(v){
    /* Qaytishda ham o'sha kartochkaga "yig'iladi". Agar lenta
       aylantirilgan bo'lsa, joyi qaytadan o'lchanadi. */
    stvManbaOlchov(ST_MANBA);
    v.classList.add('ketmoqda');
    v.classList.remove('savdo-bor');
    const vt = v;
    setTimeout(()=>{
      vt.classList.remove('on');
      vt.classList.remove('ketmoqda');
    }, 240);
  }
  document.body.style.overflow = '';
  ST_IDX = -1;
  ST_MANBA = null;
}

function stvKorildi(s){
  /* Ko'rishlar: shu seansda bir marta. Server ham IP bo'yicha
     takrorini sanamaydi — ya'ni ikki qatlam himoya. */
  let kor;
  try{ kor = new Set(JSON.parse(sessionStorage.getItem(ST_KOR_KEY) || '[]')); }
  catch(e){ kor = new Set(); }
  if(kor.has(s.id)) return;
  kor.add(s.id);
  try{ sessionStorage.setItem(ST_KOR_KEY, JSON.stringify(Array.from(kor).slice(-200))); }catch(e){}
  stStat('kor', s.id);
  renderStories();        /* halqa "ko'rilgan" holatiga o'tadi */
}

/* ---------- RASM KESHI ----------
   V88 (mijoz so'rovi: "oq bo'lib turib keyin ochilyabdi").
   Ilgari faqat KEYINGI bitta rasm oldindan yuklanardi — mijoz tez
   bossa, rasm hali kelmagan bo'lardi va kadr BO'SH ochilardi.
   Endi: story ochilishi bilan uning HAMMA rasmlari (10 tagacha,
   har biri ~200 KB) va keyingi story'ning birinchi rasmi oldindan
   yuklanadi. Rasm obyektlari shu keshda saqlanadi — demak kadr
   almashganda brauzer uni qaytadan so'ramaydi, DARHOL chizadi. */
const ST_RASM_KESH = new Map();

function stvRasmOl(url){
  let im = ST_RASM_KESH.get(url);
  if(!im){
    im = new Image();
    im.decoding = 'async';
    im.src = url;
    ST_RASM_KESH.set(url, im);
    /* Kesh cheksiz o'smasin */
    if(ST_RASM_KESH.size > 40){
      const birinchi = ST_RASM_KESH.keys().next().value;
      ST_RASM_KESH.delete(birinchi);
    }
  }
  return im;
}
function stvRasmTayyor(url){
  const im = ST_RASM_KESH.get(url);
  return !!(im && im.complete && im.naturalWidth);
}

/* Hozirgi story'ning hamma rasmlari + keyingisining birinchisi */
function stvOldin(){
  stvKadrlar().forEach(k => { if(k.tur === 'rasm') stvRasmOl(k.url); });
  const s2 = STORIES[ST_IDX + 1];
  if(s2){
    const k2 = stKadrlar(s2).find(k => k.tur === 'rasm');
    if(k2) stvRasmOl(k2.url);
  }
}

/* ---------- SAVDO BLOKI ----------
   Admin kadrga raqam va narx qo'ygan bo'lsa, pastda kartochka chiqadi.
   Bosilganda saytning O'Z buyurtma oynasi ochiladi: raqam katalogda
   bo'lsa o'sha hujjat, bo'lmasa "jonli" raqam sifatida (xuddi kun
   tavsiyasidagi kabi) — shu sabab buyurtma bazaga to'g'ri yoziladi. */
function stvSavdoChiz(kadr){
  const box = $('#stvSavdo'), v = $('#stView');
  const sv = kadr && kadr.savdo;
  if(!sv){ box.classList.remove('bor'); v.classList.remove('savdo-bor'); return; }

  const raqamlar = String(sv.raqam || '').replace(/\D/g, '').slice(-9);
  const bor = NUMBERS.find(n => String(n.number || '').replace(/\D/g, '').slice(-9) === raqamlar);
  const narx = Number(sv.narx) || 0;
  const oyiga = Number(sv.oyiga) || 0;
  const eski = Number(sv.eskiNarx) || 0;

  $('#stvSvRaqam').textContent = bor ? shortNumber(bor.number) : stvRaqamChiroy(raqamlar);
  /* Narx BIR QATORDA sig'ishi kerak (ekran surati bilan tekshirildi:
     uzun matn ikki qatorga tushib, kartochka siqilib qolardi).
     Bo'lib to'lash bo'lsa — oylik summa, aks holda to'liq narx;
     eski narx esa faqat bo'lib to'lash YO'Q paytda chizib ko'rsatiladi. */
  $('#stvSvNarx').innerHTML = oyiga
    ? esc(formatPrice(oyiga)) + ' ' + esc(t("so'm")) + '/' + esc(t('oy'))
    : esc(formatPrice(narx)) + ' ' + esc(t("so'm"))
      + (eski > narx ? '<s>' + esc(formatPrice(eski)) + '</s>' : '');
  $('#stvSvBtn').textContent = t('Buyurtma');

  /* Katalogda bo'lmasa — "jonli" raqam yasaymiz */
  const id = bor ? bor.id : ('story:' + raqamlar);
  if(!bor){
    STORY_OBJS[id] = {
      id, number: '+998 ' + stvRaqamChiroy(raqamlar), operator: sv.operator || '',
      price: narx, oldPrice: eski, installment: oyiga > 0, monthly24: oyiga,
      currency: 'UZS', live: true, reserved: false, tier: sv.tier || ''
    };
  }
  $('#stvSvBtn').onclick = (e)=>{
    e.stopPropagation();
    stvYop();
    setTimeout(()=>{ try{ openOrder(id); }catch(err){} }, 120);
  };
  box.classList.add('bor');
  v.classList.add('savdo-bor');
}
/* "901234567" -> "90 123 45 67" */
function stvRaqamChiroy(d){
  d = String(d || '').replace(/\D/g, '');
  if(d.length !== 9) return d;
  return d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5,7) + ' ' + d.slice(7);
}

/* Tepadagi vaqt chiziqlari — HOZIRGI story'ning KADRLARI bo'yicha
   (Instagram'dagi kabi: har bir rasm/video uchun alohida chiziq). */
function stvChiziqlar(jami, davom){
  $('#stvBars').innerHTML = Array.from({ length: jami }, (_, i) =>
    `<i class="${i < ST_KADR ? 'tugadi' : (i === ST_KADR ? 'hozir' : '')}"><span></span></i>`).join('');
  const hozir = $('#stvBars .hozir span');
  if(hozir) hozir.style.animationDuration = Math.max(600, davom) + 'ms';
}

/* Yangi kadr qaysi tomondan kirib kelsin: +1 o'ngdan, -1 chapdan,
   0 — animatsiyasiz (oyna endi ochilganda). */
let ST_YON = 0;

function stvOtish(ram){
  ram.classList.remove('kir-ong', 'kir-chap', 'suriladi', 'qaytadi');
  ram.style.transform = '';
  if(!ST_YON) return;
  /* Animatsiyani qayta ishga tushirish uchun brauzerni "uyg'otamiz" */
  void ram.offsetWidth;
  ram.classList.add(ST_YON > 0 ? 'kir-ong' : 'kir-chap');
}

function stvChiz(){
  const s = STORIES[ST_IDX];
  if(!s){ stvYop(); return; }
  const kadrlar = stvKadrlar();
  if(!kadrlar.length){ stvKeyingi(1); return; }
  if(ST_KADR >= kadrlar.length) ST_KADR = kadrlar.length - 1;
  if(ST_KADR < 0) ST_KADR = 0;
  const kadr = kadrlar[ST_KADR];
  const likes = stSet(ST_LIKE_KEY);

  const ram = $('#stvRamka'), im = $('#stvImg'), fon = $('#stvFon'), vd = $('#stvVid'), ov = $('#stvOvoz');
  clearTimeout(ST_TIMER);

  /* ---------- TAYYOR BO'LMAGUNCHA ESKI KADR TURADI ----------
     Mijoz so'rovi: "yonni bossa rasm oq bo'lib turib keyin ochilyabdi".
     Sabab — kadr darhol almashtirilardi, rasm esa keyin kelardi.
     Endi tartib boshqacha: avval media TAYYORLANADI, faqat shundan
     keyin ekran almashadi. Kutilayotgan paytda eski kadr ko'rinib
     turadi va ustida kichik aylana aylanadi (180 ms dan keyin — ya'ni
     keshdagi rasmda u umuman ko'rinmaydi).
     `navbat` — mijoz kutmasdan yana bossa, eski yuklash BEKOR bo'ladi
     va ekranda faqat oxirgi tanlangan kadr chiziladi. */
  const navbat = ++ST_NAVBAT;
  const yuk = $('#stvYuk');
  const yukKorsat = (b)=>{ if(yuk) yuk.style.display = b ? '' : 'none'; };

  function chizib(davom){
    if(navbat !== ST_NAVBAT) return;        /* mijoz boshqa kadrga o'tdi */
    yukKorsat(false);
    ram.classList.remove('keldi'); im.classList.remove('keldi');
    fon.classList.remove('keldi'); vd.classList.remove('keldi');
    stvOtish(ram);

    if(kadr.tur === 'video'){
      im.removeAttribute('src'); im.style.display = 'none';
      fon.removeAttribute('src');
      vd.style.display = '';
      ov.classList.add('bor');
      vd.muted = !ST_OVOZ;
      stvOvozIc();
      ram.classList.add('keldi'); vd.classList.add('keldi');
      try{ vd.currentTime = 0; vd.play().catch(()=>{}); }catch(e){}
    }else{
      try{ vd.pause(); vd.removeAttribute('src'); }catch(e){}
      vd.style.display = 'none';
      ov.classList.remove('bor');
      im.style.display = '';
      im.src = kadr.url;
      fon.src = kadr.url;        /* xira orqa fon — o'sha rasmning nusxasi */
      ram.classList.add('keldi'); im.classList.add('keldi'); fon.classList.add('keldi');
    }

    $('#stvAva').src = stRasmOk(s.doira) ? s.doira : (kadr.tur === 'rasm' ? kadr.url : '');
    $('#stvNom').textContent = s.nom || '';
    const lk = $('#stvLike');
    lk.classList.toggle('on', likes.has(s.id));
    $('#stvLikeN').textContent = stSonAniq(stLikeSoni(s));
    stvSavdoChiz(kadr);
    stvHavola(s, kadr);

    stvChiziqlar(kadrlar.length, davom);
    ST_QOLDI = davom; ST_YURDI = Date.now();
    clearTimeout(ST_TIMER);
    ST_TIMER = setTimeout(()=> stvKeyingi(1), davom);

    stvKorildi(s);
    stvOldin();
  }

  if(kadr.tur === 'video'){
    /* ---- VIDEO: birinchi kadri kelguncha kutamiz ---- */
    vd.src = kadr.url;
    const boshla = ()=>{
      const d = Math.min(30000, Math.max(1500,
        (isFinite(vd.duration) && vd.duration > 0) ? vd.duration * 1000 : (kadr.davomMs || 8000)));
      chizib(d);
    };
    if(vd.readyState >= 2) boshla();
    else{
      yukKorsat(true);
      vd.onloadeddata = boshla;
      vd.onerror = ()=>{ if(navbat === ST_NAVBAT){ yukKorsat(false); stvKeyingi(1); } };
      /* Juda sekin internet — 6 soniyadan keyin baribir ko'rsatamiz */
      setTimeout(()=>{ if(navbat === ST_NAVBAT && vd.readyState < 2) boshla(); }, 6000);
    }
  }else{
    /* ---- RASM: keshda bo'lsa DARHOL, bo'lmasa kelguncha kutamiz ---- */
    if(stvRasmTayyor(kadr.url)){
      chizib(ST_DAVOM);
    }else{
      yukKorsat(true);
      const rasm = stvRasmOl(kadr.url);
      const tayyor = ()=>{ chizib(ST_DAVOM); };
      rasm.addEventListener('load', tayyor, { once: true });
      rasm.addEventListener('error', ()=>{
        if(navbat === ST_NAVBAT){ yukKorsat(false); stvKeyingi(1); }
      }, { once: true });
      /* Zaxira: 4 soniyada kelmasa ham ekranni band qilib turmaymiz */
      setTimeout(()=>{ if(navbat === ST_NAVBAT && yuk && yuk.style.display !== 'none') chizib(ST_DAVOM); }, 4000);
    }
  }
}

/* Havola tugmasi (savdo bloki bo'lmagan kadrlarda) */
function stvHavola(s, kadr){
  const go = $('#stvGo');

  /* XAVFSIZLIK: havola FAQAT https:// yoki saytning o'z bo'limi (#/...)
     bo'lsa ko'rsatiladi. Boshqa har qanday havola (javascript:, data:,
     http:) butunlay e'tiborsiz qoldiriladi. */
  const hav = String(s.havola || '').trim();
  const havOk = /^https:\/\/[^\s"'<>]+$/i.test(hav) || /^#\/[A-Za-z0-9\-\/]*$/.test(hav);
  if(havOk && !(kadr && kadr.savdo)){
    go.style.display = '';
    go.textContent = t("Ko'rish");
    go.href = hav;
    go.rel = 'noopener noreferrer';
    if(/^https:/i.test(hav)) go.target = '_blank'; else go.removeAttribute('target');
  }else{
    go.style.display = 'none';
    go.removeAttribute('href');
  }
}

function stvOvozIc(){
  const on = ST_OVOZ;
  $('#stvOvozIc').innerHTML = on
    ? '<path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M16.5 8.5a5 5 0 0 1 0 7"></path>'
    : '<path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M17 10l4 4M21 10l-4 4"></path>';
}

/* Keyingi/oldingi: avval KADRLAR ichida yuradi, tugasa — keyingi story */
function stvKeyingi(yon){
  ST_YON = yon > 0 ? 1 : -1;
  const kadrlar = stvKadrlar();
  const yangiKadr = ST_KADR + yon;
  if(yangiKadr >= 0 && yangiKadr < kadrlar.length){
    ST_KADR = yangiKadr;
    stvChiz();
    return;
  }
  const yangi = ST_IDX + yon;
  if(yangi < 0){ ST_KADR = 0; stvChiz(); return; }
  if(yangi >= STORIES.length){ stvYop(); return; }
  ST_IDX = yangi;
  /* Orqaga qaytganda oldingi story'ning OXIRGI kadridan boshlanadi */
  ST_KADR = (yon < 0) ? Math.max(0, stKadrlar(STORIES[yangi]).length - 1) : 0;
  stvChiz();
}

/* Oyna QAYSI kartochkadan ochilganini eslab qolamiz — yopilganda
   aynan o'sha joyga qaytadi (Instagram/TikTok'dagi kabi). */
let ST_MANBA = null;

/* Oynani bosilgan kartochkaning JOYIDAN ochish.
   Qanday ishlaydi: kartochkaning ekrandagi o'rni o'lchanadi va oynaga
   CSS o'zgaruvchilari sifatida beriladi; CSS esa oynani o'sha nuqtadan
   kattalashtirib chiqaradi. Faqat `transform` va `opacity` o'zgaradi —
   ya'ni animatsiya videokartada bajariladi, sahifa qayta chizilmaydi. */
function stvManbaOlchov(el){
  const v = $('#stView');
  if(!v) return;
  if(!el || !el.getBoundingClientRect){
    v.style.removeProperty('--stv-x');
    v.style.removeProperty('--stv-y');
    v.style.removeProperty('--stv-s');
    return;
  }
  const q = el.getBoundingClientRect();
  const ekW = window.innerWidth, ekH = window.innerHeight;
  /* Kartochka markazidan ekran markazigacha bo'lgan siljish */
  const dx = (q.left + q.width / 2) - ekW / 2;
  const dy = (q.top + q.height / 2) - ekH / 2;
  const s = Math.max(0.12, Math.min(0.6, q.width / ekW));
  v.style.setProperty('--stv-x', dx.toFixed(1) + 'px');
  v.style.setProperty('--stv-y', dy.toFixed(1) + 'px');
  v.style.setProperty('--stv-s', s.toFixed(3));
}

function stvOch(i, manba){
  if(!STORIES.length) return;
  ST_IDX = Math.max(0, Math.min(STORIES.length - 1, Number(i) || 0));
  ST_KADR = 0;
  ST_YON = 0;                 /* oyna ochilganda yon animatsiya kerak emas */
  ST_MANBA = manba || null;
  const v = $('#stView');
  stvManbaOlchov(ST_MANBA);
  v.classList.remove('ketmoqda');
  v.classList.add('on');
  document.body.style.overflow = 'hidden';
  stvChiz();
  try{ haptic('ok'); }catch(e){}
}

/* Ekran o'rtasida uchib chiqadigan katta yurakcha */
function stvPuf(){
  const v = $('#stView'); if(!v) return;
  const d = document.createElement('div');
  d.className = 'stv-puf';
  d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4S3.6 15 3.6 9.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.4 2.4c0 5.6-8.4 11-8.4 11z"/></svg>';
  v.appendChild(d);
  setTimeout(()=>{ try{ d.remove(); }catch(e){} }, 820);
}

/* yoqdi/olib tashlash. `puf` — o'rtada yurakcha ko'rsatilsinmi. */
function stvLike(puf){
  const s = STORIES[ST_IDX];
  if(!s) return;
  const likes = stSet(ST_LIKE_KEY);
  const bor = likes.has(s.id);
  if(bor) likes.delete(s.id); else likes.add(s.id);
  stSaqla(ST_LIKE_KEY, likes);

  /* Ekranda DARHOL o'zgaradi (serverni kutmaymiz) */
  s.likes = Math.max(0, (Number(s.likes) || 0) + (bor ? -1 : 1));
  $('#stvLike').classList.toggle('on', !bor);
  $('#stvLikeN').textContent = stSonAniq(stLikeSoni(s));
  if(!bor && puf !== false) stvPuf();
  try{ haptic(bor ? 'light' : 'ok'); }catch(e){}

  /* Server haqiqiy sonni qaytarsa — moslashtiramiz */
  stStat(bor ? 'like-ol' : 'like', s.id).then(j => {
    if(!j) return;
    if(typeof j.likes === 'number') s.likes = j.likes;
    if(typeof j.likesBaza === 'number') s.likesBaza = j.likesBaza;
    if(STORIES[ST_IDX] === s) $('#stvLikeN').textContent = stSonAniq(stLikeSoni(s));
    try{ stKeshYoz(); }catch(e){}
  });
}

(function stvBogla(){
  const v = document.getElementById('stView');
  if(!v) return;
  document.getElementById('stvClose').addEventListener('click', stvYop);
  document.getElementById('stvLike').addEventListener('click', ()=> stvLike(true));
  document.getElementById('stvGo').addEventListener('click', ()=> setTimeout(stvYop, 60));
  document.getElementById('stvOvoz').addEventListener('click', (e)=>{
    e.stopPropagation();
    ST_OVOZ = !ST_OVOZ;
    const vd = document.getElementById('stvVid');
    if(vd) vd.muted = !ST_OVOZ;
    stvOvozIc();
  });

  /* ----- Chap/o'ng zona: BIR marta bosish — o'tish,
           IKKI marta bosish — "yoqdi" (haqiqiy ilovalardagi kabi).
           Shu sabab bitta bosishni 240 ms kutib turamiz. ----- */
  let ikki = null;
  /* SURILDIMI. Brauzer qisqa surishdan keyin ham `click` yuboradi —
     natijada barmoq bilan ozgina surib qo'yib yuborilsa, kadr
     surishdan ham, "bosish" dan ham o'tib ketardi (sinovda aniqlandi:
     25 px surishdan keyin kadr almashib qolardi). Shu sabab surish
     bo'lgan bo'lsa, undan keyingi bitta `click` e'tiborsiz qoldiriladi. */
  let surildi = false;
  function zona(yon){
    return ()=>{
      if(surildi){ surildi = false; return; }
      if(ikki){ clearTimeout(ikki); ikki = null; stvLike(true); return; }
      ikki = setTimeout(()=>{ ikki = null; stvKeyingi(yon); }, 240);
    };
  }
  document.getElementById('stvNext').addEventListener('click', zona(1));
  document.getElementById('stvPrev').addEventListener('click', zona(-1));

  /* ----- Surish: PASTGA — yopish, YONGA — kadr almashtirish -----
     O'Q QULFI: barmoq qaysi tomonga ko'proq surilgan bo'lsa, shu
     yo'nalish tanlanadi va gesture oxirigacha o'zgarmaydi. Aks holda
     biroz qiyshiq surilganda oyna ham yopilib, kadr ham almashardi. */
  let y0 = null, x0 = null, oq = null, dx = 0, toxtadi = false;
  const RAM = ()=> v.querySelector('.stv-ramka');
  const YON_CHEK = 64;          /* shuncha pikseldan keyin kadr almashadi */
  function toxtat(){
    clearTimeout(ST_TIMER);
    ST_QOLDI = Math.max(300, ST_QOLDI - (Date.now() - ST_YURDI));
    const b = v.querySelector('.stv-bars .hozir span');
    if(b) b.style.animationPlayState = 'paused';
    stvVideoni(true);
  }
  function davom(){
    const b = v.querySelector('.stv-bars .hozir span');
    if(b) b.style.animationPlayState = '';
    ST_YURDI = Date.now();
    clearTimeout(ST_TIMER);
    ST_TIMER = setTimeout(()=> stvKeyingi(1), ST_QOLDI);
    stvVideoni(false);
  }
  v.addEventListener('pointerdown', (e)=>{
    y0 = e.clientY; x0 = e.clientX; oq = null; dx = 0;
    surildi = false;
    toxtadi = true; toxtat();
  });
  v.addEventListener('pointermove', (e)=>{
    if(y0 === null) return;
    const dy = e.clientY - y0;
    dx = e.clientX - x0;
    /* O'q hali tanlanmagan bo'lsa — qaysi tomon kuchliroq */
    if(!oq && (Math.abs(dx) > 10 || Math.abs(dy) > 10)){
      oq = Math.abs(dx) > Math.abs(dy) ? 'yon' : 'tik';
      surildi = true;                 /* keyingi `click` o'tkazib yuboriladi */
      if(oq === 'yon'){ const r = RAM(); if(r) r.classList.add('suriladi'); }
    }
    /* V133: yozuvlar kadriga bittaga tenglashtiriladi — storiyalar
       eng ko'p surilsadigan joy, shu sabab farqi sezilarli. */
    if(oq === 'tik'){
      if(dy > 0){
        if(!v._yoz) v._yoz = kadrYozuvchi(v);
        v._yoz.qoy('translate3d(0,' + dy + 'px,0)');
      }
    }else if(oq === 'yon'){
      const r = RAM(); if(!r) return;
      /* Chekkadan tashqarida qarshilik (rubber-band) */
      const k = Math.abs(dx) > 150 ? 0.42 : 1;
      const surish = dx * k;
      const burchak = Math.max(-16, Math.min(16, -surish / 11));
      if(!r._yoz) r._yoz = kadrYozuvchi(r);
      r._yoz.qoy('translate3d(' + surish + 'px,0,0) rotateY('
        + burchak + 'deg) scale(' + (1 - Math.min(0.07, Math.abs(surish) / 2600)) + ')');
    }
  });
  const tugat = (e)=>{
    if(y0 === null) return;
    const dy = (e && e.clientY != null) ? e.clientY - y0 : 0;
    const sonDx = dx;
    const oqEdi = oq;
    y0 = null; x0 = null; oq = null; dx = 0;
    if(v._yoz) v._yoz.tugat();
    const rr = RAM(); if(rr && rr._yoz) rr._yoz.tugat();
    v.style.transform = '';

    if(oqEdi === 'yon'){
      const r = RAM();
      if(Math.abs(sonDx) > YON_CHEK){
        /* Chapga surish = KEYINGI (barmoq yo'nalishiga teskari — xuddi
           haqiqiy ilovadagi kabi: sahifani chapga itarasiz, keyingisi
           keladi) */
        if(r) r.classList.remove('suriladi');
        stvKeyingi(sonDx < 0 ? 1 : -1);
        return;
      }
      /* Yetarli surilmadi — joyiga qaytadi */
      if(r){
        r.classList.remove('suriladi');
        r.classList.add('qaytadi');
        r.style.transform = '';
        setTimeout(()=>{ try{ r.classList.remove('qaytadi'); }catch(e){} }, 280);
      }
      if(toxtadi){ toxtadi = false; davom(); }
      return;
    }

    if(dy > 90){ stvYop(); return; }
    if(toxtadi){ toxtadi = false; davom(); }
  };
  v.addEventListener('pointerup', tugat);
  v.addEventListener('pointercancel', tugat);

  /* Sayt orqa fonga o'tsa — vaqt bekorga yurmasin */
  document.addEventListener('visibilitychange', ()=>{
    if(!v.classList.contains('on')) return;
    if(document.hidden) toxtat(); else davom();
  });

  document.addEventListener('keydown', (e)=>{
    if(!v.classList.contains('on')) return;
    if(e.key === 'Escape') stvYop();
    if(e.key === 'ArrowRight') stvKeyingi(1);
    if(e.key === 'ArrowLeft') stvKeyingi(-1);
  });
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

  if(e.target.closest('[data-share]') && CURRENT){
    /* AVVAL bu yerda saytning BOSH SAHIFASI ulashilardi (location.origin) —
       do'stiga yuborilgan havolada qaysi raqam ekani ko'rinmasdi.
       Endi AYNAN SHU RAQAMNING manzili ulashiladi; Telegram va
       Instagram o'sha manzildagi `og:image` ni — raqam, operator va
       narx chizilgan kartochkani — ko'rsatadi
       (netlify/functions/og-raqam.js). */
    const raqamli = String(CURRENT.number || '').replace(/\D/g,'');
    const havola  = location.origin + '/raqam/' + raqamli;
    const txt = `${shortNumber(CURRENT.number)} — ${formatPriceUzs(CURRENT.price)} · VIP RAQAMLAR`;
    haptic('light');
    if(navigator.share){ navigator.share({ title:'VIP RAQAMLAR', text:txt, url:havola }).catch(()=>{}); }
    else { try{ navigator.clipboard.writeText(havola); toast(LANG==='ru'?'Ссылка скопирована':'Havola nusxalandi'); }catch(err){} }
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
    catNaqsh = ''; reshuffle(); renderCatalog(); closeSheet('shGen');
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

function openFilter(){
  $('#genTitle').textContent = t('Saralash');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = `<div class="rows">${SORTS.map(o => `
    <button class="row" data-sort="${o[0]}"><span class="rt"><b>${esc(t(o[1]))}</b></span>
      ${catSort===o[0] ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--blue)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg>' : ''}
    </button>`).join('')}</div>
    <button class="btn ghost" data-clearall style="margin-top:14px">${t('Hammasini tozalash')}</button>
    <div style="height:6px"></div>`;
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
    }
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
    try{ skSub($('#catCount')); }catch(e){}
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

