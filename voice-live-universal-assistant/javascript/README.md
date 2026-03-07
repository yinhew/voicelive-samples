# Voice Live Universal Assistant — JavaScript Backend

Node.js (Express) backend for the Voice Live Universal Assistant, using the `@azure/ai-voicelive` SDK (1.0.0-beta.3).

## Prerequisites

- Node.js 20+
- Azure Voice Live resource with endpoint URL
- Azure CLI logged in (`az login`) or an API key

## Quick Start

```bash
cd javascript

# Install dependencies
npm install

# Configure environment
cp .env.sample .env
# Edit .env with your Azure Voice Live endpoint and credentials

# Run the server
npm start
# Or with auto-reload:
npm run dev
```

Open the frontend at `http://localhost:8000`

## Architecture

The JavaScript backend replicates the same WebSocket API contract as the [Python backend](../python/):

```
Frontend (React+Vite) → WebSocket → app.js → voiceHandler.js → Azure Voice Live SDK
```

| File | Purpose |
|------|---------|
| `app.js` | Express server, REST endpoints, WebSocket routing, static serving, CORS |
| `voiceHandler.js` | SDK bridge — VoiceLive client/session management, event handling |

The JavaScript backend follows SDK-idiomatic patterns using a `VoiceHandler` class with typed
builder methods that return the appropriate SDK configuration objects:

- `_getVoice()` → `{ type: "azure-standard"|"openai", name }` voice config
- `_getTurnDetection()` → VAD config object
- `_getTranscriptionOptions()` → transcription config (model mode only)
- `_getInterimResponseConfig()` → interim response config or `null`
- `_buildModelSessionConfig()` → full session config for model mode (includes transcription, temperature, instructions)
- `_buildAgentSessionConfig()` → leaner session config for agent mode (voice, VAD, echo/noise, interim response only)

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

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /config` | Server configuration (mode, model, voice, etc.) |
| `GET /languages` | Available STT locales |

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

# Run JavaScript backend
cd javascript
cp .env.sample .env
# Edit .env with your endpoint
npm install
npm run dev
```

The server serves the built frontend from `./static/` or `../frontend/dist/`.

## Notes

No JavaScript-specific limitations at this time. All frontend features are supported.
