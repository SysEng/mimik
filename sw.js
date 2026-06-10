var cacheName = 'sessiz_kelimeler';
var filesToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    'langs/en.json',
    'langs/tr.json',
    'icon.png',
    '/assets/words.json',
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(cacheName)
            .then(function (cache) {
                return cache.addAll(filesToCache);
            })
    );
});

/* Serve cached content when offline */
self.addEventListener('fetch', function (e) {
    e.respondWith(
        caches.match(e.request).then(function (response) {
            return response || fetch(e.request);
        })
    );
});