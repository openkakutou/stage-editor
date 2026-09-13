# Visual regression fixtures

A real, vendored 3D model file used by `tests/visual/model-editor.visual.spec.ts`
(backlog item 011). Committed rather than generated at test time, since CI
needs it present on every run with no external corpus dependency.

## `cvs2london.glb`

The exact same real, unmodified `.glb` already vendored in the sibling
`stage-viewer-web` repo's own visual-regression fixtures
(`tests/visual/fixtures/cvs2london/cvs2london.glb`) — a real Ikemen GO 3D
stage model whose own `.def` states "This stage and its assets are licensed
under MIT." Reused here rather than re-sourced separately: same org, same
already-cleared license, no reason to introduce a second binary fixture for
the same purpose. No `.hdr` lighting file is assigned in these tests — this
app's own 3D model editor renders a model with no environment map assigned
(see `.vibe/decisions/004`), so a baseline with model-only lighting is a
faithful default-placement scenario.

## Regenerating

There is no trimming tool for this binary format — copy the file directly
from `stage-viewer-web`'s own fixtures (or the same local Ikemen GO corpus
it was originally vendored from) if it ever needs replacing; never hand-edit
or fabricate the copied bytes.
