import type { BuddyState, CachedAssignment } from "../../../types/buddy";
import type { CanvasTodoItem } from "../../../types/canvas";
import { computeXpGain, applyXp } from "./buddy-engine";
import type { LevelUpResult } from "./buddy-engine";
import { ext } from "../../../browser";

const STORAGE_KEY = "canvasbuddy_buddy";

export async function loadBuddyState(): Promise<BuddyState> {
  return new Promise((resolve) => {
    ext.storage.local.get(STORAGE_KEY, (result) => {
      const stored = (result as Record<string, unknown>)[STORAGE_KEY] as BuddyState | undefined;
      if (stored !== undefined) {
        resolve(stored);
      } else {
        resolve({
          chosen: false,
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
        });
      }
    });
  });
}

export async function saveBuddyState(state: BuddyState): Promise<void> {
  return new Promise((resolve) => {
    ext.storage.local.set({ [STORAGE_KEY]: state }, resolve);
  });
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function computeUpdatedStreak(
  currentStreak: number,
  lastActivityDate: string,
  today: string
): number {
  if (lastActivityDate === today) return currentStreak;

  const last = new Date(lastActivityDate);
  const now = new Date(today);
  const diffDays = Math.round((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return currentStreak + 1;
  return 1;
}

export type XpProcessResult = {
  readonly updatedState: BuddyState;
  readonly levelUpResults: readonly LevelUpResult[];
  readonly completedCount: number;
};

export function processCompletions(
  state: BuddyState,
  currentTodoItems: readonly CanvasTodoItem[]
): XpProcessResult {
  const currentIds = new Set(
    currentTodoItems
      .filter((item) => item.assignment !== null)
      .map((item) => item.assignment!.id)
  );

  const seenMap = new Map(state.seenAssignments.map((a) => [a.id, a]));

  // Cache any newly seen assignments with their metadata
  const newlySeenFromTodo = currentTodoItems
    .filter((item) => item.assignment !== null && !seenMap.has(item.assignment.id))
    .map((item): CachedAssignment => ({
      id: item.assignment!.id,
      pointsPossible: item.assignment!.points_possible,
      dueAt: item.assignment!.due_at,
    }));

  // Find completed: were in seen list but are no longer in current todo
  const completed = state.seenAssignments.filter((a) => !currentIds.has(a.id));

  // Retain seen assignments that are still in the todo list, plus newly seen
  const updatedSeenAssignments: CachedAssignment[] = [
    ...state.seenAssignments.filter((a) => currentIds.has(a.id)),
    ...newlySeenFromTodo,
  ];

  if (completed.length === 0 && newlySeenFromTodo.length === 0) {
    return { updatedState: state, levelUpResults: [], completedCount: 0 };
  }

  if (completed.length === 0) {
    return {
      updatedState: { ...state, seenAssignments: updatedSeenAssignments },
      levelUpResults: [],
      completedCount: 0,
    };
  }

  const today = todayDateString();
  const newStreak = computeUpdatedStreak(state.streak, state.lastActivityDate, today);

  let currentState: BuddyState = {
    ...state,
    seenAssignments: updatedSeenAssignments,
    streak: newStreak,
    lastActivityDate: today,
    totalCompleted: state.totalCompleted + completed.length,
  };

  const levelUpResults: LevelUpResult[] = [];

  for (const assignment of completed) {
    const isEarly = assignment.dueAt !== null
      ? Date.now() < new Date(assignment.dueAt).getTime()
      : false;

    const xpGain = computeXpGain(assignment.pointsPossible, isEarly, newStreak);
    const { state: nextState, result } = applyXp(currentState, xpGain);
    currentState = nextState;
    levelUpResults.push(result);
  }

  return {
    updatedState: currentState,
    levelUpResults,
    completedCount: completed.length,
  };
}
