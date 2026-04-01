export type ThemeMode = "default" | "dark" | "dim";

export interface Settings {
  readonly enabled: boolean;
  readonly theme: ThemeMode;
  readonly rounderModules: boolean;
  readonly smartScrolling: boolean;
  readonly searchBox: boolean;
  readonly quickInbox: boolean;
  readonly speedBoost: boolean;
  readonly todoPanel: boolean;
  readonly customColors: {
    readonly enabled: boolean;
    readonly linkColor: string;
    readonly sidebarColor: string;
    readonly accentColor: string;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  theme: "default",
  rounderModules: true,
  smartScrolling: true,
  searchBox: true,
  quickInbox: true,
  speedBoost: true,
  todoPanel: true,
  customColors: {
    enabled: false,
    linkColor: "#0770A3",
    sidebarColor: "#2D3B45",
    accentColor: "#E66000",
  },
} as const;
