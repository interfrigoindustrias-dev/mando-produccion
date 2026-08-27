# Graph Report - .  (2026-08-27)

## Corpus Check
- Corpus is ~43,670 words - fits in a single context window. You may not need a graph.

## Summary
- 329 nodes · 500 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.73)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- Constantes del modelo
- Utilidades y fechas
- Control de OPs
- informes.js
- usuarios.js
- Automatizaciones de fecha
- Impresion
- Vista de planta
- campos.js
- Ayudantes de tableros
- Configuracion del usuario
- cronograma.js
- auth.php
- Cliente de Google Sheets
- calidad.js
- Historial de cambios
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
1. `ROWS` - 14 edges
2. `render()` - 10 edges
3. `renderAlmacen()` - 8 edges
4. `renderPlanta()` - 8 edges
5. `renderCalidad()` - 7 edges
6. `refresh()` - 7 edges
7. `pintarInformes()` - 7 edges
8. `pintarTarjeta()` - 7 edges
9. `api()` - 6 edges
10. `kpis()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `marcarInicioProduccion()` --references--> `ROWS`  [EXTRACTED]
  src/js/automatizaciones.js → src/js/constantes.js
- `tocarFechaProceso()` --references--> `ROWS`  [EXTRACTED]
  src/js/automatizaciones.js → src/js/constantes.js
- `guardarCalidad()` --references--> `ROWS`  [EXTRACTED]
  src/js/calidad.js → src/js/constantes.js
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js

## Import Cycles
- None detected.

## Communities (29 total, 4 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.11
Nodes (27): DESPACHOS, abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas, esModelo() (+19 more)

### Community 1 - "Constantes del modelo"
Cohesion: 0.08
Nodes (19): APERTURAS, BUMPERS, C, CFG, CON_RIEL, EMPAQUE_VISOR, ESPESORES, LOG_HEAD (+11 more)

### Community 2 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 3 - "Control de OPs"
Cohesion: 0.19
Nodes (18): PROCS, ROWS, editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis() (+10 more)

### Community 4 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 5 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 6 - "Automatizaciones de fecha"
Cohesion: 0.18
Nodes (15): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, ESCALA, fechaProgramada(), hoy0(), marcarInicioProduccion(), OFFSET (+7 more)

### Community 7 - "Impresion"
Cohesion: 0.15
Nodes (12): FORMATO_DE_TIPO, FORMATOS, q(), cabeceraCarta(), cartaHTML(), materialesCarta(), piezaCarta(), printFichas() (+4 more)

### Community 8 - "Vista de planta"
Cohesion: 0.26
Nodes (12): avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+4 more)

### Community 9 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 10 - "Ayudantes de tableros"
Cohesion: 0.24
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 11 - "Configuracion del usuario"
Cohesion: 0.26
Nodes (8): kpiCards(), aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), looksLikeId(), parseSheetId(), saveCfg(), s()

### Community 12 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 13 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 14 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (10): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+2 more)

### Community 15 - "calidad.js"
Cohesion: 0.36
Nodes (8): calidadBase(), calidadList(), esNoApta(), guardarCalidad(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 16 - "Historial de cambios"
Cohesion: 0.42
Nodes (8): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), renderHist(), shortUser()

### Community 17 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 18 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 19 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 20 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 21 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

## Knowledge Gaps
- **52 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `OFFSET`, `ESCALA` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Control de OPs` to `Tableros y catalogo`, `Constantes del modelo`, `Automatizaciones de fecha`, `Impresion`, `Vista de planta`, `calidad.js`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.11491935483870967 - nodes in this community are weakly interconnected._
- **Should `Constantes del modelo` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Impresion` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._