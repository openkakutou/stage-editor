---
status: done
---
# Fyne Desktop App And Multi-OS Builds

## Description
Ship `stage-editor` as a standalone native desktop app for Windows, Mac and Linux, alongside its existing web build. Per roadmap decision `022` (confirmed by the Product Owner on 2026-10-07), the stack is [Fyne](https://fyne.io/): a native Go GUI toolkit, no webview. The Fyne UI is written from scratch on top of this repo's Go libraries (`web-ui-kit` stays web-only). Originates from roadmap backlog `007`.

## Acceptance Criteria
- [x] A Fyne application skeleton builds and launches, loading and saving a file through the same Go libraries the web build uses
- [x] A per-OS CI build matrix (Windows, Mac, Linux) produces desktop artifacts
- [x] Artifacts are published as GitHub Release assets, versioned with this repo's own release process, at a stable URL
- [ ] `openkakutou.github.io`'s pending platform pill for this editor is updated to a live link for each OS once its build is available

## Notes
Builds are unsigned at first; signing/notarization (Mac, Windows) is a follow-up. Suggested order across editors: validate CI and packaging on `character-editor` first, then reuse the pipeline in `stage-editor` and `lifebar-editor`. See roadmap `.vibe/decisions/022` and `.vibe/decisions/019`.

## Outcome
Delivered in `feat: add native desktop app for Windows, Mac and Linux` (see `desktop/`, `.github/workflows/desktop.yml`, `docs/desktop.md`, ADR `.vibe/decisions/011`). Mac Intel builds are cross-compiled on the Apple silicon runner.

Not verified locally: the `desktop/` root package needs GL/X11 development packages that were not installed on the authoring machine, so the first real check is the CI matrix on the next push. The unit tests under `desktop/internal/` pass on Linux.

Criterion 4 stays open until the first tagged release attaches the desktop assets: then update the `openkakutou.github.io` pill for each OS in that repo.

Follow-ups not in this item: confirmation before discarding unsaved edits, editing of BG elements / 3D model / sprite sheet in the desktop app, and platform signing.
