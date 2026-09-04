/* Carga de datos y refresco periodico
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ carga + polling ------------------------------ */
function setSync(kind,txt){
  const d=$("#sync .dot"); d.className="dot"+(kind?" "+kind:""); $("#sync-t").textContent=txt;
}
async function refresh(silent){
  if(busyWrites>0) return;
  const seq = writeSeq;                       // foto del contador de escrituras
  if(!silent) setSync("busy","Cargando…");
  try{
    const rows = await fetchRows();
    // Si mientras leíamos hubo un cambio local, esta respuesta ya está vieja:
    // aplicarla borraría lo que el usuario acaba de marcar.
    if(seq !== writeSeq || busyWrites>0) return;
    const h = JSON.stringify(rows.filter(r=>rowActive(r.c)).map(r=>r.c));
    const changed = h!==lastHash;
    lastHash=h; ROWS=rows;
    if(changed || !silent){
      // Cada paso va aislado: si uno falla, los demás siguen pintando y el
      // error se ve, en vez de dejar la pantalla vacía sin explicación.
      for(const [nombre, fn] of [["filtros",fillLists],["tabla",render],["tablero",renderDashVisible]]){
        try{ fn(); }
        catch(e){ console.error("render/"+nombre, e); toast("Fallo al pintar "+nombre+": "+e.message,"err"); }
      }
    }
    /* Propios de cada producto, y solo con el historial ya cargado: el
       escalado cuenta los dias desde el ultimo cambio, y sin historial creeria
       que nadie ha tocado nada nunca. */
    if(typeof autoPrioridades === "function" &&
       (typeof LOG_LISTO === "undefined" || LOG_LISTO)){
      autoPrioridades();
    }
    setSync("", "Al día · "+new Date().toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"}));
  }catch(e){
    setSync("err", "Error"); if(!silent) toast(e.message,"err"); console.error(e);
  }
}
/** Repinta el dashboard que esté a la vista tras un refresco de datos. */
/* Se recorre lo que esta pagina tiene de verdad. Puertas y paneles no comparten
   tableros, y nombrarlos todos daba por hecho vistas que no existen. */
function renderDashVisible(){
  const visible = id => { const e=$("#v-"+id); return e && !e.classList.contains("hide"); };
  if(visible("planta")){
    // Mientras alguien esta marcando en planta, repintar le borraria el gesto.
    if(typeof plantaEnUso === "function" && plantaEnUso()) return;
    if(typeof renderPlanta === "function") renderPlanta();
    return;
  }
  for(const [id, fn] of [["calidad","renderCalidad"],["resumen","renderResumen"],
                         ["almacen","renderAlmacen"],["stock","renderStock"]]){
    if(!visible(id)) continue;
    if(typeof window[fn] === "function") window[fn]();
    if(id==="stock" && typeof renderModelos === "function") renderModelos();
    return;
  }
}
function restartPoll(){
  stopPoll();
  if(CFG.poll>0) pollTimer=setInterval(()=>{ if(!document.hidden && $("#ov-det").classList.contains("hide")) refresh(true); }, CFG.poll*1000);
}
const stopPoll = ()=>{ if(pollTimer) clearInterval(pollTimer); pollTimer=null; };
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && ROWS.length) refresh(true); });

