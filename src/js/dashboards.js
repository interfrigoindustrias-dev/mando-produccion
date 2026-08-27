/* Tableros Resumen, Almacen, Stock e inventario por modelo
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ---------- Resumen (hoja STATUS) ---------- */
function renderResumen(){
  const dia = toDate($("#r-dia").value) || new Date();
  const l = lunes(dia), d7 = new Date(l); d7.setDate(d7.getDate()+6);
  $("#r-sem").value = `${fmt(l)} – ${fmt(d7)}`;
  $("#r-mes").value = dia.toLocaleDateString("es",{month:"long",year:"numeric"});

  const F = activas();                       // filas {r,c}, para poder auditarlas
  const A = F.map(x=>x.c);
  const entre = (v,a,b)=>{ const d=toDate(v); return d && d>=a && d<=b; };
  const fabDia = F.filter(({c})=>completa(c) && sameDay(toDate(c[C.FPROC]),dia));
  const fabSem = F.filter(({c})=>completa(c) && entre(c[C.FPROC],l,d7));
  const m0=new Date(dia.getFullYear(),dia.getMonth(),1), m1=new Date(dia.getFullYear(),dia.getMonth()+1,0);
  const fabMes = F.filter(({c})=>completa(c) && entre(c[C.FPROC],m0,m1));
  const despDia= F.filter(({c})=>desp(c)==="Despachado" && sameDay(toDate(c[C.FDESP]),dia));
  const sum = l2 => l2.reduce((a,x)=>a+puntos(x.c),0);

  kpiCards("#r-prod",[
    ["Fabricadas día",  fabDia.length, "Puertas al 100% cuya fecha de proceso es el día de referencia", 1, fabDia],
    ["Puntos día",      sum(fabDia),   "Suma de PUNTOS de las fabricadas ese día", 0, fabDia],
    ["Fabricadas semana",fabSem.length,"Al 100% con fecha de proceso dentro de la semana", 1, fabSem],
    ["Puntos semana",   sum(fabSem),   "Suma de PUNTOS de la semana", 0, fabSem],
    ["Fabricadas mes",  fabMes.length, "Al 100% con fecha de proceso dentro del mes", 1, fabMes],
    ["Puntos mes",      sum(fabMes),   "Suma de PUNTOS del mes", 0, fabMes],
    ["Despachadas día", despDia.length,"Estado Despachado con fecha de despacho = día", 0, despDia]
  ]);

  const alm = F.filter(({c})=>completa(c) && desp(c)==="En Almacén");
  const prod= F.filter(({c})=>enProduccion(c));
  const stk = F.filter(({c})=>enStock(c));
  const abiertasTodas = F.filter(({c})=>!completa(c));
  const avg = prod.length ? Math.round(prod.reduce((a,x)=>a+progreso(x.c).pct,0)/prod.length*100) : 0;
  kpiCards("#r-inv",[
    ["En almacén",      alm.length,  "Terminadas (100%) con estado En Almacén", 0, alm],
    ["En producción",   prod.length, "Avance <100%, sin despachar ni almacenar, no anuladas", 1, prod],
    ["Stock total",     stk.length,  "Marcadas STOCK, en almacén o sin estado", 0, stk],
    ["Avance promedio", avg+"%",     "Promedio de avance de las que están en producción", 0, prod],
    // El Excel suma PUNTOS de TODA fila con avance <100%, sin excluir almacén ni despacho
    ["Puntos en prod.", sum(abiertasTodas), "Suma de PUNTOS de toda puerta con avance menor al 100%", 0, abiertasTodas],
    ["Total en empresa",alm.length+prod.length, "En almacén + en producción"]
  ]);

  /* ---- Ritmo, antigüedad y proyección ----
     Métricas que responden a: ¿a qué velocidad producimos?, ¿qué lleva
     demasiado tiempo abierto?, ¿cuándo vaciamos la cola? */
  const DIA = 86400000;
  const hoy0 = new Date(); hoy0.setHours(0,0,0,0);
  const dias = (a,b) => Math.round((b-a)/DIA);
  const d30 = new Date(hoy0); d30.setDate(d30.getDate()-29);
  const term30 = F.filter(({c})=>completa(c) && entre(c[C.FPROC],d30,hoy0));
  const ritmo = +(term30.length/30).toFixed(1);
  const cola  = ritmo>0 ? Math.ceil(prod.length/ritmo) : null;

  // Solo cuentan las que tienen fecha de creación legible: las filas antiguas la
  // traen como texto («MAYO») y de ahí no se puede calcular una antigüedad.
  const conEdad = prod.map(x=>{ const f=toDate(x.c[C.FECHA]); return {x, d: f?dias(f,hoy0):null}; })
                      .filter(o=>o.d!==null && o.d>=0);
  const sinFecha = prod.length - conEdad.length;
  const cobertura = sinFecha ? ` · ${sinFecha} sin fecha de creación legible quedan fuera` : "";
  const edadMedia = conEdad.length ? Math.round(conEdad.reduce((a,o)=>a+o.d,0)/conEdad.length) : 0;
  const masVieja  = conEdad.length ? conEdad.reduce((a,b)=>b.d>a.d?b:a) : null;
  const viejas    = conEdad.filter(o=>o.d>30);

  // tiempo de fabricación: días entre creación y fecha de proceso en las terminadas
  const conCiclo = F.filter(({c})=>completa(c)).map(x=>{
    const f=toDate(x.c[C.FECHA]), p2=toDate(x.c[C.FPROC]);
    return {x, d: (f&&p2) ? dias(f,p2) : null};
  }).filter(o=>o.d!==null && o.d>=0 && o.d<400);
  const ciclo = conCiclo.length ? Math.round(conCiclo.reduce((a,o)=>a+o.d,0)/conCiclo.length) : null;

  // en almacén esperando despacho hace más de 30 días
  const estancadas = alm.filter(({c})=>{ const f=toDate(c[C.FPROC]); return f && dias(f,hoy0)>30; });

  kpiCards("#r-ritmo",[
    ["Puertas por día",  ritmo, "Terminadas en los últimos 30 días dividido entre 30", 1, term30],
    ["Días para vaciar cola", cola??"—", `Las ${prod.length} en producción al ritmo actual (${ritmo}/día)`, 1, prod],
    ["Terminadas 30 días", term30.length, "Al 100% con fecha de proceso en los últimos 30 días", 0, term30],
    ["Antigüedad media",  edadMedia+" d",
      `Días promedio desde la creación, sobre ${conEdad.length} puertas en producción${cobertura}`,
      0, conEdad.map(o=>o.x)],
    ["La más antigua",    masVieja ? masVieja.d+" d" : "—",
      masVieja ? `OP ${masVieja.x.c[C.OP]}, creada el ${fmtDate(masVieja.x.c[C.FECHA])}` : "Sin datos",
      0, masVieja ? [masVieja.x] : []],
    ["Abiertas +30 días", viejas.length, "En producción, creadas hace más de 30 días", 0, viejas.map(o=>o.x)],
    ["Ciclo de fabricación", ciclo!==null ? ciclo+" d" : "—",
      `Promedio de días entre creación y fabricación, sobre ${conCiclo.length} puertas terminadas`,
      0, conCiclo.map(o=>o.x)],
    ["Almacén +30 días",  estancadas.length, "Terminadas y en almacén hace más de 30 días sin despachar", 0, estancadas]
  ]);

  // producción de los últimos 14 días
  const ult14=[];
  for(let i=13;i>=0;i--){
    const d=new Date(hoy0); d.setDate(d.getDate()-i);
    ult14.push([`${p2n(d.getDate())}/${p2n(d.getMonth()+1)}`,
                A.filter(c=>completa(c) && sameDay(toDate(c[C.FPROC]),d)).length]);
  }
  barras("#r-14d", ult14, ult14.reduce((s,x)=>s+x[1],0));

  // Clientes cuyo pedido está completo en almacén: ninguna puerta suya sigue
  // abierta, y al menos una está terminada esperando despacho.
  const porCliente={};
  A.forEach(c=>{
    const k=String(c[C.CLI]??"").trim(); if(!k || anulada(c)) return;
    const e=porCliente[k] || (porCliente[k]={listas:0, pendientes:0});
    if(completa(c) && desp(c)==="En Almacén") e.listas++;
    else if(!completa(c)) e.pendientes++;
  });
  const listos = Object.entries(porCliente)
    .filter(([,e])=>e.listas>0 && e.pendientes===0)
    .sort((a,b)=>b[1].listas-a[1].listas);
  if(listos.length){
    barras("#r-listos", listos.map(([k,e])=>[k, e.listas]),
           listos.reduce((s,[,e])=>s+e.listas,0));
  } else {
    $("#r-listos").innerHTML = `<p class="mut">Ningún cliente tiene el pedido completo
      en almacén ahora mismo.</p>`;
  }

  // clientes con más puertas en producción
  const porCli={};
  prod.forEach(({c})=>{ const k=String(c[C.CLI]??"—").trim()||"—"; porCli[k]=(porCli[k]||0)+1; });
  barras("#r-clientes", Object.entries(porCli).sort((a,b)=>b[1]-a[1]).slice(0,8), prod.length);

  const porTipo={};
  A.forEach(c=>{ const t=String(c[C.TIPO]??"—").trim()||"—"; porTipo[t]=(porTipo[t]||0)+1; });
  barras("#r-tipos", Object.entries(porTipo).sort((a,b)=>b[1]-a[1]), A.length);

  const carga = PROCS.map(p=>[p.k, prod.filter(({c})=>tri(c[p.i])===false).length]);
  barras("#r-carga", carga, undefined, true);

  const lista = activas().filter(x=>enProduccion(x.c))
    .sort((a,b)=>progreso(b.c).pct-progreso(a.c).pct);
  $("#r-nprod").textContent = `— ${lista.length} puertas`;
  tablaMini("#r-tabla", ["OP","Cliente","Tipo","Material","Medidas","Avance","Faltan","Prioridad"],
    lista.map(({r,c})=>{
      const p=progreso(c), pc=Math.round(p.pct*100);
      const faltan = PROCS.filter(x=>tri(c[x.i])===false).map(x=>x.s).join(" ");
      return [`<span class="op">${esc(c[C.OP]??"")}</span>`, esc(c[C.CLI]??""), esc(c[C.TIPO]??""),
        esc(c[C.MAT]??""), `${num(c[C.ANCHO])??"—"}×${num(c[C.ALTO])??"—"}`,
        `<span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span><span class="pct">${pc}%</span>`,
        `<span class="sub">${faltan||"—"}</span>`, tagPrio(c[C.PRIO])];
    }));
}
$("#r-dia").onchange = renderResumen;
$("#r-hoy").onclick = ()=>{ $("#r-dia").value = iso(new Date()); renderResumen(); };

