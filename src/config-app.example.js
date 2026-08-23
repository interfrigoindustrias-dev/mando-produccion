/* Configuración de la instalación — plantilla.
 *
 * Copiar a app.config.js en la raíz del proyecto y rellenar. Ese archivo NO se
 * versiona; deploy.sh lo publica como config-app.js junto a la aplicación.
 *
 * Con esto, ningún equipo ni celular tiene que configurar nada: entra y usa.
 * Lo guardado en el navegador (⚙) tiene prioridad, por si alguien necesita
 * apuntar a otra hoja puntualmente.
 *
 * Ninguno de estos valores es una contraseña: el acceso lo controla Google
 * según con quién esté compartida la hoja y qué origen tenga autorizado el
 * cliente OAuth. */
window.CONFIG_SERVIDOR = {
  clientId: "<id-de-cliente>.apps.googleusercontent.com",
  sheetId:  "<id-de-la-hoja>",
  tab:      "OP PUERTA"
};
