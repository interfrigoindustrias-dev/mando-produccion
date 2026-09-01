/* Vista Planta de paneleria: la cola de fabricacion
   Proyecto: Control de Produccion - Interfrigo

   En puertas planta es una lista de tarjetas por prioridad. Aqui no basta:
   cambiar el espesor obliga a reajustar la inyectora, asi que la cola viene ya
   agrupada por espesor —secuencia.js resuelve ese orden— y esta vista se
   limita a enseñarlo y a avisar de cada cambio de montaje.

   El orden no es una sugerencia: es el orden en el que conviene fabricar.    */
"use strict";

/* ------------------------------ que ve planta ------------------------------ */
/** Lo que esta pendiente de fabricar. Lo terminado, despachado o anulado ya no
 *  es trabajo de planta y tenerlo a la vista solo estorba. */
function plantaPendientes(){
  const q = $("#p-q").value.trim().toLowerCase();
  const fp = $("#p-prio").value, fe = $("#p-esp").value;
  const hoyFin = new Date(); hoyFin.setHours(23,59,59,999);

  return activas().filter(({c})=>{
    if(anuladaP(c) || despachadaP(c)) return false;
    if(progreso(c).pct >= 1) return false;
    if(estadoDe(c) === ESTADO.TERMINADO) return false;

    /* Del dia de hoy hacia atras: lo que aun no toca no se enseña, porque
       adelantarlo desordena la cola. Si la fecha es un texto de lote y no se
       puede leer, se enseña igual: es peor esconder trabajo que enseñarlo. */
    const f = toDate(c[C.FECHA]);
    if(f && f > hoyFin) return false;

    if(fp && String(c[C.PRIO]??"").trim().toUpperCase() !== fp) return false;
    if(fe && espesorDe(c) !== fe) return false;
    if(q){
      const hay = [c[C.OP], c[C.CLI], c[C.PROD]].join(" ").toLowerCase();
      if(!q.split(/\s+/).every(t=>hay.includes(t))) return false;
    }
    return true;
  });
}

let plantaDibujada = "";
let plantaOcupada = 0;
/* Un refresco de fondo no debe rehacer la lista justo cuando alguien esta
   marcando: se espera a que pare. Sin esto, en puertas se veia saltar la
   marca de una tarjeta a otra. */
const plantaEnUso = () => Date.now() - plantaOcupada < 1500;

const etiquetaPrio = p => p && p !== "sin prioridad"
  ? `<span class="tag t-${p.toLowerCase()}">${esc(p)}</span>`
  : `<span class="tag t-non">SIN PRIORIDAD</span>`;

/** Cuanto lleva esperando, dicho como se dice en planta. */
function textoEspera(dias){
  if(dias <= 0) return "hoy";
  if(dias === 1) return "1 día";
  return `${dias} días`;
}

