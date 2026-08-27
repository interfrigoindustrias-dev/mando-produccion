/* Cronograma de planta: reparto del pendiente en dias habiles
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== CRONOGRAMA ==============================
   Responde a «¿que hago cada dia para cumplir la meta?».

   El cupo diario NO sale de dividir lo pendiente entre los dias: sale de la
   META que se fija en la hoja (pestaña META, ver meta.js). Esa es la
   diferencia entre planificar y limitarse a repartir lo que hay — si el cupo
   saliera del pendiente, un mes flojo bajaria el objetivo solo, que es
   justo lo contrario de lo que sirve.

   Por eso el plan cubre SIEMPRE el plazo completo, aunque el trabajo cargado
   no llegue: los dias que quedan cortos se marcan con los puntos que faltan
   por cargar. Ese hueco es informacion — dice cuanto trabajo hay que meter
   para no tener la planta parada.

   Tres criterios de orden:

   1. Lo empezado se termina. Una puerta a medias ocupa sitio y estorba.
   2. Manda la prioridad, y nada entra antes de su dia: una MEDIA no aparece
      hasta 3 dias despues de crearse, igual que en la vista de planta.
   3. Dentro de eso, se agrupa por cliente y tipo. Repartir las 18 puertas de
      un mismo cliente entre dias sueltos obliga a montar y desmontar el mismo
      utillaje una y otra vez: es la diferencia entre un plan y una lista.

   Se recalcula cada vez que se abre, con lo que haya en la hoja en ese momento. */

/* Cuanto se tolera pasarse del cupo antes de mandar la puerta al dia siguiente.
   Sin holgura, una puerta de 6 puntos no entraria nunca en un cupo de 7,2 ya
   medio ocupado, y el plan se estiraria sin motivo. */
const HOLGURA_CUPO = 0.75;

