/* Requisiciones de material: pedir, aprobar y cargar
   Proyecto: Inventario de Almacen - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== REQUISICIONES ==============================
   Una requisicion es un DOCUMENTO, no un movimiento. Aprobarla no mueve nada:
   lo que mueve es el cargue, y ese cargue produce filas de kardex normales que
   llevan el consecutivo en la columna DOCUMENTO. Por eso encaja sin forzar el
   modelo — el kardex sigue siendo la unica verdad del saldo.

   Dos rutas, que es lo que las distingue de verdad:

     TRASLADO  el material ya es nuestro y esta en otra bodega. Al aprobar se
               carga UNA sola vez: genera los TRASLADO y queda ATENDIDA.
     COMPRA    el material no existe todavia. Al aprobar queda esperando, y se
               registra cada llegada segun venga. Puede llegar EN PARTES, asi
               que se lleva CANTIDAD ATENDIDA por linea y el estado pasa por
               PARCIAL hasta completarse.

   Aprobar es de administrador. Quien pide no se aprueba a si mismo.

   NO se reserva material. La existencia sigue siendo una sola cifra: lo que hay
   fisicamente. Si se aprobo mas de lo que hay, se avisa al cargar en vez de
   inventar un segundo saldo "disponible" que habria que explicar en toda la
   vista y que se desincroniza a la primera.                                  */

const REQ_TAB = "REQUISICIONES";
const RQL_TAB = "REQ LINEAS";
const REQ_HEAD = ["NUMERO", "FECHA", "SOLICITANTE", "TIPO", "BODEGA", "BODEGA DESTINO",
                  "ESTADO", "APROBADOR", "FECHA APROBACION", "OBSERVACIONES"];
const RQL_HEAD = ["NUMERO", "CODIGO", "PEDIDA", "ATENDIDA"];

const REQ_TIPOS = {
  "TRASLADO": {
    ico: "⇄", cls: "t-alm",
    ayuda: "Traer material de otra bodega. Al aprobar se carga de una vez.",
    bodLbl: "Bodega de donde sale", dest: true, movTipo: "TRASLADO"
  },
  "COMPRA": {
    ico: "↓", cls: "t-des",
    ayuda: "Material que hay que comprar. Al aprobar queda esperando, y se registra cada llegada.",
    bodLbl: "Bodega que lo recibirá", dest: false, movTipo: "ENTRADA"
  }
};

const REQ_ESTADOS = {
  "BORRADOR": {cls: "t-non", txt: "borrador"},
  "APROBADA": {cls: "t-alm", txt: "aprobada"},
  "PARCIAL":  {cls: "t-media", txt: "parcial"},
  "ATENDIDA": {cls: "t-des", txt: "atendida"},
  "ANULADA":  {cls: "t-anu", txt: "anulada"}
};

let REQS = [], RQLINEAS = [], reqAbierta = null;

const puedeAprobar = () => typeof puede !== "function" || puede("aprobar") || puede("*");
const puedePedir   = () => typeof puede !== "function" || puede("almacen");

/* ---------- carga ---------- */

async function loadRequis(){
  if(!$("#v-req")) return;
  try{
    const [cab, lin] = [await ensureTab(REQ_TAB, REQ_HEAD, null),
                        await ensureTab(RQL_TAB, RQL_HEAD, null)];
    REQS = cab
      .map((r, i) => ({fila: i + 2, num: String(r[0]||"").trim(), fecha: r[1]??"",
                       sol: String(r[2]||"").trim(), tipo: String(r[3]||"").trim().toUpperCase(),
                       bod: String(r[4]||"").trim().toUpperCase(), bod2: String(r[5]||"").trim().toUpperCase(),
                       estado: String(r[6]||"BORRADOR").trim().toUpperCase(),
                       aprob: String(r[7]||"").trim(), faprob: r[8]??"",
                       obs: String(r[9]||"").trim()}))
      .filter(x => x.num)
      .reverse();                                  // la más reciente primero
    RQLINEAS = lin
      .map((r, i) => ({fila: i + 2, num: String(r[0]||"").trim(),
                       cod: String(r[1]||"").trim().toUpperCase(),
                       ped: num(r[2])||0, ate: num(r[3])||0}))
      .filter(x => x.num && x.cod);
  }catch(e){
    console.warn("REQUISICIONES:", e.message);
    throw e;                                       // se conserva lo último bueno
  }
}

