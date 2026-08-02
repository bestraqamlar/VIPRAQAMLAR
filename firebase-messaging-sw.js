/* Firebase Cloud Messaging — fon (background) push bildirishnomalari uchun
   service worker. Sayt yopiq yoki fon rejimida bo'lganda ham, mijozning
   qurilmasiga tizim bildirishnomasi ko'rsatiladi. Sayt OCHIQ turgan payt
   uchun esa index.html ichidagi messaging.onMessage() ishlatiladi (fon
   bildirishnomasi ikki marta chiqib ketmasligi uchun). */

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

/* MUHIM: bu sozlamalar index.html va admin.html dagi firebaseConfig bilan
   AYNAN BIR XIL bo'lishi kerak. Service worker alohida ishlaydi va sahifa
   JS o'zgaruvchilariga kira olmaydi, shu sababli shu yerda qayta yozilgan. */
firebase.initializeApp({
  apiKey: "AIzaSyAZVM_C5tRYe77j4OvQtrBhV3dpEZAxk_A",
  authDomain: "vip-raqamlar.firebaseapp.com",
  projectId: "vip-raqamlar",
  storageBucket: "vip-raqamlar.firebasestorage.app",
  messagingSenderId: "872049914686",
  appId: "1:872049914686:web:32fd7945238fdbf5eeb26f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'VIP RAQAMLAR';
  const body = (payload.notification && payload.notification.body) || '';
  self.registration.showNotification(title, {
    body: body,
    icon: '/assets/logo-circle.png',
    badge: '/assets/logo-circle.png',
    data: (payload.data && payload.data.url) ? { url: payload.data.url } : { url: '/' }
  });
});

// Bildirishnoma bosilganda — saytga (agar allaqachon ochiq bo'lsa, o'sha
// oynaga; aks holda yangi oynada) olib o'tadi.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
