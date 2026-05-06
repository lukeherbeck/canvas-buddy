import type { Settings, ThemeMode } from "../types/settings";
import type { BuddyState } from "../types/buddy";
import { DEFAULT_SETTINGS } from "../types/settings";
import { STARTERS } from "../types/buddy";
import { loadDiagnostics } from "../content/diagnostics";
import { applyXp, xpToNextLevel } from "../content/features/buddy/buddy-engine";
import { debounce } from "../content/utils/debounce";
import { DEV_TOOLS_STORAGE_KEY, shouldShowDevTools } from "./dev-tools";
import { buildPopupHealthSummary } from "./status-copy";
import { ext } from "../browser";
import type { ContentDiagnostics } from "../content/diagnostics";

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
    ext.storage.sync.set({ canvasbuddy_settings: settings }, resolve);
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

async function saveBuddyState(state: BuddyState): Promise<void> {
  if (!hasExtApi) return;
  return new Promise((resolve) => {
    ext.storage.local.set({ canvasbuddy_buddy: state }, resolve);
  });
}

async function loadDevToolsPreference(): Promise<boolean> {
  if (!hasExtApi || typeof ext.storage?.local?.get !== "function") return false;
  return new Promise((resolve) => {
    ext.storage.local.get(DEV_TOOLS_STORAGE_KEY, (result) => {
      resolve((result as Record<string, unknown>)[DEV_TOOLS_STORAGE_KEY] === true);
    });
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

function makeHealthCard(
  diagnostics: ContentDiagnostics | null,
  settings: Settings,
  buddyState: BuddyState | null
): HTMLElement {
  const summary = buildPopupHealthSummary({ diagnostics, settings, buddyState });
  const card = document.createElement("section");
  card.className = "cb-health-card";

  const eyebrow = document.createElement("div");
  eyebrow.className = "cb-health-eyebrow";
  eyebrow.textContent = "Live Canvas status";
  card.appendChild(eyebrow);

  const title = document.createElement("div");
  title.className = "cb-health-title";
  title.textContent = summary.title;
  card.appendChild(title);

  const rows = document.createElement("div");
  rows.className = "cb-health-rows";
  for (const row of summary.rows) {
    rows.appendChild(makeHealthRow(row.label, row.value, row.active));
  }
  card.appendChild(rows);

  const trust = document.createElement("div");
  trust.className = "cb-trust-strip";
  trust.textContent = summary.trustMessage;
  card.appendChild(trust);

  return card;
}

function makeHealthRow(label: string, value: string, active: boolean): HTMLElement {
  const row = document.createElement("div");
  row.className = "cb-health-row";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const valueEl = document.createElement("span");
  valueEl.className = "cb-health-value" + (active ? " cb-active" : "");
  valueEl.textContent = value;
  row.appendChild(valueEl);

  return row;
}

async function render(): Promise<void> {
  const [settings, buddyState, diagnostics, devToolsPreference] = await Promise.all([
    loadSettings(),
    loadBuddyState(),
    loadDiagnostics(),
    loadDevToolsPreference(),
  ]);

  let current = settings;
  const devToolsEnabled = shouldShowDevTools({
    viteDev: import.meta.env.DEV,
    storedPreference: devToolsPreference,
  });

  const app = document.getElementById("app");
  if (app === null) return;
  app.innerHTML = "";

  const header = document.createElement("div");
  header.className = "cb-popup-header";
  const logo = document.createElement("span");
  logo.className = "cb-popup-logo";
  logo.textContent = "CanvasBuddy";
  header.appendChild(logo);
  const version = document.createElement("span");
  version.className = "cb-popup-version";
  version.textContent = "v0.1 beta";
  header.appendChild(version);
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

  app.appendChild(makeHealthCard(diagnostics, current, buddyState));

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

  if (devToolsEnabled) {
    const devSection = document.createElement("div");
    devSection.className = "cb-dev-section";

    const devLabel = document.createElement("div");
    devLabel.className = "cb-dev-label";
    devLabel.textContent = "Dev Tools";
    devSection.appendChild(devLabel);

    const diag = document.createElement("div");
    diag.className = "cb-dev-diagnostics";
    diag.textContent = diagnostics === null
      ? "No content diagnostics yet"
      : `Canvas ${diagnostics.canvasDetected === true ? "yes" : "no"} - Settings ${diagnostics.settingsLoaded === true ? "yes" : "no"} - Panel ${diagnostics.panelMounted === true ? "yes" : "no"}`;
    devSection.appendChild(diag);

    if (buddyState !== null && buddyState.chosen) {
      const xpLabel = document.createElement("div");
      xpLabel.className = "cb-dev-sublabel";
      xpLabel.textContent = "Add XP";
      devSection.appendChild(xpLabel);

      const xpRow = document.createElement("div");
      xpRow.className = "cb-dev-row";
      for (const amount of [10, 50, 100, 500]) {
        const btn = document.createElement("button");
        btn.className = "cb-dev-btn";
        btn.textContent = `+${amount}`;
        btn.addEventListener("click", async () => {
          const fresh = await loadBuddyState();
          if (fresh === null || !fresh.chosen) return;
          const { state: newState } = applyXp(fresh, amount);
          await saveBuddyState(newState);
          void render();
        });
        xpRow.appendChild(btn);
      }
      devSection.appendChild(xpRow);

      const levelBtn = document.createElement("button");
      levelBtn.className = "cb-dev-btn cb-dev-full";
      levelBtn.textContent = "Level Up";
      levelBtn.addEventListener("click", async () => {
        const fresh = await loadBuddyState();
        if (fresh === null || !fresh.chosen) return;
        const needed = xpToNextLevel(fresh.level) - fresh.xp;
        const { state: newState } = applyXp(fresh, needed);
        await saveBuddyState(newState);
        void render();
      });
      devSection.appendChild(levelBtn);
    }

    app.appendChild(devSection);
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
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      row.appendChild(labelEl);

      const valueEl = document.createElement("span");
      valueEl.className = "cb-buddy-stat-val";
      valueEl.textContent = val;
      row.appendChild(valueEl);
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

document.addEventListener("DOMContentLoaded", () => {
  void render();
});
