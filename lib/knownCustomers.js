// "MIJOZ BIZGA BIRINCHI MARTA YOZYAPTIMI?" — bu holatni Firestore'da
// kuzatib boradi. Har bir kanal (Telegram menyu boti, Telegram Business
// boti, Instagram Direct) o'zining alohida to'plamidan (collection)
// foydalanadi, chunki bir xil odam turli kanallarda alohida "mijoz"
// hisoblanadi.

async function checkAndMarkKnown(db, collectionName, userId){
  const ref = db.collection(collectionName).doc(String(userId));
  const doc = await ref.get();
  const isFirstTime = !doc.exists;
  if(isFirstTime){
    await ref.set({ firstSeenAt: Date.now() });
  }
  return isFirstTime;
}

module.exports = { checkAndMarkKnown };
