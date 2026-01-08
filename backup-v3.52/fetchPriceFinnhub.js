// ========================================
// Finnhub API - Price Fetching
// ========================================
async function fetchPriceFromFinnhub(symbol) {
    const apiKey = appSettings.finnhubApiKey;

    if (!apiKey) {
        console.warn('⚠️ Finnhub API key not configured. Skipping Finnhub.');
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
            console.warn(`${symbol}: Finnhub returned invalid price`);
            return null;
        }

        const change = prev ? ((price - prev) / prev) * 100 : 0;
        const dailyDiff = prev ? (price - prev) : 0;

        console.log(`🔵 Finnhub: ${symbol} = $${price.toFixed(2)} at ${new Date(timestamp * 1000).toLocaleTimeString()}`);

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
