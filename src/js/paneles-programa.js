/* Programacion de la produccion de paneles
   Proyecto: Control de Produccion - Interfrigo

   Planta ordena sola: urgentes, ALTA paradas, ALTA, MEDIA, BAJA, y dentro de
   cada escalon agrupa por espesor. Eso sirve cuando nadie ha decidido nada.
   Pero quien planifica sabe cosas que la hoja no: que un cliente recoge el
   jueves, que falta lamina para una OP, que conviene meter dos pedidos seguidos.

   Aqui se decide. Cada LINEA abierta es una ficha pequeña que se arrastra a
   un dia; su posicion dentro del dia es el orden. Planta fabrica primero lo
   programado, en ese orden, y DESPUES el resto con su orden de siempre.

   POR LINEA Y NO POR OP. Al principio la ficha era la OP entera, y no servia:
   una misma OP trae paneles de 3" y de 4", o panel y piso, y cada espesor es
   un montaje de maquina distinto. Programar la OP obligaba a fabricar todo lo
   suyo el mismo dia y seguido. Ahora cada linea va a su dia y a su puesto, y
   la ficha dice de que OP es y cuantas lineas abiertas tiene esa OP.

   Lo programado se guarda en la hoja —columnas ORDEN PROGRAMADO y FECHA
   PROGRAMADA— en la fila de la linea, y no en el navegador, porque lo tiene
   que ver planta desde otra pantalla.                                       */
"use strict";

const PROG_DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];
const PROG_MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

let progSemana = null;       // lunes de la semana que se esta viendo
let progArrastre = null;     // arrastre en curso
let progPendiente = null;    // pulsacion que aun no es arrastre
let progOcupado = 0;

/** Mientras alguien arrastra, un refresco de fondo le borraria la ficha de la
 *  mano. Se espera a que suelte, igual que en planta. */
const programaEnUso = () => !!progArrastre || !!progPendiente || Date.now() - progOcupado < 1500;

/** Las dos columnas tienen sitio en la hoja. Sin ellas no hay donde guardar,
 *  y leer Z y AA a ciegas seria leer lo que otro haya puesto ahi. */
const programaListo = () => typeof columnaLista === "function" &&
  columnaLista("PROG_ORDEN") && columnaLista("PROG_FECHA");

const puedeProgramar = () => typeof puede !== "function" || puede("editar");

const opKeyDe = c => {
  const b = opBase(c[C.OP]);
  return b !== null ? String(b) : (String(c[C.OP] ?? "").trim() || "—");
};

const hoy0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const etDia = d => `${PROG_DIAS[d.getDay()]} ${d.getDate()} ${PROG_MESES[d.getMonth()]}`;

/* ------------------------------ que se programa ------------------------------ */
/** Lo que sigue siendo trabajo de planta: ni terminado, ni despachado, ni
 *  anulado. Es lo mismo que ve planta, pero sin sus filtros de pantalla. */
const lineasAbiertas = () => activas().filter(({c}) =>
  !anuladaP(c) && !despachadaP(c) && !hechaEnPlantaP(c));

/** Lo programado en UNA linea, o null. */
function progDeLinea(c){
  if(!programaListo()) return null;
  const f = toDate(c[C.PROG_FECHA]);
  if(!f) return null;
  const o = num(c[C.PROG_ORDEN]);
  return {fecha: f, orden: o === null ? 9999 : o};
}

/** Una ficha por linea abierta, con lo que hace falta para decidir.
 *  `k` es la fila de la hoja: identifica la linea aunque dos lineas de la
 *  misma OP sean identicas. */
function fichasAbiertas(){
  const xs = lineasAbiertas();
  const porOp = new Map();
  xs.forEach(x => { const k = opKeyDe(x.c); porOp.set(k, (porOp.get(k) || 0) + 1); });
  const vistas = new Map();
  return xs.map(x => {
    const c = x.c, opk = opKeyDe(c);
    vistas.set(opk, (vistas.get(opk) || 0) + 1);
    return {
      k: String(x.r), r: x.r, x, opk,
      op: String(c[C.OP] ?? "").trim(),
      cli: String(c[C.CLI] ?? "").trim(),
      prio: String(c[C.PRIO] ?? "").trim().toUpperCase(),
      prod: String(c[C.PROD] ?? "").trim(),
      esp: espesorDe(c),
      cant: num(c[C.CANT]) || 0,
      largo: num(c[C.LARGO]) || 0,
      caraA: String(c[C.CARA_A] ?? "").trim(),
      caraB: String(c[C.CARA_B] ?? "").trim(),
      m2: MODELO.metros(c) || 0,
      kg: kgDe(c) || 0,
      lam: laminaDe(c) || 0,
      avance: progreso(c).pct,
      dias: diasEnCola(c),
      prog: progDeLinea(c),
      puerta: typeof puertaDe === "function" ? puertaDe(c) : "",
      nOp: porOp.get(opk),              // lineas abiertas de su OP
      iOp: vistas.get(opk)              // cual de ellas es
    };
  });
}

/* ------------------------------ el orden de planta ------------------------------ */
/** El orden en que planta ve la cola.
 *
 *  PRIMERO las lineas programadas: por dia y, dentro del dia, por el puesto
 *  que se les dio aqui. DESPUES las demas, con la secuencia de siempre
 *  —prioridad y tandas por espesor—. Si dos lineas comparten dia y puesto
 *  (lo programado antes, cuando la ficha era la OP entera, o una hoja tocada
 *  a mano), desempata el orden natural.
 *
 *  Los cambios de montaje se recalculan sobre el orden final: lo que marca una
 *  parada de maquina es que cambie el espesor en la cola que de verdad se va a
 *  fabricar, no en la que se habria fabricado sin programar. */
