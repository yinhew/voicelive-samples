<#
.SYNOPSIS
    Post-provision hook — assigns RBAC roles to the Container App managed identity.
    When Foundry is provisioned, also assigns Azure AI Developer role for Foundry access.
    Using a hook (not Bicep) for RBAC avoids re-provision failures when assignments already exist.
#>
param()

$ErrorActionPreference = "Stop"

Write-Host "===== Post-Provision: RBAC Assignment ====="

$principalId = azd env get-value WEB_IDENTITY_PRINCIPAL_ID 2>$null
$subscriptionId = azd env get-value AZURE_SUBSCRIPTION_ID 2>$null
$createFoundry = azd env get-value CREATE_FOUNDRY 2>$null
$createAgent = azd env get-value CREATE_AGENT 2>$null
$foundryAccountName = azd env get-value FOUNDRY_ACCOUNT_NAME 2>$null
$rgName = azd env get-value AZURE_RESOURCE_GROUP_NAME 2>$null

# createAgent implies createFoundry
$effectiveCreateFoundry = ($createFoundry -eq "true") -or ($createAgent -eq "true")

if (-not $principalId) {
    Write-Host "Container App identity not available yet -- skipping RBAC."
    exit 0
}

# Cognitive Services User -- allows DefaultAzureCredential to authenticate to Voice Live API
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
    Write-Host "  [OK] Cognitive Services User role assigned"
} else {
    Write-Host "  [SKIP] Role assignment may already exist (safe to ignore)"
}

# When Foundry was provisioned, also assign Azure AI Developer for agent/model access
if ($effectiveCreateFoundry -and $foundryAccountName) {
    Write-Host ""
    Write-Host "===== Foundry RBAC: Azure AI Developer ====="

    $aiDeveloperRole = "64702f94-c441-49e6-a78b-ef80e0188fee"
    $accountScope = "/subscriptions/$subscriptionId/resourceGroups/$rgName/providers/Microsoft.CognitiveServices/accounts/$foundryAccountName"

    Write-Host "  Scope: $accountScope"

    az role assignment create `
        --assignee-object-id $principalId `
        --assignee-principal-type ServicePrincipal `
        --role $aiDeveloperRole `
        --scope $accountScope `
        --output none 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Azure AI Developer role assigned on Foundry account"
    } else {
        Write-Host "  [SKIP] Role assignment may already exist (safe to ignore)"
    }
}

Write-Host "===== Post-Provision Complete ====="
