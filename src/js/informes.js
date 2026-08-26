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
const INF_HEAD = ["NOMBRE","TIPO","FRECUENCIA","DIA","DESTINATARIOS","ACTIVO","ULTIMO ENVIO","CAMPOS","CONDICIONES"];

/* Que filas entran en cada informe. Las COLUMNAS ya no dependen del tipo: se
   eligen del catalogo completo (campos.js), asi que un informe puede llevar
   cualquier dato de la hoja. El tipo solo decide el conjunto de partida, que es
   lo que no se puede expresar con una condicion simple — «terminada dentro del
   periodo» necesita saber cual es el periodo. */
const TIPOS_INFORME = {
  produccion: {
    nombre: "Producción",
    dice: "Puertas terminadas dentro del periodo",
    filas: (rows, desde, hasta) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && completa(c) && enRango(c[C.FPROC], desde, hasta)),
    porDefecto: ["op","tipo","med","cli","esp","pts","fini","fproc"]
  },
  despachos: {
    nombre: "Despachos",
    dice: "Lo que salió hacia cada cliente dentro del periodo",
    filas: (rows, desde, hasta) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && desp(c) === "Despachado" && enRango(c[C.FDESP], desde, hasta)),
    porDefecto: ["fdesp","op","cli","tipo","med","ap","pts","ens"]
  },
  calidad: {
    nombre: "Calidad",
    dice: "Puertas con nota de calidad dentro del periodo",
    filas: (rows, desde, hasta) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && String(c[C.CAL] ?? "").trim() &&
      enRango(c[C.FPROC], desde, hasta)),
    porDefecto: ["fproc","op","cli","tipo","desp","noapta","cal"]
  },
  pendientes: {
    nombre: "Pendientes",
    dice: "Lo que queda por fabricar, sin depender del periodo",
    filas: (rows) => rows.filter(({c}) =>
      rowActive(c) && !anulada(c) && !completa(c) &&
      !["Despachado","En Almacén","Terminado"].includes(desp(c))),
    porDefecto: ["op","cli","tipo","prio","pts","av","lote","dias"]
  },
  todas: {
    nombre: "Todas las fichas",
    dice: "Toda la hoja; se acota con las condiciones",
    // Sin recorte de partida salvo las anuladas: aqui mandan enteramente las
    // condiciones. Es la opcion para un informe que no encaja en las anteriores.
    // Las anuladas quedan fuera igual que en todo el resto de la aplicacion —
    // dejarlas dentro hacia que la app contara 501 y el correo trajera 496.
    filas: (rows) => rows.filter(({c}) => rowActive(c) && !anulada(c)),
    porDefecto: ["op","cli","tipo","med","pts","desp","fproc"]
  }
};

/** Columnas de un informe: las suyas, o las de fábrica de su tipo. */
function columnasDe(inf){
  const T = TIPOS_INFORME[inf.tipo] || TIPOS_INFORME.produccion;
  const ids = String(inf.campos || "").split(",").map(x=>x.trim()).filter(x=>CAMPO_POR_ID[x]);
  return (ids.length ? ids : T.porDefecto).filter(id => CAMPO_POR_ID[id]);
}

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
          ["Producción mensual", "produccion", "mensual", 1, userMail, true, "", "", ""],
          ["Despachos mensual",  "despachos",  "mensual", 1, userMail, true, "", "", ""]
        ]})});
    }
    const j = await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A2:I`)}?valueRenderOption=UNFORMATTED_VALUE`);
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
        campos: String(r[7] ?? "").trim(),
        // Columna I: condiciones, ver campos.js. Vacia = sin filtrar.
        cond:   String(r[8] ?? "").trim()
      }));
  }catch(e){ console.warn("INFORMES:", e.message); INFORMES = []; }
  return INFORMES;
}

/* ---------- CSV ---------- */

