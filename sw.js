const APP_SHELL_CACHE = 'app-shell-v2';
const DYNAMIC_CACHE = 'dynamic-cache-v1';

const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './about.html',
    './style.css',
    './register.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap'
];

const DYNAMIC_ASSET_URLS = [
    'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js',
    'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/main.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(APP_SHELL_CACHE).then(cache => {
            console.log('[SW] Cacheando App Shell...');
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    const keep = [APP_SHELL_CACHE, DYNAMIC_CACHE];
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(k => { if (!keep.includes(k)) return caches.delete(k); })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    if (url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/about.html')) {
        event.respondWith(
            caches.open(APP_SHELL_CACHE).then(cache => cache.match(req).then(cached => {
                if (cached) return cached;
                return fetch(req).then(networkRes => {
                    cache.put(req, networkRes.clone());
                    return networkRes;
                }).catch(() => new Response('Offline', { status: 503 }));
            }))
        );
        return;
    }

    if (url.pathname.endsWith('/calendar.html') || url.pathname.endsWith('/form.html')) {
        event.respondWith(
            caches.match(req).then(cacheRes => {
                if (cacheRes) return cacheRes;
                return fetch(req).then(networkRes => {
                    return caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(req, networkRes.clone());
                        return networkRes;
                    });
                }).catch(() => new Response('Página no disponible offline.', { status: 503 }));
            })
        );
        return;
    }

    if (DYNAMIC_ASSET_URLS.some(u => req.url.includes(u))) {
        event.respondWith(
            caches.match(req).then(cacheRes => {
                if (cacheRes) return cacheRes;
                return fetch(req).then(networkRes => {
                    return caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(req, networkRes.clone());
                        return networkRes;
                    });
                }).catch(() => new Response('Recurso no disponible offline.', { status: 503 }));
            })
        );
        return;
    }

    event.respondWith(
        fetch(req).catch(() => caches.match(req))
    );
});
