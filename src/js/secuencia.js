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

/* Orden de la cola. URGENTE se antepone a todo y no espera turno. */
const ORDEN_PRIO = {URGENTE: 0, ALTA: 1, MEDIA: 2, BAJA: 3, "": 4};

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

/** Cuando subio por ultima vez de nivel, segun el historial.
 *  Sin esa fecha, una BAJA recien ascendida a MEDIA saltaria a ALTA el mismo
 *  dia: los 4 dias de MEDIA se cuentan desde que ES media, no desde que nacio. */
function desdeCuandoEnSuNivel(fila, c){
  const prio = String(c[C.PRIO] ?? "").trim().toUpperCase();
  let ultima = null;
  for(const e of (typeof LOG !== "undefined" ? LOG : [])){
    if(String(e.fila) !== String(fila) || e.campo !== "Prioridad") continue;
    if(String(e.despues).trim().toUpperCase() !== prio) continue;
    const f = toDate(e.fecha.split(" ")[0]);
    if(f && (!ultima || f > ultima)) ultima = f;
  }
  return ultima || toDate(c[C.FECHA]);
}

/** A que prioridad deberia haber subido ya, o null si sigue en plazo. */
function prioridadQueTocaria(fila, c){
  const esc = MODELO.escalado || {};
  const prio = String(c[C.PRIO] ?? "").trim().toUpperCase();
  const regla = esc[prio];
  if(!regla) return null;                       // URGENTE y ALTA no escalan
  const desde = desdeCuandoEnSuNivel(fila, c);
  if(!desde) return null;
  const limite = new Date(desde);
  limite.setDate(limite.getDate() + regla.dias);
  const h = new Date(); h.setHours(0,0,0,0);
  return limite.getTime() <= h.getTime() ? regla.a : null;
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
    const p = String(x.c[C.PRIO] ?? "").trim().toUpperCase();
    const k = p in ORDEN_PRIO ? p : "";
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

      // URGENTE no espera a nadie: pasa entera, sin agrupar ni cortar.
      if(prio === "URGENTE"){
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
    dias: diasEnCola(x.c),
    producto: String(x.c[C.PROD] ?? "").trim(),
    espesor: esp,
    m2,
    acumulado: acumulado ?? m2,
    cambioSetup: !!cambioSetup
  };
}
