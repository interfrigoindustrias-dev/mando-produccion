/* Vista Planta: tarjetas tactiles para el jefe de planta
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ---------- Planta: tablet del jefe de planta ---------- */
const PRIO_ORD = {URGENTE:-1, ALTA:0, MEDIA:1, BAJA:2, "":3};
/* Tonos de la paleta de marca (#0A4283) para que cada tarjeta se distinga sin
   perder la identidad visual. La prioridad ALTA y MEDIA mandan sobre el tono. */
/* Un color por proceso: gama que parte del azul de marca y recorre
   azul → cian → verdeazulado → índigo → violeta, con brillo parejo. */
const COLOR_PROC = {
  13:"#0A4283",  // CORTE PERFIL
  14:"#1668B0",  // INYECCION
  15:"#0E7FA8",  // ACCESORIOS
  16:"#0B8C8C",  // CORTE MARCO
  17:"#12876A",  // MARCO
  18:"#3B5BA9",  // CORTE RIEL
  19:"#5A4EA0",  // RIEL
  20:"#7A4B8C"   // EMBOCINAR
};
/* Puertas que cumplen todo menos la fecha: su dia todavia no ha llegado.
   Se guardan aparte para poder anunciarlas; esconderlas sin decir nada hacia
   pensar que faltaban puertas. */
let plantaProgramadas = [];

function plantaList(){
  const q=$("#p-q").value.trim().toLowerCase(), fp=$("#p-prio").value, fe=$("#p-est").value;
  const verProgramadas = $("#p-prog") && $("#p-prog").checked;
  plantaProgramadas = [];
  const L = activas().filter(({c})=>{
    const p=progreso(c).pct;
    // Planta ve lo que no tiene etapa asignada, MAS las separadas sin terminar:
    // esas tienen comprador esperando algo que no esta hecho, asi que siguen
    // siendo trabajo de planta aunque figuren en almacen. El resto ya es
    // trabajo de otro y mantenerlo a la vista solo estorba.
    const urge = urgente(c);
    // Primero lo despachado, siempre: la excepcion de las separadas urgentes
    // devolvia a planta puertas que ya habian salido.
    if(despachada(c)) return false;
    if(desp(c) && !urgenteAuto(c)) return false;

    if(fe==="urge" && !urge) return false;
    if(fe==="pend" && p>=1) return false;
    if(fe==="wip"  && !(p>0 && p<1)) return false;
    if(fp==="__none"){ if(String(c[C.PRIO]??"").trim()) return false; }
    else if(fp && String(c[C.PRIO]??"").trim().toUpperCase()!==fp) return false;
    if(q && ![c[C.OP],c[C.CLI]].join(" ").toLowerCase().includes(q)) return false;
    // Solo lo que ya toca: si la fecha de proceso es futura, la puerta todavía
    // no entra a planta. Sin fecha se muestra, porque no hay nada que esperar.
    if(fe!=="wip" && !verProgramadas){
      const f = toDate(c[C.FPROC]);
      if(f){
        const h=new Date(); h.setHours(0,0,0,0);
        if(f > h){ plantaProgramadas.push({c, f}); return false; }
      }
    }
    return true;
  });
  const ord=$("#p-ord").value;
  const porOp = (a,b)=>String(a.c[C.OP]).localeCompare(String(b.c[C.OP]),"es",{numeric:true});
  /* Orden de ataque. La urgente marcada a mano va antes que la automatica:
     alguien la puso ahi mirando algo que el sistema no sabe. */
  const prioDe = x => urgenteManual(x.c) ? -2
    : urgenteAuto(x.c) ? -1
    : (PRIO_ORD[String(x.c[C.PRIO]??"").trim().toUpperCase()] ?? 3);
  L.sort((a,b)=>{
    if(ord==="op") return porOp(a,b);
    if(ord==="avance") return progreso(a.c).pct - progreso(b.c).pct;
    if(ord==="pts") return (num(b.c[C.PTS])||0) - (num(a.c[C.PTS])||0);
    const pa=prioDe(a), pb=prioDe(b);
    if(pa!==pb) return pa-pb;
    if(ord==="prioop") return porOp(a,b);
    const da=toDate(a.c[C.FPROC]), db=toDate(b.c[C.FPROC]);
    return (da?da.getTime():8e15) - (db?db.getTime():8e15);
  });
  return L;
}
/* Qué tarjetas hay dibujadas ahora mismo, en orden. Sirve para no reconstruir
   la lista cuando el conjunto no ha cambiado: reconstruirla desecha los botones
   que el operario tiene bajo el dedo y puede dejar otra puerta en esa posición. */
