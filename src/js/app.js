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
$("#btn-reload").onclick = ()=>refresh(false);
$("#btn-cfg").onclick = openCfg; $("#g-cfg").onclick = openCfg;
$("#btn-out").onclick = logout;

async function enterApp(){
  // el correo sale del propio token: sirve para el mensaje de "comparte la hoja con…"
  try{
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:"Bearer "+token}});
    if(r.ok){ const j=await r.json(); userMail=j.email||"";
              if(userMail) localStorage.setItem(HINT_KEY, userMail); }
  }catch(e){}
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
$("#g-login").onclick = async ()=>{
  if(!cfgOk()){ openCfg(); return; }
  $("#g-msg").textContent="Abriendo Google…";
  try{ await requestToken(true); $("#g-msg").textContent=""; await enterApp(); }
  catch(e){ $("#g-msg").textContent = e.message; }
};

(function boot(){
  aplicaTema(localStorage.getItem("puertas.tema") || "auto");
  loadCfg();
  $("#g-sheet").textContent = CFG.tab;
  $("#g-cfgwarn").classList.toggle("hide", cfgOk());
  const wait = setInterval(()=>{
    if(window.google && google.accounts && google.accounts.oauth2){
      clearInterval(wait); gisReady=true; initTokenClient();
      if(cfgOk()){
        // Intento silencioso: si este equipo ya autorizó antes, entra sin un solo clic.
        $("#g-msg").textContent = "Conectando…";
        requestToken(false)
          .then(enterApp)
          .catch(()=>{
            // Primera vez en este dispositivo: Google exige el consentimiento.
            $("#g-msg").textContent = "";
            $("#g-login").focus();
          });
      }
    }
  },150);
  setTimeout(()=>clearInterval(wait), 15000);
})();
