# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2026-09-10

### Added

- The app is now available in English and French. A language switcher in the toolbar lets you change it live, without reloading the page, and your choice is remembered the next time you visit. The language is detected from your browser by default.

## [0.10.0] - 2026-09-08

### Added

- Save/Export, Undo, Redo, Add BG Element, and a new Delete Selection action all now have a default keyboard shortcut (Ctrl+S, Ctrl+Z, Ctrl+Y, Ctrl+Shift+A, and Delete respectively), shown as a tooltip on each button. A new "Keyboard Shortcuts" panel lets you rebind any of them to a key of your choice — a key already used by another action offers to swap the two instead of silently overwriting it — and your choices are remembered the next time you open the app. Undo, Redo, and Delete Selection defer to normal text-field editing while you're typing in a field.
- Selecting several BG elements and choosing "Delete N selected" removes all of them at once, in a single undoable step — Undo brings them all back together, exactly as they were.

## [0.9.0] - 2026-09-06

### Added

- Every edit in the characteristics editor and the BG element editor — including add/remove, and a batch position offset or sprite reassignment applied to several selected elements — can now be undone and redone. Undo and Redo toolbar buttons appear next to the app title, disabled whenever there's nothing to undo or redo. A batch edit undoes and redoes as a single step, not one per affected element. Undo/redo history starts fresh whenever a stage is loaded or a new one is created.

## [0.8.0] - 2026-09-03

### Added

- Users can now select several BG elements at once — click a checkbox, or Shift-click/Shift-Space a second one to select every element in between — and apply a shared position offset or sprite reassignment to all of them in a single action. Selected elements are clearly highlighted, and each batch action shows exactly which elements it will affect and stays disabled until it has a real value to apply.

## [0.7.0] - 2026-09-02

### Added

- A loaded stage's Ikemen GO 3D model settings can now be edited: assign or remove a 3D model file and its lighting file, edit the model's placement/scale and lighting strength, the 3D camera, perspective scaling, and each player's starting depth — with a live 3D preview that updates as the placement or camera fields are edited. The camera, scaling, and player-depth fields are always editable; the model's own placement fields appear once a model file is assigned. Assigning a model or lighting file whose data can't be rendered (an unsupported browser, or a file that fails to load) shows a clear message instead of a blank or broken preview.

## [0.6.0] - 2026-08-30

### Added

- You can now start a brand-new stage from scratch, or from a bundled starter template, instead of only loading an existing one. A new stage lands directly in the same editing screens as a loaded one, ready to edit and save. Starting a new stage while the current one has unsaved edits asks for confirmation first, so you never lose changes by accident.

## [0.5.0] - 2026-08-27

### Added

- The loaded stage can now be saved and downloaded as a `.def` file. Saving without making any changes downloads a file identical to the one you loaded; saving after an edit downloads the updated stage. A save that can't be completed shows a clear error instead of producing a broken or empty file.

## [0.4.0] - 2026-08-26

### Added

- After loading a stage, its name, author, camera bounds, and stage boundaries can now be edited directly, and its background elements/layers can be added, edited, and removed — choosing each element's type, position, layer, tiling, and sprite reference. Assigning a sprite reference that doesn't exist in the loaded sprite sheet is flagged clearly instead of being accepted silently.

## [0.3.0] - 2026-08-26

### Added

- Users can now load a stage by picking or dragging in the folder that contains its files — the app reads them, automatically finds the referenced background sprite sheet even in a subfolder or under a slightly different letter case, and clearly names which file is missing if it can't be found. The loaded stage is kept ready in memory for the editing screens that come in later updates.

### Fixed

- Fixed the automatic deployment of this app's live site, which had been failing since the previous release.

## [0.2.0] - 2026-08-25

### Added

- The app now uses the shared OpenKakutou design system for its layout and visual style, and can load and save a stage file (background, camera, and layer data) through the underlying stage library — the on-screen file loading, editing, and save screens themselves come in later updates.

[Unreleased]: https://github.com/openkakutou/stage-editor/compare/v0.11.0...HEAD
[0.11.0]: https://github.com/openkakutou/stage-editor/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/openkakutou/stage-editor/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/openkakutou/stage-editor/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/openkakutou/stage-editor/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/openkakutou/stage-editor/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/openkakutou/stage-editor/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/openkakutou/stage-editor/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/openkakutou/stage-editor/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/openkakutou/stage-editor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/openkakutou/stage-editor/releases/tag/v0.2.0
