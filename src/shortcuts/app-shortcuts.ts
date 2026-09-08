// This app's keyboard shortcuts (backlog item 009): registers its five
// user-triggerable actions -- Save/Export, Undo, Redo, Add BG Element,
// Delete Selection -- with `web-ui-kit`'s shared, headless
// `ShortcutManager` instead of hardcoding key handlers, and dispatches a
// real `keydown` event to whichever action currently owns its combo. Ported
// from `lifebar-editor`'s own `src/shortcuts/app-shortcuts.ts`, extended
// with the two actions that repo didn't have yet (Add BG Element, Delete
// Selection — see .vibe/decisions/007-remappable-shortcuts-actions-and-batch-delete-design.md).
//
// `ShortcutManager` itself only tracks bindings; it does not listen for
// `keydown` or normalize a `KeyboardEvent` into a combo string -- that glue
// lives in `web-ui-kit`'s own (unexported) `shortcut-key.ts`, used
// internally by its `<wuik-shortcuts-panel>`. Since it isn't part of that
// package's public API, `normalizeKeyCombo` below is a local port of the
// same rule (modifier order Ctrl, Meta, Alt, Shift; a single-character key
// uppercased) so a live keypress matches the exact combo strings the manager
// stores.
import type { ShortcutAction, ShortcutManager } from "@openkakutou/web-ui-kit";

export const APP_SHORTCUT_ACTIONS: readonly ShortcutAction[] = [
  { id: "save-export", label: "Save / Export", defaultKey: "Ctrl+S" },
  { id: "undo", label: "Undo", defaultKey: "Ctrl+Z" },
  { id: "redo", label: "Redo", defaultKey: "Ctrl+Y" },
  { id: "add-element", label: "Add BG Element", defaultKey: "Ctrl+Shift+A" },
  {
    id: "delete-selection",
    label: "Delete Selection",
    defaultKey: "Delete",
  },
];

export interface AppShortcutHandlers {
  onSaveExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddElement: () => void;
  onDeleteSelection: () => void;
}

/** Registers every one of this app's actions on `manager` with its default binding. */
export function registerAppShortcuts(manager: ShortcutManager): void {
  for (const action of APP_SHORTCUT_ACTIONS) {
    manager.register(action);
  }
}

/**
 * Text-entry types an `<input>` can have where a keystroke edits real text
 * in place -- deliberately excludes `checkbox`/`radio`/`button`/`submit`/
 * `range`/`color`/`file`/etc., whose own native keyboard behavior a
 * shortcut like Delete never conflicts with. Absent `type` (or `type=""`)
 * defaults to `"text"` per the HTML spec, so it's included here too.
 */
const TEXT_ENTRY_INPUT_TYPES = new Set([
  "text",
  "number",
  "email",
  "url",
  "tel",
  "password",
  "search",
  "date",
  "datetime-local",
  "month",
  "time",
  "week",
]);

/**
 * True when `target` is an element a keystroke would normally edit text in
 * (a text-entry `<input>`, a `<textarea>`, or a contenteditable region) --
 * used to defer a shortcut whose key the browser's own in-field editing
 * already claims (Undo/Redo/Delete Selection), rather than hijacking it.
 *
 * Deliberately narrower than `lifebar-editor`'s own identical-looking
 * helper, which treats *every* `<input>` as editable regardless of `type`:
 * here, a checkbox input must NOT count as editable, since checking a row's
 * selection checkbox and then pressing Delete is this app's own primary
 * keyboard flow for Delete Selection -- see
 * .vibe/decisions/007-remappable-shortcuts-actions-and-batch-delete-design.md.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.tagName === "TEXTAREA") {
    return true;
  }
  if (target.tagName === "INPUT") {
    const type = (target as HTMLInputElement).type || "text";
    return TEXT_ENTRY_INPUT_TYPES.has(type);
  }
  // `Element.isContentEditable` is unimplemented in this project's pinned
  // jsdom (always `undefined`, even with the attribute set) -- the same
  // real-browser/jsdom parity gap already documented elsewhere in this app
  // (see `FileReader`/`Blob` notes in `.vibe/index.md`). Checking the
  // attribute directly (inheriting through ancestors via `closest`, since
  // contenteditable is an inherited state) works identically in both, so
  // it's used instead of the property getter.
  return (
    target.closest('[contenteditable]:not([contenteditable="false"])') !== null
  );
}

const MODIFIER_KEY_NAMES = new Set(["Shift", "Control", "Alt", "Meta"]);

interface ComboSourceEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** See this module's top comment for why this mirrors, rather than imports, `web-ui-kit`'s own normalization. */
function normalizeKeyCombo(event: ComboSourceEvent): string | undefined {
  if (MODIFIER_KEY_NAMES.has(event.key)) {
    return undefined;
  }

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.metaKey) parts.push("Meta");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(key);
  return parts.join("+");
}

/** Finds which registered action (if any) currently owns the combo `event` represents -- the *live* binding, default or user-rebound. */
export function resolveAppShortcutActionId(
  manager: ShortcutManager,
  event: ComboSourceEvent,
): string | undefined {
  const combo = normalizeKeyCombo(event);
  if (combo === undefined) {
    return undefined;
  }
  return manager.list().find((binding) => binding.key === combo)?.id;
}

/**
 * Actions whose shortcut is suppressed while focus is inside a genuine
 * text-entry context (see `isEditableTarget`) -- the browser/OS's own
 * in-field meaning for that key wins instead. Save/Export and Add BG
 * Element are deliberately absent: neither key has a native in-field
 * editing meaning to preserve, so both always fire regardless of focus. See
 * .vibe/decisions/007-remappable-shortcuts-actions-and-batch-delete-design.md.
 */
const DEFERRED_WHILE_EDITING = new Set(["undo", "redo", "delete-selection"]);

/**
 * Dispatches a real `keydown` event to whichever action's current binding
 * matches, calling the matching `handlers` callback and preventing the
 * browser's own default for that key. Returns whether it handled the event,
 * for callers/tests that want to tell a real dispatch apart from a no-op.
 *
 * A no-op when `event` was already `preventDefault()`-ed by something else
 * before reaching here — caught during real-browser runtime verification:
 * `<wuik-shortcuts-panel>`'s own rebind-capture calls `preventDefault()` on
 * every key it captures but never `stopPropagation()`, so the very keydown
 * that just rebinds an action to a new key also bubbles all the way to
 * `window` and, without this guard, would immediately re-fire whatever
 * action now owns that key — most dangerous for Delete Selection, which has
 * no confirm step of its own. See
 * .vibe/decisions/007-remappable-shortcuts-actions-and-batch-delete-design.md.
 */
export function handleAppShortcutKeydown(
  event: KeyboardEvent,
  manager: ShortcutManager,
  handlers: AppShortcutHandlers,
): boolean {
  if (event.defaultPrevented) {
    return false;
  }

  const actionId = resolveAppShortcutActionId(manager, event);
  if (actionId === undefined) {
    return false;
  }

  if (DEFERRED_WHILE_EDITING.has(actionId) && isEditableTarget(event.target)) {
    return false;
  }

  switch (actionId) {
    case "save-export":
      event.preventDefault();
      handlers.onSaveExport();
      return true;
    case "undo":
      event.preventDefault();
      handlers.onUndo();
      return true;
    case "redo":
      event.preventDefault();
      handlers.onRedo();
      return true;
    case "add-element":
      event.preventDefault();
      handlers.onAddElement();
      return true;
    case "delete-selection":
      event.preventDefault();
      handlers.onDeleteSelection();
      return true;
    default:
      return false;
  }
}
