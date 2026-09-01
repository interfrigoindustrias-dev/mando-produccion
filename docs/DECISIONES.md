# Decisiones y trampas encontradas

Registro de por qué el código es como es. Casi todo lo que sigue costó un fallo
en producción; cambiarlo sin leer esto lo reintroduce.

---

## 1. El separador de fórmulas depende de la región de la hoja

**Síntoma:** la columna STATUS quedaba en `#ERROR!` al marcar un proceso.

Escribir `=COUNTIF(N5:U5, TRUE) / COUNTA(N5:U5)` con `USER_ENTERED` falla en una
hoja configurada en español: allí el separador de argumentos es `;`, no `,`.

**Solución:** `detectSep()` lee las fórmulas existentes de la columna W y deduce
el separador por mayoría. Si no lo consigue, escribe el número calculado, que
siempre es válido. `repairStatus()` sana las celdas que ya quedaron en error.

## 2. Los números deben viajar como números

**Síntoma:** al escribir `1.5` en PUNTOS se guardaba `46143`.

Con `USER_ENTERED`, Sheets interpreta el texto según la región. En es-CO el
separador decimal es la coma, así que `1.5` encaja con el patrón día**.**mes y se
guardó como *1 de mayo* — su número de serie es 46143.

**Solución:** `numCell()` convierte a número real antes de enviar. Los campos
afectados son ancho, alto, puntos y espesor. `repairNumeros()` deshace el daño:
la conversión es reversible (`46143 → 01/05/2026 → 1.5`).

**Regla general:** nunca enviar un valor numérico como cadena.

## 3. Las fechas se leen como número de serie

Las columnas de fecha tienen formatos distintos en la misma hoja (`d mmmm` en
FECHA DE CREACIÓN, `dd-mm-yyyy` en FECHA PROCESO). Leerlas como texto formateado
hacía imposible compararlas.

**Solución:** se piden con `dateTimeRenderOption=SERIAL_NUMBER` y se convierten
con `toDate()`. Para mostrar se usa `fmtDate()`, que respeta el texto libre
(«MAYO», «JUNIO») que hay en filas antiguas.

## 4. La hoja tiene un número fijo de filas

**Síntoma:** `Range ('OP PUERTA'!A498:AA498) exceeds grid limits. Max rows: 497`.

Al crear fichas la app reutiliza filas vacías; si no quedan, escribe al final. Pero
Google no amplía la cuadrícula sola.

**Solución:** `ensureRows()` consulta `gridProperties.rowCount` y amplía si hace
falta. Al arrancar garantiza un mínimo de `MIN_FILAS` (1000).

## 5. Una fila nueva no hereda el formato

Las filas remanentes originales traían casillas de verificación y la fórmula de
STATUS. Las filas creadas al ampliar la cuadrícula, no.

**Solución:** al dar de alta se aplica `setCheckboxUI()` explícitamente —casilla
en los procesos que aplican, ninguna en los que no— y se escribe la fórmula.

## 6. `color-mix(..., transparent)` no siempre es translúcido

**Síntoma:** las tarjetas de prioridad ALTA salían con un contorno negro grueso.

La causa real resultó ser otra: una regla **global** `.prio-ALTA{outline:2mm solid #000}`
sobrante de una versión antigua de la ficha imprimible. Las tarjetas de Planta
usaban esa misma clase y heredaban el contorno.

**Lecciones:** dar nombres específicos a las clases (`pcard.prio-ALTA`, no
`.prio-ALTA`), y borrar el código muerto en vez de dejarlo «por si acaso».

## 7. Medir contra la caja correcta

La etiqueta parecía caber en 100 mm midiendo contra el borde exterior, pero el
contenido vive en la caja interior (100 mm menos los márgenes). El pie quedaba
cortado al troquelar.

**Regla:** comparar `scrollHeight` contra `clientHeight`, no contra la altura
declarada.

## 8. Chrome no imprime fondos por defecto

El logo es un fondo negro con máscara, y los títulos de sección son texto blanco
sobre franja negra. Sin fondos, el logo desaparecía y los títulos salían en blanco
sobre blanco.

**Solución:** `print-color-adjust: exact` en el bloque `@media print`.

## 9. Dos definiciones de «stock» en el archivo original

La hoja `STATUS` cuenta 43 (solo en almacén o sin estado) y la hoja `STOCK`
cuenta 45 (todo lo no despachado). La app reproduce cada criterio en su pestaña
y lo explica al pasar el mouse. **No están unificadas a propósito.**

