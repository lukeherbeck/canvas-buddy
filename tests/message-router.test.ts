import { describe, expect, it, vi } from "vitest";
import { handleExtensionMessage } from "../src/content/message-router";
import { DEFAULT_SETTINGS } from "../src/types/settings";

describe("handleExtensionMessage", () => {
  it("applies popup settings updates", () => {
    const applySettings = vi.fn();

    const handled = handleExtensionMessage(
      { type: "SETTINGS_UPDATED", settings: { ...DEFAULT_SETTINGS, enabled: false } },
      { applySettings, refreshBuddyPanel: vi.fn(), refreshTodoPanel: vi.fn() }
    );

    expect(handled).toBe(true);
    expect(applySettings).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, enabled: false });
  });

  it("routes buddy and todo refresh messages", () => {
    const refreshBuddyPanel = vi.fn();
    const refreshTodoPanel = vi.fn();
    const actions = { applySettings: vi.fn(), refreshBuddyPanel, refreshTodoPanel };

    expect(handleExtensionMessage({ type: "BUDDY_UPDATED" }, actions)).toBe(true);
    expect(handleExtensionMessage({ type: "FETCH_TODO" }, actions)).toBe(true);

    expect(refreshBuddyPanel).toHaveBeenCalledTimes(1);
    expect(refreshTodoPanel).toHaveBeenCalledTimes(1);
  });

  it("ignores unknown or malformed messages", () => {
    const actions = { applySettings: vi.fn(), refreshBuddyPanel: vi.fn(), refreshTodoPanel: vi.fn() };

    expect(handleExtensionMessage(null, actions)).toBe(false);
    expect(handleExtensionMessage({ type: "NOPE" }, actions)).toBe(false);
    expect(handleExtensionMessage({ type: "SETTINGS_UPDATED" }, actions)).toBe(false);
  });
});
