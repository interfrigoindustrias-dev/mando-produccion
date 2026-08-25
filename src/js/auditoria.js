/* Historial de cambios en la pestana LOG APP
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ============================== AUDITORÍA ==============================
   Cada cambio queda registrado en la pestaña «LOG APP» de la misma hoja:
   fecha, usuario (correo de Google), acción, OP, fila, campo, antes y después.
   La pestaña se crea sola la primera vez; no toca ninguna hoja existente. */
let LOG = [];                 // {fecha, usuario, accion, op, fila, campo, antes, despues}
let logAt = 0, logReady = null;

async function ensureLog(){
  if(logReady!==null) return logReady;
  try{
    const meta = await api("?fields=sheets.properties.title");
    const hay = (meta.sheets||[]).some(s=>s.properties.title===LOG_TAB);
    if(!hay){
      await api(":batchUpdate", {method:"POST", body: JSON.stringify({
        requests:[{addSheet:{properties:{title:LOG_TAB, gridProperties:{frozenRowCount:1}}}}]
      })});
      await api(`/values/${encodeURIComponent(`'${LOG_TAB}'!A1`)}?valueInputOption=RAW`,
        {method:"PUT", body: JSON.stringify({values:[LOG_HEAD]})});
    }
    logReady = true;
  }catch(e){ console.warn("LOG:", e.message); logReady = false; }
  return logReady;
}
/** Registra n cambios de una sola vez. Nunca interrumpe el guardado principal. */
async function logChanges(accion, op, fila, cambios){
  if(!cambios.length) return;
  const ts = new Date();
  const stamp = `${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const filas = cambios.map(c=>[stamp, userMail||"desconocido", accion, String(op??""), fila,
                               c.campo, String(c.antes??""), String(c.despues??"")]);
  cambios.forEach(c=>LOG.unshift({fecha:stamp, usuario:userMail||"desconocido", accion,
    op:String(op??""), fila:String(fila), campo:c.campo, antes:String(c.antes??""), despues:String(c.despues??"")}));
  try{
    if(!(await ensureLog())) return;
    await api(`/values/${encodeURIComponent(`'${LOG_TAB}'!A:H`)}:append`+
              `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {method:"POST", body: JSON.stringify({values:filas})});
  }catch(e){ console.warn("LOG:", e.message); }
}
/** Registra muchos cambios de golpe (un solo append). Para las automatizaciones. */
async function logBulk(entries){
  if(!entries.length) return;
  const ts=new Date(), stamp=`${fmt(ts)} ${p2(ts.getHours())}:${p2(ts.getMinutes())}`;
  const quien = entries[0].accion==="AUTO" ? `auto (${userMail||"?"})` : (userMail||"desconocido");
  const filas = entries.map(e=>[stamp, quien, e.accion, String(e.op??""), e.fila,
                               e.campo, String(e.antes??""), String(e.despues??"")]);
  entries.forEach(e=>LOG.unshift({fecha:stamp, usuario:quien, accion:e.accion, op:String(e.op??""),
    fila:String(e.fila), campo:e.campo, antes:String(e.antes??""), despues:String(e.despues??"")}));
  try{
    if(!(await ensureLog())) return;
    await api(`/values/${encodeURIComponent(`'${LOG_TAB}'!A:H`)}:append`+
              `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {method:"POST", body: JSON.stringify({values:filas})});
  }catch(e){ console.warn("LOG:", e.message); }
}
async function loadLog(force){
  if(!force && Date.now()-logAt < 60000) return;
  try{
    if(!(await ensureLog())) return;
    const j = await api(`/values/${encodeURIComponent(`'${LOG_TAB}'!A2:H`)}`);
    LOG = (j.values||[]).map(r=>({fecha:r[0]||"", usuario:r[1]||"", accion:r[2]||"", op:r[3]||"",
                                  fila:r[4]||"", campo:r[5]||"", antes:r[6]||"", despues:r[7]||""})).reverse();
    logAt = Date.now();
    if(typeof pintarTimbre === "function") pintarTimbre();
  }catch(e){ console.warn("LOG:", e.message); }
}
const shortUser = m => String(m||"").split("@")[0];
/** Historial de una puerta: por OP si la tiene, si no por número de fila. */
function histOf(op, fila){
  const o=String(op??"").trim();
  return LOG.filter(e => o ? e.op===o : String(e.fila)===String(fila));
}
function renderHist(op, fila){
  const h = histOf(op, fila);
  const box = $("#d-hist");
  if(!h.length){
    box.innerHTML = `<p class="mut">Sin movimientos registrados. El historial empieza a
      guardarse desde que se usa esta versión de la app.</p>`;
    return;
  }
  // agrupa los cambios hechos en el mismo minuto por la misma persona
  const grupos=[];
  for(const e of h){
    const g = grupos[grupos.length-1];
    if(g && g.fecha===e.fecha && g.usuario===e.usuario && g.accion===e.accion) g.items.push(e);
    else grupos.push({fecha:e.fecha, usuario:e.usuario, accion:e.accion, items:[e]});
  }
  box.innerHTML = grupos.map(g=>{
    const det = g.accion==="CREA"
      ? "creó la ficha"
      : g.items.map(i=>`<b>${esc(i.campo)}</b>: ${esc(i.antes||"vacío")} → ${esc(i.despues||"vacío")}`).join(" · ");
    return `<div class="hist-r ${g.accion==="CREA"?"crea":""}">
      <time>${esc(g.fecha)}</time>
      <div><span class="who">${esc(shortUser(g.usuario))}</span> <span class="what">${det}</span></div>
    </div>`;
  }).join("");
}
$("#d-hist-r").onclick = async ()=>{
  const row=ROWS.find(x=>x.r===detRow); if(!row) return;
  $("#d-hist").innerHTML = `<p class="mut">Cargando…</p>`;
  await loadLog(true); renderHist(row.c[C.OP], detRow);
};

