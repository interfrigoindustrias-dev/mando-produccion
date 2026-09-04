/* Configuracion del usuario (Client ID, hoja, preferencias)
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ configuración ------------------------------ */
/** Extrae el ID de la hoja de cualquier forma de pegado:
 *  URL completa, el tramo "ID/edit?gid=…", o el ID pelado. */
function parseSheetId(s){
  s = String(s||"").trim();
  const m = s.match(/\/d\/([a-zA-Z0-9-_]+)/);      // URL completa de Google Sheets
  if(m) return m[1];
  return s.split(/[\/?#\s]/)[0];                   // corta en / ? # o espacio
}
const looksLikeId = s => /^[a-zA-Z0-9-_]{20,}$/.test(s);

/* Qué identifica a la instalación. Estos tres campos los fija la empresa. */
const CAMPOS_EMPRESA = ["clientId","sheetId","tab","dominio"];

function loadCfg(){
  // 1) Preferencias del equipo: tema, refresco, formato de fecha, encabezado…
  let guardado = {};
  try{ guardado = JSON.parse(localStorage.getItem(CFG_KEY)||"{}"); }catch(e){}
  Object.assign(CFG, guardado);

  // 2) La configuración de la empresa MANDA sobre lo guardado en el navegador.
  //    Antes era al revés, y un equipo con datos viejos seguía apuntando a la
  //    hoja anterior sin que nadie se diera cuenta. Solo cede si alguien pidió
  //    expresamente otra hoja desde ⚙ (queda marcado como manual).
  const empresa = configDelModulo();
  // Una anulación manual solo vale si de verdad apunta a algún sitio. Si está
  // incompleta —pasaba al guardar ⚙ en un módulo que aún no tenía hoja— se
  // descarta: mejor la configuración de la empresa que quedarse bloqueado.
  const anulacionUtil = guardado.manual && guardado.clientId && guardado.sheetId;
  if(empresa && !anulacionUtil){
    if(guardado.manual){ delete CFG.manual; }      // se limpia la marca inservible
    CAMPOS_EMPRESA.forEach(k=>{
      if(empresa[k] !== undefined && empresa[k] !== "") CFG[k] = empresa[k];
    });
    if(guardado.manual) saveCfg();
  }

  // 3) Un enlace con ?cfg=... configura el dispositivo de una vez.
  aplicarCfgDeEnlace();
  const clean = parseSheetId(CFG.sheetId);         // repara IDs guardados con /edit?gid=…
  if(clean !== CFG.sheetId){ CFG.sheetId = clean; saveCfg(); }
}
function saveCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); }
const cfgOk = () => !!(CFG.clientId && CFG.sheetId);

/** Lee ?cfg=<base64> de la URL, lo aplica y limpia la dirección.
 *  Sirve para configurar un celular sin teclear nada: se abre el enlace y ya. */
function aplicarCfgDeEnlace(){
  try{
    const p = new URLSearchParams(location.search).get("cfg");
    if(!p) return;
    const d = JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g,"+").replace(/_/g,"/")))));
    if(d.clientId) CFG.clientId = d.clientId;
    if(d.sheetId)  CFG.sheetId  = parseSheetId(d.sheetId);
    if(d.tab)      CFG.tab      = d.tab;
    saveCfg();
    history.replaceState(null,"",location.pathname);   // no dejar el dato en la barra
  }catch(e){ console.warn("cfg del enlace:", e.message); }
}

/** Enlace que deja cualquier dispositivo configurado al abrirlo. */
function enlaceDeConfiguracion(){
  const d = JSON.stringify({clientId:CFG.clientId, sheetId:CFG.sheetId, tab:CFG.tab});
  const b64 = btoa(unescape(encodeURIComponent(d))).replace(/\+/g,"-").replace(/\//g,"_");
  return location.origin + location.pathname + "?cfg=" + b64;
}

function openCfg(){
  $("#c-cid").value=CFG.clientId; $("#c-sid").value=CFG.sheetId; $("#c-tab").value=CFG.tab;
  $("#c-poll").value=String(CFG.poll); $("#c-df").value=CFG.dateFmt; $("#c-brand").value=CFG.brand||"";
  $("#c-auto").checked = CFG.auto!==false;
  const emp = configDelModulo();
  const av = $("#c-origen");
  if(av){
    if(emp && !CFG.manual){
      av.className = "aviso ok";
      av.innerHTML = `Módulo <b>${esc(MOD.nombre)}</b>, configurado <b>de fábrica</b>:
        el Client ID y la hoja los fija la empresa y se aplican en todos los equipos.
        No hace falta tocar nada.`;
    } else if(emp && CFG.manual){
      av.className = "aviso";
      av.innerHTML = `Este equipo apunta a una hoja <b>distinta de la de la empresa</b>.
        Pulsa «Usar la de la empresa» para volver a la configuración común.`;
    } else {
      av.className = "aviso";
      av.innerHTML = `El módulo <b>${esc(MOD.nombre)}</b> todavía no tiene hoja asignada.
        Introduce el Client ID y el ID de su hoja aquí, o abre un enlace de configuración.`;
    }
  }
  $("#ov-cfg").classList.remove("hide");
}
$("#c-empresa").onclick = ()=>{
  const emp = configDelModulo();
  if(!emp){ toast("Esta instalación no trae configuración para "+MOD.nombre,"err"); return; }
  delete CFG.manual;
  CAMPOS_EMPRESA.forEach(k=>{ if(emp[k]!==undefined) CFG[k]=emp[k]; });
  saveCfg();
  toast("Restaurada la configuración de la empresa","ok");
  location.reload();
};

$("#c-enlace").onclick = async ()=>{
  if(!cfgOk()){ toast("Primero completa el Client ID y el ID de la hoja","err"); return; }
  const url = enlaceDeConfiguracion();
  try{
    await navigator.clipboard.writeText(url);
    toast("Enlace copiado. Ábrelo en el otro equipo y quedará configurado","ok");
  }catch(e){
    // Sin permiso de portapapeles: se muestra para copiarlo a mano.
    $("#c-sid").value = url;
    $("#c-sid").select();
    toast("Copia el enlace que quedó en el campo de la hoja","err");
  }
};

$("#c-save").onclick = ()=>{
  const sid = parseSheetId($("#c-sid").value);
  if(sid && !looksLikeId(sid)){
    $("#c-sid").value = sid;
    $("#c-sid").focus();
    toast("Ese no parece un ID de hoja válido. Debe ser un texto largo sin espacios ni barras.","err");
    return;
  }
  $("#c-sid").value = sid;                                 // muestra lo que realmente se guarda
  CFG.clientId=$("#c-cid").value.trim(); CFG.sheetId=sid; CFG.tab=$("#c-tab").value.trim()||"OP PUERTA";
  CFG.poll=parseInt($("#c-poll").value,10); CFG.dateFmt=$("#c-df").value; CFG.brand=$("#c-brand").value.trim();
  CFG.auto=$("#c-auto").checked;
  // Cambiar la hoja o el Client ID a mano es una decisión explícita: queda
  // marcada para que la configuración de la empresa no la pise en cada carga.
  const emp = configDelModulo();
  CFG.manual = !!(emp && (CFG.clientId!==emp.clientId || CFG.sheetId!==emp.sheetId || CFG.tab!==emp.tab));
  saveCfg(); $("#ov-cfg").classList.add("hide");
  $("#g-cfgwarn").classList.toggle("hide", cfgOk());
  $("#g-sheet").textContent = CFG.tab;
  restartPoll();
  toast("Configuración guardada","ok");
};

