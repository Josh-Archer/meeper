export interface ScreenshotSettings {
  /** Interval in seconds for automatic screenshots. 0 disables. */
  intervalSec: number;
}

const STORAGE_KEY = "_screenshot_settings";

const DEFAULT_SETTINGS: ScreenshotSettings = {
  intervalSec: 0,
};

export async function getScreenshotSettings(): Promise<ScreenshotSettings> {
  const { [STORAGE_KEY]: raw } = await chrome.storage.local.get(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(raw as ScreenshotSettings) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function setScreenshotSettings(patch: Partial<ScreenshotSettings>) {
  const current = await getScreenshotSettings();
  const merged: ScreenshotSettings = { ...current, ...patch };
  await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  return merged;
}
