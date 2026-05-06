import { describe, expect, it } from "vitest";
import { buildPopupHealthSummary } from "../src/popup/status-copy";
import { DEFAULT_SETTINGS } from "../src/types/settings";
import type { BuddyState } from "../src/types/buddy";

const chosenBuddy: BuddyState = {
  chosen: true,
  starterId: "inklet",
  name: "Sprout",
  level: 4,
  xp: 120,
  totalXp: 420,
  evolutionStage: 1,
  totalCompleted: 8,
  streak: 3,
  lastActivityDate: "2026-05-06",
  seenAssignments: [],
};

describe("buildPopupHealthSummary", () => {
  it("summarizes a ready Canvas quest session", () => {
    const summary = buildPopupHealthSummary({
      diagnostics: {
        canvasDetected: true,
        settingsLoaded: true,
        panelMounted: true,
        updatedAt: 1_700_000_000_000,
      },
      settings: DEFAULT_SETTINGS,
      buddyState: chosenBuddy,
    });

    expect(summary.title).toBe("Ready for quests");
    expect(summary.rows).toContainEqual({ label: "Quest sync", value: "Panel active", active: true });
    expect(summary.rows).toContainEqual({ label: "Buddy", value: "Sprout Lv 4", active: true });
    expect(summary.rows).toContainEqual({ label: "Local data", value: "Chrome only", active: true });
    expect(summary.trustMessage).toBe("Local-only beta. No analytics, ads, backend, or remote code.");
  });

  it("keeps the no-Canvas state reviewer-friendly", () => {
    const summary = buildPopupHealthSummary({
      diagnostics: null,
      settings: DEFAULT_SETTINGS,
      buddyState: null,
    });

    expect(summary.title).toBe("Open Canvas to sync");
    expect(summary.rows).toContainEqual({ label: "Canvas", value: "Waiting", active: false });
    expect(summary.rows).toContainEqual({ label: "Quest sync", value: "Waiting", active: false });
    expect(summary.rows).toContainEqual({ label: "Buddy", value: "Choose starter", active: false });
  });

  it("makes the paused state clear", () => {
    const summary = buildPopupHealthSummary({
      diagnostics: { canvasDetected: true, settingsLoaded: true, panelMounted: true },
      settings: { ...DEFAULT_SETTINGS, enabled: false },
      buddyState: chosenBuddy,
    });

    expect(summary.title).toBe("Paused");
    expect(summary.rows).toContainEqual({ label: "Extension", value: "Off", active: false });
    expect(summary.rows).toContainEqual({ label: "Quest sync", value: "Paused", active: false });
  });
});
