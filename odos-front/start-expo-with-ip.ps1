# start-expo-with-ip.ps1
$ip = Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred |
      Where-Object { $_.IPAddress -notmatch '^169\.|^127\.' -and $_.InterfaceAlias -notmatch 'vEthernet|Docker|Virtual' } |
      Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
  Write-Error 'No LAN IP found. Connect to a network and retry.'
  exit 1
}

$port = 8000 # changez si votre backend écoute un autre port
$env:EXPO_PUBLIC_API_URL = \"http://$ip:$port\"
Write-Host \"EXPO_PUBLIC_API_URL set to $env:EXPO_PUBLIC_API_URL\"
pnpm expo start --lan