---
date: 2026-09-13
status: accepted
---
# Visual regression: reused fixture, wizard-driven scenario, real-runner-only baselines

**Context:** Backlog item 011 asks for Playwright screenshot-comparison
baselines of the 3D model editor's live preview: a freshly-assigned model
at default placement, and after a committed Offset/Scale/Camera field
edit. The sibling `stage-viewer-web` repo already shipped an equivalent,
done item (`011-visual-regression-tests`) covering the same underlying
`three`-rendered preview (this app's write-mode `model-editor.ts` mounts
the exact same `model-preview.ts` module, adapted per `.vibe/decisions/004`
to also expose an update handle) against a real, vendored, MIT-licensed
`.glb` (`cvs2london`). Two experts were consulted before implementation
(operations/CI, real-time rendering); their input is folded in below.

**Decision:**
- **Reuse `stage-viewer-web`'s exact `cvs2london.glb` fixture** (same org,
  already-cleared MIT license) rather than sourcing a second binary model
  fixture for the same purpose. No `.hdr` lighting file is assigned in
  either test — matches this app's own accepted default (`.vibe/decisions/004`)
  that Offset/Scale/Environment-Intensity work correctly with no
  environment map, and keeps the scenario to exactly what the acceptance
  criteria names.
- **The loading path is the New Stage Wizard's "Blank Stage" button**, not
  a folder upload — this app (unlike `stage-viewer-web`) can create a
  stage document with no file at all, and the model editor only needs a
  `StageData` object plus a directly-assigned model file through its own
  `wuik-file-drop-zone`, so the folder-picker flow `stage-viewer-web`'s
  test drives is unnecessary machinery here.
- **One committed field edit (Offset X) is exercised for the second
  baseline**, not all three field groups named in the acceptance criteria
  ("Offset/Scale/Camera") — the acceptance criteria's own wording allows
  any one, and `model-editor.ts`'s `buildNumericField` routes every one of
  those fields through the exact same `updateTransform`/`updateCamera`
  commit path (`.vibe/decisions/004`, point 1), so one representative field
  proves the in-place-mutation contract without three near-duplicate specs.
- **No explicit "model finished rendering" signal is added to production
  code.** The real-time-rendering consultation raised this as a risk (an
  empty canvas could look "stable" to Playwright's own screenshot
  stabilization and become a false baseline); `stage-viewer-web`'s own
  already-shipped, already-CI-validated identical scenario proves this
  isn't a problem in practice for this exact stack: `toHaveScreenshot`
  polls for *consecutive matching frames*, so a canvas that changes once
  from blank to loaded-and-static, then stops changing (render-on-demand,
  no continuous `requestAnimationFrame` loop — confirmed absent in both
  `model-preview.ts` and `web-ui-kit`'s `viewport-3d.ts`/`orbit-camera.ts`),
  converges on the *post-load* frame, not a premature blank one. Adding a
  bespoke readiness hook here would be unvalidated extra surface for a risk
  the sibling implementation already disproves.
- **`@playwright/test` is pinned to the exact version already used
  org-wide (`1.62.1`, matching `web-ui-kit`'s own exact pin)**, not a caret
  range — per the operations consultation, this keeps the Playwright
  browser-cache key (hashed from `package-lock.json`) meaningful and
  reproducible rather than silently drifting to a newer minor release.
- **No explicit `--use-gl=swiftshader` launch flag.** Considered per the
  operations consultation, but no sibling repo (including `stage-viewer-web`'s
  own already-working `cvs2london-model.png` baseline, generated and
  gated on the same pinned `ubuntu-24.04` runner with no such flag) needs
  one — headless Chromium's own default software rasterizer on that image
  is already what every existing 3D-canvas baseline in this org relies on.
  Introducing an unproven flag would be speculative, not a fix for an
  observed problem.
- **Baselines are only ever trusted once confirmed green on this repo's
  own real `ubuntu-24.04` GitHub Actions runner** (`deploy-pages.yml`'s
  `build` job, now carrying the new visual step) — a local/sandbox
  Chromium run here is a first-pass sanity check of the test's own logic
  (selectors, flow, commit timing) only, per `web-ui-kit`'s own
  `.vibe/decisions/015` precedent that a local render is never assumed to
  match the real runner's fontconfig/GL stack byte-for-byte.
- **CI wiring mirrors `stage-viewer-web`'s own already-accepted shape**
  (`.vibe/decisions/009` there): folded into the existing single `build`
  job (Playwright browser cache keyed on `package-lock.json`, install,
  `Visual regression tests` step after `Build`, diff artifact uploaded on
  failure), `runs-on` pinned from `ubuntu-latest` to `ubuntu-24.04`, no
  bypass — a failing visual check blocks `deploy` exactly like a failing
  `Test`/`Lint`/`Build` step already does.

**Reason:** Every choice above either reuses an already-validated,
already-shipped precedent in this exact org for this exact rendering stack
(the sibling `stage-viewer-web` 3D model preview test, `web-ui-kit`'s
CI-gating/runner-pinning/exact-Playwright-pin conventions), or is a direct,
named requirement from one of the two plan-time expert consultations.
Nothing here is speculative hardening for a risk with no concrete evidence
behind it in this codebase.

**Rejected alternatives:**
- **A second, newly-sourced `.glb`/`.hdr` fixture pair** — rejected: no
  concrete need beyond what the already-cleared, already-vendored sibling
  fixture already satisfies; a second binary asset for the same purpose is
  needless duplication.
- **Driving the scenario through a real folder upload** (mirroring
  `stage-viewer-web`'s own test structure exactly) — rejected: this app's
  New Stage Wizard is the simpler, equally-real path to a loaded
  `StageData`, and the model editor's own file assignment doesn't need a
  full stage folder at all.
- **A production "render complete" readiness hook/event on `model-preview.ts`**
  — rejected for now: the identical scenario already works without one in
  the sibling repo; add one later, with its own test coverage, only if a
  real flake is observed here that this reasoning doesn't predict.
- **Explicit software-GL launch flags** — rejected as unproven for this
  org's stack; the existing 3D-canvas precedent didn't need them.
