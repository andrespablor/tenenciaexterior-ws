# Script para descargar logos de empresas desde Finnhub
# Rate limit: 150 llamadas/minuto (1 cada 400ms)

param(
    [string]$ApiKey = ""
)

if ($ApiKey -eq "") {
    Write-Host "❌ Error: Debes proveer tu API key de Finnhub"
    Write-Host "Uso: .\download_logos.ps1 -ApiKey 'TU_API_KEY'"
    exit 1
}

# Lista completa de símbolos
$symbols = @(
    # Dow 30
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH",
    "JNJ", "V", "WMT", "XOM", "JPM", "PG", "MA", "AVGO", "LLY", "HD",
    "CVX", "MRK", "ABBV", "KO", "COST", "PEP", "ADBE", "TMO", "MCD", "CSCO",
    
    # Top S&P 100 adicionales
    "ACN", "NFLX", "INTC", "AMD", "QCOM", "ORCL", "IBM", "TXN", "INTU", "CRM",
    "NOW", "AMAT", "LRCX", "ADI", "KLAC", "SNPS", "CDNS", "MRVL", "FTNT", "PANW",
    "ADSK", "ANSS", "ZS", "CRWD", "DDOG", "NET", "SNOW", "MDB", "TEAM", "WDAY",
    "PYPL", "SQ", "SHOP", "COIN", "UBER", "LYFT", "ABNB", "DASH", "SPOT", "ZM",
    "DOCU", "TWLO", "OKTA", "PLTR", "RBLX", "U", "PATH", "BILL", "S", "FROG",
    
    # Financieras
    "BAC", "C", "WFC", "GS", "MS", "BLK", "SCHW", "AXP", "USB", "PNC",
    "TFC", "COF", "CME", "ICE", "SPGI", "MCO", "MSCI", "MKTX",
    
    # Consumo
    "NKE", "SBUX", "TGT", "LOW", "DG", "DLTR", "ROST", "TJX", "ULTA", "LULU",
    "DECK", "CROX", "BIRK", "ON", "CPRI", "RL", "PVH", "VFC", "HBI",
    
    # Salud
    "PFE", "MRNA", "BNTX", "REGN", "GILD", "BIIB", "VRTX", "ILMN", "ALNY", "BMRN",
    "SGEN", "EXAS", "CRSP", "NTLA", "EDIT", "BEAM", "VERV", "BLUE", "FATE",
    
    # Energía
    "COP", "SLB", "EOG", "PXD", "MPC", "VLO", "PSX", "HES", "OXY", "DVN",
    "FANG", "MRO", "APA", "HAL", "BKR", "NOV",
    
    # Industrial
    "BA", "CAT", "DE", "GE", "HON", "UPS", "FDX", "LMT", "RTX", "NOC",
    "GD", "HWM", "EMR", "ETN", "PH", "CMI", "PCAR", "ROK", "DOV",
    
    # Latinoamérica - Argentina
    "YPF", "GGAL", "MELI", "BBAR", "BMA", "SUPV", "PAM", "TEO", "TGS", "EDN",
    "LOMA", "CRESY", "CEPU", "IRS", "TX", "VIST", "DESP", "GLOB",
    
    # Latinoamérica - Brasil
    "NU", "VALE", "ITUB", "BBD", "PBR", "ABEV", "SBS", "BSBR", "CBD", "EBR",
    "ELP", "ERJ", "GGB", "SID", "TIMB", "UGP", "VIV",
    
    # ETFs y otros
    "SPY", "QQQ", "IWM", "DIA", "EEM", "EWZ", "EWW", "ARGT", "GVAL", "GXG",
    
    # Tech adicionales
    "BABA", "JD", "PDD", "BIDU", "BILI", "NIO", "XPEV", "LI", "RIVN", "LCID",
    "TSM", "ASML", "SAP", "ERIC", "NOK", "SE", "GRAB", "DIDI",
    
    # Otras importantes
    "DIS", "CMCSA", "T", "VZ", "NWSA", "PARA", "WBD", "FOXA", "DISCA", "CHTR"
)

# Crear carpeta si no existe
$logoDir = "assets\logos"
if (-not (Test-Path $logoDir)) {
    New-Item -ItemType Directory -Path $logoDir -Force | Out-Null
    Write-Host "✅ Carpeta $logoDir creada"
}

Write-Host ""
Write-Host "🚀 Iniciando descarga de $($symbols.Count) logos..."
Write-Host "⏱️  Rate limit: 150/minuto (1 cada 400ms)"
Write-Host ""

$successful = 0
$failed = 0
$skipped = 0
$total = $symbols.Count

for ($i = 0; $i -lt $symbols.Count; $i++) {
    $symbol = $symbols[$i]
    $progress = [math]::Round(($i / $total) * 100, 1)
    
    Write-Progress -Activity "Descargando logos" -Status "$progress% - $symbol" -PercentComplete $progress
    
    $outputFile = "$logoDir\$symbol.png"
    
    # Si ya existe, skip
    if (Test-Path $outputFile) {
        Write-Host "⏭️  [$($i+1)/$total] $symbol - Ya existe" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    try {
        # Paso 1: Obtener info de la empresa
        $profileUrl = "https://finnhub.io/api/v1/stock/profile2?symbol=$symbol&token=$ApiKey"
        $profile = Invoke-RestMethod -Uri $profileUrl -ErrorAction Stop
        
        if ($profile.logo -and $profile.logo -ne "") {
            # Paso 2: Descargar logo
            Invoke-WebRequest -Uri $profile.logo -OutFile $outputFile -ErrorAction Stop
            Write-Host "✅ [$($i+1)/$total] $symbol - $($profile.name)" -ForegroundColor Green
            $successful++
        } else {
            Write-Host "❌ [$($i+1)/$total] $symbol - Sin logo disponible" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "❌ [$($i+1)/$total] $symbol - Error: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
    
    # Rate limiting: 400ms entre llamadas (150/minuto)
    if ($i -lt ($symbols.Count - 1)) {
        Start-Sleep -Milliseconds 400
    }
}

Write-Progress -Activity "Descarga completada" -Completed

Write-Host ""
Write-Host "════════════════════════════════════════"
Write-Host "✅ Exitosos: $successful" -ForegroundColor Green
Write-Host "❌ Fallidos:  $failed" -ForegroundColor Red
Write-Host "⏭️  Omitidos: $skipped" -ForegroundColor Yellow
Write-Host "📊 Total:     $total"
Write-Host "════════════════════════════════════════"
Write-Host ""
Write-Host "💾 Logos guardados en: $logoDir"
