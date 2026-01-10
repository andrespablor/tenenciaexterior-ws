-- ========================================
-- SUPABASE RLS (Row Level Security) POLICIES
-- Portfolio Tracker - Seguridad de Base de Datos
-- 
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard > SQL Editor
-- 2. Copiar y ejecutar este script COMPLETO
-- 3. Verificar que no haya errores
-- ========================================

-- ========================================
-- PASO 1: HABILITAR RLS EN TODAS LAS TABLAS
-- ========================================

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE year_end_snapshots ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 2: ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- ========================================

DROP POLICY IF EXISTS "Users can view own movements" ON movements;
DROP POLICY IF EXISTS "Users can insert own movements" ON movements;
DROP POLICY IF EXISTS "Users can update own movements" ON movements;
DROP POLICY IF EXISTS "Users can delete own movements" ON movements;

DROP POLICY IF EXISTS "Users can view own daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Users can insert own daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Users can update own daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "Users can delete own daily_stats" ON daily_stats;

DROP POLICY IF EXISTS "Users can view own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can insert own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can update own watchlists" ON watchlists;
DROP POLICY IF EXISTS "Users can delete own watchlists" ON watchlists;

DROP POLICY IF EXISTS "Users can view own price_alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can insert own price_alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update own price_alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can delete own price_alerts" ON price_alerts;

DROP POLICY IF EXISTS "Users can view own app_settings" ON app_settings;
DROP POLICY IF EXISTS "Users can insert own app_settings" ON app_settings;
DROP POLICY IF EXISTS "Users can update own app_settings" ON app_settings;
DROP POLICY IF EXISTS "Users can delete own app_settings" ON app_settings;

DROP POLICY IF EXISTS "Users can view own year_end_snapshots" ON year_end_snapshots;
DROP POLICY IF EXISTS "Users can insert own year_end_snapshots" ON year_end_snapshots;
DROP POLICY IF EXISTS "Users can update own year_end_snapshots" ON year_end_snapshots;
DROP POLICY IF EXISTS "Users can delete own year_end_snapshots" ON year_end_snapshots;

-- ========================================
-- PASO 3: CREAR POLÍTICAS PARA MOVEMENTS
-- ========================================

CREATE POLICY "Users can view own movements"
ON movements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own movements"
ON movements FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own movements"
ON movements FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own movements"
ON movements FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- PASO 4: CREAR POLÍTICAS PARA DAILY_STATS
-- ========================================

CREATE POLICY "Users can view own daily_stats"
ON daily_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_stats"
ON daily_stats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_stats"
ON daily_stats FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_stats"
ON daily_stats FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- PASO 5: CREAR POLÍTICAS PARA WATCHLISTS
-- ========================================

CREATE POLICY "Users can view own watchlists"
ON watchlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlists"
ON watchlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists"
ON watchlists FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists"
ON watchlists FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- PASO 6: CREAR POLÍTICAS PARA PRICE_ALERTS
-- ========================================

CREATE POLICY "Users can view own price_alerts"
ON price_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price_alerts"
ON price_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price_alerts"
ON price_alerts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own price_alerts"
ON price_alerts FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- PASO 7: CREAR POLÍTICAS PARA APP_SETTINGS
-- ========================================

CREATE POLICY "Users can view own app_settings"
ON app_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own app_settings"
ON app_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own app_settings"
ON app_settings FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own app_settings"
ON app_settings FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- PASO 8: CREAR POLÍTICAS PARA YEAR_END_SNAPSHOTS
-- ========================================

CREATE POLICY "Users can view own year_end_snapshots"
ON year_end_snapshots FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own year_end_snapshots"
ON year_end_snapshots FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own year_end_snapshots"
ON year_end_snapshots FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own year_end_snapshots"
ON year_end_snapshots FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- VERIFICACIÓN: Mostrar estado de RLS
-- ========================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('movements', 'daily_stats', 'watchlists', 'price_alerts', 'app_settings', 'year_end_snapshots');

-- ========================================
-- FIN DEL SCRIPT
-- Si todo está OK, deberías ver "RLS Enabled = true" para todas las tablas
-- ========================================
