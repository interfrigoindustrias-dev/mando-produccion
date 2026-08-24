# Módulos: Puertas y Paneles

Cada módulo es un **producto independiente**. Comparten el código que los
presenta y nada más: cada uno tiene su propia hoja de cálculo, sus propias
filas, su propio historial y su propio catálogo.

| | Puertas | Paneles |
|---|---|---|
| Página | `puertas.html` | `paneles.html` |
| Color | azul `#0A4283` | verde `#0B6B4F` |
| Pestaña de datos | `OP PUERTA` | `PANEL` |
| Historial | `LOG APP` | `LOG PANELES` |
| Catálogo | `MODELOS` | `MODELOS PANELES` |
| Preferencias | `interfrigo.cfg.puertas` | `interfrigo.cfg.paneles` |

Hoy **comparten documento de Google**: es el mismo archivo, distintas pestañas.
Que compartan archivo no significa que compartan datos — cada módulo lee la suya
y tiene historial y catálogo propios. Por eso las pestañas auxiliares llevan el
nombre del módulo: si no, los dos escribirían en `LOG APP` y se mezclaría el
historial de productos distintos.

> La aplicación vive en `/produccion/`. `index.html` redirige a `puertas.html`,
> y la carpeta anterior `/puertas/` redirige a la nueva, para no romper enlaces
> ya repartidos ni marcadores del equipo.

## Cómo se sabe dónde estás

Tres señales a la vez, para que no haya duda:

1. **El color** tiñe toda la interfaz — es lo primero que se ve.
2. **El botón de producto** en la barra dice el nombre y abre el conmutador.
3. **El título** de la pestaña y de la pantalla de entrada.

Además, el atributo `data-modulo` del documento permite estilos propios de cada
producto si algún día hacen falta.

## Cómo se declara el módulo

La página lo fija antes de cargar nada:

```html
<script>window.MODULO = "paneles";</script>
<script src="config-app.js"></script>
<script src="js/modulo.js"></script>
```

Sin esa línea se asume `puertas`.

## Configuración

En `app.config.js`, cada módulo tiene su hoja. El Client ID es común: identifica
a la aplicación, no a los datos.

```js
window.CONFIG_SERVIDOR = {
  clientId: "....apps.googleusercontent.com",
  modulos: {
    puertas: { sheetId: "...", tab: "OP PUERTA" },
    paneles: { sheetId: "...", tab: "OP PANEL"  }
  }
};
```

Mientras un módulo no tenga `sheetId`, su página avisa al entrar de que le falta
la hoja.

## Añadir un producto nuevo

1. Añadir su entrada a `MODULOS` en `src/js/modulo.js` (id, nombre, título,
   página, colores).
2. Duplicar `puertas.html` con el `window.MODULO` correspondiente.
3. Añadir su hoja a `app.config.js`.
4. Sumar la página a `ARMAZON` en `sw.js` y a `deploy.sh`.

## Lo que todavía no está

El modelo de datos de Paneles es hoy **el mismo que el de Puertas**: 27 columnas,
ocho procesos, los mismos tipos y materiales. Es un punto de partida para poder
trabajar, no una decisión: en cuanto se sepa cómo son las fichas de panel de
verdad, hay que llevar ese modelo a la configuración del módulo — columnas,
procesos, listas de valores— en vez de dejarlo fijo en `constantes.js`.
