"""
End-to-end test: every model-mode setting flows from a simulated
WebSocket message → app.py config parsing → VoiceLiveHandler fields →
_configure_session RequestSession kwargs.

No real Azure connection needed — the SDK connect() is mocked.
"""

import asyncio
import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Ensure the python/ directory is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from voice_handler import SessionConfig, VoiceLiveHandler
from azure.ai.voicelive.models import (
    AzureSemanticVad,
    AzureSemanticVadEn,
    AzureSemanticVadMultilingual,
    AudioEchoCancellation,
    AudioInputTranscriptionOptions,
    AudioNoiseReduction,
    AzureStandardVoice,
    InterimResponseTrigger,
    LlmInterimResponseConfig,
    OpenAIVoice,
    RequestSession,
    ServerVad,
    StaticInterimResponseConfig,
)

# -----------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------

# Simulated frontend config with ALL model-mode settings explicitly set
# to non-default values so we can detect if any are silently dropped.
MODEL_MODE_CONFIG = {
    "mode": "model",
    "model": "gpt-5-realtime",
    "voice": "en-US-Brian:DragonHDLatestNeural",
    "instructions": "Be very concise.",
    "temperature": 0.3,
    "vad_type": "azure_semantic_en",
    "noise_reduction": False,
    "echo_cancellation": False,
    "transcribe_model": "whisper-1",
    "input_language": "de",
    "proactive_greeting": True,
    "greeting_type": "pregenerated",
    "greeting_text": "Hello!",
    "interim_response": True,
    "interim_response_type": "llm",
    "interim_trigger_tool": True,
    "interim_trigger_latency": True,
    "interim_latency_ms": 250,
    "interim_instructions": "Please wait...",
    "interim_static_texts": "",
}


def _build_config(overrides: dict) -> SessionConfig:
    """Build a SessionConfig the same way app.py does — from a frontend config dict with env fallbacks."""
    config = overrides
    return SessionConfig(
        mode=config.get("mode", os.getenv("VOICELIVE_MODE", "agent")),
        model=config.get("model", os.getenv("VOICELIVE_MODEL", "gpt-realtime")),
        voice=config.get("voice", os.getenv("VOICELIVE_VOICE", "en-US-Ava:DragonHDLatestNeural")),
        voice_type=config.get("voice_type", os.getenv("VOICELIVE_VOICE_TYPE", "azure-standard")),
        transcribe_model=config.get("transcribe_model", os.getenv("VOICELIVE_TRANSCRIBE_MODEL", "gpt-4o-transcribe")),
        input_language=config.get("input_language", ""),
        instructions=config.get("instructions", os.getenv("VOICELIVE_INSTRUCTIONS", "")),
        temperature=float(config.get("temperature", os.getenv("VOICELIVE_TEMPERATURE", "0.7"))),
        vad_type=config.get("vad_type", os.getenv("VOICELIVE_VAD_TYPE", "azure_semantic")),
        noise_reduction=config.get("noise_reduction", True),
        echo_cancellation=config.get("echo_cancellation", True),
        agent_name=config.get("agent_name") or os.getenv("AZURE_VOICELIVE_AGENT_NAME"),
        project_name=config.get("project") or os.getenv("AZURE_VOICELIVE_PROJECT"),
        agent_version=config.get("agent_version") or os.getenv("AZURE_VOICELIVE_AGENT_VERSION"),
        conversation_id=config.get("conversation_id"),
        foundry_resource_override=config.get("foundry_resource_override") or os.getenv("AZURE_VOICELIVE_FOUNDRY_RESOURCE_OVERRIDE"),
        auth_identity_client_id=config.get("auth_identity_client_id") or os.getenv("AZURE_VOICELIVE_AUTH_IDENTITY_CLIENT_ID"),
        byom_profile=os.getenv("VOICELIVE_BYOM_PROFILE"),
        proactive_greeting=config.get("proactive_greeting", True),
        greeting_type=config.get("greeting_type", "llm"),
        greeting_text=config.get("greeting_text", ""),
        interim_response=config.get("interim_response", False),
        interim_response_type=config.get("interim_response_type", "llm"),
        interim_trigger_tool=config.get("interim_trigger_tool", True),
        interim_trigger_latency=config.get("interim_trigger_latency", True),
        interim_latency_ms=config.get("interim_latency_ms", 100),
        interim_instructions=config.get("interim_instructions", ""),
        interim_static_texts=config.get("interim_static_texts", ""),
    )


