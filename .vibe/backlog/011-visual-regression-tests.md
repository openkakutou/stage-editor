---
status: todo
---
# Visual Regression Tests

## Description
Add automated Playwright screenshot-comparison tests covering this app's real rendered surface — today, that's the 3D model editor's live `three`-rendered preview (`.vibe/decisions/004`), the only pixel-level rendering this app currently has (the 2D BG element editor is a form/list, with no composited canvas preview of its own — see the session note below). See roadmap decision `024-visual-regression-testing-via-playwright-screenshots.md` for the shared approach.

## Acceptance Criteria
- [ ] The app's Playwright config extends `web-ui-kit`'s shared visual-testing config/fixture
- [ ] Baseline screenshots exist for the 3D model editor's preview: a freshly-assigned model at its default placement, and after a committed Offset/Scale/Camera field edit (confirming the in-place scene mutation, not just the initial mount, renders correctly)
- [ ] `npm run test:visual` runs these in CI as its own job, separate from `npm test`, and fails the build on a diff
- [ ] A real, deliberate rendering regression (verified by temporarily breaking the covered path, then reverting) is caught by this suite

## Notes
Depends on `web-ui-kit` backlog item `013-visual-regression-shared-playwright-config-and-component-snapshots` landing first. If/when a composited 2D BG preview is added to this repo (raised, not yet added, as a possible follow-up to a `stage-viewer-web`-style renderer — see this session's earlier discussion), extend this item's coverage to it rather than opening a second visual-regression item.
