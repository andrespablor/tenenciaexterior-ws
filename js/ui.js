// ========================================
// UI.JS - Funciones de Renderizado
// ========================================

// API functions moved to api.js
// ========================================
// Render Portfolio
// ========================================
function renderPortfolio(portfolio) {
    debugLog('🔄 renderPortfolio called. PriceCache symbols:', Object.keys(priceCache));
    const tbody = document.getElementById('portfolio-body');
    const empty = document.getElementById('portfolio-empty');
    const container = document.querySelector('#portfolio .table-container');

    // Obtener resumen para tener el resultado total correcto
    const summary = calculateSpeciesSummary();

    let positions = Object.values(portfolio).map(p => {
        const price = p.currentPrice || p.avgPrice;
        const value = p.quantity * price;
        const dailyValue = value * (p.dailyChange / 100);

        // Usar el resultado total del resumen si existe
        const result = summary[p.symbol] ? summary[p.symbol].totalResult : (value - p.totalCost);

        // Datos de rango desde priceCache
        const cache = priceCache[p.symbol] || {};
        const dayHigh = cache.dayHigh || price;
        const dayLow = cache.dayLow || price;
        const wk52High = cache.wk52High || price;
        const wk52Low = cache.wk52Low || price;

        // Sector desde stock profiles (con traducción)
        const profile = window.stockProfiles?.[p.symbol.toUpperCase()] || {};
        const rawSector = profile.sector || SECTOR_MAP[p.symbol] || 'Otro';
        const sector = (typeof SECTOR_TRANSLATIONS !== 'undefined' && SECTOR_TRANSLATIONS[rawSector])
            ? SECTOR_TRANSLATIONS[rawSector]
            : rawSector;

        return { ...p, value, dailyValue, result, dayHigh, dayLow, wk52High, wk52Low, sector };
    });

    if (sortConfig.column) {
        positions = sortData(positions, sortConfig.column, sortConfig.direction);
    }

    if (!positions.length) {
        container.style.display = 'none';
        empty.classList.add('show');
        return;
    }

    container.style.display = 'block';
    empty.classList.remove('show');

    tbody.innerHTML = positions.map(p => {
        const chartUrl = `https://www.tradingview.com/chart/?symbol=${p.symbol}`;
        const price = p.currentPrice || p.avgPrice;
        const priceDisplay = p.currentPrice ? `$${fmt(p.currentPrice, 2)}` : '...';

        // Calcular posición del precio en el rango del día (como %)
        const dayRange = p.dayHigh - p.dayLow;
        const dayPct = dayRange > 0 ? ((price - p.dayLow) / dayRange) * 100 : 50;

        // Calcular posición del precio en el rango de 52 semanas (como %)
        const wk52Range = p.wk52High - p.wk52Low;
        const wk52Pct = wk52Range > 0 ? ((price - p.wk52Low) / wk52Range) * 100 : 50;

        // Calcular diferencia de precio (change en valor absoluto)
        const cache = priceCache[p.symbol] || {};
        const prevClose = cache.price && p.dailyChange ? price / (1 + p.dailyChange / 100) : price;
        const priceChange = price - prevClose;

        // Sector
        const sector = SECTOR_MAP[p.symbol] || 'Otros';

        // MACD desde priceCache
        const macd = cache.macd || null;
        const macdClass = macd ? (macd > 0 ? 'cell-positive' : 'cell-negative') : '';
        const macdDisplay = macd ? macd.toFixed(2) : '-';

        // Stochastic desde priceCache
        const stoch = cache.stochastic || null;
        let stochClass = '';
        let stochDisplay = '-';
        if (stoch && stoch.k !== null) {
            const k = stoch.k;
            stochDisplay = k.toFixed(0); // Mostrar solo %K (sin decimales)
            if (k > 80) {
                stochClass = 'cell-positive'; // Sobrecompra (verde)
            } else if (k < 20) {
                stochClass = 'cell-negative'; // Sobreventa (rojo)
            }
        }

        // Previous close
        const previousClose = cache.previousClose || 0;
        const closeDisplay = previousClose ? `$${fmt(previousClose, 2)}` : '-';

        // Market time
        const marketTime = cache.marketTime || 0;
        let timeDisplay = '-';
        if (marketTime) {
            const date = new Date(marketTime * 1000);
            const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
            timeDisplay = `${dateStr} ${timeStr}`;
        }

        return `<tr data-symbol="${p.symbol}">
            <td class="cell-symbol"><a href="${chartUrl}" target="_blank">${p.symbol} 📈</a></td>
            <td class="cell-price">${priceDisplay}</td>
            <td class="cell-change ${p.dailyChange >= 0 ? 'cell-positive' : 'cell-negative'}">${p.dailyChange >= 0 ? '+' : ''}${p.dailyChange.toFixed(2)}%</td>
            <td class="${priceChange >= 0 ? 'cell-positive' : 'cell-negative'}">${priceChange >= 0 ? '+' : ''}${fmt(priceChange, 2)}</td>
            <td class="range-cell">
                <div class="range-bar">
                    <span class="range-min">${fmt(p.dayLow, 2)}</span>
                    <div class="range-track">
                        <div class="range-fill" style="width: ${dayPct}%"></div>
                        <div class="range-marker" style="left: ${dayPct}%"></div>
                    </div>
                    <span class="range-max">${fmt(p.dayHigh, 2)}</span>
                </div>
            </td>
            <td class="range-cell">
                <div class="range-bar">
                    <span class="range-min">${fmt(p.wk52Low, 2)}</span>
                    <div class="range-track">
                        <div class="range-fill" style="width: ${wk52Pct}%"></div>
                        <div class="range-marker" style="left: ${wk52Pct}%"></div>
                    </div>
                    <span class="range-max">${fmt(p.wk52High, 2)}</span>
                </div>
            </td>
            <td>${closeDisplay}</td>
            <td class="cell-time">${timeDisplay}</td>
            <td class="${macdClass}">${macdDisplay}</td>
            <td class="${stochClass}">${stochDisplay}</td>
            <td class="cell-sector" title="${window.stockProfiles?.[p.symbol.toUpperCase()]?.name || p.sector}">${p.sector.toUpperCase()}</td>
            <td class="col-personal">${fmt(p.quantity)}</td>
            <td class="cell-value">$${fmt(p.value, 2)}</td>
            <td class="cell-daily ${p.dailyValue >= 0 ? 'cell-positive' : 'cell-negative'}">${p.dailyValue >= 0 ? '+' : ''}$${fmt(Math.abs(p.dailyValue), 2)}</td>
            <td class="${p.result >= 0 ? 'cell-positive' : 'cell-negative'}">${p.result >= 0 ? '+' : ''}$${fmt(p.result, 2)}</td>
            <td><button class="btn-alert" onclick="promptPriceAlert('${p.symbol}', ${price})" title="Crear alerta">🔔</button></td>
        </tr>`;
    }).join('');
}

