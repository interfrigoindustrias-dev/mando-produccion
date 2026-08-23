# Graph Report - mando-produccion  (2026-08-23)

## Corpus Check
- Corpus is ~17,595 words - fits in a single context window. You may not need a graph.

## Summary
- 160 nodes · 214 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Utilidades y fechas
- Control de OPs
- Tableros y catálogo de modelos
- Constantes del modelo de datos
- Ayudantes de tableros
- Cliente de Google Sheets
- Historial de cambios
- Autenticación con Google
- Configuración del usuario
- Carga y refresco de datos
- Ficha de la puerta
- Impresión: etiqueta y carta
- Automatizaciones de fecha
- Vista de planta
- Navegación y arranque
- Instalación como app
- Script de despliegue
- Plantilla de configuración
- Service worker

## God Nodes (most connected - your core abstractions)
1. `render()` - 8 edges
2. `api()` - 6 edges
3. `writeCells()` - 5 edges
4. `enProduccion()` - 5 edges
5. `filtered()` - 5 edges
6. `kpis()` - 5 edges
7. `renderAlmacen()` - 5 edges
8. `ensureGid()` - 4 edges
9. `ensureLog()` - 4 edges
10. `initTokenClient()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderResumen()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderResumen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderResumen()` --indirect_call--> `enStock()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js

## Import Cycles
- None detected.

## Communities (19 total, 6 thin omitted)

### Community 0 - "Utilidades y fechas"
Cohesion: 0.12
Nodes (14): fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2(), progreso() (+6 more)

### Community 1 - "Control de OPs"
Cohesion: 0.21
Nodes (15): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+7 more)

### Community 2 - "Tableros y catálogo de modelos"
Cohesion: 0.20
Nodes (12): almacenBase(), almacenList(), esModelo(), MOD_HEAD, MOD_SEED, MODELOS, renderAlmacen(), renderModelos() (+4 more)

### Community 3 - "Constantes del modelo de datos"
Cohesion: 0.14
Nodes (12): APERTURAS, C, CFG, CON_RIEL, DESPACHOS, ESPESORES, LOG_HEAD, MATERIALES (+4 more)

### Community 4 - "Ayudantes de tableros"
Cohesion: 0.24
Nodes (5): completa(), desp(), enProduccion(), enStock(), renderResumen()

### Community 5 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (10): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+2 more)

### Community 6 - "Historial de cambios"
Cohesion: 0.36
Nodes (8): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), renderHist(), shortUser()

### Community 7 - "Autenticación con Google"
Cohesion: 0.48
Nodes (5): authFail(), ensureToken(), initTokenClient(), requestToken(), setToken()

### Community 8 - "Configuración del usuario"
Cohesion: 0.38
Nodes (3): loadCfg(), parseSheetId(), saveCfg()

### Community 9 - "Carga y refresco de datos"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 10 - "Ficha de la puerta"
Cohesion: 0.47
Nodes (3): hintOp(), initForm(), targetRows()

### Community 12 - "Automatizaciones de fecha"
Cohesion: 0.60
Nodes (4): autoFechas(), congelarSiCompleta(), fechaProgramada(), OFFSET

### Community 13 - "Vista de planta"
Cohesion: 0.50
Nodes (4): COLOR_PROC, plantaList(), PRIO_ORD, renderPlanta()

## Knowledge Gaps
- **30 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `VIEWS`, `LOG` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `enProduccion()` connect `Ayudantes de tableros` to `Tableros y catálogo de modelos`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Ayudantes de tableros` to `Tableros y catálogo de modelos`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `completa()` connect `Ayudantes de tableros` to `Tableros y catálogo de modelos`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `enProduccion()` (e.g. with `renderAlmacen()` and `renderResumen()`) actually correct?**
  _`enProduccion()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._
- **Should `Constantes del modelo de datos` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._