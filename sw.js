// sw.js (Service Worker Básico)
const CACHE_NAME = 'estudio-derecho-cache-v1.2'; // Incrementa la versión al cambiar assets
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    'https://unpkg.com/dexie@3/dist/dexie.js', // Cache Dexie.js
    // '/data/preguntas_derecho.json', // Si tuvieras el JSON como archivo separado
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/favicon.ico' // Añade tu favicon si tienes uno
];

// Instalación del Service Worker y Cacheo de Assets
self.addEventListener('install', event => {
    console.log('SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('SW: Cache abierto, cacheando archivos principales.');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => {
                console.log('SW: Todos los archivos principales cacheados.');
                return self.skipWaiting(); // Forza la activación del nuevo SW
            })
            .catch(error => {
                console.error('SW: Falló el cacheo de archivos principales durante la instalación.', error);
            })
    );
});

// Activación del Service Worker y Limpieza de Caches Antiguos
self.addEventListener('activate', event => {
    console.log('SW: Activado.');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Borrando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('SW: Reclamando clientes.');
            return self.clients.claim(); // Toma control inmediato de las páginas abiertas
        })
    );
});

// Estrategia de Cache: Network Falling Back to Cache
self.addEventListener('fetch', event => {
    // console.log('SW: Fetching', event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en caché, devolver la respuesta cacheada
                if (cachedResponse) {
                    // console.log('SW: Recurso encontrado en caché:', event.request.url);
                    return cachedResponse;
                }

                // Si no está en caché, ir a la red
                // console.log('SW: Recurso no encontrado en caché, buscando en red:', event.request.url);
                return fetch(event.request).then(
                    networkResponse => {
                        // Si la respuesta de red es válida, cachearla y devolverla
                        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') { // Solo cachear GETs exitosos
                            // console.log('SW: Recurso obtenido de la red y cacheado:', event.request.url);
                            return caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                        }
                        return networkResponse; // Devolver respuestas no exitosas o no GET sin cachear
                    }
                ).catch(error => {
                    console.error('SW: Error al buscar en red y no se encontró en caché.', event.request.url, error);
                    // Aquí podrías devolver una página offline genérica si lo deseas
                    // return new Response("Contenido no disponible offline.", { headers: { 'Content-Type': 'text/plain' }});
                });
            })
    );
});
