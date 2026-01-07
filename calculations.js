// ========================================
// CALCULATIONS.JS - Cálculos de Portfolio
// ========================================

function calculatePortfolio() {
    console.log('📊 calculatePortfolio: Using priceCache with', Object.keys(priceCache).length, 'symbols');
    const holdings = {};
    const sorted = [...movements].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(mov => {
        if (!holdings[mov.symbol]) {
            holdings[mov.symbol] = {
                symbol: mov.symbol,
                quantity: 0,
                totalCost: 0,
                avgPrice: 0,
                currentPrice: priceCache[mov.symbol]?.price || null,
                dailyChange: priceCache[mov.symbol]?.dailyChange || 0
            };
        }

        if (mov.type === 'COMPRA') {
            const newQty = holdings[mov.symbol].quantity + mov.quantity;
            holdings[mov.symbol].totalCost += mov.quantity * mov.price;
            holdings[mov.symbol].quantity = newQty;
            holdings[mov.symbol].avgPrice = holdings[mov.symbol].totalCost / newQty;
        } else {
            const remain = holdings[mov.symbol].quantity - mov.quantity;
            if (remain > 0) {
                const costRed = (mov.quantity / holdings[mov.symbol].quantity) * holdings[mov.symbol].totalCost;
                holdings[mov.symbol].totalCost -= costRed;
                holdings[mov.symbol].quantity = remain;
                holdings[mov.symbol].avgPrice = holdings[mov.symbol].totalCost / remain;
            } else {
                holdings[mov.symbol].quantity = 0;
                holdings[mov.symbol].totalCost = 0;
                holdings[mov.symbol].avgPrice = 0;
            }
        }
    });

    const active = {};
    Object.keys(holdings).forEach(s => {
        if (holdings[s].quantity > 0) active[s] = holdings[s];
    });
    return active;
}

function calculateSpeciesSummary() {
    const summary = {};
    const filtered = filterMovementsByPeriod(movements);

    filtered.forEach(mov => {
        if (!summary[mov.symbol]) {
            summary[mov.symbol] = {
                symbol: mov.symbol,
                totalBought: 0,
                totalSold: 0,
                totalDividends: 0,
                currentPrice: priceCache[mov.symbol]?.price || null
            };
        }

        if (mov.type === 'COMPRA') {
            summary[mov.symbol].totalBought += mov.quantity * mov.price;
        } else if (mov.type === 'VENTA') {
            summary[mov.symbol].totalSold += mov.quantity * mov.price;
        } else if (mov.type === 'DIVIDENDO') {
            summary[mov.symbol].totalDividends += mov.quantity * mov.price;
        }
    });

    const portfolio = calculatePortfolio();

    // Para 2026: incluir posiciones actuales aunque no haya movimientos
    // y calcular resultado como (valor_actual - valor_cierre_2025)
    if (selectedPeriod === '2026' && yearEndSnapshots['2025'] && yearEndSnapshots['2025'].bySymbol) {
        const baselines = yearEndSnapshots['2025'].bySymbol;

        // Agregar símbolos del baseline que tienen posición actual
        Object.keys(baselines).forEach(symbol => {
            if (portfolio[symbol] && !summary[symbol]) {
                const baseline = baselines[symbol];
                const currentPrice = priceCache[symbol]?.price || baseline.price;
                const currentValue = portfolio[symbol].quantity * currentPrice;
                const baselineValue = baseline.quantity * baseline.price;

                summary[symbol] = {
                    symbol: symbol,
                    totalBought: 0,
                    totalSold: 0,
                    totalDividends: 0,
                    currentPrice: currentPrice,
                    currentQuantity: portfolio[symbol].quantity,
                    currentValue: currentValue,
                    totalResult: currentValue - baselineValue  // Resultado = cambio desde cierre
                };
            }
        });
    }

    Object.keys(summary).forEach(s => {
        const sum = summary[s];
        sum.currentQuantity = portfolio[s]?.quantity || 0;
        const price = sum.currentPrice || (portfolio[s]?.avgPrice || 0);
        sum.currentValue = sum.currentQuantity * price;

        // Para 2025: usar resultado FIJO del baseline (año cerrado)
        if (selectedPeriod === '2025' && yearEndSnapshots['2025']?.bySymbol?.[s]) {
            sum.totalResult = yearEndSnapshots['2025'].bySymbol[s].result;
        }
        // Para 2026 con baseline: calcular desde cierre 2025
        else if (selectedPeriod === '2026' && yearEndSnapshots['2025']?.bySymbol?.[s]) {
            const baseline = yearEndSnapshots['2025'].bySymbol[s];
            const baselineValue = baseline.quantity * baseline.price;

            // Validar que el baseline tenga datos válidos
            if (isNaN(baselineValue) || baselineValue === undefined || baselineValue === null) {
                // Baseline corrupto - tratar como símbolo nuevo
                sum.totalResult = (sum.totalSold + sum.currentValue + sum.totalDividends) - sum.totalBought;
            } else {
                sum.totalResult = (sum.totalSold + sum.currentValue + sum.totalDividends) - (sum.totalBought + baselineValue);
            }
        }
        // Para 2026 SIN baseline: símbolo nuevo, calcular desde operaciones del año
        else if (selectedPeriod === '2026') {
            sum.totalResult = (sum.totalSold + sum.currentValue + sum.totalDividends) - sum.totalBought;
            totalSold: sum.totalSold,
                currentValue: sum.currentValue,
                    totalDividends: sum.totalDividends,
                        totalBought: sum.totalBought,
                            result: sum.totalResult
        });
}
        }
        // Para TODO y otros: cálculo dinámico normal
        else {
    sum.totalResult = (sum.totalSold + sum.currentValue + sum.totalDividends) - sum.totalBought;
}

// Asegurar que totalResult sea un número válido
if (isNaN(sum.totalResult) || sum.totalResult === undefined || sum.totalResult === null) {
    console.warn(`⚠️ ${s}: totalResult was invalid (${sum.totalResult}), setting to 0`);
    sum.totalResult = 0;
}
    });

return summary;
}

// Exponer globalmente
window.calculatePortfolio = calculatePortfolio;
window.calculateSpeciesSummary = calculateSpeciesSummary;

console.log('Calculations: Loaded');
