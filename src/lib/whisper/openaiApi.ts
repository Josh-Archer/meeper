import axios, { RawAxiosRequestHeaders } from "axios";
import { getLLMProviderSettings } from "../../core/providerSettings";

const OPENAI_WHISPER_ENDPOINT = "https://api.openai.com/v1/audio/";

export async function requestWhisperOpenaiApi(
  file: File,
  mode: "transcriptions" | "translations" = "transcriptions",
  opts: Record<string, any> = {},
) {
  const settings = await getLLMProviderSettings();
  const useCustom = settings.transcriptionProvider === "custom";
  const baseUrl = useCustom
    ? (settings.transcriptionBaseUrl || "http://localhost:8000").replace(/\/$/, "")
    : OPENAI_WHISPER_ENDPOINT.replace(/v1\/audio\//, "");
  const endpoint = `${baseUrl}/v1/audio/`;
  const modelName = useCustom
    ? settings.transcriptionModel || opts.model || "whisper-1"
    : opts.model || settings.transcriptionModel || "gpt-4o-transcribe";

  // Whisper only accept multipart/form-data currently
  const body = new FormData();
  body.append("file", file);
  body.append("model", modelName);

  if (mode === "transcriptions" && opts.language) {
    body.append("language", opts.language);
  }
  if (opts.prompt) {
    body.append("prompt", opts.prompt);
  }
  if (opts.response_format) {
    body.append("response_format", opts.response_format);
  }
  if (opts.temperature) {
    body.append("temperature", `${opts.temperature}`);
  }

  const headers: RawAxiosRequestHeaders = {};
  headers["Content-Type"] = "multipart/form-data";
  if (opts.apiKey) {
    headers["Authorization"] = `Bearer ${opts.apiKey}`;
  }

  console.log("Whisper API Debug:", {
    useCustom,
    endpoint: endpoint + mode,
    modelName,
    hasApiKey: !!opts.apiKey,
    transcriptionProvider: settings.transcriptionProvider,
    baseUrl: settings.transcriptionBaseUrl
  });

  const response = await axios.post(endpoint + mode, body, {
    headers,
    timeout: 30_000,
  });

  console.log("Whisper response:", response.data);
  return response.data.text as string;
}
