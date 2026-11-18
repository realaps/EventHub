# Manual Blue-Green helper for Windows PowerShell (for demos and viva).
# Usage (run from the EventHub folder):
#   .\scripts\bluegreen.ps1 status
#   .\scripts\bluegreen.ps1 switch green     # go live with green
#   .\scripts\bluegreen.ps1 switch blue      # rollback to blue
param(
  [Parameter(Mandatory = $true)][ValidateSet('status', 'switch')][string]$Action,
  [ValidateSet('blue', 'green')][string]$Color
)
$ErrorActionPreference = 'Stop'

function Show-Status {
  $live = kubectl get service eventhub-bg -o jsonpath="{.spec.selector.track}"
  Write-Host "LIVE colour: $live   (http://localhost:30090)" -ForegroundColor Cyan
  kubectl get deployments,pods -l app=eventhub-bg -L track
  try { curl.exe -fsS http://localhost:30090/api/health; Write-Host "" } catch { Write-Warning 'Live URL not reachable' }
}

if ($Action -eq 'status') { Show-Status; exit 0 }

if (-not $Color) { throw 'Give a colour: .\scripts\bluegreen.ps1 switch green' }

Write-Host "Checking that eventhub-$Color is healthy before switching..." -ForegroundColor Yellow
kubectl rollout status "deployment/eventhub-$Color" --timeout=60s
if ($LASTEXITCODE -ne 0) { throw "eventhub-$Color is not ready - not switching." }

kubectl patch service eventhub-bg --patch-file "k8s/blue-green/patches/patch-$Color.yaml"
if ($LASTEXITCODE -ne 0) { throw 'Patch failed.' }
Start-Sleep -Seconds 2
Show-Status
