# Graph Report - .  (2026-08-25)

## Corpus Check
- Corpus is ~29,828 words - fits in a single context window. You may not need a graph.

## Summary
- 215 nodes · 322 edges · 23 communities (19 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Constantes del modelo
- Utilidades y fechas
- Control de OPs
- usuarios.js
- Tableros y catalogo
- Ayudantes de tableros
- auth.php
- Cliente de Google Sheets
- Vista de planta
- Configuracion del usuario
- Historial de cambios
- Autenticacion con Google
- Automatizaciones de fecha
- avisos.js
- Carga y refresco
- Instalacion como app
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `ROWS` - 10 edges
2. `render()` - 10 edges
3. `api()` - 6 edges
4. `paintRow()` - 6 edges
5. `refresh()` - 6 edges
6. `pintarTarjeta()` - 6 edges
7. `renderPlanta()` - 6 edges
8. `writeCells()` - 5 edges
9. `loadCfg()` - 5 edges
10. `filtered()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `refresh()` --indirect_call--> `fillLists()`  [INFERRED]
  src/js/datos.js → src/js/control.js
- `refresh()` --indirect_call--> `render()`  [INFERRED]
  src/js/datos.js → src/js/control.js
- `tocarFechaProceso()` --references--> `ROWS`  [EXTRACTED]
  src/js/automatizaciones.js → src/js/constantes.js

## Import Cycles
- None detected.

## Communities (23 total, 4 thin omitted)

### Community 0 - "Constantes del modelo"
Cohesion: 0.09
Nodes (19): tocarFechaProceso(), C, CFG, CON_RIEL, DESPACHOS, ESPESORES, LOG_HEAD, MATERIALES (+11 more)

### Community 1 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 2 - "Control de OPs"
Cohesion: 0.18
Nodes (18): APERTURAS, PROCS, SEL, editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL (+10 more)

### Community 3 - "usuarios.js"
Cohesion: 0.18
Nodes (12): goto(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios(), pintarUsuarios(), puede() (+4 more)

### Community 4 - "Tableros y catalogo"
Cohesion: 0.24
Nodes (11): almacenBase(), almacenList(), esModelo(), MOD_HEAD, MOD_SEED, MODELOS, renderAlmacen(), renderModelos() (+3 more)

### Community 5 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 6 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 7 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (10): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+2 more)

### Community 8 - "Vista de planta"
Cohesion: 0.31
Nodes (9): avisarProgramadas(), COLOR_PROC, etiquetaPrio(), metaTarjeta(), pintarTarjeta(), plantaList(), plantaProgramadas, PRIO_ORD (+1 more)

### Community 9 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 10 - "Historial de cambios"
Cohesion: 0.42
Nodes (8): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), renderHist(), shortUser()

### Community 11 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 12 - "Automatizaciones de fecha"
Cohesion: 0.43
Nodes (6): autoFechas(), CAMPOS_PROCESO, fechaProgramada(), hoy0(), OFFSET, repairFechasFalsas()

### Community 13 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 14 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 15 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

## Knowledge Gaps
- **24 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `OFFSET`, `LOG_HEAD` (+19 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Constantes del modelo` to `Vista de planta`, `Control de OPs`, `Automatizaciones de fecha`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `guardarDespacho()` connect `Constantes del modelo` to `Tableros y catalogo`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `refresh()` (e.g. with `fillLists()` and `render()`) actually correct?**
  _`refresh()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _24 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Constantes del modelo` be split into smaller, more focused modules?**
  _Cohesion score 0.08923076923076922 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._