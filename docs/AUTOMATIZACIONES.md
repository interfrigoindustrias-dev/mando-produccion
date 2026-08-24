# Automatizaciones

Se pueden apagar todas desde **⚙ → Automatizaciones activas**. Cada cambio
automático queda en `LOG APP` con acción `AUTO`, el valor anterior y el nuevo.

> Corren en el navegador. Las que dependen del calendario se disparan cuando
> alguien abre la app ese día: si nadie entra el sábado, se aplican el lunes.

---

## 1 · 2 · 3 — Fecha de proceso

La fecha de proceso tiene **dos vidas**, y esa es la clave para entenderla.

### Mientras la puerta no se ha tocado: es una fecha PROGRAMADA

Dice **cuándo toca empezarla**. Se cuenta desde la fecha de creación:

| Prioridad | Días desde la creación |
|---|---|
| ALTA | 0 — hoy mismo |
| MEDIA | +3 |
| BAJA | +8 |

Si ese día todavía no ha llegado, **no pasa nada**: la fecha se queda quieta en
el futuro. Cuando llega, empieza a correrse al día actual.

### En cuanto se marca el primer proceso: es la fecha de TRABAJO

Se pone en el día de hoy y se va corriendo cada día mientras la puerta siga
abierta. Ya no importa la programación: la puerta está en el taller.

Cualquier cambio de proceso —marcar o desmarcar— la vuelve a poner en hoy.

### Al 100%: se congela

Queda como la **fecha real de fabricación**. Nada la vuelve a tocar, salvo que
alguien desmarque un proceso y la puerta vuelva a abrirse.

### Ejemplos verificados

| Situación | Resultado |
|---|---|
| BAJA creada hoy, sin empezar | hoy + 8 días |
| Se marca un proceso de esa misma puerta | pasa a hoy |
| Pasa el recálculo diario | **no** la devuelve al futuro |
| Pasa un día sin tocarla | avanza a hoy |
| Llega al 100% | congelada, 0 escrituras |
| Se desmarca un proceso | vuelve a hoy |
| Sin prioridad y sin empezar | no se toca |
| Anulada | no se toca |

### Efecto en la vista de Planta

Planta muestra solo lo que ya toca: si la fecha de proceso es futura, la puerta
todavía no aparece. Esto se combina con las reglas de arriba de una forma que
conviene tener presente:

> Una puerta **MEDIA** creada hoy se programa a **+3 días**, así que **no sale en
> Planta hasta dentro de tres días**. Una **BAJA**, hasta dentro de ocho.

No es un fallo, es la programación funcionando. Pero ocultarlas en silencio hacía
pensar que faltaban puertas, así que Planta ahora **las anuncia**:

> **4 puertas programadas para más adelante** — 4 MEDIA.
> La más próxima entra el 27/08/2026. ☐ Mostrarlas

La casilla las trae a la lista sin cambiar nada en la hoja.

## 4 — Fecha de despacho

Al poner `ESTADO DESPACHO = Despachado`, si `FECHA DESPACHO` está vacía se
rellena con la fecha de hoy. **Si ya tenía una, se respeta.**

Aplica tanto desde la ficha como desde los selectores de Almacén y Planta.

---

## Cuándo se ejecutan

`autoFechas()` es idempotente: solo escribe las celdas cuyo valor difiere, así
que puede correr muchas veces sin efectos secundarios. Se invoca en seis momentos:

1. Al arrancar la aplicación
2. Tras cada refresco de datos — cubre el cambio de día
3. Al cambiar la prioridad en la tabla
4. Al guardar la ficha
5. Al marcar o desmarcar procesos
6. Al crear fichas nuevas

`tocarFechaProceso()` se llama justo después de guardar un cambio de procesos y
pone la fecha en el día de hoy. Si con ese cambio la puerta llegó al 100 %, ésa
es la fecha que queda congelada.

> Una versión anterior tenía un candado en `localStorage` que la limitaba a una
> ejecución diaria. Era la causa de que poner una prioridad no hiciera nada hasta
> el día siguiente. **No reintroducir ese candado.**

---

## Reparaciones automáticas

Corren al arrancar y son idempotentes:

| Función | Qué arregla |
|---|---|
| `repairStatus()` | Celdas de STATUS en `#ERROR!` — escribe el número calculado |
| `repairNumeros()` | Números que Sheets convirtió en fecha (`46143 → 1.5`) |
| `ensureRows()` | Amplía la hoja hasta un mínimo de 1000 filas |

Detalle del porqué en [DECISIONES.md](DECISIONES.md).
