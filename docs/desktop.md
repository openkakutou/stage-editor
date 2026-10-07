# Desktop app

A native app for Windows, Mac and Linux, built with [Fyne](https://fyne.io/) from the Go code in `desktop/`. It uses the same `stage` Go library as the web build, with no webview.

## Download

Each release attaches one build per system. Stable links to the latest release:

- Linux: `https://github.com/openkakutou/stage-editor/releases/latest/download/stage-editor-linux-amd64.tar.gz`
- macOS (Apple silicon): `https://github.com/openkakutou/stage-editor/releases/latest/download/stage-editor-macos-arm64.zip`
- macOS (Intel): `https://github.com/openkakutou/stage-editor/releases/latest/download/stage-editor-macos-amd64.zip`
- Windows: `https://github.com/openkakutou/stage-editor/releases/latest/download/stage-editor-windows-amd64.zip`

Builds are not signed yet, so macOS (Gatekeeper) and Windows (SmartScreen) may warn on first launch.

## Build locally

Needs Go and a C compiler; on Linux also the GL/X11 development packages (`pkg-config libgl1-mesa-dev xorg-dev libwayland-dev libxkbcommon-dev`).

```sh
cd desktop
go test ./...
go run .
```

## Current scope

A skeleton: open a stage's `.def` file, view its name, author, BG element count, camera bounds and music file, rename it and save (byte-identical if nothing changed). Ctrl+O opens a file, Ctrl+S saves. A file that is not a stage is refused without touching the stage already open.

Not yet included: confirmation before discarding unsaved edits when opening another file or closing the window, and editing of BG elements, the 3D model and the sprite sheet.

## Releases

The build workflow (`.github/workflows/desktop.yml`) creates the GitHub Release for a version tag if it does not exist yet, then attaches the desktop builds to it. Release notes are written by `/vibe:publish`; if the release already exists, its notes are left as they are.
