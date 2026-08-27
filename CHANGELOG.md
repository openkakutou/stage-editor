# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/openkakutou/stage-editor/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/openkakutou/stage-editor/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/openkakutou/stage-editor/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/openkakutou/stage-editor/releases/tag/v0.2.0
