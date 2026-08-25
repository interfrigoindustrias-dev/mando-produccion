/* Vista Control de OPs: filtros, tabla y edicion en linea
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ filtros ------------------------------ */
/* Un filtro por cada columna visible salvo los procesos. */
const FSEL = ["f-prog","f-desp","f-prio","f-ens","f-mat","f-tipo","f-esp","f-ap","f-med"];
const medidaDe = c => (num(c[C.ANCHO])!==null && num(c[C.ALTO])!==null)
  ? `${num(c[C.ANCHO])}×${num(c[C.ALTO])}` : "";
function filtered(){
  // Un filtro que no existe en esta pagina no filtra. El de ensamble solo esta
  // en puertas, y darlo por hecho hacia que render() reventara entero en paneles
  // — la tabla se quedaba en blanco sin decir por que.
  const g = id => { const e = $("#"+id); return e ? e.value : ""; };
  const q = $("#f-q").value.trim().toLowerCase();
  const eq = (v,f) => !f || String(v??"").trim()===f;
  return ROWS.filter(({c})=>{
    if(!rowActive(c)) return false;
    if(!eq(c[C.MAT],  g("f-mat")))  return false;
    if(!eq(c[C.TIPO], g("f-tipo"))) return false;
    if(!eq(c[C.ESP],  g("f-esp")))  return false;
    if(!eq(c[C.AP],   g("f-ap")))   return false;
    if(!eq(medidaDe(c), g("f-med"))) return false;
    const fprio=g("f-prio");
    if(fprio==="__none"){ if(String(c[C.PRIO]??"").trim()) return false; }
    else if(fprio && String(c[C.PRIO]).toUpperCase()!==fprio) return false;
    const fdesp=g("f-desp");
    if(fdesp==="__none"){ if(String(c[C.DESP]||"").trim()!=="") return false; }
    else if(fdesp && String(c[C.DESP])!==fdesp) return false;
    // Con o sin numero de ensamble: sirve para cazar las que se quedaron sin
    // asignar, que es justo lo que se pierde de vista.
    const fens=g("f-ens");
    if(fens){
      const tiene = String(c[C.ENS]??"").trim() !== "";
      if(fens==="si" && !tiene) return false;
      if(fens==="no" &&  tiene) return false;
    }
    const fprog=g("f-prog");
    if(fprog){
      const p=progreso(c).pct;
      if(fprog==="pend" && p!==0) return false;
      if(fprog==="wip"  && !(p>0 && p<1)) return false;
      if(fprog==="done" && p<1) return false;
      if(fprog==="open" && p>=1) return false;
    }
    if(q){
      const hay=[c[C.OP],c[C.CLI],c[C.ENS],c[C.OBS],c[C.TIPO],c[C.MAT],fmtDate(c[C.FECHA])].join(" ").toLowerCase();
      if(!q.split(/\s+/).every(t=>hay.includes(t))) return false;
    }
    return true;
  });
}
/** Describe los filtros activos, para la tarjeta «Filtradas». */
function filtrosActivos(){
  const et={"f-prog":"progreso","f-desp":"despacho","f-prio":"prioridad","f-ens":"ensamble",
    "f-mat":"material","f-tipo":"tipo","f-esp":"espesor","f-ap":"apertura","f-med":"medidas"};
  const out=[];
  if($("#f-q").value.trim()) out.push(`«${$("#f-q").value.trim()}»`);
  for(const id of FSEL){
    // El filtro puede no existir en esta pagina: paneles no tiene el de ensamble.
    const el=$("#"+id); if(!el || !el.value) continue;
    const txt=el.options[el.selectedIndex].text;
    out.push(`${et[id]}: ${txt}`);
  }
  return out;
}
const NUMORD = (a,b)=>{ const x=parseFloat(a), y=parseFloat(b);
  return (!isNaN(x)&&!isNaN(y)) ? x-y : String(a).localeCompare(String(b),"es",{numeric:true}); };
