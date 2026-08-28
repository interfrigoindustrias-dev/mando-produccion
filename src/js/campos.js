/* Catalogo de columnas y condiciones para los informes
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== CAMPOS ==============================
   Todo lo que un informe puede llevar y todo por lo que puede filtrarse.

   Este archivo es el CONTRATO con apps-script/informes.gs: los mismos
   identificadores, en el mismo orden, calculando lo mismo. Si aqui se añade un
   campo, hay que añadirlo alli — si no, la aplicacion enseñara una columna que
   el correo no trae, que es peor que no tenerla.

   El identificador corto (`id`) es lo que se guarda en la hoja. Se eligio corto
   y estable en vez del nombre visible porque el nombre puede cambiar sin que
   los informes guardados dejen de entenderse.

   `tipo` decide como se compara y que control se enseña:
     texto   igual, distinto, contiene, vacio, con dato
     num     ademas mayor y menor
     fecha   ademas antes y despues
     si/no   solo igual, con Si y No
     lista   igual, contra las opciones de la hoja                             */

const CAMPOS = [
  /* --- identificacion --- */
  {id:"op",     n:"Orden",             g:"Identificación", tipo:"texto", v:c=>c[C.OP]},
  {id:"cli",    n:"Cliente",           g:"Identificación", tipo:"texto", v:c=>c[C.CLI]},
  {id:"clibase",n:"Cliente sin comprador", g:"Identificación", tipo:"texto",
   v:c=>clienteBase(c)},
  {id:"seppara",n:"Separada para",     g:"Identificación", tipo:"texto", v:c=>separadaPara(c)},
  {id:"sepsi",  n:"¿Separada?",         g:"Identificación", tipo:"sino",
   v:c=>separada(c)?"Sí":"No"},
  {id:"lote",   n:"Fecha / lote",      g:"Identificación", tipo:"texto", v:c=>fmtDate(c[C.FECHA])},
  {id:"ens",    n:"N.º de ensamble",   g:"Identificación", tipo:"texto", v:c=>c[C.ENS]},
  {id:"prio",   n:"Prioridad",         g:"Identificación", tipo:"lista", v:c=>c[C.PRIO],
   ops:PRIORIDADES},
  {id:"comp",   n:"Complemento",       g:"Identificación", tipo:"sino",  v:c=>tri(c[C.COMP])===true?"Sí":"No"},
  {id:"stock",  n:"Stock",             g:"Identificación", tipo:"sino",  v:c=>tri(c[C.STOCK])===true?"Sí":"No"},

  /* --- especificacion --- */
  {id:"tipo",   n:"Tipo de puerta",    g:"Especificación", tipo:"lista", v:c=>c[C.TIPO], ops:TIPOS},
  {id:"mat",    n:"Material",          g:"Especificación", tipo:"lista", v:c=>c[C.MAT],  ops:MATERIALES},
  {id:"med",    n:"Medidas",           g:"Especificación", tipo:"texto", v:c=>medidaDe(c)},
  {id:"ancho",  n:"Ancho vano",        g:"Especificación", tipo:"num",   v:c=>num(c[C.ANCHO])},
  {id:"alto",   n:"Alto vano",         g:"Especificación", tipo:"num",   v:c=>num(c[C.ALTO])},
  {id:"esp",    n:"Espesor",           g:"Especificación", tipo:"lista", v:c=>c[C.ESP],  ops:ESPESORES},
  {id:"ap",     n:"Apertura",          g:"Especificación", tipo:"lista", v:c=>c[C.AP],   ops:APERTURAS},
  {id:"pts",    n:"Puntos",            g:"Especificación", tipo:"num",   v:c=>num(c[C.PTS])},
  {id:"marco",  n:"Tipo de marco",     g:"Especificación", tipo:"lista", v:c=>c[C.MARCO], ops:TIPOS_MARCO},
  {id:"visor",  n:"Visor",             g:"Especificación", tipo:"lista", v:c=>c[C.VISOR], ops:VISORES},
  {id:"empv",   n:"Empaque visor",     g:"Especificación", tipo:"num",   v:c=>num(c[C.EMPV])},
  {id:"empvref",n:"Referencia empaque",g:"Especificación", tipo:"texto", v:c=>c[C.EMPVREF]},
  {id:"bump",   n:"Bumper",            g:"Especificación", tipo:"lista", v:c=>c[C.BUMP],  ops:BUMPERS},
  {id:"tbump",  n:"Tamaño bumper",     g:"Especificación", tipo:"num",   v:c=>num(c[C.TBUMP])},
  {id:"alff",   n:"Alfajor frontal",   g:"Especificación", tipo:"sino",  v:c=>tri(c[C.ALFF])===true?"Sí":"No"},
  {id:"alfp",   n:"Alfajor posterior", g:"Especificación", tipo:"sino",  v:c=>tri(c[C.ALFP])===true?"Sí":"No"},
  {id:"sello",  n:"Sello",             g:"Especificación", tipo:"lista", v:c=>c[C.SELLO], ops:SELLOS},

  /* --- avance y estado --- */
  {id:"av",     n:"Avance",            g:"Estado", tipo:"num",
   v:c=>Math.round(progreso(c).pct*100), suf:"%"},
  {id:"desp",   n:"Estado despacho",   g:"Estado", tipo:"lista", v:c=>desp(c), ops:DESPACHOS},
  {id:"obs",    n:"Observaciones",     g:"Estado", tipo:"texto", v:c=>c[C.OBS]},
  {id:"cal",    n:"Nota de calidad",   g:"Estado", tipo:"texto", v:c=>c[C.CAL]},
  {id:"noapta", n:"¿No apta?",         g:"Estado", tipo:"sino",
   v:c=>(typeof esNoApta==="function" && esNoApta(c))?"Sí":"No"},

  /* --- fechas --- */
  {id:"fini",   n:"Fecha inicio",      g:"Fechas", tipo:"fecha", v:c=>fmtDate(c[C.FINI])},
  {id:"fproc",  n:"Fecha fin",         g:"Fechas", tipo:"fecha", v:c=>fmtDate(c[C.FPROC])},
  {id:"fdesp",  n:"Fecha despacho",    g:"Fechas", tipo:"fecha", v:c=>fmtDate(c[C.FDESP])},
  {id:"dias",   n:"Días abierta",      g:"Fechas", tipo:"num",
   v:c=>{ const f=toDate(c[C.FECHA]); return f ? Math.round((hoy0()-f)/864e5) : ""; }},

  /* --- procesos, uno por columna --- */
  ...PROCS.map(p => ({
    id:"p"+p.i, n:p.k.charAt(0)+p.k.slice(1).toLowerCase(), g:"Procesos", tipo:"sino",
    v:c=>{ const t=tri(c[p.i]); return t===null?"no aplica" : t?"Sí":"No"; }
  }))
];

