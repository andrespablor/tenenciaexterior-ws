// ========================================
// BYMA CLIENT - WebSocket Connection
// Conecta al backend byma-server.js (localhost:8080)
// ========================================

let bymaWs = null;
let bymaCache = {};
let bymaConnected = false;
let bymaReconnectTimer = null;

const BYMA_WS_URL = 'ws://localhost:8080';

// Símbolos argentinos a trackear
const BYMA_SYMBOLS = ['GGAL', 'YPFD', 'PAMP', 'ALUA', 'TXAR', 'BBAR', 'SUPV', 'CEPU', 'TECO2', 'COME'];

// ========================================
// WebSocket Connection
// ========================================
function connectBymaWs() {
    if (bymaWs && bymaWs.readyState === WebSocket.OPEN) {
        console.log('🇦🇷 BYMA WS already connected');
        return;
    }

    console.log('🇦🇷 Connecting to BYMA WebSocket...');
    updateBymaStatus('connecting');

    try {
        bymaWs = new WebSocket(BYMA_WS_URL);

        bymaWs.onopen = () => {
            console.log('✅ BYMA WebSocket connected');
            bymaConnected = true;
            updateBymaStatus('connected');

            // Clear reconnect timer
            if (bymaReconnectTimer) {
                clearTimeout(bymaReconnectTimer);
                bymaReconnectTimer = null;
            }
        };

        bymaWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleBymaMessage(data);
            } catch (e) {
                console.warn('🇦🇷 Invalid BYMA message:', event.data);
            }
        };

        bymaWs.onclose = () => {
            console.log('🔴 BYMA WebSocket disconnected');
            bymaConnected = false;
            updateBymaStatus('disconnected');

            // Auto-reconnect after 5 seconds if in Argentina mode
            const toggle = document.getElementById('market-toggle');
            if (toggle && toggle.checked) {
                bymaReconnectTimer = setTimeout(() => {
                    console.log('🔄 Attempting BYMA reconnect...');
                    connectBymaWs();
                }, 5000);
            }
        };

        bymaWs.onerror = (error) => {
            console.error('❌ BYMA WebSocket error:', error);
            updateBymaStatus('error');
        };

    } catch (error) {
        console.error('❌ Failed to connect to BYMA:', error);
        updateBymaStatus('error');
    }
}

function disconnectBymaWs() {
    if (bymaReconnectTimer) {
        clearTimeout(bymaReconnectTimer);
        bymaReconnectTimer = null;
    }

    if (bymaWs) {
        bymaWs.close();
        bymaWs = null;
    }

    bymaConnected = false;
    console.log('🇦🇷 BYMA WebSocket disconnected manually');
}

