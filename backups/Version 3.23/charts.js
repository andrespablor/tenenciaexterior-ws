// ========================================
// CHARTS.JS - Gráficos y Estadísticas
// Extraído de app.js para modularidad
// ========================================

// Variables globales de charts (movidas desde config.js)
// evolutionChart y sectorChart están en config.js

// Mapa de sectores (se puede expandir)
const SECTOR_MAP = {
    // Technology
    'AAPL': 'Tecnología', 'MSFT': 'Tecnología', 'GOOGL': 'Tecnología', 'GOOG': 'Tecnología',
    'META': 'Tecnología', 'NVDA': 'Tecnología', 'AMD': 'Tecnología', 'INTC': 'Tecnología',
    'CRM': 'Tecnología', 'ORCL': 'Tecnología', 'ADBE': 'Tecnología', 'NFLX': 'Tecnología',
    // Finance
    'JPM': 'Finanzas', 'BAC': 'Finanzas', 'WFC': 'Finanzas', 'GS': 'Finanzas',
    'MS': 'Finanzas', 'V': 'Finanzas', 'MA': 'Finanzas', 'AXP': 'Finanzas',
    // Healthcare
    'JNJ': 'Salud', 'PFE': 'Salud', 'UNH': 'Salud', 'ABBV': 'Salud', 'MRK': 'Salud',
    // Consumer
    'AMZN': 'Consumo', 'WMT': 'Consumo', 'KO': 'Consumo', 'PEP': 'Consumo', 'MCD': 'Consumo',
    'COST': 'Consumo', 'NKE': 'Consumo', 'SBUX': 'Consumo',
    // Energy
    'XOM': 'Energía', 'CVX': 'Energía', 'COP': 'Energía', 'SLB': 'Energía',
    // Argentina / LatAm
    'GGAL': 'Finanzas', 'YPF': 'Energía', 'PAM': 'Energía', 'BMA': 'Finanzas',
    'MELI': 'Tecnología', 'GLOB': 'Tecnología', 'NU': 'Finanzas',
    'VIST': 'Energía', 'BBAR': 'Finanzas', 'SUPV': 'Finanzas',
    // ETFs
    'SPY': 'ETF', 'QQQ': 'ETF', 'IWM': 'ETF', 'EWZ': 'ETF', 'VTI': 'ETF',
    // Crypto
    'BITO': 'Crypto', 'COIN': 'Crypto', 'MARA': 'Crypto', 'RIOT': 'Crypto',
    'ETHE': 'Crypto', 'ETH': 'Crypto', 'ETHA': 'Crypto',
};

let sectorChart = null;

// ========================================
// Función principal de renderizado
// ========================================
function renderCharts(portfolio) {
    renderInterestingStats(portfolio);
    renderCombinedChart();
    renderSectorChart(portfolio);
}

// ========================================
// Estadísticas interesantes (tarjetas)
// ========================================
function renderInterestingStats(portfolio) {
    // Verificar si los elementos existen (pueden haber sido removidos del HTML)
    const bestMonthEl = document.getElementById('best-month-symbol');
    if (!bestMonthEl) return; // Stats cards were removed from the UI

    const summary = calculateSpeciesSummary();
    const positions = Object.values(portfolio);
    const species = Object.values(summary);

    // 1. Mejor del Mes (mayor resultado total en el período filtrado)
    let bestMonth = null;
    species.forEach(s => {
        if (!bestMonth || s.totalResult > bestMonth.totalResult) {
            bestMonth = s;
        }
    });

    if (bestMonth && bestMonth.totalResult !== 0) {
        document.getElementById('best-month-symbol').textContent = bestMonth.symbol;
        document.getElementById('best-month-symbol').className = `stat-value ${bestMonth.totalResult >= 0 ? 'positive' : 'negative'}`;
        document.getElementById('best-month-result').textContent = `${bestMonth.totalResult >= 0 ? '+' : ''}$${fmt(bestMonth.totalResult, 2)}`;
        document.getElementById('best-month-result').className = `stat-sub ${bestMonth.totalResult >= 0 ? 'positive' : 'negative'}`;
    } else {
        document.getElementById('best-month-symbol').textContent = '—';
        document.getElementById('best-month-result').textContent = 'Sin datos';
    }

    // 2. Mayor Subida Hoy (mayor % diario positivo)
    let topGainer = null;
    positions.forEach(p => {
        if (!topGainer || p.dailyChange > topGainer.dailyChange) {
            topGainer = p;
        }
    });

    if (topGainer && topGainer.dailyChange > 0) {
        document.getElementById('top-gainer-symbol').textContent = topGainer.symbol;
        document.getElementById('top-gainer-pct').textContent = `+${topGainer.dailyChange.toFixed(2)}%`;
    } else {
        document.getElementById('top-gainer-symbol').textContent = '—';
        document.getElementById('top-gainer-pct').textContent = 'Sin subidas';
    }

    // 3. Mayor Caída Hoy (menor % diario negativo)
    let topLoser = null;
    positions.forEach(p => {
        if (!topLoser || p.dailyChange < topLoser.dailyChange) {
            topLoser = p;
        }
    });

    if (topLoser && topLoser.dailyChange < 0) {
        document.getElementById('top-loser-symbol').textContent = topLoser.symbol;
        document.getElementById('top-loser-pct').textContent = `${topLoser.dailyChange.toFixed(2)}%`;
    } else {
        document.getElementById('top-loser-symbol').textContent = '—';
        document.getElementById('top-loser-pct').textContent = 'Sin caídas';
    }

    // 4. Mayor Ganancia Realizada (mejor venta individual)
    let bestTrade = null;
    const ventas = movements.filter(m => m.type === 'VENTA');
    ventas.forEach(v => {
        // Ganancia aproximada = importe (que es positivo para ventas)
        if (!bestTrade || v.importe > bestTrade.importe) {
            bestTrade = v;
        }
    });

    if (bestTrade) {
        document.getElementById('best-trade-symbol').textContent = bestTrade.symbol;
        document.getElementById('best-trade-result').textContent = `+$${fmt(bestTrade.importe, 2)}`;
        document.getElementById('best-trade-result').className = 'stat-sub positive';
    } else {
        document.getElementById('best-trade-symbol').textContent = '—';
        document.getElementById('best-trade-result').textContent = 'Sin ventas';
    }
}

