import type { BuddyState, EvolutionStage } from "../../../types/buddy";
import { STARTERS } from "../../../types/buddy";
import { xpToNextLevel } from "./buddy-engine";
import { ext } from "../../../browser";

export const BUDDY_DISPLAY_CSS = `
  .cb-buddy-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 10px 12px;
    gap: 6px;
    background: linear-gradient(160deg, #eef2ff 0%, #f3eeff 100%);
    border-bottom: 1px solid rgba(200, 195, 250, 0.28);
  }

  .cb-buddy-sprite-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    filter: drop-shadow(0 6px 14px rgba(99, 102, 241, 0.28));
  }

  .cb-sprite-a {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 64px; height: 64px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    animation: cb-sprite-swap 1.2s steps(1) infinite;
  }

  .cb-sprite-b {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 64px; height: 64px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    animation: cb-sprite-swap-b 1.2s steps(1) infinite;
  }

  @keyframes cb-sprite-swap {
    0%, 49.9% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }

  @keyframes cb-sprite-swap-b {
    0%, 49.9% { opacity: 0; }
    50%, 100% { opacity: 1; }
  }

  @keyframes cb-levelup {
    0%   { transform: scale(1) rotate(0deg); }
    20%  { transform: scale(1.4) rotate(-4deg); }
    40%  { transform: scale(1.4) rotate(4deg); }
    65%  { transform: scale(1.15) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  .cb-buddy-sprite-wrap.cb-levelup {
    animation: cb-levelup 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .cb-levelup-flash {
    position: absolute;
    inset: -10px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.55) 0%, transparent 70%);
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }

  @keyframes cb-flash {
    0%   { opacity: 1; transform: scale(0.3); }
    100% { opacity: 0; transform: scale(2.2); }
  }

  .cb-levelup-flash.cb-active {
    animation: cb-flash 0.65s ease forwards;
  }

  .cb-buddy-info-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cb-buddy-name {
    font-size: 13px;
    font-weight: 800;
    color: #2a2650;
    font-family: 'Nunito', sans-serif;
  }

  .cb-buddy-level {
    font-size: 10px;
    font-weight: 800;
    color: white;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    border-radius: 8px;
    padding: 1px 7px;
  }

  .cb-buddy-stage {
    font-size: 8.5px;
    font-weight: 800;
    color: #a090c8;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }

  .cb-xp-bar-wrap {
    width: 100%;
    max-width: 152px;
    background: rgba(99, 102, 241, 0.1);
    border-radius: 6px;
    height: 7px;
    overflow: hidden;
  }

  .cb-xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #6366f1, #a78bfa);
    border-radius: 6px;
    transition: width 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .cb-xp-text {
    font-size: 9.5px;
    font-weight: 700;
    color: #a898c8;
  }

  .cb-streak-badge {
    font-size: 9.5px;
    font-weight: 800;
    color: #f97316;
    background: rgba(249, 115, 22, 0.1);
    border-radius: 10px;
    padding: 1px 8px;
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
