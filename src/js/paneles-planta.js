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

  /* TODO lo que no esta terminado. Antes se escondia lo que tuviera fecha
     posterior a hoy; se quita, porque escondia trabajo real y nadie sabia que
     estaba escondido. Lo despachado y lo anulado si se quedan fuera: eso ya no
     es trabajo de planta. */
  return activas().filter(({c})=>{
    if(anuladaP(c) || despachadaP(c)) return false;
    /* Una linea al 100 % SIGUE aqui. Lo que la saca de planta es que alguien
       pulse Terminar, no que se marque el ultimo proceso: entre lo uno y lo
       otro caben una revision, un retoque, o simplemente esperar a que quien
       manda la de por buena. */
    if(estadoDe(c) === ESTADO.TERMINADO) return false;

    if(!filtroPasa("p-prio", String(c[C.PRIO]??"").trim().toUpperCase())) return false;
    if(!filtroPasa("p-esp", espesorDe(c))) return false;
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

const etiquetaPrio = p => {
  // «ALTA·adelantada» es un escalon de la cola, no una prioridad: se pinta ALTA.
  const base = String(p || "").split("·")[0];
  return base && base !== "sin prioridad"
    ? `<span class="tag t-${base.toLowerCase()}">${esc(base)}</span>`
    : `<span class="tag t-non">SIN PRIORIDAD</span>`;
};

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

    /* La tarjeta se reparte a lo ancho en cuatro bloques: quien es, cuanto
       mide, que falta por hacer y como va. En vertical se apilan solos. */
    trozos.push(`<article class="pcard ${prio?"prio-"+prio:""} ${prio==="URGENTE"?"urg":""}
        ${pc>=100?"pc-lista":""}" data-r="${x.r}">
      <div class="pc-id">
        <div class="pc-top">
          <span class="pc-n">${i+1}</span>
          <span class="op" data-f="op">${esc(c[C.OP]??"")}</span>
          <span data-f="prio">${etiquetaPrio(x.prioridad)}</span>
          ${x.adelantada ? `<span class="pc-adel" title="Lleva ${x.sinTocar} días sin tocarse: se adelanta al resto de las ALTA">adelantada</span>` : ""}
          <span class="pc-esp" title="Espesor por el que se agrupa">${esc(x.espesor)}</span>
        </div>
        <div class="pc-cli" data-f="cli">${esc(c[C.CLI]??"")}</div>
        <div class="pc-met" data-f="met">${esc(c[C.PROD]??"")} ·
          ${esc(c[C.RANU]??"")} · ${esc(c[C.CARA_A]??"")}/${esc(c[C.CARA_B]??"")}</div>
      </div>

      <div class="pc-datos">
        <div class="pc-nums">
          <span title="Paneles de esta línea"><b>${n0(c[C.CANT])}</b><i>paneles</i></span>
          <span title="Largo de cada panel"><b>${n2(c[C.LARGO])}</b><i>m de largo</i></span>
          <span title="Poliuretano de un panel">
            <b>${n2(kgUnidDe(c))}</b><i>kg PU · panel</i></span>
          <span class="total" title="Poliuretano de toda la línea">
            <b>${n2(kgDe(c))}</b><i>kg PU en total</i></span>
        </div>
        <div class="pc-extra">
          <span title="Metros cuadrados de esta línea">${n2(x.m2)} m²</span>
          <span title="Metros acumulados sin cambiar el montaje de la máquina">
            ${n2(x.acumulado)} m² sin cambiar montaje</span>
          <span title="Lo que lleva esperando en la cola">esperando ${textoEspera(x.dias)}</span>
          <span title="Desde el último cambio: es lo que cuenta para adelantarla o subirla de prioridad">sin tocarse ${textoEspera(x.sinTocar)}</span>
        </div>
      </div>

      <div class="pc-procs">${botones}</div>

      <div class="pc-pie">
        <span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span>
        <span class="pct">${pc>=100 ? "lista para terminar" : pc+"%"}</span>
        <button class="btn pri pterm" data-term="${x.r}">Terminar</button>
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
    ["Cambios de montaje", cambios,
     `Cada uno es una parada para reajustar la máquina. Se agrupa por espesor hasta ${MODELO.lotePorEspesor} m²`],
    ["Adelantadas", orden.filter(x=>x.adelantada).length,
     `ALTA que llevan ${MODELO.diasAdelantoAlta} días sin tocarse: pasan justo detrás de las urgentes`],
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
  const pct = card.querySelector(".pct");
  if(pct) pct.textContent = pc >= 100 ? "lista para terminar" : pc + "%";
  card.classList.toggle("pc-lista", pc >= 100);
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
      await tocarFechaProceso(r);
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


