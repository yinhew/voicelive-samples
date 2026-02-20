import React from 'react';
import type { SessionState } from '../types';
import styles from './VoiceOrb.module.css';

interface VoiceOrbProps {
  state: SessionState;
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, size = 200 }) => {
  const stateClass = styles[`orb-${state}`] || styles['orb-idle'];
  const midSize = size * 1.4;
  const outerSize = size * 1.8;

  return (
    <div
      className={`${styles['orb-container']} ${stateClass}`}
      style={{ width: outerSize, height: outerSize }}
    >
      <div
        className={`${styles['orb-ring']} ${styles['orb-ring-outer']}`}
        style={{
          width: outerSize,
          height: outerSize,
          ['--ring-opacity' as any]: '0.15',
        }}
      />
      <div
        className={`${styles['orb-ring']} ${styles['orb-ring-mid']}`}
        style={{
          width: midSize,
          height: midSize,
          ['--ring-opacity' as any]: '0.3',
        }}
      />
      <div
        className={`${styles['orb-ring']} ${styles['orb-core']}`}
        style={{
          width: size,
          height: size,
          ['--ring-opacity' as any]: '0.95',
        }}
      />
    </div>
  );
};
