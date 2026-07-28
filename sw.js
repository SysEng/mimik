const CACHE_VERSION = 'v29072026';
const CACHE_NAME = `mimik_game_${CACHE_VERSION}`;

const CACHE_RESOURCES = [
    '/index.html',
    '/css/style.css',
    '/js/main.js',
    'langs/en.json',
    'langs/tr.json',
    'icon.png',
    '/assets/RobotoSlab-Regular.woff2',
    '/assets/words.tr.json',
    '/assets/words.en.json',
];

self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(function (cache) {
                return cache.addAll(CACHE_RESOURCES);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const names = await caches.keys();
            await Promise.all(
                names.map((name) => {
                    if (name !== CACHE_NAME)
                        return caches.delete(name);

                    return undefined;
                }),
            );

            await clients.claim();
        })(),
    );
});


self.addEventListener('fetch', function (e) {
    if (e.request.mode === 'navigate') {
        e.respondWith(caches.match('/'));
        return;
    }

    e.respondWith(
        caches.match(e.request)
            .then(function (response) {
                return response || fetch(e.request);
            })
    );
});