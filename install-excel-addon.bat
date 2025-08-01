@echo off
echo ========================================
echo  Instalando BERT v3.0 en Excel
echo ========================================

REM Iniciar servicios BERT
echo Iniciando servicios BERT v3.0...
start /B node bert-server.js
start /B node html-server.js

timeout /t 3 >nul

echo.
echo PASOS PARA INSTALAR EN EXCEL:
echo.
echo 1. Abra Excel
echo 2. Vaya a: Insertar ^> Complementos ^> Mis complementos
echo 3. Haga clic en "Cargar mi complemento"
echo 4. Seleccione el archivo: %CD%\excel-addon-manifest.xml
echo 5. BERT v3.0 aparecera como panel lateral en Excel
echo.
echo Servicios ejecutandose en:
echo   - BERT API: http://localhost:3000
echo   - Herramientas: http://localhost:8080
echo.
echo Presione cualquier tecla para abrir Excel...
pause >nul

start excel.exe