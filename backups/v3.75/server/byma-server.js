// ========================================
// BYMA WEBSOCKET SERVER
// Servidor relay para Market Data de BYMA
// ========================================

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

// Configuración
const PORT = process.env.PORT || 8080;
const BYMA_WS_URL = 'ws://fix.rava.com:6464';

// Estado global
let bymaWs = null;
let isConnected = false;
const clients = new Set();
const priceCache = new Map(); // symbol -> last price data
const symbolStats = new Map(); // symbol -> { count, lastUpdate }
const referenceClose = new Map(); // symbol -> first price received (used as reference for % calculation)

// ========================================
// Express App
// ========================================

const app = express();

// JSON parsing middleware
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// API: Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        bymaConnected: isConnected,
        clients: clients.size,
        cachedSymbols: priceCache.size,
        uptime: process.uptime()
    });
});

// API: Obtener todos los precios cacheados
app.get('/api/prices', (req, res) => {
    const prices = Array.from(priceCache.entries()).map(([symbol, data]) => ({
        symbol,
        ...data
    }));
    res.json(prices);
});

// API: Obtener precio de un símbolo específico
app.get('/api/price/:symbol', (req, res) => {
    const { symbol } = req.params;
    const data = priceCache.get(symbol.toUpperCase());
    if (data) {
        res.json({ symbol, ...data });
    } else {
        res.status(404).json({ error: 'Symbol not found' });
    }
});

// API: Estadísticas
app.get('/api/stats', (req, res) => {
    const stats = {
        totalSymbols: priceCache.size,
        totalUpdates: Array.from(symbolStats.values()).reduce((sum, s) => sum + s.count, 0),
        topSymbols: Array.from(symbolStats.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([symbol, data]) => ({ symbol, updates: data.count }))
    };
    res.json(stats);
});

const server = http.createServer(app);

// ========================================
// WebSocket Server (para clientes web)
// ========================================

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
    console.log(`[CLIENT] Nueva conexión. Total: ${clients.size + 1}`);
    clients.add(ws);

    // Enviar estado actual
    ws.send(JSON.stringify({
        type: 'status',
        connected: isConnected,
        symbols: priceCache.size
    }));

    // Enviar cache de precios actual (últimos 100)
    const recentPrices = Array.from(priceCache.entries()).slice(-100);
    recentPrices.forEach(([symbol, data]) => {
        ws.send(JSON.stringify({
            type: 'price',
            symbol,
            ...data
        }));
    });

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (e) {
            console.error('[CLIENT] Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log(`[CLIENT] Desconectado. Quedan: ${clients.size - 1}`);
        clients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('[CLIENT] Error:', error.message);
    });
});

// ========================================
// Conexión a BYMA
// ========================================

