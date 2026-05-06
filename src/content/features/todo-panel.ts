import todoPanelCss from "../../styles/todo-panel.css?inline";
import { BUDDY_DISPLAY_CSS, createBuddyDisplay } from "./buddy/buddy-display";
import { STARTER_SELECT_CSS, renderStarterSelect } from "./buddy/starter-select";
import { loadBuddyState, saveBuddyState, processCompletions } from "./buddy/xp-sources";
import { buildDailyQuests, getQuestLoadStateLabel } from "./daily-quests";
import { CanvasApi } from "../canvas-api";
import type { BuddyState, StarterID } from "../../types/buddy";
import type { CanvasTodoItem, CanvasUpcomingEvent } from "../../types/canvas";
import type { DailyQuest, QuestLoadState } from "./daily-quests";

type PanelState =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly todoItems: readonly CanvasTodoItem[]; readonly events: readonly CanvasUpcomingEvent[]; readonly fetchedAt: number }
  | { readonly status: "error"; readonly message: string };

type ActiveTab = "assignments" | "upcoming";

const CACHE_MS = 5 * 60 * 1000;
const HOST_ID = "canvasbuddy-todo-host";

let panelHost: HTMLElement | null = null;

export function mountTodoPanel(): void {
  if (panelHost !== null && document.body.contains(panelHost)) return;
  removeDomPanelHosts();
  panelHost = buildPanel();
  document.body.appendChild(panelHost);
}

export function unmountTodoPanel(): void {
  panelHost?.remove();
  panelHost = null;
  removeDomPanelHosts();
}

export function refreshBuddyPanel(): void {
  if (panelHost === null) return;
  unmountTodoPanel();
  mountTodoPanel();
}

export function refreshTodoPanel(): void {
  if (panelHost === null) return;
  unmountTodoPanel();
  mountTodoPanel();
}

