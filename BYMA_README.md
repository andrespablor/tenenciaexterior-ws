# 📈 BYMA Market Data - WebSocket Server

Servidor WebSocket para recibir datos de mercado en tiempo real de BYMA (Bolsa y Mercados Argentinos).

## 🚀 Inicio Rápido

```bash
cd server
node byma-server.js
```

Luego abre tu navegador en: **http://localhost:8080**

## 📊 Características

- ✅ **Datos en tiempo real** de BYMA vía WebSocket
- ✅ **Interfaz web moderna** con tema oscuro
- ✅ **Filtros avanzados** por símbolo, tipo y liquidación
- ✅ **API REST** para integración
- ✅ **Caché de precios** en memoria
- ✅ **Reconexión automática**

## 🌐 Interfaz Web

La interfaz web muestra:
- **Símbolos**: Acciones, bonos, CEDEARs, ETFs
- **Precios en tiempo real**: BID, OFFER, TRADE, OPEN
- **Cantidades** y posiciones en el libro
- **Tipos de liquidación**: CI (Contado Inmediato), 24hs, 48hs
- **Estadísticas**: Total de símbolos y actualizaciones

### Filtros Disponibles:
- 🔍 **Búsqueda por símbolo** (ej: GGAL, AL30, AAPL)
- 📊 **Tipo de entrada**: BID, OFFER, TRADE, OPEN
- 💰 **Tipo de liquidación**: CI, 24hs, 48hs

## 🔌 API REST

### Health Check
```
GET /api/health
```
Respuesta:
```json
{
  "status": "online",
  "bymaConnected": true,
  "clients": 2,
  "cachedSymbols": 700,
  "uptime": 12345
}
```

### Obtener Todos los Precios
```
GET /api/prices
```
Respuesta:
```json
[
  {
    "symbol": "GGAL",
    "price": 8.555,
    "size": 2539,
    "entryType": "0",
    "settlType": "1",
    "timestamp": 1704200000000
  },
  ...
]
```

### Obtener Precio de un Símbolo
```
GET /api/price/:symbol
```
Ejemplo: `GET /api/price/GGAL`

### Estadísticas
```
GET /api/stats
```
Respuesta:
```json
{
  "totalSymbols": 700,
  "totalUpdates": 50000,
  "topSymbols": [
    { "symbol": "AL30", "updates": 1234 },
    { "symbol": "GGAL", "updates": 987 }
  ]
}
```

## 📡 WebSocket Protocol

### Cliente → Servidor
```json
{ "type": "ping" }
```

### Servidor → Cliente

**Status Update:**
```json
{
  "type": "status",
  "connected": true,
  "symbols": 700
}
```

**Price Update:**
```json
{
  "type": "price",
  "symbol": "GGAL",
  "price": 8.555,
  "size": 2539,
  "entryType": "0",
  "position": 1,
  "settlType": "1",
  "exchange": "XMEV",
  "securityType": "CS",
  "timestamp": 1704200000000
}
```

## 📋 Tipos de Entrada (entryType)

| Código | Descripción |
|--------|-------------|
| 0 | BID (Compra) |
| 1 | OFFER (Venta) |
| 2 | TRADE (Operación) |
| 4 | OPEN (Apertura) |
| 5 | CLOSE (Cierre) |
| 7 | HIGH (Máximo) |
| 8 | LOW (Mínimo) |
| B | VOLUME (Volumen) |

## 💱 Tipos de Liquidación (settlType)

| Código | Descripción |
|--------|-------------|
| 0 | Regular |
| 1 | CI (Contado Inmediato) |
| 2 | 24hs |
| 3 | 48hs |

## 🏗️ Arquitectura

```
BYMA WebSocket (fix.rava.com:6464)
          ↓
    [byma-server.js]
     ↓           ↓
  WebSocket    REST API
     ↓           ↓
  Clientes    Integraciones
```

## 📁 Estructura de Archivos

```
server/
├── byma-server.js      # Servidor principal
├── byma-final.js       # Cliente CLI (standalone)
├── byma-fix-client.js  # Cliente FIX (clase reutilizable)
└── package.json

public/
├── index.html          # Interfaz web
├── styles.css          # Estilos
└── app.js              # Lógica del cliente
```

## 🔧 Configuración

El servidor usa las siguientes variables de entorno (opcionales):

```bash
PORT=8080  # Puerto del servidor (default: 8080)
```

## 📝 Ejemplos de Símbolos

### Acciones Locales
- **GGAL** - Grupo Financiero Galicia
- **YPFD** - YPF
- **PAMP** - Pampa Energía

### CEDEARs (ADRs argentinos)
- **AAPL** - Apple
- **GOOGL** - Google
- **MSFT** - Microsoft
- **AMZN** - Amazon
- **NFLX** - Netflix

### Bonos
- **AL30** - Bono Argentina 2030
- **GD30** - Bono Global 2030
- **GD35** - Bono Global 2035

### ETFs
- **XLF** - Financial Select Sector SPDR
- **XLK** - Technology Select Sector SPDR
- **DIA** - Dow Jones Industrial Average

## 🛠️ Desarrollo

### Ejecutar en modo desarrollo:
```bash
node byma-server.js
```

### Ver logs en tiempo real:
Los datos se guardan automáticamente en `byma-data.log`

### Probar el WebSocket:
```bash
node byma-final.js
```

## 📊 Performance

- **Latencia**: < 100ms desde BYMA
- **Throughput**: ~100-200 mensajes/segundo
- **Símbolos únicos**: 700+
- **Clientes simultáneos**: Ilimitado (limitado por RAM)

## 🐛 Troubleshooting

### El servidor no se conecta a BYMA
- Verificar que `ws://fix.rava.com:6464` esté accesible
- Revisar firewall/antivirus

### La interfaz web no muestra datos
- Verificar que el servidor esté corriendo
- Abrir la consola del navegador (F12) para ver errores
- Verificar que WebSocket esté conectado (debe decir "Conectado" en verde)

### Los precios no se actualizan
- Refrescar la página (F5)
- Verificar la conexión a BYMA en `/api/health`

## 📄 Licencia

Proyecto personal - Uso privado

## 🙏 Créditos

Datos provistos por BYMA (Bolsa y Mercados Argentinos)
