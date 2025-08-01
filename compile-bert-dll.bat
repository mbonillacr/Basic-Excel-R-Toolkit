@echo off
echo Compilando BERT.dll para Excel...

REM Buscar Visual Studio
set "VS_PATH="
if exist "C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe" (
    set "VS_PATH=C:\Program Files (x86)\Microsoft Visual Studio\2019\Community\MSBuild\Current\Bin\MSBuild.exe"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" (
    set "VS_PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
)

if "%VS_PATH%"=="" (
    echo ERROR: Visual Studio no encontrado
    echo Instale Visual Studio Community con C++ tools
    echo Descarga: https://visualstudio.microsoft.com/vs/community/
    pause
    exit /b 1
)

REM Compilar
cd BERT
"%VS_PATH%" BERT.sln /p:Configuration=Release /p:Platform=x64

if exist "x64\Release\BERT.dll" (
    echo.
    echo ========================================
    echo BERT.dll compilado exitosamente!
    echo Ubicacion: %CD%\x64\Release\BERT.dll
    echo ========================================
    echo.
    echo PASOS PARA INSTALAR EN EXCEL:
    echo 1. Cierre Excel completamente
    echo 2. Abra Excel
    echo 3. Archivo ^> Opciones ^> Complementos
    echo 4. Administrar: Complementos COM ^> Ir...
    echo 5. Agregar... ^> Seleccione: %CD%\x64\Release\BERT.dll
    echo 6. Reinicie Excel
    echo.
    echo Sus funciones .R estaran disponibles en Excel
    echo.
) else (
    echo ERROR: Compilacion fallida
    echo Verifique que tenga las herramientas de C++ instaladas
)

pause