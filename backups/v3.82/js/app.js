// ========================================
// APP.JS - Logica Principal
// Config y estado global estan en config.js
// ========================================

// ========================================
// Validación de Dependencias Crít icas
// ========================================
(function checkCriticalDependencies() {
    const required = [
        { name: 'calculatePortfolio', module: 'calculations.js' },
        { name: 'calculateSpeciesSummary', module: 'calculations.js' },
        { name: 'renderPortfolio', module: 'ui.js' },
        { name: 'renderSummary', module: 'ui.js' },
        { name: 'renderHistory', module: 'ui.js' },
        { name: 'fetchPrice', module: 'api.js' },
        { name: 'saveData', module: 'storage.js' },
        { name: 'loadData', module: 'storage.js' }
    ];

    const missing = required.filter(dep => typeof window[dep.name] !== 'function');

    if (missing.length > 0) {
        const errorMsg = `❌ Error Crítico: Módulos faltantes\n\n${missing.map(m => `• ${m.name} (${m.module})`).join('\n')}`;
        console.error(errorMsg);

        document.addEventListener('DOMContentLoaded', () => {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc3545;color:white;padding:20px;text-align:center;z-index:10000;';
            banner.innerHTML = `<h2>⚠️ Error de Carga</h2><p>No se pudieron cargar todos los módulos necesarios. Por favor, refrescá la página.</p><details><summary>Detalles Técnicos</summary><pre style="text-align:left;background:rgba(0,0,0,0.2);padding:10px;margin-top:10px;">${errorMsg}</pre></details>`;
            document.body.prepend(banner);
        });

        return false; // Abort init
    }

    console.log('✅ All critical modules loaded');
    return true;
})();

// ========================================
// Inicialización
// ========================================

// Mapa de traducción de sectores (English -> Español abreviado)
const SECTOR_TRANSLATIONS = {
    "Technology": "Tecnología",
    "Semiconductors": "Semicond.",
    "Health Care": "Salud",
    "Financial Services": "Fin. Serv.",
    "Financials": "Finanzas",
    "Energy": "Energía",
    "Consumer Cyclical": "Cons. Cícl.",
    "Consumer Defensive": "Cons. Def.",
    "Communication Services": "Comunic.",
    "Industrials": "Industria",
    "Basic Materials": "Materiales",
    "Utilities": "Serv. Públ.",
    "Real Estate": "Inmob.",
    "Retail": "Retail",
    "Professional Services": "Serv. Prof.",
    "N/A": "ETF"
};

// Carga de perfiles estáticos (Sectores/Industrias)
window.stockProfiles = {};
async function loadStockProfiles() {
    try {
        const res = await fetch('assets/stock-profiles.json');
        if (res.ok) {
            window.stockProfiles = await res.json();
        }
    } catch (e) {
        // Ignorar si no existe aún
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    loadStockProfiles(); // Iniciar carga en paralelo (no await para no bloquear UI)
    loadData(); // Cargar desde localStorage primero
    loadSettings();

    // Si el backend configurado es Sheets, intentar cargar desde la nube
    if (appSettings.storageBackend === 'sheets') {
        await loadDataSheets();
    }

    checkYearChange(); // Detectar cambio de año y guardar snapshot si es necesario
    initializeDailyAutoSave(); // Sistema de auto-guardado diario a las 23:30
    initializeTabs();
    initializeModals();
    initializeForms();
    initializeYearFilter(); // Cambiado de initializePeriodFilter
    initializeSortableHeaders();
    initializeAutoRefresh();
    initializeSettings();
    initializeHistorySearch();
    applySettings();
    initializeWatchlist();

    // Botón Ver Historial Diario
    const toggleDailyStatsBtn = document.getElementById('toggle-daily-stats');
    const dailyStatsContainer = document.getElementById('daily-stats-container');

    if (toggleDailyStatsBtn && dailyStatsContainer) {
        toggleDailyStatsBtn.addEventListener('click', () => {
            if (dailyStatsContainer.style.display === 'none' || !dailyStatsContainer.style.display) {
                dailyStatsContainer.style.display = 'block';
                toggleDailyStatsBtn.textContent = '📅 Ocultar Historial Diario';
                renderDailyStats(); // Renderizar la tabla al mostrarla
            } else {
                dailyStatsContainer.style.display = 'none';
                toggleDailyStatsBtn.textContent = '📅 Ver Historial Diario';
            }
        });
    }

    renderAll();

    const portfolio = calculatePortfolio();
    if (Object.keys(portfolio).length > 0) {
        refreshAllPrices();

    } else {
        // Si no hay datos, renderizar tabla vacía o existente
        renderDailyStats();
    }

    // Refresh button - registrar de forma explícita
    const refreshBtn = document.getElementById('refresh-prices');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            console.log('Refresh clicked!');
            refreshAllPrices();
        });
    }

    // Settings modal
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn'); // Botón ⚙️ de la derecha
    const closeSettingsModal = document.getElementById('close-settings-modal');
    const cancelSettings = document.getElementById('cancel-settings');
    const saveSettingsBtn = document.getElementById('save-settings');
    const appNameInput = document.getElementById('setting-app-name');
    const alertEmailInput = document.getElementById('alert-email');
    const themeBtns = document.querySelectorAll('.theme-btn');



    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            appNameInput.value = appSettings.appName || 'Cartera exterior';
            alertEmailInput.value = appSettings.alertEmail || '';

            // Set active storage backend
            const backend = appSettings.storageBackend || 'local';
            document.querySelectorAll('input[name="storage-backend"]').forEach(radio => {
                radio.checked = radio.value === backend;
            });

            settingsModal.style.display = 'flex';
        });
    }

    // Also support sidebar settings button
    const settingsSidebarBtn = document.getElementById('settings-sidebar-btn');
    if (settingsSidebarBtn) {
        settingsSidebarBtn.addEventListener('click', () => {
            appNameInput.value = appSettings.appName || 'Cartera exterior';
            alertEmailInput.value = appSettings.alertEmail || '';

            // Set active storage backend
            const backend = appSettings.storageBackend || 'local';
            document.querySelectorAll('input[name="storage-backend"]').forEach(radio => {
                radio.checked = radio.value === backend;
            });

            settingsModal.style.display = 'flex';
        });
    }

    if (closeSettingsModal) {
        closeSettingsModal.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (cancelSettings) {
        cancelSettings.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', async () => {
            appSettings.appName = appNameInput.value.trim();
            appSettings.alertEmail = alertEmailInput.value.trim();

            // Guardar backend seleccionado
            const selectedBackend = document.querySelector('input[name="storage-backend"]:checked')?.value || 'local';
            const oldBackend = appSettings.storageBackend;

            // Si cambias de Local a Sheets
            if (oldBackend === 'local' && selectedBackend === 'sheets') {
                appSettings.storageBackend = selectedBackend;
                saveSettings();

                // Solo migrar si local tiene datos
                const hasLocalData = movements.length > 0 || Object.keys(watchlists).length > 1;

                if (hasLocalData) {
                    // Migrar datos de Local a Sheets
                    showToast('📤 Migrando datos a Google Sheets...', 'info');
                    await saveData();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                // Cargar datos desde Sheets
                await loadDataSheets();
                const portfolio = calculatePortfolio();
                renderPortfolio(portfolio);
                renderDailyChart();
                renderHistory();
                renderWatchlist();

                settingsModal.classList.remove('show');
                const msg = hasLocalData ? '✅ Datos migrados a Google Sheets' : '✅ Sincronizado con Google Sheets';
                showToast(msg, 'success');
                return;
            }

            appSettings.storageBackend = selectedBackend;

            // Actualizar título
            document.querySelector('h1').textContent = appSettings.appName;

            // CRÍTICO: Guardar settings en localStorage siempre (para persistir backend)
            saveSettings();

            // Luego guardar datos completos en el backend seleccionado
            await saveData();

            // Si está en Sheets, recargar datos
            if (selectedBackend === 'sheets') {
                await loadDataSheets();
                const portfolio = calculatePortfolio();
                renderPortfolio(portfolio);
                renderDailyChart();
                renderHistory();
                renderWatchlist();
            }

            settingsModal.style.display = 'none';

            if (oldBackend !== selectedBackend) {
                const backendName = selectedBackend === 'sheets' ? '📊 Google Sheets' : '💾 LocalStorage';
                showToast(`✅ Backend cambiado a: ${backendName}`, 'success');
            } else {
                showToast('✅ Configuración guardada!', 'success');
            }
        });
    }

    // Theme toggle in sidebar
    const themeToggleSidebar = document.getElementById('theme-toggle-sidebar');
    if (themeToggleSidebar) {
        themeToggleSidebar.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            appSettings.theme = next;
            saveSettings();

            // Update icon based on theme
            const icon = next === 'dark' ? 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' : 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z';
            themeToggleSidebar.querySelector('path').setAttribute('d', icon);
        });
    }

    // Botón de migración
    const migrateBtn = document.getElementById('migrate-data-btn');
    if (migrateBtn) {
        migrateBtn.addEventListener('click', async () => {
            if (!confirm('¿Migrar todos los datos de LocalStorage a JSONBin Cloud?\n\nEsto sobrescribirá los datos existentes en la nube.')) {
                return;
            }

            migrateBtn.textContent = '⏳ Migrando...';
            migrateBtn.disabled = true;

            try {
                // Guardar backend actual
                const oldBackend = appSettings.storageBackend;

                // Forzar save a JSONBin
                appSettings.storageBackend = 'jsonbin';
                const success = await saveDataJSONBin();

                if (success) {
                    showToast('✅ Datos migrados exitosamente', 'success');
                } else {
                    appSettings.storageBackend = oldBackend; // Restaurar
                    showToast('❌ Error en la migración', 'error');
                }
            } catch (error) {
                console.error('Migration error:', error);
                showToast('❌ Error en la migración', 'error');
            } finally {
                migrateBtn.textContent = '📤 Migrar Datos a la Nube';
                migrateBtn.disabled = false;
            }
        });
    }

    // Cerrar modal al hacer click fuera
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
            }
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    if (themeToggle) {
        themeToggle.textContent = savedTheme === 'dark' ? '🌙' : '☀️';
        themeToggle.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            themeToggle.textContent = next === 'dark' ? '🌙' : '☀️';
        });
    }
});

// ========================================
// Auto-refresh
// ========================================
let autoRefreshPortfolioInterval = null;
let autoRefreshWatchlistInterval = null;

function initializeAutoRefresh() {
    // Portfolio auto-refresh
    const portfolioToggle = document.getElementById('auto-refresh-portfolio');
    if (portfolioToggle) {
        portfolioToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Actualizar cada 5 minutos
                autoRefreshPortfolioInterval = setInterval(() => {
                    refreshAllPrices();
                }, 60 * 1000);
            } else {
                if (autoRefreshPortfolioInterval) {
                    clearInterval(autoRefreshPortfolioInterval);
                    autoRefreshPortfolioInterval = null;
                }
            }
        });

        // Activar auto-refresh si el toggle está checked por default
        if (portfolioToggle.checked) {
            autoRefreshPortfolioInterval = setInterval(() => {
                refreshAllPrices();
            }, 60 * 1000);
        }
    }

    // Watchlist auto-refresh
    const watchlistToggle = document.getElementById('auto-refresh-watchlist');
    if (watchlistToggle) {
        watchlistToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Actualizar cada 5 minutos
                autoRefreshWatchlistInterval = setInterval(() => {
                    refreshWatchlistPrices();
                }, 60 * 1000);
            } else {
                if (autoRefreshWatchlistInterval) {
                    clearInterval(autoRefreshWatchlistInterval);
                    autoRefreshWatchlistInterval = null;
                }
            }
        });

        // Activar auto-refresh si el toggle está checked por default
        if (watchlistToggle.checked) {
            autoRefreshWatchlistInterval = setInterval(() => {
                refreshWatchlistPrices();
            }, 60 * 1000);
        }
    }
}

// Persistence functions moved to storage.js
// ========================================
// Renderizar Todo
// ========================================
function renderAll() {
    const portfolio = calculatePortfolio();
    const summary = calculateSpeciesSummary();

    renderPortfolio(portfolio);
    renderSummary(summary);
    renderHistory();
    updateHeaderStats(portfolio, summary);
    renderCharts(portfolio);
}

// ========================================
// Filtro de Año Fiscal
// ========================================
function initializeYearFilter() {
    const yearFilter = document.getElementById('year-filter');

    // Auto-select año actual
    const currentYear = new Date().getFullYear();
    const matchingOption = yearFilter.querySelector(`option[value = "${currentYear}"]`);
    if (matchingOption) {
        yearFilter.value = String(currentYear);
        selectedPeriod = String(currentYear);
    } else {
        yearFilter.value = 'all';
        selectedPeriod = 'all';
    }

    yearFilter.addEventListener('change', (e) => {
        selectedPeriod = e.target.value;
        renderAll();
    });
}

