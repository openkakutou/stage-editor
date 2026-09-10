// Undo/Redo toolbar controls (backlog item 008): the explicit UI path to
// the shared command stack -- the shortcut-manager path is deferred until
// this app adopts one (item 009), see
// .vibe/decisions/006-undo-redo-scoped-to-current-document-shortcut-deferred.md.
// A thin view over `CommandStack`'s own `canUndo`/`canRedo`/`undo`/`redo`:
// this module owns no history of its own. Ported from `lifebar-editor`'s
// own identical `src/editor/undo-redo-controls.ts`.
import type { CommandStack } from "@openkakutou/web-ui-kit";
import { commandStack as defaultCommandStack } from "../document/command-stack-store.ts";
import { t } from "../i18n/i18n.ts";

export interface UndoRedoControlsOptions {
  /** The history to control. Defaults to this app's shared instance; injectable for testing. */
  commandStack?: CommandStack;
}

export interface UndoRedoControlsHandle {
  /**
   * Re-reads the stack's current `canUndo`/`canRedo` and updates each
   * control's disabled state accordingly. A caller that pushes a command
   * onto the shared stack from elsewhere (e.g. an editor screen's own edit
   * commands) must call this afterwards -- the stack itself has no change
   * event to subscribe to.
   */
  refresh(): void;
  /** Runs the exact same undo the button's own click handler runs -- for a caller that needs to trigger it from outside a click, e.g. a future keyboard shortcut dispatcher (backlog item 009). */
  undo(): void;
  /** Runs the exact same redo the button's own click handler runs. See `undo()`. */
  redo(): void;
  /** The rendered buttons, for a caller that needs to reflect a live shortcut binding on them later (backlog item 009). */
  undoButton: HTMLElement;
  redoButton: HTMLElement;
}

/**
 * Renders Undo/Redo controls into `root`, replacing its previous content.
 * Each control's own disabled state is the acceptance criteria's "undo/redo
 * state visibly reflected in the UI" -- there is no separate status text.
 */
export function renderUndoRedoControls(
  root: HTMLElement,
  options: UndoRedoControlsOptions = {},
): UndoRedoControlsHandle {
  root.replaceChildren();

  const stack = options.commandStack ?? defaultCommandStack;

  const undoButton = document.createElement("wuik-button");
  undoButton.setAttribute("variant", "secondary");
  undoButton.dataset.action = "undo";
  undoButton.textContent = t("actions.undo", "Undo");

  const redoButton = document.createElement("wuik-button");
  redoButton.setAttribute("variant", "secondary");
  redoButton.dataset.action = "redo";
  redoButton.textContent = t("actions.redo", "Redo");

  function refresh(): void {
    undoButton.toggleAttribute("disabled", !stack.canUndo);
    redoButton.toggleAttribute("disabled", !stack.canRedo);
  }

  function undo(): void {
    stack.undo();
    refresh();
  }

  function redo(): void {
    stack.redo();
    refresh();
  }

  undoButton.addEventListener("click", undo);
  redoButton.addEventListener("click", redo);

  refresh();
  root.append(undoButton, redoButton);

  return { refresh, undo, redo, undoButton, redoButton };
}