/* ---------- En almacén (hoja EN ALMACÉN) ----------
   Base: terminadas y almacenadas, más las separadas. */
const almacenBase = () => activas().filter(({c})=>
  (completa(c) && desp(c)==="En Almacén") || desp(c)==="Separado");
function almacenList(){
  const q=$("#a-q").value.trim().toLowerCase(), g=id=>$("#"+id).value;
  const eq=(v,f)=>!f||String(v??"").trim()===f;
  return almacenBase().filter(({c})=>
    (!q || [c[C.OP],c[C.CLI],c[C.TIPO],c[C.MAT]].join(" ").toLowerCase().includes(q)) &&
    eq(c[C.TIPO],g("a-tipo")) &&
    eq(c[C.ESP],g("a-esp")) && eq(c[C.AP],g("a-ap")) && eq(desp(c),g("a-est")));
}
/** Selector de estado de despacho editable en la tabla. */
/* La reserva se edita donde se lee. Antes se hacia eligiendo «Separado» en el
   estado de despacho, y por eso una puerta no podia estar separada y en almacen
   a la vez. Ahora se pulsa la propia celda. */
function celdaSeparar(r, para){
  return para
    ? `<span class="para" data-separar="${r}" title="Cambiar comprador">${esc(para)}</span>
       <button class="x sep-x" data-soltar="${r}" title="Soltar la reserva">×</button>`
    : `<button class="btn sm" data-separar="${r}">Separar</button>`;
}

