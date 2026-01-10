// ========================================
// SIDEBAR NAVIGATION
// ========================================

// Map tabs to modules
const MODULE_TABS = {
    comitente: ['portfolio', 'summary', 'history', 'stats'],
    mercado: ['watchlist']
};

// Global variable to track current module
window.currentModule = 'mercado';

// Initialize sidebar navigation
function initSidebarNavigation() {
    debugLog('🎯 Initializing sidebar navigation...');

    // Sidebar buttons
    document.querySelectorAll('.sidebar-btn[data-module]').forEach(btn => {
        btn.addEventListener('click', () => {
            switchModule(btn.dataset.module);
        });
    });

    // Alerts button in sidebar
    const alertsSidebarBtn = document.getElementById('alerts-sidebar-btn');
    if (alertsSidebarBtn) {
        alertsSidebarBtn.addEventListener('click', () => {
            // Try to call the alert manager function
            if (typeof openAlertManager === 'function') {
                openAlertManager();
            }
        });
    }

    // Sync alert badges
    const updateAlertBadges = () => {
        const headerBadge = document.getElementById('alert-badge');
        const sidebarBadge = document.getElementById('alert-badge-sidebar');
        if (headerBadge && sidebarBadge) {
            sidebarBadge.textContent = headerBadge.textContent;
            sidebarBadge.style.display = headerBadge.textContent === '0' ? 'none' : '';
        }
    };

    // Initial sync
    updateAlertBadges();

    // Watch for changes
    const headerBadge = document.getElementById('alert-badge');
    if (headerBadge) {
        const observer = new MutationObserver(updateAlertBadges);
        observer.observe(headerBadge, { childList: true, characterData: true, subtree: true });
    }

    // Initialize with mercado module
    switchModule('mercado');
}

// Switch between modules
function switchModule(moduleName) {
    debugLog(`📂 Switching to module: ${moduleName}`);
    window.currentModule = moduleName;

    // Update sidebar button states
    document.querySelectorAll('.sidebar-btn[data-module]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.module === moduleName);
    });

    // Show/hide stats cards (only for Comitente)
    const statsCards = document.getElementById('comitente-stats');
    if (statsCards) {
        statsCards.style.display = moduleName === 'comitente' ? '' : 'none';
    }

    // Show/hide module-specific navigation
    const comitenteTabsNav = document.getElementById('comitente-tabs');
    const mercadoTabsNav = document.getElementById('mercado-tabs');
    const argentinaSection = document.getElementById('argentina');
    const watchlistSection = document.getElementById('watchlist');

    if (moduleName === 'comitente') {
        if (comitenteTabsNav) comitenteTabsNav.style.display = '';
        if (mercadoTabsNav) mercadoTabsNav.style.display = 'none';
        // IMPORTANTE: Ocultar panel de Argentina en Comitente
        if (argentinaSection) {
            argentinaSection.classList.remove('active');
            argentinaSection.classList.add('force-hide');
        }
        // IMPORTANTE: Ocultar Watchlist en Comitente
        if (watchlistSection) {
            watchlistSection.classList.remove('active');
            watchlistSection.classList.add('force-hide');
        }
    } else if (moduleName === 'mercado') {
        if (comitenteTabsNav) comitenteTabsNav.style.display = 'none';
        if (mercadoTabsNav) mercadoTabsNav.style.display = '';
        // Remover force-hide cuando estamos en Mercado
        if (argentinaSection) {
            argentinaSection.classList.remove('force-hide');
        }
        if (watchlistSection) {
            watchlistSection.classList.remove('force-hide');
        }
    }

    // Get tabs for this module and click first one
    const tabsToShow = MODULE_TABS[moduleName] || [];
    if (tabsToShow.length > 0) {
        const firstTab = document.querySelector(`.tab[data-tab="${tabsToShow[0]}"]`);
        if (firstTab) {
            firstTab.click();
        }
    }

    // For Mercado, directly show watchlist
    if (moduleName === 'mercado') {
        const watchlistSection = document.getElementById('watchlist');
        const argentinaSection = document.getElementById('argentina');
        const marketSwitch = document.getElementById('market-switch-container');
        const marketToggle = document.getElementById('market-toggle');

        // Show market switch
        if (marketSwitch) marketSwitch.style.display = 'flex';

        // Hide all sections first
        document.querySelectorAll('.tab-content').forEach(section => {
            section.classList.remove('active');
        });

        // Show correct section based on toggle state
        if (marketToggle && marketToggle.checked) {
            // Argentina mode
            if (watchlistSection) {
                watchlistSection.classList.remove('active');
                watchlistSection.style.display = 'none';
            }
            if (argentinaSection) {
                argentinaSection.classList.add('active');
                argentinaSection.style.display = 'block';
            }
            if (mercadoTabsNav) mercadoTabsNav.style.display = 'none';
            // Connect to BYMA if not connected
            if (typeof connectBymaWs === 'function') {
                connectBymaWs();
                fetchBymaInitialPrices();
            }
        } else {
            // USA mode
            if (argentinaSection) {
                argentinaSection.classList.remove('active');
                argentinaSection.style.display = 'none';
            }
            if (watchlistSection) {
                watchlistSection.classList.add('active');
                watchlistSection.style.display = 'block';
            }
        }

        // Update label styles
        updateMarketLabels();
    } else {
        // Hide market switch for other modules
        const marketSwitch = document.getElementById('market-switch-container');
        if (marketSwitch) marketSwitch.style.display = 'none';
    }
}

