/* Programacion de la produccion de puertas
   Proyecto: Control de Produccion - Interfrigo

   Planta ordena sola: devueltas, urgentes, ALTA olvidadas, ALTA, MEDIA, BAJA,
   y dentro de cada escalon por numero de OP. Eso sirve cuando nadie ha decidido
   nada. Pero quien planifica sabe cosas que la hoja no: que un cliente recoge
   el jueves, que falta un herraje para una OP, que conviene hacer seguidas dos
   puertas del mismo montaje.

   Aqui se decide. Cada OP en proceso es una ficha pequeña que se arrastra a un
   dia; el dia es cuando se EMPIEZA a trabajar y la posicion dentro del dia es
   el orden. Planta fabrica primero lo programado, en ese orden, y DESPUES el
   resto con su orden de siempre.

   Lo programado se guarda en la hoja —columnas ORDEN PROGRAMADO y FECHA
   PROGRAMADA— y no en el navegador, porque lo tiene que ver planta desde otra
   pantalla. Se escribe en TODAS las puertas de la OP: la ficha es la OP, y una
   OP no se reparte en dias distintos por accidente.

   Sustituye al cronograma que habia dentro de Planta. Aquel repartia solo; esta
   pestaña deja decidir, y conserva su idea como un boton —«Proponer»— que
   rellena los dias libres segun la meta.

   Hermana de paneles-programa.js: mismo gesto, mismas columnas, mismo contrato
   con app.js (renderPrograma / programaEnUso). El motor de arrastre esta
   copiado a proposito y adaptado; unificarlo en un archivo comun queda para
   cuando los dos modulos esten publicados. */
"use strict";

const PG_DIAS  = ["dom","lun","mar","mié","jue","vie","sáb"];
const PG_MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

/* Cuanto se tolera pasarse de la meta del dia al PROPONER. Sin holgura una
   puerta de 2 puntos no entraria nunca en un dia de 7,2 ya con 6 dentro, y la
   propuesta se estiraria sin motivo. Viene del cronograma. */
const PG_HOLGURA = 0.75;
/* Hasta donde mira «Proponer»: tres semanas de trabajo. Mas alla la cola cambia
   tanto que programar a ciegas solo crea atrasadas. */
const PG_HORIZONTE = 15;

let pgSemana = null;       // lunes de la semana a la vista
let pgArrastre = null;     // arrastre en curso
let pgPendiente = null;    // pulsacion que aun no es arrastre
let pgOcupado = 0;

/** Mientras alguien arrastra, un refresco de fondo le quitaria la ficha de la
 *  mano. Se espera a que suelte, igual que en planta. */
const programaEnUso = () => !!pgArrastre || !!pgPendiente || Date.now() - pgOcupado < 1500;

/** Las dos columnas existen en la hoja y se han comprobado sus encabezados. Sin
 *  eso no hay donde guardar, y leer AP y AQ a ciegas seria leer lo que otro
 *  haya puesto ahi. */
const programaListo = () => C.PROG_ORDEN !== undefined && C.PROG_FECHA !== undefined &&
  typeof PROG_COLUMNAS !== "undefined" && PROG_COLUMNAS.ok === true;

const puedeProgramar = () => typeof puede !== "function" || puede("editar");

/** Cada ficha es UNA OP de la hoja, es decir una fila: 493-1 y 493-2 son dos
 *  fichas. Al principio se agrupaban por el numero base, como las lineas de
 *  paneles, y el tablero enseñaba 24 fichas mientras Planta decia 45 OP en
 *  produccion: en puertas cada fila tiene su numero y se fabrica y se programa
 *  por su cuenta. La clave es la fila, que no se repite nunca. */
const claveFicha = (c, r) => String(r);

const dia0 = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const etiquetaDiaPrograma = d => `${PG_DIAS[d.getDay()]} ${d.getDate()} ${PG_MESES[d.getMonth()]}`;
const pgNum = v => (Math.round((v || 0) * 10) / 10).toLocaleString("es-CO");
const esDiaHabil = d => d.getDay() !== 0 && d.getDay() !== 6;
const PG_SEMANA = 7;       // de lunes a domingo

/* ------------------------------ que se programa ------------------------------ */
/** Lo que se programa: toda OP abierta, es decir que no esta terminada, ni
 *  anulada, ni despachada. Es algo mas que la cola de planta: tambien entra la
 *  que alguien paso a almacen por adelantado sin estar al 100 %. Si esta en la
 *  cola de planta entra siempre —incluidas las que esperan que les pulsen
 *  Terminada—, aunque su avance diga 100 %. */
const abiertaParaProgramar = c =>
  !anulada(c) && !despachada(c) && !terminada(c) && (progreso(c).pct < 1 || enColaPlanta(c));
const puertasEnProceso = () => activas().filter(({c}) => abiertaParaProgramar(c));

/** Lo programado en UNA puerta, o null. */
function progDeLinea(c){
  if(!programaListo()) return null;
  const f = toDate(c[C.PROG_FECHA]);
  if(!f) return null;
  const o = num(c[C.PROG_ORDEN]);
  return {fecha: dia0(f), orden: o === null ? 9999 : o};
}

const PG_RANGO = p => { const i = PRIORIDADES.indexOf(p); return i < 0 ? 99 : i; };

