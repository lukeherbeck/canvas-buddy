import type { ThemeMode } from "../../types/settings";
import { injectOrUpdateStyle, removeStyle } from "../utils/dom";

const STYLE_ID = "canvasbuddy-theme";

const DARK_CSS = `
  :root {
    --ic-brand-button--primary-bgd: #1a4a8a;
    --ic-brand-button--primary-text: #e8e8f0;
    --ic-brand-link-color: #6494d0;
    --ic-link-color: #6494d0;
  }
  body,
  #application,
  #main,
  .ic-Layout-wrapper,
  .ic-app-main-content__secondary,
  .content-box,
  .ic-app-nav-toggle-and-crumbs,
  .content {
    background-color: #111118 !important;
    color: #d0d0e0 !important;
  }
  #left-side,
  .ic-app-nav-toggle-and-crumbs--is-scrolled {
    background-color: #0d0d14 !important;
  }
  .ic-DashboardCard,
  .ic-DashboardCard__header,
  .ic-DashboardCard__content,
  .assignment-group-list,
  .context_module,
  .ig-row,
  .discussion-entry,
  .announcement,
  .submission,
  #wiki_page_show,
  .show-content {
    background-color: #16161e !important;
    color: #d0d0e0 !important;
  }
  .ic-DashboardCard__header {
    border-color: #2a2a38 !important;
  }
  a, a:visited {
    color: #6494d0 !important;
  }
  input, textarea, select {
    background-color: #1e1e2c !important;
    color: #d0d0e0 !important;
    border-color: #3a3a4a !important;
  }
`;

const DIM_CSS = `
  :root {
    --ic-brand-link-color: #7a94b0;
  }
  body,
  #application,
  #main,
  .ic-Layout-wrapper,
  .content-box,
  .content {
    background-color: #1e1c18 !important;
    color: #c8c0a8 !important;
  }
  #left-side,
  .ic-app-nav-toggle-and-crumbs {
    background-color: #181610 !important;
  }
  .ic-DashboardCard,
  .context_module,
  .ig-row,
  .discussion-entry {
    background-color: #242018 !important;
  }
  a, a:visited {
    color: #8aa0b8 !important;
  }
`;

export function applyTheme(mode: ThemeMode): void {
  if (mode === "default") {
    removeStyle(STYLE_ID);
    return;
  }
  injectOrUpdateStyle(STYLE_ID, mode === "dark" ? DARK_CSS : DIM_CSS);
}

export function removeTheme(): void {
  removeStyle(STYLE_ID);
}
