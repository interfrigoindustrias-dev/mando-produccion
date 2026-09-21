"use strict";

/* Los paneles de una puerta.
 *
 * POR QUE
 *   Una puerta de camara lleva paneles —la hoja, el marco— que se fabrican en
 *   la linea de paneles pero no se venden sueltos: se usan para armar la
 *   puerta. Crearlos a mano en Paneles obligaba a escribir otra vez el cliente
 *   y a acordarse de que ese panel no se despacha.
 *
 * QUE HACE (contrato acordado con el modulo de paneles)
 *   En la ficha de puerta se marca «lleva panel» y se añaden UNA O VARIAS
 *   lineas de panel. Al guardar:
 *     · se pide a Paneles el SIGUIENTE numero de OP (siguienteOpPaneles): una
 *       OP de paneles por ficha de puertas, no el numero de la puerta;
 *     · cada puerta de la ficha lleva todas esas lineas. Si en total es mas de
 *       una, se numeran seguidas: 540-1, 540-2…; si es una sola, «540»;
 *     · cada linea guarda en OP PUERTA el codigo exacto de su puerta, y nace
 *       sin estado, con cliente, fecha y prioridad copiados de la puerta;
 *     · la puerta guarda en OP PANEL el numero base del panel («540»).
 *   Al terminarlo en Paneles, el panel pasa a «PARA PUERTA» y no sale ni en
 *   almacen ni en despacho. En Planta de puertas la tarjeta avisa si el panel
 *   esta pendiente o listo, sin bloquear nada.
 *
 * SI FALLA
 *   La puerta se guarda IGUAL: perderla por no poder escribir su panel seria
 *   mucho peor que quedarse sin el panel. Se dice claramente, con la OP de la
 *   puerta delante, para poder crearlo a mano.
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

/** Las funciones que pone Paneles en modelo.js. Hasta que esten, no se crea
 *  nada vinculado: un panel sin su vinculo es justo lo que se quiere evitar. */
const panelesListos = () => !!MP &&
  typeof siguienteOpPaneles === "function" && typeof columnaPuertaEnPaneles === "function" &&
  typeof filaPanelDePuerta === "function";

/* ------------------------------ el formulario ------------------------------ */
function opcionesPanel(){
  const op1 = v => `<option>${esc(v)}</option>`;
  const vacio = `<option value="">—</option>`;
  return {
    prod:  vacio + MP.listas.PRODUCTOS.map(op1).join(""),
    ranu:  vacio + MP.listas.RANURADOS.map(op1).join(""),
    caras: vacio + (MP.listas.CARAS || []).map(op1).join("")
  };
}

function lineaPanelHTML(){
  const o = opcionesPanel();
  return `<div class="np-linea">
    <label class="f"><span class="req">Cantidad</span>
      <input class="inp np-cant" type="number" step="1" min="1" inputmode="numeric"></label>
    <label class="f"><span class="req">Largo (m)</span>
      <input class="inp np-largo" type="number" step="any" min="0" inputmode="decimal"></label>
    <label class="f"><span class="req">Producto</span><select class="inp np-prod">${o.prod}</select></label>
    <label class="f"><span>Ranurado</span><select class="inp np-ranu">${o.ranu}</select></label>
    <label class="f"><span>Cara A</span><select class="inp np-cara-a">${o.caras}</select></label>
    <label class="f"><span>Cara B</span><select class="inp np-cara-b">${o.caras}</select></label>
    <button type="button" class="btn sm np-quitar" title="Quitar esta línea" aria-label="Quitar esta línea">×</button>
  </div>`;
}

/** Cuantas puertas va a crear la ficha: de ella salen las lineas de panel. */
const puertasDeLaFicha = () => Math.max(1, Math.min(40, parseInt($("#n-qty")?.value, 10) || 1));

function pintarResumenPanel(){
  const caja = $("#np-resumen"); if(!caja) return;
  const n = $$("#np-lineas .np-linea").length, q = puertasDeLaFicha();
  const total = n * q;
  caja.textContent = n
    ? `${q} puerta${q === 1 ? "" : "s"} × ${n} línea${n === 1 ? "" : "s"} = ${total} línea${total === 1 ? "" : "s"} en Paneles, con el siguiente número de OP de paneles.`
    : "Añade al menos una línea de panel.";
}

