/* Inventario de almacen: insumos, bodegas y kardex de movimientos
   Proyecto: Inventario de Almacen - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== INVENTARIO DE ALMACÉN ==============================
   Insumos y materia prima. Tres pestañas en la misma hoja, que la app crea y
   siembra si no existen:

     INSUMOS      catálogo maestro, se edita a mano como MODELOS
     BODEGAS      lista de almacenes, se edita a mano
     MOVIMIENTOS  kardex: SOLO se le agregan filas, nunca se editan ni se borran

   La existencia NO se guarda en ninguna celda: se calcula sumando el kardex.

       existencia(insumo, bodega) = suma de CANTIDAD de sus movimientos

   Se hace así por tres razones concretas:
   1. Dos personas registrando a la vez no se pisan: append nunca compite por
      celda, así que aquí no hace falta nada parecido a writeSeq.
   2. Todo saldo es explicable: quién, cuándo, contra qué OP o remisión.
   3. Un error no se borra, se compensa con un AJUSTE, y la historia queda.

   CANTIDAD va firmada: positiva entra a esa bodega, negativa sale de ella.
   Un TRASLADO son DOS filas con el mismo ID: una negativa en el origen y una
   positiva en el destino. Así el cálculo del saldo sigue siendo una simple suma.

   El almacén es un PRODUCTO APARTE, con su propia página (inventario.html) y su
   propio arranque (inventario-app.js). No lee la pestaña de OPs ni depende de que
   exista una sola puerta: la OP de una salida es texto libre. Aun así, como el
   resto de los módulos, no da por hecho que sus elementos estén en el DOM. */

const INS_TAB = "INSUMOS";
const BOD_TAB = "BODEGAS";
const MOV_TAB = "MOVIMIENTOS";
/* UNIDAD es la unidad BASE en que se guarda el saldo (m, und, kg...).
   PRESENTACION es como se compra o se maneja ese insumo ("Perfil de 6 m") y
   FACTOR cuantas unidades base trae una presentacion (6). Asi se puede registrar
   "2 perfiles" y que en el kardex entren 12 m: el saldo SIEMPRE va en unidad
   base, que es lo unico que se puede sumar sin ambiguedad. FACTOR vacio o 1
   significa que ese insumo no tiene presentacion aparte. */
/* ORIGEN y LARGO son el despiece. Un tramo declara de que perfil sale al
   cortarlo y cuanto mide cada pieza, en la unidad del padre. Con eso "1 und de
   3,5 m" se puede restar de "6 m de barra", que es la resta que antes no se
   podia hacer porque las unidades no coincidian.

   La relacion vive en el HIJO y no en una pestana aparte porque es una
   propiedad suya: un tramo de 3,5 m ES un pedazo de IGO005. Guardarla dos veces
   seria invitar a que las dos copias se contradigan. Un hijo tiene un unico
   origen; si algun dia una pieza pudiera salir de dos perfiles distintos, ahi
   si haria falta una tabla de verdad. */
const INS_HEAD = ["CODIGO", "NOMBRE", "CATEGORIA", "UNIDAD", "PRESENTACION", "FACTOR",
                  "ORIGEN", "LARGO", "MINIMO", "MAXIMO", "ACTIVO"];
const BOD_HEAD = ["NOMBRE", "ACTIVO"];
/* UNIDAD y PRESENTACIONES no hacen falta para calcular el saldo —CANTIDAD ya va
   en unidad base— pero sin ellas la hoja no se entiende sola: "12" no dice si
   son metros o perfiles. Se guardan para que el kardex se lea sin la app. */
const MOV_HEAD = ["FECHA", "USUARIO", "TIPO", "CODIGO", "BODEGA", "CANTIDAD",
                  "UNIDAD", "PRESENTACIONES", "OP", "DOCUMENTO", "TERCERO",
                  "OBSERVACIONES", "ID"];

const BOD_SEED = [["PRINCIPAL", true], ["PLANTA", true]];

/* Cada tipo de movimiento declara cómo se comporta y qué campos pide el
   formulario. Añadir un tipo nuevo es añadir una entrada aquí. */
const MOV_TIPOS = {
  "ENTRADA": {
    sig:+1, cls:"t-des", ico:"↓",
    ayuda:"Llegó material del proveedor. Suma a la bodega que lo recibe.",
    bodLbl:"Bodega que recibe",
    doc:{lbl:"Factura / remisión de compra", req:false},
    ter:{lbl:"Proveedor", req:false}
  },
  /* ENSAMBLE (antes SALIDA OP) transforma un insumo en otros. De un perfil de
     6 m salen dos de 3, o uno de 2,50 y otro de 3,50. Es un solo hecho, no dos:
     por eso se escribe como una fila negativa del que se corta y una positiva
     por cada producto, TODAS con el mismo ID. Lo que no cuadra es la merma, y
     se muestra en vez de esconderla. */
  "ENSAMBLE": {
    sig:-1, cls:"t-alta", ico:"✂",
    ayuda:"Cortar o transformar un insumo en otros. Se descuenta el que entra y se dan de alta los que salen.",
    bodLbl:"Bodega donde se hace",
    ensamble:true,
    op:{lbl:"OP a la que va", req:false},
    doc:{lbl:"Vale / orden de corte", req:false}
  },
  "SALIDA REMISION": {
    sig:-1, cls:"t-alta", ico:"↑",
    ayuda:"Salió material hacia un tercero amparado en una remisión.",
    bodLbl:"Bodega de donde sale",
    doc:{lbl:"N° de remisión", req:true},
    ter:{lbl:"Cliente / destino", req:true}
  },
  "TRASLADO": {
    sig:0, cls:"t-alm", ico:"⇄",
    ayuda:"Movimiento entre bodegas. No cambia el total: resta en el origen y suma en el destino.",
    bodLbl:"Bodega de origen",
    dest:true,
    doc:{lbl:"N° de remisión de traslado", req:false}
  },
  /* Se puede devolver de una OP o de una remision: son origenes distintos y el
     campo que hay que pedir no es el mismo. */
  "DEVOLUCION": {
    sig:+1, cls:"t-sep", ico:"↩",
    ayuda:"Material que regresa al almacén, venga de una OP o de una remisión.",
    bodLbl:"Bodega que lo recibe",
    origen:true
  },
  /* Un ajuste cambia el saldo sin que haya entrado ni salido nada fisicamente:
     es la unica operacion que puede tapar un error o un faltante, asi que la
     reserva un administrador. */
  "AJUSTE": {
    sig:0, cls:"t-media", ico:"=",
    ayuda:"Conteo físico. Escribe lo que REALMENTE hay y la app calcula la diferencia sola.",
    bodLbl:"Bodega contada",
    conteo:true,
    obsReq:true,
    soloAdmin:true
  }
};

let INSUMOS = [], BODEGAS = [], MOVS = [], invReady = false;

const fmtNum = v => Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);

/* Un sello de fecha y hora, venga como venga de la hoja.
   Se escribe "07/09/2026 13:20" con USER_ENTERED, asi que Sheets lo reconoce
   como fecha-hora y lo guarda como NUMERO DE SERIE. Al leer con
   UNFORMATTED_VALUE vuelve 46272.5555…, que no le dice nada a nadie.
   Se escribe asi a proposito: en la hoja queda una fecha de verdad, ordenable y
   filtrable a mano. Lo que hay que arreglar es la lectura, no la escritura.
   serialToDate() de util.js tira la parte decimal, que es justo la hora. */
function fmtSello(v){
  if(v === null || v === undefined || v === "") return "";
  if(typeof v === "number" && isFinite(v)){
    const d = serialToDate(v);
    let mins = Math.round((v - Math.floor(v)) * 1440);
    if(mins >= 1440) mins = 1439;             // 23:59:59 redondeado no salta de dia
    return `${fmt(d)} ${p2(Math.floor(mins / 60))}:${p2(mins % 60)}`;
  }
  return String(v);
}
const red6 = n => Math.round(n * 1e6) / 1e6;

/* ---------- carga ---------- */

/** Crea la pestaña si no existe y la siembra. Devuelve las filas de datos. */
async function ensureTab(titulo, head, seed){
  const meta = await api("?fields=sheets.properties.title");
  if(!(meta.sheets||[]).some(x=>x.properties.title===titulo)){
    await api(":batchUpdate", {method:"POST", body: JSON.stringify({
      requests:[{addSheet:{properties:{title:titulo, gridProperties:{frozenRowCount:1}}}}]})});
    await api(`/values/${encodeURIComponent(`'${titulo}'!A1`)}?valueInputOption=USER_ENTERED`,
      {method:"PUT", body: JSON.stringify({values:[head, ...(seed||[])]})});
  }
  const col = A1(head.length-1);
  const j = await api(`/values/${encodeURIComponent(`'${titulo}'!A2:${col}`)}?valueRenderOption=UNFORMATTED_VALUE`);
  return j.values || [];
}

/* Igual que loadMovs: si la lectura falla, se conserva el catálogo anterior en
   vez de dejar la vista vacía. Solo se sustituye cuando la lectura fue completa. */
async function loadInventario(){
  if(!$("#v-exist")) return;                // esta página no trae la vista
  try{
    const ins = await ensureTab(INS_TAB, INS_HEAD, null);
    const bod = await ensureTab(BOD_TAB, BOD_HEAD, BOD_SEED);
    INSUMOS = ins
      .filter(r=>String(r[0]||"").trim())
      .map(r=>({cod:String(r[0]).trim().toUpperCase(), nom:String(r[1]||"").trim(),
                cat:String(r[2]||"").trim(), uni:String(r[3]||"").trim()||"und",
                pres:String(r[4]||"").trim(), factor:num(r[5]),
                origen:String(r[6]||"").trim().toUpperCase(), largo:num(r[7]),
                min:num(r[8]), max:num(r[9]), activo: tri(r[10])!==false}))
      .filter(i=>i.activo);
    BODEGAS = bod
      .filter(r=>String(r[0]||"").trim() && tri(r[1])!==false)
      .map(r=>String(r[0]).trim().toUpperCase());
    if(!BODEGAS.length) BODEGAS = ["PRINCIPAL"];
    await loadMovs();
    invReady = true;
    fillInvLists();
  }catch(e){
    console.warn("INVENTARIO:", e.message);
    // Solo se declara "no listo" si nunca llegó a cargar. Si ya había datos
    // buenos, se sigue trabajando con ellos y el error se muestra arriba.
    if(!INSUMOS.length && !MOVS.length) invReady = false;
    throw e;
  }
}