function getDateRange() {
    // Para años específicos
    if (selectedPeriod === '2025' || selectedPeriod === '2026') {
        const year = parseInt(selectedPeriod);
        const start = new Date(year, 0, 1); // 1 de enero
        const end = new Date(year, 11, 31, 23, 59, 59); // 31 de diciembre
        return start; // Mantener comatibility con código existente
    }

    // Para "all" no hay filtro
    return null;
}

function filterMovementsByPeriod(movs) {
    const startDate = getDateRange();
    if (!startDate) return movs;
    return movs.filter(m => new Date(m.date) >= startDate);
}

// ========================================
// Ordenamiento de Tablas
// ========================================
function initializeSortableHeaders() {
    document.querySelectorAll('.data-table.sortable th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const table = th.closest('table');
            const column = th.dataset.sort;

            // Toggle direction
            if (sortConfig.column === column) {
                sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortConfig.column = column;
                sortConfig.direction = 'asc';
            }

            // Update header styles
            table.querySelectorAll('th').forEach(h => {
                h.classList.remove('sorted-asc', 'sorted-desc');
            });
            th.classList.add(sortConfig.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');

            renderAll();
        });
    });
}

function sortData(data, column, direction) {
    return [...data].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        // Handle strings
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}


// calculatePortfolio and calculateSpeciesSummary moved to calculations.js

// ========================================
// Navegación
// ========================================
function initializeTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'stats') {
                renderCharts(calculatePortfolio());
            }
        });
    });
}

// ========================================
// Modales
// ========================================
function initializeModals() {
    const modal = document.getElementById('movement-modal');

    document.getElementById('add-movement-btn').addEventListener('click', () => {
        editingIndex = -1;
        document.getElementById('movement-form').reset();
        document.getElementById('movement-date').valueAsDate = new Date();
        modal.classList.add('show');
    });

    document.getElementById('close-movement-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-movement').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // CSV Import/Export
    document.getElementById('import-csv-btn').addEventListener('click', () => {
        document.getElementById('csv-input').click();
    });

    document.getElementById('csv-input').addEventListener('change', handleCSVImport);
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

    // Selección múltiple
    document.getElementById('select-all-movements').addEventListener('change', toggleSelectAll);
    document.getElementById('delete-selected-btn').addEventListener('click', deleteSelectedMovements);
}

function closeModal() {
    document.getElementById('movement-modal').classList.remove('show');
    document.getElementById('settings-modal').classList.remove('show');
    editingIndex = -1;
}

// ========================================
// Settings
// ========================================
function initializeSettings() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.getElementById('close-settings-modal');
    const cancelBtn = document.getElementById('cancel-settings');
    const saveBtn = document.getElementById('save-settings');
    const nameInput = document.getElementById('setting-app-name');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // Abrir modal
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            nameInput.value = appSettings.appName;
            themeBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === appSettings.theme);
            });
            settingsModal.classList.add('show');
        });
    }

    // Cerrar
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });

    // Seleccionar tema
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Guardar
    saveBtn.addEventListener('click', () => {
        appSettings.appName = nameInput.value.trim() || 'Portfolio Tracker';
        const activeTheme = document.querySelector('.theme-btn.active');
        appSettings.theme = activeTheme ? activeTheme.dataset.theme : 'dark';

        saveSettings();
        applySettings();
        closeModal();
    });
}

// ========================================
// Formularios
// ========================================
function initializeForms() {
    document.getElementById('movement-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const date = document.getElementById('movement-date').value;
        const type = document.getElementById('movement-type').value;
        const symbol = document.getElementById('movement-symbol').value.toUpperCase().trim();
        const quantity = parseFloat(document.getElementById('movement-quantity').value);
        const price = parseFloat(document.getElementById('movement-price').value);
        const importe = type === 'COMPRA' ? -(quantity * price) : quantity * price;

        if (editingIndex >= 0) {
            // Editar existente
            movements[editingIndex] = { ...movements[editingIndex], date, type, symbol, quantity, price, importe };
        } else {
            // Nuevo
            movements.push({ id: Date.now(), date, type, symbol, quantity, price, importe });
        }

        movements.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveData();
        renderAll();
        closeModal();

        if (!priceCache[symbol]) {
            await fetchPrice(symbol);
            renderAll();
        }
    });
}

// ========================================
// Editar Movimiento
// ========================================
function editMovement(idx) {
    const m = movements[idx];
    editingIndex = idx;

    document.getElementById('movement-date').value = m.date;
    document.getElementById('movement-type').value = m.type;
    document.getElementById('movement-symbol').value = m.symbol;
    document.getElementById('movement-quantity').value = m.quantity;
    document.getElementById('movement-price').value = m.price;

    document.getElementById('movement-modal').classList.add('show');
}

// ========================================
// Importar/Exportar CSV
// ========================================
function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim());

        // Saltar header si existe
        const startIdx = lines[0].toLowerCase().includes('fecha') ? 1 : 0;

        const results = {
            valid: [],
            errors: [],
            warnings: []
        };

        // Procesar línea por línea con validación
        for (let i = startIdx; i < lines.length; i++) {
            const lineNum = i + 1;

            try {
                const cols = parseCSVLine(lines[i]);

                // Validación básica de columnas
                if (cols.length < 5) {
                    results.errors.push({
                        line: lineNum,
                        reason: `Columnas insuficientes (${cols.length}/5)`
                    });
                    continue;
                }

                // Parse y sanitización
                const date = parseCSVDate(cols[0]);
                const typeText = sanitizeString(cols[1]).toUpperCase();
                const symbol = sanitizeString(cols[2]).toUpperCase();
                const rawQuantity = parseCSVNumber(cols[3]);
                const rawPrice = parseCSVNumber(cols[4]);

                // Validaciones estrictas
                if (!date) {
                    results.errors.push({ line: lineNum, reason: 'Fecha inválida' });
                    continue;
                }

                const type = typeText.includes('VENTA') ? 'VENTA' : 'COMPRA';

                if (!symbol || symbol.length > 10 || !/^[A-Z0-9]+$/.test(symbol)) {
                    results.errors.push({ line: lineNum, reason: 'Símbolo inválido o vacío' });
                    continue;
                }

                const quantity = Math.abs(rawQuantity);
                const price = Math.abs(rawPrice);

                if (quantity <= 0 || isNaN(quantity)) {
                    results.errors.push({ line: lineNum, reason: 'Cantidad inválida' });
                    continue;
                }

                if (price <= 0 || isNaN(price)) {
                    results.errors.push({ line: lineNum, reason: 'Precio inválido' });
                    continue;
                }

                // Warning si cantidad o precio son sospechosamente altos
                if (quantity > 1000000) {
                    results.warnings.push({ line: lineNum, reason: 'Cantidad muy alta (revisar)' });
                }
                if (price > 100000) {
                    results.warnings.push({ line: lineNum, reason: 'Precio muy alto (revisar)' });
                }

                // Todo OK, agregar a válidos
                results.valid.push({
                    line: lineNum,
                    data: {
                        id: Date.now() + i,
                        date,
                        type,
                        symbol,
                        quantity,
                        price,
                        importe: type === 'COMPRA' ? -(quantity * price) : quantity * price
                    }
                });

            } catch (err) {
                results.errors.push({
                    line: lineNum,
                    reason: `Error de parsing: ${err.message}`
                });
            }
        }

        // Mostrar resumen
        const totalLines = lines.length - startIdx;
        let message = `📊 Resumen de Importación\n\n`;
        message += `• Total de líneas: ${totalLines}\n`;
        message += `• ✅ Válidas: ${results.valid.length}\n`;
        message += `• ❌ Errores: ${results.errors.length}\n`;
        message += `• ⚠️ Advertencias: ${results.warnings.length}\n`;

        if (results.errors.length > 0) {
            message += `\n❌ Errores detectados:\n`;
            results.errors.slice(0, 5).forEach(err => {
                message += `  Línea ${err.line}: ${err.reason}\n`;
            });
            if (results.errors.length > 5) {
                message += `  ... y ${results.errors.length - 5} más\n`;
            }
        }

        if (results.warnings.length > 0) {
            message += `\n⚠️ Advertencias:\n`;
            results.warnings.slice(0, 3).forEach(warn => {
                message += `  Línea ${warn.line}: ${warn.reason}\n`;
            });
        }

        // Decisión: solo importar si hay válidos
        if (results.valid.length === 0) {
            alert(`${message}\n\n⚠️ No hay movimientos válidos para importar.`);
        } else if (results.errors.length > 0) {
            // Hay errores: preguntar si quiere importar igual
            const proceed = confirm(`${message}\n\n¿Importar ${results.valid.length} movimientos válidos de todos modos?`);
            if (proceed) {
                applyCSVImport(results.valid);
            }
        } else {
            // Todo OK
            if (confirm(`${message}\n\n✅ ¿Importar ${results.valid.length} movimientos?`)) {
                applyCSVImport(results.valid);
            }
        }

        e.target.value = '';
    };
    reader.readAsText(file);
}

// Aplicar importación validada
function applyCSVImport(validRows) {
    validRows.forEach(row => movements.push(row.data));
    movements.sort((a, b) => new Date(b.date) - new Date(a.date));
    saveData();
    renderAll();
    alert(`✅ Importados ${validRows.length} movimientos`);
}

// Sanitizar strings para prevenir XSS
function sanitizeString(str) {
    if (!str) return '';
    return str
        .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
        .trim()
        .substring(0, 100); // Límite de longitud
}

// Parser CSV que maneja comillas correctamente
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

