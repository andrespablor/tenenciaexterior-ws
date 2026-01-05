// ========================================
// API.JS - Fetch de Precios y Datos
// ========================================

// ========================================
// API de Precios
// ========================================
// Lista de proxies CORS para fallback
const CORS_PROXIES = [
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// ========================================
// Finnhub API - Price Fetching
// ========================================
async function fetchPriceFromFinnhub(symbol) {
    const apiKey = appSettings.finnhubApiKey;

    if (!apiKey) {
        return null;
    }

    try {
        // Fetch quote (current price)
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
        const quoteRes = await fetch(quoteUrl);

        if (!quoteRes.ok) {
            throw new Error(`HTTP ${quoteRes.status}`);
        }

        const quoteData = await quoteRes.json();

        // Finnhub returns: c (current), pc (previous close), h (high), l (low), o (open), t (timestamp)
        const price = quoteData.c;
        const prev = quoteData.pc;
        const dayHigh = quoteData.h;
        const dayLow = quoteData.l;
        const timestamp = quoteData.t; // Unix timestamp in seconds

        if (!price || price === 0) {
            return null;
        }

        const change = prev ? ((price - prev) / prev) * 100 : 0;
        const dailyDiff = prev ? (price - prev) : 0;

        return {
            price,
            previousClose: prev,
            dailyChange: change,
            dailyDiff,
            dayHigh,
            dayLow,
            marketTime: timestamp,
            source: 'finnhub'
        };

    } catch (error) {
        console.error(`❌ Finnhub error for ${symbol}:`, error.message);
        return null;
    }
}

// Función auxiliar para obtener datos históricos de Yahoo (para MACD, etc)
async function fetchYahooHistoricalData(symbol) {
    const yahooHost = Math.random() > 0.5 ? 'query1.finance.yahoo.com' : 'query2.finance.yahoo.com';
    const url = `https://${yahooHost}/v8/finance/chart/${symbol}?interval=1d&range=2mo`;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxyUrl = CORS_PROXIES[i](url);
            const res = await fetch(proxyUrl);

            if (!res.ok) continue;

            const data = await res.json();
            const result = data.chart?.result?.[0];
            if (!result) continue;

            const meta = result.meta;
            const closes = result.indicators?.quote?.[0]?.close || [];
            const volumes = result.indicators?.quote?.[0]?.volume || [];

            // Calcular MACD
            const validCloses = closes.filter(p => p && p > 0);
            let macd = null;
            if (validCloses.length >= 26) {
                const ema12 = calculateEMA(validCloses, 12);
                const ema26 = calculateEMA(validCloses, 26);
                macd = ema12 - ema26;
            }

            // Calcular avgVolume
            const validVolumes = volumes.filter(v => v && v > 0);
            const avgVolume = validVolumes.length > 0
                ? validVolumes.reduce((sum, v) => sum + v, 0) / validVolumes.length
                : 0;

            return {
                wk52High: meta.fiftyTwoWeekHigh,
                wk52Low: meta.fiftyTwoWeekLow,
                volume: meta.regularMarketVolume || 0,
                avgVolume,
                macd
            };

        } catch (error) {
            continue;
        }
    }

    return null;
}


