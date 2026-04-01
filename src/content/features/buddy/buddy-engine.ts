import type { BuddyState, EvolutionStage } from "../../../types/buddy";

export type LevelUpResult =
  | { readonly kind: "none" }
  | { readonly kind: "levelUp"; readonly newLevel: number; readonly evolved: boolean; readonly newStage: EvolutionStage };

const XP_PER_LEVEL = 100;
const EVOLUTION_STAGE_2 = 10;
const EVOLUTION_STAGE_3 = 20;
const EARLY_SUBMISSION_MULTIPLIER = 1.5;
const STREAK_BONUS_XP = 5;
const MIN_BASE_XP = 10;

export function xpForLevel(level: number): number {
  return (level - 1) * XP_PER_LEVEL;
}

export function xpToNextLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

export function xpNeededForNextLevel(currentXp: number, currentLevel: number): number {
  return xpToNextLevel(currentLevel) - currentXp;
}

export function stageForLevel(level: number): EvolutionStage {
  if (level >= EVOLUTION_STAGE_3) return 3;
  if (level >= EVOLUTION_STAGE_2) return 2;
  return 1;
}

export function computeXpGain(
  pointsPossible: number,
  isEarly: boolean,
  streak: number
): number {
  const base = Math.max(MIN_BASE_XP, Math.floor(pointsPossible / 10));
  const multiplied = isEarly ? Math.floor(base * EARLY_SUBMISSION_MULTIPLIER) : base;
  const streakBonus = streak >= 2 ? STREAK_BONUS_XP : 0;
  return multiplied + streakBonus;
}

export function applyXp(
  state: BuddyState,
  xpGained: number
): { readonly state: BuddyState; readonly result: LevelUpResult } {
  let newXp = state.xp + xpGained;
  let newLevel = state.level;
  let evolved = false;

  while (newXp >= xpToNextLevel(newLevel)) {
    newXp -= xpToNextLevel(newLevel);
    newLevel += 1;
  }

  const newStage = stageForLevel(newLevel);
  if (newStage !== state.evolutionStage) {
    evolved = true;
  }

  const newState: BuddyState = {
    ...state,
    xp: newXp,
    level: newLevel,
    totalXp: state.totalXp + xpGained,
    evolutionStage: newStage,
  };

  const result: LevelUpResult =
    newLevel !== state.level
      ? { kind: "levelUp", newLevel, evolved, newStage }
      : { kind: "none" };

  return { state: newState, result };
}