function fillLists(){
  const A = ROWS.filter(r=>rowActive(r.c));
  const uniq = (f,ord) => [...new Set(A.map(r=>String(f(r.c)??"").trim()).filter(Boolean))].sort(ord||NUMORD);
  const col = i => uniq(c=>c[i]);
  const fill = (sel,vals,all,extra)=>{
    if(!sel) return;                       // el filtro ya no está en el HTML
    const cur=sel.value;
    sel.innerHTML = `<option value="">${all}</option>`+(extra||"")+
      vals.map(v=>`<option>${esc(v)}</option>`).join("");
    sel.value = [...sel.options].some(o=>o.value===cur) ? cur : "";
  };
  const clientes = col(C.CLI);
  fill($("#f-mat"),  col(C.MAT),    "Todos");
  fill($("#f-tipo"), col(C.TIPO),   "Todos");
  fill($("#f-esp"),  col(C.ESP),    "Todos");
  fill($("#f-ap"),   col(C.AP),     "Todas");
  fill($("#f-med"),  uniq(medidaDe),"Todas");
  // filtros de los otros tableros
  fill($("#a-tipo"), col(C.TIPO),   "Todos");
  fill($("#a-esp"),  col(C.ESP),    "Todos");
  fill($("#a-ap"),   col(C.AP),     "Todas");
  fill($("#s-mat"),  col(C.MAT),    "Todos");
  fill($("#s-tipo"), col(C.TIPO),   "Todos");
  fill($("#s-esp"),  col(C.ESP),    "Todos");
  fill($("#s-ap"),   col(C.AP),     "Todas");
  $("#dl-cli").innerHTML = clientes.map(v=>`<option value="${esc(v)}">`).join("");
}

/* ------------------------------ render tabla ------------------------------ */
function tagPrio(v){
  const s=String(v||"").toUpperCase();
  if(!s) return `<span class="tag t-non">—</span>`;
  return `<span class="tag t-${s.toLowerCase()}">${esc(s)}</span>`;
}
function tagDesp(v){
  const s=String(v||"").trim();
  const k = s==="Despachado"?"t-des" : s==="Separado"?"t-sep" : s==="Anulada"?"t-anu" : s?"t-alm":"t-non";
  return `<span class="tag ${k}">${esc(s||"—")}</span>`;
}
/* Edición en línea: prioridad como selector y ensamble como campo de texto.
   Se guardan al cambiar (o al salir del campo) y quedan en el historial. */
const PRIOS = ["ALTA","MEDIA","BAJA"];
function selAp(r, v){
  const cur = String(v??"").trim().toUpperCase();
  const conocida = APERTURAS.includes(cur);
  return `<select class="mini ap ${cur?"":"vacio"}" data-edit-ap="${r}">
    <option value=""${cur?"":" selected"}>—</option>`+
    APERTURAS.map(a=>`<option${a===cur?" selected":""}>${a}</option>`).join("")+
    (cur && !conocida ? `<option selected>${esc(cur)}</option>` : "")+
    `</select>`;
}
function selPrio(r, v){
  const cur = PRIOS.includes(String(v??"").trim().toUpperCase()) ? String(v).trim().toUpperCase() : "";
  const cls = cur ? "t-"+cur.toLowerCase() : "t-non";
  return `<select class="mini tag ${cls}" data-edit-prio="${r}">
    <option value=""${cur?"":" selected"}>—</option>`+
    PRIOS.map(p=>`<option${p===cur?" selected":""}>${p}</option>`).join("")+`</select>`;
}
async function editCampo(r, idx, col, campo, val){
  const row=ROWS.find(x=>x.r===r); if(!row) return;
  const antes = String(row.c[idx]??"");
  if(antes===String(val)) return;
  writeSeq++; row.c[idx]=val;
  try{
    await writeCells([{a1:`${col}${r}`, v:[[val]]}]);
    logChanges("EDITA", row.c[C.OP], r, [{campo, antes, despues:val}]);
    setSync("","Guardado"); lastHash="";
    if(idx===C.PRIO) await autoFechas();         // la prioridad reprograma la fecha
    kpis(filtered());
  }catch(e){ row.c[idx]=antes; render(); toast(e.message,"err"); }
}
$("#tb").addEventListener("change", ev=>{
  const p=ev.target.closest("[data-edit-prio]");
  if(p){
    const r=+p.dataset.editPrio;
    p.className = "mini tag "+(p.value?"t-"+p.value.toLowerCase():"t-non");
    editCampo(r, C.PRIO, "M", "Prioridad", p.value);
    return;
  }
  const a=ev.target.closest("[data-edit-ap]");
  if(a){
    a.classList.toggle("vacio", !a.value);
    editCampo(+a.dataset.editAp, C.AP, "L", "Apertura", a.value);
    return;
  }
  const e=ev.target.closest("[data-edit-ens]");
  if(e) editCampo(+e.dataset.editEns, C.ENS, "AA", "N° ensamble", e.value.trim());
});

