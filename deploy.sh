#!/usr/bin/env bash
# Publica src/ en Hostinger.  Uso:  ./deploy.sh
set -euo pipefail

# Este repositorio (mando-produccion) es ahora la unica fuente de la
# aplicacion viva: trae Puertas, Paneles e Inventario completos, con
# Programacion y el contrato Panel-para-puerta. La linea antigua en
# I:\Mi unidad\Software\PUERTAS quedo retirada — no se publica mas desde ahi.

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${AQUI}/src"

# Datos del servidor: fuera del repositorio (ver deploy.config.example.sh)
if [[ ! -f "${AQUI}/deploy.config.sh" ]]; then
  echo "Falta deploy.config.sh. Copia deploy.config.example.sh y rellena los valores." >&2
  exit 1
fi
# shellcheck source=/dev/null
source "${AQUI}/deploy.config.sh"

SSH=(ssh -i "$LLAVE" -o IdentitiesOnly=yes -o BatchMode=yes -p "$PORT" "${USUARIO}@${HOST}")
SCP=(scp -i "$LLAVE" -o IdentitiesOnly=yes -o BatchMode=yes -P "$PORT")

# El servidor viene cortando conexiones SSH sueltas cuando se abren muchas
# seguidas (quince o mas por publicacion), dejando el sitio a medias. Reintenta
# cada comando unas cuantas veces con una pausa corta antes de rendirse.
intentar(){
  local intentos=4 espera=4 i
  for ((i=1; i<=intentos; i++)); do
    if "$@"; then return 0; fi
    if (( i < intentos )); then
      echo "  · conexión cortada, reintentando (${i}/${intentos})…" >&2
      sleep "$espera"
    fi
  done
  return 1
}

echo "→ Verificando sintaxis de los módulos…"
if command -v node >/dev/null 2>&1; then
  for f in "$SRC"/js/*.js; do node --check "$f" || { echo "  ✗ $f"; exit 1; }; done
  echo "  ✓ $(ls "$SRC"/js/*.js | wc -l) archivos correctos"
else
  echo "  · node no disponible, se omite"
fi

# La sintaxis correcta no basta: un $("#id") sobre algo que solo existe en una
# de las dos paginas revienta la carga del archivo entero en la otra.
echo "→ Comprobando elementos compartidos entre puertas y paneles…"
if command -v python >/dev/null 2>&1; then
  python tools/comprobar_ids.py || { echo "  ✗ corrige lo anterior antes de publicar"; exit 1; }
elif command -v python3 >/dev/null 2>&1; then
  python3 tools/comprobar_ids.py || { echo "  ✗ corrige lo anterior antes de publicar"; exit 1; }
else
  echo "  · python no disponible, se omite"
fi

# Comprobar la sintaxis y los ids no basta: el fallo tipico es que la pagina
# arranca y se queda a medias sin decir nada. La prueba de humo la arranca de
# verdad —con una hoja falsa— y mira lo que se pinta.
echo "→ Prueba de humo de las dos páginas…"
if command -v node >/dev/null 2>&1 && node -e "require('jsdom')" >/dev/null 2>&1; then
  node tools/humo.js || { echo "  ✗ no se publica con la prueba en rojo"; exit 1; }
else
  echo "  · jsdom no instalado (npm install --no-save jsdom), se omite"
fi

echo "→ Subiendo a ${DESTINO}…"
intentar "${SSH[@]}" "mkdir -p ~/${DESTINO}/css ~/${DESTINO}/js ~/${DESTINO}/img"
# Todos los archivos sueltos de la raiz, en una sola conexion: son la mayoria
# de las que se cortaban antes, una por una.
intentar "${SCP[@]}" \
  "$SRC/index.html" "$SRC/puertas.html" "$SRC/paneles.html" "$SRC/inventario.html" \
  "$SRC/manifest.webmanifest" "$SRC/.htaccess" "$SRC/auth.php" \
  "${USUARIO}@${HOST}:${DESTINO}/"

# Credenciales del cliente OAuth: fuera del repositorio (ver auth.config.example.php)
if [[ -f "${AQUI}/auth.config.php" ]]; then
  intentar "${SCP[@]}" "${AQUI}/auth.config.php" "${USUARIO}@${HOST}:${DESTINO}/"
  intentar "${SSH[@]}" "chmod 600 ~/${DESTINO}/auth.config.php"
  echo "  · credenciales del cliente publicadas"
else
  echo "  · FALTA auth.config.php: el inicio de sesion no funcionara"
fi

# Configuracion de la instalacion: fuera del repositorio, para que ningun
# equipo ni celular tenga que introducirla a mano. Ver src/config-app.example.js
if [[ -f "${AQUI}/app.config.js" ]]; then
  intentar "${SCP[@]}" "${AQUI}/app.config.js" "${USUARIO}@${HOST}:${DESTINO}/config-app.js"
  echo "  · configuracion de instalacion publicada"
else
  echo "  · sin app.config.js: cada equipo se configurara a mano o por enlace"
fi

# El service worker lleva sellada la version, para que el cache de los equipos
# ya instalados se renueve solo en cuanto se publica algo nuevo. El mismo sello
# va tambien en modulo.js y en version.json: los tres se preparan primero y se
# suben juntos, en vez de una conexion por archivo.
SELLO="$(git -C "$AQUI" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
TMP="$(mktemp -d)"
sed "s/^const VERSION = .*/const VERSION = \"${SELLO}\";/" "$SRC/sw.js" > "$TMP/sw.js"
sed "s/^const BUILD = .*/const BUILD = \"${SELLO}\";/" "$SRC/js/modulo.js" > "$TMP/modulo.js"
printf '{"build":"%s"}\n' "${SELLO}" > "$TMP/version.json"

