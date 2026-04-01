import searchBoxCss from "../../styles/search-box.css?inline";
import { CanvasApi } from "../canvas-api";
import { debounce } from "../utils/debounce";
import type { CanvasCourse } from "../../types/canvas";

const HOST_ID = "canvasbuddy-search-host";

let searchHost: HTMLElement | null = null;
let cachedCourses: CanvasCourse[] | null = null;

export function rankResults(query: string, courses: readonly CanvasCourse[]): CanvasCourse[] {
  if (query === "") return courses.slice(0, 10);
  const q = query.toLowerCase();
  const prefix: CanvasCourse[] = [];
  const substring: CanvasCourse[] = [];

  for (const course of courses) {
    const name = course.name.toLowerCase();
    const code = course.course_code.toLowerCase();
    if (name.startsWith(q) || code.startsWith(q)) {
      prefix.push(course);
    } else if (name.includes(q) || code.includes(q)) {
      substring.push(course);
    }
  }

  return [...prefix, ...substring].slice(0, 10);
}

export function mountSearchBox(): void {
  document.addEventListener("keydown", handleKeyDown);
}

export function unmountSearchBox(): void {
  document.removeEventListener("keydown", handleKeyDown);
  closeSearch();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.metaKey && e.key === "k") {
    e.preventDefault();
    if (searchHost !== null) {
      closeSearch();
    } else {
      openSearch();
    }
  }
  if (e.key === "Escape" && searchHost !== null) {
    closeSearch();
  }
}

function openSearch(): void {
  if (searchHost !== null) return;

  searchHost = document.createElement("div");
  searchHost.id = HOST_ID;
  Object.assign(searchHost.style, { position: "fixed", inset: "0", zIndex: "1000000", pointerEvents: "none" });

  const shadow = searchHost.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = searchBoxCss;
  shadow.appendChild(style);

  const backdrop = document.createElement("div");
  backdrop.className = "cb-search-backdrop";
  backdrop.style.pointerEvents = "auto";
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeSearch();
  });

  const box = document.createElement("div");
  box.className = "cb-search-box";
  backdrop.appendChild(box);

  const inputRow = document.createElement("div");
  inputRow.className = "cb-search-input-row";

  const icon = document.createElement("span");
  icon.className = "cb-search-icon";
  icon.textContent = "/";
  inputRow.appendChild(icon);

  const input = document.createElement("input");
  input.className = "cb-search-input";
  input.type = "text";
  input.placeholder = "Search courses...";
  inputRow.appendChild(input);

  const hint = document.createElement("span");
  hint.className = "cb-search-hint";
  hint.textContent = "Esc to close";
  inputRow.appendChild(hint);

  box.appendChild(inputRow);

  const results = document.createElement("div");
  results.className = "cb-search-results";
  box.appendChild(results);

  const footer = document.createElement("div");
  footer.className = "cb-search-footer";
  footer.innerHTML = `<span class="cb-key-hint"><span class="cb-key">Enter</span> navigate &nbsp; <span class="cb-key">Esc</span> close</span>`;
  box.appendChild(footer);

  let focusedIndex = 0;
  let currentResults: CanvasCourse[] = [];

  function renderResults(courses: CanvasCourse[]): void {
    currentResults = courses;
    focusedIndex = 0;
    results.innerHTML = "";

    if (courses.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cb-search-empty";
      empty.textContent = "No courses found";
      results.appendChild(empty);
      return;
    }

    for (const [i, course] of courses.entries()) {
      const item = document.createElement("div");
      item.className = "cb-search-result" + (i === 0 ? " cb-focused" : "");
      item.addEventListener("click", () => navigateTo(course));
      item.addEventListener("mouseenter", () => {
        focusedIndex = i;
        updateFocus();
      });

      const name = document.createElement("div");
      name.className = "cb-result-name";
      name.textContent = course.name;
      item.appendChild(name);

      const code = document.createElement("div");
      code.className = "cb-result-code";
      code.textContent = course.course_code;
      item.appendChild(code);

      results.appendChild(item);
    }
  }

  function updateFocus(): void {
    const items = results.querySelectorAll(".cb-search-result");
    items.forEach((item, i) => item.classList.toggle("cb-focused", i === focusedIndex));
    const focused = items[focusedIndex];
    focused?.scrollIntoView({ block: "nearest" });
  }

  function navigateTo(course: CanvasCourse): void {
    window.location.href = `/courses/${course.id}`;
    closeSearch();
  }

  backdrop.addEventListener("keydown", (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, currentResults.length - 1);
      updateFocus();
    } else if (ke.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      updateFocus();
    } else if (ke.key === "Enter") {
      const course = currentResults[focusedIndex];
      if (course !== undefined) navigateTo(course);
    }
  });

  const doSearch = debounce((query: string) => {
    if (cachedCourses === null) return;
    renderResults(rankResults(query, cachedCourses));
  }, 100);

  input.addEventListener("input", () => doSearch(input.value));

  shadow.appendChild(backdrop);
  document.body.appendChild(searchHost);
  input.focus();

  if (cachedCourses !== null) {
    renderResults(rankResults("", cachedCourses));
  } else {
    const loading = document.createElement("div");
    loading.className = "cb-search-empty";
    loading.textContent = "Loading courses...";
    results.appendChild(loading);

    CanvasApi.getCourses().then((result) => {
      if (result.ok) {
        cachedCourses = result.data;
        renderResults(rankResults(input.value, cachedCourses));
      } else {
        loading.textContent = "Could not load courses";
      }
    }).catch(console.error);
  }
}

function closeSearch(): void {
  searchHost?.remove();
  searchHost = null;
}
