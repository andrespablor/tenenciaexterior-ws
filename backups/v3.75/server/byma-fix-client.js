/**
 * BYMA FIX 5.0 SP2 WebSocket Client
 * Basado en especificación SBAFIX MD v1.22 (Abril 2024)
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

// Constantes FIX
const SOH = '\x01';
const MSG_TYPE = {
    LOGON: 'A',
    HEARTBEAT: '0',
    TEST_REQUEST: '1',
    LOGOUT: '5',
    MARKET_DATA_REQUEST: 'V',
    MARKET_DATA_SNAPSHOT: 'W',
    MARKET_DATA_INCREMENTAL: 'X'
};

class BymaFixClient extends EventEmitter {
    constructor(config) {
        super();
        this.config = {
            url: config.url,
            senderCompID: config.senderCompID,
            targetCompID: config.targetCompID,
            username: config.username,
            password: config.password,
            heartbeatInterval: config.heartbeatInterval || 30,
            reconnectInterval: 5000
        };

        this.ws = null;
        this.msgSeqNum = 1;
        this.heartbeatTimer = null;
        this.isConnected = false;
        this.isLoggedIn = false;
        this.requests = new Map(); // MDReqID -> Symbol
    }

    /**
     * Inicia la conexión
     */
    connect() {
        console.log(`[BYMA] Conectando a ${this.config.url}...`);
        this.ws = new WebSocket(this.config.url);

        this.ws.on('open', () => this.handleOpen());
        this.ws.on('message', (data) => this.handleMessage(data));
        this.ws.on('close', (code, reason) => this.handleClose(code, reason));
        this.ws.on('error', (error) => this.emit('error', error));
    }

    /**
     * Maneja la apertura de conexión
     */
    handleOpen() {
        console.log('[BYMA] WebSocket conectado. Iniciando Logon...');
        this.sendLogon();
        this.startHeartbeat();
    }

    /**
     * Maneja mensajes recibidos
     */
    handleMessage(data) {
        const rawMsg = data.toString();
        const msg = this.parseFixMessage(rawMsg);

        if (!msg) return;

        const msgType = msg['35'];

        switch (msgType) {
            case MSG_TYPE.LOGON:
                console.log('[BYMA] ✅ Logon exitoso');
                this.isLoggedIn = true;
                this.emit('logon');
                break;

            case MSG_TYPE.HEARTBEAT:
                // Responder a Test Request si es necesario, o simplemente ignorar
                break;

            case MSG_TYPE.TEST_REQUEST:
                this.sendHeartbeat(msg['112']); // Responder con TestReqID
                break;

            case MSG_TYPE.MARKET_DATA_SNAPSHOT:
                this.handleSnapshot(msg);
                break;

            case MSG_TYPE.MARKET_DATA_INCREMENTAL:
                this.handleIncremental(msg);
                break;

            case MSG_TYPE.LOGOUT:
                console.log('[BYMA] Logout recibido:', msg['58']);
                this.isLoggedIn = false;
                this.ws.close();
                break;

            default:
            // console.log(`[BYMA] Mensaje no manejado: ${msgType}`);
        }
    }

    /**
     * Maneja Snapshot (35=W)
     */
    handleSnapshot(msg) {
        const symbol = msg['55']; // Symbol
        // Parsear entradas MDEntries...
        // Aquí iría la lógica compleja de parsing de grupos repetitivos
        this.emit('snapshot', { symbol, raw: msg });
    }

    /**
     * Maneja Incremental Refresh (35=X)
     */
    handleIncremental(msg) {
        // Parsear actualizaciones...
        this.emit('update', { raw: msg });
    }

    /**
     * Envía mensaje de Logon (35=A)
     */
    sendLogon() {
        const fields = {
            '35': MSG_TYPE.LOGON,
            '98': '0',          // EncryptMethod = None
            '108': this.config.heartbeatInterval.toString(),
            '1137': '9',        // DefaultApplVerID = FIX50SP2
            '553': this.config.username,
            '554': this.config.password,
            '464': 'Y'          // TestMessageIndicator (ajustar para prod)
        };
        this.sendFixMessage(fields);
    }

    /**
     * Envía Heartbeat (35=0)
     */
    sendHeartbeat(testReqID = null) {
        const fields = {
            '35': MSG_TYPE.HEARTBEAT
        };
        if (testReqID) fields['112'] = testReqID;
        this.sendFixMessage(fields);
    }

    /**
     * Suscribirse a Market Data (35=V)
     */
    subscribeMarketData(symbol, reqID) {
        const fields = {
            '35': MSG_TYPE.MARKET_DATA_REQUEST,
            '262': reqID,
            '263': '1',         // Snapshot + Updates
            '264': '1',         // Top of Book (cambiar a 5 para profundidad)
            '265': '1',         // Incremental Refresh
            '146': '1',         // NoRelatedSym
            '55': symbol,       // Symbol
            '48': symbol,       // SecurityID (usamos Symbol como ID por defecto)
            '22': '8'           // SecurityIDSource = Exchange Symbol
        };

        console.log(`[BYMA] Suscribiendo a ${symbol}...`);
        this.sendFixMessage(fields);
        this.requests.set(reqID, symbol);
    }

    /**
     * Construye y envía mensaje FIX
     */
    sendFixMessage(bodyFields) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const now = new Date();
        const sendingTime = now.toISOString().replace(/[-:]/g, '').split('.')[0];

        // Header fields
        const header = {
            '8': 'FIXT.1.1',
            '9': '0', // Placeholder length
            '35': bodyFields['35'],
            '49': this.config.senderCompID,
            '56': this.config.targetCompID,
            '34': this.msgSeqNum.toString(),
            '52': sendingTime
        };

        // Combine header + body (excluyendo 8, 9, 10)
        let msgContent = '';

        // Agregar campos de header (menos 8 y 9 que van al principio)
        for (const [tag, val] of Object.entries(header)) {
            if (tag !== '8' && tag !== '9') msgContent += `${tag}=${val}${SOH}`;
        }

        // Agregar campos del cuerpo
        for (const [tag, val] of Object.entries(bodyFields)) {
            if (tag !== '35') msgContent += `${tag}=${val}${SOH}`;
        }

        // Calcular BodyLength (9)
        const bodyLength = msgContent.length;

        // Construir mensaje preliminar: 8=...|9=...|content
        const prefix = `8=FIXT.1.1${SOH}9=${bodyLength}${SOH}`;
        const fullMsgWithoutChecksum = prefix + msgContent;

        // Calcular Checksum (10)
        let checksum = 0;
        for (let i = 0; i < fullMsgWithoutChecksum.length; i++) {
            checksum += fullMsgWithoutChecksum.charCodeAt(i);
        }
        checksum = (checksum % 256).toString().padStart(3, '0');

        const finalMsg = `${fullMsgWithoutChecksum}10=${checksum}${SOH}`;

        this.ws.send(finalMsg);
        this.msgSeqNum++;
    }

    /**
     * Parsea mensaje FIX
     */
    parseFixMessage(rawMsg) {
        const fields = {};
        const parts = rawMsg.split(SOH);
        for (const part of parts) {
            if (part.includes('=')) {
                const [tag, val] = part.split('=');
                fields[tag] = val;
            }
        }
        return fields;
    }

    /**
     * Gestión de Heartbeat
     */
    startHeartbeat() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
                this.sendHeartbeat();
            }
        }, this.config.heartbeatInterval * 1000);
    }

    handleClose(code, reason) {
        console.log(`[BYMA] Desconectado (${code}): ${reason}`);
        this.isConnected = false;
        this.isLoggedIn = false;
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

        // Auto-reconnect
        setTimeout(() => this.connect(), this.config.reconnectInterval);
    }
}

module.exports = BymaFixClient;