function ordenPlanta(lineas){
  const natural = secuenciaPaneles(lineas);
  if(!programaListo()) return natural;
  if(!natural.some(m => progDeLinea(m.c))) return natural;

  const pos = new Map(natural.map((m, i) => [m.r, i]));
  const programadas = natural
    .filter(m => progDeLinea(m.c))
    .map(m => ({...m, prog: progDeLinea(m.c)}))
    .sort((a, b) => (a.prog.fecha - b.prog.fecha) || (a.prog.orden - b.prog.orden) ||
                    (pos.get(a.r) - pos.get(b.r)));
  const resto = secuenciaPaneles(lineas.filter(x => !progDeLinea(x.c)));

  const final = [...programadas, ...resto];
  let anterior = null, acumulado = 0;
  final.forEach(m => {
    const cambio = m.espesor !== anterior;
    if(cambio) acumulado = 0;
    acumulado += m.m2;
    m.cambioSetup = cambio;
    m.acumulado = acumulado;
    anterior = m.espesor;
  });
  return final;
}

/* ------------------------------ capacidad ------------------------------ */
/** Cuantos m² caben en un dia, segun lo que la planta ha hecho de verdad en
 *  los ultimos 60 dias. El sabado es medio dia y el domingo no se trabaja: se
 *  puede programar, pero no tiene capacidad que comparar. */
function capacidadDia(d){
  if(d.getDay() === 0) return null;
  const r = typeof ritmoDiario === "function" ? ritmoDiario() : 0;
  if(!r) return null;
  return d.getDay() === 6 ? r * 0.5 : r;
}

/** Los siete dias de una semana, de lunes a domingo. Con `desdeHoy` solo los
 *  que aun no han pasado: es lo que se puede cargar todavia. */
function diasDeSemana(lunesDe, desdeHoy){
  const h = hoy0(), out = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(lunesDe); d.setDate(d.getDate() + i); d.setHours(0,0,0,0);
    if(!desdeHoy || d >= h) out.push(d);
  }
  return out;
}

/** Las cifras de la programacion, para esta vista y para el resumen. */
function metricasPrograma(){
  const ops = fichasAbiertas();          // una por linea
  const h = hoy0();
  const suma = xs => ({n: xs.length, m2: xs.reduce((t, o) => t + o.m2, 0),
    lineas: xs.length,
    ops: new Set(xs.map(o => o.opk)).size,
    paneles: xs.reduce((t, o) => t + o.cant, 0),
    kg: xs.reduce((t, o) => t + o.kg, 0),
    lam: xs.reduce((t, o) => t + o.lam, 0)});
  const porDia = d => ops.filter(o => o.prog && o.prog.fecha.getTime() === d.getTime());
  const semana = lu => diasDeSemana(lu, true).map(d => ({dia: d, ...suma(porDia(d)), cap: capacidadDia(d)}));
  const lu = lunes(h); lu.setHours(0,0,0,0);
  const luSig = new Date(lu); luSig.setDate(luSig.getDate() + 7);
  return {
    ops,
    listo: programaListo(),
    abiertas: suma(ops),
    sinProgramar: suma(ops.filter(o => !o.prog)),
    programadas: suma(ops.filter(o => o.prog)),
    atrasadas: suma(ops.filter(o => o.prog && o.prog.fecha < h)),
    estaSemana: semana(lu),
    proxima: semana(luSig)
  };
}

/** Lo que falta por programar, en el orden en que planta lo haria sin programar:
 *  asi lo primero de la lista es lo primero que conviene decidir. */
function sinProgramarOrdenadas(ops){
  const natural = secuenciaPaneles(lineasAbiertas());
  const pos = new Map();
  natural.forEach((m, i) => pos.set(String(m.r), i));
  return ops.filter(o => !o.prog).sort((a, b) => (pos.get(a.k) ?? 1e9) - (pos.get(b.k) ?? 1e9));
}

/* ------------------------------ la vista ------------------------------
   Todo en la altura de la pantalla: una linea arriba con las cifras y la
   semana, y debajo el tablero. «Sin programar» es la columna ancha —es de
   donde se saca el trabajo— y lleva su buscador dentro, que es donde se busca.
   Cada dia es una columna estrecha de lunes a domingo, y cada columna se
   desplaza por dentro: la pagina no se mueve.                              */
let progBusca = "";

