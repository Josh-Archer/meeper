export type LLMProvider = "openai" | "ollama";

export interface LLMProviderSettings {
  provider: LLMProvider;
  /** Ollama model name (e.g. llama3.1, mistral, qwen2, phi4, etc.) */
  ollamaModel?: string;
  /** Base URL of the Ollama server */
  ollamaBaseUrl?: string;
  /** Transcription provider: openai cloud or custom OpenAI-compatible (local) */
  transcriptionProvider?: "openai" | "custom";
  /** Custom base URL for OpenAI-compatible transcription endpoint (should include protocol, no trailing /v1/audio/) */
  transcriptionBaseUrl?: string; // e.g. http://localhost:8080
  /** Model for transcription (OpenAI: gpt-4o-transcribe | whisper-1; local: whatever server exposes) */
  transcriptionModel?: string;
  /** Mode for summary prompts */
  summaryMode?: "meeting" | "study";
}

const STORAGE_KEY = "_llm_provider_settings";

const DEFAULT_SETTINGS: LLMProviderSettings = {
  provider: "openai",
  ollamaModel: "llama3.1", // default baseline
  ollamaBaseUrl: "http://localhost:11434",
  transcriptionProvider: "openai",
  transcriptionBaseUrl: "https://api.openai.com",
  transcriptionModel: "gpt-4o-transcribe",
  summaryMode: "meeting",
};

export async function getLLMProviderSettings(): Promise<LLMProviderSettings> {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(raw as LLMProviderSettings) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setLLMProviderSettings(
  settings: Partial<LLMProviderSettings>,
) {
  const current = await getLLMProviderSettings();
  const merged: LLMProviderSettings = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}

export async function isUsingOllama(): Promise<boolean> {
  const s = await getLLMProviderSettings();
  return s.provider === "ollama";
}
