# Version 3.30 - Server-Side Caching Complete

## Fecha: 7 de enero de 2026

## Cambios Principales

### ✅ Server-Side Caching Implementado
- **Servidor en Render.com** (`tenenciaexterior-ws.onrender.com`)
- Cache inteligente con TTL configurables:
  - Precios: 4 horas
  - Daily Data (52-wk, volume): 24 horas
  - Indicadores (MACD): 5 minutos
  - SMA: 24 horas

### ✅ Detección de Cambio de Día
- Frontend detecta cuando cambió el día y fuerza actualización
- Server-side cache expira automáticamente cada 4 horas
- Garantiza datos frescos cada mañana

### ✅ MACD Funcionando
- Endpoint `/api/indicators/:symbol` devuelve MACD
- Frontend guarda correctamente el valor en priceCache
- Columna MACD se llena con datos del servidor

### ✅ Correcciones
- Previous close correcto (no after-hours)
- Volumen actualizado diariamente
- SMA 200 desde servidor
- 52-week range actualizado

## Archivos del Servidor

### Nuevos:
- `server/cache.js` - Sistema de caché in-memory con TTL
- `server/finnhub-client.js` - Cliente centralizado de Finnhub API
- `server/api-routes.js` - Endpoints REST API
- `server/.env` - Variables de entorno (FINNHUB_API_KEY)
- `server/.gitignore` - Ignora node_modules y .env

### Modificados:
- `server/server.js` - Integra API routes y CORS
- `server/package.json` - Agrega node-fetch y dotenv

## Archivos Frontend

### Modificados:
- `config.js` - Agrega SERVER_API_URL
- `api.js` - Llama a server endpoints en vez de Finnhub directo
- `service-worker.js` - Versión 3.30
- `index.html` - Cache-busting en api.js, versión 3.30
- `calculations.js` - Removidos logs de debug

## Endpoints del Servidor

- `GET /api/price/:symbol` - Precio actual y previous close
- `GET /api/daily/:symbol` - 52-week range, volumen, precio histórico
- `GET /api/indicators/:symbol` - MACD
- `GET /api/sma/:symbol?period=200` - SMA
- `GET /api/cache/stats` - Estadísticas del caché
- `POST /api/cache/clear` - Limpiar caché

## Deployment

### Render.com
- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment Variables**: 
  - `FINNHUB_API_KEY`
  - `PORT=10000`

### GitHub Pages
- Frontend desplegado en `https://andrespablor.github.io/tenenciaexterior-ws/`

## Próximos Pasos

1. Monitorear performance del servidor en Render
2. Ajustar TTLs si es necesario
3. Agregar más indicadores si se requieren
4. Considerar base de datos para caché persistente (opcional)

## Estado

✅ Todo funcionando correctamente
✅ CORS resuelto
✅ Rate limiting resuelto
✅ MACD funcionando
✅ Datos frescos diariamente
