# Contexto de Desarrollo - Portfolio Tracker v3.99.01

Este documento sirve como memoria técnica detallada de la arquitectura actual, los cambios realizados durante la fase de auditoría y los pasos a seguir.

## 🚀 Estado de la Aplicación: Post-Auditoría (v3.99.01)

La aplicación ha completado su transición a **Supabase Cloud** como motor único de persistencia y autenticación. Tras una fase de auditoría técnica, el código ha sido optimizado para eliminar redundancias y asegurar la integridad de los datos por usuario.

---

## 🛠️ Cambios Realizados en la Última Sesión (v3.99.01)

### 1. Corrección de Encoding UTF-8 (CRÍTICO)
*   **Problema:** El archivo `index.html` tenía caracteres corruptos (`????`, `�`, `?`) debido a un problema de encoding en una sesión anterior.
*   **Síntomas:** Los emojis de banderas (🇦🇷, 🇺🇸), iconos (📈, 🔔, ↕), y caracteres acentuados (í, ó, ñ, á) se mostraban como signos de interrogación.
*   **Solución:** Se restauró el archivo `index.html` con encoding UTF-8 correcto, manteniendo toda la estructura y funcionalidad de v3.99 (Supabase auth, botón auth-btn, CSS de auth, orden de scripts, etc.).

### 2. Cache Busting - Actualización a v3.99.01
*   Se incrementó la versión a **v3.99.01** en:
    *   `index.html` (todas las referencias CSS y JS).
    *   `service-worker.js` (para forzar la actualización del PWA).
    *   Footer y Modal de configuración.

### 3. Auditoría Previa Completada (v3.99)
*   **RLS verificado** en Supabase (políticas `ALL` con `auth.uid() = user_id`).
*   **Código limpiado** de funciones duplicadas (`showToast`, `isValidSymbol`, CSV exports).
*   **JSONBin eliminado** (migración legacy removida).
*   **`getCurrentUser()` consolidado** - optimizado en funciones de guardado.
*   **`lastYearCheck`** - migrado de localStorage a Supabase.

---

## 📂 Archivos Modificados

| Archivo | Rol en v3.99.01 |
| :--- | :--- |
| `index.html` | Restauración de caracteres UTF-8 + versión actualizada. |
| `service-worker.js` | Actualización de versión para cache bust. |
| `CONTEXTO_IA.md` | Crónica de desarrollo actualizada. |

---

## 🎯 Siguiente Paso: Accesibilidad (Aria-Labels)

El punto pendiente identificado en la auditoría:

### Accesibilidad (Prioridad Baja)
*   **Problema:** Botones de acción rápida (`✏️`, `🗑️`) no tienen etiquetas descriptivas para lectores de pantalla.
*   **Acción:** Agregar atributos `aria-label` a los botones generados dinámicamente en:
    *   `js/ui.js` (botones de editar/eliminar en tabla de historial)
    *   `js/watchlist-tabs.js` (botón de eliminar símbolos)
    *   `js/app.js` (renderWatchlist - botones de alerta y eliminar)

---

**Nota Técnica de Cierre:** La aplicación se encuentra en estado estable bajo la versión 3.99.01 con todos los caracteres UTF-8 correctamente renderizados.
