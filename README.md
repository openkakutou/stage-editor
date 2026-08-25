# stage-editor

A read+write editor for [OpenKakutou](https://github.com/openkakutou) (MUGEN/Ikemen GO-compatible) stage (background) files — load an existing stage or start a new one, edit its characteristics and BG elements/layers, and save the result. It reads and writes stage data (`.def` and its referenced sprite sheet) via a WebAssembly module built from the sibling [`stage`](https://github.com/openkakutou/stage) Go library. Separate app from [`stage-viewer-web`](https://github.com/openkakutou/stage-viewer-web), which is read-only.

<!-- vibe:begin:features -->
This project is in early-stage development. You can already load a stage by picking or dragging in the folder that contains its files — the app reads them, automatically finds the referenced background sprite sheet even in a subfolder or under a slightly different letter case, and clearly names which file is missing if it can't be found. The loaded stage is kept ready for the editing screens below, which are not built yet.

Planned:

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
