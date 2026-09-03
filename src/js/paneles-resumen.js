/* Vista Resumen de paneleria
   Proyecto: Control de Produccion - Interfrigo

   Tres preguntas, que son las que se hacen de verdad:
     1. cuanto se fabrica  -> metros cuadrados por mes y por producto
     2. cuanto se tarda    -> dias reales desde que entra el pedido hasta que sale
     3. cuanto se gasta    -> kilos de poliuretano por mes, semana y producto

   La segunda es la que permite comprometer una fecha con el cliente sin
   inventarla, y por eso se dice con el historico al lado: no es una promesa
   del sistema, es lo que ha venido pasando.                                 */
"use strict";

/* ------------------------------ produccion ------------------------------ */
/** Lineas fabricadas: las que tienen los tres procesos hechos. */
const fabricadas = () => activas().filter(({c})=>!anuladaP(c) && progreso(c).pct >= 1);

/** Cuando se acabo de fabricar: el fin de proceso, y si falta, la creacion. */
const fechaFin = c => toDate(c[C.FFIN]) || toDate(c[C.FECHA]);

/** Dias que tardo una linea desde que entro hasta que se acabo. */
function diasDeFabricacion(c){
  const ini = toDate(c[C.FECHA]), fin = toDate(c[C.FFIN]);
  if(!ini || !fin) return null;
  const d = Math.round((fin - ini) / 86400000);
  return d >= 0 ? d : null;
}
/** Mediana: con pocos pedidos, un caso raro mueve la media y no la mediana. */
function mediana(xs){
  if(!xs.length) return null;
  const s = [...xs].sort((a,b)=>a-b);
  const m = Math.floor(s.length/2);
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
}
function percentil(xs, p){
  if(!xs.length) return null;
  const s = [...xs].sort((a,b)=>a-b);
  return s[Math.min(s.length-1, Math.floor(s.length * p))];
}

