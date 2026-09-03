# Module: app
**Role:** Application entry point — builds the app's `web-ui-kit` root frame (toolbar + the stage file input, the New Stage Wizard, characteristics editor, BG element editor, 3D model editor, and Save/Export button as main content) and mounts it into the DOM. A loaded file and a wizard-created stage both funnel through the same `mountDocument` wiring, so the editors appear identically regardless of entry point; a wizard-driven creation additionally moves focus into the characteristics editor. Owns a `Set<BGElement>` for the BG element editor's batch selection (item 007), persisted across re-renders the same way `expandedRows` already is.
**Files:** `src/main.ts`, `src/version.ts`, `src/style.css`
**Exports:** `renderApp(root: HTMLElement, version: string, options?: RenderAppOptions): void`, `appVersion: string`
**Depends on:** `modules/input.md`, `modules/wizard.md`, `modules/document.md`, `modules/editor.md`, `modules/sff-wasm.md`
