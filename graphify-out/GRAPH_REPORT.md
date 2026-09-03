# Graph Report - .  (2026-09-03)

## Corpus Check
- 80 files · ~340,114 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 509 nodes · 808 edges · 44 communities (39 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- paneles-control.js
- Utilidades y fechas
- Cliente de Google Sheets
- humo.js
- informes.js
- usuarios.js
- paneles-ficha.js
- paneles-filtros.js
- Automatizaciones de fecha
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
- Ficha de la puerta
- meta.js
- modelo.js
- panel-de-puerta.js
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
- `marcarInicioProduccion()` --references--> `ROWS`  [EXTRACTED]
  src/js/automatizaciones.js → src/js/constantes.js
- `tocarFechaProceso()` --references--> `ROWS`  [EXTRACTED]
  src/js/automatizaciones.js → src/js/constantes.js
- `renderStock()` --indirect_call--> `completa()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `renderAlmacen()` --indirect_call--> `enProduccion()`  [INFERRED]
  src/js/dashboards.js → src/js/comun.js
- `pintarTarjeta()` --references--> `ROWS`  [EXTRACTED]
  src/js/paneles-planta.js → src/js/constantes.js

## Import Cycles
- None detected.

## Communities (44 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.07
Nodes (39): CFG, DESPACHOS, LOG_HEAD, separada(), separadaPara(), urgente(), urgenteAuto(), urgenteManual() (+31 more)

### Community 1 - "paneles-control.js"
Cohesion: 0.12
Nodes (28): guardarCalidad(), PRIORIDADES, ROWS, SEL, confirmarSeparar(), guardarDespacho(), openDet(), printFichas() (+20 more)

### Community 2 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 3 - "Cliente de Google Sheets"
Cohesion: 0.19
Nodes (20): api(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus(), rng() (+12 more)

### Community 4 - "humo.js"
Cohesion: 0.15
Nodes (15): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+7 more)

### Community 5 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 6 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 7 - "paneles-ficha.js"
Cohesion: 0.19
Nodes (14): anadirLinea(), CAMPOS_EDITABLES, camposEditables(), celdaDe(), hintOp(), initForm(), lineaHTML(), llenarProductos() (+6 more)

### Community 8 - "paneles-filtros.js"
Cohesion: 0.23
Nodes (16): avisarCambio(), DEF_FILTROS, definirFiltro(), filtroPasa(), filtroPasaAlguno(), FILTROS, filtroSel(), filtrosPuestos() (+8 more)

### Community 9 - "Automatizaciones de fecha"
Cohesion: 0.16
Nodes (14): autoFechas(), autoPrioridades(), CAMPOS_PROCESO, COLUMNAS_NUEVAS, diasSinTocar(), ESCALA, ESPERA, fechaProgramada() (+6 more)

### Community 10 - "Control de OPs"
Cohesion: 0.23
Nodes (14): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+6 more)

### Community 11 - "Impresion"
Cohesion: 0.21
Nodes (14): cabeceraCarta(), cartaHTML(), familiasDe(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta(), opcionesCarta() (+6 more)

### Community 12 - "Vista de planta"
Cohesion: 0.25
Nodes (13): altaOlvidada(), avisarProgramadas(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta() (+5 more)

### Community 13 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 14 - "paneles-resumen.js"
Cohesion: 0.29
Nodes (12): consumoLamina(), diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), metrosLamina(), percentil(), pintarEntrega() (+4 more)

### Community 15 - "secuencia.js"
Cohesion: 0.29
Nodes (12): altaAdelantada(), diasEnCola(), diasSinTocar(), espesorDe(), espesorMmDe(), m2De(), marcar(), nivelDe() (+4 more)

### Community 16 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 17 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 18 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 19 - "Historial de cambios"
Cohesion: 0.36
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 20 - "calidad.js"
Cohesion: 0.42
Nodes (7): calidadBase(), calidadList(), esNoApta(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 21 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 22 - "poliuretano.js"
Cohesion: 0.33
Nodes (7): consumoPor(), kgPoliuretano(), mesDe(), MESES_ES, nombreMes(), resumenPoliuretano(), semanaDe()

### Community 23 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 24 - "paneles-listas.js"
Cohesion: 0.32
Nodes (4): ENCABEZADOS, ESTADO_COLUMNAS, normaliza(), resolverColumnasPropias()

### Community 25 - "paneles-planta.js"
Cohesion: 0.39
Nodes (6): etiquetaPrio(), pintarResumenPlanta(), pintarTarjeta(), plantaPendientes(), renderPlanta(), textoEspera()

### Community 26 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 27 - "Ficha de la puerta"
Cohesion: 0.38
Nodes (5): CON_RIEL, dStk, hintOp(), initForm(), targetRows()

### Community 28 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 29 - "modelo.js"
Cohesion: 0.38
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 30 - "panel-de-puerta.js"
Cohesion: 0.43
Nodes (4): crearPanelDeLaPuerta(), destinoPanel(), filaPanel(), primeraFilaLibrePanel()

### Community 31 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 32 - "Carga y refresco"
Cohesion: 0.60
Nodes (5): refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll()

### Community 34 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 35 - "filtros-movil.js"
Cohesion: 0.70
Nodes (4): filtroPuesto(), pintarContador(), plegarBarra(), plegarFiltros()

### Community 36 - "paneles-almacen.js"
Cohesion: 0.60
Nodes (4): aComp, enAlmacen(), porPedido(), renderAlmacen()

## Knowledge Gaps
- **62 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `recargarHist`, `OFFSET` (+57 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `paneles-control.js` to `Tableros y catalogo`, `Cliente de Google Sheets`, `paneles-ficha.js`, `Automatizaciones de fecha`, `Control de OPs`, `Vista de planta`, `paneles-planta.js`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _62 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.06980392156862746 - nodes in this community are weakly interconnected._
- **Should `paneles-control.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11693548387096774 - nodes in this community are weakly interconnected._
- **Should `Utilidades y fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._