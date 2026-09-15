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
   y la palabra dejaria de significar nada.

   Se sube UN escalon cada vez, no directo a ALTA: una BAJA olvidada pasa a
   MEDIA, y si sigue sin tocarse, cinco dias despues pasa a ALTA. Saltar de BAJA
   a ALTA de golpe metia en cabeza de cola cosas que solo llevaban esperando.

   ALTA no sube mas, pero tampoco se queda quieta: a los cinco dias sin tocar
   se coloca delante de las demas ALTA, justo detras de las urgentes. Eso es
   orden, no prioridad — la etiqueta sigue diciendo ALTA, que es la verdad. */
const ESCALA  = {MEDIA:"ALTA", BAJA:"MEDIA"};   // a donde sube cada una
const ESPERA  = {MEDIA:5, BAJA:8, ALTA:5};      // dias sin tocar que lo disparan

/* «Sin tocarse» es sin tocarse, no «desde que se creo»: una puerta que se
   reviso ayer no lleva olvidada diez dias aunque se creara hace diez. El
   historial sabe cuando fue la ultima vez; si de esa fila no hay nada escrito,
   vale la fecha de creacion. */
function ultimoToque(r, c){
  let t = toDate(c[C.FECHA]);
  let ms = t ? t.getTime() : 0;
  for(const e of (typeof LOG !== "undefined" ? LOG : [])){
    if(Number(e.fila) !== Number(r)) continue;
    const d = toDate(e.fecha);
    if(d && d.getTime() > ms) ms = d.getTime();
  }
  return ms || null;
}

/** Dias enteros que lleva una fila sin que nadie la toque. */
function diasSinTocar(r, c){
  const ms = ultimoToque(r, c);
  return ms === null ? null : Math.floor((hoy0().getTime() - ms) / 86400000);
}

/* La hoja tiene que tener las columnas que la app usa. Cuando se añade una
   nueva, nadie va a ir a escribir el encabezado a mano en una hoja de 1.470
   filas: lo hace la app la primera vez que alguien la abre. Solo escribe donde
   no hay nada, asi que si alguien ya los puso —o los llamo de otra forma— no
   se los pisa. */
const COLUMNAS_NUEVAS = [
  {a1:"AN1", t:"COTIZACION"},
  {a1:"AO1", t:"ORDEN DE COMPRA"},
  /* La programacion de la produccion: que dia se empieza cada OP y en que
     puesto de ese dia. Van en la hoja y no en el navegador porque las lee
     planta desde otra pantalla. */
  {a1:"AP1", t:"ORDEN PROGRAMADO"},
  {a1:"AQ1", t:"FECHA PROGRAMADA"}
];

/* Si la programacion puede guardar, y si no, por que. Lo lee programa.js para
   decirlo arriba del tablero en vez de fallar al soltar una ficha. */
let PROG_COLUMNAS = {ok:false, motivo:"todavía no se ha comprobado la hoja"};

/* Columnas propias que no se han podido confirmar. tramosFila (modelo.js) las
   salta al crear una fila: si AP o AQ tuvieran datos de otra cosa, escribirles
   la cadena vacia de una ficha nueva los borraria. Mientras no se confirmen
   —tambien antes de comprobarlas, al arrancar— no se tocan. Mismo nombre y
   contrato que en paneles; las dos paginas no se cargan juntas. */
function columnasPropiasSinReservar(){
  const out = [];
  if(!PROG_COLUMNAS.ok) out.push(C.PROG_ORDEN, C.PROG_FECHA);
  return out.filter(i => i !== undefined);
}

const idxA1 = a1 => {                          // "AN1" -> indice 0-based
  const L = a1.replace(/\d+$/, "");
  return [...L].reduce((n,ch)=>n*26 + (ch.charCodeAt(0)-64), 0) - 1;
};
const normaEncabezado = t => String(t ?? "").trim().toUpperCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "");

