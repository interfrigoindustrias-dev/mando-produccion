/* Cliente de la API de Google Sheets y reparaciones de datos
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ API Sheets ------------------------------ */
async function api(path, opts={}, retried=false){
  const t = await ensureToken();
  const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(CFG.sheetId)+path, {
    ...opts, headers:{Authorization:"Bearer "+t, "Content-Type":"application/json", ...(opts.headers||{})}
  });
  if(res.status===401 && !retried){ token=null; return api(path,opts,true); }
  if(!res.ok){
    let d=""; try{ d = (await res.json()).error.message; }catch(e){ d = res.statusText; }
    if(res.status===403) d += " — ¿la hoja está compartida como editor con "+(userMail||"tu cuenta")+"?";
    if(res.status===404) d += ` — no existe la hoja «${CFG.sheetId}» o la pestaña «${CFG.tab}». Revísalo en ⚙.`;
    throw new Error(d);
  }
  return res.json();
}
const rng = a1 => `'${CFG.tab.replace(/'/g,"''")}'!${a1}`;

async function fetchRows(){
  const q = `/values/${encodeURIComponent(rng("A1:"+LAST_COL))}`+
            `?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
  const j = await api(q);
  const vals = j.values||[];
  const out=[];
  for(let i=1;i<vals.length;i++){                       // fila 1 = encabezados
    const c = vals[i].slice(0,NCOL);
    while(c.length<NCOL) c.push("");
    out.push({r:i+1, c});
  }
  return out;
}
/* Un proceso «no aplica» no debe existir para esa puerta: ni casilla en la app ni
   casilla en la hoja. Para que Sheets deje de dibujar el cuadrito hay que quitarle
   la validación de datos a esa celda concreta (y devolvérsela si vuelve a aplicar). */
let GID = null;                                  // id interno de la pestaña OP PUERTA
async function ensureGid(){
  if(GID!==null) return GID;
  try{
    const m = await api("?fields=sheets.properties(title,sheetId)");
    const s = (m.sheets||[]).find(x=>x.properties.title===CFG.tab);
    GID = s ? s.properties.sheetId : null;
  }catch(e){ GID=null; }
  return GID;
}
/** La hoja tiene un número fijo de filas. Si vamos a escribir más allá del
 *  final hay que ampliarla primero, o la API responde «exceeds grid limits». */
const MIN_FILAS = 1000;                          // colchón permanente de la hoja
async function ensureRows(maxRow, margen=100){
  const gid = await ensureGid();
  if(gid===null) return 0;
  const meta = await api("?fields=sheets.properties(title,sheetId,gridProperties.rowCount)");
  const sh = (meta.sheets||[]).find(x=>x.properties.title===CFG.tab);
  const actuales = sh && sh.properties.gridProperties ? sh.properties.gridProperties.rowCount : 0;
  if(!actuales || maxRow <= actuales) return 0;
  const faltan = (maxRow - actuales) + margen;
  await api(":batchUpdate", {method:"POST", body: JSON.stringify({
    requests:[{appendDimension:{sheetId:gid, dimension:"ROWS", length:faltan}}]})});
  return faltan;
}

/** cambios: [{fila, col:<índice 0-based>, aplica:boolean}] */
async function setCheckboxUI(cambios){
  const gid = await ensureGid();
  if(gid===null || !cambios.length) return;
  const req = cambios.map(({fila,col,aplica})=>({
    setDataValidation:{
      range:{sheetId:gid, startRowIndex:fila-1, endRowIndex:fila,
             startColumnIndex:col, endColumnIndex:col+1},
      ...(aplica ? {rule:{condition:{type:"BOOLEAN"}, showCustomUi:true, strict:true}} : {})
    }
  }));
  try{ await api(":batchUpdate", {method:"POST", body: JSON.stringify({requests:req})}); }
  catch(e){ console.warn("checkbox:", e.message); }
}

/** Repara celdas de STATUS que quedaron en #ERROR! escribiendo el número calculado.
 *  Siempre numérico: así converge aunque el separador detectado fuese incorrecto. */
async function repairStatus(){
  const bad = ROWS.filter(x=>rowActive(x.c) &&
    typeof x.c[C.STATUS]==="string" && x.c[C.STATUS].trim().startsWith("#"));
  if(!bad.length) return;
  await writeCells(bad.slice(0,80).map(x=>({a1:`${STATUS_COL}${x.r}`, v:[[ progreso(x.c).pct ]]})));
  bad.slice(0,80).forEach(x=>{ x.c[C.STATUS] = progreso(x.c).pct; });
  toast(`${Math.min(bad.length,80)} celda(s) de STATUS reparada(s)`,"ok");
}
/** Repara campos numéricos que Sheets convirtió en fecha.
 *  Ocurría al escribir "1.5": en es-CO se interpreta como 1 de mayo y se guarda
 *  el número de serie (46143). El valor original se reconstruye como día.mes. */
/* Cuales son numericos lo dice el producto, no este archivo: un panel no tiene
   ni vano ni puntos, y en su hoja esas letras son otra cosa. */
const NUMERICOS = (MODELO.numericos||[])
  .filter(x => C[x.k] !== undefined)
  .map(x => ({i: C[x.k], col: A1(C[x.k]), n: x.n}));
async function repairNumeros(){
  const ups=[], logs=[];
  for(const {r,c} of ROWS){
    if(!rowActive(c)) continue;
    for(const {i,col,n} of NUMERICOS){
      const v = num(c[i]);
      if(v===null || v < 20000) continue;        // un vano o un puntaje nunca llega ahí
      const d = serialToDate(v);
      const orig = parseFloat(`${d.getDate()}.${d.getMonth()+1}`);
      ups.push({a1:`${col}${r}`, v:[[orig]]});
      logs.push({accion:"AUTO", op:c[C.OP], fila:r, campo:n, antes:v, despues:orig});
      c[i] = orig;
    }
  }
  if(!ups.length) return 0;
  try{
    await writeCells(ups); logBulk(logs); render(); renderDashVisible();
    return ups.length;
  }catch(e){ console.warn("repair num:", e.message); return 0; }
}
/** escribe celdas sueltas: [{a1:"N5", v:[[valor]]}] */
async function writeCells(list){
  if(!list.length) return;
  // Un solo punto de paso para todas las escrituras: si el rol no puede
  // modificar, se corta aquí en vez de confiar en que la interfaz lo impida.
  if(typeof puede === "function" && !puede("marcar") && !puede("editar") && !puede("*")){
    toast("Tu acceso es de solo lectura","err");
    throw new Error("solo lectura");
  }
  writeSeq++;                               // invalida cualquier lectura en vuelo
  busyWrites++; setSync("busy","Guardando…");
  try{
    await api(`/values:batchUpdate`, {method:"POST", body: JSON.stringify({
      valueInputOption:"USER_ENTERED",
      data: list.map(u=>({range: rng(u.a1), values:u.v}))
    })});
  } finally { busyWrites--; }
}



/* ============================== VALIDACION DE LA HOJA ==============================
   La aplicacion y la hoja tienen que ofrecer las mismas opciones. Si se añade
   URGENTE aqui pero no alli, quien escriba directo en la hoja no lo encuentra,
   y la celda le queda marcada como invalida.

   Se comprueba antes de escribir: reponer la validacion en cada arranque
   gastaria una peticion por nada casi siempre.                                */
async function sincronizarValidacion(){
  const gid = await ensureGid();
  if(gid === null) return 0;

  /* Que columnas llevan desplegable lo declara el producto. Antes estaban
     escritas a mano con las letras de puertas, y en la hoja de paneles la
     columna 12 no es la prioridad sino la casilla de PERFIL: ponerle un
     desplegable le quitaba la casilla. */
  const CATALOGO = {PRIORIDADES, DESPACHOS, SELLOS,
                    ESTADOS: MODELO.listas.ESTADOS || []};
  const listas = (MODELO.validaciones||[])
    .filter(v => C[v.k] !== undefined && (CATALOGO[v.lista]||[]).length)
    .map(v => ({col: C[v.k], ops: CATALOGO[v.lista]}));
  if(!listas.length) return 0;
  const req = listas.map(({col, ops}) => ({
    setDataValidation:{
      range:{sheetId:gid, startRowIndex:1, endRowIndex:MIN_FILAS,
             startColumnIndex:col, endColumnIndex:col+1},
      rule:{condition:{type:"ONE_OF_LIST",
                       values: ops.map(v=>({userEnteredValue:v}))},
            showCustomUi:true, strict:false}
    }
  }));
  try{
    await api(":batchUpdate", {method:"POST", body: JSON.stringify({requests:req})});
    // Encabezados de las columnas que la aplicacion añadio, para que se
    // entiendan desde la hoja. Solo los que declara este producto.
    for(const [rango, valores] of Object.entries(MODELO.encabezados||{})){
      await api(`/values/${encodeURIComponent(rng(rango))}?valueInputOption=USER_ENTERED`,
        {method:"PUT", body: JSON.stringify({values:[valores]})});
    }
    return 1;
  }catch(e){ console.warn("validacion:", e.message); return 0; }
}
