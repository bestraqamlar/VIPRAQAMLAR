/* VIP RAQAMLAR — oflayn rejim.
   Maqsad: internet umuman yo'q bo'lsa ham sayt ochilsin va keshdagi
   katalog ko'rinsin. Dinamik ma'lumot (Firestore, funksiyalar) HECH
   QACHON keshlanmaydi — ular doim jonli olinadi. */
const CACHE = 'vipraqamlar-v3';
const SHELL = ['/', '/index.html', '/assets/logo-circle.png'];

self.addEventListener('install', (e) => {
  /* DIQQAT: `addAll` BO'LINMAS — ro'yxatdagi bitta manzil ham
     topilmasa (404), HECH NARSA keshlanmaydi va oflayn rejim butunlay
     ishlamay qoladi. Ilgari ro'yxatda `/manifest.json` bor edi; u
     saytdan olib tashlangach, jimgina shu holat yuzaga kelgandi.
     Endi har bir fayl ALOHIDA keshlanadi — biri yo'q bo'lsa qolgani
     baribir saqlanadi. */
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(()=>{}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* KATALOG INDEKSI — yagona istisno.
     "Avval keshdan, fonda yangila": qayta kirganda katalog SHU ZAHOTI
     ko'rinadi (tarmoqni kutmaydi), yangisi esa fonda olinib, keyingi
     safar ishlatiladi. Internet umuman bo'lmasa ham katalog ochiladi. */
  if (url.pathname === '/.netlify/functions/api-index') {
    e.respondWith(
      caches.open(CACHE).then(c => c.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.status === 200) c.put(req, res.clone()).catch(()=>{});
          return res;
        }).catch(() => hit);
        return hit || net;
      }))
    );
    return;
  }

  /* Backend va Firebase — hech qachon keshlanmaydi */
  if (url.pathname.startsWith('/.netlify/') ||
      /firestore|googleapis|firebaseio|gstatic\.com\/firebasejs|recaptcha/.test(url.host + url.pathname)) {
    return;
  }

  /* HTML — avval tarmoq, ishlamasa keshdan (sayt baribir ochiladi) */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/index.html', copy)).catch(()=>{});
          return res;
        })
        .catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  /* Statik fayllar (rasm, shrift, css) — avval keshdan, fonda yangilanadi */
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
          }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

/* ===================================================================
   BRAUZER BILDIRISHNOMASI (sayt yopiq bo'lsa ham keladi)
   -------------------------------------------------------------------
   Admin "Saytga xabar" bo'limidan yuborgan xabar shu yerga keladi va
   telefon ekranida oddiy bildirishnoma bo'lib chiqadi — mijoz saytni
   yopib qo'ygan bo'lsa ham.

   NEGA AYNAN SHU FAYLDA: bitta manzilda (scope) faqat BITTA xizmatchi
   ishlay oladi. Alohida `firebase-messaging-sw.js` qo'yilsa, u shu
   fayldagi oflayn keshni ALMASHTIRIB yuborardi va sayt internetsiz
   ochilmay qolardi.

   NEGA try/catch ICHIDA: `importScripts` tashqi manzildan yuklaydi.
   Internet bo'lmasa u xato beradi va xizmatchi UMUMAN ishga
   tushmaydi — ya'ni oflayn rejim ham yo'qoladi. Shu sabab yuqoridagi
   kesh mantig'i OLDIN yoziladi, bildirishnoma esa himoyalangan holda
   oxirida ulanadi: yuklanmasa ham sayt oflayn ishlashda davom etadi.
   =================================================================== */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyAZVM_C5tRYe77j4OvQtrBhV3dpEZAxk_A",
    authDomain: "vip-raqamlar.firebaseapp.com",
    projectId: "vip-raqamlar",
    storageBucket: "vip-raqamlar.firebasestorage.app",
    messagingSenderId: "872049914686",
    appId: "1:872049914686:web:32fd7945238fdbf5eeb26f"
  });

  firebase.messaging().onBackgroundMessage((payload) => {
    const d = payload.data || {};
    const n = payload.notification || {};
    self.registration.showNotification(d.title || n.title || 'VIP RAQAMLAR', {
      body: d.body || n.body || '',
      icon: '/assets/logo-circle.png',
      badge: '/assets/logo-circle.png',
      tag: d.id || 'vip-xabar',       /* bir xil xabar ikki marta chiqmaydi */
      data: { link: d.link || '/' }
    });
  });
} catch (e) { /* bildirishnoma ulanmasa ham oflayn rejim ishlaydi */ }

/* Bildirishnoma bosilganda — sayt ochiq bo'lsa o'sha oynaga o'tamiz,
   bo'lmasa yangisini ochamiz. */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || '/';
  e.waitUntil((async () => {
    const oynalar = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of oynalar) {
      if (c.url.indexOf(self.location.origin) === 0) {
        await c.focus();
        try { await c.navigate(link); } catch (err) {}
        return;
      }
    }
    await clients.openWindow(link);
  })());
});