/** Suelta la reserva: la puerta vuelve a estar libre. */
async function soltarSeparada(r){
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const antes = separadaPara(row.c);
  if(!antes) return;
  if(!confirm(`La OP ${row.c[C.OP]} está separada para ${antes}.\n\n¿Soltarla?`)) return;
  const antesCli = String(row.c[C.CLI] ?? "");
  const limpio = clienteBase(row.c);
  row.c[C.SEPA] = "";
  row.c[C.CLI]  = limpio;
  try{
    // Se quita de los dos sitios: dejar el nombre pegado al cliente de una
    // puerta ya libre haria creer que sigue apartada.
    await writeCells([{a1:`AL${r}`, v:[[""]]}, {a1:`C${r}`, v:[[limpio]]}]);
    logChanges("EDITA", row.c[C.OP], r, [
      {campo:"Separada para", antes, despues:""},
      {campo:"Cliente", antes:antesCli, despues:limpio}
    ]);
    toast("Reserva soltada","ok");
    render(); renderDashVisible(); pintarModeloModal();
  }catch(e){ row.c[C.SEPA] = antes; row.c[C.CLI] = antesCli; toast(e.message,"err"); }
}

/** Pulsar la celda de reserva, desde cualquier tabla. */
async function clicSeparar(ev){
  const x = ev.target.closest("[data-soltar]");
  if(x){ await soltarSeparada(+x.dataset.soltar); return true; }
  const s = ev.target.closest("[data-separar]");
  if(s){
    await pedirSeparar(+s.dataset.separar);
    render(); renderDashVisible(); pintarModeloModal();
    return true;
  }
  return false;
}

/** La nota de calidad, vista desde almacen.
 *  Calidad la escribe y almacen la necesita: es quien decide si la puerta sale.
 *  Sin esto el rechazo se quedaba encerrado en el tablero de calidad. */
function notaAlmacen(c){
  const t = String(c[C.CAL] ?? "").trim();
  if(!t) return `<span class="mut">—</span>`;
  const mala = typeof esNoApta === "function" && esNoApta(c);
  const texto = (typeof notaLimpia === "function") ? notaLimpia(c) : t;
  return `<span class="qnota-mini${mala ? " mal" : ""}" title="${esc(t)}">${
    mala ? '<b>NO APTA</b> ' : ""}${esc(texto)}</span>`;
}

function selDesp(r, v){
  const cur = DESPACHOS.includes(String(v??"").trim()) ? String(v).trim() : "";
  const k = cur==="Despachado"?"t-des" : cur==="Separado"?"t-sep" : cur==="Anulada"?"t-anu" : cur?"t-alm":"t-non";
  return `<select class="mini tag ${k}" data-edit-desp="${r}">
    <option value=""${cur?"":" selected"}>—</option>`+
    DESPACHOS.map(d=>`<option${d===cur?" selected":""}>${d}</option>`).join("")+`</select>`;
}
/* Puertas marcadas en Almacén para imprimir. Igual que en Calidad, vive fuera
   del HTML: la tabla se repinta al cambiar un estado o un filtro, y si la
   selección viviera en las casillas se perdería a media tanda. */
const SEL_ALM = new Set();

/** Refresca contador y botones de impresión de Almacén. */
function pintarSelAlmacen(){
  const n = SEL_ALM.size;
  const c = $("#a-nsel"); if(c) c.textContent = n;
  const bc = $("#a-print-carta"); if(bc) bc.disabled = n === 0;
  const bs = $("#a-print-stk");   if(bs) bs.disabled = n === 0;
  const t = $("#a-todas");
  if(t) t.textContent = n && n === document.querySelectorAll("[data-alm]").length
    ? "Quitar selección" : "Seleccionar todas";
}

function renderAlmacen(){
  const L=almacenList(), B=almacenBase().map(x=>x.c), A=activas().map(x=>x.c);
  kpiCards("#a-kpis",[
    ["Total en almacén", B.length, "Terminadas y almacenadas, más las separadas", 1],
    ["En almacén", B.filter(c=>desp(c)==="En Almacén").length, "Avance 100% con estado En Almacén"],
    ["Separadas",  B.filter(c=>desp(c)==="Separado").length,   "Estado de despacho Separado"],
    ["En producción", A.filter(enProduccion).length, "Avance <100% sin despachar ni almacenar"],
    ["Listadas",   L.length, "Filas mostradas con el filtro actual"]
  ]);
  tablaMini("#a-tabla", ["","OP","Cliente","Material","Tipo","Vano (A × H)","Esp","Ap.","F. proceso","Compl.","Stock","Estado","Separada para","Calidad"],
    L.map(({r,c})=>[
      `<input type="checkbox" class="almck" data-alm="${r}"${SEL_ALM.has(r)?" checked":""}
         title="Marcar para imprimir">`,
      `<span class="op">${esc(c[C.OP]??"")}</span>`, esc(clienteBase(c)), esc(c[C.MAT]??""), esc(c[C.TIPO]??""),
      `${num(c[C.ANCHO])??"—"} x ${num(c[C.ALTO])??"—"}`, esc(c[C.ESP]??""), esc(c[C.AP]??""),
      esc(fmtDate(c[C.FPROC])), tri(c[C.COMP])?"Sí":"", tri(c[C.STOCK])?"Sí":"", selDesp(r, c[C.DESP]),
      celdaSeparar(r, separadaPara(c)), notaAlmacen(c)]),
    // La marca de selección viaja con la clase de la fila: al repintar la tabla
    // (cambiar un estado, tocar un filtro) la casilla se restauraba marcada pero
    // la fila perdía el resaltado, y quedaban diciendo cosas distintas.
    L.map(({r,c})=> [
      anulada(c) ? "anu" : desp(c)==="Separado" ? "sep" : "",
      SEL_ALM.has(r) ? "sel" : "",
      // Lo que calidad rechazo tiene que saltar a la vista en almacen: es lo
      // que no puede salir a despacho.
      (typeof esNoApta === "function" && esNoApta(c)) ? "noapta" : ""
    ].filter(Boolean).join(" ")));
  contador("#a-cnt", L.length, B.length, ["a-tipo","a-esp","a-ap","a-est"], "a-q");

  // Lo que sale del listado deja de estar marcado: no tiene sentido imprimir
  // la ficha de algo que ya no se está viendo.
  const visibles = new Set(L.map(x=>x.r));
  [...SEL_ALM].forEach(r=>{ if(!visibles.has(r)) SEL_ALM.delete(r); });
  pintarSelAlmacen();
}
["a-q","a-tipo","a-esp","a-ap","a-est"].forEach(id=>{
  const e=$("#"+id); if(!e) return;
  e.addEventListener("input", renderAlmacen);
  e.addEventListener("change", renderAlmacen);
});
$("#a-clear").onclick = ()=>{ ["a-q","a-tipo","a-esp","a-ap","a-est"]
  .forEach(id=>{ const e=$("#"+id); if(e) e.value=""; }); renderAlmacen(); };

