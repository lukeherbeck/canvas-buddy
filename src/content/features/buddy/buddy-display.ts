import type { BuddyState, EvolutionStage } from "../../../types/buddy";
import { STARTERS } from "../../../types/buddy";
import { xpToNextLevel } from "./buddy-engine";
import { ext } from "../../../browser";

export const BUDDY_DISPLAY_CSS = `
  .cb-buddy-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px 8px;
    gap: 6px;
    border-bottom: 1px solid #2a2a2a;
    background: #111118;
  }

  .cb-buddy-sprite-wrap {
    position: relative;
    width: 64px;
    height: 64px;
  }

  .cb-buddy-sprite {
    width: 64px;
    height: 64px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  @keyframes cb-idle-a {
    0%, 49% { content: url(var(--cb-sprite-a)); opacity: 1; }
    50%, 100% { content: url(var(--cb-sprite-a)); opacity: 1; }
  }

  .cb-sprite-a {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 64px; height: 64px;
    image-rendering: pixelated;
  }

  .cb-sprite-b {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 64px; height: 64px;
    image-rendering: pixelated;
  }

  @keyframes cb-sprite-swap {
    0%, 49.9% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  @keyframes cb-sprite-swap-b {
    0%, 49.9% { opacity: 0; }
    50%, 100% { opacity: 1; }
  }

  .cb-sprite-a {
    animation: cb-sprite-swap 1.2s steps(1) infinite;
  }

  .cb-sprite-b {
    animation: cb-sprite-swap-b 1.2s steps(1) infinite;
  }

  @keyframes cb-levelup {
    0% { transform: scale(1); }
    30% { transform: scale(1.3); }
    60% { transform: scale(0.9); }
    100% { transform: scale(1); }
  }

  .cb-buddy-sprite-wrap.cb-levelup {
    animation: cb-levelup 0.6s ease forwards;
  }

  .cb-buddy-info-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }

  .cb-buddy-name {
    font-size: 12px;
    font-weight: bold;
    color: #e8d5a0;
    font-family: 'Courier New', Courier, monospace;
  }

  .cb-buddy-level {
    font-size: 10px;
    color: #a09070;
    font-family: 'Courier New', Courier, monospace;
  }

  .cb-buddy-stage {
    font-size: 9px;
    color: #6a6050;
    font-family: 'Courier New', Courier, monospace;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cb-xp-bar-wrap {
    width: 100%;
    max-width: 140px;
    background: #1e1e28;
    border-radius: 3px;
    height: 6px;
    overflow: hidden;
    border: 1px solid #2a2a38;
  }

  .cb-xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a6aff, #8aacff);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .cb-xp-text {
    font-size: 9px;
    color: #6a6080;
    font-family: 'Courier New', Courier, monospace;
  }

  .cb-levelup-flash {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, #fff8 0%, transparent 70%);
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }

  @keyframes cb-flash {
    0% { opacity: 1; transform: scale(0.5); }
    100% { opacity: 0; transform: scale(1.5); }
  }

  .cb-levelup-flash.cb-active {
    animation: cb-flash 0.5s ease forwards;
  }

  .cb-streak-badge {
    font-size: 9px;
    color: #ff9040;
    font-family: 'Courier New', Courier, monospace;
  }
`;

function spriteUrl(starterId: string, stage: EvolutionStage, frame: "a" | "b"): string {
  return ext.runtime.getURL(`sprites/${starterId}-${stage}${frame}.png`);
}

export function createBuddyDisplay(state: BuddyState): {
  element: HTMLElement;
  update: (newState: BuddyState) => void;
  triggerLevelUp: () => void;
} {
  const starter = STARTERS.find((s) => s.id === state.starterId);

  const area = document.createElement("div");
  area.className = "cb-buddy-area";

  const spriteWrap = document.createElement("div");
  spriteWrap.className = "cb-buddy-sprite-wrap";

  const spriteA = document.createElement("img");
  spriteA.className = "cb-sprite-a";
  spriteA.alt = "";

  const spriteB = document.createElement("img");
  spriteB.className = "cb-sprite-b";
  spriteB.alt = "";

  const flash = document.createElement("div");
  flash.className = "cb-levelup-flash";

  spriteWrap.appendChild(spriteA);
  spriteWrap.appendChild(spriteB);
  spriteWrap.appendChild(flash);
  area.appendChild(spriteWrap);

  const infoRow = document.createElement("div");
  infoRow.className = "cb-buddy-info-row";

  const nameEl = document.createElement("span");
  nameEl.className = "cb-buddy-name";

  const levelEl = document.createElement("span");
  levelEl.className = "cb-buddy-level";

  infoRow.appendChild(nameEl);
  infoRow.appendChild(levelEl);
  area.appendChild(infoRow);

  const stageEl = document.createElement("div");
  stageEl.className = "cb-buddy-stage";
  area.appendChild(stageEl);

  const xpBarWrap = document.createElement("div");
  xpBarWrap.className = "cb-xp-bar-wrap";

  const xpBarFill = document.createElement("div");
  xpBarFill.className = "cb-xp-bar-fill";
  xpBarWrap.appendChild(xpBarFill);
  area.appendChild(xpBarWrap);

  const xpText = document.createElement("div");
  xpText.className = "cb-xp-text";
  area.appendChild(xpText);

  const streakBadge = document.createElement("div");
  streakBadge.className = "cb-streak-badge";
  area.appendChild(streakBadge);

  function update(s: BuddyState): void {
    const def = STARTERS.find((st) => st.id === s.starterId);
    const stageName = def?.stageName[s.evolutionStage - 1] ?? s.name;

    spriteA.src = spriteUrl(s.starterId, s.evolutionStage, "a");
    spriteB.src = spriteUrl(s.starterId, s.evolutionStage, "b");

    nameEl.textContent = s.name;
    levelEl.textContent = `Lv. ${s.level}`;
    stageEl.textContent = stageName;

    const xpNeeded = xpToNextLevel(s.level);
    const pct = Math.min(100, Math.floor((s.xp / xpNeeded) * 100));
    xpBarFill.style.width = `${pct}%`;
    xpText.textContent = `${s.xp} / ${xpNeeded} XP`;

    if (s.streak >= 2) {
      streakBadge.textContent = `${s.streak}x streak`;
    } else {
      streakBadge.textContent = "";
    }
  }

  function triggerLevelUp(): void {
    spriteWrap.classList.add("cb-levelup");
    flash.classList.add("cb-active");
    spriteWrap.addEventListener(
      "animationend",
      () => {
        spriteWrap.classList.remove("cb-levelup");
        flash.classList.remove("cb-active");
      },
      { once: true }
    );
  }

  update(state);

  return { element: area, update, triggerLevelUp };
}
