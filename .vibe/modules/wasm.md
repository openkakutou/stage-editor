# Module: wasm
**Role:** Bridge to the `stage` WebAssembly module (write mode) — loads it client-side and exposes typed `loadStage`/`saveStage` wrappers, plus the `StageData` TypeScript vocabulary, each returning a typed result instead of throwing.
**Files:** `src/wasm/bridge.ts`, `src/wasm/types.ts`
**Exports:** `loadStage(defBytes: Uint8Array, options?: WasmBridgeOptions): Promise<StageResult>`, `saveStage(originalDefBytes: Uint8Array, editedStage: StageData, options?: WasmBridgeOptions): Promise<SaveResult>`, `resetWasmBridgeForTests(): void`, `WasmBridgeOptions`, `StageData` (now including `name`/`author`), `StageResult`, `SaveResult`, `BGElement`, `BGElementType`, `SpriteRef`, `BGdef`, `CameraBounds`, `StageBoundaries`, `Model`, `Scaling`, `PlayerStartZ`
**Depends on:** (none — talks directly to the `stage.wasm`/`wasm_exec.js` globals fetched from `public/wasm/`)