## 10. Coincidencia exacta en el catálogo de modelos

Una puerta de 101×200 no cuenta como modelo 100×200. Aflojar la coincidencia
contaría puertas equivocadas como si fueran del modelo.

**Solución:** una fila «Sin modelo definido» agrupa lo que no encaja, para que los
totales cuadren y se vea qué falta por definir en el catálogo.

## 11. Cortar archivos por marcadores de texto es peligroso

Una refactorización que reemplazaba el texto entre dos marcadores borró el módulo
de modelos completo, que estaba en medio. La comprobación de sintaxis no lo
detectó: no había error, solo código ausente.

**Solución:** la comprobación de humo de [PRUEBAS.md](PRUEBAS.md) verifica que
**existan** todas las funciones principales, no solo que el archivo compile.

## 12. Un filtro borrado del HTML puede tumbar toda una vista

`fillLists()` seguía llamando a `$("#a-mat")` después de que ese filtro se quitara
del HTML. `$()` devuelve `null`, `sel.value` lanza, y como `fillLists()` corre
**antes** de `render()` en cada refresco, Control de OPs quedaba en blanco.

**Soluciones:** `fill()` ignora los elementos que no existen, y cada paso del
pintado va en su propio `try` para que un fallo no arrastre a los demás y se vea
el error en pantalla en vez de una tabla vacía.

**Lección de método:** la comprobación de humo no lo detectó porque mis pasos de
prueba llamaban a `render()` a mano. Ahora lo primero que revisa es que la tabla
se llene sola tras recargar.

## 13. La fecha de proceso no puede reescribirse en puertas terminadas

Al ligar la fecha al trabajo («cualquier proceso tocado ⇒ fecha de hoy»), retocar
un proceso de una puerta ya terminada le ponía la fecha de hoy — y esa puerta
aparecía en «Fabricadas día», falseando la producción del día.

**Solución:** `tocarFechaProceso(r, estabaCompleta)` no toca la fecha si la puerta
ya estaba al 100% y sigue estándolo. `repairFechasFalsas()` deshace las que ya se
escribieron, usando el historial: si ese día no hubo ningún cambio de proceso en
esa puerta, no se trabajó en ella y se restaura el valor anterior.

**Consecuencia de diseño que conviene tener presente:** «Fabricadas día» mide
*cuándo la puerta llegó al 100% en la app*, no cuándo salió del taller. Si se
cargan datos con retraso, el día de la carga se infla. Por eso cada tarjeta del
Resumen es ahora **auditable**: se abre y muestra exactamente qué puertas cuenta,
con enlace a la ficha para corregir la fecha.

## 14. Cachear el código «primero la caché» retrasa los arreglos

El service worker servía el JavaScript desde su copia guardada y refrescaba por
detrás. Consecuencia: tras publicar un arreglo, los equipos seguían ejecutando el
código anterior. Un fallo ya corregido seguía dando la cara, y desde fuera parecía
que la corrección no funcionaba.

**Solución:** el armazón va **primero a la red**, con la caché solo como respaldo
cuando no hay conexión. Además `.htaccess` marca js y css como
`no-cache, must-revalidate`: son respuestas 304 vacías, casi gratis, y garantizan
que lo publicado llegue de inmediato. Las imágenes sí se retienen un día.

Y por si algo se atasca igualmente, **⚙ › Forzar actualización** borra el service
worker y todas las cachés y vuelve a descargar la aplicación.

**Lección:** en una herramienta de producción, ver el dato correcto pesa más que
ahorrar milisegundos de carga.

**Y aun así volvió a pasar dos veces más.** Red primero no basta: el service
worker antiguo sigue mandando hasta que se reemplaza, y el navegador tiene su
propia caché. Por eso `deploy.sh` sella ahora el mismo identificador en tres
sitios —`sw.js`, `js/modulo.js` y `version.json`— y la aplicación compara al
arrancar el sello que trae su JS con el de `version.json`, que se pide siempre
fresco. Si no coinciden, la copia guardada está caducada: se descarta y se
recarga, **una sola vez por sesión** para no entrar en bucle.

Diagnosticar esto cuesta caro: el código publicado es correcto, las
comprobaciones pasan, y aun así el usuario ve el fallo. Ante un «no funciona»
que no reproduces, comprueba primero **qué versión está ejecutando su navegador**.

## 15. La configuración no puede vivir solo en cada navegador

