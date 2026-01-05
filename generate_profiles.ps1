# Script para generar base de datos de perfiles (Sectores/Industrias) desde Finnhub
# Rate limit: 250 llamadas/minuto (Standard Plan friendly)

param(
    [string]$ApiKey = "cvenlk1r01qjugsdonv0cvenlk1r01qjugsdonvg"
)

# Lista extendida de símbolos (S&P 500 top, Nasdaq, Latam, ETFs)
$symbols = @(
    # --- Top Tech & Growth ---
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "META", "TSLA", "BRK.B", "UNH",
    "JNJ", "V", "WMT", "XOM", "JPM", "PG", "MA", "AVGO", "LLY", "HD",
    "CVX", "MRK", "ABBV", "KO", "COST", "PEP", "ADBE", "TMO", "MCD", "CSCO",
    "CRM", "ACN", "NFLX", "INTC", "AMD", "QCOM", "TXN", "DHR", "LIN", "NKE",
    "ABT", "PM", "ORCL", "UPS", "NEE", "PFE", "RTX", "LOW", "UNP", "INTU",

    # --- Cloud / SaaS / AI ---
    "NOW", "AMAT", "LRCX", "ADI", "KLAC", "SNPS", "CDNS", "MRVL", "FTNT", "PANW",
    "ADSK", "ANSS", "ZS", "CRWD", "DDOG", "NET", "SNOW", "MDB", "TEAM", "WDAY",
    "PLTR", "U", "PATH", "IOT", "CFLT", "HCP", "AI", "SMCI",
    
    # --- FinTech & Payments ---
    "PYPL", "SQ", "SHOP", "COIN", "AFRM", "HOOD", "UPST", "SOFI", "NU",
    "V", "MA", "AXP", "DFS", "COF", "FIS", "FISV", "GPN",
    
    # --- EVs & Auto ---
    "TSLA", "RIVN", "LCID", "NIO", "XPEV", "LI", "F", "GM", "TM", "HMC", "STLA",
    
    # --- Argentina (ADRs) ---
    "YPF", "GGAL", "MELI", "BBAR", "BMA", "SUPV", "PAM", "TEO", "TGS", "EDN",
    "LOMA", "CRESY", "CEPU", "IRS", "TX", "VIST", "DESP", "GLOB", "BIOX",
    
    # --- Brasil (ADRs) ---
    "VALE", "ITUB", "BBD", "PBR", "ABEV", "SBS", "BSBR", "CBD", "EBR",
    "ELP", "ERJ", "GGB", "SID", "TIMB", "UGP", "VIV", "AZUL", "GOL", "NU", "XP", "PAGS", "STNE",
    
    # --- China Tech ---
    "BABA", "JD", "PDD", "BIDU", "BILI", "TCEHY", "NTES", "BEKE", "FUTU", "TCOM",
    
    # --- ETFs Populares ---
    "SPY", "QQQ", "IWM", "DIA", "EEM", "EFA", "TLT", "AGG", "GLD", "SLV", 
    "ARGT", "EWZ", "EWW", "MCHI", "FXI", "KWEB", "XLK", "XLE", "XLF", "XLV",
    "UVXY", "SQQQ", "TQQQ", "SOXL", "SOXS", "BITO", "ETHE", "GBTC", "IBit", "ARKK",
    
    # --- Crypto Related ---
    "MSTR", "MARA", "RIOT", "CLSK", "HUT", "BITF", "COIN",
    
    # --- Chips / Semi ---
    "TSM", "ASML", "MU", "NXPI", "ON", "MCHP", "STM", "UMC", "GFS",
    
    # --- Oil & Energy ---
    "COP", "SLB", "EOG", "PXD", "MPC", "VLO", "PSX", "HES", "OXY", "DVN",
    "FANG", "MRO", "APA", "HAL", "BKR", "NOV",
    
    # --- Pharma / Bio ---
    "MRNA", "BNTX", "REGN", "GILD", "BIIB", "VRTX", "ILMN", "ALNY", "BMRN",
    "SGEN", "EXAS", "CRSP", "NTLA", "EDIT", "BEAM", "VERV", "BLUE", "FATE"
)

# Eliminar duplicados
$symbols = $symbols | Select-Object -Unique

# Configurar salida
$outputFile = "assets/stock-profiles.json"
$profiles = @{}

# Cargar existente si hay para no gastar llamadas en lo que ya tenemos
if (Test-Path $outputFile) {
    try {
        $jsonContent = Get-Content $outputFile -Raw
        if ($jsonContent) {
            $profiles = ConvertFrom-Json $jsonContent -AsHashTable
            Write-Host "📂 Base de datos existente cargada ($($profiles.Count) perfiles)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "⚠️ Error leyendo archivo existente, empezando de cero."
    }
}

Write-Host ""
Write-Host "🚀 Iniciando descarga de perfiles..."
Write-Host "📊 Total símbolos a procesar: $($symbols.Keys.Count)"
Write-Host "⏱️  Rate limit: 250/minuto"
Write-Host ""

$count = 0
$total = $symbols.Count
$updated = 0
$skipped = 0
$failed = 0

foreach ($symbol in $symbols) {
    $count++
    $progress = [math]::Round(($count / $total) * 100, 1)
    Write-Progress -Activity "Actualizando perfiles" -Status "$progress% - $symbol" -PercentComplete $progress

    # Si ya tiene sector y industria validos, skip (opcional, para refrescar forzar borrar archivo)
    if ($profiles.ContainsKey($symbol) -and $profiles[$symbol].finnhubIndustry) {
        # Write-Host "⏭️  $symbol - Ya existe" -ForegroundColor Gray
        $skipped++
        continue
    }

    try {
        $url = "https://finnhub.io/api/v1/stock/profile2?symbol=$symbol&token=$ApiKey"
        $profile = Invoke-RestMethod -Uri $url -ErrorAction Stop

        if ($profile -and $profile.finnhubIndustry) {
            $profiles[$symbol] = @{
                name = $profile.name
                sector = $profile.finnhubIndustry
                logo = $profile.logo
                currency = $profile.currency
                country = $profile.country
                ticker = $profile.ticker
            }
            Write-Host "✅ $symbol - $($profile.finnhubIndustry)" -ForegroundColor Green
            $updated++
        } else {
            # Para ETFs a veces profile2 falla o viene vacio
            # Intentar inferir si es ETF
            if ($symbol -in @("SPY", "QQQ", "IWM", "DIA", "GLD", "SLV", "ARKK", "BITO")) {
                 $profiles[$symbol] = @{
                    name = $symbol
                    sector = "ETF"
                    logo = ""
                }
                Write-Host "✅ $symbol - ETF (Manual fallback)" -ForegroundColor Yellow
                $updated++
            } else {
                Write-Host "❌ $symbol - Sin datos" -ForegroundColor Red
                $failed++
            }
        }
    } catch {
        Write-Host "❌ $symbol - Error API" -ForegroundColor Red
        $failed++
    }

    # Rate limiting (250/min = ~4/sec = 250ms delay)
    Start-Sleep -Milliseconds 250
}

# Guardar JSON
$jsonOutput = $profiles | ConvertTo-Json -Depth 2
$jsonOutput | Set-Content $outputFile -Encoding UTF8

Write-Host ""
Write-Host "════════════════════════════════════════"
Write-Host "💾 Base de datos guardada en: $outputFile"
Write-Host "📊 Total Perfiles: $($profiles.Count)"
Write-Host "🔄 Actualizados:   $updated"
Write-Host "⏭️  Omitidos:      $skipped (ya existían)"
Write-Host "════════════════════════════════════════"