async function fetchPrice(symbol) {
    // Corrección común de typos
    if (symbol === 'APPL') {
        console.warn('⚠️ Símbolo incorrecto detectado: APPL -> Usando AAPL');
        symbol = 'AAPL';
    }

    // ===========================================
    // ESTRATEGIA 1: Intentar Finnhub primero
    // ===========================================
    if (appSettings.finnhubApiKey) {
        try {
            const finnhubData = await fetchPriceFromFinnhub(symbol);

            if (finnhubData) {
                // Finnhub tiene el precio básico, pero necesitamos datos históricos para MACD
                // Vamos a Yahoo SOLO para MACD y otros indicadores técnicos
                const yahooHistorical = await fetchYahooHistoricalData(symbol);

                // Combinar datos de Finnhub (precio actual) con Yahoo (históricos)
                const newTimestamp = finnhubData.marketTime;

                // Validar timestamp
                const existingData = priceCache[symbol];
                if (existingData && existingData.marketTime >= newTimestamp) {
                    console.log(`⏭️ ${symbol}: Skipping update. Existing data is newer or same`);
                    return { price: existingData.price, change: existingData.dailyChange };
                }

                // Actualizar priceCache con datos de Finnhub + indicadores de Yahoo
                priceCache[symbol] = {
                    price: finnhubData.price,
                    dailyChange: finnhubData.dailyChange,
                    dailyDiff: finnhubData.dailyDiff,
                    dayHigh: finnhubData.dayHigh,
                    dayLow: finnhubData.dayLow,
                    wk52High: yahooHistorical?.wk52High || finnhubData.dayHigh,
                    wk52Low: yahooHistorical?.wk52Low || finnhubData.dayLow,
                    volume: yahooHistorical?.volume || 0,
                    avgVolume: yahooHistorical?.avgVolume || 0,
                    macd: yahooHistorical?.macd || null,
                    previousClose: finnhubData.previousClose,
                    marketTime: newTimestamp,
                    rating: null,
                    timestamp: Date.now(),
                    source: 'finnhub'
                };

                console.log(`✅ ${symbol}: Updated to $${finnhubData.price.toFixed(2)} from Finnhub at ${new Date(newTimestamp * 1000).toLocaleTimeString()}`);
                // ⚠️ REMOVED saveData() - will be called once at end of refresh cycle
                return { price: finnhubData.price, change: finnhubData.dailyChange };
            }
        } catch (error) {
            console.warn(`⚠️ Finnhub failed for ${symbol}, falling back to Yahoo: `, error.message);
        }
    }

    // ===========================================
    // ESTRATEGIA 2: Fallback a Yahoo Finance
    // ===========================================
    console.log(`📊 Using Yahoo Finance for ${symbol}`);

    // Alternar entre query1 y query2 de Yahoo para evitar rate limits
    const yahooHost = Math.random() > 0.5 ? 'query1.finance.yahoo.com' : 'query2.finance.yahoo.com';
    // Usar 2 meses para asegurar 26+ días de trading para MACD
    const url = `https://${yahooHost}/v8/finance/chart/${symbol}?interval=1d&range=2mo`;

    let lastError = null;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxyUrl = CORS_PROXIES[i](url);

            const res = await fetch(proxyUrl);

            if (res.status === 404) {
                console.error(`❌ Símbolo no encontrado: ${symbol}`);
                return null;
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data.chart?.result?.[0]) throw new Error('Invalid structure');

            const result = data.chart.result[0];
            const meta = result.meta;
            const price = meta.regularMarketPrice;

            // Calcular previousClose desde los datos históricos (penúltimo día)
            let prev = meta.previousClose || meta.chartPreviousClose;
            try {
                const closes = result.indicators?.quote?.[0]?.close || [];
                const validCloses = closes.filter(p => p && p > 0);
                if (validCloses.length >= 2) {
                    // Usar el penúltimo cierre como previous close
                    prev = validCloses[validCloses.length - 2];
                }
            } catch (e) {
                console.warn(`${symbol}: Could not get previous close from history, using meta`);
            }

            const change = prev ? ((price - prev) / prev) * 100 : 0;
            const dailyDiff = prev ? (price - prev) : 0;

            // Datos adicionales para rangos
            const dayHigh = meta.regularMarketDayHigh || price;
            const dayLow = meta.regularMarketDayLow || price;
            const wk52High = meta.fiftyTwoWeekHigh || price;
            const wk52Low = meta.fiftyTwoWeekLow || price;

            // Volumen - calcular average desde datos históricos
            const volume = meta.regularMarketVolume || 0;
            let avgVolume = 0;

            // Intentar calcular avgVolume desde el array de volúmenes
            try {
                const volumes = result.indicators?.quote?.[0]?.volume || [];
                const validVolumes = volumes.filter(v => v && v > 0);
                if (validVolumes.length > 0) {
                    avgVolume = validVolumes.reduce((a, b) => a + b, 0) / validVolumes.length;
                }
            } catch (e) {
                console.warn(`${symbol}: Could not calculate avgVolume`);
            }

            // Calcular MACD desde datos históricos
            let macd = null;
            try {
                const closes = result.indicators?.quote?.[0]?.close || [];
                const validCloses = closes.filter(p => p && p > 0);
                console.log(`${symbol} - Got ${validCloses.length} closes for MACD`);
                if (validCloses.length >= 26) {
                    macd = calculateMACD(validCloses);
                    console.log(`${symbol} - MACD calculated: ${macd}`);
                } else {
                    console.warn(`${symbol} - Insufficient data for MACD (need 26, got ${validCloses.length})`);
                }
            } catch (e) {
                console.warn(`${symbol} - MACD calc error:`, e);
            }

            const newTimestamp = meta.regularMarketTime || Date.now() / 1000;

            // Solo actualizar si NO hay datos previos O si los nuevos datos son más recientes
            const existingData = priceCache[symbol];
            if (existingData && existingData.marketTime >= newTimestamp) {
                console.log(`⏭️ ${symbol}: Skipping update. Existing data is newer or same (${new Date(existingData.marketTime * 1000).toLocaleTimeString()} >= ${new Date(newTimestamp * 1000).toLocaleTimeString()})`);
                return { price: existingData.price, change: existingData.dailyChange };
            }

            priceCache[symbol] = {
                price,
                dailyChange: change,
                dailyDiff: dailyDiff,
                dayHigh,
                dayLow,
                wk52High,
                wk52Low,
                volume,
                avgVolume,
                macd,
                previousClose: prev,
                marketTime: newTimestamp,
                rating: null,
                timestamp: Date.now()
            };
            console.log(`✅ ${symbol}: Updated to $${price.toFixed(2)} at ${new Date(newTimestamp * 1000).toLocaleTimeString()}`);
            // ⚠️ REMOVED saveData() - will be called once at end of refresh cycle
            return { price, change };

        } catch (e) {
            lastError = e;
            if (i === CORS_PROXIES.length - 1) {
                console.error(`❌ ${symbol}: All proxies failed`);
            }
        }
    }

    console.error(`❌ Failed to fetch ${symbol}. Keeping old price:`, priceCache[symbol]?.price || 'N/A');
    return null;
}

