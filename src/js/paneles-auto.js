/* Automatismos de paneleria
   Proyecto: Control de Produccion - Interfrigo

   Los de puertas viven en automatizaciones.js y no sirven aqui: un panel no
   tiene fecha programada de proceso ni ensamble, y sus columnas estan en otro
   sitio. Este archivo es el equivalente para paneles y solo lo carga su pagina.

   Son tres:
     1. la prioridad sube sola cuando una linea lleva demasiado esperando
     2. la primera marca de proceso sella el COMIENZO
     3. la ultima marca sella el FIN y deja la linea TERMINADO                */
"use strict";

/** Letra de columna de un campo del modelo. Nada de letras escritas a mano:
 *  las de puertas apuntan a otra cosa en la hoja de paneles. */
const col = k => A1(C[k]);

const ESTADO = {PROCESO:"EN PROCESO", TERMINADO:"TERMINADO",
                DESPACHADO:"DESPACHADO", ANULADA:"ANULADA"};

/** El estado que tiene ahora la linea, normalizado. */
const estadoDe = c => String(c[C.DESP] ?? "").trim().toUpperCase();
const anuladaP = c => estadoDe(c) === ESTADO.ANULADA;
const despachadaP = c => estadoDe(c) === ESTADO.DESPACHADO;

/* ------------------------------ 1. escalado de prioridad ------------------------------
   Por escalones y no de un salto: BAJA espera 8 dias y se vuelve MEDIA, y solo
   despues de otros 4 llega a ALTA. URGENTE lo pone una persona y no caduca.

   Los dias se cuentan desde que la linea ESTA en su nivel, no desde que nacio;
   eso lo resuelve prioridadQueTocaria() leyendo el historial. */
async function autoPrioridades(){
  const ups = [], logs = [];
  for(const {r, c} of ROWS){
    if(!rowActive(c) || anuladaP(c) || despachadaP(c)) continue;
    if(completa(c)) continue;                      // ya fabricada: no adelanta nada
    const sube = prioridadQueTocaria(r, c);
    if(!sube) continue;
    const antes = String(c[C.PRIO] ?? "").trim();
    ups.push({a1: `${col("PRIO")}${r}`, v: [[sube]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Prioridad",
               antes, despues:sube});
    c[C.PRIO] = sube;
  }
  if(!ups.length) return 0;
  try{
    await writeCells(ups); logBulk(logs); lastHash = "";
    return ups.length;
  }catch(e){ console.warn("escalado:", e.message); return 0; }
}

/* ------------------------------ 2. comienzo del proceso ------------------------------ */
/** Sella el COMIENZO la primera vez que se marca algo, y ya no se vuelve a
 *  tocar: lo que interesa es cuando se empezo, no la ultima vez que alguien
 *  toco una casilla.
 *
 *  Llegar al 100 % NO cierra la linea. Antes lo hacia, y estaba mal: la linea
 *  desaparecia de planta en cuanto se marcaba el ultimo proceso, sin que nadie
 *  lo hubiera decidido. Marcar los procesos dice lo que se ha hecho; darla por
 *  terminada y mandarla a almacen es una decision, y la toma quien esta
 *  delante de la maquina con el boton Terminar. */
async function tocarFechaProceso(r){
  const row = ROWS.find(x => x.r === r);
  if(!row) return;
  const c = row.c;
  if(progreso(c).ok === 0) return;                  // aun no se ha empezado
  if(String(c[C.FINI] ?? "").trim()) return;        // ya estaba sellado

  const h = hoy();
  try{
    await writeCells([{a1: `${col("FINI")}${r}`, v: [[h]]}]);
    logBulk([{accion:"AUTO", op:c[C.OP], fila:r, campo:"Comienzo proceso",
              antes:"", despues:h}]);
    c[C.FINI] = h;
    lastHash = "";
  }catch(e){ console.warn("comienzo proceso:", e.message); }
}

/* ------------------------------ 3. fin del proceso ------------------------------ */
/** Cambia el estado y sella la fecha que corresponda.
 *
 *  Las dos fechas que quedan cuelgan de aqui a proposito, no del avance:
 *    TERMINADO  -> FIN PROCESO. Es el boton Terminar el que cierra la linea.
 *    DESPACHADO -> FECHA DE DESPACHO.
 *
 *  Poner la fecha de fin al llegar al 100 % parecia lo mismo y no lo es: se
 *  puede marcar el ultimo proceso y que la linea siga en planta esperando una
 *  revision, un retoque o simplemente que alguien la de por buena. */
async function ponerEstado(r, valor){
  const row = ROWS.find(x => x.r === r);
  if(!row) return;
  const c = row.c;
  const antes = String(c[C.DESP] ?? "");
  if(antes === valor) return;
  const ups = [{a1: `${col("DESP")}${r}`, v: [[valor]]}];
  const cambios = [{campo:"Estado", antes, despues:valor}];
  const previaFin = c[C.FFIN], previaDesp = c[C.FDESP];
  const v = String(valor).trim().toUpperCase();
  const h = hoy();

  if(v === ESTADO.TERMINADO && !String(c[C.FFIN] ?? "").trim()){
    ups.push({a1: `${col("FFIN")}${r}`, v: [[h]]});
    cambios.push({campo:"Fin proceso", antes:"", despues:h});
    c[C.FFIN] = h;
    // Si se termina sin haber marcado nada, al menos queda cuando se empezo.
    if(!String(c[C.FINI] ?? "").trim()){
      ups.push({a1: `${col("FINI")}${r}`, v: [[h]]});
      cambios.push({campo:"Comienzo proceso", antes:"", despues:h});
      c[C.FINI] = h;
    }
  }
  if(v === ESTADO.DESPACHADO && !String(c[C.FDESP] ?? "").trim()){
    ups.push({a1: `${col("FDESP")}${r}`, v: [[h]]});
    cambios.push({campo:"Fecha de despacho", antes:"", despues:h});
    c[C.FDESP] = h;
  }

  writeSeq++;
  c[C.DESP] = valor;                                   // optimista
  try{
    await writeCells(ups);
    logChanges("EDITA", c[C.OP], r, cambios);
    setSync("", "Guardado"); lastHash = "";
  }catch(e){
    c[C.DESP] = antes; c[C.FFIN] = previaFin; c[C.FDESP] = previaDesp;
    toast(e.message, "err");
    throw e;
  }
}
