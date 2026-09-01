/* Vista Control de OPs de paneleria
   Proyecto: Control de Produccion - Interfrigo

   Equivale a control.js, pero para paneles. No se comparte con puertas porque
   casi nada coincide: aqui la unidad no es la puerta sino la LINEA, varias
   lineas comparten OP (163-1, 163-2), y lo que se cuenta son metros cuadrados
   y kilos de poliuretano, no puntos.                                        */
"use strict";

/* ------------------------------ filtros ------------------------------ */
const FSEL = ["f-prog","f-estado","f-prio","f-prod","f-ranu","f-cara","f-cli"];

/** Kilos de poliuretano de la linea; los pone la hoja en K y L. */
const kgDe = c => (typeof kgPoliuretano === "function" ? kgPoliuretano(c) : 0);
/** Kilos por panel suelto. */
const kgUnidDe = c => (typeof kgUnidadPoliuretano === "function" ? kgUnidadPoliuretano(c) : 0);

function filtered(){
  const g = id => { const e = $("#"+id); return e ? e.value : ""; };
  const q = $("#f-q").value.trim().toLowerCase();
  const eq = (v,f) => !f || String(v??"").trim() === f;
  return ROWS.filter(({c})=>{
    if(!rowActive(c)) return false;
    if(!eq(c[C.PROD], g("f-prod"))) return false;
    if(!eq(c[C.RANU], g("f-ranu"))) return false;
    if(!eq(c[C.CLI],  g("f-cli")))  return false;

    // Una cara u otra: se busca el acabado, sin importar de que lado va.
    const fcara = g("f-cara");
    if(fcara && ![c[C.CARA_A], c[C.CARA_B]].some(v=>String(v??"").trim()===fcara)) return false;

    const fprio = g("f-prio");
    if(fprio === "__none"){ if(String(c[C.PRIO]??"").trim()) return false; }
    else if(fprio && String(c[C.PRIO]??"").trim().toUpperCase() !== fprio) return false;

    const fest = g("f-estado");
    if(fest === "__none"){ if(estadoDe(c)) return false; }
    else if(fest && estadoDe(c) !== fest) return false;

    const fprog = g("f-prog");
    if(fprog){
      const p = progreso(c).pct;
      if(fprog==="pend" && p!==0) return false;
      if(fprog==="wip"  && !(p>0 && p<1)) return false;
      if(fprog==="done" && p<1) return false;
      if(fprog==="open" && p>=1) return false;
    }
    if(q){
      const hay = [c[C.OP],c[C.CLI],c[C.PROD],c[C.RANU],c[C.CARA_A],c[C.CARA_B],
                   fmtDate(c[C.FECHA])].join(" ").toLowerCase();
      if(!q.split(/\s+/).every(t=>hay.includes(t))) return false;
    }
    return true;
  });
}
function filtrosActivos(){
  const et = {"f-prog":"progreso","f-estado":"estado","f-prio":"prioridad",
              "f-prod":"producto","f-ranu":"ranurado","f-cara":"cara","f-cli":"cliente"};
  const out = [];
  const q = $("#f-q").value.trim();
  if(q) out.push("busca: " + q);
  for(const id of FSEL){
    const el = $("#"+id);
    if(!el || !el.value) continue;
    out.push(et[id] + ": " + el.options[el.selectedIndex].text);
  }
  return out;
}
const NUMORD = (a,b)=>{ const x=parseFloat(a), y=parseFloat(b);
  return (!isNaN(x)&&!isNaN(y)) ? x-y : String(a).localeCompare(String(b),"es",{numeric:true}); };

function fillLists(){
  const A = ROWS.filter(r=>rowActive(r.c));
  const uniq = f => [...new Set(A.map(r=>String(f(r.c)??"").trim()).filter(Boolean))].sort(NUMORD);
  const fill = (sel, vals, todos) => {
    if(!sel) return;                      // el filtro puede no estar en esta pagina
    const cur = sel.value;
    sel.innerHTML = `<option value="">${todos}</option>` +
      vals.map(v=>`<option>${esc(v)}</option>`).join("");
    sel.value = [...sel.options].some(o=>o.value===cur) ? cur : "";
  };
  // Los productos salen del modelo y no solo de los datos: asi aparecen todos
  // los que se pueden pedir, no unicamente los que ya se pidieron alguna vez.
  const productos = [...new Set([...(MODELO.listas.PRODUCTOS||[]), ...uniq(c=>c[C.PROD])])].sort(NUMORD);
  const caras = [...new Set([...uniq(c=>c[C.CARA_A]), ...uniq(c=>c[C.CARA_B])])].sort(NUMORD);
  fill($("#f-prod"), productos,          "Todos");
  fill($("#f-ranu"), uniq(c=>c[C.RANU]), "Todos");
  fill($("#f-cara"), caras,              "Todas");
  fill($("#f-cli"),  uniq(c=>c[C.CLI]),  "Todos");
  fill($("#a-cli"),  uniq(c=>c[C.CLI]),  "Todos");
  fill($("#a-prod"), productos,          "Todos");
  const dl = $("#dl-cli");
  if(dl) dl.innerHTML = uniq(c=>c[C.CLI]).map(v=>`<option value="${esc(v)}">`).join("");
}

