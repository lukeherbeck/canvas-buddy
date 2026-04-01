import { describe, it, expect, beforeEach } from "vitest";
import { injectOrUpdateStyle, removeStyle } from "../../src/content/utils/dom";

describe("injectOrUpdateStyle", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("injects a new style element into head", () => {
    injectOrUpdateStyle("cb-test-style", "body { color: red; }");
    const el = document.getElementById("cb-test-style") as HTMLStyleElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toBe("body { color: red; }");
  });

  it("updates existing style element rather than creating a duplicate", () => {
    injectOrUpdateStyle("cb-test-style", "body { color: red; }");
    injectOrUpdateStyle("cb-test-style", "body { color: blue; }");

    const els = document.querySelectorAll("#cb-test-style");
    expect(els).toHaveLength(1);
    expect((els[0] as HTMLStyleElement).textContent).toBe("body { color: blue; }");
  });
});

describe("removeStyle", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("removes an existing style element", () => {
    injectOrUpdateStyle("cb-remove-test", "body {}");
    removeStyle("cb-remove-test");
    expect(document.getElementById("cb-remove-test")).toBeNull();
  });

  it("does not throw when the element does not exist", () => {
    expect(() => removeStyle("cb-nonexistent")).not.toThrow();
  });
});
