import type { StarterID } from "../../../types/buddy";
import { STARTERS } from "../../../types/buddy";
import type { BuddyState } from "../../../types/buddy";
import { saveBuddyState } from "./xp-sources";
import { ext } from "../../../browser";

export const STARTER_SELECT_CSS = `
  .cb-starter-select {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 18px 12px 16px;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(160deg, #0f0c29 0%, #1e1b4b 45%, #12101f 100%);
    position: relative;
    overflow: hidden;
  }

  .cb-starter-select::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(1px 1px at 14% 24%, rgba(255,255,255,0.75) 0%, transparent 100%),
      radial-gradient(1px 1px at 72% 14%, rgba(255,255,255,0.55) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 82% 58%, rgba(255,255,255,0.65) 0%, transparent 100%),
      radial-gradient(1px 1px at 28% 80%, rgba(255,255,255,0.45) 0%, transparent 100%),
      radial-gradient(1px 1px at 92% 38%, rgba(255,255,255,0.55) 0%, transparent 100%),
      radial-gradient(1px 1px at 48% 52%, rgba(255,255,255,0.35) 0%, transparent 100%),
      radial-gradient(1px 1px at 60% 76%, rgba(255,200,100,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 8% 45%, rgba(200,180,255,0.4) 0%, transparent 100%);
    animation: cb-stars-twinkle 3.5s ease-in-out infinite alternate;
    pointer-events: none;
  }

  .cb-starter-title {
    font-size: 18px;
    font-weight: 400;
    font-family: 'Bebas Neue', 'Nunito', sans-serif;
    letter-spacing: 2.5px;
    text-align: center;
    background: linear-gradient(90deg, #f59e0b 0%, #f43f5e 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    position: relative;
    z-index: 1;
  }

  .cb-starter-subtitle {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.42);
    text-align: center;
    margin-top: -8px;
    position: relative;
    z-index: 1;
  }

  .cb-starter-row {
    display: flex;
    gap: 7px;
    justify-content: center;
    position: relative;
    z-index: 1;
  }

  .cb-starter-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 6px;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    gap: 5px;
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    width: 66px;
  }

  .cb-starter-card:hover,
  .cb-starter-card.cb-focused {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
    transform: translateY(-6px);
    box-shadow:
      0 12px 32px rgba(245, 158, 11, 0.32),
      0 0 0 1px rgba(245, 158, 11, 0.4);
  }

  .cb-starter-sprite {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    filter: drop-shadow(0 4px 10px rgba(245, 158, 11, 0.38));
  }

  .cb-starter-name {
    font-size: 8.5px;
    font-weight: 900;
    color: #fbbf24;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Nunito', sans-serif;
  }

  .cb-starter-desc {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.52);
    text-align: center;
    line-height: 1.45;
    min-height: 42px;
    padding: 0 4px;
    position: relative;
    z-index: 1;
  }

  .cb-choose-btn {
    background: linear-gradient(135deg, #f59e0b 0%, #f43f5e 100%);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 10px 26px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 6px 22px rgba(245, 158, 11, 0.52);
    position: relative;
    z-index: 1;
  }

  .cb-choose-btn:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 12px 30px rgba(244, 63, 94, 0.52);
  }

  .cb-choose-btn:active { transform: translateY(0) scale(0.97); }

  @keyframes cb-bounce {
    0%, 100% { transform: translateY(0); }
    40%       { transform: translateY(-11px); }
    65%       { transform: translateY(-5px); }
  }

  .cb-bounce { animation: cb-bounce 0.5s ease 2; }
`;

export function renderStarterSelect(
  container: HTMLElement,
  onChosen: (starterId: StarterID, state: BuddyState) => void
): void {
  let focusedIndex = 0;

  const root = document.createElement("div");
  root.className = "cb-starter-select";

  const title = document.createElement("div");
  title.className = "cb-starter-title";
  title.textContent = "Choose Your Buddy";
  root.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "cb-starter-subtitle";
  subtitle.textContent = "Your companion through every assignment";
  root.appendChild(subtitle);

  const row = document.createElement("div");
  row.className = "cb-starter-row";

  const cards: HTMLElement[] = [];

  for (const [i, starter] of STARTERS.entries()) {
    const card = document.createElement("div");
    card.className = "cb-starter-card" + (i === 0 ? " cb-focused" : "");
    card.dataset["starterId"] = starter.id;

    const img = document.createElement("img");
    img.className = "cb-starter-sprite";
    img.src = ext.runtime.getURL(`sprites/${starter.id}-1a.png`);
    img.alt = starter.name;
    card.appendChild(img);

    const name = document.createElement("div");
    name.className = "cb-starter-name";
    name.textContent = starter.name;
    card.appendChild(name);

    card.addEventListener("click", () => {
      focusedIndex = i;
      updateFocus();
    });

    card.addEventListener("dblclick", () => {
      confirmChoice();
    });

    cards.push(card);
    row.appendChild(card);
  }

  root.appendChild(row);

  const desc = document.createElement("div");
  desc.className = "cb-starter-desc";
  root.appendChild(desc);

  const btn = document.createElement("button");
  btn.className = "cb-choose-btn";
  root.appendChild(btn);

  function updateFocus(): void {
    for (const [i, card] of cards.entries()) {
      card.classList.toggle("cb-focused", i === focusedIndex);
    }
    const starter = STARTERS[focusedIndex];
    if (starter !== undefined) {
      desc.textContent = starter.description;
      btn.textContent = `Choose ${starter.name}!`;
    }
  }

  function confirmChoice(): void {
    const starter = STARTERS[focusedIndex];
    if (starter === undefined) return;

    const card = cards[focusedIndex];
    card?.classList.add("cb-bounce");

    const newState: BuddyState = {
      chosen: true,
      starterId: starter.id,
      name: starter.stageName[0],
      level: 1,
      xp: 0,
      totalXp: 0,
      evolutionStage: 1,
      streak: 0,
      lastActivityDate: "",
      seenAssignments: [],
      totalCompleted: 0,
    };

    saveBuddyState(newState).then(() => {
      setTimeout(() => onChosen(starter.id, newState), 600);
    }).catch(console.error);
  }

  btn.addEventListener("click", confirmChoice);

  root.addEventListener("keydown", (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "ArrowLeft") {
      focusedIndex = (focusedIndex - 1 + STARTERS.length) % STARTERS.length;
      updateFocus();
    } else if (ke.key === "ArrowRight") {
      focusedIndex = (focusedIndex + 1) % STARTERS.length;
      updateFocus();
    } else if (ke.key === "Enter") {
      confirmChoice();
    }
  });

  root.tabIndex = 0;
  updateFocus();
  container.appendChild(root);
}
