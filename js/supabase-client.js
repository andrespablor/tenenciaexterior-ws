// ========================================
// SUPABASE-CLIENT.JS - Cliente y Autenticación
// ========================================

// Inicializar cliente Supabase (usando CDN global)
// Nota: window.supabase es el SDK, _sb es nuestra instancia del cliente
let _sb = null;

function initSupabase() {
    if (!window.supabase) {
        console.error('❌ Supabase SDK no cargado');
        return false;
    }

    _sb = window.supabase.createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey
    );

    console.log('✅ Supabase client inicializado');
    return true;
}

// ========================================
// AUTENTICACIÓN
// ========================================

async function signUp(email, password) {
    try {
        const { data, error } = await _sb.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        console.log('✅ Usuario registrado:', data.user?.email);
        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        console.error('❌ Error en registro:', error.message);
        return { success: false, error: error.message };
    }
}

async function signIn(email, password) {
    try {
        const { data, error } = await _sb.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        console.log('✅ Login exitoso:', data.user?.email);
        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        return { success: false, error: error.message };
    }
}

async function signOut() {
    try {
        const { error } = await _sb.auth.signOut();
        if (error) throw error;

        console.log('✅ Sesión cerrada');
        return { success: true };
    } catch (error) {
        console.error('❌ Error cerrando sesión:', error.message);
        return { success: false, error: error.message };
    }
}

async function getCurrentUser() {
    try {
        const { data: { user } } = await _sb.auth.getUser();
        return user;
    } catch (error) {
        console.error('❌ Error obteniendo usuario:', error.message);
        return null;
    }
}

async function getSession() {
    try {
        const { data: { session } } = await _sb.auth.getSession();
        return session;
    } catch (error) {
        console.error('❌ Error obteniendo sesión:', error.message);
        return null;
    }
}

// Listener para cambios de auth
function onAuthStateChange(callback) {
    return _sb.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event);
        callback(event, session);
    });
}

// ========================================
// STORAGE - CRUD Operations
// ========================================

// --- MOVEMENTS ---
async function saveMovementsSupabase(movementsData) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    try {
        // Primero eliminamos los movimientos existentes del usuario
        await _sb.from('movements').delete().eq('user_id', user.id);

        // Luego insertamos los nuevos
        if (movementsData.length > 0) {
            const formattedData = movementsData.map(m => ({
                user_id: user.id,
                symbol: m.symbol,
                type: m.type,
                quantity: m.quantity,
                price: m.price,
                date: m.date,
                notes: m.notes || null
            }));

            const { error } = await _sb.from('movements').insert(formattedData);
            if (error) throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando movements:', error.message);
        return { success: false, error: error.message };
    }
}

async function loadMovementsSupabase() {
    const user = await getCurrentUser();
    if (!user) return [];

    try {
        const { data, error } = await _sb
            .from('movements')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) throw error;

        // Mapear a formato de la app
        return data.map(m => ({
            symbol: m.symbol,
            type: m.type,
            quantity: parseFloat(m.quantity),
            price: parseFloat(m.price),
            date: m.date,
            notes: m.notes
        }));
    } catch (error) {
        console.error('❌ Error cargando movements:', error.message);
        return [];
    }
}

// --- DAILY STATS ---
async function saveDailyStatsSupabase(statsData) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    try {
        // Upsert: actualiza si existe, inserta si no
        const formattedData = statsData.map(s => ({
            user_id: user.id,
            date: s.date,
            invested: s.invested,
            result: s.result
        }));

        const { error } = await _sb
            .from('daily_stats')
            .upsert(formattedData, { onConflict: 'user_id,date' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando daily_stats:', error.message);
        return { success: false, error: error.message };
    }
}

async function loadDailyStatsSupabase() {
    const user = await getCurrentUser();
    if (!user) return [];

    try {
        const { data, error } = await _sb
            .from('daily_stats')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true });

        if (error) throw error;

        return data.map(s => ({
            date: s.date,
            invested: parseFloat(s.invested),
            result: parseFloat(s.result)
        }));
    } catch (error) {
        console.error('❌ Error cargando daily_stats:', error.message);
        return [];
    }
}

