/* Formatos de la orden de produccion en hoja carta
   Proyecto: Control de Produccion - Interfrigo
   Parte de una aplicacion sin dependencias externas; los archivos se cargan
   en el orden declarado en la pagina y comparten el ambito global. */

"use strict";

/* ============================== FORMATOS ==============================
   Cada familia de puerta se arma con piezas distintas, asi que su hoja de
   produccion tampoco puede ser la misma. Hay cuatro:

     1  SE12, SM20, 480                       corredizas
     2  BATIENTE, BATIENTE DOBLE
     3  VAIVEN SENCILLA, VAIVEN DOBLE
     4  OFICINA, EMERGENCIA, EMERGENCIA DOBLE

   Todos comparten la cabecera —quien pide, que puerta es, que medidas— y se
   diferencian en las opciones, los diagramas y la lista de materiales.

   Cada linea es una pieza real del almacen. La referencia va impresa junto al
   nombre a proposito: quien baja a buscarla no tiene que acordarse ni
   preguntar, y no sube con la pieza equivocada.

   La lista se escribe como familia -> sub-item -> referencia porque asi esta
   organizado el almacen: primero se sabe QUE se necesita y despues CUAL de
   ellas. Ordenarla por referencia obligaria a saber el codigo de antemano. */

/** Tipo de puerta -> numero de formato. En mayusculas y sin espacios sobrantes. */
const FORMATO_DE_TIPO = {
  "SE12": 1, "SM20": 1, "480": 1,
  "BATIENTE": 2, "BATIENTE DOBLE": 2,
  "VAIVEN": 3, "VAIVEN SENCILLA": 3, "VAIVEN DOBLE": 3,
  "OFICINA": 4, "EMERGENCIA": 4, "EMERGENCIA DOBLE": 4
};

/** Que formato le toca a esta puerta. 0 = ninguno definido todavia. */
const formatoDe = c => FORMATO_DE_TIPO[String(c[C.TIPO] ?? "").trim().toUpperCase()] || 0;

/* Atajos para escribir las listas sin ruido.
     f  familia      lo que se busca            («Riel Superior»)
     s  sub-item     cual de ellas              («SE12»)
     r  referencia   codigo del almacen
     u  unidad       si se anota una medida en vez de una cantidad             */
const it = (f, s, r, u) => ({f, s, r, u});

