/* Modulo activo: puertas o paneles
   Proyecto: Control de Produccion - Interfrigo
   Se carga ANTES que constantes.js: fija a qué hoja apunta esta página.

   Cada módulo es un producto independiente, con su propia hoja de cálculo y sus
   propios datos. No comparten nada: ni filas, ni historial, ni catálogo. Lo
   único común es el código que los presenta.

   La página declara el suyo con  window.MODULO = "paneles"  antes de este
   archivo; si no dice nada, se asume "puertas". */
"use strict";

/* Sello de la publicación. deploy.sh lo reescribe al subir. Sirve para detectar
   que el navegador está ejecutando archivos viejos: si este valor no coincide
   con el de version.json (que se pide siempre fresco), la copia guardada está
   caducada y se descarta sola. */
const BUILD = "dev";

const MODULO_ID = (typeof window.MODULO === "string" && window.MODULO) || "puertas";

/* Identidad visual de cada módulo. El color es lo primero que ve el operario:
   con un vistazo sabe en qué producto está trabajando. */
const MODULOS = {
  puertas: {
    id: "puertas",
    nombre: "Puertas",
    titulo: "Control de Puertas",
    pagina: "puertas.html",
    color: "#0A4283",          // azul de marca
    colorOscuro: "#5c9ceb",
    // Pestañas auxiliares. Los módulos pueden compartir documento, así que
    // cada uno necesita las suyas: si no, mezclarían historial y catálogo.
    tabPorDefecto: "OP PUERTA",
    logTab: "LOG APP",         // ya existe con el historial de puertas
    modelosTab: "MODELOS"
  },
  paneles: {
    id: "paneles",
    nombre: "Paneles",
    titulo: "Control de Paneles",
    pagina: "paneles.html",
    color: "#0B6B4F",          // verde, para distinguirlo de un vistazo
    colorOscuro: "#3fbe90",
    tabPorDefecto: "PANEL",
    logTab: "LOG PANELES",
    modelosTab: "MODELOS PANELES"
  },
  /* El almacén no es una vista de puertas: es un producto aparte. No lleva OPs
     ni fichas ni procesos, sus datos son otros y sus avisos también (aquí lo
     que urge es lo que falta, no lo que alguien marcó). Por eso tiene página
     propia en vez de una pestaña dentro de puertas. */
  inventario: {
    id: "inventario",
    nombre: "Inventario",
    titulo: "Inventario de Almacén",
    pagina: "inventario.html",
    color: "#8A4B08",          // ámbar tierra: ni el azul de puertas ni el verde de paneles
    colorOscuro: "#e0a458",
    // No usa una pestaña de OPs: su verdad está en INSUMOS, BODEGAS y MOVIMIENTOS.
    tabPorDefecto: "MOVIMIENTOS",
    logTab: "LOG APP",
    modelosTab: null
  }
};

const MOD = MODULOS[MODULO_ID] || MODULOS.puertas;

/* Cada módulo guarda su configuración por separado, para que cambiar la hoja de
   uno no toque la del otro. */
const CFG_KEY = "interfrigo.cfg." + MOD.id;

/* Las preferencias que había antes de existir los módulos eran de puertas.
   Se trasladan una sola vez para no perder tema, refresco ni encabezado. */
(function migrar(){
  const viejo = "puertas.cfg.v1";
  if(MOD.id !== "puertas") return;
  if(localStorage.getItem(CFG_KEY) || !localStorage.getItem(viejo)) return;
  try{
    const d = JSON.parse(localStorage.getItem(viejo));
    // La hoja y el Client ID los fija ahora la empresa: no se arrastran.
    ["clientId","sheetId","tab","manual"].forEach(k=>delete d[k]);
    localStorage.setItem(CFG_KEY, JSON.stringify(d));
  }catch(e){}
})();

/* Tinte del módulo, aplicado antes de que se pinte nada. */
(function tintar(){
  const raiz = document.documentElement;
  raiz.style.setProperty("--acc", MOD.color);
  raiz.style.setProperty("--brand", MOD.color);
  raiz.dataset.modulo = MOD.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content = MOD.color;
})();

/** Configuración propia del módulo dentro de config-app.js. */
function configDelModulo(){
  const c = window.CONFIG_SERVIDOR;
  if(!c) return null;
  // Formato nuevo: { modulos: { puertas: {...}, paneles: {...} }, clientId: "..." }
  if(c.modulos && c.modulos[MOD.id]){
    return Object.assign({clientId: c.clientId, dominio: c.dominio}, c.modulos[MOD.id]);
  }
  // Formato antiguo, de cuando solo existían las puertas.
  return MOD.id === "puertas" ? c : null;
}

/* ---------- Pestañas de producto ----------
   Los tres modulos se ven SIEMPRE, como las pestañas de un navegador, en vez de
   esconderse tras un desplegable. Conviven pero no se mezclan: cada pestaña
   lleva su color y va a su propia pagina, con sus propios datos.

   Se generan desde aqui, sobre el contenedor .modsel que ya traen las tres
   paginas, para que añadir un producto sea añadir una entrada a MODULOS y nada
   mas. */
document.addEventListener("DOMContentLoaded", ()=>{
  const caja = document.querySelector(".modsel");
  if(!caja) return;

  caja.className = "modtabs";
  caja.setAttribute("role", "tablist");
  caja.setAttribute("aria-label", "Producto");
  caja.innerHTML = Object.values(MODULOS).map(m=>{
    const act = m.id === MOD.id;
    return `<a class="modtab${act ? " act" : ""}" href="${m.pagina}"
      role="tab" aria-selected="${act}" aria-current="${act ? "page" : "false"}"
      title="${esca(m.titulo)}" style="--mt:${m.color}">
      <span class="punto"></span><span class="nm">${esca(m.nombre)}</span></a>`;
  }).join("");
});

/* esc() vive en util.js, que se carga DESPUES que este archivo. Los nombres de
   producto son nuestros, pero no se construye HTML sin escapar. */
function esca(s){
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