// --- WATCHLISTS ---
async function saveWatchlistsSupabase(watchlistsData, currentId) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    try {
        // Eliminar watchlists existentes
        await _sb.from('watchlists').delete().eq('user_id', user.id);

        // Insertar nuevas
        const formattedData = Object.entries(watchlistsData).map(([id, wl]) => ({
            user_id: user.id,
            watchlist_id: id,
            display_name: wl.displayName || id,
            icon: wl.icon || '📋',
            symbols: wl.symbols || []
        }));

        if (formattedData.length > 0) {
            const { error } = await _sb.from('watchlists').insert(formattedData);
            if (error) throw error;
        }

        // Guardar current watchlist en settings
        await saveAppSettingsSupabase({ current_watchlist_id: currentId });

        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando watchlists:', error.message);
        return { success: false, error: error.message };
    }
}

async function loadWatchlistsSupabase() {
    const user = await getCurrentUser();
    if (!user) return { watchlists: { default: { displayName: 'Mi Watchlist', icon: '📋', symbols: [] } }, currentId: 'default' };

    try {
        const { data, error } = await _sb
            .from('watchlists')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        const watchlists = {};
        data.forEach(wl => {
            watchlists[wl.watchlist_id] = {
                displayName: wl.display_name,
                icon: wl.icon,
                symbols: wl.symbols || []
            };
        });

        // Si no hay watchlists, crear default
        if (Object.keys(watchlists).length === 0) {
            watchlists.default = { displayName: 'Mi Watchlist', icon: '📋', symbols: [] };
        }

        // Obtener current watchlist id de settings
        const settings = await loadAppSettingsSupabase();
        const currentId = settings?.current_watchlist_id || 'default';

        return { watchlists, currentId };
    } catch (error) {
        console.error('❌ Error cargando watchlists:', error.message);
        return { watchlists: { default: { displayName: 'Mi Watchlist', icon: '📋', symbols: [] } }, currentId: 'default' };
    }
}

// --- PRICE ALERTS ---
async function savePriceAlertsSupabase(alertsData) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    try {
        await _sb.from('price_alerts').delete().eq('user_id', user.id);

        if (alertsData.length > 0) {
            const formattedData = alertsData.map(a => ({
                user_id: user.id,
                symbol: a.symbol,
                target_price: a.targetPrice,
                condition: a.condition,
                is_active: a.isActive !== false
            }));

            const { error } = await _sb.from('price_alerts').insert(formattedData);
            if (error) throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando price_alerts:', error.message);
        return { success: false, error: error.message };
    }
}

async function loadPriceAlertsSupabase() {
    const user = await getCurrentUser();
    if (!user) return [];

    try {
        const { data, error } = await _sb
            .from('price_alerts')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        return data.map(a => ({
            symbol: a.symbol,
            targetPrice: parseFloat(a.target_price),
            condition: a.condition,
            isActive: a.is_active
        }));
    } catch (error) {
        console.error('❌ Error cargando price_alerts:', error.message);
        return [];
    }
}