/* Un fallo de lectura NO debe vaciar lo que ya se veía. Si el token caduca o se
   cae la red a mitad de un refresco, dejar la tabla en ceros haría creer que el
   almacén está vacío, que es la lectura más peligrosa posible: alguien saldría a
   comprar material que sí hay, o daría por perdido un saldo. Se conserva lo
   último bueno y se propaga el error para que quien llamó lo diga en pantalla. */
async function loadMovs(){
  try{
    await ensureTab(MOV_TAB, MOV_HEAD, null);
    const j = await api(`/values/${encodeURIComponent(`'${MOV_TAB}'!A2:M`)}?valueRenderOption=UNFORMATTED_VALUE`);
    MOVS = (j.values||[])
      .map(r=>({fecha:r[0]??"", user:String(r[1]||""), tipo:String(r[2]||"").trim().toUpperCase(),
                cod:String(r[3]||"").trim().toUpperCase(), bod:String(r[4]||"").trim().toUpperCase(),
                cant:num(r[5])||0, uni:String(r[6]||"").trim(), pres:num(r[7]),
                op:String(r[8]??"").trim(), doc:String(r[9]??"").trim(),
                ter:String(r[10]??"").trim(), obs:String(r[11]??"").trim(),
                id:String(r[12]??"").trim()}))
      .filter(m=>m.cod)
      .reverse();                       // el más reciente primero
  }catch(e){
    console.warn("MOVIMIENTOS:", e.message);
    throw e;                            // MOVS se queda como estaba
  }
}

/* ---------- saldos ---------- */

/** Mapa "CODIGO|BODEGA" -> cantidad. Es la única forma de conocer la existencia. */
function saldos(){
  const m = new Map();
  for(const v of MOVS){
    const k = v.cod+"|"+v.bod;
    m.set(k, (m.get(k)||0) + v.cant);
  }
  return m;
}
const saldoDe = (s, cod, bod) => red6(s.get(cod+"|"+bod)||0);
const saldoTotal = (s, cod) => red6(BODEGAS.reduce((a,b)=>a+(s.get(cod+"|"+b)||0),0));
const insDe = cod => INSUMOS.find(i=>i.cod===cod) || null;

/* ---------- despiece ----------
   Las piezas que se pueden sacar cortando un insumo son SOLO las que lo
   declaran como origen. No es una sugerencia: al cortar IGO005 no se puede
   elegir cualquier cosa del catalogo, que es como hoy se cuela un error. */
const hijosDe = cod => INSUMOS.filter(i=>i.origen === cod && i.largo > 0)
                              .sort((a,b)=>a.largo - b.largo);

/** Cuanto material del padre se comen las piezas ya elegidas. */
const consumoEns = () => red6(ensLineas.reduce((a,l)=>{
  const d = insDe(l.cod);
  return a + (d && d.largo > 0 ? l.cant * d.largo : 0);
}, 0));

/** Si alguna pieza no dice cuanto mide, no hay cuadre posible: no se inventa. */
const todasMiden = () => ensLineas.length > 0 &&
  ensLineas.every(l=>{ const d = insDe(l.cod); return d && d.largo > 0; });

/**
 * Combinaciones de piezas que consumen EXACTAMENTE una unidad de corte.
 *
 * Se CALCULAN, no se guardan. El dia que se de de alta un tramo de 1,5 m, la
 * combinacion "1,5 + 1,5 + 3" aparece sola; una tabla de patrones guardados
 * habria que acordarse de actualizarla, y el dia que nadie se acuerde mentiria.
 *
 * Se plantea sobre UNA barra y no sobre el total: asi es como se corta en
 * planta, y asi el conteo no se dispara al registrar veinte barras.
 */
function combinaciones(hijos, total, tope){
  const res = [], m = hijos.length;
  if(!m || !(total > 0) || total > 120) return res;
  const uso = new Array(m).fill(0);
  (function ir(k, resta){
    if(res.length >= tope) return;
    if(red6(resta) === 0){ res.push(uso.slice()); return; }
    if(k >= m) return;
    const max = Math.floor(red6(resta) / hijos[k].largo + 1e-9);
    for(let q = max; q >= 0; q--){
      uso[k] = q;
      ir(k + 1, red6(resta - q * hijos[k].largo));
      if(res.length >= tope){ uso[k] = 0; return; }
    }
    uso[k] = 0;
  })(0, total);
  // Menos piezas primero: cortar una barra en dos es mejor noticia que en cinco.
  return res.sort((a,b)=>a.reduce((x,y)=>x+y,0) - b.reduce((x,y)=>x+y,0));
}

/** Códigos que aparecen en el kardex pero no están en el catálogo. */
function huerfanos(){
  const set = new Set(INSUMOS.map(i=>i.cod));
  return [...new Set(MOVS.map(m=>m.cod))].filter(c=>!set.has(c));
}

