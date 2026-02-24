# Voice Live Universal Assistant — C# Backend

ASP.NET Core backend for the Voice Live Universal Assistant, implementing the same WebSocket API contract as the [Python](../python/) and [Java](../java/) backends using the [`Azure.AI.VoiceLive`](https://www.nuget.org/packages/Azure.AI.VoiceLive) .NET SDK.

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- An Azure AI Services resource with Voice Live API access
- Azure CLI (`az login`) for DefaultAzureCredential, or an API key

## Quick start

```bash
# 1. Copy and configure .env
cp .env.sample .env
# Edit .env with your endpoint and credentials

# 2. Restore packages
dotnet restore

# 3. Build the frontend (if not already done)
cd ../frontend && npm ci && npm run build && cd ../csharp

# 4. Run the server
dotnet run
```

The server starts on **http://localhost:8000**. Open this URL in your browser to access the React frontend.

## Project structure

| File | Description |
|------|-------------|
| `Program.cs` | ASP.NET Core minimal API — REST endpoints, WebSocket middleware, static file serving |
| `VoiceLiveHandler.cs` | VoiceLive SDK bridge — manages a single session per WebSocket client |
| `SessionConfig.cs` | Configuration POCO — mirrors frontend UI settings |
| `.env.sample` | Environment variable template |

## Authentication

The backend supports two authentication methods:

1. **DefaultAzureCredential** (recommended) — uses `az login`, managed identity, or other Azure Identity sources
2. **API key** — set `AZURE_VOICELIVE_API_KEY` in your `.env` file

## API contract

### REST endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/config` | GET | Server configuration (from env vars) |
| `/languages` | GET | Available STT locales |

### WebSocket endpoint

`ws://localhost:8000/ws/{clientId}`

**Client → Server messages:** `start_session`, `stop_session`, `audio_chunk`, `interrupt`

**Server → Client messages:** `session_started`, `session_stopped`, `status`, `audio_data`, `transcript`, `stop_playback`, `error`

## Docker

```bash
# From the project root (voice-live-universal-assistant/)
docker build -f Dockerfile.csharp -t voicelive-csharp .
docker run -p 8000:8000 --env-file csharp/.env voicelive-csharp
```

## Modes

- **Model mode** (default): Direct gpt-realtime with full configuration control
- **Agent mode**: Uses Azure AI Foundry Agent Service — set `VOICELIVE_MODE=agent` and configure agent name/project
