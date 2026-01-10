// ========================================
// BYMA CLIENT - WebSocket Connection
// Conecta al backend byma-server.js (localhost:8080)
// ========================================

let bymaWs = null;
let bymaCache = {};
let bymaConnected = false;
let bymaReconnectTimer = null;

const BYMA_WS_URL = 'ws://localhost:8080';

// Símbolos Panel Líder BYMA (filtro)
const BYMA_PANEL_LIDER = [
    'ALUA', 'BBAR', 'BMA', 'BYMA', 'CEPU', 'COME', 'CRES', 'EDN',
    'GGAL', 'IRSA', 'LOMA', 'METR', 'MIRG', 'PAMP', 'SUPV',
    'TECO2', 'TGNO4', 'TGSU2', 'TRAN', 'TXAR', 'VALO', 'YPFD'
];

// Only show Panel Líder symbols
const FILTER_PANEL_LIDER = true;

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
            const existing = bymaCache[symbol] || {};
            const newPrice = data.price || data.last || 0;
            const prevPrice = existing.price || newPrice;

            // Determine direction for flash animation
            let direction = 'same';
            if (newPrice > prevPrice) direction = 'up';
            else if (newPrice < prevPrice) direction = 'down';

            bymaCache[symbol] = {
                price: newPrice,
                prevPrice: prevPrice,
                direction: data.direction || direction,
                change: data.change || (newPrice - prevPrice),
                changePercent: data.changePercent || (prevPrice ? ((newPrice - prevPrice) / prevPrice * 100) : 0),
                bid: data.bid || existing.bid || 0,
                ask: data.ask || existing.ask || 0,
                open: data.open || existing.open || 0,
                high: data.high || existing.high || 0,
                low: data.low || existing.low || 0,
                close: data.close || existing.close || 0,
                prevClose: data.prevClose || data.close || existing.prevClose || 0,
                volume: data.volume || existing.volume || 0,
                volNominal: data.size || existing.volNominal || 0,
                timestamp: data.timestamp || Date.now(),
                lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                flash: direction !== 'same' // Flag to trigger flash
            };

            // Only re-render if it's a Panel Líder symbol
            if (!FILTER_PANEL_LIDER || BYMA_PANEL_LIDER.includes(symbol)) {
                renderArgentinaTable();
            }
        }
    } else if (data.type === 'prices' || data.prices) {
        // Bulk update
        const prices = data.prices || data;
        if (typeof prices === 'object') {
            Object.entries(prices).forEach(([symbol, priceData]) => {
                if (typeof priceData === 'object') {
                    const existing = bymaCache[symbol] || {};
                    bymaCache[symbol] = {
                        price: priceData.price || priceData.last || 0,
                        prevPrice: existing.price || 0,
                        direction: priceData.direction || 'same',
                        change: priceData.change || 0,
                        changePercent: priceData.changePercent || priceData.pct || 0,
                        bid: priceData.bid || 0,
                        ask: priceData.ask || 0,
                        open: priceData.open || 0,
                        high: priceData.high || 0,
                        low: priceData.low || 0,
                        close: priceData.close || 0,
                        prevClose: priceData.prevClose || 0,
                        volume: priceData.volume || 0,
                        timestamp: priceData.timestamp || Date.now(),
                        lastUpdate: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                        flash: false
                    };
                }
            });
            renderArgentinaTable();
        }
    }
}

