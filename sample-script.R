# Script de ejemplo para BERT v3.0
# Funciones de análisis estadístico con visualización

library(ggplot2)
library(plotly)
library(stargazer)

# Función para análisis descriptivo
analisis_descriptivo <- function(data) {
    summary_stats <- summary(data)
    return(summary_stats)
}

# Función para regresión lineal con Stargazer
regresion_lineal <- function(data) {
    if (ncol(data) < 2) {
        return("Error: Se requieren al menos 2 columnas")
    }
    
    # Asumir primera columna como Y, segunda como X
    modelo <- lm(data[,1] ~ data[,2])
    
    # Generar tabla con stargazer
    stargazer(modelo, type = "html", 
              title = "Resultados de Regresión Lineal",
              align = TRUE)
}

# Función para gráfico interactivo con Plotly
grafico_dispersion <- function(data) {
    if (ncol(data) < 2) {
        return("Error: Se requieren al menos 2 columnas")
    }
    
    # Crear gráfico ggplot
    p <- ggplot(data, aes(x = data[,2], y = data[,1])) +
        geom_point(color = "#58a6ff", size = 3, alpha = 0.7) +
        geom_smooth(method = "lm", color = "#f85149", se = TRUE) +
        labs(
            title = "Gráfico de Dispersión",
            x = "Variable X",
            y = "Variable Y"
        ) +
        theme_minimal() +
        theme(
            plot.background = element_rect(fill = "#0d1117"),
            panel.background = element_rect(fill = "#161b22"),
            text = element_text(color = "#c9d1d9"),
            axis.text = element_text(color = "#c9d1d9"),
            panel.grid = element_line(color = "#30363d")
        )
    
    # Convertir a Plotly para interactividad
    ggplotly(p)
}

# Función para análisis de correlación
matriz_correlacion <- function(data) {
    # Seleccionar solo columnas numéricas
    numeric_data <- data[sapply(data, is.numeric)]
    
    if (ncol(numeric_data) < 2) {
        return("Error: Se requieren al menos 2 variables numéricas")
    }
    
    cor_matrix <- cor(numeric_data, use = "complete.obs")
    return(cor_matrix)
}

# Función para histograma interactivo
histograma_interactivo <- function(data) {
    if (ncol(data) < 1) {
        return("Error: Se requiere al menos 1 columna")
    }
    
    # Usar primera columna numérica
    numeric_col <- data[,1]
    if (!is.numeric(numeric_col)) {
        return("Error: La primera columna debe ser numérica")
    }
    
    p <- ggplot(data, aes(x = numeric_col)) +
        geom_histogram(bins = 30, fill = "#238636", alpha = 0.7, color = "#30363d") +
        labs(
            title = "Distribución de Datos",
            x = "Valores",
            y = "Frecuencia"
        ) +
        theme_minimal() +
        theme(
            plot.background = element_rect(fill = "#0d1117"),
            panel.background = element_rect(fill = "#161b22"),
            text = element_text(color = "#c9d1d9"),
            axis.text = element_text(color = "#c9d1d9"),
            panel.grid = element_line(color = "#30363d")
        )
    
    ggplotly(p)
}