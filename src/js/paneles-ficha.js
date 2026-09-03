/* Ficha de paneleria: creacion en varias lineas y edicion
   Proyecto: Control de Produccion - Interfrigo

   La diferencia de fondo con puertas: alli una ficha nueva son N puertas
   IGUALES y basta con repetir la misma fila. Un pedido de paneles casi nunca
   es asi — el mismo cliente pide 22 de 3" de 2,45 m y 8 de 4" de 3 m en el
   mismo pedido — y todas esas lineas comparten OP: 163-1, 163-2, 163-3.

   Por eso aqui el creador es un editor de lineas, no un contador.           */
"use strict";

/* ------------------------------ listas ------------------------------ */
const opcionesDe = (lista, sel) => (lista||[])
  .map(v=>`<option${sel===v?" selected":""}>${esc(v)}</option>`).join("");

/* EL PRODUCTO SE BUSCA, NO SE DESPLIEGA.
   Son catorce, en dos familias y con el espesor escrito de dos maneras —«3"» y
   «60 mm»—. En un desplegable eso es una lista larga por la que hay que bajar;
   escribiendo «60» aparecen los dos que llevan 60 y se acabo, que es como se
   hace en la propia hoja. Un datalist da esa busqueda sin dependencias. */
function llenarProductos(){
  const dl = $("#dl-productos");
  if(!dl) return;
  dl.innerHTML = (MODELO.listas.PRODUCTOS || [])
    .map(v=>`<option value="${esc(v)}">`).join("");
}

/** Sin espesor legible no hay metros cuadrados, ni poliuretano, ni sitio en la
 *  cola por montaje: es lo minimo que un producto tiene que decir. */
const productoValido = v =>
  typeof espesorMm === "function" ? espesorMm(v) !== null : !!String(v||"").trim();

/** Una fila del creador. Cada una acabara siendo una linea de la hoja. */
function lineaHTML(n){
  const L = MODELO.listas;
  return `<tr data-linea>
    <td class="ln" data-et="Línea">${n}</td>
    <td data-et="Prioridad"><select class="inp sm" data-f="PRIO">${opcionesDe(PRIORIDADES, "MEDIA")}</select></td>
    <td data-et="Cant"><input class="inp sm num" data-f="CANT" type="number" min="1" step="1" placeholder="0" required></td>
    <td data-et="Largo (m)"><input class="inp sm num" data-f="LARGO" type="number" min="0" step="0.001" placeholder="0,000" required></td>
    <td data-et="Producto"><input class="inp sm" data-f="PROD" list="dl-productos"
      placeholder="Buscar producto…" autocomplete="off" required></td>
    <td data-et="Ranurado"><select class="inp sm" data-f="RANU">${opcionesDe(L.RANURADOS)}</select></td>
    <td data-et="Cara A"><select class="inp sm" data-f="CARA_A">${opcionesDe(L.CARAS)}</select></td>
    <td data-et="Cara B"><select class="inp sm" data-f="CARA_B">${opcionesDe(L.CARAS)}</select></td>
    <td class="num mut" data-et="m²" data-calc="m2">—</td>
    <td class="num mut" data-et="kg PU" data-calc="kg">—</td>
    <td class="quitar"><button type="button" class="btn sm" data-quitar title="Quitar esta línea">✕</button></td>
  </tr>`;
}
function anadirLinea(){
  const tb = $("#n-lineas");
  tb.insertAdjacentHTML("beforeend", lineaHTML(tb.children.length + 1));
  recalcular();
}
function renumerar(){
  $$("#n-lineas tr").forEach((tr,i)=>{ tr.querySelector(".ln").textContent = i+1; });
}

/** Los metros y los kilos se ven mientras se escribe: son el dato con el que
 *  se decide, y esperar a guardar para verlos obliga a rehacer la ficha. */
