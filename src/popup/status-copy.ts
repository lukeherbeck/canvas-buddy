import type { BuddyState } from "../types/buddy";
import type { Settings } from "../types/settings";
import type { ContentDiagnostics } from "../content/diagnostics";

export type PopupHealthRow = {
  readonly label: string;
  readonly value: string;
  readonly active: boolean;
};

export type PopupHealthSummary = {
  readonly title: string;
  readonly rows: readonly PopupHealthRow[];
  readonly trustMessage: string;
};

export type PopupHealthInput = {
  readonly diagnostics: ContentDiagnostics | null;
  readonly settings: Settings;
  readonly buddyState: BuddyState | null;
};

export function buildPopupHealthSummary(input: PopupHealthInput): PopupHealthSummary {
  const canvasDetected = input.diagnostics?.canvasDetected === true;
  const settingsLoaded = input.diagnostics?.settingsLoaded === true;
  const panelMounted = input.diagnostics?.panelMounted === true;
  const buddyChosen = input.buddyState?.chosen === true;

  return {
    title: titleForState(input.settings.enabled, canvasDetected),
    trustMessage: "Local-only beta. No analytics, ads, backend, or remote code.",
    rows: [
      {
        label: "Extension",
        value: input.settings.enabled ? "On" : "Off",
        active: input.settings.enabled,
      },
      {
        label: "Canvas",
        value: canvasDetected ? "Detected" : "Waiting",
        active: canvasDetected,
      },
      {
        label: "Quest sync",
        value: questSyncValue(input.settings.enabled, canvasDetected, settingsLoaded, panelMounted),
        active: input.settings.enabled && canvasDetected && panelMounted,
      },
      {
        label: "Buddy",
        value: buddyChosen ? `${input.buddyState.name} Lv ${input.buddyState.level}` : "Choose starter",
        active: buddyChosen,
      },
      {
        label: "Local data",
        value: "Chrome only",
        active: true,
      },
    ],
  };
}

function titleForState(enabled: boolean, canvasDetected: boolean): string {
  if (!enabled) return "Paused";
  return canvasDetected ? "Ready for quests" : "Open Canvas to sync";
}

function questSyncValue(
  enabled: boolean,
  canvasDetected: boolean,
  settingsLoaded: boolean,
  panelMounted: boolean
): string {
  if (!enabled) return "Paused";
  if (!canvasDetected) return "Waiting";
  if (panelMounted) return "Panel active";
  if (settingsLoaded) return "Canvas detected";
  return "Syncing";
}
