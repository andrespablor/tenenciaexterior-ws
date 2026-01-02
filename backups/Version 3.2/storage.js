// ========================================
// STORAGE.JS - Persistencia (Multi-Backend)
// ========================================

// ========================================
// LocalStorage Backend
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

// ========================================
// Google Sheets Backend
// ========================================

// Throttle para toasts (evitar spam)
let lastSaveToastTime = 0;
const TOAST_THROTTLE_MS = 30000; // 30 segundos

async function saveDataSheets() {
    try {
        const data = {
            movements,
            dailyStats,
            watchlists,
            currentWatchlistId,
            priceAlerts,
            appSettings,
            yearEndSnapshots
        };

        console.log('📊 Guardando en Sheets:', {
            movements: movements.length,
            dailyStats: dailyStats.length,
            watchlists: Object.keys(watchlists),
            backend: appSettings.storageBackend
        });

        const response = await fetch(SHEETS_CONFIG.scriptUrl, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Sheets Error: ${response.status}`);
        }

        console.log('✅ Datos guardados en Google Sheets');

        // Solo mostrar toast cada 30 segundos para evitar spam
        const now = Date.now();
        if (typeof showToast === 'function' && now - lastSaveToastTime > TOAST_THROTTLE_MS) {
            showToast('📊 Guardado en Sheets', 'success');
            lastSaveToastTime = now;
        }

        return true;
    } catch (error) {
        console.error('❌ Error guardando en Sheets:', error);
        // Errores siempre se muestran
        if (typeof showToast === 'function') {
            showToast('❌ Error al guardar', 'error');
        }
        return false;
    }
}

async function loadDataSheets() {
    try {
        const response = await fetch(SHEETS_CONFIG.scriptUrl);

        if (!response.ok) {
            throw new Error(`Sheets Error: ${response.status}`);
        }

        const data = await response.json();

        // Cargar datos con valores por defecto
        movements = data.movements || [];
        dailyStats = data.dailyStats || [];
        watchlists = data.watchlists || { default: [] };
        currentWatchlistId = data.currentWatchlistId || 'default';
        priceAlerts = data.priceAlerts || [];
        // Merge yearEndSnapshots: preservar baselines de config.js, agregar nuevos del cloud
        if (data.yearEndSnapshots) {
            Object.keys(data.yearEndSnapshots).forEach(year => {
                if (!yearEndSnapshots[year]) {
                    yearEndSnapshots[year] = data.yearEndSnapshots[year];
                }
            });
        }

        // Settings se cargan aparte para no sobrescribir el backend
        if (data.appSettings) {
            const currentBackend = appSettings.storageBackend;
            appSettings = { ...appSettings, ...data.appSettings };
            appSettings.storageBackend = currentBackend; // Preservar backend actual
        }

        console.log('✅ Datos cargados desde Google Sheets');
        // No mostrar toast en cargas exitosas para reducir ruido
        return true;
    } catch (error) {
        console.error('❌ Error cargando desde Sheets:', error);
        // Solo mostrar errores
        if (typeof showToast === 'function') {
            showToast('❌ Error al cargar', 'error');
        }
        return false;
    }
}

// ========================================
// Dispatcher (Decide qué backend usar)
// ========================================
async function saveData() {
    const backend = appSettings.storageBackend || 'local';

    if (backend === 'sheets') {
        await saveDataSheets();
    } else {
        saveDataLocal();
    }
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

    if (wls) watchlists = JSON.parse(wls);
    else if (oldWl) watchlists = { default: JSON.parse(oldWl) };
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
window.saveDataSheets = saveDataSheets;
window.loadData = loadData;
window.loadDataSheets = loadDataSheets;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.applySettings = applySettings;

console.log('Storage: Loaded');
