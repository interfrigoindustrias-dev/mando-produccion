/* Vista Planta: tarjetas tactiles para el jefe de planta
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ---------- Planta: tablet del jefe de planta ---------- */
const PRIO_ORD = {ALTA:0, MEDIA:1, BAJA:2, "":3};
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
    // «Pendientes»: solo las que no tienen estado de despacho. En cuanto se les
    // asigna uno (En Almacén, Despachado o Separado) salen de la vista de planta.
    if(fe==="open" && desp(c)) return false;
    if(fe==="wip"  && !(p>0 && p<1)) return false;
    if(fp==="__none"){ if(String(c[C.PRIO]??"").trim()) return false; }
    else if(fp && String(c[C.PRIO]??"").trim().toUpperCase()!==fp) return false;
    if(q && ![c[C.OP],c[C.CLI]].join(" ").toLowerCase().includes(q)) return false;
    // Solo lo que ya toca: si la fecha de proceso es futura, la puerta todavía
    // no entra a planta. Sin fecha se muestra, porque no hay nada que esperar.
    if(fe==="open" && !verProgramadas){
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
  const prioDe = x => PRIO_ORD[String(x.c[C.PRIO]??"").trim().toUpperCase()] ?? 3;
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
  set("prio", etiquetaPrio(prio));
  set("fecha", esc(fmtDate(c[C.FPROC]))||"sin fecha");
  set("pts", `${num(c[C.PTS])??"—"}<em>pts</em>`);

  // Color de la tarjeta segun la prioridad
  ["ALTA","MEDIA","BAJA"].forEach(p=>card.classList.toggle("prio-"+p, prio===p));

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

  // No se pisa el selector si el operario lo tiene abierto.
  const sel = card.querySelector(".pdesp");
  if(sel && sel.value !== desp(c) && document.activeElement !== sel) sel.value = desp(c);

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

function renderPlanta(){
  const L=plantaList();
  avisarProgramadas();
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
    return `<div class="pcard${prio?" prio-"+prio:""}${pc>=100?" lista":""}" data-r="${r}">
      <div class="ph">
        <span class="op"  data-f="op">${esc(c[C.OP]??"")}</span>
        <span class="cli" data-f="cli">${esc(c[C.CLI]??"")}</span>
        <span class="met" data-f="met">${metaTarjeta(c)}</span>
        <span data-f="prio">${etiquetaPrio(prio)}</span>
        <span class="met" data-f="fecha">${esc(fmtDate(c[C.FPROC]))||"sin fecha"}</span>
        <span class="pts" data-f="pts">${num(c[C.PTS])??"—"}<em>pts</em></span>
        <span class="av"  data-f="av">${pc}%</span>
        <select class="pdesp" data-desp="${r}" title="Estado de despacho">
          <option value=""${desp(c)?"":" selected"}>Sin estado</option>
          ${DESPACHOS.map(d=>`<option${d===desp(c)?" selected":""}>${d}</option>`).join("")}
        </select>
        <span data-f="listo">${pc>=100?'<span class="plisto">COMPLETA</span>':""}</span>
      </div>
      <div class="pbtns">${btns}</div>
    </div>`;
  }).join("");
}
/* Momento del último toque. Un refresco de fondo no debe rehacer la lista
   justo cuando alguien está marcando: se espera a que pare. */
let plantaOcupada = 0;
const plantaEnUso = () => Date.now() - plantaOcupada < 1500;

$("#p-lista").addEventListener("change", async ev=>{
  const el=ev.target.closest("[data-desp]"); if(!el) return;
  el.disabled=true;
  const ok=await guardarDespacho(+el.dataset.desp, el.value);
  el.disabled=false;
  if(ok){ plantaDibujada=""; renderPlanta(); render(); }
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