function renderResumen(){
  const todas = activas().filter(({c})=>!anuladaP(c));
  const hechas = fabricadas();
  /* Pendiente es lo que queda por hacer, no lo que quedo a medias en la hoja:
     una linea despachada ya no es trabajo de nadie aunque le falte marcar un
     proceso, y contarla inflaba los m2 pendientes. Los totales y lo fabricado
     si la siguen incluyendo: eso es historia, y la historia no se borra al
     despachar. */
  const abiertas = todas.filter(({c})=>progreso(c).pct < 1 && !despachadaP(c));
  const sum = (xs, f) => xs.reduce((s,x)=>s+(f(x.c)||0), 0);

  /* ---------- 1. cuanto se fabrica ---------- */
  const m2Pend = sum(abiertas, MODELO.metros);
  const m2Total = sum(todas, MODELO.metros);

  // Metros por mes, contando el mes en que se ACABO, no en el que entro.
  const porMes = new Map();
  hechas.forEach(({c})=>{
    const f = fechaFin(c);
    const k = f ? f.getFullYear()+"-"+p2(f.getMonth()+1) : (mesDe(c[C.FECHA]) || null);
    if(!k) return;
    const e = porMes.get(k) || {m2:0, kg:0, paneles:0, lineas:0};
    e.m2 += MODELO.metros(c) || 0;
    e.kg += kgDe(c);
    e.paneles += num(c[C.CANT]) || 0;
    e.lineas++;
    porMes.set(k, e);
  });
  const meses = [...porMes.entries()].sort((a,b)=>a[0].localeCompare(b[0]));

  /* ---------- 2. cuanto se tarda ---------- */
  const tiempos = hechas.map(({c})=>diasDeFabricacion(c)).filter(v=>v !== null);
  const medio = mediana(tiempos);
  const p90 = percentil(tiempos, 0.9);

  /* Ritmo: metros por dia natural, mirando lo acabado en los ultimos 60 dias.
     Con el ritmo y la cola pendiente sale cuanto tardaria en vaciarse. */
  const desde = new Date(); desde.setDate(desde.getDate() - 60);
  const recientes = hechas.filter(({c})=>{ const f = fechaFin(c); return f && f >= desde; });
  const m2Recientes = sum(recientes, MODELO.metros);
  const ritmo = m2Recientes / 60;                       // m2 por dia natural
  const diasCola = ritmo > 0 ? Math.ceil(m2Pend / ritmo) : null;

  kpiCards("#r-kpis", [
    ["m² fabricados", n2(sum(hechas, MODELO.metros)), "Líneas con los tres procesos hechos"],
    ["m² pendientes", n2(m2Pend), "Lo que queda en la cola"],
    ["m² totales", n2(m2Total), "Todo lo vivo: fabricado y pendiente"],
    ["Tiempo habitual", medio === null ? "—" : medio + " d",
     "Mediana de días entre la entrada del pedido y el fin de fabricación"],
    ["Nueve de cada diez", p90 === null ? "—" : "≤ " + p90 + " d",
     "El 90 % de las líneas se acabó dentro de este plazo"],
    ["Ritmo", ritmo ? n2(ritmo) + " m²/d" : "—", "Metros acabados por día natural, últimos 60 días"],
    ["Vaciar la cola", diasCola === null ? "—" : diasCola + " d",
     "Al ritmo actual, lo que tardaría en fabricarse todo lo pendiente"]
  ]);

  /* ---------- compromiso de entrega ---------- */
  pintarEntrega(medio, p90, diasCola, ritmo, m2Pend);

  /* ---------- metros por mes ---------- */
  tablaMini("#r-meses",
    ["Mes","Líneas","Paneles","m²","kg poliuretano","kg/m²"],
    meses.map(([k,e])=>[
      esc(nombreMes(k)), e.lineas, n0(e.paneles), n2(e.m2), n2(e.kg),
      e.m2 ? n2(e.kg/e.m2) : "—"
    ]));

  /* ---------- metros por producto ---------- */
  const porProd = new Map();
  todas.forEach(({c})=>{
    const k = String(c[C.PROD]??"").trim() || "sin producto";
    const e = porProd.get(k) || {m2:0, hechos:0, pend:0, paneles:0, dias:[]};
    const m = MODELO.metros(c) || 0;
    e.m2 += m; e.paneles += num(c[C.CANT]) || 0;
    if(progreso(c).pct >= 1){
      e.hechos += m;
      const d = diasDeFabricacion(c);
      if(d !== null) e.dias.push(d);
    } else if(!despachadaP(c)) e.pend += m;   // despachada = ya no esta pendiente
    porProd.set(k, e);
  });
  tablaMini("#r-productos",
    ["Producto","Paneles","m² totales","m² fabricados","m² pendientes","Tiempo habitual"],
    [...porProd.entries()].sort((a,b)=>b[1].m2-a[1].m2).map(([k,e])=>[
      esc(k), n0(e.paneles), n2(e.m2), n2(e.hechos), n2(e.pend),
      e.dias.length ? mediana(e.dias) + " d" : "—"
    ]));

  renderPoliuretano(todas);
  renderLamina(todas);
  renderPoliPendiente(todas);
}

/** Lo que se le puede prometer hoy a un cliente que llame preguntando. */
function pintarEntrega(medio, p90, diasCola, ritmo, m2Pend){
  const el = $("#r-entrega"); if(!el) return;
  if(medio === null && diasCola === null){
    el.innerHTML = `<p class="mut">Todavía no hay líneas terminadas con fecha de
      inicio y de fin, así que no se puede estimar un plazo con datos propios.
      En cuanto se cierren unas cuantas, aparece aquí.</p>`;
    return;
  }
  /* Dos numeros distintos y conviene no confundirlos: lo que se ha tardado
     historicamente, y lo que se tardaria ahora contando la cola que ya hay
     delante. Se ofrece el mayor de los dos, que es el honesto. */
  const historico = p90 ?? medio;
  const conCola = diasCola;
  const propuesta = Math.max(historico ?? 0, conCola ?? 0);
  const holgura = Math.ceil(propuesta * 1.15);          // un 15 % de margen

  el.innerHTML = `
    <div class="entrega">
      <div class="entrega-num"><b>${holgura}</b><span>días</span></div>
      <div class="entrega-txt">
        <p>Es el plazo que se puede comprometer hoy para un pedido nuevo, con un
        15 % de margen sobre el peor de estos dos datos:</p>
        <ul>
          <li>Lo que se ha tardado: <b>${historico ?? "—"} días</b> en nueve de cada diez líneas.</li>
          <li>La cola que ya hay delante: <b>${conCola ?? "—"} días</b>
            (${n2(m2Pend)} m² pendientes a ${ritmo ? n2(ritmo) : "—"} m²/día).</li>
        </ul>
        <p class="mut">Sube en cuanto entra trabajo y baja cuando la cola se vacía,
        así que conviene mirarlo el día que se promete, no repetir el de la
        semana pasada.</p>
      </div>
    </div>`;
}