function renderPrograma(){
  const tablero = $("#g-tablero");
  if(!tablero || progArrastre) return;

  const h = hoy0();
  const luHoy = lunes(h); luHoy.setHours(0,0,0,0);
  if(!progSemana || progSemana < luHoy) progSemana = luHoy;
  const M = metricasPrograma();
  const editable = M.listo && puedeProgramar();

  // Por que no se puede programar, dicho arriba y no en un error al soltar.
  const aviso = $("#g-aviso");
  if(!M.listo){
    const campos = (typeof ESTADO_COLUMNAS !== "undefined" && ESTADO_COLUMNAS.campos) || {};
    const motivo = ["PROG_ORDEN","PROG_FECHA"].map(k => campos[k])
      .filter(e => e && !e.ok).map(e => e.motivo)[0] || "todavía no se ha comprobado la hoja";
    aviso.className = "nota warn";
    aviso.innerHTML = `<b>No se puede guardar la programación:</b> ${esc(motivo)}.
      Hacen falta las columnas <b>ORDEN PROGRAMADO</b> y <b>FECHA PROGRAMADA</b> justo después
      de ORDEN DE COMPRA; la aplicación las crea sola si ese sitio está libre.`;
    aviso.hidden = false;
  } else if(!puedeProgramar()){
    aviso.className = "nota";
    aviso.textContent = "Tu acceso permite ver la programación, pero no cambiarla.";
    aviso.hidden = false;
  } else aviso.hidden = true;

  // ---------- la semana ----------
  const dias = diasDeSemana(progSemana);
  const domingo = dias[6];
  const esEsta = progSemana.getTime() === luHoy.getTime();
  const delDia = d => M.ops.filter(o => o.prog && o.prog.fecha.getTime() === d.getTime())
    .sort((a, b) => (a.prog.orden - b.prog.orden) || (a.r - b.r));
  const m2Semana = dias.reduce((t, d) => t + delDia(d).reduce((s, o) => s + o.m2, 0), 0);
  const capSemana = diasDeSemana(progSemana, true).reduce((t, d) => t + (capacidadDia(d) || 0), 0);
  const m2Pendiente = diasDeSemana(progSemana, true)
    .reduce((t, d) => t + delDia(d).reduce((s, o) => s + o.m2, 0), 0);
  const carga = capSemana ? Math.round(m2Pendiente / capSemana * 100) : null;
  const otras = M.ops.filter(o => o.prog && o.prog.fecha > domingo).length;

  /* ---------- una sola linea: cifras + semana + imprimir ---------- */
  const chip = (v, et, t, clase = "") =>
    `<span class="pg-kpi ${clase}" title="${esc(t)}"><b>${v}</b><i>${esc(et)}</i></span>`;
  $("#g-top").innerHTML = `
    <div class="pg-kpis">
      ${chip(`${M.abiertas.ops} OP · ${M.abiertas.n}`, "líneas sin terminar",
        `Todas las líneas sin terminar, sin despachar y sin anular —${n2(M.abiertas.m2)} m²—. Es el mismo criterio que Planta y que «Líneas abiertas» de Control de OPs.`)}
      ${chip(M.sinProgramar.n, "sin programar", `${M.sinProgramar.n} líneas de ${M.sinProgramar.ops} OP · ${n2(M.sinProgramar.m2)} m²`, M.sinProgramar.n ? "hi" : "")}
      ${chip(M.programadas.n, "programadas", `${M.programadas.n} líneas · ${n2(M.programadas.m2)} m²${otras ? ` · ${otras} en semanas siguientes` : ""}`)}
      ${chip(n2(M.programadas.kg), "kg poliuretano", `Poliuretano que hace falta para fabricar toda la programación —${M.programadas.n} líneas programadas—`)}
      ${chip(n2(M.programadas.lam), "m lámina", `Metros lineales de lámina que hace falta para fabricar toda la programación —${M.programadas.n} líneas programadas—`)}
      ${M.atrasadas.n ? chip(M.atrasadas.n, "atrasadas", "Programadas para un día que ya pasó y aún abiertas", "mal") : ""}
      ${chip(n2(m2Semana), "m² en la semana", "Programado de lunes a domingo en la semana a la vista")}
      ${chip(carga === null ? "—" : carga + " %", "carga",
        capSemana ? `${n2(m2Pendiente)} m² programados en lo que queda de semana, de ${n2(capSemana)} m² de capacidad real (últimos 60 días)` : "Sin ritmo de los últimos 60 días para comparar",
        carga > 100 ? "mal" : carga >= 85 ? "justo" : "")}
    </div>
    <div class="pg-nav">
      <button type="button" class="btn sm" data-g="prev" title="Semana anterior" ${esEsta ? "disabled" : ""}>&#9664;</button>
      <b class="pg-semana">${esEsta ? "Esta semana" : "Semana"} · ${etDia(progSemana)} – ${etDia(domingo)}</b>
      <button type="button" class="btn sm" data-g="next" title="Semana siguiente">&#9654;</button>
      ${esEsta ? "" : `<button type="button" class="btn sm" data-g="hoy">Hoy</button>`}
      <button type="button" class="btn sm" data-g="print" title="Hoja carta vertical con lo que falta por programar">&#128424; Imprimir</button>
    </div>`;

  /* ---------- columna ancha: sin programar ---------- */
  const sin = sinProgramarOrdenadas(M.ops);
  // Atrasadas de semanas que ya no estan a la vista: si no, no se verian en ningun sitio.
  const atrasAntes = M.ops.filter(o => o.prog && o.prog.fecha < progSemana && o.prog.fecha < h)
    .sort((a, b) => (a.prog.fecha - b.prog.fecha) || (a.prog.orden - b.prog.orden));
  const busca = document.activeElement && document.activeElement.id === "g-q";
  const selIni = busca ? document.activeElement.selectionStart : null;

  const colSin = `
    <section class="pg-col pg-sin" data-col="sin" data-soltar="${editable ? "si" : "no"}">
      <div class="pg-cab">
        <b>Sin programar <em>${sin.length} líneas · ${new Set(sin.map(o => o.opk)).size} OP · ${n2(sin.reduce((t, o) => t + o.m2, 0))} m²</em></b>
        <input class="inp pg-q" id="g-q" type="search" placeholder="Buscar OP, cliente, producto…"
          autocomplete="off" value="${esc(progBusca)}">
      </div>
      <div class="pg-scroll">
        ${atrasAntes.length ? `<p class="pg-sub mal">Atrasadas de semanas anteriores · arrástralas a un día</p>
          <div class="pg-atras">${atrasAntes.map(o => tarjetaOp(o, editable, "atrasada")).join("")}</div>` : ""}
        ${atrasAntes.length && sin.length ? `<p class="pg-sub">Sin programar</p>` : ""}
        <div class="pg-lista pg-rejilla">${sin.map(o => tarjetaOp(o, editable)).join("") ||
          `<p class="pg-vacio">Todo lo que está en proceso tiene día.</p>`}</div>
      </div>
    </section>`;

  /* ---------- lunes a domingo ---------- */
  const colsDias = dias.map(d => {
    const ops = delDia(d);
    const pasado = d < h, esHoy = d.getTime() === h.getTime();
    const m2 = ops.reduce((t, o) => t + o.m2, 0);
    const cap = capacidadDia(d);
    const pct = cap ? Math.round(m2 / cap * 100) : null;
    const clase = pct === null ? "" : pct > 100 ? "sobre" : pct >= 85 ? "justo" : "";
    const soltar = editable && !pasado;
    return `
    <section class="pg-col pg-dia ${esHoy ? "pg-hoy" : ""} ${pasado ? "pg-pasado" : ""} ${d.getDay() === 0 ? "pg-domingo" : ""}"
        data-col="${iso(d)}" data-soltar="${soltar ? "si" : "no"}">
      <div class="pg-cab">
        <b>${esHoy ? "Hoy · " : ""}${etDia(d)}</b>
        <span>${ops.length} lín · <b>${n2(m2)}</b>${cap ? `/${n2(cap)}` : ""} m²</span>
        ${cap ? `<i class="pg-carga ${clase}"><em style="width:${Math.min(100, pct)}%"></em></i>` : `<i class="pg-carga vacia"></i>`}
      </div>
      <div class="pg-lista">${ops.map(o => tarjetaOp(o, editable, pasado ? "atrasada" : "")).join("") ||
        `<p class="pg-vacio">${soltar ? "Suelta aquí" : pasado ? "Ya pasó" : ""}</p>`}</div>
    </section>`;
  }).join("");

  tablero.innerHTML = colSin + colsDias;
  ajustarAlto();
  filtrarPrograma();
  if(busca){
    const q = $("#g-q");
    q.focus();
    try{ q.setSelectionRange(selIni, selIni); }catch(e){}
  }
}

