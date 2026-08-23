/* Autenticacion con Google Identity Services
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ autenticación ------------------------------ */
/* El correo con el que se entró la última vez. Pasárselo a Google evita el
   selector de cuentas en las visitas siguientes. */
const HINT_KEY = "puertas.ultimo.correo";

function initTokenClient(){
  if(!gisReady || !CFG.clientId) return;
  try{
    const opciones = {
      client_id: CFG.clientId, scope: SCOPE,
      callback: r => { if(r && r.access_token) setToken(r); else authFail(r); }
    };
    // Si la instalación declara un dominio, Google no ofrece cuentas ajenas.
    if(CFG.dominio) opciones.hosted_domain = CFG.dominio;
    // Y si ya se entró antes en este equipo, se va directo a esa cuenta.
    const ultimo = localStorage.getItem(HINT_KEY);
    if(ultimo) opciones.hint = ultimo;
    tokenClient = google.accounts.oauth2.initTokenClient(opciones);
  }catch(e){ $("#g-msg").textContent = "Client ID inválido: "+e.message; }
}
function setToken(r){
  token = r.access_token; tokenExp = Date.now() + (parseInt(r.expires_in,10)||3600)*1000 - 60000;
  const b = $("#reconectar"); if(b) b.classList.add("hide");
  programarRenovacion();
  // se guarda el correo en cuanto se conoce, para la próxima visita
  if(pendingAuth){ pendingAuth.resolve(token); pendingAuth=null; }
}
function authFail(r){
  const msg = (r && (r.error_description||r.error)) || "No se pudo autenticar";
  if(pendingAuth){ pendingAuth.reject(new Error(msg)); pendingAuth=null; }
  $("#g-msg").textContent = msg;
}
let pendingAuth=null;
function requestToken(interactive){
  if(!tokenClient) initTokenClient();
  if(!tokenClient) return Promise.reject(new Error("Configura primero el Client ID"));
  if(pendingAuth) return pendingAuth.p;
  let resolve,reject; const p=new Promise((a,b)=>{resolve=a;reject=b;});
  pendingAuth={p,resolve,reject};
  tokenClient.requestAccessToken({prompt: interactive ? "consent" : ""});
  setTimeout(()=>{ if(pendingAuth){ pendingAuth.reject(new Error("Tiempo de espera agotado")); pendingAuth=null; } }, 120000);
  return p;
}
async function ensureToken(){
  if(token && Date.now() < tokenExp) return token;
  return requestToken(false);
}

/* ---------- renovación anticipada ----------
   El permiso de Google dura una hora. Si se espera a que caduque, la renovación
   cae justo cuando alguien está marcando un proceso, y como no viene de un clic
   el navegador puede bloquear la ventana emergente. Se renueva antes, con la
   pestaña en primer plano, cuando nadie está esperando nada. */
let temporizadorRenovar = null;

function programarRenovacion(){
  clearTimeout(temporizadorRenovar);
  if(!tokenExp) return;
  // A cuatro quintas partes de la vida del permiso, y nunca antes de un minuto.
  const falta = tokenExp - Date.now();
  const cuando = Math.max(60000, falta - 10*60000);
  temporizadorRenovar = setTimeout(async ()=>{
    if(document.hidden){ programarRenovacion(); return; }   // se reintenta al volver
    try{ await requestToken(false); }
    catch(e){ avisarReconectar(); }
  }, cuando);
}

/** Si la renovación silenciosa falla, se pide un clic en vez de perder el trabajo. */
function avisarReconectar(){
  const b = $("#reconectar");
  if(b) b.classList.remove("hide");
}
document.addEventListener("visibilitychange", ()=>{
  if(!document.hidden && tokenExp && Date.now() > tokenExp - 60000){
    requestToken(false).catch(avisarReconectar);
  }
});
function logout(){
  if(token && window.google) try{ google.accounts.oauth2.revoke(token,()=>{}); }catch(e){}
  token=null; tokenExp=0; ROWS=[]; stopPoll();
  $("#app").classList.add("hide"); $("#gate").classList.remove("hide"); $("#g-msg").textContent="";
}

