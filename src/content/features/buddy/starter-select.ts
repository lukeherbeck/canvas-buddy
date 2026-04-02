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
    padding: 16px 12px 14px;
    gap: 11px;
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(160deg, #eef2ff 0%, #f3eeff 100%);
  }

  .cb-starter-title {
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: center;
    background: linear-gradient(90deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-family: 'Nunito', sans-serif;
  }

  .cb-starter-subtitle {
    font-size: 10px;
    font-weight: 600;
    color: #a090c0;
    text-align: center;
    margin-top: -6px;
  }

  .cb-starter-row {
    display: flex;
    gap: 6px;
    justify-content: center;
  }

  .cb-starter-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 5px;
    border: 2px solid rgba(200, 195, 250, 0.4);
    border-radius: 14px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(8px);
    gap: 5px;
    transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    width: 62px;
  }

  .cb-starter-card:hover,
  .cb-starter-card.cb-focused {
    border-color: #6366f1;
    background: rgba(240, 238, 255, 0.9);
    transform: translateY(-4px);
    box-shadow: 0 8px 22px rgba(99, 102, 241, 0.22);
  }

  .cb-starter-sprite {
    width: 48px;
    height: 48px;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    filter: drop-shadow(0 3px 6px rgba(99,102,241,0.2));
  }

  .cb-starter-name {
    font-size: 8px;
    font-weight: 900;
    color: #6366f1;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: 'Nunito', sans-serif;
  }

  .cb-starter-desc {
    font-size: 10px;
    font-weight: 600;
    color: #8888b8;
    text-align: center;
    line-height: 1.45;
    min-height: 42px;
    padding: 0 4px;
  }

  .cb-choose-btn {
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 9px 22px;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    font-family: 'Nunito', sans-serif;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.38);
  }

  .cb-choose-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 22px rgba(99, 102, 241, 0.48);
  }

  .cb-choose-btn:active { transform: translateY(0); }

  @keyframes cb-bounce {
    0%, 100% { transform: translateY(0); }
    40%       { transform: translateY(-9px); }
    65%       { transform: translateY(-4px); }
  }

  .cb-bounce { animation: cb-bounce 0.45s ease 2; }
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

