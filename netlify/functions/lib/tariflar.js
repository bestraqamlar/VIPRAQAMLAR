// TARIFLAR (Pro / Max) — DILERLARDAN KELADIGAN ASOSIY DAROMAD.
//
// MODEL. Diler saytga raqam qo'yadi. Oddiy raqam — bepul. Raqamni
// AJRATIB KO'RSATISH (VIP / Premium / Gold rang-yorliq, hamda bosh
// sahifada aylanib turadigan "Mashhur" bo'limga tushish) esa pullik
// obuna — tarif orqali. Komissiya foizi endi majburiy emas: daromad
// obunadan keladi.
//
// MUHIM QOIDA: tarifning NARXI ham, MUDDATI ham, QAYSI TOIFALARni
// ochishi ham, NECHTA raqamga yetishi ham — hammasi Firestore'dagi
// bitta hujjatda (`sys_config/tariflar`) turadi va admin panelidan
// istalgan paytda o'zgartiriladi. Shu sabab bu faylda narx yoki
// toifa "qotirib" yozilmaydi — faqat STANDART (birinchi ishga
// tushish) qiymatlari bor. Admin yangi tarif qo'shsa (masalan
// "Biznes — 500 000 so'm, 50 raqam"), kodga tegish KERAK EMAS.
//
// NEGA sys_config: bu to'plam Firestore qoidalarida brauzer uchun
// butunlay yopiq (`allow read, write: if false`). Ya'ni tarif narxini
// faqat server funksiyalari (Admin SDK) o'qiydi va yozadi — diler
// brauzerdan narxni o'zgartirib qo'ya olmaydi.

const TOPLAM = 'sys_config';
const HUJJAT = 'tariflar';

/* Saytda haqiqatan dizayni bor toifalar. Admin faqat shulardan
   tanlaydi — chunki yangi nom qo'shilsa, saytda uning rangi va
   yorlig'i bo'lmaydi (index.html ichidagi TIERS). */
const TOIFALAR = ['vip', 'premium', 'gold'];
const TOIFA_NOM = { vip: 'VIP', premium: 'PREMIUM', gold: 'GOLD' };

/* BIRINCHI ISHGA TUSHISHDAGI tariflar. Keyin admin panelda
   o'zgartirilsa, shu yerdagi qiymatlar BOSHQA ishlatilmaydi. */
const STANDART = [
  {
    id: 'pro', name: 'Pro', price: 100000, days: 30, quota: 15,
    tiers: ['vip', 'premium'], featured: false, order: 1,
    desc: 'Raqamlaringizga VIP va Premium kartochka — 15 raqam uchun'
  },
  {
    id: 'max', name: 'Max', price: 300000, days: 30, quota: 10,
    tiers: ['gold', 'premium', 'vip'], featured: true, order: 2,
    desc: 'Gold, Premium, VIP va "Mashhur" — bosh sahifada aylanib turadigan bo‘limga tushish. 10 raqam uchun'
  }
];

const butun = (v, min, max, zap) => {
  const n = Math.round(Number(v));
  if (!isFinite(n)) return zap;
  return Math.min(max, Math.max(min, n));
};
const matn = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const slug = (v) => matn(v, 24).toLowerCase().replace(/[^a-z0-9_-]/g, '');

/** Bitta tarifni tozalaydi/tekshiradi. Xato bo'lsa {xato} qaytaradi. */
function tarifTozala(p, i) {
  p = p || {};
  const id = slug(p.id) || ('tarif' + (i + 1));
  const name = matn(p.name, 30);
  if (!name) return { xato: (i + 1) + '-tarif: nomini kiriting' };
  const price = butun(p.price, 0, 100000000, 0);
  const days = butun(p.days, 1, 3650, 30);
  const quota = butun(p.quota, 0, 100000, 0);
  const tiers = (Array.isArray(p.tiers) ? p.tiers : [])
    .map(t => matn(t, 20).toLowerCase())
    .filter(t => TOIFALAR.indexOf(t) !== -1);
  const featured = !!p.featured;
  if (!tiers.length && !featured) {
    return { xato: name + ': kamida bitta toifa yoki "Mashhur" belgilanishi kerak' };
  }
  return {
    tarif: {
      id, name, price, days, quota, tiers, featured,
      order: butun(p.order, 0, 999, i + 1),
      desc: matn(p.desc, 300)
    }
  };
}

/** Firestore'dan tariflarni o'qiydi. Hujjat yo'q bo'lsa — STANDART. */
async function tariflarniOl(db) {
  try {
    const d = await db.collection(TOPLAM).doc(HUJJAT).get();
    const x = d.exists ? (d.data() || {}) : {};
    const rows = Array.isArray(x.plans) ? x.plans : null;
    if (!rows || !rows.length) return STANDART.slice();
    const out = [];
    rows.forEach((p, i) => { const r = tarifTozala(p, i); if (r.tarif) out.push(r.tarif); });
    return out.length ? out.sort((a, b) => a.order - b.order) : STANDART.slice();
  } catch (e) {
    return STANDART.slice();
  }
}

