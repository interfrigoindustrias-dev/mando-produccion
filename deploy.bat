@echo off
title Publicar Control de Puertas
cd /d "%~dp0"
echo Subiendo la aplicacion...
bash ./deploy.sh
pause
