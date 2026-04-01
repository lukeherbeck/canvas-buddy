import { injectOrUpdateStyle, removeStyle } from "../utils/dom";

const STYLE_ID = "canvasbuddy-smart-scroll";
const HOST_ID = "canvasbuddy-scroll-btns";

const CSS = `
  .cb-scroll-btn {
    position: fixed;
    right: 16px;
    z-index: 99998;
    background: #1a1a2e;
    color: #8080c0;
    border: 1px solid #2a2a48;
    border-radius: 6px;
    width: 32px;
    height: 32px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s, background 0.1s;
    pointer-events: none;
  }

  .cb-scroll-btn.cb-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .cb-scroll-btn:hover {
    background: #22223a;
    color: #c0c0ff;
  }

  #cb-scroll-top {
    bottom: 56px;
  }

  #cb-scroll-bottom {
    bottom: 16px;
  }
`;

let scrollContainer: HTMLElement | null = null;

export function mountSmartScroll(): void {
  if (document.getElementById(HOST_ID) !== null) return;

  injectOrUpdateStyle(STYLE_ID, CSS);

  const container = document.createElement("div");
  container.id = HOST_ID;
  document.body.appendChild(container);
  scrollContainer = container;

  const topBtn = document.createElement("button");
  topBtn.id = "cb-scroll-top";
  topBtn.className = "cb-scroll-btn";
  topBtn.title = "Back to top";
  topBtn.textContent = "^";
  topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  const bottomBtn = document.createElement("button");
  bottomBtn.id = "cb-scroll-bottom";
  bottomBtn.className = "cb-scroll-btn";
  bottomBtn.title = "Scroll to bottom";
  bottomBtn.textContent = "v";
  bottomBtn.addEventListener("click", () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));

  container.appendChild(topBtn);
  container.appendChild(bottomBtn);

  const handleScroll = (): void => {
    const scrolled = window.scrollY > 400;
    topBtn.classList.toggle("cb-visible", scrolled);

    const nearBottom = window.scrollY + window.innerHeight >= document.body.scrollHeight - 200;
    bottomBtn.classList.toggle("cb-visible", !nearBottom);
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
}

export function unmountSmartScroll(): void {
  scrollContainer?.remove();
  scrollContainer = null;
  removeStyle(STYLE_ID);
}
