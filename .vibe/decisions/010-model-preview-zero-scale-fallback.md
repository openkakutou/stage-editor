---
date: 2026-09-13
status: accepted
---
# 3D model preview: fall back to scale 1 on a degenerate 0/negative `[Model]` scale

**Context:** Backlog item 011's own baseline generation surfaced a real
rendering bug, not a test-harness problem: the 3D model editor's live
preview rendered a fully blank canvas for the exact scenario the item's
acceptance criteria names first — a freshly-assigned model on a brand-new
blank stage. Root cause, confirmed by instrumenting the real render path
under Playwright: `resolveModelTransform` (`model-camera.ts`) passed
`Model.scaleX/Y/Z` straight through with no fallback, and a freshly-created
blank stage's `Model` starts at `scaleX = scaleY = scaleZ = 0`
(`new-stage-defaults.ts`) — a 0×0×0 three.js scale collapses the model to a
single point, which is indistinguishable from "nothing rendered" in any
screenshot. This function was ported verbatim from `stage-viewer-web`'s
own identical, read-only version, which never hits this case: every real
stage `.def` it ever loads already declares an explicit non-zero scale
(confirmed against the vendored `cvs2london.def` fixture: `scale =
0.0141,0.0141,0.0141`), so the gap only exists in this app's own write-mode
"assign a model to a document that never had one configured" path. The
sibling `resolveCameraParams` in this exact file already guards the
equivalent zero-value landmine for `fov`/`near`/`far`; scale had no such
guard.

**Decision:** `resolveModelTransform` now falls back to `1` on any axis
where the stage's declared scale is `0` or negative, mirroring
`resolveCameraParams`'s existing `rawValue > 0 ? rawValue : DEFAULT`
pattern exactly. The fallback is applied per axis (not all-or-nothing), and
only to the *preview's* derived transform — the raw stored field (and the
numeric input the user sees/edits) is left untouched at `0`, exactly like
`fov`/`near`/`far` already do. This was verified to actually fix the
blank-canvas rendering (not just theoretically): reverting the fallback
and re-running the visual suite against the corrected, real-content
baselines reproduces an ~85% pixel diff, confirming both that the bug was
real and that the now-regenerated baselines catch its reintroduction.

**Reason:** Reuses an already-established, already-reviewed pattern in the
same file for the same category of problem (a MUGEN/Ikemen `.def` section
whose absence zero-fills a field that has no sane zero interpretation),
rather than inventing a second mechanism. Scoping the fix to `three.js`'s
own zero-scale degenerate case (not a generic "any weird value" validator)
keeps it minimal and directly tied to the observed failure.

**Rejected alternatives:**
- **Auto-fit the camera to the loaded model's real bounding box** (compute
  a sensible camera distance/scale from the glTF's actual geometry extents)
  — rejected as disproportionate: it would fix the *framing* (currently a
  very close-up, not visually pleasing default view once scale correctly
  falls back to `1`) but is a materially larger, separate UX change with
  its own design questions (what counts as "a good fit" for an arbitrary
  model), not something this bug-diagnosis pass should decide unilaterally.
  The blank-canvas defect this item exists to catch is fixed either way;
  framing quality is left as a natural follow-up if the Product Owner wants
  it.
- **A fixture-specific default scale** (e.g. `0.0141`, matching the vendored
  `cvs2london.glb`'s own real stage) — rejected: baking one specific
  fixture's own tuned value into production code as a general fallback
  would be backwards — the fallback must make sense for *any* freshly
  assigned model, not just this one test asset.
- **Guarding in `model-editor.ts` at the call site instead of inside
  `resolveModelTransform`** — rejected: `resolveCameraParams`'s existing
  equivalent guard already lives inside the resolver, not the caller: every
  consumer of the resolved transform (initial mount, remount, and the
  Offset/Scale field commit path) gets the same guard for free with no risk
  of one call site forgetting it.
