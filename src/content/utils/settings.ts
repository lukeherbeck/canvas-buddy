import type { Settings } from "../../types/settings";
import { DEFAULT_SETTINGS } from "../../types/settings";
import { ext } from "../../browser";

function getStorage(): typeof chrome.storage {
  return ext.storage;
}

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    getStorage().sync.get("canvasbuddy_settings", (result) => {
      const stored = (result as Record<string, unknown>)["canvasbuddy_settings"] as Partial<Settings> | undefined;
      if (stored === undefined) {
        resolve(DEFAULT_SETTINGS);
        return;
      }
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        customColors: {
          ...DEFAULT_SETTINGS.customColors,
          ...(stored.customColors ?? {}),
        },
      });
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    getStorage().sync.set({ canvasbuddy_settings: settings }, resolve);
  });
}

export function watchSettings(callback: (settings: Settings) => void): void {
  ext.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "sync" && "canvasbuddy_settings" in changes) {
      const newValue = changes["canvasbuddy_settings"]?.newValue as Settings | undefined;
      if (newValue !== undefined) {
        callback(newValue);
      }
    }
  });
}
