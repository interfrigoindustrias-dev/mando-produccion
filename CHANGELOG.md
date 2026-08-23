# Historial de cambios

Formato: cada versión agrupa lo entregado y lo corregido.

## [2.1.0] — 2026-08-23

### Añadido
- **Aplicación instalable (PWA)**: manifiesto, iconos normales y maskable,
  service worker que cachea el armazón, y botón de instalación con instrucciones
  para iPhone y iPad.
- Atajos del icono a Planta y a Nueva ficha.
- `.htaccess` con tipos MIME, caché y compresión.

### Cambiado
- El repositorio sale de Google Drive: su sistema de archivos bloqueaba carpetas
  y llegó a impedir operaciones de git.
- Los datos del servidor salen del código versionado a `deploy.config.sh`.

## [2.0.0] — 2026-08-23

### Estructura
- El monolito de 146 KB se separa en `src/` con 5 hojas de estilo y 15 módulos JS.
- El logo pasa de estar incrustado en base64 a `src/img/logo.png`.
- Documentación técnica en `docs/`.
- Publicación con `deploy.sh` a `public_html/puertas/`.

### Añadido
- Vista **Planta** para tablet: tarjetas con semáforo de prioridad, un color por
  proceso, puntaje destacado y selector de estado de despacho.
- Tablero **Resumen** con ritmo de producción, antigüedad, ciclo de fabricación
  y proyección de cola.
- Tableros **Almacén** y **Stock** con filtros, contadores y edición de estado.
- **Inventario por modelo** con catálogo editable en la pestaña `MODELOS`.
- **Historial de cambios** por puerta en la pestaña `LOG APP`.
- **Automatizaciones** de fecha de proceso por prioridad y de fecha de despacho.
- Impresión en dos formatos: etiqueta 100×100 mm y hoja carta.
- Estado de despacho **Anulada**.
- Tema claro/oscuro con selector.
- Edición en línea de prioridad, apertura y ensamble.

### Corregido
- `#ERROR!` en STATUS por el separador de fórmulas regional.
- Números decimales guardados como fecha (`1.5` → `46143`).
- Marcas de proceso que se revertían por una carrera con el refresco.
- La tabla se reconstruía entera en cada marca, perdiendo clics y scroll.
- `exceeds grid limits` al quedarse la hoja sin filas.
- Filas nuevas sin formato de casilla de verificación.
- Contorno negro en las tarjetas de prioridad ALTA (regla CSS global heredada).
- La etiqueta desbordaba su área imprimible.
- El logo y las franjas negras no se imprimían.
- Módulo de modelos borrado por una refactorización.

## [1.0.0] — 2026-08-22

Primera versión: archivo único con Control de OPs, alta de fichas y ficha
imprimible, sobre Google Sheets con login de Google.
