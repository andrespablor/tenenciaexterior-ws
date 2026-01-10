// ========================================
// BYMA Market Data - Client App
// ========================================

class BymaClient {
    constructor() {
        this.ws = null;
        this.prices = new Map();
        this.updateCount = 0;
        this.filters = {
            search: '',
            type: '',
            settl: ''
        };

        this.init();
    }

    init() {
        this.setupWebSocket();
        this.setupEventListeners();
        this.startUI();
    }

    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        console.log('Conectando a:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('✅ Conectado al servidor');
            this.updateConnectionStatus(true);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleMessage(msg);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };

        this.ws.onclose = () => {
            console.log('❌ Desconectado del servidor');
            this.updateConnectionStatus(false);

            // Reconectar después de 3 segundos
            setTimeout(() => this.setupWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleMessage(msg) {
        switch (msg.type) {
            case 'status':
                this.updateConnectionStatus(msg.connected);
                break;

            case 'price':
                this.updatePrice(msg);
                break;
        }
    }

    updatePrice(data) {
        const { symbol } = data;

        // Guardar precio anterior para comparar
        const oldPrice = this.prices.get(symbol)?.price;

        // Actualizar precio
        this.prices.set(symbol, {
            ...data,
            priceChange: oldPrice ? (data.price > oldPrice ? 'up' : data.price < oldPrice ? 'down' : 'same') : 'same'
        });

        this.updateCount++;
        this.updateUI();
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        if (connected) {
            statusEl.textContent = 'Conectado';
            statusEl.classList.remove('disconnected');
            statusEl.classList.add('connected');
        } else {
            statusEl.textContent = 'Desconectado';
            statusEl.classList.remove('connected');
            statusEl.classList.add('disconnected');
        }
    }

    updateUI() {
        // Actualizar contadores
        document.getElementById('symbol-count').textContent = this.prices.size;
        document.getElementById('update-count').textContent = this.updateCount.toLocaleString();

        // Actualizar tabla
        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('price-tbody');

        // Filtrar precios
        let filteredPrices = Array.from(this.prices.entries());

        if (this.filters.search) {
            const search = this.filters.search.toUpperCase();
            filteredPrices = filteredPrices.filter(([symbol]) =>
                symbol.includes(search)
            );
        }

        if (this.filters.type) {
            filteredPrices = filteredPrices.filter(([, data]) =>
                data.entryType === this.filters.type
            );
        }

        if (this.filters.settl) {
            filteredPrices = filteredPrices.filter(([, data]) =>
                data.settlType === this.filters.settl
            );
        }

        // Ordenar por timestamp (más recientes primero)
        filteredPrices.sort((a, b) => b[1].timestamp - a[1].timestamp);

        // Limitar a 100 filas para performance
        filteredPrices = filteredPrices.slice(0, 100);

        if (filteredPrices.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        ${this.prices.size === 0 ? 'Esperando datos...' : 'No hay resultados para los filtros seleccionados'}
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredPrices.map(([symbol, data]) => {
            const typeClass = this.getTypeName(data.entryType);
            const settlName = this.getSettlName(data.settlType);
            const timeAgo = this.getTimeAgo(data.timestamp);
            const priceClass = data.priceChange === 'up' ? 'price-up' : data.priceChange === 'down' ? 'price-down' : '';

            return `
                <tr class="flash">
                    <td class="symbol-cell">${symbol}</td>
                    <td><span class="type-badge type-${typeClass}">${typeClass}</span></td>
                    <td class="price-cell ${priceClass}">$${this.formatPrice(data.price)}</td>
                    <td>${data.size ? data.size.toLocaleString() : '-'}</td>
                    <td>${data.position || '-'}</td>
                    <td>${settlName}</td>
                    <td class="time-cell">${timeAgo}</td>
                </tr>
            `;
        }).join('');
    }

    getTypeName(type) {
        const types = {
            '0': 'BID',
            '1': 'OFFER',
            '2': 'TRADE',
            '4': 'OPEN',
            '5': 'CLOSE',
            '7': 'HIGH',
            '8': 'LOW',
            'B': 'VOL'
        };
        return types[type] || 'PRICE';
    }

    getSettlName(type) {
        const types = {
            '0': 'Regular',
            '1': 'CI',
            '2': '24hs',
            '3': '48hs'
        };
        return types[type] || '-';
    }

    formatPrice(price) {
        if (price >= 1000) {
            return price.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        }
        return price.toFixed(2);
    }

    getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 5) return 'Ahora';
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        return `${Math.floor(seconds / 3600)}h`;
    }

    setupEventListeners() {
        // Search input
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.renderTable();
        });

        // Type filter
        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.renderTable();
        });

        // Settlement filter
        document.getElementById('settl-filter').addEventListener('change', (e) => {
            this.filters.settl = e.target.value;
            this.renderTable();
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            this.prices.clear();
            this.updateCount = 0;
            this.filters = { search: '', type: '', settl: '' };
            document.getElementById('search-input').value = '';
            document.getElementById('type-filter').value = '';
            document.getElementById('settl-filter').value = '';
            this.updateUI();
        });
    }

    startUI() {
        // Actualizar UI cada segundo
        setInterval(() => {
            if (this.prices.size > 0) {
                this.renderTable();
            }
        }, 1000);
    }
}

// Iniciar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.bymaClient = new BymaClient();
});
