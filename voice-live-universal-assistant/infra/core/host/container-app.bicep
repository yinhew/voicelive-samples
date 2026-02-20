param name string
param location string
param tags object
param containerAppsEnvironmentId string
param containerRegistryName string
param containerImage string
param targetPort int
param env array = []
param secrets array = []
param enableIngress bool = true
param external bool = true

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' existing = {
  name: containerRegistryName
}

// Use ACR admin credentials for image pull (avoids RBAC timing issues during initial provision)
var acrSecrets = [
  {
    name: 'acr-password'
    value: containerRegistry.listCredentials().passwords[0].value
  }
]

resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: name
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: enableIngress ? {
        external: external
        targetPort: targetPort
        transport: 'auto'
        allowInsecure: false
      } : null
      registries: [
        {
          server: containerRegistry.properties.loginServer
          username: containerRegistry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: concat(acrSecrets, secrets)
    }
    template: {
      containers: [
        {
          name: 'main'
          image: containerImage
          env: env
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 3
      }
    }
  }
}

output id string = containerApp.id
output name string = containerApp.name
output fqdn string = enableIngress ? containerApp.properties.configuration.ingress.fqdn : ''
output identityPrincipalId string = containerApp.identity.principalId
