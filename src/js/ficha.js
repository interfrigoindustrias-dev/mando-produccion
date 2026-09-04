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
  const si = v => tri(v)===true ? "Sí" : "No";
  const spec=[["Material",c[C.MAT]],["Tipo",c[C.TIPO]],["Espesor",c[C.ESP]],["Apertura",c[C.AP]],
              ["Puntos",c[C.PTS]],["Complemento",si(c[C.COMP])],["Stock",si(c[C.STOCK])],
              // Especificacion nueva de la hoja (AC..AJ)
              ["Marco",c[C.MARCO]],["Visor",c[C.VISOR]],["Empaque visor",c[C.EMPV]],
              ["Bumper",c[C.BUMP]],["Sello",c[C.SELLO]],
              ["Cotización",c[C.COT]],["Orden de compra",c[C.OC]],
              // El tamaño solo se enseña si lleva bumper: si no, confunde.
              ...(llevaBumper(c[C.BUMP]) ? [["Tamaño bumper",c[C.TBUMP]]] : []),
              ["Alfajor frontal",si(c[C.ALFF])],["Alfajor posterior",si(c[C.ALFP])],
              ["Inicio producción",fmtDate(c[C.FINI])]];
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
  // Las listas se pintan aqui y no en el HTML: asi salen siempre de las
  // constantes, que son copia de la validacion de la hoja.
  const op1=(v,sel)=>`<option${String(sel)===v?" selected":""}>${esc(v)}</option>`;
  $("#d-desp").innerHTML = `<option value="">—</option>`+DESPACHOS.map(v=>op1(v,c[C.DESP])).join("");
  $("#d-desp").value = DESPACHOS.includes(String(c[C.DESP])) ? String(c[C.DESP]) : "";
  // Puntos y apertura editables: solo en la ficha de puertas.
  if($("#d-ap")){
    $("#d-ap").innerHTML = `<option value="">—</option>`+APERTURAS.map(v=>op1(v,c[C.AP])).join("");
    $("#d-ap").value = APERTURAS.includes(String(c[C.AP])) ? String(c[C.AP]) : "";
    $("#d-pts").value = num(c[C.PTS]) ?? "";
    $("#d-sello").innerHTML = `<option value="">—</option>`+SELLOS.map(v=>op1(v,c[C.SELLO])).join("");
    $("#d-sello").value = SELLOS.includes(String(c[C.SELLO])) ? String(c[C.SELLO]) : "";
  }
  $("#d-fdesp").value = fmtDate(c[C.FDESP]); $("#d-fproc").value = fmtDate(c[C.FPROC]);
  $("#d-prio").value = PRIORIDADES.includes(String(c[C.PRIO]).toUpperCase())?String(c[C.PRIO]).toUpperCase():"";
  $("#d-ens").value = c[C.ENS]??""; $("#d-obs").value = c[C.OBS]??"";
  // Solo existen en puertas: paneles comparte este archivo y no los tiene.
  if($("#d-cot")){ $("#d-cot").value = c[C.COT]??""; $("#d-oc").value = c[C.OC]??""; }
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
               ...($("#d-ap") ? [
                 [C.PTS,"J","Puntos",numCell($("#d-pts").value),false],
                 [C.AP,"L","Apertura",$("#d-ap").value,false],
                 [C.SELLO,"AM","Sello",$("#d-sello").value,false]] : []),
               [C.ANCHO,"H","Ancho vano",numCell($("#d-ancho").value),false],
               [C.ALTO,"I","Alto vano",numCell($("#d-alto").value),false],
               [C.OBS,"V","Observaciones",$("#d-obs").value.trim(),false],
               ...($("#d-cot") ? [
                 [C.COT,"AN","Cotización",$("#d-cot").value.trim(),false],
                 [C.OC,"AO","Orden de compra",$("#d-oc").value.trim(),false]] : [])];
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
    // Si se tocó algún proceso, la fecha de proceso pasa a hoy.
    if(ups.some(u=>/^[NOPQRSTU]\d+$/.test(u.a1))) await tocarFechaProceso(r, estabaCompleta);
    toast("Cambios guardados","ok"); setSync("","Guardado");
  }catch(e){ toast(e.message,"err"); refresh(false); }
};
$("#d-print").onclick     = ()=> printFichas([detRow], "carta");
// La etiqueta se imprime desde Calidad; en paneles el boton sigue existiendo.
const dStk = $("#d-print-stk");
if(dStk) dStk.onclick = ()=> pedirSticker([detRow]);
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
  /* La especificacion ampliada (marco, visor, bumper, alfajores) es de puertas.
     Este archivo lo comparten las dos paginas: darla por hecha reventaba
     initForm en paneles y con ello el arranque entero. */
  if($("#n-visor")){
    $("#n-marco").innerHTML = TIPOS_MARCO.map(v=>opt(v,"ALUMINIO 2X1")).join("");
    $("#n-visor").innerHTML = VISORES.map(v=>opt(v,"SIN VISOR")).join("");
    $("#n-bump").innerHTML  = BUMPERS.map(v=>opt(v,"SIN BUMPER")).join("");
    $("#n-sello").innerHTML = SELLOS.map(v=>opt(v,"NO APLICA")).join("");
    $("#n-tbump").innerHTML = `<option value="">—</option>`+TAM_BUMPER.map(v=>opt(v)).join("");

    // El empaque del visor no se teclea: sale de la tabla Datos Calculo de la hoja.
    const verEmpaque = ()=>{ $("#n-empv").value = EMPAQUE_VISOR[$("#n-visor").value] ?? ""; };
    $("#n-visor").onchange = verEmpaque; verEmpaque();

    // El tamaño solo tiene sentido si de verdad lleva bumper; si no, se apaga y
    // se vacia, para que no se cuele un tamaño de un bumper que no existe.
    const verBumper = ()=>{
      const hay = llevaBumper($("#n-bump").value);
      $("#n-tbump").disabled = !hay;
      if(!hay) $("#n-tbump").value = "";
      else if(!$("#n-tbump").value) $("#n-tbump").value = "40";
    };
    $("#n-bump").onchange = verBumper; verBumper();
  }
  /* Que implica cada prioridad, dicho donde se elige. Los dias se leen de
     ESPERA y ESCALA en vez de escribirlos a mano: si mañana cambian, el texto
     cambia con ellos y no queda un manual mintiendo al lado del control.

     TODAS entran a planta el mismo dia: la prioridad decide el ORDEN de la
     cola, no cuando aparece. */
  const caja = $("#n-prio-ayuda");
  if(caja){
    const linea = (p, txt, cls) =>
      `<div class="ayp"><b${cls?` class="${cls}"`:""}>${p}</b><span>${txt}</span></div>`;
    caja.innerHTML = [
      linea("URGENTE",
        `Va la primera de la cola. Solo se pone a mano: ninguna puerta llega a ` +
        `urgente por llevar tiempo esperando.`),
      linea("ALTA",
        `Detrás de las urgentes. No sube más, pero si pasa ${ESPERA.ALTA} días sin que ` +
        `nadie la toque se coloca delante de las demás ALTA.`),
      linea("MEDIA",
        `Detrás de las ALTA. Si pasa ${ESPERA.MEDIA} días sin que nadie la toque, sube sola a ALTA.`),
      linea("BAJA",
        `La última de la cola. Si pasa ${ESPERA.BAJA} días sin que nadie la toque, sube sola a MEDIA ` +
        `—un escalón cada vez, no de golpe hasta arriba—.`),
      linea("URGENTE · VENDIDA",
        `No se elige: lo es sola cualquier puerta separada para un cliente que ` +
        `todavía no esté al 100%.`, "ayp-auto")
    ].join("");
  }

  $("#n-procs").innerHTML = PROCS.map(p=>
    `<label class="proc"><input type="checkbox" data-i="${p.i}" checked><span>${p.k}</span></label>`).join("");
  $("#n-fecha").value = hoy();
  // Riel solo en corredizas (SE12, SM20, 480); marco según el selector con/sin marco.
  const aplicaProcs = ()=>{
    const riel = CON_RIEL.has($("#n-tipo").value);
    const marco = $("#n-marco").value !== "SIN MARCO";
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
      // Especificacion (AC..AJ), solo en puertas. Las casillas van como
      // booleanos de verdad, no como texto: si no, la hoja no las dibuja.
      if($("#n-visor")){
        c[C.ALFF]=$("#n-alff").checked; c[C.ALFP]=$("#n-alfp").checked;
        c[C.MARCO]=$("#n-marco").value; c[C.VISOR]=$("#n-visor").value;
        /* AG no se escribe: la calcula la hoja con su formula de matriz, y
           esta linea la pisaba. El campo del formulario sigue enseñando el
           valor como anticipo, pero quien manda es la hoja — un solo dueño
           por celda, o acaban discrepando. */
        c[C.EMPVREF]=$("#n-empvref").value.trim();
        c[C.BUMP]=$("#n-bump").value;
        c[C.SELLO]=$("#n-sello").value;
        c[C.COT]=$("#n-cot").value.trim(); c[C.OC]=$("#n-oc").value.trim();
        c[C.TBUMP]= llevaBumper($("#n-bump").value) ? numCell($("#n-tbump").value) : "";
      }
      PROCS.forEach(p=>{ c[p.i] = aplica.get(p.i) ? false : ""; });
      c[C.STATUS] = statusValue(r, c);
      /* Por tramos, saltando lo que calcula la hoja. Escribir A..AO de un
         tiron es comodo y equivocado: el "" de las celdas que no se rellenan
         no las deja en paz, las corta, y AG es una formula de matriz que se
         derrama por toda la columna. Se rompe entera de una sola escritura. */
      tramosFila(MODELO, r, c).forEach(t => data.push(t));
    });
    await writeCells(data);

    /* El panel va DESPUES y aparte: si fallara, la puerta ya esta guardada. El
       panel es un extra, y perder la puerta por no poder escribir su panel
       seria mucho peor que quedarse sin el panel. */
    if(typeof llevaPanelLaPuerta === "function" && llevaPanelLaPuerta()){
      const opPanel = q > 1 ? `${op}-1` : op;
      try{
        const fila = await crearPanelDeLaPuerta(
          opPanel, $("#n-cli").value.trim().toUpperCase(),
          $("#n-prio").value, $("#n-fecha").value.trim());
        toast(`Panel creado en la hoja de Paneles, fila ${fila}`, "ok");
        logBulk([{accion:"CREAR", op:opPanel, fila:"—", campo:"Panel de la puerta",
                  antes:"", despues:`fila ${fila} de la hoja de paneles`}]);
      }catch(e){
        // Con el numero de OP delante: sin el, no se sabe cual crear a mano.
        toast(`La puerta se guardó, pero el panel de la OP ${opPanel} no: ${e.message}`, "err");
      }
    }
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

