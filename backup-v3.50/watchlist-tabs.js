// ========================================
// WATCHLIST TABS MANAGER
// ========================================

// Initialize watchlist tabs
function initWatchlistTabs() {
    console.log('🎯 Initializing watchlist tabs...');

    const mercadoTabsNav = document.getElementById('mercado-tabs');
    if (!mercadoTabsNav) return;

    // Load watchlists from localStorage
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');
    const watchlistNames = Object.keys(watchlists);

    // Clear existing tabs (except the comment)
    mercadoTabsNav.innerHTML = '';

    // If no watchlists, create default
    if (watchlistNames.length === 0) {
        watchlists['default'] = [];
        localStorage.setItem('watchlists', JSON.stringify(watchlists));
        watchlistNames.push('default');
    }

    // Create tab for each watchlist
    watchlistNames.forEach((name, index) => {
        const tab = document.createElement('button');
        tab.className = 'tab' + (index === 0 ? ' active' : '');
        tab.dataset.tab = 'watchlist';
        tab.dataset.watchlistName = name;

        // Format name
        const displayName = name === 'default' ? '📋 MI WATCHLIST' :
            name === 'argentina' ? '🇦🇷 ARGENTINA' :
                name === 'brasil' ? '🇧🇷 BRASIL' :
                    `📋 ${name.toUpperCase()}`;

        tab.textContent = displayName;

        // Click handler
        tab.addEventListener('click', () => {
            // Update active tab
            mercadoTabsNav.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Load this watchlist
            loadWatchlist(name);
        });

        mercadoTabsNav.appendChild(tab);
    });

    // Load first watchlist
    if (watchlistNames.length > 0) {
        loadWatchlist(watchlistNames[0]);
    }
}

// Load specific watchlist
function loadWatchlist(name) {
    console.log(`📋 Loading watchlist: ${name}`);

    // Set current watchlist in global scope for other functions
    if (typeof window.currentWatchlist !== 'undefined') {
        window.currentWatchlist = name;
    }

    // Trigger watchlist render if function exists
    if (typeof renderWatchlist === 'function') {
        renderWatchlist();
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWatchlistTabs);
} else {
    initWatchlistTabs();
}
