# Hook Stop : lance les tests front + back à la fin de chaque tâche.
# Exit 2 = bloque l'arrêt de Claude et lui renvoie la sortie d'erreur pour qu'il corrige.
$ErrorActionPreference = 'Continue'

# Racine du projet : .claude/hooks -> .claude -> racine
$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR }
        else { Split-Path -Parent (Split-Path -Parent $PSScriptRoot) }

# Lit l'entrée du hook ; si on est déjà dans une continuation déclenchée par ce hook,
# on laisse Claude s'arrêter pour éviter une boucle infinie sur un échec qu'il ne peut pas corriger.
$raw = [Console]::In.ReadToEnd()
try { $data = $raw | ConvertFrom-Json } catch { $data = $null }
if ($data -and $data.stop_hook_active) { exit 0 }

$failures = @()

# --- Frontend : Jest ---
Push-Location (Join-Path $root 'odos-front')
$frontOut = pnpm test:ci 2>&1 | Out-String
$frontCode = $LASTEXITCODE
Pop-Location
if ($frontCode -ne 0) {
    $failures += "### Frontend (pnpm test:ci) a échoué`n$frontOut"
}

# --- Backend : PHPUnit via Docker ---
# Si le conteneur php n'est pas démarré, on saute (environnement éteint != tests cassés).
Push-Location $root
$phpId = (docker compose ps -q php 2>$null | Out-String).Trim()
if ([string]::IsNullOrWhiteSpace($phpId)) {
    [Console]::Error.WriteLine("[hook] Backend sauté : conteneur php non démarré (docker compose up -d).")
} else {
    $backOut = docker compose exec -T php composer test 2>&1 | Out-String
    $backCode = $LASTEXITCODE
    if ($backCode -ne 0) {
        $failures += "### Backend (docker compose exec php composer test) a échoué`n$backOut"
    }
}
Pop-Location

if ($failures.Count -gt 0) {
    [Console]::Error.WriteLine("Les tests doivent passer avant de terminer la tâche. Corrige puis relance.`n`n" + ($failures -join "`n`n"))
    exit 2
}

exit 0