/** Los proximos n dias habiles a partir de hoy (sabados y domingos fuera). */
function diasHabiles(n){
  const out = [], d = hoy0();
  while(out.length < n){
    if(d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Trabajo que queda por hacer: ni terminado, ni despachado, ni anulado. */
function pendienteCronograma(){
  return ROWS.filter(({c}) =>
    rowActive(c) && !anulada(c) && !completa(c) &&
    !["Despachado","En Almacén","Terminado"].includes(desp(c))
  ).map(({r,c}) => ({
    r, c,
    op:   String(c[C.OP] ?? "").trim(),
    cli:  String(c[C.CLI] ?? "").trim() || "—",
    tipo: String(c[C.TIPO] ?? "").trim() || "—",
    prio: String(c[C.PRIO] ?? "").trim().toUpperCase() || "SIN",
    pts:  num(c[C.PTS]) || 0,
    empezada: progreso(c).ok > 0,
    entra: entradaEnPlanta(c)
  }));
}

/** Dia a partir del cual la puerta puede trabajarse, segun su prioridad. */
function entradaEnPlanta(c){
  const h = hoy0();
  const prio = String(c[C.PRIO] ?? "").trim().toUpperCase();
  const dias = OFFSET[prio] ?? 0;
  const creada = toDate(c[C.FECHA]);
  if(!creada || !dias) return h;
  const e = new Date(creada);
  e.setDate(e.getDate() + dias);
  e.setHours(0,0,0,0);
  return e > h ? e : h;
}

const RANK_PRIO = {URGENTE:-1, ALTA:0, MEDIA:1, SIN:2, BAJA:3};

/** Reparte el pendiente en el plazo de la meta, al ritmo de la meta. */
function calcularCronograma(){
  const pend = pendienteCronograma();
  const dias = diasHabiles(META.dias);
  const cupo = puntosDia();                      // ritmo objetivo, no derivado
  const totalPts = pend.reduce((a,x)=>a+x.pts, 0);

  pend.sort((a,b)=>
    (a.empezada === b.empezada ? 0 : a.empezada ? -1 : 1) ||
    ((RANK_PRIO[a.prio] ?? 4) - (RANK_PRIO[b.prio] ?? 4)) ||
    (a.entra - b.entra) ||
    a.cli.localeCompare(b.cli, "es") ||
    a.tipo.localeCompare(b.tipo, "es") ||
    String(a.op).localeCompare(String(b.op), "es", {numeric:true})
  );

  const plan = dias.map(f => ({fecha:f, items:[], pts:0}));
  const cola = pend.slice();

  for(const d of plan){
    for(let i = 0; i < cola.length; ){
      const x = cola[i];
      // Su dia aun no ha llegado, o ya no cabe mas carga en esta jornada.
      if(x.entra > d.fecha || (d.pts > 0 && d.pts + x.pts > cupo + HOLGURA_CUPO)){ i++; continue; }
      d.items.push(x); d.pts += x.pts; cola.splice(i, 1);
    }
  }
  // Lo que no cupo en ningun dia: o su fecha de entrada cae fuera del plazo, o
  // el trabajo excede la capacidad de la meta. Se coloca en el dia mas flojo
  // que lo admita, y se cuenta aparte para poder avisarlo.
  const sobra = cola.length;
  for(const x of cola){
    const posibles = plan.filter(d => x.entra <= d.fecha);
    const d = (posibles.length ? posibles : plan).reduce((a,b)=> b.pts < a.pts ? b : a);
    d.items.push(x); d.pts += x.pts;
  }

  // Capacidad que da la meta, frente a lo que hay cargado de verdad.
  const capacidad = cupo * plan.length;
  return {plan, cupo, capacidad, totalPts, total:pend.length,
          sobra, hueco: Math.max(0, capacidad - totalPts)};
}

/* ---------- pintado ---------- */

const DIA_SEM = ["dom","lun","mar","mié","jue","vie","sáb"];
const MES_COR = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fechaCorta = f => `${DIA_SEM[f.getDay()]} ${f.getDate()} ${MES_COR[f.getMonth()]}`;

function renderCronograma(){
  const {plan, cupo, capacidad, totalPts, total, hueco} = calcularCronograma();
  const ritmo = ritmoReal();          // lo que la planta viene haciendo de verdad

  $("#cr-meta-pts").value  = META.puntos;
  $("#cr-meta-dias").value = META.dias;

  $("#cr-kpis").innerHTML = [
    [redondo(cupo) + "<small>/día</small>", "Meta · puntos"],
    [ritmo === null ? "—" : redondo(ritmo) + "<small>/día</small>", "Ritmo real · puntos"],
    [redondo(totalPts), "Puntos cargados"],
    [total, "Puertas pendientes"],
    [redondo(hueco), hueco > 0 ? "Puntos por cargar" : "Sin hueco"]
  ].map(([v,k]) => `<div class="crk"><b>${v}</b><span>${k}</span></div>`).join("");

  // Dos preguntas distintas, y las dos importan:
  //   ¿da la planta para este ritmo?   ¿hay trabajo cargado para llenarlo?
  const av = $("#cr-veredicto");
  const partes = [];
  if(ritmo === null){
    partes.push("Todavía no hay historial suficiente para saber si la planta da este ritmo.");
  } else if(cupo <= ritmo){
    partes.push(`La planta da para <b>${redondo(cupo)}</b> puntos al día: viene haciendo
      <b>${redondo(ritmo)}</b>.`);
  } else {
    partes.push(`<b>Ojo con el ritmo.</b> La meta pide <b>${redondo(cupo)}</b> puntos al día
      y la planta viene haciendo <b>${redondo(ritmo)}</b>. Hace falta más capacidad,
      o bajar la meta.`);
  }
  if(hueco > 0){
    partes.push(`Faltan <b>${redondo(hueco)}</b> puntos por cargar para llenar los
      ${META.dias} días: hay <b>${redondo(totalPts)}</b> de los <b>${redondo(capacidad)}</b>
      que cabrían. Los días marcados en azul están a medias.`);
  } else if(totalPts > capacidad){
    partes.push(`Hay <b>${redondo(totalPts - capacidad)}</b> puntos de más para este plazo:
      el trabajo cargado no cabe en ${META.dias} días a este ritmo.`);
  }
  av.className = "aviso" + (ritmo !== null && cupo > ritmo ? " prog" : (hueco > 0 ? "" : " ok"));
  av.innerHTML = partes.join(" ");

  let acum = 0;
  $("#cr-tabla").innerHTML =
    `<thead><tr><th>Día</th><th class="n">Puertas</th><th class="n">Puntos</th>
      <th>Lotes de trabajo</th><th class="n">Acum.</th></tr></thead><tbody>` +
    plan.map((d, i) => {
      acum += d.items.length;
      // El dia sigue existiendo aunque no haya trabajo: el plazo se programa
      // entero. Lo que falta se dice en puntos, que es lo accionable.
      if(!d.items.length) return `<tr class="libre">
        <td class="crd"><b>${i+1}</b><span>${fechaCorta(d.fecha)}</span></td>
        <td class="n crn">0</td>
        <td class="n crp">0<span class="crbar"><i style="width:0"></i></span></td>
        <td class="crv">Día sin trabajo cargado — caben <b>${redondo(cupo)}</b> puntos</td>
        <td class="n">${acum}</td></tr>`;

      // Se juntan las puertas del mismo cliente y tipo: es un solo montaje.
      const g = new Map();
      d.items.forEach(x=>{
        const k = x.cli + "|" + x.tipo;
        if(!g.has(k)) g.set(k, {cli:x.cli, tipo:x.tipo, prio:x.prio, ops:[], pts:0});
        const l = g.get(k); l.ops.push(x.op); l.pts += x.pts;
        if((RANK_PRIO[x.prio] ?? 4) < (RANK_PRIO[l.prio] ?? 4)) l.prio = x.prio;
      });
      const lotes = [...g.values()].map(l=>`<div class="crl">
        ${l.prio === "SIN" ? '<span class="tag t-non">SIN PRIO</span>' : tagPrio(l.prio)}
        <b>${l.ops.length}×</b> <span class="crt">${esc(l.tipo)}</span>
        <span class="crc">${esc(l.cli)}</span>
        <span class="cro">OP ${esc(l.ops.join(", "))}</span></div>`).join("");

      // La barra se mide contra la meta, no contra el dia mas cargado: asi se
      // ve de un vistazo que jornadas quedan por debajo del objetivo.
      const pc = cupo ? Math.min(100, Math.round(d.pts / cupo * 100)) : 0;
      const falta = cupo - d.pts;
      const corto = falta > 0.4;                 // por debajo de la meta
      return `<tr${corto ? ' class="corto"' : ""}>
        <td class="crd"><b>${i+1}</b><span>${fechaCorta(d.fecha)}</span></td>
        <td class="n crn">${d.items.length}</td>
        <td class="n crp">${redondo(d.pts)}<span class="crde">/${redondo(cupo)}</span>
          <span class="crbar"><i style="width:${pc}%"></i></span></td>
        <td class="crlotes">${lotes}${corto
          ? `<div class="crfalta">Faltan <b>${redondo(falta)}</b> puntos para la meta del día</div>`
          : ""}</td>
        <td class="n">${acum}</td></tr>`;
    }).join("") + `</tbody>`;
}

/** Ritmo real de la planta en los ultimos 30 dias. null si no hay datos.
 *
 *  Devuelve PUNTOS por dia habil, no puertas. Tiene que ser la misma magnitud
 *  que el cupo del cronograma: comparar puntos contra puertas daba un veredicto
 *  sin sentido, porque una puerta puede valer entre 0,5 y 6 puntos.
 *
 *  Se divide entre dias habiles (~22 en 30 naturales) porque el cronograma se
 *  reparte en dias habiles. El Resumen muestra puertas por dia natural: es otra
 *  pregunta y por eso da otro numero. */
function ritmoReal(){
  const desde = hoy0(); desde.setDate(desde.getDate() - 30);
  let pts = 0, n = 0;
  for(const {c} of ROWS){
    if(!rowActive(c) || anulada(c) || !completa(c)) continue;
    const f = toDate(c[C.FPROC]);
    if(f && f >= desde){ n++; pts += num(c[C.PTS]) || 0; }
  }
  if(!n) return null;
  return pts / 22;
}

/** Numero corto: sin decimales si es redondo, con uno si no. */
const redondo = v => (Math.round(v * 10) / 10).toLocaleString("es-CO");

/* ---------- interacción ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  const b = $("#btn-crono");
  if(b) b.onclick = async ()=>{
    // Se relee la meta al abrir: puede haberla cambiado alguien en la hoja.
    await loadMeta();
    renderCronograma();
    $("#ov-crono").classList.remove("hide");
  };

  // Escribir en los campos solo simula: hasta que no se guarda, la hoja no
  // cambia. Asi se puede tantear un plazo sin pisarle la meta a nadie.
  const previsualizar = ()=>{
    const p = Number($("#cr-meta-pts").value), d = Math.round(Number($("#cr-meta-dias").value));
    if(!(p > 0) || !(d > 0)) return;
    const antes = META;
    META = {puntos:p, dias:d};
    renderCronograma();
    META = antes;
    $("#cr-meta-pts").value = p; $("#cr-meta-dias").value = d;   // renderCronograma los repone
    $("#cr-guardar").classList.toggle("hide", p === antes.puntos && d === antes.dias);
  };
  ["#cr-meta-pts","#cr-meta-dias"].forEach(sel=>{
    const e = $(sel); if(!e) return;
    e.addEventListener("input", previsualizar);
  });

  const g = $("#cr-guardar");
  if(g) g.onclick = async ()=>{
    g.disabled = true;
    const ok = await guardarMeta($("#cr-meta-pts").value, $("#cr-meta-dias").value);
    g.disabled = false;
    if(ok){
      g.classList.add("hide");
      renderCronograma();
      toast(`Meta guardada: ${redondo(puntosDia())} puntos al día`, "ok");
    }
  };

  const p = $("#cr-print");
  if(p) p.onclick = ()=> window.print();
});