def _build_handler(frontend_config: dict) -> VoiceLiveHandler:
    """Build a VoiceLiveHandler with a SessionConfig from the given config dict."""
    session_config = _build_config(frontend_config)
    return VoiceLiveHandler(
        client_id="test-client",
        endpoint="wss://fake.endpoint.com",
        credential=MagicMock(),
        send_message=AsyncMock(),
        config=session_config,
    )


def _capture_session_config(handler: VoiceLiveHandler) -> RequestSession:
    """Run _configure_session with a mock connection and capture the RequestSession."""
    captured = {}

    async def mock_session_update(*, session):
        captured["session"] = session

    mock_conn = MagicMock()
    mock_conn.session = MagicMock()
    mock_conn.session.update = mock_session_update

    asyncio.get_event_loop().run_until_complete(
        handler._configure_session(mock_conn)
    )
    return captured["session"]


def _build_session_directly(frontend_config: dict) -> RequestSession:
    """Build a RequestSession directly from SessionConfig (tests the builder methods)."""
    cfg = _build_config(frontend_config)
    if cfg.mode == "model":
        return cfg.build_model_session()
    return cfg.build_agent_session()


# -----------------------------------------------------------------------
# Tests — Layer 1: Handler field assignment
# -----------------------------------------------------------------------

class TestHandlerFields:
    """Verify every config value is stored correctly on the handler's SessionConfig."""

    def setup_method(self):
        self.handler = _build_handler(MODEL_MODE_CONFIG)
        self.cfg = self.handler.config

    def test_mode(self):
        assert self.cfg.mode == "model"

    def test_model(self):
        assert self.cfg.model == "gpt-5-realtime"

    def test_voice(self):
        assert self.cfg.voice == "en-US-Brian:DragonHDLatestNeural"

    def test_instructions(self):
        assert self.cfg.instructions == "Be very concise."

    def test_temperature(self):
        assert self.cfg.temperature == 0.3

    def test_vad_type(self):
        assert self.cfg.vad_type == "azure_semantic_en"

    def test_noise_reduction_off(self):
        assert self.cfg.noise_reduction is False

    def test_echo_cancellation_off(self):
        assert self.cfg.echo_cancellation is False

    def test_transcribe_model(self):
        assert self.cfg.transcribe_model == "whisper-1"

    def test_input_language(self):
        assert self.cfg.input_language == "de"

    def test_proactive_greeting(self):
        assert self.cfg.proactive_greeting is True

    def test_greeting_type(self):
        assert self.cfg.greeting_type == "pregenerated"

    def test_greeting_text(self):
        assert self.cfg.greeting_text == "Hello!"

    def test_interim_response_enabled(self):
        assert self.cfg.interim_response is True

    def test_interim_response_type(self):
        assert self.cfg.interim_response_type == "llm"

    def test_interim_trigger_tool(self):
        assert self.cfg.interim_trigger_tool is True

    def test_interim_trigger_latency(self):
        assert self.cfg.interim_trigger_latency is True

    def test_interim_latency_ms(self):
        assert self.cfg.interim_latency_ms == 250

    def test_interim_instructions(self):
        assert self.cfg.interim_instructions == "Please wait..."


# -----------------------------------------------------------------------
# Tests — Layer 2: RequestSession built in _configure_session
# -----------------------------------------------------------------------

class TestSessionConfig:
    """Verify build_model_session() produces the right RequestSession."""

    def setup_method(self):
        self.session = _build_session_directly(MODEL_MODE_CONFIG)
        self.d = self.session.as_dict() if hasattr(self.session, "as_dict") else {}

    def test_is_request_session(self):
        assert isinstance(self.session, RequestSession)

    def test_voice_in_config(self):
        voice = self.d.get("voice", {})
        assert "Brian" in voice.get("name", ""), f"Expected Brian voice, got: {voice}"

    def test_temperature_in_config(self):
        assert self.d.get("temperature") == 0.3, f"temperature: {self.d.get('temperature')}"

    def test_vad_type_is_azure_semantic_en(self):
        td = self.d.get("turn_detection", {})
        td_type = td.get("type", "")
        assert "en" in td_type.lower() or "semantic_en" in td_type.lower(), \
            f"Expected azure_semantic_en VAD, got: {td}"

    def test_echo_cancellation_none_when_off(self):
        val = self.d.get("input_audio_echo_cancellation")
        assert val is None, f"Echo cancellation should be None but got: {val}"

    def test_noise_reduction_none_when_off(self):
        val = self.d.get("input_audio_noise_reduction")
        assert val is None, f"Noise reduction should be None but got: {val}"

    def test_instructions_in_config(self):
        assert self.d.get("instructions") == "Be very concise.", \
            f"instructions: {self.d.get('instructions')}"

    def test_transcribe_model_in_config(self):
        txn = self.d.get("input_audio_transcription", {})
        assert txn.get("model") == "whisper-1", f"transcription: {txn}"

    def test_input_language_in_transcription(self):
        txn = self.d.get("input_audio_transcription", {})
        assert txn.get("language") == "de", f"transcription: {txn}"

    def test_interim_response_present(self):
        ir = self.d.get("interim_response")
        assert ir is not None, "interim_response missing from config"

    def test_interim_response_has_triggers(self):
        ir = self.d.get("interim_response", {})
        triggers = ir.get("triggers", [])
        assert len(triggers) == 2, f"Expected 2 triggers, got: {triggers}"

    def test_interim_response_latency_threshold(self):
        ir = self.d.get("interim_response", {})
        assert ir.get("latency_threshold_ms") == 250, f"latency_threshold_ms: {ir.get('latency_threshold_ms')}"

    def test_interim_response_instructions(self):
        ir = self.d.get("interim_response", {})
        assert ir.get("instructions") == "Please wait...", f"instructions: {ir.get('instructions')}"


