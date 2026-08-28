/* Modelo de datos de cada producto
   Proyecto: Control de Produccion - Interfrigo
   Se carga entre modulo.js y constantes.js.

   AQUI SE DECLARA COMO ES CADA PRODUCTO: sus columnas en la hoja, sus procesos
   y las listas de valores que acepta. Nada de esto puede estar en constantes.js,
   porque alli seria comun a los dos y una puerta y un panel no se parecen: un
   panel no lleva riel, ni embocinado, ni visor.

   Antes de esto, paneles heredaba literalmente el modelo de puertas y las
   diferencias se tapaban con comprobaciones sueltas repartidas por el codigo.
   Cada divergencia nueva añadia otra, y alguna rompio la carga entera. */
"use strict";

/* ============================== PUERTAS ==============================
   Copia exacta de la validacion de datos de la hoja OP PUERTA. Si alli cambian
   las listas, aqui tambien: un valor que la hoja no acepte se guarda igual pero
   queda marcado y descuadra los informes. */
const MODELO_PUERTAS = {
  ncol: 39,
  lastCol: "AM",

  // Indices de columna, empezando en 0 = A
  col: {
    FECHA:0, OP:1, CLI:2, COMP:3, STOCK:4, MAT:5, TIPO:6, ANCHO:7, ALTO:8,
    PTS:9, ESP:10, AP:11, PRIO:12,
    OBS:21, STATUS:22, FPROC:23, DESP:24, FDESP:25, ENS:26,
    FINI:27,      // AB  FECHA DE INICIO DE PRODUCCION
    ALFF:28,      // AC  ALFAJOR FRONTAL      (casilla)
    ALFP:29,      // AD  ALFAJOR POSTERIOR    (casilla)
    MARCO:30,     // AE  TIPO DE MARCO
    VISOR:31,     // AF  VISOR
    EMPV:32,      // AG  EMPAQUE DE VISOR VARIABLE (se calcula solo)
    EMPVREF:33,   // AH  EMPAQUE VISOR REFERENCIA
    BUMP:34,      // AI  BUMPER
    TBUMP:35,     // AJ  TAMANO BUMPER
    CAL:36,       // AK  NOTAS DE CALIDAD
    SEPA:37,      // AL  SEPARADA PARA
    SELLO:38      // AM  SELLO
  },

  procs: [
    {i:13,c:"N",k:"CORTE PERFIL",s:"CP"}, {i:14,c:"O",k:"INYECCION",s:"IN"},
    {i:15,c:"P",k:"ACCESORIOS",s:"AC"},   {i:16,c:"Q",k:"CORTE MARCO",s:"CM"},
    {i:17,c:"R",k:"MARCO",s:"MA"},        {i:18,c:"S",k:"CORTE RIEL",s:"CR"},
    {i:19,c:"T",k:"RIEL",s:"RI"},         {i:20,c:"U",k:"EMBOCINAR",s:"EM"}
  ],

  listas: {
    MATERIALES: ["PP 9002","INOX 304","GLASSLINER","PP-PANEL","OTRO"],
    TIPOS: ["SE12","SM20","480","BATIENTE","BATIENTE DOBLE","VAIVEN SENCILLA",
            "VAIVEN DOBLE","OFICINA","EMERGENCIA","EMERGENCIA DOBLE"],
    ESPESORES: ["40","50","62","70","80","92","100","112"],
    // La hoja valida SX,DX,DH,VAIVEN en las filas nuevas; VD y BD siguen en
    // filas antiguas, asi que se conservan para no marcarlas como invalidas.
    APERTURAS: ["SX","DX","DH","VAIVEN","VD","BD"],
    TIPOS_MARCO: ["SIN MARCO","ALUMINIO 2X1","ALUMINIO 2X1 CON ALETA","ALUMINIO 3X1",
                  "ALUMINIO 3X1 1/2",'ALUMINIO 4"',"PVC 80","PVC 110","PVC 130"],
    VISORES: ["SIN VISOR","22 X 60","30 X 60","40 X 60"],
    BUMPERS: ["SIN BUMPER","BUMPER BLANCO","BUMPER NEGRO"],
    TAM_BUMPER: ["25","30","40","50","60","100"],
    /* Como cierra la puerta contra el piso. Es de fabricacion, igual que el
       espesor o la apertura: cambia el perfil inferior y el empaque. */
    SELLOS: ["SELLO AL SUELO","SELLO A TOPE","NO APLICA"]
  },

  /** Empaque que corresponde a cada visor (pestaña Datos Calculo de la hoja). */
  empaqueVisor: {"SIN VISOR":0, "22 X 60":1.6, "30 X 60":1.8, "40 X 60":2.2},

  /** Tipos corredizos: los unicos que llevan riel. */
  conRiel: ["SE12","SM20","480"],

  /** Bloques opcionales que esta pagina si tiene. */
  tiene: {
    especificacion: true,   // marco, visor, bumper, alfajores
    calidad: true,
    stock: true,
    cronograma: true
  }
};

/* ============================== PANELES ==============================
   PROVISIONAL. Hoy es una copia del modelo de puertas, que es exactamente lo
   que la aplicacion venia usando: hereda columnas y procesos de puerta porque
   nunca se declararon los suyos.

   PENDIENTE de la estructura real de la pestaña PANEL. Cuando se conozca, esto
   es lo unico que hay que cambiar — el resto del codigo lee de aqui.

   Un panel no lleva riel ni embocinado, y no tiene visor ni bumper, asi que
   `procs`, `col` y `listas` van a cambiar casi por completo. */
const MODELO_PANELES = {
  ncol: MODELO_PUERTAS.ncol,
  lastCol: MODELO_PUERTAS.lastCol,
  col: MODELO_PUERTAS.col,
  procs: MODELO_PUERTAS.procs,
  listas: MODELO_PUERTAS.listas,
  empaqueVisor: MODELO_PUERTAS.empaqueVisor,
  conRiel: MODELO_PUERTAS.conRiel,
  provisional: true,
  tiene: {
    especificacion: true,
    calidad: false,      // paneles no tiene la vista de calidad
    stock: true,
    cronograma: false    // ni cronograma: no hay meta de produccion
  }
};

const MODELOS_DATOS = {puertas: MODELO_PUERTAS, paneles: MODELO_PANELES};

/** El modelo de ESTA pagina. Todo lo demas lee de aqui. */
const MODELO = MODELOS_DATOS[MOD.id] || MODELO_PUERTAS;
