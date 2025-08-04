@echo off
set R_EXE="C:\Program Files\R\R-4.4.1\bin\Rscript.exe"
echo Instalando paquetes R...
%R_EXE% -e "install.packages(c('tseries', 'jsonlite'), repos='https://cloud.r-project.org')"
echo Verificando instalacion...
%R_EXE% -e "library(tseries); library(jsonlite); cat('OK')"
pause