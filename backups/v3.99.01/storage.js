// ========================================
// STORAGE.JS - Persistencia (Solo Supabase)
// ========================================

// Lock para evitar llamadas concurrentes
let _saveInProgress = false;
let _pendingSave = false;

// ========================================
// Dispatcher Principal - Solo Supabase
// ========================================
async function saveData() {
    // Verificar si hay usuario autenticado
    const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : null;

    if (!user) {
        console.warn('⚠️ No hay usuario autenticado - datos no guardados');
        return;
    }

    // Si ya hay un guardado en progreso, marcar como pendiente
    if (_saveInProgress) {
        debugLog('⏳ Guardado en progreso, encolando...');
        _pendingSave = true;
        return;
    }

    _saveInProgress = true;

    try {
        await saveAllDataSupabase();
    } finally {
        _saveInProgress = false;

        // Si hubo cambios mientras guardábamos, guardar de nuevo
        if (_pendingSave) {
            _pendingSave = false;
            debugLog('🔄 Procesando guardado pendiente...');
            await saveData();
        }
    }
}

async function loadData() {
    // Delegar a Supabase si hay usuario autenticado
    const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : null;

    if (user) {
        await loadAllDataSupabase();
    } else {
        console.warn('⚠️ No hay usuario autenticado - datos no cargados');
    }
}

// ========================================
// Settings (solo para tema y nombre de app)
// ========================================
async function saveSettings() {
    // Los settings ahora se guardan en Supabase
    debugLog('💾 Guardando settings en Supabase...');
    await saveData();
    debugLog('✅ Settings guardados');
}

function loadSettings() {
    // Los settings se cargan desde Supabase en auth-ui.js
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
window.loadData = loadData;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.applySettings = applySettings;

console.log('Storage: Loaded');
