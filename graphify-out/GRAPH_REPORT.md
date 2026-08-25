# Graph Report - .  (2026-08-25)

## Corpus Check
- Corpus is ~38,656 words - fits in a single context window. You may not need a graph.

## Summary
- 291 nodes · 435 edges · 28 communities (24 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Constantes del modelo
- Control de OPs
- Utilidades y fechas
- Tableros y catalogo
- usuarios.js
- informes.js
- Automatizaciones de fecha
- Ayudantes de tableros
- cronograma.js
- Vista de planta
- auth.php
- Cliente de Google Sheets
- calidad.js
- Configuracion del usuario
- Historial de cambios
- Impresion
- Autenticacion con Google
- avisos.js
- meta.js
- comprobar_ids.py
- Instalacion como app
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `ROWS` - 12 edges
2. `render()` - 10 edges
3. `renderCalidad()` - 7 edges
4. `renderAlmacen()` - 7 edges
5. `refresh()` - 7 edges
6. `pintarTarjeta()` - 7 edges
7. `renderPlanta()` - 7 edges
8. `api()` - 6 edges
9. `paintRow()` - 6 edges
10. `writeCells()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `refresh()` --indirect_call--> `autoFechas()`  [INFERRED]
  src/js/datos.js → src/js/automatizaciones.js
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `printFichas()` --references--> `ROWS`  [EXTRACTED]
  src/js/impresion.js → src/js/constantes.js
- `render()` --references--> `SEL`  [EXTRACTED]
  src/js/control.js → src/js/constantes.js

## Import Cycles
- None detected.

## Communities (28 total, 4 thin omitted)

### Community 0 - "Constantes del modelo"
Cohesion: 0.09
Nodes (21): APERTURAS, BUMPERS, C, CFG, CON_RIEL, DESPACHOS, EMPAQUE_VISOR, ESPESORES (+13 more)

### Community 1 - "Control de OPs"
Cohesion: 0.15
Nodes (21): PROCS, editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe() (+13 more)

### Community 2 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 3 - "Tableros y catalogo"
Cohesion: 0.15
Nodes (18): almacenBase(), almacenList(), bCarta, bStk, bTodas, chipMod, esModelo(), MOD_HEAD (+10 more)

### Community 4 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 5 - "informes.js"
Cohesion: 0.19
Nodes (12): abrirInformes(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA, FRECUENCIAS, guardarInforme(), INF_HEAD (+4 more)

### Community 6 - "Automatizaciones de fecha"
Cohesion: 0.21
Nodes (13): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, ESCALA, fechaProgramada(), hoy0(), marcarInicioProduccion(), OFFSET (+5 more)

### Community 7 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 8 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 9 - "Vista de planta"
Cohesion: 0.30
Nodes (10): avisarProgramadas(), COLOR_PROC, etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarTarjeta(), plantaList(), plantaProgramadas (+2 more)

### Community 10 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 11 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (10): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+2 more)

### Community 12 - "calidad.js"
Cohesion: 0.42
Nodes (7): calidadBase(), calidadList(), esNoApta(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 13 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 14 - "Historial de cambios"
Cohesion: 0.42
Nodes (8): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), renderHist(), shortUser()

### Community 15 - "Impresion"
Cohesion: 0.25
Nodes (6): CAMPOS_MANO, printFichas(), QC, rotuloOP(), stickerHTML(), stkBtn

### Community 16 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 17 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 18 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 19 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 20 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

## Knowledge Gaps
- **47 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `OFFSET`, `ESCALA` (+42 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Automatizaciones de fecha` to `Constantes del modelo`, `Control de OPs`, `Vista de planta`, `Impresion`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `guardarDespacho()` connect `Automatizaciones de fecha` to `Tableros y catalogo`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `refresh()` (e.g. with `autoFechas()` and `fillLists()`) actually correct?**
  _`refresh()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _47 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Constantes del modelo` be split into smaller, more focused modules?**
  _Cohesion score 0.08547008547008547 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._