/** El tablero llega justo al borde inferior de la ventana: las columnas se
 *  desplazan por dentro y no hay dos barras de desplazamiento peleando. */
function ajustarAlto(){
  const t = $("#g-tablero");
  if(!t || t.offsetParent === null) return;
  const alto = window.innerHeight - t.getBoundingClientRect().top - 10;
  t.style.height = Math.max(360, alto) + "px";
}

function tarjetaOp(o, editable, extra = ""){
  const pc = Math.round(o.avance * 100);
  const selPrio = `<select class="mini tag ${o.prio ? "t-" + o.prio.toLowerCase() : "t-non"}"
      data-prog-prio="${esc(o.k)}" ${editable ? "" : "disabled"} title="Prioridad de esta línea">
      <option value=""${o.prio ? "" : " selected"}>—</option>
      ${PRIORIDADES.map(p => `<option${p === o.prio ? " selected" : ""}>${p}</option>`).join("")}
    </select>`;
  const caras = o.caraA === o.caraB ? o.caraA : `${o.caraA} / ${o.caraB}`;
  const buscar = [o.op, o.cli, o.prod, o.caraA, o.caraB, o.puerta && "puerta " + o.puerta].join(" ").toLowerCase();
  return `<article class="pg-card ${o.prio ? "prio-" + o.prio : ""} ${editable ? "movible" : ""} ${extra}"
      data-k="${esc(o.k)}" data-buscar="${esc(buscar)}" tabindex="0"
      title="OP ${esc(o.op)} · ${esc(o.cli)}\n${esc(o.prod)} · ${n0(o.cant)} × ${n2(o.largo)} m · ${esc(caras)}${editable ? "\nArrástrala a un día. Teclado: Alt + flechas" : ""}">
    <div class="pg-top">
      <span class="pg-op">${esc(o.op)}</span>
      ${o.nOp > 1 ? `<span class="pg-de" title="Línea ${o.iOp} de las ${o.nOp} abiertas de esta OP">${o.iOp}/${o.nOp}</span>` : ""}
      ${selPrio}<span class="pg-ptxt ${o.prio ? "t-" + o.prio.toLowerCase() : ""}">${esc(o.prio || "—")}</span>
      <span class="pg-esps"><i>${esc(o.esp)}</i></span>
    </div>
    <div class="pg-cli">${esc(o.cli)}</div>
    ${o.puerta ? `<div class="pg-puerta" title="Panel para armar esta puerta: no va a despacho">🚪 Puerta ${esc(o.puerta)}</div>` : ""}
    <div class="pg-prod"><b>${esc(o.prod)}</b> · ${n0(o.cant)} × ${n2(o.largo)}</div>
    <div class="pg-caras">${esc(caras)}</div>
    <div class="pg-pie">
      <span class="pg-m2"><b>${n2(o.m2)}</b> m²</span>
      <span class="pbar"><i class="${pc >= 100 ? "full" : ""}" style="width:${pc}%"></i></span>
      <span class="pg-esp">${o.prog && o.prog.fecha < hoy0() ? "atrasada" : textoEspera(o.dias)}</span>
    </div>
  </article>`;
}

/** Buscar no quita fichas, las apaga: quitarlas cambiaria los puestos al soltar. */
function filtrarPrograma(){
  const q = progBusca.trim().toLowerCase();
  const ts = q.split(/\s+/).filter(Boolean);
  $$("#g-tablero .pg-card").forEach(el => {
    const hay = !ts.length || ts.every(t => el.dataset.buscar.includes(t));
    el.classList.toggle("pg-apagada", !hay);
  });
}

/* ------------------------------ guardar ------------------------------ */
/** Escribe la programacion de varias lineas de una vez.
 *  cambios: Map(fila -> {fecha: "aaaa-mm-dd" | null, orden: n | null})
 *  movida:  la linea que la persona movio. Las demas solo cambian de puesto.
 *
 *  Al HISTORIAL va la OP movida, no las que se corren un puesto por dejarle
 *  sitio: el historial cuenta como «tocada» cualquier linea con apunte, y eso
 *  le reiniciaria el reloj de «sin tocarse» —y con el, el escalado de
 *  prioridad— a lineas que nadie ha mirado. */