const lineasDe = n => RQLINEAS.filter(l => l.num === n);
const pendiente = l => red6(l.ped - l.ate);
const reqDe = n => REQS.find(r => r.num === n) || null;

/* ---------- consecutivo ----------
   El numero sale de la FILA en que aterriza la requisicion, no de "el ultimo
   mas uno". Si dos personas crean a la vez, ambas leerian el mismo ultimo y
   escribirian el mismo numero: las filas no se pisan pero el consecutivo si.
   La fila la asigna Google al hacer append y es unica por construccion.      */

const numeroDeFila = fila => "REQ-" + String(fila - 1).padStart(4, "0");

/* ---------- escritura ---------- */

/** Escribe una celda suelta de una pestaña auxiliar. */
async function ponerCelda(tab, a1, valor){
  await api(`/values/${encodeURIComponent(`'${tab}'!${a1}`)}?valueInputOption=USER_ENTERED`,
    {method: "PUT", body: JSON.stringify({values: [[valor]]})});
}

async function anexar(tab, rango, filas){
  const r = await api(`/values/${encodeURIComponent(`'${tab}'!${rango}`)}:append`+
                      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {method: "POST", body: JSON.stringify({values: filas})});
  return r;
}

/** Fila real donde aterrizó un append, leída de la respuesta de la API. */
function filaDeRespuesta(r){
  const rango = (r && r.updates && r.updates.updatedRange) || "";
  const m = rango.match(/!\$?[A-Z]+\$?(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/* ---------- vista: listado ---------- */

function reqFiltradas(){
  const q = $("#r-q").value.trim().toLowerCase();
  const est = $("#r-est").value, tp = $("#r-tipo").value;
  return REQS.filter(r => {
    if(est && r.estado !== est) return false;
    if(tp && r.tipo !== tp) return false;
    if(q){
      const heno = (r.num + " " + r.sol + " " + r.bod + " " + r.bod2 + " " + r.obs + " " +
                    lineasDe(r.num).map(l => l.cod + " " + (insDe(l.cod) ? insDe(l.cod).nom : "")).join(" ")).toLowerCase();
      if(!heno.includes(q)) return false;
    }
    return true;
  });
}

function renderReq(){
  if(!$("#r-tabla")) return;
  const lista = reqFiltradas();

  const abiertas = REQS.filter(r => r.estado === "APROBADA" || r.estado === "PARCIAL").length;
  const porAprobar = REQS.filter(r => r.estado === "BORRADOR").length;
  kpiCards("#r-kpis", [
    ["Por aprobar", porAprobar, "Requisiciones en borrador esperando visto bueno", porAprobar > 0],
    ["Aprobadas sin cargar", abiertas, "Ya aprobadas pero el material no ha entrado todavía", abiertas > 0],
    ["Atendidas", REQS.filter(r => r.estado === "ATENDIDA").length, "Completadas"],
    ["Total", REQS.length, "Todas las requisiciones registradas"]
  ]);

  $("#r-tabla").innerHTML =
    `<thead><tr><th class="stick">Número</th><th>Fecha</th><th>Tipo</th><th>Solicitante</th>
      <th>Bodega</th><th class="num">Líneas</th><th class="num">Pendiente</th>
      <th>Estado</th><th></th></tr></thead><tbody>`+
    (lista.length ? lista.map(r => {
      const ls = lineasDe(r.num);
      const pend = red6(ls.reduce((a, l) => a + pendiente(l), 0));
      const e = REQ_ESTADOS[r.estado] || REQ_ESTADOS.BORRADOR;
      const t = REQ_TIPOS[r.tipo];
      return `<tr data-req="${esc(r.num)}">
        <td class="stick"><span class="op">${esc(r.num)}</span></td>
        <td class="sub">${esc(fmtSello(r.fecha))}</td>
        <td><span class="tag ${t ? t.cls : "t-non"}">${t ? t.ico + " " : ""}${esc(r.tipo)}</span></td>
        <td class="sub">${esc(r.sol.split("(")[0].trim() || r.sol)}</td>
        <td class="sub">${esc(r.bod)}${r.bod2 ? " → " + esc(r.bod2) : ""}</td>
        <td class="num">${ls.length}</td>
        <td class="num ${pend > 0 ? "neg" : ""}">${pend > 0 ? fmtNum(pend) : "—"}</td>
        <td><span class="tag ${e.cls}">${e.txt}</span></td>
        <td><button class="btn sm" data-abrir="${esc(r.num)}">Abrir</button></td></tr>`;
    }).join("")
    : `<tr><td colspan="9" class="empty">Ninguna requisición coincide.</td></tr>`)+`</tbody>`;

  contador("#r-cnt", lista.length, REQS.length, ["r-est", "r-tipo"], "r-q");
}

/* ---------- nueva requisición ---------- */

let reqTipo = "TRASLADO";
let reqLineasNuevas = [];               // [{cod, ped}] mientras se arma

function abrirNuevaReq(){
  if(!puedePedir()){ toast("Tu rol no permite crear requisiciones", "err"); return; }
  if(!INSUMOS.length){ toast("No hay insumos en el catálogo", "err"); return; }
  reqLineasNuevas = [];
  $("#nr-tipos").innerHTML = Object.keys(REQ_TIPOS).map(k =>
    `<button type="button" class="pc" data-nrt="${esc(k)}"><span class="bx">${REQ_TIPOS[k].ico}</span><span class="nm">${esc(k)}</span></button>`).join("");
  $$("#nr-tipos .pc").forEach(b => b.onclick = () => setReqTipo(b.dataset.nrt));
  llenaSel("#nr-bod", BODEGAS);
  llenaSel("#nr-bod2", BODEGAS);
  if(BODEGAS.length > 1) $("#nr-bod2").value = BODEGAS[1];
  $("#nr-obs").value = "";
  $("#nr-q").value = ""; $("#nr-cant").value = "";
  setReqTipo(reqTipo);
  pintarLineasNuevas();
  $("#ov-nreq").classList.remove("hide");
  setTimeout(() => $("#nr-q").focus(), 60);
}

function setReqTipo(k){
  reqTipo = k;
  const t = REQ_TIPOS[k];
  $$("#nr-tipos .pc").forEach(b => b.classList.toggle("on", b.dataset.nrt === k));
  $("#nr-ayuda").textContent = t.ayuda;
  $("#nr-bod-lbl").textContent = t.bodLbl;
  $("#nr-bod2-w").classList.toggle("hide", !t.dest);
  pintarLineasNuevas();
}

/** Añade una línea a la requisición que se está armando. */
function anadirLineaReq(){
  const cod = $("#nr-ins").value;
  const c = num($("#nr-cant").value);
  if(!cod){ toast("Elige un insumo de la lista", "err"); return; }
  if(c === null || c <= 0){ toast("La cantidad debe ser mayor que cero", "err"); return; }
  const ya = reqLineasNuevas.find(l => l.cod === cod);
  if(ya) ya.ped = red6(ya.ped + c);          // pedir dos veces lo mismo se suma
  else reqLineasNuevas.push({cod, ped: c});
  $("#nr-q").value = ""; $("#nr-ins").value = ""; $("#nr-cant").value = "";
  pintarLineasNuevas();
  $("#nr-q").focus();
}

function pintarLineasNuevas(){
  const s = saldos();
  const bod = $("#nr-bod").value;
  const t = REQ_TIPOS[reqTipo];
  $("#nr-lineas").innerHTML = reqLineasNuevas.length
    ? `<table><thead><tr><th>Código</th><th>Insumo</th><th class="num">Pedida</th>
        <th class="num">${t.dest ? "Hay en " + esc(bod) : "Existencia"}</th><th></th></tr></thead><tbody>`+
      reqLineasNuevas.map((l, i) => {
        const ins = insDe(l.cod);
        const hay = t.dest ? saldoDe(s, l.cod, bod) : saldoTotal(s, l.cod);
        // En un traslado importa si el origen tiene lo pedido; en una compra no,
        // porque justamente se pide lo que no hay.
        const corto = t.dest && hay < l.ped;
        return `<tr><td><span class="op">${esc(l.cod)}</span></td>
          <td class="sub">${esc(ins ? ins.nom : "sin catalogar")}</td>
          <td class="num"><b>${fmtNum(l.ped)}</b> ${esc(ins ? ins.uni : "")}</td>
          <td class="num ${corto ? "neg" : "sub"}">${fmtNum(hay)}${corto ? " ⚠" : ""}</td>
          <td><button type="button" class="btn sm dan" data-quita="${i}">Quitar</button></td></tr>`;
      }).join("") + `</tbody></table>`
    : `<p class="mut" style="padding:10px 2px">Todavía no has añadido ninguna línea.</p>`;
}

async function guardarReq(){
  if(!puedePedir()){ toast("Tu rol no permite crear requisiciones", "err"); return; }
  if(!reqLineasNuevas.length){ toast("Añade al menos una línea", "err"); return; }
  const t = REQ_TIPOS[reqTipo];
  const bod = $("#nr-bod").value, bod2 = t.dest ? $("#nr-bod2").value : "";
  if(t.dest && bod === bod2){ toast("Origen y destino son la misma bodega", "err"); return; }

  const ts = new Date();
  const stamp = `${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim())
                ? `${MI_NOMBRE.trim()} (${userMail||"?"})` : (userMail || "desconocido");

  const btn = $("#nr-save"); btn.disabled = true; setSync("busy", "Guardando…");
  try{
    // La cabecera primero, SIN número: el número sale de la fila que le asigne
    // Google, y hasta que no responda no se sabe cuál es.
    const r = await anexar(REQ_TAB, "A:J", [["", stamp, quien, reqTipo, bod, bod2,
                                             "BORRADOR", "", "", $("#nr-obs").value.trim()]]);
    const fila = filaDeRespuesta(r);
    if(!fila) throw new Error("La hoja no dijo en qué fila quedó la requisición");
    const numero = numeroDeFila(fila);
    await ponerCelda(REQ_TAB, "A" + fila, numero);
    await anexar(RQL_TAB, "A:D", reqLineasNuevas.map(l => [numero, l.cod, l.ped, 0]));

    $("#ov-nreq").classList.add("hide");
    await loadRequis();
    renderReq();
    toast(`${numero} creada con ${reqLineasNuevas.length} línea(s). Falta aprobarla.`, "ok");
    setSync("ok", "Guardado");
  }catch(e){
    toast("No se pudo crear: " + e.message, "err");
    setSync("err", "Error");
  }finally{ btn.disabled = false; }
}

/* ---------- detalle, aprobación y cargue ---------- */

function abrirReq(numero){
  const r = reqDe(numero); if(!r) return;
  reqAbierta = numero;
  const t = REQ_TIPOS[r.tipo], e = REQ_ESTADOS[r.estado] || REQ_ESTADOS.BORRADOR;
  const s = saldos();
  const ls = lineasDe(numero);

  $("#dr-num").textContent = r.num;
  $("#dr-sub").innerHTML = `<span class="tag ${t ? t.cls : "t-non"}">${t ? t.ico + " " : ""}${esc(r.tipo)}</span>
    <span class="tag ${e.cls}">${e.txt}</span> · ${esc(r.bod)}${r.bod2 ? " → " + esc(r.bod2) : ""}
    · pedida por ${esc(r.sol.split("(")[0].trim() || r.sol)} el ${esc(fmtSello(r.fecha))}`;
  $("#dr-obs").textContent = r.obs || "";
  $("#dr-obs").classList.toggle("hide", !r.obs);
  $("#dr-aprob").innerHTML = r.aprob
    ? `Aprobada por <b>${esc(r.aprob.split("(")[0].trim() || r.aprob)}</b> el ${esc(fmtSello(r.faprob))}`
    : "";
  $("#dr-aprob").classList.toggle("hide", !r.aprob);

  const puedeRecibir = r.estado === "APROBADA" || r.estado === "PARCIAL";
  $("#dr-tabla").innerHTML =
    `<thead><tr><th>Código</th><th>Insumo</th><th class="num">Pedida</th>
      <th class="num">Atendida</th><th class="num">Pendiente</th>
      <th class="num">${r.tipo === "TRASLADO" ? "Hay en " + esc(r.bod) : "Existencia"}</th>
      ${puedeRecibir && r.tipo === "COMPRA" ? '<th class="num">Llegó ahora</th>' : ""}</tr></thead><tbody>`+
    ls.map(l => {
      const ins = insDe(l.cod);
      const hay = r.tipo === "TRASLADO" ? saldoDe(s, l.cod, r.bod) : saldoTotal(s, l.cod);
      const pend = pendiente(l);
      const corto = r.tipo === "TRASLADO" && hay < pend;
      return `<tr><td><span class="op">${esc(l.cod)}</span></td>
        <td class="sub">${esc(ins ? ins.nom : "sin catalogar")}</td>
        <td class="num">${fmtNum(l.ped)}</td>
        <td class="num">${fmtNum(l.ate)}</td>
        <td class="num ${pend > 0 ? "neg" : "sub"}">${pend > 0 ? fmtNum(pend) : "—"}</td>
        <td class="num ${corto ? "neg" : "sub"}">${fmtNum(hay)}${corto ? " ⚠" : ""}</td>
        ${puedeRecibir && r.tipo === "COMPRA"
          ? `<td class="num"><input class="inp mini-num" type="number" step="any" min="0"
               data-llega="${esc(l.cod)}" value="${pend > 0 ? fmtNum(pend) : 0}"></td>` : ""}</tr>`;
    }).join("") + `</tbody>`;

  // Qué se puede hacer con esta requisición, según su estado y quién soy.
  const esBorrador = r.estado === "BORRADOR";
  $("#dr-aprobar").classList.toggle("hide", !(esBorrador && puedeAprobar()));
  $("#dr-anular").classList.toggle("hide", !(r.estado !== "ATENDIDA" && r.estado !== "ANULADA" && puedeAprobar()));
  $("#dr-cargar").classList.toggle("hide", !(puedeRecibir && r.tipo === "TRASLADO" && puedePedir()));
  $("#dr-llegada").classList.toggle("hide", !(puedeRecibir && r.tipo === "COMPRA" && puedePedir()));

  // Si está en borrador y no puedo aprobar, que se sepa por qué no hay botón.
  $("#dr-nota").innerHTML = esBorrador && !puedeAprobar()
    ? "Esta requisición espera el visto bueno de un administrador."
    : (r.estado === "ANULADA" ? "Anulada: no se puede cargar." : "");
  $("#dr-nota").classList.toggle("hide", !$("#dr-nota").innerHTML);

  $("#ov-dreq").classList.remove("hide");
}

/** Escribe un aviso dentro de la ventana de la requisición. */
function avisoEnReq(html){
  const n = $("#dr-nota");
  if(!n) return;
  n.innerHTML = html;
  n.classList.remove("hide");
  n.scrollIntoView({block: "nearest", behavior: "smooth"});
}

async function cambiarEstadoReq(r, estado, extra){
  await ponerCelda(REQ_TAB, "G" + r.fila, estado);
  if(extra){
    await ponerCelda(REQ_TAB, "H" + r.fila, extra.aprob);
    await ponerCelda(REQ_TAB, "I" + r.fila, extra.fecha);
  }
}

async function aprobarReq(){
  const r = reqDe(reqAbierta); if(!r) return;
  if(!puedeAprobar()){ toast("Solo un administrador puede aprobar", "err"); return; }
  // Quien pide no se aprueba a si mismo: la firma perderia todo su sentido.
  // El motivo se escribe DENTRO de la ventana, no solo en un aviso flotante:
  // el aviso se lee y desaparece, y aqui hace falta que quede claro por que el
  // boton no hizo nada mientras la ventana sigue abierta.
  if(userMail && r.sol.toLowerCase().includes(String(userMail).toLowerCase())){
    avisoEnReq("<b>No puedes aprobar tu propia requisición.</b> La pediste tú, "+
               "así que tiene que revisarla otro administrador. Mientras tanto queda en borrador.");
    toast("No puedes aprobar tu propia requisición", "err");
    return;
  }
  const ts = new Date();
  const stamp = `${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim())
                ? `${MI_NOMBRE.trim()} (${userMail||"?"})` : (userMail || "desconocido");
  const b = $("#dr-aprobar"); b.disabled = true; setSync("busy", "Aprobando…");
  try{
    await cambiarEstadoReq(r, "APROBADA", {aprob: quien, fecha: stamp});
    await loadRequis(); renderReq(); abrirReq(reqAbierta);
    // Aprobar no mueve material: hay que decir cuál es el paso siguiente, o
    // parece que el botón no hizo nada.
    avisoEnReq(r.tipo === "TRASLADO"
      ? `<b>Aprobada.</b> Ahora pulsa <b>⇄ Cargar traslado</b> para mover el material `+
        `de ${esc(r.bod)} a ${esc(r.bod2)}. Hasta entonces no se ha movido nada.`
      : `<b>Aprobada.</b> Queda esperando la compra. Cuando llegue el material, `+
        `vuelve aquí y pulsa <b>↓ Registrar llegada</b>. Puede llegar en varias veces.`);
    toast(`${r.num} aprobada`, "ok"); setSync("ok", "Guardado");
  }catch(e){ toast(e.message, "err"); setSync("err", "Error"); }
  finally{ b.disabled = false; }
}

async function anularReq(){
  const r = reqDe(reqAbierta); if(!r) return;
  if(!puedeAprobar()){ toast("Solo un administrador puede anular", "err"); return; }
  const b = $("#dr-anular"); b.disabled = true;
  try{
    await cambiarEstadoReq(r, "ANULADA");
    await loadRequis(); renderReq(); abrirReq(reqAbierta);
    toast(`${r.num} anulada`, "ok");
  }catch(e){ toast(e.message, "err"); }
  finally{ b.disabled = false; }
}

/** Escribe las cantidades atendidas y ajusta el estado de la cabecera. */
async function marcarAtendido(r, entregas){
  for(const [cod, cant] of entregas){
    const l = lineasDe(r.num).find(x => x.cod === cod);
    if(!l) continue;
    await ponerCelda(RQL_TAB, "D" + l.fila, red6(l.ate + cant));
    l.ate = red6(l.ate + cant);
  }
  const falta = lineasDe(r.num).some(l => pendiente(l) > 0);
  await cambiarEstadoReq(r, falta ? "PARCIAL" : "ATENDIDA");
}

/** TRASLADO: se carga de una vez. Genera los movimientos y cierra. */
async function cargarReq(){
  const r = reqDe(reqAbierta); if(!r) return;
  if(!puedePedir()){ toast("Tu rol no permite cargar material", "err"); return; }
  const ls = lineasDe(r.num).filter(l => pendiente(l) > 0);
  if(!ls.length){ toast("No queda nada pendiente", "ok"); return; }

  const s = saldos();
  const cortos = ls.filter(l => saldoDe(s, l.cod, r.bod) < pendiente(l));
  if(cortos.length && !confirm(
      `En ${r.bod} no hay suficiente de ${cortos.length} insumo(s):\n\n` +
      cortos.map(l => `· ${l.cod}: pide ${fmtNum(pendiente(l))}, hay ${fmtNum(saldoDe(s, l.cod, r.bod))}`).join("\n") +
      `\n\nEl saldo quedará en negativo. ¿Continuar de todos modos?`)) return;

  const ts = new Date();
  const stamp = `${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim())
                ? `${MI_NOMBRE.trim()} (${userMail||"?"})` : (userMail || "desconocido");

  // Un traslado son dos filas por insumo, con el mismo ID. Todas en un solo
  // append: o entra el cargue entero o no entra nada.
  const filas = [];
  for(const l of ls){
    const id = `${r.num}-${l.cod}`;
    const c = pendiente(l);
    filas.push([stamp, quien, "TRASLADO", l.cod, r.bod,  -c, "", r.num, "", "Requisición " + r.num, id]);
    filas.push([stamp, quien, "TRASLADO", l.cod, r.bod2,  c, "", r.num, "", "Requisición " + r.num, id]);
  }

  const b = $("#dr-cargar"); b.disabled = true; setSync("busy", "Cargando…");
  try{
    await appendMovs(filas);
    await marcarAtendido(r, ls.map(l => [l.cod, pendiente(l)]));
    await loadMovs();
    await loadRequis();
    $("#ov-dreq").classList.add("hide");
    renderReq(); renderInv();
    toast(`${r.num} cargada: ${ls.length} insumo(s) de ${r.bod} a ${r.bod2}`, "ok");
    setSync("ok", "Guardado");
  }catch(e){ toast("No se pudo cargar: " + e.message, "err"); setSync("err", "Error"); }
  finally{ b.disabled = false; }
}

/** COMPRA: se registra lo que llegó, que puede ser parte de lo pedido. */
async function registrarLlegada(){
  const r = reqDe(reqAbierta); if(!r) return;
  if(!puedePedir()){ toast("Tu rol no permite registrar llegadas", "err"); return; }

  const entregas = [];
  $$("#dr-tabla input[data-llega]").forEach(inp => {
    const c = num(inp.value);
    if(c !== null && c > 0) entregas.push([inp.dataset.llega, c]);
  });
  if(!entregas.length){ toast("Escribe cuánto llegó de al menos un insumo", "err"); return; }

  // No se deja recibir mas de lo pedido: si llego de mas, es otra cosa y debe
  // registrarse como ENTRADA suelta, no colgada de esta requisicion.
  for(const [cod, c] of entregas){
    const l = lineasDe(r.num).find(x => x.cod === cod);
    if(l && c > pendiente(l) + 1e-6){
      toast(`De ${cod} solo faltan ${fmtNum(pendiente(l))}. Si llegó de más, regístralo como ENTRADA aparte.`, "err");
      return;
    }
  }

  const ts = new Date();
  const stamp = `${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim())
                ? `${MI_NOMBRE.trim()} (${userMail||"?"})` : (userMail || "desconocido");
  const doc = $("#dr-doc").value.trim();
  const filas = entregas.map(([cod, c]) =>
    [stamp, quien, "ENTRADA", cod, r.bod, c, "", doc || r.num, $("#dr-prov").value.trim(),
     "Requisición " + r.num, `${r.num}-${cod}-${Date.now()}`]);

  const b = $("#dr-llegada"); b.disabled = true; setSync("busy", "Registrando…");
  try{
    await appendMovs(filas);
    await marcarAtendido(r, entregas);
    await loadMovs();
    await loadRequis();
    renderReq(); renderInv();
    const rr = reqDe(reqAbierta);
    abrirReq(reqAbierta);
    toast(`${r.num}: ${entregas.length} insumo(s) recibidos` +
          (rr && rr.estado === "ATENDIDA" ? " — requisición completa" : " — quedan pendientes"), "ok");
    setSync("ok", "Guardado");
  }catch(e){ toast("No se pudo registrar: " + e.message, "err"); setSync("err", "Error"); }
  finally{ b.disabled = false; }
}

/* ---------- enganches ---------- */

if($("#v-req")){
  ["r-q", "r-est", "r-tipo"].forEach(id => {
    const e = $("#" + id); if(!e) return;
    e.addEventListener("input", renderReq);
    e.addEventListener("change", renderReq);
  });
  $("#r-clear").onclick = () => { $("#r-q").value = ""; ["r-est","r-tipo"].forEach(i => $("#"+i).value = ""); renderReq(); };
  $("#r-nueva").onclick = abrirNuevaReq;
  $("#r-tabla").addEventListener("click", e => {
    const b = e.target.closest("button[data-abrir]");
    if(b) abrirReq(b.dataset.abrir);
  });

  // Buscador de insumo de la requisición: mismo comportamiento que el del
  // movimiento, sobre sus propios elementos.
  comboEn("#nr-q", "#nr-lista", "#nr-ins");
  $("#nr-add").onclick = anadirLineaReq;
  $("#nr-cant").addEventListener("keydown", e => {
    if(e.key === "Enter"){ e.preventDefault(); anadirLineaReq(); }
  });
  $("#nr-bod").addEventListener("change", pintarLineasNuevas);
  $("#nr-lineas").addEventListener("click", e => {
    const b = e.target.closest("button[data-quita]");
    if(b){ reqLineasNuevas.splice(+b.dataset.quita, 1); pintarLineasNuevas(); }
  });
  $("#form-nreq").addEventListener("submit", e => { e.preventDefault(); guardarReq(); });

  $("#dr-aprobar").onclick = aprobarReq;
  $("#dr-anular").onclick  = anularReq;
  $("#dr-cargar").onclick  = cargarReq;
  $("#dr-llegada").onclick = registrarLlegada;

  $("#r-csv").onclick = () => csvDe("requisiciones",
    ["NUMERO","FECHA","TIPO","SOLICITANTE","BODEGA","DESTINO","ESTADO","APROBADOR",
     "CODIGO","PEDIDA","ATENDIDA"],
    reqFiltradas().flatMap(r => lineasDe(r.num).map(l =>
      [r.num, fmtSello(r.fecha), r.tipo, r.sol, r.bod, r.bod2, r.estado, r.aprob, l.cod, l.ped, l.ate])));
}
