---
date: 2026-08-30
status: accepted
---
# New Stage Wizard: snapshot-diff dirty tracking, unset sprite refs in templates, and an explicit discard-confirm message

**Context:** Backlog item 005 adds a "New Stage" flow (from scratch, or from a bundled starter template) as an alternative entry point to the existing folder-based file input. Starting a new stage while the currently loaded one has unsaved edits must prompt for confirmation instead of silently discarding them — this is the first place this app needs to know "has the document actually changed," which nothing tracked before. A UI/UX consultation during planning refined three points below from their first draft.

**Decision:**
1. **Unsaved-changes detection is a snapshot-diff, not an edit-driven boolean flag.** The document store keeps a JSON snapshot of the stage taken whenever it was last known clean (loaded, created, or saved); `hasUnsavedStageChanges()` compares the current stage against it on demand. A boolean flipped by the editors' existing `onChange` callbacks was rejected: `onChange` fires on every committed edit regardless of whether the value actually changed (a text field commits on every keystroke, a numeric field commits on blur even with no real change), which would prompt the discard-confirmation for edits that never happened. The snapshot-diff only reports dirty on an actual value difference, and auto-clears if an edit is reverted back to its original value — for free, with no extra bookkeeping.
2. **A starter template's example BG elements use the sprite reference "unset" sentinel (`{group: -1, image: -1}`)**, never a fabricated reference like `{group: 0, image: 0}`. A from-scratch stage has no real sprite sheet attached, so a fabricated reference would render as a red "invalid reference" error the moment the editor shows it — a from-scratch stage's elements aren't broken, they're just not assigned yet, and this app's BG element editor already has that exact distinct state for a real, user-created element with no sprite chosen. Reusing it keeps template elements consistent with that established precedent instead of inventing a second "placeholder" visual language.
3. **The discard-confirmation message explicitly names the consequence** ("Starting a new stage will discard them.") rather than a generic "Are you sure?" — this app's first destructive-action confirmation, and a blocking native dialog's message text is the only signal it gives.
4. **A wizard-driven creation moves focus into the characteristics editor's first field once mounted.** The wizard commits immediately with no second confirm/preview screen (nothing else needs configuring at creation time), so this is the only positive confirmation a keyboard/screen-reader user gets that the action actually landed.

**Reason:** Each point closes a concrete usability gap identified during UI/UX consultation before implementation, not a stylistic preference.

**Rejected alternatives:**
- *A `markDocumentEdited()` call wired into both editors' `onChange`* — rejected: over-reports dirty on no-op edits, eroding trust in the warning for when it actually matters (per consultation).
- *A fabricated example sprite reference (e.g. `{0, 0}`) for template elements* — rejected: creates a false "invalid reference" error on a stage that isn't actually broken.
- *A second confirm/preview screen before committing a template* — rejected as unnecessary scope: nothing about a template needs configuring before creation, everything is editable immediately afterward in the existing screens; the focus-move (point 4) covers the confirmation gap this would have otherwise existed to solve.
