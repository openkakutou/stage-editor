# Module: wizard
**Role:** The New Stage Wizard (backlog item 005) — an alternative entry point to the folder input. Pure builders for a blank stage and a small set of named starter templates (each pre-populated with example BG elements using the "not yet assigned" sprite sentinel, never a fabricated reference), plus the DOM component that renders "Blank Stage" + template buttons, gated by an unsaved-changes confirmation before replacing the current document.
**Files:** `src/wizard/new-stage-defaults.ts`, `src/wizard/new-stage-wizard.ts`
**Exports:** `createBlankStage(): StageData`, `STAGE_TEMPLATES: readonly StageTemplate[]`, `StageTemplate`, `renderNewStageWizard(root: HTMLElement, options: NewStageWizardOptions): void`, `NewStageWizardOptions`
**Depends on:** `modules/wasm.md` (for the `StageData`/`BGElement` types), `modules/document.md` (for `StageDocument` and `hasUnsavedStageChanges`)
