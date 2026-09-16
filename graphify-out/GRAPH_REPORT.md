# Graph Report - mando-produccion  (2026-09-16)

## Corpus Check
- 85 files · ~374,724 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 581 nodes · 935 edges · 41 communities (33 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.69)
- Token cost: 91,322 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- secuencia.js
- paneles-filtros.js
- Programación de Paneles
- paneles-control.js
- Control de OPs
- Utilidades y fechas
- humo.js
- Cliente de Google Sheets
- Constantes del modelo
- paneles-ficha.js
- informes.js
- usuarios.js
- Impresion
- paneles-resumen.js
- Ayudantes de tableros
- Vista de planta
- calidad.js
- campos.js
- cronograma.js
- paneles-listas.js
- auth.php
- Historial de cambios
- Configuracion del usuario
- Autenticacion con Google
- modelo.js
- Vistas Excluidas de Paneles (Decisión 22)
- avisos.js
- meta.js
- panel-de-puerta.js
- comprobar_ids.py
- formatos.js
- Instalacion como app
- filtros-movil.js
- modulo.js
- Despliegue
- deploy.config.example.sh
- Service worker

## God Nodes (most connected - your core abstractions)
1. `ROWS` - 18 edges
2. `renderPrograma()` - 13 edges
3. `render()` - 12 edges
4. `renderResumen()` - 10 edges
5. `render()` - 9 edges
6. `renderAlmacen()` - 9 edges
7. `pintarModeloModal()` - 9 edges
8. `api()` - 8 edges
9. `fichasAbiertas()` - 8 edges
10. `renderCalidad()` - 7 edges

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

## Hyperedges (group relationships)
- **Automatismos de estado en Paneles** — docs_paneles_automatismos, docs_paneles_terminar_button, docs_paneles_llegar_100_no_cierra, src_js_paneles_planta, src_js_paneles_almacen [INFERRED 0.85]
- **Módulos de Puertas no cargados por Paneles** — docs_paneles_vistas_separadas, docs_paneles_control_js, docs_paneles_ficha_js, docs_paneles_planta_js, docs_paneles_dashboards_js, docs_paneles_automatizaciones_js [EXTRACTED 1.00]
- **Módulos que usan paneles-filtros.js** — src_js_paneles_filtros, src_js_paneles_control, src_js_paneles_planta, src_js_paneles_almacen [EXTRACTED 1.00]

## Communities (41 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.09
Nodes (36): DESPACHOS, PRIORIDADES, abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas (+28 more)

### Community 1 - "secuencia.js"
Cohesion: 0.08
Nodes (35): Ancho fijo 1,16 m, Columnas de la hoja (A-U), Decisión 27, Densidad del poliuretano: 38 kg/m3, Agrupación por espesor, no por producto, espesorMm(), Fórmula UNIDAD/TOTAL de poliuretano, lotePorEspesor (200 m2 por defecto) (+27 more)

### Community 2 - "paneles-filtros.js"
Cohesion: 0.11
Nodes (28): Automatismos de estado (4), Llegar al 100% no cierra la línea, Botón Terminar, aComp, enAlmacen(), porPedido(), renderAlmacen(), avisarCambio() (+20 more)

### Community 3 - "Programación de Paneles"
Cohesion: 0.15
Nodes (30): ajustarAlto(), autoDesplazar(), autoReprogramarAtrasadas(), cambiosAlSoltar(), capacidadDia(), diaQueToca(), diasDeSemana(), empezarArrastre() (+22 more)

### Community 4 - "paneles-control.js"
Cohesion: 0.12
Nodes (26): autoReprogramarAtrasadas(), refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll(), aplicarFiltros(), btnCsv (+18 more)

### Community 5 - "Control de OPs"
Cohesion: 0.11
Nodes (26): autoPrioridades(), CAMPOS_PROCESO, COLUMNAS_NUEVAS, diasSinTocar(), ESCALA, ESPERA, hoy0(), marcarInicioProduccion() (+18 more)

### Community 6 - "Utilidades y fechas"
Cohesion: 0.11
Nodes (15): renderResumen(), fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2() (+7 more)

### Community 7 - "humo.js"
Cohesion: 0.11
Nodes (19): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+11 more)

