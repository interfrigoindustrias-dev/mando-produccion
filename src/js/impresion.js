/* Etiqueta 100x100 mm, hoja carta y exportacion a CSV
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ---------- Sticker 100 x 150 mm ---------- */
/* Lo que el operario verifica a mano antes de dar la puerta por buena.
   El orden es el del recorrido fisico: primero se mide, luego se mira la hoja,
   despues se prueba el movimiento y al final se revisa el acabado. */
const QC = ["Dimensiones","Hojas libre de golpes","Apertura de la puerta","Herrajes",
            "Alineación y cierre","Estado del marco","Estado de empaques","Limpieza"];

/* El logo se puede quitar: sobre etiqueta preimpresa estorba, y ademas la
   tinta negra de un bloque grande arruga el adhesivo. */
let stickerConLogo = true;

/** El numero de OP siempre se lee con su prefijo: «OP 315-2», nunca «315-2». */
const rotuloOP = c => "OP " + String(c[C.OP] ?? "").trim();

function stickerHTML(row){
  const c=row.c;
  const med=[num(c[C.ANCHO]),num(c[C.ALTO])].every(x=>x!==null)?`${num(c[C.ANCHO])}×${num(c[C.ALTO])}`:"—";
  const flags=[tri(c[C.COMP])?"COMPL":"", tri(c[C.STOCK])?"STOCK":""].filter(Boolean).join(" ");
  const cel=(k,v)=>`<div>${k}<b>${esc(v??"")||"—"}</b></div>`;
  const obs = String(c[C.OBS]??"").trim();

  // Extras: solo se imprimen si la puerta los lleva. Una etiqueta con
  // «SIN VISOR / SIN BUMPER» gasta sitio en decir que no hay nada.
  const extras = [
    String(c[C.VISOR]??"").trim() && String(c[C.VISOR]).toUpperCase()!=="SIN VISOR"
      ? ["Visor", c[C.VISOR]] : null,
    llevaBumper(c[C.BUMP])
      ? ["Bumper", `${c[C.BUMP]}${String(c[C.TBUMP]??"").trim()?" · "+num(c[C.TBUMP]):""}`] : null,
    tri(c[C.ALFF])===true || tri(c[C.ALFP])===true
      ? ["Alfajor", [tri(c[C.ALFF])===true?"frontal":"", tri(c[C.ALFP])===true?"posterior":""]
          .filter(Boolean).join(" + ")] : null
  ].filter(Boolean);

  return `<div class="stk${stickerConLogo?"":" nologo"}">
    <div class="stk-h">
      ${stickerConLogo?'<span class="stk-logo"></span>':'<span class="stk-marca">INTERFRIGO</span>'}
      <span class="stk-hr">${esc(fmtDate(c[C.FECHA]))}${flags?" · "+esc(flags):""}</span>
    </div>
    <div class="stk-top">
      <div class="stk-op">${esc(rotuloOP(c))}</div>
      <div class="stk-med">${med}<em>cm · vano</em></div>
    </div>
    <div class="stk-cli">${esc(c[C.CLI]??"")}</div>
    <div class="stk-g">
      ${cel("Tipo",c[C.TIPO])}${cel("Material",c[C.MAT])}
      ${cel("Apertura",c[C.AP])}${cel("Espesor mm",c[C.ESP])}
      ${cel("Marco",c[C.MARCO])}${cel("Puntos",num(c[C.PTS]))}
      ${extras.map(([k,v])=>cel(k,v)).join("")}
    </div>
    <div class="stk-qc">
      <p>Control de calidad</p>
      <div class="stk-qcg">${QC.map(q=>`<div><span class="bx"></span>${esc(q)}</div>`).join("")}
        <div class="llv">¿Lleva llaves?
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
      <div class="c-t"><b>ORDEN DE PRODUCCIÓN</b><span>${esc(MOD.nombre)}</span></div>
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

/** modo: "sticker" | "carta"
 *  logo: solo para sticker. Si no se dice nada, se respeta la ultima eleccion. */
function printFichas(rowNums, modo, logo){
  if(logo !== undefined) stickerConLogo = !!logo;
  const rows = rowNums.map(n=>ROWS.find(x=>x.r===n)).filter(Boolean);
  if(!rows.length){ toast("Nada que imprimir","err"); return; }
  const stk = modo==="sticker";
  document.body.classList.add(stk?"p-stk":"p-carta");
  let rule = $("#page-rule");
  if(!rule){ rule=document.createElement("style"); rule.id="page-rule"; document.head.appendChild(rule); }
  rule.textContent = stk ? "@page{size:100mm 150mm;margin:0}" : "@page{size:letter portrait;margin:0}";
  $("#print").innerHTML = rows.map(stk?stickerHTML:cartaHTML).join("");
  setTimeout(()=>window.print(), 80);
}
/* Preguntar con logo o sin logo, en vez de fijarlo: en etiqueta blanca el logo
   ayuda a identificar la puerta; sobre etiqueta preimpresa sobra. */
function pedirSticker(filas){
  if(!filas.length){ toast("Nada que imprimir","err"); return; }
  $("#pl-n").textContent = filas.length;
  $("#ov-logo").dataset.filas = filas.join(",");
  $("#ov-logo").classList.remove("hide");
}
$("#pl-con").onclick = ()=>{
  const f=$("#ov-logo").dataset.filas.split(",").map(Number);
  $("#ov-logo").classList.add("hide"); printFichas(f,"sticker",true);
};
$("#pl-sin").onclick = ()=>{
  const f=$("#ov-logo").dataset.filas.split(",").map(Number);
  $("#ov-logo").classList.add("hide"); printFichas(f,"sticker",false);
};
$("#btn-print-stk").onclick   = ()=> pedirSticker([...SEL]);
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

