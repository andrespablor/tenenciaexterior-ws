// ========================================
// BYMA WebSocket - Cliente Final
// Muestra precios en tiempo real de BYMA
// ========================================

const WebSocket = require('ws');

const BYMA_WS_URL = 'ws://fix.rava.com:6464';

console.log('========================================');
console.log('📈 BYMA Market Data - Cliente Final');
console.log('========================================\n');

const ws = new WebSocket(BYMA_WS_URL);

// Estadísticas
let msgCount = 0;
let lastPrices = new Map();

ws.on('open', () => {
    console.log('✅ Conectado a ws://fix.rava.com:6464');
    console.log('⏳ Recibiendo datos del mercado...\n');
    console.log('─'.repeat(80));
    console.log('│ Símbolo                    │ Tipo   │ Precio      │ Cantidad │ Posición │ Settl │');
    console.log('─'.repeat(80));
});

ws.on('message', (data) => {
    msgCount++;
    const rawMsg = data.toString();

    // Extraer datos usando regex (más robusto que JSON.parse con bytes binarios)
    const matches = {
        msgType: rawMsg.match(/"MsgType":\s*"([^"]+)"/),
        msgSeqNum: rawMsg.match(/"MsgSeqNum":\s*(\d+)/),
        symbol: rawMsg.match(/"Symbol":\s*"([^"]+)"/),
        securityID: rawMsg.match(/"SecurityID":\s*"([^"]+)"/),
        securityExchange: rawMsg.match(/"SecurityExchange":\s*"([^"]+)"/),
        securityType: rawMsg.match(/"SecurityType":\s*"([^"]+)"/),
        mdEntryType: rawMsg.match(/"MDEntryType":\s*"([^"]+)"/),
        mdEntryPx: rawMsg.match(/"MDEntryPx":\s*"([^"]+)"/),
        mdEntrySize: rawMsg.match(/"MDEntrySize":\s*"([^"]+)"/),
        mdEntryPositionNo: rawMsg.match(/"MDEntryPositionNo":\s*"([^"]+)"/),
        settlType: rawMsg.match(/"SettlType":\s*"([^"]+)"/),
        numberOfOrders: rawMsg.match(/"NumberOfOrders":\s*"([^"]+)"/)
    };

    // Si tiene precio, mostrar
    if (matches.mdEntryPx) {
        const symbol = (matches.symbol ? matches.symbol[1] : '') ||
            (matches.securityID ? matches.securityID[1] : 'N/A');
        const price = matches.mdEntryPx[1];
        const size = matches.mdEntrySize ? matches.mdEntrySize[1] : '-';
        const position = matches.mdEntryPositionNo ? matches.mdEntryPositionNo[1] : '-';
        const settlType = matches.settlType ? getSettlTypeName(matches.settlType[1]) : '-';
        const entryType = matches.mdEntryType ? getMDEntryTypeName(matches.mdEntryType[1]) : 'PRICE';

        // Formatear para tabla
        const symbolPad = symbol.substring(0, 26).padEnd(26);
        const typePad = entryType.padEnd(6);
        const pricePad = formatPrice(price).padStart(11);
        const sizePad = size.toString().padStart(8);
        const posPad = position.toString().padStart(8);
        const settlPad = settlType.padEnd(5);

        console.log(`│ ${symbolPad} │ ${typePad} │ ${pricePad} │ ${sizePad} │ ${posPad} │ ${settlPad} │`);

        // Guardar último precio
        lastPrices.set(symbol, { price, size, time: new Date() });
    }

    // Mostrar estadísticas cada 100 mensajes
    if (msgCount % 100 === 0) {
        console.log('─'.repeat(80));
        console.log(`📊 Mensajes recibidos: ${msgCount} | Símbolos únicos: ${lastPrices.size}`);
        console.log('─'.repeat(80));
    }
});

ws.on('close', (code, reason) => {
    console.log('─'.repeat(80));
    console.log(`\n❌ Conexión cerrada. Code: ${code}`);
    console.log(`📊 Total de mensajes recibidos: ${msgCount}`);
    console.log(`📊 Símbolos únicos vistos: ${lastPrices.size}`);

    if (lastPrices.size > 0) {
        console.log('\n📋 Últimos precios registrados:');
        lastPrices.forEach((data, symbol) => {
            console.log(`   ${symbol}: $${data.price} (Qty: ${data.size})`);
        });
    }
    process.exit(0);
});

ws.on('error', (error) => {
    console.error(`\n⚠️ Error: ${error.message}`);
});

// ========================================
// Helpers
// ========================================

function getMDEntryTypeName(type) {
    const types = {
        '0': 'BID',
        '1': 'OFFER',
        '2': 'TRADE',
        '4': 'OPEN',
        '5': 'CLOSE',
        '6': 'SETTLE',
        '7': 'HIGH',
        '8': 'LOW',
        'B': 'VOL'
    };
    return types[type] || type || 'PRICE';
}

function getSettlTypeName(type) {
    const types = {
        '0': 'Reg',
        '1': 'CI',    // Contado Inmediato
        '2': '24h',
        '3': '48h'
    };
    return types[type] || type || '';
}

function formatPrice(price) {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    if (num >= 1000) {
        return num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return num.toFixed(2);
}

console.log('Presiona Ctrl+C para salir\n');
