// ========================================
// CSV_HANDLER.JS - Importación y Parsing CSV
// ========================================

// ========================================
// Main CSV Import Handler
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
        .replace(/[<>"']/g, '') // Remover caracteres peligrosos
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

// Exportar solo función principal
window.handleCSVImport = handleCSVImport;

console.log('CSV Handler: Loaded');
