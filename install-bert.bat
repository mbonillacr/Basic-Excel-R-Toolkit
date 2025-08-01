@echo off
echo Instalando BERT v3.0 para Excel...

REM Verificar si Excel está cerrado
tasklist /FI "IMAGENAME eq EXCEL.EXE" 2>NUL | find /I /N "EXCEL.EXE">NUL
if "%ERRORLEVEL%"=="0" (
    echo ERROR: Cierre Excel antes de continuar la instalacion.
    pause
    exit /b 1
)

REM Crear directorio de instalación
if not exist "%APPDATA%\BERT" mkdir "%APPDATA%\BERT"

REM Copiar archivos
xcopy /Y /E "BERT\*" "%APPDATA%\BERT\"
xcopy /Y /E "Build\*" "%APPDATA%\BERT\"

REM Registrar el add-in
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\Excel\Addins\BERT" /v "Description" /t REG_SZ /d "Basic Excel R Toolkit v3.0" /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\Excel\Addins\BERT" /v "FriendlyName" /t REG_SZ /d "BERT v3.0" /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\Excel\Addins\BERT" /v "LoadBehavior" /t REG_DWORD /d 3 /f
reg add "HKEY_CURRENT_USER\Software\Microsoft\Office\Excel\Addins\BERT" /v "Manifest" /t REG_SZ /d "%APPDATA%\BERT\bert-manifest.xml" /f

echo BERT v3.0 instalado correctamente.
echo Abra Excel y vaya a Archivo > Opciones > Complementos > Administrar: Complementos COM > Ir...
echo Haga clic en "Agregar..." y seleccione: %APPDATA%\BERT\BERT.dll
pause