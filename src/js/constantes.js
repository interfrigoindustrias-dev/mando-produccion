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
const NCOL = 27;                       // A..AA
const LAST_COL = "AA";

const MATERIALES = ["PP","PP-COLOR","INOX","GLASS","PP-PANEL","INOX CAL 22"];
const TIPOS = ["SE12","SM20","480","BATIENTE","BATIENTE DOBLE","VAIVEN SENCILLA","VAIVEN DOBLE","OFICINA","EMERGENCIA","EMERGENCIA DOBLE"];
const ESPESORES = ["40","50","62","70","80","92","100","112"];
const APERTURAS = ["SX","DX","DH","BD","VAIVEN","VD"];
const DESPACHOS = ["En Almacén","Despachado","Separado","Anulada"];
/** Una puerta anulada queda fuera de producción, almacén y stock. */
const anulada = c => String(c[C.DESP]??"").trim()==="Anulada";
// Tipos corredizos: son los únicos que llevan riel (según el histórico de la hoja)
const CON_RIEL = new Set(["SE12","SM20","480"]);

// índices de columna (0 = A)
const C = {FECHA:0,OP:1,CLI:2,COMP:3,STOCK:4,MAT:5,TIPO:6,ANCHO:7,ALTO:8,PTS:9,ESP:10,AP:11,PRIO:12,
           OBS:21,STATUS:22,FPROC:23,DESP:24,FDESP:25,ENS:26};
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

