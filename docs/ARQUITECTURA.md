# Arquitectura

## Principio

Todo corre en el navegador del usuario. El JavaScript llama directo a la API de
Google Sheets con el token OAuth de la persona que entró. **No hay servidor
intermedio, ni claves secretas en el código.**

```
Navegador                          Google
┌──────────────────────┐          ┌─────────────────────────┐
│  index.html          │          │  Identity Services      │
│  + 5 CSS + 15 JS     │◄────────►│  (login, token 1 h)     │
│                      │          ├─────────────────────────┤
│  ROWS[] en memoria   │◄────────►│  Sheets API v4          │
│  ↓ optimista         │          │   OP PUERTA (datos)     │
│  polling cada 20 s   │          │   LOG APP  (historial)  │
└──────────────────────┘          │   MODELOS  (catálogo)   │
                                   └─────────────────────────┘
```

Consecuencia importante: **los permisos son los de cada usuario**. Si alguien no
tiene la hoja compartida, la app no puede darle acceso. Y las automatizaciones
solo se ejecutan cuando alguien tiene la app abierta.

## Carga

No hay empaquetador. Los archivos son *scripts clásicos* que comparten el ámbito
global y se cargan en el orden declarado al final de `index.html`. Ese orden
importa: un archivo puede usar algo definido en otro anterior.

| # | Archivo | Responsabilidad |
|---|---|---|
| 1 | `constantes.js` | Índices de columnas, listas de valores, estado en memoria |
| 2 | `util.js` | Atajos de DOM, fechas, tri-estado, cálculo de progreso, tema |
| 3 | `config.js` | Ajustes del usuario en `localStorage` y modal ⚙ |
| 4 | `auth.js` | Google Identity Services, token y renovación |
| 5 | `api.js` | Cliente REST de Sheets, escrituras y reparaciones de datos |
| 6 | `auditoria.js` | Historial en la pestaña `LOG APP` |
| 7 | `datos.js` | Carga inicial y refresco periódico |
| 8 | `automatizaciones.js` | Reglas de fechas según prioridad y avance |
| 9 | `control.js` | Vista Control de OPs |
| 10 | `ficha.js` | Modal de detalle y alta de fichas |
| 11 | `comun.js` | Ayudantes compartidos por planta y tableros |
| 12 | `planta.js` | Vista Planta |
| 13 | `dashboards.js` | Resumen, Almacén, Stock e inventario por modelo |
| 14 | `impresion.js` | Etiqueta, hoja carta y CSV |
| 15 | `app.js` | Navegación y arranque |

Los CSS se cargan en cascada: `base` → `componentes` → `dashboards` → `planta`
→ `impresion`. Ese orden reproduce el del archivo original; alterarlo puede
cambiar qué regla gana.

## Estado en memoria

`ROWS` es la única fuente de verdad en el cliente:

```js
ROWS = [ { r: 24, c: [ ...27 valores... ] }, ... ]
```

`r` es el número de fila real en la hoja, lo que permite escribir celdas sueltas
(`N24`) en vez de reenviar filas completas.

## Escritura optimista

Al marcar un proceso:

1. Se modifica `ROWS` y se repinta **solo esa fila** (`paintRow`).
2. Se envía la escritura.
3. Si falla, se revierte y se avisa.

Repintar la tabla entera hacía saltar el scroll y perdía clics rápidos.

### La carrera del refresco

El refresco periódico y las ediciones compiten. `writeSeq` es un contador que se
incrementa en cada escritura; `refresh()` guarda su valor antes de pedir datos y
descarta la respuesta si cambió mientras esperaba. Sin esto, una respuesta lenta
pisaba lo que el usuario acababa de marcar.

## Tri-estado de los procesos

Las ocho columnas de proceso (N:U) tienen **tres** estados, no dos:

| Estado | Celda | Cuenta en el avance |
|---|---|---|
| Hecho | `TRUE` | numerador y denominador |
| Pendiente | `FALSE` | solo denominador |
| No aplica | vacía | no cuenta |

Por eso una BATIENTE llega al 100 % con CORTE RIEL y RIEL vacíos. El estado
«no aplica» se fija al crear la ficha y no se puede cambiar después: la app
además le quita la casilla de verificación a esa celda en la hoja.

## Rendimiento

Con ~500 filas y 27 columnas se renderiza toda la tabla sin virtualización.
Cada refresco es una lectura completa del rango `A1:AA`; a este tamaño tarda
menos de un segundo. Si la hoja creciera a varios miles de filas habría que
paginar o leer por rangos.