El Client ID y el ID de la hoja se guardaban únicamente en `localStorage`, que es
propio de cada dispositivo. Decisión razonable al principio —el mismo archivo
servía en cualquier dominio sin editarlo— y molesta después: cada celular que
entraba pedía configurarse.

**Solución en dos capas:** `config-app.js` viaja con la instalación y **manda
sobre lo guardado en cada navegador**; y **⚙ › Enlace para otros equipos** genera
un enlace que configura cualquier dispositivo con solo abrirlo.

La prioridad iba al revés en la primera versión, y era un error serio: un equipo
con datos antiguos seguía apuntando a la hoja anterior **sin que nadie lo notara**.
Cambiar de hoja a mano sigue siendo posible, pero queda marcado como `manual` —
una decisión explícita, no un resto olvidado— y el panel de configuración avisa
de que ese equipo se ha desviado, con un botón para volver a lo común.

El enlace lleva los datos en base64. No son secretos: sin la hoja compartida y
sin el origen autorizado en Google, no dan acceso a nada.

## 16. Módulos que comparten documento necesitan pestañas auxiliares propias

Puertas y Paneles viven en el mismo archivo de Google, en pestañas distintas. La
app crea dos pestañas de apoyo —historial y catálogo de modelos— y con nombres
fijos **ambos módulos habrían escrito en las mismas**: el historial de paneles
acabaría mezclado con el de puertas, y el catálogo de stock también.

**Solución:** cada módulo declara las suyas en `modulo.js` (`logTab`,
`modelosTab`). Puertas conserva `LOG APP` y `MODELOS`, que ya existían con datos;
Paneles usa `LOG PANELES` y `MODELOS PANELES`.

**Regla para el futuro:** al añadir un producto, comprobar que ningún nombre de
pestaña auxiliar se repita entre módulos que compartan documento.

## 17. Una anulación manual incompleta bloquea el equipo para siempre

Cuando el módulo Paneles todavía no tenía hoja asignada, su aviso pedía
introducirla a mano. Quien abrió ⚙ y pulsó Guardar dejó su configuración marcada
como `manual` —una decisión deliberada de apuntar a otro sitio— **con la hoja
vacía**. A partir de ahí la app ignoraba la configuración de la empresa para
siempre: seguía pidiendo datos aunque el servidor ya publicara la hoja correcta.

**Solución:** una anulación solo se respeta si de verdad apunta a algún sitio
(tiene Client ID y hoja). Si está incompleta se descarta, se limpia la marca y
manda la configuración de la empresa.

**Lección más general:** un ajuste que el usuario puede dejar a medias necesita
saber distinguir «lo he cambiado a propósito» de «lo he dejado sin terminar». Si
no, el estado intermedio se vuelve permanente y nadie sabe por qué.

Además, el aviso ya no es genérico: dice qué falta exactamente y de dónde debería
venir, con el botón concreto que lo resuelve.

## 16. Repintar en sitio: o se refresca todo, o no se refresca nada

En Planta hubo dos fallos encadenados, y el segundo lo introduje al arreglar el primero.

**Primero:** la lista se reconstruía entera después de cada marca, disparada por
el recálculo de fechas y por el refresco de fondo. El botón que el operario tenía
bajo el dedo quedaba desechado, y en esa posición podía acabar otra puerta con
otros procesos marcados. Parecía que «se activaban todos y se desactivaba el
elegido».

**Después:** al pasar a repintado quirúrgico solo actualicé los procesos y el
avance. Prioridad, fecha, puntaje, cliente y medidas se quedaban congelados
aunque cambiaran en la hoja, y la vista parecía no actualizarse nunca.

**Regla:** cuando se repinta en sitio en vez de reconstruir, hay que cubrir
**todos** los campos visibles. Es fácil arreglar el síntoma que se está mirando y
dejar el resto muerto.

Cómo quedó: cada dato de la tarjeta tiene un hueco marcado con `data-f`, y las
piezas compartidas (`metaTarjeta`, `etiquetaPrio`) las usan tanto el pintado
inicial como el refresco, para que no puedan desincronizarse. Los botones y el
selector de estado nunca se sustituyen; el selector tampoco se pisa si el
operario lo tiene abierto. Y si cambia **qué** procesos aplican, la fila de
botones sí se reconstruye, porque ya no representa a esa puerta.

## 17. Sin ventanas emergentes hace falta un archivo en el servidor

La biblioteca de Google (Identity Services) abre una ventana emergente porque es
lo único posible sin servidor. El flujo que permitía volver en la misma ventana
desde el navegador —`response_type=token`— **está retirado**: el permiso viajaba
a la vista en la URL, y OAuth 2.1 lo elimina.

