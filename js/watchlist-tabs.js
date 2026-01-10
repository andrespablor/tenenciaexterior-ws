// ========================================
// WATCHLIST TABS MANAGER - Supabase Only
// ========================================

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get default icon for a watchlist based on its name
 */
function getDefaultWatchlistIcon(listName) {
    const iconMap = {
        'default': '📋',
        'argentina': '🇦🇷',
        'brasil': '🇧🇷',
        'usa': '🇺🇸',
        'tech': '💻',
        'crypto': '₿'
    };
    return iconMap[listName.toLowerCase()] || '📊';
}

/**
 * Get watchlists data - always use global variable (loaded from Supabase)
 */
function getWatchlistsData() {
    // Use global watchlists variable (loaded from Supabase via loadAllDataSupabase)
    if (typeof watchlists !== 'undefined' && watchlists && Object.keys(watchlists).length > 0) {
        return watchlists;
    }
    // Fallback: create default
    return { default: { displayName: 'Mi Watchlist', icon: '📋', symbols: [] } };
}

/**
 * Ensure watchlist has correct format
 */
function ensureWatchlistFormat(wl, name) {
    if (!wl || typeof wl !== 'object') {
        return {
            displayName: name === 'default' ? 'Mi Watchlist' : name,
            icon: getDefaultWatchlistIcon(name),
            symbols: []
        };
    }

    // Migrate array format to object
    if (Array.isArray(wl)) {
        return {
            displayName: name === 'default' ? 'Mi Watchlist' : name,
            icon: getDefaultWatchlistIcon(name),
            symbols: wl
        };
    }

    // Ensure all properties exist
    return {
        displayName: wl.displayName || (name === 'default' ? 'Mi Watchlist' : name),
        icon: wl.icon || getDefaultWatchlistIcon(name),
        symbols: wl.symbols || []
    };
}

// ========================================
// WATCHLIST TABS INITIALIZATION
// ========================================

