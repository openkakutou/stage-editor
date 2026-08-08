---
status: todo
depends_on: [003]
---
# Save/Export Stage Files

## Description
Add the save/export path: serialize the edited in-memory stage (built up via item 003's editors) back to the stage `.def` text format through the WASM bridge's write surface (item 001), and let the user download the result. Serialization must be format-preserving on round trip — an edit to one field must not reorder or reformat unrelated sections/comments — the same guarantee `character` provides for its own `.def`/`.air`/`.cns` files, so that saves from this editor produce small, reviewable Git diffs for community-shared stage files rather than a full-file rewrite.

## Acceptance Criteria
- [ ] Editing a single field (e.g. one BG element's position) and saving produces a `.def` output where only that field's line(s) changed, not a full reformat
- [ ] Saving a stage loaded without any edits produces byte-identical `.def` output to the original file
- [ ] The exported `.def` file downloads successfully with a sensible filename
- [ ] A serialization failure reported by the WASM bridge (e.g. an invalid in-memory state) shows a clear error state instead of silently producing a corrupt or empty file

## Notes
Cross-repo blocker: depends on `stage`'s own serialize support — `stage`'s `.vibe/backlog/003-serialize-stage-def.md`, currently `status: todo` — being implemented and exposed through the WASM entrypoint (`stage`'s item 006) that item 001 here bridges to.
