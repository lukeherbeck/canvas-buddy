import type { Settings, ThemeMode } from "../types/settings";
import type { BuddyState } from "../types/buddy";
import { DEFAULT_SETTINGS } from "../types/settings";
import { STARTERS } from "../types/buddy";
import { debounce } from "../content/utils/debounce";
import { ext } from "../browser";

const hasExtApi = typeof ext.storage?.sync?.get === "function";

async function loadSettings(): Promise<Settings> {
  if (!hasExtApi) return DEFAULT_SETTINGS;
  return new Promise((resolve) => {
    ext.storage.sync.get("canvasbuddy_settings", (result) => {
      const stored = (result as Record<string, unknown>)["canvasbuddy_settings"] as Partial<Settings> | undefined;
      if (stored === undefined) { resolve(DEFAULT_SETTINGS); return; }
      resolve({
        ...DEFAULT_SETTINGS,
        ...stored,
        customColors: { ...DEFAULT_SETTINGS.customColors, ...(stored.customColors ?? {}) },
      });
    });
  });
}

async function saveSettings(settings: Settings): Promise<void> {
  if (!hasExtApi) return;
  return new Promise((resolve) => {
    ext.storage.sync.set({ canvasbuddy_settings: settings }, () => {
      notifyContentScript(settings);
      resolve();
    });
  });
}

async function loadBuddyState(): Promise<BuddyState | null> {
  if (!hasExtApi) return null;
  return new Promise((resolve) => {
    ext.storage.local.get("canvasbuddy_buddy", (result) => {
      const stored = (result as Record<string, unknown>)["canvasbuddy_buddy"] as BuddyState | undefined;
      resolve(stored ?? null);
    });
  });
}

function notifyContentScript(settings: Settings): void {
  ext.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab?.id !== undefined) {
      ext.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED", settings }).catch(() => void 0);
    }
  });
}

function makeToggleRow(
  label: string,
  description: string,
  checked: boolean,
  onChange: (val: boolean) => void
): HTMLElement {
  const row = document.createElement("div");
  row.className = "cb-toggle-row";

  const left = document.createElement("div");

  const labelEl = document.createElement("div");
  labelEl.className = "cb-toggle-label";
  labelEl.textContent = label;
  left.appendChild(labelEl);

  if (description !== "") {
    const descEl = document.createElement("div");
    descEl.className = "cb-toggle-desc";
    descEl.textContent = description;
    left.appendChild(descEl);
  }

  row.appendChild(left);

  const toggle = document.createElement("label");
  toggle.className = "cb-toggle";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  const track = document.createElement("span");
  track.className = "cb-toggle-track";

  toggle.appendChild(input);
  toggle.appendChild(track);
  row.appendChild(toggle);

  return row;
}

