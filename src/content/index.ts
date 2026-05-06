import { loadSettings, watchSettings } from "./utils/settings";
import { mountTodoPanel, refreshBuddyPanel, refreshTodoPanel, unmountTodoPanel } from "./features/todo-panel";
import { mountSmartScroll, unmountSmartScroll } from "./features/smart-scroll";
import { mountSearchBox, unmountSearchBox } from "./features/search-box";
import { mountQuickInbox, unmountQuickInbox } from "./features/quick-inbox";
import { mountSpeedBoost, unmountSpeedBoost } from "./features/speed-boost";
import { applyCustomColors, removeCustomColors } from "./features/custom-colors";
import { applyRounderModules, removeRounderModules } from "./features/rounder-modules";
import { applyTheme, removeTheme } from "./features/theme";
import { isCanvasPage } from "./canvas-targets";
import { recordDiagnostic } from "./diagnostics";
import { handleExtensionMessage } from "./message-router";
import { ext } from "../browser";
import type { Settings } from "../types/settings";

type WindowWithGuard = Window & { __canvasbuddyInit?: boolean };

if (!(window as WindowWithGuard).__canvasbuddyInit) {
  (window as WindowWithGuard).__canvasbuddyInit = true;

  const canvasDetected = isCanvasPage();
  recordDiagnostic({
    contentRanAt: Date.now(),
    canvasDetected,
    settingsLoaded: false,
    panelMounted: false,
  });

  if (canvasDetected) {
    void initialize();
  }
}

async function initialize(): Promise<void> {
  try {
    const settings = await loadSettings();
    recordDiagnostic({ settingsLoaded: true });
    applySettings(settings);
    watchSettings(applySettings);
  } catch (err) {
    recordDiagnostic({
      lastError: err instanceof Error ? err.message : "Unknown initialization error",
    });
  }
}

function applySettings(settings: Settings): void {
  if (!settings.enabled) {
    teardownAll();
    recordDiagnostic({ panelMounted: false });
    return;
  }

  applyTheme(settings.theme);

  if (settings.rounderModules) {
    applyRounderModules();
  } else {
    removeRounderModules();
  }

  if (settings.customColors.enabled) {
    applyCustomColors(settings.customColors);
  } else {
    removeCustomColors();
  }

  if (settings.todoPanel) {
    mountTodoPanel();
  } else {
    unmountTodoPanel();
  }

  if (settings.smartScrolling) {
    mountSmartScroll();
  } else {
    unmountSmartScroll();
  }

  if (settings.searchBox) {
    mountSearchBox();
  } else {
    unmountSearchBox();
  }

  if (settings.quickInbox) {
    mountQuickInbox();
  } else {
    unmountQuickInbox();
  }

  if (settings.speedBoost) {
    mountSpeedBoost();
  } else {
    unmountSpeedBoost();
  }
  recordDiagnostic({ panelMounted: settings.todoPanel });
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

ext.runtime.onMessage.addListener((message: unknown) => {
  return handleExtensionMessage(message, {
    applySettings,
    refreshBuddyPanel,
    refreshTodoPanel,
  });
});
