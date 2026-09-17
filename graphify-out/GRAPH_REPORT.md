# Graph Report - mando-produccion  (2026-09-17)

## Corpus Check
- 85 files · ~375,080 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 612 nodes · 959 edges · 42 communities (34 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tableros y catalogo
- Constantes del modelo
- secuencia.js
- paneles-filtros.js
- Programación de Paneles
- paneles-control.js
- Vistas y secciones de Puertas
- humo.js
- Utilidades y fechas
- Cliente de Google Sheets
- paneles-ficha.js
- informes.js
- usuarios.js
- Impresion
- Control de OPs
- paneles-resumen.js
- Ayudantes de tableros
- Vista de planta
- campos.js
- cronograma.js
- paneles-listas.js
- auth.php
- calidad.js
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
1. `renderPrograma()` - 13 edges
2. `render()` - 12 edges
3. `Control de Puertas (app shell)` - 12 edges
4. `ROWS` - 11 edges
5. `renderResumen()` - 10 edges
6. `fichasAbiertas()` - 8 edges
7. `api()` - 8 edges
8. `pintarModeloModal()` - 8 edges
9. `render()` - 8 edges
10. `autoReprogramarAtrasadas()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `refresh()` --indirect_call--> `fillLists()`  [INFERRED]
  src/js/datos.js → src/js/paneles-control.js
- `refresh()` --indirect_call--> `render()`  [INFERRED]
  src/js/datos.js → src/js/paneles-control.js
- `setCheckboxUI()` --indirect_call--> `col()`  [INFERRED]
  src/js/api.js → src/js/paneles-auto.js
- `sincronizarValidacion()` --indirect_call--> `col()`  [INFERRED]
  src/js/api.js → src/js/paneles-auto.js
- `ponerEstado()` --references--> `ROWS`  [EXTRACTED]
  src/js/paneles-auto.js → src/js/constantes.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Módulos que usan paneles-filtros.js** — src_js_paneles_filtros, src_js_paneles_control, src_js_paneles_planta, src_js_paneles_almacen [EXTRACTED 1.00]
- **Módulos de Puertas no cargados por Paneles** — docs_paneles_vistas_separadas, docs_paneles_control_js, docs_paneles_ficha_js, docs_paneles_planta_js, docs_paneles_dashboards_js, docs_paneles_automatizaciones_js [EXTRACTED 1.00]
- **Sistema de impresión por vista** — src_puertas_control_de_ops, src_puertas_stock, src_puertas_almacen, src_puertas_programacion [INFERRED 0.75]
- **Ciclo de vida de una puerta (creación a stock/almacén)** — src_puertas_nueva_ficha, src_puertas_control_de_ops, src_puertas_calidad, src_puertas_almacen, src_puertas_stock [INFERRED 0.80]
- **Seguimiento de procesos de fabricación entre vistas** — src_puertas_control_de_ops, src_puertas_planta, src_puertas_resumen, src_puertas_proceso_de_fabricacion [INFERRED 0.80]
- **Automatismos de estado en Paneles** — docs_paneles_automatismos, docs_paneles_terminar_button, docs_paneles_llegar_100_no_cierra, src_js_paneles_planta, src_js_paneles_almacen [INFERRED 0.85]

## Communities (42 total, 5 thin omitted)

### Community 0 - "Tableros y catalogo"
Cohesion: 0.08
Nodes (36): abrirModelo(), almacenBase(), almacenList(), bCarta, bStk, bTodas, calcularModelos(), celdaSeparar() (+28 more)

### Community 1 - "Constantes del modelo"
Cohesion: 0.06
Nodes (30): autoPrioridades(), CAMPOS_PROCESO, COLUMNAS_NUEVAS, diasSinTocar(), ESCALA, ESPERA, hoy0(), marcarInicioProduccion() (+22 more)

### Community 2 - "secuencia.js"
Cohesion: 0.08
Nodes (35): Ancho fijo 1,16 m, Columnas de la hoja (A-U), Decisión 27, Densidad del poliuretano: 38 kg/m3, Agrupación por espesor, no por producto, espesorMm(), Fórmula UNIDAD/TOTAL de poliuretano, lotePorEspesor (200 m2 por defecto) (+27 more)

### Community 3 - "paneles-filtros.js"
Cohesion: 0.11
Nodes (28): Automatismos de estado (4), Llegar al 100% no cierra la línea, Botón Terminar, aComp, enAlmacen(), porPedido(), renderAlmacen(), avisarCambio() (+20 more)

### Community 4 - "Programación de Paneles"
Cohesion: 0.15
Nodes (30): ajustarAlto(), autoDesplazar(), autoReprogramarAtrasadas(), cambiosAlSoltar(), capacidadDia(), diaQueToca(), diasDeSemana(), empezarArrastre() (+22 more)

### Community 5 - "paneles-control.js"
Cohesion: 0.12
Nodes (26): autoReprogramarAtrasadas(), refresh(), renderDashVisible(), restartPoll(), setSync(), stopPoll(), aplicarFiltros(), btnCsv (+18 more)

### Community 6 - "Vistas y secciones de Puertas"
Cohesion: 0.11
Nodes (25): Almacén (vista), Control de Puertas (app shell), Novedades / Avisos (modal), Botón Imprimir (Inventario por modelo), Calidad (vista), Configuración (modal), Control de OPs (vista), Detalle de puerta (modal) (+17 more)

### Community 7 - "humo.js"
Cohesion: 0.11
Nodes (19): arrancar(), CAB_PANEL, celdasDe(), colNum(), DATOS, escribir(), ESCRITURAS, fs (+11 more)

### Community 8 - "Utilidades y fechas"
Cohesion: 0.12
Nodes (14): fmt(), fmtDate(), hoy(), iso(), num(), numCell(), p2(), progreso() (+6 more)

### Community 9 - "Cliente de Google Sheets"
Cohesion: 0.19
Nodes (21): api(), ensureCols(), ensureGid(), ensureRows(), fetchRows(), NUMERICOS, repairNumeros(), repairStatus() (+13 more)

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

### Community 14 - "Control de OPs"
Cohesion: 0.23
Nodes (14): editCampo(), fillLists(), filtered(), filtrosActivos(), FSEL, kpis(), medidaDe(), paintRow() (+6 more)

### Community 15 - "paneles-resumen.js"
Cohesion: 0.26
Nodes (13): Plazo de entrega (percentil 90 + ritmo de cola), consumoLamina(), diasDeFabricacion(), fabricadas(), fechaFin(), mediana(), metrosLamina(), percentil() (+5 more)

### Community 16 - "Ayudantes de tableros"
Cohesion: 0.22
Nodes (7): completa(), desp(), DETALLE_KPI, enProduccion(), enStock(), tablaMini(), verDetalleKpi()

### Community 17 - "Vista de planta"
Cohesion: 0.29
Nodes (11): altaOlvidada(), COLOR_PROC, etiquetaPlanta(), etiquetaPrio(), metaTarjeta(), notaTarjeta(), pintarResumenPlanta(), pintarTarjeta() (+3 more)

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

### Community 22 - "calidad.js"
Cohesion: 0.38
Nodes (8): calidadBase(), calidadList(), esNoApta(), motivoDevolucion(), notaLimpia(), pintarSelCalidad(), renderCalidad(), SEL_CAL

### Community 23 - "Historial de cambios"
Cohesion: 0.36
Nodes (9): ensureLog(), histOf(), loadLog(), LOG, logBulk(), logChanges(), recargarHist, renderHist() (+1 more)

### Community 24 - "Configuracion del usuario"
Cohesion: 0.33
Nodes (5): aplicarCfgDeEnlace(), CAMPOS_EMPRESA, loadCfg(), parseSheetId(), saveCfg()

### Community 25 - "Autenticacion con Google"
Cohesion: 0.43
Nodes (6): avisarReconectar(), ensureToken(), entrarConGoogle(), paginaActual(), pedirToken(), programarRenovacion()

### Community 26 - "modelo.js"
Cohesion: 0.32
Nodes (6): espesorMetros(), espesorMm(), etiquetaEspesor(), MODELO_PANELES, MODELO_PUERTAS, MODELOS_DATOS

### Community 27 - "Vistas Excluidas de Paneles (Decisión 22)"
Cohesion: 0.29
Nodes (7): automatizaciones.js (Puertas), control.js (Puertas), dashboards.js (Puertas), Decisión 22, ficha.js (Puertas), planta.js (Puertas), Paneles no comparte vistas con Puertas

### Community 28 - "avisos.js"
Cohesion: 0.52
Nodes (6): abrirAvisos(), avisosNuevos(), cerrarAvisos(), marcarVisto(), pintarTimbre(), ultimoVisto()

### Community 29 - "meta.js"
Cohesion: 0.29
Nodes (3): META, META_DEF, META_HEAD

### Community 30 - "panel-de-puerta.js"
Cohesion: 0.43
Nodes (4): crearPanelDeLaPuerta(), destinoPanel(), filaPanel(), primeraFilaLibrePanel()

### Community 31 - "comprobar_ids.py"
Cohesion: 0.52
Nodes (6): ids_de(), leer(), main(), protegido_en_linea(), El propio renglon comprueba antes de usar., scripts_de()

### Community 33 - "Instalacion como app"
Cohesion: 0.47
Nodes (4): abrirInstalar(), comprobarVersion(), forzarActualizacion(), mostrarBoton()

### Community 34 - "filtros-movil.js"
Cohesion: 0.70
Nodes (4): filtroPuesto(), pintarContador(), plegarBarra(), plegarFiltros()

## Knowledge Gaps
- **90 isolated node(s):** `ORDEN_PRIO`, `NUMERICOS`, `ESTADO`, `CAMPOS_EDITABLES`, `DIAS_SEMANA` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 184 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ROWS` connect `Constantes del modelo` to `Cliente de Google Sheets`, `paneles-ficha.js`, `Impresion`, `Vista de planta`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `Columnas de la hoja (A-U)` connect `secuencia.js` to `paneles-ficha.js`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `ORDEN_PRIO`, `NUMERICOS`, `ESTADO` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tableros y catalogo` be split into smaller, more focused modules?**
  _Cohesion score 0.080338266384778 - nodes in this community are weakly interconnected._
- **Should `Constantes del modelo` be split into smaller, more focused modules?**
  _Cohesion score 0.06423034330011074 - nodes in this community are weakly interconnected._
- **Should `secuencia.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0796221322537112 - nodes in this community are weakly interconnected._
- **Should `paneles-filtros.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10695187165775401 - nodes in this community are weakly interconnected._