# Script de Backup Sin ReadOnly
# Uso: .\backup.ps1 "Version 2.59"

param(
    [string]$Version = "Version $(Get-Date -Format 'yyyy-MM-dd_HHmm')"
)

$BackupPath = "backups\$Version"
$SourcePath = "."

# Crear directorio de backup
Write-Host "📦 Creando backup: $Version" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null

# Copiar archivos
Write-Host "📂 Copiando archivos..." -ForegroundColor Cyan
Get-ChildItem -File -Include "*.html","*.js","*.css","*.json","*.svg","*.ps1" | 
    Copy-Item -Destination $BackupPath -Force

# CRÍTICO: Quitar ReadOnly de TODOS los archivos copiados
Write-Host "🔓 Quitando atributo ReadOnly..." -ForegroundColor Yellow
Get-ChildItem $BackupPath -File | ForEach-Object {
    Set-ItemProperty -Path $_.FullName -Name IsReadOnly -Value $false
    Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
}

Write-Host "✅ Backup completado: $BackupPath" -ForegroundColor Green
Write-Host "Total archivos: $((Get-ChildItem $BackupPath -File).Count)" -ForegroundColor Cyan
