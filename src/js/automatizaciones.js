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
const OFFSET = {URGENTE:0, ALTA:0, MEDIA:3, BAJA:8};

/* ESCALADO DE PRIORIDAD — nada se queda atrás para siempre.
   Una puerta espera su turno para entrar a planta y, pasado un margen, sube a
   ALTA sola. Contado desde la fecha de creación:

     ALTA   entra hoy mismo.
     MEDIA  entra a los 3 días; aguanta 2 más como MEDIA; al 5.º día pasa a ALTA.
     BAJA   entra a los 8 días; aguanta 5 más como BAJA; al 13.º día pasa a ALTA.

   El cambio se escribe en la columna M y queda en el historial como AUTO, para
   que se vea que lo hizo el sistema y no una persona. */
/* URGENTE no esta aqui, y es deliberado: nada escala hasta urgente. Urgente lo
   decide una persona; si el tiempo bastara para llegar, acabaria siendolo todo
   y la palabra dejaria de significar nada. Lo que espera demasiado sube a ALTA
   y ahi se queda. */
const ESCALA = {MEDIA: 3 + 2, BAJA: 8 + 5};

/** Fecha de inicio de producción: la columna AB de la hoja.
 *  Se escribe UNA sola vez, cuando se marca el primer proceso. Si se
 *  reescribiera en cada marca dejaría de significar «cuándo empezó». */
async function marcarInicioProduccion(r){
  if(CFG.auto===false) return;
  const row = ROWS.find(x=>x.r===r);
  if(!row || anulada(row.c)) return;
  if(String(row.c[C.FINI]??"").trim()) return;      // ya tiene fecha: no se toca
  if(progreso(row.c).ok <= 0) return;               // aún no hay ningún proceso hecho

  const h = hoy();
  row.c[C.FINI] = h;
  try{
    await writeCells([{a1:`AB${r}`, v:[[h]]}]);
    logBulk([{accion:"AUTO", op:row.c[C.OP], fila:r,
              campo:"Inicio de producción", antes:"", despues:h}]);
  }catch(e){ row.c[C.FINI]=""; console.warn("inicio produccion:", e.message); }
}

/** Sube a ALTA lo que ya agotó su margen de espera.
 *  Idempotente: solo escribe lo que de verdad cambia. */