// Parsear número con formato argentino (coma decimal, punto miles)
function parseCSVNumber(str) {
    if (!str) return 0;
    // Limpiar: quitar comillas, espacios
    let clean = str.replace(/"/g, '').trim();
    // Si tiene punto y coma: punto es miles, coma es decimal
    // Ej: "1.105" -> 1105, "33,96" -> 33.96, "-9.969,48" -> -9969.48

    // Detectar formato: si tiene coma después del punto, es formato europeo/argentino
    if (clean.includes(',')) {
        // Remover puntos de miles, cambiar coma por punto decimal
        clean = clean.replace(/\./g, '').replace(',', '.');
    }

    return parseFloat(clean) || 0;
}

function parseCSVDate(str) {
    if (!str) return null;
    const clean = str.replace(/"/g, '').trim();
    const parts = clean.split(/[\/\-]/);
    if (parts.length !== 3) return null;

    let year, month, day;
    if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts;
    } else {
        // DD/MM/YY o DD/MM/YYYY
        [day, month, year] = parts;
        // Si el año es de 2 dígitos, agregar 2000
        if (year.length === 2) {
            year = '20' + year;
        }
    }

    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
}

function exportCSV() {
    if (!movements.length) {
        alert('No hay movimientos para exportar');
        return;
    }

    const header = 'Fecha,Tipo,Especie,Cantidad,Precio,Importe\n';
    const rows = movements.map(m =>
        `${m.date},${m.type},${m.symbol},${m.quantity},${m.price},${m.importe} `
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimientos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// API and UI functions moved to api.js and ui.js
// Charts functions moved to charts.js

// ========================================
// Daily Stats Logic
// ========================================
function updateDailyStats() {
    // Calcular totales actuales
    const portfolio = calculatePortfolio();
    const summary = calculateSpeciesSummary();

    let currentInvested = 0;
    let currentResult = 0;

    // Invertido = Valor actual del portfolio (igual que en header)
    Object.values(portfolio).forEach(p => {
        const price = p.currentPrice || p.avgPrice;
        currentInvested += p.quantity * price;
    });

    // Resultado = Suma de totalResult por especie
    Object.values(summary).forEach(s => {
        currentResult += s.totalResult;
    });

    const today = new Date().toISOString().split('T')[0];
    const existingIndex = dailyStats.findIndex(s => s.date === today);

    const stat = {
        date: today,
        invested: currentInvested,
        result: currentResult
    };

    if (existingIndex >= 0) {
        dailyStats[existingIndex] = stat;
    } else {
        dailyStats.push(stat);
    }

    // Ordenar por fecha
    dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));

    saveData();
    renderDailyStats();
}

async function manualSaveSnapshot() {
    updateDailyStats();
    await saveData();
    showToast('✅ Snapshot guardado correctamente!', 'success');
    renderCombinedChart(); // Actualizar el gráfico
}
function renderDailyStats() {
    const tbody = document.getElementById('daily-stats-body');
    if (!tbody) return;

    // Mostrar en orden inverso (mas reciente arriba)
    const sorted = [...dailyStats].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sorted.map((s, idx) => {
        const originalIndex = dailyStats.findIndex(ds => ds.date === s.date);
        return `
        <tr data-index="${originalIndex}">
            <td class="editable-cell" data-field="date">${fmtDate(s.date)}</td>
            <td class="editable-cell" data-field="invested">$${fmt(s.invested, 2)}</td>
            <td class="editable-cell ${s.result >= 0 ? 'cell-positive' : 'cell-negative'}" data-field="result">${s.result >= 0 ? '+' : ''}$${fmt(s.result, 2)}</td>
            <td class="action-buttons">
                <button class="btn btn-small btn-outline edit-daily-stat" data-index="${originalIndex}" title="Editar">✏️</button>
                <button class="btn btn-small btn-danger delete-daily-stat" data-index="${originalIndex}" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `}).join('');

    // Event listeners para edición
    tbody.querySelectorAll('.edit-daily-stat').forEach(btn => {
        btn.addEventListener('click', handleEditDailyStat);
    });

    // Event listeners para eliminar
    tbody.querySelectorAll('.delete-daily-stat').forEach(btn => {
        btn.addEventListener('click', handleDeleteDailyStat);
    });
}

function handleDeleteDailyStat(e) {
    const index = parseInt(e.target.dataset.index);
    const stat = dailyStats[index];

    if (!confirm(`¿Eliminar registro del ${fmtDate(stat.date)}?`)) return;

    dailyStats.splice(index, 1);
    saveData();
    renderDailyStats();
    renderCombinedChart();

    showToast(`✅ Registro ${fmtDate(stat.date)} eliminado`);
}

function handleEditDailyStat(e) {
    const btn = e.target;
    const index = parseInt(btn.dataset.index);
    const row = btn.closest('tr');
    const cells = row.querySelectorAll('.editable-cell');

    if (btn.textContent === '✏️') {
        // Modo edición
        cells.forEach(cell => {
            const field = cell.dataset.field;
            const value = dailyStats[index][field];

            if (field === 'date') {
                cell.innerHTML = `<input type="date" class="edit-input" value="${value}" data-field="${field}">`;
            } else {
                // Limpiar formato para editar
                const cleanValue = field === 'result' ? value : value;
                cell.innerHTML = `<input type="number" step="0.01" class="edit-input" value="${cleanValue}" data-field="${field}">`;
            }
        });
        btn.textContent = '💾';
        btn.classList.add('btn-primary');
    } else {
        // Guardar cambios
        const inputs = row.querySelectorAll('.edit-input');
        const newData = {};

        inputs.forEach(input => {
            const field = input.dataset.field;
            if (field === 'date') {
                newData[field] = input.value;
            } else {
                newData[field] = parseFloat(input.value);
            }
        });

        // Actualizar dailyStats
        dailyStats[index] = { ...dailyStats[index], ...newData };
        dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Guardar en localStorage
        saveData();

        // Re-renderizar tabla y gráfico
        renderDailyStats();
        renderCombinedChart();

        console.log(`✅ Registro actualizado:`, dailyStats[index]);
    }
}

// fmt and fmtDate moved to utils.js

window.deleteMovement = deleteMovement;
window.editMovement = editMovement;
window.updateSelectionUI = updateSelectionUI;

// ========================================
// Watchlist
// ========================================
let watchlistSort = { key: null, asc: true };

// Helper para obtener la lista actual
function getCurrentWatchlist() {
    if (!watchlists[currentWatchlistId]) {
        watchlists[currentWatchlistId] = {
            displayName: currentWatchlistId === 'default' ? 'Mi Watchlist' : currentWatchlistId,
            icon: '📋',
            symbols: []
        };
    }

    const wl = watchlists[currentWatchlistId];

    // New format (object with .symbols) - PREFERRED
    if (wl.symbols && Array.isArray(wl.symbols)) {
        return wl.symbols;
    }

    // Legacy format (array) - AUTO-MIGRATE
    if (Array.isArray(wl)) {
        console.warn(`⚠️ Legacy array format detected for "${currentWatchlistId}", auto-migrating...`);
        watchlists[currentWatchlistId] = {
            displayName: currentWatchlistId === 'default' ? 'Mi Watchlist' : currentWatchlistId,
            icon: '📋',
            symbols: wl // Preserve the symbols array
        };
        saveData(); // Persist the migration
        return watchlists[currentWatchlistId].symbols;
    }

    // Invalid format - log error and return empty
    console.error(`❌ Invalid watchlist format for "${currentWatchlistId}":`, wl);
    return [];
}

function initializeWatchlist() {
    const addBtn = document.getElementById('add-watchlist-btn');
    const symbolInput = document.getElementById('watchlist-symbol');

    if (addBtn) {
        addBtn.addEventListener('click', addToWatchlist);
    }
    if (symbolInput) {
        symbolInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addToWatchlist();
        });
    }

    // Selector de lista (legacy - now handled by watchlist-tabs.js)
    const watchlistSelectorEl = document.getElementById('watchlist-selector');
    if (watchlistSelectorEl) {
        watchlistSelectorEl.addEventListener('change', async (e) => {
            currentWatchlistId = e.target.value;
            saveData();
            renderWatchlist();

            // Re-suscribir símbolos al WebSocket
            if (typeof subscribeToPortfolioAndWatchlist === 'function') {
                subscribeToPortfolioAndWatchlist();
            }

            // Fetch precios de símbolos que no tienen cache
            const list = getCurrentWatchlist();
            const symbolsWithoutCache = list.filter(symbol => !priceCache[symbol] || !priceCache[symbol].price);

            if (symbolsWithoutCache.length > 0) {
                console.log(`🔄 Fetching prices for ${symbolsWithoutCache.length} symbols...`);

                // Fetch en paralelo con rate limiting
                for (let i = 0; i < symbolsWithoutCache.length; i += 5) {
                    const batch = symbolsWithoutCache.slice(i, i + 5);
                    await Promise.all(batch.map(symbol => fetchPrice(symbol)));
                    await new Promise(resolve => setTimeout(resolve, 100)); // Delay entre batches
                }

                renderWatchlist(); // Re-render con los precios nuevos
            }
        });
    }

    // Botón "⚙️" - abre modal (legacy - now removed)
    const manageBtn = document.getElementById('manage-watchlist-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', openWatchlistManager);
    }

    // Select all checkbox
    document.getElementById('watchlist-select-all').addEventListener('change', (e) => {
        document.querySelectorAll('#watchlist-body input[type="checkbox"]').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateWatchlistDeleteBtn();
    });

    // Delete selected button (legacy - now handled by watchlist-tabs.js)
    // DISABLED: This is now handled by watchlist-tabs.js with delete-selected-symbols-btn
    /*
    const deleteWatchlistBtn = document.getElementById('delete-watchlist-selected');
    if (deleteWatchlistBtn) {
        deleteWatchlistBtn.addEventListener('click', deleteSelectedWatchlist);
    }
    */

    // Sorting click handlers
    document.querySelectorAll('#watchlist-table th.sortable-col').forEach(th => {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (watchlistSort.key === key) {
                watchlistSort.asc = !watchlistSort.asc;
            } else {
                watchlistSort.key = key;
                watchlistSort.asc = true;
            }
            renderWatchlist();
        });
    });

    updateWatchlistSelector();
    renderWatchlist();

    // ========================================
    // Drag & Drop Initialization (SortableJS)
    // ========================================

    // Drag & Drop para COLUMNAS (headers)
    const theadRow = document.getElementById('watchlist-thead');
    if (theadRow && typeof Sortable !== 'undefined') {
        new Sortable(theadRow, {
            animation: 150,
            handle: '.draggable-header',
            draggable: 'th',
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            filter: '.col-check', // No permitir arrastrar checkbox
            onEnd: function (evt) {
                // Obtener nuevo orden de columnas
                const headers = Array.from(theadRow.querySelectorAll('th'));
                const columnIds = headers.map(th => th.dataset.columnId).filter(id => id);

                // Guardar orden
                saveColumnOrder(columnIds);

                // Re-renderizar tabla con nuevo orden
                renderWatchlist();

                console.log('✅ Column order updated:', columnIds);
            }
        });
        console.log('🎯 Column drag & drop initialized');
    }

    // Drag & Drop para FILAS (tickers)
    const tbody = document.getElementById('watchlist-body');
    if (tbody && typeof Sortable !== 'undefined') {
        new Sortable(tbody, {
            animation: 150,
            handle: 'tr', // Toda la fila es arrastrable
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            onEnd: function (evt) {
                // Obtener nuevo orden de símbolos
                const rows = Array.from(tbody.querySelectorAll('tr'));
                const symbols = rows.map(row => row.dataset.symbol).filter(s => s);

                // Guardar orden
                saveTickerOrder(symbols);

                // Desactivar sorting automático cuando se arrastra manualmente
                watchlistSort = { key: null, asc: true };

                console.log('✅ Ticker order updated:', symbols);
            }
        });
        console.log('🎯 Row drag & drop initialized');
    }
}

function updateWatchlistSelector() {
    const select = document.getElementById('watchlist-selector');

    // Legacy selector removed - now handled by watchlist-tabs.js
    if (!select) return;

    // Obtener orden guardado o usar Object.keys por defecto
    const savedOrder = localStorage.getItem('watchlistOrder');
    let orderedIds = savedOrder ? JSON.parse(savedOrder) : Object.keys(watchlists);

    // Agregar listas nuevas que no estén en el orden guardado
    Object.keys(watchlists).forEach(id => {
        if (!orderedIds.includes(id)) {
            orderedIds.push(id);
        }
    });

    // Filtrar IDs que ya no existen
    orderedIds = orderedIds.filter(id => watchlists[id]);

    select.innerHTML = orderedIds.map(id => {
        const wl = watchlists[id];
        const displayName = wl.displayName || (id === 'default' ? 'Mi Watchlist' : id);
        const icon = wl.icon || '📋';
        const count = (wl.symbols || wl).length;
        return `<option value="${id}" ${id === currentWatchlistId ? 'selected' : ''}>${icon} ${displayName} (${count})</option>`;
    }).join('');

    // Guardar orden actualizado
    localStorage.setItem('watchlistOrder', JSON.stringify(orderedIds));
}

async function addToWatchlist(symbolArg) {
    const input = document.getElementById('watchlist-symbol');
    const btn = document.getElementById('add-watchlist-btn');

    let value = '';
    if (typeof symbolArg === 'string' && symbolArg.trim()) {
        value = symbolArg.trim().toUpperCase();
    } else if (input) {
        value = input.value.trim().toUpperCase();
    }

    const list = getCurrentWatchlist();

    if (!value) return;

    // Soporta múltiples símbolos separados por coma
    const symbols = value.split(',').map(s => s.trim()).filter(s => s && !list.includes(s));

    if (!symbols.length) {
        if (!symbolArg) showToast('⚠️ Símbolos vacíos o ya en la lista', 'warning');
        else showToast(`⚠️ ${symbolArg} ya está en la lista`, 'warning');
        return;
    }

    // UI Loading state
    let originalText = '';
    if (btn) {
        originalText = btn.textContent;
        btn.textContent = '⏳ Validando...';
        btn.disabled = true;
    } else {
        showToast('⏳ Validando...', 'info');
    }

    let addedCount = 0;

    for (const symbol of symbols) {
        try {
            // Verificar si existe validando precio
            // Usamos fetchPrice que maneja cache y fallbacks
            const data = await fetchPrice(symbol);

            if (data && data.price > 0) {
                list.push(symbol);
                addedCount++;
                showToast(`✅ Agregado: ${symbol}`);
            } else {
                showToast(`❌ Símbolo no encontrado: ${symbol}`, 'error');
            }
        } catch (error) {
            console.error(`Error validating ${symbol}:`, error);
            showToast(`❌ Error al validar ${symbol}`, 'error');
        }
    }

    // Restore UI
    if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
    }

    if (addedCount > 0) {
        saveData();
        renderWatchlist();
        updateWatchlistSelector(); // Update counts if any
        if (input) input.value = ''; // Clean input only on success

        // Subscribe to WS
        if (typeof subscribeToPortfolioAndWatchlist === 'function') {
            subscribeToPortfolioAndWatchlist();
        }
    }
}

// Alias for compatibility
const addToWatchlistWithSymbol = addToWatchlist;

function removeFromWatchlist(symbol) {
    const list = getCurrentWatchlist();
    const idx = list.indexOf(symbol);
    if (idx > -1) {
        list.splice(idx, 1);
        watchlists[currentWatchlistId] = list;
        saveData();

        // Limpiar del priceCache si NO está en el resumen del portfolio
        const speciesSummary = calculateSpeciesSummary();
        if (!speciesSummary[symbol]) {
            delete priceCache[symbol];
            console.log(`🗑️ Removed ${symbol} from priceCache`);
        }

        renderWatchlist();
    }
}

// Helper: Obtener logo de empresa (desde caché local)
// Logo cache - stored locally, populated manually
const logoCache = JSON.parse(localStorage.getItem('logoCache') || '{}');

async function getCompanyLogo(symbol) {
    // Only use local cache (Finnhub API removed)
    return logoCache[symbol] || null;
}

// Actualizar logo de un símbolo específico (llamado después de renderizar)
function updateSymbolLogo(symbol) {
    // Deprecated: Ahora usamos el sistema de eventos onerror en las etiquetas img
}

