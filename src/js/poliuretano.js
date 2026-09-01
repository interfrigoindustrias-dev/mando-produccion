/* Consumo de poliuretano
   Proyecto: Control de Produccion - Interfrigo

   La hoja ya calcula los kilos de cada linea en las columnas K y L. Aqui no se
   recalculan para sustituirlos: se leen, se agrupan por periodo y producto, y
   se comprueba que cuadren con la formula. Si algun dia la formula de la hoja
   cambia y aqui no, la comprobacion lo dice en vez de callarlo.

     UNIDAD = largo x 1,16 x espesor(m) x 38     kg por panel
     TOTAL  = UNIDAD x cantidad                  kg de la linea

   El 38 es la densidad del poliuretano inyectado en kg/m3. */
"use strict";

/** Kilos de una linea. Manda lo que dice la hoja; si esa celda esta vacia
 *  —una fila nueva cuya formula aun no se extendio— se usa el calculo. */
function kgPoliuretano(c){
  const enLaHoja = num(c[C.POLI_TOT]);
  if(enLaHoja !== null && enLaHoja > 0) return enLaHoja;
  const calc = MODELO.poliuretano ? MODELO.poliuretano(c) : null;
  return calc ? calc.total : 0;
}

/** Kilos por panel. Igual que el total: manda lo que dice la hoja en K, y solo
 *  se calcula cuando esa celda esta vacia. */
function kgUnidadPoliuretano(c){
  const enLaHoja = num(c[C.POLI_UNI]);
  if(enLaHoja !== null && enLaHoja > 0) return enLaHoja;
  const calc = MODELO.poliuretano ? MODELO.poliuretano(c) : null;
  return calc ? calc.unidad : 0;
}

/** Diferencias entre lo que trae la hoja y lo que da la formula.
 *  Sirve para detectar que una de las dos se quedo atras. */
function revisarPoliuretano(filas, toleranciaPct = 1){
  const raros = [];
  for(const {r, c} of filas){
    const hoja = num(c[C.POLI_TOT]);
    const calc = MODELO.poliuretano ? MODELO.poliuretano(c) : null;
    if(hoja === null || !calc || !calc.total) continue;
    const desvio = Math.abs(hoja - calc.total) / calc.total * 100;
    if(desvio > toleranciaPct){
      raros.push({fila: r, op: String(c[C.OP] ?? ""), hoja, calculado: calc.total,
                  desvioPct: +desvio.toFixed(1)});
    }
  }
  return raros;
}

/* ---------- periodos ----------
   La columna FECHA no siempre es una fecha: hay filas con texto de lote como
   «agosto - 1». Se aprovecha igual, porque para el consumo mensual basta con
   saber el mes. */
const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio",
                  "agosto","septiembre","octubre","noviembre","diciembre"];

/** Clave de mes «2026-08» a partir de una fecha o de un texto de lote. */
function mesDe(v){
  const d = toDate(v);
  if(d) return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  const t = String(v ?? "").toLowerCase();
  const i = MESES_ES.findIndex(m => t.includes(m));
  if(i < 0) return null;
  // Sin año en el texto: se asume el año en curso, que es lo que se produce.
  return new Date().getFullYear() + "-" + String(i + 1).padStart(2, "0");
}

/** Clave de semana ISO «2026-S34». Solo para filas con fecha de verdad. */
function semanaDe(v){
  const d = toDate(v);
  if(!d) return null;
  const j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = j.getUTCDay() || 7;
  j.setUTCDate(j.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(j.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((j - inicio) / 86400000 + 1) / 7);
  return j.getUTCFullYear() + "-S" + String(semana).padStart(2, "0");
}

const nombreMes = clave => {
  const [a, m] = String(clave).split("-");
  return MESES_ES[+m - 1] + " " + a;
};

/** Consumo agrupado por un criterio, con kilos, metros y numero de paneles. */
function consumoPor(filas, clave){
  const acc = new Map();
  for(const {c} of filas){
    const k = clave(c);
    if(k === null || k === undefined || k === "") continue;
    const e = acc.get(k) || {kg: 0, m2: 0, paneles: 0, lineas: 0};
    e.kg += kgPoliuretano(c);
    e.m2 += MODELO.metros ? MODELO.metros(c) : 0;
    e.paneles += num(c[C.CANT]) || 0;
    e.lineas++;
    acc.set(k, e);
  }
  return acc;
}

/** Resumen completo para la vista: por mes, por semana y por producto. */
function resumenPoliuretano(filas){
  const porMes = consumoPor(filas, c => mesDe(c[C.FECHA]));
  const porSemana = consumoPor(filas, c => semanaDe(c[C.FECHA]));
  const porProducto = consumoPor(filas, c => String(c[C.PROD] ?? "").trim() || "sin producto");

  const meses = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const kgMeses = meses.map(([, e]) => e.kg);
  const promedioMes = kgMeses.length
    ? kgMeses.reduce((a, b) => a + b, 0) / kgMeses.length : 0;

  return {
    porMes: meses.map(([k, e]) => ({periodo: k, etiqueta: nombreMes(k), ...e})),
    porSemana: [...porSemana.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, e]) => ({periodo: k, etiqueta: k.replace("-S", " · semana "), ...e})),
    porProducto: [...porProducto.entries()].sort((a, b) => b[1].kg - a[1].kg)
      .map(([k, e]) => ({producto: k, ...e})),
    totalKg: [...porMes.values()].reduce((a, e) => a + e.kg, 0),
    promedioMes,
    /** Kilos por metro cuadrado: cuanto poliuretano cuesta cada m2 fabricado.
     *  Cambia con el espesor, asi que sirve para ver la mezcla de productos. */
    kgPorM2: (() => {
      const kg = [...porProducto.values()].reduce((a, e) => a + e.kg, 0);
      const m2 = [...porProducto.values()].reduce((a, e) => a + e.m2, 0);
      return m2 ? kg / m2 : 0;
    })()
  };
}
