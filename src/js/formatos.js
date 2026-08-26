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
   diferencian en la lista de materiales que el operario diligencia a mano.

   Cada linea es una pieza real del almacen con su referencia. La referencia va
   impresa junto al nombre a proposito: quien baja a buscarla no tiene que
   acordarse ni preguntar, y evita traer la pieza equivocada.

   Dos maneras de diligenciar, indicadas en el titulo de cada bloque:
     · «Seleccionar»    -> casilla para marcar cual se uso
     · «Poner cantidad» -> casilla y raya para escribir cuantas               */

/** Tipo de puerta -> numero de formato. En mayusculas y sin espacios sobrantes. */
const FORMATO_DE_TIPO = {
  "SE12": 1, "SM20": 1, "480": 1,
  "BATIENTE": 2, "BATIENTE DOBLE": 2,
  "VAIVEN": 3, "VAIVEN SENCILLA": 3, "VAIVEN DOBLE": 3,
  "OFICINA": 4, "EMERGENCIA": 4, "EMERGENCIA DOBLE": 4
};

/** Que formato le toca a esta puerta. 0 = ninguno definido todavia. */
const formatoDe = c => FORMATO_DE_TIPO[String(c[C.TIPO] ?? "").trim().toUpperCase()] || 0;

/* Atajos para escribir las listas sin ruido:
     s(nombre, ref)  pieza que se marca
     q(nombre, ref)  pieza de la que se anota cantidad                        */
const s = (n, r) => ({n, r, modo: "sel"});
const q = (n, r) => ({n, r, modo: "cant"});