async function migrarColumnas(){
  /* Comprobar los encabezados no es una automatizacion: se hace siempre. Solo
     CREAR columnas depende de que las automatizaciones esten encendidas. */
  const crear = CFG.auto !== false;

  /* Primero la rejilla. La hoja llegaba hasta AM —39 columnas— y escribir en
     AN o AO no es «celda vacia», es fuera del tablero: la API rechaza el rango
     entero. Como cada guardado escribe la fila completa de A a la ultima
     columna, sin esto NINGUN guardado funcionaria. */
  if(crear){
    try{
      const gid = await ensureGid();
      if(gid !== null){
        const meta = await api("?fields=sheets.properties(title,sheetId,gridProperties.columnCount)");
        const sh = (meta.sheets||[]).find(x=>x.properties.title===CFG.tab);
        const hay = sh && sh.properties.gridProperties ? sh.properties.gridProperties.columnCount : 0;
        if(hay && hay < NCOL){
          await api(":batchUpdate", {method:"POST", body: JSON.stringify({requests:[
            {appendDimension:{sheetId:gid, dimension:"COLUMNS", length: NCOL - hay}}]})});
        }
      }
    }catch(e){
      console.warn("ampliar columnas:", e.message);
      PROG_COLUMNAS = {ok:false, motivo:"no se pudo ampliar la hoja: " + e.message};
      return 0;
    }
  }

  let cab;
  try{
    const res = await api(`/values/${encodeURIComponent(CFG.tab)}!A1:${LAST_COL}1`);
    cab = (res.values && res.values[0]) || [];
  }catch(e){
    console.warn("migrar columnas:", e.message);
    PROG_COLUMNAS = {ok:false, motivo:"no se pudo leer la fila de encabezados"};
    return 0;
  }

  /* Solo se escribe donde no hay NADA. Si alguien ya puso otra cosa en esa
     celda —o la llamo distinto— no se le pisa: esa columna puede tener datos. */
  const faltan = COLUMNAS_NUEVAS.filter(x => idxA1(x.a1) < NCOL && !String(cab[idxA1(x.a1)] ?? "").trim());
  let creadas = 0;
  if(faltan.length && crear){
    try{
      await writeCells(faltan.map(x=>({a1:x.a1, v:[[x.t]]})));
      faltan.forEach(x => { cab[idxA1(x.a1)] = x.t; });
      creadas = faltan.length;
    }catch(e){ console.warn("migrar columnas:", e.message); }
  }

  /* La programacion solo se da por lista si sus DOS columnas dicen exactamente
     lo que tienen que decir. Leer AP y AQ a ciegas seria leer lo que otro haya
     puesto ahi como si fueran dias y puestos. */
  const prog = COLUMNAS_NUEVAS.filter(x => /^A[PQ]1$/.test(x.a1));
  const mal = prog.find(x => normaEncabezado(cab[idxA1(x.a1)]) !== normaEncabezado(x.t));
  if(C.PROG_ORDEN === undefined || C.PROG_FECHA === undefined){
    PROG_COLUMNAS = {ok:false, motivo:"esta versión de la aplicación todavía no conoce esas columnas"};
  }else if(mal){
    const hay = String(cab[idxA1(mal.a1)] ?? "").trim();
    PROG_COLUMNAS = {ok:false, motivo: hay
      ? `la columna ${mal.a1.replace(/\d+$/,"")} ya se llama «${hay}»`
      : `falta la columna ${mal.a1.replace(/\d+$/,"")} y tu acceso no puede crearla`};
  }else{
    PROG_COLUMNAS = {ok:true, motivo:""};
  }
  // Si el tablero esta abierto, que diga ya si se puede guardar o no.
  const vp = document.getElementById("v-programa");
  if(vp && !vp.classList.contains("hide") && typeof renderPrograma === "function") renderPrograma();
  return creadas;
}

/** Fecha de inicio de producción: la columna AB de la hoja.
 *  Se escribe UNA sola vez, cuando se marca el primer proceso. Si se
 *  reescribiera en cada marca dejaría de significar «cuándo empezó». */