function buildPanel(): HTMLElement {
  const host = document.createElement("div");
  host.id = HOST_ID;
  Object.assign(host.style, {
    position: "fixed",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: "2147483647",
    pointerEvents: "none",
  });

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = todoPanelCss + "\n" + BUDDY_DISPLAY_CSS + "\n" + STARTER_SELECT_CSS;
  shadow.appendChild(style);

  const panel = document.createElement("div");
  panel.className = "cb-panel";
  panel.style.pointerEvents = "auto";
  shadow.appendChild(panel);

  const header = document.createElement("div");
  header.className = "cb-panel-header";

  const title = document.createElement("span");
  title.className = "cb-panel-title";
  title.textContent = "CanvasBuddy";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.className = "cb-close-btn";
  closeBtn.textContent = "x";
  closeBtn.title = "Close panel";
  closeBtn.addEventListener("click", () => {
    host.remove();
    panelHost = null;
  });
  header.appendChild(closeBtn);
  panel.appendChild(header);

  makeDraggable(host, header);

  const buddyContainer = document.createElement("div");
  panel.appendChild(buddyContainer);

  const questArea = document.createElement("div");
  questArea.className = "cb-quest-area";
  panel.appendChild(questArea);

  const tabBar = document.createElement("div");
  tabBar.className = "cb-tab-bar";

  const assignmentsTab = document.createElement("button");
  assignmentsTab.className = "cb-tab cb-active";
  assignmentsTab.textContent = "Assignments";
  assignmentsTab.dataset["tab"] = "assignments";

  const upcomingTab = document.createElement("button");
  upcomingTab.className = "cb-tab";
  upcomingTab.textContent = "Events";
  upcomingTab.dataset["tab"] = "upcoming";

  tabBar.appendChild(assignmentsTab);
  tabBar.appendChild(upcomingTab);
  panel.appendChild(tabBar);

  const listArea = document.createElement("div");
  listArea.className = "cb-list-area";
  panel.appendChild(listArea);

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "cb-refresh-btn";
  refreshBtn.textContent = "Refresh";
  panel.appendChild(refreshBtn);

  let activeTab: ActiveTab = "assignments";
  let panelState: PanelState = { status: "loading" };
  let buddyState: BuddyState | null = null;
  let buddyDisplay: ReturnType<typeof createBuddyDisplay> | null = null;

  function renderBuddy(state: BuddyState): void {
    buddyContainer.innerHTML = "";
    if (!state.chosen) {
      renderStarterSelect(buddyContainer, (starterId: StarterID, newState: BuddyState) => {
        buddyState = newState;
        renderBuddy(newState);
        void fetchData();
      });
      return;
    }
    if (buddyDisplay === null) {
      buddyDisplay = createBuddyDisplay(state);
      buddyContainer.appendChild(buddyDisplay.element);
    } else {
      buddyDisplay.update(state);
    }
  }

  function renderList(): void {
    listArea.innerHTML = "";

    if (panelState.status === "loading") {
      const msg = document.createElement("div");
      msg.className = "cb-loading";
      msg.textContent = "Loading...";
      listArea.appendChild(msg);
      return;
    }

    if (panelState.status === "error") {
      const msg = document.createElement("div");
      msg.className = "cb-error";
      msg.textContent = panelState.message;
      listArea.appendChild(msg);
      return;
    }

    const items = activeTab === "assignments" ? panelState.todoItems : null;
    const events = activeTab === "upcoming" ? panelState.events : null;

    if (items !== null) {
      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "cb-empty";
        empty.textContent = "Nothing due! Nice work.";
        listArea.appendChild(empty);
        return;
      }

      const sorted = [...items].sort((a, b) => {
        const da = a.assignment?.due_at ?? "";
        const db = b.assignment?.due_at ?? "";
        if (da === "" && db === "") return 0;
        if (da === "") return 1;
        if (db === "") return -1;
        return new Date(da).getTime() - new Date(db).getTime();
      });

      for (const item of sorted) {
        if (item.assignment === null) continue;
        const link = document.createElement("a");
        link.className = "cb-todo-item";
        link.href = item.assignment.html_url;
        link.target = "_blank";
        link.rel = "noopener";

        const now = Date.now();
        const dueAt = item.assignment.due_at;
        const isOverdue = dueAt !== null && new Date(dueAt).getTime() < now;

        const nameEl = document.createElement("div");
        nameEl.className = "cb-todo-name" + (isOverdue ? " cb-overdue" : "");
        nameEl.textContent = item.assignment.name;
        link.appendChild(nameEl);

        if (dueAt !== null) {
          const dueEl = document.createElement("div");
          dueEl.className = "cb-todo-due" + (isOverdue ? " cb-overdue" : "");
          dueEl.textContent = (isOverdue ? "overdue: " : "due: ") + formatDate(dueAt);
          link.appendChild(dueEl);
        }

        if (item.assignment.points_possible > 0) {
          const ptsEl = document.createElement("div");
          ptsEl.className = "cb-todo-pts";
          ptsEl.textContent = `${item.assignment.points_possible} pts`;
          link.appendChild(ptsEl);
        }

        listArea.appendChild(link);
      }
    } else if (events !== null) {
      if (events.length === 0) {
        const empty = document.createElement("div");
        empty.className = "cb-empty";
        empty.textContent = "No upcoming events.";
        listArea.appendChild(empty);
        return;
      }

      for (const event of events) {
        const link = document.createElement("a");
        link.className = "cb-todo-item";
        link.href = event.html_url;
        link.target = "_blank";
        link.rel = "noopener";

        const nameEl = document.createElement("div");
        nameEl.className = "cb-todo-name";
        nameEl.textContent = event.title;
        link.appendChild(nameEl);

        const dueEl = document.createElement("div");
        dueEl.className = "cb-todo-due";
        dueEl.textContent = formatDate(event.start_at);
        link.appendChild(dueEl);

        listArea.appendChild(link);
      }
    }
  }

  function renderQuestSurface(): void {
    questArea.innerHTML = "";

    if (buddyState !== null && !buddyState.chosen) {
      const locked = document.createElement("div");
      locked.className = "cb-quest-locked";
      const title = document.createElement("div");
      title.className = "cb-quest-title";
      title.textContent = "Quests unlock next";
      locked.appendChild(title);

      const note = document.createElement("div");
      note.className = "cb-quest-note";
      note.textContent = "Choose a buddy to turn today's Canvas work into XP.";
      locked.appendChild(note);
      questArea.appendChild(locked);
      return;
    }

    const state = getQuestState();
    const header = document.createElement("div");
    header.className = "cb-quest-header";

    const copy = document.createElement("div");
    const title = document.createElement("div");
    title.className = "cb-quest-title";
    title.textContent = getQuestLoadStateLabel(state);
    copy.appendChild(title);

    const streak = document.createElement("div");
    streak.className = "cb-quest-streak";
    const streakCount = buddyState?.streak ?? 0;
    streak.textContent = streakCount > 0 ? `${streakCount} day streak` : "Start a streak today";
    copy.appendChild(streak);

    header.appendChild(copy);

    const recheck = document.createElement("button");
    recheck.className = "cb-quest-recheck";
    recheck.textContent = "Recheck";
    recheck.addEventListener("click", () => {
      panelState = { status: "loading" };
      renderList();
      renderQuestSurface();
      void fetchData();
    });
    header.appendChild(recheck);
    questArea.appendChild(header);

    if (state.status === "loading") {
      const loading = document.createElement("div");
      loading.className = "cb-quest-note";
      loading.textContent = "Syncing assignments and rewards.";
      questArea.appendChild(loading);
      return;
    }

    if (state.status === "error") {
      const error = document.createElement("div");
      error.className = "cb-quest-note cb-quest-error";
      error.textContent = state.message;
      questArea.appendChild(error);
      return;
    }

    if (state.quests.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cb-quest-note";
      empty.textContent = "Canvas is clear. Keep the streak warm.";
      questArea.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "cb-quest-list";
    for (const quest of state.quests) {
      list.appendChild(renderQuest(quest));
    }
    questArea.appendChild(list);
  }

  function getQuestState(): QuestLoadState {
    if (panelState.status === "loading") return { status: "loading" };
    if (panelState.status === "error") return { status: "error", message: panelState.message };
    return {
      status: "loaded",
      quests: buildDailyQuests(panelState.todoItems, buddyState?.streak ?? 0),
    };
  }

  function renderQuest(quest: DailyQuest): HTMLElement {
    const link = document.createElement("a");
    link.className = `cb-quest-card cb-quest-${quest.urgency}`;
    link.href = quest.href;
    link.target = "_blank";
    link.rel = "noopener";

    const top = document.createElement("div");
    top.className = "cb-quest-card-top";
    const status = document.createElement("span");
    status.className = "cb-quest-status";
    status.textContent = quest.urgency === "overdue" ? "Overdue" : quest.urgency === "today" ? "Today" : "Quest";
    top.appendChild(status);

    const xp = document.createElement("span");
    xp.className = "cb-quest-xp";
    xp.textContent = `+${quest.projectedXp} XP`;
    top.appendChild(xp);
    link.appendChild(top);

    const name = document.createElement("div");
    name.className = "cb-quest-name";
    name.textContent = quest.title;
    link.appendChild(name);

    const due = document.createElement("div");
    due.className = "cb-quest-due";
    due.textContent = quest.dueAt === null ? "No due date" : formatDate(quest.dueAt);
    link.appendChild(due);

    return link;
  }

  function switchTab(tab: ActiveTab): void {
    activeTab = tab;
    assignmentsTab.classList.toggle("cb-active", tab === "assignments");
    upcomingTab.classList.toggle("cb-active", tab === "upcoming");
    renderList();
  }

  assignmentsTab.addEventListener("click", () => switchTab("assignments"));
  upcomingTab.addEventListener("click", () => switchTab("upcoming"));

  async function fetchData(): Promise<void> {
    if (panelState.status === "loaded" && Date.now() - panelState.fetchedAt < CACHE_MS) return;

    panelState = { status: "loading" };
    renderList();

    const [todoResult, eventsResult] = await Promise.all([
      CanvasApi.getTodo(),
      CanvasApi.getUpcomingEvents(),
    ]);

    if (!todoResult.ok) {
      panelState = { status: "error", message: `Could not load assignments: ${todoResult.error}` };
      renderList();
      renderQuestSurface();
      return;
    }

    if (!eventsResult.ok) {
      panelState = { status: "error", message: `Could not load events: ${eventsResult.error}` };
      renderList();
      renderQuestSurface();
      return;
    }

    panelState = {
      status: "loaded",
      todoItems: todoResult.data,
      events: eventsResult.data,
      fetchedAt: Date.now(),
    };

    if (buddyState !== null && buddyState.chosen) {
      const { updatedState, levelUpResults } = processCompletions(buddyState, todoResult.data);
      if (updatedState !== buddyState) {
        buddyState = updatedState;
        await saveBuddyState(updatedState);
        buddyDisplay?.update(updatedState);

        for (const result of levelUpResults) {
          if (result.kind === "levelUp") {
            buddyDisplay?.triggerLevelUp();
            break;
          }
        }
      }
    }

    renderList();
    renderQuestSurface();
  }

  refreshBtn.addEventListener("click", () => {
    panelState = { status: "loading" };
    void fetchData();
  });

  loadBuddyState().then((state) => {
    buddyState = state;
    renderBuddy(state);
    renderQuestSurface();
    if (state.chosen) void fetchData();
  }).catch(console.error);

  return host;
}

function removeDomPanelHosts(): void {
  document.querySelectorAll(`#${HOST_ID}`).forEach((host) => host.remove());
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function makeDraggable(host: HTMLElement, handle: HTMLElement): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  handle.addEventListener("mousedown", (e: MouseEvent) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = host.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    host.style.transform = "none";
    host.style.top = `${startTop}px`;
    host.style.left = `${startLeft}px`;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    host.style.left = `${startLeft + dx}px`;
    host.style.top = `${startTop + dy}px`;
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });
}
