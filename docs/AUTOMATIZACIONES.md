# Automatizaciones

Se pueden apagar todas desde **⚙ → Automatizaciones activas**. Cada cambio
automático queda en `LOG APP` con acción `AUTO`, el valor anterior y el nuevo.

> Corren en el navegador. Las que dependen del calendario se disparan cuando
> alguien abre la app ese día: si nadie entra el sábado, se aplican el lunes.

---

## 1 · 2 · 3 — Fecha de proceso según prioridad

La fecha de proceso funciona como **fecha objetivo** mientras la puerta está
abierta, y se convierte en **fecha de fabricación** cuando llega al 100 %.

| Prioridad | Días desde la creación |
|---|---|
| ALTA | 0 — hoy mismo |
| MEDIA | +3 |
| BAJA | +8 |

```
si la puerta está al 100 %  →  la fecha no se toca nunca más
si no tiene prioridad       →  la fecha no se toca nunca
en cualquier otro caso      →  fecha = máximo(creación + días, hoy)
```

Es decir: la fecha se programa hacia adelante, y una vez llega ese día **se va
corriendo al día actual** mientras la puerta siga sin terminar. Al completarse,
se congela en el día en que llegó al 100 %.

### Ejemplos

| Situación | Resultado |
|---|---|
| ALTA, creada hoy | hoy |
| ALTA, creada hace 10 días | hoy |
| MEDIA, creada hoy | hoy + 3 |
| MEDIA, creada hace 10 días | hoy |
| BAJA, creada hoy | hoy + 8 |
| BAJA, creada hace 3 días | hoy + 5 |
| Cualquiera al 100 % | congelada |
| MEDIA o BAJA sin fecha de creación | no se toca |
| Anulada | no se toca |

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

`congelarSiCompleta()` se llama justo después de guardar un cambio de procesos:
si la puerta acaba de llegar al 100 %, escribe la fecha de hoy; si se reabrió,
la reprograma.

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
