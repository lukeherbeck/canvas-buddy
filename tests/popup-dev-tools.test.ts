import { describe, expect, it } from "vitest";
import { shouldShowDevTools } from "../src/popup/dev-tools";

describe("shouldShowDevTools", () => {
  it("hides developer controls in production by default", () => {
    expect(shouldShowDevTools({ viteDev: false, storedPreference: false })).toBe(false);
  });

  it("shows developer controls only when a local dev build opts in", () => {
    expect(shouldShowDevTools({ viteDev: true, storedPreference: false })).toBe(false);
    expect(shouldShowDevTools({ viteDev: true, storedPreference: true })).toBe(true);
  });

  it("ignores stored overrides in production builds", () => {
    expect(shouldShowDevTools({ viteDev: false, storedPreference: true })).toBe(false);
  });
});
