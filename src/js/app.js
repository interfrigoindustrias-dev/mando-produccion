/* Navegacion entre vistas y arranque de la aplicacion
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ navegación / arranque ------------------------------ */
const VIEWS = ["control","planta","resumen","almacen","stock"];
function goto(v){
  $$(".tab").forEach(x=>x.setAttribute("aria-selected", String(x.dataset.view===v)));
  VIEWS.forEach(x=>$("#v-"+x).classList.toggle("hide", x!==v));
  if(v==="planta")  renderPlanta();
  if(v==="resumen") renderResumen();
  if(v==="almacen") renderAlmacen();
  if(v==="stock"){ renderStock(); renderModelos(); }
}
$$(".tab").forEach(t=>t.onclick=()=>goto(t.dataset.view));
$("#btn-nueva").onclick = ()=>{
  $("#n-op").value = String(nextOp());        // siempre la siguiente disponible
  $("#n-fecha").value = hoy();                // fecha de creación: hoy
  hintOp();
  $("#ov-nueva").classList.remove("hide");
  setTimeout(()=>$("#n-cli").focus(), 60);
};
["f-q", ...FSEL].forEach(id=>{
  $("#"+id).addEventListener("input", render);
  $("#"+id).addEventListener("change", render);
});
$("#f-clear").onclick = ()=>{
  $("#f-q").value=""; FSEL.forEach(id=>$("#"+id).value="");
  SEL.clear(); render();
};
$("#reconectar").onclick = async ()=>{
  // Nace de un clic, así que el navegador no bloquea la ventana de Google.
  const b=$("#reconectar"); b.disabled=true;
  try{
    token=null;
    if(await pedirToken()){ b.classList.add("hide"); refresh(false); }
    else entrarConGoogle();          // la sesión del servidor caducó
  }catch(e){ toast(e.message,"err"); }
  finally{ b.disabled=false; }
};
$("#btn-reload").onclick = ()=>refresh(false);
$("#btn-cfg").onclick = openCfg; $("#g-cfg").onclick = openCfg;
$("#btn-out").onclick = logout;

async function enterApp(){
  $("#u-mail").textContent = userMail || "conectado";
  $("#u-av").textContent = (userMail||"?")[0].toUpperCase();
  $("#gate").classList.add("hide"); $("#app").classList.remove("hide");
  initForm();
  $("#r-dia").value = iso(new Date());
  await detectSep();          // separador de fórmulas según la región del documento
  await refresh(false);
  await repairStatus();       // sana los #ERROR! que pudieran quedar de versiones previas
  const nn = await repairNumeros();   // deshace los números que se guardaron como fecha
  if(nn) toast(`${nn} valor(es) numérico(s) corregido(s)`,"ok");
  try{                                // la hoja siempre con al menos MIN_FILAS filas
    const nf = await ensureRows(MIN_FILAS, 0);
    if(nf) toast(`Hoja ampliada: ${nf} fila(s) añadida(s)`,"ok");
  }catch(e){ console.warn("filas:", e.message); }
  await loadLog();                // el historial hace falta para poder reparar
  const nr = await repairFechasFalsas();
  if(nr) toast(`${nr} fecha(s) de proceso restaurada(s)`,"ok");
  const n = await autoFechas();   // programa las fechas de proceso según prioridad
  if(n) toast(`${n} fecha(s) de proceso programada(s)`,"ok");
  restartPoll();
  await loadModelos();        // catálogo de modelos de stock
  renderDashVisible();
}
$("#g-login").onclick = ()=>{
  if(!cfgOk()){ openCfg(); return; }
  $("#g-msg").textContent = "Abriendo Google…";
  entrarConGoogle();
};

/** Dice exactamente qué falta y de dónde debería venir, en vez de un aviso
 *  genérico que obliga a adivinar. */
function explicarQueFalta(){
  const el = $("#g-falta"); if(!el) return;
  const emp = configDelModulo();
  const falta = [];
  if(!CFG.clientId) falta.push("el <b>Client ID</b>");
  if(!CFG.sheetId)  falta.push("el <b>ID de la hoja</b>");
  const q = falta.join(" y ");
  if(!emp){
    el.innerHTML = `Falta ${q} para el módulo <b>${esc(MOD.nombre)}</b>, y esta instalación
      no trae configuración propia. Pide el <b>enlace de configuración</b> a alguien que ya
      la use (⚙ › Enlace para otros equipos) o introdúcelo a mano en ⚙.`;
  } else {
    el.innerHTML = `Falta ${q} para el módulo <b>${esc(MOD.nombre)}</b>. La instalación sí
      trae configuración: pulsa <b>⚙ › Usar la de la empresa</b> para tomarla.`;
  }
}

(function boot(){
  // Todo lo visible dice a qué producto pertenece: sin ambigüedad posible.
  document.title = MOD.titulo + " | Interfrigo";
  const h1 = document.querySelector("#gate h1");
  if(h1) h1.textContent = MOD.titulo;

  aplicaTema(localStorage.getItem("puertas.tema") || "auto");
  loadCfg();
  $("#g-sheet").textContent = CFG.tab;
  $("#g-cfgwarn").classList.toggle("hide", cfgOk());

  // Si Google devolvió un problema, se dice en vez de dejar la pantalla muda.
  const err = new URLSearchParams(location.search).get("auth_error");
  if(err){
    $("#g-msg").textContent = err === "access_denied"
      ? "Se canceló el acceso. Vuelve a intentarlo."
      : "No se pudo entrar (" + err + ").";
    history.replaceState(null, "", location.pathname);
  }

  if(!cfgOk()) return;

  // ¿Ya hay sesión en el servidor? Entonces se entra sin un solo clic.
  $("#g-msg").textContent = "Conectando…";
  pedirToken().then(t=>{
    if(t){ enterApp(); }
    else { $("#g-msg").textContent = ""; $("#g-login").focus(); }
  }).catch(e=>{ $("#g-msg").textContent = e.message; });
})();
