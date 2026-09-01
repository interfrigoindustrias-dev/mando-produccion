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
