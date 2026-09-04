/* Constantes del modelo de datos y estado en memoria
   Proyecto: Control de Puertas - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en index.html y comparten el ambito global. */

"use strict";

/* ------------------------------ constantes ------------------------------ */
// userinfo.email hace falta para registrar QUIÉN hace cada cambio en el historial.
const SCOPE = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email";
const LOG_TAB = MOD.logTab;      // propia de cada módulo, ver modulo.js
const LOG_HEAD = ["FECHA","USUARIO","ACCION","OP","FILA","CAMPO","ANTES","DESPUES"];
/* La forma de la hoja la declara el producto, no este archivo. Ver modelo.js */
const NCOL = MODELO.ncol;
const LAST_COL = MODELO.lastCol;

/* Las listas siguientes son copia EXACTA de la validacion de datos de la hoja.
   Si alli cambian, aqui tambien: una opcion que la hoja no acepte se guarda
   igual pero queda marcada en rojo y rompe los informes. */
/* URGENTE lo pone una persona, nunca la automatizacion: es una decision, no
   algo en lo que el trabajo se convierte por llevar tiempo esperando. */
const PRIORIDADES = ["URGENTE","ALTA","MEDIA","BAJA"];

const MATERIALES = MODELO.listas.MATERIALES;
const TIPOS      = MODELO.listas.TIPOS;
const ESPESORES  = MODELO.listas.ESPESORES;
const APERTURAS  = MODELO.listas.APERTURAS;
/* «Devuelta» va primera porque es la unica que significa trabajo por hacer:
   las otras cuatro son sitios donde la puerta ya reposa. */
const DESPACHOS = ["Devuelta","Terminado","En Almacén","Despachado","Anulada"];

/* --- Especificacion (columnas AC..AK) --- */
const TIPOS_MARCO   = MODELO.listas.TIPOS_MARCO;
const VISORES       = MODELO.listas.VISORES;
const BUMPERS       = MODELO.listas.BUMPERS;
const TAM_BUMPER    = MODELO.listas.TAM_BUMPER;
const SELLOS        = MODELO.listas.SELLOS || [];
const EMPAQUE_VISOR = MODELO.empaqueVisor;
/** El tamaño de bumper solo aplica si se eligio un bumper de verdad. */
const llevaBumper = v => !!String(v||"").trim() && String(v).trim().toUpperCase() !== "SIN BUMPER";

/* SEPARAR UNA PUERTA — LA RESERVA NO ES UNA ETAPA
   Estaba metida en ESTADO DESPACHO, junto a Terminado, En Almacen y
   Despachado. Pero «separada» no dice DONDE esta la puerta, dice QUIEN la
   tiene apartada, y las dos cosas pasan a la vez: lo normal es una puerta
   separada Y en almacen. Al compartir celda, una excluia a la otra.

   Ahora son dos ejes independientes:
     ESTADO DESPACHO (Y)  -> donde esta: Terminado, En Almacen, Despachado
     SEPARADA PARA (AL)   -> quien la tiene apartada, o nadie

   El nombre del comprador se guardaba antes anexado al cliente con una flecha.
   Se conserva la lectura de ese formato para no perder lo ya escrito, pero lo
   nuevo va a su columna. */
const SEP_MARCA = " -> ";

/** Para quien esta separada, o "" si no lo esta. */
const separadaPara = c => {
  const propio = String(c[C.SEPA] ?? "").trim();
  if(propio) return propio;
  // Formato antiguo: el comprador anexado al cliente. Se sigue leyendo para
  // que nada desaparezca hasta que la reparacion lo mueva a su sitio.
  const t = String(c[C.CLI] ?? "");
  const i = t.indexOf(SEP_MARCA);
  return i < 0 ? "" : t.slice(i + SEP_MARCA.length).trim();
};
/** El cliente, sin el comprador que el formato antiguo le anexaba. */
const clienteBase = c => {
  const t = String(c[C.CLI] ?? "");
  const i = t.indexOf(SEP_MARCA);
  return (i < 0 ? t : t.slice(0, i)).trim();
};
const separada = c => separadaPara(c) !== "";

/* URGENTE tiene dos origenes y se distinguen a proposito: uno es una decision
   y el otro una consecuencia, y no se corrigen igual. */
/** Alguien la marco urgente a mano. */
const urgenteManual = c => String(c[C.PRIO] ?? "").trim().toUpperCase() === "URGENTE";
/** Separada y sin terminar: hay un comprador esperando algo que no esta hecho. */
const urgenteAuto = c => separada(c) && progreso(c).pct < 1;
const urgente = c => urgenteManual(c) || urgenteAuto(c);

/** Una puerta terminada espera revision de calidad; aun no esta en almacen. */
const terminada = c => String(c[C.DESP]??"").trim() === "Terminado";
/** Devuelta: calidad la rechazo y vuelve a planta a repararse. Tiene estado,
 *  pero no es un sitio donde reposa: es trabajo, y del mas urgente que hay —ya
 *  se hizo una vez y hay alguien esperandola. */
const devuelta = c => String(c[C.DESP]??"").trim() === "Devuelta";
/** Una puerta anulada queda fuera de producción, almacén y stock. */
const anulada = c => String(c[C.DESP]??"").trim()==="Anulada";
/* Despachada = salio por la puerta. No es trabajo de nadie ya, asi que no
   aparece en ninguna vista operativa: solo en Control de OPs, que es el
   historico completo. */
const despachada = c => String(c[C.DESP]??"").trim()==="Despachado";
// Tipos corredizos: son los unicos que llevan riel.
const CON_RIEL = new Set(MODELO.conRiel);

// Columnas y procesos: los declara el producto en modelo.js
const C = MODELO.col;
const PROCS = MODELO.procs;

/* ------------------------------ estado ------------------------------ */
let CFG = {clientId:"", sheetId:"", tab:MOD.tabPorDefecto || "", poll:20, dateFmt:"DMY", brand:""};
let token=null, tokenExp=0, userMail="";
let ROWS = [];              // {r:<fila 1-based>, c:[27 valores]}
let SEL = new Set();        // filas seleccionadas (nº de fila de la hoja)
let pollTimer=null, lastHash="", busyWrites=0, detRow=null,  writeSeq=0;