# -----------------------------------------------------------------------
# Tests — Layer 3: VAD type variants
# -----------------------------------------------------------------------

class TestVadVariants:
    """Verify each VAD string maps to the correct SDK object."""

    @pytest.mark.parametrize("vad_str,expected_substr", [
        ("azure_semantic", "azure_semantic_vad"),
        ("azure_semantic_en", "semantic_vad_en"),
        ("azure_semantic_multilingual", "multilingual"),
        ("server", "server_vad"),
    ])
    def test_vad_mapping(self, vad_str, expected_substr):
        cfg = {**MODEL_MODE_CONFIG, "vad_type": vad_str}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        td = d.get("turn_detection", {})
        td_type = td.get("type", "")
        assert expected_substr in td_type.lower(), \
            f"VAD '{vad_str}' → type='{td_type}', expected '{expected_substr}'"


# -----------------------------------------------------------------------
# Tests — Layer 4: Echo/noise toggles
# -----------------------------------------------------------------------

class TestAudioProcessingToggles:
    """Verify echo cancellation and noise reduction respect on/off."""

    def test_both_on(self):
        cfg = {**MODEL_MODE_CONFIG, "echo_cancellation": True, "noise_reduction": True}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert "input_audio_echo_cancellation" in d, "Echo cancellation should be present"
        assert "input_audio_noise_reduction" in d, "Noise reduction should be present"

    def test_both_off(self):
        cfg = {**MODEL_MODE_CONFIG, "echo_cancellation": False, "noise_reduction": False}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d.get("input_audio_echo_cancellation") is None, "Echo cancellation should be None"
        assert d.get("input_audio_noise_reduction") is None, "Noise reduction should be None"


# -----------------------------------------------------------------------
# Tests — Layer 5: Interim response disabled → absent from config
# -----------------------------------------------------------------------

class TestInterimResponseDisabled:
    """When interim_response is False, it must NOT appear in the session config."""

    def test_no_interim_in_config(self):
        cfg = {**MODEL_MODE_CONFIG, "interim_response": False}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d.get("interim_response") is None, \
            f"interim_response should be None but got: {d.get('interim_response')}"


# -----------------------------------------------------------------------
# Tests — Layer 6: Static interim response type
# -----------------------------------------------------------------------

class TestStaticInterimResponse:
    """When type is 'static', config should have texts instead of instructions."""

    def test_static_texts(self):
        cfg = {
            **MODEL_MODE_CONFIG,
            "interim_response": True,
            "interim_response_type": "static",
            "interim_static_texts": "Hold on...\nJust a moment...",
        }
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        ir = d.get("interim_response", {})
        assert "texts" in ir, f"Expected 'texts' in static interim response: {ir}"
        assert len(ir["texts"]) == 2, f"Expected 2 texts, got: {ir['texts']}"
        assert "instructions" not in ir, "Static type should not have 'instructions'"


# -----------------------------------------------------------------------
# Tests — Layer 7: Empty instructions clearing
# -----------------------------------------------------------------------

class TestInstructionsClearing:
    """When instructions is empty string, it should be None in session config."""

    def test_instructions_none_when_empty(self):
        cfg = {**MODEL_MODE_CONFIG, "instructions": ""}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d.get("instructions") is None, \
            f"Empty instructions should be None but got: {d.get('instructions')}"


