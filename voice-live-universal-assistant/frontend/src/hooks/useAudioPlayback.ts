import { useRef, useState, useCallback } from 'react';

const SAMPLE_RATE = 24000;

export function useAudioPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const initPlayback = useCallback(async () => {
    if (audioContextRef.current) return;

    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContextRef.current = audioContext;

    await audioContext.audioWorklet.addModule('/audio-playback-worklet.js');

    const workletNode = new AudioWorkletNode(audioContext, 'audio-playback-processor');
    workletNodeRef.current = workletNode;
    workletNode.connect(audioContext.destination);
  }, []);

  const playAudio = useCallback(
    async (base64Data: string) => {
      if (!audioContextRef.current || !workletNodeRef.current) {
        await initPlayback();
      }

      // Resume context if suspended (browser autoplay policy)
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Decode base64 to Int16Array
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16Data = new Int16Array(bytes.buffer);

      workletNodeRef.current!.port.postMessage(int16Data.buffer, [int16Data.buffer]);
      setIsPlaying(true);
    },
    [initPlayback],
  );

  const stopPlayback = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage(null);
    }
    setIsPlaying(false);
  }, []);

  const cleanupPlayback = useCallback(() => {
    stopPlayback();
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
    }
    audioContextRef.current = null;
  }, [stopPlayback]);

  return { playAudio, stopPlayback, isPlaying, initPlayback, cleanupPlayback };
}
