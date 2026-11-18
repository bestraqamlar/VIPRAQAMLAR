// ONLAYN TO'LOV — PAYME va CLICK (tarif obunasi uchun).
//
// HOZIRGI HOLAT. Tizim IKKI yo'lni ham qo'llaydi:
//
//   1) QO'LDA (hoziroq ishlaydi, hech narsa sozlash kerak emas).
//      Diler kabinetda "Pro olish" ni bosadi -> admin panelga so'rov
//      tushadi -> diler kartaga pul o'tkazadi -> admin "Tasdiqlash"
//      bosadi -> tarif yoqiladi.
//
//   2) ONLAYN (Payme / Click). Faqat Netlify muhit o'zgaruvchilari
//      qo'yilgandan keyin YOQILADI. Kalitlar yo'q bo'lsa, kabinetda
//      onlayn to'lov tugmasi UMUMAN ko'rinmaydi — ya'ni mijoz
//      ishlamaydigan tugmani bosib qolmaydi.
//
// KERAKLI MUHIT O'ZGARUVCHILARI (Netlify -> Site settings -> Environment):
//
//   PAYME_MERCHANT_ID   Payme kabinetidan (Merchant ID)
//   PAYME_KEY           Payme "Kassa kaliti" (X-Auth paroli).
//                       DIQQAT: bu kalit bilan to'lovlar tasdiqlanadi —
//                       hech kimga bermang, GitHub'ga YOZMANG.
//   CLICK_SERVICE_ID    Click kabinetidan (Service ID)
//   CLICK_MERCHANT_ID   Click Merchant ID
//   CLICK_SECRET_KEY    Click "Secret key"
//   CLICK_MERCHANT_USER_ID  Click Merchant User ID
//   SAYT_URL            https://vipraqamlar.uz  (to'lovdan keyin qaytish)
//
// MUHIM: kalitlarni qo'ygandan keyin provayderning SINOV (test)
// rejimida bir marta tekshirib ko'rish SHART — Payme va Click
// shartnomada "callback manzil" (quyidagi /tarif-callback) ni ham
// o'z kabinetida ro'yxatdan o'tkazishni talab qiladi.

const PAYME_CHECKOUT = 'https://checkout.paycom.uz/';
const CLICK_PAY = 'https://my.click.uz/services/pay';

const SAYT = () => (process.env.SAYT_URL || 'https://vipraqamlar.uz').replace(/\/+$/, '');

function paymeSozlanganmi() {
  return !!(process.env.PAYME_MERCHANT_ID && process.env.PAYME_KEY);
}
function clickSozlanganmi() {
  return !!(process.env.CLICK_SERVICE_ID && process.env.CLICK_MERCHANT_ID && process.env.CLICK_SECRET_KEY);
}

/**
 * Payme to'lov sahifasining manzili.
 * Payme summani TIYINDA oladi (1 so'm = 100 tiyin).
 * Parametrlar base64 qilingan "m=...;ac.key=...;a=...;c=..." satri.
 */
function paymeUrl(hisobId, somSumma) {
  if (!paymeSozlanganmi()) return '';
  const qism = [
    'm=' + process.env.PAYME_MERCHANT_ID,
    'ac.hisob=' + hisobId,
    'a=' + Math.round(Number(somSumma) * 100),
    'c=' + SAYT() + '/sotuvchi.html?tolov=payme',
    'l=uz'
  ].join(';');
  return PAYME_CHECKOUT + Buffer.from(qism, 'utf8').toString('base64');
}

/** Click to'lov sahifasining manzili. Click summani SO'MDA oladi. */
function clickUrl(hisobId, somSumma) {
  if (!clickSozlanganmi()) return '';
  const p = new URLSearchParams({
    service_id: String(process.env.CLICK_SERVICE_ID),
    merchant_id: String(process.env.CLICK_MERCHANT_ID),
    amount: String(Math.round(Number(somSumma))),
    transaction_param: String(hisobId),
    return_url: SAYT() + '/sotuvchi.html?tolov=click'
  });
  return CLICK_PAY + '?' + p.toString();
}

/** Kabinetga "qaysi usullar bor" deb aytish uchun. */
function usullar() {
  return { qolda: true, payme: paymeSozlanganmi(), click: clickSozlanganmi() };
}

module.exports = { paymeSozlanganmi, clickSozlanganmi, paymeUrl, clickUrl, usullar, SAYT };
