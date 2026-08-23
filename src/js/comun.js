/* Ayudantes compartidos por planta y los tableros
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ============================== DASHBOARDS ==============================
   Réplica de las hojas STATUS, EN ALMACÉN y STOCK del Excel. Las definiciones
   salen de las fórmulas originales; cada tarjeta lleva su criterio en el title. */
const activas = () => ROWS.filter(r=>rowActive(r.c));


const completa = c => progreso(c).pct>=1;
const desp = c => String(c[C.DESP]??"").trim();
const puntos = c => num(c[C.PTS])||0;

// En producción: con OP, avance <1 y no despachada ni en almacén
const enProduccion = c => !completa(c) && !anulada(c) &&
  desp(c)!=="Despachado" && desp(c)!=="En Almacén";
// Stock total: marcada STOCK y en almacén o sin estado de despacho
const enStock = c => tri(c[C.STOCK])===true && (desp(c)==="En Almacén" || desp(c)==="");

/** Contador de filtros: cuántas filas se ven, de cuántas, y cuáles filtros están puestos. */
function contador(el, vistas, total, ids, qid){
  const act=[];
  if(qid && $("#"+qid).value.trim()) act.push(`«${$("#"+qid).value.trim()}»`);
  ids.forEach(id=>{ const s=$("#"+id); if(s && s.value) act.push(s.options[s.selectedIndex].text); });
  const n=$(el);
  n.innerHTML = `<b>${vistas}</b> de ${total}` + (act.length?` · ${esc(act.join(" · "))}`:"");
  n.classList.toggle("on", act.length>0);
  n.title = act.length ? "Filtros activos: "+act.join(" · ") : "Sin filtros";
}
/* Puertas que hay detrás de cada tarjeta, para poder auditarlas de un clic. */
const DETALLE_KPI = new Map();

/** list: [etiqueta, valor, explicación, destacar, filas]
 *  Si se pasan filas, la tarjeta se vuelve clicable y las muestra. */
function kpiCards(el, list){
  $(el).innerHTML = list.map(([s,v,t,hi,filas],i)=>{
    const id = el.replace(/\W/g,"") + "_" + i;
    if(filas) DETALLE_KPI.set(id, {titulo:s, explicacion:t||"", filas});
    return `<div class="kpi ${hi?"hi":""} ${filas?"clic":""}" title="${esc(t||"")}"
      ${filas?`data-kpi="${id}"`:""}><b>${v}</b><span>${esc(s)}</span>${
      filas?'<i class="lupa">ver</i>':""}</div>`;
  }).join("");
}

/** Abre el detalle de una tarjeta: qué puertas se están contando. */
function verDetalleKpi(id){
  const d = DETALLE_KPI.get(id); if(!d) return;
  $("#k-titulo").textContent = d.titulo;
  $("#k-expl").textContent = d.explicacion;
  $("#k-cuenta").textContent = `${d.filas.length} puerta${d.filas.length===1?"":"s"}`;
  if(!d.filas.length){
    $("#k-tabla").innerHTML = `<tbody><tr><td class="mut" style="padding:18px">
      Ninguna puerta cumple esta condición.</td></tr></tbody>`;
  } else {
    tablaMini("#k-tabla",
      ["OP","Cliente","Tipo","Medidas","Puntos","Avance","F. creación","F. proceso","Despacho",""],
      d.filas.map(({r,c})=>[
        `<span class="op">${esc(c[C.OP]??"")}</span>`, esc(c[C.CLI]??""), esc(c[C.TIPO]??""),
        `${num(c[C.ANCHO])??"—"}×${num(c[C.ALTO])??"—"}`, num(c[C.PTS])??"—",
        Math.round(progreso(c).pct*100)+"%",
        esc(fmtDate(c[C.FECHA])), esc(fmtDate(c[C.FPROC])), tagDesp(c[C.DESP]),
        `<button class="btn sm" data-ficha="${r}">Abrir</button>`]));
  }
  $("#ov-kpi").classList.remove("hide");
}
document.addEventListener("click", ev=>{
  const k = ev.target.closest("[data-kpi]");
  if(k){ verDetalleKpi(k.dataset.kpi); return; }
  // Desde el detalle se puede abrir la ficha y corregir la fecha ahí mismo.
  const f = ev.target.closest("[data-ficha]");
  if(f){ $("#ov-kpi").classList.add("hide"); openDet(+f.dataset.ficha); }
});
function barras(el, filas, total, warn){
  const max = Math.max(1, ...filas.map(f=>f[1]));
  $(el).innerHTML = `<div class="brk">`+filas.map(([k,v])=>
    `<div class="brk-r ${warn?"w":""}"><span>${esc(k)}</span>
      <span class="brk-b"><i style="width:${Math.round(v/max*100)}%"></i></span><b>${v}</b></div>`).join("")+
    (total!==undefined?`<div class="brk-r" style="border-top:1px solid var(--line);padding-top:7px">
      <span><b style="text-align:left">TOTAL</b></span><span></span><b>${total}</b></div>`:"")+`</div>`;
}
/** filas: array de arrays de celdas. clases: clase opcional por fila. */
function tablaMini(el, cols, filas, clases){
  $(el).innerHTML = `<thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead>`+
    `<tbody>${filas.map((f,i)=>`<tr class="${(clases&&clases[i])||""}">`+
      f.map(c=>`<td>${c}</td>`).join("")+`</tr>`).join("")}</tbody>`;
}

