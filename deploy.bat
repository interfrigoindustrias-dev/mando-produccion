@echo off
title Publicar Control de Puertas
cd /d "%~dp0"
where bash >nul 2>&1
if errorlevel 1 (
  echo No se encontro bash. Instala Git para Windows o usa deploy.sh.
  pause
  exit /b 1
)
bash ./deploy.sh
pause