/* Desde Almacén se imprimen las dos cosas: la ficha para acompañar la puerta y
   la etiqueta para pegarla. Es el punto donde la puerta se prepara para salir,
   y obligar a volver a Calidad para reimprimir una etiqueta perdida seria
   trabajo de mas. */
/* Estos tres botones solo existen en puertas. Este archivo lo comparten las dos
   paginas, y engancharlos a ciegas reventaba la carga de paneles justo aqui,
   dejando sin enganchar todo lo que viene despues. */
const bTodas = $("#a-todas");
if(bTodas) bTodas.onclick = ()=>{
  const cajas = [...document.querySelectorAll("[data-alm]")];
  const marcar = SEL_ALM.size !== cajas.length;
  SEL_ALM.clear();
  cajas.forEach(k=>{
    k.checked = marcar;
    k.closest("tr").classList.toggle("sel", marcar);
    if(marcar) SEL_ALM.add(+k.dataset.alm);
  });
  pintarSelAlmacen();
};
const bCarta = $("#a-print-carta");
if(bCarta) bCarta.onclick = ()=> printFichas([...SEL_ALM], "carta");
const bStk = $("#a-print-stk");
if(bStk) bStk.onclick = ()=> pedirSticker([...SEL_ALM]);
/* ---------- Separar una puerta: hay que decir para quien ----------
   Separar sin dueño no separa nada: al cabo de una semana nadie sabe por que
   esa puerta esta apartada ni quien la pidio. Por eso el nombre es obligatorio.
   El comprador se anexa al cliente de la ficha (ver SEP_MARCA en constantes). */

let sepPendiente = null;      // {r, volver} mientras el dialogo esta abierto

/** ¿Esta pagina pide comprador al separar? Solo puertas. */
const pideComprador = () => !!$("#ov-separar");

/** Pide el comprador y separa. Devuelve promesa: true si se separo. */
function pedirSeparar(r){
  return new Promise(resolve=>{
    const row = ROWS.find(x=>x.r===r);
    if(!row){ resolve(false); return; }
    // Paneles no pide comprador: alli el dialogo no existe y se sigue el
    // camino de siempre. Se comprueba con un bloque, no con un return, para que
    // la proteccion sea visible tanto al leer como al revisar el codigo.
    if($("#sep-para")){
      sepPendiente = {r, resolve};
      $("#sep-op").textContent  = "OP " + (row.c[C.OP] ?? "");
      $("#sep-cli").textContent = clienteBase(row.c) || "—";
      const ya = separadaPara(row.c);
      $("#sep-para").value = ya;
      $("#sep-aviso").textContent = ya
        ? `Ya estaba separada para ${ya}. Si escribes otro nombre, lo reemplaza.`
        : "";
      $("#ov-separar").classList.remove("hide");
      setTimeout(()=>$("#sep-para").focus(), 60);
    } else {
      resolve(null);
    }
  });
}

/** Escribe el comprador y el estado Separado, en una sola operacion. */
async function confirmarSeparar(){
  if(!sepPendiente) return;
  const {r, resolve} = sepPendiente;
  const nombre = $("#sep-para").value.trim().toUpperCase();
  if(!nombre){ toast("Escribe para quién queda separada","err"); return; }

  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const c = row.c;
  const antes = separadaPara(c);

  const antesCli = String(c[C.CLI] ?? "");
  const nuevoCli = clienteBase(c) + SEP_MARCA + nombre;

  const btn = $("#sep-ok"); btn.disabled = true;
  writeSeq++;
  c[C.SEPA] = nombre;
  c[C.CLI]  = nuevoCli;
  try{
    /* La reserva se guarda en DOS sitios, y cada uno hace algo distinto:
         AL       es el dato limpio, con el que se filtra y se cuenta
         CLIENTE  lleva el nombre anexado, y por eso viaja solo a impresiones,
                  informes y a cualquier vista que enseñe el cliente
       La etapa (Y) no se toca: una puerta puede estar separada Y en almacen,
       que era justamente lo que no se podia decir compartiendo celda. */
    await writeCells([
      {a1:`AL${r}`, v:[[nombre]]},
      {a1:`C${r}`,  v:[[nuevoCli]]}
    ]);
    logChanges("EDITA", c[C.OP], r, [
      {campo:"Separada para", antes, despues:nombre},
      {campo:"Cliente", antes:antesCli, despues:nuevoCli}
    ]);
    lastHash=""; setSync("","Guardado");
    toast(`Separada para ${nombre}`,"ok");
    sepPendiente = null;
    const ov = $("#ov-separar"); if(ov) ov.classList.add("hide");
    render(); renderDashVisible();
    resolve(true);
  }catch(e){
    c[C.SEPA] = antes; c[C.CLI] = antesCli;
    toast(e.message,"err");
    resolve(false);
  }finally{ btn.disabled = false; }
}

/** Cancelar: nada se escribe y el selector vuelve a su valor anterior. */
function cancelarSeparar(){
  const ov = $("#ov-separar"); if(ov) ov.classList.add("hide");
  if(sepPendiente){ const {resolve} = sepPendiente; sepPendiente = null; resolve(false); }
}

/** Guarda el estado de despacho y aplica la regla 4 (fecha de despacho de hoy).
 *  Lo usan tanto Almacén como Planta. */
