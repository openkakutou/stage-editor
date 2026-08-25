# stage-editor

A read+write editor for [OpenKakutou](https://github.com/openkakutou) (MUGEN/Ikemen GO-compatible) stage (background) files — load an existing stage or start a new one, edit its characteristics and BG elements/layers, and save the result. It reads and writes stage data (`.def` and its referenced sprite sheet) via a WebAssembly module built from the sibling [`stage`](https://github.com/openkakutou/stage) Go library. Separate app from [`stage-viewer-web`](https://github.com/openkakutou/stage-viewer-web), which is read-only.

<!-- vibe:begin:features -->
This project is in early-stage development — there is no way to load, edit, or save a stage from the app yet. It now uses the shared OpenKakutou design system for its layout and visual style, and the underlying stage-reading and stage-writing library is wired up and ready for the file input below.

Planned:

- File input to load an existing stage's `.def` (and referenced sprite sheet) for editing
- A characteristics editor: stage name, author, camera bounds, stage boundaries
- A BG element/layer editor: add, edit, and remove background elements and layers (parallax parameters, sprite references)
- Save/export edits back to the stage `.def` format
- A new stage wizard: create a stage from scratch or from a starter template
<!-- vibe:end:features -->

<!-- vibe:begin:install -->
Requires [Node.js](https://nodejs.org/) `^20.19.0` or `>=22.12.0`.

```sh
npm install
```

Verify the install worked by running the test suite:

```sh
npm test
```

To update dependencies to their latest allowed versions:

```sh
npm update
```

Download a specific version of the `stage` library's WebAssembly build (needed to load or save a stage):

```sh
npm run wasm:download -- v0.7.0
```
<!-- vibe:end:install -->

<!-- vibe:begin:usage -->
Start a local dev server with hot reload:

```sh
npm run dev
```

Build the static site for production (output in `dist/`):

```sh
npm run build
```

Preview a production build locally:

```sh
npm run preview
```

Run the test suite:

```sh
npm test
```

Run the linter/formatter (auto-fixes issues in place):

```sh
npm run lint
```
<!-- vibe:end:usage -->

<!-- vibe:begin:docs-index -->
- [docs/architecture.md](docs/architecture.md) — how the app is put together: the main modules, how a stage's data would flow through them when loaded or saved, and its WebAssembly dependency.
- [docs/development.md](docs/development.md) — local dev setup notes, including how to fetch the `stage` library's WebAssembly build.
- [docs/testing.md](docs/testing.md) — how the test suite is structured, including how it exercises the real WebAssembly module and works around test-environment quirks.
<!-- vibe:end:docs-index -->
