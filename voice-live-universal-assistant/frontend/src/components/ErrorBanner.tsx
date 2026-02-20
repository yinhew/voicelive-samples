import React, { useEffect } from 'react';

interface ErrorBannerProps {
  message: string | null;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div style={bannerStyle}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span style={textStyle}>{message}</span>
      <button style={closeBtnStyle} onClick={onDismiss} aria-label="Dismiss error">
        ✕
      </button>
    </div>
  );
};

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  top: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 20px',
  background: 'var(--error-bg)',
  backdropFilter: 'blur(8px)',
  borderRadius: '10px',
  border: '1px solid var(--border-subtle)',
  color: '#fff',
  maxWidth: '90vw',
  zIndex: 200,
  animation: 'slideDown 0.3s ease-out',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
};

const textStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  lineHeight: 1.4,
  flex: 1,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.7)',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '2px 6px',
  flexShrink: 0,
};
