---
status: done
depends_on: [003]
---
# Batch/Multi-Select Editing for BG Elements

## Description
Extend the BG element editor (item 003) to let the user select multiple BG elements/layers at once and apply a shared change — offsetting position, rescaling, shifting layer order, or reassigning a sprite reference — to all of them in a single operation, instead of opening and editing each element's coordinates one by one. Stage `.def` files commonly define hundreds of background layers, and manually re-entering coordinates per layer is a well-known source of tedium and repetitive-strain complaints for MUGEN/Ikemen stage authors using existing tools.

## Acceptance Criteria
- [x] User can select more than one BG element at a time in the editor — checkbox per row, plain click/Space toggles one, Shift-click/Shift-Space selects the whole range since the last individually-selected row
- [x] A shared position offset applied to the selection moves every selected element by the same delta, preserving each one's original relative position
- [x] A shared sprite reassignment applies to every selected element in one action (the AC's "layer-order shift" alternative was not built this pass — see Notes)
- [x] Applying a batch change to a selection containing zero elements is a no-op, not an error — the batch toolbar (and its Apply actions) only renders once the selection is non-empty, and the underlying pure functions are also defensively no-ops for an empty set

## Notes
Depends on item 003's BG element editor existing first (done). `web-ui-kit`'s undo/redo primitive is now also done (`web-ui-kit#009`), and this repo's own item 008 (adopting it) is not — a batch edit is not yet a single undoable history entry; that lands whenever item 008 does, since the batch functions themselves already mutate through the normal document object, not a separate code path.

Scope decision: shipped sprite reassignment, not a batch layer-order shift, for the acceptance criteria's "or" bullet — see `.vibe/decisions/005-bg-element-batch-selection-model-and-scope.md` for the full reasoning (a true reorder needs its own selection-to-reorder interaction design, judged large enough to deserve a separate pass rather than a decision folded silently into this item).

A real, confirmed-in-browser checkbox activation bug was found and fixed during this item's runtime verification — `preventDefault()` on a checkbox's `click` event (mouse or keyboard) reverts `.checked` back to its pre-activation value regardless of what JS sets it to afterward. Not reproducible under jsdom; see `docs/testing.md`'s "batch multi-select editing" section.
