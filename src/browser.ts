// Safari uses `browser.*` (WebExtension standard) or falls back to `chrome.*`.
// This shim normalizes to a single `ext` export usable everywhere.
const _browser = (globalThis as unknown as { browser?: typeof chrome }).browser;
const _chrome = (globalThis as unknown as { chrome?: typeof chrome }).chrome;

const stubStorageArea = {
  get(_keys: unknown, callback?: (items: Record<string, unknown>) => void): void {
    callback?.({});
  },
  set(_items: Record<string, unknown>, callback?: () => void): void {
    callback?.();
  },
  remove(_keys: unknown, callback?: () => void): void {
    callback?.();
  },
};

const stub = {
  runtime: {
    getURL: (path: string): string => `/${path}`,
    onInstalled: { addListener: (): void => undefined },
    onMessage: { addListener: (): void => undefined },
  },
  alarms: {
    create: (): void => undefined,
    onAlarm: { addListener: (): void => undefined },
  },
  storage: {
    local: stubStorageArea,
    sync: stubStorageArea,
    onChanged: { addListener: (): void => undefined },
  },
  tabs: {
    query: (_queryInfo: unknown, callback?: (tabs: chrome.tabs.Tab[]) => void): void => {
      callback?.([]);
    },
    sendMessage: (): Promise<void> => Promise.resolve(),
  },
  scripting: {
    executeScript: (): Promise<void> => Promise.resolve(),
  },
} as unknown as typeof chrome;

export const ext: typeof chrome = _browser ?? _chrome ?? stub;