// Handler para error de carga de logo (Estrategia híbrida)
// 1. Intenta cargar assets/logos/SYMBOL.png (definido en el HTML)
// 2. Si falla, llama a esta función para buscar en Finnhub
function handleLogoError(img, symbol) {
    // Evitar loop infinito
    img.onerror = null;

    // Intentar buscar en Finnhub (cache o API)
    getCompanyLogo(symbol).then(logoUrl => {
        if (logoUrl) {
            img.src = logoUrl;
            // El onload se encargará de mostrarlo
        } else {
            // Si falla Finnhub, asegurar que se muestre el fallback (inicial)
            img.style.display = 'none';
            if (img.nextElementSibling) {
                img.nextElementSibling.style.display = 'flex';
            }
        }
    });
}


function deleteSelectedWatchlist() {
    const checkboxes = document.querySelectorAll('#watchlist-body input[type="checkbox"]:checked');
    const toDelete = Array.from(checkboxes).map(cb => cb.dataset.symbol).filter(Boolean);

    if (toDelete.length === 0) return;

    // Get watchlists from localStorage
    let watchlistsData = JSON.parse(localStorage.getItem('watchlists') || '{}');
    const currentId = currentWatchlistId || 'default';
    const wl = watchlistsData[currentId];

    if (!wl || !wl.symbols) {
        console.error('❌ Watchlist not found');
        return;
    }

    console.log('🗑️ Deleting symbols (app.js):', toDelete);

    // Remove symbols
    wl.symbols = wl.symbols.filter(s => !toDelete.includes(s));
    watchlistsData[currentId] = wl;
    localStorage.setItem('watchlists', JSON.stringify(watchlistsData));

    // CRITICAL: Update GLOBAL watchlists variable (not window.watchlists)
    watchlists = watchlistsData;

    // Uncheck select-all
    const selectAll = document.getElementById('watchlist-select-all');
    if (selectAll) selectAll.checked = false;

    renderWatchlist();
    console.log(`✅ Deleted ${toDelete.length} symbols from watchlist`);
}

function updateWatchlistDeleteBtn() {
    const checked = document.querySelectorAll('#watchlist-body input[type="checkbox"]:checked').length;
    const deleteBtn = document.getElementById('delete-watchlist-selected');
    if (deleteBtn) {
        deleteBtn.style.display = checked > 0 ? 'inline-flex' : 'none';
    }
}

async function refreshWatchlistPrices() {
    const list = getCurrentWatchlist();
    console.log('📊 Refreshing watchlist prices for:', list);

    for (const symbol of list) {
        await fetchPrice(symbol);
    }
    renderWatchlist();
}

function renderWatchlist() {
    const tbody = document.getElementById('watchlist-body');
    const empty = document.getElementById('watchlist-empty');
    const container = document.querySelector('#watchlist .table-container');
    const list = getCurrentWatchlist();

    console.log('🎨 renderWatchlist called. Current list:', list);
    console.log('🎨 Current watchlistId:', currentWatchlistId);

    if (!list.length) {
        container.style.display = 'none';
        empty.classList.add('show');
        console.log('📭 Watchlist is empty, showing empty state');
        return;
    }

    container.style.display = 'block';
    empty.classList.remove('show');

    // Preparar datos con cache para ordenar
    let items = list.map(symbol => {
        const cache = priceCache[symbol] || {};
        return {
            symbol,
            price: cache.price || 0,
            dailyChange: cache.dailyChange || 0,
            dailyDiff: cache.dailyDiff || 0,
            dayHigh: cache.dayHigh || cache.price || 0,
            dayLow: cache.dayLow || cache.price || 0,
            wk52High: cache.wk52High || cache.price || 0,
            wk52Low: cache.wk52Low || cache.price || 0,
            volume: cache.volume || 0,
            avgVolume: cache.avgVolume || 0,
            macd: cache.macd || null,
            previousClose: cache.previousClose || 0,
            marketTime: cache.marketTime || 0,
            sma200: cache.sma200 || (cache.price || 0) * 0.95
        };
    });

    // Aplicar ordenamiento
    if (watchlistSort.key) {
        items.sort((a, b) => {
            let valA, valB;
            if (watchlistSort.key === 'symbol') {
                valA = a.symbol;
                valB = b.symbol;
            } else if (watchlistSort.key === 'change') {
                valA = a.dailyChange;
                valB = b.dailyChange;
            } else if (watchlistSort.key === 'sector') {
                valA = window.stockProfiles?.[a.symbol]?.sector || SECTOR_MAP[a.symbol] || 'Otro';
                valB = window.stockProfiles?.[b.symbol]?.sector || SECTOR_MAP[b.symbol] || 'Otro';
            }
            if (valA < valB) return watchlistSort.asc ? -1 : 1;
            if (valA > valB) return watchlistSort.asc ? 1 : -1;
            return 0;
        });

        // Actualizar indicadores visuales en headers
        const headers = document.querySelectorAll('#watchlist-table th.sortable-col');
        if (headers.length > 0) {
            headers.forEach(th => {
                const key = th.dataset.sort;
                // Dejar texto limpio (asumiendo que estático está bien o usar CSS)
                // NO AGREGAR FLECHAS EXTRAÑAS

                if (key === watchlistSort.key) {
                    th.style.color = '#3b82f6';
                    // Tal vez solo subrayar o negrita si no quieren flechas
                } else {
                    th.style.color = '';
                }
            });
        }
    }

    // Get current column order
    const columnOrder = getColumnOrder() || [
        'checkbox', 'symbol', 'price', 'change', 'diff', 'dayRange', 'wk52',
        'close', 'time', 'volume', 'avgVolume', 'macd', 'sma200', 'stochastic', 'sector', 'actions'
    ];

    tbody.innerHTML = items.map(item => {
        const { symbol, price, dailyChange, dailyDiff, dayHigh, dayLow, wk52High, wk52Low, volume, avgVolume, macd, previousClose, marketTime, sma200 } = item;

        // Day Range
        const dayRange = dayHigh - dayLow;
        const dayPct = dayRange > 0 ? ((price - dayLow) / dayRange) * 100 : 50;

        // 52 Week Range
        const wk52Range = wk52High - wk52Low;
        const wk52Pct = wk52Range > 0 ? ((price - wk52Low) / wk52Range) * 100 : 50;

        // SMA 200
        const smaStatus = price > sma200 ? 'positive' : 'negative';
        const smaLabel = price > sma200 ? '↑' : '↓';

        // MACD color
        let macdDisplay = '-';
        let macdClass = '';
        if (macd !== null && macd !== undefined) {
            if (macd > 0) {
                macdDisplay = 'C';
                macdClass = 'cell-positive';
            } else {
                macdDisplay = 'V';
                macdClass = 'cell-negative';
            }
        }

        // Stochastic desde priceCache
        const cache = priceCache[symbol] || {};
        const stoch = cache.stochastic || null;
        let stochClass = '';
        let stochDisplay = '-';
        if (stoch && stoch.k !== null) {
            const k = stoch.k;
            stochDisplay = k.toFixed(0);
            if (k > 80) {
                stochClass = 'cell-positive';
            } else if (k < 20) {
                stochClass = 'cell-negative';
            }
        }

        // Volume formatting
        const volDisplay = volume > 1000000 ? (volume / 1000000).toFixed(1) + 'M' : volume > 1000 ? (volume / 1000).toFixed(0) + 'K' : volume.toString();
        const avgVolDisplay = avgVolume > 1000000 ? (avgVolume / 1000000).toFixed(1) + 'M' : avgVolume > 1000 ? (avgVolume / 1000).toFixed(0) + 'K' : avgVolume.toString();

        const chartUrl = `https://www.tradingview.com/chart/?symbol=${symbol}`;
        const priceDisplay = price ? `$${fmt(price, 2)}` : '<span class="skeleton-text"></span>';
        const diffDisplay = dailyDiff >= 0 ? `+$${fmt(dailyDiff, 2)}` : `-$${fmt(Math.abs(dailyDiff), 2)}`;
        const closeDisplay = previousClose ? `$${fmt(previousClose, 2)}` : '-';

        // Formatear hora
        let timeDisplay = '-';
        if (marketTime) {
            const date = new Date(marketTime * 1000);
            const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
            const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
            timeDisplay = `${dateStr} ${timeStr}`;
        }

        // Column map - defines the HTML for each column
        const columnMap = {
            'checkbox': `<td class="col-check"><input type="checkbox" data-symbol="${symbol}" onchange="updateWatchlistDeleteBtn()"></td>`,
            'symbol': `<td class="cell-symbol" title="${getCompanyName(symbol)}">
                <div class="symbol-with-logo">
                    <img src="assets/logos/${symbol}.png" 
                         class="company-logo" 
                         alt="${symbol}" 
                         style="display:none"
                         onload="this.style.display='block'; this.nextElementSibling.style.display='none'"
                         onerror="handleLogoError(this, '${symbol}')"><div class="company-logo-fallback">${symbol.charAt(0)}</div>
                    <a href="${chartUrl}" target="_blank">${symbol} 📈</a>
                </div>
            </td>`,
            'price': `<td class="cell-price">${priceDisplay}</td>`,
            'change': `<td class="cell-change ${dailyChange >= 0 ? 'cell-positive' : 'cell-negative'}">${dailyChange >= 0 ? '+' : ''}${dailyChange.toFixed(2)}%</td>`,
            'diff': `<td class="${dailyDiff >= 0 ? 'cell-positive' : 'cell-negative'}">${diffDisplay}</td>`,
            'dayRange': `<td class="range-cell">
                <div class="range-bar">
                    <span class="range-min">${fmt(dayLow, 2)}</span>
                    <div class="range-track">
                        <div class="range-fill" style="width: ${dayPct}%"></div>
                        <div class="range-marker" style="left: ${dayPct}%"></div>
                    </div>
                    <span class="range-max">${fmt(dayHigh, 2)}</span>
                </div>
            </td>`,
            'wk52': `<td class="range-cell">
                <div class="range-bar">
                    <span class="range-min">${fmt(wk52Low, 2)}</span>
                    <div class="range-track">
                        <div class="range-fill" style="width: ${wk52Pct}%"></div>
                        <div class="range-marker" style="left: ${wk52Pct}%"></div>
                    </div>
                    <span class="range-max">${fmt(wk52High, 2)}</span>
                </div>
            </td>`,
            'close': `<td>${closeDisplay}</td>`,
            'time': `<td class="cell-time">${timeDisplay}</td>`,
            'volume': `<td>${volDisplay}</td>`,
            'avgVolume': `<td>${avgVolDisplay}</td>`,
            'macd': `<td class="${macdClass}">${macdDisplay}</td>`,
            'sma200': `<td class="cell-${smaStatus}" title="SMA 200: $${fmt(sma200, 2)}">${smaLabel} $${fmt(sma200, 0)}</td>`,
            'stochastic': `<td class="${stochClass}">${stochDisplay}</td>`,
            'sector': `<td class="cell-sector" title="${window.stockProfiles?.[symbol]?.name || ''}">
                ${window.stockProfiles?.[symbol]?.sector || SECTOR_MAP[symbol] || 'Otro'}
            </td>`,
            'actions': `<td>
                <button class="btn-alert" onclick="promptPriceAlert('${symbol}', ${price})" title="Crear alerta">🔔</button>
                <button class="btn-icon" onclick="removeFromWatchlist('${symbol}')" title="Quitar">🗑️</button>
            </td>`
        };

        // Build row with columns in custom order
        const cells = columnOrder.map(colId => columnMap[colId] || '').join('');
        return `<tr data-symbol="${symbol}">${cells}</tr>`;

    }).join('');
}


window.removeFromWatchlist = removeFromWatchlist;
window.updateWatchlistDeleteBtn = updateWatchlistDeleteBtn;
window.handleLogoError = handleLogoError;

// ========================================
// Watchlist Drag & Drop - Storage Helpers
// ========================================

// Guardar orden de columnas (preparado para migración futura a Sheets/Firebase)
function saveColumnOrder(columnIds) {
    const key = `watchlist-column-order-${currentWatchlistId}`;
    localStorage.setItem(key, JSON.stringify(columnIds));
    console.log(`💾 Column order saved for ${currentWatchlistId}:`, columnIds);
}

