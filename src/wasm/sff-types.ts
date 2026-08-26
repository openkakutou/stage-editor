// Typed mirror of the JSON contract published by the `sff` WASM module's
// `OpenKakutouSff.load` (sprite metadata only — this app never needs
// decoded pixel data, just enough to validate a BG element's sprite
// reference against the loaded sheet). Field names and shapes match
// `sff`'s own Go types (`Sprite`/`SpriteGroup`) field-for-field, ported
// verbatim from `lifebar-editor`'s own `src/wasm/types.ts`.

/** One sprite's metadata within a sprite sheet — position, size, palette reference. */
export interface Sprite {
  group: number;
  image: number;
  width: number;
  height: number;
  axisX: number;
  axisY: number;
  palette: number;
}

/** All sprites sharing the same group index, as `sff` groups them. */
export interface SpriteGroup {
  index: number;
  sprites: Sprite[];
}
