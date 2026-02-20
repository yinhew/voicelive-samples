import React from 'react';
import { AIFoundryLogo } from './AIFoundryLogo';

export const BuiltWithBadge: React.FC = () => (
  <a
    href="https://azure.microsoft.com/en-us/products/ai-foundry"
    target="_blank"
    rel="noopener noreferrer"
    style={badgeStyle}
    aria-label="Built with Azure AI Foundry"
  >
    <span style={logoStyle}>
      <AIFoundryLogo />
    </span>
    <span style={textStyle}>Build & deploy AI agents with</span>
    <span style={brandStyle}>Azure AI Foundry</span>
  </a>
);

const badgeStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '16px',
  left: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  textDecoration: 'none',
  color: 'var(--fg-3)',
  fontSize: '0.8rem',
  zIndex: 5,
  transition: 'opacity 0.2s',
  opacity: 0.8,
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  color: 'var(--brand-blue)',
};

const textStyle: React.CSSProperties = {
  fontWeight: 400,
};

const brandStyle: React.CSSProperties = {
  fontWeight: 700,
};
