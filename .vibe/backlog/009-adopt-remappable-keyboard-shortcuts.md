---
status: todo
depends_on: [001]
---
# Adopt Remappable Keyboard Shortcuts from web-ui-kit

## Description
Register this app's actions (save/export, undo/redo, add BG element, delete selection, etc.) with the shared keyboard-shortcut manager provided by `web-ui-kit`, instead of hardcoding key bindings, so users get a consistent, rebindable shortcut experience across every OpenKakutou editor.

## Acceptance Criteria
- [ ] This app's key actions (save, undo, redo, add BG element, delete selection) are registered with default bindings through the shared shortcut manager
- [ ] A user can rebind any of this app's registered shortcuts via the shared shortcuts panel and have it persist across reloads
- [ ] No action in this app is reachable only through a hardcoded, non-remappable key handler

## Notes
Cross-repo blocker: depends on `web-ui-kit`'s own manager being implemented first — `web-ui-kit`'s `.vibe/backlog/010-remappable-keyboard-shortcut-manager.md`, currently `status: todo`. Also depends on this repo's item 001 (adopting `web-ui-kit` at all).