let plantaDibujada = "";

/* Piezas de la tarjeta, en un solo sitio: las usa tanto el pintado inicial
   como el refresco, de modo que no puedan quedar desincronizadas. */
const metaTarjeta = c => [
  esc(c[C.TIPO]??""),
  `${num(c[C.ANCHO])??"—"}×${num(c[C.ALTO])??"—"}`,
  esc(c[C.AP]??""),
  num(c[C.ESP])!==null ? num(c[C.ESP])+" mm" : ""
].filter(Boolean).join(" · ");

const etiquetaPrio = p => p ? tagPrio(p) : '<span class="tag t-non">SIN PRIORIDAD</span>';

/* Distintivo de la tarjeta. Las dos urgencias se pintan distinto porque no se
   arreglan igual: la manual se quita cambiando la prioridad, la automatica se
   quita terminando la puerta o soltando la reserva. */
const etiquetaPlanta = c => {
  if(urgenteManual(c))
    return `<span class="tag t-urg" title="Marcada urgente a mano">URGENTE</span>`;
  if(urgenteAuto(c))
    return `<span class="tag t-urg-auto" title="Separada para ${
      esc(separadaPara(c))} y todavía sin terminar">URGENTE · VENDIDA</span>`;
  return etiquetaPrio(String(c[C.PRIO]??"").trim().toUpperCase());
};

/* Observaciones: lo que hay que saber ANTES de tocar la puerta («GOLPEADA»,
   «lleva visor de 30x60»…). Si no hay nada, el hueco no ocupa sitio. */
const notaTarjeta = c => {
  const t = String(c[C.OBS]??"").trim();
  return t ? `<div class="pobs" data-f="obs" title="Observaciones">${esc(t)}</div>` : "";
};

/** Refresca UNA tarjeta entera sin reconstruirla.
 *
 *  Se actualiza el contenido de cada hueco, nunca la tarjeta completa: rehacerla
 *  desecharia los botones que el operario tiene bajo el dedo, que fue el fallo
 *  que hacia saltar las marcas de proceso.
 *
 *  Y se refresca TODO. La primera version solo tocaba los procesos, asi que
 *  prioridad, fecha, puntaje y medidas se quedaban congelados aunque cambiaran
 *  en la hoja: la vista parecia no actualizarse. */
function pintarTarjeta(r){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const card = document.querySelector(`.pcard[data-r="${r}"]`); if(!card) return;
  const c = row.c;
  const set = (campo, html)=>{
    const el = card.querySelector(`[data-f="${campo}"]`);
    if(el && el.innerHTML !== html) el.innerHTML = html;
  };

  const prio = String(c[C.PRIO]??"").trim().toUpperCase();
  set("op",  esc(c[C.OP]??""));
  set("cli", esc(c[C.CLI]??""));
  set("met", metaTarjeta(c));
  set("prio", etiquetaPlanta(c));
  set("fecha", esc(fmtDate(c[C.FPROC]))||"sin fecha");
  set("pts", `${num(c[C.PTS])??"—"}<em>pts</em>`);

  // Las observaciones aparecen y desaparecen: si cambia que haya o no, la
  // tarjeta cambia de forma y hay que rehacerla.
  const obsAhora = notaTarjeta(c);
  const obsEl = card.querySelector('[data-f="obs"]');
  if(!!obsAhora !== !!obsEl) plantaDibujada = "";
  else if(obsEl) set("obs", esc(String(c[C.OBS]??"").trim()));

  // Color de la tarjeta segun la prioridad
  ["ALTA","MEDIA","BAJA"].forEach(p=>card.classList.toggle("prio-"+p, prio===p));
  card.classList.toggle("urg", urgenteManual(c));
  card.classList.toggle("urg-auto", urgenteAuto(c) && !urgenteManual(c));

  // Procesos. Que un proceso pase a aplicar (o deje de hacerlo) cambia la fila
  // de botones entera: eso si obliga a reconstruir.
  let cambioLaFila = false;
  PROCS.forEach(pr=>{
    const b = card.querySelector(`.pb[data-i="${pr.i}"]`);
    const v = tri(c[pr.i]);
    if(v===null){ if(b) cambioLaFila = true; return; }
    if(!b){ cambioLaFila = true; return; }
    b.classList.toggle("on", v===true);
    b.classList.toggle("off", v!==true);
  });

  const pc = Math.round(progreso(c).pct*100);
  set("av", pc+"%");
  set("listo", pc>=100 ? '<span class="plisto">COMPLETA</span>' : "");
  card.classList.toggle("lista", pc>=100);


  if(cambioLaFila) plantaDibujada = "";
}

