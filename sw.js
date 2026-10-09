/* VIP RAQAMLAR — oflayn rejim.
   Maqsad: internet umuman yo'q bo'lsa ham sayt ochilsin va keshdagi
   katalog ko'rinsin. Dinamik ma'lumot (Firestore, funksiyalar) HECH
   QACHON keshlanmaydi — ular doim jonli olinadi. */
const CACHE = 'vipraqamlar-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/assets/logo-circle.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(()=>{})).then(() => self.skipWaiting())
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
