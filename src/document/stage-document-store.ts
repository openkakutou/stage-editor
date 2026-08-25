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
// confirmation — nothing is editable yet in this item (no editing screen
// exists), so there's no unsaved state a silent replace could lose; once
// item 003 makes real edits possible, a discard-changes guard belongs at
// the call site that triggers a new load, not here.
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

/** The currently loaded stage, or `null` before any folder loads successfully. */
export function getStageDocument(): StageDocument | null {
  return current;
}

/** Replaces the currently loaded stage document. Pass `null` to clear it. */
export function setStageDocument(doc: StageDocument | null): void {
  current = doc;
}

/** Resets the in-memory document to its initial (unloaded) state. Test-only. */
export function resetStageDocumentForTests(): void {
  current = null;
}
