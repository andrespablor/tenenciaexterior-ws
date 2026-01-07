const fetch = require('node-fetch');

const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

if (!API_KEY) {
    console.error('❌ FINNHUB_API_KEY not set in environment variables');
}

async function getQuote(symbol) {
    const url = `${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`;
    console.log(`🔍 Fetching quote for ${symbol}`);

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Finnhub quote error: ${res.status}`);
    }

    const data = await res.json();

    // Transform to match frontend format
    return {
        price: data.c,
        previousClose: data.pc,
        dailyChange: data.pc ? ((data.c - data.pc) / data.pc) * 100 : 0,
        dailyDiff: data.pc ? (data.c - data.pc) : 0,
        dayHigh: data.h,
        dayLow: data.l,
        marketTime: data.t,
        source: 'finnhub-server'
    };
}

async function getDailyData(symbol) {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - (365 * 24 * 60 * 60);

    const url = `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${oneYearAgo}&to=${now}&token=${API_KEY}`;
    console.log(`📊 Fetching daily data for ${symbol}`);

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Finnhub candle error: ${res.status}`);
    }

    const data = await res.json();

    if (data.s !== 'ok' || !data.h || !data.l || !data.v) {
        throw new Error('Invalid candle data');
    }

    // Calculate 52-week range
    const wk52High = Math.max(...data.h);
    const wk52Low = Math.min(...data.l);

    // Calculate average volume (last 60 days)
    const recentVolumes = data.v.slice(-60).filter(v => v > 0);
    const avgVolume = recentVolumes.length > 0
        ? recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length
        : 0;
    const currentVolume = data.v[data.v.length - 1] || 0;

    return {
        wk52High,
        wk52Low,
        volume: currentVolume,
        avgVolume,
        highs: data.h,
        lows: data.l,
        closes: data.c
    };
}

async function getMACD(symbol) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (200 * 24 * 60 * 60);

    const url = `${BASE_URL}/indicator?symbol=${symbol}&resolution=D&from=${from}&to=${now}&indicator=macd&token=${API_KEY}`;
    console.log(`📈 Fetching MACD for ${symbol}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`MACD fetch failed for ${symbol}: ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (data.macd && data.macd.length > 0) {
            const lastIndex = data.macd.length - 1;
            return {
                macd: data.macd[lastIndex],
                signal: data.macdSignal[lastIndex],
                histogram: data.macdHist[lastIndex],
                date: data.t[lastIndex]
            };
        }
    } catch (err) {
        console.warn(`MACD error for ${symbol}:`, err.message);
    }

    return null;
}

async function getSMA(symbol, period = 200) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - (300 * 24 * 60 * 60);

    const url = `${BASE_URL}/indicator?symbol=${symbol}&resolution=D&from=${from}&to=${now}&indicator=sma&indicator_fields={"timeperiod":${period}}&token=${API_KEY}`;
    console.log(`📉 Fetching SMA${period} for ${symbol}`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`SMA fetch failed for ${symbol}: ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (data.sma && data.sma.length > 0) {
            return data.sma[data.sma.length - 1];
        }
    } catch (err) {
        console.warn(`SMA error for ${symbol}:`, err.message);
    }

    return null;
}

module.exports = { getQuote, getDailyData, getMACD, getSMA };
