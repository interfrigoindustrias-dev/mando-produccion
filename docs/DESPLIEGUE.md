# Despliegue

## 1. La hoja de cálculo

1. Subir el Excel a Google Drive y convertirlo: **Archivo › Guardar como Hoja de cálculo de Google**.
2. La pestaña de datos debe llamarse exactamente **`OP PUERTA`**.
3. **Compartir** como **Editor** con el correo de cada persona que use la app.
   Sin esto, la app abre pero devuelve 403 al leer.
4. Copiar el ID de la URL — el tramo entre `/d/` y `/edit`.

Las pestañas `LOG APP` y `MODELOS` las crea la app sola la primera vez.

## 2. Google Cloud (una sola vez)

1. [console.cloud.google.com](https://console.cloud.google.com) → **Nuevo proyecto**.
2. **APIs y servicios › Biblioteca** → **Google Sheets API** → *Habilitar*.
3. **Pantalla de consentimiento OAuth**
   - Con Google Workspace: tipo **Interno**. Es lo recomendable — sin verificación
     ni lista de usuarios de prueba.
   - Con una cuenta Gmail: solo permite **Externo**, y cada usuario verá el aviso
     de «app no verificada» y deberá estar en *Usuarios de prueba*.
   - Permisos: `.../auth/spreadsheets` y `.../auth/userinfo.email`.
4. **Credenciales › Crear credenciales › ID de cliente de OAuth**
   - Tipo: **Aplicación web**.
   - **Orígenes autorizados de JavaScript**: el origen exacto, sin ruta ni barra final.

     ```
     https://interfrigo.com.co        ✅
     https://interfrigo.com.co/       ❌
     https://interfrigo.com.co/puertas ❌
     http://localhost:8080            ✅  (para desarrollo)
     ```
   - No hace falta URI de redirección ni client secret.

Los cambios de origen tardan entre 5 y 10 minutos en propagarse.

## 3. Publicar

```bash
./deploy.sh
```

Sube `src/` a `public_html/produccion/` en Hostinger por SSH y verifica el resultado.

### Acceso SSH

Autenticación por **llave**, no por contraseña. Configuración en `~/.ssh/config`:

```
Host interfrigo
  HostName 62.72.62.4
  Port 65002
  User u787912762
  IdentityFile ~/.ssh/abaco_deploy
```

Para añadir una llave nueva: `ssh-keygen -t ed25519 -f ~/.ssh/puertas_deploy`,
y pegar el contenido de `.pub` en hPanel → **Avanzado › Acceso SSH › Llaves SSH**.

### Rutas en el servidor

```
domains/interfrigo.com.co/public_html/
├── produccion/         ← la aplicación
│   ├── puertas.html    Módulo Puertas
│   ├── paneles.html    Módulo Paneles
│   ├── index.html      redirige a puertas.html
│   ├── css/  js/  img/
│   └── config-app.js   configuración de la instalación (no versionada)
├── puertas/            ← ruta anterior, solo redirecciones
└── puertas.html        ← enlace más antiguo, redirección
```

## 4. Configurar la app

Hay tres formas, de menos a más trabajo:

### a) Configuración de la instalación (recomendada)

Copiar `src/config-app.example.js` a **`app.config.js`** en la raíz del proyecto
y rellenar los valores. `deploy.sh` lo publica junto a la aplicación, y a partir
de ahí **ningún equipo ni celular tiene que configurar nada**: entra y usa.

```js
window.CONFIG_SERVIDOR = {
  clientId: "....apps.googleusercontent.com",
  sheetId:  "1AbC...",
  tab:      "OP PUERTA"
};
```

Ese archivo no se versiona. Ninguno de esos valores es una contraseña: el acceso
lo controla Google según con quién esté compartida la hoja y qué origen tenga
autorizado el cliente OAuth.

### b) Enlace de configuración

Desde un equipo ya configurado: **⚙ › 🔗 Enlace para otros equipos**. Copia un
enlace que, al abrirlo en otro dispositivo, lo deja configurado y limpia la
dirección. Útil para celulares y tablets, sin teclear nada.

### c) A mano

**⚙** → pegar **Client ID** e **ID de la hoja** (acepta la URL completa de la
hoja, la recorta sola) → **Guardar**.

En los tres casos, lo guardado en el navegador tiene prioridad sobre la
configuración de la instalación, por si alguien necesita apuntar a otra hoja.

### Sobre el inicio de sesión

La configuración ya no se pide en ningún equipo, pero **Google sí exige que cada
persona autorice el acceso una vez por dispositivo**. No se puede evitar: la app
entra a la hoja con la cuenta de cada operario, y de ahí sale el historial de
quién editó qué.

A partir de la segunda visita entra sola: la app recuerda el correo usado y se lo
pasa a Google como pista, así que ni siquiera aparece el selector de cuentas.

Si algún día se quisiera suprimir el inicio de sesión haría falta un intermediario
en el servidor con una cuenta de servicio. Se descartó a propósito: acabaría con
la trazabilidad por persona y dejaría la producción accesible a cualquiera que
tuviera la dirección.

---

## Problemas frecuentes

| Síntoma | Causa |
|---|---|
| `Error 400: invalid_request`, no abre el consentimiento | El origen no está autorizado, o se abrió con `file://` |
| `Acceso bloqueado` / app no verificada | Consentimiento Externo en pruebas: añadir el correo a *Usuarios de prueba*, o pasar el proyecto a una cuenta del dominio en modo Interno |
| 403 al cargar | La hoja no está compartida como Editor con esa cuenta |
| 404 al cargar | ID de hoja incorrecto o la pestaña no se llama `OP PUERTA` |
| `exceeds grid limits` | La hoja se quedó sin filas — la app las amplía sola al entrar |
| Fechas corridas un día | ⚙ → *Formato de fecha* debe coincidir con la región de la hoja |
| La etiqueta sale pequeña | En el diálogo de impresión: márgenes **Ninguno** y escala **100 %** |
