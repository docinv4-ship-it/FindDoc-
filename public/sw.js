/**
 * DocFind Enterprise Progressive Web App (PWA) Service Worker
 * Version: 2.0.1 (Fixed Null Response Bug)
 */

const VERSION = "v2.0.1";
const CACHE_KEYS = {
  STATIC: `docfind-static-${VERSION}`,
  DYNAMIC: `docfind-dynamic-${VERSION}`,
  IMAGES: `docfind-images-${VERSION}`,
};

const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon.svg",
];

const MAX_DYNAMIC_ITEMS = 60;

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
}

// 1. INSTALL EVENT
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_KEYS.STATIC).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).catch((err) => {
      console.warn("[SW] Pre-cache warning:", err);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE EVENT
self.addEventListener("activate", (event) => {
  const currentCaches = Object.values(CACHE_KEYS);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !currentCaches.includes(key))
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT - INTELLIGENT ROUTING
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // A. Bypass Non-GET Requests
  if (request.method !== "GET") return;

  // B. Bypass Cross-Origin Requests
  if (url.origin !== self.location.origin) return;

  // C. Bypass Auth, Next.js Internal Data Fetching & Direct API Calls
  if (
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("_next/data") ||
    request.headers.get("x-nextjs-data")
  ) {
    return; // Directly hand over control back to the browser network layer
  }

  // D. Navigation Requests (Pages/HTML): Network-First
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.status === 200) {
            const copy = response.clone();
            const cache = await caches.open(CACHE_KEYS.DYNAMIC);
            cache.put(request, copy);
            limitCacheSize(CACHE_KEYS.DYNAMIC, MAX_DYNAMIC_ITEMS);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;

          const rootCache = await caches.match("/");
          return rootCache || new Response("Offline - DocFind", { 
            status: 503, 
            headers: { "Content-Type": "text/html" } 
          });
        })
    );
    return;
  }

  // E. Static Assets: Stale-While-Revalidate (FIXED: NEVER RETURN NULL)
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then(async (networkResponse) => {
          if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_KEYS.STATIC);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Return a valid empty response if network fails instead of null
          return cachedResponse || new Response("", { status: 404 });
        });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // F. Images & Media: Cache-First (FIXED: NEVER RETURN NULL)
  if (request.destination === "image" || request.destination === "font") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then(async (response) => {
            if (response.status === 200) {
              const cache = await caches.open(CACHE_KEYS.IMAGES);
              cache.put(request, response.clone());
              limitCacheSize(CACHE_KEYS.IMAGES, 30);
            }
            return response;
          })
          .catch(() => new Response("", { status: 404 }));
      })
    );
    return;
  }

  // G. Generic Default: Network-First with Safe Fallback (FIXED: NEVER RETURN NULL)
  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.status === 200) {
          const cache = await caches.open(CACHE_KEYS.DYNAMIC);
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        // Return valid Response object instead of null to prevent TypeError
        return new Response(JSON.stringify({ error: "Network unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      })
  );
});

// 4. PUSH NOTIFICATION HANDLER
self.addEventListener("push", (event) => {
  let data = {
    title: "DocFind Alert",
    body: "You have a new update in your portal.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    url: "/",
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/icon-96x96.png",
    tag: data.tag || "docfind-notification",
    renotify: true,
    data: {
      url: data.url || "/",
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: "open", title: "View Details" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 5. NOTIFICATION CLICK HANDLER
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "close") return;

  const rawUrl = event.notification.data?.url || "/";
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        if ("navigate" in client && "focus" in client) {
          client.focus();
          return client.navigate(targetUrl);
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 6. CLIENT MESSAGING (IPC)
self.addEventListener("message", (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CLEAR_CACHE":
      event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      );
      break;

    default:
      break;
  }
});
