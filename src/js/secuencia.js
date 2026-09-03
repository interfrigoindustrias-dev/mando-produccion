/* Secuencia de fabricacion de paneles
   Proyecto: Control de Produccion - Interfrigo

   En puertas la cola es una lista por prioridad. En paneles no basta: cambiar
   el espesor obliga a reajustar la maquina, asi que conviene agrupar pedidos
   del mismo espesor. Pero agrupar sin limite deja esperando a los demas, y por
   eso el agrupamiento se corta al llegar a un tope de metros cuadrados.

   Este archivo resuelve ese equilibrio y no toca la hoja: solo ordena y
   explica. Lo que escribe son las prioridades escaladas, y eso pasa por
   automatizaciones.js. */
"use strict";

/* ORDEN DE LA COLA, de arriba abajo:
     0  URGENTE                       lo pone una persona; no espera turno
     1  ALTA que lleva 5 dias parada  se adelanta al resto de las ALTA
     2  ALTA
     3  MEDIA
     4  BAJA
     5  sin prioridad
   Dentro de cada nivel manda el numero de OP, de menor a mayor. */
const ORDEN_PRIO = {URGENTE: 0, "ALTA·adelantada": 1, ALTA: 2, MEDIA: 3, BAJA: 4, "": 5};

/** En que escalon de la cola va esta linea. */
function nivelDe(fila, c){
  const p = String(c[C.PRIO] ?? "").trim().toUpperCase();
  if(p === "ALTA" && altaAdelantada(fila, c)) return "ALTA·adelantada";
  return p in ORDEN_PRIO ? p : "";
}

/** Metros cuadrados de una linea. */
const m2De = c => (num(c[C.CANT]) || 0) * (num(c[C.LARGO]) || 0) * (MODELO.ancho || 1);

/** El espesor por el que se agrupa. No hay columna propia: se lee del nombre
 *  del producto, que lo trae en pulgadas o en milimetros.
 *
 *  Lo que agrupa es el ESPESOR, no el producto: un PANEL 3" y un PISO 3" piden
 *  el mismo montaje de maquina, asi que hacerlos seguidos ahorra un ajuste. */
function espesorDe(c){
  const etiqueta = typeof etiquetaEspesor === "function"
    ? etiquetaEspesor(c[C.PROD]) : "";
  return etiqueta || String(c[C.PROD] ?? "").trim() || "sin espesor";
}
/** Milimetros del espesor, para poder ordenar «40 mm» junto a «3"». */
const espesorMmDe = c => (typeof espesorMm === "function" ? espesorMm(c[C.PROD]) : null);

/** Dias que lleva la linea esperando, desde que se creo. */
function diasEnCola(c){
  const f = toDate(c[C.FECHA]);
  if(!f) return 0;
  const h = new Date(); h.setHours(0,0,0,0);
  return Math.max(0, Math.round((h - f) / 86400000));
}

/** Cuando fue la ultima vez que a esta linea le paso ALGO.
 *
 *  «Sin tocarse» es literal: vale cualquier cambio —una edicion, un proceso
 *  marcado, un cambio de prioridad—, no solo los de prioridad. Una linea en la
 *  que se esta trabajando no lleva esperando, aunque su prioridad no cambie.
 *
 *  Si no hay historial, se cae a la fecha de creacion: es lo unico que se sabe. */
function ultimoToque(fila, c){
  let ultima = null;
  for(const e of (typeof LOG !== "undefined" ? LOG : [])){
    if(String(e.fila) !== String(fila)) continue;
    const f = toDate(String(e.fecha ?? "").split(" ")[0]);
    if(f && (!ultima || f > ultima)) ultima = f;
  }
  return ultima || toDate(c[C.FECHA]);
}

/** Dias enteros que lleva sin que nadie la toque. */
function diasSinTocar(fila, c){
  const desde = ultimoToque(fila, c);
  if(!desde) return 0;
  const h = new Date(); h.setHours(0,0,0,0);
  return Math.max(0, Math.round((h - desde) / 86400000));
}

/** A que prioridad deberia haber subido ya, o null si sigue en plazo. */
function prioridadQueTocaria(fila, c){
  const esc = MODELO.escalado || {};
  const prio = String(c[C.PRIO] ?? "").trim().toUpperCase();
  const regla = esc[prio];
  if(!regla) return null;                       // URGENTE no caduca; ALTA es el techo
  return diasSinTocar(fila, c) >= regla.dias ? regla.a : null;
}

