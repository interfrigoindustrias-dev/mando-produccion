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

/* ------------------------------ produccion ------------------------------
   QUE CUENTA COMO FABRICADA: que alguien haya pulsado TERMINAR.

   Antes eran «los tres procesos marcados», y eso medía otra cosa. La hoja
   lleva años funcionando y sus lineas tienen su ESTADO puesto, pero las
   casillas de proceso solo estan marcadas en lo que se ha tocado desde la
   aplicacion. Contando casillas, todo el historico salia como pendiente: los
   metros por fabricar se disparaban, el ritmo se hundia, y el plazo de entrega
   que salia de dividir uno entre otro no describia nada.

   Terminar es el momento en que la linea deja de ser trabajo de planta. Es lo
   que sella el FIN DE PROCESO y lo que la manda a almacen, asi que es tambien
   el momento en el que cuenta como fabricada. Despachada tambien cuenta: no se
   despacha lo que no se hizo. */
const terminadaP = c => [ESTADO.TERMINADO, ESTADO.DESPACHADO].includes(estadoDe(c));
const fabricadas = () => activas().filter(({c})=>!anuladaP(c) && terminadaP(c));

/** Cuando se acabo de fabricar.
 *
 *  El fin de proceso lo pone la aplicacion al pulsar Terminar, asi que las
 *  lineas de antes no lo tienen. Para esas vale la fecha de despacho: no se
 *  despacha lo que no se ha fabricado. Antes se caia a la fecha de CREACION, y
 *  eso decia que la linea se acabo el dia que entro — cero dias de plazo, y el
 *  mes de produccion contado en el mes equivocado. */
const fechaFin = c => toDate(c[C.FFIN]) || toDate(c[C.FDESP]) || null;

/** Dias naturales desde que entro el pedido hasta que se acabo. Es el plazo
 *  que vivio el cliente, con su espera en cola incluida. */
function diasDeFabricacion(c){
  const ini = toDate(c[C.FECHA]), fin = fechaFin(c);
  if(!ini || !fin) return null;
  const d = Math.round((fin - ini) / 86400000);
  return d >= 0 ? d : null;
}

/* SE TRABAJA DE LUNES A SABADO MEDIO DIA: cinco dias y medio por semana. Es el
   unico dato que no esta en la hoja y que hubo que preguntar. Todo lo demas
   sale de los datos. */
const DIAS_SEMANA = 5.5;
const laborablesDe = naturales => naturales * DIAS_SEMANA / 7;
const naturalesDe  = laborables => laborables * 7 / DIAS_SEMANA;
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
  /* Pendiente es lo que nadie ha dado por terminado. Por el mismo motivo que
     arriba: mirar las casillas hacia pasar por pendiente todo el historico de
     la hoja, que esta hecho desde hace meses. */
  const abiertas = todas.filter(({c})=>!terminadaP(c));
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
  /* Por dia DE TRABAJO, no por dia de calendario: dividir entre 60 metia los
     domingos y las medias tardes del sabado en el ritmo, y hacia parecer la
     planta un 27 % mas lenta de lo que es. */
  const ritmo = m2Recientes / laborablesDe(60);
  const diasTrabajoCola = ritmo > 0 ? Math.ceil(m2Pend / ritmo) : null;

  kpiCards("#r-kpis", [
    ["m² fabricados", n2(sum(hechas, MODELO.metros)), "Líneas con los tres procesos hechos"],
    ["m² pendientes", n2(m2Pend), "Lo que queda en la cola"],
    ["m² totales", n2(m2Total), "Todo lo vivo: fabricado y pendiente"],
    ["Tiempo habitual", medio === null ? "—" : medio + " d",
     "Mediana de días entre la entrada del pedido y el fin de fabricación"],
    ["Nueve de cada diez", p90 === null ? "—" : "≤ " + p90 + " d",
     "El 90 % de las líneas se acabó dentro de este plazo"],
    ["Ritmo", ritmo ? n2(ritmo) + " m²/d" : "—",
     "Metros acabados por día de trabajo (lunes a sábado medio día), últimos 60 días"],
    ["Vaciar la cola", diasTrabajoCola === null ? "—" : diasTrabajoCola + " d",
     "Días de trabajo que costaría fabricar todo lo pendiente, si no entrara nada más"]
  ]);

  pintarProgramaResumen();

  /* ---------- compromiso de entrega ---------- */
  pintarEntrega(hechas, diasTrabajoCola, ritmo, m2Pend);

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
    if(terminadaP(c)){
      e.hechos += m;
      const d = diasDeFabricacion(c);
      if(d !== null) e.dias.push(d);
    } else e.pend += m;
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