/** Añade filas al kardex. Un solo append: o entran todas o no entra ninguna. */
async function appendMovs(filas){
  await api(`/values/${encodeURIComponent(`'${MOV_TAB}'!A:M`)}:append`+
            `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {method:"POST", body: JSON.stringify({values:filas})});
}

/* ---------- vista ---------- */

function invFiltrado(){
  const q = $("#i-q").value.trim().toLowerCase();
  const cat = $("#i-cat").value, bod = $("#i-bod").value, exi = $("#i-exi").value;
  const s = saldos();
  return INSUMOS.filter(i=>{
    if(cat && i.cat!==cat) return false;
    if(q && !(i.cod+" "+i.nom+" "+i.cat).toLowerCase().includes(q)) return false;
    const v = bod ? saldoDe(s,i.cod,bod) : saldoTotal(s,i.cod);
    if(exi==="bajo" && !(i.min!==null && v < i.min)) return false;
    if(exi==="cero" && v!==0) return false;
    if(exi==="neg"  && v>=0)  return false;
    if(exi==="hay"  && v<=0)  return false;
    if(exi==="alto" && !(i.max!==null && v > i.max)) return false;
    return true;
  }).map(i=>({i}));
}

function renderInv(){
  if(!$("#i-tabla")) return;
  if(!invReady){
    $("#i-tabla").innerHTML = `<tbody><tr><td class="empty">Cargando inventario…</td></tr></tbody>`;
    return;
  }
  const s = saldos();
  const bodFiltro = $("#i-bod").value;
  const cols = bodFiltro ? [bodFiltro] : BODEGAS;
  const lista = invFiltrado();

  const bajo = INSUMOS.filter(i=>i.min!==null && saldoTotal(s,i.cod) < i.min).length;
  const neg  = INSUMOS.filter(i=>saldoTotal(s,i.cod) < 0).length;
  const alto = INSUMOS.filter(i=>i.max!==null && saldoTotal(s,i.cod) > i.max).length;
  const mes0 = new Date(); mes0.setDate(1); mes0.setHours(0,0,0,0);
  const delMes = MOVS.filter(m=>{ const d=toDate(m.fecha); return d && d>=mes0; }).length;
  kpiCards("#i-kpis", [
    ["Insumos activos", INSUMOS.length, "Filas con ACTIVO distinto de FALSE en la pestaña INSUMOS"],
    ["Bajo mínimo", bajo, "Existencia total por debajo del MINIMO del catálogo", bajo>0],
    ["En negativo", neg, "Saldo imposible: falta registrar una entrada o sobra una salida", neg>0],
    ["Sobre máximo", alto, "Existencia total por encima del MAXIMO: capital parado en bodega", alto>0],
    ["Bodegas", cols.length, BODEGAS.join(" · ")],
    ["Movimientos del mes", delMes, "Filas agregadas al kardex desde el día 1"],
    ["Kardex total", MOVS.length, "Filas históricas en la pestaña MOVIMIENTOS"]
  ]);

  const cel = v => `<td class="num ${v<0?"neg":(v===0?"z":"")}">${v===0?"—":fmtNum(v)}</td>`;
  const puedeMover = typeof puede !== "function" || puede("almacen");

  const filas = lista.map(({i})=>{
    const tot = saldoTotal(s, i.cod);
    const low = i.min!==null && tot < i.min;
    const hi  = i.max!==null && tot > i.max;
    const est = tot<0 ? `<span class="tag t-alta">negativo</span>`
              : low   ? `<span class="tag t-media">bajo mínimo</span>`
              : hi    ? `<span class="tag t-alm">sobre máximo</span>`
              : tot===0 ? `<span class="tag t-non">sin existencia</span>`
              : `<span class="tag t-des">ok</span>`;
    return `<tr class="${tot<0||low?"low":(hi?"alta":"")}">
      <td class="stick"><span class="op">${esc(i.cod)}</span></td>
      <td>${esc(i.nom)}<div class="sub">${esc(i.cat||"sin categoría")}</div></td>
      <td class="sub">${esc(i.uni)}</td>
      ${cols.map(b=>cel(saldoDe(s,i.cod,b))).join("")}
      <td class="num"><b>${fmtNum(tot)}</b></td>
      <td class="num sub">${enPresentacion(i, tot) || "—"}</td>
      <td class="num sub">${i.min===null?"—":fmtNum(i.min)}</td>
      <td class="num sub">${i.max===null?"—":fmtNum(i.max)}</td>
      <td>${est}</td>
      <td>${puedeMover?`<button class="btn sm" data-inv="${esc(i.cod)}">Mover</button>`:""}</td></tr>`;
  }).join("");

  const orf = huerfanos().map(cod=>{
    const tot = saldoTotal(s, cod);
    return `<tr class="otras" title="Este código tiene movimientos pero no está en la pestaña INSUMOS">
      <td class="stick"><span class="op">${esc(cod)}</span></td>
      <td colspan="2" class="sub">No está en el catálogo — agrégalo en la pestaña INSUMOS</td>
      ${cols.map(b=>cel(saldoDe(s,cod,b))).join("")}
      <td class="num"><b>${fmtNum(tot)}</b></td><td class="num sub">—</td>
      <td class="num sub">—</td><td class="num sub">—</td>
      <td><span class="tag t-non">sin catalogar</span></td><td></td></tr>`;
  }).join("");

  const vacio = `<tr><td colspan="${cols.length+9}" class="empty">Ningún insumo coincide con el filtro.</td></tr>`;
  $("#i-tabla").innerHTML =
    `<thead><tr><th class="stick">Código</th><th>Insumo</th><th>Un.</th>`+
    cols.map(b=>`<th class="num" title="Existencia en ${esc(b)}">${esc(b)}</th>`).join("")+
    `<th class="num">Total</th>`+
    `<th class="num" title="La misma existencia contada en su presentación">En unidades</th>`+
    `<th class="num" title="MINIMO del catálogo">Mín.</th>`+
    `<th class="num" title="MAXIMO del catálogo: por encima es capital parado">Máx.</th>`+
    `<th>Estado</th><th></th></tr></thead>`+
    `<tbody>${filas || (orf?"":vacio)}${orf}</tbody>`;

  contador("#i-cnt", lista.length, INSUMOS.length, ["i-cat","i-bod","i-exi"], "i-q");
  renderKardex();
}

function kardexFiltrado(){
  const q = $("#k-q").value.trim().toLowerCase();
  const tp = $("#k-tipo").value, bd = $("#k-bod").value;
  const d1 = toDate($("#k-desde").value), d2 = toDate($("#k-hasta").value);
  if(d2) d2.setHours(23,59,59,999);
  return MOVS.filter(m=>{
    if(tp && m.tipo!==tp) return false;
    if(bd && m.bod!==bd) return false;
    if(d1||d2){
      const d = toDate(m.fecha);
      if(!d) return false;
      if(d1 && d<d1) return false;
      if(d2 && d>d2) return false;
    }
    if(q && !(m.cod+" "+m.op+" "+m.doc+" "+m.ter+" "+m.user+" "+m.obs).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderKardex(){
  if(!$("#k-tabla")) return;
  const todos = kardexFiltrado();
  const list = todos.slice(0, 400);
  $("#k-tabla").innerHTML =
    `<thead><tr><th>Fecha</th><th>Tipo</th><th>Código</th><th>Bodega</th><th class="num">Cant.</th>`+
    `<th>OP</th><th>Documento</th><th>Tercero</th><th>Usuario</th><th>Observaciones</th></tr></thead><tbody>`+
    (list.length ? list.map(m=>{
      const t = MOV_TIPOS[m.tipo];
      const ins = insDe(m.cod);
      return `<tr>
        <td class="sub">${esc(fmtSello(m.fecha))}</td>
        <td><span class="tag ${t?t.cls:"t-non"}">${t?t.ico+" ":""}${esc(m.tipo)}</span></td>
        <td><span class="op">${esc(m.cod)}</span>${ins?`<div class="sub">${esc(ins.nom)}</div>`:""}</td>
        <td class="sub">${esc(m.bod)}</td>
        <td class="num ${m.cant<0?"neg":"pos"}">${m.cant>0?"+":""}${fmtNum(m.cant)}</td>
        <td class="op">${esc(m.op)}</td><td class="sub">${esc(m.doc)}</td>
        <td class="sub">${esc(m.ter)}</td><td class="sub">${esc(m.user)}</td>
        <td class="sub">${esc(m.obs)}</td></tr>`;
    }).join("")
    : `<tr><td colspan="10" class="empty">Sin movimientos que coincidan.</td></tr>`)+`</tbody>`;
  contador("#k-cnt", list.length, MOVS.length, ["k-tipo","k-bod"], "k-q");
  if(todos.length>400) $("#k-cnt").innerHTML += ` · más antiguos, en el CSV`;
}

/* ---------- alta de insumos ----------
   Antes solo se podia crear un producto editando la pestana INSUMOS a mano, lo
   que obliga a salir de la aplicacion y a acordarse del orden de las columnas.
   Se crea ACTIVO y con existencia cero: la existencia sale del kardex, nunca de
   una casilla, asi que para darle saldo inicial hay que registrar una ENTRADA o
   un AJUSTE — que es justamente lo que deja rastro de donde salio ese numero. */

function abrirNuevoInsumo(cod){
  if(typeof puede === "function" && !puede("almacen")){
    toast("Tu rol no permite crear insumos", "err"); return;
  }
  ["ni-cod","ni-nom","ni-cat","ni-min","ni-max","ni-pres","ni-factor",
   "ni-origen","ni-largo"].forEach(id=>{ const e = $("#"+id); if(e) e.value=""; });
  $("#ni-uni").value = "und";
  if(cod) $("#ni-cod").value = String(cod).toUpperCase();
  $("#ni-warn").classList.add("hide");
  // Las categorias que ya se usan, para no acabar con "Herrajes" y "herraje".
  $("#dl-cat").innerHTML = [...new Set(INSUMOS.map(i=>i.cat).filter(Boolean))].sort()
    .map(c=>`<option value="${esc(c)}">`).join("");
  // De que se puede cortar: cualquier insumo que no sea ya una pieza de otro.
  const dlo = $("#dl-origen");
  if(dlo) dlo.innerHTML = INSUMOS.filter(i=>!i.origen)
    .map(i=>`<option value="${esc(i.cod)}">${esc(i.nom)}</option>`).join("");
  $("#ov-nins").classList.remove("hide");
  setTimeout(()=>$("#ni-cod").focus(), 60);
}

async function guardarInsumo(){
  if(typeof puede === "function" && !puede("almacen")){
    toast("Tu rol no permite crear insumos", "err"); return;
  }
  const cod = $("#ni-cod").value.trim().toUpperCase();
  const nom = $("#ni-nom").value.trim();
  const cat = $("#ni-cat").value.trim();
  const uni = $("#ni-uni").value.trim() || "und";
  const mn = num($("#ni-min").value), mx = num($("#ni-max").value);
  const pres = $("#ni-pres").value.trim(), fac = num($("#ni-factor").value);
  const org = ($("#ni-origen") ? $("#ni-origen").value : "").trim().toUpperCase();
  const lrg = $("#ni-largo") ? num($("#ni-largo").value) : null;
  const w = $("#ni-warn");
  const falla = txt => { w.innerHTML = txt; w.classList.remove("hide"); };

  if(!cod) return falla("El <b>código</b> es obligatorio: es la llave del insumo.");
  if(!nom) return falla("Ponle un <b>nombre</b>, o nadie sabrá qué es al buscarlo.");
  if(insDe(cod)) return falla(`Ya existe un insumo con el código <b>${esc(cod)}</b>: `+
    `«${esc(insDe(cod).nom)}». Los códigos no se pueden repetir.`);
  // Un codigo que ya tiene movimientos pero no ficha: crearlo la adopta, y eso
  // esta bien, pero conviene decirlo para que nadie crea que empieza en cero.
  const yaMovido = MOVS.some(m => m.cod === cod);
  if(mn !== null && mx !== null && mx < mn)
    return falla("El <b>máximo</b> no puede ser menor que el mínimo.");
  // Una presentación sin factor no se puede convertir, y un factor sin nombre no
  // se puede rotular. O van las dos cosas o no va ninguna.
  if(pres && (fac === null || fac <= 0))
    return falla("Pusiste la presentación «" + esc(pres) + "» pero no su <b>factor</b>: "+
      "cuántos " + esc(uni) + " trae una. Sin eso no se puede convertir.");
  if(fac !== null && fac > 0 && !pres)
    return falla("Pusiste un factor pero no el <b>nombre</b> de la presentación "+
      "(por ejemplo «Perfil de 6 m»).");
  // El despiece va completo o no va: sin largo el sistema sabria de donde sale
  // la pieza pero no cuanto se come, que es justo lo que hay que cuadrar.
  if(org && !insDe(org))
    return falla(`No existe el insumo <b>${esc(org)}</b> que pusiste como origen. `+
      "Créalo primero, o deja el campo vacío si este no sale de ningún corte.");
  if(org === cod && org)
    return falla("Un insumo no puede salir de sí mismo.");
  if(org && insDe(org) && insDe(org).origen)
    return falla(`<b>${esc(org)}</b> ya es una pieza de <b>${esc(insDe(org).origen)}</b>. `+
      "Los cortes son de un solo nivel: elige el material del que se corta de verdad.");
  if(org && (lrg === null || lrg <= 0))
    return falla(`Dijiste que sale de <b>${esc(org)}</b> pero no cuánto mide. `+
      `Pon el <b>largo</b> en ${esc(insDe(org) ? insDe(org).uni : "la unidad del origen")}.`);
  if(lrg !== null && lrg > 0 && !org)
    return falla("Pusiste un largo pero no de qué insumo se corta. "+
      "Llena el <b>origen</b>, o borra el largo.");
  w.classList.add("hide");

  const btn = $("#ni-save"); btn.disabled = true; setSync("busy", "Creando…");
  try{
    await api(`/values/${encodeURIComponent(`'${INS_TAB}'!A:K`)}:append`+
              `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {method:"POST", body: JSON.stringify({values: [[cod, nom, cat, uni,
        pres, fac===null?"":fac, org, lrg===null?"":lrg,
        mn===null?"":mn, mx===null?"":mx, true]]})});
    INSUMOS.push({cod, nom, cat, uni, pres, factor:fac, origen:org, largo:lrg,
                  min:mn, max:mx, activo:true});
    INSUMOS.sort((a,b)=>a.cod.localeCompare(b.cod));
    fillInvLists();
    $("#ov-nins").classList.add("hide");
    renderInv();
    toast(yaMovido
      ? `${cod} creado — ya tenía movimientos, así que arrastra su existencia`
      : org
        ? `${cod} creado. Ya aparece al cortar ${org}.`
        : `${cod} creado. Registra una ENTRADA o un AJUSTE para darle existencia.`, "ok");
    setSync("ok", "Guardado");
  }catch(e){
    falla("No se pudo crear: " + esc(e.message));
    setSync("err", "Error");
  }finally{ btn.disabled = false; }
}

