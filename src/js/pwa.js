/* Instalación como aplicación
   Proyecto: Control de Puertas - Interfrigo
   Registra el service worker, ofrece el botón «Instalar» donde el navegador lo
   permite y explica el procedimiento manual donde no (iPhone y iPad). */
"use strict";

let promptInstalar = null;

/* ---------- registro del service worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      // Si hay una versión nueva esperando, se aplica y se recarga una sola vez.
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) {
            nuevo.postMessage("actualizar");
          }
        });
      });
    }).catch(e => console.warn("SW:", e.message));

    let recargado = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargado) return;
      recargado = true;
      location.reload();
    });
  });
}

/* ---------- detección del entorno ---------- */
const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const yaInstalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: window-controls-overlay)").matches ||
  navigator.standalone === true;

function mostrarBoton(ver) {
  ["btn-instalar", "btn-instalar-gate"].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.classList.toggle("hide", !ver);
  });
}

window.addEventListener("beforeinstallprompt", ev => {
  ev.preventDefault();
  promptInstalar = ev;
  mostrarBoton(true);
});

window.addEventListener("appinstalled", () => {
  promptInstalar = null;
  mostrarBoton(false);
  if (typeof toast === "function") toast("Aplicación instalada", "ok");
});

/* ---------- interfaz ---------- */
function abrirInstalar() {
  const ov = document.getElementById("ov-instalar");
  const cuerpo = document.getElementById("i-pasos");
  if (promptInstalar) {
    // Chrome, Edge y Android: el propio navegador enseña el diálogo.
    promptInstalar.prompt();
    promptInstalar.userChoice.finally(() => { promptInstalar = null; mostrarBoton(false); });
    return;
  }
  cuerpo.innerHTML = esIOS ? PASOS_IOS : PASOS_OTROS;
  ov.classList.remove("hide");
}

const PASOS_IOS = `
  <p class="mut">En iPhone y iPad la instalación se hace desde Safari, en tres toques:</p>
  <ol class="pasos">
    <li>Abre esta página en <b>Safari</b> (no funciona desde Chrome ni desde otra app).</li>
    <li>Toca el botón <b>Compartir</b> <span class="tecla">⬆</span> de la barra inferior.</li>
    <li>Baja y elige <b>Añadir a pantalla de inicio</b>, y luego <b>Añadir</b>.</li>
  </ol>
  <p class="mut">Quedará como una app más, con su icono y a pantalla completa.</p>`;

const PASOS_OTROS = `
  <p class="mut">Tu navegador aún no ofrece el botón de instalación. Puedes hacerlo a mano:</p>
  <ol class="pasos">
    <li><b>Chrome o Edge en escritorio:</b> icono <span class="tecla">⊕</span> al final de la
        barra de direcciones, o menú <span class="tecla">⋮</span> → <b>Instalar…</b></li>
    <li><b>Android:</b> menú <span class="tecla">⋮</span> → <b>Instalar aplicación</b> o
        <b>Añadir a pantalla de inicio</b>.</li>
    <li><b>Firefox en escritorio</b> no admite instalación; usa Chrome o Edge.</li>
  </ol>
  <p class="mut">Si acabas de abrir la página, espera unos segundos y vuelve a intentarlo:
     el navegador necesita comprobarla antes de permitir la instalación.</p>`;

document.addEventListener("DOMContentLoaded", () => {
  ["btn-instalar", "btn-instalar-gate"].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.onclick = abrirInstalar;
  });
  // Si ya está instalada, el botón sobra. Si no, se ofrece de todos modos:
  // sin él, en iPhone nadie descubriría cómo hacerlo.
  mostrarBoton(!yaInstalada());
});

/* ---------- rescate: descartar todo lo guardado y volver a descargar ----------
   Si por lo que sea el equipo se queda con una versión antigua, esto la borra
   sin tener que buscar opciones escondidas del navegador. */
async function forzarActualizacion(){
  try{
    if("serviceWorker" in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if(window.caches){
      const ks = await caches.keys();
      await Promise.all(ks.map(k=>caches.delete(k)));
    }
  }catch(e){ console.warn("actualizar:", e.message); }
  // El parámetro obliga a saltarse cualquier copia intermedia.
  location.replace(location.pathname + "?v=" + Date.now());
}
document.addEventListener("DOMContentLoaded", ()=>{
  const b = document.getElementById("c-actualizar");
  if(b) b.onclick = forzarActualizacion;
});

/* ---------- detección de copia caducada ----------
   El armazón puede quedarse guardado por el service worker o por el propio
   navegador. Sin esto, una corrección publicada podía tardar en llegar o no
   llegar nunca, y desde fuera parecía que el arreglo no funcionaba. */
async function comprobarVersion(){
  if(location.protocol === "file:") return;
  try{
    const r = await fetch("version.json?t=" + Date.now(), {cache:"no-store"});
    if(!r.ok) return;
    const {build} = await r.json();
    if(!build || build === BUILD) return;

    // Una sola vez por sesión: si tras recargar sigue sin coincidir, algo más
    // pasa y no tiene sentido entrar en un bucle de recargas.
    if(sessionStorage.getItem("puertas.curado") === build) {
      console.warn("version desincronizada:", BUILD, "->", build);
      return;
    }
    sessionStorage.setItem("puertas.curado", build);
    console.warn("copia caducada (" + BUILD + " -> " + build + "), actualizando");
    await forzarActualizacion();
  }catch(e){ /* sin red: se sigue con lo que haya */ }
}
window.addEventListener("load", ()=>{ setTimeout(comprobarVersion, 800); });
