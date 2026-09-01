/* Utilidades: DOM, fechas, tri-estado, progreso y tema
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ utilidades ------------------------------ */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const A1 = n => { let s=""; n++; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=(n-m-1)/26; } return s; };

function toast(msg,kind=""){
  const el=document.createElement("div"); el.className="tst "+kind; el.textContent=msg;
  $("#toast").appendChild(el); setTimeout(()=>{el.style.opacity="0";el.style.transition=".3s";},2600);
  setTimeout(()=>el.remove(),3000);
}
/** TRUE / FALSE / null(no aplica) desde lo que devuelva Sheets */
function tri(v){
  if(v===true) return true;
  if(v===false) return false;
  if(v===null||v===undefined||v==="") return null;
  const s=String(v).trim().toUpperCase();
  if(s==="TRUE"||s==="VERDADERO"||s==="SI"||s==="SÍ"||s==="1"||s==="X") return true;
  if(s==="FALSE"||s==="FALSO"||s==="NO"||s==="0") return false;
  return null;
}
/** avance = hechos / (procesos que aplican) — replica COUNTIF/COUNTA de la hoja */
function progreso(c){
  let ok=0, tot=0;
  for(const p of PROCS){ const v=tri(c[p.i]); if(v===null) continue; tot++; if(v) ok++; }
  return {ok, tot, pct: tot? ok/tot : 0};
}
/* El separador de argumentos de fórmula depende de la configuración regional del
   documento: en es-CO es ";" y en en-US es ",". Escribir el separador equivocado
   deja un #ERROR! en la celda, así que lo deducimos de las fórmulas existentes.
   Si no logramos deducirlo, escribimos el número calculado (siempre válido). */
let SEP = null;
/* La columna del avance y el rango de procesos los declara el producto: en
   puertas son W y N..U, en paneles Q y M..O. Escribir las letras de puertas en
   la hoja de paneles pisaba columnas que alli significan otra cosa. */
const STATUS_COL = MODELO.statusCol;
const PROC_INI = PROCS[0].c, PROC_FIN = PROCS[PROCS.length-1].c;
async function detectSep(){
  try{
    const j = await api(`/values/${encodeURIComponent(rng(STATUS_COL+"2:"+STATUS_COL+"1000"))}?valueRenderOption=FORMULA`);
    let pc=0, ps=0;
    for(const row of (j.values||[])){
      const v=String(row[0]||"");
      if(v[0]!=="=" || !/COUNTIF/i.test(v)) continue;
      if(v.includes(";")) ps++; else if(v.includes(",")) pc++;
    }
    if(ps||pc) SEP = ps>=pc ? ";" : ",";
  }catch(e){ SEP=null; }
}
/** Qué escribir en W: fórmula viva si sabemos el separador, si no el número. */
const statusValue = (r,c) => SEP
  ? `=COUNTIF(${PROC_INI}${r}:${PROC_FIN}${r}${SEP} TRUE) / COUNTA(${PROC_INI}${r}:${PROC_FIN}${r})`
  : progreso(c).pct;
const rowActive = c => String(c[C.OP]??"").trim()!=="" || String(c[C.CLI]??"").trim()!=="";
const num = v => { const n=parseFloat(String(v??"").replace(",",".")); return isNaN(n)?null:n; };
/* Los campos numéricos se envían como NÚMERO, nunca como texto: con USER_ENTERED
   Sheets aplica la configuración regional y en es-CO "1.5" se lee como 1 de mayo. */
const numCell = v => { const n = num(v); return n===null ? "" : n; };
const p2 = n => String(n).padStart(2,"0");
const p2n = p2;
function fmt(d){
  return CFG.dateFmt==="MDY" ? `${p2(d.getMonth()+1)}/${p2(d.getDate())}/${d.getFullYear()}`
                             : `${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()}`;
}
const hoy = () => fmt(new Date());

/* Las fechas llegan de la API como número de serie de Sheets (epoch 1899-12-30).
   Trabajar con el número evita depender del formato visual de cada columna, que
   en esta hoja varía ("d mmmm" en A, "dd-mm-yyyy" en X). */
const SHEET_EPOCH = Date.UTC(1899,11,30);
function serialToDate(n){
  const d = new Date(SHEET_EPOCH + Math.floor(n)*86400000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
/** Acepta serial, "dd/mm/aaaa", "dd-mm-aaaa" o "aaaa-mm-dd". Devuelve Date o null. */
function toDate(v){
  if(v===null||v===undefined||v==="") return null;
  if(typeof v==="number") return v>0 ? serialToDate(v) : null;
  const s=String(v).trim();
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return new Date(+m[1], +m[2]-1, +m[3]);
  m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(m){ const a=+m[1], b=+m[2];
    return CFG.dateFmt==="MDY" ? new Date(+m[3], a-1, b) : new Date(+m[3], b-1, a); }
  return null;
}
/** Para mostrar: si es fecha la formatea, si es texto libre ("MAYO") lo deja igual. */
function fmtDate(v){
  const d = toDate(v);
  return d ? fmt(d) : String(v??"");
}
const sameDay = (a,b) => a && b && a.getTime()===b.getTime();
const iso = d => `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
/** Lunes de la semana de d */
function lunes(d){
  const x=new Date(d), n=(x.getDay()+6)%7;
  x.setDate(x.getDate()-n); return x;
}
/** base numérica de una OP: "492-2" -> 492 */
const opBase = v => { const m=String(v??"").match(/\d+/); return m?parseInt(m[0],10):null; };

/* ------------------------------ tema claro / oscuro ------------------------------ */
const TEMAS = ["auto","light","dark"];
function aplicaTema(t){
  if(t==="auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const oscuro = t==="dark" || (t==="auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const b=$("#btn-tema");
  if(b){ b.textContent = t==="auto" ? "◐" : oscuro ? "☾" : "☀";
         b.title = `Tema: ${{auto:"automático",light:"claro",dark:"oscuro"}[t]} — clic para cambiar`; }
  localStorage.setItem("puertas.tema", t);
}
$("#btn-tema").onclick = ()=>{
  const cur = localStorage.getItem("puertas.tema") || "auto";
  aplicaTema(TEMAS[(TEMAS.indexOf(cur)+1) % TEMAS.length]);
};

