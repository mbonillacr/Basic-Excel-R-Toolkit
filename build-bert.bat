@echo off
echo Compilando BERT.dll...

REM Verificar Visual Studio
where msbuild >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Visual Studio/MSBuild no encontrado
    echo Instale Visual Studio Community 2019 o superior
    pause
    exit /b 1
)

REM Compilar proyecto
cd BERT
msbuild BERT.sln /p:Configuration=Release /p:Platform=x64

if exist "x64\Release\BERT.dll" (
    echo BERT.dll compilado exitosamente
    echo Ubicacion: %CD%\x64\Release\BERT.dll
) else (
    echo ERROR: Compilacion fallida
)

pause