// ========================================
// Gráfico combinado (Evolución + Invertido)
// ========================================
function renderCombinedChart() {
    const ctx = document.getElementById('evolution-chart');
    if (!ctx) return;

    const dailyData = calculateDailyEvolution();

    if (evolutionChart) evolutionChart.destroy();

    // Encontrar maximo valor para ajustar escalas
    const maxInvested = Math.max(...dailyData.map(d => d.invested));
    const maxResult = Math.max(...dailyData.map(d => Math.abs(d.result)));

    evolutionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dailyData.map(d => d.date),
            datasets: [
                {
                    type: 'line',
                    label: 'Resultado Total',
                    data: dailyData.map(d => d.result),
                    borderColor: dailyData.length > 0 && dailyData[dailyData.length - 1].result >= 0 ? '#22c55e' : '#ef4444',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'transparent';
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        const isPositive = dailyData.length > 0 && dailyData[dailyData.length - 1].result >= 0;
                        if (isPositive) {
                            gradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
                            gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
                        } else {
                            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
                            gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
                        }
                        return gradient;
                    },
                    fill: true,
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: dailyData.map(d => d.result >= 0 ? '#22c55e' : '#ef4444'),
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Invertido',
                    data: dailyData.map(d => d.invested),
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderColor: 'transparent',
                    borderWidth: 0,
                    barThickness: 10,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 10 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': $' + context.parsed.y.toLocaleString('es-AR', { minimumFractionDigits: 2 });
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, color: '#1e293b' },
                    ticks: { color: '#64748b', font: { size: 10 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { color: '#1e293b', drawBorder: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 },
                        callback: function (value) {
                            return '$' + value.toLocaleString('es-AR');
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: false, // Ocultar eje de barras (estilo volumen fondo)
                    position: 'left',
                    min: 0,
                    max: maxInvested * 3, // Forzar que las barras queden abajo
                    grid: { display: false }
                }
            }
        }
    });
}

// ========================================
// Gráfico de sectores (Donut)
// ========================================
function renderSectorChart(portfolio) {
    const ctx = document.getElementById('sector-chart');
    if (!ctx) return;

    // Agrupar por sector
    const sectors = {};
    Object.values(portfolio).forEach(p => {
        const sector = SECTOR_MAP[p.symbol] || 'Otros';
        if (!sectors[sector]) sectors[sector] = 0;
        sectors[sector] += p.quantity * (p.currentPrice || p.avgPrice);
    });

    const labels = Object.keys(sectors);
    const data = Object.values(sectors);
    const colors = [
        '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
    ];

    if (sectorChart) sectorChart.destroy();

    sectorChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#0f1629',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#94a3b8', font: { size: 11 }, padding: 15 }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    callbacks: {
                        label: function (context) {
                            const total = data.reduce((a, b) => a + b, 0);
                            const pct = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: $${context.raw.toLocaleString('es-AR', { minimumFractionDigits: 2 })} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ========================================
// Cálculo de evolución diaria para gráfico
// ========================================
function calculateDailyEvolution() {
    // Usar dailyStats directamente, filtrado por año
    if (!dailyStats || dailyStats.length === 0) return [];

    // Filtrar por año seleccionado
    let filteredStats = [...dailyStats];

    if (selectedPeriod === '2025') {
        filteredStats = dailyStats.filter(s => s.date.startsWith('2025'));
    } else if (selectedPeriod === '2026') {
        filteredStats = dailyStats.filter(s => s.date.startsWith('2026'));
    }
    // Si selectedPeriod === 'all', usar todos los datos

    // Ordenar por fecha
    filteredStats.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Formatear datos para el gráfico
    return filteredStats.map(stat => ({
        date: fmtDate(stat.date),
        invested: stat.invested,
        result: stat.result
    }));
}

// ========================================
// Exponer globalmente
// ========================================
window.renderCharts = renderCharts;
window.renderInterestingStats = renderInterestingStats;
window.renderCombinedChart = renderCombinedChart;
window.renderSectorChart = renderSectorChart;
window.calculateDailyEvolution = calculateDailyEvolution;
window.SECTOR_MAP = SECTOR_MAP;

console.log('Charts: Loaded');
