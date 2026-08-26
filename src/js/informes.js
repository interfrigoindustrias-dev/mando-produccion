/* Informes programados: definicion, vista previa y descarga
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== INFORMES ==============================
   «Que se manda, a quien y cada cuanto» — configurado desde aqui, ejecutado
   por Google.

   El reparto de trabajo es deliberado:

     · Esta aplicacion DEFINE los informes y los guarda en la pestaña INFORMES.
       Tambien deja verlos y descargarlos al momento, para comprobar que salen
       como se espera antes de programarlos.

     · Un script dentro de la propia hoja (apps-script/informes.gs) los ENVIA.
       Tiene que ser el, y no el navegador: un informe programado debe salir el
       dia 1 a las 7 de la maÃ±ana aunque nadie haya abierto la aplicacion.
       El navegador solo existe mientras alguien lo mira.

   Las dos partes solo se hablan a traves de la pestaña INFORMES, asi que el
   formato de esa pestaña es el contrato entre ambas: si cambia aqui, hay que
   cambiarlo tambien en el script.                                           */

const INF_TAB  = "INFORMES";
const INF_HEAD = ["NOMBRE","TIPO","FRECUENCIA","DIA","DESTINATARIOS","ACTIVO","ULTIMO ENVIO","CAMPOS"];

/* Que sabe hacer cada informe. La funcion `filas` devuelve las puertas que
   entran, y `cols` como se escribe cada una. */
const TIPOS_INFORME = {
  produccion: {
    nombre: "Producción",
    dice: "Puertas terminadas en el periodo, con sus puntos y sus fechas",
    filas: (rows, desde, hasta) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && completa(c) && enRango(c[C.FPROC], desde, hasta)),
    // Columnas y orden pedidos por Interfrigo. «Fecha fin» es la fecha de
    // proceso: el dia en que la puerta llego al 100%.
    cols: ["Orden","Tipo de puerta","Medidas","Cliente","Espesor","Puntos",
           "Fecha inicio","Fecha fin"],
    fila: c => [c[C.OP], c[C.TIPO], medidaDe(c) || "", c[C.CLI],
                num(c[C.ESP]), num(c[C.PTS]),
                fmtDate(c[C.FINI]), fmtDate(c[C.FPROC])]
  },
  despachos: {
    nombre: "Despachos",
    dice: "Lo que salió hacia cada cliente en el periodo",
    filas: (rows, desde, hasta) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && desp(c) === "Despachado" && enRango(c[C.FDESP], desde, hasta)),
    cols: ["Fecha despacho","OP","Cliente","Tipo","Ancho","Alto","Apertura","Puntos","Ensamble"],
    fila: c => [fmtDate(c[C.FDESP]), c[C.OP], c[C.CLI], c[C.TIPO], num(c[C.ANCHO]),
                num(c[C.ALTO]), c[C.AP], num(c[C.PTS]), c[C.ENS]]
  },
  calidad: {
    nombre: "Calidad",
    dice: "Puertas rechazadas y el motivo anotado",
    filas: (rows, desde, hasta) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && String(c[C.CAL] ?? "").trim() &&
      enRango(c[C.FPROC], desde, hasta)),
    cols: ["Fecha","OP","Cliente","Tipo","Estado","Nota de calidad"],
    fila: c => [fmtDate(c[C.FPROC]), c[C.OP], c[C.CLI], c[C.TIPO], desp(c), c[C.CAL]]
  },
  pendientes: {
    nombre: "Pendientes",
    dice: "Lo que queda por fabricar, con prioridad y antigüedad",
    // Una foto del momento: no depende del periodo.
    filas: (rows) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && !completa(c) &&
      !["Despachado","En Almacén","Terminado"].includes(desp(c))),
    cols: ["OP","Cliente","Tipo","Prioridad","Puntos","Avance","Creada","Días abierta"],
    fila: c => {
      const f = toDate(c[C.FECHA]);
      const dias = f ? Math.round((hoy0() - f) / 864e5) : "";
      return [c[C.OP], c[C.CLI], c[C.TIPO], c[C.PRIO], num(c[C.PTS]),
              Math.round(progreso(c).pct * 100) + "%", fmtDate(c[C.FECHA]), dias];
    }
  }
};