/* ---------- modal de movimiento ---------- */

let mvTipo = "ENTRADA";
let mvModo = "pres";                 // "pres" = por presentación, "base" = en unidad base
let ensLineas = [];                  // productos que salen de un ENSAMBLE
let mvPaso = 1;                      // en pantalla chica el formulario va por pasos
let saldosTodo = false;              // ¿se muestran tambien las bodegas en cero?

/** ¿Un insumo se despieza en piezas catalogadas? Entonces el consumo se deduce. */
const modoDespiece = cod => {
  const t = MOV_TIPOS[mvTipo];
  return !!(t && t.ensamble && cod && hijosDe(cod).length);
};
let comboEns = null;

function llenaSel(sel, arr, vacio){
  $(sel).innerHTML = (vacio?`<option value="">${esc(vacio)}</option>`:"")+
    arr.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("");
}

/* ---------- presentación ----------
   Un insumo puede manejarse en dos escalas: la unidad base en que se guarda el
   saldo (m) y la presentación con que se compra o se corta (un perfil de 6 m).
   El kardex SIEMPRE guarda unidad base: es lo único que se puede sumar sin
   ambigüedad. La presentación es solo la forma de teclearlo. */

/* El saldo se guarda en unidad base, pero en bodega se cuenta en barras. Las
   dos lecturas son la misma cifra vista de dos maneras: 100 m son 20 barras de
   5 m. Se enseñan juntas para no obligar a nadie a dividir de cabeza. */
function enPresentacion(i, base){
  if(!tieneFactor(i) || base === null) return "";
  return `${fmtNum(red6(base / i.factor))} × ${esc(i.pres || "presentación")}`;
}

/** ¿Este insumo tiene presentación propia, distinta de la unidad base? */
const tieneFactor = i => !!(i && i.factor !== null && i.factor > 0 && i.factor !== 1);

/** Cuánto vale en unidad base lo que se acaba de teclear. */
function aBase(i, cant){
  if(cant === null) return null;
  return (mvModo === "pres" && tieneFactor(i)) ? red6(cant * i.factor) : cant;
}

/** Cómo se llama lo que se está tecleando: "perfiles" o "m". */
const rotuloCant = i =>
  (mvModo === "pres" && tieneFactor(i)) ? (i.pres || "presentación") : (i ? i.uni : "");

/* ---------- movimiento ---------- */

function abrirMov(cod){
  if(typeof puede === "function" && !puede("almacen")){
    toast("Tu rol no permite registrar movimientos de almacén","err"); return;
  }
  if(!invReady){ toast("El inventario aún no ha cargado","err"); return; }
  if(!INSUMOS.length){ toast("No hay insumos en el catálogo. Crea uno con + Nuevo insumo.","err"); return; }
  ensLineas = [];
  // Los tipos que el rol no permite no se ofrecen: es más honesto que dejar
  // pulsar y responder que no.
  $("#mv-tipos").innerHTML = Object.keys(MOV_TIPOS)
    .filter(k => !MOV_TIPOS[k].soloAdmin || esAdmin())
    .map(k=>`<button type="button" class="pc" data-mvt="${esc(k)}"><span class="bx">${MOV_TIPOS[k].ico}</span><span class="nm">${esc(k)}</span></button>`).join("");
  $$("#mv-tipos .pc").forEach(b=>b.onclick=()=>setMvTipo(b.dataset.mvt));
  llenaSel("#mv-bod", BODEGAS);
  llenaSel("#mv-bod2", BODEGAS);
  if(BODEGAS.length>1) $("#mv-bod2").value = BODEGAS[1];
  /* Sugerencias de OP. El inventario es independiente: si esta página no lleva
     el listado de puertas cargado, la OP se escribe a mano y ya está. Nunca se
     bloquea el registro por no tener OPs. */
  let ops = [];
  try{
    if(typeof ROWS !== "undefined" && ROWS.length && typeof anulada === "function"){
      ops = [...new Set(ROWS.filter(x=>!anulada(x.c) && !completa(x.c))
        .map(x=>String(x.c[C.OP]??"").trim()).filter(Boolean))];
    }
  }catch(e){ ops = []; }
  if(!ops.length) ops = [...new Set(MOVS.map(m=>m.op).filter(Boolean))];
  $("#dl-mvop").innerHTML = ops.map(o=>`<option value="${esc(o)}">`).join("");
  $("#dl-mvter").innerHTML = [...new Set(MOVS.map(m=>m.ter).filter(Boolean))]
    .map(t=>`<option value="${esc(t)}">`).join("");
  ["mv-cant","mv-op","mv-doc","mv-ter","mv-obs","me-q","me-cant"].forEach(id=>$("#"+id).value="");
  $("#me-ins").value = "";
  if(!MOV_TIPOS[mvTipo] || (MOV_TIPOS[mvTipo].soloAdmin && !esAdmin())) mvTipo = "ENTRADA";
  if(comboMov) comboMov.elegir(cod || (INSUMOS[0] && INSUMOS[0].cod) || "");
  saldosTodo = false;
  setMvTipo(mvTipo);
  setPaso(1);
  $("#ov-mov").classList.remove("hide");
  setTimeout(()=>$("#mv-cant").focus(), 60);
}

const esAdmin = () => typeof puede !== "function" || puede("*") || puede("aprobar");

/* ---------- el formulario por pasos ----------
   En un telefono el formulario entero no cabe ni rodando comodo: tipo, insumo,
   existencias, bodega, piezas, documentos y observaciones son demasiadas
   decisiones para una pantalla. Se parte en dos: primero QUE y DONDE, despues
   CUANTO. En pantalla grande no se parte nada —ahi si cabe— y el corte no
   existe: es la misma pagina, solo que no se esconde la mitad. */
const chico = () => window.matchMedia("(max-width:720px)").matches;

function setPaso(p){
  const ch = chico();
  mvPaso = ch ? p : 1;
  $$("#form-mov .sec").forEach(sec=>{
    const d = sec.dataset.paso;
    sec.classList.toggle("hide", ch && !!d && +d !== mvPaso);
  });
  const nx = $("#mv-next"), pv = $("#mv-prev"), sv = $("#mv-save");
  if(nx) nx.hidden = !ch || mvPaso !== 1;
  if(pv) pv.hidden = !ch || mvPaso !== 2;
  if(sv) sv.hidden = ch && mvPaso === 1;
  // Sin esto el paso 2 se abre a media altura, donde quedo el dedo.
  const ov = $("#ov-mov"); if(ov) ov.scrollTop = 0;
}

function setMvTipo(k){
  const t = MOV_TIPOS[k];
  if(!t) return;
  if(t.soloAdmin && !esAdmin()){
    toast("Solo un administrador puede hacer ajustes de inventario","err");
    return;
  }
  mvTipo = k;
  $$("#mv-tipos .pc").forEach(b=>b.classList.toggle("on", b.dataset.mvt===k));
  $("#mv-ayuda").textContent = t.ayuda;
  $("#mv-bod-lbl").textContent = t.bodLbl;
  $("#mv-bod2-w").classList.toggle("hide", !t.dest);
  $("#mv-origen-w").classList.toggle("hide", !t.origen);
  $("#mv-ens-w").classList.toggle("hide", !t.ensamble);
  $("#mv-doc-w").classList.toggle("hide", !docDe(t));
  $("#mv-ter-w").classList.toggle("hide", !terDe(t));
  const d = docDe(t), r = terDe(t);
  if(d){ $("#mv-doc-lbl").textContent = d.lbl; $("#mv-doc-lbl").className = d.req?"req":""; }
  if(r){ $("#mv-ter-lbl").textContent = r.lbl; $("#mv-ter-lbl").className = r.req?"req":""; }
  const o = opDe(t);
  $("#mv-op-w").classList.toggle("hide", !o);
  if(o){ $("#mv-op-lbl").textContent = o.lbl; $("#mv-op-lbl").className = o.req?"req":""; }
  $("#mv-obs-lbl").className = t.obsReq ? "req" : "";
  $("#mv-obs-lbl").textContent = t.obsReq ? "Motivo del ajuste" : "Observaciones";
  if(t.ensamble) pintarEnsamble();
  mvSaldo();
}

/* Una DEVOLUCION pide OP o remisión según de dónde venga; el resto de los tipos
   lo llevan fijo. Se resuelve aquí para no repetir el condicional por todas partes. */
const origenDev = () => $("#mv-origen").value;
function opDe(t){
  if(t.origen) return origenDev()==="OP" ? {lbl:"OP de la que vuelve", req:true} : null;
  return t.op || null;
}
function docDe(t){
  if(t.origen) return origenDev()==="REMISION" ? {lbl:"N° de remisión de la que vuelve", req:true} : null;
  return t.doc || null;
}
function terDe(t){
  if(t.origen) return origenDev()==="REMISION" ? {lbl:"Cliente / origen", req:false} : null;
  return t.ter || null;
}

