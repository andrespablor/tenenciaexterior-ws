# Finnhub WebSocket Relay Server

Servidor que mantiene UNA sola conexión a Finnhub y redistribuye los datos a múltiples clientes.

## Arquitectura

```
        Finnhub WebSocket
              ↑
    1 conexión (tu API key)
              |
    [Relay Server en Fly.io]
            /   \
      Cliente 1  Cliente 2
       (Vos)    (Otro user)
```

## Deploy en Fly.io (gratis)

### 1. Instalar Fly CLI
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login
```bash
fly auth login
```

### 3. Crear app
```bash
cd server
fly launch --name finnhub-relay --region mia --no-deploy
```

### 4. Configurar API Key
```bash
fly secrets set FINNHUB_API_KEY=tu_api_key_aqui
```

### 5. Deploy
```bash
fly deploy
```

### 6. Tu URL será:
```
wss://finnhub-relay.fly.dev/
```

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `FINNHUB_API_KEY` | Tu API key de Finnhub (requerida) |
| `PORT` | Puerto del servidor (default: 8080) |

## Endpoints

- `GET /` - Status del servidor
- `GET /health` - Health check
- `WebSocket /` - Conexión WebSocket para clientes

## Protocolo WebSocket

### Cliente → Servidor
```json
{"type": "subscribe", "symbol": "AAPL"}
{"type": "unsubscribe", "symbol": "AAPL"}
{"type": "ping"}
```

### Servidor → Cliente
```json
{"type": "status", "connected": true, "symbols": ["AAPL"]}
{"type": "trade", "data": [{"s": "AAPL", "p": 150.5, "t": 1704200000000, "v": 100}]}
{"type": "pong"}
```
