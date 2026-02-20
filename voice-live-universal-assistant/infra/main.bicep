targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment (e.g., dev, prod)')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Azure Voice Live API endpoint')
param voiceLiveEndpoint string = ''

@secure()
@description('Azure Voice Live API key')
param voiceLiveApiKey string = ''

@description('Connection mode: agent or model')
@allowed(['agent', 'model'])
param voiceLiveMode string = 'agent'

@description('Agent name for Foundry Agent Service (agent mode)')
param voiceLiveAgentName string = ''

@description('Project name for Foundry Agent Service (agent mode)')
param voiceLiveProject string = ''

@description('Model name for direct model access (model mode)')
param voiceLiveModel string = 'gpt-realtime'

@description('Voice name for TTS')
param voiceLiveVoice string = 'en-US-Ava:DragonHDLatestNeural'

@description('Voice type: openai or azure-standard')
@allowed(['openai', 'azure-standard'])
param voiceLiveVoiceType string = 'azure-standard'

@description('Transcription model')
param voiceLiveTranscribeModel string = 'gpt-4o-transcribe'

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
  'app-name': 'voicelive-web-sample'
}

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

module infrastructure 'main-infrastructure.bicep' = {
  name: 'infrastructure'
  scope: rg
  params: {
    location: location
    tags: tags
    resourceToken: resourceToken
  }
}

module app 'main-app.bicep' = {
  name: 'app'
  scope: rg
  params: {
    location: location
    tags: tags
    resourceToken: resourceToken
    containerAppsEnvironmentId: infrastructure.outputs.containerAppsEnvironmentId
    containerRegistryName: infrastructure.outputs.containerRegistryName
    voiceLiveEndpoint: voiceLiveEndpoint
    voiceLiveApiKey: voiceLiveApiKey
    voiceLiveMode: voiceLiveMode
    voiceLiveAgentName: voiceLiveAgentName
    voiceLiveProject: voiceLiveProject
    voiceLiveModel: voiceLiveModel
    voiceLiveVoice: voiceLiveVoice
    voiceLiveVoiceType: voiceLiveVoiceType
    voiceLiveTranscribeModel: voiceLiveTranscribeModel
  }
}

output AZURE_CONTAINER_REGISTRY_ENDPOINT string = infrastructure.outputs.containerRegistryLoginServer
output AZURE_CONTAINER_REGISTRY_NAME string = infrastructure.outputs.containerRegistryName
output AZURE_CONTAINER_APPS_ENVIRONMENT_ID string = infrastructure.outputs.containerAppsEnvironmentId
output AZURE_RESOURCE_GROUP_NAME string = rg.name
output AZURE_CONTAINER_APP_NAME string = app.outputs.webAppName
output WEB_ENDPOINT string = app.outputs.webEndpoint
output WEB_IDENTITY_PRINCIPAL_ID string = app.outputs.webIdentityPrincipalId
