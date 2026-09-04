# Graph Report - .  (2026-09-04)

## Corpus Check
- 80 files · ~343,564 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 514 nodes · 816 edges · 43 communities (38 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- Control de OPs
- paneles-control.js
- Utilidades y fechas
- Cliente de Google Sheets
- Constantes del modelo
- humo.js
- informes.js
- usuarios.js
- Impresion
- paneles-ficha.js
- paneles-filtros.js
- Ayudantes de tableros
- paneles-resumen.js
- Vista de planta
- secuencia.js
- calidad.js
- campos.js
- cronograma.js
- paneles-listas.js
- auth.php
- Historial de cambios
- Configuracion del usuario
- poliuretano.js
- Autenticacion con Google
- modelo.js
- paneles-planta.js
- avisos.js
- meta.js
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
7. `api()` - 8 edges
8. `FILTROS` - 8 edges
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

## Communities (43 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.09
Nodes (34): DESPACHOS, abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas, celdaSeparar() (+26 more)

### Community 1 - "Control de OPs"
Cohesion: 0.11
Nodes (26): autoPrioridades(), CAMPOS_PROCESO, COLUMNAS_NUEVAS, diasSinTocar(), ESCALA, ESPERA, hoy0(), marcarInicioProduccion() (+18 more)

### Community 2 - "paneles-control.js"
Cohesion: 0.14
Nodes (23): PRIORIDADES, SEL, openDet(), aplicarFiltros(), btnCsv, csvPaneles(), editCampo(), fillLists() (+15 more)

### Community 3 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 4 - "Cliente de Google Sheets"
Cohesion: 0.19
Nodes (21): api(), ensureCols(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus() (+13 more)

### Community 5 - "Constantes del modelo"
Cohesion: 0.12
Nodes (12): CFG, CON_RIEL, LOG_HEAD, separada(), separadaPara(), urgente(), urgenteAuto(), urgenteManual() (+4 more)

### Community 6 - "humo.js"
Cohesion: 0.14
Nodes (15): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+7 more)

### Community 7 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 8 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 9 - "Impresion"
Cohesion: 0.18
Nodes (16): cabeceraCarta(), cartaHTML(), esperarImagenes(), familiasDe(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta() (+8 more)

### Community 10 - "paneles-ficha.js"
Cohesion: 0.19
Nodes (14): anadirLinea(), CAMPOS_EDITABLES, camposEditables(), celdaDe(), hintOp(), initForm(), lineaHTML(), llenarProductos() (+6 more)

### Community 11 - "paneles-filtros.js"
Cohesion: 0.23
Nodes (16): avisarCambio(), DEF_FILTROS, definirFiltro(), filtroPasa(), filtroPasaAlguno(), FILTROS, filtroSel(), filtrosPuestos() (+8 more)

### Community 12 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 13 - "paneles-resumen.js"
Cohesion: 0.29
Nodes (12): consumoLamina(), diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), metrosLamina(), percentil(), pintarEntrega() (+4 more)

### Community 14 - "Vista de planta"
Cohesion: 0.29
Nodes (11): altaOlvidada(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+3 more)

### Community 15 - "secuencia.js"
Cohesion: 0.29
Nodes (12): altaAdelantada(), diasEnCola(), diasSinTocar(), espesorDe(), espesorMmDe(), m2De(), marcar(), nivelDe() (+4 more)

### Community 16 - "calidad.js"
Cohesion: 0.33
Nodes (9): calidadBase(), calidadList(), esNoApta(), guardarCalidad(), motivoDevolucion(), notaLimpia(), pintarSelCalidad(), renderCalidad() (+1 more)

### Community 17 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 18 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 19 - "paneles-listas.js"
Cohesion: 0.21
Nodes (6): detectarColumnasCalculadas(), detectarFormulaM2(), ENCABEZADOS, ESTADO_COLUMNAS, normaliza(), resolverColumnasPropias()

### Community 20 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 21 - "Historial de cambios"
Cohesion: 0.36
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 22 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 23 - "poliuretano.js"
Cohesion: 0.33
Nodes (7): consumoPor(), kgPoliuretano(), mesDe(), MESES_ES, nombreMes(), resumenPoliuretano(), semanaDe()

### Community 24 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 25 - "modelo.js"
Cohesion: 0.32
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 26 - "paneles-planta.js"
Cohesion: 0.39
Nodes (6): etiquetaPrio(), pintarResumenPlanta(), pintarTarjeta(), plantaPendientes(), renderPlanta(), textoEspera()

### Community 27 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 28 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 29 - "panel-de-puerta.js"
Cohesion: 0.43
Nodes (4): crearPanelDeLaPuerta(), destinoPanel(), filaPanel(), primeraFilaLibrePanel()

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
- **60 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `recargarHist`, `ESCALA` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Control de OPs` to `Tableros y catalogo`, `paneles-control.js`, `Cliente de Google Sheets`, `Constantes del modelo`, `Impresion`, `paneles-ficha.js`, `Vista de planta`, `calidad.js`, `paneles-planta.js`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Why does `renderResumen()` connect `Utilidades y fechas` to `Tableros y catalogo`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `renderAlmacen()` (e.g. with `enProduccion()` and `separada()`) actually correct?**
  _`renderAlmacen()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.09230769230769231 - nodes in this community are weakly interconnected._
- **Should `Control de OPs` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._
- **Should `paneles-control.js` be split into smaller, more focused modules?**
  _Cohesion score 0.14245014245014245 - nodes in this community are weakly interconnected._