import type { CanvasTodoItem } from "../../types/canvas";
import { computeXpGain } from "./buddy/buddy-engine";

export type QuestUrgency = "overdue" | "today" | "soon" | "later" | "unscheduled";

export type DailyQuest = {
  readonly assignmentId: number;
  readonly title: string;
  readonly href: string;
  readonly dueAt: string | null;
  readonly pointsPossible: number;
  readonly projectedXp: number;
  readonly urgency: QuestUrgency;
};

export type QuestLoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "loaded"; readonly quests: readonly DailyQuest[] };

const QUEST_LIMIT = 3;
const SOON_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function buildDailyQuests(
  todoItems: readonly CanvasTodoItem[],
  streak: number,
  now: Date = new Date()
): readonly DailyQuest[] {
  return todoItems
    .flatMap((item) => item.assignment === null ? [] : [item.assignment])
    .map((assignment): DailyQuest => {
      const dueTime = assignment.due_at === null ? null : new Date(assignment.due_at).getTime();
      const isEarly = dueTime !== null && now.getTime() < dueTime;
      return {
        assignmentId: assignment.id,
        title: assignment.name,
        href: assignment.html_url,
        dueAt: assignment.due_at,
        pointsPossible: assignment.points_possible,
        projectedXp: computeXpGain(assignment.points_possible, isEarly, streak),
        urgency: urgencyForDueDate(assignment.due_at, now),
      };
    })
    .sort(compareQuests)
    .slice(0, QUEST_LIMIT);
}

export function getQuestLoadStateLabel(state: QuestLoadState): string {
  if (state.status === "loading") return "Checking Canvas...";
  if (state.status === "error") return "Canvas sync needs attention";
  return state.quests.length === 0 ? "No active quests" : "Today's quests";
}

function compareQuests(a: DailyQuest, b: DailyQuest): number {
  const groupDiff = sortGroup(a) - sortGroup(b);
  if (groupDiff !== 0) return groupDiff;
  return sortTime(a) - sortTime(b);
}

function sortGroup(quest: DailyQuest): number {
  if (quest.urgency === "overdue") return 0;
  if (quest.dueAt !== null) return 1;
  return 2;
}

function sortTime(quest: DailyQuest): number {
  return quest.dueAt === null ? Number.MAX_SAFE_INTEGER : new Date(quest.dueAt).getTime();
}

function urgencyForDueDate(dueAt: string | null, now: Date): QuestUrgency {
  if (dueAt === null) return "unscheduled";

  const due = new Date(dueAt);
  if (due.getTime() < now.getTime()) return "overdue";
  if (sameLocalDate(due, now)) return "today";
  if (due.getTime() - now.getTime() <= SOON_DAYS * DAY_MS) return "soon";
  return "later";
}

function sameLocalDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
