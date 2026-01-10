// ========================================
// CONFIG.JS - Estado Global y Constantes
// ========================================
let movements = [];

const DEFAULT_DAILY_STATS = [
    { date: '2025-11-24', invested: 77244.23, result: 25754.62 },
    { date: '2025-11-25', invested: 78528.00, result: 27038.39 },
    { date: '2025-11-26', invested: 69722.11, result: 28467.35 },
    { date: '2025-11-27', invested: 69722.11, result: 28467.35 },
    { date: '2025-11-28', invested: 70502.99, result: 29248.23 },
    { date: '2025-12-01', invested: 70212.97, result: 28958.21 },
    { date: '2025-12-02', invested: 71236.92, result: 29982.16 },
    { date: '2025-12-03', invested: 77526.04, result: 31414.17 },
    { date: '2025-12-04', invested: 77934.97, result: 31823.10 },
    { date: '2025-12-05', invested: 75529.20, result: 29417.33 },
    { date: '2025-12-08', invested: 55746.40, result: 29823.68 },
    { date: '2025-12-09', invested: 55606.90, result: 29684.18 },
    { date: '2025-12-10', invested: 55576.03, result: 29653.31 },
    { date: '2025-12-11', invested: 55162.07, result: 29239.35 },
    { date: '2025-12-12', invested: 42051.16, result: 29241.59 },
    { date: '2025-12-15', invested: 42122.42, result: 29312.85 },
    { date: '2025-12-16', invested: 39837.26, result: 27027.69 },
    { date: '2025-12-17', invested: 39071.40, result: 26261.83 },
    { date: '2025-12-18', invested: 39360.72, result: 26551.15 },
    { date: '2025-12-19', invested: 39391.54, result: 26582.37 },
    { date: '2025-12-22', invested: 39356.68, result: 26547.11 },
    { date: '2025-12-23', invested: 40014.44, result: 27204.87 },
    { date: '2025-12-24', invested: 40021.34, result: 27211.77 },
    { date: '2025-12-25', invested: 40021.34, result: 27211.77 }
];

let dailyStats = [];
// Nueva estructura de watchlists con metadata
let watchlists = {
    default: {
        displayName: 'Mi Watchlist',
        icon: '📋',
        symbols: []
    }
};
let currentWatchlistId = 'default';
let priceAlerts = [];
let priceCache = {};
let selectedPeriod = new Date().getFullYear().toString(); // Default: año actual
let searchQuery = '';
let sortConfig = { column: null, direction: 'asc' };

// Finnhub API Toggle - Set to false to use Yahoo Finance only
const USE_FINNHUB = false; // Change to true to re-enable Finnhub

// Server API URL (cambiar a producción cuando se despliegue)
const SERVER_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080/api'
    : 'https://tenenciaexterior-ws.onrender.com/api';

let yearEndSnapshots = {
    '2025': {
        date: '2025-12-31',
        invested: 40764.36,
        result: 27758.07,
        bySymbol: {
            'VIST': { result: 9979.17, price: 48.66, quantity: 446 },
            'EWZ': { result: 2283.92, price: 31.77, quantity: 600 },
            'AMZN': { result: 452.60 },
            'BIDU': { result: -288.92 },
            'BITO': { result: 210.00 },
            'ETH': { result: 266.70 },
            'ETHA': { result: 2.10 },
            'ETHE': { result: -986.50 },
            'GGAL': { result: 1422.00 },
            'GLOB': { result: 123.00 },
            'GOOGL': { result: 2322.32 },
            'INTC': { result: 1305.00 },
            'MELI': { result: 717.18 },
            'META': { result: 797.40 },
            'NFLX': { result: -38.50 },
            'NU': { result: 1551.22 },
            'PAGS': { result: -375.00 },
            'TSLA': { result: 78.75 },
            'UNH': { result: 3772.38 },
            'VALE': { result: 830.00 },
            'YPF': { result: 3331.25 }
        }
    }
};
let evolutionChart = null;
let distributionChart = null;
let editingIndex = -1;
let autoRefreshInterval = null;
let appSettings = {
    appName: 'Portfolio Tracker',
    theme: 'dark',
    finnhubApiKey: '',
    storageBackend: 'sheets' // 'local' o 'sheets' - DEFAULT: sheets para sync automático
};

const SHEETS_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbwncIJppeHoP2ursvQgHojIOI6FDeT8TVr8lvhluir60AAR_19YZTJywG9xTdPFzJy6/exec'
};

console.log('Config: Loaded');
