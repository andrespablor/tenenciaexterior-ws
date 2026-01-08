// ========================================
// WATCHLIST TABS MANAGER
// ========================================

// Initialize watchlist tabs
function initWatchlistTabs() {
    console.log('🎯 Initializing watchlist tabs...');

    const mercadoTabsNav = document.getElementById('mercado-tabs');
    if (!mercadoTabsNav) return;

    // Load watchlists
    let watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');
    let watchlistNames = Object.keys(watchlists);

    // If no watchlists, create default
    if (watchlistNames.length === 0) {
        watchlists['default'] = [];
        localStorage.setItem('watchlists', JSON.stringify(watchlists));
        watchlistNames = ['default'];
    }

    // Load saved order if exists
    const savedOrder = JSON.parse(localStorage.getItem('watchlistOrder') || '[]');
    if (savedOrder.length > 0) {
        // Filter out deleted lists and add new ones
        const validOrder = savedOrder.filter(n => watchlistNames.includes(n));
        const newLists = watchlistNames.filter(n => !validOrder.includes(n));
        watchlistNames = [...validOrder, ...newLists];
    }

    // Clear existing tabs
    mercadoTabsNav.innerHTML = '';

    // Create container for sortable tabs to separate from controls
    const tabsContainer = document.createElement('div');
    tabsContainer.id = 'tabs-sortable-container';
    tabsContainer.style.display = 'flex';
    tabsContainer.style.overflowX = 'auto'; // Allow scrolling if many tabs
    tabsContainer.style.maxWidth = 'calc(100% - 100px)'; // Reserve space for controls
    mercadoTabsNav.appendChild(tabsContainer);

    // Create tab for each watchlist
    watchlistNames.forEach((name) => {
        const tab = document.createElement('button');
        tab.className = 'tab';
        if (typeof currentWatchlistId !== 'undefined' && currentWatchlistId === name) {
            tab.classList.add('active');
        } else if (typeof currentWatchlistId === 'undefined' && name === 'default') {
            // Fallback initial active
            tab.classList.add('active');
        }

        tab.dataset.tab = 'watchlist';
        tab.dataset.watchlistName = name;

        // Format name (Plain text, user casing)
        const displayName = name === 'default' ? 'Mi Watchlist' : name;
        tab.textContent = displayName;

        // Click handler
        tab.addEventListener('click', () => {
            // Update active tab
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Load this watchlist
            loadWatchlist(name);
        });

        tabsContainer.appendChild(tab);
    });

    // Add controls to tabs bar
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'tabs-right';
    controlsDiv.style.marginLeft = 'auto'; // Push to right
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
    `;
    mercadoTabsNav.appendChild(controlsDiv);

    // Add Listeners
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

    // Initialize Sortable for Tabs
    if (typeof Sortable !== 'undefined') {
        new Sortable(tabsContainer, {
            animation: 150,
            ghostClass: 'tab-ghost',
            onEnd: function () {
                const newOrder = Array.from(tabsContainer.querySelectorAll('.tab'))
                    .map(tab => tab.dataset.watchlistName);
                localStorage.setItem('watchlistOrder', JSON.stringify(newOrder));
            }
        });
    }

    // Load current or first watchlist logic
    if (!window.currentWatchlistId) {
        const initial = watchlistNames.includes('default') ? 'default' : watchlistNames[0];
        loadWatchlist(initial);
        // Set active class visually
        const activeTab = tabsContainer.querySelector(`[data-watchlist-name="${initial}"]`);
        if (activeTab) {
            // Ensure only one is active
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            activeTab.classList.add('active');
        }
    }

    // Initialize watchlist event listeners (app.js integration)
    if (typeof initializeWatchlist === 'function') {
        console.log('🔧 Calling initializeWatchlist from watchlist-tabs.js');
        try {
            initializeWatchlist();
        } catch (e) {
            console.warn('InitializeWatchlist partial error:', e);
        }
    }
}

// Load specific watchlist
function loadWatchlist(name) {
    if (typeof currentWatchlistId !== 'undefined') {
        currentWatchlistId = name;
    }
    if (typeof renderWatchlist === 'function') {
        renderWatchlist();
    }
}

// Add Symbol Logic
function addSymbolPrompt(inputValue) {
    let symbol = inputValue;

    if (!symbol || !symbol.trim()) {
        return;
    }

    if (symbol && symbol.trim()) {
        const cleanSymbol = symbol.trim().toUpperCase();

        if (typeof addToWatchlistWithSymbol === 'function') {
            addToWatchlistWithSymbol(cleanSymbol);
        } else {
            // Fallback logic
            if (typeof currentWatchlistId === 'undefined') return;

            let watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');
            let list = watchlists[currentWatchlistId];
            if (!Array.isArray(list)) list = [];

            if (!list.includes(cleanSymbol)) {
                list.push(cleanSymbol);
                watchlists[currentWatchlistId] = list;
                localStorage.setItem('watchlists', JSON.stringify(watchlists));

                if (typeof renderWatchlist === 'function') renderWatchlist();
                if (typeof subscribeToPortfolioAndWatchlist === 'function') subscribeToPortfolioAndWatchlist();
            } else {
                alert('El símbolo ya está en la lista.');
            }
        }

        const inputEl = document.getElementById('watchlist-symbol-input');
        if (inputEl) inputEl.value = '';
    }
}

// ===================================
// MANAGER MODAL LOGIC (New Pattern)
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
    initWatchlistTabs(); // Refresh Tabs UI
}

function renderManagerList() {
    const listContainer = document.getElementById('watchlist-select-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    // Load lists
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');
    const savedOrder = JSON.parse(localStorage.getItem('watchlistOrder') || '[]');
    let watchlistNames = Object.keys(watchlists);

    // Apply order
    if (savedOrder.length > 0) {
        const validOrder = savedOrder.filter(n => watchlistNames.includes(n));
        const newLists = watchlistNames.filter(n => !validOrder.includes(n));
        watchlistNames = [...validOrder, ...newLists];
    }

    watchlistNames.forEach(name => {
        const item = document.createElement('div');
        item.className = 'watchlist-select-item';
        if (selectedWatchlistForEdit === name) item.classList.add('selected');

        const displayName = name === 'default' ? 'Mi Watchlist' : name;
        item.textContent = displayName;

        item.onclick = () => {
            selectedWatchlistForEdit = name;
            renderManagerList(); // Re-render to update highlight
            updateEditSection();
        };

        listContainer.appendChild(item);
    });
}

function updateEditSection() {
    const editSection = document.getElementById('watchlist-edit-section');
    const nameInput = document.getElementById('watchlist-edit-name');

    if (!selectedWatchlistForEdit) {
        editSection.style.display = 'none';
        return;
    }

    editSection.style.display = 'block';

    // Populate Name
    const displayName = selectedWatchlistForEdit === 'default' ? 'Mi Watchlist' : selectedWatchlistForEdit;
    nameInput.value = displayName;
}

function saveCurrentWatchlist() {
    if (!selectedWatchlistForEdit) return; // Or create new?

    const nameInput = document.getElementById('watchlist-edit-name');
    const newName = nameInput.value.trim();

    if (!newName) {
        alert('El nombre no puede estar vacío');
        return;
    }

    // Check duplication (if renaming)
    const oldName = selectedWatchlistForEdit;
    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');

    // Clean name logic
    // If it's default, we can't really rename the key 'default' easily without migration logic, 
    // but user wants to rename "Mi Watchlist" to something else? 
    // Let's assume 'default' key persists but we just change its display? 
    // The previous logic actually renamed the KEY. Let's stick to key renaming for simplicity.

    if (newName !== oldName) {
        if (watchlists[newName]) {
            alert('Ya existe una lista con este nombre.');
            return;
        }

        // Rename Key
        watchlists[newName] = watchlists[oldName];
        delete watchlists[oldName];
        localStorage.setItem('watchlists', JSON.stringify(watchlists));

        // Update Order
        let savedOrder = JSON.parse(localStorage.getItem('watchlistOrder') || '[]');
        const idx = savedOrder.indexOf(oldName);
        if (idx !== -1) savedOrder[idx] = newName;
        else savedOrder.push(newName);
        localStorage.setItem('watchlistOrder', JSON.stringify(savedOrder));

        // Update selection
        selectedWatchlistForEdit = newName;

        // Update current if active
        if (typeof currentWatchlistId !== 'undefined' && currentWatchlistId === oldName) {
            currentWatchlistId = newName;
        }

        renderManagerList();
        // showToast('Guardado');
    }
}

function deleteCurrentWatchlist() {
    if (!selectedWatchlistForEdit) return;

    const watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');
    if (Object.keys(watchlists).length <= 1) {
        alert('No se puede eliminar la única lista existente.');
        return;
    }

    if (confirm(`¿Eliminar "${selectedWatchlistForEdit}" permanentemente?`)) {
        delete watchlists[selectedWatchlistForEdit];
        localStorage.setItem('watchlists', JSON.stringify(watchlists));

        // Update Order
        let savedOrder = JSON.parse(localStorage.getItem('watchlistOrder') || '[]');
        savedOrder = savedOrder.filter(n => n !== selectedWatchlistForEdit);
        localStorage.setItem('watchlistOrder', JSON.stringify(savedOrder));

        // Reset selection
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

function createNewWatchlistPrompt() {
    // Instead of prompt, maybe select 'New' mode? 
    // User said "copy distribution"... usually there is a + button. 
    // Let's use Prompt for simplicity as established, or better, 
    // create a temporary item in the list called "Nueva Lista" and select it?
    // Let's stick to Prompt for creation to keep it robust and simple.

    const name = prompt('Nombre de la nueva lista:');
    if (name && name.trim()) {
        const cleanName = name.trim();
        const watchlists = JSON.parse(localStorage.getItem('watchlists') || '{}');

        if (watchlists[cleanName]) {
            alert('Ya existe una lista con ese nombre.');
            return;
        }

        watchlists[cleanName] = [];
        localStorage.setItem('watchlists', JSON.stringify(watchlists));

        let savedOrder = JSON.parse(localStorage.getItem('watchlistOrder') || '[]');
        savedOrder.push(cleanName);
        localStorage.setItem('watchlistOrder', JSON.stringify(savedOrder));

        // Select it
        selectedWatchlistForEdit = cleanName;
        renderManagerList();
        updateEditSection();
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

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWatchlistTabs);
} else {
    initWatchlistTabs();
}