function render(){
  const rows = filtered();
  const tb = $("#tb");
  tb.innerHTML = rows.map(({r,c})=>{
    const p = progreso(c), pc = Math.round(p.pct*100);
    const cells = PROCS.map(pr=>{
      const v=tri(c[pr.i]);
      // «no aplica» no se muestra ni se puede tocar: la celda queda vacía
      if(v===null) return `<td class="na-cell" title="${pr.k}: no aplica a esta puerta"></td>`;
      const cls = v===true?"on":"off";
      return `<td><button class="p ${cls}" data-r="${r}" data-i="${pr.i}" title="${pr.k}">${v?"✓":""}</button></td>`;
    }).join("");
    const med = [num(c[C.ANCHO]),num(c[C.ALTO])].every(x=>x!==null) ? `${num(c[C.ANCHO])}×${num(c[C.ALTO])}` : "—";
    return `<tr class="${pc>=100?"done":""}" data-r="${r}">
      <td class="stick"><input type="checkbox" class="cks" data-r="${r}" ${SEL.has(r)?"checked":""}></td>
      <td class="stick" style="left:34px"><span class="op">${esc(c[C.OP]??"")}</span>
        <div class="sub">${esc(fmtDate(c[C.FECHA]))}</div></td>
      <td><span class="cli" title="${esc(c[C.CLI]??"")}">${esc(c[C.CLI]??"")}</span>
        ${tri(c[C.COMP])?'<span class="sub">COMPL.</span>':""}${tri(c[C.STOCK])?'<span class="sub"> STOCK</span>':""}</td>
      <td>${esc(c[C.TIPO]??"")}</td><td>${esc(c[C.MAT]??"")}</td>
      <td class="num">${med}</td><td class="num">${esc(c[C.ESP]??"")}</td>
      <td>${selAp(r, c[C.AP])}</td><td class="num">${esc(c[C.PTS]??"")}</td>
      <td>${selPrio(r, c[C.PRIO])}</td>
      ${cells}
      <td><span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span><span class="pct">${pc}%</span></td>
      <td>${tagDesp(c[C.DESP])}</td>
      <td><input class="mini num" data-edit-ens="${r}" value="${esc(c[C.ENS]??"")}" placeholder="—"></td>
      <td><span class="cli" style="max-width:150px" title="${esc(c[C.OBS]??"")}">${esc(c[C.OBS]??"")}</span></td>
      <td><button class="btn sm" data-edit="${r}">Abrir</button></td>
    </tr>`;
  }).join("");
  $("#tb-empty").classList.toggle("hide", rows.length>0);
  $("#cnt-rows").textContent = `${rows.length} de ${ROWS.filter(x=>rowActive(x.c)).length} puertas`;
  kpis(rows);
  syncSel();
}
function kpis(rows){
  const all = ROWS.filter(r=>rowActive(r.c));
  const abiertas = all.filter(r=>progreso(r.c).pct<1 && !anulada(r.c));
  const anuladas = all.filter(r=>anulada(r.c)).length;
  const sinIniciar = abiertas.filter(r=>progreso(r.c).pct===0).length;
  const alm = all.filter(r=>String(r.c[C.DESP]).trim()==="En Almacén").length;
  const alta = abiertas.filter(r=>String(r.c[C.PRIO]).toUpperCase()==="ALTA").length;
  const avg = abiertas.length? Math.round(abiertas.reduce((s,r)=>s+progreso(r.c).pct,0)/abiertas.length*100):0;
  const act = filtrosActivos();
  const porPrio = p => abiertas.filter(r=>String(r.c[C.PRIO]??"").trim().toUpperCase()===p).length;
  const sinPrio = abiertas.filter(r=>!String(r.c[C.PRIO]??"").trim()).length;
  const k=[["OP totales",all.length,""],["OP abiertas",abiertas.length,""],
           ["OP sin iniciar",sinIniciar,""],["Avance medio OP abiertas",avg+"%",""],
           ["OP prioridad ALTA",porPrio("ALTA"),"Puertas abiertas con prioridad ALTA"],
           ["OP prioridad MEDIA",porPrio("MEDIA"),"Puertas abiertas con prioridad MEDIA"],
           ["OP prioridad BAJA",porPrio("BAJA"),"Puertas abiertas con prioridad BAJA"],
           ["OP sin prioridad",sinPrio,"Puertas abiertas sin prioridad asignada"],
           ["OP en almacén",alm,""],
           ["OP anuladas",anuladas,"Estado de despacho Anulada: fuera de producción, almacén y stock"],
           [act.length?"OP filtradas":"OP sin filtrar", rows.length, act.join(" · ")]];
  $("#kpis").innerHTML = k.map(([s,v,t])=>
    `<div class="kpi ${t?"hi":""}" title="${esc(t)}"><b>${v}</b><span>${esc(s)}</span>`+
    (t?`<em class="fdesc">${esc(t)}</em>`:"")+`</div>`).join("");
}

