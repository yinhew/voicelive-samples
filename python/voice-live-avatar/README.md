# Voice Live Avatar - Python Sample

A Python implementation of the Voice Live Avatar sample. The **Voice Live SDK logic runs entirely on the server side** (Python/FastAPI), while the browser handles UI, audio capture/playback, and WebRTC avatar rendering.

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────┐         ┌──────────────────┐
│    Browser (Frontend)   │◄──WS───►│  Python Server (FastAPI)│◄──SDK──►│ Azure Voice Live │
│                         │         │                         │         │     Service      │
│  • Audio capture (mic)  │         │  • Session management   │         └──────────────────┘
│  • Audio playback       │         │  • Voice Live SDK calls │                  │
│  • WebRTC avatar video  │◄──WebRTC (peer-to-peer video)────────────────────────┘
│  • Settings UI          │         │  • Event relay          │
│  • Chat messages        │         │  • Avatar SDP relay     │
└─────────────────────────┘         └─────────────────────────┘
```

**Key design:** The Python backend acts as a bridge between the browser and Azure Voice Live service. All SDK operations (session creation, configuration, audio forwarding, event processing) happen in Python. The browser only handles:
- Microphone capture → sends PCM16 audio via WebSocket
- Audio playback ← receives PCM16 audio via WebSocket  
- WebRTC signaling relay for avatar video (SDP offer/answer exchanged through Python backend)
- Avatar video rendering via direct WebRTC peer connection to Azure

## Prerequisites

- Python 3.10+
- Azure AI Services resource with Voice Live API access
- API key or Azure Identity credentials

## Setup

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**

   Copy `.env.sample` to `.env` and fill in your Azure credentials:

   ```bash
   cp .env.sample .env
   # Edit .env with your values
   ```

   Required:
   - `AZURE_VOICELIVE_ENDPOINT` - Your Azure AI Services endpoint
   - `AZURE_VOICELIVE_API_KEY` - Your API key (or use DefaultAzureCredential)

   Optional:
   - `VOICELIVE_MODEL` - Model to use (default: `gpt-4o-realtime`)
   - `VOICELIVE_VOICE` - Voice name (default: `en-US-AvaMultilingualNeural`)

3. **Run the server:**

   ```bash
   python app.py
   ```

   Or with uvicorn directly:

   ```bash
   uvicorn app:app --host 0.0.0.0 --port 3000 --reload
   ```

4. **Open the browser:**

   Navigate to `http://localhost:3000`

## Features

- **Avatar support** - Pre-built avatars, photo avatars (VASA-1), and custom avatars via WebRTC
- **Voice configuration** - Standard Azure voices, DragonHD voices, OpenAI voices, custom and personal voices
- **Turn detection** - Server VAD and Azure Semantic VAD with end-of-utterance detection
- **Speech recognition** - Azure Speech and MAI Ears models with language selection
- **Multiple modes** - Model mode (direct LLM), Agent by ID, Agent by Name
- **Developer mode** - Toggle between simple mic UI and full chat interface with text input
- **Noise suppression & echo cancellation** - Server-side audio processing
- **Proactive greeting** - Auto-generates greeting when session starts

## WebSocket Protocol

### Frontend → Backend

| Message Type | Description |
|---|---|
| `start_session` | Start Voice Live session with configuration |
| `stop_session` | Stop the active session |
| `audio_chunk` | Send microphone audio (base64 PCM16) |
| `send_text` | Send a text message |
| `avatar_sdp_offer` | Forward WebRTC SDP offer for avatar |
| `interrupt` | Cancel current assistant response |

### Backend → Frontend

| Message Type | Description |
|---|---|
| `session_started` | Session ready |
| `session_error` | Error starting/during session |
| `ice_servers` | ICE server config for avatar WebRTC |
| `avatar_sdp_answer` | Server's SDP answer for avatar WebRTC |
| `audio_data` | Assistant audio (base64 PCM16, 24kHz) |
| `transcript_delta` | Streaming transcript text |
| `transcript_done` | Completed transcript |
| `response_created` | New response started |
| `response_done` | Response completed |
| `speech_started` | User started speaking (barge-in) |
| `speech_stopped` | User stopped speaking |
| `stop_playback` | Stop audio playback |

## Project Structure

```
voice-live-avatar/
├── app.py              # FastAPI server, WebSocket endpoint, static file serving
├── voice_handler.py    # Voice Live SDK session management, event processing
├── requirements.txt    # Python dependencies
├── .env.sample         # Environment variable template
├── README.md           # This file
└── static/
    ├── index.html      # Main UI page
    ├── style.css       # Styles
    └── app.js          # Client-side JS (audio, WebRTC, WebSocket, UI)
```
