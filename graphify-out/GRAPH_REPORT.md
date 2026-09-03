# Graph Report - .  (2026-09-03)

## Corpus Check
- 79 files · ~338,471 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 500 nodes · 796 edges · 43 communities (38 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- paneles-control.js
- Utilidades y fechas
- Automatizaciones de fecha
- Cliente de Google Sheets
- Constantes del modelo
- informes.js
- humo.js
- usuarios.js
- paneles-ficha.js
- paneles-filtros.js
- Control de OPs
- Impresion
- Vista de planta
- Ayudantes de tableros
- paneles-resumen.js
- secuencia.js
- campos.js
- cronograma.js
- auth.php
- Historial de cambios
- calidad.js
- Configuracion del usuario
- poliuretano.js
- Autenticacion con Google
- paneles-listas.js
- paneles-planta.js
- avisos.js
- meta.js
- modelo.js
- comprobar_ids.py
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
1. `ROWS` - 22 edges
2. `render()` - 12 edges
3. `renderResumen()` - 10 edges
4. `render()` - 9 edges
5. `renderAlmacen()` - 9 edges
6. `pintarModeloModal()` - 9 edges
7. `FILTROS` - 8 edges
8. `renderPlanta()` - 8 edges
9. `api()` - 7 edges
10. `renderCalidad()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `pintarTarjeta()` --references--> `ROWS`  [EXTRACTED]
  src/js/paneles-planta.js → src/js/constantes.js
- `setCheckboxUI()` --indirect_call--> `col()`  [INFERRED]
  src/js/api.js → src/js/paneles-auto.js
- `sincronizarValidacion()` --indirect_call--> `col()`  [INFERRED]
  src/js/api.js → src/js/paneles-auto.js

## Import Cycles
- None detected.

## Communities (43 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.09
Nodes (34): DESPACHOS, separada(), separadaPara(), abrirModelo(), almacenBase(), almacenList(), bCarta, bStk (+26 more)

### Community 1 - "paneles-control.js"
Cohesion: 0.16
Nodes (21): SEL, aplicarFiltros(), btnCsv, csvPaneles(), editCampo(), fillLists(), filtered(), filtrosActivos() (+13 more)

### Community 2 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 3 - "Automatizaciones de fecha"
Cohesion: 0.13
Nodes (19): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, COLUMNAS_NUEVAS, diasSinTocar(), ESCALA, ESPERA, fechaProgramada() (+11 more)

### Community 4 - "Cliente de Google Sheets"
Cohesion: 0.20
Nodes (19): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+11 more)

### Community 5 - "Constantes del modelo"
Cohesion: 0.13
Nodes (12): CFG, CON_RIEL, LOG_HEAD, PRIORIDADES, urgente(), urgenteAuto(), urgenteManual(), dStk (+4 more)

### Community 6 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 7 - "humo.js"
Cohesion: 0.16
Nodes (15): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+7 more)

### Community 8 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 9 - "paneles-ficha.js"
Cohesion: 0.19
Nodes (14): anadirLinea(), CAMPOS_EDITABLES, camposEditables(), celdaDe(), hintOp(), initForm(), lineaHTML(), llenarProductos() (+6 more)

### Community 10 - "paneles-filtros.js"
Cohesion: 0.23
Nodes (16): avisarCambio(), DEF_FILTROS, definirFiltro(), filtroPasa(), filtroPasaAlguno(), FILTROS, filtroSel(), filtrosPuestos() (+8 more)

### Community 11 - "Control de OPs"
Cohesion: 0.23
Nodes (14): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+6 more)

### Community 12 - "Impresion"
Cohesion: 0.21
Nodes (14): cabeceraCarta(), cartaHTML(), familiasDe(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta(), opcionesCarta() (+6 more)

### Community 13 - "Vista de planta"
Cohesion: 0.25
Nodes (13): altaOlvidada(), avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta() (+5 more)

### Community 14 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 15 - "paneles-resumen.js"
Cohesion: 0.29
Nodes (12): consumoLamina(), diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), metrosLamina(), percentil(), pintarEntrega() (+4 more)

### Community 16 - "secuencia.js"
Cohesion: 0.29
Nodes (12): altaAdelantada(), diasEnCola(), diasSinTocar(), espesorDe(), espesorMmDe(), m2De(), marcar(), nivelDe() (+4 more)

### Community 17 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 18 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 19 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 20 - "Historial de cambios"
Cohesion: 0.36
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 21 - "calidad.js"
Cohesion: 0.42
Nodes (7): calidadBase(), calidadList(), esNoApta(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 22 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 23 - "poliuretano.js"
Cohesion: 0.33
Nodes (7): consumoPor(), kgPoliuretano(), mesDe(), MESES_ES, nombreMes(), resumenPoliuretano(), semanaDe()

### Community 24 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 25 - "paneles-listas.js"
Cohesion: 0.32
Nodes (4): ENCABEZADOS, ESTADO_COLUMNAS, normaliza(), resolverColumnasPropias()

### Community 26 - "paneles-planta.js"
Cohesion: 0.39
Nodes (6): etiquetaPrio(), pintarResumenPlanta(), pintarTarjeta(), plantaPendientes(), renderPlanta(), textoEspera()

### Community 27 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 28 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 29 - "modelo.js"
Cohesion: 0.38
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 30 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 31 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 33 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 34 - "filtros-movil.js"
Cohesion: 0.70
Nodes (4): filtroPuesto(), pintarContador(), plegarBarra(), plegarFiltros()

### Community 35 - "paneles-almacen.js"
Cohesion: 0.60
Nodes (4): aComp, enAlmacen(), porPedido(), renderAlmacen()

## Knowledge Gaps
- **62 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `recargarHist`, `OFFSET` (+57 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Automatizaciones de fecha` to `Tableros y catalogo`, `paneles-control.js`, `Cliente de Google Sheets`, `Constantes del modelo`, `paneles-ficha.js`, `Control de OPs`, `Vista de planta`, `paneles-planta.js`?**
  _High betweenness centrality (0.226) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _62 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.09358974358974359 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Automatizaciones de fecha` be split into smaller, more focused modules?**
  _Cohesion score 0.12554112554112554 - nodes in this community are weakly interconnected._