/** Existencia del insumo en cada bodega. Siempre a la vista. */
function pintarSaldos(i){
  const caja = $("#mv-saldos");
  if(!i){ caja.classList.add("hide"); return; }
  const s = saldos();
  const tot = saldoTotal(s, i.cod);
  /* Las bodegas en cero no dicen nada y ocupan la mitad de la tira. Se guardan
     detras de un boton: casi siempre el material esta en una o dos bodegas. */
  const conSaldo = BODEGAS.filter(b=>saldoDe(s, i.cod, b) !== 0);
  const vacias = BODEGAS.length - conSaldo.length;
  const muestra = (saldosTodo || !conSaldo.length) ? BODEGAS : conSaldo;
  caja.innerHTML = muestra.map(b=>{
    const v = saldoDe(s, i.cod, b);
    return `<span class="saldo ${v<0?"neg":(v===0?"z":"")}">
      <i>${esc(b)}</i><b>${fmtNum(v)}</b></span>`;
  }).join("") +
    (!saldosTodo && vacias ? `<button type="button" class="saldo mas" id="mv-smas"
       title="Ver las bodegas sin existencia"><i>&plus;${vacias}</i><b>en cero</b></button>` : "") +
    `<span class="saldo tot"><i>TOTAL</i><b>${fmtNum(tot)} ${esc(i.uni)}</b></span>` +
    (tieneFactor(i) ? `<span class="saldo pres"><i>${esc(i.pres||"presentación")}</i>
       <b>${fmtNum(red6(tot / i.factor))}</b></span>` : "");
  caja.classList.remove("hide");
}

/** Muestra la conversión, el saldo resultante y los avisos. */
function mvSaldo(){
  const t = MOV_TIPOS[mvTipo], s = saldos();
  const cod = $("#mv-ins").value, bod = $("#mv-bod").value;
  const i = insDe(cod);
  pintarSaldos(i);

  /* Con piezas catalogadas no se teclea cuanto se corta: sale de lo que sacaste.
     2 de 2,5 y 2 de 3,5 son 12 ml, y punto. Preguntarlo ademas era pedir dos
     veces el mismo dato y abrir la puerta a que los dos no coincidieran. */
  const despz = modoDespiece(cod);
  $("#mv-cant-w").classList.toggle("hide", despz);
  // Un campo required escondido bloquea el envio sin decir por que.
  $("#mv-cant").required = !despz;
  const hc = $("#mv-h2-cuanto");
  if(hc) hc.textContent = despz ? "Qué sacaste" : "Cuánto";
  const he = $("#mv-ens-h");
  if(he) he.textContent = despz ? "Piezas que salieron" : "Qué sale de ahí";

  // El selector de presentación solo tiene sentido si el insumo declara factor.
  const hayF = tieneFactor(i) && !despz;
  $("#mv-modo-w").classList.toggle("hide", !hayF);
  if(!hayF && !despz) mvModo = "base";
  $$("#mv-modo button").forEach(b=>b.classList.toggle("a", b.dataset.modo===mvModo));
  $("#mv-cant-lbl").textContent = t.conteo
    ? `Existencia física contada (${rotuloCant(i)})`
    : `Cantidad (${rotuloCant(i)})`;

  const c = num($("#mv-cant").value);
  const base = despz ? (consumoEns() || null) : aBase(i, c);

  $("#mv-conv").innerHTML = (hayF && mvModo==="pres" && base!==null)
    ? `${fmtNum(c)} × ${fmtNum(i.factor)} = <b>${fmtNum(base)} ${esc(i.uni)}</b> es lo que entra al kardex`
    : "";

  const act = saldoDe(s, cod, bod);
  let txt = "";
  if(t.conteo && base!==null){
    txt = `Se registrará un ajuste de <b>${red6(base-act)>0?"+":""}${fmtNum(red6(base-act))} ${esc(i?i.uni:"")}</b>`;
  }else if(t.dest && base!==null){
    const d = $("#mv-bod2").value;
    txt = `${esc(bod)} quedará en <b>${fmtNum(red6(act-base))}</b> · `+
          `${esc(d)} en <b>${fmtNum(red6(saldoDe(s,cod,d)+base))}</b>`;
  }else if(base!==null && t.sig!==0){
    txt = `${esc(bod)} quedará en <b>${fmtNum(red6(act + t.sig*base))} ${esc(i?i.uni:"")}</b>`;
  }
  $("#mv-saldo").innerHTML = txt;

  if(t.ensamble) pintarEnsamble();

  /* Aviso de saldo negativo: se avisa, no se bloquea. La realidad física manda,
     y a veces el registro va atrasado respecto a lo que ya pasó en planta. */
  const w = $("#mv-warn");
  const sale = t.sig<0 || t.dest;
  if(sale && base!==null && base>act){
    w.innerHTML = `<b>Ojo:</b> vas a sacar ${fmtNum(base)} ${esc(i?i.uni:"")} y en ${esc(bod)} `+
                  `solo hay ${fmtNum(act)}. El saldo quedará en ${fmtNum(red6(act-base))}. `+
                  `Puedes continuar, pero revisa si falta registrar una entrada.`;
    w.classList.remove("hide");
  }else w.classList.add("hide");
}

/* ---------- ensamble ---------- */

function anadirLineaEns(){
  const cod = $("#me-ins").value;
  const c = num($("#me-cant").value);
  if(!cod) return toast("Elige el producto que resulta","err");
  if(c === null || c <= 0) return toast("La cantidad debe ser mayor que cero","err");
  if(cod === $("#mv-ins").value) return toast("El producto que resulta no puede ser el mismo que se corta","err");
  const ya = ensLineas.find(l=>l.cod===cod);
  if(ya) ya.cant = red6(ya.cant + c); else ensLineas.push({cod, cant:c});
  $("#me-q").value=""; $("#me-ins").value=""; $("#me-cant").value="";
  pintarEnsamble();
  $("#me-q").focus();
}

/**
 * El bloque "que sale de ahi", en uno de dos modos.
 *
 * Si el insumo que se corta tiene piezas declaradas (hijos con ORIGEN y LARGO),
 * se muestran ESAS y solo esas, con un contador cada una y el cuadre en vivo.
 * Si no tiene ninguna, se cae al buscador libre de siempre: hay ensambles que
 * no son cortes de barra y no tienen por que estar catalogados de antemano.
 */
function pintarEnsamble(){
  const i = insDe($("#mv-ins").value);
  const hijos = i ? hijosDe(i.cod) : [];
  // Con despiece el consumo se deduce; sin el, se teclea como siempre.
  const consumido = hijos.length ? consumoEns() : aBase(i, num($("#mv-cant").value));
  const wl = $("#mv-ens-libre"), wh = $("#mv-ens-hijos");
  // Sin el bloque en la pagina no hay modo despiece que valga: se cae al libre.
  const despiece = hijos.length > 0 && !!wh;
  if(wl) wl.classList.toggle("hide", despiece);
  if(wh) wh.classList.toggle("hide", !despiece);

  if(despiece){
    // Si cambio el insumo que se corta, lo elegido para el anterior no vale.
    ensLineas = ensLineas.filter(l=>hijos.some(h=>h.cod === l.cod));
    pintarPiezas(i, hijos);
    pintarSugerencias(i, hijos);
    $("#mv-ens-lista").innerHTML = "";
  }else{
    pintarListaEns();
  }
  pintarCuadre(i, consumido, despiece);
}

/** Un contador por pieza posible. Nada mas: el catalogo manda. */
function pintarPiezas(padre, hijos){
  const caja = $("#mv-ens-piezas");
  if(!caja) return;
  const q = c => { const l = ensLineas.find(x=>x.cod === c); return l ? l.cant : 0; };
  caja.innerHTML = hijos.map(h=>{
    const v = q(h.cod);
    return `<div class="pz${v ? " on" : ""}">
      <b class="lg">${fmtNum(h.largo)} ${esc(padre.uni)}</b>
      <span class="cd">${esc(h.cod)}</span>
      <span class="nm">${esc(h.nom)}</span>
      <span class="stp">
        <button type="button" class="btn sm" data-pz="${esc(h.cod)}" data-d="-1"
                aria-label="Quitar una">&minus;</button>
        <input class="inp" type="number" step="1" min="0" value="${v}"
               data-pzc="${esc(h.cod)}" aria-label="${esc(h.cod)}">
        <button type="button" class="btn sm" data-pz="${esc(h.cod)}" data-d="1"
                aria-label="Añadir una">+</button>
      </span></div>`;
  }).join("");
}

/** Cuantas piezas de un tipo salen del corte. Cero = no sale. */
function setPieza(cod, cuantas){
  const v = Math.max(0, Math.round(cuantas || 0));
  const k = ensLineas.findIndex(l=>l.cod === cod);
  if(v === 0){ if(k >= 0) ensLineas.splice(k, 1); }
  else if(k >= 0) ensLineas[k].cant = v;
  else ensLineas.push({cod, cant:v});
  // mvSaldo(), no pintarEnsamble(): el consumo deducido mueve tambien la linea
  // de "PRINCIPAL quedara en...", y esa la escribe mvSaldo.
  mvSaldo();
}

/** Los despieces de UNA barra que no dejan retal, como atajos de llenado. */
function pintarSugerencias(padre, hijos){
  const caja = $("#mv-ens-sug");
  if(!caja) return;
  const unidad = tieneFactor(padre) ? padre.factor : 0;
  const combos = unidad > 0 ? combinaciones(hijos, unidad, 6) : [];
  if(!combos.length){ caja.innerHTML = ""; return; }
  caja.innerHTML =
    `<span class="mut">Sin dejar retal:</span>` +
    combos.map(c=>{
      const txt = c.map((q, k)=> q ? `${q}&times;${fmtNum(hijos[k].largo)}` : null)
                   .filter(Boolean).join(" + ");
      return `<button type="button" class="btn sm sug" data-combo="${c.join(",")}"
        title="Añade estas piezas">+ ${txt}</button>`;
    }).join("");
}

/** Suma un despiece sugerido a lo que ya haya: tocarlo dos veces son dos barras. */
function aplicarCombo(lista){
  const i = insDe($("#mv-ins").value);
  const hijos = i ? hijosDe(i.cod) : [];
  lista.forEach((q, k)=>{
    if(!(q > 0) || !hijos[k]) return;
    const l = ensLineas.find(x=>x.cod === hijos[k].cod);
    if(l) l.cant += q; else ensLineas.push({cod:hijos[k].cod, cant:q});
  });
  mvSaldo();
}

