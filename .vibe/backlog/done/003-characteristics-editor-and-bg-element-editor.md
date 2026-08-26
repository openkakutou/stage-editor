---
status: done
depends_on: [002]
---
# Characteristics Editor + BG Element Editor

## Description
Once a stage is loaded through the file input (item 002) into the WASM bridge's editable in-memory representation (item 001), build the two core editing screens: a characteristics editor for the stage's top-level properties (name, author, camera zoom bounds, stage boundaries), and a BG element/layer editor to add, edit, and remove background elements — each with its type (normal/parallax/anim), position, layer number, tiling, parallax scroll-delta parameters, and its sprite reference into the loaded sprite sheet. Every edit made here mutates the in-memory stage via the WASM bridge, ready for item 004's save/export.

## Acceptance Criteria
- [x] User can view and edit the stage's name, author, camera bounds, and stage boundaries
- [x] User can add a new BG element/layer, choosing its type and initial sprite reference
- [x] User can edit an existing BG element's position, layer number, tiling, and parallax parameters
- [x] User can remove a BG element/layer
- [x] Assigning a sprite reference that doesn't exist in the loaded sprite sheet shows a clear error state instead of silently accepting an invalid reference

## Notes
"Camera zoom bounds" in the Description is read as the same "Camera Bounds" glossary term the Acceptance Criteria uses (left/right/high/low) — `zoomIn`/`zoomOut` are separate `BGdef` fields not covered by this item.

Sprite reference validation needed a second, independent WASM bridge to `sff`'s own module (`stage`'s own WASM has no sprite-metadata surface yet) — see `.vibe/decisions/001-sff-wasm-bridged-directly-for-sprite-reference-validation.md`.

**Done 2026-08-26:** Implemented, tested (unit + real-browser verification against a real loaded stage with both a valid and an invalid sprite reference), documented, and shipped.
