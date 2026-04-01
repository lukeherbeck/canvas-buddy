import type { StarterID } from "../../../types/buddy";
import { STARTERS } from "../../../types/buddy";
import type { BuddyState } from "../../../types/buddy";
import { saveBuddyState } from "./xp-sources";
import { ext } from "../../../browser";

const STARTER_SELECT_CSS = `
  :host {
    all: initial;
    font-family: 'Courier New', Courier, monospace;
  }

  .cb-starter-select {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 12px;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .cb-starter-title {
    font-size: 13px;
    font-weight: bold;
    color: #e8d5a0;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
  }

  .cb-starter-subtitle {
    font-size: 10px;
    color: #a09070;
    text-align: center;
    margin-top: -8px;
  }

  .cb-starter-row {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .cb-starter-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 6px;
    border: 2px solid #3a3020;
    border-radius: 6px;
    cursor: pointer;
    background: #1a1510;
    gap: 4px;
    transition: border-color 0.1s, background 0.1s;
    width: 64px;
  }

  .cb-starter-card:hover,
  .cb-starter-card.cb-focused {
    border-color: #e8d5a0;
    background: #2a2015;
  }

  .cb-starter-card.cb-focused {
    box-shadow: 0 0 0 1px #e8d5a040;
  }

  .cb-starter-sprite {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .cb-starter-name {
    font-size: 9px;
    color: #c8b880;
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cb-starter-desc {
    font-size: 10px;
    color: #c8b880;
    text-align: center;
    line-height: 1.4;
    min-height: 44px;
    padding: 0 4px;
  }

  .cb-choose-btn {
    background: #e8d5a0;
    color: #1a1510;
    border: none;
    border-radius: 4px;
    padding: 8px 16px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    transition: background 0.1s;
  }

  .cb-choose-btn:hover {
    background: #fff8e0;
  }

  @keyframes cb-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }

  .cb-bounce {
    animation: cb-bounce 0.4s ease 2;
  }
`;

export function renderStarterSelect(
  container: ShadowRoot,
  onChosen: (starterId: StarterID, state: BuddyState) => void
): void {
  let focusedIndex = 0;

  const styleEl = document.createElement("style");
  styleEl.textContent = STARTER_SELECT_CSS;
  container.appendChild(styleEl);

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

  container.addEventListener("keydown", (e: Event) => {
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

  updateFocus();
  container.appendChild(root);
}

