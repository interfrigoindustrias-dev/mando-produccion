# Graph Report - mando-produccion  (2026-08-24)

## Corpus Check
- Corpus is ~26,387 words - fits in a single context window. You may not need a graph.

## Summary
- 185 nodes · 249 edges · 22 communities (16 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Utilidades y fechas
- Control de OPs
- Tableros y catalogo
- Constantes del modelo
- Ayudantes de tableros
- Cliente de Google Sheets
- Vista de planta
- Configuracion del usuario
- Historial de cambios
- Autenticacion con Google
- Automatizaciones de fecha
- Carga y refresco
- Ficha de la puerta
- Impresion
- Instalacion como app
- Navegacion y arranque
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `render()` - 9 edges
2. `api()` - 6 edges
3. `refresh()` - 6 edges
4. `renderPlanta()` - 6 edges
5. `writeCells()` - 5 edges
6. `filtered()` - 5 edges
7. `kpis()` - 5 edges
8. `renderAlmacen()` - 5 edges
9. `ensureGid()` - 4 edges
10. `ensureLog()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `refresh()` --indirect_call--> `fillLists()`  [INFERRED]
  src/js/datos.js → src/js/control.js
- `refresh()` --indirect_call--> `render()`  [INFERRED]
  src/js/datos.js → src/js/control.js

## Import Cycles
- None detected.

## Communities (22 total, 6 thin omitted)

### Community 0 - "Utilidades y fechas"
Cohesion: 0.12
Nodes (14): fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2(), progreso() (+6 more)

### Community 1 - "Control de OPs"
Cohesion: 0.21
Nodes (15): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+7 more)

### Community 2 - "Tableros y catalogo"
Cohesion: 0.18
Nodes (12): almacenBase(), almacenList(), esModelo(), MOD_HEAD, MOD_SEED, MODELOS, renderAlmacen(), renderModelos() (+4 more)

### Community 3 - "Constantes del modelo"
Cohesion: 0.14
Nodes (12): APERTURAS, C, CFG, CON_RIEL, DESPACHOS, ESPESORES, LOG_HEAD, MATERIALES (+4 more)

### Community 4 - "Ayudantes de tableros"
Cohesion: 0.21
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 5 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (10): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+2 more)

### Community 6 - "Vista de planta"
Cohesion: 0.31
Nodes (9): avisarProgramadas(), COLOR_PROC, etiquetaPrio(), metaTarjeta(), pintarTarjeta(), plantaList(), plantaProgramadas, PRIO_ORD (+1 more)

### Community 7 - "Configuracion del usuario"
Cohesion: 0.31
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 8 - "Historial de cambios"
Cohesion: 0.36
Nodes (8): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), renderHist(), shortUser()

### Community 9 - "Autenticacion con Google"
Cohesion: 0.42
Nodes (7): authFail(), avisarReconectar(), ensureToken(), initTokenClient(), programarRenovacion(), requestToken(), setToken()

### Community 10 - "Automatizaciones de fecha"
Cohesion: 0.32
Nodes (5): autoFechas(), CAMPOS_PROCESO, fechaProgramada(), hoy0(), OFFSET

### Community 11 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 12 - "Ficha de la puerta"
Cohesion: 0.47
Nodes (3): hintOp(), initForm(), targetRows()

### Community 14 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

## Knowledge Gaps
- **35 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `VIEWS`, `LOG` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `renderAlmacen()` connect `Tableros y catalogo` to `Ayudantes de tableros`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `enProduccion()` connect `Ayudantes de tableros` to `Tableros y catalogo`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `refresh()` connect `Carga y refresco` to `Control de OPs`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `refresh()` (e.g. with `fillLists()` and `render()`) actually correct?**
  _`refresh()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._
- **Should `Constantes del modelo` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._