async function guardarPrograma(cambios, movida){
  if(!programaListo() || !puedeProgramar()) return;
  const ops = new Map(fichasAbiertas().map(o => [o.k, {...o, lineas: [o.x]}]));
  const ups = [], log = [], previos = [];
  const txt = (f, o) => f ? `${etDia(toDate(f))} · puesto ${o ?? "—"}` : "sin programar";

  for(const [k, nuevo] of cambios){
    const op = ops.get(k); if(!op) continue;
    for(const {r, c} of op.lineas){
      const fa = toDate(c[C.PROG_FECHA]), oa = num(c[C.PROG_ORDEN]);
      const mismaF = nuevo.fecha ? (fa && iso(fa) === nuevo.fecha) : !fa;
      const mismoO = nuevo.orden == null ? oa === null : oa === nuevo.orden;
      if(mismaF && mismoO) continue;
      previos.push({c, f: c[C.PROG_FECHA], o: c[C.PROG_ORDEN]});
      /* La fecha va en ISO: Sheets la reconoce como fecha en cualquier
         configuracion regional, y dd/mm no. */
      ups.push({a1: `${col("PROG_FECHA")}${r}`, v: [[nuevo.fecha || ""]]},
               {a1: `${col("PROG_ORDEN")}${r}`, v: [[nuevo.orden ?? ""]]});
      if(k === movida){
        log.push({accion: "EDITA", op: c[C.OP], fila: r, campo: "Programación",
                  antes: fa ? txt(iso(fa), oa) : "sin programar",
                  despues: txt(nuevo.fecha, nuevo.orden)});
      }
      c[C.PROG_FECHA] = nuevo.fecha || "";
      c[C.PROG_ORDEN] = nuevo.orden ?? "";
    }
  }
  if(!ups.length){ renderPrograma(); return; }

  progOcupado = Date.now();
  recalcularTableros();                      // se ve ya; la hoja va detras
  try{
    await writeCells(ups);
    if(log.length) logBulk(log);
    setSync("", "Guardado"); lastHash = "";
  }catch(e){
    previos.forEach(p => { p.c[C.PROG_FECHA] = p.f; p.c[C.PROG_ORDEN] = p.o; });
    toast("No se guardó la programación: " + e.message, "err");
    recalcularTableros();
  }
  progOcupado = Date.now();
}

/* ------------------------------ atrasadas: reprogramacion automatica ------------------------------
   Una linea programada para un dia que ya paso y que sigue abierta no se queda
   esperando a que alguien la arrastre: pasa sola al dia que toca, de primeras,
   y lo que ya estaba puesto ese dia se corre un puesto para hacerle sitio.

   EL DIA QUE TOCA ES HOY, no «un dia mas tarde que antes»: si llevaba varios
   dias atrasada no tiene sentido ponerla en un dia que tambien ya paso, asi
   que salta directa al primer dia util que queda por delante. Si sigue sin
   terminarse, mañana volvera a estar atrasada —porque su fecha sera ayer— y
   rodara otra vez a la cabeza del nuevo hoy: por eso lo atrasado siempre
   aparece primero en el dia en que de verdad se puede fabricar.

   Es EL MISMO gesto que arrastrar una ficha a la cabeza de un dia, asi que en
   cuanto una persona la acomode a mano en el programador —a ese dia o a otro,
   en el puesto que sea— deja de estar atrasada y este automatismo no vuelve a
   tocarla, hasta que si tambien se le pasa esa fecha nueva, vuelva a rodar. */

/** Hoy, o el lunes si hoy es domingo: domingo no se trabaja, y amontonar ahi
 *  lo atrasado lo dejaria un dia entero sin que nadie lo viera. */
function diaQueToca(){
  const h = hoy0();
  if(h.getDay() !== 0) return h;
  const l = new Date(h); l.setDate(l.getDate() + 1);
  return l;
}

/** Corre las atrasadas al dia que toca, de primeras. Se llama en cada
 *  refresco —ver datos.js—, igual que autoPrioridades: por eso no hace nada si
 *  no hay columnas donde guardar o si alguien esta arrastrando una ficha en
 *  este momento. */
async function autoReprogramarAtrasadas(){
  if(!programaListo() || programaEnUso()) return 0;
  const h = hoy0();
  const abiertas = fichasAbiertas();
  const atrasadas = abiertas.filter(o => o.prog && o.prog.fecha < h)
    .sort((a, b) => (a.prog.fecha - b.prog.fecha) || (a.prog.orden - b.prog.orden) || (a.r - b.r));
  if(!atrasadas.length) return 0;

  const destino = diaQueToca();
  const atrasadasK = new Set(atrasadas.map(o => o.k));
  const yaEnDestino = abiertas
    .filter(o => o.prog && o.prog.fecha.getTime() === destino.getTime() && !atrasadasK.has(o.k))
    .sort((a, b) => (a.prog.orden - b.prog.orden) || (a.r - b.r));

  const secuencia = [...atrasadas, ...yaEnDestino];
  const ups = [], log = [], previos = [];
  secuencia.forEach((o, i) => {
    const orden = i + 1, c = o.x.c, r = o.r;
    const mismaF = o.prog && o.prog.fecha.getTime() === destino.getTime();
    if(mismaF && o.prog.orden === orden) return;           // ya estaba en su sitio
    previos.push({c, f: c[C.PROG_FECHA], o: c[C.PROG_ORDEN]});
    ups.push({a1: `${col("PROG_FECHA")}${r}`, v: [[iso(destino)]]},
             {a1: `${col("PROG_ORDEN")}${r}`, v: [[orden]]});
    if(atrasadasK.has(o.k))
      log.push({accion: "AUTO", op: c[C.OP], fila: r, campo: "Programación",
                antes: `${etDia(o.prog.fecha)} · puesto ${o.prog.orden}`,
                despues: `${etDia(destino)} · puesto ${orden} (atrasada)`});
    c[C.PROG_FECHA] = iso(destino);
    c[C.PROG_ORDEN] = orden;
  });
  if(!ups.length) return 0;

  recalcularTableros();                        // se ve ya; la hoja va detras
  try{
    await writeCells(ups);
    if(log.length) logBulk(log);
    lastHash = "";
    return log.length;
  }catch(e){
    previos.forEach(p => { p.c[C.PROG_FECHA] = p.f; p.c[C.PROG_ORDEN] = p.o; });
    console.warn("reprogramar atrasadas:", e.message);
    recalcularTableros();
    return 0;
  }
}

/** La secuencia de OP de una columna tal y como esta en pantalla. */
const secuenciaCol = (lista, quitar) => [...lista.querySelectorAll(".pg-card")]
  .map(n => n.dataset.k).filter(k => k !== quitar);

