// MIJOZ O'ZI SAYTDA "Shartnoma holatini tekshirish" qilganda ishlaydi.
//
// XAVFSIZLIK (MUHIM): shartnoma ID'lari ketma-ket (KR001, KR002, ...) —
// agar Firestore'dan to'g'ridan-to'g'ri (faqat ID bo'yicha) o'qishga ruxsat
// berilsa, kimdir barcha ID'larni "sinab" BARCHA mijozlarning ismi,
// telefoni, manzili va to'lov tarixini ko'rishi mumkin bo'lardi. Shu sababli
// bu tekshiruv endi shu yerda, SERVERDA bo'ladi: faqat shartnoma ID'si VA
// mijozning telefon raqami (oxirgi 9 raqami) ikkalasi TO'G'RI kelsagina
// ma'lumot qaytariladi. Firestore qoidalarida esa endi "credit_contracts"
// kolleksiyasini bevosita o'qish faqat admin uchun qoldirildi.

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}
const db = admin.firestore();
db.settings({ preferRest: true });

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try{
    const { contractId, phone } = JSON.parse(event.body || '{}');
    const idVal = String(contractId || '').trim().toUpperCase();
    const numVal = String(phone || '').replace(/\D/g, '');

    // Bir xil, umumiy xato xabari — "ID topilmadi" bilan "ID topildi, lekin
    // raqam mos kelmadi" holatlarini FARQLAB bo'lmasligi kerak, aks holda
    // kimdir shu farq orqali ham ID'larni "sinab" ko'rishi mumkin bo'lardi.
    const notFound = { statusCode: 200, body: JSON.stringify({ ok: false, error: "Ma'lumot topilmadi. ID va raqamni tekshiring." }) };

    if(!idVal || !numVal || numVal.length < 9) return notFound;

    const doc = await db.collection('credit_contracts').doc(idVal).get();
    if(!doc.exists) return notFound;

    const data = doc.data();
    const docNumDigits = (data.number || '').replace(/\D/g, '');
    if(!docNumDigits.endsWith(numVal.slice(-9))) return notFound;

    // Faqat mijozga kerakli maydonlarni qaytaramiz (admin uchun ichki
    // eslatmalar kabi narsalarni QAYTARMAYMIZ).
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        data: {
          customerName: data.customerName || '',
          number: data.number || '',
          totalMonths: data.totalMonths || 0,
          monthlyPayment: data.monthlyPayment || 0,
          contractStatus: data.contractStatus || 'active',
          payments: data.payments || []
        }
      })
    };
  }catch(err){
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
