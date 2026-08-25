/* Timbre de avisos
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== AVISOS ==============================
   Qué ha pasado desde la última vez que entré. Sale del historial que ya se
   guarda en LOG APP, así que no hace falta nada nuevo en el servidor.

   Dos decisiones deliberadas:
   · No se avisa de lo que uno mismo hizo. Nadie necesita que le cuenten su
     propio trabajo, y si no, el timbre sería ruido constante.
   · Tampoco de los cambios automáticos de fecha: son del sistema, no de nadie,
     y taparían lo que de verdad importa.                                     */

const VISTO_KEY = "interfrigo.avisos." + MOD.id;

const ultimoVisto = () => localStorage.getItem(VISTO_KEY) || "";
const marcarVisto = () => {
  if(LOG.length) localStorage.setItem(VISTO_KEY, LOG[0].fecha + "|" + LOG[0].fila + "|" + LOG[0].campo);
};

/** Entradas del historial posteriores a la última visita, de otras personas. */
function avisosNuevos(){
  const visto = ultimoVisto();
  const out = [];
  for(const e of LOG){                       // LOG viene del más reciente al más antiguo
    if((e.fecha + "|" + e.fila + "|" + e.campo) === visto) break;
    if(e.accion === "AUTO") continue;                       // cambios del sistema
    if(String(e.usuario).toLowerCase() === String(userMail).toLowerCase()) continue;
    out.push(e);
    if(out.length >= 60) break;
  }
  return out;
}

function pintarTimbre(){
  const b = $("#btn-avisos"), n = $("#avisos-n");
  if(!b) return;
  const nuevos = avisosNuevos().length;
  n.textContent = nuevos > 99 ? "99+" : nuevos;
  n.classList.toggle("hide", nuevos === 0);
  b.classList.toggle("hay", nuevos > 0);
  b.title = nuevos ? `${nuevos} cambio(s) desde tu última visita` : "Sin novedades";
}

function abrirAvisos(){
  const nuevos = avisosNuevos();
  const cuerpo = $("#av-lista");

  if(!nuevos.length){
    cuerpo.innerHTML = `<p class="mut" style="padding:16px 2px">Nada nuevo desde tu última visita.</p>`;
  } else {
    // Se agrupan por persona y minuto: diez marcas seguidas son un solo aviso.
    const grupos = [];
    for(const e of nuevos){
      const g = grupos[grupos.length-1];
      if(g && g.fecha === e.fecha && g.usuario === e.usuario && g.op === e.op) g.items.push(e);
      else grupos.push({fecha:e.fecha, usuario:e.usuario, op:e.op, fila:e.fila, items:[e]});
    }
    cuerpo.innerHTML = grupos.map(g=>{
      const det = g.items[0].accion === "CREA"
        ? "creó la ficha"
        : g.items.map(i=>`<b>${esc(i.campo)}</b> ${esc(i.antes||"vacío")} → ${esc(i.despues||"vacío")}`)
                 .slice(0,4).join(" · ") + (g.items.length>4 ? ` y ${g.items.length-4} más` : "");
      return `<div class="av-r ${g.items[0].accion==="CREA"?"crea":""}" data-fila="${esc(g.fila)}">
        <time>${esc(g.fecha)}</time>
        <div><span class="who">${esc(shortUser(g.usuario))}</span>
          <span class="op">OP ${esc(g.op)}</span>
          <span class="what">${det}</span></div>
      </div>`;
    }).join("");
  }
  $("#ov-avisos").classList.remove("hide");
}

/* Al cerrar el panel se da por leído: si se marcara al abrir, un vistazo
   rápido borraría avisos que no llegaron a leerse. */
function cerrarAvisos(){
  marcarVisto();
  pintarTimbre();
  $("#ov-avisos").classList.add("hide");
}

document.addEventListener("DOMContentLoaded", ()=>{
  const b = $("#btn-avisos");
  if(b) b.onclick = abrirAvisos;
  const c = $("#av-cerrar");
  if(c) c.onclick = cerrarAvisos;
  const l = $("#av-lista");
  if(l) l.addEventListener("click", ev=>{
    const r = ev.target.closest("[data-fila]");
    if(!r) return;
    const fila = +r.dataset.fila;
    if(ROWS.some(x=>x.r===fila)){ cerrarAvisos(); openDet(fila); }
  });
});
