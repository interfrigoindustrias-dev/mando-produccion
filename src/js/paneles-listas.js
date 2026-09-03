/* Las listas desplegables salen de la hoja, no de una copia
   Proyecto: Control de Produccion - Interfrigo

   POR QUE EXISTE ESTE ARCHIVO

   Las listas estaban escritas a mano en modelo.js, copiadas mirando la hoja.
   Se quedaron viejas dos veces seguidas: faltaban nueve de los catorce
   productos, y doce de los quince acabados. Y el fallo no avisa — la opcion
   simplemente no esta, y quien la necesita no puede elegirla.

   Copiar mejor no arregla nada: la copia envejece igual la proxima vez que
   alguien añada un acabado en la hoja. Asi que la hoja manda y la aplicacion
   lee de alli su validacion de datos al arrancar.

   Lo que queda en modelo.js es el respaldo: lo que se ofrece mientras la
   lectura no ha llegado, o si falla. Nunca se escribe encima de la hoja.     */
"use strict";

/** De donde salio cada lista: sirve para poder decirlo en la interfaz. */
let LISTAS_ORIGEN = "modelo";

/** Rango de muestra. La validacion se aplica a un bloque de filas, asi que
 *  basta mirar unas pocas: se toma la primera regla que aparezca en cada
 *  columna, porque una fila suelta puede estar vacia o ser una excepcion. */
const FILAS_MUESTRA = 12;

/** Lee la validacion de datos de la hoja y sustituye las listas del modelo.
 *
 *  Devuelve cuantas listas se actualizaron, o 0 si no se pudo leer. Que falle
 *  no es grave: se sigue con las del modelo, que es justo lo que habia antes. */
async function leerListasDeLaHoja(){
  const mapa = MODELO.listasEnHoja;
  if(!mapa || !Object.keys(mapa).length) return 0;

  let datos;
  try{
    /* Una sola peticion, y solo el trozo que hace falta: pedir la cuadricula
       entera de una hoja con miles de filas es lento y no aporta nada. */
    const rango = encodeURIComponent(rng(`A2:${LAST_COL}${FILAS_MUESTRA + 1}`));
    const j = await api(`?ranges=${rango}&includeGridData=true` +
      `&fields=sheets.data.rowData.values.dataValidation.condition`);
    datos = (((j.sheets || [])[0] || {}).data || [])[0];
  }catch(e){
    console.warn("listas de la hoja:", e.message);
    return 0;
  }
  if(!datos || !datos.rowData) return 0;

  // Primera regla de lista que aparezca en cada columna.
  const porColumna = new Map();
  for(const fila of datos.rowData){
    (fila.values || []).forEach((celda, i)=>{
      if(porColumna.has(i)) return;
      const cond = celda && celda.dataValidation && celda.dataValidation.condition;
      if(!cond || cond.type !== "ONE_OF_LIST") return;
      const ops = (cond.values || [])
        .map(v => String(v.userEnteredValue ?? "").trim())
        .filter(Boolean);
      if(ops.length) porColumna.set(i, ops);
    });
  }
  if(!porColumna.size) return 0;

  let cambiadas = 0;
  const novedades = [];
  for(const [campo, nombre] of Object.entries(mapa)){
    const i = C[campo];
    const ops = porColumna.get(i);
    if(i === undefined || !ops) continue;
    const antes = MODELO.listas[nombre] || [];
    if(antes.length === ops.length && antes.every((v, k) => v === ops[k])) continue;

    /* Se avisa de lo que la copia se estaba perdiendo. No es un detalle: una
       opcion que falta es una que nadie puede elegir, y nada lo delata. */
    const faltaban = ops.filter(o => !antes.includes(o));
    if(faltaban.length) novedades.push(`${nombre}: +${faltaban.length}`);
    MODELO.listas[nombre] = ops;
    cambiadas++;
  }

  if(cambiadas){
    LISTAS_ORIGEN = "hoja";
    if(novedades.length) console.info("listas de la hoja —", novedades.join(" · "));
    // Lo ya pintado se hizo con las listas viejas: hay que rehacerlo.
    if(typeof llenarProductos === "function") llenarProductos();
    if(typeof fillLists === "function" && ROWS.length) fillLists();
  }
  return cambiadas;
}

