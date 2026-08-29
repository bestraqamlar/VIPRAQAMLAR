// "BOSHQARUV" — ADMIN QO'SHISH / BOSHQARISH.
//
// Faqat ENG KATTA (bosh/super) adminga ochiq (requireSuperAdmin — qarang:
// lib/adminAuth.js). Bu yerda yaratilgan yangi adminlar HECH QACHON
// o'zlariga (yoki boshqasiga) superAdmin huquqini bera olmaydi — buni
// faqat qo'lda, maxfiy kalit orqali (admin-grant-role.js) qilish mumkin.
// Shu bilan "kimdir ilova orqali o'zini bosh admin qilib olishi" mutlaqo
// yopiq.
//
// Yangi admin EMAIL bilan emas, faqat ISM (login) va PAROL bilan tizimga
// kiradi — lekin orqa fonda, Firebase Authentication talab qiladigan
// (hech kimga ko'rinmaydigan, hech qachon xabar yuborilmaydigan) ichki
// email avtomatik yaratiladi. Bu — parolni Firebase'ning o'zi (mustahkam,
// standart xeshlash bilan) saqlashi demakdir — o'zimizcha parol
// saqlash/heshlash YOZILMAYDI, chunki buni noto'g'ri qilish aynan
// xakerlar foydalanadigan zaiflik bo'lardi.
//
// Ruxsatlar (permissions) HAM Firebase Custom Claim sifatida ('perms')
// saqlanadi va firestore.rules'da MAJBURIY tekshiriladi (qarang:
// firestore.rules'dagi hasPerm()) — shunchaki ekranda tugmani "yashirish"
// emas, chindan ham server/baza darajasida yopiladi.

const admin = require('firebase-admin');
const { requireSuperAdmin } = require('./lib/adminAuth');

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

const COLLECTION = 'admins';
// Haqiqiy pochta manzili emas — hech qachon xat yuborilmaydi, faqat
// Firebase Authentication'ning "email" maydonini to'ldirish uchun kerak.
const INTERNAL_EMAIL_DOMAIN = '@ichki.vipraqamlar-admin.uz';

// admin.html'dagi data-tab qiymatlari bilan AYNAN mos bo'lishi shart.
const FEATURE_KEYS = [
  'numbers', 'ai', 'instagram', 'telegramai', 'videos', 'premiumvideo',
  'orders', 'zakaz', 'credit', 'sessions', 'styles', 'operators', 'watch', 'settings'
];

const CYRILLIC_MAP = {
  'ў': 'u', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h', 'ш': 'sh', 'ч': 'ch',
  'ё': 'yo', 'я': 'ya', 'ю': 'yu', 'ц': 'ts', 'й': 'y', 'х': 'x',
  'ж': 'j', 'э': 'e'
};

function slugify(name) {
  let s = String(name || '').trim().toLowerCase();
  s = s.replace(/[ўқғҳшчёяюцйхжэ]/g, ch => CYRILLIC_MAP[ch] || ch);
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').replace(/\.{2,}/g, '.');
  return s || 'admin';
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) {
    return "Parol kamida 8 belgidan iborat bo'lishi kerak";
  }
  if (pw.length > 128) return 'Parol juda uzun';
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return "Parolda kamida bitta harf va bitta raqam bo'lishi kerak";
  }
  const weak = ['12345678', 'password', 'password1', 'qwerty123', '11111111', 'admin123', '123456789'];
  if (weak.includes(pw.toLowerCase())) return "Bu parol juda oddiy va topish oson — boshqasini tanlang";
  return null;
}

function sanitizePermissions(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const k of FEATURE_KEYS) {
      if (raw[k] === true || raw[k] === 1) out[k] = 1;
    }
  }
  return out;
}

async function guardNotSuper(uid) {
  try {
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.customClaims && userRecord.customClaims.superAdmin === true) {
      const err = new Error("Bosh adminni bu yerdan o'zgartirib bo'lmaydi");
      err.statusCode = 403;
      throw err;
    }
  } catch (e) {
    if (e.statusCode) throw e;
    // getUser xato bersa (masalan hisob topilmadi) — chaqiruvchi amal
    // baribir o'z xatosini beradi, shu yerda jim o'tkazamiz.
  }
}

async function listAdmins() {
  const snap = await db.collection(COLLECTION).orderBy('createdAt', 'desc').get();
  const admins = snap.docs.map(d => {
    const data = d.data();
    return {
      uid: d.id,
      name: data.name || '',
      loginHandle: data.loginHandle || '',
      permissions: data.permissions || {},
      active: data.active !== false,
      createdAt: data.createdAt ? data.createdAt.toMillis() : null,
      lastLoginAt: null
    };
  });

  // Har bir admin uchun eng oxirgi kirish vaqtini admin_sessions'dan
  // olamiz (bu yerda "lastLoginAt" alohida saqlanmaydi — yagona haqiqat
  // manbai sifatida seans yozuvlari ishlatiladi, ikkalasi bir-biridan
  // chetlashib qolmasin deb).
  await Promise.all(admins.map(async (a) => {
    try {
      const s = await db.collection('admin_sessions')
        .where('uid', '==', a.uid).where('type', '==', 'login')
        .orderBy('loginAtSort', 'desc').limit(1).get();
      if (!s.empty) a.lastLoginAt = s.docs[0].data().loginAtSort || null;
    } catch (e) { /* indeks hali yaratilmagan bo'lishi mumkin — jim o'tamiz */ }
  }));

  return admins;
}