// ========================================
// Message Handling
// ========================================
function handleBymaMessage(data) {
    if (data.type === 'price' || data.symbol) {
        const symbol = data.symbol || data.ticker;
        if (symbol) {
            bymaCache[symbol] = {
                price: data.price || data.last || 0,
                change: data.change || 0,
                changePercent: data.changePercent || data.pct || 0,
                open: data.open || 0,
                high: data.high || 0,
                low: data.low || 0,
                prevClose: data.prevClose || data.previousClose || 0,
                volume: data.volume || 0,
                timestamp: data.timestamp || Date.now(),
                lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            renderArgentinaTable();
        }
    } else if (data.type === 'prices' || data.prices) {
        // Bulk update
        const prices = data.prices || data;
        if (typeof prices === 'object') {
            Object.entries(prices).forEach(([symbol, priceData]) => {
                if (typeof priceData === 'object') {
                    bymaCache[symbol] = {
                        price: priceData.price || priceData.last || 0,
                        change: priceData.change || 0,
                        changePercent: priceData.changePercent || priceData.pct || 0,
                        open: priceData.open || 0,
                        high: priceData.high || 0,
                        low: priceData.low || 0,
                        prevClose: priceData.prevClose || 0,
                        volume: priceData.volume || 0,
                        timestamp: priceData.timestamp || Date.now(),
                        lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    };
                }
            });
            renderArgentinaTable();
        }
    }
}

// ========================================
// UI Rendering
// ========================================
function renderArgentinaTable() {
    const tbody = document.getElementById('argentina-body');
    const emptyState = document.getElementById('argentina-empty');
    const tableContainer = document.querySelector('#argentina .table-container');

    if (!tbody) return;

    const symbols = Object.keys(bymaCache);

    if (symbols.length === 0) {
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.classList.add('show');
        return;
    }

    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.classList.remove('show');

    tbody.innerHTML = symbols.map(symbol => {
        const data = bymaCache[symbol];
        const price = data.price || 0;
        const change = data.changePercent || 0;
        const variation = data.change || 0;
        const changeClass = change >= 0 ? 'cell-positive' : 'cell-negative';
        const changeSign = change >= 0 ? '+' : '';

        return `
            <tr>
                <td class="cell-symbol">
                    <strong>${symbol}</strong>
                </td>
                <td class="cell-price">$${formatNumber(price, 2)}</td>
                <td class="${changeClass}">${changeSign}${formatNumber(change, 2)}%</td>
                <td class="${changeClass}">${changeSign}$${formatNumber(variation, 2)}</td>
                <td>$${formatNumber(data.open || 0, 2)}</td>
                <td>$${formatNumber(data.high || 0, 2)}</td>
                <td>$${formatNumber(data.low || 0, 2)}</td>
                <td>$${formatNumber(data.prevClose || 0, 2)}</td>
                <td>${formatVolume(data.volume || 0)}</td>
                <td class="cell-time">${data.lastUpdate || '-'}</td>
            </tr>
        `;
    }).join('');
}

function updateBymaStatus(status) {
    const statusEl = document.getElementById('byma-status');
    if (!statusEl) return;

    statusEl.className = 'ws-status';

    switch (status) {
        case 'connected':
            statusEl.className += ' ws-connected';
            statusEl.innerHTML = '🟢 Conectado';
            break;
        case 'connecting':
            statusEl.className += ' ws-connecting';
            statusEl.innerHTML = '🟡 Conectando...';
            break;
        case 'error':
            statusEl.className += ' ws-error';
            statusEl.innerHTML = '🔴 Error';
            break;
        default:
            statusEl.className += ' ws-disconnected';
            statusEl.innerHTML = '🔴 Desconectado';
    }
}

// ========================================
// Helpers
// ========================================
function formatNumber(num, decimals = 2) {
    if (typeof num !== 'number' || isNaN(num)) return '0.00';
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatVolume(vol) {
    if (!vol || vol === 0) return '-';
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(0) + 'K';
    return vol.toString();
}

// ========================================
// Fetch initial prices via REST API
// ========================================
async function fetchBymaInitialPrices() {
    try {
        const response = await fetch('http://localhost:8080/api/prices');
        if (response.ok) {
            const prices = await response.json();
            Object.entries(prices).forEach(([symbol, data]) => {
                bymaCache[symbol] = {
                    price: data.price || data.last || 0,
                    change: data.change || 0,
                    changePercent: data.pct || 0,
                    open: data.open || 0,
                    high: data.high || 0,
                    low: data.low || 0,
                    prevClose: data.prev || 0,
                    volume: data.vol || 0,
                    timestamp: data.time || Date.now(),
                    lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                };
            });
            renderArgentinaTable();
            console.log('✅ BYMA initial prices loaded:', Object.keys(prices).length, 'symbols');
        }
    } catch (error) {
        console.warn('⚠️ Could not fetch BYMA initial prices:', error.message);
    }
}

// ========================================
// Exports
// ========================================
window.connectBymaWs = connectBymaWs;
window.disconnectBymaWs = disconnectBymaWs;
window.renderArgentinaTable = renderArgentinaTable;
window.fetchBymaInitialPrices = fetchBymaInitialPrices;
window.bymaCache = bymaCache;

console.log('🇦🇷 BYMA Client: Loaded');