async function render(): Promise<void> {
  const [settings, buddyState] = await Promise.all([loadSettings(), loadBuddyState()]);

  let current = settings;

  const app = document.getElementById("app");
  if (app === null) return;
  app.innerHTML = "";

  const header = document.createElement("div");
  header.className = "cb-popup-header";
  header.innerHTML = `<span class="cb-popup-logo">CanvasBuddy</span><span class="cb-popup-version">v1.0.0</span>`;
  app.appendChild(header);

  const globalRow = document.createElement("div");
  globalRow.className = "cb-global-toggle";
  const globalLabel = document.createElement("div");
  globalLabel.className = "cb-global-label";
  globalLabel.textContent = "Enabled";
  globalRow.appendChild(globalLabel);

  const globalToggle = document.createElement("label");
  globalToggle.className = "cb-toggle";
  const globalInput = document.createElement("input");
  globalInput.type = "checkbox";
  globalInput.checked = current.enabled;
  const globalTrack = document.createElement("span");
  globalTrack.className = "cb-toggle-track";
  globalToggle.appendChild(globalInput);
  globalToggle.appendChild(globalTrack);
  globalRow.appendChild(globalToggle);
  app.appendChild(globalRow);

  globalInput.addEventListener("change", () => {
    current = { ...current, enabled: globalInput.checked };
    void saveSettings(current);
  });

  const appearanceLabel = document.createElement("div");
  appearanceLabel.className = "cb-section-label";
  appearanceLabel.textContent = "Appearance";
  app.appendChild(appearanceLabel);

  const themeRow = document.createElement("div");
  themeRow.className = "cb-theme-row";
  const themeLabel = document.createElement("div");
  themeLabel.className = "cb-theme-label";
  themeLabel.textContent = "Theme";
  themeRow.appendChild(themeLabel);

  const themeBtns = document.createElement("div");
  themeBtns.className = "cb-theme-btns";

  const themes: ThemeMode[] = ["default", "dark", "dim"];
  const themeButtons: HTMLButtonElement[] = [];

  for (const theme of themes) {
    const btn = document.createElement("button");
    btn.className = "cb-theme-btn" + (current.theme === theme ? " cb-active" : "");
    btn.textContent = theme;
    btn.addEventListener("click", () => {
      current = { ...current, theme };
      themeButtons.forEach((b, i) => b.classList.toggle("cb-active", themes[i] === theme));
      void saveSettings(current);
    });
    themeButtons.push(btn);
    themeBtns.appendChild(btn);
  }

  themeRow.appendChild(themeBtns);
  app.appendChild(themeRow);

  app.appendChild(makeToggleRow("Rounder Modules", "", current.rounderModules, (val) => {
    current = { ...current, rounderModules: val };
    void saveSettings(current);
  }));

  const colorToggleRow = makeToggleRow("Custom Colors", "", current.customColors.enabled, (val) => {
    current = { ...current, customColors: { ...current.customColors, enabled: val } };
    colorSection.classList.toggle("cb-open", val);
    void saveSettings(current);
  });
  app.appendChild(colorToggleRow);

  const colorSection = document.createElement("div");
  colorSection.className = "cb-color-section" + (current.customColors.enabled ? " cb-open" : "");

  const debouncedSave = debounce(() => void saveSettings(current), 300);

  const colorFields: Array<{ label: string; key: keyof typeof current.customColors & string }> = [
    { label: "Link color", key: "linkColor" },
    { label: "Sidebar color", key: "sidebarColor" },
    { label: "Accent color", key: "accentColor" },
  ];

  for (const field of colorFields) {
    const row = document.createElement("div");
    row.className = "cb-color-row";

    const label = document.createElement("div");
    label.className = "cb-color-label";
    label.textContent = field.label;
    row.appendChild(label);

    const input = document.createElement("input");
    input.type = "color";
    input.className = "cb-color-input";
    input.value = current.customColors[field.key] as string;
    input.addEventListener("input", () => {
      current = {
        ...current,
        customColors: { ...current.customColors, [field.key]: input.value },
      };
      debouncedSave();
    });
    row.appendChild(input);
    colorSection.appendChild(row);
  }

  app.appendChild(colorSection);

  const featuresLabel = document.createElement("div");
  featuresLabel.className = "cb-section-label";
  featuresLabel.textContent = "Features";
  app.appendChild(featuresLabel);

  const features: Array<{ label: string; desc: string; key: keyof Settings }> = [
    { label: "To-Do Panel", desc: "Buddy + assignment list", key: "todoPanel" },
    { label: "Smart Scrolling", desc: "Top / bottom buttons", key: "smartScrolling" },
    { label: "Search (Cmd+K)", desc: "Search courses", key: "searchBox" },
    { label: "Quick Inbox", desc: "Inbox preview in nav", key: "quickInbox" },
    { label: "Speed Boost", desc: "Preload links on hover", key: "speedBoost" },
  ];

  for (const feature of features) {
    app.appendChild(makeToggleRow(feature.label, feature.desc, current[feature.key] as boolean, (val) => {
      current = { ...current, [feature.key]: val };
      void saveSettings(current);
    }));
  }

  if (buddyState !== null && buddyState.chosen) {
    const stats = document.createElement("div");
    stats.className = "cb-buddy-stats";

    const statTitle = document.createElement("div");
    statTitle.className = "cb-buddy-stat-title";

    const starter = STARTERS.find((s) => s.id === buddyState.starterId);
    statTitle.textContent = buddyState.name + " - " + (starter?.stageName[buddyState.evolutionStage - 1] ?? "");
    stats.appendChild(statTitle);

    const statRows: Array<[string, string]> = [
      ["Level", `${buddyState.level}`],
      ["XP", `${buddyState.xp} / ${buddyState.level * 100}`],
      ["Total Completed", `${buddyState.totalCompleted}`],
      ["Streak", `${buddyState.streak} day${buddyState.streak !== 1 ? "s" : ""}`],
    ];

    for (const [label, val] of statRows) {
      const row = document.createElement("div");
      row.className = "cb-buddy-stat-row";
      row.innerHTML = `<span>${label}</span><span class="cb-buddy-stat-val">${val}</span>`;
      stats.appendChild(row);
    }

    const resetBtn = document.createElement("button");
    resetBtn.className = "cb-reset-btn";
    resetBtn.textContent = "Reset Buddy";
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset your buddy? This cannot be undone.")) {
        if (hasExtApi) {
          ext.storage.local.remove("canvasbuddy_buddy", () => void render());
        }
      }
    });
    stats.appendChild(resetBtn);

    app.appendChild(stats);
  }
}

document.addEventListener("DOMContentLoaded", () => void render());
