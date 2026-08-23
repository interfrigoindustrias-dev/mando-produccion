/* Configuración de la instalación — plantilla.
 *
 * Copiar a app.config.js en la raíz del proyecto y rellenar. Ese archivo NO se
 * versiona; deploy.sh lo publica como config-app.js junto a la aplicación.
 *
 * Cada módulo es un producto INDEPENDIENTE, con su propia hoja de cálculo. No
 * comparten datos: ni filas, ni historial, ni catálogo de modelos.
 *
 * Ninguno de estos valores es una contraseña: el acceso lo controla Google
 * según con quién esté compartida cada hoja y qué origen tenga autorizado el
 * cliente OAuth. */
window.CONFIG_SERVIDOR = {

  // Común a todos los módulos: identifica a la aplicación, no a los datos.
  clientId: "<id-de-cliente>.apps.googleusercontent.com",

  // Opcional. Si TODOS entran con una cuenta del dominio, salta el selector
  // de cuentas de Google. Quien use otra cuenta quedaría bloqueado.
  // dominio: "<dominio-de-la-empresa>",

  modulos: {
    puertas: { sheetId: "<id-de-la-hoja-de-puertas>", tab: "OP PUERTA" },
    paneles: { sheetId: "<id-de-la-hoja-de-paneles>", tab: "OP PANEL"  }
  }
};
