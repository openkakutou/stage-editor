// The shared undo/redo history for this app's editing operations (backlog
// item 008), wired through `web-ui-kit`'s own `CommandStack` primitive
// rather than a bespoke local implementation. A single module-level
// instance -- same "plain get/set-shaped singleton with a test-only reset"
// pattern as `stage-document-store.ts` -- since every screen that can push
// an undoable edit (the characteristics editor, the BG element editor,
// including its batch multi-select apply) shares one history, not one per
// screen. Ported from `lifebar-editor`'s own identical
// `src/document/command-stack-store.ts`.
//
// Cleared on every document load/create (see main.ts) rather than kept
// across a document swap -- see
// .vibe/decisions/006-undo-redo-scoped-to-current-document-shortcut-deferred.md.
import { CommandStack } from "@openkakutou/web-ui-kit";

export const commandStack = new CommandStack();

/** Empties the shared undo/redo history. Test-only. */
export function resetCommandStackForTests(): void {
  commandStack.clear();
}