// Fetch analyst rating (scraping desde Yahoo Finance)
async function fetchAnalystRating(symbol) {
    try {
        const url = `https://finance.yahoo.com/quote/${symbol}`;

        // Intentar con cada proxy
        for (let i = 0; i < CORS_PROXIES.length; i++) {
            try {
                const proxyUrl = CORS_PROXIES[i](url);
                const res = await fetch(proxyUrl);

                if (!res.ok) continue;

                const html = await res.text();

                // Buscar el rating en el HTML (patrón común: "Recommendation Rating" seguido del valor)
                // Yahoo Finance suele mostrar ratings como Strong Buy (1.0-1.5), Buy (1.5-2.5), Hold (2.5-3.5), Sell (3.5-4.5), Strong Sell (4.5-5.0)
                const ratingMatch = html.match(/Recommendation Rating.*?([0-9.]+)/i) ||
                    html.match(/recommendation-rating.*?([0-9.]+)/i) ||
                    html.match(/analyst.*?rating.*?([0-9.]+)/i);

                if (ratingMatch) {
                    const ratingValue = parseFloat(ratingMatch[1]);
                    let ratingText = '';
                    if (ratingValue <= 1.5) ratingText = 'S.Buy';
                    else if (ratingValue <= 2.5) ratingText = 'Buy';
                    else if (ratingValue <= 3.5) ratingText = 'Hold';
                    else if (ratingValue <= 4.5) ratingText = 'Sell';
                    else ratingText = 'S.Sell';

                    return ratingText;
                }

                // Si no encontramos rating numérico, buscar texto directo
                const textMatch = html.match(/(Strong Buy|Buy|Hold|Underperform|Sell|Strong Sell)/i);
                if (textMatch) {
                    const rating = textMatch[1];
                    if (rating.includes('Strong Buy')) return 'S.Buy';
                    if (rating.includes('Buy')) return 'Buy';
                    if (rating.includes('Hold')) return 'Hold';
                    if (rating.includes('Sell')) return 'Sell';
                }

            } catch (e) {
                // Probar siguiente proxy
            }
        }

        return null; // No se pudo obtener
    } catch (e) {
        console.warn(`Could not fetch rating for ${symbol}`);
        return null;
    }
}

// ========================================
// Technical Indicators
// ========================================

// Fetch historical data for technical indicators
async function fetchHistoricalData(symbol, days = 60) {
    // Pedir 1 mes para tener suficientes datos para MACD
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;

    // Try each proxy like fetchPrice does
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxy = CORS_PROXIES[i](url);
            const res = await fetch(proxy);
            if (!res.ok) continue;

            const data = await res.json();
            if (!data.chart?.result?.[0]) continue;

            const quotes = data.chart.result[0].indicators.quote[0];
            const closes = quotes.close.filter(p => p !== null);

            if (closes && closes.length > 0) {
                return { closes };
            }
        } catch (e) {
            if (i === CORS_PROXIES.length - 1) {
                console.warn(`${symbol}: All proxies failed for historical data`);
            }
        }
    }
    return null;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) {
            avgGain = (avgGain * (period - 1) + change) / period;
            avgLoss = (avgLoss * (period - 1)) / period;
        } else {
            avgGain = (avgGain * (period - 1)) / period;
            avgLoss = (avgLoss * (period - 1) - change) / period;
        }
    }

    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
}

