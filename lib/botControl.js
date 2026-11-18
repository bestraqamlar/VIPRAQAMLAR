// UMUMIY BOT BOSHQARUV HOLATI — barcha botlar (mijoz Telegram boti,
// Telegram Business boti, Instagram boti) shu yerdan "hozir ishlashim
// kerakmi" degan javobni oladi. Holat Firestore'da saqlanadi va admin
// Telegram botidagi boshqaruv paneli ("/panel" buyrug'i) orqali o'zgaradi.
//
//   botEnabled       — umumiy "o'chirilgan/yoqilgan" kalit. false bo'lsa,
//                       botlar butunlay javob bermay qo'yadi (ta'til rejimi).
//   autoReplyEnabled — faqat AI avtomatik javoblarini yoqadi/o'chiradi
//                       (mijoz Telegram botidagi tugmali menyu bunga
//                       bog'liq emas, u har doim ishlayveradi).
//   newUserAutoReplyEnabled — bizga BIRINCHI MARTA yozayotgan mijozlarga
//                       ham AI avtomatik javob bersinmi? false bo'lsa,
//                       yangi mijozlarga bot javob bermaydi — faqat ismini
//                       adminga ro'yxat qilib yuboradi, admin o'zi shaxsan
//                       javob yozadi. Qaytgan (allaqachon yozgan) mijozlarga
//                       bu holatdan qat'iy nazar autoReplyEnabled asosida
//                       javob berilaveradi.

async function getBotControl(db){
  try{
    const doc = await db.collection('site_settings').doc('bot_control').get();
    const data = doc.exists ? doc.data() : {};
    return {
      botEnabled: data.botEnabled !== false,        // ko'rsatilmagan bo'lsa — yoqilgan hisoblanadi
      autoReplyEnabled: data.autoReplyEnabled !== false,
      newUserAutoReplyEnabled: data.newUserAutoReplyEnabled !== false
    };
  }catch(e){
    return { botEnabled: true, autoReplyEnabled: true, newUserAutoReplyEnabled: true };
  }
}

module.exports = { getBotControl };
