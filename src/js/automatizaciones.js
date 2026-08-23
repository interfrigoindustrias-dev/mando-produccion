/* Reglas automaticas de fechas segun prioridad y avance
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ============================== AUTOMATIZACIONES ==============================
   FECHA DE PROCESO — tiene dos vidas:

   1. Mientras la puerta no se ha tocado (ningún proceso marcado), es una fecha
      PROGRAMADA: cuándo toca empezarla. Se cuenta desde la fecha de creación
      según la prioridad — ALTA hoy mismo, MEDIA +3 días, BAJA +8 días. Si ese
      día aún no ha llegado, se respeta tal cual: no pasa nada hasta entonces.

   2. En cuanto se marca el primer proceso pasa a ser fecha de TRABAJO: se pone
      en el día actual y se va corriendo cada día mientras la puerta siga abierta.

   Al llegar al 100% se congela: queda como la fecha real de fabricación.

   Además, al marcar Despachado se rellena la fecha de despacho si está vacía.

   Todo corre en el navegador: se dispara cuando alguien abre o usa la app.    */
const OFFSET = {ALTA:0, MEDIA:3, BAJA:8};

const hoy0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };

/** Fecha que DEBE tener FECHA PROCESO una puerta abierta.
 *  null = la automatización no la toca. */
function fechaProgramada(c){
  // Ya empezada: la fecha sigue al trabajo, no al calendario.
  if(progreso(c).ok > 0) return hoy0();

  // Sin empezar: la programación depende de la prioridad.
  const prio = String(c[C.PRIO]??"").trim().toUpperCase();
  if(!(prio in OFFSET)) return null;
  const creada = toDate(c[C.FECHA]);
  if(!creada && OFFSET[prio] > 0) return null;   // sin fecha de creación no hay de dónde contar
  const hoy = hoy0();
  const objetivo = creada ? new Date(creada) : new Date(hoy);
  objetivo.setDate(objetivo.getDate() + OFFSET[prio]);
  return objetivo > hoy ? objetivo : hoy;        // el día programado, o hoy si ya pasó
}

/** Recalcula las fechas de proceso de todas las puertas abiertas.
 *  Idempotente: solo escribe las celdas cuyo valor difiere, así que puede
 *  ejecutarse tras cada refresco y tras cada edición sin efectos secundarios.
 *  Las puertas al 100% no se tocan nunca: su fecha quedó congelada. */
async function autoFechas(){
  if(CFG.auto===false || busyWrites>0) return 0;
  const ups=[], logs=[];
  for(const {r,c} of ROWS){
    if(!rowActive(c) || completa(c) || anulada(c)) continue;   // 100% o anulada ⇒ no se toca
    const d = fechaProgramada(c);
    if(!d) continue;
    const nueva = fmt(d), antes = fmtDate(c[C.FPROC]);
    if(antes === nueva) continue;
    ups.push({a1:`X${r}`, v:[[nueva]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Fecha proceso", antes, despues:nueva});
    c[C.FPROC] = nueva;
  }
  if(!ups.length) return 0;
  try{
    await writeCells(ups);
    logBulk(logs);
    render(); renderDashVisible();
    return ups.length;
  }catch(e){ console.warn("auto fechas:", e.message); return 0; }
}

/** Al tocar CUALQUIER proceso, la fecha de proceso pasa al día actual.
 *  Se llama justo después de guardar un cambio de procesos. Si con ese cambio
 *  la puerta llegó al 100%, ésta es la fecha que queda congelada. */
async function tocarFechaProceso(r){
  if(CFG.auto===false) return;
  const row = ROWS.find(x=>x.r===r);
  if(!row || anulada(row.c)) return;

  const h = hoy(), antes = fmtDate(row.c[C.FPROC]);
  if(antes === h) return;
  row.c[C.FPROC] = h;
  try{
    await writeCells([{a1:`X${r}`, v:[[h]]}]);
    logBulk([{accion:"AUTO", op:row.c[C.OP], fila:r, campo:"Fecha proceso", antes, despues:h}]);
  }catch(e){ row.c[C.FPROC] = antes; console.warn("fecha proceso:", e.message); }
}
