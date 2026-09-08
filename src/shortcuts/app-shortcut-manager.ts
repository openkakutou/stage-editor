// The shared keyboard-shortcut manager for this app's actions (backlog item
// 009), wired through `web-ui-kit`'s own `ShortcutManager` rather than a
// bespoke local registry -- same "plain get/set-shaped singleton" pattern as
// `command-stack-store.ts`. A single module-level instance since every
// caller (the keydown dispatcher in main.ts, the shortcuts panel section,
// each button's own live-label binding) must observe and rebind the exact
// same set of registered actions. Ported from `lifebar-editor`'s own
// identical `src/shortcuts/app-shortcut-manager.ts`.
import { ShortcutManager } from "@openkakutou/web-ui-kit";
import { registerAppShortcuts } from "./app-shortcuts.ts";

// Scoped to this app specifically -- the default key `web-ui-kit`'s
// `ShortcutManager` would otherwise use ("wuik-shortcuts") is shared across
// every consumer on the same origin, which would leak one app's rebinds
// into another's.
const STORAGE_KEY = "stage-editor-shortcuts";

/** Builds a fresh manager with this app's actions registered. Exists mainly so tests can get an isolated instance instead of sharing the module-level singleton below. */
export function createAppShortcutManager(storage?: Storage): ShortcutManager {
  const manager = new ShortcutManager({ storageKey: STORAGE_KEY, storage });
  registerAppShortcuts(manager);
  return manager;
}

export const appShortcutManager = createAppShortcutManager();
