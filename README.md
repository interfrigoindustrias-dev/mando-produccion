# Control de Puertas — Interfrigo

Aplicación web para gestionar la producción y el despacho de puertas industriales.
Corre íntegramente en el navegador y usa una hoja de Google Sheets como base de datos:
**no hay servidor propio, ni backend, ni base de datos que mantener**.

🔗 **Producción:** https://interfrigo.com.co/puertas/

---

## Qué resuelve

| Vista | Para quién | Qué hace |
|---|---|---|
| **Control de OPs** | Administración | Tabla completa con 9 filtros, edición en línea de prioridad, apertura y ensamble |
| **Planta** | Jefe de planta (tablet) | Tarjetas grandes con un botón por proceso, color de semáforo por prioridad |
| **Resumen** | Gerencia | Producción por día/semana/mes, inventario, ritmo, antigüedad y proyección de cola |
| **Almacén** | Despacho | Terminadas y separadas, con edición del estado de despacho |
| **Stock** | Comercial | Inventario por modelo de puerta, con creación rápida desde el catálogo |

Además: alta de fichas, historial de cambios por puerta, impresión de etiqueta
100×100 mm y de hoja carta para planta.

**Se instala como aplicación** en escritorio, tablet y móvil — ver [docs/PWA.md](docs/PWA.md).

---

## Estructura del proyecto

```
PUERTAS/
├── src/                      Todo lo que se publica
│   ├── index.html            Marcado de la aplicación
│   ├── css/
│   │   ├── base.css          Tokens de color, tema claro/oscuro, controles
│   │   ├── componentes.css   Filtros, tablas, formularios, modales
│   │   ├── dashboards.css    Tarjetas de indicadores y barras
│   │   ├── planta.css        Vista táctil del jefe de planta
│   │   └── impresion.css     Etiqueta y hoja carta
│   ├── js/                   15 módulos, ver docs/ARQUITECTURA.md
│   └── img/logo.png
├── docs/                     Documentación técnica
├── deploy.sh                 Publicación a Hostinger por SSH
└── README.md
```

---

## Puesta en marcha

Requiere tres cosas, una sola vez. El detalle está en
**[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

1. **La hoja de cálculo** en Google Drive, con la pestaña `OP PUERTA`,
   compartida como Editor con cada persona que use la app.
2. **Un cliente OAuth** en Google Cloud (tipo *Aplicación web*), con el dominio
   de publicación en *Orígenes autorizados de JavaScript*.
3. **Configurar la app**: botón ⚙ → pegar el Client ID y el ID de la hoja.
   Se guarda en el navegador de cada usuario.

La app crea sola dos pestañas auxiliares en la misma hoja la primera vez:
`LOG APP` (historial) y `MODELOS` (catálogo de stock). No toca ninguna existente.

---

## Desarrollo

No hay compilación ni dependencias: son archivos estáticos que se cargan en el
orden declarado al final de `index.html`.

```bash
python -m http.server 8080 --directory src
```

Abrir `http://localhost:8080`. Para que Google acepte el login, hay que añadir
`http://localhost:8080` en *Orígenes autorizados de JavaScript*.

> ⚠️ Abrir `index.html` con doble clic (`file://`) **no funciona**: Google rechaza
> el origen `null`.

### Antes de publicar

Correr la comprobación de humo descrita en
**[docs/PRUEBAS.md](docs/PRUEBAS.md)**: verifica que existan todas las funciones,
que las cinco vistas pinten contenido y que las impresiones quepan en su hoja.

---

## Publicar

```bash
./deploy.sh
```

Sube `src/` a `public_html/puertas/` por SSH. Ver
**[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

---

## Documentación

| Documento | Contenido |
|---|---|
| [ARQUITECTURA.md](docs/ARQUITECTURA.md) | Cómo está partido el código y por qué |
| [MODELO-DATOS.md](docs/MODELO-DATOS.md) | Columnas de la hoja y reglas de negocio |
| [AUTOMATIZACIONES.md](docs/AUTOMATIZACIONES.md) | Reglas de fechas y disparadores |
| [DESPLIEGUE.md](docs/DESPLIEGUE.md) | Google Cloud, Hostinger y resolución de problemas |
| [DECISIONES.md](docs/DECISIONES.md) | Trampas encontradas y por qué el código es así |
| [PWA.md](docs/PWA.md) | Instalación como aplicación y actualizaciones |
| [MODULOS.md](docs/MODULOS.md) | Puertas y Paneles: productos independientes |
| [GRAFO.md](docs/GRAFO.md) | Grafo de conocimiento del código (graphify) |
| [PRUEBAS.md](docs/PRUEBAS.md) | Comprobación de humo antes de publicar |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |
