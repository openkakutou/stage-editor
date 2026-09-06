---
status: done
depends_on: [001]
---
# Adopt Undo/Redo Command-Stack from web-ui-kit

## Description
Wire this app's editing operations (characteristics edits and BG element add/edit/remove from item 003, and any later batch edits from item 007) through the shared undo/redo command-stack primitive provided by `web-ui-kit`, instead of leaving edits non-reversible. Each mutating action should push a do/undo pair onto the shared history rather than each editor screen inventing its own history handling.

## Acceptance Criteria
- [x] Every mutating action available in the characteristics editor and BG element editor (item 003) is undoable and redoable
- [x] A batch edit (item 007) undoes/redoes as a single step, not one step per affected element
- [x] Undo/redo is reachable via an explicit UI control (toolbar buttons) — the shared shortcut manager path is deferred until item 009 lands (see Notes)
- [x] Undo/redo state (available/not available) is visibly reflected in the UI (disabled toolbar controls at the ends of the history)

## Notes
Cross-repo blocker resolved: `web-ui-kit`'s `CommandStack` primitive (its own item `009`) and this repo's item `001` (adopting `web-ui-kit`) were both `status: done` by the time this item was picked up — already satisfied by the pinned `^0.6.0` dependency, no version bump needed.

Keyboard-shortcut reachability (the acceptance criterion's other half) is deferred: this app has no shortcut manager yet (item 009, still `status: todo`). Shipping the toolbar-control path now rather than blocking on that dependency was a deliberate call, mirroring `lifebar-editor`'s own identical decision for its equivalent item — see `.vibe/decisions/006-undo-redo-scoped-to-current-document-shortcut-deferred.md`. Item 009, once implemented, should register Undo/Redo as shortcut actions against the same shared `commandStack`.