const FRECUENCIAS = {
  mensual: {nombre:"Mensual", dice:"El día indicado de cada mes, con el mes anterior completo"},
  semanal: {nombre:"Semanal", dice:"El día indicado de cada semana, con los 7 días anteriores"}
};
const DIAS_SEMANA = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

/** ¿La fecha de la celda cae dentro del periodo? Ambos extremos incluidos. */
function enRango(celda, desde, hasta){
  if(!desde || !hasta) return true;
  const f = toDate(celda);
  return !!f && f >= desde && f <= hasta;
}

/** Periodo que le toca a un informe, contado hacia atrás desde hoy. */
function periodoDe(frecuencia, ref){
  const h = ref ? new Date(ref) : hoy0();
  if(frecuencia === "semanal"){
    const desde = new Date(h); desde.setDate(desde.getDate() - 7);
    const hasta = new Date(h); hasta.setDate(hasta.getDate() - 1);
    return {desde, hasta, etiqueta: `${fmt(desde)} a ${fmt(hasta)}`};
  }
  // Mensual: el mes anterior completo. Se manda el 1 lo de todo el mes pasado,
  // no los ultimos 30 dias: un informe mensual tiene que cuadrar con el mes.
  const desde = new Date(h.getFullYear(), h.getMonth() - 1, 1);
  const hasta = new Date(h.getFullYear(), h.getMonth(), 0);
  const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio",
                 "agosto","septiembre","octubre","noviembre","diciembre"];
  return {desde, hasta, etiqueta: `${MESES[desde.getMonth()]} ${desde.getFullYear()}`};
}

let INFORMES = [];

async function loadInformes(){
  try{
    const meta = await api("?fields=sheets.properties.title");
    const hay = (meta.sheets || []).some(s => s.properties.title === INF_TAB);
    if(!hay){
      await api(":batchUpdate", {method:"POST", body: JSON.stringify({
        requests:[{addSheet:{properties:{title:INF_TAB, gridProperties:{frozenRowCount:1}}}}]})});
      await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A1`)}?valueInputOption=USER_ENTERED`,
        {method:"PUT", body: JSON.stringify({values:[
          INF_HEAD,
          ["Producción mensual", "produccion", "mensual", 1, userMail, true, "", ""],
          ["Despachos mensual",  "despachos",  "mensual", 1, userMail, true, "", ""]
        ]})});
    }
    const j = await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A2:H`)}?valueRenderOption=UNFORMATTED_VALUE`);
    INFORMES = (j.values || [])
      .filter(r => String(r[0] ?? "").trim())
      .map((r, i) => ({
        fila:   i + 2,
        nombre: String(r[0]).trim(),
        tipo:   String(r[1] ?? "produccion").trim().toLowerCase(),
        frec:   String(r[2] ?? "mensual").trim().toLowerCase(),
        dia:    num(r[3]) || 1,
        para:   String(r[4] ?? "").trim(),
        activo: tri(r[5]) !== false,
        ultimo: String(r[6] ?? "").trim(),
        // Columna H: que columnas lleva el CSV. Vacia = todas las del tipo.
        campos: String(r[7] ?? "").trim()
      }));
  }catch(e){ console.warn("INFORMES:", e.message); INFORMES = []; }
  return INFORMES;
}

/* ---------- CSV ---------- */

/** Indices de las columnas elegidas, en el orden pedido. null = todas. */
function indicesCampos(inf, T){
  if(!inf.campos) return null;
  const quiere = inf.campos.split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);
  const idx = quiere.map(n => T.cols.findIndex(c => c.toLowerCase() === n)).filter(i => i >= 0);
  // Si ninguna coincide se manda entero: mejor un informe de mas que uno vacio.
  return idx.length ? idx : null;
}

