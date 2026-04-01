import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeUpdatedStreak, processCompletions, todayDateString } from "../src/content/features/buddy/xp-sources";
import type { BuddyState, CachedAssignment } from "../src/types/buddy";
import type { CanvasTodoItem, CanvasAssignment } from "../src/types/canvas";

function makeState(overrides: Partial<BuddyState> = {}): BuddyState {
  return {
    chosen: true,
    starterId: "inklet",
    name: "Inklet",
    level: 1,
    xp: 0,
    totalXp: 0,
    evolutionStage: 1,
    streak: 0,
    lastActivityDate: "",
    seenAssignments: [],
    totalCompleted: 0,
    ...overrides,
  };
}

function makeAssignment(overrides: Partial<CanvasAssignment> = {}): CanvasAssignment {
  return {
    id: 1,
    name: "Test Assignment",
    due_at: null,
    points_possible: 100,
    course_id: 10,
    html_url: "/assignments/1",
    submission_types: ["online_text_entry"],
    has_submitted_submissions: false,
    ...overrides,
  };
}

function makeTodoItem(assignment: CanvasAssignment): CanvasTodoItem {
  return {
    type: "submitting",
    assignment,
    ignore: "",
    ignore_permanently: "",
    html_url: assignment.html_url,
    needs_grading_count: null,
    context_type: "Course",
    course_id: assignment.course_id,
    group_id: null,
  };
}

function makeCached(id: number, pointsPossible = 100, dueAt: string | null = null): CachedAssignment {
  return { id, pointsPossible, dueAt };
}

describe("computeUpdatedStreak", () => {
  it("returns current streak when last activity was today", () => {
    const today = "2026-03-31";
    expect(computeUpdatedStreak(3, today, today)).toBe(3);
  });

  it("increments streak for consecutive day", () => {
    expect(computeUpdatedStreak(3, "2026-03-30", "2026-03-31")).toBe(4);
  });

  it("resets streak to 1 after a gap of more than one day", () => {
    expect(computeUpdatedStreak(5, "2026-03-28", "2026-03-31")).toBe(1);
  });

  it("starts streak at 1 from empty last activity date", () => {
    expect(computeUpdatedStreak(0, "", "2026-03-31")).toBe(1);
  });
});

describe("todayDateString", () => {
  it("returns a YYYY-MM-DD formatted date", () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("processCompletions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("caches newly seen assignment metadata without awarding XP", () => {
    const assignment = makeAssignment({ id: 42, points_possible: 80 });
    const todoItems = [makeTodoItem(assignment)];
    const state = makeState({ seenAssignments: [] });

    const { updatedState, completedCount, levelUpResults } = processCompletions(state, todoItems);

    expect(updatedState.seenAssignments.some((a) => a.id === 42)).toBe(true);
    expect(updatedState.seenAssignments.find((a) => a.id === 42)?.pointsPossible).toBe(80);
    expect(completedCount).toBe(0);
    expect(levelUpResults).toHaveLength(0);
  });

  it("awards XP when a previously seen assignment is no longer in the todo list", () => {
    const state = makeState({ seenAssignments: [makeCached(42)], xp: 0 });
    const todoItems: CanvasTodoItem[] = [];

    const { updatedState, completedCount } = processCompletions(state, todoItems);

    expect(completedCount).toBe(1);
    expect(updatedState.xp).toBeGreaterThan(0);
    expect(updatedState.totalCompleted).toBe(1);
  });

  it("awards extra XP for early submission using cached due_at", () => {
    const futureDate = new Date("2026-04-30").toISOString();
    // Assignment was cached with future due date and 100 points
    const state = makeState({ seenAssignments: [makeCached(10, 100, futureDate)] });
    const noLongerInTodo: CanvasTodoItem[] = [];

    const { updatedState } = processCompletions(state, noLongerInTodo);
    // Early: 100/10=10 base * 1.5 = 15 XP
    expect(updatedState.xp).toBe(15);
  });

  it("awards base XP for past-due submissions using cached due_at", () => {
    const pastDate = new Date("2026-01-01").toISOString();
    const state = makeState({ seenAssignments: [makeCached(11, 100, pastDate)] });

    const { updatedState } = processCompletions(state, []);
    // Not early: 100/10=10 XP
    expect(updatedState.xp).toBe(10);
  });

  it("updates streak when completing on a new day", () => {
    const state = makeState({
      seenAssignments: [makeCached(1)],
      streak: 2,
      lastActivityDate: "2026-03-30",
    });

    const { updatedState } = processCompletions(state, []);
    expect(updatedState.streak).toBe(3);
    expect(updatedState.lastActivityDate).toBe("2026-03-31");
  });

  it("does not change state when nothing is new or completed", () => {
    const assignment = makeAssignment({ id: 5 });
    const todoItems = [makeTodoItem(assignment)];
    const state = makeState({ seenAssignments: [makeCached(5)] });

    const { updatedState, completedCount } = processCompletions(state, todoItems);
    expect(completedCount).toBe(0);
    expect(updatedState.xp).toBe(0);
  });

  it("does not mutate the original state", () => {
    const cached = makeCached(99);
    const state = makeState({ seenAssignments: [cached] });
    processCompletions(state, []);
    expect(state.seenAssignments).toEqual([cached]);
    expect(state.totalCompleted).toBe(0);
  });

  it("retains seen assignments that are still in the todo list", () => {
    const a1 = makeAssignment({ id: 1 });
    const a2 = makeAssignment({ id: 2 });
    const state = makeState({ seenAssignments: [makeCached(1), makeCached(2)] });

    // Only assignment 1 remains in todo; 2 is completed
    const { updatedState } = processCompletions(state, [makeTodoItem(a1)]);
    expect(updatedState.seenAssignments.some((a) => a.id === 1)).toBe(true);
    expect(updatedState.seenAssignments.some((a) => a.id === 2)).toBe(false);
  });
});
