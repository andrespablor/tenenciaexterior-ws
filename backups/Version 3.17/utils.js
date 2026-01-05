// ========================================
// UTILS.JS - Funciones Utilitarias
// ========================================

// Formateo de números
function fmt(num, dec = 0) {
    return num.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// Formateo de fechas
function fmtDate(str) {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Debounce para búsquedas
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

// Sanitización HTML (XSS Prevention)
function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Validación de símbolos
function isValidSymbol(symbol) {
    if (!symbol) return false;
    var regex = /^[A-Z.]{1,8}$/;
    return regex.test(symbol.toUpperCase());
}

// Smart Caching (Market Hours)
function shouldRefreshPrices() {
    var now = new Date();
    try {
        var etTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
        var etTime = new Date(etTimeStr);
        var hours = etTime.getHours();
        var minutes = etTime.getMinutes();
        var day = etTime.getDay();
        if (day === 0 || day === 6) return false;
        var isAfterOpen = (hours > 9) || (hours === 9 && minutes >= 30);
        var isBeforeEnd = (hours < 17);
        return isAfterOpen && isBeforeEnd;
    } catch (e) {
        console.warn('Timezone check failed, defaulting to true', e);
        return true;
    }
}

// Detectar estado del mercado (REGULAR, AFTER_HOURS, CLOSED)
function getMarketStatus() {
    var now = new Date();
    try {
        var etTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
        var etTime = new Date(etTimeStr);
        var hours = etTime.getHours();
        var minutes = etTime.getMinutes();
        var day = etTime.getDay();

        // Fin de semana
        if (day === 0 || day === 6) {
            return 'CLOSED';
        }

        var currentMinutes = hours * 60 + minutes;
        var marketOpen = 9 * 60 + 30;  // 9:30 AM
        var marketClose = 16 * 60;      // 4:00 PM
        var afterHoursEnd = 20 * 60;    // 8:00 PM

        if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
            return 'REGULAR';
        } else if (currentMinutes >= marketClose && currentMinutes < afterHoursEnd) {
            return 'AFTER_HOURS';
        } else {
            return 'CLOSED';
        }
    } catch (e) {
        console.warn('Market status check failed, defaulting to REGULAR', e);
        return 'REGULAR';
    }
}

// Exponer globalmente
window.fmt = fmt;
window.fmtDate = fmtDate;
window.debounce = debounce;
window.sanitizeHTML = sanitizeHTML;
window.isValidSymbol = isValidSymbol;
window.shouldRefreshPrices = shouldRefreshPrices;
window.getMarketStatus = getMarketStatus;

console.log('Utils: Loaded');
