---
status: todo
depends_on: [001]
---
# Adopt Undo/Redo Command-Stack from web-ui-kit

## Description
Wire this app's editing operations (characteristics edits and BG element add/edit/remove from item 003, and any later batch edits from item 007) through the shared undo/redo command-stack primitive provided by `web-ui-kit`, instead of leaving edits non-reversible. Each mutating action should push a do/undo pair onto the shared history rather than each editor screen inventing its own history handling.

## Acceptance Criteria
- [ ] Every mutating action available in the characteristics editor and BG element editor (item 003) is undoable and redoable
- [ ] A batch edit (item 007, once it exists) undoes/redoes as a single step, not one step per affected element
- [ ] Undo/redo is reachable both via the shared shortcut manager (item 009) and via an explicit UI control (e.g. toolbar buttons)
- [ ] Undo/redo state (available/not available) is visibly reflected in the UI (e.g. disabled controls at the ends of the history)

## Notes
Cross-repo blocker: depends on `web-ui-kit`'s own primitive being implemented first — `web-ui-kit`'s `.vibe/backlog/009-undo-redo-command-stack-primitive.md`, currently `status: todo`. Also depends on this repo's item 001 (adopting `web-ui-kit` at all).
