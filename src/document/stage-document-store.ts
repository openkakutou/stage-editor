// The in-memory representation of the currently loaded stage: the
// WASM-parsed `StageData`, the file name it came from, and both the
// original `.def` bytes and the resolved sprite sheet's bytes — the single
// place later editor screens (the characteristics/BG element editor, item
// 003; save/export, item 004) read from and, once item 003 lands, write
// back to. Mirrors `lifebar-editor`'s own `lifebar-document-store.ts`
// shape exactly for the same kind of in-process, no-external-effect state.
//
// A plain module-level variable, not a class or an injected dependency:
// this is in-process application state with nothing to substitute in
// tests, so a get/set pair with a test-only reset is the simplest thing
// that works. `set` always fully replaces the previous document, with no
// confirmation — this store only tracks *whether* the loaded stage has
// unsaved edits (`hasUnsavedStageChanges`, backlog item 005), it never
// decides what to do about that; the discard-changes confirmation prompt
// belongs at the call site that triggers a new load or a new-stage
// creation, not here.
import type { StageData } from "../wasm/types.ts";

export interface StageDocument {
  fileName: string;
  relativePath: string;
  stage: StageData;
  defBytes: Uint8Array;
  sffFileName: string;
  sffRelativePath: string;
  sffBytes: Uint8Array;
}

let current: StageDocument | null = null;
// A snapshot of `current.stage`, taken whenever it was last known "clean"
// (just loaded, just created by the New Stage Wizard, or just saved) — see
// backlog item 005 and
// .vibe/decisions/003-new-stage-defaults-and-unsaved-changes-guard.md.
// Comparing against a snapshot (rather than a boolean flipped by editor
// `onChange` callbacks) means only an actual value difference counts as
// "unsaved" — a no-op edit, or one reverted back to its original value,
// never flags the document dirty.
let cleanSnapshot: string | null = null;

/** The currently loaded stage, or `null` before any folder loads successfully. */
export function getStageDocument(): StageDocument | null {
  return current;
}

/** Replaces the currently loaded stage document. Pass `null` to clear it. */
export function setStageDocument(doc: StageDocument | null): void {
  current = doc;
  cleanSnapshot = doc ? JSON.stringify(doc.stage) : null;
}

/**
 * Records the currently loaded stage's present state as "saved" — call
 * after a successful save/export so `hasUnsavedStageChanges` reports clean
 * again, without needing to reload or replace the document.
 */
export function markStageDocumentSaved(): void {
  cleanSnapshot = current ? JSON.stringify(current.stage) : null;
}

/**
 * Whether the currently loaded stage has been edited since it was last
 * loaded, created, or saved. `false` when nothing is loaded — there is
 * nothing to lose by starting fresh.
 */
export function hasUnsavedStageChanges(): boolean {
  if (current === null) return false;
  return JSON.stringify(current.stage) !== cleanSnapshot;
}

/** Resets the in-memory document to its initial (unloaded) state. Test-only. */
export function resetStageDocumentForTests(): void {
  current = null;
  cleanSnapshot = null;
}
