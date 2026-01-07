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
// Cache Configuration
// ========================================
const CACHE_INTERVALS = {
    PRICE: 0,                          // WebSocket (tiempo real)
    DAILY_DATA: 4 * 60 * 60 * 1000,   // 4 horas (en vez de 24h para datos más frescos)
    INDICATORS: 5 * 60 * 1000          // 5 minutos (MACD, Stochastic)
};

// Helper: Verificar si el cache necesita actualización
function needsCacheUpdate(symbol, cacheType) {
    const cache = priceCache[symbol];
    if (!cache || !cache.lastUpdate) return true;

    const now = Date.now();
    const lastUpdate = cache.lastUpdate[cacheType];

    if (!lastUpdate) return true;

    // Para DAILY_DATA: forzar actualización si cambió el día
    if (cacheType === 'DAILY_DATA') {
        const lastUpdateDate = new Date(lastUpdate).toDateString();
        const nowDate = new Date(now).toDateString();

        // Si cambió el día, forzar actualización
        if (lastUpdateDate !== nowDate) {
            return true;
        }
    }

    const interval = CACHE_INTERVALS[cacheType];
    return (now - lastUpdate) > interval;
}


// ========================================
// Server API - Price Fetching
// ========================================
async function fetchPriceFromFinnhub(symbol) {
    try {
        // Call server endpoint instead of Finnhub directly
        const url = `${SERVER_API_URL}/price/${symbol}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!data.price || data.price === 0) {
            return null;
        }

        return {
            price: data.price,
            previousClose: data.previousClose,
            dailyChange: data.dailyChange,
            dailyDiff: data.dailyDiff,
            dayHigh: data.dayHigh,
            dayLow: data.dayLow,
            marketTime: data.marketTime,
            source: 'server'
        };

    } catch (error) {
        console.error(`❌ Server error for ${symbol}:`, error.message);
        return null;
    }
}

// ========================================
// Server API - MACD Indicator
// ========================================
async function fetchMacdFromApi(symbol) {
    try {
        const url = `${SERVER_API_URL}/indicators/${symbol}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`MACD fetch failed for ${symbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.macd; // Server returns just the histogram value
    } catch (error) {
        console.error(`Error fetching MACD for ${symbol}:`, error);
        return null;
    }
}



// ========================================
// Local Stochastic Calculation
// ========================================
// Note: Finnhub Stochastic API requires Premium plan (returns 401)
// Using local calculation instead
function calculateStochasticLocal(highs, lows, closes, periodK = 14, periodD = 3) {
    if (!highs || !lows || !closes || closes.length < periodK) {
        return null;
    }

    // Calculate %K
    const kValues = [];
    for (let i = periodK - 1; i < closes.length; i++) {
        const periodHigh = Math.max(...highs.slice(i - periodK + 1, i + 1));
        const periodLow = Math.min(...lows.slice(i - periodK + 1, i + 1));
        const currentClose = closes[i];

        if (periodHigh === periodLow) {
            kValues.push(50); // Neutral if no range
        } else {
            const k = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;
            kValues.push(k);
        }
    }

    // Calculate %D (SMA of %K)
    if (kValues.length < periodD) {
        return { k: kValues[kValues.length - 1], d: null };
    }

    const recentK = kValues.slice(-periodD);
    const d = recentK.reduce((sum, val) => sum + val, 0) / periodD;

    return {
        k: kValues[kValues.length - 1],
        d: d
    };
}


// ========================================
// Finnhub Daily Data (52-wk Range + Volume)
// ========================================
async function fetchDailyDataFromFinnhub(symbol) {
    try {
        const url = `${SERVER_API_URL}/daily/${symbol}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`Daily data fetch failed for ${symbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();

        return {
            wk52High: data.wk52High,
            wk52Low: data.wk52Low,
            volume: data.volume,
            avgVolume: data.avgVolume,
            highs: data.highs,
            lows: data.lows,
            closes: data.closes
        };
    } catch (error) {
        console.error(`Error fetching daily data for ${symbol}:`, error);
        return null;
    }
}

// ========================================
// Finnhub SMA Indicator
// ========================================
async function fetchSmaFromApi(symbol, period = 200) {
    try {
        const url = `${SERVER_API_URL}/sma/${symbol}?period=${period}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn(`SMA fetch failed for ${symbol}: ${response.status}`);
            return null;
        }

        const data = await response.json();
        return data.sma;
    } catch (error) {
        console.warn(`SMA API error for ${symbol}:`, error.message);
        return null;
    }
}

