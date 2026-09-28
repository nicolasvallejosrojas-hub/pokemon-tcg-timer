/* =========================================================
   sw.js — la app instalable
   ---------------------------------------------------------
   Siempre va a la red primero y guarda una copia de lo que trae. La copia se
   usa SOLO si la red falla: así una versión nueva se ve al tiro (nadie queda
   pegado en una vieja) y, sin señal, la página igual abre. La vista del timer
   ya guarda en el teléfono la hora de término de la ronda, así que abierta
   sin señal sigue marcando bien, y se pone al día sola cuando vuelve la red.

   Guarda lo propio del sitio y los módulos de Firebase. Las conexiones a la
   base y al inicio de sesión no pasan por acá.

   Una copia por archivo: la de ?v=9 reemplaza a la de ?v=8, y la de
   timer-view.html?sala=a sirve para ?sala=b (es la misma página; la sala la
   lee el código).
   ========================================================= */
const CAJA = "copias-1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(clients.claim()));

self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  const firebase = u.origin === "https://www.gstatic.com" && u.pathname.startsWith("/firebasejs/");
  if (u.origin !== location.origin && !firebase) return;
  e.respondWith(fetch(r).then(res => {
    if (res.ok){
      const copia = res.clone();
      e.waitUntil(caches.open(CAJA).then(c => c.delete(r, { ignoreSearch: true }).then(() => c.put(r, copia))));
    }
    return res;
  }, () => caches.match(r, { ignoreSearch: true }).then(c => c || Response.error())));
});
