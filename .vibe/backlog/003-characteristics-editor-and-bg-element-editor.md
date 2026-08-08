---
status: todo
depends_on: [002]
---
# Characteristics Editor + BG Element Editor

## Description
Once a stage is loaded through the file input (item 002) into the WASM bridge's editable in-memory representation (item 001), build the two core editing screens: a characteristics editor for the stage's top-level properties (name, author, camera zoom bounds, stage boundaries), and a BG element/layer editor to add, edit, and remove background elements — each with its type (normal/parallax/anim), position, layer number, tiling, parallax scroll-delta parameters, and its sprite reference into the loaded sprite sheet. Every edit made here mutates the in-memory stage via the WASM bridge, ready for item 004's save/export.

## Acceptance Criteria
- [ ] User can view and edit the stage's name, author, camera bounds, and stage boundaries
- [ ] User can add a new BG element/layer, choosing its type and initial sprite reference
- [ ] User can edit an existing BG element's position, layer number, tiling, and parallax parameters
- [ ] User can remove a BG element/layer
- [ ] Assigning a sprite reference that doesn't exist in the loaded sprite sheet shows a clear error state instead of silently accepting an invalid reference

## Notes
None.