async function createAdmin(body, callerUid) {
  const name = String(body.name || '').trim();
  if (!name || name.length < 2 || name.length > 60) {
    const err = new Error('Ism kiritilishi shart (2-60 belgi)');
    err.statusCode = 400;
    throw err;
  }
  const pwErr = validatePassword(body.password);
  if (pwErr) { const err = new Error(pwErr); err.statusCode = 400; throw err; }

  const permissions = sanitizePermissions(body.permissions);

  let handle = slugify(name);
  let email = handle + INTERNAL_EMAIL_DOMAIN;
  let userRecord = null;
  let attempt = 0;
  while (attempt < 8 && !userRecord) {
    try {
      userRecord = await admin.auth().createUser({
        email,
        password: body.password,
        displayName: name,
        emailVerified: true
      });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        attempt++;
        handle = slugify(name) + attempt;
        email = handle + INTERNAL_EMAIL_DOMAIN;
        continue;
      }
      throw e;
    }
  }
  if (!userRecord) {
    const err = new Error("Login nomini yaratib bo'lmadi, birozdan so'ng qayta urinib ko'ring");
    err.statusCode = 500;
    throw err;
  }

  // superAdmin HAR DOIM false — bu funksiyadan hech qachon bosh admin
  // yaratilmaydi (qarang: fayl boshidagi izoh).
  await admin.auth().setCustomUserClaims(userRecord.uid, {
    admin: true,
    superAdmin: false,
    perms: permissions
  });

  await db.collection(COLLECTION).doc(userRecord.uid).set({
    name,
    loginHandle: handle,
    permissions,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: callerUid,
    lastLoginAt: null
  });

  return { uid: userRecord.uid, loginHandle: handle };
}

async function updatePermissions(body) {
  const uid = String(body.uid || '');
  if (!uid) { const err = new Error('uid kerak'); err.statusCode = 400; throw err; }
  await guardNotSuper(uid);
  const permissions = sanitizePermissions(body.permissions);

  const userRecord = await admin.auth().getUser(uid);
  const existingClaims = userRecord.customClaims || {};
  await admin.auth().setCustomUserClaims(uid, { ...existingClaims, admin: true, superAdmin: false, perms: permissions });
  await db.collection(COLLECTION).doc(uid).set({ permissions }, { merge: true });
  // Ruxsatlar DARHOL kuchga kirishi uchun eski tokenlarni bekor qilamiz —
  // admin keyingi so'rovni yuborganda albatta yangi (yangilangan
  // ruxsatli) token bilan ishlaydi, 10 daqiqalik seans tugashini kutmay.
  await admin.auth().revokeRefreshTokens(uid);
  return { ok: true };
}

async function resetPassword(body) {
  const uid = String(body.uid || '');
  if (!uid) { const err = new Error('uid kerak'); err.statusCode = 400; throw err; }
  await guardNotSuper(uid);
  const pwErr = validatePassword(body.newPassword);
  if (pwErr) { const err = new Error(pwErr); err.statusCode = 400; throw err; }
  await admin.auth().updateUser(uid, { password: body.newPassword });
  await admin.auth().revokeRefreshTokens(uid);
  return { ok: true };
}

async function toggleActive(body, callerUid) {
  const uid = String(body.uid || '');
  if (!uid) { const err = new Error('uid kerak'); err.statusCode = 400; throw err; }
  if (uid === callerUid) { const err = new Error("O'zingizni to'xtata olmaysiz"); err.statusCode = 400; throw err; }
  await guardNotSuper(uid);
  const active = !!body.active;
  // disabled:true — Firebase Authentication darajasida DARHOL kirishni
  // to'sadi (keyingi login urinishlari ham rad etiladi).
  await admin.auth().updateUser(uid, { disabled: !active });
  if (!active) await admin.auth().revokeRefreshTokens(uid);
  await db.collection(COLLECTION).doc(uid).set({ active }, { merge: true });
  return { ok: true };
}

async function deleteAdmin(body, callerUid) {
  const uid = String(body.uid || '');
  if (!uid) { const err = new Error('uid kerak'); err.statusCode = 400; throw err; }
  if (uid === callerUid) { const err = new Error("O'zingizni o'chira olmaysiz"); err.statusCode = 400; throw err; }
  await guardNotSuper(uid);
  try { await admin.auth().deleteUser(uid); } catch (e) { /* Auth'da allaqachon yo'q bo'lishi mumkin */ }
  await db.collection(COLLECTION).doc(uid).delete();
  return { ok: true };
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let decoded;
  try {
    decoded = await requireSuperAdmin(event);
  } catch (err) {
    return { statusCode: err.statusCode || 401, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  try {
    let result;
    switch (body.action) {
      case 'list': result = { admins: await listAdmins(), featureKeys: FEATURE_KEYS }; break;
      case 'create': result = await createAdmin(body, decoded.uid); break;
      case 'updatePermissions': result = await updatePermissions(body); break;
      case 'resetPassword': result = await resetPassword(body); break;
      case 'toggleActive': result = await toggleActive(body, decoded.uid); break;
      case 'delete': result = await deleteAdmin(body, decoded.uid); break;
      default: {
        const err = new Error("Noma'lum amal");
        err.statusCode = 400;
        throw err;
      }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true, ...result }) };
  } catch (err) {
    console.error('ADMIN-MANAGE-ADMINS XATOSI:', err);
    return { statusCode: err.statusCode || 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
