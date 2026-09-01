# Paneles

Un panel no se parece a una puerta y su hoja tampoco. Lo que los distingue está
declarado en `src/js/modelo.js` (`MODELO_PANELES`) y `src/js/secuencia.js`.

## Columnas — confirmadas contra la hoja

| Col | Campo | |
|---|---|---|
| A | FECHA | lote; a veces texto («agosto - 1») |
| B | CLIENTE | no editable después |
| C | OP | varias líneas comparten OP: `163-1`, `163-2` |
| D | PRIORIDAD | |
| E | CANT | paneles |
| F | LARGO | metros; el ancho es siempre **1,16** |
| G | PRODUCTO | lleva el espesor en el nombre: `PANEL 3"` |
| H | RANURADO | |
| I | CARA A | |
| J | CARA B | |
| K | UNIDAD | poliuretano por panel (kg) — fórmula de la hoja |
| L | TOTAL | poliuretano de la línea (kg) — fórmula de la hoja |
| M · N · O | PERFIL · INYECCIÓN · LIMPIEZA | los tres procesos |
| P | M2 | |
| Q | STATUS | |
| R | COMIENZO PROCESO | |
| S | FIN PROCESO | |
| T | ESTADO | |
| U | FECHA DE DESPACHO | |

El espesor **no tiene columna**: se deduce del producto. `PANEL 3"` agrupa con
`PANEL 3"`, y de ahí sale el agrupamiento de la secuencia de fabricación.

## Poliuretano

La hoja lo calcula en K y L. La fórmula, deducida de sus datos y verificada:

```
UNIDAD = largo × 1,16 × espesor(m) × 38      kg por panel
TOTAL  = UNIDAD × cantidad                    kg de la línea
```

El **38 es la densidad del poliuretano inyectado en kg/m³**: aparece con cuatro
decimales de precisión (37,9999), no es un coeficiente de ajuste. El espesor en
metros son las pulgadas del producto redondeadas al milímetro — 3″ → 0,076.

Comprobado contra la fila de AMERICAN BLUE (22 paneles de 2,45 m, PANEL 3″):

```
UNIDAD  hoja 8,208     calculado 8,207696
TOTAL   hoja 180,569   calculado 180,569312   desvío 0,0002 %
```

`poliuretano.js` **lee** lo que trae la hoja y solo calcula cuando la celda está
vacía. La fórmula se usa además para comprobar que ambas cuadran: si un día la
de la hoja cambia y ésta no, `revisarPoliuretano()` lo dice en vez de callarlo.

El consumo se agrupa por mes, por semana y por producto. Las filas cuyo lote es
texto («agosto - 1») entran en el consumo mensual —para eso basta el mes— pero
no en el semanal.

Como referencia, el gasto por metro cuadrado sale del espesor: 3″ → 2,89 kg/m²,
4″ → 3,88, 6″ → 5,78.

## La unidad de trabajo es el metro cuadrado

```
m² = cantidad × largo × 1,16
```

No la pieza. Un pedido de 60 paneles de 3 m son 208,8 m², y eso es lo que ocupa
la máquina.

## Prioridades: escalones, no saltos

| Nivel | Comportamiento |
|---|---|
| URGENTE | se antepone a todo; **no escala ni caduca** |
| ALTA | entra a la cola inmediata |
| MEDIA | a los 4 días sube a ALTA |
| BAJA | a los 8 días sube a MEDIA, y desde ahí otros 4 hasta ALTA |

Los días se cuentan **desde que entró en ese nivel**, no desde que se creó la
ficha. Se toman del historial: sin eso, una BAJA recién ascendida a MEDIA
saltaría a ALTA el mismo día, porque ya llevaría 8 desde su creación.

## Secuencia de fabricación

Cambiar el espesor obliga a reajustar la máquina, así que conviene agrupar. Pero
agrupar sin límite deja esperando a los demás espesores. El equilibrio:

1. Manda la prioridad. URGENTE pasa entera, sin agrupar ni cortar.
2. Dentro de cada prioridad se agrupan los pedidos del mismo espesor,
   empezando por el que más metros acumula.
3. El grupo se corta al llegar a **`lotePorEspesor`** (200 m² por defecto) y
   cede el turno al siguiente espesor que esté esperando.
4. Dentro del grupo, por número de OP.

La secuencia devuelve, por línea: OP, prioridad, días en cola, producto,
espesor, m², m² acumulados y si toca **reajuste de máquina**.

Ejemplo real de la prueba:

```
OP       prioridad   días  espesor    m2    acum   setup
164-1    URGENTE       0   6"        23.2    23.2   << reajuste
161-1    ALTA          1   3"        87.0    87.0   << reajuste
165-1    ALTA          3   3"       208.8   295.8
162-1    ALTA          1   4"       174.0   174.0   << reajuste
163-1    MEDIA         5   3"        46.4    46.4   << reajuste
160-1    BAJA          2   3"       139.2   185.6
```

## Pendiente

Con las columnas confirmadas: nueva ficha multilínea, edición, Control de OPs
con sus filtros, la vista de Planta sobre esta secuencia, Resumen de m² y
tiempos de entrega, y Almacén.