/** Lo que hay programado y lo que falta por programar, contra la capacidad
 *  real. Es la pregunta de cada mañana: ¿cabe lo de esta semana? */
function pintarProgramaResumen(){
  if(typeof metricasPrograma !== "function" || !$("#r-prog-kpis")) return;
  const M = metricasPrograma();
  const nota = $("#r-prog-nota");
  if(!M.listo){
    nota.className = "nota warn"; nota.hidden = false;
    nota.textContent = "La programación todavía no tiene dónde guardarse en la hoja: " +
      "revisa el aviso de la pestaña Programación.";
  } else nota.hidden = true;

  const semana = M.estaSemana;
  const m2 = semana.reduce((t, d)=>t + d.m2, 0);
  const cap = semana.reduce((t, d)=>t + (d.cap || 0), 0);
  kpiCards("#r-prog-kpis", [
    ["Líneas sin terminar", M.abiertas.n, `${M.abiertas.ops} OP · ${n2(M.abiertas.m2)} m²`],
    ["Líneas programadas", M.programadas.n, `${n2(M.programadas.m2)} m² con día y puesto`],
    ["Líneas sin programar", M.sinProgramar.n, `${n2(M.sinProgramar.m2)} m²: planta las hace después de lo programado`,
     M.sinProgramar.n > 0],
    ["Atrasadas", M.atrasadas.n, "Programadas para un día que ya pasó y aún abiertas", M.atrasadas.n > 0],
    ["Carga de la semana", cap ? Math.round(m2 / cap * 100) + " %" : "—",
     `${n2(m2)} m² programados de ${n2(cap)} m² de capacidad en lo que queda de semana`, cap && m2 > cap]
  ]);

  // El domingo solo sale si tiene algo: no se trabaja y no tiene capacidad.
  const filas = (dias, et) => dias.filter(d=>d.dia.getDay() !== 0 || d.n).map(d=>{
    const pct = d.cap ? Math.round(d.m2 / d.cap * 100) : null;
    return [esc(et) + " · " + esc(etDia(d.dia)), d.ops, d.lineas, n0(d.paneles), n2(d.m2),
      d.cap ? n2(d.cap) : "—",
      pct === null ? "—" : `<span class="${pct > 100 ? "sobre" : pct >= 85 ? "justo" : ""}">${pct} %</span>`];
  });
  const todasFilas = [...filas(M.estaSemana, "Esta semana"), ...filas(M.proxima, "Próxima")];
  const visibles = [...M.estaSemana, ...M.proxima].filter(d=>d.dia.getDay() !== 0 || d.n);
  tablaMini("#r-prog-tabla", ["Día","OP","Líneas","Paneles","m² programados","Capacidad m²","Carga"], todasFilas,
    visibles.map(d=>d.cap && d.m2 > d.cap ? "pend" : ""));
}

