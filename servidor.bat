@echo off
title Control de Puertas - servidor local
cd /d "%~dp0"
start "" http://localhost:8080
python -m http.server 8080
pause
