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

function loadCfg(){
  try{ Object.assign(CFG, JSON.parse(localStorage.getItem(CFG_KEY)||"{}")); }catch(e){}
  const clean = parseSheetId(CFG.sheetId);         // repara IDs guardados con /edit?gid=…
  if(clean !== CFG.sheetId){ CFG.sheetId = clean; saveCfg(); }
}
function saveCfg(){ localStorage.setItem(CFG_KEY, JSON.stringify(CFG)); }
const cfgOk = () => !!(CFG.clientId && CFG.sheetId);

function openCfg(){
  $("#c-cid").value=CFG.clientId; $("#c-sid").value=CFG.sheetId; $("#c-tab").value=CFG.tab;
  $("#c-poll").value=String(CFG.poll); $("#c-df").value=CFG.dateFmt; $("#c-brand").value=CFG.brand||"";
  $("#c-auto").checked = CFG.auto!==false;
  $("#ov-cfg").classList.remove("hide");
}
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
  saveCfg(); $("#ov-cfg").classList.add("hide");
  $("#g-cfgwarn").classList.toggle("hide", cfgOk());
  $("#g-sheet").textContent = CFG.tab;
  initTokenClient(); restartPoll();
  if(CFG.auto && ROWS.length) autoFechas();
  toast("Configuración guardada","ok");
};