/** Aviso de las puertas cuyo día todavía no ha llegado. */
function avisarProgramadas(){
  const box = $("#p-prog-aviso");
  if(!box) return;
  const n = plantaProgramadas.length;
  if(!n){ box.classList.add("hide"); return; }

  // Reparto por prioridad y la fecha más próxima, para que se entienda por qué.
  const porPrio = {};
  plantaProgramadas.forEach(({c})=>{
    const p = String(c[C.PRIO]??"").trim().toUpperCase() || "SIN PRIORIDAD";
    porPrio[p] = (porPrio[p]||0)+1;
  });
  const proxima = plantaProgramadas.reduce((a,b)=> b.f < a.f ? b : a).f;
  const detalle = Object.entries(porPrio).map(([p,k])=>`${k} ${p}`).join(" · ");

  box.classList.remove("hide");
  box.innerHTML = `<b>${n} puerta${n===1?"":"s"} programada${n===1?"":"s"} para más adelante</b>
    — ${esc(detalle)}. La más próxima entra el <b>${esc(fmt(proxima))}</b>.
    <label class="swi" style="margin-left:auto">
      <input type="checkbox" id="p-prog" ${$("#p-prog")&&$("#p-prog").checked?"checked":""}>
      <span>Mostrarlas</span></label>`;
  const ck = $("#p-prog");
  if(ck) ck.onchange = ()=>{ plantaDibujada=""; renderPlanta(); };
}

/* Cuanto trabajo hay en planta, en grande. Es lo primero que se mira al llegar
   por la mañana, y hasta ahora habia que contarlo a ojo tarjeta por tarjeta. */
function pintarResumenPlanta(L){
  const caja = $("#p-resumen"); if(!caja) return;
  const urgM = L.filter(({c})=>urgenteManual(c)).length;
  const urgA = L.filter(({c})=>urgenteAuto(c) && !urgenteManual(c)).length;
  const urg = urgM + urgA;
  const emp = L.filter(({c})=>progreso(c).ok > 0).length;
  const pts = L.reduce((a,{c})=>a + (num(c[C.PTS])||0), 0);
  const dato = (v, k, cls) =>
    `<div class="pr${cls?" "+cls:""}"><b>${v}</b><span>${k}</span></div>`;
  caja.innerHTML =
    dato(L.length, "En producción") +
    (urgM ? dato(urgM, "Urgentes", "urg") : "") +
    (urgA ? dato(urgA, "Vendidas a medias", "urg") : "") +
    dato(emp, "Empezadas") +
    dato(L.length - emp, "Sin empezar") +
    dato(Math.round(pts*10)/10, "Puntos");
}

