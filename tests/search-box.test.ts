import { describe, it, expect } from "vitest";
import { rankResults } from "../src/content/features/search-box";
import type { CanvasCourse } from "../src/types/canvas";

function makeCourse(id: number, name: string, code: string): CanvasCourse {
  return { id, name, course_code: code, workflow_state: "available", enrollment_state: "active" };
}

const courses: CanvasCourse[] = [
  makeCourse(1, "Calculus II", "MATH152"),
  makeCourse(2, "Introduction to Physics", "PHYS201"),
  makeCourse(3, "Advanced Calculus", "MATH301"),
  makeCourse(4, "Computer Science Fundamentals", "CSCE121"),
  makeCourse(5, "calculus for engineers", "ENGR201"),
];

describe("rankResults", () => {
  it("returns first 10 results for empty query", () => {
    const result = rankResults("", courses);
    expect(result.length).toBeLessThanOrEqual(10);
    expect(result).toHaveLength(courses.length);
  });

  it("ranks prefix matches before substring matches", () => {
    const result = rankResults("calc", courses);
    expect(result[0]?.name).toBe("Calculus II");
    expect(result[1]?.name).toBe("calculus for engineers");
    const advancedIdx = result.findIndex((c) => c.name === "Advanced Calculus");
    const calcIdx = result.findIndex((c) => c.name === "Calculus II");
    expect(calcIdx).toBeLessThan(advancedIdx);
  });

  it("matches on course code prefix", () => {
    const result = rankResults("MATH", courses);
    expect(result.some((c) => c.course_code === "MATH152")).toBe(true);
    expect(result.some((c) => c.course_code === "MATH301")).toBe(true);
    expect(result.every((c) => c.course_code.startsWith("MATH"))).toBe(true);
  });

  it("is case-insensitive", () => {
    const lower = rankResults("math", courses);
    const upper = rankResults("MATH", courses);
    expect(lower.map((c) => c.id)).toEqual(upper.map((c) => c.id));
  });

  it("returns at most 10 results", () => {
    const many: CanvasCourse[] = Array.from({ length: 20 }, (_, i) =>
      makeCourse(i, `Course ${i}`, `C${i}`)
    );
    const result = rankResults("C", many);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("returns empty array when no matches", () => {
    const result = rankResults("xyzzyqwerty", courses);
    expect(result).toHaveLength(0);
  });

  it("matches substring in name", () => {
    const result = rankResults("physics", courses);
    expect(result.some((c) => c.name === "Introduction to Physics")).toBe(true);
  });
});
