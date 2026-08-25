# Module: document
**Role:** Holds the currently loaded stage in memory (file name, parsed `StageData`, original `.def` bytes, resolved sprite sheet name/bytes) — the single place later editor screens read from and write back to. A plain module-level get/set pair, no persistence; loading a new folder always fully replaces the previous document, with no confirmation.
**Files:** `src/document/stage-document-store.ts`
**Exports:** `getStageDocument(): StageDocument | null`, `setStageDocument(doc: StageDocument | null): void`, `resetStageDocumentForTests(): void`, `StageDocument`
**Depends on:** `modules/wasm.md` (for the `StageData` type)
