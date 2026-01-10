// Service Worker for Portfolio Tracker PWA
// Version: 3.99.04 (auto-updates)
const VERSION = '3.99.04';
const CACHE_NAME = `portfolio-tracker-${VERSION}`;

// Archivos críticos para caché
const STATIC_CACHE = [
    './manifest.json',
    './assets/icon-192.svg',
    './assets/icon-512.svg'
];

// Install event - cache solo recursos estáticos (íconos)
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${VERSION}`);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_CACHE);
        })
    );
    // Forzar activación inmediata del nuevo SW
    self.skipWaiting();
});

// Activate event - limpiar cachés viejas
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${VERSION}`);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Tomar control de todas las páginas inmediatamente
    return self.clients.claim();
});

// Fetch event - NETWORK FIRST para HTML/JS/CSS
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar requests cross-origin
    if (url.origin !== location.origin) {
        return;
    }

    // Estrategia NETWORK FIRST para todos los archivos de la app
    // (siempre intenta la red primero, solo usa caché si falla)
    if (url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname === '/' ||
        url.pathname.endsWith('/')) {

        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    // Red exitosa - actualizar caché y devolver
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // Red falló - intentar caché
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            console.log(`[SW] Serving from cache (offline): ${url.pathname}`);
                            return cachedResponse;
                        }
                        // No hay caché - retornar error
                        return new Response('Offline y sin caché disponible', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
                })
        );
    } else {
        // Para otros recursos (imágenes, íconos), usar CACHE FIRST
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                return cachedResponse || fetch(request);
            })
        );
    }
});

// Listener para mensajes desde la app (por si queremos forzar actualización manual)
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
