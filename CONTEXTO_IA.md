# Contexto de Desarrollo - Portfolio Tracker v3.97

Este documento sirve como memoria técnica para la transición de la persistencia de datos y el sistema de autenticación.

## 🚀 Estado Actual: Migración Completa a Supabase

La aplicación ha migrado exitosamente de un modelo de persistencia híbrido (LocalStorage/Google Sheets) a un modelo de persistencia centralizado en **Supabase Cloud**. Se ha implementado un sistema de autenticación obligatorio para asegurar la privacidad de los datos por usuario.

### 🛠️ Cambios Realizados (v3.86 - v3.90)

#### v3.90 - Limpieza de localStorage Residual
1.  **Eliminación de localStorage**: Se eliminaron todos los usos residuales de `localStorage` que quedaron de la arquitectura anterior:
    *   Comentarios obsoletos actualizados (`// Save to Supabase`).
    *   Funciones `saveColumnOrder()` y `getColumnOrder()` simplificadas (orden de columnas es solo UI transiente).
    *   Cache de logos (`logoCache`) eliminado - ya no se usa Finnhub, los logos son archivos locales.
    *   Función `saveWatchlistOrder()` limpiada.
2.  **Usos de localStorage MANTENIDOS** (son apropiados para UI local):
    *   `lastYearCheck`: Flag para detectar cambio de año (disparar snapshot).
    *   `pwa-installed`: Flag para notificación de instalación PWA.

#### v3.89 - Correcciones de Estabilidad
1.  **Fix: Función `loadData` faltante**: Se agregó la función en `storage.js` como wrapper de `loadAllDataSupabase()`, resolviendo el error "Módulos faltantes".
2.  **Fix: Loop de eventos `SIGNED_IN`**: Se implementó flag `_authDataLoaded` en `auth-ui.js` para evitar múltiples recargas de datos cuando Supabase dispara eventos de autenticación repetidos.

1.  **Persistencia 100% Cloud**:
    *   Se eliminó completamente el motor de `localStorage` y `Google Sheets` de `js/storage.js`.
    *   Supabase es ahora el único backend. Todos los datos (movimientos, stats, watchlists, alertas, settings) se sincronizan en tiempo real.

2.  **Sistema de Autenticación**:
    *   **Mandatory Auth**: La aplicación ya no es accesible sin iniciar sesión.
    *   **Página de Login Separada**: Se creó `login.html` como una página dedicada para evitar conflictos de CSS/JS con la app principal.
    *   **Redirect Flow**: `index.html` detecta la falta de sesión y redirige a `login.html`. Una vez autenticado, el usuario vuelve a la app principal.

3.  **Correcciones Técnicas Críticas**:
    *   **Nombre del Cliente**: Se renombró la variable local `supabase` a `_sb` en `js/supabase-client.js` para evitar conflictos con el objeto global `window.supabase` del SDK oficial.
    *   **Estructura de Watchlist**: Se corrigió un bug donde las funciones `add/remove` trataban a la watchlist como un array simple. Ahora respetan el objeto metadata: `{ displayName, icon, symbols }`.
    *   **Persistencia de Orden**: Se implementó el guardado del orden de los tickers tras realizar Drag & Drop en la watchlist.

4.  **Ajustes de UI/UX**:
    *   **Foco en Mercado**: La aplicación ahora inicia por defecto en el módulo "Mercado" y este aparece primero en el menú lateral.
    *   **Silenciar Guardado**: Se eliminaron los mensajes (toasts) de "Guardado en Supabase" para los procesos automáticos, manteniendo la UI limpia.
    *   **Carga Síncrona**: El flujo de inicio espera la respuesta de Supabase antes de renderizar, evitando parpadeos o pantallas vacías.

### 📂 Archivos Clave Modificados

*   `login.html`: Nueva página de entrada con diseño premium.
*   `index.html`: Se movió el orden de botones del sidebar y se limpió el modal de auth.
*   `js/auth-ui.js`: Controla el flujo de sesión y la inicialización de la carga de datos.
*   `js/storage.js`: Simplificado a un despachador exclusivo de Supabase.
*   `js/supabase-client.js`: Motor CRUD para la base de datos PostgreSQL.
*   `js/navigation.js`: Configurado para iniciar en 'mercado' y manejar el cambio de módulos.
*   `js/app.js`: Lógica de negocio actualizada para manejar la nueva estructura de datos y persistencia de orden.

### 🔑 Configuración de Base de Datos (Supabase)

Tablas creadas y vinculadas por `user_id`:
*   `movements`: Historial de operaciones.
*   `daily_stats`: Registro de valor de cartera diario.
*   `watchlists`: Listas de seguimiento (JSON de símbolos).
*   `price_alerts`: Alertas configuradas.
*   `app_settings`: Nombre de la app, tema, etc.
*   `year_end_snapshots`: Datos históricos de cierre de año.

---

## ➡️ Próximos Pasos Recomendados

1.  **Row Level Security (RLS)**: Verificar en el dashboard de Supabase que las políticas de seguridad estén activas para que ningún usuario pueda leer datos de otro (select/insert/update/delete WHERE user_id = auth.uid()).
2.  **Confirmación de Email**: Actualmente está desactivada para facilitar pruebas. Se recomienda reactivarla antes de lanzar a producción/usuarios finales.
3.  **Backup Automático**: Aunque Supabase gestiona la base de datos, se sugiere implementar una función de "Exportar a JSON" en la configuración como backup preventivo manual para el usuario.
4.  **Optimización BYMA**: Validar que la integración del WebSocket de RAVA/BYMA no tenga conflictos con el estado de autenticación cuando se cambia al mercado argentino.
