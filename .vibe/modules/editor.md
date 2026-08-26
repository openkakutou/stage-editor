# Module: editor
**Role:** The two editing screens (backlog item 003). `characteristics-editor.ts` edits a loaded stage's name, author, camera bounds, and stage boundaries. `elements-editor.ts` lists, adds, edits, and removes the stage's BG elements, one collapsed row each. Both mutate the given `StageData` object in place — no patch object, no re-parse round trip.
**Files:** `src/editor/characteristics-editor.ts`, `src/editor/elements-editor.ts`
**Exports:** `renderCharacteristicsEditor(root: HTMLElement, stage: StageData, options?: CharacteristicsEditorOptions): void`, `CharacteristicsEditorOptions`, `renderElementsEditor(root: HTMLElement, stage: StageData | null, spriteGroups: SpriteGroup[] | null, options?: ElementsEditorOptions): void`, `ElementsEditorOptions`
**Depends on:** `modules/wasm.md` (for `StageData`/`BGElement`), `modules/sff-wasm.md` (for `SpriteGroup`, sprite reference validation)
