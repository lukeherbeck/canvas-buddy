import { debounce } from "../utils/debounce";

const prefetched = new Set<string>();

function prefetchUrl(url: string): void {
  if (prefetched.has(url)) return;
  if (!url.startsWith(window.location.origin)) return;
  prefetched.add(url);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.appendChild(link);
}

function getHref(el: EventTarget | null): string | null {
  if (el === null) return null;
  const anchor = (el as Element).closest("a[href]");
  if (anchor === null) return null;
  const href = (anchor as HTMLAnchorElement).href;
  return href || null;
}

const debouncedPrefetch = debounce((url: string) => prefetchUrl(url), 100);

function handleMouseEnter(e: MouseEvent): void {
  const href = getHref(e.target);
  if (href !== null) debouncedPrefetch(href);
}

function idlePrefetch(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (const link of links) {
    const rect = link.getBoundingClientRect();
    const inViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    if (inViewport && link.href.startsWith(window.location.origin)) {
      prefetchUrl(link.href);
    }
  }
}

export function mountSpeedBoost(): void {
  document.addEventListener("mouseover", handleMouseEnter, { passive: true });
  requestIdleCallback(() => idlePrefetch(), { timeout: 2000 });
}

export function unmountSpeedBoost(): void {
  document.removeEventListener("mouseover", handleMouseEnter);
}