function connectToBYMA() {
    console.log('[BYMA] Conectando...');

    bymaWs = new WebSocket(BYMA_WS_URL);

    bymaWs.on('open', () => {
        console.log('[BYMA] ✅ Conectado!');
        isConnected = true;
        broadcast({ type: 'status', connected: true });
    });

    bymaWs.on('message', (data) => {
        try {
            const rawMsg = data.toString();
            let msg;

            try {
                msg = JSON.parse(rawMsg);
            } catch (e) {
                // Si no es JSON válido, intentar con regex como fallback
                const matches = {
                    symbol: rawMsg.match(/"Symbol":\s*"([^"]+)"/),
                    mdEntryPx: rawMsg.match(/"MDEntryPx":\s*"([^"]+)"/),
                    mdEntryType: rawMsg.match(/"MDEntryType":\s*"([^"]+)"/),
                    mdEntrySize: rawMsg.match(/"MDEntrySize":\s*"([^"]+)"/)
                };
                if (matches.symbol && matches.mdEntryPx) {
                    processEntry({
                        Symbol: matches.symbol[1],
                        MDEntryPx: matches.mdEntryPx[1],
                        MDEntryType: matches.mdEntryType ? matches.mdEntryType[1] : '2',
                        MDEntrySize: matches.mdEntrySize ? matches.mdEntrySize[1] : null
                    });
                }
                return;
            }

            // Procesar según tipo de mensaje
            if (msg.MsgType === 'W') {
                // Full Refresh - snapshot completo
                const symbol = msg.Symbol || msg.SecurityID;
                if (symbol && msg.Entries) {
                    msg.Entries.forEach(entry => {
                        entry.Symbol = entry.Symbol || symbol;
                        processEntry(entry);
                    });
                }
            } else if (msg.MsgType === 'X') {
                // Incremental Refresh
                if (msg.Entries) {
                    msg.Entries.forEach(entry => {
                        if (entry.Symbol || entry.SecurityID) {
                            processEntry(entry);
                        }
                    });
                }
            } else if (msg.MsgType === 'h') {
                // Trading Session Status - reference data
                console.log('[BYMA] Trading Session:', msg.TradingSessionID || 'unknown');
            } else if (msg.MsgType === 'y') {
                // Security List
                console.log('[BYMA] Security List received');
            }

        } catch (e) {
            // Ignorar errores de parsing silenciosamente
        }
    });

    // Procesar una entrada individual de market data
    function processEntry(entry) {
        const symbol = entry.Symbol || entry.SecurityID;
        if (!symbol) return;

        const price = parseFloat(entry.MDEntryPx) || 0;
        if (price === 0) return;

        const entryType = entry.MDEntryType;
        const size = entry.MDEntrySize ? parseInt(entry.MDEntrySize) : null;

        const newPrice = price;

        // Get existing data for this symbol
        const existing = priceCache.get(symbol) || {};

        // Determine the effective "Last Price" (only Trade or Close updates this)
        let effectivePrice = existing.price || 0;

        // If it's a Trade (2) or Close (5), update the official price
        if (entryType === '2' || entryType === '5') {
            effectivePrice = newPrice;
        } else if (effectivePrice === 0 && (entryType === 'e' || entryType === '4')) {
            // Fallback: use PrevClose or Open if we have no price yet
            effectivePrice = newPrice;
        }

        const prevPrice = existing.price || effectivePrice;

        // Store first price as reference close if not set (prefer 'e')
        if (!referenceClose.has(symbol)) {
            // Only set reference if it's a valid price type or prev close
            if (['2', '5', 'e', '4'].includes(entryType)) {
                referenceClose.set(symbol, newPrice);
            }
        }

        // Use reference close for percentage calculation
        const refClose = referenceClose.get(symbol);
        const changeFromRef = effectivePrice - refClose;
        const changePercentFromRef = refClose ? ((changeFromRef / refClose) * 100) : 0;

        // Determine direction for flash animation
        let direction = 'same';
        if (effectivePrice > prevPrice) direction = 'up';
        else if (effectivePrice < prevPrice) direction = 'down';

        // Handle special entry types for volume (B) - MDEntryPx=volnominal, MDEntrySize=volefectivo
        let volNominal = existing.volNominal || 0;
        let volEfectivo = existing.volEfectivo || 0;
        let operaciones = existing.operaciones || 0;

        if (entryType === 'B') {
            volNominal = parseFloat(entry.MDEntryPx) || volNominal;
            volEfectivo = parseFloat(entry.MDEntrySize) || volEfectivo;
            operaciones = parseInt(entry.NumberOfOrders) || operaciones;
        }

        // Handle previous close (e) - use for accurate % calculation
        let previousClose = existing.previousClose || null;
        if (entryType === 'e') {
            previousClose = newPrice;
            // Update referenceClose with actual previous close
            referenceClose.set(symbol, newPrice);
        }

        // Use previousClose for % calculation if available
        const baseForPercent = previousClose || refClose;
        const changeFromBase = effectivePrice - baseForPercent;
        const changePercentFromBase = baseForPercent ? ((changeFromBase / baseForPercent) * 100) : 0;

        // MDEntryType: 0=Bid, 1=Ask, 2=Trade, 4=Open, 5=Close, 7=High, 8=Low, e=PrevClose, B=Volume
        const priceData = {
            price: effectivePrice, // Use the stable effective price
            prevPrice: prevPrice,
            previousClose: previousClose,
            referenceClose: refClose,
            change: changeFromBase,
            changePercent: changePercentFromBase,
            direction: direction,
            size: size || existing.size,
            entryType: entryType,
            bid: entryType === '0' ? newPrice : (existing.bid || null),
            ask: entryType === '1' ? newPrice : (existing.ask || null),
            last: entryType === '2' ? newPrice : (existing.last || newPrice),
            open: entryType === '4' ? newPrice : (existing.open || null),
            close: entryType === '5' ? newPrice : (existing.close || null),
            high: entryType === '7' ? newPrice : (existing.high || null),
            low: entryType === '8' ? newPrice : (existing.low || null),
            volNominal: volNominal,
            volEfectivo: volEfectivo,
            operaciones: operaciones,
            volume: existing.volume || 0,
            exchange: entry.SecurityExchange || existing.exchange || 'XMEV',
            securityType: entry.SecurityType || existing.securityType || null,
            timestamp: Date.now()
        };

        // Track daily high/low
        // Only update High/Low on Trades (2) or explicit High (7) / Low (8) updates
        if (entryType === '2' || entryType === '7') {
            if (!existing.high || newPrice > existing.high) priceData.high = newPrice;
        }
        if (entryType === '2' || entryType === '8') {
            if (!existing.low || (existing.low && newPrice < existing.low)) priceData.low = newPrice;
        }

        // Accumulate volume on trades
        if (entryType === '2' && size) {
            priceData.volume = (existing.volume || 0) + size;
        }

        // Update cache
        priceCache.set(symbol, priceData);

        // Update stats
        const stats = symbolStats.get(symbol) || { count: 0, lastUpdate: 0 };
        stats.count++;
        stats.lastUpdate = Date.now();
        symbolStats.set(symbol, stats);

        // Broadcast to clients
        broadcast({
            type: 'price',
            symbol,
            ...priceData
        });
    }

    bymaWs.on('close', (code, reason) => {
        console.log(`[BYMA] Desconectado. Code: ${code}`);
        isConnected = false;
        broadcast({ type: 'status', connected: false });

        // Reconectar después de 5 segundos
        setTimeout(connectToBYMA, 5000);
    });

    bymaWs.on('error', (error) => {
        console.error('[BYMA] Error:', error.message);
    });
}

function broadcast(msg) {
    const data = JSON.stringify(msg);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// ========================================
// Iniciar servidor
// ========================================

server.listen(PORT, () => {
    console.log(`[SERVER] Escuchando en puerto ${PORT}`);
    console.log(`[SERVER] Web UI: http://localhost:${PORT}`);
    console.log(`[SERVER] API: http://localhost:${PORT}/api/health`);

    // Conectar a BYMA
    connectToBYMA();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SERVER] Cerrando...');
    wss.close();
    if (bymaWs) bymaWs.close();
    server.close();
    process.exit(0);
});
