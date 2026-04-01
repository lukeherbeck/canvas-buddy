export function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing !== null) {
      resolve(existing);
      return;
    }
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el !== null) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function createShadowHost(id: string): { host: HTMLElement; shadow: ShadowRoot } {
  const existing = document.getElementById(id);
  if (existing !== null) {
    existing.remove();
  }
  const host = document.createElement("div");
  host.id = id;
  const shadow = host.attachShadow({ mode: "closed" });
  return { host, shadow };
}

export function injectOrUpdateStyle(id: string, css: string): void {
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (el === null) {
    el = document.createElement("style");
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

export function removeStyle(id: string): void {
  document.getElementById(id)?.remove();
}