function celdaDe(tr){
  const c = new Array(NCOL).fill("");
  tr.querySelectorAll("[data-f]").forEach(el=>{
    const k = el.dataset.f;
    c[C[k]] = (k==="CANT" || k==="LARGO") ? (num(el.value) ?? "") : el.value;
  });
  return c;
}
function recalcular(){
  let m2 = 0, kg = 0, paneles = 0;
  $$("#n-lineas tr").forEach(tr=>{
    const c = celdaDe(tr);
    const mm = MODELO.metros(c) || 0;
    const p = MODELO.poliuretano ? MODELO.poliuretano(c) : null;
    const kk = p ? p.total : 0;
    tr.querySelector('[data-calc="m2"]').textContent = mm ? n2(mm) : "—";
    tr.querySelector('[data-calc="kg"]').textContent = kk ? n2(kk) : "—";
    m2 += mm; kg += kk; paneles += num(c[C.CANT]) || 0;
  });
  const t = $("#n-totales");
  if(t){
    t.innerHTML = `<b>${$$("#n-lineas tr").length}</b> línea(s) · <b>${n0(paneles)}</b> panel(es)
      · <b>${n2(m2)}</b> m² · <b>${n2(kg)}</b> kg de poliuretano`;
  }
  hintOp();
}

/* ------------------------------ OP y destino ------------------------------ */
function nextOp(){
  const max = ROWS.filter(r=>rowActive(r.c))
    .reduce((m,r)=>Math.max(m, opBase(r.c[C.OP]) || 0), 0);
  return max + 1;
}
/** Primeras filas reutilizables (huecos) o las siguientes al final. */
function targetRows(n){
  const out = [];
  for(const {r,c} of ROWS){ if(!rowActive(c)) out.push(r); if(out.length>=n) break; }
  let last = ROWS.length ? ROWS[ROWS.length-1].r : 1;
  while(out.length < n) out.push(++last);
  return out;
}
/** Nombre de cada linea: con una sola, la OP va limpia; con varias, sufijada. */
const nombreOp = (op, i, total) => total > 1 ? `${op}-${i+1}` : String(op);

function hintOp(){
  const op = $("#n-op").value.trim();
  const q = $$("#n-lineas tr").length;
  const h = $("#n-hint");
  if(h){
    h.innerHTML = op && q
      ? `Se crearán <b>${q}</b> línea(s) bajo la OP <b>${esc(nombreOp(op,0,q))}</b>` +
        (q>1 ? ` … <b>${esc(nombreOp(op,q-1,q))}</b>` : "") +
        `, cliente <b>${esc($("#n-cli").value.trim().toUpperCase() || "—")}</b>`
      : "";
  }
  const t = $("#n-target");
  if(t && q){
    const f = targetRows(q);
    t.textContent = `Se escribirá en fila${q>1?"s":""} ${f[0]}${q>1?"–"+f[f.length-1]:""}`;
  }
}

/** El largo se dice con tres decimales: un panel de 2,455 m no es uno de
 *  2,46 m cuando hay que cortarlo. El resto de cifras siguen con dos. */
const n3 = v => { const n = num(v); return n===null ? "—" : n.toLocaleString("es-CO",
  {minimumFractionDigits:3, maximumFractionDigits:3}); };

function initForm(){
  llenarProductos();
  const tb = $("#n-lineas");
  if(tb && !tb.children.length) anadirLinea();
  // La fecha de creacion es SIEMPRE la de hoy, y se pone aqui y no solo al
  // abrir la ventana: si la aplicacion se deja abierta de un dia para otro,
  // la ventana ya estaba montada con la fecha de ayer.
  if($("#n-fecha") && !$("#n-fecha").value) $("#n-fecha").value = hoy();
  if($("#n-op") && !$("#n-op").value) $("#n-op").value = String(nextOp());
  hintOp();
}