function resumirOp(op){
  const cs = op.puertas.map(x => x.c);
  op.op = op.puertas.length === 1 ? (String(cs[0][C.OP] ?? "").trim() || "sin OP") : op.k;
  op.cli = cs.map(c => String(c[C.CLI] ?? "").trim()).find(Boolean) || "";
  op.pts = cs.reduce((t, c) => t + (num(c[C.PTS]) || 0), 0);
  /* La prioridad de la OP es la mas urgente de sus puertas: si una sola corre,
     la OP corre. */
  op.prio = cs.map(c => String(c[C.PRIO] ?? "").trim().toUpperCase())
    .sort((a, b) => PG_RANGO(a) - PG_RANGO(b))[0] || "";
  op.devuelta = cs.some(devuelta);
  op.vendida  = cs.some(urgenteAuto);
  /* Lo basico para programar sin abrir la ficha: que tipo, que medida, que
     espesor y hacia donde abre. Las puertas iguales se cuentan una vez. */
  const med = new Map();
  cs.forEach(c => {
    const t = [String(c[C.TIPO] ?? "").trim(),
               `${num(c[C.ANCHO]) ?? "—"}×${num(c[C.ALTO]) ?? "—"}`,
               num(c[C.ESP]) !== null ? num(c[C.ESP]) + " mm" : "",
               String(c[C.AP] ?? "").trim()].filter(Boolean).join(" · ");
    med.set(t, (med.get(t) || 0) + 1);
  });
  op.medidas = [...med.entries()].map(([t, n]) => n > 1 ? `${n}× ${t}` : t);
  const c0 = cs[0];
  op.tipo = String(c0[C.TIPO] ?? "").trim();
  op.material = String(c0[C.MAT] ?? "").trim();
  op.medida = `${num(c0[C.ANCHO]) ?? "—"}×${num(c0[C.ALTO]) ?? "—"}`;
  op.espesor = num(c0[C.ESP]) !== null ? num(c0[C.ESP]) + " mm" : "";
  op.apertura = String(c0[C.AP] ?? "").trim();
  const p = cs.map(c => progreso(c).pct);
  op.avance = p.length ? p.reduce((t, x) => t + x, 0) / p.length : 0;
  op.empezada = cs.some(c => progreso(c).ok > 0);
  const creadas = cs.map(c => toDate(c[C.FECHA])).filter(Boolean);
  op.dias = creadas.length
    ? Math.max(...creadas.map(f => Math.floor((hoy0() - dia0(f)) / 86400000))) : null;
  /* Si las puertas no coinciden —alguien toco la hoja a mano, o se añadio una
     despues— manda la fecha mas temprana y, ese dia, el menor puesto. Al volver
     a mover la ficha se escriben todas iguales. */
  let prog = null;
  for(const c of cs){
    const pr = progDeLinea(c); if(!pr) continue;
    if(!prog || pr.fecha < prog.fecha ||
       (pr.fecha.getTime() === prog.fecha.getTime() && pr.orden < prog.orden)) prog = pr;
  }
  op.prog = prog;
  /* Posicion en el orden natural de planta: la de su puerta mas adelantada.
     Sirve para listar lo sin programar en el orden en que planta lo haria. */
  op.natural = op.puertas.slice().sort(ordenNaturalPlanta)[0];
  return op;
}

/** Las OP en proceso, cada una con sus puertas y lo que hace falta para decidir. */
function opsEnProceso(){
  const map = new Map();
  for(const x of puertasEnProceso()){
    const k = claveFicha(x.c, x.r);
    if(!map.has(k)) map.set(k, {k, puertas: []});
    map.get(k).puertas.push(x);
  }
  return [...map.values()].map(resumirOp);
}

/* Planta pide la programacion de cada tarjeta; calcularla por tarjeta seria
   recorrer la cola entera cien veces. Se guarda un momento y se invalida al
   escribir. */
let pgMemo = {t: 0, mapa: null};
function mapaPrograma(){
  if(pgMemo.mapa && Date.now() - pgMemo.t < 400) return pgMemo.mapa;
  const m = new Map();
  if(programaListo()) opsEnProceso().forEach(o => { if(o.prog) m.set(o.k, o.prog); });
  pgMemo = {t: Date.now(), mapa: m};
  return m;
}
const olvidarPrograma = () => { pgMemo = {t: 0, mapa: null}; };

/** La programacion de la OP a la que pertenece una puerta, o null. */
const progDePuerta = (c, r) => mapaPrograma().get(claveFicha(c, r)) || null;

/* ------------------------------ capacidad ------------------------------ */
/** Cuantos puntos caben en un dia: la META de la hoja repartida en sus dias
 *  habiles. La meta y no el ritmo real, por la misma razon que el cronograma:
 *  si el cupo saliera de lo que se ha hecho, un mes flojo bajaria el objetivo
 *  solo. Sin meta no se inventa una. */
function capacidadDia(d){
  if(!esDiaHabil(d)) return 0;
  const p = typeof puntosDia === "function" ? puntosDia() : 0;
  return p > 0 ? p : null;
}

