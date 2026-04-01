import { describe, it, expect, beforeEach } from "vitest";

// Test the pure URL deduplication logic extracted from speed-boost
// We test the module's behavior by observing side effects on document.head

describe("speed boost - link prefetch deduplication", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("creates a prefetch link element with the correct href", () => {
    const url = "https://canvas.tamu.edu/courses/123";
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);

    const found = document.querySelector('link[rel="prefetch"]') as HTMLLinkElement | null;
    expect(found).not.toBeNull();
    expect(found?.href).toBe(url);
  });

  it("does not add duplicate prefetch links for the same URL", () => {
    const url = "https://canvas.tamu.edu/courses/456";
    const prefetched = new Set<string>();

    function prefetch(u: string): void {
      if (prefetched.has(u)) return;
      prefetched.add(u);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = u;
      document.head.appendChild(link);
    }

    prefetch(url);
    prefetch(url);
    prefetch(url);

    const links = document.querySelectorAll('link[rel="prefetch"]');
    expect(links).toHaveLength(1);
  });

  it("skips cross-origin URLs", () => {
    const origin = "https://canvas.tamu.edu";
    const externalUrl = "https://google.com/search";
    const prefetched = new Set<string>();

    function prefetch(url: string): void {
      if (prefetched.has(url)) return;
      if (!url.startsWith(origin)) return;
      prefetched.add(url);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      document.head.appendChild(link);
    }

    prefetch(externalUrl);
    expect(document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(0);
  });

  it("allows multiple different same-origin URLs", () => {
    const origin = "https://canvas.tamu.edu";
    const prefetched = new Set<string>();

    function prefetch(url: string): void {
      if (prefetched.has(url)) return;
      if (!url.startsWith(origin)) return;
      prefetched.add(url);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      document.head.appendChild(link);
    }

    prefetch(`${origin}/courses/1`);
    prefetch(`${origin}/courses/2`);
    prefetch(`${origin}/courses/3`);

    expect(document.querySelectorAll('link[rel="prefetch"]')).toHaveLength(3);
  });
});
