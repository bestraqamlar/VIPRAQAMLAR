// ADMIN PANELI UCHUN QO'SHIMCHA "ESHIK" (2-QATLAM HIMOYA).
//
// NEGA KERAK: panel-boshqaruv.html manzilining o'zi tasodifiy emas, ammo
// endi "boshqaruv" so'zi bor — bu esa sof tasodifiy nomdan (masalan
// "panel-xn3vbivfp72a33.html") ko'ra biroz OSONROQ taxmin qilinadigan.
// Shu sabab, hatto kimdir manzilni AYNAN topib olsa ham (masalan eski
// zaxira nusxa, log fayli yoki tasodifan ko'rib qolish orqali), sahifaning
// HTML kodi UMUMAN yuborilmaydi — brauzer birinchi navbatda alohida
// login/parol (HTTP darajasidagi, Firebase login ekranidan OLDIN
// so'raladigan) so'raydi. Bu — Firebase login (email+parol) va admin
// huquqi (custom claim) tekshiruvidan MUTLAQO ALOHIDA, qo'shimcha qatlam:
// hatto to'g'ri Firebase login-parolni bilgan odam ham, agar shu
// qo'shimcha kalitni bilmasa, sahifaning o'zini KO'RA OLMAYDI.
//
// SOZLASH (BIR MARTALIK, MAJBURIY):
//   Netlify saytingiz sozlamalarida (Site settings → Environment
//   variables) ikkita YANGI o'zgaruvchi qo'shing:
//     ADMIN_GATE_USER = <o'zingiz o'ylab topgan login, masalan tasodifiy so'z>
//     ADMIN_GATE_PASS = <uzun, kuchli, tasodifiy parol (20+ belgi tavsiya etiladi)>
//   Bularni HECH KIMGA aytmang, kodga yozmang — faqat Netlify muhitida
//   saqlanadi. O'zgartirgach, saytni qayta deploy qiling (Netlify buni
//   avtomatik so'raydi).
//
//   MUHIM: agar bu ikkala o'zgaruvchi HALI sozlanmagan bo'lsa — bu qo'shimcha
//   eshik ISHLAMAYDI (o'zingizni tasodifan tashqarida qoldirib
//   qo'ymaslik uchun ATAYLAB shunday qilingan) — sahifa oddiy, faqat
//   Firebase login ekrani bilan ochiladi (avvalgidek). Demak, HIMOYANI
//   HAQIQATDA YOQISH uchun ikkala o'zgaruvchini albatta sozlashingiz kerak.
//
// Sozlangandan keyin: panel-boshqaruv.html manziliga kirishga urinilganda,
// brauzer avval alohida oyna ochib login/parol so'raydi. Noto'g'ri yoki
// bo'sh bo'lsa — 401 xato qaytadi, HECH QANDAY sahifa tarkibi (HTML, JS,
// login formasi — hech narsa) yuborilmaydi.

export default async (request, context) => {
  const gateUser = Deno.env.get('ADMIN_GATE_USER');
  const gatePass = Deno.env.get('ADMIN_GATE_PASS');

  // Sozlanmagan bo'lsa — himoya o'chiq (yuqoridagi izohga qarang).
  if (!gateUser || !gatePass) {
    return context.next();
  }

  const authHeader = request.headers.get('authorization') || '';
  const expected = 'Basic ' + btoa(`${gateUser}:${gatePass}`);

  // Doimiy vaqtda solishtirish emas (constant-time emas), lekin bu
  // qo'shimcha, "ikkinchi qatlam" himoya — asosiy himoya baribir
  // Firebase Authentication + custom claim tekshiruvi (server tomonida,
  // requireAdmin() orqali) bo'lib qolaveradi.
  if (authHeader !== expected) {
    return new Response("Kirish taqiqlangan — login/parol noto'g'ri yoki kiritilmagan.", {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin panel", charset="UTF-8"',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      }
    });
  }

  return context.next();
};