/** El cuadre del corte, o la merma de siempre si las piezas no dicen cuanto miden. */
function pintarCuadre(i, consumido, despiece){
  const m = $("#mv-merma");
  if(!i || consumido === null || !ensLineas.length){ m.innerHTML = ""; return; }

  /* Con LARGO se puede cuadrar de verdad: una pieza de 3,5 m se come 3,5 m de
     la barra, aunque se cuente en unidades. Es justo el caso que antes se
     quedaba sin calcular por medirse en unidades distintas. */
  if(despiece){
    /* Aqui ya no hay descuadre posible: el consumo ES la suma de las piezas. Lo
       unico que puede salir raro es que no den barras enteras, y eso si importa
       —significa un retal que nadie va a apuntar—, asi que se dice. */
    const piezas = ensLineas.reduce((a,l)=>a + l.cant, 0);
    const una = piezas === 1;
    let txt = `${piezas} pieza${una?"":"s"} &middot; consume `+
              `<b>${fmtNum(consumido)} ${esc(i.uni)}</b> de ${esc(i.cod)}`;
    if(tieneFactor(i)){
      const barras = red6(consumido / i.factor);
      const enteras = Math.abs(barras - Math.round(barras)) < 1e-9;
      txt += enteras
        ? ` = <span class="cu-ok">${fmtNum(Math.round(barras))} &times; ${esc(i.pres || "barra")}</span>`
        : ` = ${fmtNum(barras)} &times; ${esc(i.pres || "barra")} &middot; `+
          `<span class="cu-av">quedaría un retal de `+
          `${fmtNum(red6((Math.ceil(barras) - barras) * i.factor))} ${esc(i.uni)}</span>`;
    }
    m.innerHTML = txt;
    return;
  }
  if(todasMiden()){
    const usa = consumoEns();
    const resto = red6(consumido - usa);
    const piezas = ensLineas.reduce((a,l)=>a + l.cant, 0);
    const una = piezas === 1;
    const det = `${piezas} pieza${una?"":"s"} que se ${una?"come":"comen"} `+
                `<b>${fmtNum(usa)} ${esc(i.uni)}</b> de ${fmtNum(consumido)}`;
    m.innerHTML = resto === 0
      ? `<span class="cu-ok">&#10003; Corte exacto</span> &middot; ${det}. No sobra material.`
      : resto > 0
        ? `<span class="cu-av">Sobran ${fmtNum(resto)} ${esc(i.uni)}</span> &middot; ${det}. `+
          `Las medidas están pensadas para no dejar retal: revisa las cantidades.`
        : `<span class="cu-mal">Faltan ${fmtNum(-resto)} ${esc(i.uni)}</span> &middot; ${det}. `+
          `Estás sacando más material del que cortas.`;
    return;
  }

  /* Sin LARGO no hay equivalencia. La merma se calcula solo si todo se mide
     igual; si no, se dice que entra y que sale, y no se inventa un numero. */
  const uniOrigen = i.uni;
  const mismaUnidad = ensLineas.every(l=>{
    const d = insDe(l.cod);
    return d && d.uni === uniOrigen;
  });
  const suma = red6(ensLineas.reduce((a,l)=>a + l.cant, 0));
  if(!mismaUnidad){
    m.innerHTML = `Consumes <b>${fmtNum(consumido)} ${esc(uniOrigen)}</b> y salen `+
      `${ensLineas.length} producto(s). No se calcula merma porque no se miden en `+
      `la misma unidad. Si les pones <b>ORIGEN</b> y <b>LARGO</b> en el catálogo, `+
      `el corte se cuadra solo.`;
    return;
  }
  const merma = red6(consumido - suma);
  m.innerHTML = merma > 0
    ? `Consumes <b>${fmtNum(consumido)}</b>, salen <b>${fmtNum(suma)}</b> &middot; merma <b>${fmtNum(merma)} ${esc(uniOrigen)}</b>`
    : merma < 0
      ? `<span class="cu-mal">Salen <b>${fmtNum(suma)}</b> de solo <b>${fmtNum(consumido)}</b>: `+
        `sobran ${fmtNum(-merma)} ${esc(uniOrigen)}. Revisa las cantidades.</span>`
      : `Consumes <b>${fmtNum(consumido)}</b> y salen <b>${fmtNum(suma)}</b>: sin merma`;
}

/** La tabla del modo libre, cuando el insumo no tiene piezas catalogadas. */
function pintarListaEns(){
  $("#mv-ens-lista").innerHTML = ensLineas.length
    ? `<table><thead><tr><th>Código</th><th>Producto</th><th class="num">Cantidad</th><th></th></tr></thead><tbody>`+
      ensLineas.map((l,n)=>{
        const d = insDe(l.cod);
        return `<tr><td><span class="op">${esc(l.cod)}</span></td>
          <td class="sub">${esc(d?d.nom:"sin catalogar")}</td>
          <td class="num"><b>${fmtNum(l.cant)}</b> ${esc(d?d.uni:"")}</td>
          <td><button type="button" class="btn sm dan" data-quitaens="${n}">Quitar</button></td></tr>`;
      }).join("")+`</tbody></table>`
    : `<p class="mut" style="padding:10px 2px">Añade al menos un producto que salga del corte.</p>`;
}

/* ---------- guardar ---------- */

