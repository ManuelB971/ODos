param(
    [switch]$SkipFront,
    [switch]$SkipBack
)

$ErrorActionPreference = "Stop"

$backendOk = $true
$frontendOk = $true

if (-not $SkipBack) {
    Write-Host "Running backend coverage..."
    docker compose exec -e XDEBUG_MODE=coverage php composer test:coverage
    if ($LASTEXITCODE -ne 0) {
        $backendOk = $false
    }
}

if (-not $SkipFront) {
    Write-Host "Running frontend coverage..."
    Push-Location "odos-front"
    try {
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm test:coverage
        } else {
            npm run test:coverage
        }
        if ($LASTEXITCODE -ne 0) {
            $frontendOk = $false
        }
    } finally {
        Pop-Location
    }
}

Write-Host "Coverage reports generated:"
if (-not $SkipBack) {
    Write-Host " - Backend HTML: odos-back/var/coverage/html/index.html"
    Write-Host " - Backend Clover: odos-back/var/coverage/clover.xml"
}
if (-not $SkipFront) {
    Write-Host " - Frontend HTML: odos-front/coverage/lcov-report/index.html"
    Write-Host " - Frontend LCOV: odos-front/coverage/lcov.info"
}

Write-Host "Status:"
if (-not $SkipBack) { Write-Host " - Backend coverage: $backendOk" }
if (-not $SkipFront) { Write-Host " - Frontend coverage: $frontendOk" }

if ((-not $SkipBack -and -not $backendOk) -or (-not $SkipFront -and -not $frontendOk)) {
    exit 1
}
