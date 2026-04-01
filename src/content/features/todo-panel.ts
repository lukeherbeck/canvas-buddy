import todoPanelCss from "../../styles/todo-panel.css?inline";
import { BUDDY_DISPLAY_CSS, createBuddyDisplay } from "./buddy/buddy-display";
import { renderStarterSelect } from "./buddy/starter-select";
import { loadBuddyState, saveBuddyState, processCompletions } from "./buddy/xp-sources";
import { CanvasApi } from "../canvas-api";
import type { BuddyState, StarterID } from "../../types/buddy";
import type { CanvasTodoItem, CanvasUpcomingEvent } from "../../types/canvas";

type PanelState =
  | { readonly status: "loading" }
  | { readonly status: "loaded"; readonly todoItems: readonly CanvasTodoItem[]; readonly events: readonly CanvasUpcomingEvent[]; readonly fetchedAt: number }
  | { readonly status: "error"; readonly message: string };

type ActiveTab = "assignments" | "upcoming";

const CACHE_MS = 5 * 60 * 1000;
const HOST_ID = "canvasbuddy-todo-host";

let panelHost: HTMLElement | null = null;

export function mountTodoPanel(): void {
  if (panelHost !== null) return;
  panelHost = buildPanel();
  document.body.appendChild(panelHost);
}

export function unmountTodoPanel(): void {
  panelHost?.remove();
  panelHost = null;
}

function buildPanel(): HTMLElement {
  const host = document.createElement("div");
  host.id = HOST_ID;
  Object.assign(host.style, {
    position: "fixed",
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: "999999",
    pointerEvents: "none",
  });

  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = todoPanelCss + "\n" + BUDDY_DISPLAY_CSS;
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
      renderStarterSelect(shadow, (starterId: StarterID, newState: BuddyState) => {
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
      return;
    }

    if (!eventsResult.ok) {
      panelState = { status: "error", message: `Could not load events: ${eventsResult.error}` };
      renderList();
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
  }

  refreshBtn.addEventListener("click", () => {
    panelState = { status: "loading" };
    void fetchData();
  });

  loadBuddyState().then((state) => {
    buddyState = state;
    renderBuddy(state);
    if (state.chosen) void fetchData();
  }).catch(console.error);

  return host;
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
