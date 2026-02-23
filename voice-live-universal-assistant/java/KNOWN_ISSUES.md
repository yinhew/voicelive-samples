# Known Issues — Java Backend (azure-ai-voicelive 1.0.0-beta.5)

This document tracks known gaps and workarounds in the Java backend implementation.

## Resolved in 1.0.0-beta.5

The following issues from beta.4 have been resolved:

- ✅ **Interim Response** — `LlmInterimResponseConfig`, `StaticInterimResponseConfig`, and `InterimResponseTrigger` are now available. The backend fully supports interim response configuration from the frontend.
- ✅ **Agent Configuration** — `AgentSessionConfig` with `client.startSession(agentConfig)` replaces the model-mode fallback. Agent name, project, version, conversation ID, and Foundry resource override are now sent to the service.
- ✅ **Pre-generated Greeting** — Raw JSON workaround is retained for pre-generated greetings as the typed API still does not accept `ResponseCreateParams` with `pre_generated_assistant_message`. This is a minor convenience gap, not a functional limitation.

## Remaining Issues

### 1. .env File Loading

**Issue:** Java doesn't have a built-in `dotenv` equivalent. The Python backend uses `python-dotenv`.

**Impact:** The `Application.loadDotEnv()` method provides a simple `.env` file parser that sets values as system properties (not environment variables).

**Workaround:** Environment variable lookups check `System.getenv()` first, then fall back to `System.getProperty()` (set by the `.env` loader). For production, set environment variables directly.

### 2. Netty Version Mismatch Warning

**Issue:** Spring Boot 3.3.6 bundles Netty 4.1.115.Final, while the Azure SDK wants 4.1.130.Final.

**Impact:** A warning is logged at startup but has no runtime impact.

**Workaround:** Ignore the warning. Alternatively, override Netty version in `pom.xml` if needed.
