# Grafo de conocimiento (graphify)

El repositorio incluye un grafo consultable del código en `graphify-out/`.
Sirve para responder preguntas sobre la estructura **sin abrir los archivos**,
que es donde se va la mayor parte del contexto en una sesión con un asistente.

## Qué hay

| Archivo | Para qué |
|---|---|
| `graphify-out/graph.html` | Grafo interactivo — se abre en el navegador |
| `graphify-out/GRAPH_REPORT.md` | Resumen en texto: nodos centrales y conexiones |
| `graphify-out/graph.json` | El grafo completo, consultable desde la CLI |

## Estado actual

163 nodos y 216 aristas repartidos en 20 comunidades, extraídos por AST local.
**Coste: 0 tokens** — no interviene ningún modelo de lenguaje.

Las comunidades coinciden una a una con los módulos de `src/js/`, lo que
confirma que la separación del monolito quedó bien delimitada. Los nodos más
conectados son `render()`, `api()` y `writeCells()`: el pintado de la tabla, el
cliente de Sheets y la escritura de celdas.

## Consultar

```bash
graphify explain "autoFechas()"              # qué es y con qué se conecta
graphify path "renderPlanta()" "api()"       # camino entre dos conceptos
graphify query "cómo se guarda una edición"  # respuesta en lenguaje natural
```

Ejemplo real:

```
Node: autoFechas()
  Source:    src/js/automatizaciones.js L35
  Community: Automatizaciones de fecha
  --> fechaProgramada()   [calls]
  <-- congelarSiCompleta() [calls]
```

## Reconstruir tras cambios

```bash
python tools/grafo.py
```

Extrae por AST, agrupa y **etiqueta las comunidades automáticamente** a partir
del archivo que aporta más nodos a cada grupo.

Lo de etiquetar solo no es un capricho: los identificadores de comunidad
**cambian en cada reconstrucción**. Con etiquetas fijas, al primer cambio de
código una función aparecía bajo el grupo equivocado — pasó con
`tocarFechaProceso()`, que salió clasificada en «Carga y refresco».

## Limitación actual

El grafo cubre **solo el código**. Los documentos de `docs/` no están dentro
porque la extracción semántica necesita un modelo de lenguaje.

Para incluirlos sin coste propio, basta una clave de Gemini:

```bash
export GEMINI_API_KEY=...
graphify .
```

Entonces el grafo conectaría, por ejemplo, la regla de fechas de
`AUTOMATIZACIONES.md` con la función `autoFechas()` que la implementa.

## Nota honesta

El propio informe lo advierte: con ~17.600 palabras, este proyecto todavía cabe
en una sola ventana de contexto. El grafo empieza a rentar cuando el código
crece, o para ir directo a una función sin cargar el archivo entero.
