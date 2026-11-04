// Jerry service worker: shows push notifications and opens the app on the item when tapped.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Jerry', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Jerry', {
    body: d.body || '', icon: 'icon.png', badge: 'icon.png', tag: d.url || undefined,
    data: { focus: d.url || '' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = './?focus=' + encodeURIComponent(e.notification.data.focus || '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { c.postMessage({ focus: e.notification.data.focus }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
