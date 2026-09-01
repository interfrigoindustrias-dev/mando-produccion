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

/* «Sin logo» significa SIN MARCA: ni el logotipo ni el nombre escrito. Sobre
   etiqueta ya preimpresa cualquier rastro de la marca sobra o se solapa con lo
   que la etiqueta trae de fabrica. */
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
    String(c[C.SELLO]??"").trim() && String(c[C.SELLO]).toUpperCase()!=="NO APLICA"
      ? ["Sello", c[C.SELLO]] : null,
    tri(c[C.ALFF])===true || tri(c[C.ALFP])===true
      ? ["Alfajor", [tri(c[C.ALFF])===true?"frontal":"", tri(c[C.ALFP])===true?"posterior":""]
          .filter(Boolean).join(" + ")] : null
  ].filter(Boolean);

  return `<div class="stk${stickerConLogo?"":" nologo"}">
    <div class="stk-h">
      ${stickerConLogo ? '<span class="stk-logo"></span>' : ""}
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

/* ---------- Hoja carta: una sola pagina por puerta ---------- */

const MESES_CARTA = ["enero","febrero","marzo","abril","mayo","junio","julio",
                     "agosto","septiembre","octubre","noviembre","diciembre"];

/** El MES de fin de proceso, que es lo que se sigue en planta; no el dia. */
function mesFin(c){
  const f = toDate(c[C.FPROC]);
  return f ? `${MESES_CARTA[f.getMonth()]} ${f.getFullYear()}` : "—";
}

/* Cabecera: lo que identifica la puerta. Igual en los cuatro formatos porque
   la pregunta «¿de que puerta hablamos?» no cambia entre familias. */
function cabeceraCarta(c, F){
  const cel = (k, v, ancho) =>
    `<div${ancho ? ` style="grid-column:span ${ancho}"` : ""}>${k}<b>${esc(v ?? "") || "—"}</b></div>`;
  const si = v => tri(v) === true ? "SÍ" : "No";
  const bumper = llevaBumper(c[C.BUMP])
    ? `${c[C.BUMP]}${String(c[C.TBUMP] ?? "").trim() ? " · " + num(c[C.TBUMP]) : ""}`
    : (c[C.BUMP] || "—");

  /* Los diagramas van en la cabecera y no al final: se miran ANTES de armar,
     para confirmar la apertura y como se toma la medida. Si el archivo aun no
     esta, el hueco no se dibuja en vez de dejar un icono roto. */
  const diagramas = (F.imagenes || [])
    .map(n => `<img src="img/${esc(n)}" alt="" onerror="this.remove()">`).join("");

  return `
    <div class="c-h">
      <span class="c-logo"></span>
      <div class="c-t"><b>ORDEN DE PRODUCCIÓN</b><span>${esc(F.nombre)}</span></div>
      <div class="c-op"><b>OP ${esc(c[C.OP] ?? "")}</b><span>${esc(fmtDate(c[C.FECHA]))}</span></div>
    </div>
    <div class="c-cli">${esc(c[C.CLI] ?? "")}${
      tri(c[C.COMP]) === true ? '<span class="c-flags">COMPLEMENTO</span>' : ""}${
      tri(c[C.STOCK]) === true ? '<span class="c-flags">STOCK</span>' : ""}</div>

    <div class="c-top">
      <div class="c-grid">
        ${cel("Material", c[C.MAT])}${cel("Tipo", c[C.TIPO])}
        ${cel("Ancho vano", num(c[C.ANCHO]))}${cel("Alto vano", num(c[C.ALTO]))}
        ${cel("Espesor mm", num(c[C.ESP]))}${cel("Apertura", c[C.AP])}
        ${cel("Sello", c[C.SELLO])}${cel("Mes fin proceso", mesFin(c))}
        ${cel("Tipo de marco", c[C.MARCO], 2)}${cel("Visor", c[C.VISOR])}
        ${cel("Bumper", bumper)}
        ${cel("Alfajor frontal", si(c[C.ALFF]))}${cel("Alfajor posterior", si(c[C.ALFP]))}
        ${cel("Puntos", num(c[C.PTS]))}
      </div>
      ${diagramas ? `<div class="c-dib">${diagramas}</div>` : ""}
    </div>
    <div class="c-obs"><em>Observaciones</em><span>${esc(c[C.OBS] ?? "")}</span></div>`;
}

/* Medidas de la hoja y remates: se toman en el taller, no salen de la hoja de
   calculo, asi que van en blanco a proposito. */
function medidasCarta(F){
  const raya = (k, ancho) =>
    `<div class="c-mm" style="flex:${ancho || 1}"><label>${esc(k)}</label><i></i></div>`;
  return `<div class="c-med">
    <div class="c-medt">Medidas de la hoja (mm)</div>
    ${raya("H · altura")}${raya("A · ancho")}${raya("E · espesor")}
    ${(F.notas || []).map(n => raya(n)).join("")}
  </div>`;
}

/** Opciones propias del formato: se marcan a mano antes de empezar. */
function opcionesCarta(F){
  if(!(F.opciones || []).length) return "";
  return `<div class="c-ops">${F.opciones.map(g => `
    <div class="c-opg">
      <h5>${esc(g.t)}</h5>
      ${g.items.map(x => g.modo === "medida"
        ? `<span class="c-op1"><span class="box"></span>${esc(x)} <i class="c-raya"></i></span>`
        : `<span class="c-op1"><span class="box${g.modo === "radio" ? " rd" : ""}"></span>${esc(x)}</span>`
      ).join("")}
    </div>`).join("")}</div>`;
}

/** Una pieza del despiece: se marca cual se uso y se anota cuanta. */
function piezaCarta(it){
  return `<div class="c-it">
    <span class="bx"></span>
    <span class="nm">${esc(it.f)}${it.s && it.s !== "—" ? `<em>${esc(it.s)}</em>` : ""}</span>
    <span class="rf">${esc(it.r || "")}</span>
    <span class="qt">${it.u ? `<b>${esc(it.u)}</b>` : ""}</span>
  </div>`;
}

/** Lista de materiales del formato que le toque a esta puerta. */
function materialesCarta(F, n){
  if(!F || !(F.bloques || []).length){
    return `<p class="c-sec">Materiales — formato sin definir</p>
      <div class="c-libre">${Array.from({length: 26}, ()=>"<i></i>").join("")}</div>`;
  }
  return `<p class="c-sec">Despiece · formato ${n}
      <em>Marcar lo usado y anotar la cantidad</em></p>
    <div class="c-mat">${F.bloques.map(b => `
      <div class="c-blq">
        <h4>${esc(b.t)}</h4>
        ${b.items.map(piezaCarta).join("")}
      </div>`).join("")}</div>`;
}

/* Un responsable: nombre legible, firma y fecha. La rubrica sola no sirve —
   nadie la reconoce seis meses despues, cuando hay que preguntar quien armo
   esta puerta. */
function firmaCarta(t){
  return `<div class="c-fir">
    <h6>${esc(t)}</h6>
    <label>Nombre<i></i></label>
    <label>Firma<i></i></label>
    <label>Fecha<span class="f3"><i></i><i></i><i></i></span></label>
  </div>`;
}

/* Renglones para escribir a mano. Solo donde sobra hoja: en los formatos
   densos el despiece necesita hasta el ultimo milimetro. */
function notasCarta(clase){
  if(clase.includes("denso")) return "";
  return `<div class="c-notas"><em>Notas de producción</em>
    <div class="c-ren">${Array.from({length: 6}, () => "<i></i>").join("")}</div></div>`;
}

function cartaHTML(row){
  const c = row.c;
  const n = formatoDe(c);
  const F = FORMATOS[n] || {nombre: "Formato sin definir", imagenes: []};
  /* Cuantas columnas y de que tamaño depende de la CARGA de la hoja, no solo
     del numero de piezas: las opciones de arriba tambien comen alto, y contarlas
     aparte hacia que el formato 2 —83 piezas mas 14 opciones— recortara dos
     docenas de lineas por abajo mientras el 1, con mas piezas, cabia de sobra.
     Cada opcion pesa metro y medio: ocupa mas que una linea de despiece. */
  const carga = piezasDe(n) + 1.5 * (F.opciones || [])
    .reduce((a, g) => a + g.items.length, 0);
  /* El umbral baja a 85: con los diagramas mas grandes la cabecera ocupa mas,
     y el formato 1 —90 de carga— dejaba de caber en tres columnas. */
  const clase = carga > 85 ? " denso c4"
              : carga > 40 ? " denso"
              : " pocas";
  return `<div class="carta${clase}">
    ${cabeceraCarta(c, F)}
    ${opcionesCarta(F)}
    ${medidasCarta(F)}
    ${materialesCarta(F, n)}
    ${notasCarta(clase)}
    <div class="c-pie">
      <div class="c-proc">${PROCS.map(pr =>
        tri(c[pr.i]) === null ? "" : `<span><span class="box"></span>${pr.k}</span>`).join("")}</div>
      <div class="c-firmas">${(F.firmas || ["Solicitado por"])
        .concat(["Control de calidad"]).map(firmaCarta).join("")}</div>
    </div>
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
/* En puertas la etiqueta solo se imprime desde Calidad, asi que aqui ese boton
   ya no existe; paneles si lo conserva. Se comprueba antes de engancharlo. */
const stkBtn = $("#btn-print-stk");
if(stkBtn) stkBtn.onclick = ()=> pedirSticker([...SEL]);
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