function initWatchlistTabs() {
    console.log('🎯 Initializing watchlist tabs...');

    const mercadoTabsNav = document.getElementById('mercado-tabs');
    if (!mercadoTabsNav) return;

    // Get watchlists from global variable (loaded from Supabase)
    const wlData = getWatchlistsData();
    let watchlistNames = Object.keys(wlData);

    // If no watchlists, create default in global variable
    if (watchlistNames.length === 0) {
        watchlists.default = {
            displayName: 'Mi Watchlist',
            icon: '📋',
            symbols: []
        };
        watchlistNames = ['default'];
        // Save to Supabase
        if (typeof saveData === 'function') {
            saveData();
        }
    }

    // Clear existing tabs
    mercadoTabsNav.innerHTML = '';

    // Create container for sortable tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'tabs-sortable-container';
    tabsContainer.style.display = 'flex';
    tabsContainer.style.overflowX = 'auto';
    tabsContainer.style.maxWidth = 'calc(100% - 100px)';
    mercadoTabsNav.appendChild(tabsContainer);

    // Create tab for each watchlist
    watchlistNames.forEach((name) => {
        const tab = document.createElement('button');
        tab.className = 'tab';

        if (typeof currentWatchlistId !== 'undefined' && currentWatchlistId === name) {
            tab.classList.add('active');
        } else if (typeof currentWatchlistId === 'undefined' && name === 'default') {
            tab.classList.add('active');
        }

        tab.dataset.tab = 'watchlist';
        tab.dataset.watchlistName = name;

        const wl = wlData[name];
        const displayName = wl?.displayName || (name === 'default' ? 'Mi Watchlist' : name);
        tab.textContent = displayName;

        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadWatchlist(name);
        });

        tabsContainer.appendChild(tab);
    });

    // Add controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'tabs-right';
    controlsDiv.style.marginLeft = 'auto';
    controlsDiv.style.display = 'flex';
    controlsDiv.style.alignItems = 'center';
    controlsDiv.style.gap = '8px';
    controlsDiv.innerHTML = `
        <input type="text" id="watchlist-symbol-input" placeholder="Símbolo..." style="
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            width: 100px;
            outline: none;
        ">
        <button class="btn-icon" id="add-symbol-btn" title="Agregar" style="color: var(--success); font-weight: bold;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
        <button class="btn-icon" id="edit-watchlists-btn" title="Editar Listas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        </button>
        <button class="btn-icon" id="delete-selected-symbols-btn" title="Eliminar seleccionados" style="color: var(--danger); display: none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
    `;
    mercadoTabsNav.appendChild(controlsDiv);

    // Event listeners
    const addSymBtn = document.getElementById('add-symbol-btn');
    const symInput = document.getElementById('watchlist-symbol-input');

    if (addSymBtn) {
        addSymBtn.addEventListener('click', () => {
            const val = symInput ? symInput.value : '';
            addSymbolPrompt(val);
        });
    }

    if (symInput) {
        symInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addSymbolPrompt(symInput.value);
            }
        });
    }

    const editListBtn = document.getElementById('edit-watchlists-btn');
    if (editListBtn) editListBtn.addEventListener('click', openWatchlistManager);

    // Sortable tabs
    if (typeof Sortable !== 'undefined') {
        new Sortable(tabsContainer, {
            animation: 150,
            ghostClass: 'tab-ghost',
            onEnd: function () {
                // Tab order is visual only, not persisted
            }
        });
    }

    // Load current or first watchlist
    if (!window.currentWatchlistId) {
        const initial = watchlistNames.includes('default') ? 'default' : watchlistNames[0];
        loadWatchlist(initial);
        const activeTab = tabsContainer.querySelector(`[data-watchlist-name="${initial}"]`);
        if (activeTab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            activeTab.classList.add('active');
        }
    }

    // Initialize watchlist from app.js
    if (typeof initializeWatchlist === 'function') {
        console.log('🔧 Calling initializeWatchlist from watchlist-tabs.js');
        try {
            initializeWatchlist();
        } catch (e) {
            console.warn('InitializeWatchlist partial error:', e);
        }
    }

    setupDeleteSelectedButton();
}

// Load specific watchlist
function loadWatchlist(name) {
    if (typeof currentWatchlistId !== 'undefined') {
        currentWatchlistId = name;
    }
    // Save current watchlist selection to Supabase
    if (typeof saveData === 'function') {
        saveData();
    }
    if (typeof renderWatchlist === 'function') {
        renderWatchlist();
    }
}