/** Genera el CSV de un informe: sus columnas, sus filas y sus condiciones. */
function csvInforme(inf, ref){
  const T = TIPOS_INFORME[inf.tipo] || TIPOS_INFORME.produccion;
  const {desde, hasta, etiqueta} = periodoDe(inf.frec, ref);
  const conds = leerCondiciones(inf.cond);
  const ids   = columnasDe(inf);

  const filas = T.filas(ROWS, desde, hasta).filter(({c}) => cumpleTodas(c, conds));
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cab = ids.map(id => CAMPO_POR_ID[id].n);
  const cuerpo = filas.map(({c}) =>
    ids.map(id => {
      const f = CAMPO_POR_ID[id];
      const v = f.v(c);
      return q(v === null || v === undefined ? "" : v + (f.suf && v !== "" ? f.suf : ""));
    }).join(";"));

  // BOM al principio: sin el, Excel en español abre los acentos rotos.
  const texto = "\ufeff" + [cab.map(q).join(";"), ...cuerpo].join("\r\n");
  return {texto, filas, etiqueta, conds,
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
      ${bloqueColumnas(inf, i)}
      ${bloqueCondiciones(inf, i)}
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

/* Columnas: todas las de la hoja, agrupadas. Marcar y desmarcar es mas rapido
   que escribir nombres, y el orden del archivo es el del catalogo, no el del
   clic — asi dos informes con las mismas columnas salen iguales. */
function bloqueColumnas(inf, i){
  const puestas = new Set(columnasDe(inf));
  return `<details class="infbloque"${puestas.size ? "" : " open"}>
    <summary>Columnas del archivo <b>${puestas.size}</b> de ${CAMPOS.length}</summary>
    <div class="infgrupos">${GRUPOS_CAMPO.map(g=>`
      <div class="infgrupo">
        <h5>${esc(g)}</h5>
        ${CAMPOS.filter(f=>f.g===g).map(f=>`
          <label class="proc mini"><input type="checkbox" data-i="${i}" data-col="${f.id}"
            ${puestas.has(f.id)?"checked":""}><span>${esc(f.n)}</span></label>`).join("")}
      </div>`).join("")}</div>
  </details>`;
}

/* Condiciones: se suman todas. Se eligieron sumadas y no alternadas porque
   «tipo SE12 Y prioridad alta» es lo que se pide de verdad; poder alternar
   añadiria una casilla de Y/O que casi nadie acertaria a la primera. */
function bloqueCondiciones(inf, i){
  const conds = leerCondiciones(inf.cond);
  const fila = (cond, k) => {
    const campo = CAMPO_POR_ID[cond.campo] || CAMPOS[0];
    const ops = operadoresDe(campo.tipo);
    const necesitaValor = OPERADORES[cond.op] && OPERADORES[cond.op].valor;
    const valorCtrl = campo.ops
      ? `<select class="inp mini" data-i="${i}" data-cond="${k}" data-parte="valor">
           ${campo.ops.map(o=>`<option${o===cond.valor?" selected":""}>${esc(o)}</option>`).join("")}
         </select>`
      : campo.tipo === "sino"
        ? `<select class="inp mini" data-i="${i}" data-cond="${k}" data-parte="valor">
             ${["Sí","No"].map(o=>`<option${o===cond.valor?" selected":""}>${o}</option>`).join("")}
           </select>`
        : `<input class="inp mini" data-i="${i}" data-cond="${k}" data-parte="valor"
             value="${esc(cond.valor)}" placeholder="${campo.tipo==="fecha"?"dd/mm/aaaa":"valor"}">`;
    return `<div class="infcond">
      <select class="inp mini" data-i="${i}" data-cond="${k}" data-parte="campo">
        ${GRUPOS_CAMPO.map(g=>`<optgroup label="${esc(g)}">${
          CAMPOS.filter(f=>f.g===g).map(f=>
            `<option value="${f.id}"${f.id===cond.campo?" selected":""}>${esc(f.n)}</option>`).join("")
        }</optgroup>`).join("")}
      </select>
      <select class="inp mini" data-i="${i}" data-cond="${k}" data-parte="op">
        ${ops.map(([k2,o])=>`<option value="${esc(k2)}"${k2===cond.op?" selected":""}>${esc(o.n)}</option>`).join("")}
      </select>
      ${necesitaValor ? valorCtrl : `<span class="mut">—</span>`}
      <button class="btn sm" data-i="${i}" data-quitar="${k}" title="Quitar condición">×</button>
    </div>`;
  };
  return `<details class="infbloque"${conds.length?" open":""}>
    <summary>Condiciones ${conds.length
      ? `<b>${conds.length}</b>` : `<span class="mut">sin filtrar</span>`}</summary>
    <div class="infconds">
      ${conds.map(fila).join("")}
      <button class="btn sm" data-i="${i}" data-anadir="1">+ Añadir condición</button>
      <p class="mut" style="margin:8px 0 0">Se aplican todas a la vez. Una puerta
        entra en el informe solo si las cumple todas.</p>
    </div>
  </details>`;
}

/** Guarda una celda del informe. La fila 1 son encabezados. */
async function guardarInforme(i, campo, valor){
  const inf = INFORMES[i]; if(!inf) return;
  const col = {nombre:"A", tipo:"B", frec:"C", dia:"D", para:"E", activo:"F", campos:"H", cond:"I"}[campo];
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
      // Ya no hace falta vaciar las columnas al cambiar de tipo: el catálogo es
      // común a todos los tipos, así que lo elegido sigue siendo válido.
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
      // Columnas: se guardan todas juntas y en el orden del catalogo, no en el
      // del clic, para que dos informes con las mismas columnas salgan iguales.
      const col = ev.target.closest("[data-col]");
      if(col){
        const i = +col.dataset.i;
        const marcadas = new Set([...document.querySelectorAll(`[data-col][data-i="${i}"]`)]
          .filter(k=>k.checked).map(k=>k.dataset.col));
        if(!marcadas.size){
          col.checked = true;
          toast("El informe necesita al menos una columna","err");
          return;
        }
        guardarInforme(i, "campos", CAMPOS.filter(f=>marcadas.has(f.id)).map(f=>f.id).join(", "));
        return;
      }

      // Condiciones: se reescriben enteras cada vez. Guardar solo la parte
      // tocada obligaria a reconciliar tres controles que se pisan entre si.
      const cp = ev.target.closest("[data-cond]");
      if(cp){
        const i = +cp.dataset.i, k = +cp.dataset.cond, parte = cp.dataset.parte;
        const inf = INFORMES[i];
        const lista = leerCondiciones(inf.cond);
        if(!lista[k]) return;
        if(parte === "campo"){
          lista[k].campo = cp.value;
          // Al cambiar de campo, el operador y el valor viejos pueden no valer:
          // se vuelve a «es» y se vacia, en vez de dejar algo incoherente.
          const nuevo = CAMPO_POR_ID[cp.value];
          const validos = operadoresDe(nuevo.tipo).map(([o])=>o);
          if(!validos.includes(lista[k].op)) lista[k].op = validos[0];
          lista[k].valor = nuevo.ops ? (nuevo.ops[0] || "") : (nuevo.tipo==="sino" ? "Sí" : "");
        }
        else if(parte === "op")    lista[k].op = cp.value;
        else                       lista[k].valor = cp.value;
        guardarInforme(i, "cond", escribirCondiciones(lista));
        if(parte !== "valor") setTimeout(pintarInformes, 60);
        return;
      }

      const el = ev.target.closest("[data-campo]"); if(!el) return;
      const v = el.type === "checkbox" ? el.checked
              : el.type === "number"   ? (num(el.value) || 1)
              : el.value;
      guardarInforme(+el.dataset.i, el.dataset.campo, v);
    });
    l.addEventListener("click", async ev=>{
      const mas = ev.target.closest("[data-anadir]");
      if(mas){
        const i = +mas.dataset.i, inf = INFORMES[i];
        const lista = leerCondiciones(inf.cond);
        lista.push({campo:"tipo", op:"=", valor:(CAMPO_POR_ID.tipo.ops||[""])[0]});
        guardarInforme(i, "cond", escribirCondiciones(lista));
        setTimeout(pintarInformes, 60);
        return;
      }
      const menos = ev.target.closest("[data-quitar]");
      if(menos){
        const i = +menos.dataset.i, k = +menos.dataset.quitar, inf = INFORMES[i];
        const lista = leerCondiciones(inf.cond);
        lista.splice(k, 1);
        guardarInforme(i, "cond", escribirCondiciones(lista));
        setTimeout(pintarInformes, 60);
        return;
      }
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
          await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A${inf.fila}:I${inf.fila}`)}?valueInputOption=USER_ENTERED`,
            {method:"PUT", body: JSON.stringify({values:[["","","","","","","","",""]]})});
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
      await api(`/values/${encodeURIComponent(`'${INF_TAB}'!A:I`)}:append`+
                `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {method:"POST", body: JSON.stringify({values:[
          ["Informe nuevo","produccion","mensual",1,userMail,true,"","",""]]})});
      await loadInformes(); pintarInformes();
      toast("Informe creado. Ponle nombre y destinatarios.","ok");
    }catch(e){ toast(e.message,"err"); }
    finally{ add.disabled = false; }
  };
});
