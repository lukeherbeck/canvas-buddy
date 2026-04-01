import { loadSettings, watchSettings } from "./utils/settings";
import { mountTodoPanel, unmountTodoPanel } from "./features/todo-panel";
import { mountSmartScroll, unmountSmartScroll } from "./features/smart-scroll";
import { mountSearchBox, unmountSearchBox } from "./features/search-box";
import { mountQuickInbox, unmountQuickInbox } from "./features/quick-inbox";
import { mountSpeedBoost, unmountSpeedBoost } from "./features/speed-boost";
import { applyCustomColors, removeCustomColors } from "./features/custom-colors";
import { applyRounderModules, removeRounderModules } from "./features/rounder-modules";
import { applyTheme, removeTheme } from "./features/theme";
import type { Settings } from "../types/settings";

function isCanvasPage(): boolean {
  const env = (window as unknown as { ENV?: { current_user_id?: unknown } }).ENV;
  return env !== undefined && env.current_user_id !== undefined;
}

if (isCanvasPage()) {
  void initialize();
}

async function initialize(): Promise<void> {
  const settings = await loadSettings();
  applySettings(settings);
  watchSettings(applySettings);
}

function applySettings(settings: Settings): void {
  if (!settings.enabled) {
    teardownAll();
    return;
  }

  applyTheme(settings.theme);

  settings.rounderModules ? applyRounderModules() : removeRounderModules();

  if (settings.customColors.enabled) {
    applyCustomColors(settings.customColors);
  } else {
    removeCustomColors();
  }

  settings.todoPanel ? mountTodoPanel() : unmountTodoPanel();
  settings.smartScrolling ? mountSmartScroll() : unmountSmartScroll();
  settings.searchBox ? mountSearchBox() : unmountSearchBox();
  settings.quickInbox ? mountQuickInbox() : unmountQuickInbox();
  settings.speedBoost ? mountSpeedBoost() : unmountSpeedBoost();
}

function teardownAll(): void {
  removeTheme();
  removeRounderModules();
  removeCustomColors();
  unmountTodoPanel();
  unmountSmartScroll();
  unmountSearchBox();
  unmountQuickInbox();
  unmountSpeedBoost();
}