async function marcarInicioProduccion(r){
  if(CFG.auto===false) return;
  const row = ROWS.find(x=>x.r===r);
  if(!row || anulada(row.c)) return;
  const c = row.c;
  if(progreso(c).ok <= 0) return;                   // aún no hay ningún proceso hecho

  /* Primer paso marcado: En proceso + comienzo. Dos reglas, iguales que en
     paneles:
       · el estado solo se pone si la puerta NO tenia ninguno. Marcar un
         proceso en una devuelta la deja devuelta, y en una terminada no la
         devuelve a produccion;
       · el comienzo se sella UNA vez: si ya tenia fecha, ya se habia empezado.
     Desmarcar despues no deshace ninguna de las dos. */
  const h = hoy();
  const ups = [], logs = [];
  const sinEstado = !String(c[C.DESP]??"").trim();
  const sinComienzo = !String(c[C.FINI]??"").trim();
  if(sinEstado){
    ups.push({a1:`Y${r}`, v:[[EN_PROCESO]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Estado despacho", antes:"", despues:EN_PROCESO});
  }
  if(sinComienzo){
    ups.push({a1:`AB${r}`, v:[[h]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Inicio de producción", antes:"", despues:h});
  }
  if(!ups.length) return;
  if(sinEstado) c[C.DESP] = EN_PROCESO;             // se ve ya; la hoja va detras
  if(sinComienzo) c[C.FINI] = h;
  try{
    await writeCells(ups);
    logBulk(logs);
  }catch(e){
    if(sinEstado) c[C.DESP] = "";
    if(sinComienzo) c[C.FINI] = "";
    console.warn("inicio produccion:", e.message);
    toast("No se pudo poner En proceso: " + e.message, "err");
  }
}

/** Pone «En proceso» a las puertas que ya estaban empezadas cuando nacio el
 *  flujo de estados y siguen sin estado. Con el flujo, esas puertas solo
 *  cambiarian al marcar su siguiente paso, y mientras tanto la hoja diria que
 *  no se han empezado. El usuario pidio actualizarlas todas.
 *
 *  Tres cosas a proposito:
 *    · solo toca el ESTADO, y solo si esta vacio y hay algun paso marcado;
 *    · NO inventa el comienzo: si no tenia fecha, no se sabe cuando empezo, y
 *      poner la de hoy seria escribir un dato falso;
 *    · NO apunta cada puerta en el historial: el historial cuenta como «tocada»
 *      cualquier fila con apunte y les reiniciaria el reloj de la subida de
 *      prioridad a puertas que nadie ha mirado.
 *  Idempotente: una vez puestas, no queda nada que hacer. */
async function repairEnProceso(){
  if(CFG.auto===false || busyWrites>0) return 0;
  const cambiar = ROWS.filter(({c}) => rowActive(c) && !anulada(c) &&
    !String(c[C.DESP]??"").trim() && progreso(c).ok > 0);
  if(!cambiar.length) return 0;
  cambiar.forEach(({c}) => { c[C.DESP] = EN_PROCESO; });
  try{
    await writeCells(cambiar.map(({r}) => ({a1:`Y${r}`, v:[[EN_PROCESO]]})));
    lastHash = "";
    render(); renderDashVisible();
    return cambiar.length;
  }catch(e){
    cambiar.forEach(({c}) => { c[C.DESP] = ""; });
    console.warn("en proceso:", e.message);
    return 0;
  }
}

/** Lo que hay que escribir ademas del estado al cambiarlo.
 *    Terminado  -> FIN DE PROCESO (X) = hoy, y el comienzo si faltaba.
 *    Despachado -> FECHA DE DESPACHO (Z) = hoy, si no tenia.
 *
 *  El fin se escribe SIEMPRE al terminar, no solo si esta vacio: antes la
 *  columna X se reescribia con cada marca de proceso, asi que lo que tenga una
 *  puerta sin terminar es la ultima vez que alguien marco algo, no su fin. Una
 *  devuelta que se vuelve a terminar tambien estrena fecha: se termino otra vez.
 *
 *  Devuelve {ups, cambios} y ya deja los valores puestos en la fila. */
function fechasAlCambiarEstado(row, nuevo){
  const c = row.c, r = row.r, h = hoy();
  const ups = [], cambios = [];
  if(CFG.auto === false) return {ups, cambios};
  if(nuevo === "Terminado"){
    if(fmtDate(c[C.FPROC]) !== h){
      ups.push({a1:`X${r}`, v:[[h]]});
      cambios.push({campo:"Fin de proceso", antes:fmtDate(c[C.FPROC]), despues:h});
      c[C.FPROC] = h;
    }
    // Terminada sin haber marcado nada: al menos queda cuando se empezo.
    if(!String(c[C.FINI]??"").trim()){
      ups.push({a1:`AB${r}`, v:[[h]]});
      cambios.push({campo:"Inicio de producción", antes:"", despues:h});
      c[C.FINI] = h;
    }
  }
  if(nuevo === "Despachado" && !fmtDate(c[C.FDESP])){
    ups.push({a1:`Z${r}`, v:[[h]]});
    cambios.push({campo:"Fecha despacho", antes:"", despues:h});
    c[C.FDESP] = h;
  }
  return {ups, cambios};
}

/** Sube a ALTA lo que ya agotó su margen de espera.
 *  Idempotente: solo escribe lo que de verdad cambia. */
async function autoPrioridades(){
  if(CFG.auto===false || busyWrites>0) return 0;
  /* Sin historial no se escala. «Sin tocarse» se lee del historial, y si no
     ha cargado —o su pestaña ha fallado— toda fila pareceria intacta desde
     que nacio y saltaria un escalon que no le toca. Mejor no escalar hoy que
     escalar mal: mañana se vuelve a intentar, y una prioridad subida sola no
     se baja sola. */
  if(typeof LOG_LISTO !== "undefined" && !LOG_LISTO) return 0;

  const ups=[], logs=[];
  for(const {r,c} of ROWS){
    if(!rowActive(c) || completa(c) || anulada(c)) continue;
    const prio = String(c[C.PRIO]??"").trim().toUpperCase();
    const sube = ESCALA[prio];
    if(!sube) continue;                 // URGENTE, ALTA o sin prioridad: no suben
    const dias = diasSinTocar(r, c);
    if(dias === null || dias < ESPERA[prio]) continue;   // todavía está en plazo

    ups.push({a1:`M${r}`, v:[[sube]]});
    logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:"Prioridad",
               antes:prio, despues:sube});
    c[C.PRIO] = sube;
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

/* Aqui vivia la programacion de fechas por prioridad: MEDIA entraba a planta a
   los 3 dias de creada, BAJA a los 8, y se escribia esa fecha futura en la
   columna X. Se ha quitado entera.

   Dos motivos. El primero, que escondia trabajo: planta no enseñaba lo que
   «todavia no tocaba», y eran 23 puertas de 51. El segundo, que esa columna
   significa OTRA cosa en todos los demas sitios —calidad la enseña como
   «Fabricada», los informes como «Fecha fin»—, asi que meterle una fecha
   futura de una puerta sin empezar era escribir un dato falso.

   La prioridad ya no decide CUANDO aparece una puerta, decide en que orden se
   hace. La fecha de fin la sella pulsar Terminada (fechasAlCambiarEstado). */

/* Aqui vivia tocarFechaProceso, que reescribia la columna X con la fecha de
   hoy cada vez que se marcaba un proceso. Con el flujo de estados X es el FIN
   DE PROCESO y lo sella pulsar Terminada (fechasAlCambiarEstado): seguir
   pisandola en cada marca haria que una puerta a medias pareciera acabada el
   ultimo dia que alguien toco una casilla. */

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
