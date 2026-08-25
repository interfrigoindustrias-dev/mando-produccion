/* Cronograma de planta: reparto del pendiente en dias habiles
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== CRONOGRAMA ==============================
   Responde a «¿que hago cada dia para vaciar lo que hay?».

   No inventa capacidad: reparte el trabajo pendiente entre los dias habiles
   que se pidan, y el cupo diario sale de dividir los puntos entre esos dias.
   Asi se ve de entrada si el plazo es realista comparandolo con el ritmo que
   la planta lleva de verdad.

   Tres criterios, en este orden:

   1. Lo empezado se termina. Una puerta a medias ocupa sitio y estorba.
   2. Manda la prioridad, y nada entra antes de su dia: una MEDIA no aparece
      hasta 3 dias despues de crearse, igual que en la vista de planta.
   3. Dentro de eso, se agrupa por cliente y tipo. Repartir las 18 puertas de
      un mismo cliente entre dias sueltos obliga a montar y desmontar el mismo
      utillaje una y otra vez: es la diferencia entre un plan y una lista.

   Se recalcula cada vez que se abre, con lo que haya en la hoja en ese momento. */

/* Cuanto se tolera pasarse del cupo antes de mandar la puerta al dia siguiente.
   Sin holgura, una puerta de 1.5 puntos no entraria nunca en un cupo de 3.57 ya
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

const RANK_PRIO = {ALTA:0, MEDIA:1, SIN:2, BAJA:3};

/** Reparte el pendiente entre n dias habiles. */
function calcularCronograma(n){
  const pend = pendienteCronograma();
  const dias = diasHabiles(n);
  const totalPts = pend.reduce((a,x)=>a+x.pts, 0);
  const cupo = dias.length ? totalPts / dias.length : 0;

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
  // Lo que no cupo va al dia menos cargado que ya lo admita, para no dejarlo fuera.
  for(const x of cola){
    const posibles = plan.filter(d => x.entra <= d.fecha);
    const d = (posibles.length ? posibles : plan).reduce((a,b)=> b.pts < a.pts ? b : a);
    d.items.push(x); d.pts += x.pts;
  }
  return {plan, totalPts, cupo, total:pend.length, sinHueco:cola.length};
}

/* ---------- pintado ---------- */

const DIA_SEM = ["dom","lun","mar","mié","jue","vie","sáb"];
const MES_COR = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const fechaCorta = f => `${DIA_SEM[f.getDay()]} ${f.getDate()} ${MES_COR[f.getMonth()]}`;

function renderCronograma(){
  const n = Math.max(1, Math.min(60, parseInt($("#cr-dias").value, 10) || 15));
  const {plan, totalPts, cupo, total} = calcularCronograma(n);

  // Ritmo real de la planta, para poder juzgar si el plazo es realista.
  const ritmo = ritmoReal();

  $("#cr-kpis").innerHTML = [
    [total, "Puertas pendientes"],
    [redondo(totalPts), "Puntos de trabajo"],
    [redondo(cupo) + "<small>/día</small>", "Ritmo necesario · puntos"],
    [ritmo === null ? "—" : redondo(ritmo) + "<small>/día</small>", "Ritmo real · puntos"]
  ].map(([v,k]) => `<div class="crk"><b>${v}</b><span>${k}</span></div>`).join("");

  // Un veredicto claro vale mas que cuatro numeros sueltos.
  const av = $("#cr-veredicto");
  if(ritmo === null || !total){
    av.className = "aviso";
    av.textContent = total
      ? "Todavía no hay historial suficiente para comparar el plan con el ritmo real."
      : "No hay nada pendiente: no hay cronograma que hacer.";
  } else if(cupo <= ritmo){
    av.className = "aviso ok";
    av.innerHTML = `Cabe. Hacen falta <b>${redondo(cupo)}</b> puntos al día y la planta
      viene haciendo <b>${redondo(ritmo)}</b>. Sin horas extra, mientras no entre
      trabajo nuevo de prioridad alta.`;
  } else {
    const faltan = Math.ceil(totalPts / ritmo);
    av.className = "aviso prog";
    av.innerHTML = `No cabe en ${n} días. Harían falta <b>${redondo(cupo)}</b> puntos al día
      y la planta viene haciendo <b>${redondo(ritmo)}</b>. A ese ritmo son
      <b>${faltan}</b> días hábiles, o hay que subir la capacidad.`;
  }

  let acum = 0;
  $("#cr-tabla").innerHTML =
    `<thead><tr><th>Día</th><th class="n">Puertas</th><th class="n">Puntos</th>
      <th>Lotes de trabajo</th><th class="n">Acum.</th></tr></thead><tbody>` +
    plan.map((d, i) => {
      acum += d.items.length;
      if(!d.items.length) return `<tr class="libre">
        <td class="crd"><b>${i+1}</b><span>${fechaCorta(d.fecha)}</span></td>
        <td colspan="3" class="crv">Sin carga — margen para retrasos, retrabajos o lo que entre</td>
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

      const pc = cupo ? Math.min(100, Math.round(d.pts / (cupo + HOLGURA_CUPO) * 100)) : 0;
      return `<tr>
        <td class="crd"><b>${i+1}</b><span>${fechaCorta(d.fecha)}</span></td>
        <td class="n crn">${d.items.length}</td>
        <td class="n crp">${redondo(d.pts)}<span class="crbar"><i style="width:${pc}%"></i></span></td>
        <td class="crlotes">${lotes}</td>
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
  if(b) b.onclick = ()=>{ renderCronograma(); $("#ov-crono").classList.remove("hide"); };
  const d = $("#cr-dias");
  if(d){ d.addEventListener("input", renderCronograma); d.addEventListener("change", renderCronograma); }
  const p = $("#cr-print");
  if(p) p.onclick = ()=> window.print();
});
