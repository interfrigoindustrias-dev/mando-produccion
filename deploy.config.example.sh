# Plantilla de configuración del despliegue.
# Copiar a deploy.config.sh y rellenar. Ese archivo no se versiona.
HOST=<ip-o-dominio-del-servidor>
PORT=<puerto-ssh>
USUARIO=<usuario-ssh>
LLAVE="${HOME}/.ssh/<nombre-de-la-llave>"
DESTINO="domains/<dominio>/public_html/puertas"
REDIR="domains/<dominio>/public_html/puertas.html"
URL="https://<dominio>/puertas/"
