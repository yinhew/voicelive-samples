<#
.SYNOPSIS
    Post-deploy hook — creates a Foundry Agent with Voice Live configuration.
    Only runs when createAgent=true. Uses the Python SDK to create the agent.
    After agent creation, updates the Container App env vars to point to the new agent.
#>
param()

$ErrorActionPreference = "Stop"

$createAgent = azd env get-value CREATE_AGENT 2>$null

if ($createAgent -ne "true") {
    Write-Host "createAgent is not enabled -- skipping agent creation."
    exit 0
}

Write-Host "===== Post-Deploy: Agent Creation ====="

$projectEndpoint = azd env get-value FOUNDRY_PROJECT_ENDPOINT 2>$null
$agentName = azd env get-value AGENT_NAME 2>$null
$modelDeploymentName = azd env get-value AGENT_MODEL_DEPLOYMENT_NAME 2>$null
$appName = azd env get-value AZURE_CONTAINER_APP_NAME 2>$null
$rgName = azd env get-value AZURE_RESOURCE_GROUP_NAME 2>$null

if (-not $projectEndpoint) {
    Write-Host "ERROR: FOUNDRY_PROJECT_ENDPOINT not set. createAgent implies createFoundry."
    exit 1
}

if (-not $agentName) {
    $agentName = "voicelive-assistant"
    Write-Host "  No AGENT_NAME set -- using default: $agentName"
}

if (-not $modelDeploymentName) {
    $modelDeploymentName = "gpt-4.1-mini"
}

Write-Host "  Project:    $projectEndpoint"
Write-Host "  Agent:      $agentName"
Write-Host "  Model:      $modelDeploymentName"
Write-Host ""

# Ensure Python dependencies for agent creation
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)

Write-Host "Installing Python dependencies..."
pip install azure-ai-projects azure-identity --quiet 2>$null

# Run the agent creation script
$createAgentScript = Join-Path $repoRoot "deployment" "scripts" "create_agent.py"

$env:PROJECT_ENDPOINT = $projectEndpoint
$env:AGENT_NAME = $agentName
$env:MODEL_DEPLOYMENT_NAME = $modelDeploymentName

Write-Host "Creating agent..."
python $createAgentScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Agent creation failed."
    exit 1
}

# Store agent name in azd env for subsequent deploys
azd env set AZURE_VOICELIVE_AGENT_NAME $agentName 2>$null

# Update Container App env vars so the running app knows the agent name
if ($appName -and $rgName) {
    Write-Host ""
    Write-Host "Updating Container App environment variables..."
    az containerapp update `
        --name $appName `
        --resource-group $rgName `
        --set-env-vars "AZURE_VOICELIVE_AGENT_NAME=$agentName" "VOICELIVE_MODE=agent" `
        --output none 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Container App env vars updated (agent=$agentName, mode=agent)"
    } else {
        Write-Host "  [SKIP] Could not update Container App env vars (non-fatal)"
    }
}

Write-Host ""
Write-Host "===== Agent Creation Complete ====="
Write-Host "  Agent '$agentName' is ready for use in agent mode."