/** Lo dice en la propia ventana de la ficha: quien vea una opcion que no
 *  esperaba —o eche una en falta— sabe donde mirar sin preguntar. */
function pintarOrigenListas(){
  const el = $("#n-origen-listas");
  if(!el) return;
  const n = (MODELO.listas.PRODUCTOS || []).length;
  const c = (MODELO.listas.CARAS || []).length;
  el.textContent = LISTAS_ORIGEN === "hoja"
    ? `${n} productos y ${c} acabados, leídos de la hoja.`
    : `${n} productos y ${c} acabados. No se pudo leer la hoja: se usan los que trae la aplicación.`;
  el.classList.toggle("warn", LISTAS_ORIGEN !== "hoja");
}

/* ============================== LA FORMA DE LA HOJA ==============================
   La cotizacion y la orden de compra son campos nuevos: no habia columna para
   ellos. Añadir dos columnas a una hoja de produccion en marcha, a ciegas y
   contando posiciones, es exactamente como se rompio esto la primera vez —yo
   creia que la hoja acababa en la U y resulta que V y W ya tenian los metros
   de lamina—.

   Asi que no se cuenta: se leen los encabezados y se decide con lo que hay.
     · si las columnas ya existen, se usan donde esten
     · si no existen y el sitio esta libre, se crean ahi
     · si el sitio esta ocupado por otra cosa, NO se toca nada y se avisa    */

/** Encabezados de la hoja, tal cual. Indice 0 = A. */
let ENCABEZADOS = [];
/** Que paso con las columnas propias: "listas", "creadas" o el motivo del no. */
let ESTADO_COLUMNAS = {ok:false, motivo:"sin comprobar"};

const normaliza = t => String(t ?? "").trim().toUpperCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

async function resolverColumnasPropias(){
  const propias = MODELO.columnasPropias || [];
  if(!propias.length) return (ESTADO_COLUMNAS = {ok:true, motivo:"no hay"});

  try{
    const j = await api(`/values/${encodeURIComponent(rng("A1:AZ1"))}`);
    ENCABEZADOS = ((j.values || [])[0] || []).map(v => String(v ?? ""));
  }catch(e){
    return (ESTADO_COLUMNAS = {ok:false, motivo:"no se pudieron leer los encabezados"});
  }

  // Hasta donde llega de verdad lo escrito en la fila 1.
  let ultima = -1;
  ENCABEZADOS.forEach((t, i)=>{ if(normaliza(t)) ultima = i; });

  const porCrear = [];
  for(const {k, encabezado} of propias){
    const yaEsta = ENCABEZADOS.findIndex(t => normaliza(t) === normaliza(encabezado));
    if(yaEsta >= 0){
      if(yaEsta >= NCOL){
        return (ESTADO_COLUMNAS = {ok:false,
          motivo:`«${encabezado}» está en la columna ${A1(yaEsta)}, más allá de donde llega la aplicación`});
      }
      C[k] = yaEsta;                       // esta donde esta: se usa ahi
      continue;
    }
    const destino = C[k];
    if(destino === undefined || destino >= NCOL){
      return (ESTADO_COLUMNAS = {ok:false, motivo:`no hay sitio para «${encabezado}»`});
    }
    // El sitio previsto tiene que estar VACIO. Si hay algo, no se toca.
    if(normaliza(ENCABEZADOS[destino] || "")){
      return (ESTADO_COLUMNAS = {ok:false,
        motivo:`la columna ${A1(destino)} ya se llama «${ENCABEZADOS[destino]}»`});
    }
    if(destino <= ultima){
      /* Hueco en medio: puede ser una columna en uso sin encabezado. Con eso
         no se juega — se avisa y se deja como esta. */
      return (ESTADO_COLUMNAS = {ok:false,
        motivo:`la columna ${A1(destino)} está en medio de la hoja y no tiene encabezado`});
    }
    porCrear.push({k, encabezado, i: destino});
  }

  if(porCrear.length){
    try{
      for(const {encabezado, i} of porCrear){
        await api(`/values/${encodeURIComponent(rng(`${A1(i)}1`))}?valueInputOption=USER_ENTERED`,
          {method:"PUT", body: JSON.stringify({values: [[encabezado]]})});
        ENCABEZADOS[i] = encabezado;
      }
      toast(`Columna(s) añadida(s) a la hoja: ${porCrear.map(p=>p.encabezado).join(", ")}`, "ok");
    }catch(e){
      return (ESTADO_COLUMNAS = {ok:false, motivo:"no se pudieron crear: " + e.message});
    }
  }
  return (ESTADO_COLUMNAS = {ok:true, motivo: porCrear.length ? "creadas" : "ya estaban"});
}