// Cargar orden de columnas personalizado
function getColumnOrder() {
    const key = `watchlist-column-order-${currentWatchlistId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.warn('⚠️ Failed to parse column order, using default');
            return null;
        }
    }
    return null;
}

// Guardar orden de tickers en la watchlist
function saveTickerOrder(symbols) {
    const wl = watchlists[currentWatchlistId];
    if (wl && wl.symbols) {
        wl.symbols = symbols;
    } else {
        watchlists[currentWatchlistId] = symbols;
    }
    saveData();
    console.log(`💾 Ticker order saved for ${currentWatchlistId}:`, symbols);
}

// Obtener nombre de empresa (desde stockProfiles o fallback a símbolo)
function getCompanyName(symbol) {
    return window.stockProfiles?.[symbol]?.name || symbol;
}


// ========================================
// Price Alerts
// ========================================
function checkPriceAlerts() {
    priceAlerts.forEach((alert, index) => {
        if (alert.triggered) return;

        const currentPrice = priceCache[alert.symbol]?.price;
        if (!currentPrice) return;

        let triggered = false;
        if (alert.direction === 'above' && currentPrice >= alert.targetPrice) {
            triggered = true;
        } else if (alert.direction === 'below' && currentPrice <= alert.targetPrice) {
            triggered = true;
        }

        if (triggered) {
            // Mark as triggered with metadata
            priceAlerts[index].triggered = true;
            priceAlerts[index].triggeredAt = new Date().toISOString();
            priceAlerts[index].triggeredPrice = currentPrice;

            saveAlerts(); // Save alerts specifically
            showAlertNotification(alert, currentPrice);

            // ⚡ Browser Notification
            const direction = alert.direction === 'above' ? 'subió a' : 'bajó a';
            showBrowserNotification(
                `🔔 Alerta: ${alert.symbol}`,
                `${alert.symbol} ${direction} $${currentPrice.toFixed(2)} (Objetivo: $${alert.targetPrice.toFixed(2)})`
            );

            // Update badge and refresh list
            if (typeof updateAlertBadge === 'function') {
                updateAlertBadge();
            }
            if (typeof refreshAlertList === 'function') {
                refreshAlertList();
            }
        }
    });
}

function showAlertNotification(alert, currentPrice) {
    // Crear toast notification
    const toast = document.createElement('div');
    toast.className = 'alert-toast';
    toast.innerHTML = `
        <span class="alert-icon">🔔</span>
        <div class="alert-content">
            <strong>${alert.symbol}</strong> ${alert.direction === 'above' ? 'subió a' : 'bajó a'} $${fmt(currentPrice, 2)}
            <br><small>Alerta: ${alert.direction === 'above' ? '≥' : '≤'} $${fmt(alert.targetPrice, 2)}</small>
        </div>
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    document.body.appendChild(toast);

    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 10000);

    // Sonido si está disponible
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
    } catch (e) { }
}

function addPriceAlert(symbol, targetPrice, direction) {
    priceAlerts.push({
        symbol,
        targetPrice,
        direction,
        triggered: false,
        createdAt: Date.now()
    });
    saveData();

    // ⚡ Update badge when alert is created
    if (typeof updateAlertBadge === 'function') {
        updateAlertBadge();
    }
}

function removePriceAlert(index) {
    priceAlerts.splice(index, 1);
    saveData();
}

window.addPriceAlert = addPriceAlert;
window.removePriceAlert = removePriceAlert;