El flujo que lo reemplaza, código de autorización con PKCE, exige un
**secreto de cliente** cuando el cliente es de tipo *Aplicación web*. Un secreto
no puede estar en el navegador.

**Solución:** `auth.php` hace el canje en el servidor. El usuario va a Google y
vuelve en la misma ventana; el secreto no sale de ahí. Y como se pide acceso
*offline*, el servidor guarda un permiso de renovación en la sesión: a partir de
entonces las renovaciones son **invisibles**, sin emergentes ni redirecciones.

Cada persona sigue entrando con su propia cuenta, así que el historial de quién
editó cada ficha **se conserva**. Esto no es la cuenta de servicio que se
descartó en su momento: allí sí se perdía la trazabilidad.

Requisitos que es fácil pasar por alto:

- El URI de redirección debe estar en **URIs de redirección autorizados**, un
  campo distinto de «Orígenes autorizados de JavaScript», y coincidir carácter
  por carácter — incluido el `?a=callback`.
- Los parámetros vacíos (`hd=`, `login_hint=`) pueden hacer que Google rechace
  la petición: solo se envían cuando tienen valor.
- `auth.config.php` va con permisos 600, bloqueado en `.htaccess` y fuera del
  repositorio, que es público.

## 18. `writeCells` escribe SIEMPRE en la pestaña del módulo

`writeCells` compone el rango con `rng()`, que antepone `'OP PUERTA'!` (o la
pestaña del módulo activo). Al construir la gestión de usuarios se usó para
guardar una celda de la lista: habría escrito el rol de alguien encima de una
celda de producción, silenciosamente y con datos reales.

**Regla:** para cualquier pestaña que no sea la del módulo —`USUARIOS`, `LOG`,
`MODELOS`— se llama a `api()` con el rango completo y entrecomillado. `writeCells`
es exclusivamente para las filas de fichas.

## 19. `let` en el ámbito global no es `window.algo`

`let LOG = []` crea una ligadura léxica global que **no** aparece como propiedad
de `window`. Una prueba que hacía `window.LOG = [...]` para simular historial no
tocaba el array real y daba «0 avisos»: un falso aprobado, que es peor que un
fallo. En las pruebas hay que asignar la variable a secas (`LOG.length = 0;
LOG.push(...)`), no a través de `window`.

## 20. El JS compartido no puede dar por hecho el HTML de una sola página

`puertas.html` y `paneles.html` cargan casi los mismos archivos JS, pero no
tienen los mismos controles. Un `$("#f-ens").addEventListener(...)` sobre algo
que solo existe en puertas lanza un `TypeError` que **corta la carga del archivo
entero** y deja sin enganchar todo lo que viene después.

Lo peor es que el síntoma no se parece a la causa: la tabla de paneles aparecía
vacía, los filtros no respondían y la ficha no abría — nada apuntaba a un botón
de puertas. Ocurrió cinco veces seguidas (filtro de ensamble, chip de modelo,
botones de impresión de almacén, campos de visor y bumper, y `filtrosActivos`).

**Regla:** en cualquier archivo que carguen las dos páginas, todo acceso al DOM
se comprueba antes:

```js
const e = $("#id"); if(e) e.onclick = ...     // o  if($("#id")){ ... }
```

Y un filtro que no existe **no filtra**, en vez de reventar:

```js
const g = id => { const e = $("#"+id); return e ? e.value : ""; };
```

`tools/comprobar_ids.py` lo verifica y `deploy.sh` lo ejecuta antes de publicar:
si encuentra un acceso sin proteger, el despliegue se detiene.

## 21. Las fechas del historial no siempre son texto

`repairFechasFalsas` hacía `e.fecha.slice(...)`. Si la celda de `LOG` contiene
una fecha de verdad, llega como objeto y `.slice` no existe: el arranque
reventaba. Ahora la fecha se fuerza a texto al leer el historial.

## 22. El núcleo compartido llevaba escritas las columnas de puertas

Esta es la peor de la lista, porque no daba ningún síntoma: funcionaba, y
escribía en el sitio equivocado.

`api.js` y `util.js` los cargan las dos páginas, pero tenían las letras de
columna de puertas puestas a mano:

```js
statusValue = (r,c) => `=COUNTIF(N${r}:U${r}; TRUE) / COUNTA(N${r}:U${r})`
writeCells([{a1:`W${r}`, ...}])                    // el avance
sincronizarValidacion() -> columnas 12, 24 y 38    // prioridad, despacho, sello
```

