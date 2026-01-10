# CONTEXTO_IA - Portfolio Tracker v3.86
Fecha: 09/01/2026

Este documento sirve como resumen técnico detallado para retomar el proyecto. La aplicación es un tracker de portafolio financiero profesional con integración de mercados de Argentina (BYMA) y USA.

## 🚀 Estado Actual: v3.86

### ⭐ NUEVA FEATURE: Autenticación Obligatoria con Supabase
Se ha completado la integración completa con **Supabase** como único backend de persistencia con autenticación obligatoria.

### 1. Cambios en v3.86 (Muy Importante)
- **Login Obligatorio:**
    - La app NO se muestra hasta que el usuario se loguee.
    - Al cargar, se muestra el modal de login automáticamente.
    - No se puede cerrar el modal sin autenticarse.
    
- **Backend Único: Supabase**
    - Se eliminaron las opciones de LocalStorage y Google Sheets.
    - Todos los datos se guardan en Supabase Cloud.
    - Cada usuario tiene sus propios datos aislados (RLS).

- **Archivos de Supabase:**
    - `js/supabase-config.js` - Credenciales.
    - `js/supabase-client.js` - Cliente con Auth y CRUD.
    - `js/auth-ui.js` - Modal de login con lógica de ocultación de app.
    - `css/auth.css` - Estilos del modal + estado auth-required.

- **Credenciales de Supabase:**
    - URL: `https://wqjnjewadakatnpwfcpf.supabase.co`
    - Las tablas ya están creadas en la DB.

### 2. Estructura de Tablas en Supabase
```sql
- movements (id, user_id, symbol, type, quantity, price, date, notes)
- daily_stats (id, user_id, date, invested, result)
- watchlists (id, user_id, watchlist_id, display_name, icon, symbols)
- price_alerts (id, user_id, symbol, target_price, condition, is_active)
- app_settings (id, user_id, app_name, theme, current_watchlist_id)
- year_end_snapshots (id, user_id, year, date, invested, result, by_symbol)
```
Todas las tablas tienen **RLS** (Row Level Security) habilitado.

### 3. Estructura de Archivos Actualizada
- `index.html`: Estructura principal + modal de auth obligatorio.
- `/js/config.js`: Variables globales (sin storageBackend).
- `/js/supabase-config.js`: Credenciales (URL + anon key).
- `/js/supabase-client.js`: Cliente Supabase con auth y CRUD.
- `/js/auth-ui.js`: Login obligatorio, oculta app hasta autenticarse.
- `/js/storage.js`: Simplificado, solo guarda en Supabase.
- `/js/navigation.js`: Navegación de módulos.
- `/js/api.js`: Fetch de precios (Yahoo Finance).
- `/js/app.js`: Orquestación principal.
- `/css/auth.css`: Estilos de auth + body.auth-required.

### 4. Flujo de Autenticación
1. Usuario abre la app → App oculta, modal de login visible.
2. Usuario se registra o loguea.
3. Al autenticarse → Modal se cierra, app se muestra, datos se cargan.
4. Al cerrar sesión → App se oculta, modal de login reaparece.

### 5. Preparación de Supabase
**IMPORTANTE:** Para que el registro funcione inmediatamente:
1. Dashboard de Supabase → **Authentication** → **Providers** → **Email**
2. **Deshabilitar** "Confirm email"
3. Click en **Save**

### 6. Para Testear
1. Refrescar la app (F5).
2. Debería aparecer el modal de login (app oculta detrás).
3. Registrar un usuario nuevo con email/password.
4. La app debería mostrarse y cargar datos.
5. Cerrar sesión → Vuelve al modal de login.

---
**v3.86 - Supabase Only + Mandatory Auth**
