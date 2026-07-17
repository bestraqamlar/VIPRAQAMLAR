// KUNLIK AVTOMATIK EXCEL HISOBOT (har kuni 04:00 UTC = 09:00 Toshkent)
// Hisobotning asosiy mantig'i send-excel-now.js faylida — bu fayl shunchaki
// o'sha mantiqni jadval bo'yicha chaqiradi. Shu tufayli qo'lda yuborilgan va
// avtomatik kelgan hisobotlar HAR DOIM bir xil bo'ladi.

const { buildAndSendReport } = require('./send-excel-now');

exports.handler = async function () {
  try{
    const result = await buildAndSendReport();
    console.log('Kunlik hisobot yuborildi:', JSON.stringify(result));
    return { statusCode: 200, body: 'ok' };
  }catch(err){
    console.error('CREDIT-EXCEL-REPORT XATOSI:', err);
    return { statusCode: 500, body: err.message };
  }
};