/* ------------------------------ guardar la ficha ------------------------------ */
$("#form-new").addEventListener("submit", async ev=>{
  ev.preventDefault();
  const btn = $("#n-save"); btn.disabled = true;
  try{
    const op = $("#n-op").value.trim();
    const cli = $("#n-cli").value.trim().toUpperCase();
    /* La cotizacion y la OC son del PEDIDO, no de una linea: se repiten en
       todas las lineas de la ficha, que es como se busca luego «las lineas de
       la OC 4471» sin tener que saber a que numero de OP corresponde. */
    const cotiz = $("#n-cotiz") ? $("#n-cotiz").value.trim() : "";
    const oc    = $("#n-oc")    ? $("#n-oc").value.trim()    : "";
    const hayColumnas = typeof ESTADO_COLUMNAS === "undefined" || ESTADO_COLUMNAS.ok;
    // De hoy, no de lo que quedara escrito en el campo: es la fecha en la que
    // la ficha se crea, y es el dato del que cuelga toda la antiguedad.
    const fecha = hoy();
    $("#n-fecha").value = fecha;
    const trs = $$("#n-lineas tr");
    if(!trs.length) throw new Error("La ficha no tiene ninguna línea");
    if(!cli) throw new Error("Falta el cliente");
    /* Se comprueba ANTES de escribir nada: media ficha guardada con una línea
       sin espesor deja un pedido a medias en la hoja. */
    for(const [k, tr] of trs.entries()){
      const v = tr.querySelector('[data-f="PROD"]').value.trim();
      if(!productoValido(v)){
        throw new Error(`Línea ${k+1}: «${v || "sin producto"}» no dice el espesor. ` +
          `Elige uno de la lista (${(MODELO.listas.PRODUCTOS||[]).slice(0,3).join(", ")}…).`);
      }
    }

    const filas = targetRows(trs.length);
    await ensureRows(Math.max(...filas));

    const data = [], casillas = [];
    trs.forEach((tr, k)=>{
      const r = filas[k];
      const c = celdaDe(tr);
      c[C.FECHA] = fecha;
      c[C.OP] = nombreOp(op, k, trs.length);
      c[C.CLI] = cli;
      // Los tres procesos nacen pendientes: FALSE de verdad, no texto, o la
      // hoja no dibuja la casilla.
      PROCS.forEach(p=>{ c[p.i] = false; });
      c[C.M2] = MODELO.metros(c) || "";
      c[C.STATUS] = statusValue(r, c);
      c[C.DESP] = ESTADO.PROCESO;
      if(hayColumnas){ c[C.COTIZ] = cotiz; c[C.OC] = oc; }
      /* K, L, V y W son formula de la hoja y NO se escriben. Dejarlas vacias no
         bastaba: escribir "" en una celda no la deja en paz, la borra, y con
         ella la formula. Se escribe en tramos que las saltan. */
      data.push(...tramosFila(MODELO, r, c));
      PROCS.forEach(p=>casillas.push({fila:r, col:p.i, aplica:true}));
    });

    await writeCells(data);
    setCheckboxUI(casillas);            // una fila nueva no hereda el formato
    logBulk(filas.map((r,k)=>({accion:"CREA", op:nombreOp(op, k, trs.length), fila:r,
                               campo:"línea", antes:"", despues:"creada"})));
    toast(`${filas.length} línea(s) creada(s) en la OP ${op}`, "ok");
    $("#ov-nueva").classList.add("hide");
    lastHash = ""; await refresh(false);

    // Listo para la siguiente ficha, sin arrastrar la anterior.
    $("#n-lineas").innerHTML = ""; anadirLinea();
    $("#n-cli").value = "";
    if($("#n-cotiz")) $("#n-cotiz").value = "";
    if($("#n-oc"))    $("#n-oc").value = "";
    $("#n-op").value = String(nextOp());
    $("#n-fecha").value = hoy();
    hintOp();
  }catch(e){ toast(e.message, "err"); }
  finally{ btn.disabled = false; }
});

$("#n-add").onclick = anadirLinea;
$("#n-lineas").addEventListener("click", ev=>{
  const q = ev.target.closest("[data-quitar]");
  if(!q) return;
  const trs = $$("#n-lineas tr");
  if(trs.length <= 1){ toast("La ficha necesita al menos una línea", "err"); return; }
  q.closest("tr").remove();
  renumerar(); recalcular();
});
$("#n-lineas").addEventListener("input", recalcular);
$("#n-lineas").addEventListener("change", recalcular);
$("#n-cli").addEventListener("input", hintOp);
$("#n-reset").onclick = ()=>{
  $("#n-lineas").innerHTML = ""; anadirLinea();
  $("#n-cli").value = "";
  if($("#n-cotiz")) $("#n-cotiz").value = "";
  if($("#n-oc"))    $("#n-oc").value = "";
  $("#n-fecha").value = hoy();
  $("#n-op").value = String(nextOp());
  hintOp();
};

