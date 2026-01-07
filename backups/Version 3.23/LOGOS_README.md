# Descarga de Logos desde Finnhub

Este script descarga logos de ~250 empresas usando la API de Finnhub.

## Uso

### 1. Ejecutar el script

```powershell
# En PowerShell (desde la carpeta del proyecto)
.\download_logos.ps1 -ApiKey "TU_FINNHUB_API_KEY"
```

### 2. Características

- **Rate Limiting:** 150 llamadas/minuto (1 cada 400ms)
- **Total:** ~250 logos
  - Dow 30
  - Top 100 S&P 500
  - Empresas latinoamericanas (Argentina, Brasil)
  - ETFs populares
  - Tech stocks importantes

### 3. Progreso

El script muestra:
- ✅ Logos descargados exitosamente
- ❌ Logos no disponibles o errores
- ⏭️ Logos que ya existen (skip)
- Barra de progreso en tiempo real

### 4. Resultado

Los logos se guardan en:
```
AppAn-WebSocket/
└── assets/
    └── logos/
        ├── AAPL.png
        ├── MSFT.png
        ├── YPF.png
        ├── GGAL.png
        └── ...
```

## Tiempo estimado

~250 logos × 400ms = **~100 segundos (1.7 minutos)**

## Notas

- Los logos se descargan una sola vez
- Si ejecutás el script de nuevo, omite los que ya existen
- Si un logo no está disponible en Finnhub, se registra como fallido
- Los archivos PNG son optimizados automáticamente por Finnhub

## Después de descargar

1. Subir a GitHub:
```bash
git add assets/logos/
git commit -m "Added company logos"
git push
```

2. GitHub Pages los servirá automáticamente en:
```
https://andrespablor.github.io/tenenciaexterior-ws/assets/logos/AAPL.png
```

3. Actualizar el código JavaScript para usarlos (próximo paso)
