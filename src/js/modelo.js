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
   Un panel no se parece a una puerta y su hoja tampoco: otras columnas, otros
   procesos y una unidad de trabajo distinta —el metro cuadrado en vez de la
   pieza—. Todo eso se declara aqui.

   COLUMNAS CONFIRMADAS (A..J y M..O)
     A  fecha de creacion      se pone sola al crear la ficha
     B  cliente                no se puede editar despues
     C  OP                     se asigna sola; varias lineas comparten OP
                               con sufijo: 163-1, 163-2...
     D  prioridad
     E  cantidad de paneles
     F  largo del panel        el ancho es siempre ANCHO_PANEL
     G  producto               tipo de panel
     H  ranurado
     I  cara A
     J  cara B
     M  PERFIL     |
     N  INYECCION  |  los tres procesos
     O  LIMPIEZA   |

   POR CONFIRMAR — marcadas abajo con «revisar». Escribir en una columna que ya
   tenga datos los destruiria, asi que hasta confirmarlas la aplicacion no
   escribe en ellas. */
const ANCHO_PANEL = 1.16;          // metros; el largo es lo unico que varia

const MODELO_PANELES = {
  ncol: 20,
  lastCol: "T",

  col: {
    FECHA:0,     // A  fecha de creacion
    CLI:1,       // B  cliente
    OP:2,        // C  OP
    PRIO:3,      // D  prioridad
    CANT:4,      // E  cantidad de paneles
    LARGO:5,     // F  largo del panel (m)
    PROD:6,      // G  producto
    RANU:7,      // H  ranurado
    CARA_A:8,    // I  cara A
    CARA_B:9,    // J  cara B
    ESP:10,      // K  revisar: espesor
    OBS:11,      // L  revisar: observaciones
    // M, N, O -> procesos
    STATUS:15,   // P  revisar: avance calculado
    DESP:16,     // Q  revisar: estado
    FPROC:17,    // R  revisar: fecha de proceso
    FDESP:18,    // S  revisar: fecha de despacho
    FINI:19      // T  revisar: inicio de produccion
  },

  /** Columnas que aun no estan confirmadas: la aplicacion no escribe en ellas
   *  mientras sigan aqui. Vaciar esta lista cuando se confirme la hoja. */
  columnasPorConfirmar: ["ESP","OBS","STATUS","DESP","FPROC","FDESP","FINI"],

  procs: [
    {i:12, c:"M", k:"PERFIL",    s:"PE"},
    {i:13, c:"N", k:"INYECCION", s:"IN"},
    {i:14, c:"O", k:"LIMPIEZA",  s:"LI"}
  ],

  listas: {
    /* Revisar contra la validacion de datos de la hoja: un valor que ella no
       acepte se guarda igual pero descuadra los informes. */
    PRODUCTOS: ["PANEL 2\"","PANEL 3\"","PANEL 4\"","PANEL 5\"","PANEL 6\""],
    ESPESORES: ["2\"","3\"","4\"","5\"","6\""],
    RANURADOS: ["SIN RANURAR","RANURADO"],
    CARAS: ["LISA","GRAFADA","INOX","GLASSLINER"],
    MATERIALES: [], TIPOS: [], APERTURAS: [],
    TIPOS_MARCO: [], VISORES: [], BUMPERS: [], TAM_BUMPER: [], SELLOS: []
  },

  /** El trabajo de panel se mide en metros cuadrados, no en piezas. */
  ancho: ANCHO_PANEL,
  metros: c => (num(c[MODELO_PANELES.col.CANT]) || 0) *
               (num(c[MODELO_PANELES.col.LARGO]) || 0) * ANCHO_PANEL,

  /* ESCALADO DE PRIORIDAD — por escalones, no de un salto.
     URGENTE  se antepone a todo; no escala ni caduca.
     ALTA     entra a la cola inmediata.
     MEDIA    espera 4 dias y sube a ALTA.
     BAJA     espera 8 dias, sube a MEDIA, y desde ahi otros 4 hasta ALTA.
     Los dias se cuentan desde que entro en ese nivel, no desde la creacion:
     si no, una BAJA recien ascendida a MEDIA saltaria a ALTA el mismo dia. */
  escalado: {
    BAJA:  {dias: 8, a: "MEDIA"},
    MEDIA: {dias: 4, a: "ALTA"}
  },

  /** Secuencia de fabricacion: se agrupan pedidos del mismo espesor hasta
   *  acumular este tope, y entonces cede el turno. Cambiar el espesor obliga a
   *  reajustar la maquina, asi que agrupar ahorra paradas; pero agrupar sin
   *  limite deja esperando a los demas espesores. */
  lotePorEspesor: 200,          // m2

  empaqueVisor: {},
  conRiel: [],

  tiene: {
    especificacion: false,   // sin marco, visor ni bumper
    calidad: false,
    stock: false,            // no hay inventario por modelo
    cronograma: false,
    metrosCuadrados: true    // la unidad de trabajo es el m2
  }
};

const MODELOS_DATOS = {puertas: MODELO_PUERTAS, paneles: MODELO_PANELES};

/** El modelo de ESTA pagina. Todo lo demas lee de aqui. */
const MODELO = MODELOS_DATOS[MOD.id] || MODELO_PUERTAS;
