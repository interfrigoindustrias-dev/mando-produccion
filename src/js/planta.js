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
function plantaList(){
  const q=$("#p-q").value.trim().toLowerCase(), fp=$("#p-prio").value, fe=$("#p-est").value;
  const L = activas().filter(({c})=>{
    const p=progreso(c).pct;
    // «Pendientes»: solo las que no tienen estado de despacho. En cuanto se les
    // asigna uno (En Almacén, Despachado o Separado) salen de la vista de planta.
    if(fe==="open" && desp(c)) return false;
    if(fe==="wip"  && !(p>0 && p<1)) return false;
    if(fp==="__none"){ if(String(c[C.PRIO]??"").trim()) return false; }
    else if(fp && String(c[C.PRIO]??"").trim().toUpperCase()!==fp) return false;
    if(q && ![c[C.OP],c[C.CLI]].join(" ").toLowerCase().includes(q)) return false;
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
function renderPlanta(){
  const L=plantaList();
  const cnt=$("#p-cnt");
  cnt.innerHTML = `<b>${L.length}</b> de ${activas().length} OP`;
  cnt.classList.toggle("on", L.length!==activas().length);
  $("#p-empty").classList.toggle("hide", L.length>0);
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
        <span class="op">${esc(c[C.OP]??"")}</span>
        <span class="cli">${esc(c[C.CLI]??"")}</span>
        <span class="met">${[esc(c[C.TIPO]??""), `${num(c[C.ANCHO])??"—"}×${num(c[C.ALTO])??"—"}`,
          esc(c[C.AP]??""), num(c[C.ESP])!==null?num(c[C.ESP])+" mm":""].filter(Boolean).join(" · ")}</span>
        ${prio?tagPrio(prio):'<span class="tag t-non">SIN PRIORIDAD</span>'}
        <span class="met">${esc(fmtDate(c[C.FPROC]))||"sin fecha"}</span>
        <span class="pts">${num(c[C.PTS])??"—"}<em>pts</em></span>
        <span class="av">${pc}%</span>
        <select class="pdesp" data-desp="${r}" title="Estado de despacho">
          <option value=""${desp(c)?"":" selected"}>Sin estado</option>
          ${DESPACHOS.map(d=>`<option${d===desp(c)?" selected":""}>${d}</option>`).join("")}
        </select>
        ${pc>=100?'<span class="plisto">COMPLETA</span>':""}
      </div>
      <div class="pbtns">${btns}</div>
    </div>`;
  }).join("");
}
$("#p-lista").addEventListener("change", async ev=>{
  const el=ev.target.closest("[data-desp]"); if(!el) return;
  el.disabled=true;
  const ok=await guardarDespacho(+el.dataset.desp, el.value);
  el.disabled=false;
  if(ok){ renderPlanta(); render(); }
});
$("#p-lista").addEventListener("click", async ev=>{
  const b=ev.target.closest(".pb"); if(!b) return;
  const r=+b.dataset.r, i=+b.dataset.i;
  const cur=tri(ROWS.find(x=>x.r===r).c[i]); if(cur===null) return;
  b.disabled=true;
  await setProc(r,i,!cur);
  b.disabled=false;
  const v=tri(ROWS.find(x=>x.r===r).c[i]);
  b.classList.toggle("on", !!v); b.classList.toggle("off", !v);
  const card=b.closest(".pcard"), c=ROWS.find(x=>x.r===r).c, pc=Math.round(progreso(c).pct*100);
  $(".av",card).textContent = pc+"%";
  card.classList.toggle("lista", pc>=100);
});
["#p-q","#p-prio","#p-est","#p-ord"].forEach(s=>{
  $(s).addEventListener("input", renderPlanta); $(s).addEventListener("change", renderPlanta);
});
