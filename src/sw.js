/* Service worker — Control de Puertas
   Cachea SOLO el armazón de la aplicación (HTML, CSS, JS, iconos) para que
   abra al instante y sobreviva a un corte de red. Los datos NUNCA se cachean:
   vienen de Google Sheets y deben ser siempre frescos. */
"use strict";

const VERSION = "v2.1.0";
const CACHE = "puertas-" + VERSION;

const ARMAZON = [
  "./",
  "index.html",
  "paneles.html",
  "manifest.webmanifest",
  "css/base.css",
  "css/componentes.css",
  "css/dashboards.css",
  "css/planta.css",
  "css/impresion.css",
  "js/modulo.js",
  "js/constantes.js",
  "js/util.js",
  "js/config.js",
  "js/auth.js",
  "js/api.js",
  "js/auditoria.js",
  "js/datos.js",
  "js/automatizaciones.js",
  "js/control.js",
  "js/ficha.js",
  "js/comun.js",
  "js/planta.js",
  "js/dashboards.js",
  "js/impresion.js",
  "js/app.js",
  "js/pwa.js",
  "img/logo.png",
  "img/icono-192.png",
  "img/icono-512.png",
  "img/icono-192-maskable.png",
  "img/icono-512-maskable.png"
];

self.addEventListener("install", ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARMAZON))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", ev => {
  if (ev.data === "actualizar") self.skipWaiting();
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Todo lo de Google (login y datos) va siempre a la red, sin tocar la caché.
  if (url.origin !== self.location.origin) return;

  // El HTML se pide primero a la red para recoger versiones nuevas al vuelo,
  // con la copia cacheada como respaldo si no hay conexión.
  if (req.mode === "navigate") {
    ev.respondWith(
      fetch(req)
        .then(res => {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put("index.html", copia));
          return res;
        })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // El resto del armazón: RED PRIMERO, con la caché como respaldo.
  //
  // La estrategia contraria (caché primero) hacía que tras publicar una version
  // nueva los equipos siguieran ejecutando el código viejo hasta la siguiente
  // carga. En una aplicación de producción eso no es aceptable: un arreglo
  // publicado tiene que llegar ya. Sin red, la caché responde igual que antes.
  ev.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
