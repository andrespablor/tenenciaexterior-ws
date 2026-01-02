/**
 * Portfolio Tracker - Google Apps Script Backend
 * Version: 2.60 - Phase 3 (Key-Value Architecture)
 * 
 * FASE 1: ✅ LockService + Validación
 * FASE 2: ✅ CacheService + Performance
 * FASE 3: ✅ Single Sheet Key-Value Design
 * 
 * ARQUITECTURA:
 * - 1 sola hoja "_DATABASE_" con 2 columnas: Key | Value
 * - 1 lectura/escritura batch en vez de 7 secuenciales
 * - ~5-10x más rápido que multi-sheet
 */

const CACHE_DURATION = 60;

// Keys para la base de datos
const DB_KEYS = [
  'movements',
  'dailyStats',
  'watchlists',
  'priceAlerts',
  'appSettings',
  'yearEndSnapshots',
  'currentWatchlistId'
];

// GET: Leer datos
function doGet(e) {
  try {
    // Intentar servir desde caché
    const cache = CacheService.getScriptCache();
    const cachedData = cache.get('portfolio_data');
    
    if (cachedData) {
      Logger.log('✅ Sirviendo desde caché');
      return ContentService
        .createTextOutput(cachedData)
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Leer desde Sheet
    Logger.log('📊 Leyendo desde Sheet (caché vacío)');
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const data = readAllData(spreadsheet);
    
    const jsonResponse = JSON.stringify(data);
    cache.put('portfolio_data', jsonResponse, CACHE_DURATION);
    
    return ContentService
      .createTextOutput(jsonResponse)
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST: Escribir datos
function doPost(e) {
  var lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(30000)) {
      throw new Error('Sistema ocupado. Intenta de nuevo en unos segundos.');
    }
    
    const data = JSON.parse(e.postData.contents);
    
    if (!validateData(data)) {
      throw new Error('Datos inválidos recibidos. Validación fallida.');
    }
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    writeAllData(spreadsheet, data);
    
    // Invalidar caché
    const cache = CacheService.getScriptCache();
    cache.remove('portfolio_data');
    Logger.log('🗑️ Caché invalidado');
    
    lock.releaseLock();
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, timestamp: new Date()}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
    
    Logger.log('Error en doPost: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// 🚀 FASE 3: Key-Value Database Functions
// ========================================

/**
 * Lee todos los datos en 1 sola operación batch
 */
function readAllData(spreadsheet) {
  let sheet = spreadsheet.getSheetByName('_DATABASE_');
  
  // Si no existe, crear con valores por defecto
  if (!sheet) {
    Logger.log('⚠️ _DATABASE_ no existe, creando...');
    return createDefaultData(spreadsheet);
  }
  
  const lastRow = sheet.getLastRow();
  
  if (lastRow < 2) {
    Logger.log('⚠️ _DATABASE_ vacía, devolviendo defaults');
    return getDefaultValues();
  }
  
  // 🚀 Leer todo en 1 sola llamada
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  
  // Convertir array [[key, value]] a objeto {key: parsed_value}
  const data = {};
  
  values.forEach(row => {
    const key = row[0];
    const valueStr = row[1];
    
    if (key && valueStr) {
      try {
        data[key] = JSON.parse(valueStr);
      } catch (e) {
        Logger.log('Error parsing ' + key + ': ' + e);
        data[key] = getDefaultValue(key);
      }
    }
  });
  
  // Asegurar que existan todas las keys
  DB_KEYS.forEach(key => {
    if (!data[key]) {
      data[key] = getDefaultValue(key);
    }
  });
  
  return data;
}

/**
 * Escribe todos los datos en 1 sola operación batch
 */
function writeAllData(spreadsheet, data) {
  let sheet = spreadsheet.getSheetByName('_DATABASE_');
  
  // Crear sheet si no existe
  if (!sheet) {
    sheet = spreadsheet.insertSheet('_DATABASE_');
    sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    sheet.setFrozenRows(1);
  }
  
  // Construir array de valores [[key, JSON_string], ...]
  const values = DB_KEYS.map(key => {
    const value = data[key];
    const jsonString = JSON.stringify(value, null, 2);
    return [key, jsonString];
  });
  
  // 🚀 Escribir todo en 1 sola llamada
  const numKeys = values.length;
  
  // Limpiar data vieja si hay más filas
  const lastRow = sheet.getLastRow();
  if (lastRow > numKeys + 1) {
    sheet.getRange(numKeys + 2, 1, lastRow - numKeys - 1, 2).clear();
  }
  
  // Escribir
  sheet.getRange(2, 1, numKeys, 2).setValues(values);
  
  Logger.log('✅ Escritura batch de ' + numKeys + ' keys');
}

/**
 * Crea estructura inicial con datos por defecto
 */
function createDefaultData(spreadsheet) {
  const defaultData = getDefaultValues();
  writeAllData(spreadsheet, defaultData);
  return defaultData;
}

/**
 * Devuelve valores por defecto para cada key
 */
function getDefaultValues() {
  return {
    movements: [],
    dailyStats: [],
    watchlists: { default: [] },
    priceAlerts: [],
    appSettings: {},
    yearEndSnapshots: {},
    currentWatchlistId: 'default'
  };
}

function getDefaultValue(key) {
  const defaults = getDefaultValues();
  return defaults[key] || [];
}

// ========================================
// Validación (sin cambios)
// ========================================

function validateData(data) {
  if (!data) return false;
  
  if (!Array.isArray(data.movements)) {
    Logger.log('Validación fallida: movements no es array');
    return false;
  }
  
  if (!Array.isArray(data.dailyStats)) {
    Logger.log('Validación fallida: dailyStats no es array');
    return false;
  }
  
  if (typeof data.watchlists !== 'object' || data.watchlists === null || Array.isArray(data.watchlists)) {
    Logger.log('Validación fallida: watchlists no es objeto');
    return false;
  }
  
  if (!Array.isArray(data.priceAlerts)) {
    Logger.log('Validación fallida: priceAlerts no es array');
    return false;
  }
  
  return true;
}

// ========================================
// 🔧 MIGRACIÓN desde Multi-Sheet
// ========================================

/**
 * Función de migración manual (ejecutar 1 vez si ya tenés datos)
 * Extensions → Apps Script → Ejecutar "migrateFromMultiSheet"
 */
function migrateFromMultiSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  Logger.log('🔄 Iniciando migración...');
  
  // Leer datos de las pestañas viejas
  const oldData = {
    movements: readJSONSheet(spreadsheet, 'movements'),
    dailyStats: readJSONSheet(spreadsheet, 'dailyStats'),
    watchlists: readJSONSheet(spreadsheet, 'watchlists'),
    priceAlerts: readJSONSheet(spreadsheet, 'priceAlerts'),
    appSettings: readJSONSheet(spreadsheet, 'appSettings'),
    yearEndSnapshots: readJSONSheet(spreadsheet, 'yearEndSnapshots'),
    currentWatchlistId: readJSONSheet(spreadsheet, 'currentWatchlistId')
  };
  
  Logger.log('📥 Datos leídos de pestañas viejas');
  
  // Escribir a nueva estructura
  writeAllData(spreadsheet, oldData);
  
  Logger.log('✅ Migración completada!');
  Logger.log('ℹ️ Las pestañas viejas se mantienen como backup');
  Logger.log('ℹ️ Podés eliminarlas manualmente si todo funciona bien');
}

// Helper para leer de pestañas viejas (solo para migración)
function readJSONSheet(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet || sheet.getLastRow() < 2) {
    return getDefaultValue(sheetName);
  }
  
  const jsonString = sheet.getRange(2, 1).getValue();
  
  if (!jsonString) {
    return getDefaultValue(sheetName);
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    Logger.log('Error parsing ' + sheetName);
    return getDefaultValue(sheetName);
  }
}