/** Genera el CSV de un informe, con las columnas que se le hayan pedido. */
function csvInforme(inf, ref){
  const T = TIPOS_INFORME[inf.tipo] || TIPOS_INFORME.produccion;
  const {desde, hasta, etiqueta} = periodoDe(inf.frec, ref);
  const filas = T.filas(ROWS, desde, hasta);
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const idx = indicesCampos(inf, T);
  const solo = f => idx ? idx.map(i => f[i]) : f;
  const cuerpo = filas.map(({c}) => solo(T.fila(c)).map(q).join(";"));
  // BOM al principio: sin el, Excel en español abre los acentos rotos.
  const texto = "﻿" + [solo(T.cols).map(q).join(";"), ...cuerpo].join("\r\n");
  return {texto, filas, etiqueta,
          nombre: `${inf.tipo}_${etiqueta.replace(/\s+/g,"_")}.csv`};
}

function descargarInforme(i){
  const inf = INFORMES[i]; if(!inf) return;
  const {texto, nombre, filas} = csvInforme(inf);
  if(!filas.length){ toast("Ese informe no tiene ninguna fila en el periodo","err"); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], {type:"text/csv;charset=utf-8"}));
  a.download = nombre; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 3000);
}

/* ---------- panel ---------- */

function abrirInformes(){
  if(!puede("crear") && !puede("*")){ toast("No tienes permiso para gestionar informes","err"); return; }
  const u = $("#inf-url");        if(u) u.value = META.scriptUrl || "";
  const pp = $("#inf-prueba-para"); if(pp && !pp.value) pp.value = userMail || "";
  pintarInformes();
  $("#ov-informes").classList.remove("hide");
}

/** Cuándo sale la próxima vez, dicho en palabras. */
function cuandoSale(inf){
  if(!inf.activo) return "Desactivado";
  return inf.frec === "semanal"
    ? `Cada ${DIAS_SEMANA[Math.min(6, Math.max(1, inf.dia)) - 1] || "lunes"}`
    : `El día ${inf.dia} de cada mes`;
}

function pintarInformes(){
  const opt = (obj, sel) => Object.entries(obj)
    .map(([k,v]) => `<option value="${k}"${k===sel?" selected":""}>${esc(v.nombre)}</option>`).join("");

  $("#inf-lista").innerHTML = INFORMES.map((inf, i) => {
    const T = TIPOS_INFORME[inf.tipo] || {};
    const {filas, etiqueta} = csvInforme(inf);
    return `<div class="infc${inf.activo?"":" off"}" data-i="${i}">
      <div class="infh">
        <input class="inp infn" data-i="${i}" data-campo="nombre" value="${esc(inf.nombre)}">
        <label class="proc"><input type="checkbox" data-i="${i}" data-campo="activo"
          ${inf.activo?"checked":""}><span>Activo</span></label>
      </div>
      <div class="infg">
        <label class="f"><span>Qué incluye</span>
          <select class="inp" data-i="${i}" data-campo="tipo">${opt(TIPOS_INFORME, inf.tipo)}</select></label>
        <label class="f"><span>Cada cuánto</span>
          <select class="inp" data-i="${i}" data-campo="frec">${opt(FRECUENCIAS, inf.frec)}</select></label>
        <label class="f"><span>${inf.frec==="semanal"?"Día de la semana":"Día del mes"}</span>
          ${inf.frec==="semanal"
            ? `<select class="inp" data-i="${i}" data-campo="dia">${DIAS_SEMANA.map((d,k)=>
                `<option value="${k+1}"${k+1===inf.dia?" selected":""}>${d}</option>`).join("")}</select>`
            : `<input class="inp" type="number" min="1" max="28" data-i="${i}" data-campo="dia" value="${inf.dia}">`}
        </label>
        <label class="f wide"><span>Para quién (correos separados por coma)</span>
          <input class="inp" data-i="${i}" data-campo="para" value="${esc(inf.para)}"
            placeholder="gerencia@interfrigo.com.co, jefe@interfrigo.com.co"></label>
      </div>
      <div class="infcampos">
        <span class="mut">Columnas del archivo</span>
        ${T.cols ? T.cols.map(col=>{
          const puesto = !inf.campos || inf.campos.toLowerCase().split(",")
            .map(x=>x.trim()).includes(col.toLowerCase());
          return `<label class="proc mini"><input type="checkbox" data-i="${i}" data-col="${esc(col)}"
            ${puesto?"checked":""}><span>${esc(col)}</span></label>`;
        }).join("") : ""}
      </div>
      <div class="inff">
        <span class="mut">${esc(T.dice||"")} · <b>${cuandoSale(inf)}</b>${
          inf.ultimo ? ` · último envío ${esc(inf.ultimo)}` : " · aún no se ha enviado"}</span>
        <div class="grow"></div>
        <span class="mut">Ahora mismo: <b>${filas.length}</b> fila(s) · ${esc(etiqueta)}</span>
        <button class="btn sm" data-descargar="${i}">⇩ Ver CSV</button>
        <button class="btn sm" data-borrar="${i}">Borrar</button>
      </div>
    </div>`;
  }).join("") || `<p class="mut" style="padding:20px 2px">Todavía no hay ningún informe.</p>`;
}

