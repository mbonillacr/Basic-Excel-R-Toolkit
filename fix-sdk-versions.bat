@echo off
echo Actualizando versiones de Windows SDK...

REM Actualizar todos los archivos .vcxproj para usar SDK disponible
powershell -Command "(Get-Content 'Ribbon\BERTRibbon2.vcxproj') -replace '10.0.14393.0', '10.0.26100.0' | Set-Content 'Ribbon\BERTRibbon2.vcxproj'"
powershell -Command "(Get-Content 'ControlR\ControlR.vcxproj') -replace '10.0.16299.0', '10.0.26100.0' | Set-Content 'ControlR\ControlR.vcxproj'"
powershell -Command "(Get-Content 'ControlJulia\ControlJulia.vcxproj') -replace '10.0.16299.0', '10.0.26100.0' | Set-Content 'ControlJulia\ControlJulia.vcxproj'"
powershell -Command "(Get-Content 'ControlJulia-0.7\ControlJulia07.vcxproj') -replace '10.0.16299.0', '10.0.26100.0' | Set-Content 'ControlJulia-0.7\ControlJulia07.vcxproj'"

echo Versiones de SDK actualizadas a 10.0.26100.0
echo Compilando BERT.dll...

cd BERT
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" BERT.sln /p:Configuration=Release /p:Platform=x64

if exist "x64\Release\BERT.dll" (
    echo.
    echo ========================================
    echo BERT.dll compilado exitosamente!
    echo Ubicacion: %CD%\x64\Release\BERT.dll
    echo ========================================
) else (
    echo ERROR: Compilacion fallida
)

pause