async function autoPrioridades(){
  if(CFG.auto===false || busyWrites>0) return 0;
  const hoyMs = hoy0().getTime();
  const ups=[], logs=[];
  for(const {r,c} of ROWS){
    if(!rowActive(c) || completa(c) || anulada(c)) continue;
    const prio = String(c[C.PRIO]??"").trim().toUpperCase();
    if(!(prio in ESCALA)) continue;                 // ALTA o sin prioridad: nada que hacer
    const creada = toDate(c[C.FECHA]);
    if(!creada) continue;                           // sin fecha no hay desde dónde contar
    const limite = new Date(creada);
    limite.setDate(limite.getDate() + ESCALA[prio]);
    if(limite.getTime() > hoyMs) continue;          // todavía está en plazo

    ups.push({a1:`M${r}`, v:[["ALTA"]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Prioridad",
               antes:prio, despues:"ALTA"});
    c[C.PRIO] = "ALTA";
  }
  if(!ups.length) return 0;
  try{
    await writeCells(ups);
    logBulk(logs);
    render(); renderDashVisible();
    if(typeof renderPlanta === "function"){ plantaDibujada=""; renderPlanta(); }
    return ups.length;
  }catch(e){ console.warn("auto prioridades:", e.message); return 0; }
}

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

/** Al tocar un proceso, la fecha de proceso pasa al día actual.
 *
 *  Excepción que manda sobre todo lo demás: una puerta que YA estaba al 100%
 *  tiene la fecha congelada — es su fecha real de fabricación. Retocar un
 *  proceso suyo (una corrección, un dato que faltaba) no puede reescribirla,
 *  o la puerta aparecería como fabricada hoy y falsearía la producción del día.
 *
 *  @param estabaCompleta  si la puerta estaba al 100% ANTES de este cambio. */
async function tocarFechaProceso(r, estabaCompleta){
  if(CFG.auto===false) return;
  const row = ROWS.find(x=>x.r===r);
  if(!row || anulada(row.c)) return;
  if(estabaCompleta && completa(row.c)) return;   // seguía terminada: fecha congelada

  const h = hoy(), antes = fmtDate(row.c[C.FPROC]);
  if(antes === h) return;
  row.c[C.FPROC] = h;
  try{
    await writeCells([{a1:`X${r}`, v:[[h]]}]);
    logBulk([{accion:"AUTO", op:row.c[C.OP], fila:r, campo:"Fecha proceso", antes, despues:h}]);
  }catch(e){ row.c[C.FPROC] = antes; console.warn("fecha proceso:", e.message); }
}

/* Nombres de los procesos, para reconocerlos en el historial. */
const CAMPOS_PROCESO = new Set(PROCS.map(p => p.k));

/** Deshace las fechas de proceso que se reescribieron sin que hubiera trabajo.
 *
 *  Una versión anterior ponía la fecha de hoy al tocar cualquier proceso, aunque
 *  la puerta ya estuviera al 100%. Eso hacía que puertas fabricadas hace semanas
 *  aparecieran como producción del día.
 *
 *  El historial permite repararlo sin adivinar: para cada puerta terminada cuya
 *  fecha se cambió hoy de forma automática, si NO hubo ningún cambio de proceso
 *  ese mismo día, entonces no se trabajó en ella y se restaura el valor anterior. */
async function repairFechasFalsas(){
  if(!LOG.length) return 0;
  const h = hoy();

  const porFila = new Map();
  for(const e of LOG){
    if(e.fecha.slice(0, h.length) !== h) continue;      // solo lo de hoy
    const f = String(e.fila);
    const d = porFila.get(f) || {fechas: [], procesos: 0};
    if(e.campo === "Fecha proceso" && e.accion === "AUTO") d.fechas.push(e);
    if(CAMPOS_PROCESO.has(e.campo)) d.procesos++;
    porFila.set(f, d);
  }

  const ups = [], logs = [];
  for(const [fila, d] of porFila){
    if(!d.fechas.length || d.procesos > 0) continue;    // hubo trabajo real: se respeta
    const row = ROWS.find(x => String(x.r) === fila);
    if(!row || !completa(row.c)) continue;              // solo puertas ya terminadas
    if(fmtDate(row.c[C.FPROC]) !== h) continue;         // ya no tiene la fecha de hoy

    // El valor más antiguo de la cadena de hoy es el original.
    const original = d.fechas[d.fechas.length - 1].antes;
    if(original === h) continue;
    ups.push({a1: `X${row.r}`, v: [[original]]});
    logs.push({accion: "AUTO", op: row.c[C.OP], fila: row.r,
               campo: "Fecha proceso (restaurada)", antes: h, despues: original});
    row.c[C.FPROC] = original;
  }
  if(!ups.length) return 0;
  try{
    await writeCells(ups);
    logBulk(logs);
    render(); renderDashVisible();
    return ups.length;
  }catch(e){ console.warn("restaurar fechas:", e.message); return 0; }
}


/* ============================== MIGRACION ==============================
   «Separado» dejo de ser una etapa y paso a ser una columna propia (AL). Esto
   mueve lo que quedo escrito con el formato viejo, una sola vez y sin perder
   nada:

     · el comprador —que iba anexado al cliente con una flecha— pasa a AL
     · el cliente recupera su nombre limpio
     · la etapa pasa a «En Almacen», que es donde estan de verdad

   Si una separada no dice para quien, se marca SIN INDICAR en vez de dejarla
   en blanco: perder el dato de que esta reservada seria peor que no saber el
   comprador. Es idempotente: solo toca filas que todavia digan «Separado». */
const SIN_COMPRADOR = "SIN INDICAR";

async function repairSeparadas(){
  const ups = [], logs = [];
  for(const {r, c} of ROWS){
    if(!rowActive(c)) continue;
    const eraEstado = String(c[C.DESP] ?? "").trim() === "Separado";
    const conFlecha = String(c[C.CLI] ?? "").includes(SEP_MARCA);
    // Una reserva ya en su columna pero sin el anexo en el cliente: hay que
    // reponerlo, que es lo que hace que se vea en impresiones e informes.
    const faltaAnexo = String(c[C.SEPA] ?? "").trim() && !conFlecha;
    // Hay dos restos del formato viejo, y los dos hay que limpiar: la etapa
    // «Separado», y el comprador anexado al cliente. Este segundo aparece
    // tambien en puertas ya despachadas, que nunca dejarian de arrastrarlo.
    if(!eraEstado && !conFlecha && !faltaAnexo) continue;


    const comprador = separadaPara(c) || (eraEstado ? SIN_COMPRADOR : "");

    if(comprador && comprador !== String(c[C.SEPA] ?? "").trim()){
      ups.push({a1:`AL${r}`, v:[[comprador]]});
      c[C.SEPA] = comprador;
    }
    // La etapa solo se corrige si «Separado» la estaba ocupando: una puerta ya
    // despachada se queda despachada.
    if(eraEstado){
      ups.push({a1:`Y${r}`, v:[["En Almacén"]]});
      c[C.DESP] = "En Almacén";
    }
    // El cliente lleva el comprador anexado: asi viaja a impresiones e informes
    // sin que cada vista tenga que conocer la columna nueva.
    const conAnexo = comprador ? clienteBase(c) + SEP_MARCA + comprador : clienteBase(c);
    if(conAnexo !== String(c[C.CLI] ?? "")){
      ups.push({a1:`C${r}`, v:[[conAnexo]]});
      c[C.CLI] = conAnexo;
    }
    if(!ups.length) continue;
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Separada para",
               antes: eraEstado ? "(estado Separado)" : "(anexado al cliente)",
               despues: comprador || "—"});
  }
  if(!ups.length) return 0;
  try{
    await writeCells(ups);
    logBulk(logs);
    render(); renderDashVisible();
    return logs.length;
  }catch(e){ console.warn("separadas:", e.message); return 0; }
}
