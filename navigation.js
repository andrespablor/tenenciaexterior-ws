// ========================================
// SIDEBAR NAVIGATION
// ========================================

// Map tabs to modules
const MODULE_TABS = {
    comitente: ['portfolio', 'summary', 'history', 'stats'],
    mercado: ['watchlist']
};

let currentModule = 'comitente';

// Initialize sidebar navigation
function initSidebarNavigation() {
    console.log('🎯 Initializing sidebar navigation...');

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

    // Initialize with comitente module
    switchModule('comitente');
}

// Switch between modules
function switchModule(moduleName) {
    console.log(`📂 Switching to module: ${moduleName}`);
    currentModule = moduleName;

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

    if (moduleName === 'comitente') {
        if (comitenteTabsNav) comitenteTabsNav.style.display = '';
        if (mercadoTabsNav) mercadoTabsNav.style.display = 'none';
    } else if (moduleName === 'mercado') {
        if (comitenteTabsNav) comitenteTabsNav.style.display = 'none';
        if (mercadoTabsNav) mercadoTabsNav.style.display = '';
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
        if (watchlistSection) {
            // Hide all sections first
            document.querySelectorAll('.tab-content').forEach(section => {
                section.classList.remove('active');
            });
            // Show watchlist
            watchlistSection.classList.add('active');
        }
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarNavigation);
} else {
    initSidebarNavigation();
}
