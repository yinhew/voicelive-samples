import React from 'react';
import type { SessionState, TranscriptEntry } from '../types';
import { VoiceOrb } from './VoiceOrb';
import { SessionControls } from './SessionControls';
import { TranscriptOverlay } from './TranscriptOverlay';

interface ActiveSessionProps {
  state: SessionState;
  transcripts: TranscriptEntry[];
  isCCEnabled: boolean;
  isMuted: boolean;
  onToggleCC: () => void;
  onToggleMute: () => void;
  onEndSession: () => void;
}

const statusTextMap: Record<string, string> = {
  connecting: 'Connecting...',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Talk to interrupt...',
};

export const ActiveSession: React.FC<ActiveSessionProps> = ({
  state,
  transcripts,
  isCCEnabled,
  isMuted,
  onToggleCC,
  onToggleMute,
  onEndSession,
}) => {
  const hasTranscripts = isCCEnabled && transcripts.length > 0;

  return (
    <div style={containerStyle}>
      {/* Transcript takes available space above the orb, scrollable */}
      {hasTranscripts && (
        <div style={transcriptAreaStyle}>
          <TranscriptOverlay transcripts={transcripts} />
        </div>
      )}

      {/* Orb area — shrinks when CC is showing transcripts */}
      <div style={hasTranscripts ? orbAreaCompactStyle : orbAreaStyle}>
        <VoiceOrb state={state} size={hasTranscripts ? 160 : 240} />
        <p style={statusStyle}>{statusTextMap[state] || ''}</p>
      </div>

      <SessionControls
        isCCEnabled={isCCEnabled}
        isMuted={isMuted}
        onToggleCC={onToggleCC}
        onToggleMute={onToggleMute}
        onEndSession={onEndSession}
      />
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100vh',
  boxSizing: 'border-box',
  padding: '24px 24px 0 24px',
};

const transcriptAreaStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  minHeight: 0,       // allow flex shrink for overflow
  overflow: 'hidden',  // children handle their own scroll
};

const orbAreaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '24px',
  flex: 1,
  justifyContent: 'center',
};

const orbAreaCompactStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '16px 0',
  flexShrink: 0,
};

const statusStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  color: 'var(--fg-3)',
  margin: 0,
  fontWeight: 500,
};