async function guardarMov(){
  if(typeof puede === "function" && !puede("almacen")){
    toast("Tu rol no permite registrar movimientos de almacén","err"); return;
  }
  const t = MOV_TIPOS[mvTipo];
  if(t.soloAdmin && !esAdmin()){
    toast("Solo un administrador puede hacer ajustes de inventario","err"); return;
  }
  const cod = $("#mv-ins").value, bod = $("#mv-bod").value;
  const i = insDe(cod);
  const teclado = num($("#mv-cant").value);
  // Con despiece nadie teclea cuanto se corta: es la suma de lo que sacaste.
  const despz = modoDespiece(cod);
  const c = despz ? consumoEns() : aBase(i, teclado);
  const op = $("#mv-op").value.trim(), doc = $("#mv-doc").value.trim();
  const ter = $("#mv-ter").value.trim(), obs = $("#mv-obs").value.trim();
  const presUsadas = despz
    ? (tieneFactor(i) && c ? red6(c / i.factor) : "")     // cuantas barras se abrieron
    : ((mvModo==="pres" && tieneFactor(i) && teclado!==null) ? teclado : "");

  if(!cod || !bod)    return toast("Falta el insumo o la bodega","err");
  if(c===null || c<0) return toast("La cantidad debe ser un número positivo","err");
  const o = opDe(t), d = docDe(t), r = terDe(t);
  if(o && o.req && !op)  return toast("Falta: "+o.lbl,"err");
  if(d && d.req && !doc) return toast("Falta: "+d.lbl,"err");
  if(r && r.req && !ter) return toast("Falta: "+r.lbl,"err");
  if(t.obsReq && !obs)   return toast("Un ajuste necesita motivo: quién contó y por qué no cuadraba","err");

  const s = saldos();
  const uni = i ? i.uni : "";
  let cants;                                  // [[codigo, bodega, cantidad firmada], …]
  if(t.conteo){
    const dif = red6(c - saldoDe(s,cod,bod));
    if(dif===0) return toast("El conteo coincide con el sistema: no hay nada que ajustar","ok");
    cants = [[cod, bod, dif]];
  }else if(t.dest){
    const dst = $("#mv-bod2").value;
    if(dst===bod) return toast("Origen y destino son la misma bodega","err");
    if(c===0)     return toast("La cantidad no puede ser cero","err");
    cants = [[cod, bod, -c], [cod, dst, c]];
  }else if(t.ensamble){
    if(!ensLineas.length) return toast(despz
      ? "Di qué piezas salieron"
      : "Añade al menos un producto que salga del corte","err");
    if(c===0) return toast(despz ? "Todas las piezas están en cero" : "Di cuánto se corta","err");
    if(despz){
      /* Descuadrar ya no es posible: el consumo ES la suma de las piezas. Lo
         unico raro que puede pasar es que no den barras enteras, y eso importa
         porque significa un retal que nadie va a apuntar. Se avisa, no se
         bloquea: quien corta sabe mejor que el programa lo que hizo. */
      if(tieneFactor(i)){
        const barras = red6(c / i.factor);
        if(Math.abs(barras - Math.round(barras)) > 1e-9 &&
           !confirm(`Esas piezas consumen ${fmtNum(c)} ${uni}, que no dan `+
             `un número entero de «${i.pres||"barra"}».\n\nQuedaría un retal de `+
             `${fmtNum(red6((Math.ceil(barras)-barras) * i.factor))} ${uni} sin registrar. `+
             `¿Seguir?`)) return;
      }
    }else if(todasMiden()){
      /* Sin despiece pero con largos declarados si se puede cuadrar. Un corte
         que no cuadra no se bloquea, pero tampoco pasa callando. */
      const resto = red6(c - consumoEns());
      if(resto !== 0){
        if(!obs) return toast(resto > 0
          ? `Sobran ${fmtNum(resto)} ${uni} sin cortar. Si el corte no es exacto, di por qué en las observaciones.`
          : `Faltan ${fmtNum(-resto)} ${uni}: sacas más de lo que cortas. Explícalo en las observaciones.`,
          "err");
        if(!confirm(`El corte no cuadra: ${resto>0?"sobran":"faltan"} `+
          `${fmtNum(Math.abs(resto))} ${uni}.\n\n¿Registrarlo así?`)) return;
      }
    }else{
      const suma = red6(ensLineas.reduce((a,l)=>a+l.cant,0));
      const compara = ensLineas.every(l=>{ const d=insDe(l.cod); return d && d.uni===uni; });
      if(compara && suma > c && !confirm(
          `Estás sacando ${fmtNum(suma)} ${uni} de solo ${fmtNum(c)} ${uni}.\n\n`+
          `Eso no cuadra físicamente. ¿Registrarlo de todos modos?`)) return;
    }
    cants = [[cod, bod, -c], ...ensLineas.map(l=>[l.cod, bod, l.cant])];
  }else{
    if(c===0) return toast("La cantidad no puede ser cero","err");
    cants = [[cod, bod, t.sig*c]];
  }

  const ts = new Date();
  const stamp = `${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const id = `${iso(ts).replace(/-/g,"")}-${String(Date.now()).slice(-6)}`;
  const quien = (typeof MI_NOMBRE === "string" && MI_NOMBRE.trim())
                ? `${MI_NOMBRE.trim()} (${userMail||"?"})` : (userMail||"desconocido");
  // Las presentaciones solo se anotan en la fila del insumo tecleado: los
  // productos de un ensamble se dan de alta en su propia unidad base.
  const filas = cants.map(([cc, bb, qq], n)=>{
    const ii = insDe(cc);
    return [stamp, quien, mvTipo, cc, bb, qq, ii?ii.uni:"", (cc===cod && n===0)?presUsadas:"",
            op, doc, ter, obs, id];
  });

  const btn = $("#mv-save");
  btn.disabled = true; setSync("busy","Guardando…");
  try{
    await appendMovs(filas);
    // Se reflejan en memoria de una vez: la vista responde sin esperar otra lectura.
    filas.forEach(f=>MOVS.unshift({fecha:f[0], user:f[1], tipo:f[2], cod:f[3], bod:f[4],
      cant:f[5], uni:f[6], pres:num(f[7]), op:f[8], doc:f[9], ter:f[10], obs:f[11], id:f[12]}));
    $("#ov-mov").classList.add("hide");
    ensLineas = [];
    renderInv();
    const res = cants.map(([cc,bb,qq])=>`${qq>0?"+":""}${fmtNum(qq)} ${cc}`).join(" · ");
    toast(`${mvTipo}: ${res}`,"ok");
    setSync("ok","Guardado");
  }catch(e){
    toast("No se pudo registrar: "+e.message,"err");
    setSync("err","Error");
  }finally{ btn.disabled = false; }
}

/* ---------- buscador de insumo ----------
   Con dos docenas de referencias un desplegable ya obliga a recordar el código
   exacto o a rodar la lista entera. Se busca por código Y por nombre, porque en
   bodega se acuerdan de «perfil vaiven» mucho antes que de «IGO001».

   Es una FÁBRICA, no un buscador suelto: el formulario de movimiento y el de
   requisición necesitan uno cada uno, y compartir estado entre ambos hacía que
   escribir en uno moviera la selección del otro. Cada instancia guarda el suyo.

   El valor real vive en un input oculto; el visible es solo la búsqueda. */

const COMBO_TOPE = 50;             // más de eso no se lee: que afine la búsqueda

/** Insumos que casan con el texto. Todas las palabras deben aparecer. */
function buscarInsumos(q){
  const partes = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(!partes.length) return INSUMOS.slice();
  return INSUMOS.filter(i=>{
    const heno = (i.cod + " " + i.nom + " " + i.cat).toLowerCase();
    return partes.every(p => heno.includes(p));
  });
}

/**
 * Monta un buscador de insumos sobre tres elementos.
 * @param qSel   input visible donde se escribe
 * @param lSel   contenedor de la lista desplegable
 * @param hSel   input oculto que guarda el CODIGO elegido
 * @param alElegir  se llama después de elegir (para repintar saldos, totales…)
 */
function comboEn(qSel, lSel, hSel, alElegir){
  const q = $(qSel), lista = $(lSel), hid = $(hSel);
  if(!q || !lista || !hid) return null;
  let idx = -1;                                  // opción resaltada con las flechas

  function cerrar(){
    lista.classList.add("hide");
    q.setAttribute("aria-expanded", "false");
    idx = -1;
  }

  function elegir(cod){
    const i = insDe(cod);
    hid.value = i ? i.cod : "";
    q.value = i ? `${i.cod} — ${i.nom}` : "";
    cerrar();
    if(typeof alElegir === "function") alElegir();
  }

  function pintar(){
    // Si lo escrito es exactamente lo ya elegido, se ofrece la lista completa:
    // al volver a entrar en el campo se quiere cambiar, no confirmar lo mismo.
    const sel = insDe(hid.value);
    const texto = (sel && q.value === `${sel.cod} — ${sel.nom}`) ? "" : q.value;
    const hallados = buscarInsumos(texto);
    const s = saldos();

    if(!hallados.length){
      lista.innerHTML = `<div class="combo-vacio">Ningún insumo coincide con «${esc(q.value)}».
        <br>Créalo con <b>+ Nuevo insumo</b> en Existencias, o revisa la pestaña INSUMOS.</div>`;
    }else{
      lista.innerHTML = hallados.slice(0, COMBO_TOPE).map((i, n)=>{
        const tot = saldoTotal(s, i.cod);
        const flojo = (i.min!==null && tot < i.min) || tot < 0;
        return `<div class="combo-op${n===idx?" on":""}" role="option" data-cod="${esc(i.cod)}"
          aria-selected="${n===idx}">
          <b>${esc(i.cod)}</b><span>${esc(i.nom)}</span>
          <i class="${flojo?"flojo":""}">${fmtNum(tot)} ${esc(i.uni)}</i></div>`;
      }).join("") + (hallados.length > COMBO_TOPE
        ? `<div class="combo-vacio">y ${hallados.length - COMBO_TOPE} más — afina la búsqueda</div>` : "");
    }
    lista.classList.remove("hide");
    q.setAttribute("aria-expanded", "true");
  }

  q.addEventListener("input", ()=>{ idx = -1; pintar(); });
  q.addEventListener("focus", pintar);
  q.addEventListener("keydown", e=>{
    const abierta = !lista.classList.contains("hide");
    if(e.key === "ArrowDown" || e.key === "ArrowUp"){
      e.preventDefault();
      if(!abierta){ pintar(); return; }
      const n = lista.querySelectorAll(".combo-op").length;
      if(!n) return;
      idx = e.key === "ArrowDown" ? (idx + 1) % n : (idx - 1 + n) % n;
      pintar();
      const act = lista.querySelector(".combo-op.on");
      if(act) act.scrollIntoView({block:"nearest"});
      return;
    }
    if(e.key === "Enter"){
      // Enter dentro del buscador elige; nunca envía el formulario a medias.
      e.preventDefault();
      const act = lista.querySelector(".combo-op.on") || lista.querySelector(".combo-op");
      if(abierta && act) elegir(act.dataset.cod);
      return;
    }
    if(e.key === "Escape" && abierta){
      // Solo cierra la lista: la ventana entera se cierra con otro Escape.
      e.stopPropagation();
      cerrar();
    }
  });
  lista.addEventListener("mousedown", e=>{
    // mousedown y no click: el blur del input llegaría antes y cerraría la lista.
    const op = e.target.closest(".combo-op");
    if(op){ e.preventDefault(); elegir(op.dataset.cod); }
  });
  q.addEventListener("blur", ()=>setTimeout(cerrar, 120));

  return {elegir, cerrar, pintar};
}

/* El buscador del formulario de movimiento. El de requisiciones monta el suyo. */
let comboMov = null;

/** Rellena los desplegables que dependen de lo que haya en la hoja. */
function fillInvLists(){
  if(!$("#i-cat")) return;
  const cats = [...new Set(INSUMOS.map(i=>i.cat).filter(Boolean))].sort();
  llenaSel("#i-cat", cats, "Todas");
  llenaSel("#i-bod", BODEGAS, "Todas");
  llenaSel("#k-bod", BODEGAS, "Todas");
  llenaSel("#k-tipo", Object.keys(MOV_TIPOS), "Todos");
}

/* ---------- informe de existencias entre fechas ----------
   No es lo mismo "cuanto hay" que "que paso en septiembre". Este informe
   responde lo segundo: para cada insumo marcado, con cuanto empezo el periodo,
   cuanto entro, cuanto salio y con cuanto termino.

   El saldo inicial se calcula sumando TODO lo anterior a la fecha de inicio: no
   se guarda en ninguna parte. Es la misma regla de siempre, aplicada tambien
   hacia atras. */

let infMarcados = new Set();

/** Resumen de un insumo en el período: inicial, entradas, salidas, final. */
function resumenPeriodo(cod, bod, d1, d2){
  let ini = 0, ent = 0, sal = 0;
  for(const m of MOVS){
    if(m.cod !== cod) continue;
    if(bod && m.bod !== bod) continue;
    const d = toDate(m.fecha);
    if(d1 && (!d || d < d1)){ ini += m.cant; continue; }   // todo lo anterior
    if(d2 && d && d > d2) continue;                        // posterior: fuera
    if(m.cant >= 0) ent += m.cant; else sal += -m.cant;
  }
  ini = red6(ini); ent = red6(ent); sal = red6(sal);
  return {ini, ent, sal, fin: red6(ini + ent - sal)};
}

function infFiltrados(){
  const q = $("#inf-q").value.trim().toLowerCase();
  return INSUMOS.filter(i => !q || (i.cod+" "+i.nom+" "+i.cat).toLowerCase().includes(q));
}

function infRango(){
  const d1 = toDate($("#inf-desde").value), d2 = toDate($("#inf-hasta").value);
  if(d2) d2.setHours(23,59,59,999);
  return {d1, d2, bod: $("#inf-bod").value};
}

function renderInforme(){
  const {d1, d2, bod} = infRango();
  const lista = infFiltrados();

  $("#inf-tabla").innerHTML =
    `<thead><tr><th style="width:34px"></th><th class="stick">Código</th><th>Insumo</th><th>Un.</th>
      <th class="num">Inicial</th><th class="num">Entradas</th><th class="num">Salidas</th>
      <th class="num">Final</th></tr></thead><tbody>`+
    (lista.length ? lista.map(i=>{
      const r = resumenPeriodo(i.cod, bod, d1, d2);
      const mov = r.ent > 0 || r.sal > 0;
      return `<tr class="${mov?"":"quieto"}">
        <td><input type="checkbox" data-inf="${esc(i.cod)}" ${infMarcados.has(i.cod)?"checked":""}></td>
        <td class="stick"><span class="op">${esc(i.cod)}</span></td>
        <td>${esc(i.nom)}</td><td class="sub">${esc(i.uni)}</td>
        <td class="num sub">${fmtNum(r.ini)}</td>
        <td class="num ${r.ent?"pos":"z"}">${r.ent?fmtNum(r.ent):"—"}</td>
        <td class="num ${r.sal?"neg":"z"}">${r.sal?fmtNum(r.sal):"—"}</td>
        <td class="num"><b>${fmtNum(r.fin)}</b></td></tr>`;
    }).join("")
    : `<tr><td colspan="8" class="empty">Ningún insumo coincide.</td></tr>`)+`</tbody>`;

  infCuenta();
  $("#inf-nota").textContent = (d1 || d2)
    ? `Período: ${d1?fmt(d1):"desde el principio"} — ${d2?fmt(d2):"hasta hoy"}`+
      (bod ? ` · solo ${bod}` : " · todas las bodegas")
    : "Sin fechas: el informe sale con todo el histórico.";
}

function infCuenta(){
  $("#inf-cnt").innerHTML = `<b>${infMarcados.size}</b> marcado(s) de ${infFiltrados().length}`;
}

function abrirInforme(){
  if(!invReady){ toast("El inventario aún no ha cargado","err"); return; }
  llenaSel("#inf-bod", BODEGAS, "Todas");
  // Por defecto, el mes en curso: es lo que casi siempre se quiere mirar.
  const h = new Date();
  if(!$("#inf-desde").value) $("#inf-desde").value = iso(new Date(h.getFullYear(), h.getMonth(), 1));
  if(!$("#inf-hasta").value) $("#inf-hasta").value = iso(h);
  renderInforme();
  $("#ov-inf").classList.remove("hide");
}

function descargarInforme(){
  const {d1, d2, bod} = infRango();
  const elegidos = infFiltrados().filter(i => infMarcados.has(i.cod));
  if(!elegidos.length){ toast("Marca al menos un insumo","err"); return; }
  const periodo = ((d1?fmt(d1):"inicio") + "_a_" + (d2?fmt(d2):"hoy")).split("/").join("-");
  csvDe("inventario_" + periodo,
    ["CODIGO","INSUMO","CATEGORIA","UNIDAD","PRESENTACION","FACTOR","BODEGA",
     "DESDE","HASTA","SALDO INICIAL","ENTRADAS","SALIDAS","SALDO FINAL",
     "FINAL EN PRESENTACION"],
    elegidos.map(i=>{
      const r = resumenPeriodo(i.cod, bod, d1, d2);
      return [i.cod, i.nom, i.cat, i.uni, i.pres, i.factor, bod || "TODAS",
              d1?fmt(d1):"", d2?fmt(d2):"", r.ini, r.ent, r.sal, r.fin,
              tieneFactor(i) ? red6(r.fin / i.factor) : ""];
    }));
  toast(`${elegidos.length} insumo(s) exportados`, "ok");
}

/* ---------- enganches ----------
   Solo si esta página trae la vista. Puertas y paneles comparten archivos y dar
   por hecho que los elementos existen revienta la página que no los tenga. */
if($("#v-exist")){
  ["i-q","i-cat","i-bod","i-exi"].forEach(id=>{
    const e = $("#"+id); if(!e) return;
    e.addEventListener("input", renderInv);
    e.addEventListener("change", renderInv);
  });
  ["k-q","k-tipo","k-bod","k-desde","k-hasta"].forEach(id=>{
    const e = $("#"+id); if(!e) return;
    e.addEventListener("input", renderKardex);
    e.addEventListener("change", renderKardex);
  });
  $("#i-clear").onclick = ()=>{ $("#i-q").value=""; ["i-cat","i-bod","i-exi"].forEach(id=>$("#"+id).value=""); renderInv(); };
  $("#k-clear").onclick = ()=>{ $("#k-q").value=""; ["k-tipo","k-bod","k-desde","k-hasta"].forEach(id=>$("#"+id).value=""); renderKardex(); };
  $("#i-nuevo").onclick = ()=>abrirMov(null);
  $("#i-nuevoins").onclick = ()=>abrirNuevoInsumo(null);
  $("#i-informe").onclick = abrirInforme;
  ["inf-desde","inf-hasta","inf-bod","inf-q"].forEach(id=>{
    const e = $("#"+id);
    if(e){ e.addEventListener("input", renderInforme);
           e.addEventListener("change", renderInforme); }
  });
  $("#inf-tabla").addEventListener("change", e=>{
    const c = e.target.closest("input[data-inf]");
    if(!c) return;
    if(c.checked) infMarcados.add(c.dataset.inf); else infMarcados.delete(c.dataset.inf);
    infCuenta();
  });
  $("#inf-todos").onclick = ()=>{ infFiltrados().forEach(i=>infMarcados.add(i.cod)); renderInforme(); };
  $("#inf-ninguno").onclick = ()=>{ infMarcados.clear(); renderInforme(); };
  $("#inf-csv").onclick = descargarInforme;
  $("#form-nins").addEventListener("submit", e=>{ e.preventDefault(); guardarInsumo(); });
  $("#i-tabla").addEventListener("click", e=>{
    const b = e.target.closest("button[data-inv]");
    if(b) abrirMov(b.dataset.inv);
  });
  ["mv-bod","mv-bod2","mv-cant"].forEach(id=>{
    const e = $("#"+id); if(e) e.addEventListener("input", mvSaldo);
  });
  comboMov = comboEn("#mv-q", "#mv-lista", "#mv-ins", ()=>{
    // Al cambiar de insumo, el modo por defecto vuelve a ser el que tenga
    // sentido: si el nuevo no tiene presentación, no hay nada que elegir.
    const i = insDe($("#mv-ins").value);
    mvModo = tieneFactor(i) ? "pres" : "base";
    mvSaldo();
  });
  comboEns = comboEn("#me-q", "#me-lista", "#me-ins", null);

  $("#mv-modo").addEventListener("click", e=>{
    const b = e.target.closest("button[data-modo]");
    if(!b) return;
    mvModo = b.dataset.modo;
    mvSaldo();
  });
  $("#mv-origen").addEventListener("change", ()=>setMvTipo(mvTipo));
  $("#me-add").onclick = anadirLineaEns;
  $("#me-cant").addEventListener("keydown", e=>{
    if(e.key === "Enter"){ e.preventDefault(); anadirLineaEns(); }
  });
  $("#mv-ens-lista").addEventListener("click", e=>{
    const b = e.target.closest("button[data-quitaens]");
    if(b){ ensLineas.splice(+b.dataset.quitaens, 1); pintarEnsamble(); }
  });
  // Contadores de pieza. El teclado se escucha en "change" y no en "input":
  // repintar en cada tecla le quitaria el foco a quien esta escribiendo.
  const piezas = $("#mv-ens-piezas");
  if(piezas){
    piezas.addEventListener("click", e=>{
      const b = e.target.closest("button[data-pz]");
      if(!b) return;
      const l = ensLineas.find(x=>x.cod === b.dataset.pz);
      setPieza(b.dataset.pz, (l ? l.cant : 0) + (+b.dataset.d));
    });
    piezas.addEventListener("change", e=>{
      const c = e.target.closest("input[data-pzc]");
      if(c) setPieza(c.dataset.pzc, num(c.value) || 0);
    });
  }
  const sug = $("#mv-ens-sug");
  if(sug) sug.addEventListener("click", e=>{
    const b = e.target.closest("button[data-combo]");
    if(!b) return;
    aplicarCombo(b.dataset.combo.split(",").map(Number));
  });
  $("#form-mov").addEventListener("submit", e=>{ e.preventDefault(); guardarMov(); });

  const nx = $("#mv-next"), pv = $("#mv-prev");
  if(nx) nx.onclick = ()=>{
    // No se pasa de pantalla sin lo minimo, o el paso 2 no sabria de que habla.
    if(!$("#mv-ins").value) return toast("Elige primero el insumo","err");
    if(!$("#mv-bod").value) return toast("Falta la bodega","err");
    setPaso(2);
  };
  if(pv) pv.onclick = ()=>setPaso(1);
  // Girar el telefono o abrir el escritorio no debe dejar media pagina escondida.
  window.matchMedia("(max-width:720px)").addEventListener("change", ()=>setPaso(mvPaso));

  $("#mv-saldos").addEventListener("click", e=>{
    if(!e.target.closest("#mv-smas")) return;
    saldosTodo = true;
    pintarSaldos(insDe($("#mv-ins").value));
  });

  $("#i-csv").onclick = ()=>{
    const s = saldos();
    csvDe("existencias",
      ["CODIGO","INSUMO","CATEGORIA","UNIDAD","PRESENTACION","FACTOR",
       "ORIGEN","LARGO",...BODEGAS,"TOTAL","EN PRESENTACION","MINIMO","MAXIMO"],
      invFiltrado().map(({i})=>{
        const tot = saldoTotal(s, i.cod);
        return [i.cod, i.nom, i.cat, i.uni, i.pres, i.factor, i.origen, i.largo,
                ...BODEGAS.map(b=>saldoDe(s,i.cod,b)), tot,
                tieneFactor(i) ? red6(tot / i.factor) : "", i.min, i.max];
      }));
  };
  $("#k-csv").onclick = ()=> csvDe("kardex",
    ["FECHA","TIPO","CODIGO","BODEGA","CANTIDAD","OP","DOCUMENTO","TERCERO","USUARIO","OBSERVACIONES"],
    kardexFiltrado().map(m=>[fmtSello(m.fecha), m.tipo, m.cod, m.bod, m.cant, m.op, m.doc, m.ter, m.user, m.obs]));
}
