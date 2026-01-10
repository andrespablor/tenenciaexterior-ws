# Script de Restauración Segura de Backups
# Uso: .\restore.ps1 "Version 2.56"

param(
    [string]$Version = "Version 2.56"
)

$BackupPath = "backups\$Version"
$TargetPath = "."

# Verificar que existe el backup
if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ Error: No existe el backup '$Version'" -ForegroundColor Red
    Write-Host "Backups disponibles:" -ForegroundColor Yellow
    Get-ChildItem "backups\" -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
    exit 1
}

# Confirmar
Write-Host "⚠️  Vas a restaurar: $Version" -ForegroundColor Yellow
Write-Host "Esto sobrescribirá los archivos actuales." -ForegroundColor Yellow
$confirm = Read-Host "¿Continuar? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

# Copiar archivos
Write-Host "📂 Copiando archivos..." -ForegroundColor Cyan
Copy-Item "$BackupPath\*" -Destination $TargetPath -Force

# Quitar atributo ReadOnly de TODOS los archivos copiados
Write-Host "🔓 Quitando atributo ReadOnly..." -ForegroundColor Cyan
Get-ChildItem $TargetPath -File -Filter "*.html","*.js","*.css","*.json" | 
    ForEach-Object {
        Set-ItemProperty -Path $_.FullName -Name IsReadOnly -Value $false
        Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
    }

Write-Host "✅ Restauración completada: $Version" -ForegroundColor Green
Write-Host "Refrescá el navegador (Ctrl+Shift+R)" -ForegroundColor Cyan