/** Los siete dias de la semana, de lunes a domingo, SIEMPRE los siete.
 *  Los que ya pasaron se ven —con lo que se programo para ellos, que si sigue
 *  abierto es trabajo atrasado— pero no admiten fichas: nadie empieza ayer.
 *  El fin de semana admite fichas —hay semanas que se trabaja— pero no tiene
 *  meta: la meta de la hoja se reparte en dias habiles. */
function diasDeSemana(lunesDe){
  const out = [];
  for(let i = 0; i < PG_SEMANA; i++){
    const d = dia0(lunesDe); d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}
/** Los dias de esa semana que todavia se pueden programar. */
const diasPorProgramar = lunesDe => diasDeSemana(lunesDe).filter(d => d >= hoy0());

/** Las cifras de la programacion, para esta vista y para el resumen. */
function metricasPrograma(){
  const ops = opsEnProceso();
  const h = hoy0();
  const suma = xs => ({n: xs.length, pts: xs.reduce((t, o) => t + o.pts, 0),
    puertas: xs.reduce((t, o) => t + o.puertas.length, 0)});
  const lu = dia0(lunes(h));
  const dias = diasPorProgramar(lu);
  const enDia = d => ops.filter(o => o.prog && o.prog.fecha.getTime() === d.getTime());
  return {
    ops,
    listo: programaListo(),
    abiertas: suma(ops),
    sinProgramar: suma(ops.filter(o => !o.prog)),
    programadas: suma(ops.filter(o => o.prog)),
    atrasadas: suma(ops.filter(o => o.prog && o.prog.fecha < h)),
    hoy: suma(enDia(h)),
    semana: {
      pts: dias.reduce((t, d) => t + enDia(d).reduce((s, o) => s + o.pts, 0), 0),
      cap: dias.reduce((t, d) => t + (capacidadDia(d) || 0), 0)
    }
  };
}

/* ------------------------------ la vista ------------------------------ */
function renderPrograma(){
  const tablero = $("#pg-tablero");
  if(!tablero || pgArrastre) return;

  const h = hoy0();
  const luHoy = dia0(lunes(h));
  if(!pgSemana || pgSemana < luHoy) pgSemana = luHoy;
  const M = metricasPrograma();

  pintarMetaPrograma();

  // Por que no se puede programar, dicho arriba y no en un error al soltar.
  const aviso = $("#pg-aviso");
  if(!M.listo){
    const motivo = (typeof PROG_COLUMNAS !== "undefined" && PROG_COLUMNAS.motivo) ||
      "todavía no se ha comprobado la hoja";
    aviso.className = "aviso warn";
    aviso.innerHTML = `<b>No se puede guardar la programación:</b> ${esc(motivo)}.
      Hacen falta dos columnas en la hoja, <b>ORDEN PROGRAMADO</b> (AP) y
      <b>FECHA PROGRAMADA</b> (AQ), justo después de ORDEN DE COMPRA. La aplicación
      las crea sola la primera vez que la abre alguien con permiso de escritura.`;
  } else if(!puedeProgramar()){
    aviso.className = "aviso";
    aviso.textContent = "Tu acceso permite ver la programación, pero no cambiarla.";
  } else aviso.className = "aviso hide";

  // Semana a la vista
  const dias = diasDeSemana(pgSemana);
  const fin = dia0(pgSemana); fin.setDate(fin.getDate() + PG_SEMANA - 1);
  $("#pg-semana").textContent = pgSemana.getTime() === luHoy.getTime()
    ? `Esta semana · al ${etiquetaDiaPrograma(fin)}`
    : `${etiquetaDiaPrograma(pgSemana)} – ${etiquetaDiaPrograma(fin)}`;
  $("#pg-prev").disabled = pgSemana.getTime() <= luHoy.getTime();
  const masAlla = M.ops.filter(o => o.prog && o.prog.fecha > fin).length;
  const despues = $("#pg-despues");
  despues.textContent = masAlla ? `+${masAlla} en semanas siguientes` : "";
  despues.classList.toggle("hide", !masAlla);

  // Cifras de la semana que se ve, no de la actual
  const enDia = d => M.ops.filter(o => o.prog && o.prog.fecha.getTime() === d.getTime())
    .sort((a, b) => (a.prog.orden - b.prog.orden) || a.k.localeCompare(b.k, "es", {numeric: true}));
  const quedan = dias.filter(d => d >= h);
  const capSem = quedan.reduce((t, d) => t + (capacidadDia(d) || 0), 0);
  const ptsSem = quedan.reduce((t, d) => t + enDia(d).reduce((s, o) => s + o.pts, 0), 0);
  kpiCards("#pg-kpis", [
    ["OP abiertas", M.abiertas.n, `${pgNum(M.abiertas.pts)} puntos. Ni terminadas, ni anuladas, ni despachadas`],
    ["Sin programar", M.sinProgramar.n, `${pgNum(M.sinProgramar.pts)} puntos. Planta las hace después de lo programado`, M.sinProgramar.n > 0],
    ["Atrasadas", M.atrasadas.n, "Programadas para un día que ya pasó y todavía abiertas", M.atrasadas.n > 0],
    ["Semana", capSem ? `${pgNum(ptsSem)} / ${pgNum(capSem)}` : `${pgNum(ptsSem)} pts`,
     "Puntos programados en lo que queda de la semana que se ve, frente a la meta de sus días hábiles"],
    ["Carga", capSem ? Math.round(ptsSem / capSem * 100) + " %" : "—",
     "Programado sobre la meta. Por encima del 100 % no cabe en la semana", capSem && ptsSem > capSem]
  ]);

  const sin = M.ops.filter(o => !o.prog).sort((a, b) => ordenNaturalPlanta(a.natural, b.natural));
  /* Atrasadas en columna propia solo las que NO se ven ya en un dia pasado de
     esta semana: si no, la misma ficha saldria dos veces. */
  const visibles = new Set(dias.map(d => d.getTime()));
  const atr = M.ops.filter(o => o.prog && o.prog.fecha < h && !visibles.has(o.prog.fecha.getTime()))
    .sort((a, b) => (a.prog.fecha - b.prog.fecha) || (a.prog.orden - b.prog.orden));

  const editable = M.listo && puedeProgramar();
  $("#pg-proponer").disabled = !editable || !sin.length || !(puntosDia() > 0);

  /* Cabecera de columna con div y no con <header>: base.css da a todo header
     la barra fija de la aplicacion —sticky, z-index 40, fondo— y cada dia
     acababa pegado arriba de la pantalla. */
  const columna = (clave, titulo, sub, ops, soltar, extra = "", arriba = "") => `
    <section class="pg-col ${extra}" data-col="${clave}" data-soltar="${soltar && editable ? "si" : "no"}">
      <div class="pg-cab"><b>${titulo}</b>${sub}${arriba}</div>
      <div class="pg-lista">${ops.map(o => tarjetaOp(o, editable)).join("") ||
        `<p class="pg-vacio">${soltar ? "Arrastra aquí" : "Nada"}</p>`}</div>
    </section>`;

  /* El buscador va DENTRO de «sin programar», que es donde se busca que meter.
     El tablero se rehace entero en cada repintado: se guarda lo escrito y donde
     estaba el cursor, o un refresco de fondo le borraria a alguien la palabra a
     medio teclear. */
  const q0 = $("#pg-q");
  const qVal = q0 ? q0.value : "", qFoco = !!q0 && document.activeElement === q0;
  const qSel = qFoco ? [q0.selectionStart, q0.selectionEnd] : null;
  const buscador = `<input class="inp pg-q" id="pg-q" type="search" placeholder="Buscar OP, cliente, tipo…"
    autocomplete="off" value="${esc(qVal)}" aria-label="Buscar en la programación">`;

  const cols = [];
  cols.push(columna("sin", "Sin programar",
    `<span>${sin.length} OP · ${pgNum(sin.reduce((t, o) => t + o.pts, 0))} pts · en el orden de planta</span>`,
    sin, true, "pg-sin", buscador));
  if(atr.length) cols.push(columna("atr", "Atrasadas",
    `<span>días que ya pasaron · muévelas</span>`, atr, false, "pg-atr"));
  dias.forEach(d => {
    const ops = enDia(d);
    const pts = ops.reduce((t, o) => t + o.pts, 0);
    const cap = capacidadDia(d);
    const pct = cap ? Math.round(pts / cap * 100) : null;
    const clase = pct === null ? "" : pct > 100 ? "sobre" : pct >= 85 ? "justo" : "";
    const sub = `<span>${ops.length} OP · <b>${pgNum(pts)}</b>${cap ? ` / ${pgNum(cap)}` : ""} pts${
        esDiaHabil(d) ? "" : " · sin meta"}</span>
      ${cap ? `<i class="pg-carga ${clase}"><em style="width:${Math.min(100, pct)}%"></em></i>` : ""}`;
    const esHoy = d.getTime() === h.getTime(), pasado = d < h;
    cols.push(columna(iso(d), (esHoy ? "Hoy · " : "") + etiquetaDiaPrograma(d), sub, ops, !pasado,
      (esHoy ? "pg-hoy " : "") + (pasado ? "pg-pasado " : "") + (esDiaHabil(d) ? "" : "pg-finde")));
  });
  tablero.innerHTML = cols.join("");
  const q1 = $("#pg-q");
  if(q1){
    q1.addEventListener("input", filtrarPrograma);
    if(qFoco){ q1.focus(); if(qSel) q1.setSelectionRange(qSel[0], qSel[1]); }
  }
  filtrarPrograma();
}

function tarjetaOp(o, editable){
  const pc = Math.round(o.avance * 100);
  const selPrio = `<select class="mini tag ${o.prio ? "t-" + o.prio.toLowerCase() : "t-non"}"
      data-pg-prio="${esc(o.k)}" ${editable ? "" : "disabled"} title="Prioridad de la OP">
      <option value=""${o.prio ? "" : " selected"}>—</option>
      ${PRIORIDADES.map(p => `<option${p === o.prio ? " selected" : ""}>${p}</option>`).join("")}
    </select>`;
  const buscar = [o.op, o.cli, o.tipo, o.material, o.medida, o.espesor, o.apertura].join(" ").toLowerCase();
  const marcas = [
    o.devuelta ? `<span class="tag t-dev">DEVUELTA</span>` : "",
    o.vendida ? `<span class="tag t-urg-auto">VENDIDA</span>` : ""
  ].join("");
  const linea1 = [o.tipo, o.medida].filter(Boolean).join(" · ");
  const linea2 = [o.material, o.espesor, o.apertura].filter(Boolean).join(" · ");
  return `<article class="pg-card ${o.prio ? "prio-" + o.prio : ""} ${o.devuelta ? "dev" : ""} ${editable ? "movible" : ""}"
      data-op="${esc(o.k)}" data-buscar="${esc(buscar)}" tabindex="0"
      title="${editable ? "Arrástrala a un día. Con el teclado: Alt + flechas" : ""}">
    <div class="pg-top">
      <span class="pg-op">${esc(o.op)}</span>
      ${selPrio}
      <span class="pg-pts"><b>${pgNum(o.pts)}</b>p</span>
    </div>
    <div class="pg-cli">${esc(o.cli)}</div>
    <div class="pg-med"><div>${esc(linea1)}</div>${linea2 ? `<div>${esc(linea2)}</div>` : ""}</div>
    ${marcas ? `<div class="pg-marcas">${marcas}</div>` : ""}
    <div class="pg-pie">
      <span class="pbar"><i class="${pc >= 100 ? "full" : ""}" style="width:${pc}%"></i></span>
      <span>${pc}%</span>
      ${o.dias !== null ? `<span class="pg-esp">${o.dias} d</span>` : ""}
    </div>
  </article>`;
}

/** Buscar no quita fichas, las apaga: quitarlas cambiaria los puestos al soltar. */
function filtrarPrograma(){
  const q = ($("#pg-q")?.value || "").trim().toLowerCase();
  const ts = q.split(/\s+/).filter(Boolean);
  $$("#pg-tablero .pg-card").forEach(el => {
    const hay = !ts.length || ts.every(t => el.dataset.buscar.includes(t));
    el.classList.toggle("pg-apagada", !hay);
  });
}

/* ------------------------------ la meta ------------------------------ */
/** La meta vive aqui ahora: es la capacidad de cada dia del tablero. Venia del
 *  cronograma de planta y se guarda igual, en la pestaña META de la hoja. */
function pintarMetaPrograma(){
  const pts = $("#pg-meta-pts"), dias = $("#pg-meta-dias"), dia = $("#pg-meta-dia");
  if(!pts || !dias) return;
  // Si alguien esta escribiendo, no se le pisa lo que teclea.
  if(document.activeElement !== pts && document.activeElement !== dias){
    pts.value = META.puntos; dias.value = META.dias;
    $("#pg-meta-guardar").classList.add("hide");
  }
  if(dia) dia.textContent = puntosDia() > 0 ? `= ${pgNum(puntosDia())}/día` : "";
}

/* ------------------------------ guardar ------------------------------ */
/** Escribe la programacion de varias OP de una vez.
 *  cambios: Map(opClave -> {fecha: "aaaa-mm-dd" | null, orden: n | null})
 *  movida:  la OP que la persona movio; null en una propuesta.
 *
 *  Al HISTORIAL va solo la OP movida, no las que se corren un puesto para
 *  dejarle sitio: el historial cuenta como «tocada» cualquier puerta con un
 *  apunte, y eso le reiniciaria el reloj de «sin tocarse» —y con el, el
 *  escalado de prioridad— a pedidos que nadie ha mirado. Por lo mismo una
 *  propuesta no apunta nada por OP. */
async function guardarPrograma(cambios, movida){
  if(!programaListo() || !puedeProgramar()) return false;
  const ops = new Map(opsEnProceso().map(o => [o.k, o]));
  const ups = [], log = [], previos = [];
  const txt = (f, o) => f ? `${etiquetaDiaPrograma(toDate(f))} · puesto ${o ?? "—"}` : "sin programar";
  const colF = A1(C.PROG_FECHA), colO = A1(C.PROG_ORDEN);

  for(const [k, nuevo] of cambios){
    const op = ops.get(k); if(!op) continue;
    for(const {r, c} of op.puertas){
      const fa = toDate(c[C.PROG_FECHA]), oa = num(c[C.PROG_ORDEN]);
      const mismaF = nuevo.fecha ? (fa && iso(fa) === nuevo.fecha) : !fa;
      const mismoO = nuevo.orden == null ? oa === null : oa === nuevo.orden;
      if(mismaF && mismoO) continue;
      previos.push({c, f: c[C.PROG_FECHA], o: c[C.PROG_ORDEN]});
      /* La fecha va en ISO: la hoja la reconoce como fecha en cualquier
         configuracion regional, y dd/mm no. */
      ups.push({a1: `${colF}${r}`, v: [[nuevo.fecha || ""]]},
               {a1: `${colO}${r}`, v: [[nuevo.orden ?? ""]]});
      if(k === movida){
        log.push({accion: "EDITA", op: c[C.OP], fila: r, campo: "Programación",
                  antes: fa ? txt(iso(fa), oa) : "sin programar",
                  despues: txt(nuevo.fecha, nuevo.orden)});
      }
      c[C.PROG_FECHA] = nuevo.fecha || "";
      c[C.PROG_ORDEN] = nuevo.orden ?? "";
    }
  }
  if(!ups.length){ renderPrograma(); return true; }

  // Se ve ya; la hoja va detras.
  pgOcupado = Date.now();
  refrescarTrasPrograma();
  try{
    await writeCells(ups);
    if(log.length) logBulk(log);
    setSync("", "Guardado"); lastHash = "";
    return true;
  }catch(e){
    previos.forEach(p => { p.c[C.PROG_FECHA] = p.f; p.c[C.PROG_ORDEN] = p.o; });
    toast("No se guardó la programación: " + e.message, "err");
    refrescarTrasPrograma();
    return false;
  }finally{
    pgOcupado = Date.now();
  }
}

/** Todo lo que depende del orden: este tablero, planta y el resumen. */
function refrescarTrasPrograma(){
  olvidarPrograma();
  renderPrograma();
  if(typeof plantaDibujada !== "undefined") plantaDibujada = "";
  if(typeof renderDashVisible === "function") renderDashVisible();
}

/** La secuencia de OP de una columna tal y como esta en pantalla. */
const secuenciaCol = (lista, quitar) => [...lista.querySelectorAll(".pg-card")]
  .map(n => n.dataset.op).filter(k => k !== quitar);

/** Traduce «esta OP queda en este sitio» a lo que hay que escribir: la columna
 *  destino entera se renumera, y la de origen tambien si era otro dia, para que
 *  no queden huecos en los puestos. */
function cambiosAlSoltar(opk, desde, hasta, secDestino, secOrigen){
  const cambios = new Map();
  if(hasta === "sin") cambios.set(opk, {fecha: null, orden: null});
  else secDestino.forEach((k, i) => cambios.set(k, {fecha: hasta, orden: i + 1}));
  if(desde !== hasta && /^\d{4}-/.test(desde))
    secOrigen.forEach((k, i) => { if(!cambios.has(k)) cambios.set(k, {fecha: desde, orden: i + 1}); });
  return cambios;
}

/* ------------------------------ proponer ------------------------------
   Lo que hacia el cronograma, convertido en punto de partida: coge lo que aun
   no tiene dia, en el orden en que planta lo haria, y lo va metiendo en los
   dias habiles desde hoy hasta llenar la meta de cada uno. Lo ya programado no
   se mueve —es una decision que alguien tomo— y cuenta como ocupado.

   Una OP mas grande que un dia entero entra sola en un dia vacio: si no, no
   entraria nunca. Lo que no cabe en el horizonte se queda sin programar. */
function propuestaPrograma(){
  const cap = puntosDia();
  if(!(cap > 0)) return null;
  const ops = opsEnProceso();
  const sin = ops.filter(o => !o.prog).sort((a, b) => ordenNaturalPlanta(a.natural, b.natural));
  const dias = [];
  for(const d = hoy0(); dias.length < PG_HORIZONTE; d.setDate(d.getDate() + 1)){
    if(!esDiaHabil(d)) continue;
    const ya = ops.filter(o => o.prog && o.prog.fecha.getTime() === d.getTime());
    dias.push({fecha: iso(d), carga: ya.reduce((t, o) => t + o.pts, 0), puesto: ya.length});
  }
  const cambios = new Map();
  const usados = new Set();
  for(const o of sin){
    const dia = dias.find(x => x.carga === 0 || x.carga + o.pts <= cap + PG_HOLGURA);
    if(!dia) continue;
    dia.carga += o.pts; dia.puesto += 1;
    cambios.set(o.k, {fecha: dia.fecha, orden: dia.puesto});
    usados.add(dia.fecha);
  }
  return {cambios, dias: usados.size, sobran: sin.length - cambios.size, cap};
}

async function proponerPrograma(){
  if(!programaListo() || !puedeProgramar()) return;
  const P = propuestaPrograma();
  if(!P){ toast("Pon primero una meta de puntos: sin ella no se sabe cuánto cabe en un día", "err"); return; }
  if(!P.cambios.size){ toast("No queda nada sin programar que quepa en las próximas semanas", "ok"); return; }
  const aviso = `Se programarán ${P.cambios.size} OP en ${P.dias} día(s) hábil(es), ` +
    `llenando cada día hasta la meta de ${pgNum(P.cap)} puntos.\n\n` +
    `Lo que ya está programado no se mueve.` +
    (P.sobran ? `\n${P.sobran} OP no caben en las próximas ${PG_HORIZONTE} días hábiles y se quedan sin programar.` : "") +
    `\n\nDespués puedes mover cualquier ficha a mano. ¿Continuar?`;
  if(!confirm(aviso)) return;
  const b = $("#pg-proponer"); b.disabled = true;
  const ok = await guardarPrograma(P.cambios, null);
  b.disabled = false;
  if(ok) toast(`${P.cambios.size} OP programadas`, "ok");
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
  pgArrastre = {id: p.id, card, ghost, hueco, dx: x - r.left, dy: y - r.top,
    desde: colOrigen.dataset.col, listaOrigen: colOrigen.querySelector(".pg-lista"),
    valido: true, x, y, raf: 0};
  pgPendiente = null;
  document.body.classList.add("pg-arrastrando");
  if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
  moverArrastre(x, y);
  pgArrastre.raf = requestAnimationFrame(autoDesplazar);
}

function moverArrastre(x, y){
  const a = pgArrastre; if(!a) return;
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
 *  una tablet, y sin esto no se podria llevar una ficha al viernes. */
function autoDesplazar(){
  const a = pgArrastre; if(!a) return;
  const borde = 60, paso = 14;
  const tab = $("#pg-tablero");
  const r = tab.getBoundingClientRect();
  if(a.x < r.left + borde) tab.scrollLeft -= paso;
  else if(a.x > r.right - borde) tab.scrollLeft += paso;
  const lista = document.elementFromPoint(a.x, a.y)?.closest(".pg-lista");
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
  const a = pgArrastre; if(!a) return;
  cancelAnimationFrame(a.raf);
  const colDestino = a.hueco.closest(".pg-col");
  const hasta = colDestino ? colDestino.dataset.col : a.desde;
  const listaDestino = colDestino ? colDestino.querySelector(".pg-lista") : a.listaOrigen;
  // La secuencia de destino, con la ficha puesta donde esta el hueco
  const secDestino = [...listaDestino.children]
    .map(n => n === a.hueco ? a.card.dataset.op
      : (n.classList && n.classList.contains("pg-card") && n !== a.card ? n.dataset.op : null))
    .filter(Boolean);
  const secOrigen = secuenciaCol(a.listaOrigen, a.card.dataset.op);

  a.ghost.remove(); a.hueco.remove();
  a.card.classList.remove("pg-origen");
  $$(".pg-col.pg-sobre").forEach(c => c.classList.remove("pg-sobre"));
  document.body.classList.remove("pg-arrastrando");
  pgArrastre = null;
  pgOcupado = Date.now();

  if(!guardar || !a.valido){ renderPrograma(); return; }
  guardarPrograma(cambiosAlSoltar(a.card.dataset.op, a.desde, hasta, secDestino, secOrigen),
                  a.card.dataset.op);
}

(function engancharPrograma(){
  const tablero = $("#pg-tablero");
  if(!tablero) return;                        // esta pagina no tiene programacion

  tablero.addEventListener("pointerdown", ev => {
    if(ev.pointerType === "mouse" && ev.button !== 0) return;
    const card = ev.target.closest(".pg-card.movible");
    if(!card || ev.target.closest("select,button,input,a")) return;
    const p = {id: ev.pointerId, x: ev.clientX, y: ev.clientY, card, tipo: ev.pointerType};
    pgPendiente = p;
    if(ev.pointerType === "touch"){
      p.timer = setTimeout(() => { if(pgPendiente === p) empezarArrastre(p, p.x, p.y); }, 220);
    }
  });

  document.addEventListener("pointermove", ev => {
    const p = pgPendiente;
    if(p && ev.pointerId === p.id){
      const d = Math.hypot(ev.clientX - p.x, ev.clientY - p.y);
      if(p.tipo === "touch"){
        if(d > 10){ clearTimeout(p.timer); pgPendiente = null; }   // es desplazar
      } else if(d > 5){
        ev.preventDefault();
        empezarArrastre(p, ev.clientX, ev.clientY);
      }
      return;
    }
    if(pgArrastre && ev.pointerId === pgArrastre.id){
      ev.preventDefault();
      moverArrastre(ev.clientX, ev.clientY);
    }
  }, {passive: false});

  const soltar = guardar => ev => {
    if(pgPendiente && ev.pointerId === pgPendiente.id){
      clearTimeout(pgPendiente.timer); pgPendiente = null;
    }
    if(pgArrastre && ev.pointerId === pgArrastre.id) terminarArrastre(guardar);
  };
  document.addEventListener("pointerup", soltar(true));
  document.addEventListener("pointercancel", soltar(false));
  // Con el dedo, mientras se arrastra la pagina no debe desplazarse debajo.
  document.addEventListener("touchmove", ev => { if(pgArrastre) ev.preventDefault(); }, {passive: false});
  document.addEventListener("keydown", ev => { if(ev.key === "Escape" && pgArrastre) terminarArrastre(false); });
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
    const desde = colEl.dataset.col, k = card.dataset.op;
    let hasta = desde, secDestino = secuenciaCol(lista);
    if(ev.key === "ArrowUp" || ev.key === "ArrowDown"){
      if(!/^\d{4}-/.test(desde)) return;       // «sin programar» no tiene puestos
      const i = secDestino.indexOf(k), j = i + (ev.key === "ArrowUp" ? -1 : 1);
      if(j < 0 || j >= secDestino.length) return;
      [secDestino[i], secDestino[j]] = [secDestino[j], secDestino[i]];
    } else {
      const cols = $$("#pg-tablero .pg-col[data-soltar='si']");
      const i = cols.indexOf(colEl);
      const otra = i < 0 ? cols[0] : cols[i + (ev.key === "ArrowLeft" ? -1 : 1)];
      if(!otra) return;
      hasta = otra.dataset.col;
      secDestino = [...secuenciaCol(otra.querySelector(".pg-lista")), k];
    }
    guardarPrograma(cambiosAlSoltar(k, desde, hasta, secDestino, secuenciaCol(lista, k)), k)
      .then(() => { const c = $(`#pg-tablero .pg-card[data-op="${CSS.escape(k)}"]`); if(c) c.focus(); });
  });

  // Prioridad de la OP: se escribe en todas sus puertas.
  tablero.addEventListener("change", async ev => {
    const s = ev.target.closest("[data-pg-prio]"); if(!s) return;
    const op = opsEnProceso().find(o => o.k === s.dataset.pgPrio); if(!op) return;
    const val = s.value;
    const ups = [], log = [], previos = [];
    for(const {r, c} of op.puertas){
      const antes = String(c[C.PRIO] ?? "").trim().toUpperCase();
      if(antes === val) continue;
      previos.push({c, v: c[C.PRIO]});
      ups.push({a1: `M${r}`, v: [[val]]});
      log.push({accion: "EDITA", op: c[C.OP], fila: r, campo: "Prioridad", antes, despues: val});
      c[C.PRIO] = val;
    }
    if(!ups.length) return;
    pgOcupado = Date.now();
    refrescarTrasPrograma();
    try{
      await writeCells(ups); logBulk(log);
      setSync("", "Guardado"); lastHash = "";
    }catch(e){
      previos.forEach(p => p.c[C.PRIO] = p.v);
      toast(e.message, "err"); refrescarTrasPrograma();
    }
  });

  $("#pg-prev").onclick = () => { pgSemana.setDate(pgSemana.getDate() - 7); renderPrograma(); };
  $("#pg-next").onclick = () => { pgSemana.setDate(pgSemana.getDate() + 7); renderPrograma(); };
  $("#pg-hoy").onclick  = () => { pgSemana = null; renderPrograma(); };
  $("#pg-proponer").onclick = proponerPrograma;
  $("#pg-print").onclick = imprimirPrograma;

  // La meta: teclear solo tantea; hasta Guardar la hoja no cambia.
  const cambioMeta = () => {
    const p = Number($("#pg-meta-pts").value), d = Math.round(Number($("#pg-meta-dias").value));
    $("#pg-meta-guardar").classList.toggle("hide",
      !(p > 0) || !(d > 0) || (p === META.puntos && d === META.dias));
  };
  ["#pg-meta-pts", "#pg-meta-dias"].forEach(s => $(s).addEventListener("input", cambioMeta));
  $("#pg-meta-guardar").onclick = async () => {
    const g = $("#pg-meta-guardar"); g.disabled = true;
    const ok = await guardarMeta($("#pg-meta-pts").value, $("#pg-meta-dias").value);
    g.disabled = false;
    if(ok){
      document.activeElement?.blur();
      renderPrograma();
      toast(`Meta guardada: ${pgNum(puntosDia())} puntos al día`, "ok");
    }
  };
})();

