---
status: in_progress
---
# Adopt `web-ui-kit` + WASM Bridge (Write Mode)

## Description
This repo has no UI yet beyond a placeholder (`src/main.ts` just writes a version string) — the ideal moment to adopt the org's shared design system (`web-ui-kit`: layout shell, form/input components, canvas/viewport controls, design tokens) before building any real screen, rather than retrofitting it later (see roadmap `.vibe/decisions/011`). Alongside that, build the internal bridge module that loads the `stage` WASM build client-side and exposes its **write** surface — load a stage into an editable in-memory representation, apply edits, and produce serialized `.def` output — as a typed TypeScript API, mirroring the "inject external effects, return a typed result instead of throwing" shape `character-viewer-web`'s own WASM bridge established. This is the write-mode counterpart of what a read-only viewer's bridge would need, and every later editing feature in this repo depends on it.

## Acceptance Criteria
- [ ] `web-ui-kit` added as a dependency, its layout shell used as this app's root frame
- [ ] Design tokens (color/spacing/typography) applied instead of any ad-hoc CSS
- [ ] The WASM bridge loads `stage.wasm` + `wasm_exec.js` client-side and exposes a typed load/edit/serialize API
- [ ] A malformed or unreadable WASM module (e.g. wrong version, load failure) surfaces a typed error result instead of throwing or hanging
- [ ] No existing functionality (version display) regresses

## Notes
Cross-repo blocker: this item depends on `stage`'s own WASM entrypoint item being released — `stage`'s `.vibe/backlog/006-wasm-entrypoint-and-release-pipeline.md`, currently `status: todo`. The bridge's write surface additionally needs `stage`'s serialize support (`stage`'s `.vibe/backlog/003-serialize-stage-def.md`) implemented and exposed through that WASM entrypoint before this item can be completed end-to-end.
