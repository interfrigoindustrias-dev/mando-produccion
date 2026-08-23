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