async function guardarDespacho(r, val){
  const row=ROWS.find(x=>x.r===r); if(!row) return false;
  const antes=String(row.c[C.DESP]??"");
  if(antes===val) return false;

  const ups=[{a1:`Y${r}`, v:[[val]]}], cambios=[{campo:"Estado despacho", antes, despues:val}];
  if(val==="Despachado" && !fmtDate(row.c[C.FDESP]) && CFG.auto!==false){
    const h=hoy();
    ups.push({a1:`Z${r}`, v:[[h]]});
    cambios.push({campo:"Fecha despacho", antes:"", despues:h});
    row.c[C.FDESP]=h;
  }
  writeSeq++; row.c[C.DESP]=val;
  try{
    await writeCells(ups);
    logChanges("EDITA", row.c[C.OP], r, cambios);
    lastHash=""; setSync("","Guardado");
    return true;
  }catch(e){ row.c[C.DESP]=antes; toast(e.message,"err"); return false; }
}
$("#a-tabla").addEventListener("change", async ev=>{
  // Selección para imprimir. No toca la hoja: solo elige qué se imprime.
  const ck = ev.target.closest("[data-alm]");
  if(ck){
    const r = +ck.dataset.alm;
    ck.checked ? SEL_ALM.add(r) : SEL_ALM.delete(r);
    ck.closest("tr").classList.toggle("sel", ck.checked);
    pintarSelAlmacen();
    return;
  }
  const el=ev.target.closest("[data-edit-desp]"); if(!el) return;
  const val=el.value;
  const k = val==="Despachado"?"t-des" : val==="Separado"?"t-sep" : val==="Anulada"?"t-anu" : val?"t-alm":"t-non";
  el.className="mini tag "+k;
  if(await guardarDespacho(+el.dataset.editDesp, val)){ renderAlmacen(); render(); }
  else renderAlmacen();
});

/* ============================== MODELOS DE STOCK ==============================
   Catalogo editable en la pestana MODELOS de la misma hoja. Se crea y se siembra
   sola la primera vez. Para anadir un modelo basta con agregar una fila alli. */
const MOD_TAB = MOD.modelosTab;   // propia de cada módulo, ver modulo.js
const MOD_HEAD = ["NOMBRE","TIPO","ESPESOR","APERTURA","ANCHO VANO","ALTO VANO","PRIORIDAD","ACTIVO"];
const MOD_SEED = [
  ["SE12 90x190 DX BAJA",      "SE12",     92,"DX", 90,190,"BAJA", true],
  ["SE12 90x190 SX BAJA",      "SE12",     92,"SX", 90,190,"BAJA", true],
  ["SE12 90x190 DX MEDIA",     "SE12",     70,"DX", 90,190,"MEDIA",true],
  ["SE12 90x190 SX MEDIA",     "SE12",     70,"SX", 90,190,"MEDIA",true],
  ["SE12 100x200 DX BAJA",     "SE12",     92,"DX",100,200,"BAJA", true],
  ["SE12 100x200 SX BAJA",     "SE12",     92,"SX",100,200,"BAJA", true],
  ["SE12 100x200 DX MEDIA",    "SE12",     70,"DX",100,200,"MEDIA",true],
  ["SE12 100x200 SX MEDIA",    "SE12",     70,"SX",100,200,"MEDIA",true],
  ["BATIENTE 90x190 DX BAJA",  "BATIENTE", 92,"DX", 90,190,"BAJA", true],
  ["BATIENTE 90x190 SX BAJA",  "BATIENTE", 92,"SX", 90,190,"BAJA", true],
  ["BATIENTE 90x190 DX MEDIA", "BATIENTE", 70,"DX", 90,190,"MEDIA",true],
  ["BATIENTE 90x190 SX MEDIA", "BATIENTE", 70,"SX", 90,190,"MEDIA",true],
  ["BATIENTE 100x200 DX BAJA", "BATIENTE", 92,"DX",100,200,"BAJA", true],
  ["BATIENTE 100x200 SX BAJA", "BATIENTE", 92,"SX",100,200,"BAJA", true],
  ["BATIENTE 100x200 DX MEDIA","BATIENTE", 70,"DX",100,200,"MEDIA",true],
  ["BATIENTE 100x200 SX MEDIA","BATIENTE", 70,"SX",100,200,"MEDIA",true]
];
let MODELOS = [];

