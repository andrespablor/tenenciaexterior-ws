// ========================================
// STORAGE.JS - Persistencia (Solo Supabase)
// ========================================

// Throttle para toasts (evitar spam)
let lastSaveToastTime = 0;
const TOAST_THROTTLE_MS = 30000; // 30 segundos

// ========================================
// Dispatcher Principal
// ========================================
async function saveData() {
    // Verificar si hay usuario autenticado
    const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : null;

    if (user) {
        await saveAllDataSupabase();
    } else {
        // Fallback a localStorage solo si no hay usuario
        saveDataLocal();
    }
}

// ========================================
// LocalStorage (Fallback/Temporal)
// ========================================
function saveDataLocal() {
    localStorage.setItem('movements', JSON.stringify(movements));
    localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
    localStorage.setItem('watchlists', JSON.stringify(watchlists));
    localStorage.setItem('currentWatchlistId', currentWatchlistId);
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    localStorage.setItem('yearEndSnapshots', JSON.stringify(yearEndSnapshots));
}

function loadData() {
    const saved = localStorage.getItem('movements');
    const stats = localStorage.getItem('dailyStats');
    const wls = localStorage.getItem('watchlists');
    const wlId = localStorage.getItem('currentWatchlistId');
    const oldWl = localStorage.getItem('watchlist');
    const alerts = localStorage.getItem('priceAlerts');
    const settings = localStorage.getItem('appSettings');
    const snapshots = localStorage.getItem('yearEndSnapshots');

    if (saved) movements = JSON.parse(saved);

    if (stats) {
        const loadedStats = JSON.parse(stats);
        const statsMap = {};
        DEFAULT_DAILY_STATS.forEach(s => statsMap[s.date] = s);
        loadedStats.forEach(s => statsMap[s.date] = s);
        dailyStats = Object.values(statsMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    } else {
        dailyStats = [...DEFAULT_DAILY_STATS];
    }

    if (wls) {
        const loaded = JSON.parse(wls);
        // Migrar formato antiguo (array) a nuevo (objeto con metadata)
        watchlists = {};
        for (const [id, value] of Object.entries(loaded)) {
            if (Array.isArray(value)) {
                // Formato antiguo: { default: ['AAPL', 'MSFT'] }
                watchlists[id] = {
                    displayName: id === 'default' ? 'Mi Watchlist' : id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    icon: '📋',
                    symbols: value
                };
            } else {
                // Formato nuevo: ya tiene metadata
                watchlists[id] = value;
            }
        }
    } else if (oldWl) {
        watchlists = {
            default: {
                displayName: 'Mi Watchlist',
                icon: '📋',
                symbols: JSON.parse(oldWl)
            }
        };
    }
    if (wlId) currentWatchlistId = wlId;
    if (alerts) priceAlerts = JSON.parse(alerts);
    if (settings) {
        const loadedSettings = JSON.parse(settings);
        appSettings = { ...appSettings, ...loadedSettings };
    }
    // Merge yearEndSnapshots: preservar baselines de config.js
    if (snapshots) {
        const loadedSnapshots = JSON.parse(snapshots);
        Object.keys(loadedSnapshots).forEach(year => {
            if (!yearEndSnapshots[year]) {
                yearEndSnapshots[year] = loadedSnapshots[year];
            }
        });
    }
}

function saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
}

function loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        appSettings = { ...appSettings, ...JSON.parse(saved) };
    }
    applySettings();
}

function applySettings() {
    const titleEl = document.getElementById('app-title');
    if (titleEl) titleEl.textContent = '📊 ' + appSettings.appName;
    document.title = '📈 ' + appSettings.appName;

    if (appSettings.theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

// Exponer globalmente
window.saveData = saveData;
window.saveDataLocal = saveDataLocal;
window.loadData = loadData;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.applySettings = applySettings;

console.log('Storage: Loaded');