function prepararPanelDePuerta(){
  const ck = $("#n-panel"), caja = $("#n-panel-campos"), lista = $("#np-lineas");
  if(!MP || !ck || !caja || !lista) return;

  const obligatorios = () => {
    // Solo con la casilla marcada: si no, el formulario no se deja enviar por
    // unos campos que nadie ve.
    $$("#np-lineas .np-cant, #np-lineas .np-largo, #np-lineas .np-prod")
      .forEach(e => { e.required = ck.checked; });
  };
  const anadir = () => {
    lista.insertAdjacentHTML("beforeend", lineaPanelHTML());
    obligatorios(); pintarResumenPanel();
  };
  const pintar = () => {
    caja.classList.toggle("hide", !ck.checked);
    if(ck.checked && !lista.children.length) anadir();
    obligatorios(); pintarResumenPanel();
  };
  ck.onchange = pintar;
  $("#np-mas").onclick = anadir;
  lista.addEventListener("click", ev => {
    const b = ev.target.closest(".np-quitar"); if(!b) return;
    b.closest(".np-linea").remove();
    pintarResumenPanel();
  });
  const qty = $("#n-qty");
  if(qty) qty.addEventListener("input", pintarResumenPanel);
  pintar();
}

/** ¿Se pidió panel en esta ficha? */
const llevaPanelLaPuerta = () => !!($("#n-panel") && $("#n-panel").checked);

/** Vacia el bloque de panel despues de guardar una ficha. */
function limpiarPanelDePuerta(){
  const ck = $("#n-panel"), lista = $("#np-lineas");
  if(lista) lista.innerHTML = "";
  if(ck){ ck.checked = false; ck.onchange && ck.onchange(); }
}

/** Las lineas del formulario, ya leidas. Lanza si alguna esta a medias. */
function lineasPanelDelFormulario(){
  const lineas = $$("#np-lineas .np-linea").map(el => ({
    cant:  numCell(el.querySelector(".np-cant").value),
    largo: numCell(el.querySelector(".np-largo").value),
    prod:  el.querySelector(".np-prod").value,
    ranu:  el.querySelector(".np-ranu").value,
    caraA: el.querySelector(".np-cara-a").value,
    caraB: el.querySelector(".np-cara-b").value
  }));
  if(!lineas.length) throw new Error("no hay ninguna línea de panel");
  const mal = lineas.findIndex(l => !(num(l.cant) > 0) || !(num(l.largo) > 0) || !l.prod);
  if(mal >= 0) throw new Error(`la línea de panel ${mal + 1} necesita cantidad, largo y producto`);
  return lineas;
}

/* ------------------------------ crear ------------------------------ */
/** Primera fila libre de la pestaña de paneles, mirando la hoja de verdad. */
async function primeraFilaLibrePanel(tab){
  /* Se lee A:C por FILAS y no la columna C con majorDimension=COLUMNS: si esa
     opcion no se aplicara, values[0] seria solo la primera fila y el calculo
     daria «fila 2», encima de datos. Leer por filas da lo mismo en cualquier
     caso. Cuenta cualquier celda escrita en A, B o C —fecha, cliente u OP—. */
  const d = await api(`/values/${encodeURIComponent(`'${tab.replace(/'/g, "''")}'!A1:C`)}`);
  const filas = d.values || [];
  /* La ultima con algo escrito, no la primera vacia: en medio hay huecos de
     lineas anuladas, y meterse ahi pisaria una fila que alguien mira. */
  let ultima = 1;
  filas.forEach((f, i) => { if((f || []).some(v => String(v ?? "").trim())) ultima = i + 1; });
  return ultima + 1;
}

/** Comprueba que las filas donde se va a escribir estan vacias de verdad. Es la
 *  ultima barrera antes de pisar una linea de panel que existe. */
async function filasVaciasPanel(tab, desde, hasta){
  const d = await api(`/values/${encodeURIComponent(`'${tab.replace(/'/g, "''")}'!A${desde}:J${hasta}`)}`);
  return !(d.values || []).some(f => (f || []).some(v => String(v ?? "").trim() !== "" && v !== false));
}

/** El codigo de una puerta tal como lo guardan los dos modulos: texto, sin
 *  espacios a los lados. En la hoja la OP a veces es un numero (504) y a veces
 *  texto («494-1»); sin normalizar, el vinculo no se encontraria. */
const codigoPuerta = v => String(v ?? "").trim();

/** Crea la OP de paneles de una ficha de puertas.
 *  puertas: [{r, op}] las filas de puerta recien creadas.
 *  Devuelve {op, lineas}. Lanza con el motivo si no se puede. */
