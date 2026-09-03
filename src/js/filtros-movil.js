"use strict";

/* Los filtros, plegados en pantallas pequeñas.
 *
 * POR QUE
 *   Control de OPs tiene diez filtros. En el escritorio caben en una linea y
 *   no molestan. En un movil cada uno ocupa su propio renglon —dos por linea
 *   eran ilegibles— asi que antes de ver la primera fila de la tabla hay que
 *   pasar una pantalla entera de desplegables. La herramienta estorba mas que
 *   ayuda justo donde mas prisa hay: de pie, junto a la maquina.
 *
 * QUE HACE
 *   Deja la busqueda a la vista —es el filtro que se usa siempre— y esconde
 *   los demas tras un boton que dice cuantos hay puestos. Si hay alguno
 *   activo el boton se enciende, para que nadie se quede mirando una tabla
 *   medio vacia sin entender por que.
 *
 *   En escritorio no hace nada: el boton se oculta por CSS y la barra se ve
 *   entera, como siempre.
 *
 * DONDE
 *   En cualquier `.bar` con tres o mas campos. Las barras de dos campos caben
 *   igual y plegarlas seria un clic de mas para nada. Las de los formularios
 *   —crear ficha, editar— no llevan `.f` sueltos, asi que no se tocan.
 */

const FILTROS_MIN = 3;          // menos de esto no compensa plegar

/** ¿Este control tiene algo puesto? El vacio es «sin filtrar». */
function filtroPuesto(campo){
  const c = campo.querySelector("input, select, textarea");
  if(!c) return false;
  if(c.type === "checkbox" || c.type === "radio") return c.checked;
  return String(c.value ?? "").trim() !== "";
}

/** Cuenta y pinta: el boton dice cuantos filtros hay puestos ahora mismo. */
function pintarContador(bar){
  const tog = bar.querySelector(":scope > .filtro-tog");
  if(!tog) return;
  const campos = [...bar.querySelectorAll(":scope > .f:not(.wide)")];
  const n = campos.filter(filtroPuesto).length;
  tog.classList.toggle("hay", n > 0);
  tog.querySelector(".filtro-n").textContent = n ? ` (${n})` : "";
  tog.setAttribute("aria-expanded", bar.classList.contains("abierto") ? "true" : "false");
}

/** Engancha una barra. Idempotente: repintar la vista no duplica botones. */
function plegarBarra(bar){
  if(bar.dataset.plegable) { pintarContador(bar); return; }
  const campos = bar.querySelectorAll(":scope > .f");
  if(campos.length < FILTROS_MIN) return;
  bar.dataset.plegable = "1";

  const tog = document.createElement("button");
  tog.type = "button";
  tog.className = "btn sm filtro-tog";
  tog.setAttribute("aria-expanded", "false");
  tog.innerHTML = `<span>Filtros</span><span class="filtro-n"></span>`;
  tog.onclick = () => {
    bar.classList.toggle("abierto");
    pintarContador(bar);
  };

  /* Delante de todo menos de la busqueda: asi el boton y el campo que de
     verdad se usa quedan juntos en la primera linea. */
  const busca = bar.querySelector(":scope > .f.wide");
  bar.insertBefore(tog, busca ? busca.nextSibling : bar.firstChild);

  // El contador tiene que seguir a los filtros, tambien cuando los cambia el
  // codigo (limpiar, un enlace que llega con filtro puesto).
  bar.addEventListener("change", () => pintarContador(bar));
  bar.addEventListener("input",  () => pintarContador(bar));
  pintarContador(bar);
}

/** Todas las barras de la pagina. Se puede llamar tantas veces como haga falta. */
function plegarFiltros(){
  document.querySelectorAll(".bar").forEach(plegarBarra);
}

document.addEventListener("DOMContentLoaded", plegarFiltros);
