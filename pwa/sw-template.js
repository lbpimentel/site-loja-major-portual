/**
 * SERVICE WORKER — modelo processado no build.
 *
 * Este arquivo NAO e servido como esta. O vite-plugin-site-config substitui os
 * marcadores de config e emite o resultado em `/sw.js`. Por isso vive fora de
 * `public/`: tudo que esta em public/ e copiado cru, sem passar pelo plugin, e
 * uma Loja acabaria fazendo precache do logo de outra.
 */

const CACHE_NAME = "{{pwa.cacheName}}";

// Somente caminhos que existem com ESTE nome no dist. Os assets processados
// pelo Vite (css/js empacotados) ganham hash no nome e por isso NAO entram
// aqui — quem os guarda e o handler de fetch, no primeiro acesso.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/cadastro.html',
  '/dashboard.html',
  '/tesouraria.html',
  '/biblioteca.html',
  '/calendario.html',
  '/fraternidade.html',
  '/historia.html',
  '/patrono.html',
  '/timbre.html',
  '/sisoriente.html',
  '/fraternidadezap.html',
  '/js/supabase-config.js',
  '/js/theme.js',
  '/js/fraternidade.js',
  "{{marca.logo}}",
  "{{marca.heroBackground}}"
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Um cache.addAll() rejeita inteiro se UM item der 404, e o service
      // worker nunca chega a instalar. Guardando um a um, uma pagina que
      // deixou de existir custa aquela pagina, nao o modo offline todo.
      Promise.all(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((erro) => {
            console.warn('[sw] nao consegui cachear', url, erro);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First, fallback to cache)
self.addEventListener('fetch', (event) => {
  // Ignorar requisicoes do Supabase/externas para evitar problemas de CORS ou RLS
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Duplicar a resposta e salvar no cache para uso offline
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
