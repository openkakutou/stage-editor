---
date: 2026-09-06
status: accepted
---
# Undo/redo history is scoped to the current document; shortcut reachability deferred

**Context:** Item 008 wires the characteristics editor, the BG element editor (add/edit/remove, item 003), and the batch multi-select edit feature (item 007) through `web-ui-kit`'s shared `CommandStack`. Two points weren't fully specified: what happens to the history when the loaded document is replaced (a new file loaded, or the New Stage Wizard creates one), and how to satisfy the acceptance criterion that undo/redo be reachable both via a toolbar control and via the shared shortcut manager — this app has no shortcut manager yet (item 009, still `status: todo`, itself blocked on `web-ui-kit`'s own manager).

**Decision:** The shared command stack is cleared (`commandStack.clear()`) whenever a document is loaded or created, before the new document is stored. Undo/redo only ever applies to edits made on the currently loaded document — there is no "undo past a document swap." Separately, only the explicit toolbar-button reachability path ships now; the keyboard-shortcut path is left for item 009 to wire up once this app adopts `web-ui-kit`'s shortcut manager, rather than blocking this item on a dependency it doesn't formally declare. This mirrors `lifebar-editor`'s own identical decision for its equivalent item (that repo's `.vibe/decisions/007-undo-redo-scoped-to-current-document-shortcut-deferred.md`), adopted here rather than re-derived since the underlying shape (one shared document, one shared history, no shortcut manager yet) is the same.

**Reason:** An undo step that silently reapplies an edit from a document no longer loaded would corrupt the new one — every other piece of per-document state in this app (the unsaved-changes snapshot, the sprite sheet decode) already resets on a document swap for the same reason. Blocking item 008 entirely on item 009 landing first would leave the whole feature undelivered for a UI-control need that's fully satisfiable today; the shortcut path is additive and doesn't change the toolbar path's own contract once added.

**Rejected alternatives:**
- *Keep history across a document swap*: rejected — an undo/redo entry closes over specific BG element objects/array indices of one document; replaying it against a different document is meaningless at best, silently wrong at worst.
- *Block this item until item 009 ships*: rejected — item 009 is unstarted and unrelated in scope (a general shortcut manager, not specific to undo/redo); the toolbar-control acceptance criterion doesn't need it.
- *Warn the user when the bounded history is about to evict its oldest entry*: rejected for now (raised during UX consultation) — the shared primitive's default cap (100 entries) is generous for a single editing session, and no other OpenKakutou editor app surfaces this; adding a warning here with no established pattern to follow would be speculative for a gap no user has reported.