/* ------------------------------ etiquetas ------------------------------ */
function tagPrio(v){
  const s = String(v||"").toUpperCase();
  return s ? `<span class="tag t-${s.toLowerCase()}">${esc(s)}</span>`
           : `<span class="tag t-non">—</span>`;
}
function tagEstado(v){
  const s = String(v||"").trim(), u = s.toUpperCase();
  const k = u===ESTADO.DESPACHADO ? "t-des" : u===ESTADO.ANULADA ? "t-anu"
          : u===ESTADO.TERMINADO  ? "t-alm" : "t-non";
  return `<span class="tag ${k}">${esc(s||"—")}</span>`;
}
const n2 = v => { const n = num(v); return n===null ? "—" : n.toLocaleString("es-CO",
  {minimumFractionDigits:2, maximumFractionDigits:2}); };
const n0 = v => { const n = num(v); return n===null ? "—" : Math.round(n).toLocaleString("es-CO"); };

/* ------------------------------ edicion en linea ------------------------------ */
function selPrio(r, v){
  const cur = PRIORIDADES.includes(String(v??"").trim().toUpperCase())
    ? String(v).trim().toUpperCase() : "";
  return `<select class="mini tag ${cur?"t-"+cur.toLowerCase():"t-non"}" data-edit-prio="${r}">
    <option value=""${cur?"":" selected"}>—</option>` +
    PRIORIDADES.map(p=>`<option${p===cur?" selected":""}>${p}</option>`).join("") + `</select>`;
}
function selEstado(r, v){
  const lista = MODELO.listas.ESTADOS || [];
  const cur = String(v??"").trim().toUpperCase();
  const conocido = lista.includes(cur);
  return `<select class="mini tag" data-edit-estado="${r}">
    <option value=""${cur?"":" selected"}>—</option>` +
    lista.map(e=>`<option${e===cur?" selected":""}>${e}</option>`).join("") +
    (cur && !conocido ? `<option selected>${esc(cur)}</option>` : "") + `</select>`;
}
/** Guarda un campo suelto y lo deja en el historial. */
async function editCampo(r, idx, campoModelo, nombre, val){
  const row = ROWS.find(x=>x.r===r);
  if(!row) return;
  const antes = String(row.c[idx] ?? "");
  if(antes === String(val)) return;
  writeSeq++; row.c[idx] = val;
  try{
    await writeCells([{a1:`${col(campoModelo)}${r}`, v:[[val]]}]);
    logChanges("EDITA", row.c[C.OP], r, [{campo:nombre, antes, despues:val}]);
    setSync("", "Guardado"); lastHash = "";
    kpis(filtered());
  }catch(e){ row.c[idx] = antes; render(); toast(e.message, "err"); }
}
$("#tb").addEventListener("change", async ev=>{
  const p = ev.target.closest("[data-edit-prio]");
  if(p){
    p.className = "mini tag " + (p.value ? "t-"+p.value.toLowerCase() : "t-non");
    editCampo(+p.dataset.editPrio, C.PRIO, "PRIO", "Prioridad", p.value);
    return;
  }
  const e = ev.target.closest("[data-edit-estado]");
  if(e){
    // El estado no es un campo mas: pasar a DESPACHADO sella tambien la fecha.
    try{ await ponerEstado(+e.dataset.editEstado, e.value); }
    finally{ render(); }
  }
});

