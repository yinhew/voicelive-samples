import React from 'react';

interface SessionControlsProps {
  isCCEnabled: boolean;
  isMuted: boolean;
  onToggleCC: () => void;
  onToggleMute: () => void;
  onEndSession: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  isCCEnabled,
  isMuted,
  onToggleCC,
  onToggleMute,
  onEndSession,
}) => {
  return (
    <div style={barStyle}>
      {/* CC Toggle */}
      <button
        style={{
          ...btnStyle,
          ...(isCCEnabled ? activeBtnStyle : {}),
        }}
        onClick={onToggleCC}
        aria-label="Toggle closed captions"
        title="Closed captions"
      >
        <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px' }}>CC</span>
      </button>

      {/* Mic Toggle */}
      <button
        style={{
          ...btnStyle,
          ...(isMuted ? mutedBtnStyle : {}),
        }}
        onClick={onToggleMute}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="1" width="6" height="12" rx="3" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
          {isMuted && <line x1="1" y1="1" x2="23" y2="23" stroke="var(--error)" strokeWidth="2.5" />}
        </svg>
      </button>

      {/* End Session */}
      <button
        style={{ ...btnStyle, ...endBtnStyle }}
        onClick={onEndSession}
        aria-label="End session"
        title="End session"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

const barStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '16px',
  padding: '20px',
  background: 'var(--control-bar-bg)',
  backdropFilter: 'blur(10px)',
};

const btnStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface)',
  color: 'var(--fg-1)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s, border-color 0.2s',
};

const activeBtnStyle: React.CSSProperties = {
  background: 'var(--brand-blue-bg)',
  borderColor: 'var(--brand-blue)',
};

const mutedBtnStyle: React.CSSProperties = {
  background: 'var(--error-bg-subtle)',
  borderColor: 'var(--error)',
};

const endBtnStyle: React.CSSProperties = {
  background: 'var(--error-bg-subtle)',
  borderColor: 'var(--error)',
  color: 'var(--error)',
};
