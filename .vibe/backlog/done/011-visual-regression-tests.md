---
status: done
---
# Visual Regression Tests

## Description
Add automated Playwright screenshot-comparison tests covering this app's real rendered surface — today, that's the 3D model editor's live `three`-rendered preview (`.vibe/decisions/004`), the only pixel-level rendering this app currently has (the 2D BG element editor is a form/list, with no composited canvas preview of its own — see the session note below). See roadmap decision `024-visual-regression-testing-via-playwright-screenshots.md` for the shared approach.

## Acceptance Criteria
- [x] The app's Playwright config extends `web-ui-kit`'s shared visual-testing config/fixture
- [x] Baseline screenshots exist for the 3D model editor's preview: a freshly-assigned model at its default placement, and after a committed Offset/Scale/Camera field edit (confirming the in-place scene mutation, not just the initial mount, renders correctly)
- [x] `npm run test:visual` runs these in CI as its own job, separate from `npm test`, and fails the build on a diff
- [x] A real, deliberate rendering regression (verified by temporarily breaking the covered path, then reverting) is caught by this suite

## Notes
Depends on `web-ui-kit` backlog item `013-visual-regression-shared-playwright-config-and-component-snapshots` landing first. If/when a composited 2D BG preview is added to this repo (raised, not yet added, as a possible follow-up to a `stage-viewer-web`-style renderer — see this session's earlier discussion), extend this item's coverage to it rather than opening a second visual-regression item.

## Resolution (2026-09-13)
The prior session's committed baselines were invalid: direct visual inspection showed a fully blank canvas (only UI chrome, no rendered model). Root cause, confirmed by instrumenting the real render path under Playwright: a brand-new blank stage's `Model.scaleX/Y/Z` all default to `0`, and `resolveModelTransform` passed them straight through with no fallback — a `0×0×0` three.js scale collapses a freshly-assigned model to an invisible point. Fixed by giving `resolveModelTransform` the same zero-value fallback its sibling `resolveCameraParams` already applies to `fov`/`near`/`far` (`.vibe/decisions/010`), covered by new `model-camera.test.ts` cases. Both baselines were regenerated and now show real rendered model content. The regression-catching acceptance criterion was verified directly: reverting the fix and re-running `test:visual` against the corrected baselines reproduces an ~85% pixel diff and fails the suite, confirming both that the original bug was real and that these baselines catch its reintroduction.
