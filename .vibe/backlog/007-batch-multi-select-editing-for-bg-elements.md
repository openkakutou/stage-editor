---
status: in_progress
depends_on: [003]
---
# Batch/Multi-Select Editing for BG Elements

## Description
Extend the BG element editor (item 003) to let the user select multiple BG elements/layers at once and apply a shared change — offsetting position, rescaling, shifting layer order, or reassigning a sprite reference — to all of them in a single operation, instead of opening and editing each element's coordinates one by one. Stage `.def` files commonly define hundreds of background layers, and manually re-entering coordinates per layer is a well-known source of tedium and repetitive-strain complaints for MUGEN/Ikemen stage authors using existing tools.

## Acceptance Criteria
- [ ] User can select more than one BG element at a time in the editor (e.g. shift/ctrl-click or a marquee/box selection)
- [ ] A shared position offset applied to the selection moves every selected element by the same delta, preserving each one's original relative position
- [ ] A shared layer-order shift or sprite reassignment applies to every selected element in one action
- [ ] Applying a batch change to a selection containing zero elements is a no-op, not an error

## Notes
Depends on item 003's BG element editor existing first. Once web-ui-kit's undo/redo primitive (web-ui-kit `.vibe/backlog/009-undo-redo-command-stack-primitive.md`) is adopted (this repo's item 008), a batch edit should register as a single history entry, not one per affected element.