// ========================================
// Local SMA Calculation (Fallback)
// ========================================
function calculateSmaLocal(closes, period = 200) {
    if (!closes || closes.length < period) {
        return null;
    }

    const recentCloses = closes.slice(-period);
    const sum = recentCloses.reduce((acc, val) => acc + val, 0);
    return sum / period;
}


// Función auxiliar para obtener datos históricos de Yahoo (para MACD, etc)
async function fetchYahooHistoricalData(symbol) {
    // 1. Intentar obtener MACD real de Finnhub API (indicador 'macd')
    let finnhubMacd = null;
    try {
        const macdData = await fetchMacdFromApi(symbol);
        if (macdData) {
            finnhubMacd = macdData.histogram; // Usamos el histograma para señal C/V
        }
    } catch (e) {
        // console.warn('Finnhub MACD fetch error:', e);
    }

    // 2. Intentar obtener Stochastic de Finnhub API
    let finnhubStochastic = null;
    try {
        const stochData = await fetchStochasticFromApi(symbol);
        if (stochData) {
            finnhubStochastic = stochData; // { k, d, date }
        }
    } catch (e) {
        // console.warn('Finnhub Stochastic fetch error:', e);
    }

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

            // Calcular MACD local si falló la API
            const validCloses = closes.filter(p => p && p > 0);
            let macd = finnhubMacd;

            if (macd === null && validCloses.length >= 26) {
                // Fallback a cálculo local aproximado (solo si no tenemos el real)
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
                macd,
                stochastic: finnhubStochastic
            };

        } catch (error) {
            continue;
        }
    }

    // Si falló Yahoo, devolver al menos los indicadores de Finnhub si los conseguimos
    if (finnhubMacd !== null || finnhubStochastic !== null) {
        return {
            wk52High: 0, wk52Low: 0, volume: 0, avgVolume: 0,
            macd: finnhubMacd,
            stochastic: finnhubStochastic
        };
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
    // ESTRATEGIA: Finnhub con Caching Inteligente
    // ===========================================
    if (!appSettings.finnhubApiKey) {
        console.warn(`⚠️ No Finnhub API key, falling back to Yahoo for ${symbol}`);
        return await fallbackToYahoo(symbol);
    }

    try {
        const cache = priceCache[symbol];
        const now = Date.now();

        // 1. SIEMPRE obtener precio actual de Finnhub (WebSocket lo maneja en tiempo real)
        const finnhubData = await fetchPriceFromFinnhub(symbol);
        if (!finnhubData) {
            console.warn(`⚠️ Finnhub price failed for ${symbol}, using Yahoo fallback`);
            return await fallbackToYahoo(symbol);
        }

        // 2. Verificar si necesitamos actualizar datos diarios (52-wk, SMA, volume)
        const needsDailyUpdate = needsCacheUpdate(symbol, 'DAILY_DATA');

        // 3. Verificar si necesitamos actualizar indicadores (MACD, Stochastic)
        const needsIndicatorUpdate = needsCacheUpdate(symbol, 'INDICATORS');

        // 4. Preparar promesas para llamadas paralelas
        const promises = [];

        // Datos diarios (1x por día)
        if (needsDailyUpdate) {
            promises.push(
                fetchDailyDataFromFinnhub(symbol),
                fetchSmaFromApi(symbol, 200)
            );
        }

        // Indicadores técnicos (cada 5 min)
        if (needsIndicatorUpdate) {
            promises.push(
                fetchMacdFromApi(symbol)
            );
        }

        // 5. Ejecutar todas las llamadas en paralelo
        let dailyData = {
            wk52High: cache?.wk52High,
            wk52Low: cache?.wk52Low,
            volume: cache?.volume,
            avgVolume: cache?.avgVolume,
            highs: cache?.highs,
            lows: cache?.lows,
            closes: cache?.closes
        };
        let sma200 = cache?.sma200 || 0;
        let indicators = {
            macd: cache?.macd,
            stochastic: cache?.stochastic
        };

        if (promises.length > 0) {
            const results = await Promise.all(promises);
            let resultIndex = 0;

            if (needsDailyUpdate) {
                dailyData = results[resultIndex++] || dailyData;
                let smaFromApi = results[resultIndex++];

                // Fallback: Calculate SMA locally if API failed
                if (!smaFromApi && dailyData?.closes && dailyData.closes.length >= 200) {
                    smaFromApi = calculateSmaLocal(dailyData.closes, 200);
                }

                sma200 = smaFromApi || sma200;
            }

            if (needsIndicatorUpdate) {
                const macdData = results[resultIndex++];

                // Calculate Stochastic locally (Finnhub API requires Premium)
                let stochData = null;
                if (dailyData?.highs && dailyData?.lows && dailyData?.closes) {
                    stochData = calculateStochasticLocal(
                        dailyData.highs,
                        dailyData.lows,
                        dailyData.closes
                    );
                }

                indicators = {
                    macd: macdData?.histogram || indicators.macd,
                    stochastic: stochData || indicators.stochastic
                };
            }
        }

        // 6. Actualizar priceCache con timestamps
        priceCache[symbol] = {
            // Precio en tiempo real
            price: finnhubData.price,
            dailyChange: finnhubData.dailyChange,
            dailyDiff: finnhubData.dailyDiff,
            dayHigh: finnhubData.dayHigh,
            dayLow: finnhubData.dayLow,
            previousClose: finnhubData.previousClose,
            marketTime: finnhubData.marketTime,

            // Datos diarios
            wk52High: dailyData.wk52High || finnhubData.dayHigh,
            wk52Low: dailyData.wk52Low || finnhubData.dayLow,
            volume: dailyData.volume || 0,
            avgVolume: dailyData.avgVolume || 0,
            sma200: sma200,

            // Persist raw history for local calculations
            highs: dailyData.highs,
            lows: dailyData.lows,
            closes: dailyData.closes,

            // Indicadores técnicos
            macd: indicators.macd,
            stochastic: indicators.stochastic,

            // Timestamps de última actualización
            lastUpdate: {
                price: now,
                DAILY_DATA: needsDailyUpdate ? now : (cache?.lastUpdate?.DAILY_DATA || now),
                INDICATORS: needsIndicatorUpdate ? now : (cache?.lastUpdate?.INDICATORS || now)
            },

            // Metadata
            rating: null,
            timestamp: now,
            source: 'finnhub'
        };

        const updateType = needsDailyUpdate ? '(full update)' : needsIndicatorUpdate ? '(indicators)' : '(price only)';
        console.log(`✅ ${symbol}: Updated to $${finnhubData.price.toFixed(2)} ${updateType}`);

        return { price: finnhubData.price, change: finnhubData.dailyChange };

    } catch (error) {
        console.error(`❌ Error in fetchPrice for ${symbol}:`, error);
        return await fallbackToYahoo(symbol);
    }
}

