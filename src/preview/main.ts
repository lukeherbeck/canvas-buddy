// CanvasBuddy UI Preview harness
//
// Mocks globalThis.chrome and window.fetch so the real panel code
// (onboarding, buddy display, todo list, level-up animation) runs
// in a plain browser tab without an extension context or Canvas login.
//
// CRITICAL ORDERING: globalThis.chrome must be set synchronously here
// before any dynamic imports, because src/browser.ts captures it at
// module evaluation time.

import type { BuddyState } from "../types/buddy";
import type { CanvasTodoItem, CanvasUpcomingEvent } from "../types/canvas";

// ─── CHROME MOCK ──────────────────────────────────────────────────────────────

const LS_PREFIX = "cbpreview_";

function lsGet(key: string): unknown {
  const raw = localStorage.getItem(LS_PREFIX + key);
  return raw !== null ? (JSON.parse(raw) as unknown) : undefined;
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

function lsRemove(key: string): void {
  localStorage.removeItem(LS_PREFIX + key);
}

function makeLocalArea() {
  return {
    get(key: string | string[], cb: (r: Record<string, unknown>) => void): void {
      const k = typeof key === "string" ? key : (key[0] ?? "");
      cb({ [k]: lsGet(k) });
    },
    set(items: Record<string, unknown>, cb?: () => void): void {
      for (const [k, v] of Object.entries(items)) lsSet(k, v);
      cb?.();
    },
    remove(key: string | string[], cb?: () => void): void {
      const k = typeof key === "string" ? key : (key[0] ?? "");
      lsRemove(k);
      cb?.();
    },
  };
}

(globalThis as unknown as { chrome: typeof chrome }).chrome = {
  runtime: {
    getURL: (path: string) => `/${path}`,
  },
  storage: {
    local: makeLocalArea() as unknown as chrome.storage.LocalStorageArea,
    sync: makeLocalArea() as unknown as chrome.storage.SyncStorageArea,
  } as unknown as typeof chrome.storage,
} as unknown as typeof chrome;

// ─── FAKE CANVAS DATA ─────────────────────────────────────────────────────────

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function fakeTodo(
  id: number,
  name: string,
  dueOffsetMs: number,
  points: number
): CanvasTodoItem {
  return {
    type: "submitting",
    assignment: {
      id,
      name,
      due_at: new Date(NOW + dueOffsetMs).toISOString(),
      points_possible: points,
      course_id: 101,
      html_url: "#",
      submission_types: ["online_upload"],
      has_submitted_submissions: false,
    },
    ignore: "#",
    ignore_permanently: "#",
    html_url: "#",
    needs_grading_count: null,
    context_type: "Course",
    course_id: 101,
    group_id: null,
  };
}

const TODO_PRESETS: Record<string, CanvasTodoItem[]> = {
  normal: [
    fakeTodo(1001, "Homework 5 — Sorting Algorithms", 2 * DAY, 100),
    fakeTodo(1002, "Quiz: Binary Search Trees", 4 * DAY, 50),
    fakeTodo(1003, "Problem Set 8", 7 * DAY, 80),
    fakeTodo(1004, "Lab Report 3", 10 * DAY, 60),
    fakeTodo(1005, "Discussion Post — Week 7", 1 * DAY, 20),
  ],
  overdue: [
    fakeTodo(1001, "Homework 5 — Sorting Algorithms", -3 * DAY, 100),
    fakeTodo(1002, "Quiz: Binary Search Trees", -1 * DAY, 50),
    fakeTodo(1003, "Problem Set 8", 2 * DAY, 80),
    fakeTodo(1004, "Final Project Proposal", -5 * DAY, 150),
  ],
  empty: [],
};

const FAKE_EVENTS: CanvasUpcomingEvent[] = [
  {
    id: "ev1",
    title: "Office Hours — Prof. Smith",
    start_at: new Date(NOW + 1.5 * DAY).toISOString(),
    end_at: null,
    description: "",
    html_url: "#",
    context_code: "course_101",
    type: "event",
  },
  {
    id: "ev2",
    title: "Study Group — Algorithms",
    start_at: new Date(NOW + 3 * DAY).toISOString(),
    end_at: null,
    description: "",
    html_url: "#",
    context_code: "course_101",
    type: "event",
  },
];

let activeTodoPreset = "normal";

// ─── FETCH MOCK ───────────────────────────────────────────────────────────────

const originalFetch = window.fetch.bind(window) as typeof window.fetch;

window.fetch = ((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
    ? input.toString()
    : (input as Request).url;

  if (url.startsWith("/api/v1/users/self/todo")) {
    return Promise.resolve(
      new Response(JSON.stringify(TODO_PRESETS[activeTodoPreset] ?? []), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  if (url.startsWith("/api/v1/users/self/upcoming_events")) {
    return Promise.resolve(
      new Response(JSON.stringify(FAKE_EVENTS), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  return originalFetch(input, init);
}) as typeof window.fetch;

// ─── PANEL MOUNT + DEV CONTROLS ──────────────────────────────────────────────
// Wrapped in async IIFE: top-level await is not supported in Safari's native
// ES module engine when served by Vite dev. The chrome mock above must remain
// synchronous at module top level so browser.ts captures it before any import.

void (async () => {
  const [
    { mountTodoPanel, unmountTodoPanel },
    { saveBuddyState, loadBuddyState },
    { applyXp, stageForLevel },
  ] = await Promise.all([
    import("../content/features/todo-panel"),
    import("../content/features/buddy/xp-sources"),
    import("../content/features/buddy/buddy-engine"),
  ]);

  mountTodoPanel();

  function remount(): void {
    unmountTodoPanel();
    mountTodoPanel();
  }

  function updateStats(): void {
    const el = document.getElementById("dev-stat-display");
    if (el === null) return;

    const raw = lsGet("canvasbuddy_buddy") as BuddyState | undefined;

    if (raw === undefined || !raw.chosen) {
      el.innerHTML = '<span style="color:#333348">no buddy chosen yet</span>';
      return;
    }

    const stageColors = ["val-stage1", "val-stage2", "val-stage3"] as const;
    const stageClass = stageColors[(raw.evolutionStage - 1)] ?? "val-stage1";
    const xpNeeded = raw.level * 100;

    el.innerHTML = [
      `name: <span class="val-name">${raw.name}</span>`,
      `level: <span>${raw.level}</span>  stage: <span class="${stageClass}">${raw.evolutionStage}</span>`,
      `xp: <span>${raw.xp} / ${xpNeeded}</span>`,
      `streak: <span>${raw.streak}d</span>  done: <span>${raw.totalCompleted}</span>`,
    ].join("<br>");
  }

  // Set level
  document.querySelectorAll<HTMLButtonElement>("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = parseInt(btn.dataset["level"] ?? "1", 10);
      const existing = lsGet("canvasbuddy_buddy") as BuddyState | undefined;
      if (existing === undefined || !existing.chosen) return;

      const updated: BuddyState = {
        ...existing,
        level,
        xp: 0,
        totalXp: existing.totalXp,
        evolutionStage: stageForLevel(level),
      };
      lsSet("canvasbuddy_buddy", updated);
      remount();
      setTimeout(updateStats, 80);
    });
  });

  // Set streak
  document.querySelectorAll<HTMLButtonElement>("[data-streak]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const streak = parseInt(btn.dataset["streak"] ?? "0", 10);
      void (async () => {
        const state = await loadBuddyState();
        if (!state.chosen) return;
        await saveBuddyState({ ...state, streak });
        remount();
        setTimeout(updateStats, 80);
      })();
    });
  });

  // Reset to onboarding
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    lsRemove("canvasbuddy_buddy");
    remount();
    setTimeout(updateStats, 80);
  });

  // Set XP to 5 below next level threshold (makes the next +10 XP trigger level-up in panel)
  document.getElementById("btn-near-levelup")?.addEventListener("click", () => {
    void (async () => {
      const state = await loadBuddyState();
      if (!state.chosen) return;
      const updated: BuddyState = { ...state, xp: state.level * 100 - 5 };
      await saveBuddyState(updated);
      remount();
      setTimeout(updateStats, 80);
    })();
  });

  // Add 10 XP directly
  document.getElementById("btn-xp-10")?.addEventListener("click", () => {
    void (async () => {
      const state = await loadBuddyState();
      if (!state.chosen) return;
      const { state: next } = applyXp(state, 10);
      await saveBuddyState(next);
      remount();
      setTimeout(updateStats, 80);
    })();
  });

  // Simulate a natural assignment completion:
  // 1. Add a fake assignment to seenAssignments (panel will think it was "seen" previously)
  // 2. Ensure the active todo list does NOT contain it (panel detects completion)
  // 3. Panel runs processCompletions → awards XP → triggers level-up animation if applicable
  let simulationCounter = 9000;
  document.getElementById("btn-simulate-completion")?.addEventListener("click", () => {
    void (async () => {
      const state = await loadBuddyState();
      if (!state.chosen) return;

      simulationCounter -= 1;
      const fakeId = simulationCounter;

      const fakeAssignment = {
        id: fakeId,
        pointsPossible: 80,
        dueAt: new Date(NOW + 7 * DAY).toISOString(),
      };

      // Add to seenAssignments but keep it out of the active todo preset
      const updated: BuddyState = {
        ...state,
        seenAssignments: [
          ...state.seenAssignments.filter((a) => a.id !== fakeId),
          fakeAssignment,
        ],
      };
      await saveBuddyState(updated);

      // Make sure current todo preset doesn't include our fake id
      // (normal/overdue/empty presets never use this id range, so no change needed)
      remount();
      setTimeout(updateStats, 80);
    })();
  });

  // Todo presets
  document.getElementById("btn-todo-normal")?.addEventListener("click", () => {
    activeTodoPreset = "normal";
    remount();
  });

  document.getElementById("btn-todo-overdue")?.addEventListener("click", () => {
    activeTodoPreset = "overdue";
    remount();
  });

  document.getElementById("btn-todo-empty")?.addEventListener("click", () => {
    activeTodoPreset = "empty";
    remount();
  });

  // Live stat display
  updateStats();
  setInterval(updateStats, 1000);
})();
