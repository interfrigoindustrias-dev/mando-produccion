# Graph Report - mando-produccion  (2026-09-01)

## Corpus Check
- 77 files · ~332,163 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 447 nodes · 649 edges · 44 communities (39 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- Utilidades y fechas
- paneles-control.js
- informes.js
- humo.js
- Control de OPs
- paneles-ficha.js
- Constantes del modelo
- Impresion
- Vista de planta
- Ayudantes de tableros
- Cliente de Google Sheets
- Automatizaciones de fecha
- campos.js
- cronograma.js
- usuarios.js
- auth.php
- calidad.js
- Historial de cambios
- Configuracion del usuario
- poliuretano.js
- secuencia.js
- paneles-auto.js
- paneles-planta.js
- paneles-resumen.js
- Autenticacion con Google
- avisos.js
- Ficha de la puerta
- meta.js
- modelo.js
- comprobar_ids.py
- Navegacion y arranque
- Carga y refresco
- formatos.js
- Instalacion como app
- paneles-almacen.js
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `render()` - 10 edges
2. `render()` - 8 edges
3. `renderAlmacen()` - 8 edges
4. `pintarModeloModal()` - 8 edges
5. `renderResumen()` - 8 edges
6. `renderPlanta()` - 8 edges
7. `api()` - 7 edges
8. `renderStock()` - 7 edges
9. `cartaHTML()` - 7 edges
10. `pintarInformes()` - 7 edges

## Surprising Connections (you probably didn't know these)
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

## Communities (44 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.09
Nodes (29): separada(), separadaPara(), abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas (+21 more)

### Community 1 - "Utilidades y fechas"
Cohesion: 0.12
Nodes (14): fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2(), progreso() (+6 more)

### Community 2 - "paneles-control.js"
Cohesion: 0.18
Nodes (18): btnCsv, csvPaneles(), editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kgDe() (+10 more)

### Community 3 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 4 - "humo.js"
Cohesion: 0.15
Nodes (15): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+7 more)

### Community 5 - "Control de OPs"
Cohesion: 0.23
Nodes (14): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+6 more)

### Community 6 - "paneles-ficha.js"
Cohesion: 0.22
Nodes (12): anadirLinea(), CAMPOS_EDITABLES, celdaDe(), hintOp(), initForm(), lineaHTML(), llenarProductos(), nextOp() (+4 more)

### Community 7 - "Constantes del modelo"
Cohesion: 0.15
Nodes (10): CFG, CON_RIEL, DESPACHOS, LOG_HEAD, PRIORIDADES, ROWS, SEL, urgente() (+2 more)

### Community 8 - "Impresion"
Cohesion: 0.21
Nodes (12): cabeceraCarta(), cartaHTML(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta(), opcionesCarta(), piezaCarta() (+4 more)

### Community 9 - "Vista de planta"
Cohesion: 0.26
Nodes (12): avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+4 more)

### Community 10 - "Ayudantes de tableros"
Cohesion: 0.21
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 11 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (11): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+3 more)

### Community 12 - "Automatizaciones de fecha"
Cohesion: 0.21
Nodes (7): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, ESCALA, fechaProgramada(), hoy0(), OFFSET

### Community 13 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 14 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 15 - "usuarios.js"
Cohesion: 0.27
Nodes (9): abrirUsuarios(), aplicarRol(), guardarUsuario(), pintarUsuarios(), puede(), ROLES, USU_HEAD, USUARIOS (+1 more)

### Community 16 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 17 - "calidad.js"
Cohesion: 0.35
Nodes (7): calidadBase(), calidadList(), esNoApta(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 18 - "Historial de cambios"
Cohesion: 0.31
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 19 - "Configuracion del usuario"
Cohesion: 0.31
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 20 - "poliuretano.js"
Cohesion: 0.31
Nodes (7): consumoPor(), kgPoliuretano(), mesDe(), MESES_ES, nombreMes(), resumenPoliuretano(), semanaDe()

### Community 21 - "secuencia.js"
Cohesion: 0.33
Nodes (9): desdeCuandoEnSuNivel(), diasEnCola(), espesorDe(), espesorMmDe(), m2De(), marcar(), ORDEN_PRIO, prioridadQueTocaria() (+1 more)

### Community 22 - "paneles-auto.js"
Cohesion: 0.42
Nodes (8): anuladaP(), autoPrioridades(), col(), despachadaP(), ESTADO, estadoDe(), ponerEstado(), tocarFechaProceso()

### Community 23 - "paneles-planta.js"
Cohesion: 0.33
Nodes (5): etiquetaPrio(), pintarResumenPlanta(), plantaPendientes(), renderPlanta(), textoEspera()

### Community 24 - "paneles-resumen.js"
Cohesion: 0.42
Nodes (8): diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), percentil(), pintarEntrega(), renderPoliuretano(), renderResumen()

### Community 25 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 26 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 27 - "Ficha de la puerta"
Cohesion: 0.38
Nodes (4): dStk, hintOp(), initForm(), targetRows()

### Community 28 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 29 - "modelo.js"
Cohesion: 0.38
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 30 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 31 - "Navegacion y arranque"
Cohesion: 0.40
Nodes (3): enterApp(), pintarQuienSoy(), VIEWS

### Community 32 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 34 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 35 - "paneles-almacen.js"
Cohesion: 0.83
Nodes (3): enAlmacen(), porPedido(), renderAlmacen()

## Knowledge Gaps
- **76 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `VIEWS`, `LOG` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `separada()` connect `Tableros y catalogo` to `Constantes del modelo`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `renderAlmacen()` connect `Tableros y catalogo` to `Ayudantes de tableros`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `enProduccion()` connect `Ayudantes de tableros` to `Tableros y catalogo`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._