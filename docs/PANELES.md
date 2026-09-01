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

## Las vistas

Paneles no comparte ni una vista con puertas. Su página carga `paneles-*.js` y
**no** carga `control.js`, `ficha.js`, `planta.js`, `dashboards.js` ni
`automatizaciones.js`: ver la decisión 22.

### Nueva ficha — `paneles-ficha.js`

Un pedido de paneles casi nunca es «N unidades iguales»: el mismo cliente pide
22 de 3″ de 2,45 m y 8 de 4″ de 3 m a la vez. Por eso el creador es un **editor
de líneas**, no un contador como el de puertas.

Todas las líneas comparten OP con sufijo: `163-1`, `163-2`. Con una sola línea
la OP va limpia, sin sufijo. La fecha y el número de OP se ponen solos.

Los metros y los kilos se calculan **mientras se escribe**: es el dato con el
que se decide, y verlo solo después de guardar obliga a rehacer la ficha.

Las columnas K y L se dejan **vacías** al crear. Son fórmula de la hoja: si está
extendida, la hoja las rellena; escribir un número encima la borraría.

### Editar — mismo archivo

Se puede cambiar todo menos la **OP** y el **cliente**. No es una limitación
técnica: son los dos datos con los que el pedido se identifica fuera de la
aplicación —en el correo, en la remisión, en la llamada del cliente— y si
cambian aquí deja de poder cruzarse con nada.

Cambiar cantidad o largo reescribe los m² en la misma tanda: es un dato
derivado y no puede quedarse desfasado.

### Control de OPs — `paneles-control.js`

Todas las columnas, con prioridad y estado editables en línea. Los contadores
no cuentan unidades: cuentan **m² pendientes** y **kg de poliuretano
pendientes**, que es lo que se pide al proveedor.

### Planta — `paneles-planta.js`

Enseña la cola en el orden que calcula `secuencia.js` y **anuncia cada cambio de
montaje** en el sitio exacto donde toca hacerlo, cerrando la tanda anterior con
los metros que se hicieron sin tocar la máquina.

`Terminar` es lo único que planta decide sobre el estado, y es lo que hace que
la línea salga de la cola y aparezca en almacén. Un desplegable con todos los
estados invitaría a despachar sin pasar por almacén.

### Resumen — `paneles-resumen.js`

Tres preguntas: cuánto se fabrica (m² por mes y por producto), cuánto se tarda,
y cuánto poliuretano se gasta.

El **plazo de entrega** sale del mayor de dos números, más un 15 % de margen:
lo que se ha tardado históricamente (percentil 90) y lo que tardaría la cola
actual en vaciarse al ritmo de los últimos 60 días. Sube cuando entra trabajo y
baja cuando la cola se vacía, así que hay que mirarlo el día que se promete.

La producción por mes cuenta el mes en que la línea se **acabó**, no aquel en
que entró el pedido.

### Almacén — `paneles-almacen.js`

Agrupado por OP, porque un pedido se despacha entero. Un pedido está COMPLETO
cuando ninguna de sus líneas sigue en fabricación; los incompletos quedan abajo
y dicen cuántas faltan. Despachar uno incompleto pide confirmación: sacar media
OP del almacén es una decisión, no un descuido.

## Automatismos

Son cuatro, y la linea que los separa importa: **marcar procesos dice lo que se
ha hecho; el estado dice donde esta la linea.** Lo primero lo hace quien
fabrica, sobre la marcha. Lo segundo es una decision, y la toma una persona.

1. **La fecha de creacion** se pone sola al guardar la ficha, y es la de hoy
   —del reloj, no de lo que quedara escrito en el campo—. De ella cuelga toda
   la antiguedad: los dias en cola, el escalado de prioridad y los tiempos de
   entrega del resumen.

2. **La primera marca sella el COMIENZO** (columna R) y ya no se vuelve a
   tocar: interesa cuando se empezo, no la ultima vez que alguien toco una
   casilla.

3. **El boton Terminar sella el FIN** (S) y pone el estado en TERMINADO (T).
   Es lo unico que saca la linea de planta y la hace aparecer en almacen.

4. **Pasar a DESPACHADO sella la fecha de despacho** (U).

### Llegar al 100 % no cierra nada

Antes si: marcar el ultimo proceso ponia la fecha de fin, cambiaba el estado a
TERMINADO y la linea desaparecia de planta en el acto. Estaba mal por dos
razones.

La practica: entre marcar la limpieza y poder cargar el panel en el camion
caben una revision, un retoque o simplemente que alguien lo de por bueno. Con
el cierre automatico, la linea salia de la cola antes de que eso pasara y
aparecia en almacen algo que seguia en la maquina.

Y la de fondo: nadie habia decidido nada. Una casilla marcada es una
observacion; dar una linea por terminada es una decision, con consecuencias
para quien va a despacharla.

Ahora una linea al 100 % **se queda en la cola**, resaltada en verde y con
«lista para terminar» en lugar del porcentaje. Es el unico sitio de planta
donde queda algo que decidir, asi que se ve. Pulsar Terminar es lo que la
cierra.

## Lo que queda por comprobar

**En la hoja real.** Hasta esta versión, la página de paneles ejecutaba las
reparaciones de puertas contra la pestaña PANEL (decisión 22). Conviene mirar
en la hoja, una sola vez:

- **M1** y la columna M: no deben tener un desplegable de prioridades; son las
  casillas de PERFIL.
- **AL1** y **AM1**: pueden haberse quedado con los encabezados «SEPARADA PARA»
  y «SELLO», que ahí no significan nada.

Nada de eso vuelve a escribirse: las coordenadas ahora las declara `modelo.js`.

**Sin hacer.** Paneles no tiene impresión de etiquetas ni hoja de ruta; puertas
sí. Está por decidir si hace falta, y con qué formato.
