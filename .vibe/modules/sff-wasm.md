# Module: sff-wasm
**Role:** A second, independent bridge to the `sff` WebAssembly module (not `stage`'s own) — loads it client-side and exposes a typed `loadSpriteSheet` wrapper for sprite metadata (never decoded pixel data), used to validate a BG element's sprite reference against the loaded sheet.
**Files:** `src/wasm/sff-bridge.ts`, `src/wasm/sff-types.ts`
**Exports:** `loadSpriteSheet(sffBytes: Uint8Array, options?: SffWasmBridgeOptions): Promise<SpriteSheetResult>`, `resetSffWasmBridgeForTests(): void`, `SffWasmBridgeOptions`, `SpriteSheetResult`, `Sprite`, `SpriteGroup`
**Depends on:** (none — talks directly to the `sff.wasm`/its own `wasm_exec.js` globals fetched from `public/wasm/sff/`)
