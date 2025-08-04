# BERT v3.0 - Guía de Usuario

## 🚀 INICIO RÁPIDO (1 PASO)

### Opción 1: Doble clic
1. Haz **doble clic** en `start-bert.bat`
2. Espera a que aparezca "SERVIDOR UNIFICADO"
3. Ve a `http://localhost:3002` en tu navegador

### Opción 2: Línea de comandos
```cmd
start-bert.bat
```

## 📱 APLICACIONES DISPONIBLES

### 🏠 Panel Principal
- **URL:** `http://localhost:3002`
- **Función:** Navegación entre aplicaciones
- **Estado:** Muestra si el servidor está funcionando

### 📊 K-Means + PCA
- **URL:** `http://localhost:3002/kmeans-pca-viz-v2.html`
- **Función:** Análisis de clustering
- **Datos:** Dataset IRIS o archivos propios (CSV/XLSX)

### 📈 Series de Tiempo
- **URL:** `http://localhost:3002/series-tiempo-viz.html`
- **Función:** Análisis temporal y estadístico
- **Datos:** Archivos CSV/TXT con series temporales

## ⚠️ IMPORTANTE

- **NO CIERRES** la ventana del terminal mientras uses BERT
- **UN SOLO SERVIDOR** maneja todas las aplicaciones
- **Para detener:** Presiona `Ctrl + C` en el terminal

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "Puerto 3002 en uso"
```cmd
# Detener procesos en puerto 3002
taskkill /F /IM node.exe
# Reiniciar
start-bert.bat
```

### Error: "No se puede conectar"
1. Verifica que el terminal muestre "SERVIDOR UNIFICADO"
2. Ve a `http://localhost:3002/api/health` para verificar estado
3. Si no funciona, reinicia con `start-bert.bat`

## 📞 SOPORTE

Si tienes problemas:
1. Cierra todas las ventanas de terminal
2. Ejecuta `start-bert.bat` nuevamente
3. Verifica que aparezca el mensaje de éxito