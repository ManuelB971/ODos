param(
    [string]$OutputDir = "deliverables/siem"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$savedObjectsFile = Join-Path $OutputDir "saved-objects-$timestamp.ndjson"
$wazuhApisFile = Join-Path $OutputDir "wazuh-apis-$timestamp.json"
$localRulesFile = Join-Path $OutputDir "local_rules-$timestamp.xml"
$localDecodersFile = Join-Path $OutputDir "local_decoder-$timestamp.xml"
$exportRequestFile = Join-Path $OutputDir "saved-objects-export-request-$timestamp.json"

Write-Host "Export SIEM assets to $OutputDir"

# OpenSearch Dashboards saved objects export (dashboards/visualizations/index patterns/searches)
$exportBody = @{
    type                = @("dashboard", "visualization", "index-pattern", "search", "query")
    includeReferencesDeep = $true
} | ConvertTo-Json -Depth 4 -Compress

$exportBody | Out-File -Encoding ascii $exportRequestFile

curl.exe -sS `
  -X POST "http://localhost:5601/api/saved_objects/_export" `
  -H "osd-xsrf: true" `
  -H "content-type: application/json" `
  --data-binary "@$exportRequestFile" `
  --output $savedObjectsFile

# Wazuh API entries known by dashboard plugin
curl.exe -sS "http://localhost:5601/hosts/apis" | Out-File -Encoding ascii $wazuhApisFile

# Wazuh local rules/decoders from manager container
docker compose -f "docker-compose.yml" -f "docker-compose.override.yml" -f "docker-compose.wazuh.yml" `
  exec -T wazuh.manager sh -lc "cat /var/ossec/etc/rules/local_rules.xml" `
  | Out-File -Encoding ascii $localRulesFile

docker compose -f "docker-compose.yml" -f "docker-compose.override.yml" -f "docker-compose.wazuh.yml" `
  exec -T wazuh.manager sh -lc "cat /var/ossec/etc/decoders/local_decoder.xml" `
  | Out-File -Encoding ascii $localDecodersFile

Write-Host "Done:"
Write-Host " - $savedObjectsFile"
Write-Host " - $wazuhApisFile"
Write-Host " - $localRulesFile"
Write-Host " - $localDecodersFile"