// Add Symbol Logic - uses global watchlists
function addSymbolPrompt(inputValue) {
    let symbol = inputValue;

    if (!symbol || !symbol.trim()) {
        return;
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    // Use addToWatchlistWithSymbol from app.js (preferred)
    if (typeof addToWatchlistWithSymbol === 'function') {
        addToWatchlistWithSymbol(cleanSymbol);
    } else {
        // Fallback: modify global watchlists directly
        if (typeof currentWatchlistId === 'undefined') return;

        let wl = watchlists[currentWatchlistId];

        // Ensure format
        if (!wl || !wl.symbols) {
            wl = ensureWatchlistFormat(wl, currentWatchlistId);
            watchlists[currentWatchlistId] = wl;
        }

        if (!wl.symbols.includes(cleanSymbol)) {
            wl.symbols.push(cleanSymbol);

            // Save to Supabase
            if (typeof saveData === 'function') {
                saveData();
            }

            if (typeof renderWatchlist === 'function') renderWatchlist();
            if (typeof subscribeToPortfolioAndWatchlist === 'function') subscribeToPortfolioAndWatchlist();
        } else {
            alert('El símbolo ya está en la lista.');
        }
    }

    const inputEl = document.getElementById('watchlist-symbol-input');
    if (inputEl) inputEl.value = '';
}

// ===================================
// MANAGER MODAL LOGIC
// ===================================

let selectedWatchlistForEdit = null;

function openWatchlistManager() {
    const modal = document.getElementById('watchlist-manager-modal');
    if (!modal) return;

    selectedWatchlistForEdit = null;
    modal.style.display = 'flex';

    renderManagerList();
    updateEditSection();
}

function closeWatchlistManager() {
    document.getElementById('watchlist-manager-modal').style.display = 'none';
    initWatchlistTabs();
}

function renderManagerList() {
    const listContainer = document.getElementById('watchlist-select-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Use global watchlists
    const wlData = getWatchlistsData();
    const watchlistNames = Object.keys(wlData);

    watchlistNames.forEach(name => {
        const item = document.createElement('div');
        item.className = 'watchlist-select-item';
        if (selectedWatchlistForEdit === name) item.classList.add('selected');

        const wl = wlData[name];
        const displayName = wl?.displayName || (name === 'default' ? 'Mi Watchlist' : name);
        item.textContent = displayName;

        item.onclick = () => {
            selectedWatchlistForEdit = name;
            renderManagerList();
            updateEditSection();
        };

        listContainer.appendChild(item);
    });
}

function updateEditSection() {
    const editSection = document.getElementById('watchlist-edit-section');
    const nameInput = document.getElementById('watchlist-edit-name');
    const deleteBtn = document.getElementById('watchlist-btn-delete-header');

    if (!selectedWatchlistForEdit) {
        editSection.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        return;
    }

    editSection.style.display = 'block';
    if (deleteBtn) deleteBtn.style.display = 'flex';

    const wl = watchlists[selectedWatchlistForEdit];
    const displayName = wl?.displayName || (selectedWatchlistForEdit === 'default' ? 'Mi Watchlist' : selectedWatchlistForEdit);
    nameInput.value = displayName;
}

async function saveCurrentWatchlist() {
    if (!selectedWatchlistForEdit) return;

    const nameInput = document.getElementById('watchlist-edit-name');
    const newDisplayName = nameInput.value.trim();

    if (!newDisplayName) {
        alert('El nombre no puede estar vacío');
        return;
    }

    if (newDisplayName.length > 20) {
        alert('El nombre debe tener máximo 20 caracteres');
        return;
    }

    if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]+$/.test(newDisplayName)) {
        alert('El nombre solo puede contener letras, números y espacios');
        return;
    }

    // Update displayName in global watchlists
    const wl = watchlists[selectedWatchlistForEdit];
    if (wl) {
        wl.displayName = newDisplayName;

        // Save to Supabase
        console.log('💾 Saving watchlist name to Supabase...');
        await saveData();
        console.log('✅ Watchlist name saved');

        renderManagerList();
        if (typeof showToast === 'function') {
            showToast('✅ Lista guardada correctamente');
        }
    }
}

async function deleteCurrentWatchlist() {
    if (!selectedWatchlistForEdit) return;

    if (Object.keys(watchlists).length <= 1) {
        alert('No se puede eliminar la única lista existente.');
        return;
    }

    if (confirm(`¿Eliminar "${selectedWatchlistForEdit}" permanentemente?`)) {
        delete watchlists[selectedWatchlistForEdit];

        // Save to Supabase
        await saveData();

        selectedWatchlistForEdit = null;
        renderManagerList();
        updateEditSection();

        // If deleted was active, load another
        if (typeof currentWatchlistId !== 'undefined' && !watchlists[currentWatchlistId]) {
            const first = Object.keys(watchlists)[0];
            loadWatchlist(first);
        }
    }
}

async function createNewWatchlistPrompt() {
    const name = prompt('Nombre de la nueva lista:');
    if (name && name.trim()) {
        const cleanName = name.trim();

        if (cleanName.length > 20) {
            alert('El nombre debe tener máximo 20 caracteres');
            return;
        }

        if (!/^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ]+$/.test(cleanName)) {
            alert('El nombre solo puede contener letras, números y espacios');
            return;
        }

        // Generate unique ID from name
        const id = cleanName.toLowerCase().replace(/\s+/g, '-');

        if (watchlists[id]) {
            alert('Ya existe una lista con ese nombre.');
            return;
        }

        // Add to global watchlists
        watchlists[id] = {
            displayName: cleanName,
            icon: getDefaultWatchlistIcon(id),
            symbols: []
        };

        // Save to Supabase
        await saveData();

        selectedWatchlistForEdit = id;
        renderManagerList();
        updateEditSection();
    }
}

