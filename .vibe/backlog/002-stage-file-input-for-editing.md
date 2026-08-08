---
status: todo
depends_on: [001]
---
# Stage File Input For Editing

## Description
Since this is a static site with no backend, the user must supply a stage's files directly from their machine. Add a file input (standard multi-file picker and/or drag-and-drop) that lets the user select or drop a stage's `.def` file together with its referenced sprite sheet (`.sff`), reads each as a byte buffer, and feeds them into the WASM bridge's load path (item 001) to produce the editable in-memory stage used by every later editing screen.

## Acceptance Criteria
- [ ] User can select the stage's `.def` and referenced sprite sheet via a file picker, or drag-and-drop them onto a drop zone
- [ ] Selected files are read as byte buffers and passed to the WASM bridge's load call
- [ ] A missing required file (e.g. only the `.def` provided, no sprite sheet) shows a clear error state naming which file is missing, instead of calling the bridge with incomplete data
- [ ] An unreadable/corrupt file selection shows a clear error state instead of crashing the page
- [ ] After a successful load, the in-memory stage is held in editable state, ready for item 003's editors

## Notes
None.