// --- APP SETTINGS ---
async function saveAppSettingsSupabase(settingsData) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    try {
        const { error } = await _sb
            .from('app_settings')
            .upsert({
                user_id: user.id,
                app_name: settingsData.appName || settingsData.app_name || 'Portfolio Tracker',
                theme: settingsData.theme || 'dark',
                current_watchlist_id: settingsData.currentWatchlistId || settingsData.current_watchlist_id || 'default',
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando app_settings:', error.message);
        return { success: false, error: error.message };
    }
}

async function loadAppSettingsSupabase() {
    const user = await getCurrentUser();
    if (!user) return null;

    try {
        const { data, error } = await _sb
            .from('app_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        if (data) {
            return {
                appName: data.app_name,
                theme: data.theme,
                currentWatchlistId: data.current_watchlist_id
            };
        }
        return null;
    } catch (error) {
        console.error('❌ Error cargando app_settings:', error.message);
        return null;
    }
}

// --- YEAR END SNAPSHOTS ---
async function saveYearEndSnapshotsSupabase(snapshotsData) {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    try {
        const formattedData = Object.entries(snapshotsData).map(([year, snapshot]) => ({
            user_id: user.id,
            year: parseInt(year),
            date: snapshot.date,
            invested: snapshot.invested,
            result: snapshot.result,
            by_symbol: snapshot.bySymbol || {}
        }));

        if (formattedData.length > 0) {
            const { error } = await _sb
                .from('year_end_snapshots')
                .upsert(formattedData, { onConflict: 'user_id,year' });

            if (error) throw error;
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error guardando year_end_snapshots:', error.message);
        return { success: false, error: error.message };
    }
}

async function loadYearEndSnapshotsSupabase() {
    const user = await getCurrentUser();
    if (!user) return {};

    try {
        const { data, error } = await _sb
            .from('year_end_snapshots')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        const snapshots = {};
        data.forEach(s => {
            snapshots[s.year.toString()] = {
                date: s.date,
                invested: parseFloat(s.invested),
                result: parseFloat(s.result),
                bySymbol: s.by_symbol || {}
            };
        });

        return snapshots;
    } catch (error) {
        console.error('❌ Error cargando year_end_snapshots:', error.message);
        return {};
    }
}

// ========================================
// FUNCIONES COMBINADAS (para storage.js)
// ========================================

async function saveAllDataSupabase() {
    const user = await getCurrentUser();
    if (!user) {
        console.warn('⚠️ No hay usuario autenticado, no se puede guardar en Supabase');
        return false;
    }

    try {
        console.log('📊 Guardando en Supabase...');

        await Promise.all([
            saveMovementsSupabase(movements),
            saveDailyStatsSupabase(dailyStats),
            saveWatchlistsSupabase(watchlists, currentWatchlistId),
            savePriceAlertsSupabase(priceAlerts),
            saveAppSettingsSupabase(appSettings),
            saveYearEndSnapshotsSupabase(yearEndSnapshots)
        ]);

        console.log('✅ Datos guardados en Supabase');

        if (typeof showToast === 'function') {
            showToast('☁️ Guardado en Supabase', 'success');
        }

        return true;
    } catch (error) {
        console.error('❌ Error guardando en Supabase:', error);
        return false;
    }
}

async function loadAllDataSupabase() {
    const user = await getCurrentUser();
    if (!user) {
        console.warn('⚠️ No hay usuario autenticado, no se puede cargar desde Supabase');
        return false;
    }

    try {
        console.log('📊 Cargando desde Supabase...');

        const [
            loadedMovements,
            loadedDailyStats,
            loadedWatchlists,
            loadedAlerts,
            loadedSettings,
            loadedSnapshots
        ] = await Promise.all([
            loadMovementsSupabase(),
            loadDailyStatsSupabase(),
            loadWatchlistsSupabase(),
            loadPriceAlertsSupabase(),
            loadAppSettingsSupabase(),
            loadYearEndSnapshotsSupabase()
        ]);

        // Asignar a variables globales
        movements = loadedMovements;

        // Merge dailyStats con defaults
        if (loadedDailyStats.length > 0) {
            const statsMap = {};
            DEFAULT_DAILY_STATS.forEach(s => statsMap[s.date] = s);
            loadedDailyStats.forEach(s => statsMap[s.date] = s);
            dailyStats = Object.values(statsMap).sort((a, b) => new Date(a.date) - new Date(b.date));
        } else {
            dailyStats = [...DEFAULT_DAILY_STATS];
        }

        watchlists = loadedWatchlists.watchlists;
        currentWatchlistId = loadedWatchlists.currentId;
        priceAlerts = loadedAlerts;

        // Settings: preservar backend
        if (loadedSettings) {
            const currentBackend = appSettings.storageBackend;
            appSettings = { ...appSettings, ...loadedSettings };
            appSettings.storageBackend = currentBackend;
        }

        // Merge snapshots con los baselines de config.js
        const baseSnapshots = { ...yearEndSnapshots }; // Preservar baselines
        Object.keys(loadedSnapshots).forEach(year => {
            if (!baseSnapshots[year]) {
                baseSnapshots[year] = loadedSnapshots[year];
            }
        });
        yearEndSnapshots = baseSnapshots;

        console.log('✅ Datos cargados desde Supabase');
        return true;
    } catch (error) {
        console.error('❌ Error cargando desde Supabase:', error);
        return false;
    }
}

// ========================================
// EXPONER GLOBALMENTE
// ========================================
window.initSupabase = initSupabase;
window.supabaseClient = () => _sb;

// Auth
window.signUp = signUp;
window.signIn = signIn;
window.signOut = signOut;
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.onAuthStateChange = onAuthStateChange;

// Storage
window.saveAllDataSupabase = saveAllDataSupabase;
window.loadAllDataSupabase = loadAllDataSupabase;

console.log('Supabase Client: Loaded');
