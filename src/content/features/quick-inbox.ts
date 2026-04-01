import quickInboxCss from "../../styles/quick-inbox.css?inline";
import { waitForElement } from "../utils/dom";
import { CanvasApi } from "../canvas-api";

const HOST_ID = "canvasbuddy-inbox-host";
let inboxHost: HTMLElement | null = null;
let dropdownOpen = false;

export function mountQuickInbox(): void {
  if (inboxHost !== null) return;
  void injectInboxButton();
}

export function unmountQuickInbox(): void {
  inboxHost?.remove();
  inboxHost = null;
  dropdownOpen = false;
}

async function injectInboxButton(): Promise<void> {
  const nav = await waitForElement("#header .ic-app-header__menu-list, #header nav, .ic-app-header__secondary");

  inboxHost = document.createElement("div");
  inboxHost.id = HOST_ID;

  const shadow = inboxHost.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = quickInboxCss;
  shadow.appendChild(style);

  const trigger = document.createElement("button");
  trigger.className = "cb-inbox-trigger";
  trigger.title = "Quick Inbox";
  trigger.textContent = "[inbox]";

  const badge = document.createElement("span");
  badge.className = "cb-inbox-badge";
  trigger.appendChild(badge);
  shadow.appendChild(trigger);

  nav.appendChild(inboxHost);

  let dropdown: HTMLElement | null = null;

  trigger.addEventListener("click", () => {
    if (dropdownOpen) {
      closeDropdown();
    } else {
      openDropdown(badge);
    }
  });

  document.addEventListener("click", (e) => {
    if (dropdownOpen && !inboxHost?.contains(e.target as Node)) {
      closeDropdown();
    }
  });

  function closeDropdown(): void {
    dropdown?.remove();
    dropdown = null;
    dropdownOpen = false;
  }

  function openDropdown(badgeEl: HTMLElement): void {
    if (dropdown !== null) return;
    dropdownOpen = true;

    dropdown = document.createElement("div");
    dropdown.className = "cb-inbox-dropdown";

    const header = document.createElement("div");
    header.className = "cb-inbox-header";
    header.textContent = "Inbox";
    dropdown.appendChild(header);

    const loading = document.createElement("div");
    loading.className = "cb-inbox-loading";
    loading.textContent = "Loading messages...";
    dropdown.appendChild(loading);

    const footer = document.createElement("div");
    footer.className = "cb-inbox-footer";
    const footerLink = document.createElement("a");
    footerLink.href = "/conversations";
    footerLink.textContent = "Open full inbox";
    footer.appendChild(footerLink);
    dropdown.appendChild(footer);

    document.body.appendChild(dropdown);

    CanvasApi.getConversations().then((result) => {
      loading.remove();

      if (!result.ok) {
        const err = document.createElement("div");
        err.className = "cb-inbox-empty";
        err.textContent = "Could not load messages";
        footer.insertAdjacentElement("beforebegin", err);
        return;
      }

      const conversations = result.data;
      const unreadCount = conversations.filter((c) => c.workflow_state === "unread").length;
      badgeEl.classList.toggle("cb-inbox-badge cb-visible", unreadCount > 0);

      if (conversations.length === 0) {
        const empty = document.createElement("div");
        empty.className = "cb-inbox-empty";
        empty.textContent = "No messages";
        footer.insertAdjacentElement("beforebegin", empty);
        return;
      }

      for (const conv of conversations.slice(0, 8)) {
        const item = document.createElement("a");
        item.className = "cb-inbox-item";
        item.href = `/conversations/${conv.id}`;
        item.target = "_blank";
        item.rel = "noopener";

        const subject = document.createElement("div");
        subject.className = "cb-inbox-subject" + (conv.workflow_state === "unread" ? " cb-unread" : "");
        subject.textContent = conv.subject || "(no subject)";
        item.appendChild(subject);

        const preview = document.createElement("div");
        preview.className = "cb-inbox-preview";
        preview.textContent = conv.last_message;
        item.appendChild(preview);

        const sender = conv.participants[0];
        if (sender !== undefined) {
          const meta = document.createElement("div");
          meta.className = "cb-inbox-meta";
          meta.textContent = sender.name;
          item.appendChild(meta);
        }

        footer.insertAdjacentElement("beforebegin", item);
      }
    }).catch(console.error);
  }
}