async function crearPanelesDeLaFicha(puertas, cliente, prio, fecha, lineas){
  if(!panelesListos())
    throw new Error("esta versión todavía no sabe vincular paneles; recarga con Ctrl+F5");
  const destino = destinoPanel();
  /* Solo si paneles vive en ESTE documento. Escribir a ciegas en otro archivo
     con el mismo token mete filas en la hoja equivocada sin que nadie se
     entere: mejor decirlo. */
  if(destino.sheetId !== CFG.sheetId)
    throw new Error("la hoja de paneles es otro documento; créalo desde el módulo Paneles");

  const colPuerta = await columnaPuertaEnPaneles(destino.tab);
  if(colPuerta < 0)
    throw new Error("falta la columna OP PUERTA en la hoja de paneles: abre Paneles una vez para que la cree");

  const base = await siguienteOpPaneles(destino.tab);
  const total = puertas.length * lineas.length;
  const nombre = i => total > 1 ? `${base}-${i + 1}` : String(base);

  let fila = await primeraFilaLibrePanel(destino.tab);
  if(!(await filasVaciasPanel(destino.tab, fila, fila + total - 1)))
    throw new Error(`las filas ${fila}–${fila + total - 1} de la hoja de paneles no están vacías; no se escribe nada`);
  const data = [], creadas = [];
  let i = 0;
  for(const p of puertas){
    for(const l of lineas){
      const op = nombre(i++);
      const c = filaPanelDePuerta({op, cliente, prio, fecha, puerta: codigoPuerta(p.op), ...l}, colPuerta);
      /* Por tramos, saltando las columnas de formula de paneles —poliuretano y
         lamina— y las propias sin reservar. Escribir la fila de un tiron le
         pondria "" a esas celdas, y eso las BORRA. */
      for(const t of tramosFila(MP, fila, c)){
        data.push({range: `'${destino.tab.replace(/'/g, "''")}'!${t.a1}`, values: t.v});
      }
      creadas.push({op, fila, puerta: codigoPuerta(p.op)});
      fila++;
    }
  }
  /* Una sola escritura para todas las lineas. writeCells no sirve aqui: apunta
     siempre a la pestaña de ESTE modulo. */
  await api(`/values:batchUpdate`, {method: "POST", body: JSON.stringify({
    valueInputOption: "USER_ENTERED", data})});
  return {op: String(base), lineas: creadas};
}

/** Marca las puertas con el numero base de su panel (columna OP PANEL). */
async function marcarPuertasConPanel(puertas, op){
  if(C.PANEL === undefined || typeof PANEL_COL_OK === "undefined" || !PANEL_COL_OK) return false;
  const ups = puertas.map(p => ({a1: `${A1(C.PANEL)}${p.r}`, v: [[op]]}));
  await writeCells(ups);
  puertas.forEach(p => { const row = ROWS.find(x => x.r === p.r); if(row) row.c[C.PANEL] = op; });
  return true;
}

/* ------------------------------ aviso en planta ------------------------------ */
/* El estado de los paneles de cada puerta, leido de la hoja de paneles. Se pide
   como mucho una vez por minuto: planta repinta a menudo y no hace falta
   preguntar a la hoja en cada repintado. */
let PANELES_PUERTA = {mapa: null, t: 0, pidiendo: null};

async function cargarPanelesDePuertas(forzar){
  if(typeof panelesDePuertas !== "function") return null;
  if(!forzar && PANELES_PUERTA.mapa && Date.now() - PANELES_PUERTA.t < 60000) return PANELES_PUERTA.mapa;
  if(PANELES_PUERTA.pidiendo) return PANELES_PUERTA.pidiendo;
  PANELES_PUERTA.pidiendo = (async () => {
    try{
      const d = destinoPanel();
      if(d.sheetId !== CFG.sheetId) return null;
      const m = await panelesDePuertas(d.tab);
      PANELES_PUERTA.mapa = m; PANELES_PUERTA.t = Date.now();
      return m;
    }catch(e){
      console.warn("paneles de puertas:", e.message);
      return PANELES_PUERTA.mapa;
    }finally{ PANELES_PUERTA.pidiendo = null; }
  })();
  return PANELES_PUERTA.pidiendo;
}

/** La etiqueta de la tarjeta de planta: avisa, no bloquea. */
function etiquetaPanelPuerta(c){
  const m = PANELES_PUERTA.mapa;
  const info = m ? m.get(codigoPuerta(c[C.OP])) : null;
  const marca = C.PANEL !== undefined ? String(c[C.PANEL] ?? "").trim() : "";
  if(!info && !marca) return "";
  const op = info ? info.op : marca;
  if(!info) return `<span class="tag t-panel" title="La puerta tiene panel, pero no se ha podido leer su estado">🚪 Panel OP ${esc(op)}</span>`;
  const n = info.lineas.length;
  return info.listo
    ? `<span class="tag t-panel listo" title="${n} línea(s) terminadas para la puerta">🚪 Panel OP ${esc(op)} · listo</span>`
    : `<span class="tag t-panel" title="${info.lineas.filter(l => !/PARA PUERTA|DESPACHADO/i.test(l.estado)).length} de ${n} línea(s) por terminar">🚪 Panel OP ${esc(op)} · pendiente</span>`;
}

document.addEventListener("DOMContentLoaded", prepararPanelDePuerta);