/** Lo que se le puede prometer hoy a un cliente que llame preguntando. */
function pintarEntrega(hechas, diasTrabajoCola, ritmo, m2Pend){
  const el = $("#r-entrega"); if(!el) return;

  /* EL PLAZO ES LO QUE HA PASADO, NO UNA CUENTA.
     Antes se ofrecia el mayor entre el historico y «lo que tardaria en vaciarse
     la cola», y salian 242 dias. Estaba mal de raiz por dos motivos:

       · vaciar la cola supone que un pedido nuevo espera a que se acabe TODO lo
         anterior, y aqui no se trabaja asi: se trabaja por prioridad, y una
         URGENTE se pone delante el mismo dia;
       · el plazo historico YA lleva dentro la espera en cola, porque se mide
         desde que entra el pedido. Coger el mayor de los dos era sumar la cola
         dos veces.

     Lo que se ha tardado de verdad, separado por prioridad, responde a la
     pregunta sin modelar nada: es lo que le paso a los pedidos que ya se
     entregaron. La carga de hoy se enseña al lado, como contexto, no como
     promesa. */
  const porPrio = new Map();
  hechas.forEach(({c})=>{
    const d = diasDeFabricacion(c);
    if(d === null) return;
    const p = String(c[C.PRIO] ?? "").trim().toUpperCase() || "SIN PRIORIDAD";
    (porPrio.get(p) || porPrio.set(p, []).get(p)).push(d);
  });
  const todos = [...porPrio.values()].flat();

  if(!todos.length){
    el.innerHTML = `<p class="mut">Todavía no hay líneas terminadas con fecha de
      entrada y de salida, así que no se puede decir cuánto se tarda sin
      inventarlo. Aparece en cuanto se cierren unas cuantas.</p>`;
    return;
  }

  const orden = ["URGENTE","ALTA","MEDIA","BAJA","SIN PRIORIDAD"];
  const filas = orden.filter(p => porPrio.has(p)).map(p=>{
    const xs = porPrio.get(p);
    return {prio:p, n:xs.length, med:mediana(xs), p90:percentil(xs, 0.9)};
  });
  const p90General = percentil(todos, 0.9);

  /* Con pocos casos un percentil no dice nada: se avisa en vez de dar una
     cifra con aire de precision. */
  const pocos = n => n < 8;

  el.innerHTML = `
    <div class="entrega">
      <div class="entrega-num"><b>${p90General}</b><span>días</span></div>
      <div class="entrega-txt">
        <p>Es lo que se ha tardado en <b>nueve de cada diez</b> de las
        ${todos.length} líneas ya entregadas, contando desde que entró el pedido
        hasta que salió. Lleva dentro la espera en cola, porque así lo vivió el
        cliente.</p>
      </div>
    </div>

    <table class="mini" style="margin-top:14px">
      <thead><tr><th>Prioridad</th><th>Líneas</th><th>La mitad se entregó en</th>
        <th>Nueve de cada diez</th></tr></thead>
      <tbody>${filas.map(f=>`<tr>
        <td>${f.prio === "SIN PRIORIDAD"
              ? `<span class="tag t-non">SIN PRIORIDAD</span>`
              : `<span class="tag t-${f.prio.toLowerCase()}">${esc(f.prio)}</span>`}</td>
        <td class="num">${f.n}</td>
        <td class="num">${f.med} d</td>
        <td class="num">${f.p90} d${pocos(f.n) ? ` <span class="mut">(pocos casos)</span>` : ""}</td>
      </tr>`).join("")}</tbody>
    </table>

    <div class="nota" style="margin-top:12px">
      <b>La carga de hoy</b>, que no es el plazo pero lo empuja:
      quedan <b>${n2(m2Pend)} m²</b> por fabricar y el ritmo de los últimos 60 días
      es de <b>${ritmo ? n2(ritmo) : "—"} m² por día de trabajo</b> —lunes a sábado
      medio día—, o sea <b>${diasTrabajoCola ?? "—"} días de taller</b> si no entrara
      nada más. Si esa cifra se dispara respecto a lo normal, los plazos de arriba
      se van a alargar antes de que el histórico lo note.
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
    /* Decir «171 líneas no cuadran» no sirve de nada si no se dice CON QUE no
       cuadran. Se enseña la formula que usa la hoja al lado de la que usa la
       aplicacion, y la desviacion tipica: con eso se ve de un vistazo si sobra
       un factor, si es el espesor, o si de verdad hay filas sueltas mal. */
    const laDeLaHoja = (typeof COLUMNAS_CALCULADAS !== "undefined" && COLUMNAS_CALCULADAS)
      ? (COLUMNAS_CALCULADAS.get(C.POLI_UNI) || COLUMNAS_CALCULADAS.get(C.POLI_TOT) || {}).plantilla
      : null;
    const desvios = raros.map(x=>x.desvioPct).sort((a,b)=>a-b);
    const tipica = desvios[Math.floor(desvios.length/2)];
    const todasIgual = desvios[0] > 0 &&
      (desvios[desvios.length-1] - desvios[0]) < Math.max(1, tipica * 0.5);

    aviso.className = "nota warn";
    aviso.innerHTML =
      `<b>${raros.length} línea(s)</b> en las que la hoja y la fórmula de aquí no dan
       lo mismo. Desviación típica: <b>${tipica} %</b>.` +
      (todasIgual
        ? ` Como es <b>casi la misma en todas</b>, no son filas sueltas mal escritas:
            hay un factor de diferencia entre las dos fórmulas.`
        : ` La desviación cambia mucho de una a otra, así que parecen casos sueltos
            y no un factor de diferencia.`) +
      `<div style="margin-top:8px;font-family:var(--mono);font-size:12px">
         la hoja: ${laDeLaHoja ? esc(laDeLaHoja) : "no se pudo leer su fórmula"}<br>
         aquí:    largo × ${MODELO.ancho} × espesor × ${MODELO.densidad}
       </div>` +
      `<div style="margin-top:8px">Para corregirlo hay que decidir cuál de las dos es
       la buena. Si manda la hoja, dime qué dice su fórmula y la ajusto aquí; si manda
       ésta, se arregla en la hoja y el aviso desaparece solo.</div>`;
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
    const hecha = terminadaP(c);
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
  const abiertas = todas.filter(({c})=>!terminadaP(c));
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
