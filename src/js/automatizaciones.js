/* Reglas automaticas de fechas segun prioridad y avance
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ============================== AUTOMATIZACIONES ==============================
   1-3. La fecha de proceso se programa según la prioridad, contando desde la fecha
        de creación: ALTA hoy mismo, MEDIA +3 días, BAJA +8 días. Cuando esa fecha
        llega, se va corriendo al día actual mientras la puerta siga abierta.
        Al llegar al 100% se congela: pasa a ser la fecha real de fabricación.
   4.   Al marcar Despachado se rellena la fecha de despacho si está vacía.
   Corren en el navegador, así que se disparan cuando alguien abre la app.        */
const OFFSET = {ALTA:0, MEDIA:3, BAJA:8};

/** Fecha que DEBE tener FECHA PROCESO una puerta abierta, según su prioridad.
 *  null = la automatización no la toca (sin prioridad, o sin fecha de creación
 *  cuando la prioridad exige contar días desde ella). */
function fechaProgramada(c){
  const prio = String(c[C.PRIO]??"").trim().toUpperCase();
  if(!(prio in OFFSET)) return null;
  const hoy0 = new Date(); hoy0.setHours(0,0,0,0);
  const creada = toDate(c[C.FECHA]);
  if(!creada && OFFSET[prio] > 0) return null;   // sin fecha de creación no hay de dónde contar
  const objetivo = creada ? new Date(creada) : new Date(hoy0);
  objetivo.setDate(objetivo.getDate() + OFFSET[prio]);
  return objetivo > hoy0 ? objetivo : hoy0;      // el día programado, o hoy si ya pasó
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

/** Congela la fecha en el día en que la puerta llega al 100%.
 *  Se llama justo después de guardar un cambio de procesos. */
async function congelarSiCompleta(r, estabaCompleta){
  if(CFG.auto===false) return;
  const row = ROWS.find(x=>x.r===r); if(!row) return;
  const ahoraCompleta = completa(row.c);
  if(ahoraCompleta && !estabaCompleta){
    const h = hoy(), antes = fmtDate(row.c[C.FPROC]);
    if(antes !== h){
      row.c[C.FPROC] = h;
      try{
        await writeCells([{a1:`X${r}`, v:[[h]]}]);
        logBulk([{accion:"AUTO", op:row.c[C.OP], fila:r, campo:"Fecha proceso",
                  antes, despues:h}]);
      }catch(e){ console.warn("congelar:", e.message); }
    }
  } else if(!ahoraCompleta && estabaCompleta){
    await autoFechas();                          // volvió a abrirse: se reprograma
  }
}

