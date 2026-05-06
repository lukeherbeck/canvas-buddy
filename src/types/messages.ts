import type { Settings } from "./settings";

export interface SettingsUpdatedMessage {
  readonly type: "SETTINGS_UPDATED";
  readonly settings: Settings;
}

export interface FetchTodoMessage {
  readonly type: "FETCH_TODO";
}

export interface BuddyUpdatedMessage {
  readonly type: "BUDDY_UPDATED";
}

export type ExtensionMessage =
  | SettingsUpdatedMessage
  | FetchTodoMessage
  | BuddyUpdatedMessage;
