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

    // Clear existing tabs
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

    // Add controls to tabs bar
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'tabs-right';
    controlsDiv.innerHTML = `
        <input type="text" id="watchlist-symbol" class="search-input-tabs" placeholder="Símbolos (ej: AAPL, MSFT)">
        <button class="btn btn-primary btn-small" id="add-watchlist-btn">+ Agregar</button>
    `;
    mercadoTabsNav.appendChild(controlsDiv);

    // Load first watchlist
    if (watchlistNames.length > 0) {
        loadWatchlist(watchlistNames[0]);
    }
}

// Load specific watchlist
function loadWatchlist(name) {
    console.log(`📋 Loading watchlist: ${name}`);

    // Update the global variable (defined in config.js)
    // Access it directly, not through window
    if (typeof currentWatchlistId !== 'undefined') {
        currentWatchlistId = name;
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
