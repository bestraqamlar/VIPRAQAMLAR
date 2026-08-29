// ADMINGA "DOIMIY YANGILANIB TURADIGAN RO'YXAT" XABARI YUBORISH/TAHRIRLASH
// Masalan: "Ovozli xabar yuborgan mijozlar" yoki "Yangi mijozlar" ro'yxati.
// Har safar yangi kishi qo'shilganda, avvalgi xabarni (agar bor bo'lsa)
// TAHRIRLAYDI — shunda admin Telegram chatida spam bo'lmaydi, bitta xabar
// doim yangilanib turadi.

async function updateAdminList(db, listKey, title, userId, name){
  const ref = db.collection('bot_meta').doc(listKey);
  let data;
  try{
    const doc = await ref.get();
    data = doc.exists ? doc.data() : { entries: [], adminMessageId: null };
  }catch(e){ data = { entries: [], adminMessageId: null }; }
  data.entries = data.entries || [];
  if(!data.entries.find(e => e.id === String(userId))){
    data.entries.push({ id: String(userId), name });
  }
  const listText = `${title}\n` + data.entries.map((e, i) => `${i + 1}. ${e.name}`).join('\n');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if(!token || !chatId) return;

  async function sendFresh(){
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: listText })
    });
    const resData = await res.json();
    if(resData.ok && resData.result) data.adminMessageId = resData.result.message_id;
  }

  try{
    if(data.adminMessageId){
      const editRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, message_id: data.adminMessageId, text: listText })
      });
      const editData = await editRes.json();
      if(!editData.ok) await sendFresh();
    }else{
      await sendFresh();
    }
  }catch(e){ /* muhim emas, keyingi safar qayta urinadi */ }

  try{ await ref.set(data); }catch(e){ /* muhim emas */ }
}

module.exports = { updateAdminList };