function promptPriceAlert(symbol, currentPrice) {
    const target = prompt(`Crear alerta para ${symbol}\nPrecio actual: $${currentPrice.toFixed(2)}\n\nIngresá el precio objetivo:`);
    if (!target) return;

    const targetPrice = parseFloat(target);
    if (isNaN(targetPrice)) {
        alert('Precio inválido');
        return;
    }

    const direction = targetPrice > currentPrice ? 'above' : 'below';
    addPriceAlert(symbol, targetPrice, direction);

    const msg = direction === 'above'
        ? `Alerta: ${symbol} sube a $${targetPrice.toFixed(2)}`
        : `Alerta: ${symbol} baja a $${targetPrice.toFixed(2)}`;

    const toast = document.createElement('div');
    toast.className = 'alert-toast show';
    toast.innerHTML = `<span class="alert-icon">✅</span><div class="alert-content">${msg}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

window.promptPriceAlert = promptPriceAlert;

// ========================================
// Monthly Report
// ========================================
function renderMonthlyReport() {
    const container = document.getElementById('monthly-summary');
    if (!container) return;

    // Agrupar movimientos por mes
    const monthlyData = {};
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    movements.forEach(m => {
        const date = new Date(m.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[key]) {
            monthlyData[key] = { bought: 0, sold: 0, dividends: 0 };
        }

        if (m.type === 'COMPRA') {
            monthlyData[key].bought += m.quantity * m.price;
        } else if (m.type === 'VENTA') {
            monthlyData[key].sold += m.quantity * m.price;
        } else if (m.type === 'DIVIDENDO') {
            monthlyData[key].dividends += m.quantity * m.price;
        }
    });

    // Ordenar por fecha descendente y tomar últimos 4 meses
    const sortedMonths = Object.keys(monthlyData).sort().reverse().slice(0, 4);

    if (!sortedMonths.length) {
        container.innerHTML = '<div class="stat-card"><span class="stat-label">Sin datos</span></div>';
        return;
    }

    container.innerHTML = sortedMonths.map(key => {
        const data = monthlyData[key];
        const [year, month] = key.split('-');
        const monthName = monthNames[parseInt(month) - 1];
        const result = data.sold + data.dividends - data.bought;
        const resultClass = result >= 0 ? 'positive' : 'negative';

        return `<span class="month-item">
            <span class="month-label">${monthName}:</span>
            <span class="month-value ${resultClass}">${result >= 0 ? '+' : ''}$${fmt(Math.abs(result), 0)}</span>
        </span>`;
    }).join('');
}

// ========================================
// Sistema de Daily Stats - Auto Guardado
// ========================================

function isUSMarketDay(date = new Date()) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Feriados fijos
    const fixedHolidays = [
        `${year}-01-01`, // Año Nuevo
        `${year}-07-04`, // Día de la Independencia
        `${year}-12-25`  // Navidad
    ];

    // Feriados dinámicos 2025
    const dynamicHolidays2025 = [
        '2025-01-20', // Martin Luther King Day (3er lunes enero)
        '2025-02-17', // Presidents Day (3er lunes febrero)
        '2025-04-18', // Good Friday
        '2025-05-26', // Memorial Day (último lunes mayo)
        '2025-06-19', // Juneteenth
        '2025-09-01', // Labor Day (1er lunes septiembre)
        '2025-11-27', // Thanksgiving (4to jueves noviembre)
    ];

    // Feriados dinámicos 2026
    const dynamicHolidays2026 = [
        '2026-01-19', // MLK Day
        '2026-02-16', // Presidents Day
        '2026-04-03', // Good Friday
        '2026-05-25', // Memorial Day
        '2026-06-19', // Juneteenth
        '2026-09-07', // Labor Day
        '2026-11-26', // Thanksgiving
    ];

    const allHolidays = [...fixedHolidays, ...dynamicHolidays2025, ...dynamicHolidays2026];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return !allHolidays.includes(dateStr);
}

function saveDailySnapshot() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const existingIndex = dailyStats.findIndex(s => s.date === dateStr);

    const investedEl = document.getElementById('total-value');
    const resultEl = document.getElementById('total-result');

    if (!investedEl || !resultEl) {
        console.warn('⚠️ No se pudieron obtener los elementos de stats');
        return;
    }

    const invested = parseFloat(investedEl.textContent.replace(/[$,]/g, ''));
    const result = parseFloat(resultEl.textContent.replace(/[+$,]/g, ''));

    const snapshot = {
        date: dateStr,
        invested: invested,
        result: result
    };

    if (existingIndex >= 0) {
        dailyStats[existingIndex] = snapshot;
        console.log(`📊 Daily snapshot actualizado para ${dateStr}:`, snapshot);
    } else {
        dailyStats.push(snapshot);
        console.log(`📊 Daily snapshot guardado para ${dateStr}:`, snapshot);
    }

    dailyStats.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveData();

    if (typeof renderDailyStats === 'function') {
        renderDailyStats();
    }
}

function checkDailySnapshotTime() {
    const now = new Date();
    const argTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    const hours = argTime.getHours();
    const minutes = argTime.getMinutes();

    if (hours === 23 && minutes === 30) {
        if (isUSMarketDay(argTime)) {
            console.log('⏰ Es momento de guardar daily snapshot!');
            saveDailySnapshot();
        } else {
            console.log('⏰ Es 23:30 pero no es día hábil del mercado USA');
        }
    }
}

function initializeDailyAutoSave() {
    checkDailySnapshotTime();
    setInterval(checkDailySnapshotTime, 60 * 1000);
    console.log('✅ Sistema de auto-guardado diario inicializado');
}

function manualSaveDailySnapshot() {
    if (isUSMarketDay()) {
        saveDailySnapshot();
        alert('✅ Snapshot diario guardado!');
    } else {
        const confirm = window.confirm('Hoy no es día hábil del mercado USA. ¿Guardar igual?');
        if (confirm) {
            saveDailySnapshot();
            alert('✅ Snapshot diario guardado!');
        }
    }
}

// ========================================
// Sistema de Año Fiscal - Snapshots
// ========================================

function saveYearEndSnapshot(year) {
    const portfolio = calculatePortfolio();
    const snapshot = {};

    Object.keys(portfolio).forEach(symbol => {
        const price = priceCache[symbol]?.price || portfolio[symbol].avgPrice;
        snapshot[symbol] = {
            price: price,
            date: new Date().toISOString(),
            marketTime: priceCache[symbol]?.marketTime || Date.now() / 1000
        };
    });

    yearEndSnapshots[year] = snapshot;
    saveData();

    console.log(`📸 Snapshot guardado para ${year}:`, snapshot);
    return snapshot;
}

function getYearEndPrice(symbol, year) {
    if (!yearEndSnapshots[year]) return null;
    return yearEndSnapshots[year][symbol]?.price || null;
}

function checkYearChange() {
    const lastCheck = localStorage.getItem('lastYearCheck');
    const now = new Date();
    const currentYear = now.getFullYear();

    if (!lastCheck) {
        localStorage.setItem('lastYearCheck', currentYear.toString());
        return;
    }

    const lastYear = parseInt(lastCheck);

    if (currentYear > lastYear) {
        console.log(`🎆 ¡Cambió el año! Guardando snapshot de ${lastYear}...`);
        const previousYear = currentYear - 1;
        if (!yearEndSnapshots[previousYear]) {
            saveYearEndSnapshot(previousYear);
        }
        localStorage.setItem('lastYearCheck', currentYear.toString());
    }
}

function manualSaveYearEndSnapshot() {
    const year = prompt('¿Para qué año querés guardar el snapshot? (ej: 2025)');
    if (year && !isNaN(year)) {
        saveYearEndSnapshot(parseInt(year));
        alert(`✅ Snapshot guardado para ${year}`);
    }
}

// Exponer funciones al window
window.saveDailySnapshot = saveDailySnapshot;
window.manualSaveDailySnapshot = manualSaveDailySnapshot;
window.isUSMarketDay = isUSMarketDay;
window.saveYearEndSnapshot = saveYearEndSnapshot;
window.manualSaveYearEndSnapshot = manualSaveYearEndSnapshot;
window.yearEndSnapshots = yearEndSnapshots;

// ========================================
// Sistema de Toast Notifications
// ========================================
function showToast(message, duration = 3000) {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Crear toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    // Animar entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Remover despu�s de duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========================================
// Exportar Daily Stats a CSV
// ========================================
function exportDailyStatsCSV() {
    if (!dailyStats.length) {
        showToast('?? No hay datos para exportar');
        return;
    }

    const headers = ['Fecha', 'Invertido', 'Resultado'];
    const rows = dailyStats.map(s => [s.date, s.invested.toFixed(2), s.result.toFixed(2)]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = historial_diario_.csv;
    link.click();

    URL.revokeObjectURL(url);
    showToast('? CSV exportado correctamente');
}

// Exponer funciones
window.showToast = showToast;
window.exportDailyStatsCSV = exportDailyStatsCSV;

// ========================================
// NUEVA FUNCIONALIDAD: Exportar CSV
// ========================================
function exportDailyStatsToCSV() {
    if (!dailyStats || dailyStats.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear headers
    var csvContent = "Fecha,Invertido,Resultado\n";

    // Agregar filas
    dailyStats.forEach(function (s) {
        csvContent += s.date + "," + s.invested.toFixed(2) + "," + s.result.toFixed(2) + "\n";
    });

    // Crear blob y descargar
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'historial_portfolio_' + new Date().toISOString().split('T')[0] + '.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('✅ CSV exportado correctamente');
}

// Exponer globalmente
window.exportDailyStatsToCSV = exportDailyStatsToCSV;

// ========================================
// TOAST NOTIFICATIONS SYSTEM
// ========================================
function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 3000;

    var container = document.getElementById('toast-container');
    if (!container) return;

    var icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    var iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || icons.info;

    var messageSpan = document.createElement('span');
    messageSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);

    container.appendChild(toast);

    // Trigger animation
    setTimeout(function () { toast.classList.add('show'); }, 10);

    // Remove after duration
    setTimeout(function () {
        toast.classList.remove('show');
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, duration);
}

// Expose globally
window.showToast = showToast;


// ========================================
// SYMBOL VALIDATION
// ========================================
function isValidSymbol(symbol) {
    if (!symbol) return false;
    // Allow letters, dots (like BRK.B), 1-6 chars
    var regex = /^[A-Z.]{1,8}$/;
    return regex.test(symbol.toUpperCase());
}

// shouldRefreshPrices moved to utils.js

// ========================================
// OVERRIDE: Auto Refresh with Caching
// ========================================
// Store original if needed, or just overwrite
window.initializeAutoRefresh = function () {
    console.log('🔄 Initializing Smart Auto Refresh...');

    var portfolioToggle = document.getElementById('auto-refresh-portfolio');
    if (portfolioToggle) {
        // Remove old listeners by cloning (simplest way without reference)
        var newPortfolioToggle = portfolioToggle.cloneNode(true);
        portfolioToggle.parentNode.replaceChild(newPortfolioToggle, portfolioToggle);

        newPortfolioToggle.addEventListener('change', function (e) {
            if (e.target.checked) {
                // Check hours immediately
                if (!shouldRefreshPrices()) {
                    if (typeof showToast === 'function') {
                        showToast('Mercado cerrado (refresca 9:30-17:00 ET). Auto-refresh pausado.', 'warning');
                    } else {
                        alert('Mercado cerrado. Auto-refresh pausado.');
                    }
                    e.target.checked = false;
                    return;
                }

                if (typeof showToast === 'function') showToast('Auto-refresh activado (cada 5 min)', 'success');

                // Clear any existing
                if (window.autoRefreshPortfolioInterval) clearInterval(window.autoRefreshPortfolioInterval);

                window.autoRefreshPortfolioInterval = setInterval(function () {
                    if (shouldRefreshPrices()) {
                        refreshAllPrices();
                    } else {
                        clearInterval(window.autoRefreshPortfolioInterval);
                        newPortfolioToggle.checked = false;
                        if (typeof showToast === 'function') {
                            showToast('Mercado ha cerrado. Auto-refresh detenido.', 'info');
                        }
                    }
                }, 60 * 1000); // 5 min
            } else {
                if (window.autoRefreshPortfolioInterval) clearInterval(window.autoRefreshPortfolioInterval);
                if (typeof showToast === 'function') showToast('Auto-refresh desactivado', 'info');
            }
        });
    }

    // Similar logic for Watchlist if it exists
    var watchlistToggle = document.getElementById('auto-refresh-watchlist');
    if (watchlistToggle) {
        var newWatchlistToggle = watchlistToggle.cloneNode(true);
        watchlistToggle.parentNode.replaceChild(newWatchlistToggle, watchlistToggle);

        newWatchlistToggle.addEventListener('change', function (e) {
            if (e.target.checked) {
                if (!shouldRefreshPrices()) {
                    if (typeof showToast === 'function') showToast('Mercado cerrado. Auto-refresh pausado.', 'warning');
                    e.target.checked = false;
                    return;
                }

                if (window.autoRefreshWatchlistInterval) clearInterval(window.autoRefreshWatchlistInterval);

                window.autoRefreshWatchlistInterval = setInterval(function () {
                    if (shouldRefreshPrices()) {
                        if (typeof refreshWatchlistPrices === 'function') refreshWatchlistPrices();
                    } else {
                        clearInterval(window.autoRefreshWatchlistInterval);
                        newWatchlistToggle.checked = false;
                    }
                }, 60 * 1000);
            } else {
                if (window.autoRefreshWatchlistInterval) clearInterval(window.autoRefreshWatchlistInterval);
            }
        });
    }
};

// Re-run initialization to apply new listeners
if (document.readyState === 'complete') {
    window.initializeAutoRefresh();
}

// ========================================
// REDEFINITION: Initialize Forms with Validation
// ========================================
function initializeForms() {
    console.log('🔄 Initializing Forms with Validation...');
    var form = document.getElementById('movement-form');
    if (!form) return;

    // Remove old listeners by cloning
    var newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Re-attach listener
    newForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Values
        var date = document.getElementById('movement-date').value;
        var type = document.getElementById('movement-type').value;
        var symbol = document.getElementById('movement-symbol').value.toUpperCase().trim();
        var quantity = parseFloat(document.getElementById('movement-quantity').value);
        var price = parseFloat(document.getElementById('movement-price').value);

        // VALIDATION
        if (typeof isValidSymbol === 'function' && !isValidSymbol(symbol)) {
            if (typeof showToast === 'function') {
                showToast('Símbolo inválido (debe ser 1-5 letras, ej: AAPL)', 'error');
            } else {
                alert('Símbolo inválido');
            }
            return;
        }

        var importe = type === 'COMPRA' ? -(quantity * price) : quantity * price;

        if (editingIndex >= 0) {
            // Edit existing
            // Using Object.assign for compatibility just in case, or spread if supported (modern browsers ok)
            movements[editingIndex] = Object.assign({}, movements[editingIndex], {
                date: date, type: type, symbol: symbol, quantity: quantity, price: price, importe: importe
            });
        } else {
            // New
            movements.push({
                id: Date.now(), date: date, type: type, symbol: symbol, quantity: quantity, price: price, importe: importe
            });
        }

        // Sort
        movements.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

        saveData();
        renderAll();
        closeModal();

        // Fetch price if new
        if (!priceCache[symbol]) {
            if (typeof showToast === 'function') showToast('Buscando precio para ' + symbol + '...', 'info');
            await fetchPrice(symbol);
            renderAll();
        }

        if (typeof showToast === 'function') showToast('Movimiento guardado correctamente', 'success');
    });
}

// Run immediately to apply to current session
if (document.readyState === 'complete') {
    initializeForms();
}

// ========================================
// WATCHLIST VALIDATION INTEGRATION
// ========================================
function initializeWatchlistValidation() {
    console.log('Creating Watchlist Validation...');

    var btn = document.getElementById('add-watchlist-btn');
    var input = document.getElementById('watchlist-symbol');

    if (!btn || !input) return;

    // Replace elements to clear old listeners
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    var newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    function safeAddToWatchlist() {
        var val = newInput.value.trim().toUpperCase();
        if (!val) return;

        var rawSymbols = val.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        var validSymbols = [];
        var invalidSymbols = [];

        // Validate each
        rawSymbols.forEach(function (s) {
            if (typeof isValidSymbol === 'function' && !isValidSymbol(s)) {
                invalidSymbols.push(s);
            } else {
                validSymbols.push(s);
            }
        });

        // Handle invalid
        if (invalidSymbols.length > 0) {
            var msg = 'Símbolos inválidos: ' + invalidSymbols.join(', ');
            if (typeof showToast === 'function') {
                showToast(msg, 'error');
            } else {
                alert(msg);
            }
            return; // Don't process if there are errors (strict mode)
        }

        // Process valid
        // NOTE: We assume 'watchlist' variable is global or accessible via getCurrentWatchlist
        // Since we are appending to app.js, we should have access to global 'watchlist' variable
        // But let's check if there is a helper

        var currentList = null;
        if (typeof getCurrentWatchlist === 'function') {
            currentList = getCurrentWatchlist();
        } else if (typeof watchlist !== 'undefined') {
            currentList = watchlist; // fallback to global
        } else {
            console.error('Cannot find watchlist data');
            return;
        }

        var toAdd = validSymbols.filter(function (s) { return !currentList.includes(s); });

        if (toAdd.length === 0) {
            if (typeof showToast === 'function') showToast('Los símbolos ya están en la lista', 'info');
            newInput.value = '';
            return;
        }

        // Add to array
        // using push.apply for compatibility
        Array.prototype.push.apply(currentList, toAdd);

        saveData();
        newInput.value = '';

        if (typeof showToast === 'function') showToast('Agregados ' + toAdd.length + ' símbolos', 'success');

        // Fetch inputs
        var fetchPromises = toAdd.map(function (s) { return fetchPrice(s); });

        // Render after all or individually? Original did individually.
        // Let's do Promise.all if supported, or just one by one
        Promise.all(fetchPromises).then(function () {
            renderWatchlist();
        });
    }

    // Attach new listeners
    newBtn.addEventListener('click', safeAddToWatchlist);
    newInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') safeAddToWatchlist();
    });
}

// Initialize
if (document.readyState === 'complete') {
    initializeWatchlistValidation();
}

// ========================================
// OPTIMIZATION: Search Debounce
// ========================================

// 1. Debounce Utility
function debounce(func, wait) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
            func.apply(context, args);
        }, wait);
    };
}

// 2. Optimized History Search Initialization
function initializeHistorySearch() {
    console.log('⚡ Initializing Debounced History Search...');
    var searchInput = document.getElementById('history-search');
    if (!searchInput) return;

    // Replace clone to clear old heavy listeners
    var newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);

    // Attach debounced listener (300ms delay)
    newInput.addEventListener('input', debounce(function (e) {
        // Update global searchQuery
        searchQuery = e.target.value;

        // Check if renderHistory is available
        if (typeof renderHistory === 'function') {
            renderHistory();
        } else {
            console.error('renderHistory function not found');
        }
    }, 300));

    // Visual feedback helper (optional)
    newInput.addEventListener('keydown', function () {
        // Could show a tiny 'typing...' state if needed, but kept simple for now
    });
}

// 3. Apply immediately
if (document.readyState === 'complete') {
    initializeHistorySearch();
}

// ========================================
// PWA: Service Worker Registration
// ========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./service-worker.js')
            .then(function (registration) {
                console.log('✅ Service Worker registered successfully:', registration.scope);

                if (typeof showToast === 'function') {
                    // Check if it's the first install
                    if (!localStorage.getItem('pwa-installed')) {
                        localStorage.setItem('pwa-installed', 'true');
                        showToast('App lista para instalación!', 'success');
                    }
                }
            })
            .catch(function (error) {
                console.error('❌ Service Worker registration failed:', error);
            });
    });
}

// PWA: Detect installation
window.addEventListener('beforeinstallprompt', function (e) {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();

    // Optionally save event to trigger install prompt later
    window.deferredPrompt = e;

    // Toast desactivado - no molestar al usuario
    // if (typeof showToast === 'function') {
    //     showToast('💡 Puedes instalar esta app en tu dispositivo!', 'info', 5000);
    // }
});

// PWA: Detect successful install
window.addEventListener('appinstalled', function () {
    console.log('✅ PWA installed successfully');
    if (typeof showToast === 'function') {
        showToast('App instalada correctamente!', 'success');
    }
    window.deferredPrompt = null;
});

// ========================================
// PARALLEL PRICE FETCHING (Safe Override)
// ========================================

// New optimized function with batching
async function refreshAllPricesFast() {
    console.log('Parallel refresh started. isRefreshing:', isRefreshing);

    if (isRefreshing) {
        if (typeof showToast === 'function') {
            showToast('Ya hay una actualizacion en curso', 'warning');
        }
        return;
    }

    // Get symbols
    var speciesSummary = calculateSpeciesSummary();
    var portfolioSymbols = Object.keys(speciesSummary);
    var watchlistSymbols = [];

    if (typeof getCurrentWatchlist === 'function') {
        watchlistSymbols = getCurrentWatchlist();
    }

    // Combine unique symbols
    var allSymbols = portfolioSymbols.concat(watchlistSymbols);
    var symbols = [];
    allSymbols.forEach(function (s) {
        if (symbols.indexOf(s) === -1) symbols.push(s);
    });

    console.log('Symbols to refresh:', symbols.length);

    if (!symbols.length) {
        if (typeof showToast === 'function') {
            showToast('No hay simbolos para actualizar', 'info');
        }
        return;
    }

    isRefreshing = true;
    showLoading(true);

    var BATCH_SIZE = 5;
    var successCount = 0;
    var errorCount = 0;

    try {
        for (var i = 0; i < symbols.length; i += BATCH_SIZE) {
            var batch = symbols.slice(i, i + BATCH_SIZE);
            console.log('Processing batch', Math.floor(i / BATCH_SIZE) + 1, ':', batch.join(', '));

            var results = await Promise.allSettled(
                batch.map(function (symbol) { return fetchPrice(symbol); })
            );

            results.forEach(function (result) {
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    errorCount++;
                    console.warn('Failed:', result.reason);
                }
            });

            // ⚠️ REMOVED per-batch render - will render once at end
        }

        // ✅ OPTIMIZATION: Render and save ONCE at the end of all batches
        renderAll();
        if (typeof renderWatchlist === 'function') {
            renderWatchlist();
        }
        saveData(); // Single save after all updates

        // Show result - solo mostrar si hay errores
        if (typeof showToast === 'function' && errorCount > 0) {
            showToast(successCount + ' OK, ' + errorCount + ' errores', 'warning');
        }

        console.log('Parallel refresh complete. Success:', successCount, 'Errors:', errorCount);

    } catch (error) {
        console.error('Error in parallel refresh:', error);
        if (typeof showToast === 'function') {
            showToast('Error al actualizar precios', 'error');
        }
    } finally {
        isRefreshing = false;
        showLoading(false);
    }
}

// Override the original function
window.refreshAllPrices = refreshAllPricesFast;

// Also update the refresh button to use new function
(function () {
    var refreshBtn = document.getElementById('refresh-prices');
    if (refreshBtn) {
        var newBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
        newBtn.addEventListener('click', function () {
            refreshAllPricesFast();
        });
    }
})();

console.log('Parallel Fetch: Activated!');




// ========================================
// MOBILE LABELS - Acortar textos
// ========================================

function shortenMobileLabels() {
    if (window.innerWidth > 768) return;

    // Acortar labels de stats
    var statLabels = {
        'INVERTIDO': 'INVERT.',
        'RESULTADO HOY': 'RES. HOY',
        'RESULTADO TENENCIA': 'RES. TEN.',
        'RESULTADO TOTAL': 'RES. TOTAL'
    };

    var labels = document.querySelectorAll('.stat-label');
    labels.forEach(function (label) {
        var text = label.textContent.trim().toUpperCase();
        if (statLabels[text]) {
            label.textContent = statLabels[text];
        }
    });

    // Acortar tabs
    var tabNames = {
        'Tenencia Actual': 'Cartera',
        'Historial': 'Historial',
        'Resumen': 'Resumen',
        'Watchlist': 'Watch',
        'Stats': 'Stats',
        'Estadísticas': 'Stats'
    };

    var tabs = document.querySelectorAll('.tab');
    tabs.forEach(function (tab) {
        var text = tab.textContent.trim();
        if (tabNames[text]) {
            tab.textContent = tabNames[text];
        }
    });
}

// Agregar colores por tipo en historial
function addHistoryColors() {
    var rows = document.querySelectorAll('#history-body tr');
    rows.forEach(function (row) {
        var typeCell = row.querySelector('td:nth-child(3)');
        if (typeCell) {
            var type = typeCell.textContent.trim().toUpperCase();
            row.setAttribute('data-type', type);
        }
    });
}

// Hook renderAll
var _origRenderAll = window.renderAll;
if (typeof _origRenderAll === 'function') {
    window.renderAll = function () {
        _origRenderAll.apply(this, arguments);
        setTimeout(function () {
            shortenMobileLabels();
            addHistoryColors();
        }, 50);
    };
}

// Run on load
window.addEventListener('load', function () {
    setTimeout(shortenMobileLabels, 200);
    setTimeout(addHistoryColors, 200);
});

window.addEventListener('resize', function () {
    clearTimeout(window._mobileTimeout);
    window._mobileTimeout = setTimeout(shortenMobileLabels, 200);
});

console.log('Mobile Labels: Ready');

// ========================================
// MOBILE: Mover Refresh a la derecha
// ========================================
function moveRefreshButton() {
    if (window.innerWidth > 768) return;

    var refreshBtn = document.getElementById('refresh-prices');
    var headerRight = document.querySelector('.header-right');

    if (refreshBtn && headerRight) {
        // Mover el boton al final de header-right
        headerRight.appendChild(refreshBtn);
        console.log('Refresh button moved to right');
    }
}

// Run on load
window.addEventListener('load', function () {
    setTimeout(moveRefreshButton, 100);
});

window.addEventListener('resize', function () {
    clearTimeout(window._moveRefreshTimeout);
    window._moveRefreshTimeout = setTimeout(function () {
        var refreshBtn = document.getElementById('refresh-prices');
        var headerActions = document.querySelector('.header-actions');
        var headerRight = document.querySelector('.header-right');

        if (window.innerWidth <= 768) {
            if (headerRight && refreshBtn && refreshBtn.parentNode !== headerRight) {
                headerRight.appendChild(refreshBtn);
            }
        } else {
            if (headerActions && refreshBtn && refreshBtn.parentNode !== headerActions) {
                headerActions.appendChild(refreshBtn);
            }
        }
    }, 200);
});

// ========================================
// SECURITY + REFRESH FIX
// ========================================

// Sanitizacion HTML
function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
window.sanitizeHTML = sanitizeHTML;

// Sanitizar al guardar
var _origSave = saveData;
window.saveData = saveData = function () {
    if (movements && movements.length > 0) {
        for (var i = 0; i < movements.length; i++) {
            if (movements[i].symbol) movements[i].symbol = movements[i].symbol.replace(/[<>]/g, '');
        }
    }
    return _origSave.apply(this, arguments);
};

// Reset isRefreshing al cargar
window.addEventListener('load', function () { isRefreshing = false; });

// Reemplazar refresh SIN el toast molesto
setTimeout(function () {
    window.refreshAllPricesFast = window.refreshAllPrices = async function () {
        if (isRefreshing) { console.log('Skip - refresh in progress'); return; }

        var symbols = [];
        var ss = calculateSpeciesSummary();
        Object.keys(ss).forEach(function (s) { if (symbols.indexOf(s) === -1) symbols.push(s); });
        var wl = typeof getCurrentWatchlist === 'function' ? getCurrentWatchlist() : [];
        wl.forEach(function (s) { if (symbols.indexOf(s) === -1) symbols.push(s); });

        if (!symbols.length) return;

        isRefreshing = true;
        var ok = 0;
        try {
            for (var i = 0; i < symbols.length; i += 5) {
                var batch = symbols.slice(i, i + 5);
                var res = await Promise.allSettled(batch.map(function (s) { return fetchPrice(s); }));
                res.forEach(function (r) { if (r.status === 'fulfilled') ok++; });
                renderAll();
                if (typeof renderWatchlist === 'function') renderWatchlist();

                // Check price alerts after every price update
                if (typeof checkPriceAlerts === 'function') {
                    checkPriceAlerts();
                }
            }
            // Toast removido - WebSocket actualiza en tiempo real
        } finally { isRefreshing = false; }
    };
    console.log('Refresh patched OK');
}, 300);

console.log('Security + Refresh Fix loaded');


// ========================================
// Background Refresh Handler
// ========================================
// Detectar cuando la pestaña vuelve a estar visible y refrescar precios
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        console.log('🔄 Tab visible again - refreshing prices...');
        const portfolio = calculatePortfolio();
        if (Object.keys(portfolio).length > 0) {
            refreshAllPrices();
        }
    }
});

// ========================================
// Alert Manager
// ========================================
function openAlertManager() {
    const modal = document.getElementById('alert-manager-modal');

    // Refresh alert list
    refreshAlertList();
    updateAlertBadge();

    modal.classList.add('show');
}

function closeAlertManager() {
    const modal = document.getElementById('alert-manager-modal');
    modal.classList.remove('show');
}

// Store editing state
let editingAlertIndex = -1;

function refreshAlertList() {
    const container = document.getElementById('alert-list-container');

    if (!container) return;

    if (!priceAlerts || priceAlerts.length === 0) {
        container.innerHTML = `
            <div class="terminal-empty">
                <div class="terminal-empty-icon">📡</div>
                NO ACTIVE ALERTS CONFIGURED.<br>
                USE THE BELL ICON [🔔] ON DATA GRID TO ADD NEW TRIGGERS.
            </div>
        `;
        return;
    }

    // 1. Separate Triggered vs Active
    const triggered = priceAlerts.filter(a => a.triggered);
    const active = priceAlerts.filter(a => !a.triggered);

    // 2. Separate Active by Direction relative to Current Price
    const waitingRise = []; // Target > Current (needs to go up)
    const waitingDrop = []; // Target < Current (needs to go down)

    active.forEach(alert => {
        const currentPrice = priceCache[alert.symbol]?.price || 0;
        // If no price yet, default to 'Rise' or just keep neutral
        if (currentPrice > 0) {
            if (alert.targetPrice > currentPrice) {
                waitingRise.push(alert);
            } else {
                waitingDrop.push(alert);
            }
        } else {
            waitingRise.push(alert); // fallback
        }
    });

    // Sort by proximity (smallest absolute distance first)
    const sortProximity = (a, b) => {
        const priceA = priceCache[a.symbol]?.price || 0;
        const priceB = priceCache[b.symbol]?.price || 0;
        if (priceA === 0 || priceB === 0) return 0;

        const distA = Math.abs((a.targetPrice - priceA) / priceA);
        const distB = Math.abs((b.targetPrice - priceB) / priceB);
        return distA - distB;
    };

    waitingRise.sort(sortProximity);
    waitingDrop.sort(sortProximity);

    // Helper to render rows
    const renderRow = (alert, isTriggeredRow = false) => {
        const realIndex = priceAlerts.indexOf(alert);
        const currentPrice = priceCache[alert.symbol]?.price || 0;

        // Direction & Colors
        const isRise = alert.targetPrice > currentPrice;
        const arrow = isRise ? '<span class="direction-icon" style="color:#4ade80">▲</span>' : '<span class="direction-icon" style="color:#f87171">▼</span>';

        // Correct Percentage Calculation: Distance TO Target
        // (Target - Current) / Current
        let distPct = 0;
        if (currentPrice > 0) {
            distPct = ((alert.targetPrice - currentPrice) / currentPrice * 100);
        }

        const distClass = distPct >= 0 ? 'diff-pos' : 'diff-neg'; // Green if +, Red if -

        // Target Edit Logic
        let targetHtml;
        if (editingAlertIndex === realIndex) {
            targetHtml = `
                <input type="number" 
                    id="edit-input-${realIndex}" 
                    class="edit-target-input" 
                    value="${alert.targetPrice}" 
                    onblur="saveAlertTarget(${realIndex}, this.value)" 
                    onkeydown="if(event.key==='Enter') saveAlertTarget(${realIndex}, this.value)"
                    step="0.01"
                >
            `;
            setTimeout(() => document.getElementById(`edit-input-${realIndex}`)?.focus(), 10);
        } else {
            targetHtml = `
                <span class="editable-target" onclick="enableEditTarget(${realIndex})" title="Click to Edit">
                    ${alert.targetPrice.toFixed(2)}
                </span>
            `;
        }

        // Status Logic
        let statusHtml = '';
        if (isTriggeredRow) {
            statusHtml = `<span class="status-badge status-triggered">✓ DONE</span>`;
        } else {
            const distAbs = Math.abs(distPct);
            if (distAbs < 2) {
                statusHtml = `<span class="status-badge status-active">⚡ ACTIVE</span>`;
            } else if (distAbs < 5) {
                statusHtml = `<span class="status-badge status-near">⚠ NEAR</span>`;
            } else {
                statusHtml = `<span class="status-badge status-waiting">⏳ WAIT</span>`;
            }
        }

        const rowStyle = isTriggeredRow ? 'opacity: 0.5; filter: grayscale(1);' : '';

        return `
            <tr style="${rowStyle}">
                <td class="col-action">
                    <button class="btn-del-terminal" onclick="removeAlertByIndex(${realIndex})" title="DELETE">×</button>
                </td>
                <td class="col-symbol">${alert.symbol}</td>
                <td class="col-target">${arrow} ${targetHtml}</td>
                <td class="col-current">${currentPrice.toFixed(2)}</td>
                <td class="col-diff ${distClass}">${distPct > 0 ? '+' : ''}${distPct.toFixed(2)}%</td>
                <td class="col-status">${statusHtml}</td>
            </tr>
        `;
    };

    // Build Table
    let tableHtml = `
        <table class="terminal-table">
            <thead>
                <tr>
                    <th class="col-action"></th>
                    <th class="col-symbol">SYMBOL</th>
                    <th class="col-target">TARGET</th>
                    <th class="col-current">CURRENT</th>
                    <th class="col-diff">DIST %</th>
                    <th class="col-status">STATUS</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Section: Upside (Targets above current)
    if (waitingRise.length > 0) {
        tableHtml += `
            <tr class="table-section-header">
                <td colspan="6" style="color:#4ade80; border-bottom:1px solid #166534; padding-top:15px; font-size:11px;">
                    🔼 WAITING FOR RISE (TARGET > PRICE)
                </td>
            </tr>
        `;
        tableHtml += waitingRise.map(a => renderRow(a)).join('');
    }

    // Section: Downside (Targets below current)
    if (waitingDrop.length > 0) {
        tableHtml += `
            <tr class="table-section-header">
                <td colspan="6" style="color:#f87171; border-bottom:1px solid #991b1b; padding-top:15px; font-size:11px;">
                    🔽 WAITING FOR DROP (TARGET < PRICE)
                </td>
            </tr>
        `;
        tableHtml += waitingDrop.map(a => renderRow(a)).join('');
    }

    // Section: History
    if (triggered.length > 0) {
        tableHtml += `
            <tr class="table-section-header">
                <td colspan="6" style="color:#94a3b8; border-bottom:1px solid #334155; padding-top:20px; font-size:11px;">
                    🕓 HISTORY / TRIGGERED
                </td>
            </tr>
        `;
        tableHtml += triggered.map(a => renderRow(a, true)).join('');
    }

    tableHtml += '</tbody></table>';
    container.innerHTML = tableHtml;
}