/** Traduce «esta OP queda en este sitio» a los cambios que hay que escribir:
 *  la columna destino entera se renumera, y la de origen tambien si era otro
 *  dia, para que no queden huecos en los puestos. */
function cambiosAlSoltar(opk, desde, hasta, secDestino, secOrigen){
  const cambios = new Map();
  if(hasta === "sin") cambios.set(opk, {fecha: null, orden: null});
  else secDestino.forEach((k, i) => cambios.set(k, {fecha: hasta, orden: i + 1}));
  if(desde !== hasta && /^\d{4}-/.test(desde))
    secOrigen.forEach((k, i) => { if(!cambios.has(k)) cambios.set(k, {fecha: desde, orden: i + 1}); });
  return cambios;
}

/* ------------------------------ arrastrar y soltar ------------------------------
   Con eventos de puntero y no con el arrastre nativo del navegador: el nativo
   no funciona con el dedo, y esto se va a usar en tablet.

     raton / lapiz   se arrastra en cuanto se mueve 5 px
     dedo            se mantiene pulsado un momento y luego se arrastra; si se
                     desliza enseguida, es desplazar la pantalla, no arrastrar */
function empezarArrastre(p, x, y){
  const card = p.card;
  const r = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add("pg-ghost");
  ghost.style.width = r.width + "px";
  document.body.appendChild(ghost);
  const hueco = document.createElement("div");
  hueco.className = "pg-hueco";
  hueco.style.height = r.height + "px";
  card.after(hueco);
  card.classList.add("pg-origen");
  const colOrigen = card.closest(".pg-col");
  progArrastre = {id: p.id, card, ghost, hueco, dx: x - r.left, dy: y - r.top,
    desde: colOrigen.dataset.col, listaOrigen: colOrigen.querySelector(".pg-lista"),
    valido: true, x, y, raf: 0};
  progPendiente = null;
  document.body.classList.add("pg-arrastrando");
  if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
  moverArrastre(x, y);
  progArrastre.raf = requestAnimationFrame(autoDesplazar);
}

function moverArrastre(x, y){
  const a = progArrastre; if(!a) return;
  a.x = x; a.y = y;
  a.ghost.style.transform = `translate(${x - a.dx}px, ${y - a.dy}px) rotate(1.5deg)`;
  const bajo = document.elementFromPoint(x, y);
  const colEl = bajo && bajo.closest(".pg-col");
  $$(".pg-col.pg-sobre").forEach(c => c !== colEl && c.classList.remove("pg-sobre"));
  if(colEl && colEl.dataset.soltar === "si"){
    const lista = colEl.querySelector(".pg-lista");
    const vacio = lista.querySelector(".pg-vacio"); if(vacio) vacio.remove();
    let antes = null;
    for(const c of lista.querySelectorAll(".pg-card:not(.pg-origen)")){
      const rr = c.getBoundingClientRect();
      if(y < rr.top + rr.height / 2){ antes = c; break; }
    }
    if(antes) lista.insertBefore(a.hueco, antes); else lista.appendChild(a.hueco);
    colEl.classList.add("pg-sobre");
    a.valido = true;
    a.hueco.classList.remove("pg-no");
  } else {
    // Fuera de un sitio valido: el hueco vuelve a su origen y soltar no hace nada.
    a.card.after(a.hueco);
    a.valido = false;
    a.hueco.classList.add("pg-no");
  }
}

/** Cerca del borde, el tablero se desplaza solo: una semana no cabe entera en
 *  una tablet, y sin esto no se podria llevar una ficha al sabado. */
function autoDesplazar(){
  const a = progArrastre; if(!a) return;
  const borde = 60, paso = 14;
  const tab = $("#g-tablero");
  const r = tab.getBoundingClientRect();
  if(a.x < r.left + borde) tab.scrollLeft -= paso;
  else if(a.x > r.right - borde) tab.scrollLeft += paso;
  const lista = document.elementFromPoint(a.x, a.y)?.closest(".pg-scroll, .pg-lista");
  if(lista){
    const rl = lista.getBoundingClientRect();
    if(a.y < rl.top + 40) lista.scrollTop -= paso;
    else if(a.y > rl.bottom - 40) lista.scrollTop += paso;
  }
  if(a.y < 70) window.scrollBy(0, -paso);
  else if(a.y > innerHeight - 50) window.scrollBy(0, paso);
  moverArrastre(a.x, a.y);
  a.raf = requestAnimationFrame(autoDesplazar);
}

function terminarArrastre(guardar){
  const a = progArrastre; if(!a) return;
  cancelAnimationFrame(a.raf);
  const colDestino = a.hueco.closest(".pg-col");
  const hasta = colDestino ? colDestino.dataset.col : a.desde;
  const listaDestino = colDestino ? colDestino.querySelector(".pg-lista") : a.listaOrigen;
  // La secuencia de destino, con la ficha puesta donde esta el hueco
  const secDestino = [...listaDestino.children]
    .map(n => n === a.hueco ? a.card.dataset.k
      : (n.classList && n.classList.contains("pg-card") && n !== a.card ? n.dataset.k : null))
    .filter(Boolean);
  const secOrigen = secuenciaCol(a.listaOrigen, a.card.dataset.k);

  a.ghost.remove(); a.hueco.remove();
  a.card.classList.remove("pg-origen");
  $$(".pg-col.pg-sobre").forEach(c => c.classList.remove("pg-sobre"));
  document.body.classList.remove("pg-arrastrando");
  progArrastre = null;
  progOcupado = Date.now();

  if(!guardar || !a.valido){ renderPrograma(); return; }
  guardarPrograma(cambiosAlSoltar(a.card.dataset.k, a.desde, hasta, secDestino, secOrigen),
                  a.card.dataset.k);
}

