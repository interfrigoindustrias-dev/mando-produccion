/* Autenticacion con Google Identity Services
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ autenticación ------------------------------ */
function initTokenClient(){
  if(!gisReady || !CFG.clientId) return;
  try{
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CFG.clientId, scope: SCOPE,
      callback: r => { if(r && r.access_token) setToken(r); else authFail(r); }
    });
  }catch(e){ $("#g-msg").textContent = "Client ID inválido: "+e.message; }
}
function setToken(r){
  token = r.access_token; tokenExp = Date.now() + (parseInt(r.expires_in,10)||3600)*1000 - 60000;
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
function logout(){
  if(token && window.google) try{ google.accounts.oauth2.revoke(token,()=>{}); }catch(e){}
  token=null; tokenExp=0; ROWS=[]; stopPoll();
  $("#app").classList.add("hide"); $("#gate").classList.remove("hide"); $("#g-msg").textContent="";
}

