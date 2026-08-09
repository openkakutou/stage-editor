---
status: todo
depends_on: [003]
---
# 3D Model-Based BG Element And Stage Settings Editor

## Description
Read+write UI for Ikemen GO 3D model-based stage settings (see the roadmap's `.vibe/decisions/014`): assign or replace a stage's 3D model and `.hdr` lighting file references, edit their placement (`Offset`/`Scale`), and edit the 3D camera (`Near`/`Far`/`fov`/`YShift`), `[Scaling]`, and Z-axis boundary (`topbound`/`botbound`, per-player `Startz`) settings once `stage`'s write path exposes them (`stage` backlog item 008). Uses `web-ui-kit`'s shared 3D viewport control (`web-ui-kit` item 007) for a live preview while editing, the same pattern item 003 already established for 2D BG elements.

## Acceptance Criteria
- [ ] A model file and `.hdr` lighting file can be assigned to or removed from a stage
- [ ] `Offset`/`Scale` placement fields are editable and reflected live in the 3D preview
- [ ] 3D camera, `[Scaling]`, and Z-boundary/`Startz` fields are editable
- [ ] Editing an existing 2D-only stage leaves it unchanged unless the user explicitly adds 3D model data (no accidental section injection)
- [ ] Saving/exporting a stage with 3D data round-trips through `stage`'s write path without data loss, verified against item 008's serializer guarantees

## Notes
Cross-repo dependency, not expressible via this repo's own `depends_on`: also needs `stage` backlog item `008` (write path for the new sections) and `web-ui-kit` backlog item `007` (shared 3D viewport control).
