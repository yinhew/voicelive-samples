import React from 'react';
import type { VoiceSettings } from '../types';
import type { ThemePreference } from '../hooks/useTheme';

// Transcription model options depend on the selected Voice Live model
const GPT_MULTIMODAL_MODELS = ['gpt-realtime', 'gpt-realtime-mini'];
const PHI_MULTIMODAL_MODELS = ['phi4-mm-realtime', 'phi4-mini'];

// OpenAI voices supported by Voice Live API
const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];

// Azure Standard DragonHD voices (most common for realtime)
const AZURE_DRAGON_HD_VOICES = [
  'en-US-Ava:DragonHDLatestNeural',
  'en-US-Andrew:DragonHDLatestNeural',
  'en-US-Emma:DragonHDLatestNeural',
  'en-US-Brian:DragonHDLatestNeural',
  'en-US-Aria:DragonHDLatestNeural',
  'en-US-Davis:DragonHDLatestNeural',
  'en-US-Jenny:DragonHDLatestNeural',
  'en-US-Steffan:DragonHDLatestNeural',
];

// Special sentinel for "type your own" in the voice dropdown
const CUSTOM_VOICE_SENTINEL = '__custom__';

function getTranscribeModelOptions(model: string): { value: string; label: string }[] {
  if (GPT_MULTIMODAL_MODELS.includes(model)) {
    return [
      { value: 'gpt-4o-transcribe', label: 'gpt-4o-transcribe' },
      { value: 'gpt-4o-mini-transcribe', label: 'gpt-4o-mini-transcribe' },
      { value: 'whisper-1', label: 'whisper-1' },
    ];
  }
  // Phi multimodal and all non-multimodal models use azure-speech
  return [{ value: 'azure-speech', label: 'azure-speech' }];
}

function isAzureSpeechTranscription(model: string, transcribeModel: string): boolean {
  return PHI_MULTIMODAL_MODELS.includes(model)
    || (!GPT_MULTIMODAL_MODELS.includes(model))
    || transcribeModel === 'azure-speech';
}

// Azure Speech multilingual model languages (fallback when API locales unavailable)
const AZURE_SPEECH_LANGUAGES_FALLBACK: { value: string; label: string }[] = [
  { value: '', label: 'Auto-detect (multilingual)' },
  { value: 'en-US', label: 'English (US) [en-US]' },
  { value: 'en-GB', label: 'English (UK) [en-GB]' },
  { value: 'en-AU', label: 'English (Australia) [en-AU]' },
  { value: 'en-CA', label: 'English (Canada) [en-CA]' },
  { value: 'en-IN', label: 'English (India) [en-IN]' },
  { value: 'zh-CN', label: 'Chinese (China) [zh-CN]' },
  { value: 'fr-FR', label: 'French (France) [fr-FR]' },
  { value: 'fr-CA', label: 'French (Canada) [fr-CA]' },
  { value: 'de-DE', label: 'German (Germany) [de-DE]' },
  { value: 'hi-IN', label: 'Hindi (India) [hi-IN]' },
  { value: 'it-IT', label: 'Italian (Italy) [it-IT]' },
  { value: 'ja-JP', label: 'Japanese (Japan) [ja-JP]' },
  { value: 'ko-KR', label: 'Korean (Korea) [ko-KR]' },
  { value: 'es-ES', label: 'Spanish (Spain) [es-ES]' },
  { value: 'es-MX', label: 'Spanish (Mexico) [es-MX]' },
];

function buildAzureSpeechLanguageOptions(locales: string[]): { value: string; label: string }[] {
  if (!locales.length) return AZURE_SPEECH_LANGUAGES_FALLBACK;
  return [
    { value: '', label: 'Auto-detect (multilingual)' },
    ...locales.map((l) => ({ value: l, label: l })),
  ];
}

