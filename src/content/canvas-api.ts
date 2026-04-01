import type { CanvasTodoItem, CanvasCourse, CanvasConversation, CanvasUpcomingEvent } from "../types/canvas";

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function parseNextLink(header: string | null): string | null {
  if (header === null) return null;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
}

async function apiGetAll<T>(path: string): Promise<ApiResult<T[]>> {
  const results: T[] = [];
  let url: string | null = path;

  while (url !== null) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      const page = (await response.json()) as T[];
      results.push(...page);
      url = parseNextLink(response.headers.get("Link"));
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  return { ok: true, data: results };
}

export const CanvasApi = {
  getTodo: (): Promise<ApiResult<CanvasTodoItem[]>> =>
    apiGet<CanvasTodoItem[]>("/api/v1/users/self/todo?per_page=50"),

  getUpcomingEvents: (): Promise<ApiResult<CanvasUpcomingEvent[]>> =>
    apiGet<CanvasUpcomingEvent[]>("/api/v1/users/self/upcoming_events?per_page=20"),

  getCourses: (): Promise<ApiResult<CanvasCourse[]>> =>
    apiGetAll<CanvasCourse>("/api/v1/courses?enrollment_state=active&per_page=50"),

  getConversations: (): Promise<ApiResult<CanvasConversation[]>> =>
    apiGet<CanvasConversation[]>("/api/v1/conversations?per_page=20&scope=inbox"),
} as const;
