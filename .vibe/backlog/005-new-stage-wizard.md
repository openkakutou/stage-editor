---
status: in_progress
depends_on: [004]
---
# New Stage Wizard

## Description
Add a "New Stage" flow as an alternative entry point to item 002's file-loading path: let the user create a stage from scratch (a minimal valid `BGdef` plus sensible default camera bounds and boundaries) or from a starter template (a small set of pre-built example layouts bundled with the app), producing the same editable in-memory stage that item 003's editors and item 004's save/export operate on. This closes the loop so the app can both edit existing stages and originate new ones, matching the "modify and/or create" scope the roadmap assigns to `stage-editor`.

## Acceptance Criteria
- [ ] User can start a brand-new stage from scratch, landing in the characteristics/BG element editors (item 003) with sensible defaults already populated
- [ ] User can start from at least one bundled starter template, pre-populated with example BG elements
- [ ] A newly created stage can be saved/exported (item 004) to a valid `.def` file
- [ ] Attempting to start a new stage while unsaved edits exist on the currently loaded stage prompts for confirmation instead of silently discarding them

## Notes
None.