const CAMPO_POR_ID = Object.fromEntries(CAMPOS.map(f => [f.id, f]));
const GRUPOS_CAMPO = [...new Set(CAMPOS.map(f => f.g))];

/* ---------- condiciones ---------- */

/* Que se puede preguntar de cada tipo de campo. El orden importa: lo primero
   es lo que mas se usa. */
/* Las claves NO pueden parecer numeros: JavaScript coloca las claves enteras
   antes que las demas al recorrer un objeto, y «esta vacio» acababa saliendo
   como primera opcion de la lista en vez de «es». */
const OPERADORES = {
  "=":     {n:"es",         tipos:["texto","num","fecha","sino","lista"], valor:true},
  "!=":    {n:"no es",      tipos:["texto","num","fecha","sino","lista"], valor:true},
  "~":     {n:"contiene",   tipos:["texto","lista"],                      valor:true},
  ">":     {n:"mayor que",  tipos:["num","fecha"],                        valor:true},
  "<":     {n:"menor que",  tipos:["num","fecha"],                        valor:true},
  "vacio": {n:"está vacío", tipos:["texto","num","fecha","lista"],        valor:false},
  "lleno": {n:"tiene dato", tipos:["texto","num","fecha","lista"],        valor:false}
};

const operadoresDe = tipo =>
  Object.entries(OPERADORES).filter(([, o]) => o.tipos.includes(tipo));

/** Texto guardado en la hoja -> lista de condiciones. */
function leerCondiciones(txt){
  return String(txt || "").split(";").map(t => t.trim()).filter(Boolean).map(t => {
    // El operador puede tener uno o dos caracteres: se prueban los largos antes.
    for(const op of ["!=", "=", "~", ">", "<"]){
      const i = t.indexOf(op);
      if(i > 0) return {campo: t.slice(0, i).trim(), op, valor: t.slice(i + op.length).trim()};
    }
    const [campo, op] = t.split(/\s+/);
    return {campo: (campo || "").trim(), op: op === "lleno" ? "lleno" : "vacio", valor: ""};
  }).filter(c => CAMPO_POR_ID[c.campo]);
}

/** Lista de condiciones -> texto para la hoja. */
const escribirCondiciones = lista => lista
  .filter(c => c.campo && CAMPO_POR_ID[c.campo])
  .map(c => OPERADORES[c.op] && OPERADORES[c.op].valor
    ? `${c.campo}${c.op}${c.valor}` : `${c.campo} ${c.op}`)
  .join("; ");

/** Un numero a partir de lo que sea; null si no lo es. */
function aNumero(v){
  if(v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}
/** dd/mm/aaaa -> tiempo comparable; null si no es fecha. */
function aTiempo(v){
  const t = String(v || "").trim();
  const p = t.split(/[\/\-]/);
  if(p.length === 3){
    const d = new Date(+p[2], +p[1] - 1, +p[0]);
    if(!isNaN(d.getTime())) return d.getTime();
  }
  const d2 = toDate(v);
  return d2 ? d2.getTime() : null;
}

/** ¿Esta fila cumple la condicion? */
function cumple(c, cond){
  const campo = CAMPO_POR_ID[cond.campo];
  if(!campo) return true;                       // condicion sobre un campo que ya no existe
  const bruto = campo.v(c);
  const txt = String(bruto ?? "").trim();

  if(cond.op === "vacio") return txt === "";
  if(cond.op === "lleno") return txt !== "";

  const esperado = String(cond.valor ?? "").trim();
  if(cond.op === "~") return txt.toLowerCase().includes(esperado.toLowerCase());

  if(campo.tipo === "num" || campo.tipo === "fecha"){
    const a = campo.tipo === "fecha" ? aTiempo(txt) : aNumero(txt);
    const b = campo.tipo === "fecha" ? aTiempo(esperado) : aNumero(esperado);
    if(a !== null && b !== null){
      if(cond.op === ">")  return a >  b;
      if(cond.op === "<")  return a <  b;
      if(cond.op === "=")  return a === b;
      if(cond.op === "!=") return a !== b;
    }
    // Sin numeros comparables se cae a texto: es preferible comparar mal a
    // dejar la condicion sin efecto sin avisar.
  }
  const igual = txt.toLowerCase() === esperado.toLowerCase();
  return cond.op === "!=" ? !igual : igual;
}

/** Todas las condiciones se cumplen (se suman, no se alternan). */
const cumpleTodas = (c, conds) => conds.every(x => cumple(c, x));
