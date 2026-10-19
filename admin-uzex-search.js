// UZEX AUKSION QIDIRUVI — FAQAT ADMIN PANELI UCHUN.
//
// NIMA: mobilraqam.uzex.uz (UZEX birjasi) auksionida hozir sotuvda turgan
// raqamlarni mask bo'yicha qidiradi. Natijada har bir lot uchun: raqam,
// boshlang'ich narx, savdo boshlanish va tugash vaqti, sotuvchi kompaniya.
//
// NEGA SERVER ORQALI: UZEX API'si brauzerdan to'g'ridan-to'g'ri chaqirilsa
// CORS bilan bloklanadi. Bundan tashqari so'rov "user-agent" sarlavhasisiz
// HTTP 403 qaytaradi (tekshirilgan) — brauzer bu sarlavhani o'zgartirishga
// ruxsat bermaydi. Shu sabab so'rov shu yerdan, serverdan yuboriladi.
//
// XAVFSIZLIK: bu ma'lumot SAYTGA CHIQARILMAYDI — faqat admin paneli uchun.
// Shu sabab requireAdmin() bilan himoyalangan: oddiy foydalanuvchi (hatto
// Firebase'da hisobi bo'lsa ham) bu funksiyani chaqira olmaydi.
//
// MIJOZ TALABI (yangi bosqich): faqat jismoniy shaxs lotlari (yuridik
// chiqarilmaydi), kompaniya/sana bo'yicha qo'shimcha filtr, va natija
// chegarasi 500 -> 2000 ga oshirildi. Bularning barchasi endi umumiy
// lib/uzexClient.js ichida — qarang: shu fayl, izohlar bilan.
const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');
const { searchUzex } = require('./lib/uzexClient');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  // FAQAT admin. 'watch' — "Baza raqam" bo'limiga yaqin funksiya bo'lgani
  // uchun shu ruxsat guruhidan foydalanamiz.
  try {
    await requireAdmin(event, { feature: 'watch' });
  } catch (err) {
    return {
      statusCode: err.statusCode || 401,
      headers,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Noto\'g\'ri JSON' }) }; }

  try {
    const result = await searchUzex({
      mask: input.mask,
      startPrice: input.startPrice,
      endPrice: input.endPrice,
      seller: input.seller,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        mask: result.mask,
        count: result.items.length,
        totalFound: result.totalFound,
        debug: result.debug,
        items: result.items
      })
    };
  } catch (err) {
    if (err.statusCode === 400) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: err.message }) };
    }
    console.error('admin-uzex-search xato:', err.message);
    const isTimeout = err && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      statusCode: isTimeout ? 504 : 502,
      headers,
      body: JSON.stringify({
        ok: false,
        error: isTimeout ? 'UZEX javob berishga juda ko\'p vaqt oldi' : err.message
      })
    };
  }
};