function renderPlanta(){
  const L=plantaList();
  avisarProgramadas();
  pintarResumenPlanta(L);
  const cnt=$("#p-cnt");
  cnt.innerHTML = `<b>${L.length}</b> de ${activas().length} OP`;
  cnt.classList.toggle("on", L.length!==activas().length);
  $("#p-empty").classList.toggle("hide", L.length>0);

  // Mismo conjunto y mismo orden: basta con refrescar lo que haya cambiado.
  const firma = L.map(x=>x.r).join(",");
  if(firma === plantaDibujada && $("#p-lista").children.length === L.length){
    L.forEach(({r})=>pintarTarjeta(r));
    return;
  }
  plantaDibujada = firma;

  $("#p-lista").innerHTML = L.map(({r,c})=>{
    const pc=Math.round(progreso(c).pct*100);
    const prio=String(c[C.PRIO]??"").trim().toUpperCase();
    const btns = PROCS.map(pr=>{
      const v=tri(c[pr.i]);
      if(v===null) return "";                     // no aplica: no se dibuja
      return `<button class="pb ${v?"on":"off"}" style="--pc:${COLOR_PROC[pr.i]}"
        data-r="${r}" data-i="${pr.i}"><span class="ic"></span>${pr.k}</button>`;
    }).join("");
    return `<div class="pcard${prio?" prio-"+prio:""}${pc>=100?" lista":""}${urgenteManual(c)?" urg":urgenteAuto(c)?" urg-auto":""}" data-r="${r}">
      <div class="ph">
        <span class="op"  data-f="op">${esc(c[C.OP]??"")}</span>
        <span class="cli" data-f="cli">${esc(c[C.CLI]??"")}</span>
        <span class="met" data-f="met">${metaTarjeta(c)}</span>
        <span data-f="prio">${etiquetaPlanta(c)}</span>
        <span class="met" data-f="fecha">${esc(fmtDate(c[C.FPROC]))||"sin fecha"}</span>
        <span class="pts" data-f="pts">${num(c[C.PTS])??"—"}<em>pts</em></span>
        <span class="av"  data-f="av">${pc}%</span>
        <button class="pterm" data-term="${r}"
          title="Darla por terminada: pasa a Calidad">Terminada</button>
        <span data-f="listo">${pc>=100?'<span class="plisto">COMPLETA</span>':""}</span>
      </div>
      ${notaTarjeta(c)}
      <div class="pbtns">${btns}</div>
    </div>`;
  }).join("");
}
/* Momento del último toque. Un refresco de fondo no debe rehacer la lista
   justo cuando alguien está marcando: se espera a que pare. */
let plantaOcupada = 0;
const plantaEnUso = () => Date.now() - plantaOcupada < 1500;

/* «Terminada» es el unico estado que planta puede poner, y es el que arranca el
   resto del flujo: la puerta sale de aqui y aparece en Calidad para que la
   revisen. Un desplegable con los cinco estados invitaba a que planta mandara
   cosas directamente a almacen, saltandose la revision. */
$("#p-lista").addEventListener("click", async ev=>{
  const b = ev.target.closest("[data-term]"); if(!b) return;
  const r = +b.dataset.term;
  const row = ROWS.find(x=>x.r===r); if(!row) return;

  const pc = Math.round(progreso(row.c).pct*100);
  if(pc < 100 && !confirm(
      `La OP ${row.c[C.OP]} va por el ${pc}%.\n\n¿Darla por terminada igualmente?`)) return;

  b.disabled = true;
  plantaOcupada = Date.now();
  const ok = await guardarDespacho(r, "Terminado");
  b.disabled = false;
  plantaOcupada = Date.now();
  if(ok){
    toast(`OP ${row.c[C.OP]} terminada · pasa a Calidad`, "ok");
    plantaDibujada = ""; renderPlanta(); render(); renderDashVisible();
  }
});
$("#p-lista").addEventListener("click", async ev=>{
  const b=ev.target.closest(".pb"); if(!b) return;
  const r=+b.dataset.r, i=+b.dataset.i;
  const cur=tri(ROWS.find(x=>x.r===r).c[i]); if(cur===null) return;

  // Respuesta inmediata al dedo, antes de que viaje nada a la red.
  b.classList.toggle("on", cur!==true);
  b.classList.toggle("off", cur===true);
  b.disabled=true;
  plantaOcupada = Date.now();
  try{ await setProc(r,i,!cur); }
  finally{ b.disabled=false; plantaOcupada = Date.now(); }
  // El estado real manda sobre lo que se pintó de forma optimista.
  pintarTarjeta(r);
});
["#p-q","#p-prio","#p-est","#p-ord"].forEach(s=>{
  const rehacer = ()=>{ plantaDibujada=""; renderPlanta(); };
  $(s).addEventListener("input", rehacer); $(s).addEventListener("change", rehacer);
});