/** Los dos campos nuevos solo se ofrecen si tienen columna de verdad. */
function aplicarColumnasPropias(){
  const hay = ESTADO_COLUMNAS.ok;
  $$("[data-necesita-columna]").forEach(el=>{
    const campo = el.closest("label") || el;
    campo.classList.toggle("hide", !hay);
    el.disabled = !hay;
  });
  const av = $("#n-aviso-columnas");
  if(av){
    av.classList.toggle("hide", hay);
    if(!hay){
      av.textContent = `La cotización y la orden de compra no se pueden guardar: ` +
        `${ESTADO_COLUMNAS.motivo}. El resto de la ficha funciona igual.`;
    }
  }
}

/* ============================== LA FORMULA DE LOS METROS ==============================
   La columna M2 tiene formula POR FILA en la hoja —una por linea, no de
   matriz—. Escribirle un numero encima no rompe nada visible, pero la fila
   deja de recalcularse: si luego alguien corrige la cantidad o el largo en la
   hoja, los metros se quedan como estaban. Y es el mismo sintoma callado de
   siempre: nada falla, el dato simplemente deja de seguir a sus origenes.

   STATUS ya se trataba bien —se le escribe la formula viva— y M2 no. Ahora
   igual, pero sin inventarse la formula: se lee la que la hoja ya usa y se
   adapta a la fila nueva. Si no se puede leer ninguna, se cae al numero
   calculado, que es lo que se hacia antes.                                   */

/** Plantilla leida de la hoja, o null si no hay ninguna que leer. */
let FORMULA_M2 = null;

async function detectarFormulaM2(){
  const col = C.M2 === undefined ? null : A1(C.M2);
  if(!col) return null;
  try{
    const j = await api(`/values/${encodeURIComponent(rng(`${col}2:${col}200`))}` +
                        `?valueRenderOption=FORMULA`);
    for(const fila of (j.values || [])){
      const v = String((fila || [])[0] ?? "");
      if(v.startsWith("=")){ FORMULA_M2 = v; break; }
    }
  }catch(e){ FORMULA_M2 = null; }
  return FORMULA_M2;
}

/** Que escribir en M2 para una fila. La formula de la hoja si la hay, con sus
 *  referencias movidas a esta fila; si no, el numero, como antes.
 *
 *  Solo se cambian los numeros que van pegados a una letra de columna —«E2» a
 *  «E47»—, nunca los sueltos: el 1,16 de «=1,16*E2*F2» tiene que quedarse. */
function m2Value(r, c){
  if(FORMULA_M2) return FORMULA_M2.replace(/([A-Z]+\$?)(\d+)/g, (_, col) => col + r);
  return MODELO.metros(c) || "";
}
