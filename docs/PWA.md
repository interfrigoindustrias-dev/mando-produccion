# Aplicación instalable (PWA)

La app se instala como una aplicación nativa en escritorio, tablet y móvil:
icono propio, pantalla completa sin barra del navegador y arranque instantáneo.

## Cómo se instala

| Dispositivo | Cómo |
|---|---|
| **Chrome / Edge escritorio** | Botón **⤓ Instalar** en la barra de la app, o el icono ⊕ de la barra de direcciones |
| **Android** | Botón **⤓ Instalar**, o menú ⋮ → *Instalar aplicación* |
| **iPhone / iPad** | Safari → botón Compartir → *Añadir a pantalla de inicio* |
| **Firefox escritorio** | No admite instalación; usar Chrome o Edge |

El botón aparece en dos sitios: la barra superior y la pantalla de entrada, que
es donde llega la gente la primera vez. En iOS no existe instalación automática,
así que el botón abre un diálogo con los tres pasos ilustrados.

## Qué se cachea y qué no

`sw.js` guarda **solo el armazón**: HTML, CSS, JS e iconos, y lo sirve
**primero desde la red**, usando la copia guardada únicamente si no hay conexión.
Así la app sobrevive a un corte de red sin retrasar nunca una versión nueva.

Si un equipo se queda con una versión antigua: **⚙ › Forzar actualización**.
Borra el service worker y las cachés y vuelve a descargar todo.

**Los datos nunca se cachean.** Todo lo que va a `sheets.googleapis.com` o
`accounts.google.com` pasa directo a la red: el service worker ni lo toca. Si no
hay conexión, la app abre pero no puede leer ni escribir — que es el
comportamiento correcto para un sistema de producción.

## Actualizaciones

`deploy.sh` sella el service worker con el hash del commit:

```bash
const VERSION = "a1b9181";
```

Al cambiar el sello, el service worker se instala de nuevo, descarta la caché
vieja y recarga la página una sola vez. Los equipos ya instalados se actualizan
solos, sin que nadie tenga que borrar nada.

Para que eso funcione, `sw.js` **no debe cachearse en el servidor**. Lo garantiza
`.htaccess`:

```apache
<FilesMatch "sw\.js$">
  Header set Cache-Control "no-cache, no-store, must-revalidate"
</FilesMatch>
```

## Iconos

Se generan desde `img/logo.png` sobre el azul de marca, en dos variantes:

- **any** (192 y 512 px): el logo ocupa el 74 % del lienzo.
- **maskable** (192 y 512 px): el logo ocupa el 58 %, porque Android recorta
  hasta un 20 % por lado para adaptarlo a la forma del sistema.

Para regenerarlos tras un cambio de logo, ver el bloque de generación en el
historial del repositorio.

## Atajos

Manteniendo pulsado el icono de la app aparecen accesos directos a **Planta** y
a **Nueva ficha**.

## Requisitos

HTTPS obligatorio (o `localhost` en desarrollo). Sin certificado no hay service
worker ni instalación.