/* ------------------------------ imprimir ------------------------------
   Hoja carta vertical con lo que TODAVIA NO tiene dia: se imprime, se mira en
   la mesa con calma, se decide a lapiz y luego se pasa al tablero. Por eso solo
   va lo sin programar —lo programado ya esta decidido y se ve en pantalla—, en
   el orden en que planta lo haria, con los datos basicos para decidir y dos
   columnas en blanco para escribir el dia y el puesto. */
function imprimirPrograma(){
  const M = metricasPrograma();
  const sin = M.ops.filter(o => !o.prog).sort((a, b) => ordenNaturalPlanta(a.natural, b.natural));
  const filas = sin.map((o, i) => `<tr${o.devuelta ? ' class="pp-dev"' : ""}>
      <td class="n">${i + 1}</td>
      <td class="op">${esc(o.op)}${o.devuelta ? "<br><b>DEVUELTA</b>" : ""}</td>
      <td>${esc(o.cli)}</td>
      <td>${esc(o.tipo)}</td>
      <td>${esc(o.material)}</td>
      <td class="n">${esc(o.medida)}</td>
      <td class="n">${esc(o.espesor)}</td>
      <td>${esc(o.apertura)}</td>
      <td></td><td></td></tr>`).join("");

  const ahora = new Date();
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE) || (typeof userMail === "string" && userMail) || "";
  $("#print").innerHTML = `<div class="pg-print">
    <div class="pp-cab">
      <div class="pp-tit"><b>OP sin programar · Puertas</b>
        <span>${sin.length} OP · ${pgNum(sin.reduce((t, o) => t + o.pts, 0))} puntos · en el orden en que planta las haría
        · meta ${puntosDia() > 0 ? pgNum(puntosDia()) + " pts/día" : "sin definir"}</span></div>
      <div class="pp-meta">Impreso ${fmt(ahora)} ${p2(ahora.getHours())}:${p2(ahora.getMinutes())}
        ${quien ? `<br>por ${esc(quien)}` : ""}</div>
    </div>
    ${sin.length ? `<table class="pp-sinprog">
      <thead><tr><th>#</th><th>OP</th><th>Cliente</th><th>Tipo</th><th>Material</th>
        <th>Medidas</th><th>Espesor</th><th>Apertura</th><th>Día</th><th>Puesto</th></tr></thead>
      <tbody>${filas}</tbody></table>`
      : `<p>No hay OP sin programar.</p>`}
    <div class="pp-pie">
      <span>Programó <i></i></span><span>Fecha <i></i></span>
    </div>
  </div>`;
  let rule = $("#page-rule");
  if(!rule){ rule = document.createElement("style"); rule.id = "page-rule"; document.head.appendChild(rule); }
  rule.textContent = "@page{size:letter portrait;margin:10mm}";
  document.body.classList.remove("p-stk");
  document.body.classList.add("p-carta");
  setTimeout(() => window.print(), 60);
}
