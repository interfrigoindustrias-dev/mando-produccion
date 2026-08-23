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

  const A = activas().map(x=>x.c);
  const entre = (v,a,b)=>{ const d=toDate(v); return d && d>=a && d<=b; };
  const fabDia = A.filter(c=>completa(c) && sameDay(toDate(c[C.FPROC]),dia));
  const fabSem = A.filter(c=>completa(c) && entre(c[C.FPROC],l,d7));
  const m0=new Date(dia.getFullYear(),dia.getMonth(),1), m1=new Date(dia.getFullYear(),dia.getMonth()+1,0);
  const fabMes = A.filter(c=>completa(c) && entre(c[C.FPROC],m0,m1));
  const despDia= A.filter(c=>desp(c)==="Despachado" && sameDay(toDate(c[C.FDESP]),dia));
  const sum = l2 => l2.reduce((s,c)=>s+puntos(c),0);

  kpiCards("#r-prod",[
    ["Fabricadas día",  fabDia.length, "Avance 100% y fecha de proceso = día de referencia", 1],
    ["Puntos día",      sum(fabDia),   "Suma de PUNTOS de las fabricadas ese día"],
    ["Fabricadas semana",fabSem.length,"Avance 100% con fecha de proceso dentro de la semana", 1],
    ["Puntos semana",   sum(fabSem),   "Suma de PUNTOS de la semana"],
    ["Fabricadas mes",  fabMes.length, "Avance 100% con fecha de proceso dentro del mes", 1],
    ["Puntos mes",      sum(fabMes),   "Suma de PUNTOS del mes"],
    ["Despachadas día", despDia.length,"Estado Despachado con fecha de despacho = día"]
  ]);

  const alm = A.filter(c=>completa(c) && desp(c)==="En Almacén");
  const prod= A.filter(enProduccion);
  const stk = A.filter(enStock);
  const avg = prod.length ? Math.round(prod.reduce((s,c)=>s+progreso(c).pct,0)/prod.length*100) : 0;
  kpiCards("#r-inv",[
    ["En almacén",      alm.length,  "Terminadas (100%) con estado En Almacén"],
    ["En producción",   prod.length, "Avance <100% y sin despachar ni almacenar", 1],
    ["Stock total",     stk.length,  "Marcadas STOCK, en almacén o sin estado"],
    ["Avance promedio", avg+"%",     "Promedio de avance de las que están en producción"],
    // El Excel suma PUNTOS de TODA fila con avance <100%, sin excluir almacén ni despacho
    ["Puntos en prod.", sum(A.filter(c=>!completa(c))), "Suma de PUNTOS de toda puerta con avance menor al 100%"],
    ["Total en empresa",alm.length+prod.length, "En almacén + en producción"]
  ]);

  /* ---- Ritmo, antigüedad y proyección ----
     Métricas que responden a: ¿a qué velocidad producimos?, ¿qué lleva
     demasiado tiempo abierto?, ¿cuándo vaciamos la cola? */
  const DIA = 86400000;
  const hoy0 = new Date(); hoy0.setHours(0,0,0,0);
  const dias = (a,b) => Math.round((b-a)/DIA);
  const d30 = new Date(hoy0); d30.setDate(d30.getDate()-29);
  const term30 = A.filter(c=>completa(c) && entre(c[C.FPROC],d30,hoy0));
  const ritmo = +(term30.length/30).toFixed(1);
  const cola  = ritmo>0 ? Math.ceil(prod.length/ritmo) : null;

  const edades = prod.map(c=>{ const f=toDate(c[C.FECHA]); return f?dias(f,hoy0):null; })
                     .filter(x=>x!==null && x>=0);
  const edadMedia = edades.length ? Math.round(edades.reduce((a,b)=>a+b,0)/edades.length) : 0;
  const edadMax   = edades.length ? Math.max(...edades) : 0;
  const viejas    = edades.filter(d=>d>30).length;

  // tiempo de fabricación: días entre creación y fecha de proceso en las terminadas
  const ciclos = A.filter(completa).map(c=>{
    const f=toDate(c[C.FECHA]), p2=toDate(c[C.FPROC]);
    return (f&&p2) ? dias(f,p2) : null;
  }).filter(x=>x!==null && x>=0 && x<400);
  const ciclo = ciclos.length ? Math.round(ciclos.reduce((a,b)=>a+b,0)/ciclos.length) : null;

  // en almacén esperando despacho hace más de 30 días
  const estancadas = A.filter(c=>completa(c) && desp(c)==="En Almacén")
    .filter(c=>{ const f=toDate(c[C.FPROC]); return f && dias(f,hoy0)>30; }).length;

  kpiCards("#r-ritmo",[
    ["Puertas por día",  ritmo, "Terminadas en los últimos 30 días dividido entre 30", 1],
    ["Días para vaciar cola", cola??"—", `Las ${prod.length} en producción al ritmo actual`, 1],
    ["Terminadas 30 días", term30.length, "Avance 100% con fecha de proceso en los últimos 30 días"],
    ["Antigüedad media",  edadMedia+" d", "Días promedio desde la creación de las puertas en producción"],
    ["La más antigua",    edadMax+" d",   "Días de la puerta en producción más antigua"],
    ["Abiertas +30 días", viejas, "Puertas en producción creadas hace más de 30 días"],
    ["Ciclo de fabricación", ciclo!==null?ciclo+" d":"—", "Promedio de días entre creación y fecha de proceso en las terminadas"],
    ["Almacén +30 días",  estancadas, "Terminadas y en almacén hace más de 30 días sin despachar"]
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
  prod.forEach(c=>{ const k=String(c[C.CLI]??"—").trim()||"—"; porCli[k]=(porCli[k]||0)+1; });
  barras("#r-clientes", Object.entries(porCli).sort((a,b)=>b[1]-a[1]).slice(0,8), prod.length);

  const porTipo={};
  A.forEach(c=>{ const t=String(c[C.TIPO]??"—").trim()||"—"; porTipo[t]=(porTipo[t]||0)+1; });
  barras("#r-tipos", Object.entries(porTipo).sort((a,b)=>b[1]-a[1]), A.length);

  const carga = PROCS.map(p=>[p.k, prod.filter(c=>tri(c[p.i])===false).length]);
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
function selDesp(r, v){
  const cur = DESPACHOS.includes(String(v??"").trim()) ? String(v).trim() : "";
  const k = cur==="Despachado"?"t-des" : cur==="Separado"?"t-sep" : cur==="Anulada"?"t-anu" : cur?"t-alm":"t-non";
  return `<select class="mini tag ${k}" data-edit-desp="${r}">
    <option value=""${cur?"":" selected"}>—</option>`+
    DESPACHOS.map(d=>`<option${d===cur?" selected":""}>${d}</option>`).join("")+`</select>`;
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
  tablaMini("#a-tabla", ["OP","Cliente","Material","Tipo","Vano (A × H)","Esp","Ap.","F. proceso","Compl.","Stock","Estado"],
    L.map(({r,c})=>[
      `<span class="op">${esc(c[C.OP]??"")}</span>`, esc(c[C.CLI]??""), esc(c[C.MAT]??""), esc(c[C.TIPO]??""),
      `${num(c[C.ANCHO])??"—"} x ${num(c[C.ALTO])??"—"}`, esc(c[C.ESP]??""), esc(c[C.AP]??""),
      esc(fmtDate(c[C.FPROC])), tri(c[C.COMP])?"Sí":"", tri(c[C.STOCK])?"Sí":"", selDesp(r, c[C.DESP])]),
    L.map(({c})=> anulada(c) ? "anu" : desp(c)==="Separado" ? "sep" : ""));
  contador("#a-cnt", L.length, B.length, ["a-tipo","a-esp","a-ap","a-est"], "a-q");
}
["a-q","a-tipo","a-esp","a-ap","a-est"].forEach(id=>{
  $("#"+id).addEventListener("input", renderAlmacen);
  $("#"+id).addEventListener("change", renderAlmacen);
});
$("#a-clear").onclick = ()=>{ ["a-q","a-tipo","a-esp","a-ap","a-est"]
  .forEach(id=>$("#"+id).value=""); renderAlmacen(); };
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
const MOD_TAB = "MODELOS";
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
  const filas = MODELOS.map(m=>{
    const hay = base.filter(c=>esModelo(c,m,false));
    return {m, hay,
      alm:  hay.filter(c=>completa(c) && desp(c)==="En Almacén").length,
      sep:  hay.filter(c=>desp(c)==="Separado").length,
      // En producción = ya empezada. Proyectada = creada pero sin tocar aún.
      prod: hay.filter(c=>!completa(c) && progreso(c).ok > 0).length,
      proy: hay.filter(c=>!completa(c) && progreso(c).ok === 0).length,
      tot:  hay.length};
  });
  const T = filas.reduce((a,f)=>({alm:a.alm+f.alm, sep:a.sep+f.sep, prod:a.prod+f.prod,
                                  proy:a.proy+f.proy, tot:a.tot+f.tot}),
                         {alm:0,sep:0,prod:0,proy:0,tot:0});
  const n = (v,cls) => `<td class="n ${v?(cls||""):"z"}">${v}</td>`;
  $("#m-tabla").innerHTML =
    `<thead><tr><th>Modelo</th><th>Tipo</th><th>Medidas</th><th>Esp</th><th>Ap.</th>
      <th title="Marcadas STOCK, terminadas y con estado En Almacén">En almacén</th>
      <th title="Marcadas STOCK en estado Separado">Separadas</th>
      <th title="Empezadas: tienen al menos un proceso marcado">En producción</th>
      <th title="Creadas pero sin empezar: ningún proceso marcado todavía">Proyectadas</th>
      <th title="Todas las marcadas STOCK sin despachar">Total</th>
      <th title="Avance promedio de las que están en producción">Avance</th>
      <th></th></tr></thead><tbody>`+
    filas.map(({m,hay,alm,sep,prod,proy,tot})=>{
      const abiertas = hay.filter(c=>!completa(c));
      const av = abiertas.length
        ? Math.round(abiertas.reduce((a,c)=>a+progreso(c).pct,0)/abiertas.length*100)+"%" : "—";
      return `<tr>
      <td class="mod">${esc(m.nombre||"—")}</td><td>${esc(m.tipo)}</td>
      <td class="num">${m.ancho??"—"}×${m.alto??"—"}</td><td class="num">${m.esp??"—"}</td>
      <td>${esc(m.ap||"—")}</td>
      ${n(alm)}${n(sep)}${n(prod)}${n(proy)}${n(tot)}
      <td class="num">${av}</td>
      <td><button class="btn sm" data-mod="${esc(m.nombre)}">+ Crear</button></td></tr>`;
    }).join("")+
    // Todo lo que esta en stock pero no encaja en ningun modelo del catalogo,
    // para que los totales cuadren y se vea que falta por definir.
    (()=>{
      const otras = base.filter(c=>!MODELOS.some(m=>esModelo(c,m,false)));
      if(!otras.length) return "";
      const oAlm = otras.filter(c=>completa(c) && desp(c)==="En Almacén").length;
      const oSep = otras.filter(c=>desp(c)==="Separado").length;
      const oPro = otras.filter(c=>!completa(c) && progreso(c).ok > 0).length;
      const oProy= otras.filter(c=>!completa(c) && progreso(c).ok === 0).length;
      const ab   = otras.filter(c=>!completa(c));
      const av   = ab.length ? Math.round(ab.reduce((a,c)=>a+progreso(c).pct,0)/ab.length*100)+"%" : "—";
      const det  = otras.map(c=>`OP ${c[C.OP]}: ${c[C.TIPO]} ${num(c[C.ANCHO])}×${num(c[C.ALTO])} ${c[C.AP]} ${c[C.ESP]}mm`).join("\n");
      T.alm+=oAlm; T.sep+=oSep; T.prod+=oPro; T.proy+=oProy; T.tot+=otras.length;
      return `<tr class="otras" title="${esc(det)}">
        <td class="mod">Sin modelo definido</td>
        <td colspan="4" class="sub">${otras.length} puerta(s) en stock que no coinciden con ningún modelo — pasa el mouse para verlas</td>
        ${n(oAlm)}${n(oSep)}${n(oPro)}${n(oProy)}${n(otras.length)}
        <td class="num">${av}</td><td></td></tr>`;
    })()+
    `<tr class="tot"><td>TOTAL</td><td colspan="4"></td>
      <td class="n">${T.alm}</td><td class="n">${T.sep}</td><td class="n">${T.prod}</td>
      <td class="n">${T.proy}</td><td class="n">${T.tot}</td><td colspan="2"></td></tr></tbody>`;
}

/** «+ Crear»: abre el alta con el modelo ya cargado. */
$("#m-tabla").addEventListener("click", ev=>{
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
  $("#n-prio").value = ["ALTA","MEDIA","BAJA"].includes(m.prio) ? m.prio : "";
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
  const q=$("#s-q").value.trim().toLowerCase(), g=id=>$("#"+id).value;
  const eq=(v,f)=>!f||String(v??"").trim()===f;
  return stockBase().filter(({c})=>{
    if(q && ![c[C.OP],c[C.TIPO],c[C.MAT],num(c[C.ANCHO]),num(c[C.ALTO])].join(" ").toLowerCase().includes(q)) return false;
    if(!eq(c[C.MAT],g("s-mat")) || !eq(c[C.TIPO],g("s-tipo"))) return false;
    if(!eq(c[C.ESP],g("s-esp")) || !eq(c[C.AP],g("s-ap"))) return false;
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
  tablaMini("#s-tabla", ["OP","Material","Tipo","Dimensiones","Esp","Ap.","F. proceso","Avance","Estado"],
    L.map(({c})=>{
      const pc=Math.round(progreso(c).pct*100);
      return [`<span class="op">${esc(c[C.OP]??"")}</span>`, esc(c[C.MAT]??""), esc(c[C.TIPO]??""),
        `${num(c[C.ANCHO])??"—"} x ${num(c[C.ALTO])??"—"}`, esc(c[C.ESP]??""), esc(c[C.AP]??""),
        esc(fmtDate(c[C.FPROC])),
        `<span class="pbar"><i class="${pc>=100?"full":""}" style="width:${pc}%"></i></span><span class="pct">${pc}%</span>`,
        tagDesp(c[C.DESP])];
    }));
  contador("#s-cnt", L.length, B.length, ["s-mat","s-tipo","s-esp","s-ap","s-est","s-av"], "s-q");
}
["s-q","s-mat","s-tipo","s-esp","s-ap","s-est","s-av"].forEach(id=>{
  $("#"+id).addEventListener("input", renderStock);
  $("#"+id).addEventListener("change", renderStock);
});
$("#s-clear").onclick = ()=>{ ["s-q","s-mat","s-tipo","s-esp","s-ap","s-est","s-av"]
  .forEach(id=>$("#"+id).value=""); renderStock(); };

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

