# 📊 Portfolio Tracker - Cartera Exterior

Aplicación web para seguimiento de inversiones en acciones extranjeras con sincronización en la nube.

## 🚀 Características

- **Gestión de Portfolio**: Compras, ventas y dividendos
- **Precios en tiempo real**: Integración con Finnhub API
- **Sincronización en la nube**: Google Sheets como backend
- **Watchlist**: Seguimiento de acciones de interés
- **Alertas de precios**: Notificaciones configurables
- **Estadísticas**: Gráficos de evolución y distribución por sector
- **Year-End Reset**: Cierre anual con resultados fijos

## 📁 Estructura del Proyecto

```
├── index.html          # Página principal
├── config.js           # Configuración y estado global
├── app.js              # Lógica principal
├── api.js              # Integración con APIs (Finnhub, Yahoo)
├── calculations.js     # Cálculos de portfolio
├── charts.js           # Gráficos (Chart.js)
├── storage.js          # Persistencia (Local/Sheets)
├── ui.js               # Renderizado de UI
├── utils.js            # Utilidades
└── styles.css          # Estilos
```

## ⚙️ Configuración

1. Obtén una API key gratuita en [Finnhub](https://finnhub.io/register)
2. Configura tu Google Apps Script para sincronización (opcional)
3. Abre `index.html` en tu navegador

## 🔧 Tecnologías

- Vanilla JavaScript (ES6+)
- Chart.js para gráficos
- Google Apps Script para backend
- GitHub Pages para hosting

## 📈 Versión

**v3.0** - 02/01/2026

### Changelog reciente:
- ✅ Rate limiting para API (evita bloqueos)
- ✅ Modularización: `charts.js` extraído de `app.js`
- ✅ Year-end reset 2025 con resultados fijos
- ✅ 2026 inicia desde $0
- ✅ Snapshot diario automático

## 📄 Licencia

Proyecto personal - Uso privado
