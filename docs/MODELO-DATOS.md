# Modelo de datos

La base de datos es una hoja de cálculo de Google. La app usa tres pestañas.

---

## `OP PUERTA` — una fila por puerta

Fila 1 = encabezados. Los datos empiezan en la fila 2.

| Col | Campo | Tipo | Valores |
|---|---|---|---|
| A | FECHA DE CREACIÓN | fecha | Se pone sola al crear la ficha |
| B | OP | texto | Puede llevar sufijo: `492-1`, `492-2` |
| C | CLIENTE | texto | |
| D | COMPLEMENTO | casilla | |
| E | STOCK | casilla | Marca las puertas de inventario |
| F | MATERIAL | lista | PP · PP-COLOR · INOX · GLASS · PP-PANEL · INOX CAL 22 |
| G | TIPO | lista | SE12 · SM20 · 480 · BATIENTE · BATIENTE DOBLE · VAIVEN SENCILLA · VAIVEN DOBLE · OFICINA · EMERGENCIA · EMERGENCIA DOBLE |
| H | ANCHO VANO | número | cm |
| I | ALTO VANO | número | cm |
| J | PUNTOS | número | Carga de trabajo |
| K | ESPESOR mm | lista | 40 · 50 · 62 · 70 · 80 · 92 · 100 · 112 |
| L | APERTURA | lista | SX · DX · DH · BD · VAIVEN · VD |
| M | PRIORIDAD | lista | ALTA · MEDIA · BAJA |
| N–U | *procesos* | casilla | Ver abajo |
| V | OBSERVACIONES | texto | |
| W | STATUS | fórmula | `=COUNTIF(N:U, TRUE) / COUNTA(N:U)` |
| X | FECHA PROCESO | fecha | Programada o de fabricación, ver AUTOMATIZACIONES.md |
| Y | ESTADO DESPACHO | lista | En Almacén · Despachado · Separado · Anulada |
| Z | FECHA DESPACHO | fecha | |
| AA | NUMERO DE ENSAMBLE | texto | |

### Los ocho procesos (N a U)

`CORTE PERFIL` · `INYECCION` · `ACCESORIOS` · `CORTE MARCO` · `MARCO` ·
`CORTE RIEL` · `RIEL` · `EMBOCINAR`

Cada uno admite **tres** estados:

| Estado | Celda | Efecto en el avance |
|---|---|---|
| Hecho | `TRUE` | suma arriba y abajo |
| Pendiente | `FALSE` | suma solo abajo |
| No aplica | vacía, **sin casilla** | no cuenta |

El estado «no aplica» se decide al crear la ficha y queda bloqueado. Valores por
defecto:

- **Riel** (`CORTE RIEL`, `RIEL`): solo en corredizas — SE12, SM20 y 480.
- **Marco** (`CORTE MARCO`, `MARCO`): según el selector *Con marco / Sin marco*.

### Reglas de negocio derivadas

```
avance          = hechos / procesos que aplican
completa        = avance >= 100 %
anulada         = ESTADO DESPACHO = "Anulada"
en producción   = no completa, no anulada, y no Despachado ni En Almacén
en almacén      = completa y ESTADO DESPACHO = "En Almacén"
stock           = STOCK marcado, no despachada y no anulada
```

Una puerta **anulada** queda fuera de producción, almacén, stock y del conteo de
abiertas, y no se le reprograman fechas.

---

## `LOG APP` — historial (la crea la app)

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| FECHA | USUARIO | ACCION | OP | FILA | CAMPO | ANTES | DESPUES |

`ACCION` es `CREA`, `EDITA` o `AUTO`. El usuario es el correo de Google con el
que se entró, así que no se puede falsear. Los cambios automáticos se registran
como `auto (correo)`.

---

## `MODELOS` — catálogo de stock (la crea y siembra la app)

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| NOMBRE | TIPO | ESPESOR | APERTURA | ANCHO VANO | ALTO VANO | PRIORIDAD | ACTIVO |

Se edita a mano en la hoja; la app la lee al arrancar.

- **Una celda vacía deja de filtrar.** Sin ESPESOR, el modelo cuenta todos los espesores.
- `ACTIVO` en `FALSE` oculta el modelo sin borrarlo.
- La coincidencia es **exacta**: 101×200 no cuenta como 100×200. Lo que no encaja
  con ningún modelo aparece agrupado en la fila «Sin modelo definido».
