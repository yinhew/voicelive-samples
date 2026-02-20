import React from 'react';
import type { TranscriptEntry } from '../types';

interface SessionEndedProps {
  sessionId: string;
  transcripts: TranscriptEntry[];
  onRestart: () => void;
  onHome: () => void;
}

export const SessionEnded: React.FC<SessionEndedProps> = ({ sessionId, transcripts, onRestart, onHome }) => {
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Session ended</h1>
      {sessionId && <p style={sessionIdStyle}>Session ID: {sessionId}</p>}

      <div style={transcriptListStyle}>
        {transcripts.length === 0 && <p style={emptyStyle}>No transcript available.</p>}
        {transcripts
          .filter((t) => t.isFinal)
          .map((entry, i) => (
            <div
              key={`${entry.timestamp}-${i}`}
              style={{
                ...messageStyle,
                alignSelf: entry.role === 'user' ? 'flex-start' : 'flex-end',
                background:
                  entry.role === 'user'
                    ? 'var(--surface-overlay)'
                    : 'var(--voice-bg-subtle)',
              }}
            >
              <span style={roleLabelStyle}>{entry.role === 'user' ? 'You' : 'Assistant'}</span>
              <span style={textStyle}>{entry.text}</span>
            </div>
          ))}
      </div>

      <div style={buttonRowStyle}>
        <button style={homeBtnStyle} onClick={onHome}>
          Home
        </button>
        <button style={restartButtonStyle} onClick={onRestart}>
          Start new session
        </button>
      </div>
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '48px 24px',
  height: '100vh',
  boxSizing: 'border-box',
};

const headingStyle: React.CSSProperties = {
  fontSize: '2rem',
  fontWeight: 700,
  color: 'var(--fg-1)',
  margin: '0 0 8px 0',
};

const sessionIdStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--fg-3)',
  margin: '0 0 24px 0',
  fontFamily: 'monospace',
};

const transcriptListStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  maxWidth: '600px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginBottom: '24px',
  padding: '0 8px',
};

const messageStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '12px',
  maxWidth: '85%',
};

const roleLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--fg-3)',
  display: 'block',
  marginBottom: '4px',
  fontWeight: 600,
};

const textStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--fg-1)',
  lineHeight: 1.5,
};

const emptyStyle: React.CSSProperties = {
  color: 'var(--fg-3)',
  textAlign: 'center',
  marginTop: '40px',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'center',
};

const homeBtnStyle: React.CSSProperties = {
  background: 'var(--surface-overlay)',
  color: 'var(--fg-1)',
  border: '1px solid var(--border-subtle)',
  padding: '14px 32px',
  borderRadius: '12px',
  fontSize: '1.1rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const restartButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, var(--voice-secondary), var(--voice-primary))',
  color: '#fff',
  border: 'none',
  padding: '14px 40px',
  borderRadius: '12px',
  fontSize: '1.1rem',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 20px var(--voice-glow)',
};
