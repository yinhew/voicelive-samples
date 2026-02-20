<#
.SYNOPSIS
    Build container image via ACR cloud build and update the Container App.
    Works without local Docker — uses 'az acr build' for remote builds.
#>
param()

$ErrorActionPreference = "Stop"

# Read azd env values
$acrName = azd env get-value AZURE_CONTAINER_REGISTRY_NAME 2>$null
$envName = azd env get-value AZURE_ENV_NAME 2>$null
$rgName = azd env get-value AZURE_RESOURCE_GROUP_NAME 2>$null
$appName = azd env get-value AZURE_CONTAINER_APP_NAME 2>$null

if (-not $acrName) {
    Write-Host "ACR not provisioned yet — run 'azd provision' first."
    exit 1
}

$loginServer = (az acr show --name $acrName --query loginServer --output tsv 2>$null)
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$imageTag = "$loginServer/voicelive-web:${envName}-${timestamp}"

Write-Host "===== Building Container Image ====="
Write-Host "  ACR:   $acrName"
Write-Host "  Image: $imageTag"
Write-Host ""

# Try local Docker first, fall back to ACR cloud build
$dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
$dockerRunning = $false
if ($dockerAvailable) {
    docker info *>$null
    $dockerRunning = ($LASTEXITCODE -eq 0)
}

if ($dockerRunning) {
    Write-Host "Using local Docker build..."
    docker build -t $imageTag .
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

    Write-Host "Pushing to ACR..."
    az acr login --name $acrName
    docker push $imageTag
    if ($LASTEXITCODE -ne 0) { throw "Docker push failed" }
} else {
    Write-Host "Using ACR cloud build (no local Docker required)..."
    az acr build --registry $acrName --image "voicelive-web:${envName}-${timestamp}" . 2>&1
    if ($LASTEXITCODE -ne 0) { throw "ACR cloud build failed" }
}

# Update Container App with the new image
Write-Host ""
Write-Host "===== Updating Container App ====="
Write-Host "  App:   $appName"
Write-Host "  Image: $imageTag"

az containerapp update `
    --name $appName `
    --resource-group $rgName `
    --image $imageTag 2>&1
if ($LASTEXITCODE -ne 0) { throw "Container App update failed" }

Write-Host ""
Write-Host "===== Deploy Complete ====="
$fqdn = az containerapp show --name $appName --resource-group $rgName --query "properties.configuration.ingress.fqdn" --output tsv 2>$null
Write-Host "  URL: https://$fqdn"
