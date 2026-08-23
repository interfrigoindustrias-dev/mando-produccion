/* Modulo activo: puertas o paneles
   Proyecto: Control de Produccion - Interfrigo
   Se carga ANTES que constantes.js: fija a qué hoja apunta esta página.

   Cada módulo es un producto independiente, con su propia hoja de cálculo y sus
   propios datos. No comparten nada: ni filas, ni historial, ni catálogo. Lo
   único común es el código que los presenta.

   La página declara el suyo con  window.MODULO = "paneles"  antes de este
   archivo; si no dice nada, se asume "puertas". */
"use strict";

const MODULO_ID = (typeof window.MODULO === "string" && window.MODULO) || "puertas";

/* Identidad visual de cada módulo. El color es lo primero que ve el operario:
   con un vistazo sabe en qué producto está trabajando. */
const MODULOS = {
  puertas: {
    id: "puertas",
    nombre: "Puertas",
    titulo: "Control de Puertas",
    pagina: "index.html",
    color: "#0A4283",          // azul de marca
    colorOscuro: "#5c9ceb"
  },
  paneles: {
    id: "paneles",
    nombre: "Paneles",
    titulo: "Control de Paneles",
    pagina: "paneles.html",
    color: "#0B6B4F",          // verde, para distinguirlo de un vistazo
    colorOscuro: "#3fbe90"
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

/* ---------- Conmutador de producto ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  const btn = document.getElementById("btn-modulo");
  const menu = document.getElementById("mod-menu");
  const nom = document.getElementById("mod-nombre");
  if(nom) nom.textContent = MOD.nombre;
  if(!btn || !menu) return;

  menu.innerHTML = Object.values(MODULOS).map(m=>`
    <a href="${m.pagina}" class="${m.id===MOD.id?"act":""}">
      <span class="punto" style="background:${m.color}"></span>${m.nombre}
    </a>`).join("");

  btn.onclick = ev => { ev.stopPropagation(); menu.classList.toggle("hide"); };
  document.addEventListener("click", () => menu.classList.add("hide"));
});
