import { describe, expect, it } from "vitest";
import { isCanvasPage, isExtensionTargetUrl } from "../src/content/canvas-targets";

describe("isCanvasPage", () => {
  it("accepts logged-in Canvas pages with current user ENV", () => {
    const doc = document.implementation.createHTMLDocument();
    const win = { ENV: { current_user_id: 123 } };

    expect(isCanvasPage(win, doc)).toBe(true);
  });

  it("accepts Canvas shell pages with the app container", () => {
    const doc = document.implementation.createHTMLDocument();
    const app = doc.createElement("div");
    app.className = "ic-app";
    doc.body.appendChild(app);

    expect(isCanvasPage({}, doc)).toBe(true);
  });

  it("rejects non-Canvas pages", () => {
    const doc = document.implementation.createHTMLDocument();

    expect(isCanvasPage({ ENV: {} }, doc)).toBe(false);
  });
});

describe("isExtensionTargetUrl", () => {
  it("accepts Instructure-hosted Canvas pages", () => {
    expect(isExtensionTargetUrl("https://school.instructure.com/courses/42")).toBe(true);
    expect(isExtensionTargetUrl("https://canvas.instructure.com/profile")).toBe(true);
  });

  it("accepts the Texas A&M Canvas host", () => {
    expect(isExtensionTargetUrl("https://canvas.tamu.edu/courses/42")).toBe(true);
  });

  it("rejects non-Canvas and restricted browser URLs", () => {
    expect(isExtensionTargetUrl("https://example.com/courses/42")).toBe(false);
    expect(isExtensionTargetUrl("chrome://extensions")).toBe(false);
    expect(isExtensionTargetUrl("about:blank")).toBe(false);
  });
});