// Update market switch label styles
function updateMarketLabels() {
    // El nuevo switch moderno maneja los estilos automáticamente con CSS
    // Esta función se mantiene por compatibilidad pero ya no es necesaria
    const toggle = document.getElementById('market-toggle');
    if (!toggle) return;

    // Los estilos visuales se manejan automáticamente con :checked en CSS
    debugLog(`Market switch: ${toggle.checked ? '🇦🇷 ARG' : '🇺🇸 USA'}`);
}

// Initialize market toggle handler
function initMarketToggle() {
    const toggle = document.getElementById('market-toggle');
    if (!toggle) return;

    toggle.addEventListener('change', (e) => {
        const watchlistSection = document.getElementById('watchlist');
        const argentinaSection = document.getElementById('argentina');
        const mercadoTabsNav = document.getElementById('mercado-tabs');

        if (e.target.checked) {
            // Switch to Argentina
            debugLog('🇦🇷 Switching to Argentina market');
            if (watchlistSection) {
                watchlistSection.classList.remove('active');
                watchlistSection.style.display = 'none';
            }
            if (argentinaSection) {
                argentinaSection.classList.add('active');
                argentinaSection.style.display = 'block';
            }
            if (mercadoTabsNav) mercadoTabsNav.style.display = 'none';

            // Connect to BYMA WebSocket
            if (typeof connectBymaWs === 'function') {
                connectBymaWs();
                fetchBymaInitialPrices();
            }
        } else {
            // Switch to USA
            debugLog('🇺🇸 Switching to USA market');
            if (argentinaSection) {
                argentinaSection.classList.remove('active');
                argentinaSection.style.display = 'none';
            }
            if (watchlistSection) {
                watchlistSection.classList.add('active');
                watchlistSection.style.display = 'block';
            }
            if (mercadoTabsNav) mercadoTabsNav.style.display = '';

            // Disconnect BYMA WebSocket (optional, saves resources)
            if (typeof disconnectBymaWs === 'function') {
                disconnectBymaWs();
            }
        }

        updateMarketLabels();
    });

    // Set initial label state
    updateMarketLabels();
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSidebarNavigation();
        initMarketToggle();
    });
} else {
    initSidebarNavigation();
    initMarketToggle();
}