/** Guarda una celda del informe. La fila 1 son encabezados. */
async function guardarInforme(i, campo, valor){
  const inf = INFORMES[i]; if(!inf) return;
  const col = {nombre:"A", tipo:"B", frec:"C", dia:"D", para:"E", activo:"F", campos:"H"}[campo];
  if(!col) return;
  const antes = inf[campo];
  inf[campo] = valor;
  try{
    await api(`/values/${encodeURIComponent(`'${INF_TAB}'!${col}${inf.fila}`)}?valueInputOption=USER_ENTERED`,
      {method:"PUT", body: JSON.stringify({values:[[valor]]})});
    logChanges("EDITA", "informe", inf.fila,
               [{campo:`Informe · ${campo}`, antes:String(antes), despues:String(valor)}]);
    setSync("", "Guardado");
    // Cambiar la frecuencia cambia el control del día: hay que repintar.
    if(campo === "frec" || campo === "tipo" || campo === "activo"){
      // Cambiar de tipo cambia las columnas: las elegidas del tipo viejo ya no
      // valen, así que se vuelve a «todas» en vez de dejar una mezcla inválida.
      if(campo === "tipo" && inf.campos){ inf.campos = ""; guardarInforme(i, "campos", ""); }
      pintarInformes();
    }
  }catch(e){ inf[campo] = antes; pintarInformes(); toast(e.message, "err"); }
}

