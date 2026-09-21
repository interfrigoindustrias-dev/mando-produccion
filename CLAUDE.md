# CLAUDE.md

Contexto para Claude Code al trabajar en este repositorio.

## Qué es

**Control de Puertas — Interfrigo**: aplicación web para gestionar la
producción y el despacho de puertas industriales (y, como segundo módulo,
paneles). Corre íntegramente en el navegador del usuario: el JavaScript llama
directo a la API de Google Sheets con el token OAuth de la persona que entró.
**No hay servidor propio, ni backend, ni base de datos que mantener** (salvo
`auth.php`, que solo hace el canje OAuth — ver más abajo).

Producción: https://interfrigo.com.co/produccion/puertas.html

Cinco vistas: **Control de OPs** (administración), **Planta** (jefe de planta,
tablet), **Resumen** (gerencia), **Almacén** (despacho), **Stock** (comercial).
Dos módulos independientes hoy: **Puertas** (`puertas.html`) y **Paneles**
(`paneles.html`), que comparten código de presentación pero tienen cada uno su
propia pestaña de datos, historial y catálogo en el mismo documento de Google.

## Cómo se ejecuta

Sin compilación ni dependencias: son archivos estáticos, scripts clásicos que
comparten el ámbito global y se cargan en el orden declarado al final de
`index.html`. Ese orden importa.

```bash
python -m http.server 8080 --directory src
```

Abrir `http://localhost:8080`. Hay que añadir ese origen en *Orígenes
autorizados de JavaScript* de Google Cloud para que el login funcione.

> ⚠️ Abrir `index.html` con doble clic (`file://`) **no funciona**: Google
> rechaza el origen `null`.

Requiere configuración previa (hoja de Google compartida, cliente OAuth,
Client ID + ID de hoja) — detalle completo en `docs/DESPLIEGUE.md`.

### Publicar

```bash
./deploy.sh
```

Sube `src/` a `public_html/produccion/` en Hostinger por SSH. Antes de subir
corre `tools/comprobar_ids.py` (accesos al DOM sin proteger) y `tools/humo.js`
(prueba de humo con jsdom); si alguno falla, el despliegue se detiene.

### Antes de publicar (manual)

Correr la comprobación de humo del navegador descrita en `docs/PRUEBAS.md`:
un bloque que se pega en consola tras recargar la página y verifica 70+
puntos (funciones existen, las cinco vistas pintan, impresiones caben en su
hoja). No hay pruebas automatizadas de verdad porque la app depende del DOM y
de la API de Google — `tools/humo.js` es lo más cercano, corriendo con jsdom.

## Estructura

```
src/
├── index.html, puertas.html, paneles.html
├── css/            base → componentes → dashboards → planta → impresion (cascada, ese orden importa)
├── js/             15+ módulos, orden de carga fijado en cada *.html — ver docs/ARQUITECTURA.md
└── img/logo.png
docs/               documentación técnica (ver tabla en README.md)
tools/              comprobar_ids.py, grafo.py, humo.js
deploy.sh           publicación por SSH a Hostinger
```

Documentación de referencia, leer antes de tocar algo no trivial:

| Documento | Cuándo leerlo |
|---|---|
| `docs/ARQUITECTURA.md` | Antes de tocar el flujo de datos, `ROWS`, escritura optimista |
| `docs/MODELO-DATOS.md` | Antes de tocar columnas de la hoja o reglas de negocio |
| `docs/AUTOMATIZACIONES.md` | Antes de tocar reglas de fechas o disparadores |
| `docs/DECISIONES.md` | **Siempre, antes de tocar algo que huele a ya resuelto** — trampas ya encontradas |
| `docs/MODULOS.md` | Antes de tocar algo compartido entre Puertas y Paneles |
| `docs/PRUEBAS.md` | Antes de publicar |
| `docs/DESPLIEGUE.md` | Configuración de Google Cloud / Hostinger |

## Convenciones y reglas