function renderPlanta(){
  const orden = secuenciaPaneles(plantaPendientes());

  // Firma de lo dibujado: si nada cambio, no se toca el DOM.
  const firma = orden.map(x=>[x.r, x.prioridad, x.espesor,
    PROCS.map(p=>tri(x.c[p.i])).join("")].join("|")).join(";");
  if(firma === plantaDibujada){ pintarResumenPlanta(orden); return; }
  plantaDibujada = firma;

  const lista = $("#p-lista");
  let espesorAnterior = null, tanda = 0, nTanda = 0;
  const trozos = [];

  orden.forEach((x, i)=>{
    // Cada cambio de espesor es una parada de maquina: se anuncia, y se cierra
    // la tanda anterior diciendo cuanto se fabrico sin tocar el montaje.
    if(x.espesor !== espesorAnterior){
      if(espesorAnterior !== null){
        trozos.push(`<div class="tanda-fin">Fin de la tanda de <b>${esc(espesorAnterior)}</b>
          · ${nTanda} línea(s) · <b>${n2(tanda)}</b> m²</div>`);
      }
      trozos.push(`<div class="setup"><span class="ico">⚙</span>
        Cambio de montaje: ajustar a <b>${esc(x.espesor)}</b></div>`);
      espesorAnterior = x.espesor; tanda = 0; nTanda = 0;
    }
    tanda += x.m2; nTanda++;

    const c = x.c;
    const pc = Math.round(progreso(c).pct*100);
    const prio = String(c[C.PRIO]??"").trim().toUpperCase();
    const botones = PROCS.map(pr=>{
      const v = tri(c[pr.i]);
      return `<button class="pb ${v===true?"on":"off"}" data-i="${pr.i}" data-r="${x.r}">
        ${v===true?"✓ ":""}${esc(pr.k)}</button>`;
    }).join("");

    trozos.push(`<article class="pcard ${prio?"prio-"+prio:""} ${prio==="URGENTE"?"urg":""}"
        data-r="${x.r}">
      <div class="pc-top">
        <span class="pc-n">${i+1}</span>
        <span class="op" data-f="op">${esc(c[C.OP]??"")}</span>
        <span data-f="prio">${etiquetaPrio(x.prioridad)}</span>
        <span class="pc-esp" title="Espesor por el que se agrupa">${esc(x.espesor)}</span>
      </div>
      <div class="pc-cli" data-f="cli">${esc(c[C.CLI]??"")}</div>
      <div class="pc-met" data-f="met">${esc(c[C.PROD]??"")} ·
        ${n0(c[C.CANT])} panel(es) de ${n2(c[C.LARGO])} m ·
        ${esc(c[C.RANU]??"")} · ${esc(c[C.CARA_A]??"")}/${esc(c[C.CARA_B]??"")}</div>
      <div class="pc-cifras">
        <span title="Metros cuadrados de esta línea"><b>${n2(x.m2)}</b> m²</span>
        <span title="Metros acumulados sin cambiar el montaje">acum. <b>${n2(x.acumulado)}</b> m²</span>
        <span title="Días esperando en la cola">espera <b>${textoEspera(x.dias)}</b></span>
      </div>
      <div class="pc-procs">${botones}</div>
      <div class="pc-pie">
        <span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span>
        <span class="pct">${pc}%</span>
        <button class="btn sm pri" data-term="${x.r}">Terminar</button>
      </div>
    </article>`);
  });

  if(espesorAnterior !== null){
    trozos.push(`<div class="tanda-fin">Fin de la tanda de <b>${esc(espesorAnterior)}</b>
      · ${nTanda} línea(s) · <b>${n2(tanda)}</b> m²</div>`);
  }

  lista.innerHTML = trozos.join("") ||
    `<div class="empty">No hay nada pendiente de fabricar con estos filtros.</div>`;
  pintarResumenPlanta(orden);
}

/** Cabecera: cuanto hay por delante y en cuantas paradas de maquina. */
function pintarResumenPlanta(orden){
  const m2 = orden.reduce((s,x)=>s+x.m2, 0);
  const paneles = orden.reduce((s,x)=>s+(num(x.c[C.CANT])||0), 0);
  const kg = orden.reduce((s,x)=>s+kgDe(x.c), 0);
  const cambios = orden.filter(x=>x.cambioSetup).length;
  const urgentes = orden.filter(x=>x.prioridad === "URGENTE").length;
  kpiCards("#p-kpis", [
    ["Líneas en cola", orden.length, "En el orden en que conviene fabricarlas"],
    ["Paneles", n0(paneles), ""],
    ["m² pendientes", n2(m2), ""],
    ["kg de poliuretano", n2(kg), "Lo que hará falta para toda la cola"],
    ["Cambios de montaje", cambios, "Cada uno es una parada para reajustar la máquina"],
    ["URGENTE", urgentes, "Pasan por delante de todo y no esperan turno", urgentes>0]
  ]);
}

/** Repinta UNA tarjeta. Rehacer la lista entera tras cada marca hacia que se
 *  activaran todas y se apagara la tocada: paso en puertas y no se repite. */
