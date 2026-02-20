"""
E2E audio test: connects via WebSocket, starts an agent session, sends WAV audio,
and verifies transcripts/audio come back from the Voice Live service.

Usage: python tests/test_e2e_audio.py
Requires: backend running on localhost:8765 with valid .env credentials.
"""

import asyncio
import base64
import glob
import json
import os
import struct
import sys
import wave

import websockets

AUDIO_DIR = r"C:\Localrepos\voicelive-evaluation\prototype_v1\sample_evaluation_input\Eiffel_Tower_Visit_1"
WS_URL = "ws://localhost:8765/ws/test-e2e-audio"
TARGET_SAMPLE_RATE = 24000


def resample_pcm16(data: bytes, src_rate: int, dst_rate: int) -> bytes:
    """Simple linear-interpolation resample of 16-bit PCM mono."""
    if src_rate == dst_rate:
        return data
    samples = struct.unpack(f"<{len(data)//2}h", data)
    ratio = src_rate / dst_rate
    n_out = int(len(samples) / ratio)
    out = []
    for i in range(n_out):
        src_pos = i * ratio
        idx = int(src_pos)
        frac = src_pos - idx
        if idx + 1 < len(samples):
            val = samples[idx] * (1 - frac) + samples[idx + 1] * frac
        else:
            val = samples[idx]
        out.append(int(max(-32768, min(32767, val))))
    return struct.pack(f"<{len(out)}h", *out)


async def test_e2e():
    received = []

    try:
        async with websockets.connect(WS_URL, close_timeout=10) as ws:
            # 1. Send start_session in agent mode
            start_msg = {
                "type": "start_session",
                "mode": "agent",
                "voice": "en-US-Ava:DragonHDLatestNeural",
                "voice_type": "azure-standard",
                "vad_type": "azure_semantic",
                "noise_reduction": True,
                "echo_cancellation": True,
                "proactive_greeting": False,
                "interim_response": False,
            }
            await ws.send(json.dumps(start_msg))
            print("[SENT] start_session (agent mode)")

            # 2. Wait for session_started
            try:
                for _ in range(15):
                    msg = await asyncio.wait_for(ws.recv(), timeout=20)
                    data = json.loads(msg) if isinstance(msg, str) else {"type": "binary", "len": len(msg)}
                    received.append(data)
                    rtype = data.get("type", "unknown")
                    print(f"[RECV] {rtype}")
                    if rtype == "session_started":
                        break
                    if rtype == "error":
                        print(f"  ERROR: {data.get('message', 'unknown')}")
                        return
            except asyncio.TimeoutError:
                print("[TIMEOUT] waiting for session_started")
                return

            # 3. Send WAV files as audio (send first 2 turns)
            wav_files = sorted(glob.glob(os.path.join(AUDIO_DIR, "*.wav")))
            if not wav_files:
                print("[SKIP] No WAV files found")
                return

            for wav_idx, wav_path in enumerate(wav_files[:2]):
                with wave.open(wav_path, "rb") as wf:
                    pcm_data = wf.readframes(wf.getnframes())
                    sr = wf.getframerate()
                    sw = wf.getsampwidth()
                    ch = wf.getnchannels()
                    print(f"[SEND] {os.path.basename(wav_path)}: {len(pcm_data)} bytes, {sr}Hz, {sw}B, {ch}ch")

                # Resample to 24kHz if needed (service default)
                if sr != TARGET_SAMPLE_RATE:
                    pcm_data = resample_pcm16(pcm_data, sr, TARGET_SAMPLE_RATE)
                    print(f"[RESAMPLE] {sr}Hz -> {TARGET_SAMPLE_RATE}Hz: {len(pcm_data)} bytes")

                # Send audio in chunks (~150ms at 24kHz/16bit = 7200 bytes)
                CHUNK_SIZE = 7200
                chunks_sent = 0
                for i in range(0, len(pcm_data), CHUNK_SIZE):
                    chunk = pcm_data[i : i + CHUNK_SIZE]
                    audio_msg = {
                        "type": "audio_chunk",
                        "data": base64.b64encode(chunk).decode("utf-8"),
                    }
                    await ws.send(json.dumps(audio_msg))
                    chunks_sent += 1
                    await asyncio.sleep(0.05)
                print(f"[SENT] {chunks_sent} audio chunks ({len(pcm_data)} bytes total)")

                # Add silence gap between turns (500ms of zeros at 24kHz)
                if wav_idx < 1:
                    silence = b"\x00" * (TARGET_SAMPLE_RATE * 2)  # 1 second silence
                    await ws.send(json.dumps({
                        "type": "audio_chunk",
                        "data": base64.b64encode(silence).decode("utf-8"),
                    }))
                    print("[SENT] 1s silence gap")
                    await asyncio.sleep(0.5)

            # 4. Listen for responses
            try:
                for _ in range(30):
                    msg = await asyncio.wait_for(ws.recv(), timeout=15)
                    if isinstance(msg, str):
                        data = json.loads(msg)
                        rtype = data.get("type", "unknown")
                        if rtype == "transcript":
                            role = data.get("role", "?")
                            final = data.get("is_final", False)
                            text = data.get("text", "")[:100]
                            print(f"[RECV] transcript: role={role} final={final} text={text!r}")
                        elif rtype == "audio_data":
                            alen = len(data.get("audio", ""))
                            print(f"[RECV] audio_data: {alen} chars base64")
                        elif rtype == "status":
                            print(f"[RECV] status: {data.get('state', 'unknown')}")
                        elif rtype == "error":
                            print(f"[RECV] error: {data.get('message', '')}")
                        elif rtype == "stop_playback":
                            print("[RECV] stop_playback")
                        else:
                            print(f"[RECV] {rtype}")
                        received.append(data)
                    else:
                        print(f"[RECV] binary: {len(msg)} bytes")
            except asyncio.TimeoutError:
                print("[DONE] No more responses (timeout)")

            # 5. Send stop
            await ws.send(json.dumps({"type": "stop_session"}))
            print("[SENT] stop_session")

            # Summary
            types = [r.get("type", "?") for r in received if isinstance(r, dict)]
            print("\n=== SUMMARY ===")
            print(f"Total messages: {len(received)}")
            for t in sorted(set(types)):
                print(f"  {t}: {types.count(t)}")

            has_session = "session_started" in types
            has_transcript = "transcript" in types
            has_audio = "audio_data" in types
            print(f"\nSession started: {has_session}")
            print(f"Got transcripts: {has_transcript}")
            print(f"Got audio back:  {has_audio}")
            result = "PASS" if (has_session and has_transcript) else "FAIL"
            print(f"E2E RESULT: {result}")

    except Exception as e:
        print(f"[FATAL] {type(e).__name__}: {e}")


if __name__ == "__main__":
    asyncio.run(test_e2e())
