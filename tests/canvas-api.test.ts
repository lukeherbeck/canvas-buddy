import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseNextLink, CanvasApi } from "../src/content/canvas-api";

describe("parseNextLink", () => {
  it("extracts the next URL from a Link header", () => {
    const header = `<https://canvas.tamu.edu/api/v1/users/self/todo?page=2&per_page=50>; rel="next", <https://canvas.tamu.edu/api/v1/users/self/todo?page=5>; rel="last"`;
    expect(parseNextLink(header)).toBe(
      "https://canvas.tamu.edu/api/v1/users/self/todo?page=2&per_page=50"
    );
  });

  it("returns null when no next rel in header", () => {
    const header = `<https://canvas.tamu.edu/api/v1/users/self/todo?page=5>; rel="last"`;
    expect(parseNextLink(header)).toBeNull();
  });

  it("returns null for null header", () => {
    expect(parseNextLink(null)).toBeNull();
  });

  it("handles a header with only next rel", () => {
    const header = `<https://example.instructure.com/api/v1/courses?page=2>; rel="next"`;
    expect(parseNextLink(header)).toBe("https://example.instructure.com/api/v1/courses?page=2");
  });
});

describe("CanvasApi.getTodo", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns ok result with data on success", async () => {
    const mockItems = [{ type: "submitting", assignment: { id: 1, name: "Essay", due_at: null, points_possible: 100, course_id: 10, html_url: "/assignments/1", submission_types: ["online_text_entry"], has_submitted_submissions: false }, ignore: "", ignore_permanently: "", html_url: "/assignments/1", needs_grading_count: null, context_type: "Course", course_id: 10, group_id: null }];

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => mockItems,
      headers: { get: () => null },
    } as unknown as Response);

    const result = await CanvasApi.getTodo();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(mockItems);
    }
  });

  it("returns error result on non-ok HTTP response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({}),
      headers: { get: () => null },
    } as unknown as Response);

    const result = await CanvasApi.getTodo();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("401");
    }
  });

  it("returns error result on network failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    const result = await CanvasApi.getTodo();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Network error");
    }
  });
});

describe("CanvasApi.getCourses (paginated)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches all pages by following Link headers", async () => {
    const page1 = [{ id: 1, name: "Calculus", course_code: "MATH101", workflow_state: "available", enrollment_state: "active" }];
    const page2 = [{ id: 2, name: "Physics", course_code: "PHYS101", workflow_state: "available", enrollment_state: "active" }];

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => page1,
        headers: { get: (name: string) => name === "Link" ? `<https://canvas.tamu.edu/api/v1/courses?page=2>; rel="next"` : null },
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => page2,
        headers: { get: () => null },
      } as unknown as Response);

    const result = await CanvasApi.getCourses();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.name).toBe("Calculus");
      expect(result.data[1]?.name).toBe("Physics");
    }
  });

  it("returns error when a page request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
      headers: { get: () => null },
    } as unknown as Response);

    const result = await CanvasApi.getCourses();
    expect(result.ok).toBe(false);
  });
});