// ========================================
// Render Summary
// ========================================
function renderSummary(summary) {
    const tbody = document.getElementById('summary-body');
    const empty = document.getElementById('summary-empty');
    const container = document.querySelector('#summary .table-container');

    let species = Object.values(summary);

    if (!species.length) {
        container.style.display = 'none';
        empty.classList.add('show');
        return;
    }

    container.style.display = 'block';
    empty.classList.remove('show');

    // Separar en dos grupos: con tenencia y sin tenencia
    const withHoldings = species.filter(s => s.currentQuantity > 0).sort((a, b) => a.symbol.localeCompare(b.symbol));
    const withoutHoldings = species.filter(s => s.currentQuantity <= 0).sort((a, b) => a.symbol.localeCompare(b.symbol));

    // Si hay ordenamiento manual, aplicarlo
    if (sortConfig.column) {
        withHoldings.sort((a, b) => {
            let valA = a[sortConfig.column];
            let valB = b[sortConfig.column];
            if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        withoutHoldings.sort((a, b) => {
            let valA = a[sortConfig.column];
            let valB = b[sortConfig.column];
            if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const renderRow = (s) => {
        const chartUrl = `https://www.tradingview.com/chart/?symbol=${s.symbol}`;
        const precio = s.currentPrice ? `$${fmt(s.currentPrice, 2)}` : '<span class="cell-muted">—</span>';
        const tenencia = s.currentQuantity > 0 ? fmt(s.currentQuantity) : '<span class="cell-muted">—</span>';
        const valorActual = s.currentQuantity > 0 ? `$${fmt(s.currentValue, 2)}` : '<span class="cell-muted">—</span>';

        // Obtener datos de cache para % y 52-wk range
        const cache = priceCache[s.symbol] || {};
        const dailyChange = cache.dailyChange || 0;
        const wk52High = cache.wk52High || s.currentPrice || 0;
        const wk52Low = cache.wk52Low || s.currentPrice || 0;
        const price = s.currentPrice || 0;
        const wk52Range = wk52High - wk52Low;
        const wk52Pct = wk52Range > 0 ? ((price - wk52Low) / wk52Range) * 100 : 50;

        return `<tr>
            <td class="cell-symbol"><a href="${chartUrl}" target="_blank">${s.symbol} 📈</a></td>
            <td>${precio}</td>
            <td class="${dailyChange >= 0 ? 'cell-positive' : 'cell-negative'}">${dailyChange >= 0 ? '+' : ''}${dailyChange.toFixed(2)}%</td>
            <td class="range-cell">
                <div class="range-bar">
                    <span class="range-min">${fmt(wk52Low, 2)}</span>
                    <div class="range-track">
                        <div class="range-fill" style="width: ${wk52Pct}%"></div>
                        <div class="range-marker" style="left: ${wk52Pct}%"></div>
                    </div>
                    <span class="range-max">${fmt(wk52High, 2)}</span>
                </div>
            </td>
            <td>${tenencia}</td>
            <td>${valorActual}</td>
            <td class="${s.totalResult >= 0 ? 'cell-positive' : 'cell-negative'}">${s.totalResult >= 0 ? '+' : ''}$${fmt(s.totalResult, 2)}</td>
        </tr>`;
    };

    let html = withHoldings.map(renderRow).join('');

    // Agregar separador si hay ambos grupos
    if (withHoldings.length > 0 && withoutHoldings.length > 0) {
        html += '<tr class="table-separator"><td colspan="7"></td></tr>';
    }

    html += withoutHoldings.map(renderRow).join('');

    tbody.innerHTML = html;
}

// ========================================
// Render History
// ========================================
function renderHistory() {
    const tbody = document.getElementById('history-body');
    const empty = document.getElementById('history-empty');
    const container = document.querySelector('#history .table-container');

    let filtered = filterMovementsByPeriod(movements);

    // Aplicar filtro de búsqueda
    if (searchQuery) {
        filtered = filtered.filter(m => m.symbol.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (sortConfig.column) {
        filtered = sortData(filtered, sortConfig.column, sortConfig.direction);
    }

    if (!filtered.length) {
        container.style.display = 'none';
        empty.classList.add('show');
        document.getElementById('delete-selected-btn').style.display = 'none';
        return;
    }

    container.style.display = 'block';
    empty.classList.remove('show');

    tbody.innerHTML = filtered.map((m, i) => {
        const idx = movements.indexOf(m);
        const badge = m.type === 'COMPRA' ? 'badge-buy' : 'badge-sell';

        return `<tr>
            <td class="col-check"><input type="checkbox" class="row-check" data-idx="${idx}" onchange="updateSelectionUI()"></td>
            <td>${fmtDate(m.date)}</td>
            <td><span class="badge ${badge}">${m.type}</span></td>
            <td class="cell-symbol">${m.symbol}</td>
            <td>${m.type === 'VENTA' ? '-' : ''}${fmt(m.quantity)}</td>
            <td>$${fmt(m.price, 2)}</td>
            <td class="${m.importe >= 0 ? 'cell-positive' : 'cell-negative'}">${m.importe >= 0 ? '+' : ''}$${fmt(m.importe, 2)}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="editMovement(${idx})" title="Editar" aria-label="Editar movimiento de ${m.symbol}">✏️</button>
                <button class="btn-icon" onclick="deleteMovement(${idx})" title="Eliminar" aria-label="Eliminar movimiento de ${m.symbol}">🗑</button>
            </td>
        </tr>`;
    }).join('');

    document.getElementById('select-all-movements').checked = false;
    updateSelectionUI();
}

// ========================================
// Búsqueda en Historial
// ========================================
function initializeHistorySearch() {
    const searchInput = document.getElementById('history-search');
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderHistory();
    });
}

// Seleccionar/deseleccionar todos
function toggleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.row-check');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
    updateSelectionUI();
}

// Actualizar UI de selección
function updateSelectionUI() {
    const checkboxes = document.querySelectorAll('.row-check:checked');
    const count = checkboxes.length;
    const deleteBtn = document.getElementById('delete-selected-btn');
    const countSpan = document.getElementById('selected-count');

    if (count > 0) {
        deleteBtn.style.display = 'inline-flex';
        countSpan.textContent = count;
    } else {
        deleteBtn.style.display = 'none';
    }
}

// Eliminar movimientos seleccionados
function deleteSelectedMovements() {
    const checkboxes = document.querySelectorAll('.row-check:checked');
    const count = checkboxes.length;

    if (count === 0) return;

    if (confirm(`¿Eliminar ${count} movimiento(s) seleccionado(s)?`)) {
        // Obtener índices y ordenar de mayor a menor para eliminar sin problemas
        const indices = Array.from(checkboxes)
            .map(cb => parseInt(cb.dataset.idx))
            .sort((a, b) => b - a);

        indices.forEach(idx => {
            movements.splice(idx, 1);
        });

        saveData();
        renderAll();
    }
}

function deleteMovement(idx) {
    if (confirm('¿Eliminar movimiento?')) {
        movements.splice(idx, 1);
        saveData();
        renderAll();
    }
}

// ========================================
// Header Stats
// ========================================
function updateHeaderStats(portfolio, summary) {
    const positions = Object.values(portfolio);
    const species = Object.values(summary);

    // INVERTIDO: valor actual del portfolio
    let totalValue = 0;
    let dailyChange = 0;
    let positionsResult = 0; // Resultado de posiciones abiertas

    positions.forEach(p => {
        const price = p.currentPrice || p.avgPrice;
        const value = p.quantity * price;
        totalValue += value;
        dailyChange += value * (p.dailyChange / 100);

        // Usar el totalResult del summary (igual que en la tabla)
        // Esto incluye todas las operaciones históricas de esta especie
        if (summary[p.symbol]) {
            positionsResult += summary[p.symbol].totalResult;
        } else {
            // Fallback si no hay summary (no debería pasar)
            positionsResult += (value - p.totalCost);
        }
    });

    // RESULTADO TOTAL: suma de todos los resultados por especie
    // (cada especie = total vendido - total comprado + valor actual de tenencia)
    // Para 2026: ya está calculado como (valor_actual - valor_cierre) en calculations.js
    let totalResult = 0;

    // Para 2025: usar resultado FIJO del baseline (no depender de precios)
    if (selectedPeriod === '2025' && yearEndSnapshots['2025']) {
        totalResult = yearEndSnapshots['2025'].result;
    } else {
        species.forEach(s => {
            totalResult += s.totalResult;
        });
    }

    const dailyPercent = totalValue > 0 ? (dailyChange / (totalValue - dailyChange)) * 100 : 0;
    const positionsPct = totalValue > 0 ? (positionsResult / (totalValue - positionsResult)) * 100 : 0;

    // Actualizar UI
    document.getElementById('total-value').textContent = `$${fmt(totalValue, 2)}`;
    document.getElementById('positions-count').textContent = `${positions.length} posiciones`;

    // Resultado del día
    setStatValue('daily-result', dailyChange);
    const dailyPctEl = document.getElementById('daily-percent');
    dailyPctEl.textContent = `${dailyPercent >= 0 ? '+' : ''}${dailyPercent.toFixed(2)}%`;
    dailyPctEl.className = `stat-sub ${dailyPercent >= 0 ? 'positive' : 'negative'}`;

    // Resultado de posiciones abiertas
    setStatValue('positions-result', positionsResult);
    const posPctEl = document.getElementById('positions-pct');
    posPctEl.textContent = `${positionsPct >= 0 ? '+' : ''}${positionsPct.toFixed(1)}%`;
    posPctEl.className = `stat-sub ${positionsPct >= 0 ? 'positive' : 'negative'}`;

    // Resultado total
    setStatValue('total-result', totalResult);
}

function setStatValue(id, value) {
    const el = document.getElementById(id);
    el.textContent = `${value >= 0 ? '+' : ''}$${fmt(value, 2)}`;
    el.className = `stat-value ${value >= 0 ? 'positive' : 'negative'}`;
}

// Exponer globalmente
window.renderPortfolio = renderPortfolio;
window.renderSummary = renderSummary;
window.renderHistory = renderHistory;
window.updateHeaderStats = updateHeaderStats;
// renderCharts is in app.js
window.setStatValue = setStatValue;

// Loading Indicator
function showLoading(isLoading) {
    const refreshIcon = document.getElementById('refresh-icon');
    if (refreshIcon) {
        if (isLoading) refreshIcon.classList.add('spinning');
        else refreshIcon.classList.remove('spinning');
    }
}
window.showLoading = showLoading;

console.log('UI: Loaded');
