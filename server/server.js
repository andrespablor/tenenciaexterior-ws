// ========================================
// FINNHUB WEBSOCKET RELAY SERVER
// Permite múltiples clientes compartir una conexión Finnhub
// ========================================

const WebSocket = require('ws');
const express = require('express');
const http = require('http');

// Configuración
const PORT = process.env.PORT || 8080;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_WS_URL = `wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`;

// Estado global
let finnhubWs = null;
let isConnected = false;
const clients = new Set();
const subscribedSymbols = new Map(); // symbol -> Set of client ws
const priceCache = new Map(); // symbol -> last price data

// ========================================
// Express App (health check)
// ========================================

const app = express();

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        connected: isConnected,
        clients: clients.size,
        symbols: subscribedSymbols.size,
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// CORS headers para WebSocket
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

const server = http.createServer(app);

// ========================================
// WebSocket Server (para clientes)
// ========================================

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    console.log(`[CLIENT] Nueva conexión. Total: ${clients.size + 1}`);
    clients.add(ws);

    // Enviar estado actual al nuevo cliente
    ws.send(JSON.stringify({
        type: 'status',
        connected: isConnected,
        symbols: Array.from(subscribedSymbols.keys())
    }));

    // Enviar cache de precios actual
    priceCache.forEach((data, symbol) => {
        ws.send(JSON.stringify({
            type: 'trade',
            data: [data]
        }));
    });

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            handleClientMessage(ws, msg);
        } catch (e) {
            console.error('[CLIENT] Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`[CLIENT] Desconectado. Quedan: ${clients.size - 1}`);
        clients.delete(ws);

        // Limpiar suscripciones de este cliente
        subscribedSymbols.forEach((subscribers, symbol) => {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
                unsubscribeFromFinnhub(symbol);
                subscribedSymbols.delete(symbol);
            }
        });
    });

    ws.on('error', (error) => {
        console.error('[CLIENT] Error:', error.message);
    });
});

function handleClientMessage(ws, msg) {
    if (msg.type === 'subscribe') {
        const symbol = msg.symbol;
        if (!subscribedSymbols.has(symbol)) {
            subscribedSymbols.set(symbol, new Set());
            subscribeToFinnhub(symbol);
        }
        subscribedSymbols.get(symbol).add(ws);
        console.log(`[SUBSCRIBE] ${symbol} (${subscribedSymbols.get(symbol).size} clients)`);

        // Enviar precio cacheado si existe
        if (priceCache.has(symbol)) {
            ws.send(JSON.stringify({
                type: 'trade',
                data: [priceCache.get(symbol)]
            }));
        }
    } else if (msg.type === 'unsubscribe') {
        const symbol = msg.symbol;
        if (subscribedSymbols.has(symbol)) {
            subscribedSymbols.get(symbol).delete(ws);
            if (subscribedSymbols.get(symbol).size === 0) {
                unsubscribeFromFinnhub(symbol);
                subscribedSymbols.delete(symbol);
            }
        }
    } else if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
    }
}

// ========================================
// Conexión a Finnhub
// ========================================

function connectToFinnhub() {
    if (!FINNHUB_API_KEY) {
        console.error('[FINNHUB] ERROR: FINNHUB_API_KEY no configurada');
        return;
    }

    console.log('[FINNHUB] Conectando...');

    finnhubWs = new WebSocket(FINNHUB_WS_URL);

    finnhubWs.on('open', () => {
        console.log('[FINNHUB] Conectado!');
        isConnected = true;

        // Re-suscribir a todos los símbolos
        subscribedSymbols.forEach((_, symbol) => {
            subscribeToFinnhub(symbol);
        });

        // Notificar a todos los clientes
        broadcast({ type: 'status', connected: true });

        // Iniciar heartbeat
        startHeartbeat();
    });

    finnhubWs.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'trade' && msg.data) {
                // Actualizar cache y broadcast a clientes
                msg.data.forEach(trade => {
                    priceCache.set(trade.s, trade);
                });

                // Enviar a clientes suscritos a estos símbolos
                msg.data.forEach(trade => {
                    const subscribers = subscribedSymbols.get(trade.s);
                    if (subscribers) {
                        const tradeMsg = JSON.stringify({
                            type: 'trade',
                            data: [trade]
                        });
                        subscribers.forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(tradeMsg);
                            }
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[FINNHUB] Error parsing message:', e);
        }
    });

    finnhubWs.on('close', (code, reason) => {
        console.log(`[FINNHUB] Desconectado. Code: ${code}`);
        isConnected = false;
        broadcast({ type: 'status', connected: false });

        // Reconectar después de 5 segundos
        setTimeout(connectToFinnhub, 5000);
    });

    finnhubWs.on('error', (error) => {
        console.error('[FINNHUB] Error:', error.message);
    });
}

function subscribeToFinnhub(symbol) {
    if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
        finnhubWs.send(JSON.stringify({ type: 'subscribe', symbol }));
        console.log(`[FINNHUB] Suscrito a ${symbol}`);
    }
}

function unsubscribeFromFinnhub(symbol) {
    if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
        finnhubWs.send(JSON.stringify({ type: 'unsubscribe', symbol }));
        console.log(`[FINNHUB] Desuscrito de ${symbol}`);
    }
}

function broadcast(msg) {
    const data = JSON.stringify(msg);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

let heartbeatInterval = null;
function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);

    heartbeatInterval = setInterval(() => {
        if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
            finnhubWs.send(JSON.stringify({ type: 'ping' }));
        }
    }, 30000);
}

// ========================================
// Iniciar servidor
// ========================================

server.listen(PORT, () => {
    console.log(`[SERVER] Escuchando en puerto ${PORT}`);
    console.log(`[SERVER] Health check: http://localhost:${PORT}/health`);

    // Conectar a Finnhub
    connectToFinnhub();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SERVER] Cerrando...');
    wss.close();
    if (finnhubWs) finnhubWs.close();
    server.close();
    process.exit(0);
});