const FORMATOS = {
  1: {
    nombre: "Corredizas · SE12 · SM20 · 480",
    bloques: [
      {t: "Cerradura corredera", modo: "sel", items: [
        s("9500 HP", "R020685"), s("COLDTECH", "R022028"),
        s("ECO 80", "I-268-R80"), s("ECO 100", "I-268-R100"), s("ECO 120", "I-268-R120")]},
      {t: "Eslabones 9500 HP", modo: "cant", items: [
        q("2 eslabones", "R020636"), q("4 eslabones", "R020637")]},
      {t: "Tipo de manija", modo: "sel", items: [
        s("Interna mediana", "INT138"), s("Interna vasca", "R020845"),
        s("Externa lateral", "R020847"), s("Externa frontal", "R020846")]},
      {t: "Manija tipo palanca", modo: "sel", items: [
        s("8000 S", "R021650"), s("8000 M", "R021651"), s("8100", "R021180"),
        s("8100 L", "R021201"), s("Cuña nylon", "R021064"),
        s("Kit instalación 8100", "R021189")]},
      {t: "Gancho y apoyo", modo: "sel", items: [
        s("ECO", ""), s("SM20", ""),
        s("Apoyo de gancho SM20", "R020908"), s("Gancho de cierre SM20", "R020904"),
        s("Apoyo de gancho ECO", "R021442"), s("Gancho de cierre ECO", "R021443")]},

      {t: "Tipo de poleas", modo: "sel", items: [
        s("SM20 / SM20X", "R021522/23"), s("SE12 DX", "R021079"),
        s("SE12 SX", "R021080"), s("480", "I-SKA-01D"), s("480 IK", "")]},
      {t: "Automatización", modo: "sel", items: [
        s("DX", "R020980"), s("SX", "R020981")]},
      {t: "Tipo de registro", modo: "sel", items: [
        s("Regulable", "R020797"), s("Fijo", "I-SKA-09")]},

      {t: "Empaque", modo: "sel", items: [
        s("Barredor MT", "INT80249"), s("Barredor BT", "INT80268"),
        s("Perimetral alto", "INTER 10"), s("Perimetral bajo", "INT604363"),
        s("Porta empaque", "IGO 011")]},
      {t: "Empaque visor", modo: "sel", items: [
        s("40 mm", "INTER 295"), s("80 mm", "INT 102")]},
      {t: "Sello a puerta", modo: "sel", items: [
        s("SS · sello a suelo", ""), s("ST · sello a tope", "")]},
      {t: "Visor y tapones", modo: "mixto", items: [
        s("Visor vidrio", ""), s("Visor acrílico", "INT 233"),
        q("Tapones blancos", "R021495")]},

      {t: "Tornillo fijación SM20", modo: "cant", items: [
        q("Tornillo fijación SM20", "R020903")]},
      {t: "Tornillos del marco", modo: "sel", items: [
        s("PVC redondo", "I-PBV-05 TQ"), s("Zincados", "")]},
      {t: "Tornillos del riel cuadrados", modo: "sel", items: [
        s("PVC", "I-PBV-03"), s("Nylon", "R020792")]},
      {t: "Tuercas", modo: "sel", items: [
        s("PVC", "I-PBV-05T"), s("Nylon", "R020796")]},
      {t: "Arandela", modo: "sel", items: [
        s("Sí · arandela PVC 45", "R021481"), s("No", "")]},
      {t: "Roldana", modo: "sel", items: [
        s("PVC", "I-PBV-05R"), s("Nylon", "R020795")]},

      {t: "Riel superior", modo: "cant", items: [
        q("SE12", "IGO 002"), q("SM20", "IGO 010"), q("480", "RPO 005")]},
      {t: "Riel superior interno", modo: "cant", items: [
        q("SE12", "IGO 005"), q("SM20", "ZAQ 024"), q("480", "RFRI 005")]},
      {t: "Riel inferior", modo: "cant", items: [
        q("SM20", "IGO 004"), q("SE12", "IGO 008")]},
      {t: "Fin de carrera", modo: "cant", items: [
        q("SE12", "R021081"), q("SM20", "INT013"), q("480 DX", "I-SKA-13"),
        q("480 SX", "I-SKA-15"), q("480 reversible", "R021456")]},
      {t: "Kits, rampas y tapas", modo: "cant", items: [
        q("Kit rampa o curva SE12", "R021082"), q("Kit rampa o curva SM20", "R021525"),
        q("Rampa o curva 480 DX", "R021454"), q("Rampa o curva 480 SX", "R021455"),
        q("Kit tapas riel superior SE12", "R0210834"),
        q("Tapa DX riel inferior SE12", "R020832"),
        q("Tapa SX riel inferior SE12", "R020833"),
        q("Brida y tapeta DX", "INT123"), q("Brida y tapeta SX", "INT124")]},

      {t: "Perfil y marco", modo: "cant", items: [
        q("Perfil 50 · 62 mm", "IGO 007"), q("Perfil 70 mm", "IGO 003"),
        q("Perfil 80 · 92 mm", "IGO 006"), q("Perfil 100 · 112 mm", "IGO 009"),
        q("Marco aluminio", "T101"), q("Marco PVC 110 mm", "R021490"),
        q("Marco PVC 130 mm", "R021491"), q("Marco platina 130 mm", "R021494")]},
      {t: "Láminas y otros insumos", modo: "cant", items: [
        q("Porta resistencia", "MG 006"), q("Resistencia 30W blanca", "R021482"),
        q("Resistencia 40W", "R021551"), q("Lámina prepintada (ml)", "INT 230"),
        q("Lámina inox ref 304 2B", "INT 325"), q("Lámina glassliner", "INT 10007"),
        q("Alfajor (m²)", "INT 300"), q("Tee (ml)", "INT 237"),
        q("Poliuretano (kg)", "INT 212"), q("Umbral", "PT099-2")]}
    ]
  },

  /* Formatos 2, 3 y 4: se sabe QUE tipos les tocan, pero todavia no que
     materiales llevan. Hasta que lleguen, imprimen la cabecera completa y una
     zona en blanco para escribir a mano — es preferible una hoja util a medias
     que ninguna hoja. */
  2: {nombre: "Batientes · BATIENTE · BATIENTE DOBLE", bloques: [], pendiente: true},
  3: {nombre: "Vaivén · VAIVEN SENCILLA · VAIVEN DOBLE", bloques: [], pendiente: true},
  4: {nombre: "Especiales · OFICINA · EMERGENCIA · EMERGENCIA DOBLE", bloques: [], pendiente: true}
};

/** Cuantas piezas tiene un formato. Sirve para ajustar el tamaño al imprimir. */
const piezasDe = n => (FORMATOS[n]?.bloques || []).reduce((a, b) => a + b.items.length, 0);
