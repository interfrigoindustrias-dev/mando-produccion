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

/* ------------------------------ 2 y 3. fechas de proceso ------------------------------ */
/** Sella COMIENZO la primera vez que se marca algo y FIN cuando ya no queda
 *  nada por marcar. Al terminar, la linea pasa a TERMINADO sola: es lo que
 *  mira almacen para saber que hay algo que recoger.
 *
 *  `estabaCompleta` evita el fallo que ya se vio en puertas: desmarcar y
 *  volver a marcar una linea vieja le reescribia la fecha de hoy, y entonces
 *  el resumen contaba como fabricado hoy algo hecho hace semanas. */
async function tocarFechaProceso(r, estabaCompleta){
  const row = ROWS.find(x => x.r === r);
  if(!row) return;
  const c = row.c, ups = [], logs = [];
  const p = progreso(c);

  // COMIENZO: al primer proceso marcado, y ya no se vuelve a tocar.
  if(p.ok > 0 && !String(c[C.FINI] ?? "").trim()){
    const h = hoy();
    ups.push({a1: `${col("FINI")}${r}`, v: [[h]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Comienzo proceso",
               antes:"", despues:h});
    c[C.FINI] = h;
  }

  // FIN + TERMINADO: solo al completarse, y solo si no lo estaba ya.
  if(p.pct >= 1 && !estabaCompleta){
    const h = hoy();
    if(!String(c[C.FFIN] ?? "").trim()){
      ups.push({a1: `${col("FFIN")}${r}`, v: [[h]]});
      logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Fin proceso",
                 antes:"", despues:h});
      c[C.FFIN] = h;
    }
    if(!estadoDe(c) || estadoDe(c) === ESTADO.PROCESO){
      ups.push({a1: `${col("DESP")}${r}`, v: [[ESTADO.TERMINADO]]});
      logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Estado",
                 antes:String(c[C.DESP] ?? ""), despues:ESTADO.TERMINADO});
      c[C.DESP] = ESTADO.TERMINADO;
    }
  }

  if(!ups.length) return;
  try{ await writeCells(ups); logBulk(logs); lastHash = ""; }
  catch(e){ console.warn("fechas proceso:", e.message); }
}

/** Cambia el estado a mano y, si pasa a DESPACHADO, sella la fecha de despacho. */
async function ponerEstado(r, valor){
  const row = ROWS.find(x => x.r === r);
  if(!row) return;
  const c = row.c;
  const antes = String(c[C.DESP] ?? "");
  if(antes === valor) return;
  const ups = [{a1: `${col("DESP")}${r}`, v: [[valor]]}];
  const cambios = [{campo:"Estado", antes, despues:valor}];
  const previaFecha = c[C.FDESP];

  if(valor.toUpperCase() === ESTADO.DESPACHADO && !String(c[C.FDESP] ?? "").trim()){
    const h = hoy();
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
    c[C.DESP] = antes; c[C.FDESP] = previaFecha;
    toast(e.message, "err");
    throw e;
  }
}
