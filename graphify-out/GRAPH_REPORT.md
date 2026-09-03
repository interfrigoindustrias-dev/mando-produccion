# Graph Report - mando-produccion  (2026-09-03)

## Corpus Check
- 79 files · ~337,826 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 496 nodes · 726 edges · 46 communities (41 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- paneles-control.js
- Utilidades y fechas
- informes.js
- humo.js
- paneles-ficha.js
- paneles-filtros.js
- Automatizaciones de fecha
- Control de OPs
- Impresion
- Constantes del modelo
- Vista de planta
- Ayudantes de tableros
- paneles-resumen.js
- secuencia.js
- Cliente de Google Sheets
- campos.js
- cronograma.js
- usuarios.js
- auth.php
- calidad.js
- Historial de cambios
- Configuracion del usuario
- poliuretano.js
- paneles-auto.js
- Autenticacion con Google
- paneles-listas.js
- paneles-planta.js
- avisos.js
- Ficha de la puerta
- meta.js
- modelo.js
- comprobar_ids.py
- Navegacion y arranque
- Carga y refresco
- formatos.js
- Instalacion como app
- filtros-movil.js
- paneles-almacen.js
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `render()` - 11 edges
2. `renderResumen()` - 10 edges
3. `render()` - 8 edges
4. `renderAlmacen()` - 8 edges
5. `pintarModeloModal()` - 8 edges
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

## Communities (46 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.09
Nodes (29): separada(), separadaPara(), abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas (+21 more)

### Community 1 - "paneles-control.js"
Cohesion: 0.17
Nodes (20): aplicarFiltros(), btnCsv, csvPaneles(), editCampo(), fillLists(), filtered(), filtrosActivos(), kgDe() (+12 more)

### Community 2 - "Utilidades y fechas"
Cohesion: 0.12
Nodes (14): fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2(), progreso() (+6 more)

### Community 3 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 4 - "humo.js"
Cohesion: 0.14
Nodes (15): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+7 more)

### Community 5 - "paneles-ficha.js"
Cohesion: 0.19
Nodes (14): anadirLinea(), CAMPOS_EDITABLES, camposEditables(), celdaDe(), hintOp(), initForm(), lineaHTML(), llenarProductos() (+6 more)

### Community 6 - "paneles-filtros.js"
Cohesion: 0.16
Nodes (12): avisarCambio(), DEF_FILTROS, FILTROS, filtroSel(), filtrosPuestos(), filtroVacio(), GRUPOS, limpiarFiltros() (+4 more)

### Community 7 - "Automatizaciones de fecha"
Cohesion: 0.15
Nodes (11): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, COLUMNAS_NUEVAS, diasSinTocar(), ESCALA, ESPERA, fechaProgramada() (+3 more)

### Community 8 - "Control de OPs"
Cohesion: 0.23
Nodes (14): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+6 more)

### Community 9 - "Impresion"
Cohesion: 0.19
Nodes (14): cabeceraCarta(), cartaHTML(), familiasDe(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta(), opcionesCarta() (+6 more)

### Community 10 - "Constantes del modelo"
Cohesion: 0.14
Nodes (10): CFG, CON_RIEL, DESPACHOS, LOG_HEAD, PRIORIDADES, ROWS, SEL, urgente() (+2 more)

### Community 11 - "Vista de planta"
Cohesion: 0.25
Nodes (13): altaOlvidada(), avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta() (+5 more)

### Community 12 - "Ayudantes de tableros"
Cohesion: 0.21
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 13 - "paneles-resumen.js"
Cohesion: 0.29
Nodes (12): consumoLamina(), diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), metrosLamina(), percentil(), pintarEntrega() (+4 more)

### Community 14 - "secuencia.js"
Cohesion: 0.29
Nodes (12): altaAdelantada(), diasEnCola(), diasSinTocar(), espesorDe(), espesorMmDe(), m2De(), marcar(), nivelDe() (+4 more)

### Community 15 - "Cliente de Google Sheets"
Cohesion: 0.38
Nodes (11): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+3 more)

### Community 16 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 17 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 18 - "usuarios.js"
Cohesion: 0.27
Nodes (9): abrirUsuarios(), aplicarRol(), guardarUsuario(), pintarUsuarios(), puede(), ROLES, USU_HEAD, USUARIOS (+1 more)

### Community 19 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 20 - "calidad.js"
Cohesion: 0.35
Nodes (7): calidadBase(), calidadList(), esNoApta(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 21 - "Historial de cambios"
Cohesion: 0.31
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 22 - "Configuracion del usuario"
Cohesion: 0.31
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 23 - "poliuretano.js"
Cohesion: 0.31
Nodes (7): consumoPor(), kgPoliuretano(), mesDe(), MESES_ES, nombreMes(), resumenPoliuretano(), semanaDe()

### Community 24 - "paneles-auto.js"
Cohesion: 0.42
Nodes (8): anuladaP(), autoPrioridades(), col(), despachadaP(), ESTADO, estadoDe(), ponerEstado(), tocarFechaProceso()

### Community 25 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 26 - "paneles-listas.js"
Cohesion: 0.29
Nodes (4): ENCABEZADOS, ESTADO_COLUMNAS, normaliza(), resolverColumnasPropias()

### Community 27 - "paneles-planta.js"
Cohesion: 0.39
Nodes (5): etiquetaPrio(), pintarResumenPlanta(), plantaPendientes(), renderPlanta(), textoEspera()

### Community 28 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 29 - "Ficha de la puerta"
Cohesion: 0.38
Nodes (4): dStk, hintOp(), initForm(), targetRows()

### Community 30 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 31 - "modelo.js"
Cohesion: 0.38
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 32 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 33 - "Navegacion y arranque"
Cohesion: 0.40
Nodes (3): enterApp(), pintarQuienSoy(), VIEWS

### Community 34 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 36 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 37 - "filtros-movil.js"
Cohesion: 0.70
Nodes (4): filtroPuesto(), pintarContador(), plegarBarra(), plegarFiltros()

### Community 38 - "paneles-almacen.js"
Cohesion: 0.60
Nodes (4): aComp, enAlmacen(), porPedido(), renderAlmacen()

## Knowledge Gaps
- **84 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `VIEWS`, `LOG` (+79 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `separada()` connect `Tableros y catalogo` to `Constantes del modelo`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `renderAlmacen()` connect `Tableros y catalogo` to `Ayudantes de tableros`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `enProduccion()` connect `Ayudantes de tableros` to `Tableros y catalogo`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _84 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11594202898550725 - nodes in this community are weakly interconnected._