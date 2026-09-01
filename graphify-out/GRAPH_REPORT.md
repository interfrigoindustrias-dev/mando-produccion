# Graph Report - .  (2026-09-01)

## Corpus Check
- 76 files · ~330,286 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 443 nodes · 696 edges · 39 communities (34 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- Automatizaciones de fecha
- Utilidades y fechas
- paneles-control.js
- Cliente de Google Sheets
- Constantes del modelo
- informes.js
- usuarios.js
- Control de OPs
- humo.js
- paneles-ficha.js
- Impresion
- Vista de planta
- Ayudantes de tableros
- campos.js
- cronograma.js
- auth.php
- calidad.js
- Historial de cambios
- Configuracion del usuario
- poliuretano.js
- secuencia.js
- paneles-resumen.js
- Autenticacion con Google
- avisos.js
- meta.js
- modelo.js
- comprobar_ids.py
- Carga y refresco
- formatos.js
- Instalacion como app
- paneles-almacen.js
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `ROWS` - 22 edges
2. `render()` - 11 edges
3. `render()` - 9 edges
4. `renderAlmacen()` - 9 edges
5. `pintarModeloModal()` - 9 edges
6. `renderResumen()` - 8 edges
7. `renderPlanta()` - 8 edges
8. `api()` - 7 edges
9. `renderCalidad()` - 7 edges
10. `renderStock()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `guardarCalidad()` --references--> `ROWS`  [EXTRACTED]
  src/js/calidad.js → src/js/constantes.js
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

## Communities (39 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.11
Nodes (28): DESPACHOS, abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas, celdaSeparar() (+20 more)

### Community 1 - "Automatizaciones de fecha"
Cohesion: 0.11
Nodes (20): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, ESCALA, fechaProgramada(), hoy0(), marcarInicioProduccion(), OFFSET (+12 more)

### Community 2 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 3 - "paneles-control.js"
Cohesion: 0.17
Nodes (19): SEL, btnCsv, csvPaneles(), editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL (+11 more)

### Community 4 - "Cliente de Google Sheets"
Cohesion: 0.20
Nodes (19): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+11 more)

### Community 5 - "Constantes del modelo"
Cohesion: 0.13
Nodes (14): CFG, CON_RIEL, LOG_HEAD, PRIORIDADES, separada(), separadaPara(), urgente(), urgenteAuto() (+6 more)

### Community 6 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 7 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 8 - "Control de OPs"
Cohesion: 0.23
Nodes (14): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+6 more)

### Community 9 - "humo.js"
Cohesion: 0.18
Nodes (14): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+6 more)

### Community 10 - "paneles-ficha.js"
Cohesion: 0.22
Nodes (13): anadirLinea(), CAMPOS_EDITABLES, celdaDe(), hintOp(), initForm(), lineaHTML(), llenarProductos(), nextOp() (+5 more)

### Community 11 - "Impresion"
Cohesion: 0.23
Nodes (12): cabeceraCarta(), cartaHTML(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta(), opcionesCarta(), piezaCarta() (+4 more)

### Community 12 - "Vista de planta"
Cohesion: 0.26
Nodes (12): avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+4 more)

### Community 13 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 14 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 15 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 16 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 17 - "calidad.js"
Cohesion: 0.36
Nodes (8): calidadBase(), calidadList(), esNoApta(), guardarCalidad(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 18 - "Historial de cambios"
Cohesion: 0.36
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 19 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 20 - "poliuretano.js"
Cohesion: 0.33
Nodes (7): consumoPor(), kgPoliuretano(), mesDe(), MESES_ES, nombreMes(), resumenPoliuretano(), semanaDe()

### Community 21 - "secuencia.js"
Cohesion: 0.33
Nodes (9): desdeCuandoEnSuNivel(), diasEnCola(), espesorDe(), espesorMmDe(), m2De(), marcar(), ORDEN_PRIO, prioridadQueTocaria() (+1 more)

### Community 22 - "paneles-resumen.js"
Cohesion: 0.42
Nodes (8): diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), percentil(), pintarEntrega(), renderPoliuretano(), renderResumen()

### Community 23 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 24 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 25 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 26 - "modelo.js"
Cohesion: 0.38
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 27 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 28 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 30 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 31 - "paneles-almacen.js"
Cohesion: 0.83
Nodes (3): enAlmacen(), porPedido(), renderAlmacen()

## Knowledge Gaps
- **57 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `recargarHist`, `OFFSET` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Automatizaciones de fecha` to `Tableros y catalogo`, `paneles-control.js`, `Cliente de Google Sheets`, `Constantes del modelo`, `Control de OPs`, `paneles-ficha.js`, `Vista de planta`, `calidad.js`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.11229946524064172 - nodes in this community are weakly interconnected._
- **Should `Automatizaciones de fecha` be split into smaller, more focused modules?**
  _Cohesion score 0.11333333333333333 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._