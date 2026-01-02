// ========================================
// FINNHUB-WS.JS - WebSocket Manager
// Precios en tiempo real via Finnhub o Relay Server
// ========================================

// Estado del WebSocket
let finnhubWs = null;
let wsConnected = false;
let wsReconnectAttempts = 0;
let wsReconnectTimeout = null;
let wsHeartbeatInterval = null;
let subscribedSymbols = new Set();

// Configuración
const WS_CONFIG = {
    // Relay server (si está configurado, se usa en lugar de conexión directa a Finnhub)
    // Cambiar esta URL después de deployar en Fly.io
    relayServer: '', // Ejemplo: 'wss://finnhub-relay.fly.dev'

    // Directo a Finnhub (fallback si no hay relay)
    endpoint: 'wss://ws.finnhub.io',

    heartbeatInterval: 30000,      // 30 segundos
    reconnectBaseDelay: 1000,      // 1 segundo inicial
    reconnectMaxDelay: 30000,      // 30 segundos máximo
    maxReconnectAttempts: 10,
    updateThrottle: 1000           // Throttle UI a 1 update/segundo
};

// Timestamps para throttling por símbolo
const lastPriceUpdate = {};

// ========================================
// Gestión de Conexión
// ========================================

function connectFinnhubWebSocket() {
    // Determinar si usar relay o conexión directa
    const useRelay = WS_CONFIG.relayServer && WS_CONFIG.relayServer.length > 0;

    if (!useRelay) {
        // Conexión directa requiere API key
        const apiKey = appSettings?.finnhubApiKey;
        if (!apiKey) {
            console.warn('⚠️ Finnhub API key no configurada. WebSocket deshabilitado.');
            updateConnectionStatus('disconnected', 'Sin API key');
            return;
        }
    }

    // Cerrar conexión existente si hay
    if (finnhubWs) {
        finnhubWs.close();
    }

    // URL de conexión
    let wsUrl;
    if (useRelay) {
        wsUrl = WS_CONFIG.relayServer;
        console.log('🔌 Conectando a Relay Server...');
    } else {
        wsUrl = `${WS_CONFIG.endpoint}?token=${appSettings.finnhubApiKey}`;
        console.log('🔌 Conectando a Finnhub WebSocket...');
    }

    updateConnectionStatus('connecting', 'Conectando...');

    try {
        finnhubWs = new WebSocket(wsUrl);

        finnhubWs.onopen = handleWsOpen;
        finnhubWs.onmessage = handleWsMessage;
        finnhubWs.onerror = handleWsError;
        finnhubWs.onclose = handleWsClose;

    } catch (error) {
        console.error('❌ Error de conexión WebSocket:', error);
        updateConnectionStatus('error', error.message);
        scheduleReconnect();
    }
}

function disconnectFinnhubWebSocket() {
    if (wsHeartbeatInterval) {
        clearInterval(wsHeartbeatInterval);
        wsHeartbeatInterval = null;
    }
    if (wsReconnectTimeout) {
        clearTimeout(wsReconnectTimeout);
        wsReconnectTimeout = null;
    }
    if (finnhubWs) {
        finnhubWs.close();
        finnhubWs = null;
    }
    wsConnected = false;
    subscribedSymbols.clear();
    updateConnectionStatus('disconnected', 'Desconectado');
}

// ========================================
// Event Handlers
// ========================================

function handleWsOpen() {
    console.log('✅ Finnhub WebSocket conectado!');
    wsConnected = true;
    wsReconnectAttempts = 0;
    updateConnectionStatus('connected', 'En vivo');

    // Detener REST polling si estaba activo
    stopRestPolling();

    // Iniciar heartbeat
    startHeartbeat();

    // Re-suscribirse a todos los símbolos
    resubscribeAll();
}

function handleWsMessage(event) {
    try {
        const data = JSON.parse(event.data);

        if (data.type === 'trade' && data.data) {
            // Procesar actualizaciones de trades
            data.data.forEach(trade => {
                const symbol = trade.s;
                const price = trade.p;
                const timestamp = trade.t;
                const volume = trade.v;

                // Throttle updates por símbolo
                const now = Date.now();
                if (lastPriceUpdate[symbol] && (now - lastPriceUpdate[symbol]) < WS_CONFIG.updateThrottle) {
                    return; // Saltar, muy pronto
                }
                lastPriceUpdate[symbol] = now;

                // Actualizar cache de precios
                updatePriceFromWebSocket(symbol, price, timestamp, volume);
            });
        } else if (data.type === 'ping') {
            // Responder al ping
            finnhubWs.send(JSON.stringify({ type: 'pong' }));
        }
    } catch (error) {
        console.error('❌ Error parseando mensaje WebSocket:', error);
    }
}

function handleWsError(error) {
    console.error('❌ Error WebSocket:', error);
    updateConnectionStatus('error', 'Error de conexión');
}

