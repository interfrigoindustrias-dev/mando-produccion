/* Etiqueta 100x100 mm, hoja carta y exportacion a CSV
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ---------- Sticker 100 x 100 mm ---------- */
/* Checklist de calidad de la etiqueta. Se verifica a mano al terminar la puerta. */
const QC = ["Dimensiones","Marco","Hoja / hojas","Empaque","Herrajes","Limpieza",
            "Alineación / cierre","Revisión final"];
function stickerHTML(row){
  const c=row.c;
  const prio=String(c[C.PRIO]??"").trim().toUpperCase();
  const med=[num(c[C.ANCHO]),num(c[C.ALTO])].every(x=>x!==null)?`${num(c[C.ANCHO])}×${num(c[C.ALTO])}`:"—";
  const flags=[tri(c[C.COMP])?"COMPL":"", tri(c[C.STOCK])?"STOCK":""].filter(Boolean).join(" ");
  const cel=(k,v)=>`<div>${k}<b>${esc(v??"")||"—"}</b></div>`;
  const obs = String(c[C.OBS]??"").trim();
  return `<div class="stk">
    <div class="stk-h">
      <span class="stk-logo"></span>
      <span class="stk-hr">${esc(fmtDate(c[C.FECHA]))}${flags?" · "+esc(flags):""}</span>
    </div>
    <div class="stk-top">
      <div class="stk-op">${esc(c[C.OP]??"")}</div>
      <div class="stk-med">${med}<em>cm · vano</em></div>
    </div>
    <div class="stk-cli">${esc(c[C.CLI]??"")}</div>
    <div class="stk-g">
      ${cel("Tipo",c[C.TIPO])}${cel("Material",c[C.MAT])}
      ${cel("Apertura",c[C.AP])}${cel("Espesor mm",c[C.ESP])}
    </div>
    <div class="stk-qc">
      <p>Control de calidad</p>
      <div class="stk-qcg">${QC.map(q=>`<div><span class="bx"></span>${esc(q)}</div>`).join("")}
        <div class="llv"><span class="bx"></span>¿Lleva llaves?
          <em>Sí <span class="bx"></span> &nbsp; No <span class="bx"></span></em></div>
      </div>
    </div>
    <div class="stk-obs"><em>Observaciones</em><span>${esc(obs)}</span></div>
    <div class="stk-f"><span>Revisó ____________________</span><span>Fecha ____/____/______</span></div>
  </div>`;
}

/* ---------- Hoja carta: OP completa + campos para diligenciar a mano ---------- */
const CAMPOS_MANO = [
  "Dimensiones hoja","Dimensiones marco","Tipo de bisagra","Cantidad de bisagras",
  "Tipo de empaque","Tornillos","Cerradura / manija","Burlete",
  "Lámina / acabado","Color","Herrajes adicionales","Operario",
  "Fecha inicio","Fecha fin"
];
function cartaHTML(row){
  const c=row.c, pc=Math.round(progreso(c).pct*100);
  const cel=(k,v)=>`<div>${k}<b>${esc(v??"")||"—"}</b></div>`;
  const med=[num(c[C.ANCHO]),num(c[C.ALTO])].every(x=>x!==null)?`${num(c[C.ANCHO])} × ${num(c[C.ALTO])}`:"—";
  const prio=String(c[C.PRIO]??"").trim().toUpperCase();
  const flags=[tri(c[C.COMP])?"COMPLEMENTO":"", tri(c[C.STOCK])?"STOCK":""].filter(Boolean).join(" · ");
  return `<div class="carta">
    <div class="c-h">
      <span class="c-logo"></span>
      <div class="c-t"><b>ORDEN DE PRODUCCIÓN</b><span>Control de puertas</span></div>
      <div class="c-op"><b>${esc(c[C.OP]??"")}</b><span>${esc(fmtDate(c[C.FECHA]))}</span></div>
    </div>
    <div class="c-cli">${esc(c[C.CLI]??"")}${flags?`<span class="c-flags">${esc(flags)}</span>`:""}</div>

    <p class="c-sec">Especificación registrada</p>
    <div class="c-grid">
      ${cel("Material",c[C.MAT])}${cel("Tipo",c[C.TIPO])}${cel("Apertura",c[C.AP])}${cel("Espesor mm",c[C.ESP])}
      ${cel("Ancho vano",num(c[C.ANCHO]))}${cel("Alto vano",num(c[C.ALTO]))}${cel("Vano (A × H)",med)}${cel("Prioridad",prio)}
      ${cel("F. proceso",fmtDate(c[C.FPROC]))}${cel("Avance",pc+"%")}${cel("Estado despacho",c[C.DESP])}${cel("F. despacho",fmtDate(c[C.FDESP]))}
    </div>

    <p class="c-sec">Para diligenciar en planta</p>
    <div class="c-fill">
      ${CAMPOS_MANO.map(k=>`<div><label>${esc(k)}</label><i></i></div>`).join("")}
    </div>

    <p class="c-sec">Procesos — marcar a mano</p>
    <div class="c-proc">${PROCS.map(pr=>{
      if(tri(c[pr.i])===null) return `<div class="na"></div>`;   // no aplica: no se imprime
      return `<div><span class="box"></span>${pr.k}</div>`;
    }).join("")}</div>

    <div class="c-obs"><em>Observaciones</em>${esc(c[C.OBS]??"")}</div>
    <div class="c-firmas"><div>Producción</div><div>Control de calidad</div><div>Despacho</div></div>
  </div>`;
}

/** modo: "sticker" | "carta" */
function printFichas(rowNums, modo){
  const rows = rowNums.map(n=>ROWS.find(x=>x.r===n)).filter(Boolean);
  if(!rows.length){ toast("Nada que imprimir","err"); return; }
  const stk = modo==="sticker";
  document.body.classList.add(stk?"p-stk":"p-carta");
  let rule = $("#page-rule");
  if(!rule){ rule=document.createElement("style"); rule.id="page-rule"; document.head.appendChild(rule); }
  rule.textContent = stk ? "@page{size:100mm 100mm;margin:0}" : "@page{size:letter portrait;margin:0}";
  $("#print").innerHTML = rows.map(stk?stickerHTML:cartaHTML).join("");
  setTimeout(()=>window.print(), 80);
}
$("#btn-print-stk").onclick   = ()=> printFichas([...SEL], "sticker");
$("#btn-print-carta").onclick = ()=> printFichas([...SEL], "carta");
window.addEventListener("afterprint", ()=>{
  $("#print").innerHTML="";
  document.body.classList.remove("p-stk","p-carta");
});

/* ------------------------------ exportar CSV ------------------------------ */
$("#btn-csv").onclick = ()=>{
  const head=["FECHA/LOTE","OP","CLIENTE","COMPLEMENTO","STOCK","MATERIAL","TIPO","ANCHO","ALTO","PUNTOS","ESPESOR",
    "APERTURA","PRIORIDAD",...PROCS.map(p=>p.k),"OBSERVACIONES","STATUS","FECHA PROCESO","ESTADO DESPACHO",
    "FECHA DESPACHO","ENSAMBLE"];
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const body = filtered().map(({c})=>{
    const o=c.slice(); o[C.STATUS]=Math.round(progreso(c).pct*100)+"%";
    return o.map(q).join(";");
  });
  const blob=new Blob(["﻿"+[head.map(q).join(";"),...body].join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`puertas_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
};