function toggleEditMode() {
    const editSection = document.getElementById('watchlist-edit-section');
    if (!editSection) return;

    if (!selectedWatchlistForEdit) {
        if (typeof showToast === 'function') {
            showToast('Seleccioná una lista primero', 'warning');
        }
        return;
    }

    if (editSection.style.display === 'none' || editSection.style.display === '') {
        editSection.style.display = 'block';
        const nameInput = document.getElementById('watchlist-edit-name');
        if (nameInput) {
            nameInput.focus();
            nameInput.select();
        }
    } else {
        editSection.style.display = 'none';
    }
}

// Make functions global
window.initWatchlistTabs = initWatchlistTabs;
window.loadWatchlist = loadWatchlist;
window.openWatchlistManager = openWatchlistManager;
window.closeWatchlistManager = closeWatchlistManager;
window.saveCurrentWatchlist = saveCurrentWatchlist;
window.deleteCurrentWatchlist = deleteCurrentWatchlist;
window.createNewWatchlistPrompt = createNewWatchlistPrompt;
window.toggleEditMode = toggleEditMode;


// ========================================
// DELETE SELECTED SYMBOLS FUNCTIONALITY
// ========================================
function setupDeleteSelectedButton() {
    const deleteBtn = document.getElementById('delete-selected-symbols-btn');
    if (!deleteBtn) return;

    function updateDeleteButtonVisibility() {
        const table = document.getElementById('watchlist-table');
        if (!table) return;

        const checkedBoxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
        deleteBtn.style.display = checkedBoxes.length > 0 ? 'flex' : 'none';
    }

    document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' && e.target.closest('#watchlist-table')) {
            updateDeleteButtonVisibility();
        }
    });

    deleteBtn.addEventListener('click', async () => {
        const table = document.getElementById('watchlist-table');
        if (!table) return;

        const checkedBoxes = table.querySelectorAll('tbody input[type="checkbox"]:checked');
        if (checkedBoxes.length === 0) return;

        const symbolsToDelete = Array.from(checkedBoxes)
            .map(cb => cb.dataset.symbol)
            .filter(Boolean);

        if (symbolsToDelete.length === 0) {
            console.error('❌ No symbols found in checkboxes');
            return;
        }

        if (!confirm(`¿Eliminar ${symbolsToDelete.length} símbolo(s) de la watchlist?`)) return;

        // Use global watchlists
        const currentId = window.currentWatchlistId || currentWatchlistId || 'default';
        const wl = watchlists[currentId];

        if (!wl || !wl.symbols) {
            console.error('❌ Watchlist not found:', currentId);
            return;
        }

        console.log('🗑️ Deleting symbols:', symbolsToDelete);
        console.log('📋 Before:', [...wl.symbols]);

        wl.symbols = wl.symbols.filter(s => !symbolsToDelete.includes(s));

        console.log('📋 After:', wl.symbols);

        // Save to Supabase
        console.log('💾 Saving to Supabase...');
        await saveData();
        console.log('✅ Saved');

        if (typeof renderWatchlist === 'function') {
            renderWatchlist();
        }

        const selectAll = document.getElementById('watchlist-select-all');
        if (selectAll) selectAll.checked = false;

        deleteBtn.style.display = 'none';

        console.log(`✅ Deleted ${symbolsToDelete.length} symbols from watchlist`);
    });
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWatchlistTabs);
} else {
    initWatchlistTabs();
}

console.log('Watchlist Tabs: Loaded (Supabase Only)');
