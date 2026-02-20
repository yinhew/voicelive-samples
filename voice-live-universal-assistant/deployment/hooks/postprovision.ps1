<#
.SYNOPSIS
    Post-provision hook — assigns RBAC roles to the Container App managed identity.
    Using a hook (not Bicep) for RBAC avoids re-provision failures when assignments already exist.
#>
param()

$ErrorActionPreference = "Stop"

Write-Host "===== Post-Provision: RBAC Assignment ====="

$principalId = azd env get-value WEB_IDENTITY_PRINCIPAL_ID 2>$null
$subscriptionId = azd env get-value AZURE_SUBSCRIPTION_ID 2>$null

if (-not $principalId) {
    Write-Host "Container App identity not available yet — skipping RBAC."
    exit 0
}

# Cognitive Services User — allows DefaultAzureCredential to authenticate to Voice Live API
$cogServicesUserRole = "a97b65f3-24c7-4388-baec-2e87135dc908"

Write-Host "Assigning Cognitive Services User role to managed identity..."
Write-Host "  Principal: $principalId"

az role assignment create `
    --assignee-object-id $principalId `
    --assignee-principal-type ServicePrincipal `
    --role $cogServicesUserRole `
    --scope "/subscriptions/$subscriptionId" `
    --output none 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Cognitive Services User role assigned"
} else {
    Write-Host "  ⚠ Role assignment may already exist (safe to ignore)"
}

Write-Host "===== Post-Provision Complete ====="
