import classNames from "clsx";

import { WEBSITE_URL } from "../config/env";

import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Check } from "lucide-react";
import { useApiKeyState } from "./ApiKeyDialog";
import { useEffect, useState } from "react";
import {
  getLLMProviderSettings,
  setLLMProviderSettings,
  LLMProviderSettings,
} from "../core/providerSettings";

export default function SettingsPage() {
  const { apiKeyEntered, openApiKeyDialog } = useApiKeyState();
  const [providerSettings, setProviderSettings] =
    useState<LLMProviderSettings | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);

  const [ollamaUrlValid, setOllamaUrlValid] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [trUrlValid, setTrUrlValid] = useState<boolean | null>(null);
  const [trModels, setTrModels] = useState<string[]>([]);

  useEffect(() => {
    getLLMProviderSettings().then(setProviderSettings).catch(console.error);
  }, []);

  const updateSettings = async (patch: Partial<LLMProviderSettings>) => {
    if (!providerSettings) return;
    setSavingProvider(true);
    const merged = await setLLMProviderSettings(patch).catch(console.error);
    if (merged) setProviderSettings(merged);
    setSavingProvider(false);
  };

  useEffect(() => {
    if (!providerSettings || providerSettings.provider !== "ollama") return;
    const url = providerSettings.ollamaBaseUrl?.replace(/\/$/, "");
    if (!url) {
      setOllamaUrlValid(null);
      setOllamaModels([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${url}/api/tags`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          const models =
            (d?.models || []).map((m: any) => m.name || m).filter(Boolean);
          setOllamaModels(models);
          setOllamaUrlValid(true);
        })
        .catch(() => {
          setOllamaUrlValid(false);
          setOllamaModels([]);
        });
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [providerSettings?.ollamaBaseUrl, providerSettings?.provider]);

  useEffect(() => {
    if (
      !providerSettings ||
      providerSettings.transcriptionProvider !== "custom"
    )
      return;
    const url = providerSettings.transcriptionBaseUrl?.replace(/\/$/, "");
    if (!url) {
      setTrUrlValid(null);
      setTrModels([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${url}/v1/models`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          const models = (d?.data || [])
            .map((m: any) => m.id)
            .filter(Boolean);
          setTrModels(models);
          setTrUrlValid(true);
        })
        .catch(() => {
          setTrUrlValid(false);
          setTrModels([]);
        });
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [
    providerSettings?.transcriptionBaseUrl,
    providerSettings?.transcriptionProvider,
  ]);

  const ollamaModelValid = !!(
    providerSettings?.ollamaModel &&
    ollamaModels.includes(providerSettings.ollamaModel)
  );
  const trModelValid = !!(
    providerSettings?.transcriptionModel &&
    trModels.includes(providerSettings.transcriptionModel)
  );

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
                  <Label htmlFor="ollamaBaseUrl">Ollama Base URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="ollamaBaseUrl"
                      value={providerSettings.ollamaBaseUrl || ""}
                      placeholder="http://localhost:11434"
                      onChange={(e) =>
                        updateSettings({ ollamaBaseUrl: e.target.value })
                      }
                      disabled={savingProvider}
                    />
                    {ollamaUrlValid && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="ollamaModel">Ollama Model</Label>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={providerSettings.ollamaModel || ""}
                      onValueChange={(v) => updateSettings({ ollamaModel: v })}
                      disabled={!ollamaUrlValid || savingProvider}
                    >
                      <SelectTrigger id="ollamaModel">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {ollamaModels.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ollamaModelValid && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
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
                <div className="md:col-span-2">
                  <Label htmlFor="trBase">Base URL</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="trBase"
                      value={providerSettings.transcriptionBaseUrl || ""}
                      placeholder="http://localhost:8080"
                      onChange={(e) =>
                        updateSettings({ transcriptionBaseUrl: e.target.value })
                      }
                      disabled={savingProvider}
                    />
                    {trUrlValid && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                <div className="md:col-span-1">
                  <Label htmlFor="trModel">Model</Label>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={providerSettings.transcriptionModel || ""}
                      onValueChange={(v) =>
                        updateSettings({ transcriptionModel: v })
                      }
                      disabled={!trUrlValid || savingProvider}
                    >
                      <SelectTrigger id="trModel">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {trModels.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {trModelValid && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
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