function enableEditTarget(index) {
    editingAlertIndex = index;
    refreshAlertList();
}

function saveAlertTarget(index, newValue) {
    const newPrice = parseFloat(newValue);
    if (isNaN(newPrice) || newPrice <= 0) {
        // Invalid input, just cancel edit
        editingAlertIndex = -1;
        refreshAlertList();
        return;
    }

    // Update Alert
    priceAlerts[index].targetPrice = newPrice;

    // Recalculate direction if needed (optional, keeping original direction usually safer, but implies logic check)
    // We'll keep original direction for now unless user wants smart logic.

    // Reset triggered status if it was triggered?
    if (priceAlerts[index].triggered) {
        priceAlerts[index].triggered = false;
        priceAlerts[index].triggeredAt = null;
    }

    editingAlertIndex = -1;
    saveAlerts(); // Save to localStorage/Cloud
    refreshAlertList();
    showToast(`Target updated to $${newPrice.toFixed(2)}`);
}

function updateAlertBadge() {
    const badge = document.getElementById('alert-badge');
    const activeCount = priceAlerts.filter(a => !a.triggered).length;

    if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

function removeAlertByIndex(index) {
    priceAlerts.splice(index, 1);
    saveData();
    refreshAlertList();
    updateAlertBadge();
    if (typeof showToast === 'function') {
        showToast('Alerta eliminada', 'info');
    }
}

// Symbol select change handler
document.addEventListener('DOMContentLoaded', function () {
    const symbolSelect = document.getElementById('alert-symbol-select');
    const targetInput = document.getElementById('alert-target-price');
    const currentHint = document.getElementById('alert-current-price');
    const distanceHint = document.getElementById('alert-distance-hint');
    const directionSelect = document.getElementById('alert-direction');

    if (symbolSelect) {
        symbolSelect.addEventListener('change', function () {
            const symbol = this.value;
            if (!symbol) {
                currentHint.textContent = 'Actual: --';
                distanceHint.textContent = '';
                return;
            }

            const currentPrice = priceCache[symbol]?.price || 0;
            currentHint.textContent = `Actual: $${currentPrice.toFixed(2)}`;
            calculateDistance();
        });
    }

    if (targetInput) {
        targetInput.addEventListener('input', calculateDistance);
    }

    if (directionSelect) {
        directionSelect.addEventListener('change', calculateDistance);
    }

    function calculateDistance() {
        const symbol = symbolSelect?.value;
        const targetPrice = parseFloat(targetInput?.value);
        const direction = directionSelect?.value;

        if (!symbol || !targetPrice || !direction) {
            distanceHint.textContent = '';
            return;
        }

        const currentPrice = priceCache[symbol]?.price || 0;
        const diff = targetPrice - currentPrice;
        const pct = (diff / currentPrice * 100).toFixed(2);

        if (direction === 'above' && targetPrice <= currentPrice) {
            distanceHint.innerHTML = '⚠️ El precio objetivo debe ser mayor al actual';
            distanceHint.style.background = 'rgba(239, 68, 68, 0.1)';
        } else if (direction === 'below' && targetPrice >= currentPrice) {
            distanceHint.innerHTML = '⚠️ El precio objetivo debe ser menor al actual';
            distanceHint.style.background = 'rgba(239, 68, 68, 0.1)';
        } else {
            const arrow = direction === 'above' ? '▲' : '▼';
            distanceHint.innerHTML = `${arrow} $${Math.abs(diff).toFixed(2)} (${Math.abs(pct)}%)`;
            distanceHint.style.background = 'rgba(59, 130, 246, 0.1)';
        }
    }

    // Alert Manager button
    const alertBtn = document.getElementById('alert-manager-btn');
    if (alertBtn) {
        alertBtn.addEventListener('click', openAlertManager);
    }
});

function createAlertFromManager() {
    const symbol = document.getElementById('alert-symbol-select').value;
    const targetPrice = parseFloat(document.getElementById('alert-target-price').value);
    const direction = document.getElementById('alert-direction').value;

    if (!symbol) {
        if (typeof showToast === 'function') {
            showToast('Seleccioná un símbolo', 'error');
        }
        return;
    }

    if (!targetPrice || isNaN(targetPrice)) {
        if (typeof showToast === 'function') {
            showToast('Ingresá un precio válido', 'error');
        }
        return;
    }

    const currentPrice = priceCache[symbol]?.price || 0;

    // Validar dirección
    if (direction === 'above' && targetPrice <= currentPrice) {
        if (typeof showToast === 'function') {
            showToast('El precio objetivo debe ser mayor al actual', 'error');
        }
        return;
    }

    if (direction === 'below' && targetPrice >= currentPrice) {
        if (typeof showToast === 'function') {
            showToast('El precio objetivo debe ser menor al actual', 'error');
        }
        return;
    }

    addPriceAlert(symbol, targetPrice, direction);

    // Clear form
    document.getElementById('alert-symbol-select').value = '';
    document.getElementById('alert-target-price').value = '';
    document.getElementById('alert-current-price').textContent = 'Actual: --';
    document.getElementById('alert-distance-hint').textContent = '';

    refreshAlertList();
    updateAlertBadge();

    if (typeof showToast === 'function') {
        showToast(`Alerta creada: ${symbol} ${direction === 'above' ? '≥' : '≤'} $${targetPrice.toFixed(2)}`, 'success');
    }
}

window.openAlertManager = openAlertManager;
window.closeAlertManager = closeAlertManager;
window.createAlertFromManager = createAlertFromManager;
window.removeAlertByIndex = removeAlertByIndex;

// ========================================
// Browser Notifications
// ========================================
let notificationsEnabled = false;

function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Este navegador no soporta notificaciones');
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationsEnabled = true;
        return true;
    }

    if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationsEnabled = true;
                if (typeof showToast === 'function') {
                    showToast('✓ Notificaciones habilitadas', 'success');
                }
            }
        });
    }

    return notificationsEnabled;
}

