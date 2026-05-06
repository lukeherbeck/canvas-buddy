import { describe, expect, it } from "vitest";
import { mountTodoPanel, unmountTodoPanel } from "../src/content/features/todo-panel";

describe("mountTodoPanel", () => {
  it("removes an existing DOM host before mounting a fresh panel", () => {
    const staleHost = document.createElement("div");
    staleHost.id = "canvasbuddy-todo-host";
    staleHost.dataset["stale"] = "true";
    document.body.appendChild(staleHost);

    mountTodoPanel();

    const hosts = document.querySelectorAll("#canvasbuddy-todo-host");
    expect(hosts).toHaveLength(1);
    expect((hosts[0] as HTMLElement | undefined)?.dataset["stale"]).toBeUndefined();

    unmountTodoPanel();
  });
});
