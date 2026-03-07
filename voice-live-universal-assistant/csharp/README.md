# Voice Live Universal Assistant — C# Backend

ASP.NET Core backend for the Voice Live Universal Assistant, implementing the same WebSocket API contract as the [Python](../python/) and [Java](../java/) backends using the [`Azure.AI.VoiceLive`](https://www.nuget.org/packages/Azure.AI.VoiceLive) .NET SDK (1.1.0-beta.3).

## Prerequisites

- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- An Azure AI Services resource with Voice Live API access
- Azure CLI (`az login`) for DefaultAzureCredential, or an API key

## Quick Start

```bash
cd csharp

# Configure environment
cp .env.sample .env
# Edit .env with your Azure Voice Live endpoint and credentials

# Restore packages
dotnet restore

# Build the frontend (if not already done)
cd ../frontend && npm ci && npm run build && cd ../csharp

# Run the server
dotnet run
```

The server starts on **http://localhost:8000**. Open this URL in your browser to access the React frontend.

## Architecture

The C# backend replicates the same WebSocket API contract as the [Python backend](../python/):

```
Frontend (React+Vite) → WebSocket → Program.cs → VoiceLiveHandler.cs → Azure Voice Live SDK
```

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

## WebSocket Protocol

Connect to `ws://localhost:8000/ws/{clientId}` and exchange JSON messages:

**Client → Server:**
- `{ "type": "start_session", "mode": "model", "model": "gpt-realtime", ... }` — start voice session
- `{ "type": "audio_chunk", "data": "<base64 PCM16>" }` — stream microphone audio
- `{ "type": "interrupt" }` — cancel current response
- `{ "type": "stop_session" }` — end session

**Server → Client:**
- `{ "type": "session_started", "config": { ... } }`
- `{ "type": "audio_data", "data": "<base64 PCM16>", "sampleRate": 24000 }`
- `{ "type": "transcript", "role": "user"|"assistant", "text": "...", "isFinal": bool }`
- `{ "type": "status", "state": "listening"|"thinking"|"speaking" }`
- `{ "type": "stop_playback" }`
- `{ "type": "session_stopped" }`
- `{ "type": "error", "message": "..." }`

## REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/config` | GET | Server configuration (from env vars) |
| `/languages` | GET | Available STT locales |

## Connection Modes

Set `VOICELIVE_MODE` in `.env`:

| Mode    | Description                                      |
|---------|--------------------------------------------------|
| `model` | Connects directly to a model (e.g. gpt-realtime) — default |
| `agent` | Connects via Foundry Agent Service               |

## Settings

All settings are configurable from the frontend UI. Default values can be set via `.env`:

| Setting | Env Variable | Default |
|---------|-------------|---------|
| Mode | `VOICELIVE_MODE` | `model` |
| Model | `VOICELIVE_MODEL` | `gpt-realtime` |
| Voice | `VOICELIVE_VOICE` | `en-US-Ava:DragonHDLatestNeural` |
| Temperature | `VOICELIVE_TEMPERATURE` | `0.7` |
| VAD Type | `VOICELIVE_VAD_TYPE` | `azure_semantic` |
| Instructions | `VOICELIVE_INSTRUCTIONS` | _(empty)_ |
| Agent Name | `AZURE_VOICELIVE_AGENT_NAME` | _(required for agent mode)_ |
| Project | `AZURE_VOICELIVE_PROJECT` | _(required for agent mode)_ |

## Local Development

Build the frontend first, then run the backend:

```bash
# Build frontend (from repo root)
cd frontend && npm install && npm run build && cd ..

# Run C# backend
cd csharp
cp .env.sample .env
# Edit .env with your endpoint
dotnet run
```

The server serves the built frontend from `wwwroot/` or `../frontend/dist/`.

## Docker

```bash
# From the project root (voice-live-universal-assistant/)
docker build -f Dockerfile.csharp -t voicelive-csharp .
docker run -p 8000:8000 --env-file csharp/.env voicelive-csharp
```

## Notes

No C#-specific limitations at this time. All frontend features are supported.