// Calculate SMA
function calculateSMA(prices, period) {
    if (prices.length < period) return null;
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Calculate EMA
function calculateEMA(prices, period) {
    if (prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * k + ema;
    }
    return ema;
}

// Calculate MACD
function calculateMACD(prices) {
    if (prices.length < 26) return null;
    return calculateEMA(prices, 12) - calculateEMA(prices, 26);
}

// Calculate Bollinger %
function calculateBollingerPct(prices, period = 20) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    const current = prices[prices.length - 1];
    const upper = sma + (2 * stdDev);
    const lower = sma - (2 * stdDev);
    if (upper === lower) return 50;
    return ((current - lower) / (upper - lower)) * 100;
}

// Fetch all technical indicators
async function fetchTechnicalIndicators(symbol) {
    try {
        const hist = await fetchHistoricalData(symbol);
        if (!hist) {
            console.warn(`${symbol}: No historical data available`);
            return null;
        }
        const { closes } = hist;

        if (!closes || closes.length < 50) {
            console.warn(`${symbol}: Insufficient data (${closes?.length || 0} days)`);
            return null;
        }

        const indicators = {
            rsi: calculateRSI(closes, 14),
            sma50: calculateSMA(closes, 50),
            macd: calculateMACD(closes),
            bollingerPct: calculateBollingerPct(closes, 20)
        };

        console.log(`${symbol} indicators:`, indicators);
        return indicators;
    } catch (e) {
        console.error(`${symbol} indicator error:`, e);
        return null;
    }
}

let isRefreshing = false;

async function refreshAllPrices() {
    console.log('🔄 refreshAllPrices called. isRefreshing:', isRefreshing);

    // Evitar clicks múltiples
    if (isRefreshing) {
        console.log('⏸️ Already refreshing, please wait...');
        return;
    }

    // Símbolos del RESUMEN (todos los que alguna vez se compraron/vendieron)
    const speciesSummary = calculateSpeciesSummary();
    const portfolioSymbols = Object.keys(speciesSummary);

    // Símbolos de la watchlist actual
    const watchlistSymbols = getCurrentWatchlist ? getCurrentWatchlist() : [];

    // Combinar todos los símbolos únicos
    const symbols = [...new Set([...portfolioSymbols, ...watchlistSymbols])];

    console.log('📋 Portfolio symbols:', portfolioSymbols);
    console.log('📋 Watchlist symbols:', watchlistSymbols);
    console.log('📋 Combined symbols to refresh:', symbols);

    if (!symbols.length) {
        console.log('⚠️ No symbols to refresh');
        return;
    }

    isRefreshing = true;
    showLoading(true);

    try {
        console.log('🚀 Starting price fetch for', symbols.length, 'symbols with rate limiting...');

        // Cola secuencial con delay para evitar rate limit de Finnhub (60 req/min = 1 req/seg)
        // Usamos 400ms para ser conservadores pero rápidos
        const DELAY_MS = 400;
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            console.log(`📊 [${i + 1}/${symbols.length}] Fetching ${symbol}...`);
            await fetchPrice(symbol);

            // Solo hacer delay si no es el último símbolo
            if (i < symbols.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }

        console.log('🎨 Rendering all...');
        renderAll();

        // También refrescar watchlist si existe
        if (typeof renderWatchlist === 'function') {
            renderWatchlist();
        }
        console.log('✅ Prices updated successfully!');
    } catch (error) {
        console.error('❌ Error refreshing prices:', error);
    } finally {
        // SIEMPRE resetear isRefreshing, incluso si hay error
        isRefreshing = false;
        showLoading(false);
        console.log('🏁 Refresh complete. isRefreshing reset to false');
    }
}

// Exponer globalmente
window.fetchPrice = fetchPrice;
window.fetchPriceFromFinnhub = fetchPriceFromFinnhub;
window.refreshAllPrices = refreshAllPrices;
window.fetchTechnicalIndicators = fetchTechnicalIndicators;

console.log('API: Loaded');
