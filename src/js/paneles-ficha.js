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

/** Una fila del creador. Cada una acabara siendo una linea de la hoja. */
function lineaHTML(n){
  const L = MODELO.listas;
  return `<tr data-linea>
    <td class="ln" data-et="Línea">${n}</td>
    <td data-et="Prioridad"><select class="inp sm" data-f="PRIO">${opcionesDe(PRIORIDADES, "MEDIA")}</select></td>
    <td data-et="Cant"><input class="inp sm num" data-f="CANT" type="number" min="1" step="1" placeholder="0" required></td>
    <td data-et="Largo (m)"><input class="inp sm num" data-f="LARGO" type="number" min="0" step="0.01" placeholder="0,00" required></td>
    <td data-et="Producto"><select class="inp sm" data-f="PROD" required>${opcionesDe(L.PRODUCTOS)}</select></td>
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

function initForm(){
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
    // De hoy, no de lo que quedara escrito en el campo: es la fecha en la que
    // la ficha se crea, y es el dato del que cuelga toda la antiguedad.
    const fecha = hoy();
    $("#n-fecha").value = fecha;
    const trs = $$("#n-lineas tr");
    if(!trs.length) throw new Error("La ficha no tiene ninguna línea");
    if(!cli) throw new Error("Falta el cliente");

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
      /* K y L son formula de la hoja. Se dejan VACIAS a proposito: si la
         formula esta extendida, la hoja las rellena sola; escribir un numero
         encima la borraria y el consumo dejaria de cuadrar con la hoja. */
      c[C.POLI_UNI] = ""; c[C.POLI_TOT] = "";
      data.push({a1:`A${r}:${LAST_COL}${r}`, v:[c]});
      PROCS.forEach(p=>casillas.push({fila:r, col:p.i, aplica:true}));
    });

    await writeCells(data);
    setCheckboxUI(casillas);            // una fila nueva no hereda el formato
    logBulk(data.map((d,k)=>({accion:"CREA", op:d.v[0][C.OP], fila:filas[k],
                              campo:"línea", antes:"", despues:"creada"})));
    toast(`${data.length} línea(s) creada(s) en la OP ${op}`, "ok");
    $("#ov-nueva").classList.add("hide");
    lastHash = ""; await refresh(false);

    // Listo para la siguiente ficha, sin arrastrar la anterior.
    $("#n-lineas").innerHTML = ""; anadirLinea();
    $("#n-cli").value = "";
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
  {k:"PROD",   et:"Producto",  tipo:"lista", lista:()=>MODELO.listas.PRODUCTOS},
  {k:"RANU",   et:"Ranurado",  tipo:"lista", lista:()=>MODELO.listas.RANURADOS},
  {k:"CARA_A", et:"Cara A",    tipo:"lista", lista:()=>MODELO.listas.CARAS},
  {k:"CARA_B", et:"Cara B",    tipo:"lista", lista:()=>MODELO.listas.CARAS},
  {k:"DESP",   et:"Estado",    tipo:"lista", lista:()=>MODELO.listas.ESTADOS},
  {k:"FDESP",  et:"Fecha de despacho", tipo:"texto"}
];

function openDet(r){
  const row = ROWS.find(x=>x.r===r);
  if(!row){ toast("Esa línea ya no está", "err"); return; }
  detRow = r;
  const c = row.c;

  $("#d-op").textContent = c[C.OP] ?? "";
  $("#d-cli").textContent = c[C.CLI] ?? "";
  $("#d-fila").textContent = "fila " + r;

  $("#d-campos").innerHTML = CAMPOS_EDITABLES.map(f=>{
    const v = c[C[f.k]] ?? "";
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
    return `<label class="f"><span>${esc(f.et)}</span>
      <input class="inp" data-d="${f.k}" ${f.tipo==="numero"?'type="number" step="0.01"':""}
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