function handleWsClose(event) {
    console.log(`🔌 WebSocket cerrado. Código: ${event.code}, Razón: ${event.reason}`);
    wsConnected = false;
    updateConnectionStatus('disconnected', 'Desconectado');

    // Detener heartbeat
    if (wsHeartbeatInterval) {
        clearInterval(wsHeartbeatInterval);
        wsHeartbeatInterval = null;
    }

    // Programar reconexión si no fue cierre intencional
    if (event.code !== 1000) {
        scheduleReconnect();
    }
}

// ========================================
// Gestión de Suscripciones
// ========================================

function subscribeSymbol(symbol) {
    if (!symbol || subscribedSymbols.has(symbol)) return;

    if (wsConnected && finnhubWs?.readyState === WebSocket.OPEN) {
        finnhubWs.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
        subscribedSymbols.add(symbol);
        console.log(`📊 Suscrito a ${symbol}`);
    } else {
        // Encolar para cuando conecte
        subscribedSymbols.add(symbol);
    }
}

function unsubscribeSymbol(symbol) {
    if (!symbol || !subscribedSymbols.has(symbol)) return;

    if (wsConnected && finnhubWs?.readyState === WebSocket.OPEN) {
        finnhubWs.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol }));
        console.log(`📊 Desuscrito de ${symbol}`);
    }
    subscribedSymbols.delete(symbol);
}

function subscribeToPortfolioAndWatchlist() {
    // Obtener todos los símbolos únicos del portfolio y watchlist
    const symbols = new Set();

    // Símbolos del portfolio
    if (typeof movements !== 'undefined') {
        movements.forEach(m => symbols.add(m.symbol));
    }

    // Símbolos de la watchlist
    if (typeof watchlists !== 'undefined' && typeof currentWatchlistId !== 'undefined') {
        const currentWatchlist = watchlists[currentWatchlistId] || [];
        currentWatchlist.forEach(s => symbols.add(s));
    }

    // Suscribirse a todos
    symbols.forEach(symbol => subscribeSymbol(symbol));
    console.log(`📊 Suscrito a ${symbols.size} símbolos`);
}

function resubscribeAll() {
    const symbols = [...subscribedSymbols];
    subscribedSymbols.clear();
    symbols.forEach(symbol => subscribeSymbol(symbol));
}

// ========================================
// Actualización de Cache de Precios
// ========================================

function updatePriceFromWebSocket(symbol, price, timestamp, volume) {
    if (!priceCache[symbol]) {
        priceCache[symbol] = {};
    }

    const cache = priceCache[symbol];
    const oldPrice = cache.price || price;
    const previousClose = cache.previousClose || oldPrice;

    // Calcular cambio diario
    const dailyChange = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
    const dailyDiff = previousClose ? (price - previousClose) : 0;

    // Actualizar cache
    cache.price = price;
    cache.dailyChange = dailyChange;
    cache.dailyDiff = dailyDiff;
    cache.marketTime = Math.floor(timestamp / 1000); // Convertir a segundos
    cache.volume = (cache.volume || 0) + volume;
    cache.timestamp = Date.now();
    cache.source = 'websocket';

    // Actualizar high/low del día
    if (!cache.dayHigh || price > cache.dayHigh) cache.dayHigh = price;
    if (!cache.dayLow || price < cache.dayLow) cache.dayLow = price;

    // Disparar actualización de UI con indicador de dirección
    const direction = price > oldPrice ? 'up' : (price < oldPrice ? 'down' : 'same');
    updatePriceUI(symbol, price, dailyChange, direction);
}

function updatePriceUI(symbol, price, dailyChange, direction) {
    // Actualizar TODAS las celdas con este símbolo (puede estar en Portfolio y Watchlist)
    const rows = document.querySelectorAll(`tr[data-symbol="${symbol}"]`);

    rows.forEach(row => {
        // Actualizar precio
        const priceCell = row.querySelector('.cell-price');
        if (priceCell) {
            priceCell.textContent = `$${price.toFixed(2)}`;

            // Efecto flash
            priceCell.classList.remove('flash-up', 'flash-down');
            if (direction === 'up') {
                priceCell.classList.add('flash-up');
            } else if (direction === 'down') {
                priceCell.classList.add('flash-down');
            }

            // Quitar flash después de la animación
            setTimeout(() => {
                priceCell.classList.remove('flash-up', 'flash-down');
            }, 500);
        }

        // Actualizar cambio porcentual
        const changeCell = row.querySelector('.cell-change');
        if (changeCell) {
            const sign = dailyChange >= 0 ? '+' : '';
            changeCell.textContent = `${sign}${dailyChange.toFixed(2)}%`;
            changeCell.className = `cell-change ${dailyChange >= 0 ? 'cell-positive' : 'cell-negative'}`;
        }

        // Actualizar hora de última actualización
        const timeCell = row.querySelector('.cell-time');
        if (timeCell) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
            timeCell.textContent = `${dateStr} ${timeStr}`;
        }
    });

    // Actualizar portfolio y resumen si están visibles (debounced)
    debounceRender();
}

