// Safari uses `browser.*` (WebExtension standard) or falls back to `chrome.*`.
// This shim normalizes to a single `ext` export usable everywhere.
const _browser = (globalThis as unknown as { browser?: typeof chrome }).browser;
const _chrome = (globalThis as unknown as { chrome?: typeof chrome }).chrome;

// In test environments neither may exist - provide a safe no-op stub
const stub = {} as typeof chrome;

export const ext: typeof chrome = _browser ?? _chrome ?? stub;
