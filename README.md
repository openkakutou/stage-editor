# stage-editor

A read+write editor for [OpenKakutou](https://github.com/openkakutou) (MUGEN/Ikemen GO-compatible) stage (background) files — load an existing stage or start a new one, edit its characteristics and BG elements/layers, and save the result. It reads and writes stage data (`.def` and its referenced sprite sheet) via a WebAssembly module built from the sibling [`stage`](https://github.com/openkakutou/stage) Go library. Separate app from [`stage-viewer-web`](https://github.com/openkakutou/stage-viewer-web), which is read-only.

<!-- vibe:begin:features -->
This project is in early-stage development — no functionality yet.

Planned:

- WASM bridge to the `stage` library's write mode, and adoption of the shared `web-ui-kit` design system
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
No additional documentation yet.
<!-- vibe:end:docs-index -->