const FORMATOS = {

  /* ==================== 1 · CORREDIZAS ==================== */
  1: {
    nombre: "Corredizas · SE12 · SM20 · 480",
    imagenes: ["corredera.jpg", "marco.jpg"],
    notas: ["Tapa", "Frente", "Alfajor", "Tee"],
    firmas: ["Solicitado por"],
    bloques: [
      {t: "Rieles, rodadura y automatización", items: [
        it("Riel superior", "SE12", "IGO 002"),
        it("Riel superior", "SM20", "IGO 010"),
        it("Riel superior", "480", "RPO 005"),
        it("Riel sup. interno", "SE12", "IGO 005"),
        it("Riel sup. interno", "SM20", "ZAQ 024"),
        it("Riel sup. interno", "480", "RFRI 005"),
        it("Riel inferior", "SM20", "IGO 004"),
        it("Riel inferior", "SE12", "IGO 008"),
        it("Fin de carrera", "SE12", "R021081"),
        it("Fin de carrera", "SM20", "INT013"),
        it("Fin de carrera", "480 DX", "I-SKA-13"),
        it("Fin de carrera", "480 SX", "I-SKA-15"),
        it("Fin de carrera", "480 reversible", "R021456"),
        it("Kit rampa o curva", "SE12", "R021082"),
        it("Kit rampa o curva", "SM20", "R021525"),
        it("Rampa o curva", "480 DX", "R021454"),
        it("Rampa o curva", "480 SX", "R021455"),
        it("Kit tapas riel sup.", "SE12", "R0210834"),
        it("Tapa riel inferior", "SE12 DX", "R020832"),
        it("Tapa riel inferior", "SE12 SX", "R020833"),
        it("Poleas", "SX SE12", "R021080"),
        it("Poleas", "DX SE12", "R021079"),
        it("Poleas", "SM20X", "R021522/23"),
        it("Poleas", "480", "I-SKA-01D"),
        it("Brida y tapeta", "DX", "INT123"),
        it("Brida y tapeta", "SX", "INT124"),
        it("Automatización", "DX", "R020980"),
        it("Automatización", "SX", "R020981")
      ]},
      {t: "Perfilería, marcos y estructura", items: [
        it("Perfil", "50 · 62 mm", "IGO 007"),
        it("Perfil", "70 mm", "IGO 003"),
        it("Perfil", "80 · 92 mm", "IGO 006"),
        it("Perfil", "100 · 112 mm", "IGO 009"),
        it("Marco", "Aluminio", "T101"),
        it("Marco", "PVC 110 mm", "R021490"),
        it("Marco", "PVC 130 mm", "R021491"),
        it("Marco", "Platina 130 mm", "R021494"),
        it("Marco", "COLDTECH", "R022028"),
        it("Umbral", "—", "PT099-2")
      ]},
      {t: "Sellado y empaques", items: [
        it("Empaque", "Perimetral bajo", "INT604363"),
        it("Empaque", "Perimetral alto", "INTER 10"),
        it("Empaque", "Barredor MT", "INT80249"),
        it("Empaque", "Barredor BT", "INT80268"),
        it("Empaque ventanilla", "40 mm", "INTER 295"),
        it("Empaque ventanilla", "80 mm", "INT 102"),
        it("Porta empaque", "—", "IGO 011")
      ]},
      {t: "Manijas, palancas, cerraduras y cierres", items: [
        it("Palanca de mano", "8000 M", "R021651"),
        it("Palanca de mano", "8000 S", "R021650"),
        it("Palanca de mano", "8100", "R021180"),
        it("Palanca de mano", "8100 L", "R021201"),
        it("Palanca de mano", "Cuña nylon", "R021064"),
        it("Palanca de mano", "Kit instalación 8100", "R021189"),
        it("Manija", "Vazca", "R020845"),
        it("Manija", "Mediana", "INT138"),
        it("Manija", "Lateral", "R020847"),
        it("Manija", "Frontal", "R020846"),
        it("Cerradura", "9500 HP", "R020685"),
        it("Cerradura", "ECO 80", "I-268-R80"),
        it("Cerradura", "ECO 100", "I-268-R100"),
        it("Cerradura", "ECO 120", "I-268-R120"),
        it("Eslabones 9500 HP", "2 eslabones", "R020636"),
        it("Eslabones 9500 HP", "4 eslabones", "R020637"),
        it("Ganchos y apoyos", "Apoyo gancho SM20", "R020908"),
        it("Ganchos y apoyos", "Gancho cierre SM20", "R020904"),
        it("Ganchos y apoyos", "Apoyo gancho ECO", "R021442"),
        it("Ganchos y apoyos", "Gancho cierre ECO", "R021443"),
        it("Cierre Cold Tech", "—", "R022028")
      ]},
      {t: "Calefacción y baja temperatura", items: [
        it("Porta resistencia", "—", "MG 006"),
        it("Resistencia eléctrica", "30W blanca", "R021482"),
        it("Resistencia eléctrica", "40W", "R021551")
      ]},
      {t: "Fijaciones, tornillería y accesorios", items: [
        it("Tornillo fijación SM20", "—", "R020903"),
        it("Tornillo nylon", "—", "R020792"),
        it("Tornillo PVC", "Cuadrada", "I-PBV-03"),
        it("Tornillo PVC", "Redonda", "I-PBV-05 TO"),
        it("Tuerca", "Nylon", "R020796"),
        it("Tuerca", "PVC", "I-PBV-05T"),
        it("Roldana", "Nylon", "R020795"),
        it("Roldana", "PVC", "I-PBV-05R"),
        it("Arandela PVC 45", "—", "R021481"),
        it("Registro", "Regulable", "R020797"),
        it("Registro", "Fijo", "I-SKA-09"),
        it("Tapones blancos", "—", "R021495")
      ]},
      {t: "Materia prima, panelería y visores", items: [
        it("Lámina prepintada", "—", "INT230", "ml"),
        it("Lámina acero inox", "Ref 304 2B", "INT 325", "ml"),
        it("Lámina glassliner", "—", "INT 10007", "ml"),
        it("Alfajor", "—", "INT 300", "m²"),
        it("Perfil tee", "—", "INT 237", "ml"),
        it("Poliuretano", "Componente A", "INT 212", "kg"),
        it("Poliuretano", "Componente B", "INT 212", "kg"),
        it("Visor", "Vidrio", "—", "un"),
        it("Visor", "Acrílico", "INT 233", "un")
      ]}
    ]
  },

  /* ==================== 2 · BATIENTES ==================== */
  2: {
    nombre: "Batientes · BATIENTE · BATIENTE DOBLE",
    imagenes: ["batiente.jpg", "marco.jpg"],
    notas: ["Tapa", "Frente", "Alfajor", "Tee"],
    firmas: ["Solicitado por", "Accesorios instalados por"],
    opciones: [
      {t: "Accesorios", modo: "check", items: ["Barra antipánico inox", "Brazo hidráulico"]},
      {t: "Tipo de bisagra", modo: "radio", items: [
        "2930 RV", "2930 ECO", "2830 RV", "Económica",
        "Filo (=60) DX", "Filo (=60) SX",
        "Coldtech pequeña", "Coldtech mediana", "Coldtech alta",
        "Con suplemento 2800", "Con suplemento 2900", "Con suplemento ECO"]}
    ],
    bloques: [
      {t: "Bisagras y suplementos", items: [
        it("Bisagra estándar", "2930", "R020604"),
        it("Bisagra estándar", "2930 ECO", "R020698"),
        it("Bisagra estándar", "2830", "R020377"),
        it("Bisagra estándar", "ECO", "I-34-10"),
        it("Bisagra Coldtech", "42 mm · 12 mm", "R021957"),
        it("Bisagra Coldtech", "62 mm · 18 mm", "R021733"),
        it("Bisagra Coldtech", "62 mm · 25 mm", "R021458"),
        it("Bisagra 2800F", "DX", "R021318"),
        it("Bisagra 2800F", "SX", "R021319"),
        it("Suplemento bisagra", "2900", "R020606"),
        it("Suplemento bisagra", "2800", "R020379"),
        it("Suplemento bisagra", "ECO", "I-34-10AP")
      ]},
      {t: "Cerraduras, manijas y kits", items: [
        it("Cerradura batiente", "5725", "R020677"),
        it("Cerradura batiente", "5725V", "R021174"),
        it("Cerradura batiente", "TK · ECO", "1266"),
        it("Cerradura batiente", "7325 FILO", "R021317"),
        it("Cerradura batiente", "1825", "R017480"),
        it("Cerradura batiente", "1875", "R017529"),
        it("Cerradura batiente", "7325 CQN", "R021279"),
        it("Cerradura batiente", "Coldtech", "R021623"),
        it("Cerradura batiente", "6225 DX", "R021646"),
        it("Cerradura batiente", "6225 SX", "R021647"),
        it("Cerradura batiente", "6250 DX", "R021648"),
        it("Cerradura batiente", "6250 SX", "R021649"),
        it("Kit instalación 6000", "112 / 120 mm", "R021657"),
        it("Kit instalación 6000", "132 / 140 mm", "R021658"),
        it("Kit instalación 5000", "61 / 80", "R020499"),
        it("Kit instalación 5000", "81 / 100", "R020501"),
        it("Kit instalación 5000", "101 / 120", "R020502"),
        it("Kit inst. 7325CQN", "70 / 89", "R020328"),
        it("Kit inst. 7325CQN", "90 / 109", "R020329"),
        it("Suplemento 7325CQN", "87 / 102", "R020323"),
        it("Suplemento 7325CQN", "102 / 117", "R020324"),
        it("Suplemento 7325CQN", "117 / 132", "R020325"),
        it("Kit inst. 7325 Filo", "—", "R021339"),
        it("Barra antipánico", "Inox", "INT351"),
        it("Manija", "Mediana", "INT138"),
        it("Manija", "Frontal", "R020846")
      ]},
      {t: "Perfilería, marcos y estructura", items: [
        it("Marco", "Aluminio", "T101"),
        it("Marco", "PVC 80 mm", "R021485"),
        it("Marco", "PVC 110 mm", "R021490"),
        it("Marco", "PVC 130 mm", "R021491"),
        it("Marco", "Platina 130 mm", "R021494"),
        it("Perfil", "50 · 62 mm", "IGO 007"),
        it("Perfil", "70 mm", "IGO 003"),
        it("Perfil", "80 · 92 mm", "IGO 006"),
        it("Perfil", "100 · 112 mm", "IGO 009"),
        it("Umbral", "Doble aleta", "PT099-2")
      ]},
      {t: "Sellado y empaques", items: [
        it("Portaempaque", "—", "IGO 011"),
        it("Empaque", "Perimetral bajo", "INT604363"),
        it("Empaque", "Perimetral alto", "INTER10"),
        it("Empaque", "Barredor MT", "INT80249"),
        it("Empaque", "Barredor BT", "INT80268"),
        it("Empaque", "Plano tipo H", "R021540"),
        it("Empaque ventanilla", "40 mm", "INTER295"),
        it("Empaque ventanilla", "80 mm", "INT102")
      ]},
      {t: "Calefacción y baja temperatura", items: [
        it("Porta resistencia", "—", "MG006"),
        it("Resistencia eléctrica", "30W blanca", "R021482"),
        it("Resistencia eléctrica", "40W", "R021551")
      ]},
      {t: "Fijaciones y accesorios de hoja", items: [
        it("Tornillo nylon", "—", "R020792"),
        it("Tornillo PVC", "Cuadrada", "I-PBV-03"),
        it("Tornillo PVC", "Redonda", "I-PBV-05 TO"),
        it("Tuerca", "Nylon", "R020796"),
        it("Tuerca", "PVC", "I-PBV-05T"),
        it("Roldana", "Nylon", "R020795"),
        it("Roldana", "PVC", "I-PBV-05R"),
        it("Arandela nylon 45 mm", "—", "R021481"),
        it("Bulón", "—", "R021550"),
        it("Arandela para bulón", "—", "R021888"),
        it("Varilla roscada 50 cm", "—", "R021480"),
        it("Falleba", "30 cm", "INT112"),
        it("Falleba", "38 cm", "INTER360"),
        it("Tapones blancos", "—", "R021495"),
        it("Picaporte doble hoja", "—", "R015857"),
        it("Suplemento picaporte", "Doble", "S/C")
      ]},
      {t: "Materia prima, panelería y visores", items: [
        it("Lámina prepintada", "—", "INT230", "ml"),
        it("Lámina acero inox", "Ref 304", "INT325", "ml"),
        it("Lámina glassliner", "—", "INT10007", "ml"),
        it("Alfajor", "—", "INT300", "m²"),
        it("Perfil tee", "—", "INT237", "ml"),
        it("Poliuretano", "Componente A", "INT212", "kg"),
        it("Poliuretano", "Componente B", "INT212", "kg"),
        it("Visor acrílico", "Estándar / 30x60", "INT017 · INT337", "un")
      ]}
    ]
  },

  /* ==================== 3 · VAIVÉN ==================== */
  3: {
    nombre: "Vaivén · VAIVEN SENCILLA · VAIVEN DOBLE",
    imagenes: ["vaiven.jpg", "marco.jpg"],
    notas: ["Tapa", "Frente", "Alfajor", "Tee"],
    firmas: ["Solicitado por"],
    opciones: [
      {t: "Sistema de bisagra vaivén", modo: "radio",
       items: ["Con parada", "Sin parada", "ECO"]}
    ],
    bloques: [
      {t: "Sistema de bisagras vaivén", items: [
        it("Bisagra vaivén", "Con parada", "R020665"),
        it("Bisagra vaivén", "Sin parada", "R020984"),
        it("Bisagra vaivén", "ECO", "I-34-K")
      ]},
      {t: "Perfilería y marcos", items: [
        it("Marco aluminio", '2" x 1"', "INT311"),
        it("Marco aluminio", '3" x 1"', "INT354"),
        it("Marco aluminio", '3" x 1 1/2"', "INT244"),
        it("Marco PVC", "80 mm", "R021485"),
        it("Perfil", "Vaivén panel", "IGO012"),
        it("Perfil", "Vaivén inyección", "IGO001")
      ]},
      {t: "Visores y protecciones", items: [
        it("Visor", "22 x 60", "INT017"),
        it("Visor", "30 x 60", "INT233"),
        it("Visor", "40 x 60", "INT337"),
        it("Bumper", "Blanco", "INT326"),
        it("Bumper", "Negro", "INT327")
      ]},
      {t: "Sellado y empaques", items: [
        it("Empaque", "Perimetral vaivén", "INT315"),
        it("Empaque", "Tipo H · 1,7 m sencilla / 3,4 m doble", "R021540"),
        it("Empaque ventanilla", "40 mm", "INTER295")
      ]},
      {t: "Materia prima y panelería", items: [
        it("Lámina prepintada", "—", "INT230", "ml"),
        it("Lámina acero inox", "Ref 304", "INT325", "ml"),
        it("Lámina glassliner", "—", "INT10007", "ml"),
        it("Alfajor", "—", "INT300", "m²"),
        it("Perfil tee", "—", "INT237", "ml"),
        it("Poliuretano", "Componente A", "INT212", "kg"),
        it("Poliuretano", "Componente B", "INT212", "kg")
      ]}
    ]
  },

  /* ==================== 4 · OFICINA Y EMERGENCIA ==================== */
  4: {
    nombre: "Especiales · OFICINA · EMERGENCIA · EMERGENCIA DOBLE",
    imagenes: ["oficina.jpg", "marco.jpg"],
    notas: ["Tapa", "Frente", "Alfajor", "Tee"],
    firmas: ["Solicitado por"],
    opciones: [
      {t: "Accesorios y herrajes", modo: "check", items: [
        "Bisagra oficina acero inox", "Brazo hidráulico (cierrapuertas)",
        "Cerradura Yale", "Barra antipánico"]},
      {t: "Con medida", modo: "medida", items: ["Falleba", "Visor"]},
      {t: "Empaques", modo: "check", items: ["Empaque visor 40 mm", "Empaque tipo H"]}
    ],
    bloques: [
      {t: "Cerraduras, barras y cierrapuertas", items: [
        it("Cerradura oficina", "Mini", "INT 229"),
        it("Barra antipánico", "Yale 1 punto", "INT 770435905"),
        it("Barra antipánico", "Yale 2 puntos", "INT 77043590D"),
        it("Barra antipánico", "Inox", "R021539 · INT353"),
        it("Cierrapuertas", "Brazo hidráulico", "INT343")
      ]},
      {t: "Bisagras y fallebas", items: [
        it("Bisagra inox", "Oficina", "INT355"),
        it("Falleba", "30 cm", "INT112"),
        it("Falleba", "38 cm", "INTER360")
      ]},
      {t: "Marcos y perfilería", items: [
        it("Marco", '2" x 1" con aleta', "INT227"),
        it("Perfil", "Vaivén inyección", "INTER319"),
        it("Perfil", "Vaivén panel", "IGO012")
      ]},
      {t: "Visores y empaques", items: [
        it("Empaque", "Ventanilla 40 mm", "INTER 295"),
        it("Empaque", "Tipo H", "R021540")
      ]},
      {t: "Materia prima y panelería", items: [
        it("Lámina prepintada", "—", "INT230", "ml"),
        it("Lámina acero inox", "Ref 304", "INT 325", "ml"),
        it("Lámina glassliner", "—", "INT 10007", "ml"),
        it("Alfajor", "—", "INT 300", "m²"),
        it("Perfil tee", "—", "INT 237", "ml"),
        it("Poliuretano", "Componente A", "INT 212", "kg"),
        it("Poliuretano", "Componente B", "INT 212", "kg")
      ]}
    ]
  }
};

/** Cuantas piezas tiene un formato. Sirve para ajustar el tamaño al imprimir. */
const piezasDe = n => (FORMATOS[n]?.bloques || []).reduce((a, b) => a + b.items.length, 0);