document.addEventListener("DOMContentLoaded", ()=>{
  const b = $("#btn-informes");
  if(b) b.onclick = abrirInformes;

  const url = $("#inf-url");
  if(url) url.addEventListener("change", ()=> guardarScriptUrl(url.value));
  const pr = $("#inf-probar");
  if(pr) pr.onclick = probarCorreo;

  const l = $("#inf-lista");
  if(l){
    l.addEventListener("change", ev=>{
      // Casillas de columna: se guardan todas juntas, en el orden del tipo, para
      // que el CSV no salga con las columnas desordenadas.
      const col = ev.target.closest("[data-col]");
      if(col){
        const i = +col.dataset.i, inf = INFORMES[i];
        const T = TIPOS_INFORME[inf.tipo] || TIPOS_INFORME.produccion;
        const marcadas = [...document.querySelectorAll(`[data-col][data-i="${i}"]`)]
          .filter(k=>k.checked).map(k=>k.dataset.col);
        if(!marcadas.length){
          col.checked = true;
          toast("El informe necesita al menos una columna","err");
          return;
        }
        // Vacio significa «todas»: mas robusto que listarlas, porque si mañana
        // el tipo gana una columna, el informe la incluye sola.
        const valor = marcadas.length === T.cols.length ? ""
                    : T.cols.filter(c=>marcadas.includes(c)).join(", ");
        guardarInforme(i, "campos", valor);
        return;
      }
      const el = ev.target.closest("[data-campo]"); if(!el) return;
      const v = el.type === "checkbox" ? el.checked
              : el.type === "number"   ? (num(el.value) || 1)
              : el.value;
      guardarInforme(+el.dataset.i, el.dataset.campo, v);
    });
    l.addEventListener("click", async ev=>{
      const d = ev.target.closest("[data-descargar]");
      if(d){ descargarInforme(+d.dataset.descargar); return; }
      const x = ev.target.closest("[data-borrar]");
      if(x){
        const inf = INFORMES[+x.dataset.borrar]; if(!inf) return;
        if(!confirm(`¿Borrar el informe «${inf.nombre}»?`)) return;
        x.disabled = true;
        try{
          // Se vacia la fila en vez de eliminarla: borrar filas descuadraria el
          // numero de fila que cada informe tiene guardado.
          await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A${inf.fila}:H${inf.fila}`)}?valueInputOption=USER_ENTERED`,
            {method:"PUT", body: JSON.stringify({values:[["","","","","","","",""]]})});
          logChanges("EDITA", "informe", inf.fila,
                     [{campo:"Informe borrado", antes:inf.nombre, despues:""}]);
          await loadInformes(); pintarInformes();
          toast("Informe borrado","ok");
        }catch(e){ toast(e.message,"err"); }
        finally{ x.disabled = false; }
      }
    });
  }

/* Comprobar que el correo llega de verdad.
   El navegador no puede mandar correo: lo manda el script de Google. Se le
   dispara una peticion y no se lee la respuesta — Google no deja leerla desde
   otro dominio — pero eso da igual: la prueba se comprueba mirando el buzon.  */
async function probarCorreo(){
  const url = String(META.scriptUrl || "").trim();
  const para = $("#inf-prueba-para").value.trim() || userMail;
  if(!url){
    toast("Falta el enlace del script de Google","err");
    $("#inf-url").focus();
    return;
  }
  if(!url.startsWith("https://script.google.com/")){
    toast("Ese enlace no parece de Apps Script","err");
    return;
  }
  const b = $("#inf-probar"); b.disabled = true;
  const antes = b.textContent; b.textContent = "Enviando…";
  try{
    await fetch(`${url}?a=prueba&para=${encodeURIComponent(para)}`, {mode:"no-cors"});
    $("#inf-estado").className = "aviso ok";
    $("#inf-estado").innerHTML = `Se pidió el correo de prueba a <b>${esc(para)}</b>.
      Debería llegar en menos de un minuto. Si no llega, revisa la carpeta de
      correo no deseado y que el script esté publicado con acceso
      <b>«Cualquier usuario»</b>.`;
  }catch(e){
    $("#inf-estado").className = "aviso prog";
    $("#inf-estado").textContent = "No se pudo contactar el script: " + e.message;
  }finally{ b.disabled = false; b.textContent = antes; }
}

  const add = $("#inf-add");
  if(add) add.onclick = async ()=>{
    add.disabled = true;
    try{
      await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A:H`)}:append`+
                `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {method:"POST", body: JSON.stringify({values:[
          ["Informe nuevo","produccion","mensual",1,userMail,true,"",""]]})});
      await loadInformes(); pintarInformes();
      toast("Informe creado. Ponle nombre y destinatarios.","ok");
    }catch(e){ toast(e.message,"err"); }
    finally{ add.disabled = false; }
  };
});
