const express = require('express');
const router = express.Router();
const cache = require('./cache');
const finnhub = require('./finnhub-client');

// Helper to calculate local SMA if API fails
function calculateSmaLocal(closes, period = 200) {
    if (!closes || closes.length < period) {
        return null;
    }
    const recentCloses = closes.slice(-period);
    const sum = recentCloses.reduce((acc, val) => acc + val, 0);
    return sum / period;
}

// GET /api/price/:symbol
router.get('/price/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `price:${symbol}`;

    try {
        // Check cache (no TTL for prices - always fresh)
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Fetch from Finnhub
        const data = await finnhub.getQuote(symbol);
        cache.set(cacheKey, data, 0); // No expiry - updated by WebSocket
        res.json(data);
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/daily/:symbol
router.get('/daily/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `daily:${symbol}`;

    try {
        // Check cache (24h TTL)
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Fetch from Finnhub
        const data = await finnhub.getDailyData(symbol);
        cache.set(cacheKey, data, 24 * 60 * 60 * 1000); // 24 hours
        res.json(data);
    } catch (error) {
        console.error(`Error fetching daily data for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/indicators/:symbol
router.get('/indicators/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `indicators:${symbol}`;

    try {
        // Check cache (5min TTL)
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Fetch MACD from Finnhub
        const macd = await finnhub.getMACD(symbol);

        const data = {
            macd: macd?.histogram || null
        };

        cache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes
        res.json(data);
    } catch (error) {
        console.error(`Error fetching indicators for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/sma/:symbol
router.get('/sma/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const period = parseInt(req.query.period) || 200;
    const cacheKey = `sma:${symbol}:${period}`;

    try {
        // Check cache (24h TTL)
        const cached = cache.get(cacheKey);
        if (cached !== null) {
            return res.json({ sma: cached });
        }

        // Try Finnhub API first
        let sma = await finnhub.getSMA(symbol, period);

        // Fallback: calculate locally if API fails
        if (!sma) {
            console.log(`📊 Calculating SMA${period} locally for ${symbol}`);
            const dailyData = await finnhub.getDailyData(symbol);
            sma = calculateSmaLocal(dailyData.closes, period);
        }

        cache.set(cacheKey, sma, 24 * 60 * 60 * 1000); // 24 hours
        res.json({ sma });
    } catch (error) {
        console.error(`Error fetching SMA for ${symbol}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/cache/stats
router.get('/cache/stats', (req, res) => {
    res.json({
        size: cache.size(),
        timestamp: new Date().toISOString()
    });
});

// POST /api/cache/clear
router.post('/cache/clear', (req, res) => {
    cache.clear();
    res.json({ message: 'Cache cleared successfully' });
});

module.exports = router;
