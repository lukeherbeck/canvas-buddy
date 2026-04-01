import { injectOrUpdateStyle, removeStyle } from "../utils/dom";
import type { Settings } from "../../types/settings";

const STYLE_ID = "canvasbuddy-custom-colors";

export function applyCustomColors(config: Settings["customColors"]): void {
  const css = `
    :root {
      --cb-custom-link: ${config.linkColor};
      --cb-custom-sidebar: ${config.sidebarColor};
      --cb-custom-accent: ${config.accentColor};
    }
    a, a:visited {
      color: var(--cb-custom-link) !important;
    }
    #left-side,
    .ic-app-nav-toggle-and-crumbs {
      background-color: var(--cb-custom-sidebar) !important;
    }
    .ic-app-header__main-navigation {
      background-color: var(--cb-custom-sidebar) !important;
    }
  `;
  injectOrUpdateStyle(STYLE_ID, css);
}

export function removeCustomColors(): void {
  removeStyle(STYLE_ID);
}