async function loadModelos(){
  try{
    const meta = await api("?fields=sheets.properties.title");
    if(!(meta.sheets||[]).some(x=>x.properties.title===MOD_TAB)){
      await api(":batchUpdate", {method:"POST", body: JSON.stringify({
        requests:[{addSheet:{properties:{title:MOD_TAB, gridProperties:{frozenRowCount:1}}}}]})});
      await api(`/values/${encodeURIComponent(`'${MOD_TAB}'!A1`)}?valueInputOption=USER_ENTERED`,
        {method:"PUT", body: JSON.stringify({values:[MOD_HEAD, ...MOD_SEED]})});
    }
    const j = await api(`/values/${encodeURIComponent(`'${MOD_TAB}'!A2:H`)}?valueRenderOption=UNFORMATTED_VALUE`);
    MODELOS = (j.values||[])
      .filter(row=>String(row[1]||"").trim())
      .map(row=>({nombre:String(row[0]||"").trim(), tipo:String(row[1]||"").trim().toUpperCase(),
                  esp:num(row[2]), ap:String(row[3]||"").trim().toUpperCase(),
                  ancho:num(row[4]), alto:num(row[5]), prio:String(row[6]||"").trim().toUpperCase(),
                  activo: tri(row[7])!==false}))
      .filter(m=>m.activo);
  }catch(e){ console.warn("MODELOS:", e.message); MODELOS=[]; }
}
/** La puerta c corresponde al modelo m? Un campo vacio en el modelo no filtra. */
function esModelo(c, m, conPrio){
  if(m.tipo && String(c[C.TIPO]??"").trim().toUpperCase()!==m.tipo) return false;
  if(m.esp!==null   && num(c[C.ESP])   !== m.esp)   return false;
  if(m.ap  && String(c[C.AP]??"").trim().toUpperCase()!==m.ap) return false;
  if(m.ancho!==null && num(c[C.ANCHO]) !== m.ancho) return false;
  if(m.alto !==null && num(c[C.ALTO])  !== m.alto)  return false;
  if(conPrio && m.prio && String(c[C.PRIO]??"").trim().toUpperCase()!==m.prio) return false;
  return true;
}
function renderModelos(){
  // La prioridad no interviene: el modelo se identifica por tipo, espesor,
  // apertura y medidas, que es lo que define fisicamente la puerta.
  const base = stockBase().map(x=>x.c);          // marcadas STOCK y sin despachar

  // Al elegir un tipo arriba, el inventario se queda solo con los modelos de ese
  // tipo. Antes el filtro solo afectaba al listado de abajo, asi que la tabla
  // seguia enseñando batientes mientras se miraban corredizas.
  const fTipo = (()=>{ const e = $("#s-tipo"); return e ? e.value : ""; })();
  const modelos = fTipo
    ? MODELOS.filter(m => String(m.tipo ?? "").trim() === fTipo)
    : MODELOS;

  const filas = modelos.map(m=>{
    const hay = base.filter(c=>esModelo(c,m,false));
    return {m, hay,
      alm:  hay.filter(c=>completa(c) && desp(c)==="En Almacén").length,
      // Terminada = fabricada y esperando el visto bueno de calidad. Estaba
      // contada dentro del total pero sin columna propia, asi que las puertas
      // que salian de planta parecian haberse evaporado hasta llegar a almacen.
      term: hay.filter(c=>terminada(c)).length,
      sep:  hay.filter(c=>desp(c)==="Separado").length,
      // En producción = ya empezada. Proyectada = creada pero sin tocar aún.
      prod: hay.filter(c=>!completa(c) && progreso(c).ok > 0).length,
      proy: hay.filter(c=>!completa(c) && progreso(c).ok === 0).length,
      tot:  hay.length};
  });
  const T = filas.reduce((a,f)=>({alm:a.alm+f.alm, term:a.term+f.term, sep:a.sep+f.sep,
                                  prod:a.prod+f.prod, proy:a.proy+f.proy, tot:a.tot+f.tot}),
                         {alm:0,term:0,sep:0,prod:0,proy:0,tot:0});
  const n = (v,cls) => `<td class="n ${v?(cls||""):"z"}">${v}</td>`;
  $("#m-tabla").innerHTML =
    `<thead><tr><th>Modelo</th><th>Tipo</th><th>Medidas</th><th>Esp</th><th>Ap.</th>
      <th title="Marcadas STOCK, terminadas y con estado En Almacén">En almacén</th>
      <th title="Fabricadas y en estado Terminado: esperan revisión de calidad">Terminadas</th>
      <th title="Marcadas STOCK en estado Separado">Separadas</th>
      <th title="Empezadas: tienen al menos un proceso marcado">En producción</th>
      <th title="Creadas pero sin empezar: ningún proceso marcado todavía">Proyectadas</th>
      <th title="Todas las marcadas STOCK sin despachar">Total</th>
      <th title="Avance promedio de las que están en producción">Avance</th>
      <th></th></tr></thead><tbody>`+
    filas.map(({m,hay,alm,term,sep,prod,proy,tot})=>{
      const abiertas = hay.filter(c=>!completa(c));
      const av = abiertas.length
        ? Math.round(abiertas.reduce((a,c)=>a+progreso(c).pct,0)/abiertas.length*100)+"%" : "—";
      return `<tr>
      <td class="mod">${esc(m.nombre||"—")}</td><td>${esc(m.tipo)}</td>
      <td class="num">${m.ancho??"—"}×${m.alto??"—"}</td><td class="num">${m.esp??"—"}</td>
      <td>${esc(m.ap||"—")}</td>
      ${n(alm)}${n(term)}${n(sep)}${n(prod)}${n(proy)}${n(tot)}
      <td class="num">${av}</td>
      <td><button class="btn sm" data-mod="${esc(m.nombre)}">+ Crear</button></td></tr>`;
    }).join("")+
    // Todo lo que esta en stock pero no encaja en ningun modelo del catalogo,
    // para que los totales cuadren y se vea que falta por definir.
    (()=>{
      // Con un tipo elegido, esta fila solo cuenta las de ese tipo: si no, el
      // total de la tabla no cuadraria con lo que se esta viendo.
      const otras = base.filter(c=>!MODELOS.some(m=>esModelo(c,m,false)))
        .filter(c=>!fTipo || String(c[C.TIPO] ?? "").trim() === fTipo);
      if(!otras.length) return "";
      const oAlm = otras.filter(c=>completa(c) && desp(c)==="En Almacén").length;
      const oTer = otras.filter(c=>terminada(c)).length;
      const oSep = otras.filter(c=>desp(c)==="Separado").length;
      const oPro = otras.filter(c=>!completa(c) && progreso(c).ok > 0).length;
      const oProy= otras.filter(c=>!completa(c) && progreso(c).ok === 0).length;
      const ab   = otras.filter(c=>!completa(c));
      const av   = ab.length ? Math.round(ab.reduce((a,c)=>a+progreso(c).pct,0)/ab.length*100)+"%" : "—";
      const det  = otras.map(c=>`OP ${c[C.OP]}: ${c[C.TIPO]} ${num(c[C.ANCHO])}×${num(c[C.ALTO])} ${c[C.AP]} ${c[C.ESP]}mm`).join("\n");
      T.alm+=oAlm; T.term+=oTer; T.sep+=oSep; T.prod+=oPro; T.proy+=oProy; T.tot+=otras.length;
      return `<tr class="otras" title="${esc(det)}">
        <td class="mod">Sin modelo definido</td>
        <td colspan="4" class="sub">${otras.length} puerta(s) en stock que no coinciden con ningún modelo — pasa el mouse para verlas</td>
        ${n(oAlm)}${n(oTer)}${n(oSep)}${n(oPro)}${n(oProy)}${n(otras.length)}
        <td class="num">${av}</td><td></td></tr>`;
    })()+
    `<tr class="tot"><td>TOTAL</td><td colspan="4"></td>
      <td class="n">${T.alm}</td><td class="n">${T.term}</td><td class="n">${T.sep}</td>
      <td class="n">${T.prod}</td><td class="n">${T.proy}</td><td class="n">${T.tot}</td>
      <td colspan="2"></td></tr></tbody>`;
}

/* Modelo abierto en el modal. Se guarda para poder repintarlo cuando cambia algo
   —un estado, una separacion— sin que el modal se cierre bajo la mano. */
let stockModelo = "";

/* Pulsar un modelo abre sus puertas en un modal en vez de filtrar el listado de
   abajo. Filtrar abajo obligaba a bajar la pagina, perder de vista la fila que
   se acababa de pulsar y despues acordarse de limpiar el filtro; el modal
   responde la pregunta —«¿que puertas hay detras de ese numero?»— sin moverse
   del inventario y se cierra sin dejar rastro. */
function abrirModelo(nombre){
  const m = MODELOS.find(x => x.nombre === nombre);
  const ov = $("#ov-modelo");
  if(!m || !ov) return;              // paneles no tiene inventario por modelo
  stockModelo = nombre;
  pintarModeloModal();
  ov.classList.remove("hide");
}

/** Puertas de stock que son de ese modelo. */
const puertasDeModelo = nombre => {
  const m = MODELOS.find(x => x.nombre === nombre);
  return m ? stockBase().filter(({c}) => esModelo(c, m, false)) : [];
};