/* ------------------------------ tabla ------------------------------ */
function render(){
  const rows = filtered();
  $("#tb").innerHTML = rows.map(({r,c})=>{
    const p = progreso(c), pc = Math.round(p.pct*100);
    const celdas = PROCS.map(pr=>{
      const v = tri(c[pr.i]);
      if(v === null) return `<td class="na-cell" title="${pr.k}: no aplica"></td>`;
      return `<td><button class="p ${v?"on":"off"}" data-r="${r}" data-i="${pr.i}"
        title="${pr.k}">${v?"✓":""}</button></td>`;
    }).join("");
    return `<tr class="${pc>=100?"done":""} ${anuladaP(c)?"anu":""}" data-r="${r}">
      <td class="stick"><input type="checkbox" class="cks" data-r="${r}" ${SEL.has(r)?"checked":""}></td>
      <td class="stick" style="left:34px"><span class="op">${esc(c[C.OP]??"")}</span>
        <div class="sub">${esc(fmtDate(c[C.FECHA]))}</div></td>
      <td><span class="cli" title="${esc(c[C.CLI]??"")}">${esc(c[C.CLI]??"")}</span></td>
      <td>${selPrio(r, c[C.PRIO])}</td>
      <td class="num">${n0(c[C.CANT])}</td>
      <td class="num">${n2(c[C.LARGO])}</td>
      <td>${esc(c[C.PROD]??"")}</td>
      <td>${esc(c[C.RANU]??"")}</td>
      <td>${esc(c[C.CARA_A]??"")}</td>
      <td>${esc(c[C.CARA_B]??"")}</td>
      <td class="num">${n2(MODELO.metros(c))}</td>
      <td class="num" title="Poliuretano de la línea">${n2(kgDe(c))}</td>
      ${celdas}
      <td><span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span>
        <span class="pct">${pc}%</span></td>
      <td>${selEstado(r, c[C.DESP])}</td>
      <td class="sub">${esc(fmtDate(c[C.FDESP]))}</td>
      <td><button class="btn sm" data-edit="${r}">Abrir</button></td>
    </tr>`;
  }).join("");
  $("#tb-empty").classList.toggle("hide", rows.length > 0);
  const total = ROWS.filter(x=>rowActive(x.c)).length;
  $("#cnt-rows").textContent = `${rows.length} de ${total} líneas`;
  kpis(rows);
  syncSel();
}

/** Lo que se mide en paneleria son metros y kilos, no unidades sueltas. */
function kpis(rows){
  const all = ROWS.filter(r=>rowActive(r.c));
  const vivas = all.filter(r=>!anuladaP(r.c));
  const abiertas = vivas.filter(r=>progreso(r.c).pct < 1);
  const sum = (xs, f) => xs.reduce((s,x)=>s+(f(x.c)||0), 0);
  const porPrio = p => abiertas.filter(r=>String(r.c[C.PRIO]??"").trim().toUpperCase()===p).length;
  const avg = abiertas.length
    ? Math.round(abiertas.reduce((s,r)=>s+progreso(r.c).pct,0)/abiertas.length*100) : 0;
  const act = filtrosActivos();
  const ops = new Set(vivas.map(r=>opBase(r.c[C.OP])).filter(v=>v!==null)).size;

  const k = [
    ["OP distintas", ops, "Números de OP con líneas vivas; una OP puede tener varias líneas"],
    ["Líneas", vivas.length, "Cada fila de la hoja es una línea de fabricación"],
    ["Líneas abiertas", abiertas.length, ""],
    ["m² pendientes", n2(sum(abiertas, MODELO.metros)), "Metros que quedan por fabricar"],
    ["kg poliuretano pendiente", n2(sum(abiertas, kgDe)),
     "Lo que hay que tener en existencia para cubrir lo abierto"],
    ["Avance medio", avg+"%", ""],
    ["URGENTE", porPrio("URGENTE"), "Puestas urgentes a mano: no escalan ni caducan"],
    ["ALTA", porPrio("ALTA"), ""],
    ["MEDIA", porPrio("MEDIA"), "A los 4 días en este nivel suben a ALTA"],
    ["BAJA", porPrio("BAJA"), "A los 8 días en este nivel suben a MEDIA"],
    ["Terminadas", vivas.filter(r=>estadoDe(r.c)===ESTADO.TERMINADO).length,
     "Fabricadas, esperando despacho"],
    ["Despachadas", vivas.filter(r=>despachadaP(r.c)).length, ""],
    ["Anuladas", all.length - vivas.length, "Fuera de producción y de almacén"],
    [act.length ? "Líneas filtradas" : "Sin filtrar", rows.length, act.join(" · ")]
  ];
  $("#kpis").innerHTML = k.map(([s,v,t])=>
    `<div class="kpi ${t?"hi":""}" title="${esc(t)}"><b>${v}</b><span>${esc(s)}</span>` +
    (t?`<em class="fdesc">${esc(t)}</em>`:"") + `</div>`).join("");
}

/* ------------------------------ marcar procesos ------------------------------ */
/** Repinta UNA fila. Reconstruir la tabla entera en cada marca hacia saltar el
 *  scroll y perdia los clics rapidos: ya paso en puertas y en planta. */
