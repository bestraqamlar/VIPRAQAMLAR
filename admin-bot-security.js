// BOT XAVFSIZLIGI — "soxta so'rov" himoyasini BITTA TUGMA bilan yoqish.
//
// NIMA MUAMMONI YECHADI. Telegram botlarining webhook manzili ochiq:
//   https://vipraqamlar.uz/.netlify/functions/customer-bot-webhook
// Manzilni bilgan har kim unga o'zi yasagan "xabar" yuborib, botni
// aldashi mumkin edi — masalan bosqichlarni bosib o'tib, bazaga soxta
// buyurtma yozdirish (ism o'rnida raqam, telefon o'rnida "00 000 00 00").
//
// YECHIM (Telegram'ning o'z himoyasi). `setWebhook` chaqirilganda
// `secret_token` beriladi; Telegram shundan keyin HAR BIR so'rovida uni
// `X-Telegram-Bot-Api-Secret-Token` sarlavhasida qaytaradi. Boshqa hech
// kim bu so'zni bilmaydi — demak boshqa hech kim so'rov yubora olmaydi.
//
// Bu funksiya:
//   1. har bir bot uchun Telegram'dan `getWebhookInfo` oladi (hozirgi
//      manzil, kutayotgan xabarlar soni, oxirgi xato);
//   2. "Yoqish" bosilganda — tasodifiy 48 belgili maxfiy so'z yasaydi,
//      `setWebhook` orqali Telegram'ga bildiradi (manzilni O'ZGARTIRMAYDI,
//      faqat maxfiy so'z qo'shadi) va uni `sys_config/bot_secrets`
//      hujjatiga yozadi. Webhook funksiyalari shundan keyin so'zsiz
//      kelgan har qanday so'rovni rad etadi.
//
// MUHIM: maxfiy so'z hech qachon mijozga, saytga yoki admin ekraniga
// TO'LIQ ko'rsatilmaydi (faqat "yoqilgan/yoqilmagan" holati) — shu sabab
// uni ekrandan o'g'irlab bo'lmaydi. `sys_config` Firestore qoidalarida
// brauzer uchun butunlay yopiq.

const crypto = require('crypto');
const admin = require('firebase-admin');
const { requireAdmin } = require('./lib/adminAuth');
const { sirniSaqla, sirBormi } = require('./lib/webhookSirri');

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

/* Loyihadagi botlar. `env` — tokeni, `zaxiraEnv` — eski (Netlify'dagi)
   maxfiy so'z o'zgaruvchisi, `kalit` — Firestore'dagi maydon nomi
   (webhook funksiyasining nomi bilan bir xil). */
const BOTLAR = [
  { nom: 'Mijozlar boti',      env: 'CUSTOMER_BOT_TOKEN', kalit: 'customer-bot-webhook',     zaxiraEnv: 'CUSTOMER_BOT_WEBHOOK_SECRET' },
  { nom: 'Admin boti',         env: 'TELEGRAM_BOT_TOKEN', kalit: 'order-status-webhook',     zaxiraEnv: 'ADMIN_BOT_WEBHOOK_SECRET' },
  { nom: 'Shaxsiy bot',        env: 'PERSONAL_BOT_TOKEN', kalit: 'personal-bot-webhook',     zaxiraEnv: 'PERSONAL_BOT_WEBHOOK_SECRET' },
  { nom: 'Biznes bot',         env: 'BUSINESS_BOT_TOKEN', kalit: 'telegram-business-webhook', zaxiraEnv: 'BUSINESS_BOT_WEBHOOK_SECRET' }
];

async function tg(token, metod, body) {
  const r = await fetch('https://api.telegram.org/bot' + token + '/' + metod, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const j = await r.json().catch(() => ({}));
  return j;
}

/* Webhook manzilidan funksiya nomini ajratadi:
   ".../.netlify/functions/customer-bot-webhook" -> "customer-bot-webhook" */
function manzildanKalit(url) {
  const m = String(url || '').match(/\/functions\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

async function holat() {
  const qatorlar = [];
  for (const b of BOTLAR) {
    const token = process.env[b.env] || '';
    if (!token) { qatorlar.push({ nom: b.nom, kalit: b.kalit, token: false }); continue; }
    const info = await tg(token, 'getWebhookInfo', {});
    const r = (info && info.result) || {};
    const kalit = manzildanKalit(r.url) || b.kalit;
    qatorlar.push({
      nom: b.nom, kalit,
      token: true,
      url: r.url || '',
      kutayotgan: Number(r.pending_update_count) || 0,
      oxirgiXato: r.last_error_message || '',
      /* Telegram'ning o'zi ham aytadi: webhook'da maxfiy so'z bormi */
      telegramSirBor: !!r.has_custom_certificate || !!r.secret_token_set,
      envSirBor: !!(b.zaxiraEnv && process.env[b.zaxiraEnv]),
      bazaSirBor: await sirBormi(db, kalit).catch(() => false)
    });
  }
  return qatorlar;
}

async function yoq() {
  const natija = [];
  for (const b of BOTLAR) {
    const token = process.env[b.env] || '';
    if (!token) { natija.push({ nom: b.nom, ok: false, sabab: 'Bot tokeni sozlanmagan' }); continue; }

    const info = await tg(token, 'getWebhookInfo', {});
    const url = ((info && info.result) || {}).url || '';
    if (!url) {
      natija.push({ nom: b.nom, ok: false, sabab: "Webhook manzili yo'q (bot Telegram'ga ulanmagan)" });
      continue;
    }
    const kalit = manzildanKalit(url) || b.kalit;

    /* 48 ta belgili tasodifiy so'z — Telegram faqat A-Z a-z 0-9 _ - ruxsat beradi */
    const sir = crypto.randomBytes(36).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').slice(0, 48);

    const res = await tg(token, 'setWebhook', {
      url,
      secret_token: sir,
      /* Kutayotgan xabarlar o'chirilmaydi — mijozning javobi yo'qolmasin */
      drop_pending_updates: false,
      max_connections: 40
    });
    if (!res || res.ok !== true) {
      natija.push({ nom: b.nom, ok: false, sabab: (res && res.description) || 'Telegram javob bermadi' });
      continue;
    }
    await sirniSaqla(db, kalit, sir);
    natija.push({ nom: b.nom, ok: true, kalit, url });
  }
  return natija;
}

exports.handler = async function (event) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Faqat POST' }) };
  }

  /* Faqat BOSH ADMIN: bu amal botlarning Telegram sozlamasini o'zgartiradi. */
  try {
    await requireAdmin(event, { feature: 'settings' });
  } catch (err) {
    return { statusCode: err.statusCode || 401, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Noto'g'ri JSON" }) }; }

  try {
    if (input.action === 'urinishlar') {
      /* Qulflangan kirish urinishlari tarixi (parol SAQLANMAYDI —
         faqat login, IP va vaqt). Admin "kimdir kirishga urinyaptimi"
         degan savolga javob ko'rishi uchun. */
      const d = await db.collection('login_attempts').doc('__log__').get();
      const x = d.exists ? (d.data() || {}) : {};
      const rows = Object.keys(x)
        .map(k => x[k]).filter(v => v && v.at)
        .sort((a, b) => b.at - a.at).slice(0, 15);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, urinishlar: rows }) };
    }

    if (input.action === 'holat') {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, botlar: await holat() }) };
    }
    if (input.action === 'yoq') {
      const natija = await yoq();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, natija, botlar: await holat() }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Noma'lum amal" }) };
  } catch (err) {
    console.error('admin-bot-security xato:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server xatosi' }) };
  }
};