// Debounce de actualización de stats (no re-render completo de tabla)
let statsUpdateTimeout = null;
function debounceRender() {
    if (statsUpdateTimeout) return;
    statsUpdateTimeout = setTimeout(() => {
        statsUpdateTimeout = null;
        // Solo actualizar los stats del header, no re-renderizar toda la tabla
        if (typeof calculatePortfolio === 'function' && typeof updateHeaderStats === 'function') {
            const portfolio = calculatePortfolio();
            const summary = typeof calculateSpeciesSummary === 'function' ? calculateSpeciesSummary() : {};
            updateHeaderStats(portfolio, summary);
        }
    }, 2000); // Actualizar stats cada 2 segundos máximo
}

// ========================================
// Heartbeat y Reconexión
// ========================================

function startHeartbeat() {
    if (wsHeartbeatInterval) {
        clearInterval(wsHeartbeatInterval);
    }
    wsHeartbeatInterval = setInterval(() => {
        if (wsConnected && finnhubWs?.readyState === WebSocket.OPEN) {
            // Enviar ping real para mantener conexión viva
            finnhubWs.send(JSON.stringify({ type: 'ping' }));
            console.log('💓 WebSocket ping enviado');
        }
    }, WS_CONFIG.heartbeatInterval);
}

function scheduleReconnect() {
    if (wsReconnectAttempts >= WS_CONFIG.maxReconnectAttempts) {
        console.error('❌ Máximo de intentos de reconexión alcanzado. Fallback a REST.');
        updateConnectionStatus('error', 'Conexión fallida');
        // Activar fallback a REST
        if (typeof startRestPolling === 'function') {
            startRestPolling();
        }
        return;
    }

    // Backoff exponencial
    const delay = Math.min(
        WS_CONFIG.reconnectBaseDelay * Math.pow(2, wsReconnectAttempts),
        WS_CONFIG.reconnectMaxDelay
    );

    wsReconnectAttempts++;
    console.log(`🔄 Reconectando en ${delay / 1000}s (intento ${wsReconnectAttempts}/${WS_CONFIG.maxReconnectAttempts})`);
    updateConnectionStatus('reconnecting', `Reconectando (${wsReconnectAttempts})...`);

    wsReconnectTimeout = setTimeout(() => {
        connectFinnhubWebSocket();
    }, delay);
}

// ========================================
// UI de Estado de Conexión
// ========================================

function updateConnectionStatus(status, message) {
    const statusEl = document.getElementById('ws-status');
    if (!statusEl) return;

    const icons = {
        connected: '🟢',
        connecting: '🟡',
        reconnecting: '🟡',
        disconnected: '🔴',
        error: '🔴'
    };

    statusEl.textContent = `${icons[status] || '⚪'} ${message}`;
    statusEl.className = `ws-status ws-${status}`;
    statusEl.title = `WebSocket: ${message}`;
}

// ========================================
// Fallback a REST cuando WS falla
// ========================================

let restPollingInterval = null;
const REST_POLLING_INTERVAL = 60000; // 60 segundos

function startRestPolling() {
    if (restPollingInterval) return; // Ya está activo

    console.log('📡 Iniciando fallback a REST polling (60s)');
    updateConnectionStatus('disconnected', 'REST mode');

    // Hacer refresh inmediato
    if (typeof refreshAllPrices === 'function') {
        refreshAllPrices();
    }

    // Configurar polling
    restPollingInterval = setInterval(() => {
        if (typeof refreshAllPrices === 'function') {
            refreshAllPrices();
        }
    }, REST_POLLING_INTERVAL);
}

function stopRestPolling() {
    if (restPollingInterval) {
        clearInterval(restPollingInterval);
        restPollingInterval = null;
        console.log('📡 REST polling detenido');
    }
}

// ========================================
// API Pública
// ========================================

function isWebSocketConnected() {
    return wsConnected && finnhubWs?.readyState === WebSocket.OPEN;
}

function getSubscribedSymbols() {
    return [...subscribedSymbols];
}

// ========================================
// Exponer Globalmente
// ========================================

window.connectFinnhubWebSocket = connectFinnhubWebSocket;
window.disconnectFinnhubWebSocket = disconnectFinnhubWebSocket;
window.subscribeSymbol = subscribeSymbol;
window.unsubscribeSymbol = unsubscribeSymbol;
window.subscribeToPortfolioAndWatchlist = subscribeToPortfolioAndWatchlist;
window.isWebSocketConnected = isWebSocketConnected;
window.getSubscribedSymbols = getSubscribedSymbols;
window.startRestPolling = startRestPolling;
window.stopRestPolling = stopRestPolling;

console.log('FinnhubWS: Cargado');