/* ============================== POLIURETANO ==============================
   La hoja calcula los kilos de cada linea en K y L. Aqui se agrupan para
   responder a lo que se pregunta al pedir material: cuanto va este mes, cuanto
   esta semana, y en que se va.                                              */
function renderPoliuretano(todas){
  if(typeof resumenPoliuretano !== "function") return;
  const R = resumenPoliuretano(todas);

  const cab = $("#r-poli-kpis");
  if(cab){
    kpiCards("#r-poli-kpis", [
      ["kg totales", n2(R.totalKg), "Todo lo registrado, fabricado y pendiente"],
      ["Promedio por mes", n2(R.promedioMes), "Media de los meses con producción"],
      ["kg por m²", n2(R.kgPorM2),
       "Depende del espesor: 3″ gasta 2,89 y 6″ gasta 5,78"],
      ["Este mes", n2((R.porMes.find(m=>m.periodo === new Date().getFullYear()+"-"+
        p2(new Date().getMonth()+1)) || {kg:0}).kg), "Lo que lleva el mes en curso"]
    ]);
  }

  tablaMini("#r-poli-mes",
    ["Mes","kg","m²","Paneles","kg/m²"],
    R.porMes.map(m=>[esc(m.etiqueta), n2(m.kg), n2(m.m2), n0(m.paneles),
                     m.m2 ? n2(m.kg/m.m2) : "—"]));

  tablaMini("#r-poli-semana",
    ["Semana","kg","m²","Paneles"],
    R.porSemana.map(m=>[esc(m.etiqueta), n2(m.kg), n2(m.m2), n0(m.paneles)]));

  tablaMini("#r-poli-producto",
    ["Producto","kg","m²","kg/m²","Paneles"],
    R.porProducto.map(p=>[esc(p.producto), n2(p.kg), n2(p.m2),
                          p.m2 ? n2(p.kg/p.m2) : "—", n0(p.paneles)]));

  /* Si la hoja y la formula dejan de coincidir hay que saberlo: significa que
     una de las dos se quedo atras, y callarlo haria que los pedidos de
     material se hicieran con un numero que ya no describe la realidad. */
  const aviso = $("#r-poli-aviso");
  if(!aviso) return;
  const raros = revisarPoliuretano(todas);
  if(!raros.length){
    aviso.className = "nota ok";
    aviso.innerHTML = `La hoja y la fórmula coinciden en todas las líneas.`;
  } else {
    aviso.className = "nota warn";
    aviso.innerHTML = `<b>${raros.length} línea(s)</b> en las que lo que dice la hoja
      no coincide con la fórmula: ` +
      raros.slice(0,6).map(x=>`OP ${esc(x.op)} (fila ${x.fila}, ${x.desvioPct} %)`).join(" · ") +
      (raros.length > 6 ? " …" : "") +
      `. Suele significar que la fórmula de la hoja cambió y aquí no, o al revés.`;
  }
}

/** La semana empieza el lunes; el resumen se recalcula al cambiar de vista. */
["r-desde","r-hasta"].forEach(id=>{
  const e = $("#"+id); if(!e) return;
  e.addEventListener("change", renderResumen);
});

/* ============================== LÁMINA ==============================
   Las columnas V y W traen los metros lineales de lamina de cada cara, y cada
   cara tiene su acabado: la V se consume en el acabado de la cara A y la W en
   el de la cara B. Agrupando por acabado sale lo que de verdad se pregunta al
   comprar: de cada lamina, cuanta se ha gastado ya y cuanta hace falta para lo
   que esta en produccion o pendiente.                                        */

