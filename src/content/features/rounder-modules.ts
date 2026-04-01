import { injectOrUpdateStyle, removeStyle } from "../utils/dom";

const STYLE_ID = "canvasbuddy-rounder";

const CSS = `
  .context_module,
  .ig-row,
  .assignment-group-list,
  .assignment-group,
  .discussion-entry,
  .announcement,
  .submission,
  .grade-summary-row,
  .quiz-content,
  .content-box,
  .ic-DashboardCard,
  .ic-DashboardCard__header {
    border-radius: 8px !important;
  }

  .ig-row {
    overflow: hidden;
  }

  .module-item-title {
    border-radius: 6px;
  }

  .Button, .btn {
    border-radius: 6px !important;
  }
`;

export function applyRounderModules(): void {
  injectOrUpdateStyle(STYLE_ID, CSS);
}

export function removeRounderModules(): void {
  removeStyle(STYLE_ID);
}