function pintarTarjeta(r){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const card = document.querySelector(`.pcard[data-r="${r}"]`); if(!card) return;
  const c = row.c;
  PROCS.forEach(pr=>{
    const b = card.querySelector(`.pb[data-i="${pr.i}"]`); if(!b) return;
    const v = tri(c[pr.i]);
    b.className = "pb " + (v===true ? "on" : "off");
    b.textContent = (v===true ? "✓ " : "") + pr.k;
  });
  const pc = Math.round(progreso(c).pct*100);
  const bar = card.querySelector(".pbar i");
  if(bar){ bar.style.width = pc+"%"; bar.className = pc>=100 ? "full" : ""; }
  const pct = card.querySelector(".pct"); if(pct) pct.textContent = pc+"%";
}

/* ------------------------------ marcar desde planta ------------------------------ */
$("#p-lista").addEventListener("click", async ev=>{
  const b = ev.target.closest(".pb");
  if(b){
    plantaOcupada = Date.now();
    const r = +b.dataset.r, i = +b.dataset.i;
    const row = ROWS.find(x=>x.r===r); if(!row) return;
    const cur = tri(row.c[i]);
    if(cur === null) return;

    const estabaCompleta = completa(row.c);
    const prev = row.c[i];
    writeSeq++;
    row.c[i] = cur !== true;                       // optimista
    pintarTarjeta(r);
    const letra = PROCS.find(p=>p.i===i).c;
    try{
      await writeCells([
        {a1:`${letra}${r}`,      v:[[ cur !== true ]]},
        {a1:`${STATUS_COL}${r}`, v:[[ statusValue(r, row.c) ]]}
      ]);
      setSync("", "Guardado");
      lastHash = "";
      const nom = v => v===true ? "hecho" : "pendiente";
      logChanges("EDITA", row.c[C.OP], r,
        [{campo:PROCS.find(p=>p.i===i).k, antes:nom(tri(prev)), despues:nom(cur!==true)}]);
      await tocarFechaProceso(r, estabaCompleta);
      plantaOcupada = Date.now();
    }catch(e){ row.c[i] = prev; pintarTarjeta(r); toast(e.message, "err"); }
    return;
  }

  /* TERMINAR es lo unico que planta decide sobre el estado, y es lo que hace
     que la linea salga de aqui y aparezca en almacen. Un desplegable con todos
     los estados invitaria a que planta despachara sin pasar por almacen. */
  const t = ev.target.closest("[data-term]");
  if(!t) return;
  const r = +t.dataset.term;
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const pc = Math.round(progreso(row.c).pct*100);
  if(pc < 100 && !confirm(
      `La línea ${row.c[C.OP]} va por el ${pc}%.\n\n¿Darla por terminada igualmente?`)) return;
  plantaOcupada = Date.now();
  try{
    await ponerEstado(r, ESTADO.TERMINADO);
    toast(`Línea ${row.c[C.OP]} terminada`, "ok");
    plantaDibujada = "";                      // sale de la cola: hay que rehacerla
    renderPlanta();
  }catch(e){ /* ponerEstado ya lo dijo y deshizo */ }
});

["p-q","p-prio","p-esp"].forEach(id=>{
  const e = $("#"+id); if(!e) return;
  e.addEventListener("input", ()=>{ plantaDibujada=""; renderPlanta(); });
  e.addEventListener("change", ()=>{ plantaDibujada=""; renderPlanta(); });
});

/** El filtro de espesor se llena con los que de verdad hay en cola. */
function llenarEspesoresPlanta(){
  const sel = $("#p-esp"); if(!sel) return;
  const vals = [...new Set(activas().map(({c})=>espesorDe(c)).filter(Boolean))]
    .sort((a,b)=>String(a).localeCompare(String(b),"es",{numeric:true}));
  const cur = sel.value;
  sel.innerHTML = `<option value="">Todos</option>` +
    vals.map(v=>`<option>${esc(v)}</option>`).join("");
  sel.value = [...sel.options].some(o=>o.value===cur) ? cur : "";
}
