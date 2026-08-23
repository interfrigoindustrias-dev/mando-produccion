@echo off
title Control de Puertas - servidor de desarrollo
cd /d "%~dp0"
echo.
echo   Control de Puertas
echo   ------------------------------------------
echo   Abriendo http://localhost:8080
echo.
echo   Deja esta ventana ABIERTA mientras trabajes.
echo   Para detenerlo: Ctrl+C o cierra la ventana.
echo.
echo   Recuerda tener http://localhost:8080 en los
echo   origenes autorizados del cliente OAuth.
echo.
start "" http://localhost:8080
python -m http.server 8080 --directory src
if errorlevel 1 (
  echo.
  echo   No se pudo iniciar. Revisa Python o el puerto 8080.
  pause
)