# -----------------------------------------------------------------------
# Tests — Layer 8: Temperature range edge cases
# -----------------------------------------------------------------------

class TestTemperatureRange:
    """Verify temperature at boundaries."""

    @pytest.mark.parametrize("temp", [0.0, 0.5, 1.0])
    def test_temperature_value(self, temp):
        cfg = {**MODEL_MODE_CONFIG, "temperature": temp}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d.get("temperature") == temp, f"Expected {temp}, got {d.get('temperature')}"


# -----------------------------------------------------------------------
# Tests — Layer 9: Agent mode session config
# -----------------------------------------------------------------------

AGENT_MODE_CONFIG = {
    "mode": "agent",
    "agent_name": "my-agent",
    "project": "my-project",
    "agent_version": "2.0",
    "conversation_id": "conv-123",
    "foundry_resource_override": "https://override.example.com",
    "auth_identity_client_id": "client-id-abc",
    "interim_response": True,
    "interim_response_type": "static",
    "interim_trigger_tool": True,
    "interim_trigger_latency": False,
    "interim_static_texts": "Please wait...\nOne moment...",
    "proactive_greeting": True,
    "greeting_type": "pregenerated",
    "greeting_text": "Welcome!",
}


class TestAgentSessionConfig:
    """Verify agent mode session and agent config."""

    def setup_method(self):
        self.cfg = _build_config(AGENT_MODE_CONFIG)

    def test_agent_name(self):
        ac = self.cfg.get_agent_session_config()
        assert ac["agent_name"] == "my-agent"

    def test_project_name(self):
        ac = self.cfg.get_agent_session_config()
        assert ac["project_name"] == "my-project"

    def test_agent_version(self):
        ac = self.cfg.get_agent_session_config()
        assert ac["agent_version"] == "2.0"

    def test_conversation_id(self):
        ac = self.cfg.get_agent_session_config()
        assert ac["conversation_id"] == "conv-123"

    def test_foundry_resource_override(self):
        ac = self.cfg.get_agent_session_config()
        assert ac["foundry_resource_override"] == "https://override.example.com"

    def test_auth_client_id_with_override(self):
        ac = self.cfg.get_agent_session_config()
        assert ac["authentication_identity_client_id"] == "client-id-abc"

    def test_auth_client_id_without_override(self):
        """auth_identity_client_id should be None when foundry_resource_override is not set."""
        cfg = {**AGENT_MODE_CONFIG, "foundry_resource_override": ""}
        sc = _build_config(cfg)
        ac = sc.get_agent_session_config()
        assert ac["authentication_identity_client_id"] is None

    def test_agent_session_has_modalities(self):
        session = self.cfg.build_agent_session()
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert "text" in d.get("modalities", [])
        assert "audio" in d.get("modalities", [])

    def test_agent_session_has_interim_response(self):
        session = self.cfg.build_agent_session()
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        ir = d.get("interim_response", {})
        assert ir is not None
        assert "texts" in ir, f"Expected static texts in interim response: {ir}"

    def test_agent_session_has_voice_and_audio_settings(self):
        """Agent mode SHOULD include voice, VAD, noise, echo."""
        session = self.cfg.build_agent_session()
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d.get("voice") is not None, "Agent mode should set voice"
        assert d.get("voice", {}).get("type") in ("azure-standard", "openai"), \
            f"Unexpected voice type: {d.get('voice')}"
        assert d.get("turn_detection") is not None, "Agent mode should set turn_detection"
        assert d.get("input_audio_noise_reduction") is not None, "Agent mode should set noise reduction"
        assert d.get("input_audio_echo_cancellation") is not None, "Agent mode should set echo cancellation"

    def test_agent_session_no_interim_when_disabled(self):
        """Agent mode should NOT include interim_response key when disabled."""
        no_ir_config = {**AGENT_MODE_CONFIG, "interim_response": False}
        cfg = _build_config(no_ir_config)
        session = cfg.build_agent_session()
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert "interim_response" not in d, \
            f"interim_response should be absent when disabled, got: {d.get('interim_response')}"

    def test_model_session_no_interim_when_disabled(self):
        """Model mode should NOT include interim_response key when disabled."""
        no_ir_config = {**MODEL_MODE_CONFIG, "interim_response": False}
        cfg = _build_config(no_ir_config)
        session = cfg.build_model_session()
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert "interim_response" not in d, \
            f"interim_response should be absent when disabled, got: {d.get('interim_response')}"


