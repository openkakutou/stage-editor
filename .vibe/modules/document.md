# Module: document
**Role:** Holds the currently loaded stage in memory (file name, parsed `StageData`, original `.def` bytes, resolved sprite sheet name/bytes) — the single place editor screens read from and write back to. A plain module-level get/set pair, no persistence; `set` always fully replaces the previous document, with no confirmation of its own. Also tracks whether the loaded stage has unsaved edits, as a JSON snapshot-diff against whatever state was last known clean — an actual value change, not just "some `onChange` fired" — leaving the discard-confirmation decision itself to the caller.
**Files:** `src/document/stage-document-store.ts`
**Exports:** `getStageDocument(): StageDocument | null`, `setStageDocument(doc: StageDocument | null): void`, `markStageDocumentSaved(): void`, `hasUnsavedStageChanges(): boolean`, `resetStageDocumentForTests(): void`, `StageDocument`
**Depends on:** `modules/wasm.md` (for the `StageData` type)
