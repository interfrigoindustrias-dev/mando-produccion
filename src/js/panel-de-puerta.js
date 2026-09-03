"use strict";

/* El panel que acompaña a una puerta.
 *
 * POR QUE
 *   Una puerta de camara casi nunca va sola: lleva el panel del cerramiento, y
 *   hasta ahora habia que crear la puerta aqui, cambiar de modulo, volver a
 *   escribir el cliente y crear la linea de panel a mano. Dos veces el mismo
 *   nombre es dos oportunidades de escribirlo distinto, y cuando el nombre no
 *   coincide el panel y su puerta dejan de encontrarse.
 *
 * QUE HACE
 *   En la ficha de puerta se marca «lleva panel» y aparecen los campos de UNA
 *   linea de panel. Al guardar, la puerta va a su pestaña y el panel a la
 *   suya, con el cliente, la fecha y la prioridad copiados de la puerta, y con
 *   el mismo numero de OP: es lo que despues los empareja.
 *
 * LO QUE NO HACE
 *   Una linea, no varias: es lo que se pidio, y lo que cubre el caso normal.
 *   Un cerramiento entero con diez referencias distintas se sigue creando en
 *   Paneles, que es donde estan las herramientas para eso.
 *
 * SI FALLA
 *   La puerta se guarda IGUAL. El panel es un extra; perder la puerta por no
 *   poder escribir su panel seria mucho peor que quedarse sin el panel. Si no
 *   se puede, se dice claramente y con el numero de OP, para poder crearlo a
 *   mano sin adivinar cual era.
 */

/** La pestaña de paneles: mismo documento, otra hoja. */
function destinoPanel(){
  const srv = (window.CONFIG_SERVIDOR && window.CONFIG_SERVIDOR.modulos
               && window.CONFIG_SERVIDOR.modulos.paneles) || {};
  let guardado = {};
  try{ guardado = JSON.parse(localStorage.getItem("interfrigo.cfg.paneles") || "{}"); }
  catch(e){ guardado = {}; }
  return {
    sheetId: guardado.sheetId || srv.sheetId || CFG.sheetId,
    tab:     guardado.tab     || srv.tab     || "PANEL"
  };
}

const MP = (typeof MODELO_PANELES !== "undefined") ? MODELO_PANELES : null;

/** Llena los desplegables con las listas REALES de la hoja de paneles. */
function prepararPanelDePuerta(){
  if(!MP || !$("#np-prod")) return;
  const op1 = v => `<option>${esc(v)}</option>`;
  const vacio = `<option value="">—</option>`;
  $("#np-prod").innerHTML = vacio + MP.listas.PRODUCTOS.map(op1).join("");
  $("#np-ranu").innerHTML = vacio + MP.listas.RANURADOS.map(op1).join("");
  const caras = vacio + (MP.listas.CARAS || []).map(op1).join("");
  $("#np-cara-a").innerHTML = caras;
  $("#np-cara-b").innerHTML = caras;

  const ck = $("#n-panel");
  const caja = $("#n-panel-campos");
  const pintar = () => {
    caja.classList.toggle("hide", !ck.checked);
    // Obligatorios solo cuando el bloque esta a la vista: si no, el formulario
    // no se deja enviar por unos campos que nadie ve.
    ["np-cant","np-largo","np-prod"].forEach(id=>{
      const e = $("#"+id); if(e) e.required = ck.checked;
    });
  };
  ck.onchange = pintar;
  pintar();
}

/** ¿Se pidió panel en esta ficha? */
const llevaPanelLaPuerta = () => !!($("#n-panel") && $("#n-panel").checked);

/** La fila de panel, con la forma que espera la hoja de paneles. */
function filaPanel(op, cliente, prio, fecha){
  const c = new Array(MP.ncol).fill("");
  const K = MP.col;
  c[K.FECHA] = fecha;
  c[K.CLI]   = cliente;
  c[K.OP]    = op;                       // el mismo numero: es lo que los empareja
  c[K.PRIO]  = prio;
  c[K.CANT]  = numCell($("#np-cant").value);
  c[K.LARGO] = numCell($("#np-largo").value);
  c[K.PROD]  = $("#np-prod").value;
  c[K.RANU]  = $("#np-ranu").value;
  c[K.CARA_A]= $("#np-cara-a").value;
  c[K.CARA_B]= $("#np-cara-b").value;
  /* Los tres procesos van como casilla sin marcar, no vacios: vacio significa
     «no aplica» y en paneles los tres aplican siempre. */
  MP.procs.forEach(p => { c[p.i] = false; });
  return c;
}

/** Primera fila libre de la pestaña de paneles, mirando la hoja de verdad. */
async function primeraFilaLibrePanel(tab){
  const d = await api(`/values/${encodeURIComponent(tab)}!C1:C?majorDimension=COLUMNS`);
  const col = (d.values && d.values[0]) || [];
  /* La ultima con algo escrito, no la primera vacia: en medio hay huecos de
     lineas anuladas, y meterse ahi pisaria una fila que alguien mira. */
  let ultima = 1;
  col.forEach((v, i) => { if(String(v ?? "").trim()) ultima = i + 1; });
  return ultima + 1;
}

/** Escribe la linea de panel. Devuelve la fila, o lanza con el motivo. */
async function crearPanelDeLaPuerta(op, cliente, prio, fecha){
  if(!MP) throw new Error("no hay modelo de paneles cargado");
  const destino = destinoPanel();
  /* Solo si paneles vive en ESTE documento. Si algun dia se separan, escribir
     a ciegas en otro archivo con el mismo token es justo la clase de cosa que
     mete filas en la hoja equivocada sin que nadie se entere: mejor decirlo. */
  if(destino.sheetId !== CFG.sheetId){
    throw new Error("la hoja de paneles es otro documento; créalo desde el módulo Paneles");
  }
  const fila = await primeraFilaLibrePanel(destino.tab);
  const c = filaPanel(op, cliente, prio, fecha);

  /* Por tramos, saltando las columnas de formula. Escribir A..Y de un tirón es
     comodo y equivocado: el "" de las celdas que no se rellenan no las deja en
     paz, las BORRA, y K, L, V y W son formula de la hoja —poliuretano y
     lamina—. El sintoma seria de los peores: lineas viejas con poliuretano,
     lineas nuevas en blanco, ningun error por ningun lado, y el consumo de
     material cuadrando cada vez peor sin motivo aparente. */
  for(const t of tramosFila(MP, fila, c)){
    await api(`/values/${encodeURIComponent(destino.tab)}!${t.a1}`
              + `?valueInputOption=USER_ENTERED`,
              {method:"PUT", body: JSON.stringify({values: t.v})});
  }
  return fila;
}

document.addEventListener("DOMContentLoaded", prepararPanelDePuerta);
