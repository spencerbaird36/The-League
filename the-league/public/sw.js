const CACHE_NAME = 'fantasy-league-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/the_league.png',
  // Add other static assets as needed
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response before caching
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              // Cache successful responses for future use
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Return offline fallback for HTML pages
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html');
          }
          
          // Return a simple offline response for other requests
          return new Response('Offline - please check your internet connection', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'draft-sync') {
    event.waitUntil(syncDraftData());
  }
  
  if (event.tag === 'transaction-sync') {
    event.waitUntil(syncTransactionData());
  }
});

// Function to sync draft data when online
async function syncDraftData() {
  try {
    // Get pending draft picks from IndexedDB or localStorage
    const pendingPicks = getPendingDraftPicks();
    
    for (const pick of pendingPicks) {
      await fetch('/api/draft/pick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pick),
      });
    }
    
    // Clear pending picks after successful sync
    clearPendingDraftPicks();
    console.log('Draft data synced successfully');
  } catch (error) {
    console.error('Failed to sync draft data:', error);
  }
}

// Function to sync transaction data when online
async function syncTransactionData() {
  try {
    // Get pending transactions from IndexedDB or localStorage
    const pendingTransactions = getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      await fetch('/api/teams/pickup-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }
    
    // Clear pending transactions after successful sync
    clearPendingTransactions();
    console.log('Transaction data synced successfully');
  } catch (error) {
    console.error('Failed to sync transaction data:', error);
  }
}

// Helper functions for offline data management
function getPendingDraftPicks() {
  try {
    return JSON.parse(localStorage.getItem('pendingDraftPicks') || '[]');
  } catch {
    return [];
  }
}

function clearPendingDraftPicks() {
  localStorage.removeItem('pendingDraftPicks');
}

function getPendingTransactions() {
  try {
    return JSON.parse(localStorage.getItem('pendingTransactions') || '[]');
  } catch {
    return [];
  }
}

function clearPendingTransactions() {
  localStorage.removeItem('pendingTransactions');
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fantasy League', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app when user clicks "View"
    event.waitUntil(
      clients.openWindow('/')
    );
  }
  // Close action doesn't need additional handling
});