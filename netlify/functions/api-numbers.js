// MOBIL ILOVA UCHUN OCHIQ API — raqamlar katalogini o'qish.
//
// Admin panelda nima o'zgartirilsa (narx, chegirma, band qilingan holat,
// yangi raqam qo'shilishi) — shu yerda DARHOL aks etadi, chunki bu
// to'g'ridan-to'g'ri saytdagi bazaning o'zidan o'qiydi.
//
// Chaqirish: GET /.netlify/functions/api-numbers
// Sarlavha:  x-api-key: <MOBILE_API_KEY muhit o'zgaruvchisi qiymati>
//
// Ixtiyoriy filtrlar (query parametr sifatida):
//   ?operator=Beeline        — faqat shu operator
//   ?onlyAvailable=true      — faqat band qilinmagan (mavjud) raqamlar
//   ?limit=50                — natijalar sonini cheklash (standart: hammasi)
//
// Javob (JSON):
// {
//   "ok": true,
//   "count": 42,
//   "numbers": [
//     {
//       "id": "abc123",
//       "number": "+998901234567",
//       "operator": "Beeline",
//       "price": 4900000,
//       "oldPrice": 10000000,
//       "installment": true,
//       "reserved": false,
//       "featured": true,
//       "dailyDeal": false
//     },
//     ...
//   ]
// }

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

// XAVFSIZLIK: oddiy API-kalit orqali himoyalangan — faqat kalitni bilgan
// ilova (sizning mobil ilovangiz) so'rov yubora oladi. Kalitni Netlify
// muhit o'zgaruvchilarida ("Environment variables") MOBILE_API_KEY nomi
// bilan saqlang, va ilovangizga xuddi shu qiymatni bering.
function checkApiKey(event) {
  const expected = process.env.MOBILE_API_KEY;
  if (!expected) return true; // kalit hali sozlanmagan bo'lsa — vaqtincha ochiq (ma'lumot allaqachon ommaviy)
  const provided = (event.headers && (event.headers['x-api-key'] || event.headers['X-Api-Key'])) || '';
  return provided === expected;
}

exports.handler = async function (event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat GET so\'rovlariga ruxsat berilgan' }) };
  }
  if (!checkApiKey(event)) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri yoki yo\'q API kalit (x-api-key)' }) };
  }

  try {
    const params = event.queryStringParameters || {};
    const snap = await db.collection('numbers').get();

    let numbers = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        number: d.number || '',
        operator: d.operator || '',
        price: typeof d.price === 'number' ? d.price : null,
        oldPrice: typeof d.oldPrice === 'number' ? d.oldPrice : null,
        installment: !!d.installment,
        reserved: !!d.reserved,
        featured: !!d.featured,
        dailyDeal: !!d.dailyDeal,
        tag: d.tag || null
      };
    });

    if (params.operator) {
      numbers = numbers.filter(n => n.operator.toLowerCase() === params.operator.toLowerCase());
    }
    if (params.onlyAvailable === 'true') {
      numbers = numbers.filter(n => !n.reserved);
    }
    if (params.limit) {
      const lim = parseInt(params.limit, 10);
      if (!isNaN(lim) && lim > 0) numbers = numbers.slice(0, lim);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, count: numbers.length, numbers })
    };
  } catch (err) {
    console.error('api-numbers xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
