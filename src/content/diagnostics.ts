import { ext } from "../browser";

export const DIAGNOSTICS_STORAGE_KEY = "canvasbuddy_diagnostics";

export type ContentDiagnostics = {
  readonly contentRanAt?: number;
  readonly canvasDetected?: boolean;
  readonly settingsLoaded?: boolean;
  readonly panelMounted?: boolean;
  readonly lastError?: string;
  readonly updatedAt?: number;
};

export function recordDiagnostic(patch: ContentDiagnostics): void {
  if (typeof ext.storage?.local?.get !== "function" || typeof ext.storage.local.set !== "function") return;

  ext.storage.local.get(DIAGNOSTICS_STORAGE_KEY, (result) => {
    const previous = (result as Record<string, unknown>)[DIAGNOSTICS_STORAGE_KEY] as ContentDiagnostics | undefined;
    ext.storage.local.set({
      [DIAGNOSTICS_STORAGE_KEY]: {
        ...(previous ?? {}),
        ...patch,
        updatedAt: Date.now(),
      },
    });
  });
}

export async function loadDiagnostics(): Promise<ContentDiagnostics | null> {
  if (typeof ext.storage?.local?.get !== "function") return null;

  return new Promise((resolve) => {
    ext.storage.local.get(DIAGNOSTICS_STORAGE_KEY, (result) => {
      const stored = (result as Record<string, unknown>)[DIAGNOSTICS_STORAGE_KEY] as ContentDiagnostics | undefined;
      resolve(stored ?? null);
    });
  });
}