// GPT multimodal transcription language hints (ISO-639-1)
const GPT_TRANSCRIBE_LANGUAGES: { value: string; label: string }[] = [
  { value: '', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'es', label: 'Spanish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'nl', label: 'Dutch' },
  { value: 'pl', label: 'Polish' },
  { value: 'ru', label: 'Russian' },
  { value: 'sv', label: 'Swedish' },
  { value: 'tr', label: 'Turkish' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'th', label: 'Thai' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'el', label: 'Greek' },
  { value: 'he', label: 'Hebrew' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'id', label: 'Indonesian' },
  { value: 'no', label: 'Norwegian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'cs', label: 'Czech' },
  { value: 'sk', label: 'Slovak' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'hr', label: 'Croatian' },
  { value: 'ms', label: 'Malay' },
  { value: 'ta', label: 'Tamil' },
];

interface SettingsPanelProps {
  isOpen: boolean;
  settings: VoiceSettings;
  onUpdate: (updates: Partial<VoiceSettings>) => void;
  onClose: () => void;
  azureSpeechLocales?: string[];
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  settings,
  onUpdate,
  onClose,
  azureSpeechLocales = [],
  theme,
  onThemeChange,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div style={panelStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>Settings</h2>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--fg-1)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Theme picker */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Theme</label>
          <div style={segmentedStyle}>
            {(['light', 'dark', 'system'] as ThemePreference[]).map((t) => (
              <button
                key={t}
                style={{
                  ...segBtnStyle,
                  ...(theme === t ? segActiveBlueStyle : {}),
                }}
                onClick={() => onThemeChange(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <hr style={dividerStyle} />

        {/* Mode toggle */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Mode</label>
          <div style={segmentedStyle}>
            <button
              style={{
                ...segBtnStyle,
                ...(settings.mode === 'model' ? segActiveBlueStyle : {}),
              }}
              onClick={() => onUpdate({ mode: 'model' })}
            >
              Model
            </button>
            <button
              style={{
                ...segBtnStyle,
                ...(settings.mode === 'agent' ? segActiveBlueStyle : {}),
              }}
              onClick={() => onUpdate({ mode: 'agent' })}
            >
              Agent
            </button>
          </div>
        </div>

        {/* Voice Type + Voice (shared between modes) */}
        <div style={fieldStyle}>
          <label style={labelStyle}>Voice Type</label>
          <select
            style={inputStyle}
            value={settings.voiceType}
            onChange={(e) => {
              const newType = e.target.value as 'openai' | 'azure-standard';
              const defaultVoice = newType === 'openai' ? 'alloy' : 'en-US-Ava:DragonHDLatestNeural';
              onUpdate({ voiceType: newType, voice: defaultVoice });
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="azure-standard">Azure Standard</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Voice</label>
          {settings.voiceType === 'openai' ? (
            <select
              style={inputStyle}
              value={settings.voice}
              onChange={(e) => onUpdate({ voice: e.target.value })}
            >
              {OPENAI_VOICES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <>
              <select
                style={inputStyle}
                value={
                  AZURE_DRAGON_HD_VOICES.includes(settings.voice)
                    ? settings.voice
                    : CUSTOM_VOICE_SENTINEL
                }
                onChange={(e) => {
                  if (e.target.value === CUSTOM_VOICE_SENTINEL) {
                    onUpdate({ voice: '' });
                  } else {
                    onUpdate({ voice: e.target.value });
                  }
                }}
              >
                <optgroup label="DragonHD (Recommended)">
                  {AZURE_DRAGON_HD_VOICES.map((v) => (
                    <option key={v} value={v}>{v.replace(':DragonHDLatestNeural', '')}</option>
                  ))}
                </optgroup>
                <optgroup label="Other">
                  <option value={CUSTOM_VOICE_SENTINEL}>Custom (type below)…</option>
                </optgroup>
              </select>
              {(!AZURE_DRAGON_HD_VOICES.includes(settings.voice)) && (
                <input
                  style={{ ...inputStyle, marginTop: 6 }}
                  value={settings.voice}
                  onChange={(e) => onUpdate({ voice: e.target.value })}
                  placeholder="e.g. en-US-JennyNeural"
                />
              )}
            </>
          )}
        </div>

        <hr style={dividerStyle} />

        {settings.mode === 'model' ? (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Model</label>
              <select
                style={inputStyle}
                value={settings.model}
                onChange={(e) => {
                  const newModel = e.target.value;
                  const validOptions = getTranscribeModelOptions(newModel);
                  const updates: Partial<VoiceSettings> = { model: newModel };
                  // Auto-correct transcribeModel if current selection isn't valid for new model
                  if (!validOptions.some((o) => o.value === settings.transcribeModel)) {
                    updates.transcribeModel = validOptions[0].value;
                    updates.inputLanguage = '';
                  }
                  onUpdate(updates);
                }}
              >
                <optgroup label="GPT Realtime">
                  <option value="gpt-realtime">gpt-realtime</option>
                  <option value="gpt-realtime-mini">gpt-realtime-mini</option>
                </optgroup>
                <optgroup label="GPT-5 Series">
                  <option value="gpt-5.2">gpt-5.2</option>
                  <option value="gpt-5.2-chat">gpt-5.2-chat</option>
                  <option value="gpt-5.1">gpt-5.1</option>
                  <option value="gpt-5.1-chat">gpt-5.1-chat</option>
                  <option value="gpt-5">gpt-5</option>
                  <option value="gpt-5-mini">gpt-5-mini</option>
                  <option value="gpt-5-nano">gpt-5-nano</option>
                  <option value="gpt-5-chat">gpt-5-chat</option>
                </optgroup>
                <optgroup label="GPT-4 Series">
                  <option value="gpt-4.1">gpt-4.1</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </optgroup>
                <optgroup label="Phi (Preview)">
                  <option value="phi4-mm-realtime">phi4-mm-realtime (preview)</option>
                  <option value="phi4-mini">phi4-mini (preview)</option>
                </optgroup>
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>System Prompt</label>
              <textarea
                style={textareaStyle}
                value={settings.instructions}
                onChange={(e) => onUpdate({ instructions: e.target.value })}
                placeholder="Optional instructions for the model..."
                rows={4}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Temperature: {settings.temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
                style={rangeStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Speech Input Transcription Model</label>
              <select
                style={inputStyle}
                value={settings.transcribeModel}
                onChange={(e) => onUpdate({ transcribeModel: e.target.value, inputLanguage: '' })}
              >
                {getTranscribeModelOptions(settings.model).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Speech Input Language</label>
              <select
                style={inputStyle}
                value={settings.inputLanguage}
                onChange={(e) => onUpdate({ inputLanguage: e.target.value })}
              >
                {(isAzureSpeechTranscription(settings.model, settings.transcribeModel)
                  ? buildAzureSpeechLanguageOptions(azureSpeechLocales)
                  : GPT_TRANSCRIBE_LANGUAGES
                ).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Agent Name</label>
              <input
                style={inputStyle}
                value={settings.agentName}
                onChange={(e) => onUpdate({ agentName: e.target.value })}
                placeholder="Enter agent name"
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Project</label>
              <input
                style={inputStyle}
                value={settings.project}
                onChange={(e) => onUpdate({ project: e.target.value })}
                placeholder="Enter project name"
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: 'var(--fg-3)' }}>
                Agent Version <span style={optionalBadgeStyle}>optional</span>
              </label>
              <input
                style={inputStyle}
                value={settings.agentVersion}
                onChange={(e) => onUpdate({ agentVersion: e.target.value })}
                placeholder="e.g. 1.0"
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: 'var(--fg-3)' }}>
                Conversation ID <span style={optionalBadgeStyle}>optional</span>
              </label>
              <input
                style={inputStyle}
                value={settings.conversationId}
                onChange={(e) => onUpdate({ conversationId: e.target.value })}
                placeholder="Resume an existing conversation"
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: 'var(--fg-3)' }}>
                Foundry Resource Override <span style={optionalBadgeStyle}>optional</span>
              </label>
              <input
                style={inputStyle}
                value={settings.foundryResourceOverride}
                onChange={(e) => onUpdate({ foundryResourceOverride: e.target.value })}
                placeholder="Override default Foundry resource"
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: 'var(--fg-3)' }}>
                Auth Identity Client ID <span style={optionalBadgeStyle}>optional</span>
              </label>
              <input
                style={inputStyle}
                value={settings.authIdentityClientId}
                onChange={(e) => onUpdate({ authIdentityClientId: e.target.value })}
                placeholder="Managed identity client ID"
              />
            </div>

            <div style={fieldStyle}>
              <label style={{ ...labelStyle, color: 'var(--fg-3)' }}>
                Speech Input Language <span style={optionalBadgeStyle}>optional</span>
              </label>
              <select
                style={inputStyle}
                value={settings.inputLanguage}
                onChange={(e) => onUpdate({ inputLanguage: e.target.value })}
              >
                {buildAzureSpeechLanguageOptions(azureSpeechLocales).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <hr style={dividerStyle} />

        {/* Proactive Engagement */}
        <div style={checkboxRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.proactiveGreeting}
              onChange={(e) => onUpdate({ proactiveGreeting: e.target.checked })}
            />
            Proactive Engagement
          </label>
        </div>

        {settings.proactiveGreeting && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Greeting Type</label>
              <div style={segmentedStyle}>
                <button
                  style={{
                    ...segBtnStyle,
                    ...(settings.greetingType === 'llm' ? segActiveBlueStyle : {}),
                  }}
                  onClick={() => onUpdate({ greetingType: 'llm' })}
                >
                  LLM-Generated
                </button>
                <button
                  style={{
                    ...segBtnStyle,
                    ...(settings.greetingType === 'pregenerated' ? segActiveBlueStyle : {}),
                  }}
                  onClick={() => onUpdate({ greetingType: 'pregenerated' })}
                >
                  Pre-Generated
                </button>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                {settings.greetingType === 'llm'
                  ? 'Greeting Instruction'
                  : 'Greeting Text'}
              </label>
              <textarea
                style={textareaStyle}
                value={settings.greetingText}
                onChange={(e) => onUpdate({ greetingText: e.target.value })}
                placeholder={
                  settings.greetingType === 'llm'
                    ? 'Greet the user warmly and briefly explain how you can help.'
                    : 'Welcome! I\'m here to help you get started.'
                }
                rows={2}
              />
            </div>
          </>
        )}

        <hr style={dividerStyle} />

        {/* Interim Response */}
        <div style={checkboxRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.interimResponse}
              onChange={(e) => onUpdate({ interimResponse: e.target.checked })}
            />
            Interim Response
          </label>
        </div>

        {settings.interimResponse && (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Interim Response Type</label>
              <div style={segmentedStyle}>
                <button
                  style={{
                    ...segBtnStyle,
                    ...(settings.interimResponseType === 'llm' ? segActiveBlueStyle : {}),
                  }}
                  onClick={() => onUpdate({ interimResponseType: 'llm' })}
                >
                  LLM-Generated
                </button>
                <button
                  style={{
                    ...segBtnStyle,
                    ...(settings.interimResponseType === 'static' ? segActiveBlueStyle : {}),
                  }}
                  onClick={() => onUpdate({ interimResponseType: 'static' })}
                >
                  Static
                </button>
              </div>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Triggers</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={settings.interimTriggerTool}
                    onChange={(e) => onUpdate({ interimTriggerTool: e.target.checked })}
                  />
                  Tool Call
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={settings.interimTriggerLatency}
                    onChange={(e) => onUpdate({ interimTriggerLatency: e.target.checked })}
                  />
                  Latency
                </label>
              </div>
            </div>

            {settings.interimTriggerLatency && (
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Latency Threshold: {settings.interimLatencyMs}ms
                </label>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="50"
                  value={settings.interimLatencyMs}
                  onChange={(e) => onUpdate({ interimLatencyMs: parseInt(e.target.value) })}
                  style={rangeStyle}
                />
              </div>
            )}

            {settings.interimResponseType === 'llm' ? (
              <div style={fieldStyle}>
                <label style={labelStyle}>LLM Instructions</label>
                <textarea
                  style={textareaStyle}
                  value={settings.interimInstructions}
                  onChange={(e) => onUpdate({ interimInstructions: e.target.value })}
                  placeholder="Create friendly interim responses indicating wait time due to ongoing processing, if any."
                  rows={2}
                />
              </div>
            ) : (
              <div style={fieldStyle}>
                <label style={labelStyle}>Static Texts (one per line)</label>
                <textarea
                  style={textareaStyle}
                  value={settings.interimStaticTexts}
                  onChange={(e) => onUpdate({ interimStaticTexts: e.target.value })}
                  placeholder={"One moment please...\nLet me look that up...\nWorking on it..."}
                  rows={3}
                />
              </div>
            )}
          </>
        )}

        <hr style={dividerStyle} />

        <div style={fieldStyle}>
          <label style={labelStyle}>VAD Type</label>
          <select
            style={inputStyle}
            value={settings.vadType}
            onChange={(e) => onUpdate({ vadType: e.target.value as any })}
          >
            <option value="azure_semantic">Azure Semantic VAD</option>
            <option value="azure_semantic_en">Azure Semantic VAD (English)</option>
            <option value="azure_semantic_multilingual">Azure Semantic VAD (Multilingual)</option>
            <option value="server">Server VAD</option>
          </select>
        </div>

        <div style={checkboxRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.noiseReduction}
              onChange={(e) => onUpdate({ noiseReduction: e.target.checked })}
            />
            Noise Reduction
          </label>
        </div>

        <div style={checkboxRowStyle}>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={settings.echoCancellation}
              onChange={(e) => onUpdate({ echoCancellation: e.target.checked })}
            />
            Echo Cancellation
          </label>
        </div>
      </div>
    </>
  );
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--backdrop)',
  zIndex: 90,
};

const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  width: '360px',
  maxWidth: '90vw',
  background: 'var(--bg-2)',
  borderLeft: '1px solid var(--border)',
  padding: '24px',
  overflowY: 'auto',
  zIndex: 100,
  animation: 'slideIn 0.25s ease-out',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.3rem',
  fontWeight: 700,
  color: 'var(--fg-1)',
  margin: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '16px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  color: 'var(--fg-3)',
  marginBottom: '6px',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface)',
  color: 'var(--fg-1)',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'inherit',
};

const rangeStyle: React.CSSProperties = {
  width: '100%',
  accentColor: 'var(--brand-blue)',
};

const segmentedStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid var(--border-subtle)',
};

const segBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  border: 'none',
  background: 'var(--surface)',
  color: 'var(--fg-3)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 500,
  transition: 'background 0.2s, color 0.2s',
};

const segActiveBtnStyle: React.CSSProperties = {
  background: 'var(--voice-bg-subtle)',
  color: 'var(--fg-1)',
};

const segActiveBlueStyle: React.CSSProperties = {
  background: 'var(--brand-blue-bg)',
  color: 'var(--fg-1)',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--border)',
  margin: '20px 0',
};

const checkboxRowStyle: React.CSSProperties = {
  marginBottom: '12px',
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '0.9rem',
  color: 'var(--fg-1)',
  cursor: 'pointer',
};

const optionalBadgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--fg-3)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  padding: '1px 5px',
  marginLeft: '4px',
  fontWeight: 400,
};
