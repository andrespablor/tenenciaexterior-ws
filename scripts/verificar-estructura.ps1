# Script de Verificacion - v3.61
# Verifica que todos los archivos esten en su lugar correcto

Write-Host "`n=== VERIFICACION DE ESTRUCTURA ===" -ForegroundColor Cyan

# Verificar archivos raiz
Write-Host "`n[OK] Archivos raiz:" -ForegroundColor Green
$rootFiles = @("index.html", "manifest.json", "service-worker.js", "README.md")
foreach ($file in $rootFiles) {
    if (Test-Path $file) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] $file FALTANTE" -ForegroundColor Red
    }
}

# Verificar carpeta js/
Write-Host "`n[OK] Carpeta js/:" -ForegroundColor Green
$jsFiles = @("api.js", "app.js", "calculations.js", "charts.js", "config.js", 
             "finnhub-ws.js", "navigation.js", "storage.js", "ui.js", "utils.js", "watchlist-tabs.js")
foreach ($file in $jsFiles) {
    if (Test-Path "js\$file") {
        Write-Host "  [OK] js\$file" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] js\$file FALTANTE" -ForegroundColor Red
    }
}

# Verificar carpeta css/
Write-Host "`n[OK] Carpeta css/:" -ForegroundColor Green
$cssFiles = @("styles.css", "sidebar.css")
foreach ($file in $cssFiles) {
    if (Test-Path "css\$file") {
        Write-Host "  [OK] css\$file" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] css\$file FALTANTE" -ForegroundColor Red
    }
}

# Verificar carpeta assets/
Write-Host "`n[OK] Carpeta assets/:" -ForegroundColor Green
$assetFiles = @("icon-192.svg", "icon-512.svg")
foreach ($file in $assetFiles) {
    if (Test-Path "assets\$file") {
        Write-Host "  [OK] assets\$file" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] assets\$file FALTANTE" -ForegroundColor Red
    }
}

# Verificar carpeta scripts/
Write-Host "`n[OK] Carpeta scripts/:" -ForegroundColor Green
$scriptFiles = @("backup.ps1", "download_logos.ps1", "generate_profiles.ps1", "restore.ps1")
foreach ($file in $scriptFiles) {
    if (Test-Path "scripts\$file") {
        Write-Host "  [OK] scripts\$file" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] scripts\$file FALTANTE" -ForegroundColor Red
    }
}

# Verificar que NO existan archivos viejos en raiz
Write-Host "`n[OK] Verificando archivos eliminados:" -ForegroundColor Green
$oldFiles = @("csv_handler.js", "fetchPriceFinnhub.js", "styles.css", "sidebar.css", 
              "api.js", "app.js", "icon-192.svg", "icon-512.svg")
foreach ($file in $oldFiles) {
    if (Test-Path $file) {
        Write-Host "  [WARN] $file todavia existe en raiz (deberia estar movido)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== VERIFICACION COMPLETA ===" -ForegroundColor Cyan
Write-Host "Si todo esta en verde, la reorganizacion fue exitosa!" -ForegroundColor Green
