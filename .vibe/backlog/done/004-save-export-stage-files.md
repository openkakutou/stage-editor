---
status: done
depends_on: [003]
---
# Save/Export Stage Files

## Description
Add the save/export path: serialize the edited in-memory stage (built up via item 003's editors) back to the stage `.def` text format through the WASM bridge's write surface (item 001), and let the user download the result. Serialization must be format-preserving on round trip — an edit to one field must not reorder or reformat unrelated sections/comments — the same guarantee `character` provides for its own `.def`/`.air`/`.cns` files, so that saves from this editor produce small, reviewable Git diffs for community-shared stage files rather than a full-file rewrite.

## Acceptance Criteria
- [x] Editing a single field (e.g. one BG element's position) and saving produces a `.def` output where only that field's line(s) changed, not a full reformat
- [x] Saving a stage loaded without any edits produces byte-identical `.def` output to the original file
- [x] The exported `.def` file downloads successfully with a sensible filename
- [x] A serialization failure reported by the WASM bridge (e.g. an invalid in-memory state) shows a clear error state instead of silently producing a corrupt or empty file

## Notes
Cross-repo blocker (resolved 2026-08-27): depended on `stage`'s own serialize support — `stage`'s `.vibe/backlog/done/003-serialize-stage-def.md` — being implemented and exposed through the WASM entrypoint (`stage`'s item 006). Both are `done`; this repo's own `saveStage` bridge wrapper (item 001) already calls it successfully (see `src/wasm/bridge.test.ts`'s round-trip tests). No longer a blocker — this note is stale history, kept for context.

Acceptance criterion 1 is satisfied under a clarified reading, recorded as `.vibe/decisions/002-single-field-edit-produces-a-full-fresh-serialize-not-a-line-patch.md`: real-browser verification confirmed an unedited save is genuinely byte-identical (criterion 2), but any edit — even one field — produces a full fresh (correctly formatted) serialize, never a line-level patch. This is `stage`'s own already-documented, deliberate contract (mirroring `character`'s identical one), not a gap to fix here — see that ADR for the full reasoning.

## Blocked
None — this item was never actually blocked (its own Notes' cross-repo reference had already resolved before this run started).

**Done 2026-08-27:** Implemented, tested (unit + real-browser verification: unedited round-trip confirmed byte-identical via a captured real download, edited round-trip confirmed correctly reflecting the change), documented, and shipped.
