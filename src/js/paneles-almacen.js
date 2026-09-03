/* Vista Almacen de paneleria: lo fabricado que espera salir
   Proyecto: Control de Produccion - Interfrigo

   Almacen mira una sola cosa: que hay hecho y a quien hay que entregarselo.
   Por eso se agrupa por OP y no por linea suelta — un pedido se despacha
   entero, no a trozos— y lo primero que se dice de cada OP es si esta
   COMPLETA, que es lo unico que decide si se puede cargar el camion.        */
"use strict";

/** Lo que fisicamente esta en el almacen: alguien pulso Terminar y todavia no
 *  se ha despachado.
 *
 *  Antes entraba tambien lo que estuviera al 100 % aunque nadie lo hubiera
 *  dado por terminado, y eso hacia aparecer en almacen cosas que seguian en la
 *  maquina. El 100 % dice lo que se ha hecho; el estado dice donde esta. */
const enAlmacen = ({c}) => !anuladaP(c) && !despachadaP(c) &&
  estadoDe(c) === ESTADO.TERMINADO;

/** Agrupa las lineas por numero de OP: es la unidad con la que se despacha. */
function porPedido(filas){
  const g = new Map();
  filas.forEach(x=>{
    const k = String(opBase(x.c[C.OP]) ?? x.c[C.OP] ?? "—");
    (g.get(k) || g.set(k, []).get(k)).push(x);
  });
  return g;
}

function renderAlmacen(){
  const q = $("#a-q").value.trim().toLowerCase();
  const soloCompletos = $("#a-completos") && $("#a-completos").checked;

  const vivas = activas().filter(({c})=>!anuladaP(c));
  const listas = vivas.filter(enAlmacen);

  // Un pedido esta completo cuando NINGUNA de sus lineas sigue en fabricacion.
  const pendientesPorOp = new Map();
  vivas.forEach(x=>{
    const k = String(opBase(x.c[C.OP]) ?? x.c[C.OP] ?? "—");
    if(!enAlmacen(x) && !despachadaP(x.c)) pendientesPorOp.set(k, (pendientesPorOp.get(k)||0)+1);
  });

  const grupos = [...porPedido(listas).entries()]
    .map(([op, xs])=>{
      const falta = pendientesPorOp.get(op) || 0;
      return {
        op, xs, falta,
        cliente: String(xs[0].c[C.CLI] ?? ""),
        m2: xs.reduce((s,x)=>s+(MODELO.metros(x.c)||0), 0),
        kg: xs.reduce((s,x)=>s+kgDe(x.c), 0),
        paneles: xs.reduce((s,x)=>s+(num(x.c[C.CANT])||0), 0),
        // El pedido lleva esperando desde que se acabo su ultima linea.
        desde: xs.map(x=>toDate(x.c[C.FFIN])).filter(Boolean).sort((a,b)=>b-a)[0] || null
      };
    })
    .filter(g=>{
      if(soloCompletos && g.falta > 0) return false;
      if(!filtroPasa("a-cli", g.cliente)) return false;
      if(!filtroPasaAlguno("a-prod", g.xs.map(x=>x.c[C.PROD]))) return false;
      if(q){
        const hay = [g.op, g.cliente, ...g.xs.map(x=>x.c[C.PROD])].join(" ").toLowerCase();
        if(!q.split(/\s+/).every(t=>hay.includes(t))) return false;
      }
      return true;
    })
    .sort((a,b)=>{
      // Primero los completos, y dentro de cada bloque el que lleva mas tiempo.
      if((a.falta>0) !== (b.falta>0)) return a.falta>0 ? 1 : -1;
      if(a.desde && b.desde && +a.desde !== +b.desde) return a.desde - b.desde;
      return String(a.op).localeCompare(String(b.op), "es", {numeric:true});
    });

  const completos = grupos.filter(g=>g.falta === 0);
  kpiCards("#a-kpis", [
    ["Líneas en almacén", listas.length, "Fabricadas y sin despachar"],
    ["Pedidos con algo listo", grupos.length, "OP con al menos una línea terminada"],
    ["Pedidos completos", completos.length,
     "Todas sus líneas fabricadas: se pueden despachar enteros", completos.length>0],
    ["m² en almacén", n2(grupos.reduce((s,g)=>s+g.m2,0)), ""],
    ["Paneles", n0(grupos.reduce((s,g)=>s+g.paneles,0)), ""],
    ["Clientes esperando", new Set(grupos.map(g=>g.cliente)).size, ""]
  ]);

  const espera = d => {
    if(!d) return "";
    const dias = Math.max(0, Math.round((new Date().setHours(0,0,0,0) - d) / 86400000));
    return dias === 0 ? "hoy" : dias === 1 ? "1 día" : `${dias} días`;
  };

  $("#a-lista").innerHTML = grupos.map(g=>`
    <article class="pedido ${g.falta ? "parcial" : "completo"}">
      <div class="pedido-top">
        <span class="op">OP ${esc(g.op)}</span>
        <span class="pedido-cli">${esc(g.cliente)}</span>
        ${g.falta
          ? `<span class="tag t-non" title="Aún se está fabricando parte del pedido">
              faltan ${g.falta} línea(s)</span>`
          : `<span class="tag t-alm">COMPLETO</span>`}
        <span class="grow"></span>
        <span class="mut">${n0(g.paneles)} panel(es) · ${n2(g.m2)} m²
          ${g.desde ? " · en almacén hace " + espera(g.desde) : ""}</span>
        <button class="btn sm pri" data-desp-op="${esc(g.op)}"
          title="Marcar despachadas todas las líneas listas de este pedido">Despachar</button>
      </div>
      <table class="mini"><tbody>${g.xs
        .sort((a,b)=>String(a.c[C.OP]).localeCompare(String(b.c[C.OP]),"es",{numeric:true}))
        .map(x=>`<tr>
          <td><span class="op">${esc(x.c[C.OP]??"")}</span></td>
          <td>${esc(x.c[C.PROD]??"")}</td>
          <td class="num">${n0(x.c[C.CANT])}</td>
          <td class="num">${n2(x.c[C.LARGO])} m</td>
          <td>${esc(x.c[C.RANU]??"")}</td>
          <td>${esc(x.c[C.CARA_A]??"")}/${esc(x.c[C.CARA_B]??"")}</td>
          <td class="num">${n2(MODELO.metros(x.c))} m²</td>
          <td class="sub">${esc(fmtDate(x.c[C.FFIN]))}</td>
          <td><button class="btn sm" data-desp="${x.r}">Despachar</button></td>
        </tr>`).join("")}</tbody></table>
    </article>`).join("") ||
    `<div class="empty">No hay nada fabricado esperando despacho con estos filtros.</div>`;
}