/** Metros lineales de una cara. Manda la hoja; si esa celda esta vacia —una
 *  fila cuya formula no se extendio— se calcula, que es cantidad por largo. */
function metrosLamina(c, campoMetros){
  const enLaHoja = num(c[C[campoMetros]]);
  if(enLaHoja !== null && enLaHoja > 0) return enLaHoja;
  return (num(c[C.CANT]) || 0) * (num(c[C.LARGO]) || 0);
}

/** Por acabado: lo ya fabricado y lo que queda por fabricar. */
function consumoLamina(filas){
  const acc = new Map();
  for(const {c} of filas){
    if(anuladaP(c)) continue;
    const hecha = progreso(c).pct >= 1;
    for(const {cara, metros} of (MODELO.laminas || [])){
      const tipo = String(c[C[cara]] ?? "").trim();
      if(!tipo) continue;
      const m = metrosLamina(c, metros);
      if(!m) continue;
      const e = acc.get(tipo) || {consumida:0, pendiente:0, lineas:0};
      if(hecha) e.consumida += m; else e.pendiente += m;
      e.lineas++;
      acc.set(tipo, e);
    }
  }
  return [...acc.entries()]
    .map(([tipo, e])=>({tipo, ...e, total: e.consumida + e.pendiente}))
    .sort((a,b)=>b.total - a.total);
}

function renderLamina(todas){
  const lam = consumoLamina(todas);
  const suma = f => lam.reduce((s,x)=>s+f(x), 0);

  kpiCards("#r-lam-kpis", [
    ["Tipos de lámina", lam.length, "Acabados distintos con consumo registrado"],
    ["m lineales consumidos", n2(suma(x=>x.consumida)), "De lo ya fabricado"],
    ["m lineales por consumir", n2(suma(x=>x.pendiente)),
     "Lo que hace falta para lo que está en producción o pendiente", suma(x=>x.pendiente) > 0],
    ["m lineales en total", n2(suma(x=>x.total)), ""]
  ]);

  tablaMini("#r-lam-tabla",
    ["Lámina","Consumida (m)","Por consumir (m)","Total (m)","Líneas"],
    lam.map(x=>[esc(x.tipo), n2(x.consumida), n2(x.pendiente), n2(x.total), x.lineas]),
    // La que aún hay que comprar se marca: es la que interesa al pedir.
    lam.map(x=>x.pendiente > 0 ? "pend" : ""));
}

/** Poliuretano de lo que sigue abierto: es lo que hay que tener para poder
 *  fabricar lo comprometido, y no se deduce del total ya gastado. */
function renderPoliPendiente(todas){
  const abiertas = todas.filter(({c})=>progreso(c).pct < 1 && !despachadaP(c));
  const porProducto = new Map();
  abiertas.forEach(({c})=>{
    const k = String(c[C.PROD] ?? "").trim() || "sin producto";
    const e = porProducto.get(k) || {kg:0, m2:0, paneles:0, lineas:0};
    e.kg += kgDe(c);
    e.m2 += MODELO.metros(c) || 0;
    e.paneles += num(c[C.CANT]) || 0;
    e.lineas++;
    porProducto.set(k, e);
  });
  const total = [...porProducto.values()].reduce((s,e)=>s+e.kg, 0);

  kpiCards("#r-pu-pend-kpis", [
    ["kg de poliuretano por consumir", n2(total),
     "Lo que hace falta para fabricar todo lo que está en producción o pendiente", total > 0],
    ["Líneas abiertas", abiertas.length, ""],
    ["m² por fabricar", n2([...porProducto.values()].reduce((s,e)=>s+e.m2, 0)), ""],
    ["Paneles por fabricar", n0([...porProducto.values()].reduce((s,e)=>s+e.paneles, 0)), ""]
  ]);

  tablaMini("#r-pu-pend-tabla",
    ["Producto","Líneas","Paneles","m²","kg de poliuretano"],
    [...porProducto.entries()].sort((a,b)=>b[1].kg - a[1].kg)
      .map(([k,e])=>[esc(k), e.lineas, n0(e.paneles), n2(e.m2), n2(e.kg)]));
}
