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
const NCOL = 37;                       // A..AK
const LAST_COL = "AK";

/* Las listas siguientes son copia EXACTA de la validacion de datos de la hoja.
   Si alli cambian, aqui tambien: una opcion que la hoja no acepte se guarda
   igual pero queda marcada en rojo y rompe los informes. */
const MATERIALES = ["PP 9002","INOX 304","GLASSLINER","PP-PANEL","OTRO"];
const TIPOS = ["SE12","SM20","480","BATIENTE","BATIENTE DOBLE","VAIVEN SENCILLA","VAIVEN DOBLE","OFICINA","EMERGENCIA","EMERGENCIA DOBLE"];
const ESPESORES = ["40","50","62","70","80","92","100","112"];
// La hoja valida SX,DX,DH,VAIVEN en las filas nuevas; VD y BD siguen en filas
// antiguas, asi que se conservan para no marcarlas como invalidas.
const APERTURAS = ["SX","DX","DH","VAIVEN","VD","BD"];
const DESPACHOS = ["Terminado","Separado","En Almacén","Despachado","Anulada"];

/* --- Especificacion (columnas AC..AK) --- */
const TIPOS_MARCO = ["SIN MARCO","ALUMINIO 2X1","ALUMINIO 2X1 CON ALETA","ALUMINIO 3X1",
                     "ALUMINIO 3X1 1/2",'ALUMINIO 4"',"PVC 80","PVC 110","PVC 130"];
const VISORES = ["SIN VISOR","22 X 60","30 X 60","40 X 60"];
const BUMPERS = ["SIN BUMPER","BUMPER BLANCO","BUMPER NEGRO"];
const TAM_BUMPER = ["25","30","40","50","60","100"];
/** Empaque que corresponde a cada visor (pestaña Datos Calculo de la hoja). */
const EMPAQUE_VISOR = {"SIN VISOR":0, "22 X 60":1.6, "30 X 60":1.8, "40 X 60":2.2};
/** El tamaño de bumper solo aplica si se eligio un bumper de verdad. */
const llevaBumper = v => !!String(v||"").trim() && String(v).trim().toUpperCase() !== "SIN BUMPER";

/* SEPARAR UNA PUERTA DE STOCK
   Una puerta de stock se fabrica sin dueño; al venderla hay que dejar constancia
   de para quien queda. El nombre del comprador se anexa al del cliente en la
   misma celda, separado por una flecha:

       STOCK - INR FABRICA -> FRIGORIFICOS DEL NORTE

   Se guarda ahi, y no en una columna nueva, porque asi viaja con la ficha a
   cualquier informe, impresion o vista sin tocar la estructura de la hoja, y se
   entiende leyendo la celda desde la propia hoja de calculo. */
const SEP_MARCA = " -> ";
/** Para quien esta separada, o "" si no lo esta. */
const separadaPara = c => {
  const t = String(c[C.CLI] ?? "");
  const i = t.indexOf(SEP_MARCA);
  return i < 0 ? "" : t.slice(i + SEP_MARCA.length).trim();
};
/** El cliente original, sin el comprador anexado. */
const clienteBase = c => {
  const t = String(c[C.CLI] ?? "");
  const i = t.indexOf(SEP_MARCA);
  return (i < 0 ? t : t.slice(0, i)).trim();
};

/** Una puerta terminada espera revision de calidad; aun no esta en almacen. */
const terminada = c => String(c[C.DESP]??"").trim() === "Terminado";
/** Una puerta anulada queda fuera de producción, almacén y stock. */
const anulada = c => String(c[C.DESP]??"").trim()==="Anulada";
// Tipos corredizos: son los únicos que llevan riel (según el histórico de la hoja)
const CON_RIEL = new Set(["SE12","SM20","480"]);

// índices de columna (0 = A)
const C = {FECHA:0,OP:1,CLI:2,COMP:3,STOCK:4,MAT:5,TIPO:6,ANCHO:7,ALTO:8,PTS:9,ESP:10,AP:11,PRIO:12,
           OBS:21,STATUS:22,FPROC:23,DESP:24,FDESP:25,ENS:26,
           // Ampliacion de la hoja (agosto 2026)
           FINI:27,      // AB  FECHA DE INICIO DE PRODUCCION
           ALFF:28,      // AC  ALFAJOR FRONTAL      (casilla)
           ALFP:29,      // AD  ALFAJOR POSTERIOR    (casilla)
           MARCO:30,     // AE  TIPO DE MARCO
           VISOR:31,     // AF  VISOR
           EMPV:32,      // AG  EMPAQUE DE VISOR VARIABLE (se calcula solo)
           EMPVREF:33,   // AH  EMPAQUE VISOR REFERENCIA
           BUMP:34,      // AI  BUMPER
           TBUMP:35,     // AJ  TAMANO BUMPER
           CAL:36};      // AK  NOTAS DE CALIDAD
const PROCS = [
  {i:13,c:"N",k:"CORTE PERFIL",s:"CP"}, {i:14,c:"O",k:"INYECCION",s:"IN"},
  {i:15,c:"P",k:"ACCESORIOS",s:"AC"},   {i:16,c:"Q",k:"CORTE MARCO",s:"CM"},
  {i:17,c:"R",k:"MARCO",s:"MA"},        {i:18,c:"S",k:"CORTE RIEL",s:"CR"},
  {i:19,c:"T",k:"RIEL",s:"RI"},         {i:20,c:"U",k:"EMBOCINAR",s:"EM"}
];

/* ------------------------------ estado ------------------------------ */
let CFG = {clientId:"", sheetId:"", tab:"OP PUERTA", poll:20, dateFmt:"DMY", brand:""};
let token=null, tokenExp=0, userMail="";
let ROWS = [];              // {r:<fila 1-based>, c:[27 valores]}
let SEL = new Set();        // filas seleccionadas (nº de fila de la hoja)
let pollTimer=null, lastHash="", busyWrites=0, detRow=null,  writeSeq=0;

