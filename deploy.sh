#!/usr/bin/env bash
# Publica src/ en Hostinger.  Uso:  ./deploy.sh
set -euo pipefail

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

echo "→ Verificando sintaxis de los módulos…"
if command -v node >/dev/null 2>&1; then
  for f in "$SRC"/js/*.js; do node --check "$f" || { echo "  ✗ $f"; exit 1; }; done
  echo "  ✓ $(ls "$SRC"/js/*.js | wc -l) archivos correctos"
else
  echo "  · node no disponible, se omite"
fi

echo "→ Subiendo a ${DESTINO}…"
"${SSH[@]}" "mkdir -p ~/${DESTINO}/css ~/${DESTINO}/js ~/${DESTINO}/img"
"${SCP[@]}" "$SRC/index.html"           "${USUARIO}@${HOST}:${DESTINO}/"
"${SCP[@]}" "$SRC/puertas.html"         "${USUARIO}@${HOST}:${DESTINO}/"
"${SCP[@]}" "$SRC/paneles.html"         "${USUARIO}@${HOST}:${DESTINO}/"
"${SCP[@]}" "$SRC/manifest.webmanifest" "${USUARIO}@${HOST}:${DESTINO}/"
"${SCP[@]}" "$SRC/.htaccess"            "${USUARIO}@${HOST}:${DESTINO}/"

# Configuracion de la instalacion: fuera del repositorio, para que ningun
# equipo ni celular tenga que introducirla a mano. Ver src/config-app.example.js
if [[ -f "${AQUI}/app.config.js" ]]; then
  "${SCP[@]}" "${AQUI}/app.config.js" "${USUARIO}@${HOST}:${DESTINO}/config-app.js"
  echo "  · configuracion de instalacion publicada"
else
  echo "  · sin app.config.js: cada equipo se configurara a mano o por enlace"
fi

# El service worker lleva sellada la version, para que el cache de los equipos
# ya instalados se renueve solo en cuanto se publica algo nuevo.
SELLO="$(git -C "$AQUI" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
TMP_SW="$(mktemp)"
sed "s/^const VERSION = .*/const VERSION = \"${SELLO}\";/" "$SRC/sw.js" > "$TMP_SW"
"${SCP[@]}" "$TMP_SW" "${USUARIO}@${HOST}:${DESTINO}/sw.js"
rm -f "$TMP_SW"


echo "  · service worker sellado como ${SELLO}"
"${SCP[@]}" "$SRC"/css/*.css   "${USUARIO}@${HOST}:${DESTINO}/css/"
"${SCP[@]}" "$SRC"/js/*.js     "${USUARIO}@${HOST}:${DESTINO}/js/"
"${SCP[@]}" "$SRC"/img/*       "${USUARIO}@${HOST}:${DESTINO}/img/"

# El mismo sello dentro del JS, y en un archivo que se pide siempre fresco.
# Si no coinciden, el equipo esta ejecutando codigo viejo y se actualiza solo.
TMP_MOD="$(mktemp)"
sed "s/^const BUILD = .*/const BUILD = \"${SELLO}\";/" "$SRC/js/modulo.js" > "$TMP_MOD"
"${SCP[@]}" "$TMP_MOD" "${USUARIO}@${HOST}:${DESTINO}/js/modulo.js"
rm -f "$TMP_MOD"

TMP_VER="$(mktemp)"
printf '{"build":"%s"}
' "${SELLO}" > "$TMP_VER"
"${SCP[@]}" "$TMP_VER" "${USUARIO}@${HOST}:${DESTINO}/version.json"
rm -f "$TMP_VER"

# Rutas antiguas: se dejan redirecciones para no romper enlaces ya repartidos
# ni marcadores del equipo.
"${SCP[@]}" "$AQUI/redirect.html" "${USUARIO}@${HOST}:${REDIR}"
if [[ -n "${VIEJO:-}" ]]; then
  "${SSH[@]}" "mkdir -p ~/${VIEJO}"
  "${SCP[@]}" "$AQUI/redirect.html"         "${USUARIO}@${HOST}:${VIEJO}/index.html"
  "${SCP[@]}" "$AQUI/redirect.html"         "${USUARIO}@${HOST}:${VIEJO}/produccion.html"
  "${SCP[@]}" "$AQUI/redirect-paneles.html" "${USUARIO}@${HOST}:${VIEJO}/paneles.html"
  echo "  · rutas antiguas redirigidas"
fi

echo "→ Verificando…"
"${SSH[@]}" "cd ~/${DESTINO} && echo '  archivos:' \$(find . -type f | wc -l) && ls -l --time-style='+%H:%M' index.html"

echo
echo "✓ Publicado en ${URL}"
echo "  Recarga con Ctrl+F5."
