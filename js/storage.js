// ========================================
// STORAGE.JS - Persistencia (Solo Supabase)
// ========================================

// ========================================
// Dispatcher Principal - Solo Supabase
// ========================================
async function saveData() {
    // Verificar si hay usuario autenticado
    const user = typeof getCurrentUser === 'function' ? await getCurrentUser() : null;

    if (user) {
        await saveAllDataSupabase();
    } else {
        console.warn('⚠️ No hay usuario autenticado - datos no guardados');
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
    console.log('💾 Guardando settings en Supabase...');
    await saveData();
    console.log('✅ Settings guardados');
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
