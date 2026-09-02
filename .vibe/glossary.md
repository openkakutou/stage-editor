# Ubiquitous Language

## Stage
A MUGEN/Ikemen GO background: its sprite sheet, coordinate space, camera settings, BG elements/layers, and (for a model-based stage) 3D model/scaling/player-depth settings. Loaded from, and serialized back to, a `.def` file via the `stage` WASM module's read and write surface.
_Sources: `src/wasm/types.ts`, `src/wasm/bridge.ts`_

## BG Element
A single layer of a stage's background — a static sprite, a depth-scrolling (parallax) layer, or an `.air`-animated layer. Each has a draw order relative to characters (in front or behind), a starting position, and tiling settings.
_Sources: `src/wasm/types.ts`_

## Parallax
A BG Element's scrolling behavior that simulates depth: it scrolls at a different ratio than the camera's own movement, so elements at different depths appear to move at different speeds.
**Do not confuse with:** BG Element, which parallax is one behavior (`type`) of.
_Sources: `src/wasm/types.ts`_

## Camera Bounds
The box a stage's camera can scroll within — its own left/right/high/low limits, distinct from where characters themselves may move (see Stage Boundaries).
**Do not confuse with:** Stage Boundaries.
_Sources: `src/wasm/types.ts`_

## Stage Boundaries
Where characters may move within a stage: an x-axis range always, plus a z-axis (depth) range for a model-based stage. Distinct from Camera Bounds, which clamps the camera's own position instead.
**Do not confuse with:** Camera Bounds.
_Sources: `src/wasm/types.ts`_

## 3D Model
The glTF model file an Ikemen GO 3D model-based stage references, plus its placement (offset), scale, and lighting (an `.hdr` environment file and its intensity). Assigned, replaced, or removed as a file; a stage with no 3D Model behaves exactly like a 2D-only stage.
**Do not confuse with:** BG Element, which is 2D-only and has no 3D placement of its own.
_Sources: `src/wasm/types.ts`, `src/editor/model-editor.ts`_

## Perspective Scaling
How a character's on-screen size and vertical offset change with their depth (Z) position, on a 3D model-based stage — a `topZ`/`bottomZ` depth range mapped to a `topScale`/`bottomScale` size range, plus how depth itself offsets the on-screen Y position.
_Sources: `src/wasm/types.ts`, `src/editor/model-editor.ts`_

## Player Start Depth
Each player's starting depth (Z) position on a 3D model-based stage, one value per player slot (1 through 8) — distinct from Stage Boundaries, which clamps depth *movement* rather than setting where a player starts.
**Do not confuse with:** Stage Boundaries.
_Sources: `src/wasm/types.ts`, `src/editor/model-editor.ts`_

## Sprite Sheet
The image file (`.sff`) a stage references for the sprites its BG Elements draw from. A stage's own `.def` only ever stores a path *reference* to its sprite sheet — the actual file is a separate one, resolved from the same folder the `.def` came from.
_Sources: `src/wasm/types.ts`, `src/input/stage-file-input.ts`_
