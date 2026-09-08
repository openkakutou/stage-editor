// The "Keyboard Shortcuts" section (backlog item 009): a collapsible panel,
// mirroring elements-editor.ts's own section toggle pattern, wrapping
// `web-ui-kit`'s shared `<wuik-shortcuts-panel>` -- the only UI this app
// gives a user to see and rebind its shortcuts, so it needs no more than
// that component itself (fully token-styled, no bespoke CSS needed here).
// Ported from `lifebar-editor`'s own identical
// `src/shortcuts/shortcuts-panel-section.ts`.
//
// Starts expanded, unlike this app's other collapsible sections (each BG
// element row starts collapsed): this is the sole place a brand-new,
// otherwise invisible capability can be discovered. See
// .vibe/decisions/007-remappable-shortcuts-actions-and-batch-delete-design.md.
import type {
  ShortcutManager,
  WuikShortcutsPanelElement,
} from "@openkakutou/web-ui-kit";

export interface ShortcutsPanelSectionOptions {
  /** @default true -- see this module's top comment. */
  expanded?: boolean;
}

/**
 * Renders the section and returns the mounted `<wuik-shortcuts-panel>`
 * element itself. `<wuik-shortcuts-panel>`'s own `set manager` unsubscribes
 * from whatever manager it previously held, but only when a *new* value is
 * set on that *same instance* -- it has no `disconnectedCallback` cleanup of
 * its own. A caller that may discard this element later (a re-render
 * upstream replacing `root`'s own ancestor, as `main.ts` does) must set the
 * returned element's `.manager` back to `undefined` first, the same
 * "unbind before discarding" contract `shortcut-label.ts`'s own return value
 * gives its callers -- otherwise the manager keeps the orphaned element
 * reachable, and keeps calling into it, for the rest of the page's life.
 */
export function renderShortcutsPanelSection(
  root: HTMLElement,
  manager: ShortcutManager,
  options: ShortcutsPanelSectionOptions = {},
): WuikShortcutsPanelElement {
  root.replaceChildren();

  const panel = document.createElement("wuik-panel");
  panel.className = "shortcuts-panel-section";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "shortcuts-panel-section__toggle";
  const expanded = options.expanded ?? true;
  toggle.setAttribute("aria-expanded", String(expanded));

  const label = document.createElement("span");
  label.textContent = "Keyboard Shortcuts";
  toggle.appendChild(label);

  const body = document.createElement("div");
  body.className = "shortcuts-panel-section__body";
  body.hidden = !expanded;

  // No ambient `HTMLElementTagNameMap` entry exists for this custom element
  // (see src/types/web-ui-kit.d.ts) -- cast explicitly to set its `.manager`
  // JS property, the same "as unknown as" shape `wasm/bridge.ts` uses.
  const shortcutsPanel = document.createElement(
    "wuik-shortcuts-panel",
  ) as unknown as WuikShortcutsPanelElement;
  shortcutsPanel.manager = manager;
  body.appendChild(shortcutsPanel);

  toggle.addEventListener("click", () => {
    const nowExpanded = body.hidden;
    body.hidden = !nowExpanded;
    toggle.setAttribute("aria-expanded", String(nowExpanded));
  });

  panel.append(toggle, body);
  root.appendChild(panel);

  return shortcutsPanel;
}
