import type { Settings } from "./settings";
import type { CanvasTodoItem } from "./canvas";
import type { BuddyState } from "./buddy";

export interface SettingsUpdatedMessage {
  readonly type: "SETTINGS_UPDATED";
  readonly settings: Settings;
}

export interface FetchTodoMessage {
  readonly type: "FETCH_TODO";
}

export interface TodoResultMessage {
  readonly type: "TODO_RESULT";
  readonly items: readonly CanvasTodoItem[];
  readonly error: string | null;
}

export interface BuddyStateUpdatedMessage {
  readonly type: "BUDDY_STATE_UPDATED";
  readonly state: BuddyState;
}

export interface PingMessage {
  readonly type: "PING";
}

export type ExtensionMessage =
  | SettingsUpdatedMessage
  | FetchTodoMessage
  | TodoResultMessage
  | BuddyStateUpdatedMessage
  | PingMessage;
