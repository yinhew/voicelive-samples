# Known Issues — Java Backend (azure-ai-voicelive 1.0.0-beta.5)

This document tracks known gaps and workarounds in the Java backend implementation.

## 1. API Version Pinning (Critical)

**Issue:** `VoiceLiveServiceVersion.getLatest()` returns `V2025_10_01` (GA), not the preview version.

**Impact:** Agent mode fails with `"Failed to initialize AI agent"`. Interim response and pre-generated greeting also break without the preview API.

**Workaround:** The backend explicitly sets `.serviceVersion(VoiceLiveServiceVersion.V2026_01_01_PREVIEW)` on the `VoiceLiveClientBuilder`. This will be removable once the SDK defaults to the correct version.

## 2. .env File Loading

**Issue:** Java doesn't have a built-in `dotenv` equivalent. The Python backend uses `python-dotenv`.

**Impact:** The `Application.loadDotEnv()` method provides a simple `.env` file parser that sets values as system properties (not environment variables).

**Workaround:** Environment variable lookups check `System.getenv()` first, then fall back to `System.getProperty()` (set by the `.env` loader). For production, set environment variables directly.

## 3. Netty Version Mismatch Warning

**Issue:** Spring Boot 3.3.6 bundles Netty 4.1.115.Final, while the Azure SDK wants 4.1.130.Final.

**Impact:** A warning is logged at startup but has no runtime impact.

**Workaround:** Ignore the warning. Alternatively, override Netty version in `pom.xml` if needed.