/** Una ALTA que lleva demasiado sin tocarse no puede subir mas —es el techo—,
 *  asi que en vez de cambiarle la prioridad se la adelanta: pasa por delante
 *  del resto de las ALTA y se coloca justo detras de las urgentes. */
function altaAdelantada(fila, c){
  const dias = MODELO.diasAdelantoAlta;
  if(!dias) return false;
  if(String(c[C.PRIO] ?? "").trim().toUpperCase() !== "ALTA") return false;
  return diasSinTocar(fila, c) >= dias;
}

/** Lineas pendientes de fabricar, en el orden en que deberian hacerse.
 *
 *  Primero manda la prioridad. Dentro de cada prioridad se agrupan los pedidos
 *  del mismo espesor —para no reajustar la maquina a cada pieza— y ese grupo
 *  se corta al llegar al tope de metros: entonces cede el turno al siguiente
 *  espesor que este esperando. Dentro del grupo, por numero de OP. */
function secuenciaPaneles(lineas){
  const tope = MODELO.lotePorEspesor || Infinity;
  const porOp = (a,b) => String(a.c[C.OP]).localeCompare(String(b.c[C.OP]), "es", {numeric:true});

  // Pendientes agrupadas por prioridad
  const porPrio = new Map();
  lineas.forEach(x=>{
    const k = nivelDe(x.r, x.c);
    (porPrio.get(k) || porPrio.set(k, []).get(k)).push(x);
  });

  const salida = [];
  let espesorAnterior = null;
  let acumulado = 0;

  [...porPrio.keys()]
    .sort((a,b)=>ORDEN_PRIO[a]-ORDEN_PRIO[b])
    .forEach(prio=>{
      // Cola de este nivel, repartida por espesor
      const grupos = new Map();
      porPrio.get(prio).sort(porOp).forEach(x=>{
        const e = espesorDe(x.c);
        (grupos.get(e) || grupos.set(e, []).get(e)).push(x);
      });

      // Se empieza por el espesor con mas trabajo acumulado: agrupa mejor.
      const pendientes = [...grupos.entries()]
        .map(([esp, xs])=>({esp, xs, m2: xs.reduce((s,x)=>s+m2De(x.c), 0)}))
        .sort((a,b)=>b.m2-a.m2 ||
          ((espesorMmDe(a.xs[0].c) ?? 1e9) - (espesorMmDe(b.xs[0].c) ?? 1e9)) ||
          a.esp.localeCompare(b.esp, "es", {numeric:true}));

      /* URGENTE y las ALTA adelantadas no esperan a nadie: pasan enteras, sin
         agrupar ni cortar por metros. Son pocas y son las que corren. */
      if(prio === "URGENTE" || prio === "ALTA·adelantada"){
        pendientes.forEach(g=>g.xs.forEach(x=>{
          const esp = espesorDe(x.c);
          salida.push(marcar(x, prio, esp, esp !== espesorAnterior, m2De(x.c)));
          espesorAnterior = esp;
        }));
        acumulado = 0;
        return;
      }

      // El resto se sirve por tandas del mismo espesor
      const cola = pendientes.filter(g=>g.xs.length);
      while(cola.some(g=>g.xs.length)){
        const g = cola.find(x=>x.xs.length);
        if(!g) break;
        let enTanda = 0;
        while(g.xs.length){
          const x = g.xs.shift();
          const m2 = m2De(x.c);
          const cambio = g.esp !== espesorAnterior;
          if(cambio){ acumulado = 0; }
          acumulado += m2; enTanda += m2;
          salida.push(marcar(x, prio, g.esp, cambio, m2, acumulado));
          espesorAnterior = g.esp;
          // Tope alcanzado: cede el turno al siguiente espesor que espere
          if(enTanda >= tope && cola.some(o=>o!==g && o.xs.length)) break;
        }
        // Se rota el grupo al final para que el siguiente tenga su turno
        const i = cola.indexOf(g);
        cola.push(...cola.splice(i,1));
        if(cola.every(o=>!o.xs.length)) break;
      }
    });

  return salida;
}

function marcar(x, prio, esp, cambioSetup, m2, acumulado){
  return {
    r: x.r, c: x.c,
    prioridad: prio || "sin prioridad",
    adelantada: prio === "ALTA·adelantada",
    dias: diasEnCola(x.c),
    sinTocar: diasSinTocar(x.r, x.c),
    producto: String(x.c[C.PROD] ?? "").trim(),
    espesor: esp,
    m2,
    acumulado: acumulado ?? m2,
    cambioSetup: !!cambioSetup
  };
}