function paintRow(r){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const tr = $(`#tb tr[data-r="${r}"]`); if(!tr) return;
  PROCS.forEach(pr=>{
    const b = tr.querySelector(`.p[data-i="${pr.i}"]`); if(!b) return;
    const v = tri(row.c[pr.i]);
    b.className = "p " + (v===true ? "on" : "off");
    b.textContent = v===true ? "✓" : "";
  });
  const pc = Math.round(progreso(row.c).pct*100);
  const bar = tr.querySelector(".pbar i");
  if(bar){ bar.style.width = pc+"%"; bar.className = pc>=100 ? "full" : ""; }
  const pct = tr.querySelector(".pct"); if(pct) pct.textContent = pc+"%";
  tr.classList.toggle("done", pc>=100);
  kpis(filtered());
}
async function setProc(r, i, next){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const prev = row.c[i];
  writeSeq++;
  row.c[i] = next===null ? "" : next;                  // optimista
  paintRow(r);
  const letra = PROCS.find(p=>p.i===i).c;
  try{
    await writeCells([
      {a1:`${letra}${r}`,      v:[[ next===null ? "" : next ]]},
      {a1:`${STATUS_COL}${r}`, v:[[ statusValue(r, row.c) ]]}
    ]);
    setSync("", "Guardado "+new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}));
    lastHash = "";
    const nom = v => v===true ? "hecho" : v===false ? "pendiente" : "no aplica";
    logChanges("EDITA", row.c[C.OP], r,
      [{campo:PROCS.find(p=>p.i===i).k, antes:nom(tri(prev)), despues:nom(next)}]);
    await tocarFechaProceso(r);
  }catch(e){ row.c[i] = prev; paintRow(r); toast(e.message, "err"); }
}
$("#tb").addEventListener("click", ev=>{
  const p = ev.target.closest(".p");
  if(p){
    const r = +p.dataset.r, i = +p.dataset.i;
    const cur = tri(ROWS.find(x=>x.r===r).c[i]);
    if(cur === null) return;
    setProc(r, i, cur !== true);
    return;
  }
  const e = ev.target.closest("[data-edit]");
  if(e){ openDet(+e.dataset.edit); return; }
  const ck = ev.target.closest(".cks");
  if(ck){ const r = +ck.dataset.r; ck.checked ? SEL.add(r) : SEL.delete(r); syncSel(); }
});
function syncSel(){
  const n = $("#nsel"); if(n) n.textContent = SEL.size;
  ["#btn-print-stk","#btn-print-carta"].forEach(s=>{
    const b = $(s); if(b) b.disabled = SEL.size===0;
  });
}
$("#ck-all").onchange = ev=>{
  SEL.clear();
  if(ev.target.checked) filtered().forEach(({r})=>SEL.add(r));
  render();
};

/* ------------------------------ exportar ------------------------------
   Sale lo que se esta viendo, con los filtros puestos; si hay lineas
   seleccionadas, solo esas. Un boton que exporta siempre la hoja entera
   obliga a volver a filtrar fuera, que es justo lo que ya se hizo aqui. */
function csvPaneles(){
  const vistas = filtered();
  const filas = SEL.size ? vistas.filter(({r})=>SEL.has(r)) : vistas;
  if(!filas.length){ toast("No hay líneas que exportar", "err"); return; }

  const cab = ["OP","Fecha","Cliente","Prioridad","Cantidad","Largo","Producto",
               "Ranurado","Cara A","Cara B","m2","kg poliuretano",
               ...PROCS.map(p=>p.k), "Avance","Estado","Comienzo","Fin","Fecha despacho"];
  /* Punto y coma como separador y coma decimal: es lo que espera un Excel en
     español, y con coma de separador las cifras se parten en dos columnas. */
  const dec = v => { const n = num(v); return n===null ? "" : String(n).replace(".", ","); };
  const txt = v => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lineas = filas.map(({c})=>[
    txt(c[C.OP]), txt(fmtDate(c[C.FECHA])), txt(c[C.CLI]), txt(c[C.PRIO]),
    dec(c[C.CANT]), dec(c[C.LARGO]), txt(c[C.PROD]), txt(c[C.RANU]),
    txt(c[C.CARA_A]), txt(c[C.CARA_B]), dec(MODELO.metros(c)), dec(kgDe(c)),
    ...PROCS.map(p=>{ const v = tri(c[p.i]); return v===null ? "" : v ? "SI" : "NO"; }),
    Math.round(progreso(c).pct*100) + "%", txt(c[C.DESP]),
    txt(fmtDate(c[C.FINI])), txt(fmtDate(c[C.FFIN])), txt(fmtDate(c[C.FDESP]))
  ].join(";"));

  // El BOM hace falta para que Excel lea las tildes en vez de destrozarlas.
  const blob = new Blob(["﻿" + [cab.join(";"), ...lineas].join("\r\n")],
                        {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `paneles-${iso(new Date())}.csv`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  toast(`${filas.length} línea(s) exportada(s)`, "ok");
}
const btnCsv = $("#btn-csv");
if(btnCsv) btnCsv.onclick = csvPaneles;
