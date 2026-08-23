/* Ficha de la puerta: detalle, edicion y alta de nuevas
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ modal detalle ------------------------------ */
function openDet(r){
  const row=ROWS.find(x=>x.r===r); if(!row) return;
  detRow=r; const c=row.c;
  $("#d-op").textContent = "OP "+(c[C.OP]??"");
  $("#d-cli").textContent = [c[C.CLI], fmtDate(c[C.FECHA])].filter(Boolean).join(" · ");
  const spec=[["Material",c[C.MAT]],["Tipo",c[C.TIPO]],["Espesor",c[C.ESP]],["Apertura",c[C.AP]],
              ["Puntos",c[C.PTS]],["Complemento",tri(c[C.COMP])?"Sí":"No"],["Stock",tri(c[C.STOCK])?"Sí":"No"]];
  $("#d-spec").innerHTML = spec.map(([k,v])=>
    `<div class="kpi"><b style="font-size:15px">${esc(v??"—")||"—"}</b><span>${k}</span></div>`).join("");
  $("#d-ancho").value = num(c[C.ANCHO]) ?? "";
  $("#d-alto").value  = num(c[C.ALTO])  ?? "";
  // Procesos compactos: una rejilla de pastillas. Los que no aplican salen
  // desactivados y no se pueden tocar (eso se fija al crear la ficha).
  $("#d-procs").innerHTML = `<div class="pgrid">`+PROCS.map(p=>{
    const v=tri(c[p.i]);
    const cls = v===null ? "na" : v ? "on" : "";
    const st  = v===null ? "no aplica" : v ? "hecho" : "pendiente";
    return `<button type="button" class="pc ${cls}" data-i="${p.i}" ${v===null?"disabled":""}>
      <span class="bx">✓</span><span class="nm">${p.k}<span class="st"> · ${st}</span></span></button>`;
  }).join("")+`</div>`;
  $("#d-desp").value = DESPACHOS.includes(String(c[C.DESP])) ? String(c[C.DESP]) : "";
  $("#d-fdesp").value = fmtDate(c[C.FDESP]); $("#d-fproc").value = fmtDate(c[C.FPROC]);
  $("#d-prio").value = ["ALTA","MEDIA","BAJA"].includes(String(c[C.PRIO]).toUpperCase())?String(c[C.PRIO]).toUpperCase():"";
  $("#d-ens").value = c[C.ENS]??""; $("#d-obs").value = c[C.OBS]??"";
  $("#d-row").textContent = "Fila "+r;
  $("#ov-det").classList.remove("hide");
  renderHist(c[C.OP], r);                       // pinta lo que ya haya en memoria…
  loadLog().then(()=>{ if(detRow===r) renderHist(c[C.OP], r); });   // …y refresca
}
$("#d-procs").addEventListener("click", ev=>{
  const b=ev.target.closest(".pc"); if(!b || b.disabled) return;
  const on = !b.classList.contains("on");
  b.classList.toggle("on", on);
  $(".st",b).textContent = " · " + (on?"hecho":"pendiente");
});
$("#d-save").onclick = async ()=>{
  const r=detRow, row=ROWS.find(x=>x.r===r); if(!row) return;
  const estabaCompleta = completa(row.c);
  const ups=[], cambios=[], op=row.c[C.OP];
  const nom = v => v===true?"hecho" : v===false?"pendiente" : "no aplica";
  $$("#d-procs .pc").forEach(pc=>{
    const i=+pc.dataset.i;
    const antes = tri(row.c[i]);
    if(antes===null) return;                     // no aplica: intocable
    const v = pc.classList.contains("on");
    if(antes !== v){
      ups.push({a1:`${PROCS.find(p=>p.i===i).c}${r}`, v:[[v]]});
      cambios.push({campo:PROCS.find(p=>p.i===i).k, antes:nom(antes), despues:nom(v)});
      row.c[i]=v;
    }
  });
  //  Regla 4: al marcar Despachado se rellena la fecha de despacho si está vacía
  if($("#d-desp").value==="Despachado" && !$("#d-fdesp").value.trim() && CFG.auto!==false)
    $("#d-fdesp").value = hoy();
  //  fecha:true → comparar por texto formateado, porque en memoria es un número de serie
  const pairs=[[C.DESP,"Y","Estado despacho",$("#d-desp").value,false],
               [C.FDESP,"Z","Fecha despacho",$("#d-fdesp").value.trim(),true],
               [C.FPROC,"X","Fecha proceso",$("#d-fproc").value.trim(),true],
               [C.PRIO,"M","Prioridad",$("#d-prio").value,false],
               [C.ENS,"AA","N° ensamble",$("#d-ens").value.trim(),false],
               [C.ANCHO,"H","Ancho vano",numCell($("#d-ancho").value),false],
               [C.ALTO,"I","Alto vano",numCell($("#d-alto").value),false],
               [C.OBS,"V","Observaciones",$("#d-obs").value.trim(),false]];
  for(const [idx,col,campo,val,esFecha] of pairs){
    const antes = esFecha ? fmtDate(row.c[idx]) : String(row.c[idx]??"");
    if(antes !== String(val)){
      ups.push({a1:`${col}${r}`, v:[[val]]});
      cambios.push({campo, antes, despues:val});
      row.c[idx]=val;
    }
  }
  if(ups.some(u=>/^[NOPQRSTU]\d+$/.test(u.a1))) ups.push({a1:`W${r}`, v:[[statusValue(r,row.c)]]});
  if(!ups.length){ $("#ov-det").classList.add("hide"); return; }
  try{
    await writeCells(ups); $("#ov-det").classList.add("hide"); lastHash=""; render();
    logChanges("EDITA", op, r, cambios);
    await congelarSiCompleta(r, estabaCompleta);
    await autoFechas();                          // por si cambió la prioridad
    toast("Cambios guardados","ok"); setSync("","Guardado");
  }catch(e){ toast(e.message,"err"); refresh(false); }
};
$("#d-print").onclick     = ()=> printFichas([detRow], "carta");
$("#d-print-stk").onclick = ()=> printFichas([detRow], "sticker");
$$("[data-close]").forEach(b=>b.onclick=()=>b.closest(".ov").classList.add("hide"));
$$(".ov").forEach(o=>o.addEventListener("mousedown", e=>{ if(e.target===o) o.classList.add("hide"); }));
document.addEventListener("keydown", e=>{ if(e.key==="Escape") $$(".ov").forEach(o=>o.classList.add("hide")); });

