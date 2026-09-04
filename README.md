# stage-editor

A read+write editor for [OpenKakutou](https://github.com/openkakutou) (MUGEN/Ikemen GO-compatible) stage (background) files — load an existing stage or start a new one, edit its characteristics and BG elements/layers, and save the result. It reads and writes stage data (`.def` and its referenced sprite sheet) via a WebAssembly module built from the sibling [`stage`](https://github.com/openkakutou/stage) Go library. Separate app from [`stage-viewer-web`](https://github.com/openkakutou/stage-viewer-web), which is read-only.

<!-- vibe:begin:features -->
This project is in early-stage development. You can already load a stage by picking or dragging in the folder that contains its files — the app reads them, automatically finds the referenced background sprite sheet even in a subfolder or under a slightly different letter case, and clearly names which file is missing if it can't be found. You can also start a brand-new stage instead, either blank or from a bundled starter template pre-populated with example background elements — starting a new stage while the current one has unsaved edits asks for confirmation first. Once a stage is loaded or created, you can edit its name, author, camera bounds, and stage boundaries directly, and add, edit, and remove its background elements/layers — choosing each element's type, position, layer, tiling, and sprite reference. A sprite reference that doesn't exist in the loaded sprite sheet is flagged clearly instead of being accepted silently. You can select several background elements at once — checkboxes, plus Shift-click or Shift-Space to select an entire range — and move all of them by the same offset or assign them all the same sprite in one action; the selection is clearly highlighted, and each batch action shows exactly which elements it will affect and stays disabled until it has something real to apply. You can also edit a stage's Ikemen GO 3D model settings: assign or remove a 3D model and its lighting file, adjust the model's placement, scale, and lighting strength with a live 3D preview that updates as you edit, and set the 3D camera, perspective scaling, and each player's starting depth. When you're done, you can save the stage and download it as a `.def` file — saving without any changes downloads a file identical to the one you loaded.
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
npm run wasm:download -- v0.12.0
```

Download a specific version of the `sff` library's WebAssembly build (needed to validate a background element's sprite reference against the loaded sprite sheet):

```sh
npm run wasm:download:sff -- v0.3.1
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
