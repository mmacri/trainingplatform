const CACHE_NAME = "gridguard-learning-v4";
const APP_SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isAppAsset = requestUrl.pathname.endsWith("/") || requestUrl.pathname.endsWith("/index.html") || requestUrl.pathname.includes("/assets/");
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => {
        if (isAppAsset) {
          return caches.match(event.request).then((cached) => cached ?? caches.match("./index.html"));
        }
        return caches.match(event.request)
        .then((response) => {
          if (response) return response;
          return caches.match("./index.html");
        });
      })
  );
});
