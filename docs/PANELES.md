# Paneles

Un panel no se parece a una puerta y su hoja tampoco. Lo que los distingue está
declarado en `src/js/modelo.js` (`MODELO_PANELES`) y `src/js/secuencia.js`.

## Columnas

| Col | Campo | Notas |
|---|---|---|
| A | Fecha de creación | se pone sola al crear la ficha |
| B | Cliente | no editable después |
| C | OP | se asigna sola; varias líneas comparten OP con sufijo `163-1`, `163-2` |
| D | Prioridad | |
| E | Cantidad de paneles | |
| F | Largo del panel | el ancho es siempre **1,16 m** |
| G | Producto | tipo de panel |
| H | Ranurado | |
| I | Cara A | |
| J | Cara B | |
| M · N · O | PERFIL · INYECCIÓN · LIMPIEZA | los tres procesos |

**K, L y de P en adelante están sin confirmar.** Mientras figuren en
`columnasPorConfirmar`, la aplicación **no escribe** en ellas: escribir sobre una
columna que ya tuviera datos los destruiría.

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