function pintarModeloModal(){
  // Todo el cuerpo va dentro de la comprobacion, y con un bloque en vez de un
  // return: en paneles estos elementos no existen, y asi la proteccion se ve
  // tanto al leer el codigo como al revisarlo con tools/comprobar_ids.py.
  if(!stockModelo || !$("#mm-titulo")) return;
  if($("#mm-titulo")){
  const m = MODELOS.find(x => x.nombre === stockModelo);
  const L = puertasDeModelo(stockModelo);

  $("#mm-titulo").textContent = stockModelo;
  $("#mm-sub").textContent = m
    ? [m.tipo, `${m.ancho ?? "—"}×${m.alto ?? "—"}`, `${m.esp ?? "—"} mm`, m.ap]
        .filter(Boolean).join(" · ")
    : "";

  const cuenta = (etq, n, tit) =>
    `<div class="mmk" title="${esc(tit)}"><b>${n}</b><span>${etq}</span></div>`;
  $("#mm-kpis").innerHTML =
    cuenta("En almacén", L.filter(({c})=>completa(c) && desp(c)==="En Almacén").length,
           "Terminadas y con estado En Almacén") +
    cuenta("Terminadas", L.filter(({c})=>terminada(c)).length,
           "Fabricadas, esperando revisión de calidad") +
    cuenta("Separadas",  L.filter(({c})=>desp(c)==="Separado").length,
           "Apartadas para un comprador") +
    cuenta("En producción", L.filter(({c})=>!completa(c) && progreso(c).ok > 0).length,
           "Empezadas: al menos un proceso marcado") +
    cuenta("Proyectadas", L.filter(({c})=>!completa(c) && progreso(c).ok === 0).length,
           "Creadas pero sin empezar") +
    cuenta("Total", L.length, "Todas las de este modelo marcadas STOCK");

  tablaMini("#mm-tabla", ["OP","Estado","Separada para","F. proceso","Avance","Calidad",""],
    L.map(({r,c}) => {
      const pc = Math.round(progreso(c).pct*100);
      const para = separadaPara(c);
      return [
        `<span class="op">${esc(c[C.OP] ?? "")}</span>`,
        selDesp(r, c[C.DESP]),
        celdaSeparar(r, para),
        esc(fmtDate(c[C.FPROC])),
        `<span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span><span class="pct">${pc}%</span>`,
        notaAlmacen(c),
        `<button class="btn sm" data-ver-ficha="${r}">Ficha</button>`
      ];
    }),
    L.map(({c}) => separadaPara(c) ? "sep" : ""));

  $("#mm-vacio").classList.toggle("hide", L.length > 0);
  }
}

/* Compatibilidad: el chip de abajo ya no existe, pero renderStock lo llamaba. */
function pintarChipModelo(){}
/* El modal del modelo solo existe en puertas: paneles no tiene inventario por
   modelo. Sin comprobarlo, dashboards.js reventaba aqui al cargar paneles y
   dejaba sin enganchar todo lo de mas abajo. */
const mmTabla = $("#mm-tabla");
if(mmTabla){
  mmTabla.addEventListener("change", async ev=>{
    const el = ev.target.closest("[data-edit-desp]"); if(!el) return;
    el.disabled = true;
    const ok = await guardarDespacho(+el.dataset.editDesp, el.value);
    el.disabled = false;
    pintarModeloModal();                 // el modal se queda abierto y al dia
    renderStock(); renderModelos();
    if(ok) render();
  });
  mmTabla.addEventListener("click", ev=>{
    const b = ev.target.closest("[data-ver-ficha]"); if(!b) return;
    const ov = $("#ov-modelo"); if(ov) ov.classList.add("hide");
    openDet(+b.dataset.verFicha);
  });
}
/* Ya no se resalta ninguna fila: el modal es lo que indica que modelo se mira. */
function marcarFilaModelo(){}

/** «+ Crear»: abre el alta con el modelo ya cargado. */
$("#m-tabla").addEventListener("click", ev=>{
  // Un clic en la fila (no en «+ Crear») abre ese modelo en un modal.
  if(!ev.target.closest("[data-mod]")){
    const tr = ev.target.closest("tbody tr");
    const nom = tr && tr.querySelector(".mod");
    if(!nom || tr.classList.contains("tot")) return;
    const modelo = nom.textContent.trim();
    if(!MODELOS.some(m=>m.nombre===modelo)) return;    // «Sin modelo definido»
    abrirModelo(modelo);
    return;
  }
  const b = ev.target.closest("[data-mod]"); if(!b) return;
  const m = MODELOS.find(x=>x.nombre===b.dataset.mod); if(!m) return;
  $("#n-op").value = String(nextOp());
  $("#n-fecha").value = hoy();
  $("#n-cli").value = "STOCK";
  $("#n-stock").checked = true;
  if(!$("#n-mat").value) $("#n-mat").value = "PP";
  $("#n-tipo").value = m.tipo; $("#n-tipo").onchange();
  $("#n-esp").value = m.esp!==null ? String(m.esp) : "";
  $("#n-ap").value  = m.ap;
  $("#n-ancho").value = m.ancho ?? "";
  $("#n-alto").value  = m.alto ?? "";
  $("#n-prio").value = PRIORIDADES.includes(m.prio) ? m.prio : "";
  $("#n-qty").value = "1";
  hintOp();
  $("#ov-nueva").classList.remove("hide");
  setTimeout(()=>$("#n-qty").focus(), 60);
});

/* ---------- Stock (hoja STOCK) ----------
   Base: marcadas STOCK que aún no se han despachado. Ojo: la hoja STATUS usa un
   criterio algo más estrecho (solo almacén o sin estado), por eso el «Stock total»
   del Resumen puede diferir en un par de unidades. Cada tarjeta indica el suyo. */
const stockBase = () => activas().filter(({c})=>
  tri(c[C.STOCK])===true && desp(c)!=="Despachado" && !anulada(c));
