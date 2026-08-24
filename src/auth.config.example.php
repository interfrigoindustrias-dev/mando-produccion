<?php
/**
 * Credenciales del cliente OAuth — plantilla.
 *
 * Copiar a auth.config.php en la raíz del proyecto y rellenar. Ese archivo NO
 * se versiona; deploy.sh lo publica junto a auth.php.
 *
 * El client_secret SÍ es un secreto: no debe aparecer nunca en el navegador,
 * ni en el repositorio, ni en un correo. Se obtiene en Google Cloud Console →
 * Credenciales → el ID de cliente OAuth → «Secreto del cliente».
 */
return [
    'client_id'     => '<id-de-cliente>.apps.googleusercontent.com',
    'client_secret' => '<secreto-del-cliente>',

    // Debe coincidir EXACTAMENTE con el URI de redirección autorizado en
    // Google Cloud Console.
    'redirect_uri'  => 'https://<dominio>/produccion/auth.php?a=callback',

    'scope'  => 'openid email https://www.googleapis.com/auth/spreadsheets',
    'inicio' => 'puertas.html',

    // Opcional: restringe el selector de cuentas a un dominio de Workspace.
    // Quien use una cuenta de otro dominio quedaría fuera.
    // 'dominio' => 'ejemplo.com',
];
