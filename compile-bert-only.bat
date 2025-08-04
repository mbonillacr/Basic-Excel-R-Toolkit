@echo off
echo Compilando solo BERT.dll (sin dependencias)...

cd BERT\BERT
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" BERT.vcxproj /p:Configuration=Release /p:Platform=x64 /p:WindowsTargetPlatformVersion=10.0.26100.0

if exist "x64\Release\BERT.dll" (
    echo BERT.dll compilado exitosamente!
    echo Ubicacion: %CD%\x64\Release\BERT.dll
) else (
    echo Compilacion fallida - verificando dependencias...
    echo.
    echo Instale desde Visual Studio Installer:
    echo - Windows 10/11 SDK
    echo - MSVC v143 - VS 2022 C++ x64/x86 build tools
    echo - CMake tools for Visual Studio
)

pause