function stockList(){
  const q=$("#s-q").value.trim().toLowerCase();
  // Un filtro que no existe en esta pagina simplemente no filtra. Puertas y
  // paneles no tienen los mismos: el de material se quito de puertas y sigue
  // en paneles, y darlo por hecho dejaba muerto el filtro de la otra pagina.
  const g=id=>{ const e=$("#"+id); return e ? e.value : ""; };
  const eq=(v,f)=>!f||String(v??"").trim()===f;
  return stockBase().filter(({c})=>{
    if(q && ![c[C.OP],c[C.TIPO],c[C.MAT],num(c[C.ANCHO]),num(c[C.ALTO])].join(" ").toLowerCase().includes(q)) return false;
    if(!eq(c[C.MAT],g("s-mat"))) return false;
    if(!eq(c[C.TIPO],g("s-tipo"))) return false;
    if(!eq(c[C.ESP],g("s-esp")) || !eq(c[C.AP],g("s-ap"))) return false;
    if(!eq(medidaDe(c), g("s-med"))) return false;
    const fe=g("s-est");
    if(fe==="__none"){ if(desp(c)!=="") return false; } else if(!eq(desp(c),fe)) return false;
    const fa=g("s-av");
    if(fa==="done" && !completa(c)) return false;
    if(fa==="open" &&  completa(c)) return false;
    return true;
  });
}
function renderStock(){
  const L=stockList(), B=stockBase().map(x=>x.c);
  kpiCards("#s-kpis",[
    ["En inventario",   B.length, "Marcadas STOCK y sin despachar", 1],
    ["Stock en almacén",B.filter(c=>desp(c)==="En Almacén").length, "De las anteriores, con estado En Almacén"],
    ["Stock terminado", B.filter(completa).length, "Stock con avance 100%"],
    ["Stock en proceso",B.filter(c=>!completa(c)).length, "Stock con avance menor al 100%"],
    ["Listadas",        L.length, "Filas mostradas con el filtro actual"]
  ]);
  tablaMini("#s-tabla",
    ["OP","Material","Tipo","Dimensiones","Esp","Ap.","F. proceso","Avance","Estado","Separada para"],
    L.map(({r,c})=>{
      const pc=Math.round(progreso(c).pct*100);
      const para=separadaPara(c);
      return [`<span class="op">${esc(c[C.OP]??"")}</span>`, esc(c[C.MAT]??""), esc(c[C.TIPO]??""),
        `${num(c[C.ANCHO])??"—"} x ${num(c[C.ALTO])??"—"}`, esc(c[C.ESP]??""), esc(c[C.AP]??""),
        esc(fmtDate(c[C.FPROC])),
        `<span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span><span class="pct">${pc}%</span>`,
        selDesp(r, c[C.DESP]),
        celdaSeparar(r, para)];
    }),
    L.map(({c})=> separadaPara(c) ? "sep" : ""));
  contador("#s-cnt", L.length, B.length,
           ["s-mat","s-tipo","s-esp","s-ap","s-med","s-est","s-av"], "s-q");
  pintarChipModelo();
}
["s-q","s-mat","s-tipo","s-esp","s-ap","s-med","s-est","s-av"].forEach(id=>{
  const e=$("#"+id); if(!e) return;
  // El tipo tambien manda sobre el inventario de arriba, no solo sobre el
  // listado: los dos tienen que enseñar lo mismo.
  const pintar = id === "s-tipo"
    ? ()=>{ renderStock(); renderModelos(); marcarFilaModelo(); }
    : renderStock;
  e.addEventListener("input", pintar);
  e.addEventListener("change", pintar);
});
/* El estado tambien se edita desde stock: es donde se decide separar una
   puerta que se acaba de vender. */
document.addEventListener("DOMContentLoaded", ()=>{
  const ok = $("#sep-ok");       if(ok) ok.onclick = confirmarSeparar;
  const ca = $("#sep-cancelar"); if(ca) ca.onclick = cancelarSeparar;
  const inp = $("#sep-para");
  if(inp) inp.addEventListener("keydown", e=>{ if(e.key === "Enter") confirmarSeparar(); });
  // Cerrar por fuera o con Escape equivale a cancelar: si no, la promesa se
  // quedaria colgada y el selector bloqueado para siempre.
  const ov = $("#ov-separar");
  if(ov) ov.addEventListener("mousedown", e=>{ if(e.target === ov) cancelarSeparar(); });
  document.addEventListener("keydown", e=>{
    if(e.key === "Escape" && ov && !ov.classList.contains("hide")) cancelarSeparar();
  });
});

["#s-tabla","#a-tabla","#mm-tabla"].forEach(sel=>{
  const t = $(sel); if(t) t.addEventListener("click", clicSeparar);
});

$("#s-tabla").addEventListener("change", async ev=>{
  const el = ev.target.closest("[data-edit-desp]"); if(!el) return;
  const r = +el.dataset.editDesp, val = el.value;
  el.disabled = true;
  const ok = await guardarDespacho(r, val);
  el.disabled = false;
  renderStock();                       // repinta con el valor real, se guardara o no
  if(ok){ render(); }
});

$("#s-clear").onclick = ()=>{ ["s-q","s-mat","s-tipo","s-esp","s-ap","s-med","s-est","s-av"]
  .forEach(id=>{ const e=$("#"+id); if(e) e.value=""; });
  // Limpiar devuelve el inventario entero, no solo el listado.
  renderStock(); renderModelos(); };

function csvDe(nombre, cols, filas){
  const q=v=>`"${String(v??"").replace(/<[^>]*>/g,"").replace(/"/g,'""')}"`;
  const blob=new Blob(["﻿"+[cols.map(q).join(";"),...filas.map(f=>f.map(q).join(";"))].join("\r\n")],
    {type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`${nombre}_${iso(new Date())}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
$("#a-csv").onclick = ()=> csvDe("en_almacen",
  ["OP","CLIENTE","MATERIAL","TIPO","ANCHO","ALTO","ESPESOR","APERTURA","F. PROCESO","ESTADO"],
  almacenList().map(({c})=>[c[C.OP],c[C.CLI],c[C.MAT],c[C.TIPO],num(c[C.ANCHO]),num(c[C.ALTO]),c[C.ESP],c[C.AP],fmtDate(c[C.FPROC]),desp(c)]));
$("#s-csv").onclick = ()=> csvDe("stock",
  ["OP","MATERIAL","TIPO","ANCHO","ALTO","ESPESOR","APERTURA","F. PROCESO","AVANCE","ESTADO"],
  stockList().map(({c})=>[c[C.OP],c[C.MAT],c[C.TIPO],num(c[C.ANCHO]),num(c[C.ALTO]),c[C.ESP],c[C.AP],fmtDate(c[C.FPROC]),Math.round(progreso(c).pct*100)+"%",desp(c)]));