function showBrowserNotification(title, body, icon = '🔔') {
    if (!notificationsEnabled || Notification.permission !== 'granted') {
        return false;
    }

    const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'price-alert',
        requireInteraction: false,
        silent: false
    });

    notification.onclick = function () {
        window.focus();
        this.close();
    };

    return true;
}

// Request permission on first alert creation
const originalAddPriceAlert = window.addPriceAlert || function () { };
window.addPriceAlert = function (symbol, targetPrice, direction) {
    originalAddPriceAlert(symbol, targetPrice, direction);

    // Request permission if this is the first alert
    if (priceAlerts.length === 1 && !notificationsEnabled) {
        requestNotificationPermission();
    }
};

// ========================================
// WATCHLIST MANAGER MODAL
// ========================================
let selectedIcon = '📋';

function openWatchlistManager() {
    const modal = document.getElementById('watchlist-manager-modal');

    // Poblar selector interno con todas las listas
    const selector = document.getElementById('wl-manager-selector');
    selector.innerHTML = Object.keys(watchlists).map(id => {
        const wl = watchlists[id];
        const displayName = wl.displayName || (id === 'default' ? 'Mi Watchlist' : id);
        const icon = wl.icon || '📋';
        const count = (wl.symbols || wl).length;
        return `<option value="${id}" ${id === currentWatchlistId ? 'selected' : ''}>${icon} ${displayName} (${count})</option>`;
    }).join('');

    // Cargar datos de la lista actual
    loadWatchlistDataInModal(currentWatchlistId);

    modal.style.display = 'flex';
}

function loadWatchlistDataInModal(id) {
    const wl = watchlists[id];
    document.getElementById('wl-manager-name').value = wl?.displayName || id;
    selectedIcon = wl?.icon || '📋';

    // Marcar icono seleccionado
    document.querySelectorAll('.icon-option').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === selectedIcon);
    });
}

function closeWatchlistManager() {
    document.getElementById('watchlist-manager-modal').style.display = 'none';
}

// Legacy modal event listeners - check if elements exist
const closeWatchlistManagerBtn = document.getElementById('close-watchlist-manager');
if (closeWatchlistManagerBtn) {
    closeWatchlistManagerBtn.addEventListener('click', closeWatchlistManager);
}

const wlManagerCancelBtn = document.getElementById('wl-manager-cancel');
if (wlManagerCancelBtn) {
    wlManagerCancelBtn.addEventListener('click', closeWatchlistManager);
}

// Cambiar de lista dentro del modal
const wlManagerSelector = document.getElementById('wl-manager-selector');
if (wlManagerSelector) {
    wlManagerSelector.addEventListener('change', (e) => {
        loadWatchlistDataInModal(e.target.value);
    });
}

// Botón "Nueva lista" dentro del modal
const wlManagerNewBtn = document.getElementById('wl-manager-new');
if (wlManagerNewBtn) {
    wlManagerNewBtn.addEventListener('click', () => {
        const name = prompt('Nombre de la nueva lista:');
        if (!name || !name.trim()) return;
        const sanitized = name.trim();
        const id = sanitized.toLowerCase().replace(/\s+/g, '_');
        if (watchlists[id]) { alert('Ya existe una lista con ese nombre'); return; }

        watchlists[id] = {
            displayName: sanitized,
            icon: '📋',
            symbols: []
        };

        saveData();

        // Actualizar selector interno
        const selector = document.getElementById('wl-manager-selector');
        const newOption = document.createElement('option');
        newOption.value = id;
        newOption.selected = true;
        newOption.textContent = `📋 ${sanitized} (0)`;
        selector.appendChild(newOption);

        // Cargar datos de la nueva lista
        loadWatchlistDataInModal(id);
    });
}

// Botones de reordenamiento ↑↓
const wlMoveUpBtn = document.getElementById('wl-move-up');
if (wlMoveUpBtn) {
    wlMoveUpBtn.addEventListener('click', () => {
        const selector = document.getElementById('wl-manager-selector');
        const selectedIndex = selector.selectedIndex;

        if (selectedIndex <= 0) return; // Ya está al principio

        // Intercambiar opciones
        const selected = selector.options[selectedIndex];
        const previous = selector.options[selectedIndex - 1];
        selector.insertBefore(selected, previous);

        saveWatchlistOrder();
    });
}

const wlMoveDownBtn = document.getElementById('wl-move-down');
if (wlMoveDownBtn) {
    wlMoveDownBtn.addEventListener('click', () => {
        const selector = document.getElementById('wl-manager-selector');
        const selectedIndex = selector.selectedIndex;

        if (selectedIndex >= selector.options.length - 1) return; // Ya está al final

        // Intercambiar opciones
        const selected = selector.options[selectedIndex];
        const next = selector.options[selectedIndex + 2]; // Insertamos ANTES del siguiente (+2)

        if (next) {
            selector.insertBefore(selected, next);
        } else {
            selector.appendChild(selected);
        }

        saveWatchlistOrder();
    });
}

function saveWatchlistOrder() {
    // Guardar el orden actual en localStorage
    const selector = document.getElementById('wl-manager-selector');
    const order = Array.from(selector.options).map(opt => opt.value);
    localStorage.setItem('watchlistOrder', JSON.stringify(order));

    // Actualizar el selector principal también
    updateWatchlistSelector();
}


// Selector de iconos
document.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        selectedIcon = btn.dataset.icon;
        document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

// Guardar cambios
const wlManagerSaveBtn = document.getElementById('wl-manager-save');
if (wlManagerSaveBtn) {
    wlManagerSaveBtn.addEventListener('click', () => {
        const selectedId = document.getElementById('wl-manager-selector').value;
        const newName = document.getElementById('wl-manager-name').value.trim();
        if (!newName) {
            alert('El nombre no puede estar vacío');
            return;
        }

        // Actualizar watchlist seleccionada
        if (!watchlists[selectedId].displayName) {
            // Migrar formato antiguo
            watchlists[selectedId] = {
                displayName: newName,
                icon: selectedIcon,
                symbols: watchlists[selectedId]
            };
        } else {
            watchlists[selectedId].displayName = newName;
            watchlists[selectedId].icon = selectedIcon;
        }

        saveData();
        updateWatchlistSelector();
        closeWatchlistManager();
    });
}

// Eliminar lista
const wlManagerDeleteBtn = document.getElementById('wl-manager-delete');
if (wlManagerDeleteBtn) {
    wlManagerDeleteBtn.addEventListener('click', () => {
        const selectedId = document.getElementById('wl-manager-selector').value;

        if (selectedId === 'default') {
            alert('No podés eliminar la lista por defecto');
            return;
        }

        if (!confirm(`¿Eliminar "${watchlists[selectedId].displayName}"?`)) return;

        delete watchlists[selectedId];

        // Si era la lista actual, cambiar a default
        if (currentWatchlistId === selectedId) {
            currentWatchlistId = 'default';
            renderWatchlist();
        }

        saveData();
        updateWatchlistSelector();


        // Actualizar selector interno del modal
        document.getElementById('wl-manager-selector').value = 'default';
        loadWatchlistDataInModal('default');
    });
}

window.openWatchlistManager = openWatchlistManager;
window.closeWatchlistManager = closeWatchlistManager;
