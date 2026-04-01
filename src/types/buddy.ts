export type StarterID = "inklet" | "flasky" | "nappie";
export type EvolutionStage = 1 | 2 | 3;

export interface CachedAssignment {
  readonly id: number;
  readonly pointsPossible: number;
  readonly dueAt: string | null;
}

export interface BuddyState {
  readonly chosen: boolean;
  readonly starterId: StarterID;
  readonly name: string;
  readonly level: number;
  readonly xp: number;
  readonly totalXp: number;
  readonly evolutionStage: EvolutionStage;
  readonly streak: number;
  readonly lastActivityDate: string;
  readonly seenAssignments: readonly CachedAssignment[];
  readonly totalCompleted: number;
}

export interface StarterDefinition {
  readonly id: StarterID;
  readonly name: string;
  readonly description: string;
  readonly stageName: readonly [string, string, string];
}

export const STARTERS: readonly StarterDefinition[] = [
  {
    id: "inklet",
    name: "Inklet",
    description: "The curious ink sprite who loves reading every assignment.",
    stageName: ["Inklet", "Booklet", "Codex"],
  },
  {
    id: "flasky",
    name: "Flasky",
    description: "The clever scientist always bubbling with new ideas.",
    stageName: ["Flasky", "Beakle", "Alchemix"],
  },
  {
    id: "nappie",
    name: "Nappie",
    description: "The determined night owl who never misses a deadline.",
    stageName: ["Nappie", "Brewlet", "Nocturna"],
  },
] as const;

export const DEFAULT_BUDDY_STATE: BuddyState = {
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
} as const;
