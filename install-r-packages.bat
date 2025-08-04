@echo off
echo Instalando paquetes R críticos...
"C:\Program Files\R\R-4.4.1\bin\Rscript.exe" -e "install.packages(c('tseries', 'jsonlite'), repos='https://cloud.r-project.org', dependencies=TRUE)"
echo Instalación completada.
pause