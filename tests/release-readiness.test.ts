import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CANVAS_MATCH_PATTERNS } from "../src/content/canvas-targets";

type Manifest = {
  readonly manifest_version: number;
  readonly version: string;
  readonly permissions?: readonly string[];
  readonly host_permissions?: readonly string[];
  readonly background?: unknown;
  readonly content_scripts?: readonly Array<{
    readonly matches?: readonly string[];
    readonly js?: readonly string[];
    readonly run_at?: string;
  }>;
  readonly web_accessible_resources?: readonly Array<{
    readonly resources?: readonly string[];
    readonly matches?: readonly string[];
  }>;
};

type PackageJson = {
  readonly version: string;
  readonly scripts?: Record<string, string>;
};

const root = resolve(__dirname, "..");

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(root, path), "utf8")) as T;
}

function readText(path: string): string {
  return readFileSync(resolve(root, path), "utf8");
}

describe("Chrome Web Store beta readiness", () => {
  it("keeps beta versioning synchronized for a first store submission", () => {
    const manifest = readJson<Manifest>("src/public/manifest.json");
    const packageJson = readJson<PackageJson>("package.json");

    expect(packageJson.version).toBe("0.1.0");
    expect(manifest.version).toBe(packageJson.version);
  });

  it("uses declarative content scripts and only production-safe permissions", () => {
    const manifest = readJson<Manifest>("src/public/manifest.json");

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(["storage"]);
    expect(manifest.permissions).not.toEqual(expect.arrayContaining(["activeTab", "scripting", "tabs", "alarms"]));
    expect(manifest.host_permissions).toEqual([...CANVAS_MATCH_PATTERNS]);
    expect(manifest.background).toBeUndefined();
    expect(manifest.content_scripts).toEqual([
      {
        matches: [...CANVAS_MATCH_PATTERNS],
        js: ["content.js"],
        run_at: "document_idle",
      },
    ]);
  });

  it("keeps sprite assets available only on known Canvas hosts", () => {
    const manifest = readJson<Manifest>("src/public/manifest.json");

    expect(manifest.web_accessible_resources).toEqual([
      {
        resources: ["sprites/*.png"],
        matches: [...CANVAS_MATCH_PATTERNS],
      },
    ]);
  });

  it("provides a release script that gates and packages the upload zip", () => {
    const packageJson = readJson<PackageJson>("package.json");
    const releaseScript = packageJson.scripts?.["release:chrome"];

    expect(releaseScript).toContain("npm run test");
    expect(releaseScript).toContain("npm run typecheck");
    expect(releaseScript).toContain("npm run lint");
    expect(releaseScript).toContain("npm run build");
    expect(releaseScript).toContain("node scripts/package-chrome-beta.mjs");
  });

  it("excludes local desktop metadata from the Chrome upload zip", () => {
    const packageScript = readText("scripts/package-chrome-beta.mjs");

    expect(packageScript).toContain("*.DS_Store");
    expect(packageScript).toContain("__MACOSX/*");
  });

  it("does not build an unused background worker for the beta package", () => {
    const viteConfig = readText("vite.config.ts");

    expect(viteConfig).not.toContain("background");
    expect(viteConfig).not.toContain("service-worker");
  });

  it("ships store, privacy, support, and reviewer materials", () => {
    const privacy = readText("docs/privacy-policy.md");
    const support = readText("docs/support.md");
    const listing = readText("docs/chrome-store-listing.md");
    const reviewer = readText("docs/reviewer-test-instructions.md");
    const promo = readText("assets/store/promo-440x280.svg");

    expect(privacy).toContain("Canvas data is processed locally");
    expect(privacy).toContain("does not sell");
    expect(privacy).toContain("does not use remote code");
    expect(support).toContain("Trusted beta");
    expect(listing).toContain("Education");
    expect(listing).toContain("not affiliated with Instructure");
    expect(reviewer).toContain("trusted testers");
    expect(reviewer).toContain("without a Canvas login");
    expect(promo).toContain('width="440"');
    expect(promo).toContain('height="280"');
  });
});
