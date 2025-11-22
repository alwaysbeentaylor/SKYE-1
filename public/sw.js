// Service Worker voor SKYE PWA
const CACHE_NAME = 'skye-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache).catch((err) => {
          console.log('Service Worker: Some files failed to cache', err);
        });
      })
  );
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Firebase/Firestore)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Store active call notifications
const activeCallNotifications = new Map();

// Handle push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'SKYE';
  const notificationId = data.data?.callerId || 'default';
  
  // Special handling for incoming calls - persistent notification
  if (data.data?.type === 'incoming_call') {
    const callerName = data.data.callerName || 'Iemand';
    const options = {
      body: `${callerName} belt je...`,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: `call_${notificationId}`, // Use tag to replace/update same notification
      requireInteraction: true, // Keep notification visible until user interacts
      vibrate: [200, 100, 200, 100, 200, 100, 200], // Vibrate pattern
      data: {
        ...data.data,
        notificationId
      },
      actions: [
        { action: 'answer', title: '📞 Opnemen' },
        { action: 'decline', title: '❌ Weigeren' }
      ],
      silent: false,
      renotify: true // Re-notify even if notification with same tag exists
    };

    // Show notification and start persistent updates
    event.waitUntil(
      self.registration.showNotification(title, options).then(() => {
        // Start interval to keep notification alive
        if (!activeCallNotifications.has(notificationId)) {
          const intervalId = setInterval(() => {
            // Update notification to keep it visible
            self.registration.showNotification(title, {
              ...options,
              body: `${callerName} belt je nog steeds...`,
              renotify: true
            }).catch(err => {
              console.log('Error updating notification:', err);
              // If notification fails, stop interval
              clearInterval(intervalId);
              activeCallNotifications.delete(notificationId);
            });
          }, 5000); // Update every 5 seconds
          
          activeCallNotifications.set(notificationId, intervalId);
        }
      })
    );
  } else {
    // Regular notification
    const options = {
      body: data.body || 'Je hebt een nieuwe melding',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data || {};
  const notificationId = data.notificationId;
  
  // Stop persistent notification if it's a call
  if (data.type === 'incoming_call' && notificationId) {
    const intervalId = activeCallNotifications.get(notificationId);
    if (intervalId) {
      clearInterval(intervalId);
      activeCallNotifications.delete(notificationId);
    }
  }
  
  // Handle action buttons
  if (event.action === 'answer') {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Focus existing window or open new one
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus().then(() => client.postMessage({
              type: 'answer_call',
              callerId: data.callerId
            }));
          }
        }
        return clients.openWindow('/').then((client) => {
          if (client) {
            return client.postMessage({
              type: 'answer_call',
              callerId: data.callerId
            });
          }
        });
      })
    );
  } else if (event.action === 'decline') {
    // Send decline message to app
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        clientList.forEach(client => {
          client.postMessage({
            type: 'decline_call',
            callerId: data.callerId
          });
        });
      })
    );
  } else {
    // Default: open app
    if (data.type === 'incoming_call') {
      event.waitUntil(
        clients.openWindow('/')
      );
    }
  }
});

// Listen for messages from app to stop notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'stop_call_notification') {
    const notificationId = event.data.callerId;
    const intervalId = activeCallNotifications.get(notificationId);
    if (intervalId) {
      clearInterval(intervalId);
      activeCallNotifications.delete(notificationId);
    }
    // Close all notifications with this tag
    self.registration.getNotifications({ tag: `call_${notificationId}` }).then(notifications => {
      notifications.forEach(notification => notification.close());
    });
  }
});