/* ============================== EDITAR UNA LINEA ==============================
   Se puede cambiar todo menos la OP y el cliente. No es una restriccion
   tecnica: son los dos datos con los que el pedido se identifica fuera de la
   aplicacion —en el correo, en la remision, en la llamada del cliente— y si
   cambian aqui, deja de poder cruzarse con nada.                            */
const CAMPOS_EDITABLES = [
  {k:"FECHA",  et:"Fecha",     tipo:"texto"},
  {k:"PRIO",   et:"Prioridad", tipo:"lista", lista:()=>PRIORIDADES},
  {k:"CANT",   et:"Cantidad",  tipo:"numero"},
  {k:"LARGO",  et:"Largo (m)", tipo:"numero"},
  {k:"PROD",   et:"Producto",  tipo:"busca", lista:()=>MODELO.listas.PRODUCTOS},
  {k:"RANU",   et:"Ranurado",  tipo:"lista", lista:()=>MODELO.listas.RANURADOS},
  {k:"CARA_A", et:"Cara A",    tipo:"lista", lista:()=>MODELO.listas.CARAS},
  {k:"CARA_B", et:"Cara B",    tipo:"lista", lista:()=>MODELO.listas.CARAS},
  {k:"DESP",   et:"Estado",    tipo:"lista", lista:()=>MODELO.listas.ESTADOS},
  {k:"FDESP",  et:"Fecha de despacho", tipo:"texto"},
  // Solo si la hoja tiene de verdad esas columnas; ver paneles-listas.js.
  {k:"COTIZ",  et:"Cotización", tipo:"texto", propia:true},
  {k:"OC",     et:"Orden de compra", tipo:"texto", propia:true}
];

/** Los campos que se pueden editar hoy: los propios solo si hay columna. */
const camposEditables = () => CAMPOS_EDITABLES.filter(f => !f.propia ||
  (typeof ESTADO_COLUMNAS !== "undefined" && ESTADO_COLUMNAS.ok && C[f.k] !== undefined));

function openDet(r){
  const row = ROWS.find(x=>x.r===r);
  if(!row){ toast("Esa línea ya no está", "err"); return; }
  detRow = r;
  const c = row.c;

  $("#d-op").textContent = c[C.OP] ?? "";
  $("#d-cli").textContent = c[C.CLI] ?? "";
  $("#d-fila").textContent = "fila " + r;

  $("#d-campos").innerHTML = camposEditables().map(f=>{
    const v = c[C[f.k]] ?? "";
    // Un campo con muchas opciones se busca escribiendo, igual que en la hoja.
    if(f.tipo === "busca"){
      return `<label class="f"><span>${esc(f.et)}</span>
        <input class="inp" data-d="${f.k}" list="dl-productos" autocomplete="off"
          value="${esc(String(v).trim())}"></label>`;
    }
    if(f.tipo === "lista"){
      const lista = f.lista() || [];
      const cur = String(v).trim();
      const conocido = lista.some(x=>x.toUpperCase() === cur.toUpperCase());
      return `<label class="f"><span>${esc(f.et)}</span>
        <select class="inp" data-d="${f.k}">
          <option value=""${cur?"":" selected"}>—</option>` +
          lista.map(x=>`<option${x.toUpperCase()===cur.toUpperCase()?" selected":""}>${esc(x)}</option>`).join("") +
          (cur && !conocido ? `<option selected>${esc(cur)}</option>` : "") +
        `</select></label>`;
    }
    const val = f.tipo === "numero" ? (num(v) ?? "") : (f.k==="FECHA"||f.k==="FDESP" ? fmtDate(v) : v);
    // El largo se corta al milimetro: tres decimales, no dos.
    const paso = f.k === "LARGO" ? "0.001" : "0.01";
    return `<label class="f"><span>${esc(f.et)}</span>
      <input class="inp" data-d="${f.k}" ${f.tipo==="numero"?`type="number" step="${paso}"`:""}
        value="${esc(val)}"></label>`;
  }).join("");

  // Los procesos, en el mismo sitio donde se ven: se marcan aqui igual que en
  // la tabla, y por el mismo camino, para que las fechas se sellen solas.
  $("#d-procs").innerHTML = PROCS.map(p=>{
    const v = tri(c[p.i]);
    return `<button type="button" class="p ${v===true?"on":"off"}" data-dp="${p.i}"
      title="${p.k}">${v===true?"✓ ":""}${esc(p.k)}</button>`;
  }).join("");

  const m2 = MODELO.metros(c) || 0;
  const kg = kgDe(c);
  $("#d-calc").innerHTML = `<b>${n2(m2)}</b> m² · <b>${n2(kg)}</b> kg de poliuretano
    · avance <b>${Math.round(progreso(c).pct*100)}%</b>`;

  renderHist(c[C.OP], r);
  $("#ov-det").classList.remove("hide");
}

