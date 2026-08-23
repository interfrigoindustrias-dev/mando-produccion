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
function kpiCards(el, list){
  $(el).innerHTML = list.map(([s,v,t,hi])=>
    `<div class="kpi ${hi?"hi":""}" title="${esc(t||"")}"><b>${v}</b><span>${esc(s)}</span></div>`).join("");
}
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