intentar "${SCP[@]}" "$TMP/sw.js" "$TMP/version.json" "${USUARIO}@${HOST}:${DESTINO}/"
intentar "${SCP[@]}" "$TMP/modulo.js" "${USUARIO}@${HOST}:${DESTINO}/js/modulo.js"
rm -rf "$TMP"
echo "  · service worker y modulo.js sellados como ${SELLO}"

intentar "${SCP[@]}" "$SRC"/css/*.css   "${USUARIO}@${HOST}:${DESTINO}/css/"
intentar "${SCP[@]}" "$SRC"/js/*.js     "${USUARIO}@${HOST}:${DESTINO}/js/"
intentar "${SCP[@]}" "$SRC"/img/*       "${USUARIO}@${HOST}:${DESTINO}/img/"

# Rutas antiguas: se dejan redirecciones para no romper enlaces ya repartidos
# ni marcadores del equipo.
intentar "${SCP[@]}" "$AQUI/redirect.html" "${USUARIO}@${HOST}:${REDIR}"
if [[ -n "${VIEJO:-}" ]]; then
  intentar "${SSH[@]}" "mkdir -p ~/${VIEJO}"
  intentar "${SCP[@]}" "$AQUI/redirect.html"         "${USUARIO}@${HOST}:${VIEJO}/index.html"
  intentar "${SCP[@]}" "$AQUI/redirect.html"         "${USUARIO}@${HOST}:${VIEJO}/produccion.html"
  intentar "${SCP[@]}" "$AQUI/redirect-paneles.html" "${USUARIO}@${HOST}:${VIEJO}/paneles.html"
  echo "  · rutas antiguas redirigidas"
fi

echo "→ Verificando…"
intentar "${SSH[@]}" "cd ~/${DESTINO} && echo '  archivos:' \$(find . -type f | wc -l) && ls -l --time-style='+%H:%M' index.html"

echo
echo "✓ Publicado en ${URL}"
echo "  Recarga con Ctrl+F5."