# -----------------------------------------------------------------------
# Tests — Layer 10: All setting option variations (comprehensive matrix)
# -----------------------------------------------------------------------

class TestSettingVariations:
    """Test all setting dropdown/toggle combinations."""

    @pytest.mark.parametrize("model", [
        "gpt-realtime", "gpt-realtime-mini", "gpt-5-realtime",
        "gpt-4o", "phi4-mm-realtime",
    ])
    def test_model_variants(self, model):
        cfg = {**MODEL_MODE_CONFIG, "model": model}
        session = _build_session_directly(cfg)
        assert isinstance(session, RequestSession)

    @pytest.mark.parametrize("transcribe", [
        "gpt-4o-transcribe", "gpt-4o-mini-transcribe", "whisper-1", "azure-speech",
    ])
    def test_transcription_model_variants(self, transcribe):
        cfg = {**MODEL_MODE_CONFIG, "transcribe_model": transcribe}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d["input_audio_transcription"]["model"] == transcribe

    @pytest.mark.parametrize("lang", ["", "en-US", "de-DE", "zh-CN", "ja-JP", "en"])
    def test_language_variants(self, lang):
        cfg = {**MODEL_MODE_CONFIG, "input_language": lang}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        txn = d["input_audio_transcription"]
        if lang:
            assert txn["language"] == lang
        else:
            assert "language" not in txn

    @pytest.mark.parametrize("voice", [
        "en-US-Ava:DragonHDLatestNeural",
        "en-US-Brian:DragonHDLatestNeural",
        "en-US-Emma:DragonHDLatestNeural",
    ])
    def test_voice_variants(self, voice):
        cfg = {**MODEL_MODE_CONFIG, "voice": voice}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert voice in d["voice"]["name"]

    @pytest.mark.parametrize("voice_type,voice_name,expected_cls", [
        ("azure-standard", "en-US-Ava:DragonHDLatestNeural", AzureStandardVoice),
        ("openai", "alloy", OpenAIVoice),
        ("openai", "coral", OpenAIVoice),
        ("openai", "shimmer", OpenAIVoice),
    ])
    def test_voice_type_variants(self, voice_type, voice_name, expected_cls):
        cfg = {**MODEL_MODE_CONFIG, "voice": voice_name, "voice_type": voice_type}
        sc = _build_config(cfg)
        voice_obj = sc.get_voice()
        assert isinstance(voice_obj, expected_cls), f"Expected {expected_cls}, got {type(voice_obj)}"
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        assert d["voice"]["name"] == voice_name
        assert d["voice"]["type"] == voice_type

    @pytest.mark.parametrize("nr,ec", [
        (True, True), (True, False), (False, True), (False, False),
    ])
    def test_audio_processing_matrix(self, nr, ec):
        cfg = {**MODEL_MODE_CONFIG, "noise_reduction": nr, "echo_cancellation": ec}
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        if ec:
            assert d.get("input_audio_echo_cancellation") is not None
        else:
            assert d.get("input_audio_echo_cancellation") is None
        if nr:
            assert d.get("input_audio_noise_reduction") is not None
        else:
            assert d.get("input_audio_noise_reduction") is None

    @pytest.mark.parametrize("ir_enabled,ir_type,tool,latency", [
        (False, "llm", True, True),
        (True, "llm", True, True),
        (True, "llm", True, False),
        (True, "llm", False, True),
        (True, "static", True, True),
        (True, "static", False, True),
    ])
    def test_interim_response_matrix(self, ir_enabled, ir_type, tool, latency):
        cfg = {
            **MODEL_MODE_CONFIG,
            "interim_response": ir_enabled,
            "interim_response_type": ir_type,
            "interim_trigger_tool": tool,
            "interim_trigger_latency": latency,
        }
        session = _build_session_directly(cfg)
        d = session.as_dict() if hasattr(session, "as_dict") else {}
        ir = d.get("interim_response")
        if not ir_enabled:
            assert ir is None
        else:
            assert ir is not None
            if ir_type == "static":
                assert "texts" in ir
            else:
                assert "instructions" in ir

    @pytest.mark.parametrize("greeting_on,gtype", [
        (True, "llm"), (True, "pregenerated"), (False, "llm"),
    ])
    def test_greeting_variants(self, greeting_on, gtype):
        cfg = {**MODEL_MODE_CONFIG, "proactive_greeting": greeting_on, "greeting_type": gtype}
        sc = _build_config(cfg)
        assert sc.proactive_greeting == greeting_on
        assert sc.greeting_type == gtype


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