/** Admin panel yozadi. Xato bo'lsa {xato} qaytaradi. */
async function tariflarniSaqla(db, plans, kim) {
  const kelgan = Array.isArray(plans) ? plans.slice(0, 20) : [];
  if (!kelgan.length) return { xato: 'Kamida bitta tarif qoldiring' };
  const out = [];
  const idlar = {};
  for (let i = 0; i < kelgan.length; i++) {
    const r = tarifTozala(kelgan[i], i);
    if (r.xato) return { xato: r.xato };
    if (idlar[r.tarif.id]) return { xato: 'Bir xil ID ikki marta: ' + r.tarif.id };
    idlar[r.tarif.id] = 1;
    out.push(r.tarif);
  }
  await db.collection(TOPLAM).doc(HUJJAT).set({
    plans: out, updatedAt: Date.now(), updatedBy: matn(kim, 80)
  });
  return { plans: out };
}

/** Dilerning tarifi hozir FAOL bo'lsa — o'sha tarifni qaytaradi. */
function faolTarif(seller, plans) {
  const id = String((seller && seller.plan) || '');
  if (!id) return null;
  const until = Number((seller && seller.planUntil) || 0);
  if (!until || until < Date.now()) return null;      // muddati tugagan
  return (plans || []).find(p => p.id === id) || null;
}

/** Tarif tugashiga qancha kun qoldi (faol bo'lmasa null). */
function qolganKun(seller) {
  const until = Number((seller && seller.planUntil) || 0);
  if (!until) return null;
  return Math.ceil((until - Date.now()) / 86400000);
}

/**
 * Diler raqamga shu toifani / "Mashhur" belgisini qo'yishi mumkinmi?
 * Hech qanday bazaga murojaat qilmaydi — faqat qoida.
 */
function ruxsatmi(tarif, tier, featured) {
  if (!tier && !featured) return { ok: true };                     // oddiy raqam — har doim mumkin
  if (!tarif) return { xato: 'Buning uchun Pro yoki Max tarifi kerak' };
  if (tier && tarif.tiers.indexOf(tier) === -1) {
    return { xato: tarif.name + ' tarifida ' + (TOIFA_NOM[tier] || tier) + ' toifasi yo‘q' };
  }
  if (featured && !tarif.featured) {
    return { xato: tarif.name + ' tarifida "Mashhur" (bosh sahifa) imkoniyati yo‘q' };
  }
  return { ok: true };
}


/**
 * Tarifni dilerga YOQADI (onlayn to'lov tasdiqlangandan keyin ham,
 * admin qo'lda tasdiqlaganda ham bir xil ishlashi uchun shu yerda).
 *
 * Muddat MAVJUD muddat ustiga qo'shiladi: diler oldinroq to'lasa
 * qolgan kunlari kuyib ketmaydi.
 */
async function yoqish(db, adminSdk, sellerId, planId, days, manba) {
  const plans = await tariflarniOl(db);
  const p = plans.find(x => x.id === planId);
  if (!p) return { xato: 'Tarif topilmadi: ' + planId };
  const ref = db.collection('sellers').doc(String(sellerId));
  const snap = await ref.get();
  if (!snap.exists) return { xato: 'Sotuvchi topilmadi' };
  const eski = snap.data() || {};
  const kun = Number(days) || p.days;
  const boshlanish = (Number(eski.planUntil) || 0) > Date.now() && eski.plan === p.id
    ? Number(eski.planUntil) : Date.now();
  const until = boshlanish + kun * 86400000;
  await ref.update({
    plan: p.id, planUntil: until, planWarnedAt: 0,
    planStartedAt: Date.now(), planSource: matn(manba, 30) || 'admin'
  });
  try {
    await db.collection('seller_messages').add({
      sellerId: String(sellerId), from: 'admin',
      text: p.name + ' tarifi yoqildi. Muddati: ' + new Date(until).toLocaleDateString('ru-RU') +
        '. Endi ' + p.quota + ' raqamga toifa qo\u2018yishingiz mumkin.',
      createdAt: adminSdk.firestore.FieldValue.serverTimestamp(), createdAtSort: Date.now()
    });
    await ref.update({ unreadForSeller: adminSdk.firestore.FieldValue.increment(1) });
  } catch (e) {}
  return { plan: p, until };
}

module.exports = {
  yoqish,
  TOPLAM, HUJJAT, TOIFALAR, TOIFA_NOM, STANDART,
  tariflarniOl, tariflarniSaqla, tarifTozala,
  faolTarif, qolganKun, ruxsatmi
};
