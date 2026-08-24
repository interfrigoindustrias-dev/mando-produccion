/* Autenticacion con Google, sin ventanas emergentes
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== AUTENTICACIÓN ==============================
   Todo ocurre en la misma ventana. La página pide un permiso a auth.php; si no
   hay sesión, envía al usuario a Google y Google lo devuelve a la aplicación.

   El canje del código lo hace el servidor, porque exige un secreto de cliente
   que no puede estar en el navegador. A cambio, el servidor guarda un permiso
   de renovación: a partir de ahí las renovaciones son invisibles, sin ventanas
   emergentes ni redirecciones.

   Cada persona entra con SU cuenta, así que el historial sigue diciendo quién
   hizo cada cambio.                                                          */

const HINT_KEY = "puertas.ultimo.correo";
const AUTH = "auth.php";

let pidiendoToken = null;
const paginaActual = () => location.pathname.split("/").pop() || MOD.pagina;

/** Pide un permiso vigente al servidor. Devuelve null si hace falta entrar. */
async function pedirToken(){
  if(pidiendoToken) return pidiendoToken;
  pidiendoToken = (async ()=>{
    try{
      const r = await fetch(`${AUTH}?a=token`, {credentials:"same-origin", cache:"no-store"});
      if(r.status === 401) return null;                 // sin sesión
      if(!r.ok) throw new Error("auth " + r.status);
      const d = await r.json();
      if(!d.access_token) return null;
      token    = d.access_token;
      tokenExp = Date.now() + (parseInt(d.expires_in,10)||3600)*1000 - 60000;
      if(d.email){
        userMail = d.email;
        localStorage.setItem(HINT_KEY, d.email);
      }
      const b = $("#reconectar"); if(b) b.classList.add("hide");
      programarRenovacion();
      return token;
    } finally { pidiendoToken = null; }
  })();
  return pidiendoToken;
}

/** Envía a Google en la MISMA ventana. Al volver, la sesión ya está lista. */
function entrarConGoogle(){
  location.href = `${AUTH}?a=login&next=${encodeURIComponent(paginaActual())}`;
}

async function ensureToken(){
  if(token && Date.now() < tokenExp) return token;
  const t = await pedirToken();
  if(t) return t;
  avisarReconectar();
  throw new Error("La sesión de Google caducó. Pulsa Reconectar.");
}

/* ---------- renovación anticipada ----------
   El permiso dura una hora. Renovarlo al caducar lo dejaba caer justo cuando
   alguien estaba marcando un proceso. Se renueva antes, contra el servidor,
   sin que el usuario note nada. */
let temporizadorRenovar = null;

function programarRenovacion(){
  clearTimeout(temporizadorRenovar);
  if(!tokenExp) return;
  const falta = tokenExp - Date.now();
  const cuando = Math.max(60000, falta - 10*60000);
  temporizadorRenovar = setTimeout(async ()=>{
    if(document.hidden){ programarRenovacion(); return; }   // se reintenta al volver
    token = null;
    if(!await pedirToken()) avisarReconectar();
  }, cuando);
}

/** Si la renovación falla, se pide un clic en vez de perder el trabajo. */
function avisarReconectar(){
  const b = $("#reconectar");
  if(b) b.classList.remove("hide");
}

document.addEventListener("visibilitychange", async ()=>{
  if(document.hidden || !tokenExp) return;
  if(Date.now() > tokenExp - 60000){
    token = null;
    if(!await pedirToken()) avisarReconectar();
  }
});

async function logout(){
  try{ await fetch(`${AUTH}?a=logout`, {credentials:"same-origin"}); }catch(e){}
  token = null; tokenExp = 0; userMail = "";
  ROWS = []; stopPoll();
  clearTimeout(temporizadorRenovar);
  $("#app").classList.add("hide");
  $("#gate").classList.remove("hide");
  $("#g-msg").textContent = "";
}
