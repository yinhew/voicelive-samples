import React, { useState } from 'react';
import { useVoiceSession } from './hooks/useVoiceSession';
import { useTheme } from './hooks/useTheme';
import { StartScreen } from './components/StartScreen';
import { ActiveSession } from './components/ActiveSession';
import { SessionEnded } from './components/SessionEnded';
import { SettingsPanel } from './components/SettingsPanel';
import { ErrorBanner } from './components/ErrorBanner';
import { BuiltWithBadge } from './components/BuiltWithBadge';

const App: React.FC = () => {
  const {
    state,
    transcripts,
    sessionId,
    settings,
    updateSettings,
    startSession,
    stopSession,
    resetSession,
    toggleMute,
    isMuted,
    toggleCC,
    isCCEnabled,
    errorMessage,
    dismissError,
    azureSpeechLocales,
  } = useVoiceSession();

  const { theme, setTheme } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleRestart = () => {
    resetSession();
    // Start new session after state resets (next tick so state is idle)
    setTimeout(() => startSession(), 0);
  };

  const isActive =
    state === 'connecting' || state === 'listening' || state === 'thinking' || state === 'speaking';

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <ErrorBanner message={errorMessage} onDismiss={dismissError} />
      {state === 'idle' && (
        <StartScreen onStart={startSession} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      {isActive && (
        <ActiveSession
          state={state}
          transcripts={transcripts}
          isCCEnabled={isCCEnabled}
          isMuted={isMuted}
          onToggleCC={toggleCC}
          onToggleMute={toggleMute}
          onEndSession={stopSession}
        />
      )}

      {state === 'ended' && (
        <SessionEnded
          sessionId={sessionId}
          transcripts={transcripts}
          onRestart={handleRestart}
          onHome={resetSession}
        />
      )}

      <SettingsPanel
        isOpen={settingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onClose={() => setSettingsOpen(false)}
        azureSpeechLocales={azureSpeechLocales}
        theme={theme}
        onThemeChange={setTheme}
      />

      <BuiltWithBadge />
    </div>
  );
};

export default App;