En la hoja de puertas eso es correcto. En la de paneles, **esas mismas letras
apuntan a otra cosa**: la columna 12 (M) no es la prioridad sino la casilla de
PERFIL, y ponerle un desplegable le quita la casilla; el avance vive en Q, no en
W; los procesos van de M a O, no de N a U. La página de paneles llevaba desde
que existe ejecutando las reparaciones de puertas contra la hoja de paneles.

**Regla:** el núcleo no sabe dónde está nada. Cada producto declara sus
coordenadas en `modelo.js` —`statusCol`, `numericos`, `validaciones`,
`encabezados`— y el código común las lee de ahí. Ninguna letra de columna
escrita a mano fuera de `modelo.js`.

Y lo mismo con las automatizaciones: las de puertas (`automatizaciones.js`,
`control.js`, `ficha.js`, `planta.js`, `dashboards.js`) **ya no las carga la
página de paneles**, que tiene las suyas. El núcleo llama a lo que exista:

```js
if(typeof autoPrioridades === "function") await autoPrioridades();
```

## 23. Una prueba que llama a `render()` a mano no prueba nada

Ya había pasado: la tabla de Control salía en blanco en producción y la prueba
pasaba, porque la prueba llamaba a `render()` ella misma y así nunca recorría el
camino que de verdad falla — el arranque.

`tools/humo.js` arranca las dos páginas enteras con jsdom y una hoja falsa, y
**no llama a nada**: espera a que la aplicación se pinte sola y solo entonces
mira. Comprueba, entre otras cosas, que paneles escribe en Q y no en W, que los
desplegables van a D y T y no a M, y que una ficha de dos líneas sale con la OP
sufijada sin pisar las fórmulas de K y L.

Dos detalles que costaron encontrar y que conviene no repetir:

- hay que ejecutar también los `<script>` **de dentro** de la página: paneles
  declara ahí `window.MODULO`, y saltárselo hacía que la prueba cargara el
  modelo de puertas creyendo que probaba paneles;
- si los scripts no cargan, la prueba tiene que **cortar**. Sin ese corte, las
  comprobaciones de las vistas salían «ok» sobre una página vacía.

`deploy.sh` la ejecuta antes de publicar y se detiene si está en rojo.

## 24. Un automatismo no puede tomar una decision de una persona

Al marcar el ultimo proceso de un panel, la aplicacion sellaba la fecha de fin,
ponia el estado en TERMINADO y la linea desaparecia de planta. Parecia comodo y
no lo era: entre marcar la limpieza y poder cargar el panel caben una revision,
un retoque o que alguien lo de por bueno, y mientras tanto aparecia en almacen
algo que seguia en la maquina.

La distincion que faltaba: **marcar un proceso es una observacion —esto se ha
hecho—; dar una linea por terminada es una decision**, y tiene consecuencias
para quien va a despacharla. Lo primero lo hace quien fabrica sobre la marcha;
lo segundo lo pulsa alguien.

La regla, entonces: un automatismo puede rellenar lo que se deduce sin ambiguedad
de un hecho ya ocurrido —la fecha de hoy cuando se empieza, los metros cuando
cambia el largo—. No puede cerrar un estado del que depende el trabajo de otra
persona.

Se nota tambien en la interfaz: la linea al 100 % no se atenua como una tarea
cumplida, se resalta. Es el unico sitio de la cola donde queda algo que decidir.

## 25. Reutilizar un nombre de clase entre productos

Al marcar el 100 % se añadio la clase `lista` a la tarjeta. Pero `.pcard.lista`
ya existia en `planta.css`, que es de puertas, con `opacity:.55` — de modo que
la tarjeta que mas tenia que destacar era la unica que se apagaba.

En paneles se llama `pc-lista`. Las hojas compartidas se cargan enteras aunque
la pagina sea de otro producto: un nombre de clase generico en una de ellas es
un nombre ocupado para todos.

## 26. `justify-self` sobrevive al cambio de disposicion

La tarjeta de planta usa `justify-self: start` y `end` cuando tiene dos columnas.
Al bajar a una sola, esas dos reglas seguian aplicandose y encogian cada bloque
a su contenido: los botones y la barra de avance ocupaban un tercio de la
tarjeta con el resto vacio — justo lo contrario de lo que se busca al apilar.

Un punto de corte que cambia `grid-template-columns` tiene que deshacer tambien
lo que coloco a los hijos dentro de la rejilla anterior.
