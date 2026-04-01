import { describe, it, expect } from "vitest";
import {
  computeXpGain,
  applyXp,
  xpToNextLevel,
  stageForLevel,
  xpNeededForNextLevel,
} from "../src/content/features/buddy/buddy-engine";
import type { BuddyState } from "../src/types/buddy";
import { DEFAULT_BUDDY_STATE } from "../src/types/buddy";

function makeState(overrides: Partial<BuddyState> = {}): BuddyState {
  return { ...DEFAULT_BUDDY_STATE, chosen: true, ...overrides };
}

describe("computeXpGain", () => {
  it("uses minimum 10 XP for zero-point assignments", () => {
    expect(computeXpGain(0, false, 0)).toBe(10);
  });

  it("computes base XP as floor(points / 10), subject to the 10 XP minimum", () => {
    expect(computeXpGain(100, false, 0)).toBe(10);
    // 50 / 10 = 5, but minimum is 10
    expect(computeXpGain(50, false, 0)).toBe(10);
    // 200 / 10 = 20, exceeds minimum
    expect(computeXpGain(200, false, 0)).toBe(20);
  });

  it("applies 1.5x multiplier for early submission", () => {
    expect(computeXpGain(100, true, 0)).toBe(15);
    expect(computeXpGain(200, true, 0)).toBe(30);
  });

  it("adds 5 XP streak bonus when streak >= 2", () => {
    expect(computeXpGain(100, false, 2)).toBe(15);
    expect(computeXpGain(100, false, 5)).toBe(15);
  });

  it("no streak bonus when streak < 2", () => {
    expect(computeXpGain(100, false, 0)).toBe(10);
    expect(computeXpGain(100, false, 1)).toBe(10);
  });

  it("stacks early and streak bonuses", () => {
    expect(computeXpGain(100, true, 3)).toBe(20);
  });
});

describe("xpToNextLevel", () => {
  it("requires 100 XP to reach level 2", () => {
    expect(xpToNextLevel(1)).toBe(100);
  });

  it("requires 200 XP from level 2 to level 3", () => {
    expect(xpToNextLevel(2)).toBe(200);
  });

  it("scales linearly", () => {
    expect(xpToNextLevel(10)).toBe(1000);
  });
});

describe("stageForLevel", () => {
  it("stage 1 below level 10", () => {
    expect(stageForLevel(1)).toBe(1);
    expect(stageForLevel(9)).toBe(1);
  });

  it("stage 2 at level 10", () => {
    expect(stageForLevel(10)).toBe(2);
    expect(stageForLevel(19)).toBe(2);
  });

  it("stage 3 at level 20 and beyond", () => {
    expect(stageForLevel(20)).toBe(3);
    expect(stageForLevel(50)).toBe(3);
  });
});

describe("xpNeededForNextLevel", () => {
  it("returns XP remaining to the next level threshold", () => {
    expect(xpNeededForNextLevel(40, 1)).toBe(60);
    expect(xpNeededForNextLevel(0, 1)).toBe(100);
    expect(xpNeededForNextLevel(99, 1)).toBe(1);
  });
});

describe("applyXp", () => {
  it("adds XP to state without level-up", () => {
    const state = makeState({ level: 1, xp: 0 });
    const { state: next, result } = applyXp(state, 50);

    expect(next.xp).toBe(50);
    expect(next.level).toBe(1);
    expect(next.totalXp).toBe(50);
    expect(result.kind).toBe("none");
  });

  it("triggers level-up when XP crosses threshold", () => {
    const state = makeState({ level: 1, xp: 90 });
    const { state: next, result } = applyXp(state, 20);

    expect(next.level).toBe(2);
    expect(next.xp).toBe(10); // 90 + 20 = 110, threshold 100, remainder 10
    expect(result.kind).toBe("levelUp");
    if (result.kind === "levelUp") {
      expect(result.newLevel).toBe(2);
      expect(result.evolved).toBe(false);
    }
  });

  it("handles multiple level-ups from a single XP gain", () => {
    const state = makeState({ level: 1, xp: 0 });
    // xpToNextLevel(1)=100, xpToNextLevel(2)=200 -> need 300 total to reach level 3
    // with 350 XP: 350-100=250 (reach lvl2), 250-200=50 (reach lvl3), 50 < 300 -> stops at lvl3
    const { state: next, result } = applyXp(state, 350);

    expect(next.level).toBe(3);
    expect(next.xp).toBe(50);
    if (result.kind === "levelUp") {
      expect(result.newLevel).toBe(3);
    }
  });

  it("triggers evolution at level 10", () => {
    const state = makeState({ level: 9, xp: 890 });
    // xpToNextLevel(9) = 900, so need 10 more XP
    const { state: next, result } = applyXp(state, 10);

    expect(next.level).toBe(10);
    expect(next.evolutionStage).toBe(2);
    expect(result.kind).toBe("levelUp");
    if (result.kind === "levelUp") {
      expect(result.evolved).toBe(true);
      expect(result.newStage).toBe(2);
    }
  });

  it("triggers evolution at level 20", () => {
    // Build up to just below level 20
    const xpAtLevel19 = Array.from({ length: 19 }, (_, i) => (i + 1) * 100).reduce((a, b) => a + b, 0) - 100;
    const state = makeState({
      level: 19,
      xp: xpAtLevel19 - (19 - 1) * 100,
      evolutionStage: 2,
    });
    // Just give enough to hit level 20
    const needed = xpToNextLevel(19) - state.xp;
    const { state: next, result } = applyXp(state, needed);

    expect(next.level).toBe(20);
    expect(next.evolutionStage).toBe(3);
    if (result.kind === "levelUp") {
      expect(result.evolved).toBe(true);
      expect(result.newStage).toBe(3);
    }
  });

  it("accumulates totalXp across multiple calls", () => {
    let state = makeState({ level: 1, xp: 0, totalXp: 0 });
    ({ state } = applyXp(state, 30));
    ({ state } = applyXp(state, 20));

    expect(state.totalXp).toBe(50);
  });

  it("does not mutate the original state", () => {
    const original = makeState({ level: 1, xp: 50, totalXp: 50 });
    applyXp(original, 100);

    expect(original.xp).toBe(50);
    expect(original.level).toBe(1);
  });
});