(function engancharPrograma(){
  const tablero = $("#g-tablero");
  if(!tablero) return;                        // esta pagina no tiene programacion

  tablero.addEventListener("pointerdown", ev => {
    if(ev.pointerType === "mouse" && ev.button !== 0) return;
    const card = ev.target.closest(".pg-card.movible");
    if(!card || ev.target.closest("select,button,input,a")) return;
    const p = {id: ev.pointerId, x: ev.clientX, y: ev.clientY, card, tipo: ev.pointerType};
    progPendiente = p;
    if(ev.pointerType === "touch"){
      p.timer = setTimeout(() => { if(progPendiente === p) empezarArrastre(p, p.x, p.y); }, 220);
    }
  });

  document.addEventListener("pointermove", ev => {
    const p = progPendiente;
    if(p && ev.pointerId === p.id){
      const d = Math.hypot(ev.clientX - p.x, ev.clientY - p.y);
      if(p.tipo === "touch"){
        if(d > 10){ clearTimeout(p.timer); progPendiente = null; }   // es desplazar
      } else if(d > 5){
        ev.preventDefault();
        empezarArrastre(p, ev.clientX, ev.clientY);
      }
      return;
    }
    if(progArrastre && ev.pointerId === progArrastre.id){
      ev.preventDefault();
      moverArrastre(ev.clientX, ev.clientY);
    }
  }, {passive: false});

  const soltar = guardar => ev => {
    if(progPendiente && ev.pointerId === progPendiente.id){
      clearTimeout(progPendiente.timer); progPendiente = null;
    }
    if(progArrastre && ev.pointerId === progArrastre.id) terminarArrastre(guardar);
  };
  document.addEventListener("pointerup", soltar(true));
  document.addEventListener("pointercancel", soltar(false));
  // Con el dedo, mientras se arrastra la pagina no debe desplazarse debajo.
  document.addEventListener("touchmove", ev => { if(progArrastre) ev.preventDefault(); }, {passive: false});
  document.addEventListener("keydown", ev => { if(ev.key === "Escape" && progArrastre) terminarArrastre(false); });
  tablero.addEventListener("contextmenu", ev => { if(ev.target.closest(".pg-card")) ev.preventDefault(); });

  /* Con el teclado, para quien no puede o no quiere arrastrar:
       Alt + ↑ / ↓   sube o baja un puesto dentro del dia
       Alt + ← / →   la lleva al dia anterior o siguiente, al final          */
  tablero.addEventListener("keydown", ev => {
    if(!ev.altKey || !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(ev.key)) return;
    const card = ev.target.closest(".pg-card.movible"); if(!card) return;
    ev.preventDefault();
    const colEl = card.closest(".pg-col");
    const lista = colEl.querySelector(".pg-lista");
    const desde = colEl.dataset.col, k = card.dataset.k;
    let hasta = desde, secDestino = secuenciaCol(lista);
    if(ev.key === "ArrowUp" || ev.key === "ArrowDown"){
      if(!/^\d{4}-/.test(desde)) return;       // «sin programar» no tiene puestos
      const i = secDestino.indexOf(k), j = i + (ev.key === "ArrowUp" ? -1 : 1);
      if(j < 0 || j >= secDestino.length) return;
      [secDestino[i], secDestino[j]] = [secDestino[j], secDestino[i]];
    } else {
      const cols = $$("#g-tablero .pg-col[data-soltar='si']");
      const i = cols.indexOf(colEl);
      const otra = i < 0 ? cols[0] : cols[i + (ev.key === "ArrowLeft" ? -1 : 1)];
      if(!otra) return;
      hasta = otra.dataset.col;
      secDestino = [...secuenciaCol(otra.querySelector(".pg-lista")), k];
    }
    guardarPrograma(cambiosAlSoltar(k, desde, hasta, secDestino, secuenciaCol(lista, k)), k)
      .then(() => { const c = $(`#g-tablero .pg-card[data-k="${CSS.escape(k)}"]`); if(c) c.focus(); });
  });

  // Prioridad de la linea: cada linea tiene la suya en la hoja.
  tablero.addEventListener("change", async ev => {
    const s = ev.target.closest("[data-prog-prio]"); if(!s) return;
    const f = fichasAbiertas().find(o => o.k === s.dataset.progPrio); if(!f) return;
    const op = {lineas: [f.x]};
    const val = s.value;
    const ups = [], log = [], previos = [];
    for(const {r, c} of op.lineas){
      const antes = String(c[C.PRIO] ?? "").trim().toUpperCase();
      if(antes === val) continue;
      previos.push({c, v: c[C.PRIO]});
      ups.push({a1: `${col("PRIO")}${r}`, v: [[val]]});
      log.push({accion: "EDITA", op: c[C.OP], fila: r, campo: "Prioridad", antes, despues: val});
      c[C.PRIO] = val;
    }
    if(!ups.length) return;
    progOcupado = Date.now();
    recalcularTableros();
    try{
      await writeCells(ups); logBulk(log);
      setSync("", "Guardado"); lastHash = "";
    }catch(e){
      previos.forEach(p => p.c[C.PRIO] = p.v);
      toast(e.message, "err"); recalcularTableros();
    }
  });

  // La linea de arriba se repinta entera: los botones se atienden por delegacion.
  $("#g-top").addEventListener("click", ev => {
    const b = ev.target.closest("[data-g]"); if(!b || b.disabled) return;
    const que = b.dataset.g;
    if(que === "print") return imprimirPrograma();
    if(que === "hoy") progSemana = null;
    else progSemana.setDate(progSemana.getDate() + (que === "prev" ? -7 : 7));
    renderPrograma();
  });
  // El buscador vive dentro de la columna y se repinta con ella: se guarda lo escrito.
  tablero.addEventListener("input", ev => {
    if(ev.target.id !== "g-q") return;
    progBusca = ev.target.value;
    filtrarPrograma();
  });
  window.addEventListener("resize", () => { if($("#v-programa") && !$("#v-programa").classList.contains("hide")) ajustarAlto(); });
})();

