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
   Estructura real de la hoja, confirmada contra sus datos.

     A  FECHA               lote de creacion; a veces texto («agosto - 1»)
     B  CLIENTE             no editable despues
     C  OP                  varias lineas comparten OP con sufijo: 163-1, 163-2
     D  PRIORIDAD
     E  CANT                paneles
     F  LARGO               metros; el ancho es siempre ANCHO_PANEL
     G  PRODUCTO            lleva el espesor en el nombre: PANEL 3"
     H  RANURADO
     I  CARA A
     J  CARA B
     K  UNIDAD    poliuretano por panel, en kg   -> formula de la hoja
     L  TOTAL     poliuretano de la linea, en kg -> formula de la hoja
     M  PERFIL     |
     N  INYECCION  |  los tres procesos
     O  LIMPIEZA   |
     P  M2                  cant x largo x 1,16
     Q  STATUS              avance calculado
     R  COMIENZO PROCESO
     S  FIN PROCESO
     T  ESTADO
     U  FECHA DE DESPACHO                                                    */
const ANCHO_PANEL = 1.16;          // metros; el largo es lo unico que varia

/* POLIURETANO — deducido de los datos de la hoja y verificado exacto:
     UNIDAD = largo x 1,16 x espesor(m) x 38
     TOTAL  = UNIDAD x cantidad
   Con la fila de AMERICAN BLUE (22 paneles de 2,45 m, PANEL 3"):
     2,45 x 1,16 x 0,076 x 38 = 8,207696 kg  -> la hoja muestra 8,208
     x 22 = 180,569312 kg                    -> la hoja muestra 180,569
   El 38 aparece con cuatro decimales de precision (37,9999), asi que es la
   densidad del poliuretano inyectado en kg/m3, no un coeficiente cualquiera. */
const DENSIDAD_POLIURETANO = 38;   // kg/m3

/** Espesor en metros de cada producto: pulgadas x 0,0254, al milimetro.
 *  Confirmado para 3" (0,076). El resto sigue la misma regla. */
function espesorMetros(producto){
  const m = String(producto || "").match(/(\d+(?:[.,]\d+)?)\s*(?:"|''|pulg)/i);
  if(!m) return null;
  const pulgadas = parseFloat(m[1].replace(",", "."));
  return Math.round(pulgadas * 0.0254 * 1000) / 1000;
}

const MODELO_PANELES = {
  ncol: 21,
  lastCol: "U",

  col: {
    FECHA:0,      // A
    CLI:1,        // B
    OP:2,         // C
    PRIO:3,       // D
    CANT:4,       // E
    LARGO:5,      // F
    PROD:6,       // G
    RANU:7,       // H
    CARA_A:8,     // I
    CARA_B:9,     // J
    POLI_UNI:10,  // K   formula de la hoja
    POLI_TOT:11,  // L   formula de la hoja
    // M, N, O -> procesos
    M2:15,        // P
    STATUS:16,    // Q
    FINI:17,      // R   comienzo de proceso
    FFIN:18,      // S   fin de proceso
    DESP:19,      // T   estado
    FDESP:20      // U
  },

  procs: [
    {i:12, c:"M", k:"PERFIL",    s:"PE"},
    {i:13, c:"N", k:"INYECCION", s:"IN"},
    {i:14, c:"O", k:"LIMPIEZA",  s:"LI"}
  ],

  listas: {
    PRODUCTOS: ['PANEL 2"','PANEL 3"','PANEL 4"','PANEL 5"','PANEL 6"'],
    RANURADOS: ["RANURADO","SIN RANURAR"],
    CARAS: ["9002","INOX","GLASSLINER"],
    ESTADOS: ["EN PROCESO","TERMINADO","DESPACHADO","ANULADA"],
    MATERIALES: [], TIPOS: [], APERTURAS: [], ESPESORES: [],
    TIPOS_MARCO: [], VISORES: [], BUMPERS: [], TAM_BUMPER: [], SELLOS: []
  },

  /** Metros cuadrados de la linea: es la unidad de trabajo del panel. */
  ancho: ANCHO_PANEL,
  metros: c => (num(c[4]) || 0) * (num(c[5]) || 0) * ANCHO_PANEL,

  /** Kilos de poliuretano de la linea, calculados. Se usan para rellenar las
   *  filas nuevas y para comprobar que lo que trae la hoja cuadra. */
  poliuretano(c){
    const esp = espesorMetros(c[6]);
    if(esp === null) return null;
    const unidad = (num(c[5]) || 0) * ANCHO_PANEL * esp * DENSIDAD_POLIURETANO;
    return {unidad, total: unidad * (num(c[4]) || 0)};
  },
  densidad: DENSIDAD_POLIURETANO,

  /* ESCALADO DE PRIORIDAD — por escalones, no de un salto.
     URGENTE  se antepone a todo; no escala ni caduca.
     ALTA     entra a la cola inmediata.
     MEDIA    espera 4 dias y sube a ALTA.
     BAJA     espera 8 dias, sube a MEDIA, y desde ahi otros 4 hasta ALTA. */
  escalado: {
    BAJA:  {dias: 8, a: "MEDIA"},
    MEDIA: {dias: 4, a: "ALTA"}
  },

  /** Tope de metros por espesor antes de ceder el turno. */
  lotePorEspesor: 200,

  empaqueVisor: {},
  conRiel: [],

  tiene: {
    especificacion: false,
    calidad: false,
    stock: false,
    cronograma: false,
    metrosCuadrados: true,
    poliuretano: true
  }
};

const MODELOS_DATOS = {puertas: MODELO_PUERTAS, paneles: MODELO_PANELES};

/** El modelo de ESTA pagina. Todo lo demas lee de aqui. */
const MODELO = MODELOS_DATOS[MOD.id] || MODELO_PUERTAS;