/* ------------------------------ toggle proceso ------------------------------ */
/** Repinta UNA fila sin reconstruir la tabla: evita que salte el scroll,
 *  que se pierdan clics rápidos y que la fila desaparezca al llegar a 100%
 *  mientras el usuario sigue marcando. */
function paintRow(r){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const tr = $(`#tb tr[data-r="${r}"]`); if(!tr) return;
  const c = row.c;
  PROCS.forEach(pr=>{
    const b = tr.querySelector(`.p[data-i="${pr.i}"]`); if(!b) return;   // null = sin botón
    const v = tri(c[pr.i]);
    b.className = "p " + (v===true?"on":"off");
    b.textContent = v===true?"✓":"";
  });
  const pc = Math.round(progreso(c).pct*100);
  const bar = tr.querySelector(".pbar i");
  if(bar){ bar.style.width = pc+"%"; bar.className = pc>=100?"full":""; }
  const pct = tr.querySelector(".pct"); if(pct) pct.textContent = pc+"%";
  tr.classList.toggle("done", pc>=100);
  kpis(filtered());
}
async function setProc(r, i, next){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const estabaCompleta = completa(row.c);
  const prev = row.c[i];
  writeSeq++;                                    // invalida lecturas en vuelo
  row.c[i] = next===null ? "" : next;            // optimista
  paintRow(r);
  const col = PROCS.find(p=>p.i===i).c;
  try{
    await writeCells([
      {a1:`${col}${r}`, v:[[ next===null ? "" : next ]]},
      {a1:`W${r}`,      v:[[ statusValue(r, row.c) ]]}
    ]);
    setSync("","Guardado "+new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}));
    lastHash="";                                  // fuerza repintado en el próximo poll
    const nom = v => v===true?"hecho" : v===false?"pendiente" : "no aplica";
    logChanges("EDITA", row.c[C.OP], r, [{campo:PROCS.find(p=>p.i===i).k,
      antes:nom(tri(prev)), despues:nom(next)}]);
    await tocarFechaProceso(r, estabaCompleta);  // fecha de hoy, salvo si ya estaba terminada
    await marcarInicioProduccion(r);             // AB: se sella la primera vez y ya no cambia
  }catch(e){ row.c[i]=prev; paintRow(r); toast(e.message,"err"); }
}
$("#tb").addEventListener("click", ev=>{
  const p = ev.target.closest(".p");
  if(p){
    const r=+p.dataset.r, i=+p.dataset.i, cur=tri(ROWS.find(x=>x.r===r).c[i]);
    if(cur===null) return;                       // no aplica: bloqueado
    setProc(r,i, cur!==true); return;
  }
  const e = ev.target.closest("[data-edit]");
  if(e){ openDet(+e.dataset.edit); return; }
  const ck = ev.target.closest(".cks");
  if(ck){ const r=+ck.dataset.r; ck.checked?SEL.add(r):SEL.delete(r); syncSel(); }
});
function syncSel(){
  $("#nsel").textContent = SEL.size;
  const bs = $("#btn-print-stk");
  if(bs) bs.disabled = SEL.size===0;
  $("#btn-print-carta").disabled = SEL.size===0;
}
$("#ck-all").onchange = ev=>{
  SEL.clear(); if(ev.target.checked) filtered().forEach(({r})=>SEL.add(r));
  render();
};