/* ------------------------------ alta de fichas ------------------------------ */
function initForm(){
  const opt=(v,sel)=>`<option${sel===v?" selected":""}>${esc(v)}</option>`;
  $("#n-mat").innerHTML  = `<option value="">—</option>`+MATERIALES.map(v=>opt(v)).join("");
  $("#n-tipo").innerHTML = `<option value="">—</option>`+TIPOS.map(v=>opt(v)).join("");
  $("#n-esp").innerHTML  = `<option value="">—</option>`+ESPESORES.map(v=>opt(v,"70")).join("");
  $("#n-ap").innerHTML   = `<option value="">—</option>`+APERTURAS.map(v=>opt(v)).join("");
  $("#n-procs").innerHTML = PROCS.map(p=>
    `<label class="proc"><input type="checkbox" data-i="${p.i}" checked><span>${p.k}</span></label>`).join("");
  $("#n-fecha").value = hoy();
  // Riel solo en corredizas (SE12, SM20, 480); marco según el selector con/sin marco.
  const aplicaProcs = ()=>{
    const riel = CON_RIEL.has($("#n-tipo").value);
    const marco = $("#n-marco").value === "con";
    $$('#n-procs input').forEach(ck=>{
      const i=+ck.dataset.i;
      if(i===18||i===19) ck.checked = riel;       // CORTE RIEL, RIEL
      if(i===16||i===17) ck.checked = marco;      // CORTE MARCO, MARCO
    });
  };
  $("#n-tipo").onchange = aplicaProcs;
  $("#n-marco").onchange = aplicaProcs;
  $("#n-qty").addEventListener("input", hintOp);
}
function nextOp(){
  const max = ROWS.filter(r=>rowActive(r.c)).reduce((m,r)=>Math.max(m, opBase(r.c[C.OP])||0), 0);
  return max+1;
}
/** primera fila reutilizable (remanente vacío) o la siguiente al final */
function targetRows(n){
  const out=[];
  for(const {r,c} of ROWS){ if(!rowActive(c)) out.push(r); if(out.length>=n) break; }
  let last = ROWS.length? ROWS[ROWS.length-1].r : 1;
  while(out.length<n) out.push(++last);
  return out;
}
function hintOp(){
  const op=$("#n-op").value.trim(), q=Math.max(1,parseInt($("#n-qty").value,10)||1);
  const names = q>1 ? `${op}-1 … ${op}-${q}` : op;
  $("#n-hint").innerHTML = op
    ? `Se crearán <b>${q}</b> ficha(s): <b>${esc(names)}</b> con fecha de creación <b>${esc($("#n-fecha").value)}</b>`
    : "";
  const t=targetRows(q);
  $("#n-target").textContent = `Se escribirá en fila${q>1?"s":""} ${t[0]}${q>1?"–"+t[t.length-1]:""}`;
}
$("#form-new").addEventListener("submit", async ev=>{
  ev.preventDefault();
  const btn=$("#n-save"); btn.disabled=true;
  try{
    const q = Math.max(1, Math.min(40, parseInt($("#n-qty").value,10)||1));
    const op = $("#n-op").value.trim();
    const aplica = new Map($$("#n-procs input").map(ck=>[+ck.dataset.i, ck.checked]));
    const rows = targetRows(q);
    await ensureRows(Math.max(...rows));         // por si la hoja se quedó sin filas
    const data=[];
    rows.forEach((r,k)=>{
      const c = new Array(NCOL).fill("");
      c[C.FECHA]=$("#n-fecha").value.trim();
      c[C.OP]= q>1 ? `${op}-${k+1}` : op;
      c[C.CLI]=$("#n-cli").value.trim().toUpperCase();
      c[C.COMP]=$("#n-comp").checked; c[C.STOCK]=$("#n-stock").checked;
      c[C.MAT]=$("#n-mat").value; c[C.TIPO]=$("#n-tipo").value;
      c[C.ANCHO]=numCell($("#n-ancho").value); c[C.ALTO]=numCell($("#n-alto").value);
      c[C.PTS]=numCell($("#n-pts").value); c[C.ESP]=numCell($("#n-esp").value);
      c[C.AP]=$("#n-ap").value;
      c[C.PRIO]=$("#n-prio").value; c[C.OBS]=$("#n-obs").value.trim();
      PROCS.forEach(p=>{ c[p.i] = aplica.get(p.i) ? false : ""; });
      c[C.STATUS] = statusValue(r, c);
      data.push({a1:`A${r}:${LAST_COL}${r}`, v:[c]});
    });
    await writeCells(data);
    // Quitar la casilla de verificación en la hoja a los procesos que no aplican,
    // para que allí tampoco aparezca ningún cuadrito.
    // Casilla de verificación en los procesos que aplican y ninguna en los que no.
    // Hace falta explícitamente: una fila nueva no hereda el formato de las de arriba.
    const casillas=[];
    rows.forEach(r=> PROCS.forEach(p=>casillas.push({fila:r, col:p.i, aplica:!!aplica.get(p.i)})));
    setCheckboxUI(casillas);
    logBulk(rows.map((r,k)=>({accion:"CREA", op:data[k].v[0][C.OP], fila:r,
                              campo:"ficha", antes:"", despues:"creada"})));
    toast(`${q} ficha(s) creada(s)`,"ok");
    $("#ov-nueva").classList.add("hide");
    lastHash=""; await refresh(false);
    await autoFechas();                          // programa su fecha según prioridad
    $("#n-op").value = String(nextOp()); $("#n-fecha").value = hoy();
    $("#n-qty").value="1"; $("#n-obs").value=""; hintOp();
  }catch(e){ toast(e.message,"err"); }
  finally{ btn.disabled=false; }
});
$("#n-reset").onclick = ()=>{
  $("#form-new").reset();
  $("#n-fecha").value = hoy();
  $("#n-op").value = String(nextOp());
  $$("#n-procs input").forEach(c=>c.checked=true);
  hintOp();
};

