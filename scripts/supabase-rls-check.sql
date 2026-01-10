-- ========================================
-- VERIFICACIÓN DE RLS - Ejecutar PRIMERO
-- Portfolio Tracker - Diagnóstico de Seguridad
-- ========================================

-- 1. Verificar si RLS está habilitado en cada tabla
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Habilitado"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'movements', 
    'daily_stats', 
    'watchlists', 
    'price_alerts', 
    'app_settings', 
    'year_end_snapshots'
);

-- 2. Listar todas las políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'movements', 
    'daily_stats', 
    'watchlists', 
    'price_alerts', 
    'app_settings', 
    'year_end_snapshots'
)
ORDER BY tablename, policyname;

-- 3. Verificar estructura de tablas (columna user_id)
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'movements', 
    'daily_stats', 
    'watchlists', 
    'price_alerts', 
    'app_settings', 
    'year_end_snapshots'
)
AND column_name = 'user_id';

-- ========================================
-- INTERPRETACIÓN DE RESULTADOS:
-- 
-- Query 1 - RLS Habilitado:
--   ✅ TRUE = Seguro (RLS activo)
--   ❌ FALSE = PELIGROSO (cualquiera puede acceder)
--
-- Query 2 - Políticas:
--   Deberías ver 4 políticas por tabla (SELECT, INSERT, UPDATE, DELETE)
--   Si está vacío = NO HAY POLÍTICAS (peligroso si RLS está activo)
--
-- Query 3 - Columna user_id:
--   Cada tabla debe tener user_id tipo UUID
--   Si falta, la app no puede filtrar por usuario
-- ========================================