Estas reglas existen porque cada una costó un fallo en producción
(`docs/DECISIONES.md` tiene el detalle completo de cada una — léelo antes de
"corregir" algo que parece raro, puede ser intencional):

- **Nunca enviar un valor numérico como cadena** a Sheets con `USER_ENTERED`:
  usar `numCell()`. Igual con fechas: se leen como número de serie
  (`SERIAL_NUMBER`) y se convierten con `toDate()` / `fmtDate()`.
- **El núcleo (`api.js`, `util.js`) no sabe dónde está nada.** Ninguna letra de
  columna escrita a mano fuera de `modelo.js`. Cada producto declara sus
  coordenadas (`statusCol`, `numericos`, `validaciones`, `encabezados`,
  `formulas`) y el código común las lee de ahí.
- **`writeCells` es exclusivo de las filas de fichas** (la pestaña del módulo
  activo). Para cualquier otra pestaña (`USUARIOS`, `LOG`, `MODELOS`) usar
  `api()` con el rango completo y entrecomillado.
- **No escribir `""` en una celda de fórmula** — la borra. Las columnas de
  fórmula se declaran en `modelo.js` (`formulas`) y se saltan o se
  reescriben según sean de matriz o por fila; ver decisión 31.
- **Un automatismo puede rellenar lo que se deduce sin ambigüedad de un hecho
  ya ocurrido, pero no puede cerrar un estado del que depende el trabajo de
  otra persona.** Marcar un proceso es una observación; dar una línea por
  terminada es una decisión de alguien.
- **La hoja de Google manda sobre las listas copiadas en el código.** Si una
  lista desplegable se puede leer de la validación de datos de la hoja al
  arrancar, se lee de ahí; lo escrito a mano en `modelo.js` es solo respaldo.
- **Todo acceso al DOM en un archivo que cargan ambas páginas (puertas y
  paneles) se comprueba antes de usarlo** (`const e = $("#id"); if(e) ...`).
  Un `TypeError` sin proteger corta la carga del archivo entero y deja media
  app sin enganchar, con síntomas que no se parecen a la causa.
- **Nombres de clase CSS específicos, no genéricos** (`.pcard.prio-ALTA`, no
  `.prio-ALTA`), sobre todo en CSS que cargan varios productos o vistas — un
  nombre genérico en una hoja es un nombre ocupado para todas.
- **Repintado en sitio (no reconstrucción completa) cubre TODOS los campos
  visibles**, no solo el que se está arreglando en el momento — si no, el
  resto queda congelado sin avisar.
- **Al añadir pestañas auxiliares o clases CSS nuevas para un módulo**,
  comprobar que no colisionan con las del otro módulo (ver `docs/MODULOS.md`).
- **`git add` de lo propio, nunca `-A`** en este repo — puede haber otra
  sesión trabajando en paralelo sobre otro módulo (decisión 30).
- **No cortar/reemplazar archivos por marcadores de texto** en refactors
  grandes — puede borrar código intermedio sin que ningún chequeo de sintaxis
  lo note. Verificar que las funciones principales siguen existiendo.
- Un automatismo que corre sin que nadie lo mire **se prueba primero, no al
  final**, y con fechas relativas a hoy (no fijas, o la prueba caduca sola).

## Archivos no versionados (`.gitignore`)

`app.config.js` (Client ID + IDs de hoja de la instalación) y
`auth.config.php` (secreto de cliente OAuth) — **nunca commitear estos**,
aunque se necesiten para correr la app en un entorno real. Usar los
`*.example.*` correspondientes como plantilla. `deploy.config.sh` (datos del
servidor SSH) tampoco se versiona.

## Estilo de commits

En español, en modo indicativo describiendo el efecto del cambio más que el
mecanismo (p. ej. `"El resumen cuenta por el boton Terminar, no por las
casillas"`, `"Reconstruir el grafo"`). `CHANGELOG.md` agrupa lo entregado y
corregido por versión — actualizarlo en cambios significativos.