// ========================================
// UI Rendering - Panel Líder Style
// ========================================
function renderArgentinaTable() {
    const tbody = document.getElementById('argentina-body');
    const emptyState = document.getElementById('argentina-empty');
    const tableContainer = document.querySelector('#argentina .table-container');

    if (!tbody) return;

    // Filter only Panel Líder symbols if enabled
    let symbols = Object.keys(bymaCache).sort();
    if (FILTER_PANEL_LIDER) {
        symbols = symbols.filter(s => BYMA_PANEL_LIDER.includes(s));
    }

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
        const changePercent = data.changePercent || 0;
        const changeValue = data.change || 0;
        const open = data.open || 0;
        const high = data.high || 0;
        const low = data.low || 0;
        const prevClose = data.previousClose || data.referenceClose || 0;
        const bid = data.bid || 0;
        const ask = data.ask || 0;
        const volNominal = data.volNominal || 0;  // Volumen nominal (cantidad de acciones)
        const volEfectivo = data.volEfectivo || 0;  // Volumen efectivo (en $)

        // Calculate range position (0-100%)
        let rangePercent = 50;
        if (high > low && high !== low) {
            rangePercent = ((price - low) / (high - low)) * 100;
        }

        const changeClass = changePercent > 0 ? 'byma-positive' : changePercent < 0 ? 'byma-negative' : 'byma-neutral';
        const rangeClass = changePercent > 0 ? 'positive' : changePercent < 0 ? 'negative' : 'neutral';
        const changeSign = changePercent >= 0 ? '+' : '';

        // Direction and flash for professional trading look
        const direction = data.direction || 'same';
        const flashClass = data.flash ? (direction === 'up' ? 'price-flash-up' : direction === 'down' ? 'price-flash-down' : '') : '';
        const priceClass = `byma-price-cell ${direction}`;
        const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';
        const arrowClass = direction === 'up' ? 'price-arrow up' : direction === 'down' ? 'price-arrow down' : 'price-arrow';

        // Classes for bid/ask styling
        const bidClass = bid > 0 ? 'byma-bid-cell' : '';
        const askClass = ask > 0 ? 'byma-ask-cell' : '';
        const highClass = high > 0 && price === high ? 'byma-high-match' : '';
        const lowClass = low > 0 && price === low ? 'byma-low-match' : '';

        return `
            <tr class="${flashClass}" data-symbol="${symbol}">
                <td class="sticky-col">
                    <div class="byma-symbol">
                        <span class="byma-symbol-star" title="Agregar a favoritos">☆</span>
                        <strong>${symbol}</strong>
                    </div>
                </td>
                <td class="${priceClass}">
                    <span class="${arrowClass}">${arrow}</span>${formatPrice(price)}
                </td>
                <td class="${changeClass}">${changeSign}${formatNumber(changePercent, 2)}%</td>
                <td class="${bidClass}">${bid > 0 ? formatPrice(bid) : '-'}</td>
                <td class="${askClass}">${ask > 0 ? formatPrice(ask) : '-'}</td>
                <td>${open > 0 ? formatPrice(open) : '-'}</td>
                <td class="${highClass}">${high > 0 ? formatPrice(high) : '-'}</td>
                <td class="${lowClass}">${low > 0 ? formatPrice(low) : '-'}</td>
                <td>${prevClose > 0 ? formatPrice(prevClose) : '-'}</td>
                <td>${formatVolume(volNominal)}</td>
                <td>${formatMoney(volEfectivo)}</td>
                <td>
                    <div class="byma-range">
                        <div class="byma-range-bar">
                            <div class="byma-range-fill ${rangeClass}" style="width: ${rangePercent}%"></div>
                        </div>
                    </div>
                </td>
                <td class="byma-time">${data.lastUpdate || '-'}</td>
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
    if (typeof num !== 'number' || isNaN(num)) return '0,00';
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatPrice(num) {
    if (typeof num !== 'number' || isNaN(num) || num === 0) return '-';
    return '$' + num.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatMoney(num) {
    if (!num || num === 0) return '-';
    if (num >= 1000000000) return '$' + (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
    return '$' + num.toFixed(0);
}

function formatVolume(vol) {
    if (!vol || vol === 0) return '-';
    if (vol >= 1000000000) return (vol / 1000000000).toFixed(1) + 'B';
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(0) + 'K';
    return vol.toLocaleString('es-AR');
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