// ===========================================
// Fallback a Yahoo Finance (Solo Emergencia)
// ===========================================
async function fallbackToYahoo(symbol) {
    console.log(`📊 Using Yahoo Finance fallback for ${symbol}`);

    // Alternar entre query1 y query2 de Yahoo para evitar rate limits
    const yahooHost = Math.random() > 0.5 ? 'query1.finance.yahoo.com' : 'query2.finance.yahoo.com';
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
    if (!prices || prices.length < period) return null;
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * k + ema;
    }
    return ema;
}


// Helper simple MACD local (solo como fallback)
function calculateMACDLocal(prices) {
    if (!prices || prices.length < 26) return null;
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

// Fetch all technical indicators (Updated to use API)
async function fetchTechnicalIndicators(symbol) {
    try {
        // 1. MACD Oficial de Finnhub
        const macdData = await fetchMacdFromApi(symbol);

        // 2. Otros indicadores (por ahora mantenemos cálculo local simple para SMA/RSI para no saturar 
        // o podríamos migrarlos también si querés)
        const hist = await fetchHistoricalData(symbol);

        let rsi = null;
        let sma50 = null;
        let sma200 = null;

        if (hist && hist.closes) {
            rsi = calculateRSI(hist.closes, 14);
            sma50 = calculateSMA(hist.closes, 50);
            sma200 = calculateSMA(hist.closes, 200);
        }

        const indicators = {
            macd: macdData ? macdData.histogram : (calculateMACDLocal(hist?.closes) || null), // Fallback local si falla API
            macdSignal: macdData ? macdData.signal : null,
            rsi: rsi,
            sma50: sma50,
            sma200: sma200,
            // Bollinger % is not included in the new structure, keeping it for now if needed elsewhere
            bollingerPct: calculateBollingerPct(hist?.closes, 20)
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
