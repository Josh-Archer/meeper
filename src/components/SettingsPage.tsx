import classNames from "clsx";

import { WEBSITE_URL } from "../config/env";

import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useApiKeyState } from "./ApiKeyDialog";
import { useEffect, useState } from "react";
import {
  getLLMProviderSettings,
  setLLMProviderSettings,
  LLMProviderSettings,
} from "../core/providerSettings";

export default function SettingsPage() {
  const { apiKeyEntered, openApiKeyDialog } = useApiKeyState();
  const [providerSettings, setProviderSettings] = useState<LLMProviderSettings | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);

  useEffect(() => {
    getLLMProviderSettings().then(setProviderSettings).catch(console.error);
  }, []);

  const updateSettings = async (patch: Partial<LLMProviderSettings>) => {
    if (!providerSettings) return;
    const optimistic = { ...providerSettings, ...patch };
    setProviderSettings(optimistic);
    setSavingProvider(true);
    const merged = await setLLMProviderSettings(patch).catch(console.error);
    if (merged) setProviderSettings(merged);
    setSavingProvider(false);
  };

  return (
    <div className={classNames("min-h-screen flex flex-col items-center")}>
      <div className="my-6 flex items-start select-none">
        <div
          className={classNames("w-[12rem] h-[12rem]", "bg-no-repeat bg-cover")}
          style={{
            backgroundImage: "url(/misc/meeper_winking_face.png)",
            backgroundSize: "100% auto",
          }}
        />

        <div className={classNames("flex flex-col", "mt-[4.5rem] ml-12")}>
          <span className="text-5xl font-bold text-foreground">Meeper</span>

          <span className="mt-4 text-xl font-semibold text-muted-foreground opacity-75">
            Settings
          </span>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl">
        <Separator orientation="horizontal" className="h-px w-full" />
      </div>

  <article className="my-8 w-full prose prose-slate">
        <h2>OpenAI API Key</h2>

        <p>
          Your API Key is stored locally on your browser and never sent anywhere
          else.
        </p>

        <div className="flex items-center">
          <Button type="button" onClick={() => openApiKeyDialog()}>
            {!apiKeyEntered ? "Enter API Key" : "Edit API Key"}
          </Button>

          {apiKeyEntered && <div className="ml-4">✅ Entered.</div>}
        </div>

        <h2>LLM Provider</h2>
        <p>Select which Large Language Model provider to use for summaries.</p>
        {providerSettings && (
          <div className="not-prose mb-6 space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant={providerSettings.provider === "openai" ? "default" : "outline"}
                onClick={() => updateSettings({ provider: "openai" })}
                disabled={savingProvider}
              >
                OpenAI
              </Button>
              <Button
                type="button"
                variant={providerSettings.provider === "ollama" ? "default" : "outline"}
                onClick={() => updateSettings({ provider: "ollama" })}
                disabled={savingProvider}
              >
                Ollama (local)
              </Button>
            </div>
            {providerSettings.provider === "ollama" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="ollamaModel">Ollama Model</Label>
                  <Input
                    id="ollamaModel"
                    value={providerSettings.ollamaModel || ""}
                    placeholder="llama3.1"
                    onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ollamaBaseUrl">Ollama Base URL</Label>
                  <Input
                    id="ollamaBaseUrl"
                    value={providerSettings.ollamaBaseUrl || ""}
                    placeholder="http://localhost:11434"
                    onChange={(e) => updateSettings({ ollamaBaseUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
            {providerSettings.provider === "ollama" && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Ensure you have <code>ollama</code> running locally and the model pulled: e.g. run
                  <code> ollama pull {providerSettings.ollamaModel}</code>.
                </p>
                <p>
                  <strong>WSL Users:</strong> If using WSL, you may need to:
                  1) Run <code>OLLAMA_HOST=0.0.0.0:11434 ollama serve</code>, and
                  2) Use your WSL IP (e.g., <code>http://172.x.x.x:11434</code>) instead of localhost.
                </p>
              </div>
            )}
          </div>
        )}

        <h2>Summary Mode</h2>
        <p>Choose the context used for summaries.</p>
        {providerSettings && (
          <div className="not-prose mb-6 space-y-4 p-4 border rounded-lg">
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant={providerSettings.summaryMode === "meeting" ? "default" : "outline"}
                onClick={() => updateSettings({ summaryMode: "meeting" })}
                disabled={savingProvider}
              >
                Meeting
              </Button>
              <Button
                type="button"
                variant={providerSettings.summaryMode === "study" ? "default" : "outline"}
                onClick={() => updateSettings({ summaryMode: "study" })}
                disabled={savingProvider}
              >
                Study
              </Button>
            </div>
          </div>
        )}

        {providerSettings && (
          <div className="not-prose mb-10 space-y-4 p-4 border rounded-lg">
            <h3 className="mt-0">Transcription Provider (Whisper)</h3>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant={providerSettings.transcriptionProvider === "openai" ? "default" : "outline"}
                onClick={() => updateSettings({ transcriptionProvider: "openai" })}
                disabled={savingProvider}
              >
                OpenAI Cloud
              </Button>
              <Button
                type="button"
                variant={providerSettings.transcriptionProvider === "custom" ? "default" : "outline"}
                onClick={() => updateSettings({ transcriptionProvider: "custom" })}
                disabled={savingProvider}
              >
                Custom (local)
              </Button>
            </div>
            {providerSettings.transcriptionProvider === "custom" && (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-1">
                  <Label htmlFor="trModel">Model</Label>
                  <Input
                    id="trModel"
                    value={providerSettings.transcriptionModel || ""}
                    placeholder="whisper-1"
                    onChange={(e) => updateSettings({ transcriptionModel: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="trBase">Base URL</Label>
                  <Input
                    id="trBase"
                    value={providerSettings.transcriptionBaseUrl || ""}
                    placeholder="http://localhost:8080"
                    onChange={(e) => updateSettings({ transcriptionBaseUrl: e.target.value })}
                  />
                </div>
              </div>
            )}
            {providerSettings.transcriptionProvider === "custom" && (
              <p className="text-xs text-muted-foreground">
                Provide an OpenAI-compatible endpoint exposing <code>/v1/audio/transcriptions</code>.
              </p>
            )}
          </div>
        )}

        {providerSettings && (
          <div className="not-prose mb-10 space-y-2 p-4 border rounded-lg">
            <h3 className="mt-0">Titles</h3>
            <div className="flex items-center space-x-2">
              <input
                id="useVideoTitle"
                type="checkbox"
                className="h-4 w-4"
                checked={providerSettings.useVideoTitle !== false}
                onChange={(e) =>
                  updateSettings({ useVideoTitle: e.target.checked })
                }
              />
              <Label htmlFor="useVideoTitle">
                Use video/header title for transcripts
              </Label>
            </div>
          </div>
        )}

        {WEBSITE_URL && (
          <>
            <h2>Links</h2>

            <ul>
              <li>
                Website:{" "}
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={WEBSITE_URL}
                >
                  meeper.ai
                </a>
              </li>

              <li>
                Github:{" "}
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/pas1ko/meeper"
                >
                  pas1ko/meeper
                </a>
              </li>

              <li>
                Terms:{" "}
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${WEBSITE_URL}terms`}
                >
                  meeper.ai/terms
                </a>
              </li>

              <li>
                Privacy:{" "}
                <a
                  className="text-blue-500 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`${WEBSITE_URL}privacy`}
                >
                  meeper.ai/privacy
                </a>
              </li>
            </ul>
          </>
        )}
      </article>
    </div>
  );
}