### Community 8 - "Cliente de Google Sheets"
Cohesion: 0.19
Nodes (21): api(), ensureCols(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus() (+13 more)

### Community 9 - "Constantes del modelo"
Cohesion: 0.12
Nodes (13): CFG, CON_RIEL, LOG_HEAD, SEL, separada(), separadaPara(), urgente(), urgenteAuto() (+5 more)

### Community 10 - "paneles-ficha.js"
Cohesion: 0.18
Nodes (15): OP con sufijo para líneas múltiples, anadirLinea(), CAMPOS_EDITABLES, camposEditables(), celdaDe(), hintOp(), initForm(), lineaHTML() (+7 more)

### Community 11 - "informes.js"
Cohesion: 0.16
Nodes (15): abrirInformes(), bloqueColumnas(), bloqueCondiciones(), columnasDe(), csvInforme(), cuandoSale(), descargarInforme(), DIAS_SEMANA (+7 more)

### Community 12 - "usuarios.js"
Cohesion: 0.18
Nodes (14): enterApp(), goto(), pintarQuienSoy(), VIEWS, abrirUsuarios(), aplicarRol(), guardarUsuario(), loadUsuarios() (+6 more)

### Community 13 - "Impresion"
Cohesion: 0.18
Nodes (16): cabeceraCarta(), cartaHTML(), esperarImagenes(), familiasDe(), firmaCarta(), materialesCarta(), medidasCarta(), notasCarta() (+8 more)

### Community 14 - "paneles-resumen.js"
Cohesion: 0.26
Nodes (13): Plazo de entrega (percentil 90 + ritmo de cola), consumoLamina(), diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), metrosLamina(), percentil() (+5 more)

### Community 15 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 16 - "Vista de planta"
Cohesion: 0.29
Nodes (11): altaOlvidada(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+3 more)

### Community 17 - "calidad.js"
Cohesion: 0.33
Nodes (9): calidadBase(), calidadList(), esNoApta(), guardarCalidad(), motivoDevolucion(), notaLimpia(), pintarSelCalidad(), renderCalidad() (+1 more)

### Community 18 - "campos.js"
Cohesion: 0.21
Nodes (8): aNumero(), aTiempo(), CAMPO_POR_ID, CAMPOS, cumple(), cumpleTodas(), GRUPOS_CAMPO, OPERADORES

### Community 19 - "cronograma.js"
Cohesion: 0.27
Nodes (11): calcularCronograma(), DIA_SEM, diasHabiles(), entradaEnPlanta(), fechaCorta(), MES_COR, pendienteCronograma(), RANK_PRIO (+3 more)

### Community 20 - "paneles-listas.js"
Cohesion: 0.21
Nodes (6): detectarColumnasCalculadas(), detectarFormulaM2(), ENCABEZADOS, ESTADO_COLUMNAS, normaliza(), resolverColumnasPropias()

### Community 21 - "auth.php"
Cohesion: 0.35
Nodes (10): base64url(), callback(), guardar(), login(), logout(), paginaDestino(), pedirAGoogle(), responder() (+2 more)

### Community 22 - "Historial de cambios"
Cohesion: 0.36
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 23 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 24 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 25 - "modelo.js"
Cohesion: 0.32
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 26 - "Vistas Excluidas de Paneles (Decisión 22)"
Cohesion: 0.29
Nodes (7): automatizaciones.js (Puertas), control.js (Puertas), dashboards.js (Puertas), Decisión 22, ficha.js (Puertas), planta.js (Puertas), Paneles no comparte vistas con Puertas

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

### Community 32 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 33 - "filtros-movil.js"
Cohesion: 0.70
Nodes (4): filtroPuesto(), pintarContador(), plegarBarra(), plegarFiltros()

## Knowledge Gaps
- **77 isolated node(s):** `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS`, `recargarHist`, `ESCALA` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 168 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Control de OPs` to `Tableros y catalogo`, `Cliente de Google Sheets`, `Constantes del modelo`, `paneles-ficha.js`, `Impresion`, `Vista de planta`, `calidad.js`?**
  _High betweenness centrality (0.271) - this node is a cross-community bridge._
- **Why does `openDet()` connect `paneles-ficha.js` to `Control de OPs`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `Columnas de la hoja (A-U)` connect `secuencia.js` to `paneles-ficha.js`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **What connects `deploy.config.example.sh script`, `deploy.sh script`, `NUMERICOS` to the rest of the system?**
  _77 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.0859465737514518 - nodes in this community are weakly interconnected._
- **Should `secuencia.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0796221322537112 - nodes in this community are weakly interconnected._
- **Should `paneles-filtros.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10695187165775401 - nodes in this community are weakly interconnected._