/* ------------------------------ despachar ------------------------------ */
$("#a-lista").addEventListener("click", async ev=>{
  const uno = ev.target.closest("[data-desp]");
  if(uno){
    const r = +uno.dataset.desp;
    const row = ROWS.find(x=>x.r===r); if(!row) return;
    try{
      await ponerEstado(r, ESTADO.DESPACHADO);
      toast(`Línea ${row.c[C.OP]} despachada`, "ok");
      renderAlmacen();
    }catch(e){ /* ponerEstado ya avisó y deshizo */ }
    return;
  }

  /* Despachar el pedido entero. Se pide confirmacion cuando esta incompleto:
     sacar media OP del almacen es una decision, no un descuido. */
  const todo = ev.target.closest("[data-desp-op]");
  if(!todo) return;
  const op = todo.dataset.despOp;
  const xs = activas().filter(x=>enAlmacen(x) &&
    String(opBase(x.c[C.OP]) ?? x.c[C.OP]) === op);
  if(!xs.length) return;

  const falta = activas().filter(x=>!anuladaP(x.c) && !despachadaP(x.c) && !enAlmacen(x) &&
    String(opBase(x.c[C.OP]) ?? x.c[C.OP]) === op).length;
  const aviso = falta
    ? `De la OP ${op} hay ${xs.length} línea(s) lista(s), pero ${falta} sigue(n) en fabricación.\n\n¿Despachar solo lo que está hecho?`
    : `¿Despachar las ${xs.length} línea(s) de la OP ${op}?`;
  if(!confirm(aviso)) return;

  todo.disabled = true;
  try{
    for(const x of xs) await ponerEstado(x.r, ESTADO.DESPACHADO);
    toast(`OP ${op}: ${xs.length} línea(s) despachada(s)`, "ok");
    lastHash = ""; renderAlmacen();
  }catch(e){ renderAlmacen(); }
  finally{ todo.disabled = false; }
});

const aComp = $("#a-completos");
if(aComp) aComp.addEventListener("change", renderAlmacen);
