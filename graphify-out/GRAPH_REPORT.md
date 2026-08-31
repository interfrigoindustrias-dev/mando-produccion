# Graph Report - mando-produccion  (2026-08-31)

## Corpus Check
- Corpus is ~47,386 words - fits in a single context window. You may not need a graph.

## Summary
- 339 nodes · 484 edges · 34 communities (29 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- Utilidades y fechas
- Control de OPs
- informes.js
- Constantes del modelo
- Vista de planta
- Ayudantes de tableros
- Cliente de Google Sheets
- Automatizaciones de fecha
- campos.js
- cronograma.js
- usuarios.js
- auth.php
- calidad.js
- Impresion
- Configuracion del usuario
- Historial de cambios
- secuencia.js
- Autenticacion con Google
- avisos.js
- Ficha de la puerta
- formatos.js
- meta.js
- comprobar_ids.py
- Navegacion y arranque
- Instalacion como app
- modelo.js
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `render()` - 9 edges
2. `renderAlmacen()` - 8 edges
3. `pintarModeloModal()` - 8 edges
4. `renderPlanta()` - 8 edges
5. `api()` - 7 edges
6. `renderStock()` - 7 edges
7. `refresh()` - 7 edges
8. `pintarInformes()` - 7 edges
9. `renderCalidad()` - 6 edges
10. `ensureGid()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `refresh()` --indirect_call--> `autoFechas()`  [INFERRED]
  src/js/datos.js → src/js/automatizaciones.js
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `separada()`  [INFERRED]
  src/js/dashboards.js → src/js/constantes.js
- `renderModelos()` --indirect_call--> `separada()`  [INFERRED]
  src/js/dashboards.js → src/js/constantes.js

## Import Cycles
- None detected.

## Communities (34 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.09
Nodes (29): separada(), separadaPara(), abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas (+21 more)

### Community 1 - "Utilidades y fechas"
Cohesion: 0.12
Nodes (14): fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2(), progreso() (+6 more)

### Community 2 - "Control de OPs"
Cohesion: 0.17
Nodes (19): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+11 more)

### Community 3 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 4 - "Constantes del modelo"
Cohesion: 0.15
Nodes (10): CFG, CON_RIEL, DESPACHOS, LOG_HEAD, PRIORIDADES, ROWS, SEL, urgente() (+2 more)

### Community 5 - "Vista de planta"
Cohesion: 0.26
Nodes (12): avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+4 more)

### Community 6 - "Ayudantes de tableros"
Cohesion: 0.21
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 7 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (11): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+3 more)

### Community 8 - "Automatizaciones de fecha"
Cohesion: 0.21
Nodes (7): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, ESCALA, fechaProgramada(), hoy0(), OFFSET

### Community 9 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 10 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 11 - "usuarios.js"
Cohesion: 0.27
Nodes (9): abrirUsuarios(), aplicarRol(), guardarUsuario(), pintarUsuarios(), puede(), ROLES, USU_HEAD, USUARIOS (+1 more)

### Community 12 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 13 - "calidad.js"
Cohesion: 0.35
Nodes (7): calidadBase(), calidadList(), esNoApta(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 14 - "Impresion"
Cohesion: 0.25
Nodes (8): cabeceraCarta(), cartaHTML(), materialesCarta(), piezaCarta(), QC, rotuloOP(), stickerHTML(), stkBtn

### Community 15 - "Configuracion del usuario"
Cohesion: 0.31
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 16 - "Historial de cambios"
Cohesion: 0.36
Nodes (8): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), renderHist(), shortUser()

### Community 17 - "secuencia.js"
Cohesion: 0.36
Nodes (8): desdeCuandoEnSuNivel(), diasEnCola(), espesorDe(), m2De(), marcar(), ORDEN_PRIO, prioridadQueTocaria(), secuenciaPaneles()

### Community 18 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 19 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 20 - "Ficha de la puerta"
Cohesion: 0.38
Nodes (4): dStk, hintOp(), initForm(), targetRows()

### Community 22 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 23 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 24 - "Navegacion y arranque"
Cohesion: 0.40
Nodes (3): enterApp(), pintarQuienSoy(), VIEWS

### Community 25 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 26 - "modelo.js"
Cohesion: 0.50
Nodes (3): MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

## Knowledge Gaps
- **61 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `VIEWS`, `LOG` (+56 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `separada()` connect `Tableros y catalogo` to `Constantes del modelo`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `renderAlmacen()` connect `Tableros y catalogo` to `Ayudantes de tableros`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `enProduccion()` connect `Ayudantes de tableros` to `Tableros y catalogo`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _61 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._