$("#d-procs").addEventListener("click", async ev=>{
  const b = ev.target.closest("[data-dp]");
  if(!b || detRow === null) return;
  const i = +b.dataset.dp;
  const row = ROWS.find(x=>x.r===detRow); if(!row) return;
  const cur = tri(row.c[i]);
  if(cur === null) return;
  await setProc(detRow, i, cur !== true);
  openDet(detRow);                       // se repinta con las fechas ya selladas
});

$("#form-det").addEventListener("submit", async ev=>{
  ev.preventDefault();
  const btn = $("#d-save"); btn.disabled = true;
  const row = ROWS.find(x=>x.r===detRow);
  /* Se anota lo que habia antes de tocarlo: la pantalla se actualiza al
     momento, y si la escritura falla hay que poder devolverla a la verdad. */
  const previos = {};
  try{
    if(!row) throw new Error("Esa línea ya no está");
    const r = row.r, ups = [], cambios = [];

    $$("#d-campos [data-d]").forEach(el=>{
      const k = el.dataset.d, i = C[k];
      const bruto = el.value.trim();
      const nuevo = (k==="CANT" || k==="LARGO") ? numCell(bruto) : bruto;
      const antes = row.c[i] ?? "";
      // Las fechas se comparan ya formateadas: la hoja las devuelve como
      // numero de serie y sin esto toda apertura parecia un cambio.
      const igual = (k==="FECHA" || k==="FDESP")
        ? fmtDate(antes) === String(nuevo)
        : String(antes) === String(nuevo);
      if(igual) return;
      previos[i] = antes;
      row.c[i] = nuevo;
      ups.push({a1:`${col(k)}${r}`, v:[[nuevo]]});
      cambios.push({campo: (CAMPOS_EDITABLES.find(f=>f.k===k)||{}).et || k,
                    antes: (k==="FECHA"||k==="FDESP") ? fmtDate(antes) : String(antes),
                    despues: String(nuevo)});
    });

    // El producto tampoco puede quedarse sin espesor al editar.
    const prod = $$("#d-campos [data-d]").find(e=>e.dataset.d === "PROD");
    if(prod && !productoValido(prod.value.trim())){
      throw new Error(`«${prod.value.trim() || "sin producto"}» no dice el espesor. ` +
        `Elige uno de la lista.`);
    }

    if(!ups.length){ $("#ov-det").classList.add("hide"); return; }

    // Cambiar cantidad o largo cambia los metros: se reescriben en la misma
    // tanda, porque es un dato derivado y no puede quedarse desfasado.
    if(ups.some(u=>u.a1.startsWith(col("CANT")) || u.a1.startsWith(col("LARGO")))){
      const m2 = MODELO.metros(row.c) || "";
      row.c[C.M2] = m2;
      ups.push({a1:`${col("M2")}${r}`, v:[[m2]]});
    }
    writeSeq++;
    await writeCells(ups);
    logChanges("EDITA", row.c[C.OP], r, cambios);
    toast(`${cambios.length} cambio(s) guardado(s)`, "ok");
    $("#ov-det").classList.add("hide");
    lastHash = ""; await refresh(false);
  }catch(e){
    // Se deshace lo pintado: si no, quedaban a la vista valores no guardados.
    if(row) Object.entries(previos).forEach(([i,v])=>{ row.c[i] = v; });
    toast(e.message, "err");
    if(typeof render === "function") render();
  }
  finally{ btn.disabled = false; }
});

/* Cerrar cualquier ventana: un solo sitio, para que ninguna se quede sin
   boton de salida al añadir la siguiente. */
$$("[data-close]").forEach(b=>b.onclick = ()=>{
  b.closest(".ov").classList.add("hide");
  if(b.closest("#ov-det")) detRow = null;
});
