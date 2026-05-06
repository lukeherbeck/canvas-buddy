export const CANVAS_MATCH_PATTERNS = [
  "https://*.instructure.com/*",
  "https://canvas.tamu.edu/*",
] as const;

type CanvasWindowLike = {
  readonly ENV?: {
    readonly current_user_id?: unknown;
  };
};

type CanvasDocumentLike = Pick<Document, "querySelector">;

export function isCanvasPage(
  win: CanvasWindowLike = window as CanvasWindowLike,
  doc: CanvasDocumentLike = document
): boolean {
  if (win.ENV?.current_user_id !== undefined) return true;
  return doc.querySelector(".ic-app") !== null;
}

export function isExtensionTargetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return isCanvasHost(url.hostname);
  } catch {
    return false;
  }
}

function isCanvasHost(hostname: string): boolean {
  if (hostname === "canvas.tamu.edu") return true;
  if (hostname === "instructure.com") return true;
  return hostname.endsWith(".instructure.com");
}