/* ------------------------------ imprimir ------------------------------
   Hoja carta VERTICAL con lo que falta por programar, y nada mas: es la lista
   con la que se sienta quien planifica. Una fila por linea de fabricacion,
   porque cantidad, largo, producto y caras son de la linea y no de la OP.

   Cada OP es un bloque: su numero y su cliente ocupan la altura de todas sus
   lineas —no se repiten ni quedan huecos que parecen filas sin dueño—, llevan
   debajo cuantas lineas y cuantos m² suman, y el bloque no se parte entre dos
   hojas. Un bloque si y otro no lleva fondo, para seguir la fila con la vista.
   El orden es el que planta seguiria sin programar.                       */
function imprimirPrograma(){
  /* Las lineas sin programar, en el orden de planta, agrupadas por OP en el
     orden en que aparece su primera linea: la hoja se lee por pedido. */
  const grupos = new Map();
  for(const f of sinProgramarOrdenadas(fichasAbiertas())){
    if(!grupos.has(f.opk)) grupos.set(f.opk, {op: f.op, cli: f.cli, prio: "", lineas: [], m2: 0});
    const g = grupos.get(f.opk);
    g.lineas.push(f.x); g.m2 += f.m2;
    const rango = p => { const i = PRIORIDADES.indexOf(p); return i < 0 ? 99 : i; };
    if(f.prio && (!g.prio || rango(f.prio) < rango(g.prio))) g.prio = f.prio;
  }
  const ops = [...grupos.values()];
  const ahora = new Date();
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE) || (typeof userMail === "string" && userMail) || "";
  let m2Total = 0, lineas = 0, paneles = 0;

  const bloques = ops.map((o, k) => {
    const n = o.lineas.length;
    /* El codigo de CADA linea en su fila. Antes la OP ocupaba la altura del
       bloque con el codigo de la primera linea, y como el bloque agrupa por el
       numero base, «533-2» y «533-3» se imprimian dentro de «533-1» sin que
       su codigo saliera en ningun sitio: una linea que se ve en pantalla y no
       se encuentra en el papel. */
    const filas = o.lineas.map(({c}, i) => {
      const m2 = MODELO.metros(c) || 0;
      m2Total += m2; lineas++; paneles += num(c[C.CANT]) || 0;
      const cli = i === 0 ? `
        <td class="pp-cli" rowspan="${n}">${esc(o.cli)}
          <small>${n} lín · ${n2(o.m2)} m²</small>${o.prio ? `<em>${esc(o.prio)}</em>` : ""}</td>` : "";
      return `<tr>
        <td class="pp-opc"><b>${esc(String(c[C.OP] ?? "").trim())}</b></td>${cli}
        <td class="n">${n0(c[C.CANT])}</td>
        <td class="n">${n2(c[C.LARGO])}</td>
        <td class="pp-prod">${esc(c[C.PROD] ?? "")}</td>
        <td>${esc(c[C.RANU] ?? "")}</td>
        <td>${esc(c[C.CARA_A] ?? "")}</td>
        <td>${esc(c[C.CARA_B] ?? "")}</td>
        <td class="n">${n2(m2)}</td>
      </tr>`;
    }).join("");
    return `<tbody class="pp-bloque ${k % 2 ? "par" : ""}">${filas}</tbody>`;
  }).join("");

  $("#print").innerHTML = `<div class="pg-print">
    <div class="pp-cab">
      <div class="c-logo"></div>
      <div class="pp-tit">
        <b>OP sin programar</b>
        <span>Paneles · líneas sin día, por OP, en el orden en que planta las fabricaría</span>
      </div>
      <div class="pp-meta">
        <span>Impreso ${fmt(ahora)} · ${p2(ahora.getHours())}:${p2(ahora.getMinutes())}</span>
        ${quien ? `<span>${esc(quien)}</span>` : ""}
      </div>
    </div>
    <div class="pp-cifras">
      <span><b>${ops.length}</b> OP</span>
      <span><b>${lineas}</b> líneas</span>
      <span><b>${n0(paneles)}</b> paneles</span>
      <span><b>${n2(m2Total)}</b> m²</span>
    </div>
    <table class="pp-tabla">
      <colgroup><col class="ppc-op"><col class="ppc-cli"><col class="ppc-cant"><col class="ppc-largo">
        <col class="ppc-prod"><col class="ppc-ranu"><col class="ppc-cara"><col class="ppc-cara"><col class="ppc-m2"></colgroup>
      <thead><tr><th>OP</th><th>Cliente</th><th class="n">Cant</th><th class="n">Largo</th>
        <th>Producto</th><th>Ranurado</th><th>Cara A</th><th>Cara B</th><th class="n">m²</th></tr></thead>
      ${bloques || `<tbody><tr><td colspan="9" class="pp-nada">No hay nada sin programar.</td></tr></tbody>`}
      <tfoot><tr><td colspan="2">Total · ${ops.length} OP · ${lineas} líneas</td>
        <td class="n">${n0(paneles)}</td><td colspan="5"></td><td class="n">${n2(m2Total)}</td></tr></tfoot>
    </table>
  </div>`;
  let rule = $("#page-rule");
  if(!rule){ rule = document.createElement("style"); rule.id = "page-rule"; document.head.appendChild(rule); }
  /* Tamaño en medidas y no «letter portrait»: con la palabra, algunos
     navegadores dejan elegir horizontal en el dialogo; con medidas no. El pie
     con el numero de hoja lo pintan los navegadores que ya lo entienden; en
     los demas simplemente no sale. */
  rule.textContent = `@page{size:215.9mm 279.4mm;margin:11mm 11mm 13mm;
    @bottom-right{content:"Hoja " counter(page) " de " counter(pages);font:7.5pt Arial,sans-serif;color:#444}
    @bottom-left{content:"Interfrigo · Programación de paneles";font:7.5pt Arial,sans-serif;color:#444}}`;
  document.body.classList.remove("p-stk");
  document.body.classList.add("p-carta");
  setTimeout(() => window.print(), 60);
}
