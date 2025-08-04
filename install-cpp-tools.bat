@echo off
echo Instalando herramientas de C++ necesarias...

"C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe" modify --installPath "C:\Program Files\Microsoft Visual Studio\2022\Community" --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.Windows10SDK.20348 --add Microsoft.VisualStudio.Component.VC.Redist.14.Latest --quiet

echo Instalacion completada. Compilando BERT...

timeout /t 5 >nul

cd BERT\BERT
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" BERT.vcxproj /p:Configuration=Release /p:Platform=x64 /p:WindowsTargetPlatformVersion=10.0.26100.0

if exist "x64\Release\BERT.dll" (
    echo.
    echo ========================================
    echo BERT.dll compilado exitosamente!
    echo Ubicacion: %CD%\x64\Release\BERT.dll
    echo ========================================
    echo.
    echo Para instalar en Excel:
    echo 1. Cierre Excel
    echo 2. Archivo ^> Opciones ^> Complementos ^> Complementos COM ^> Ir
    echo 3. Agregar... ^> Seleccione: %CD%\x64\Release\BERT.dll
    echo.
) else (
    echo ERROR: Compilacion fallida
    echo Verifique que R este instalado y en PATH
)

pause