import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildDailyQuests, getQuestLoadStateLabel } from "../src/content/features/daily-quests";
import type { CanvasAssignment, CanvasTodoItem } from "../src/types/canvas";

function assignment(overrides: Partial<CanvasAssignment>): CanvasAssignment {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Assignment",
    due_at: overrides.due_at ?? null,
    points_possible: overrides.points_possible ?? 100,
    course_id: overrides.course_id ?? 10,
    html_url: overrides.html_url ?? `/assignments/${overrides.id ?? 1}`,
    submission_types: ["online_upload"],
    has_submitted_submissions: false,
  };
}

function todo(overrides: Partial<CanvasAssignment>): CanvasTodoItem {
  const item = assignment(overrides);
  return {
    type: "submitting",
    assignment: item,
    ignore: "",
    ignore_permanently: "",
    html_url: item.html_url,
    needs_grading_count: null,
    context_type: "Course",
    course_id: item.course_id,
    group_id: null,
  };
}

describe("buildDailyQuests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ranks overdue assignments first, then soonest due, then missing due dates", () => {
    const quests = buildDailyQuests(
      [
        todo({ id: 1, name: "No due date", due_at: null }),
        todo({ id: 2, name: "Tomorrow", due_at: "2026-05-05T12:00:00Z" }),
        todo({ id: 3, name: "Yesterday", due_at: "2026-05-03T12:00:00Z" }),
        todo({ id: 4, name: "Today", due_at: "2026-05-04T18:00:00Z" }),
      ],
      0
    );

    expect(quests.map((quest) => quest.title)).toEqual(["Yesterday", "Today", "Tomorrow"]);
  });

  it("returns at most three quests", () => {
    const quests = buildDailyQuests(
      [
        todo({ id: 1, due_at: "2026-05-05T12:00:00Z" }),
        todo({ id: 2, due_at: "2026-05-06T12:00:00Z" }),
        todo({ id: 3, due_at: "2026-05-07T12:00:00Z" }),
        todo({ id: 4, due_at: "2026-05-08T12:00:00Z" }),
      ],
      0
    );

    expect(quests).toHaveLength(3);
  });

  it("previews the same XP formula used for Canvas-verified completions", () => {
    const [quest] = buildDailyQuests(
      [todo({ id: 1, points_possible: 100, due_at: "2026-05-05T12:00:00Z" })],
      2
    );

    expect(quest?.projectedXp).toBe(20);
  });

  it("labels empty, error, and loaded states for the quest surface", () => {
    expect(getQuestLoadStateLabel({ status: "loading" })).toBe("Checking Canvas...");
    expect(getQuestLoadStateLabel({ status: "error", message: "HTTP 401" })).toBe("Canvas sync needs attention");
    expect(getQuestLoadStateLabel({ status: "loaded", quests: [] })).toBe("No active quests");
  });
});
