namespace VoiceLive.Sample;

/// <summary>
/// Application-level session configuration mirroring the Python/Java SessionConfig.
/// Frontend values override environment defaults.
/// </summary>
public class SessionConfig
{
    // Connection / mode
    public string Mode { get; set; } = "model";
    public string Model { get; set; } = "gpt-realtime";
    public string Voice { get; set; } = "en-US-Ava:DragonHDLatestNeural";
    public string VoiceType { get; set; } = "azure-standard";
    public string Instructions { get; set; } = "";
    public float Temperature { get; set; } = 0.7f;

    // Audio processing
    public string VadType { get; set; } = "azure_semantic";
    public bool NoiseReduction { get; set; } = true;
    public bool EchoCancellation { get; set; } = true;

    // Speech input
    public string TranscribeModel { get; set; } = "gpt-4o-transcribe";
    public string InputLanguage { get; set; } = "";

    // Agent mode
    public string? AgentName { get; set; }
    public string? ProjectName { get; set; }
    public string? AgentVersion { get; set; }
    public string? ConversationId { get; set; }
    public string? FoundryResourceOverride { get; set; }
    public string? AuthIdentityClientId { get; set; }
    public string? ByomProfile { get; set; }

    // Proactive engagement
    public bool ProactiveGreeting { get; set; } = true;
    public string GreetingType { get; set; } = "llm";
    public string GreetingText { get; set; } = "";

    // Interim response
    public bool InterimResponse { get; set; }
    public string InterimResponseType { get; set; } = "llm";
    public bool InterimTriggerTool { get; set; } = true;
    public bool InterimTriggerLatency { get; set; } = true;
    public int InterimLatencyMs { get; set; } = 100;
    public string InterimInstructions { get; set; } = "";
    public string InterimStaticTexts { get; set; } = "";

    /// <summary>
    /// Returns a non-null, non-blank value, or null.
    /// </summary>
    public static string? NonBlankOrNull(string? value)
        => !string.IsNullOrWhiteSpace(value) ? value : null;
}
