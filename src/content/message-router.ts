import type { ExtensionMessage } from "../types/messages";
import type { Settings } from "../types/settings";

type MessageActions = {
  readonly applySettings: (settings: Settings) => void;
  readonly refreshBuddyPanel: () => void;
  readonly refreshTodoPanel: () => void;
};

export function handleExtensionMessage(
  message: unknown,
  actions: MessageActions
): boolean {
  if (!isExtensionMessage(message)) return false;

  if (message.type === "SETTINGS_UPDATED") {
    actions.applySettings(message.settings);
    return true;
  }

  if (message.type === "BUDDY_UPDATED") {
    actions.refreshBuddyPanel();
    return true;
  }

  if (message.type === "FETCH_TODO") {
    actions.refreshTodoPanel();
    return true;
  }

  return false;
}

function isExtensionMessage(message: unknown): message is ExtensionMessage {
  if (typeof message !== "object" || message === null) return false;
  const record = message as { readonly type?: unknown; readonly settings?: unknown };
  if (record.type === "SETTINGS_UPDATED") {
    return typeof record.settings === "object" && record.settings !== null;
  }
  return record.type === "BUDDY_UPDATED" || record.type === "FETCH_TODO";
}
