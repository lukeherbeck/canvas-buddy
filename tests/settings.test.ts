import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "../src/types/settings";
import type { Settings } from "../src/types/settings";

describe("DEFAULT_SETTINGS", () => {
  it("has all features enabled by default", () => {
    expect(DEFAULT_SETTINGS.enabled).toBe(true);
    expect(DEFAULT_SETTINGS.todoPanel).toBe(true);
    expect(DEFAULT_SETTINGS.rounderModules).toBe(true);
    expect(DEFAULT_SETTINGS.smartScrolling).toBe(true);
    expect(DEFAULT_SETTINGS.searchBox).toBe(true);
    expect(DEFAULT_SETTINGS.quickInbox).toBe(true);
    expect(DEFAULT_SETTINGS.speedBoost).toBe(true);
  });

  it("defaults theme to default", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("default");
  });

  it("has custom colors disabled by default", () => {
    expect(DEFAULT_SETTINGS.customColors.enabled).toBe(false);
  });

  it("has valid hex color defaults", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    expect(DEFAULT_SETTINGS.customColors.linkColor).toMatch(hexPattern);
    expect(DEFAULT_SETTINGS.customColors.sidebarColor).toMatch(hexPattern);
    expect(DEFAULT_SETTINGS.customColors.accentColor).toMatch(hexPattern);
  });
});

describe("Settings type", () => {
  it("can merge partial stored settings with defaults", () => {
    const stored: Partial<Settings> = { theme: "dark", rounderModules: false };
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      customColors: {
        ...DEFAULT_SETTINGS.customColors,
        ...(stored.customColors ?? {}),
      },
    };

    expect(merged.theme).toBe("dark");
    expect(merged.rounderModules).toBe(false);
    expect(merged.todoPanel).toBe(true); // from defaults
    expect(merged.customColors.enabled).toBe(false); // from defaults
  });

  it("partial custom colors merge correctly", () => {
    const stored: Partial<Settings> = {
      customColors: {
        enabled: true,
        linkColor: "#ff0000",
        sidebarColor: DEFAULT_SETTINGS.customColors.sidebarColor,
        accentColor: DEFAULT_SETTINGS.customColors.accentColor,
      },
    };
    const merged: Settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      customColors: {
        ...DEFAULT_SETTINGS.customColors,
        ...(stored.customColors ?? {}),
      },
    };

    expect(merged.customColors.enabled).toBe(true);
    expect(merged.customColors.linkColor).toBe("#ff0000");
    expect(merged.customColors.sidebarColor).toBe(DEFAULT_SETTINGS.customColors.sidebarColor);
  });
});
