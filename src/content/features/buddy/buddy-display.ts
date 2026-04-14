import type { BuddyState, EvolutionStage } from "../../../types/buddy";
import { STARTERS } from "../../../types/buddy";
import { xpToNextLevel } from "./buddy-engine";
import { ext } from "../../../browser";

export const BUDDY_DISPLAY_CSS = `
  .cb-buddy-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 10px 14px;
    gap: 7px;
    background: linear-gradient(160deg, #0f0c29 0%, #1e1b4b 45%, #12101f 100%);
    border-bottom: 1px solid rgba(245, 158, 11, 0.18);
    position: relative;
    overflow: hidden;
  }

  .cb-buddy-area::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,0.85) 0%, transparent 100%),
      radial-gradient(1px 1px at 58% 16%, rgba(255,255,255,0.65) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 78% 52%, rgba(255,255,255,0.75) 0%, transparent 100%),
      radial-gradient(1px 1px at 32% 74%, rgba(255,255,255,0.55) 0%, transparent 100%),
      radial-gradient(1px 1px at 90% 30%, rgba(255,255,255,0.65) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 10% 62%, rgba(255,255,255,0.45) 0%, transparent 100%),
      radial-gradient(1px 1px at 65% 82%, rgba(255,255,255,0.55) 0%, transparent 100%),
      radial-gradient(1px 1px at 44% 42%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(1px 1px at 85% 72%, rgba(255,200,100,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 25% 55%, rgba(200,180,255,0.35) 0%, transparent 100%);
    animation: cb-stars-twinkle 3.5s ease-in-out infinite alternate;
    pointer-events: none;
  }

  @keyframes cb-stars-twinkle {
    0%   { opacity: 0.45; }
    100% { opacity: 1; }
  }

  .cb-buddy-sprite-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    filter: drop-shadow(0 8px 20px rgba(245, 158, 11, 0.5));
  }

  .cb-sprite-a {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 72px; height: 72px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    animation: cb-sprite-swap 1.2s steps(1) infinite;
  }

  .cb-sprite-b {
    display: block;
    position: absolute;
    top: 0; left: 0;
    width: 72px; height: 72px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    animation: cb-sprite-swap-b 1.2s steps(1) infinite;
  }

  @keyframes cb-sprite-swap {
    0%, 49.9% { opacity: 1; }
    50%, 100%  { opacity: 0; }
  }

  @keyframes cb-sprite-swap-b {
    0%, 49.9% { opacity: 0; }
    50%, 100%  { opacity: 1; }
  }

  @keyframes cb-levelup {
    0%   { transform: scale(1) rotate(0deg); }
    15%  { transform: scale(1.55) rotate(-7deg); }
    35%  { transform: scale(1.55) rotate(7deg); }
    60%  { transform: scale(1.2) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); }
  }

  .cb-buddy-sprite-wrap.cb-levelup {
    animation: cb-levelup 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  .cb-levelup-flash {
    position: absolute;
    inset: -18px;
    background: radial-gradient(circle, rgba(245, 158, 11, 0.75) 0%, rgba(244, 63, 94, 0.45) 40%, transparent 70%);
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }

  @keyframes cb-flash {
    0%   { opacity: 1; transform: scale(0.2); }
    100% { opacity: 0; transform: scale(2.8); }
  }

  .cb-levelup-flash.cb-active {
    animation: cb-flash 0.75s ease-out forwards;
  }

  .cb-spark {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    pointer-events: none;
    width: var(--cb-spark-size, 4px);
    height: var(--cb-spark-size, 4px);
    background: var(--cb-spark-color, #fbbf24);
    animation: cb-spark-out 0.65s ease-out forwards;
  }

  @keyframes cb-spark-out {
    0% {
      transform: translate(-50%, -50%) rotate(var(--cb-spark-angle)) translateX(0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) rotate(var(--cb-spark-angle)) translateX(var(--cb-spark-dist)) scale(0);
      opacity: 0;
    }
  }

  .cb-buddy-info-row {
    display: flex;
    align-items: center;
    gap: 7px;
    position: relative;
    z-index: 1;
  }

  .cb-buddy-name {
    font-size: 14px;
    font-weight: 900;
    color: #ffffff;
    font-family: 'Nunito', sans-serif;
  }

  .cb-buddy-level {
    font-size: 12px;
    font-weight: 400;
    color: #0f0c29;
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    border-radius: 7px;
    padding: 2px 8px;
    font-family: 'Bebas Neue', 'Nunito', sans-serif;
    letter-spacing: 0.5px;
    line-height: 1.3;
  }

  .cb-buddy-stage {
    font-size: 9px;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.42);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    position: relative;
    z-index: 1;
  }

  .cb-xp-bar-wrap {
    width: 100%;
    max-width: 164px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    height: 8px;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  .cb-xp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #fbbf24);
    border-radius: 6px;
    transition: width 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.55);
  }

  .cb-xp-bar-fill.cb-near-max {
    animation: cb-xp-pulse 0.9s ease-in-out infinite;
  }

  @keyframes cb-xp-pulse {
    0%, 100% { box-shadow: 0 0 8px rgba(245, 158, 11, 0.55); }
    50%       { box-shadow: 0 0 20px rgba(245, 158, 11, 0.95), 0 0 32px rgba(244, 63, 94, 0.55); }
  }

  .cb-xp-text {
    font-size: 9.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.48);
    position: relative;
    z-index: 1;
  }

  .cb-streak-badge {
    font-size: 9.5px;
    font-weight: 800;
    color: #fb923c;
    background: rgba(249, 115, 22, 0.18);
    border-radius: 10px;
    padding: 2px 9px;
    border: 1px solid rgba(249, 115, 22, 0.28);
    position: relative;
    z-index: 1;
  }
`;

function spriteUrl(starterId: string, stage: EvolutionStage, frame: "a" | "b"): string {
  return ext.runtime.getURL(`sprites/${starterId}-${stage}${frame}.png`);
}

function triggerParticles(container: HTMLElement): void {
  const count = 12;
  const colors = ["#fbbf24", "#f43f5e", "#ffffff", "#f59e0b", "#fb923c"];
  for (let i = 0; i < count; i++) {
    const spark = document.createElement("div");
    spark.className = "cb-spark";
    const angle = (i / count) * 360;
    const dist = 36 + Math.random() * 30;
    const size = 3 + Math.random() * 4;
    const color = colors[i % colors.length] ?? "#fbbf24";
    spark.style.setProperty("--cb-spark-angle", `${angle}deg`);
    spark.style.setProperty("--cb-spark-dist", `${dist}px`);
    spark.style.setProperty("--cb-spark-size", `${size}px`);
    spark.style.setProperty("--cb-spark-color", color);
    container.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
  }
}

export function createBuddyDisplay(state: BuddyState): {
  element: HTMLElement;
  update: (newState: BuddyState) => void;
  triggerLevelUp: () => void;
} {

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
    xpBarFill.classList.toggle("cb-near-max", pct >= 80);
    xpText.textContent = `${s.xp} / ${xpNeeded} XP`;

    if (s.streak >= 2) {
      streakBadge.textContent = `${s.streak}x streak`;
      streakBadge.style.display = "";
    } else {
      streakBadge.style.display = "none";
    }
  }

  function triggerLevelUp(): void {
    spriteWrap.classList.add("cb-levelup");
    flash.classList.add("cb-active");
    triggerParticles(spriteWrap);
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
