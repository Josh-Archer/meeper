import memoizeOne from "memoize-one";
import { decrypt, encrypt } from "../lib/encryption";
import { retry } from "../lib/system";
import { getLLMProviderSettings } from "./providerSettings";

const OPENAI_API_KEY = "_oak";

export const getOpenAiApiKey = memoizeOne(async () => {
  const settings = await getLLMProviderSettings();
  const requiresKey =
    settings.provider === "openai" || settings.transcriptionProvider === "openai";

  if (!requiresKey) {
    // Fully local mode – skip key requirement
    return null;
  }

  const { [OPENAI_API_KEY]: encrypted } = await chrome.storage.local.get(
    OPENAI_API_KEY,
  );
  if (!encrypted) throw new NoApiKeyError();

  const apiKey = await decrypt(encrypted).catch(() => null);
  if (!apiKey) throw new NoApiKeyError();

  await validateApiKey(apiKey);

  return apiKey;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "APIKEY_REFRESHED") {
    getOpenAiApiKey.clear();
  }
});

export async function setOpenAiApiKey(apiKey: string | null) {
  if (!apiKey) {
    return chrome.storage.local.remove(OPENAI_API_KEY);
  }

  const encrypted = await encrypt(apiKey);
  await chrome.storage.local.set({ [OPENAI_API_KEY]: encrypted });
  chrome.runtime.sendMessage({ type: "APIKEY_REFRESHED" });
}

export async function validateApiKey(apiKey: string) {
  try {
    await retry(
      async () => {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.status === 401 || res.status === 403) {
          throw new InvalidApiKeyError("Unauthorized: invalid API key");
        }
        if (!res.ok) {
          throw new Error(`OpenAI validate failed: ${res.status}`);
        }
        // minimal body check (avoid bundling types / SDK)
        await res.json().catch(() => {});
      },
      0,
      2,
    );
  } catch (err: any) {
    if (err instanceof InvalidApiKeyError) throw err;
    throw new InvalidApiKeyError(err?.message || "Failed to validate API key");
  }
}

export class NoApiKeyError extends Error {}
export class InvalidApiKeyError extends Error {}
export class NonWorkingApiKeyError extends Error {}
