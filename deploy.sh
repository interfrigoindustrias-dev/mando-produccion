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
"${SCP[@]}" "$SRC/manifest.webmanifest" "${USUARIO}@${HOST}:${DESTINO}/"
"${SCP[@]}" "$SRC/.htaccess"            "${USUARIO}@${HOST}:${DESTINO}/"

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

# Redirección desde la ruta antigua, para los enlaces ya repartidos
"${SCP[@]}" "$AQUI/redirect.html" "${USUARIO}@${HOST}:${REDIR}"

echo "→ Verificando…"
"${SSH[@]}" "cd ~/${DESTINO} && echo '  archivos:' \$(find . -type f | wc -l) && ls -l --time-style='+%H:%M' index.html"

echo
echo "✓ Publicado en ${URL}"
echo "  Recarga con Ctrl+F5."
